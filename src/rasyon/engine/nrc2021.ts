/**
 * NRC-Inspired Nutrient Calculations (Simplified/Heuristic)
 * 
 * UYARI: Bu hesaplamalar NRC 2021'den esinlenmiştir ancak tam NRC uygulaması DEĞİLDİR.
 * Gerçek sahada kullanmadan önce mutlaka bir hayvan beslemesi uzmanı ile doğrulatın.
 * 
 * Basitleştirmeler:
 * - DMI: NRC dairy formülünün sadeleştirilmiş versiyonu (WOL/parity yaklaşıklamaları)
 * - Enerji/Protein: NEL→ME ve MP→CP dönüşümleri sabit katsayılarla (~0.65, ~0.67)
 * - Mineraller: Genel hedef bantlar (her hayvan/ırk/bölge farklılıklarını tam yansıtmaz)
 */

import type { AnimalProfile, NutrientRequirement } from '@/types'
import {
  BEEF_DMI_FACTOR,
  DMI_BW_COEFFICIENT,
  DMI_FCM_COEFFICIENT,
  DMI_LACTATION_OFFSET,
  DMI_LACTATION_RATE,
  DRY_COW_CLOSEUP_DMI_FACTOR,
  DRY_COW_DMI_FACTOR,
  FCM_BASE_COEFFICIENT,
  FCM_FAT_COEFFICIENT,
  GROWTH_ENERGY_PER_KG_GAIN,
  LATE_PREGNANCY_START_CATTLE,
  LATE_PREGNANCY_START_SMALL_RUMINANT,
  METABOLIC_WEIGHT_EXPONENT,
  NRC_LACTATION_ENERGY_PER_KG,
  NRC_MAINTENANCE_ENERGY_FACTOR,
  PARITY_DMI_FACTORS,
  PREGNANCY_ENERGY_PER_MONTH_CATTLE,
  PREGNANCY_ENERGY_PER_MONTH_SMALL_RUMINANT,
  SHEEP_GOAT_DMI_LACTATION,
  SHEEP_GOAT_DMI_MAINTENANCE,
  SHEEP_GOAT_DMI_MILK_FACTOR,
  STANDARD_MILK_FAT_PERCENT,
} from '@/constants/nrcConstants'

import {
  calculateNEgRequirementMcalPerDay,
  calculateNEmRequirementMcalPerDay,
  estimateDietaryMEFromNEm,
  estimateEquivalentShrunkBodyWeightKg,
  estimateShrunkBodyWeightKg,
  solveDietaryNEmConcentrationMcalPerKgDm,
} from './beefEnergy'

/**
 * Calculate Dry Matter Intake (DMI) based on NRC 2021 guidelines
 * 
 * This is a simplified implementation of NRC 2021 DMI equations.
 * 
 * **Formula (Dairy Cattle):**
 * ```
 * DMI = (0.372 × FCM + 0.0968 × BW^0.75) × (1 - e^(-0.192 × (WOL + 3.67)))
 * ```
 * 
 * **Adjustments:**
 * - Parity factor: First lactation -5%, third+ lactation +2%
 * - Dry cows: 2.0% of body weight (far-off) or 1.85% (close-up)
 * - Beef cattle: 2.5% of body weight with weight adjustment
 * - Small ruminants: 2.8-3.5% of body weight + milk factor
 * 
 * **WARNING:** This is a simplified approximation. For production use,
 * consult with a certified animal nutritionist.
 * 
 * @param profile - Animal profile with species, weight, purpose, and production data
 * @returns Dry matter intake in kg/day
 * 
 * @example
 * ```typescript
 * const dmi = calculateDMI_NRC2021({
 *   species: 'cattle',
 *   breed: 'holstein',
 *   purpose: 'dairy',
 *   weightKg: 650,
 *   milkYieldKgPerDay: 30,
 *   parity: 2,
 *   productionPhase: 'mid'
 * })
 * // Returns: ~24-26 kg/day
 * ```
 * 
 * @see {@link https://nap.nationalacademies.org/catalog/25806|NRC 2021 Dairy Cattle}
 */
export function calculateDMI_NRC2021(profile: AnimalProfile): number {
  const { species, weightKg, purpose, milkYieldKgPerDay, stage, pregnancyMonth, productionPhase, parity } = profile

  if (species === 'cattle') {
    // Dry stage overrides lactation intake behavior (dry-off, health, management)
    if (stage === 'dry') {
      // Close-up dry cows typically reduce intake capacity.
      const closeUp = productionPhase === 'dry-closeup'
      return weightKg * (closeUp ? DRY_COW_CLOSEUP_DMI_FACTOR : DRY_COW_DMI_FACTOR)
    }
    if (purpose === 'dairy') {
      // Süt ineği DMI (NRC 2021)
      const bwMetabolic = Math.pow(weightKg, METABOLIC_WEIGHT_EXPONENT)
      const fcm = calculateFCM(milkYieldKgPerDay || 0) // Fat-corrected milk
      const weekOfLactation = (() => {
        // Phase-aware mapping (still simplified).
        // "Fresh" typically spans ~0-21 DIM; use WOL≈3 as a practical midpoint.
        if (productionPhase === 'fresh') return 3
        if (productionPhase === 'peak') return 6
        if (productionPhase === 'mid') return 15
        if (productionPhase === 'late') return 30
        // Fallback to coarse stage
        return stage === 'early' ? 2 : stage === 'mid' ? 15 : 30
      })()

      // NRC 2021 equation (simplified)
      const baseDMI = DMI_FCM_COEFFICIENT * fcm + DMI_BW_COEFFICIENT * bwMetabolic
      const lactationFactor = 1 - Math.exp(-DMI_LACTATION_RATE * (weekOfLactation + DMI_LACTATION_OFFSET))

      // Parity effect (practical heuristic): 1st lactation tends to eat slightly less.
      const parityFactor = PARITY_DMI_FACTORS[parity as keyof typeof PARITY_DMI_FACTORS] ?? 1.0

      return baseDMI * lactationFactor * parityFactor
    } else if (purpose === 'beef') {
      // Besi DMI (NRC Beef)
      return weightKg * BEEF_DMI_FACTOR * (1 + 0.15 * (600 - weightKg) / 600)
    } else if (purpose === 'dry') {
      // Kuru dönem DMI
      return weightKg * DRY_COW_DMI_FACTOR
    }
  } else if (species === 'sheep' || species === 'goat') {
    // Küçükbaş DMI (NRC Small Ruminants)
    if (stage === 'dry' || purpose === 'dry') {
      // Dry / maintenance-like intake (management, dry-off, late pregnancy)
      const base = weightKg * SHEEP_GOAT_DMI_MAINTENANCE
      if (pregnancyMonth && pregnancyMonth >= LATE_PREGNANCY_START_SMALL_RUMINANT) {
        // Late gestation can slightly reduce intake capacity
        const m = Math.min(5, pregnancyMonth)
        return base * (1 - 0.02 * (m - 3))
      }
      return base
    }
    if (purpose === 'dairy') {
      const milk = milkYieldKgPerDay || 0
      return weightKg * SHEEP_GOAT_DMI_LACTATION + milk * SHEEP_GOAT_DMI_MILK_FACTOR
    } else {
      return weightKg * 0.030
    }
  }

  // Fallback
  return weightKg * BEEF_DMI_FACTOR
}

/**
 * Calculate Fat-Corrected Milk (FCM) to 3.5% fat standard
 * 
 * Converts actual milk yield to a standardized energy-corrected value.
 * 
 * **Formula:**
 * ```
 * FCM = milk × (0.432 + 0.1625 × fat%)
 * ```
 * 
 * @param milk - Actual milk yield in kg/day
 * @param fatPercent - Milk fat percentage (default: 3.5%)
 * @returns Fat-corrected milk in kg/day
 * 
 * @internal
 */
function calculateFCM(milk: number, fatPercent: number = STANDARD_MILK_FAT_PERCENT): number {
  // NRC formula: FCM = milk × (0.432 + 0.1625 × fat%)
  return milk * (FCM_BASE_COEFFICIENT + FCM_FAT_COEFFICIENT * fatPercent)
}

/**
 * Calculate Net Energy for Lactation (NEL) requirement
 * 
 * Total energy requirement is the sum of:
 * 1. Maintenance energy (0.080 Mcal/kg^0.75)
 * 2. Lactation energy (~0.70 Mcal/kg milk)
 * 3. Pregnancy energy (increases in late gestation)
 * 4. Growth energy (~5.0 Mcal/kg gain)
 * 
 * **Formula:**
 * ```
 * NEL = NE_maintenance + NE_lactation + NE_pregnancy + NE_growth
 * NE_maintenance = 0.080 × BW^0.75
 * NE_lactation = milk × 0.70 (3.5% fat assumption)
 * ```
 * 
 * **Note:** This returns NEL (Net Energy Lactation). To get ME (Metabolizable Energy),
 * multiply by efficiency factor (~0.65).
 * 
 * @param profile - Animal profile with weight and production data
 * @returns Net energy requirement in Mcal/day
 * 
 * @example
 * ```typescript
 * const energy = calculateEnergyNEL_NRC2021({
 *   species: 'cattle',
 *   weightKg: 650,
 *   purpose: 'dairy',
 *   milkYieldKgPerDay: 30
 * })
 * // Returns: ~31 Mcal/day (10.3 maintenance + 21 lactation)
 * ```
 */
export function calculateEnergyNEL_NRC2021(profile: AnimalProfile): number {
  const { species, weightKg, milkYieldKgPerDay, purpose, pregnancyMonth } = profile

  // 1. Maintenance (NRC)
  const bwMetabolic = Math.pow(weightKg, METABOLIC_WEIGHT_EXPONENT)
  const neMaintenance = NRC_MAINTENANCE_ENERGY_FACTOR * bwMetabolic // Mcal

  // 2. Lactation
  let neLactation = 0
  if (purpose === 'dairy' && profile.stage !== 'dry' && milkYieldKgPerDay) {
    // NE_L = milk × (0.0929 × fat% + 0.0563 × protein% + 0.0395 × lactose%)
    // Simplification: 0.70 Mcal/kg milk (3.5% fat)
    neLactation = milkYieldKgPerDay * NRC_LACTATION_ENERGY_PER_KG
  }

  // 3. Pregnancy (late stage)
  let nePregnancy = 0
  if (pregnancyMonth) {
    if (species === 'cattle' && pregnancyMonth >= LATE_PREGNANCY_START_CATTLE) {
      // Gradual increase (approx): month 5-9
      const m = Math.min(9, pregnancyMonth)
      nePregnancy = (m - 4) * PREGNANCY_ENERGY_PER_MONTH_CATTLE
    }
    if ((species === 'sheep' || species === 'goat') && pregnancyMonth >= LATE_PREGNANCY_START_SMALL_RUMINANT) {
      // Small ruminants: shorter gestation; ramp earlier but smaller absolute load
      const m = Math.min(5, pregnancyMonth)
      const sizeFactor = Math.max(0.6, Math.min(1.6, weightKg / 50))
      nePregnancy = (m - 3) * PREGNANCY_ENERGY_PER_MONTH_SMALL_RUMINANT * sizeFactor
    }
  }

  // 4. Growth (for growers/heifers)
  let neGrowth = 0
  if (purpose === 'grower' && weightKg < 500) {
    const targetADG = profile.targetAdgKgPerDay || 0.8
    neGrowth = targetADG * GROWTH_ENERGY_PER_KG_GAIN
  }

  return neMaintenance + neLactation + nePregnancy + neGrowth
}

/**
 * Calculate Metabolizable Protein (MP) requirement
 * 
 * Total protein requirement is the sum of:
 * 1. Maintenance protein (4.0 g/kg^0.75)
 * 2. Lactation protein (~35 g/kg milk)
 * 3. Pregnancy protein (increases in late gestation)
 * 4. Growth protein (~200 g/kg gain)
 * 
 * **Formula:**
 * ```
 * MP = MP_maintenance + MP_lactation + MP_pregnancy + MP_growth
 * MP_maintenance = 4.0 × BW^0.75
 * MP_lactation = milk × 1000 × 0.032 × 1.1
 * ```
 * 
 * **Note:** This returns MP (Metabolizable Protein). To get CP (Crude Protein),
 * divide by efficiency (~0.67).
 * 
 * @param profile - Animal profile with weight and production data
 * @returns Metabolizable protein requirement in grams/day
 * 
 * @example
 * ```typescript
 * const protein = calculateProteinMP_NRC2021({
 *   species: 'cattle',
 *   weightKg: 650,
 *   purpose: 'dairy',
 *   milkYieldKgPerDay: 30
 * })
 * // Returns: ~1200 grams/day
 * ```
 */
export function calculateProteinMP_NRC2021(profile: AnimalProfile): number {
  const { species, weightKg, milkYieldKgPerDay, purpose, pregnancyMonth } = profile

  // 1. Maintenance
  const bwMetabolic = Math.pow(weightKg, 0.75)
  const mpMaintenance = 4.0 * bwMetabolic // grams

  // 2. Lactation
  let mpLactation = 0
  if (purpose === 'dairy' && profile.stage !== 'dry' && milkYieldKgPerDay) {
    // Milk protein ~3.2%, MP requirement ~1.1 × milk protein
    mpLactation = milkYieldKgPerDay * 1000 * 0.032 * 1.1 // grams
  }

  // 3. Pregnancy
  let mpPregnancy = 0
  if (pregnancyMonth) {
    if (species === 'cattle' && pregnancyMonth >= 5) {
      const m = Math.min(9, pregnancyMonth)
      mpPregnancy = (m - 4) * 25
    }
    if ((species === 'sheep' || species === 'goat') && pregnancyMonth >= 4) {
      const m = Math.min(5, pregnancyMonth)
      const sizeFactor = Math.max(0.6, Math.min(1.6, weightKg / 50))
      mpPregnancy = (m - 3) * 12 * sizeFactor
    }
  }

  // 4. Growth
  let mpGrowth = 0
  if (purpose === 'grower') {
    const targetADG = profile.targetAdgKgPerDay || 0.8
    mpGrowth = targetADG * 200 // Rough: 200g MP per kg gain
  }

  return mpMaintenance + mpLactation + mpPregnancy + mpGrowth
}

/**
 * Calculate macro mineral requirements (Ca, P, Mg, Na, K, S, Cl)
 * 
 * Returns daily mineral requirements in grams based on animal profile.
 * Values are derived from NRC 2021 guidelines with simplified assumptions.
 * 
 * **Key Minerals:**
 * - **Ca (Calcium):** Bone health, milk production, muscle function
 * - **P (Phosphorus):** Energy metabolism, bone health (Ca:P ratio important)
 * - **Mg (Magnesium):** Enzyme function, prevents grass tetany
 * - **Na (Sodium):** Electrolyte balance, osmotic regulation
 * - **K (Potassium):** Muscle function, DCAD calculation
 * - **S (Sulfur):** Amino acid synthesis, DCAD calculation
 * - **Cl (Chloride):** Acid-base balance, DCAD calculation
 * 
 * **Special Considerations:**
 * - Dry close-up cows: Lower DCAD required (anionic salts)
 * - Lactating cows: Higher Ca and P for milk production
 * - Growing animals: Higher requirements for bone development
 * 
 * @param profile - Animal profile with species, weight, and production data
 * @returns Object with mineral requirements in grams/day
 * 
 * @example
 * ```typescript
 * const minerals = calculateMinerals_NRC2021({
 *   species: 'cattle',
 *   weightKg: 650,
 *   purpose: 'dairy',
 *   milkYieldKgPerDay: 30
 * })
 * // Returns: { caGrams: 120, pGrams: 80, ... }
 * ```
 */
export function calculateMinerals_NRC2021(profile: AnimalProfile): {
  caGrams: number
  pGrams: number
  mgGrams: number
  naGrams: number
  kGrams: number
  sGrams: number
  clGrams: number
} {
  const dmi = calculateDMI_NRC2021(profile)
  const { milkYieldKgPerDay, purpose } = profile

  // Ca/P requirements (% of DM)
  let caPercent = 0.4 // Base
  let pPercent = 0.3

  if (purpose === 'dairy' && milkYieldKgPerDay) {
    // High milk = higher Ca/P
    caPercent = 0.6 + (milkYieldKgPerDay - 20) * 0.01
    pPercent = 0.35
  }

  const caGrams = (dmi * 1000 * caPercent) / 100
  const pGrams = (dmi * 1000 * pPercent) / 100

  return {
    caGrams,
    pGrams,
    mgGrams: dmi * 2.0, // Mg: ~2g/kg DM
    naGrams: dmi * 1.5, // Na: ~1.5g/kg DM
    kGrams: dmi * 10.0, // K: ~10g/kg DM
    sGrams: dmi * 2.0, // S: ~2g/kg DM
    clGrams: dmi * 2.5, // Cl: ~2.5g/kg DM
  }
}

/**
 * Calculate trace mineral requirements (Fe, Zn, Cu, Mn, Co, I, Se)
 * 
 * Returns daily trace mineral requirements in mg based on NRC 2021 guidelines.
 * These are essential micronutrients required in small amounts for enzyme
 * function, immunity, reproduction, and growth.
 * 
 * **Trace Minerals (NRC 2021):**
 * - **Fe (Iron):** 50-100 mg/kg DM - Hemoglobin, oxygen transport
 * - **Zn (Zinc):** 40-60 mg/kg DM - Immune function, hoof health, skin integrity
 * - **Cu (Copper):** 10-15 mg/kg DM - Iron metabolism, reproduction, coat color
 * - **Mn (Manganese):** 40-50 mg/kg DM - Bone formation, reproduction
 * - **Co (Cobalt):** 0.1-0.2 mg/kg DM - Vitamin B12 synthesis (rumen microbes)
 * - **I (Iodine):** 0.5-0.8 mg/kg DM - Thyroid hormone production
 * - **Se (Selenium):** 0.3 mg/kg DM - Antioxidant, prevents white muscle disease
 * 
 * **Toxicity Concerns:**
 * - **Cu:** Toxic >40 mg/kg DM (especially in sheep)
 * - **Se:** Toxic >5 mg/kg DM (chronic selenosis)
 * - **I:** Toxic >50 mg/kg DM
 * 
 * **Interactions:**
 * - High Fe/Mo/S → Cu deficiency (complex formation)
 * - High Ca → Zn/Mn reduced absorption
 * 
 * @param profile - Animal profile with species, weight, and production data
 * @returns Object with trace mineral requirements in mg/day
 * 
 * @example
 * ```typescript
 * const traceMinerals = calculateTraceMinerals_NRC2021({
 *   species: 'cattle',
 *   weightKg: 650,
 *   purpose: 'dairy'
 * })
 * // Returns: { feMg: 1200, znMg: 1000, cuMg: 200, ... }
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Chapter 11 - Minerals}
 */
export function calculateTraceMinerals_NRC2021(profile: AnimalProfile): {
  feMg: number
  znMg: number
  cuMg: number
  mnMg: number
  coMg: number
  iMg: number
  seMg: number
} {
  const dmi = calculateDMI_NRC2021(profile)
  const { species, purpose, milkYieldKgPerDay } = profile

  // Base requirements (mg/kg DM) - NRC 2021 Table 11-1
  const feReq = 50 // Iron: widely available in forages
  let znReq = 40 // Zinc: critical for immunity
  let cuReq = 10 // Copper: production level dependent
  const mnReq = 40 // Manganese: reproduction/bone
  const coReq = 0.15 // Cobalt: for rumen B12
  const iReq = 0.5 // Iodine: thyroid
  let seReq = 0.3 // Selenium: antioxidant (regulatory limit)

  // Adjust for production level
  if (purpose === 'dairy' && milkYieldKgPerDay && milkYieldKgPerDay > 25) {
    znReq = 60 // High production needs more Zn
    cuReq = 15 // Higher Cu for reproduction/immunity
    seReq = 0.3 // Maintain at safe maximum
  }

  // Species-specific adjustments
  if (species === 'sheep') {
    // Sheep are very sensitive to Cu toxicity
    cuReq = 8 // Lower requirement, avoid toxicity
    seReq = 0.2 // Slightly lower for small ruminants
  }

  if (species === 'goat') {
    // Goats tolerate higher Cu than sheep
    cuReq = 12
    seReq = 0.3
  }

  // Convert to mg/day
  const dmiGrams = dmi * 1000
  return {
    feMg: (dmiGrams * feReq) / 1000,
    znMg: (dmiGrams * znReq) / 1000,
    cuMg: (dmiGrams * cuReq) / 1000,
    mnMg: (dmiGrams * mnReq) / 1000,
    coMg: (dmiGrams * coReq) / 1000,
    iMg: (dmiGrams * iReq) / 1000,
    seMg: (dmiGrams * seReq) / 1000,
  }
}

/**
 * Calculate vitamin requirements (A, D, E, K)
 * 
 * Returns daily vitamin requirements (fat-soluble only; water-soluble B/C
 * synthesized by rumen microbes in sufficient quantities for cattle/sheep/goats).
 * 
 * **Fat-Soluble Vitamins (NRC 2021):**
 * - **Vitamin A:** 80,000-100,000 IU/day for dairy cows
 *   - Vision, reproduction, immunity, epithelial cell integrity
 *   - Deficiency: night blindness, retained placenta, weak calves
 *   - Sources: Green forages (β-carotene), premix
 * 
 * - **Vitamin D:** 30,000-40,000 IU/day for dairy cows
 *   - Calcium/phosphorus absorption, bone mineralization
 *   - Deficiency: rickets (young), osteomalacia (adults), milk fever
 *   - Sources: Sun-cured hay, sunlight (skin synthesis), premix
 * 
 * - **Vitamin E:** 500-1,000 IU/day for dairy cows
 *   - Antioxidant, immune function, prevents white muscle disease
 *   - Requirement increases with PUFA intake (oxidative stress)
 *   - Sources: Fresh forages, premix (α-tocopherol)
 * 
 * - **Vitamin K:** 2-3 mg/kg DM (rarely deficient)
 *   - Blood clotting, bone metabolism
 *   - Synthesized by rumen microbes + abundant in forages
 *   - Deficiency: only with moldy feeds (dicoumarol toxicity)
 * 
 * **Special Considerations:**
 * - Dry/transition period: Double Vit E for immunity
 * - High PUFA diets: 50% more Vit E required
 * - Stressed/sick animals: 2-3x normal Vit A/E
 * 
 * @param profile - Animal profile with species, weight, and production data
 * @returns Object with vitamin requirements (IU or mg per day)
 * 
 * @example
 * ```typescript
 * const vitamins = calculateVitamins_NRC2021({
 *   species: 'cattle',
 *   weightKg: 650,
 *   purpose: 'dairy',
 *   milkYieldKgPerDay: 30
 * })
 * // Returns: { vitaminAIU: 90000, vitaminDIU: 35000, vitaminEIU: 800, vitaminKMg: 60 }
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Chapter 10 - Vitamins}
 */
export function calculateVitamins_NRC2021(profile: AnimalProfile): {
  vitaminAIU: number
  vitaminDIU: number
  vitaminEIU: number
  vitaminKMg: number
} {
  const dmi = calculateDMI_NRC2021(profile)
  const { species, purpose, weightKg, milkYieldKgPerDay, stage, productionPhase } = profile

  // Base requirements (NRC 2021 Table 10-1, 10-2)
  let vitAIUPerDay = 80000 // Cattle base
  let vitDIUPerDay = 30000
  let vitEIUPerDay = 500
  const vitKMgPerKgDM = 2.0 // mg/kg DM

  if (species === 'cattle') {
    if (purpose === 'dairy') {
      // Dairy: scale with body weight and milk yield
      vitAIUPerDay = weightKg * 110 // NRC: 110 IU/kg BW for dairy
      vitDIUPerDay = weightKg * 30 // NRC: 30 IU/kg BW

      // Lactation increases need
      const milk = milkYieldKgPerDay || 0
      if (milk > 20) {
        vitAIUPerDay *= 1.2 // +20% for high production
        vitEIUPerDay = 1000 // Higher antioxidant need
      }

      // Transition/dry period: immune support
      if (stage === 'dry' || productionPhase === 'dry-closeup') {
        vitEIUPerDay = 2000 // 2-4x normal for immunity
        vitAIUPerDay *= 1.5 // Boost for calving/immunity
      }
    } else if (purpose === 'beef' || purpose === 'grower') {
      // Beef/growing: lower requirements
      vitAIUPerDay = weightKg * 50 // 50 IU/kg BW
      vitDIUPerDay = weightKg * 15
      vitEIUPerDay = 300
    }
  } else if (species === 'sheep' || species === 'goat') {
    // Small ruminants: lower absolute amounts
    vitAIUPerDay = weightKg * 150 // Higher per kg BW (smaller animals)
    vitDIUPerDay = weightKg * 40
    vitEIUPerDay = 100 + (milkYieldKgPerDay || 0) * 20
  }

  return {
    vitaminAIU: Math.round(vitAIUPerDay),
    vitaminDIU: Math.round(vitDIUPerDay),
    vitaminEIU: Math.round(vitEIUPerDay),
    vitaminKMg: (dmi * 1000 * vitKMgPerKgDM) / 1000, // Convert to mg/day
  }
}

/**
 * Calculate NDF (Neutral Detergent Fiber) range for rumen health
 * 
 * Returns minimum and maximum NDF percentages (% of DM) required for optimal
 * rumen function, preventing acidosis and maintaining fiber mat.
 * 
 * **NDF Requirements by Purpose:**
 * - **Dairy:** 28-38% DM (higher for early lactation)
 * - **Beef:** 40-70% DM (varies by growth phase)
 * - **Sheep/Goat:** 30-45% DM (smaller rumen capacity)
 * 
 * **Critical Points:**
 * - Too low: Risk of acidosis, reduced fat %, displaced abomasum
 * - Too high: Reduced intake due to gut fill limitation
 * - forage NDF (physically effective) is more important than total NDF
 * 
 * @param profile - Animal profile with species and purpose
 * @returns Object with min and max NDF percentages (% of DM)
 * 
 * @example
 * ```typescript
 * const ndfRange = calculateNDFRange({
 *   species: 'cattle',
 *   purpose: 'dairy'
 * })
 * // Returns: { min: 28, max: 38 }
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Chapter 9}
 */
export function calculateNDFRange(profile: AnimalProfile): { min: number; max: number } {
  const { purpose, species, productionPhase, stage } = profile

  if (species === 'cattle') {
    if (purpose === 'dairy') {
      // Close-up / dry needs more fiber, lower starch.
      if (stage === 'dry' || productionPhase === 'dry-faroff' || productionPhase === 'dry-closeup') {
        return { min: 34, max: 50 }
      }
      // Fresh/peak: keep enough fiber for rumen stability.
      if (productionPhase === 'fresh') return { min: 30, max: 40 }
      if (productionPhase === 'peak') return { min: 28, max: 38 }
      return { min: 28, max: 36 } // % of DM
    } else if (purpose === 'beef') {
      if (productionPhase === 'starter') return { min: 30, max: 45 }
      if (productionPhase === 'finisher') return { min: 20, max: 35 }
      return { min: 25, max: 40 }
    }
  } else if (species === 'sheep' || species === 'goat') {
    return { min: 30, max: 45 }
  }

  return { min: 30, max: 40 }
}

/**
 * Calculate maximum starch percentage to prevent SARA (Sub-Acute Ruminal Acidosis)
 * 
 * Returns maximum recommended starch content (% of DM) to maintain rumen pH
 * above 5.5 and prevent acidosis-related health issues.
 * 
 * **SARA Risk Factors:**
 * - Rapid fermentation of starch → volatile fatty acids (VFA) production
 * - Reduced rumen pH → damaged rumen papillae
 * - Lower fiber digestion and milk fat synthesis
 * - Increased risk of laminitis, liver abscesses
 * 
 * **Starch Limits by Phase:**
 * - **Dry close-up:** 16% (lowest DCAD period, reduced buffering)
 * - **Fresh cows:** 24% (gradual adaptation)
 * - **Peak lactation:** 28% (energy demand highest)
 * - **Finishing beef:** 35-40% (grain-heavy rations)
 * 
 * @param profile - Animal profile with purpose and production phase
 * @returns Maximum starch percentage (% of DM)
 * 
 * @example
 * ```typescript
 * const maxStarch = calculateStarchMax({
 *   purpose: 'dairy',
 *   productionPhase: 'peak',
 *   milkYieldKgPerDay: 40
 * })
 * // Returns: 30 (high-producing cows tolerate more starch)
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Chapter 5 - Carbohydrates}
 */
export function calculateStarchMax(profile: AnimalProfile): number {
  const { purpose, milkYieldKgPerDay, productionPhase, stage } = profile

  if (purpose === 'dairy') {
    if (stage === 'dry' || productionPhase === 'dry-faroff') return 18
    if (productionPhase === 'dry-closeup') return 16
    if (productionPhase === 'fresh') return 24
    if (productionPhase === 'peak') return 28
    if (productionPhase === 'late') return 26
    // Yüksek verim = daha fazla nişasta tolere eder (ama riskli)
    const milk = milkYieldKgPerDay || 0
    if (milk > 35) return 30 // High-producing: 30% max
    if (milk > 25) return 28
    return 25
  } else if (purpose === 'beef') {
    if (productionPhase === 'starter') return 28
    if (productionPhase === 'finisher') return 40
    return 35 // Besi: daha yüksek tolere
  }

  return 25
}

/**
 * Calculate maximum fat percentage to prevent rumen dysfunction
 * 
 * Returns maximum recommended fat content (% of DM) to maintain healthy
 * rumen fermentation and fiber digestion.
 * 
 * **Fat Effects on Rumen:**
 * - **Negative:** Coats fiber particles → reduced microbial attachment
 * - **Negative:** Inhibits cellulolytic bacteria → lower fiber digestion
 * - **Negative:** Decreases DMI due to satiety hormones (CCK)
 * - **Positive:** High energy density (2.25x carbohydrates)
 * - **Positive:** Reduces heat increment (beneficial in hot climates)
 * 
 * **Recommended Limits:**
 * - **Dairy:** 6% DM max (5-6% in high-producing cows)
 * - **Beef:** 7% DM max (finishing rations can go higher)
 * - **Protected fats:** Can exceed limits (rumen-bypass technology)
 * 
 * @param profile - Animal profile with purpose
 * @returns Maximum fat percentage (% of DM)
 * 
 * @example
 * ```typescript
 * const maxFat = calculateFatMax({ purpose: 'dairy' })
 * // Returns: 6.0 (% of DM)
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Chapter 4 - Fats}
 */
export function calculateFatMax(profile: AnimalProfile): number {
  const { purpose } = profile

  if (purpose === 'dairy') {
    return 6.0 // % of DM - rumen fonksiyonunu bozar
  } else if (purpose === 'beef') {
    return 7.0
  }

  return 5.0
}

/**
 * **MAIN FUNCTION:** Calculate complete nutrient requirements using NRC 2021
 * 
 * Orchestrates all NRC 2021 calculation functions to produce a comprehensive
 * nutrient requirement profile for the given animal. This is the primary
 * entry point for the ration optimization engine.
 * 
 * **Calculation Flow:**
 * 1. **DMI:** Dry matter intake capacity (kg/day)
 * 2. **Energy:** NEL for lactation + ME for maintenance/growth (Mcal/day)
 * 3. **Protein:** MP for milk/growth + CP for microbial synthesis (g/day)
 * 4. **Minerals:** Ca, P, Mg, Na, K, S, Cl requirements (g/day)
 * 5. **Fiber:** NDF range for rumen health (% DM)
 * 6. **Limits:** Starch, sugar, fat maximums to prevent disorders
 * 
 * **Key Conversions:**
 * - ME = NEL / 0.65 (metabolizable energy from net energy)
 * - CP = MP / 0.67 (crude protein from metabolizable protein)
 * 
 * **Output Usage:**
 * - Sent to optimizer as constraints/targets
 * - Displayed in UI for transparency
 * - Validated against actual ration composition
 * 
 * @param profile - Complete animal profile with all production data
 * @returns Complete nutrient requirement object with all constraints
 * 
 * @example
 * ```typescript
 * const requirements = calculateRequirements_NRC2021({
 *   species: 'cattle',
 *   breed: 'holstein',
 *   weightKg: 650,
 *   purpose: 'dairy',
 *   stage: 'lactating',
 *   productionPhase: 'peak',
 *   milkYieldKgPerDay: 35,
 *   milkFatPercent: 3.8,
 *   milkProteinPercent: 3.2,
 *   weekPregnant: 0
 * })
 * // Returns: { dmiKg: 24.5, nelMcal: 38.2, mpGrams: 2850, ... }
 * ```
 * 
 * @see {@link https://www.nap.edu/read/25806 NRC 2021 Full Reference}
 */
export function calculateRequirements_NRC2021(profile: AnimalProfile): NutrientRequirement {
  const dmiKg = calculateDMI_NRC2021(profile)
  const isBeefEnergySystem = profile.species === 'cattle' && (profile.purpose === 'beef' || profile.purpose === 'grower')

  // Energy requirements
  let nelMcal: number | undefined
  let nemMcal: number | undefined
  let negMcal: number | undefined

  // Default: dairy-style NEL
  if (!isBeefEnergySystem) {
    nelMcal = calculateEnergyNEL_NRC2021(profile)
  }

  const mpGrams = calculateProteinMP_NRC2021(profile)
  const minerals = calculateMinerals_NRC2021(profile)
  const traceMinerals = calculateTraceMinerals_NRC2021(profile)
  const vitamins = calculateVitamins_NRC2021(profile)
  const ndfRange = calculateNDFRange(profile)
  const starchMax = calculateStarchMax(profile)
  const fatMax = calculateFatMax(profile)

  // Beef/grower: NEm + NEg (NASEM/CNES-style)
  // We also compute a derived ME requirement for UI/reporting consistency.
  let meMcal: number
  if (isBeefEnergySystem) {
    const sbw = estimateShrunkBodyWeightKg(profile.weightKg)
    const eqsbw = estimateEquivalentShrunkBodyWeightKg(sbw)
    const targetAdg = profile.targetAdgKgPerDay ?? 1.0

    nemMcal = calculateNEmRequirementMcalPerDay(sbw)
    negMcal = calculateNEgRequirementMcalPerDay(eqsbw, targetAdg)

    const nemConc = solveDietaryNEmConcentrationMcalPerKgDm({
      dmiKgPerDay: dmiKg,
      nemReqMcalPerDay: nemMcal,
      negReqMcalPerDay: negMcal,
    })
    const meConc = estimateDietaryMEFromNEm(nemConc)
    meMcal = dmiKg * meConc
  } else {
    // ME to NEL conversion (rough): ME = NEL / 0.65
    meMcal = (nelMcal || 0) / 0.65
  }

  // MP to CP conversion (rough): CP = MP / 0.67
  const cpGrams = mpGrams / 0.67

  // RDP/RUP targets (optional, used when protein fractions are tracked)
  // NRC 2021 approach: RDP should support ~130g MCP per Mcal ME (energy-limited)
  // RUP should provide remainder after MCP contribution to MP
  // Simplified heuristic:
  //   - RDP target ≈ ME × 130 / 0.85 (to produce MCP)
  //   - RUP target ≈ (MP - MCP digestible - endogenous) / 0.80
  // This is approximate; full calculation requires iterative diet formulation.
  let rdpGrams: number | undefined
  let rupGrams: number | undefined

  if (mpGrams > 0) {
    // RDP to support microbial protein synthesis (energy-driven)
    const mcpTarget = meMcal * 130 // g MCP from energy
    rdpGrams = mcpTarget / 0.85 // Assuming 85% RDP→MCP efficiency

    // RUP to make up the difference (MP - digestible MCP - endogenous)
    const endogenousProtein = dmiKg * 1.9
    const mcpDigestible = mcpTarget * 0.8
    const rupRequired = Math.max(0, mpGrams - mcpDigestible - endogenousProtein)
    rupGrams = rupRequired / 0.80 // Assuming 80% average RUP digestibility
  }

  return {
    dmiKg,
    meMcal,
    ...(typeof nelMcal === 'number' ? { nelMcal } : {}),
    ...(typeof nemMcal === 'number' ? { nemMcal } : {}),
    ...(typeof negMcal === 'number' ? { negMcal } : {}),
    cpGrams,
    mpGrams, // Yeni: MP ayrı tutuldu
    ...(typeof rdpGrams === 'number' ? { rdpGrams } : {}),
    ...(typeof rupGrams === 'number' ? { rupGrams } : {}),
    ndfPercentMin: ndfRange.min,
    ndfPercentMax: ndfRange.max,
    starchPercentMax: starchMax,
    sugarPercentMax: 10, // Genel limit
    fatPercentMax: fatMax,
    ...minerals,
    ...traceMinerals,
    ...vitamins,
  }
}
