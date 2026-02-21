import { describe, expect, it } from 'vitest'
import { calculateDMI_NRC2021, calculateEnergyNEL_NRC2021, calculateProteinMP_NRC2021 } from '@/engine/nrc2021'
import type { AnimalProfile } from '@/types'

describe('nrc2021', () => {
  it('dry close-up DMI is lower than far-off DMI (cattle)', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'dry',
      milkYieldKgPerDay: 0,
      parity: 2,
      pregnancyMonth: 8,
    }

    const faroff = calculateDMI_NRC2021({ ...base, productionPhase: 'dry-faroff' })
    const closeup = calculateDMI_NRC2021({ ...base, productionPhase: 'dry-closeup' })

    expect(faroff).toBeGreaterThan(0)
    expect(closeup).toBeGreaterThan(0)
    expect(closeup).toBeLessThan(faroff)
  })

  it('lactating sheep/goat DMI increases with milk yield', () => {
    const base: AnimalProfile = {
      species: 'sheep',
      breed: 'akkaraman',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 60,
      stage: 'early',
      milkYieldKgPerDay: 0,
    }

    const dmi0 = calculateDMI_NRC2021(base)
    const dmi2 = calculateDMI_NRC2021({ ...base, milkYieldKgPerDay: 2 })

    expect(dmi2).toBeGreaterThan(dmi0)
  })

  it('parity 1 has lower DMI than parity 2 for same milk yield', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 600,
      stage: 'mid',
      milkYieldKgPerDay: 30,
      productionPhase: 'mid',
    }

    const dmiParity1 = calculateDMI_NRC2021({ ...base, parity: 1 })
    const dmiParity2 = calculateDMI_NRC2021({ ...base, parity: 2 })

    expect(dmiParity1).toBeLessThan(dmiParity2)
  })

  it('fresh lactation has lower DMI than mid lactation', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'early',
      milkYieldKgPerDay: 35,
      parity: 2,
    }

    const dmiFresh = calculateDMI_NRC2021({ ...base, productionPhase: 'fresh' })
    const dmiMid = calculateDMI_NRC2021({ ...base, productionPhase: 'mid', stage: 'mid' })

    expect(dmiFresh).toBeLessThan(dmiMid)
  })

  it('beef cattle DMI scales with body weight', () => {
    const light: AnimalProfile = {
      species: 'cattle',
      breed: 'simental',
      sex: 'male',
      purpose: 'beef',
      weightKg: 400,
      stage: 'mid',
      productionPhase: 'grower',
    }

    const heavy: AnimalProfile = {
      ...light,
      weightKg: 600,
    }

    const dmiLight = calculateDMI_NRC2021(light)
    const dmiHeavy = calculateDMI_NRC2021(heavy)

    expect(dmiHeavy).toBeGreaterThan(dmiLight)
    expect(dmiHeavy / heavy.weightKg).toBeCloseTo(dmiLight / light.weightKg, 1)
  })

  it('energy requirement increases with milk yield', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'mid',
      parity: 2,
    }

    const energy20 = calculateEnergyNEL_NRC2021({ ...base, milkYieldKgPerDay: 20 })
    const energy40 = calculateEnergyNEL_NRC2021({ ...base, milkYieldKgPerDay: 40 })

    expect(energy40).toBeGreaterThan(energy20)
    expect(energy40 - energy20).toBeGreaterThan(10)
  })

  it('pregnancy increases energy requirements in late gestation', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dry',
      weightKg: 700,
      stage: 'dry',
      productionPhase: 'dry-faroff',
    }

    const earlyPreg = calculateEnergyNEL_NRC2021({ ...base, pregnancyMonth: 3 })
    const latePreg = calculateEnergyNEL_NRC2021({ ...base, pregnancyMonth: 8 })

    expect(latePreg).toBeGreaterThan(earlyPreg)
  })

  it('protein requirement increases with milk production', () => {
    const base: AnimalProfile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 650,
      stage: 'mid',
      parity: 2,
    }

    const protein15 = calculateProteinMP_NRC2021({ ...base, milkYieldKgPerDay: 15 })
    const protein35 = calculateProteinMP_NRC2021({ ...base, milkYieldKgPerDay: 35 })

    expect(protein35).toBeGreaterThan(protein15)
  })

  it('goat DMI is reasonable for small body size', () => {
    const goat: AnimalProfile = {
      species: 'goat',
      breed: 'saanen',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 65,
      stage: 'mid',
      milkYieldKgPerDay: 3,
    }

    const dmi = calculateDMI_NRC2021(goat)

    expect(dmi).toBeGreaterThan(1.5)
    expect(dmi).toBeLessThan(4)
  })

  it('beef grower has reasonable DMI', () => {
    const grower: AnimalProfile = {
      species: 'cattle',
      breed: 'simental',
      sex: 'male',
      purpose: 'beef',
      weightKg: 300,
      stage: 'mid',
      productionPhase: 'grower',
      targetAdgKgPerDay: 1.2,
    }

    const dmi = calculateDMI_NRC2021(grower)

    expect(dmi).toBeGreaterThan(5)
    expect(dmi).toBeLessThan(12)
  })
})
