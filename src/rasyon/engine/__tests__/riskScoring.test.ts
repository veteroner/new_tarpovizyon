import { describe, expect, it } from 'vitest'
import { calculateRiskScore } from '@/engine/riskScoring'
import type { AnimalProfile, Ration } from '@/types'

function baseProfile(overrides: Partial<AnimalProfile> = {}): AnimalProfile {
  return {
    species: 'cattle',
    breed: 'holstein',
    sex: 'female',
    purpose: 'dairy',
    weightKg: 650,
    stage: 'mid',
    parity: 2,
    milkYieldKgPerDay: 30,
    ...overrides,
  }
}

function baseRation(profile: AnimalProfile, overrides: Partial<Ration> = {}): Ration {
  const ration: Ration = {
    id: 'test',
    createdAt: new Date(0).toISOString(),
    profile,
    requirements: {
      dmiKg: 24,
      meMcal: 100,
      cpGrams: 3200,
      ndfPercentMin: 28,
      starchPercentMax: 28,
      sugarPercentMax: 10,
      fatPercentMax: 6,
      caGrams: 120,
      pGrams: 80,
      mgGrams: 30,
      naGrams: 40,
      kGrams: 120,
      sGrams: 25,
      clGrams: 40,
    },
    ingredients: [
      {
        feedId: 'test-forage',
        feedName: 'Test Forage',
        feedCategory: 'forage',
        ndfPercent: 45,
        kgAsFedPerDay: 10,
        kgDMPerDay: 8,
        costTL: 100,
      },
    ],
    totals: {
      dmiKg: 24,
      mePerDay: 100,
      cpGrams: 3200,
      ndfPercent: 32,
      starchPercent: 24,
      sugarPercent: 8,
      fatPercent: 4,
      caGrams: 120,
      pGrams: 80,
      mgGrams: 30,
      naGrams: 40,
      kGrams: 120,
      sGrams: 25,
      clGrams: 40,
    },
    cost: {
      dailyFeedCostTL: 100,
      monthlyCostTL: 3000,
    },
  }

  return { ...ration, ...overrides }
}

describe('riskScoring', () => {
  it('flags high acidosis risk for very high starch', () => {
    const profile = baseProfile({ stage: 'mid', milkYieldKgPerDay: 30 })
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, starchPercent: 39, ndfPercent: 32, sugarPercent: 8 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.acidosis).toBeGreaterThan(60)
    expect(score.warnings.some((w) => w.code === 'ACIDOSIS_HIGH')).toBe(true)
  })

  it('does not add ketosis risk for non-dairy purposes', () => {
    const profile = baseProfile({ purpose: 'beef', stage: 'mid', milkYieldKgPerDay: undefined })
    const ration = baseRation(profile)

    const score = calculateRiskScore(ration, profile)
    expect(score.ketosis).toBe(0)
  })

  it('flags high ketosis risk when energy deficit is large in early lactation', () => {
    const profile = baseProfile({ stage: 'early', milkYieldKgPerDay: 45 })
    const base = baseRation(profile)
    const ration = baseRation(profile, {
      requirements: { ...base.requirements, meMcal: 100 },
      totals: { ...base.totals, mePerDay: 50 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.ketosis).toBeGreaterThan(60)
    expect(score.warnings.some((w) => w.code === 'KETOSIS_HIGH')).toBe(true)
  })

  it('flags bloat risk when alfalfa share is very high', () => {
    const profile = baseProfile()
    const ration = baseRation(profile, {
      ingredients: [
        {
          feedId: 'alfalfa-hay',
          feedName: 'Yonca Kuru Ot',
          feedCategory: 'forage',
          ndfPercent: 45,
          kgAsFedPerDay: 18,
          kgDMPerDay: 16,
          costTL: 200,
        },
      ],
      totals: { ...baseRation(profile).totals, ndfPercent: 45, cpGrams: 4500 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.bloat).toBeGreaterThan(30)
  })

  it('low NDF increases acidosis risk', () => {
    const profile = baseProfile()
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, ndfPercent: 22, starchPercent: 30 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.acidosis).toBeGreaterThan(20)
  })

  it('high sugar adds to acidosis risk', () => {
    const profile = baseProfile()
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, sugarPercent: 14, starchPercent: 30 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.acidosis).toBeGreaterThan(15)
  })

  it('flags Ca:P ratio too low', () => {
    const profile = baseProfile({ productionPhase: 'mid' })
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, caGrams: 60, pGrams: 80 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.warnings.some((w) => w.code === 'CA_P_RATIO_LOW')).toBe(true)
  })

  it('flags Ca:P ratio too high', () => {
    const profile = baseProfile({ productionPhase: 'mid' })
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, caGrams: 300, pGrams: 50 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.warnings.some((w) => w.code === 'CA_P_RATIO_HIGH')).toBe(true)
  })

  it('flags DCAD too high for close-up dry cows', () => {
    const profile = baseProfile({ productionPhase: 'dry-closeup', stage: 'dry', milkYieldKgPerDay: 0 })
    const ration = baseRation(profile, {
      totals: {
        ...baseRation(profile).totals,
        naGrams: 80,
        kGrams: 200,
        clGrams: 20,
        sGrams: 10,
      },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.warnings.some((w) => w.code === 'DCAD_HIGH')).toBe(true)
  })

  it('milk fat depression risk increases with high starch and low forage NDF', () => {
    const profile = baseProfile({ milkYieldKgPerDay: 35 })
    const ration = baseRation(profile, {
      totals: { ...baseRation(profile).totals, starchPercent: 32, ndfPercent: 26 },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.milkFatDepression).toBeGreaterThan(15)
  })

  it('overall risk severity is critical when multiple risks are high', () => {
    const profile = baseProfile({ stage: 'early', milkYieldKgPerDay: 40 })
    const ration = baseRation(profile, {
      requirements: { ...baseRation(profile).requirements, meMcal: 110 },
      totals: {
        ...baseRation(profile).totals,
        starchPercent: 36,
        ndfPercent: 24,
        sugarPercent: 12,
        mePerDay: 70,
      },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.severity).toBe('high')
    expect(score.overall).toBeGreaterThan(50)
  })

  it('low risk ration has low overall score', () => {
    const profile = baseProfile({ milkYieldKgPerDay: 25 })
    const ration = baseRation(profile, {
      totals: {
        ...baseRation(profile).totals,
        starchPercent: 22,
        ndfPercent: 34,
        sugarPercent: 6,
        mePerDay: 100,
      },
    })

    const score = calculateRiskScore(ration, profile)
    expect(score.severity).toBe('low')
    expect(score.overall).toBeLessThan(30)
  })
})
