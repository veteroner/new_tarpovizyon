import type { SolutionVector } from './types'
import { asFedToDmKg } from './conversions'

export function sumDmByCategory(solution: SolutionVector): {
  forage: number
  concentrate: number
  mineral: number
  total: number
} {
  let forage = 0
  let concentrate = 0
  let mineral = 0
  let total = 0

  for (const [feed, kgAsFed] of solution.feedAmounts) {
    const kgDM = asFedToDmKg(feed, kgAsFed)
    total += kgDM
    if (feed.category === 'forage') forage += kgDM
    else if (feed.category === 'concentrate') concentrate += kgDM
    else mineral += kgDM
  }

  return { forage, concentrate, mineral, total }
}

export function calculateSolutionMinerals(solution: SolutionVector): {
  dmiKg: number
  caGrams: number
  pGrams: number
  mgGrams: number
  naGrams: number
  kGrams: number
  sGrams: number
  clGrams: number
} {
  let totalDmiKg = 0
  let totalCa = 0
  let totalP = 0
  let totalMg = 0
  let totalNa = 0
  let totalK = 0
  let totalS = 0
  let totalCl = 0

  for (const [feed, kgAsFed] of solution.feedAmounts) {
    const kgDM = asFedToDmKg(feed, kgAsFed)
    totalDmiKg += kgDM
    totalCa += (feed.caPercent / 100) * kgDM * 1000
    totalP += (feed.pPercent / 100) * kgDM * 1000
    totalMg += ((feed.mgPercent || 0) / 100) * kgDM * 1000
    totalNa += ((feed.naPercent || 0) / 100) * kgDM * 1000
    totalK += ((feed.kPercent || 0) / 100) * kgDM * 1000
    totalS += ((feed.sPercent || 0) / 100) * kgDM * 1000
    totalCl += ((feed.clPercent || 0) / 100) * kgDM * 1000
  }

  return {
    dmiKg: totalDmiKg,
    caGrams: totalCa,
    pGrams: totalP,
    mgGrams: totalMg,
    naGrams: totalNa,
    kGrams: totalK,
    sGrams: totalS,
    clGrams: totalCl,
  }
}

export function calculateDCADFromTotals(t: {
  dmiKg: number
  naGrams: number
  kGrams: number
  clGrams: number
  sGrams: number
}): number {
  // mEq/kg DM
  if (!t.dmiKg || t.dmiKg <= 0) return 0
  // mEq = (grams / atomic_weight) × valence × 1000
  const na_meq = (t.naGrams / 23) * 1000
  const k_meq = (t.kGrams / 39) * 1000
  const cl_meq = (t.clGrams / 35.5) * 1000
  const s_meq = (t.sGrams / 32) * 2 * 1000
  const dcad_total = na_meq + k_meq - cl_meq - s_meq
  return dcad_total / t.dmiKg
}
