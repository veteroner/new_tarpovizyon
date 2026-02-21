import type { AnimalProfile } from '@/types'

export interface RangeTarget {
  min: number
  max: number
  target: number
  label: string
}

function isDryPeriod(profile: AnimalProfile): boolean {
  return profile.stage === 'dry' || profile.purpose === 'dry'
}

function isLatePregnancy(profile: AnimalProfile): boolean {
  if (profile.productionPhase === 'dry-closeup') return true
  const m = profile.pregnancyMonth
  if (typeof m !== 'number') return false
  if (profile.species === 'cattle') return m >= 8
  if (profile.species === 'sheep' || profile.species === 'goat') return m >= 4
  return false
}

export function getDcadTarget(profile: AnimalProfile): RangeTarget {
  // Practical, field-safe bands (mEq/kg DM). This is a heuristic target layer, not a full DCAD program.
  const dry = isDryPeriod(profile)
  const latePreg = isLatePregnancy(profile)

  if (profile.species === 'cattle') {
    if (dry) {
      // Close-up dry cows often benefit from lower/negative DCAD.
      if (latePreg) {
        return { min: -120, max: 50, target: -50, label: 'hedef: -120–50 mEq/kg DM' }
      }
      return { min: -50, max: 150, target: 50, label: 'hedef: -50–150 mEq/kg DM' }
    }
    if (profile.purpose === 'dairy') {
      return { min: 150, max: 450, target: 250, label: 'hedef: 150–450 mEq/kg DM' }
    }
    // beef/grower
    return { min: 100, max: 350, target: 200, label: 'hedef: 100–350 mEq/kg DM' }
  }

  // Small ruminants
  if (dry || latePreg) {
    return { min: -50, max: 150, target: 50, label: 'hedef: -50–150 mEq/kg DM' }
  }
  if (profile.purpose === 'dairy') {
    return { min: 100, max: 350, target: 200, label: 'hedef: 100–350 mEq/kg DM' }
  }
  return { min: 100, max: 350, target: 200, label: 'hedef: 100–350 mEq/kg DM' }
}

export function getCaPRatioTarget(profile: AnimalProfile): RangeTarget {
  // Ca:P ratio (dimensionless).
  const dry = isDryPeriod(profile)
  const smallRuminant = profile.species === 'sheep' || profile.species === 'goat'

  // Urinary calculi prevention: males in small ruminants benefit from higher Ca:P (>=2:1).
  if (smallRuminant && profile.purpose === 'grower' && (profile.sex === 'male' || profile.sex === 'castrated')) {
    return { min: 2.0, max: 3.5, target: 2.5, label: 'hedef: 2.0–3.5' }
  }

  if (profile.species === 'cattle' && profile.purpose === 'dairy' && !dry) {
    return { min: 1.4, max: 2.2, target: 1.8, label: 'hedef: 1.4–2.2' }
  }

  if (dry) {
    return { min: 1.6, max: 2.4, target: 2.0, label: 'hedef: 1.6–2.4' }
  }

  // Default practical band
  return { min: 1.5, max: 2.5, target: 2.0, label: 'hedef: 1.5–2.5' }
}
