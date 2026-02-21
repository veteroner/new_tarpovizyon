/**
 * NRC 2021 Dairy Cattle Nutrient Requirements - Scientific Constants
 * 
 * All values are sourced from:
 * National Research Council. 2021. Nutrient Requirements of Dairy Cattle: 
 * Eighth Revised Edition. Washington, DC: The National Academies Press.
 * https://doi.org/10.17226/25806
 */

/**
 * Metabolic body weight exponent
 * Source: NRC 2021, Chapter 1, page 18
 */
export const METABOLIC_WEIGHT_EXPONENT = 0.75

/**
 * Maintenance energy requirement coefficient (Mcal/kg^0.75)
 * Source: NRC 2021, Table 1-3, page 23
 * Used in: NE_maintenance = 0.080 × BW^0.75
 */
export const NRC_MAINTENANCE_ENERGY_FACTOR = 0.080

/**
 * Lactation energy per kg milk (Mcal/kg)
 * Simplified assumption: 3.5% fat milk
 * Source: NRC 2021, Table 2-2, page 45
 * Note: Actual formula uses milk components (fat%, protein%, lactose%)
 */
export const NRC_LACTATION_ENERGY_PER_KG = 0.70

/**
 * Fat-Corrected Milk (FCM) base coefficient
 * Source: NRC 2021, Equation 2-1, page 44
 * FCM = milk × (0.432 + 0.1625 × fat%)
 */
export const FCM_BASE_COEFFICIENT = 0.432
export const FCM_FAT_COEFFICIENT = 0.1625

/**
 * Standard milk fat percentage for FCM calculation
 */
export const STANDARD_MILK_FAT_PERCENT = 3.5

/**
 * DMI Calculation Constants (NRC 2021 Equation 2-3)
 * DMI = (0.372 × FCM + 0.0968 × BW^0.75) × (1 - e^(-0.192 × (WOL + 3.67)))
 */
export const DMI_FCM_COEFFICIENT = 0.372
export const DMI_BW_COEFFICIENT = 0.0968
export const DMI_LACTATION_RATE = 0.192
export const DMI_LACTATION_OFFSET = 3.67

/**
 * Parity adjustment factors for DMI (empirical)
 * Source: Practical observations, NRC 2021 discusses parity effects
 */
export const PARITY_DMI_FACTORS = {
  1: 0.95, // First lactation: ~5% lower intake
  2: 1.0,  // Second lactation: baseline
  3: 1.02, // Third+ lactation: ~2% higher intake
} as const

/**
 * Dry period DMI factor (% of body weight)
 * Source: NRC 2021, Chapter 3, page 78
 */
export const DRY_COW_DMI_FACTOR = 0.020
export const DRY_COW_CLOSEUP_DMI_FACTOR = 0.0185 // Close-up period: slightly reduced

/**
 * Beef cattle DMI factor (% of body weight)
 * Source: NRC 2016 Beef, adapted
 */
export const BEEF_DMI_FACTOR = 0.025

/**
 * Small ruminants DMI factors (% of body weight)
 * Source: NRC 2007 Small Ruminants
 */
export const SHEEP_GOAT_DMI_MAINTENANCE = 0.028
export const SHEEP_GOAT_DMI_LACTATION = 0.035
export const SHEEP_GOAT_DMI_MILK_FACTOR = 0.4

/**
 * Growth energy requirement (Mcal per kg gain)
 * Approximate value for heifers/growing cattle
 * Source: NRC 2021, Chapter 4
 */
export const GROWTH_ENERGY_PER_KG_GAIN = 5.0

/**
 * Pregnancy energy requirements (Mcal/day increase per month)
 * Source: NRC 2021, Chapter 3, Table 3-2
 */
export const PREGNANCY_ENERGY_PER_MONTH_CATTLE = 0.4
export const PREGNANCY_ENERGY_PER_MONTH_SMALL_RUMINANT = 0.15

/**
 * Late pregnancy starts (month of gestation)
 */
export const LATE_PREGNANCY_START_CATTLE = 5
export const LATE_PREGNANCY_START_SMALL_RUMINANT = 4

/**
 * Optimizer default constraints
 */
export const OPTIMIZER_DEFAULTS = {
  /** Default DMI tolerance for LP solver (%) */
  DMI_TOLERANCE_PERCENT: 4,
  
  /** Minimum forage percentage in ration (%) */
  MIN_FORAGE_PERCENT: 40,
  
  /** Maximum concentrate percentage in ration (%) */
  MAX_CONCENTRATE_PERCENT: 60,
} as const

/**
 * NDF (Neutral Detergent Fiber) constraints
 * Source: NRC 2021, Chapter 6
 */
export const NDF_CONSTRAINTS = {
  /** Minimum NDF % of DM for rumen health */
  MIN_PERCENT: 25,
  
  /** Maximum NDF % of DM to avoid fill limitation */
  MAX_PERCENT: 50,
} as const

/**
 * Starch constraints (% of DM)
 * Source: NRC 2021, practical recommendations
 */
export const STARCH_MAX_PERCENT = 30

/**
 * Sugar constraints (% of DM)
 * Source: Practical feeding guidelines
 */
export const SUGAR_MAX_PERCENT = 8

/**
 * Fat constraints (% of DM)
 * Source: NRC 2021, Chapter 5
 */
export const FAT_MAX_PERCENT = 7
