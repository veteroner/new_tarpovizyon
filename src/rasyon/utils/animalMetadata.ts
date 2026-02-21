/**
 * Animal metadata utilities
 * Centralized functions for species, breed, purpose, and phase mappings
 */

import type { BreedType, ProductionPhase, Purpose, Species } from '@/types'

// ========== BREED UTILITIES ==========

export function getBreedsForSpecies(species: Species): BreedType[] {
  if (species === 'cattle') {
    return ['holstein', 'simental', 'brown-swiss', 'jersey', 'native-cattle']
  }
  if (species === 'sheep') {
    return ['merino', 'akkaraman', 'native-sheep']
  }
  return ['saanen', 'native-goat']
}

export function getBreedLabel(breed: BreedType): string {
  const labels: Record<BreedType, string> = {
    holstein: 'Holstein',
    simental: 'Simental',
    'brown-swiss': 'Esmer (Montofon)',
    jersey: 'Jersey',
    'native-cattle': 'Yerli Sığır',
    merino: 'Merinos',
    akkaraman: 'Akkaraman',
    'native-sheep': 'Yerli Koyun',
    saanen: 'Saanen',
    'native-goat': 'Yerli Keçi',
  }
  return labels[breed] || breed
}

export interface BreedOption {
  value: BreedType
  label: string
}

export function getBreedOptions(species: Species): BreedOption[] {
  return getBreedsForSpecies(species).map((breed) => ({
    value: breed,
    label: getBreedLabel(breed),
  }))
}

// ========== SPECIES UTILITIES ==========

export function getSpeciesLabel(species: Species): string {
  const labels: Record<Species, string> = {
    cattle: 'Sığır',
    sheep: 'Koyun',
    goat: 'Keçi',
  }
  return labels[species]
}

// ========== PURPOSE UTILITIES ==========

export function getPurposeLabel(purpose: Purpose): string {
  const labels: Record<Purpose, string> = {
    dairy: 'Süt',
    beef: 'Besi',
    dry: 'Kuru',
    grower: 'Düve/Genç',
  }
  return labels[purpose]
}

// ========== PHASE UTILITIES ==========

export function getPhaseLabel(phase: ProductionPhase): string {
  const labels: Record<ProductionPhase, string> = {
    fresh: 'Yeni Doğum (0-21 gün)',
    peak: 'Pik Laktasyon',
    mid: 'Orta Laktasyon',
    late: 'Geç Laktasyon',
    'dry-faroff': 'Kuru Dönem 1 (Uzak)',
    'dry-closeup': 'Kuru Dönem 2 (Yakın)',
    starter: 'Başlangıç Dönemi',
    grower: 'Geliştirme Dönemi',
    finisher: 'Bitiş Dönemi',
  }
  return labels[phase] || phase
}

export function getPhaseOptionsForPurpose(purpose: Purpose): ProductionPhase[] {
  if (purpose === 'dairy') {
    return ['fresh', 'peak', 'mid', 'late']
  }
  if (purpose === 'dry') {
    return ['dry-faroff', 'dry-closeup']
  }
  if (purpose === 'beef' || purpose === 'grower') {
    return ['starter', 'grower', 'finisher']
  }
  return ['mid']
}
