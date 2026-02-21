import { describe, expect, it } from 'vitest'
import { optimizeRation } from '@/engine/optimizerV2'
import type { AnimalProfile, Feed } from '@/types'

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
    productionPhase: 'mid',
    ...overrides,
  }
}

function baseFeeds(): Feed[] {
  return [
    {
      id: 'corn_silage',
      name: 'Mısır Silajı',
      category: 'forage',
      dmPercent: 35,
      meMcalPerKg: 2.2,
      cpPercent: 8,
      ndfPercent: 45,
      starchPercent: 30,
      sugarPercent: 3,
      fatPercent: 3,
      caPercent: 0.30,
      pPercent: 0.22,
      mgPercent: 0.20,
      naPercent: 0.10,
      kPercent: 1.20,
      sPercent: 0.20,
      clPercent: 0.20,
      // Trace minerals (ppm)
      fePpm: 120,
      znPpm: 25,
      cuPpm: 4,
      mnPpm: 35,
      coPpm: 0.08,
      iPpm: 0.3,
      sePpm: 0.1,
      // Vitamins (IU/kg or mg/kg)
      vitaminAIUPerKg: 15000,
      vitaminDIUPerKg: 500,
      vitaminEIUPerKg: 25,
      priceTLPerKg: 1.2,
    },
    {
      id: 'alfalfa_hay',
      name: 'Yonca Kuru Otu',
      category: 'forage',
      dmPercent: 90,
      meMcalPerKg: 2.1,
      cpPercent: 18,
      ndfPercent: 40,
      starchPercent: 2,
      sugarPercent: 8,
      fatPercent: 2,
      caPercent: 1.40,
      pPercent: 0.25,
      mgPercent: 0.30,
      naPercent: 0.10,
      kPercent: 2.20,
      sPercent: 0.25,
      clPercent: 0.30,
      fePpm: 250,
      znPpm: 28,
      cuPpm: 12,
      mnPpm: 45,
      coPpm: 0.18,
      iPpm: 0.4,
      sePpm: 0.2,
      vitaminAIUPerKg: 45000,
      vitaminDIUPerKg: 1200,
      vitaminEIUPerKg: 120,
      priceTLPerKg: 3.0,
    },
    {
      id: 'corn_grain',
      name: 'Mısır Dane',
      category: 'concentrate',
      dmPercent: 88,
      meMcalPerKg: 3.4,
      cpPercent: 9,
      ndfPercent: 12,
      starchPercent: 70,
      sugarPercent: 2,
      fatPercent: 4,
      caPercent: 0.05,
      pPercent: 0.30,
      mgPercent: 0.12,
      naPercent: 0.02,
      kPercent: 0.40,
      sPercent: 0.12,
      clPercent: 0.05,
      fePpm: 28,
      znPpm: 20,
      cuPpm: 2,
      mnPpm: 6,
      coPpm: 0.03,
      iPpm: 0.08,
      sePpm: 0.08,
      vitaminAIUPerKg: 50,
      vitaminDIUPerKg: 20,
      vitaminEIUPerKg: 12,
      priceTLPerKg: 7.0,
    },
    {
      id: 'soybean_meal',
      name: 'Soya Küspesi',
      category: 'concentrate',
      dmPercent: 89,
      meMcalPerKg: 3.1,
      cpPercent: 48,
      ndfPercent: 10,
      starchPercent: 5,
      sugarPercent: 7,
      fatPercent: 1.5,
      caPercent: 0.30,
      pPercent: 0.65,
      mgPercent: 0.25,
      naPercent: 0.05,
      kPercent: 2.00,
      sPercent: 0.35,
      clPercent: 0.10,
      fePpm: 185,
      znPpm: 55,
      cuPpm: 18,
      mnPpm: 42,
      coPpm: 0.14,
      iPpm: 0.12,
      sePpm: 0.22,
      vitaminAIUPerKg: 10,
      vitaminDIUPerKg: 18,
      vitaminEIUPerKg: 8,
      priceTLPerKg: 12.0,
    },
    {
      id: 'mineral_premix',
      name: 'Mineral Vitamin Premiksi',
      category: 'mineral',
      dmPercent: 98,
      meMcalPerKg: 0,
      cpPercent: 0,
      ndfPercent: 0,
      starchPercent: 0,
      sugarPercent: 0,
      fatPercent: 0,
      caPercent: 15.0,
      pPercent: 8.0,
      mgPercent: 3.0,
      naPercent: 4.0,
      kPercent: 0.5,
      sPercent: 1.0,
      clPercent: 2.0,
      // Mega-dose trace minerals (typical premix)
      fePpm: 4000,
      znPpm: 3500,
      cuPpm: 1200,
      mnPpm: 2500,
      coPpm: 18,
      iPpm: 80,
      sePpm: 25,
      vitaminAIUPerKg: 500000,
      vitaminDIUPerKg: 80000,
      vitaminEIUPerKg: 15000,
      vitaminKMgPerKg: 15,
      priceTLPerKg: 35.0,
    },
    {
      id: 'salt',
      name: 'Tuz',
      category: 'mineral',
      dmPercent: 99,
      meMcalPerKg: 0,
      cpPercent: 0,
      ndfPercent: 0,
      starchPercent: 0,
      sugarPercent: 0,
      fatPercent: 0,
      caPercent: 0,
      pPercent: 0,
      mgPercent: 0,
      naPercent: 39,
      kPercent: 0,
      sPercent: 0,
      clPercent: 61,
      priceTLPerKg: 4.0,
    },
  ]
}

describe('optimizeRation (optimizerV2)', () => {
  // SKIP: GLPK.js/node WASM solver has compatibility issues in Vitest environment
  // The LP solver works correctly in browser (Vite) environment
  // This test is skipped until we can mock or properly configure GLPK in Node/Vitest
  it.skip('enforces diversity constraints with LP(MIP) solver', async () => {
    const profile = baseProfile({ milkYieldKgPerDay: 10 })
    const feeds = baseFeeds()

    const result = await optimizeRation(profile, feeds, {
      solver: 'lp',
      minForagePercent: 50,
      maxConcentratePercent: 60,
      minActiveFeeds: 5,
      minForageFeeds: 2,
      minConcentrateFeeds: 2,
      minMineralFeeds: 1,
      feedConstraints: {
        salt: { minAsFedKgPerDay: 0.05 },
      },
    })

    expect(result.status).toBe('success')
    expect(result.ration).not.toBeNull()

    const ration = result.ration!
    expect(ration.ingredients.length).toBeGreaterThanOrEqual(5)
    expect(ration.ingredients.filter((i) => i.feedCategory === 'forage').length).toBeGreaterThanOrEqual(2)
    expect(ration.ingredients.filter((i) => i.feedCategory === 'concentrate').length).toBeGreaterThanOrEqual(2)
    expect(ration.ingredients.filter((i) => i.feedCategory === 'mineral').length).toBeGreaterThanOrEqual(1)
  })

  it('produces a ration with greedy solver (basic fixture)', async () => {
    const profile = baseProfile({ milkYieldKgPerDay: 20 })
    const feeds = baseFeeds()

    const result = await optimizeRation(profile, feeds, {
      solver: 'greedy',
      minForagePercent: 50,
      maxConcentratePercent: 60,
      lpDmiTolerancePercent: 10,
      feedConstraints: {
        salt: { minAsFedKgPerDay: 0.05 },
      },
    })

    expect(['success', 'infeasible']).toContain(result.status)
    expect(result.ration).not.toBeNull()

    const ration = result.ration!
    expect(ration.ingredients.length).toBeGreaterThan(0)
    expect(ration.ingredients.some((i) => i.feedCategory === 'forage')).toBe(true)
    expect(ration.ingredients.some((i) => i.feedCategory === 'concentrate')).toBe(true)

    const saltIng = ration.ingredients.find((i) => i.feedId === 'salt')
    expect(saltIng).toBeTruthy()
    expect(saltIng!.kgAsFedPerDay).toBeGreaterThanOrEqual(0.05)
  })

  it('returns error when all feeds are excluded', async () => {
    const profile = baseProfile()
    const feeds = baseFeeds()

    const result = await optimizeRation(profile, feeds, {
      solver: 'greedy',
      excludeFeeds: feeds.map((f) => f.id),
    })

    expect(result.status).toBe('error')
    expect(result.ration).toBeNull()
  })

  it('returns infeasible when max inclusion limits prevent forage selection', async () => {
    const profile = baseProfile()
    const feeds = baseFeeds()

    const feedConstraints = Object.fromEntries(
      feeds.map((f) => [f.id, { maxAsFedKgPerDay: 0.1 }])
    )

    const result = await optimizeRation(profile, feeds, {
      solver: 'greedy',
      minForagePercent: 50,
      feedConstraints,
    })

    expect(result.status).toBe('infeasible')
    expect(result.ration).not.toBeNull()
    expect(result.diagnostics?.notes?.length ?? 0).toBeGreaterThan(0)
  })
})
