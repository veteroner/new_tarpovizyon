import { describe, expect, it } from 'vitest'
import { normalizeProfile } from '@/utils/profileNormalizer'
import type { AnimalProfile } from '@/types'

describe('normalizeProfile', () => {
  it('sanitizes pregnancyMonth to 1..10 and rounds', () => {
    const profile: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'mid',
      pregnancyMonth: 12.7,
      milkYieldKgPerDay: 30,
      parity: 2,
    }

    const next = normalizeProfile(profile)
    expect(next.pregnancyMonth).toBe(10)

    const next2 = normalizeProfile({ ...profile, pregnancyMonth: 2.2 })
    expect(next2.pregnancyMonth).toBe(2)

    const next3 = normalizeProfile({ ...profile, pregnancyMonth: 0 })
    expect(next3.pregnancyMonth).toBeUndefined()
  })

  it('clears milk yield for non-dairy purposes', () => {
    const profile: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'beef',
      weightKg: 650,
      stage: 'mid',
      milkYieldKgPerDay: 30,
      targetAdgKgPerDay: 1.2,
      productionPhase: 'finisher',
    }

    const next = normalizeProfile(profile)
    expect(next.milkYieldKgPerDay).toBeUndefined()
  })

  it('forces dry purpose to stage dry and milk 0', () => {
    const profile: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dry',
      weightKg: 650,
      stage: 'mid',
      milkYieldKgPerDay: 20,
      productionPhase: 'mid',
    }

    const next = normalizeProfile(profile)
    expect(next.stage).toBe('dry')
    expect(next.milkYieldKgPerDay).toBe(0)
    expect(next.productionPhase).toBe('dry-faroff')
  })

  it('normalizes dairy cattle parity to a sane default', () => {
    const profile: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'mid',
      milkYieldKgPerDay: 25,
      // @ts-expect-error intentional invalid value for test
      parity: 99,
      productionPhase: 'mid',
    }

    const next = normalizeProfile(profile)
    expect([1, 2, 3]).toContain(next.parity)
  })
})
