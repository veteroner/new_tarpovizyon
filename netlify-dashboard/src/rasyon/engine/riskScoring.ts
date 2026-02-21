/**
 * Risk Skorlama Sistemi (ML-ready)
 * 
 * Faz 1: Rule-based scoring (0-100)
 * Faz 2: ML model (ONNX) ile tahmin
 */

import type { Ration, AnimalProfile, Feed, RiskScore, RiskWarning } from '@/types'
import { feeds as feedDb } from '@/data/feedsV2'
import { getCaPRatioTarget, getDcadTarget } from './nutritionTargets'

function calculateDCADFromRation(ration: Ration): number {
  // mEq/kg DM
  const dmiKg = ration.totals.dmiKg
  if (!dmiKg || dmiKg <= 0) return 0

  const na_meq = (ration.totals.naGrams / 23) * 1000
  const k_meq = (ration.totals.kGrams / 39) * 1000
  const cl_meq = (ration.totals.clGrams / 35.5) * 1000
  const s_meq = (ration.totals.sGrams / 32) * 2 * 1000

  const dcad_total = na_meq + k_meq - cl_meq - s_meq
  return dcad_total / dmiKg
}

/**
 * Ana risk skoru hesapla (rule-based)
 */
export function calculateRiskScore(ration: Ration, profile: AnimalProfile): RiskScore {
  const acidosisRisk = calculateAcidosisRisk(ration, profile)
  const ketosisRisk = calculateKetosisRisk(ration, profile)
  const bloatRisk = calculateBloatRisk(ration, profile)
  const mineralRisk = calculateMineralImbalanceRisk(ration)
  const milkFatRisk = calculateMilkFatDepressionRisk(ration, profile)

  // Weighted overall
  const overall =
    acidosisRisk * 0.3 +
    ketosisRisk * 0.25 +
    bloatRisk * 0.2 +
    mineralRisk * 0.15 +
    milkFatRisk * 0.1

  const warnings: RiskWarning[] = []
  if (acidosisRisk > 60) warnings.push({ code: 'ACIDOSIS_HIGH', severity: 'high' })
  if (ketosisRisk > 60) warnings.push({ code: 'KETOSIS_HIGH', severity: 'high' })
  if (bloatRisk > 50) warnings.push({ code: 'BLOAT_HIGH', severity: 'moderate' })
  if (mineralRisk > 70) warnings.push({ code: 'MINERAL_IMBALANCE', severity: 'high' })
  if (milkFatRisk > 50) warnings.push({ code: 'MILK_FAT_DEPRESSION', severity: 'moderate' })

  // More specific mineral warnings (helps explain "neden")
  const caPRatio = ration.totals.pGrams > 0 ? ration.totals.caGrams / ration.totals.pGrams : null
  if (caPRatio && Number.isFinite(caPRatio)) {
    const caPTarget = getCaPRatioTarget(profile)
    if (caPRatio < caPTarget.min) {
      warnings.push({
        code: 'CA_P_RATIO_LOW',
        severity: 'moderate',
        value: caPRatio,
        context: { targetMin: caPTarget.min, targetMax: caPTarget.max },
      })
    } else if (caPRatio > caPTarget.max) {
      warnings.push({
        code: 'CA_P_RATIO_HIGH',
        severity: 'moderate',
        value: caPRatio,
        context: { targetMin: caPTarget.min, targetMax: caPTarget.max },
      })
    }
  }

  const dcad = calculateDCADFromRation(ration)
  if (Number.isFinite(dcad)) {
    const dcadTarget = getDcadTarget(profile)
    if (dcad > dcadTarget.max) {
      warnings.push({
        code: 'DCAD_HIGH',
        severity: 'moderate',
        value: dcad,
        context: { targetMin: dcadTarget.min, targetMax: dcadTarget.max, target: dcadTarget.target },
      })
    } else if (dcad < dcadTarget.min) {
      warnings.push({
        code: 'DCAD_LOW',
        severity: 'moderate',
        value: dcad,
        context: { targetMin: dcadTarget.min, targetMax: dcadTarget.max, target: dcadTarget.target },
      })
    }
  }

  const severity = getSeverity(overall)

  return {
    overall: Math.round(overall),
    acidosis: Math.round(acidosisRisk),
    ketosis: Math.round(ketosisRisk),
    bloat: Math.round(bloatRisk),
    mineralImbalance: Math.round(mineralRisk),
    milkFatDepression: Math.round(milkFatRisk),
    warnings,
    severity,
  }
}

const feedById = new Map<string, Feed>(feedDb.map((f) => [f.id, f]))

function getIngredientCategory(ing: Ration['ingredients'][number]): Feed['category'] | undefined {
  if (ing.feedCategory) return ing.feedCategory
  return feedById.get(ing.feedId)?.category
}

function getIngredientNdfPercent(ing: Ration['ingredients'][number]): number | undefined {
  if (typeof ing.ndfPercent === 'number') return ing.ndfPercent
  return feedById.get(ing.feedId)?.ndfPercent
}

function isAlfalfaLike(ing: Ration['ingredients'][number]): boolean {
  const id = (ing.feedId || '').toLowerCase()
  const name = (ing.feedName || '').toLowerCase()
  return id.includes('alfalfa') || id.includes('yonca') || name.includes('alfalfa') || name.includes('yonca')
}

function forageMetrics(ration: Ration): {
  forageDmKg: number
  totalDmKg: number
  forageShare: number
  forageNdfPercent: number | null
  alfalfaShare: number
} {
  let forageDmKg = 0
  let totalDmKg = 0
  let forageNdfDmWeighted = 0
  let alfalfaDmKg = 0

  for (const ing of ration.ingredients) {
    totalDmKg += ing.kgDMPerDay
    const category = getIngredientCategory(ing)
    if (category !== 'forage') continue
    forageDmKg += ing.kgDMPerDay
    forageNdfDmWeighted += ing.kgDMPerDay * (getIngredientNdfPercent(ing) ?? 0)
    if (isAlfalfaLike(ing)) {
      alfalfaDmKg += ing.kgDMPerDay
    }
  }

  const forageShare = totalDmKg > 0 ? forageDmKg / totalDmKg : 0
  const forageNdfPercent = forageDmKg > 0 ? forageNdfDmWeighted / forageDmKg : null
  const alfalfaShare = forageDmKg > 0 ? alfalfaDmKg / forageDmKg : 0

  return { forageDmKg, totalDmKg, forageShare, forageNdfPercent, alfalfaShare }
}

/**
 * SARA (Subacute Ruminal Acidosis) Risk
 * 
 * Risk faktörleri:
 * - Yüksek nişasta (>28% DM)
 * - Düşük NDF (<28% DM)
 * - Yüksek şeker (>10% DM)
 * - Hızlı fermente olan kaba yem
 */
function calculateAcidosisRisk(ration: Ration, profile: AnimalProfile): number {
  let risk = 0

  // 1. Nişasta riski (en önemli)
  const starch = ration.totals.starchPercent
  if (starch > 28) {
    risk += ((starch - 28) / 7) * 40 // 35% = +40 points
  }

  // 2. NDF düşüklük riski
  const ndf = ration.totals.ndfPercent
  if (ndf < 28) {
    risk += ((28 - ndf) / 8) * 30 // 20% NDF = +30 points
  }

  // 3. Şeker riski
  const sugar = ration.totals.sugarPercent || 0
  if (sugar > 10) {
    risk += ((sugar - 10) / 5) * 15 // 15% = +15 points
  }

  // 4. Yüksek verim riskini artırır
  if (profile.purpose === 'dairy' && (profile.milkYieldKgPerDay || 0) > 35) {
    risk += 10
  }

  return Math.min(risk, 100)
}

/**
 * Ketozis Riski
 * 
 * Risk faktörleri:
 * - Düşük enerji (NEL < gereksinim)
 * - Yüksek süt verimi
 * - Erken laktasyon
 * - Düşük DMI
 */
function calculateKetosisRisk(ration: Ration, profile: AnimalProfile): number {
  if (profile.purpose !== 'dairy') return 0

  let risk = 0

  // 1. Enerji açığı (en kritik)
  const energyDeficit =
    ((ration.requirements.meMcal - ration.totals.mePerDay) / ration.requirements.meMcal) * 100

  if (energyDeficit > 5) {
    risk += energyDeficit * 0.8 // 20% açık = +16 points
  }

  // 2. Yüksek süt verimi
  const milk = profile.milkYieldKgPerDay || 0
  if (milk > 35) {
    risk += ((milk - 35) / 10) * 20 // 45kg = +20 points
  }

  // 3. Erken laktasyon
  if (profile.stage === 'early') {
    risk += 25
  }

  // 4. Düşük DMI (hedefe göre)
  const dmiTarget = ration.requirements.dmiKg
  const dmiActual = ration.totals.dmiKg
  if (dmiActual < dmiTarget * 0.9) {
    risk += 15
  }

  return Math.min(risk, 100)
}

/**
 * Timpani (Bloat) Riski
 * 
 * Risk faktörleri:
 * - Yüksek protein baklagil (yonca >60%)
 * - Genç/yeşil ot
 * - Düşük kaba yem
 */
function calculateBloatRisk(ration: Ration, _profile: AnimalProfile): number {
  let risk = 0

  // 1. Yonca/baklagil oranı (kaba yem DM içinde)
  const fm = forageMetrics(ration)
  if (fm.alfalfaShare > 0.6) {
    risk += 35
  } else if (fm.alfalfaShare > 0.4) {
    risk += 20
  }

  // 2. Basitleştirilmiş: NDF düşük + protein yüksekse risk artar
  const ndf = ration.totals.ndfPercent
  const cp = (ration.totals.cpGrams / (ration.totals.dmiKg * 1000)) * 100

  if (ndf < 30 && cp > 18) {
    risk += 30
  }

  // 3. Çok düşük kaba yem
  if (ndf < 25) {
    risk += 25
  }

  return Math.min(risk, 100)
}

/**
 * Mineral Dengesizlik Riski
 * 
 * DCAD (Dietary Cation-Anion Difference) ve Ca:P oranı
 */
function calculateMineralImbalanceRisk(ration: Ration): number {
  let risk = 0

  // 1. Ca:P oranı (ideal 1.5:1 - 2.5:1)
  const caP = ration.totals.caGrams / ration.totals.pGrams
  if (caP < 1.2 || caP > 3.0) {
    risk += 30
  }

  // 2. DCAD (Na + K - Cl - S) mEq/kg DM
  // Optimal: +150 to +400 mEq/kg for dairy
  const dcad = calculateDCAD(ration)
  if (dcad < 100 || dcad > 500) {
    risk += 25
  }

  // 3. Mg düşüklüğü (grass tetany risk)
  const mgPercent = (ration.totals.mgGrams / (ration.totals.dmiKg * 1000)) * 100
  if (mgPercent < 0.2) {
    risk += 20
  }

  return Math.min(risk, 100)
}

/**
 * Süt Yağ Düşüklüğü Riski
 * 
 * Milk Fat Depression (MFD) faktörleri:
 * - Düşük NDF
 * - Yüksek bitkisel yağ (PUFA)
 * - Düşük kaba yem eNDF
 */
function calculateMilkFatDepressionRisk(ration: Ration, profile: AnimalProfile): number {
  if (profile.purpose !== 'dairy') return 0

  let risk = 0

  // 1. NDF düşüklüğü
  const ndf = ration.totals.ndfPercent
  if (ndf < 30) {
    risk += ((30 - ndf) / 5) * 30 // 25% = +30 points
  }

  // 2. Yüksek yağ (özellikle PUFA)
  const fat = ration.totals.fatPercent
  if (fat > 5.5) {
    risk += ((fat - 5.5) / 1.5) * 25 // 7% = +25 points
  }

  // 3. Düşük kaba yem NDF (proxy: forage NDF)
  const fm = forageMetrics(ration)
  if (fm.forageNdfPercent !== null && fm.forageNdfPercent < 38) {
    risk += ((38 - fm.forageNdfPercent) / 8) * 15
  }
  // 4. Çok düşük forage payı
  if (fm.forageShare > 0 && fm.forageShare < 0.35) {
    risk += 10
  }

  return Math.min(risk, 100)
}

/**
 * DCAD hesapla (mEq/kg DM)
 */
function calculateDCAD(ration: Ration): number {
  const dmi = ration.totals.dmiKg * 1000 // grams

  // mEq = (grams / atomic_weight) × valence × 1000
  const na_meq = (ration.totals.naGrams / 23) * 1000 // Na: AW=23, valence=1
  const k_meq = (ration.totals.kGrams / 39) * 1000 // K: AW=39, valence=1
  const cl_meq = (ration.totals.clGrams / 35.5) * 1000 // Cl: AW=35.5, valence=1
  const s_meq = (ration.totals.sGrams / 32) * 2 * 1000 // S: AW=32, valence=2

  const dcad_total = na_meq + k_meq - cl_meq - s_meq
  return dcad_total / (dmi / 1000) // mEq/kg DM
}

/**
 * Severity kategorisi
 */
function getSeverity(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score < 30) return 'low'
  if (score < 50) return 'moderate'
  if (score < 75) return 'high'
  return 'critical'
}

// Not: ML tahmini bu projede şu an kullanılmıyor; risk skoru tamamen rule-based.
