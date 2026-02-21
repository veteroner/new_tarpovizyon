/**
 * Beef energy helpers (CNES / NASEM-style)
 *
 * Goal: Replace "ME-only" growth modeling with Net Energy for maintenance (NEm)
 * and gain (NEg) requirements, which align better with ADG targets.
 *
 * References (high level):
 * - NEm required: 0.077 × SBW^0.75 (Mcal/day)
 * - NEg required: 0.0557 × EQSBW^0.75 × SWG^1.097 (Mcal/day)
 * - Relationship: NEg (Mcal/kg) = 0.877 × NEm (Mcal/kg) − 0.41
 *   (common in Zinn & Shen quadratic solution workflows)
 *
 * Notes:
 * - We only have current BW and target ADG, not carcass/composition, so SBW and
 *   EQSBW are approximated (SBW = 0.96 × BW; EQSBW ≈ SBW).
 */

const METABOLIC_EXP = 0.75
const SBW_SHRINK_FACTOR = 0.96

const NEM_REQ_FACTOR = 0.077
const NEG_REQ_FACTOR = 0.0557
const NEG_SWG_EXP = 1.097

const NEG_FROM_NEM_A = 0.877
const NEG_FROM_NEM_B = 0.41

export function estimateShrunkBodyWeightKg(bodyWeightKg: number): number {
  return bodyWeightKg * SBW_SHRINK_FACTOR
}

export function estimateEquivalentShrunkBodyWeightKg(shrunkBodyWeightKg: number): number {
  // Full EQSBW needs body composition at a compositional endpoint.
  // With limited inputs we approximate EQSBW ≈ SBW.
  return shrunkBodyWeightKg
}

export function calculateNEmRequirementMcalPerDay(shrunkBodyWeightKg: number): number {
  return NEM_REQ_FACTOR * Math.pow(shrunkBodyWeightKg, METABOLIC_EXP)
}

export function calculateNEgRequirementMcalPerDay(eqShrunkBodyWeightKg: number, shrunkWeightGainKgPerDay: number): number {
  const swg = Math.max(0, shrunkWeightGainKgPerDay)
  return NEG_REQ_FACTOR * Math.pow(eqShrunkBodyWeightKg, METABOLIC_EXP) * Math.pow(swg, NEG_SWG_EXP)
}

export function estimateDietaryNEgFromNEmConcentration(nemMcalPerKgDm: number): number {
  return Math.max(0, NEG_FROM_NEM_A * nemMcalPerKgDm - NEG_FROM_NEM_B)
}

/**
 * Solve dietary NEm concentration (Mcal/kg DM) given DMI (kg/d) and requirements.
 *
 * Uses the common partitioning identity:
 *   DMI = NEmReq / NEmConc + NEgReq / NEgConc
 * and replaces NEgConc with (0.877×NEmConc − 0.41), reducing to a quadratic.
 */
export function solveDietaryNEmConcentrationMcalPerKgDm(params: {
  dmiKgPerDay: number
  nemReqMcalPerDay: number
  negReqMcalPerDay: number
}): number {
  const dmi = Math.max(0.1, params.dmiKgPerDay)
  const nemReq = Math.max(0, params.nemReqMcalPerDay)
  const negReq = Math.max(0, params.negReqMcalPerDay)

  const a = NEG_FROM_NEM_A
  const b = NEG_FROM_NEM_B

  // Quadratic: A x^2 + B x + C = 0
  // Derived from: dmi = nemReq/x + negReq/(a x - b)
  const A = dmi * a
  const B = -(dmi * b + nemReq * a + negReq)
  const C = nemReq * b

  const disc = B * B - 4 * A * C
  if (!Number.isFinite(disc) || disc < 0 || A === 0) {
    // Fallback to a plausible finishing diet NEm concentration.
    return 2.0
  }

  const sqrtDisc = Math.sqrt(disc)
  const x1 = (-B + sqrtDisc) / (2 * A)
  const x2 = (-B - sqrtDisc) / (2 * A)

  // Valid solution must satisfy a*x - b > 0  => x > b/a
  const minX = b / a + 1e-6
  const candidates = [x1, x2].filter((x) => Number.isFinite(x) && x > minX)

  if (candidates.length === 0) return 2.0

  // Prefer the larger root (typically yields realistic NEm concentrations)
  return Math.max(...candidates)
}

/**
 * CNES-style cubic conversion from ME (Mcal/kg DM) to dietary NEm (Mcal/kg DM).
 * Widely used in practice; works best for complete diets but is used here as a
 * pragmatic approximation for ingredient-level energy.
 */
export function estimateDietaryNEmFromME(meMcalPerKgDm: number): number {
  const me = Math.max(0, meMcalPerKgDm)
  const nem = 1.37 * me - 0.138 * me * me + 0.0105 * me * me * me - 1.12
  return Math.max(0, nem)
}

export function estimateDietaryMEFromNEm(nemMcalPerKgDm: number): number {
  const target = Math.max(0, nemMcalPerKgDm)

  // Newton-Raphson on f(me) = estimateDietaryNEmFromME(me) - target
  let me = 2.6
  for (let i = 0; i < 12; i++) {
    const f = estimateDietaryNEmFromME(me) - target
    if (Math.abs(f) < 1e-6) break

    // derivative of: 1.37*me -0.138*me^2 +0.0105*me^3 -1.12
    const df = 1.37 - 0.276 * me + 0.0315 * me * me
    if (df === 0) break

    me = me - f / df
    if (!Number.isFinite(me)) {
      me = 2.6
      break
    }
    me = Math.min(4.0, Math.max(0.5, me))
  }

  return me
}

export function estimateFeedNEmNegFromME(meMcalPerKgDm: number): { nemMcalPerKgDm: number; negMcalPerKgDm: number } {
  const nem = estimateDietaryNEmFromME(meMcalPerKgDm)
  const neg = estimateDietaryNEgFromNEmConcentration(nem)
  return { nemMcalPerKgDm: nem, negMcalPerKgDm: neg }
}
