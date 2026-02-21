/**
 * Animal Profile Normalization Utilities
 * 
 * Separates business logic from state management.
 * Ensures profile consistency across purpose, stage, and phase.
 */

import type { AnimalProfile, ProductionPhase } from '@/types'

/**
 * Maps production phase to lactation stage
 * @param phase Production phase
 * @returns Lactation stage or undefined
 */
function mapPhaseToStage(phase?: ProductionPhase): AnimalProfile['stage'] | undefined {
  if (!phase) return undefined
  if (phase === 'dry-faroff' || phase === 'dry-closeup') return 'dry'
  if (phase === 'fresh' || phase === 'peak') return 'early'
  if (phase === 'mid') return 'mid'
  if (phase === 'late') return 'late'
  return undefined
}

/**
 * Determines default production phase based on profile purpose and stage
 * @param profile Animal profile
 * @returns Default production phase
 */
function defaultPhaseForProfile(profile: AnimalProfile): ProductionPhase | undefined {
  if (profile.purpose === 'beef' || profile.purpose === 'grower') return 'grower'
  if (profile.purpose === 'dry') return 'dry-faroff'
  if (profile.purpose === 'dairy') {
    if (profile.stage === 'dry') return 'dry-faroff'
    if (profile.stage === 'early') return 'fresh'
    if (profile.stage === 'mid') return 'mid'
    if (profile.stage === 'late') return 'late'
  }
  return undefined
}

/**
 * Normalizes animal profile to ensure data consistency
 * 
 * Rules:
 * - Sanitizes pregnancy month (1-10)
 * - Aligns milk yield with dairy purpose
 * - Aligns ADG with beef/grower purpose
 * - Enforces phase/stage/purpose consistency
 * - Sets default values based on species and purpose
 * 
 * @param profile Raw animal profile
 * @returns Normalized profile with consistent data
 */
export function normalizeProfile(profile: AnimalProfile): AnimalProfile {
  const next: AnimalProfile = { ...profile }

  // Sanitize pregnancy
  if (next.pregnancyMonth != null) {
    if (Number.isNaN(next.pregnancyMonth)) {
      next.pregnancyMonth = undefined
    } else if (next.pregnancyMonth <= 0) {
      next.pregnancyMonth = undefined
    } else {
      next.pregnancyMonth = Math.min(10, Math.max(1, Math.round(next.pregnancyMonth)))
    }
  }

  // Keep milk/adg fields aligned with purpose
  if (next.purpose !== 'dairy') {
    next.milkYieldKgPerDay = undefined
  }
  if (next.purpose !== 'beef' && next.purpose !== 'grower') {
    next.targetAdgKgPerDay = undefined
  }

  // Phase defaults + alignment
  if (!next.productionPhase) {
    next.productionPhase = defaultPhaseForProfile(next)
  }

  // Enforce phase consistency by purpose
  if (next.purpose === 'dairy') {
    // parity is meaningful for dairy cattle; keep it optional for others
    if (next.species === 'cattle') {
      if (next.parity !== 1 && next.parity !== 2 && next.parity !== 3) {
        next.parity = 2
      }
    } else {
      next.parity = undefined
    }

    // If phase says dry, make sure stage is dry
    const derivedStage = mapPhaseToStage(next.productionPhase)
    if (derivedStage) {
      next.stage = derivedStage
    }
    
    // If stage is dry but phase isn't, prefer a dry phase
    if (next.stage === 'dry' && next.productionPhase !== 'dry-faroff' && next.productionPhase !== 'dry-closeup') {
      next.productionPhase = 'dry-faroff'
    }
  } else {
    // Non-dairy purposes: parity irrelevant
    next.parity = undefined
    
    // For beef/grower, keep only beef phases
    if (next.purpose === 'beef' || next.purpose === 'grower') {
      if (next.productionPhase !== 'starter' && next.productionPhase !== 'grower' && next.productionPhase !== 'finisher') {
        next.productionPhase = 'grower'
      }
    }
    
    // For dry purpose, keep dry phases
    if (next.purpose === 'dry') {
      next.stage = 'dry'
      if (next.productionPhase !== 'dry-faroff' && next.productionPhase !== 'dry-closeup') {
        next.productionPhase = 'dry-faroff'
      }
    }
  }

  // If stage is dry, milk output is effectively zero
  if (next.stage === 'dry') {
    next.milkYieldKgPerDay = 0
  }

  // If purpose is dry, ensure stage is dry
  if (next.purpose === 'dry') {
    next.stage = 'dry'
    next.milkYieldKgPerDay = 0
  }

  return next
}
