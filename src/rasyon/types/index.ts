// Core domain types
import type { RiskScore, RiskWarning, RiskSeverity, RiskWarningCode } from './risk'

export type { RiskScore, RiskWarning, RiskSeverity, RiskWarningCode }

export type Species = 'cattle' | 'sheep' | 'goat'

export type Purpose = 'dairy' | 'beef' | 'dry' | 'grower'

export type Sex = 'male' | 'female' | 'castrated'

export type LactationStage = 'early' | 'mid' | 'late' | 'dry'

export type Parity = 1 | 2 | 3

export type DairyPhase =
  | 'fresh'
  | 'peak'
  | 'mid'
  | 'late'
  | 'dry-faroff'
  | 'dry-closeup'

export type BeefPhase = 'starter' | 'grower' | 'finisher'

export type ProductionPhase = DairyPhase | BeefPhase

export type BreedType = 
  | 'holstein' 
  | 'simental' 
  | 'brown-swiss' 
  | 'jersey' 
  | 'native-cattle'
  | 'merino'
  | 'akkaraman'
  | 'native-sheep'
  | 'saanen'
  | 'native-goat'

export interface AnimalProfile {
  id?: string
  species: Species
  breed: BreedType
  sex: Sex
  purpose: Purpose
  weightKg: number
  stage: LactationStage
  parity?: Parity
  productionPhase?: ProductionPhase
  milkYieldKgPerDay?: number
  targetAdgKgPerDay?: number
  groupSize?: number
  pregnancyMonth?: number
  bodyConditionScore?: number
  climateTemperature?: number
}

export type FeedCategory = 'forage' | 'concentrate' | 'mineral'

export interface Feed {
  id: string
  name: string
  category: FeedCategory
  
  // Basic composition (% of DM unless specified)
  dmPercent: number
  meMcalPerKg: number
  nelMcalPerKg?: number
  cpPercent: number
  ndfPercent: number
  starchPercent?: number
  sugarPercent?: number
  fatPercent?: number
  
  // Protein fractions (optional, % of CP)
  rdpPercent?: number // Rumen degradable protein
  rupPercent?: number // Rumen undegradable protein (bypass)
  rupDigestibilityPercent?: number // Intestinal digestibility of RUP
  
  // Macro Minerals (% DM)
  caPercent: number
  pPercent: number
  mgPercent?: number
  naPercent?: number
  kPercent?: number
  sPercent?: number
  clPercent?: number
  
  // Trace Minerals (mg/kg DM or ppm)
  fePpm?: number // Iron
  znPpm?: number // Zinc
  cuPpm?: number // Copper
  mnPpm?: number // Manganese
  coPpm?: number // Cobalt
  iPpm?: number // Iodine
  sePpm?: number // Selenium
  
  // Fat-Soluble Vitamins (IU/kg DM or mg/kg DM)
  vitaminAIUPerKg?: number
  vitaminDIUPerKg?: number
  vitaminEIUPerKg?: number
  vitaminKMgPerKg?: number
  
  // Economic
  priceTLPerKg: number
  
  // Nutritional Constraints (scientifically validated feeding limits)
  nutritionalConstraints?: {
    minInclusionPctOfDM?: number // Minimum % of total DM (e.g., 0 for optional ingredients)
    maxInclusionPctOfDM?: number // Maximum % of total DM (based on NRC 2021 and scientific literature)
    reason?: string // Scientific rationale for the constraint (toxicity, rumen health, nutrient imbalance, etc.)
  }
  
  // Metadata
  source?: 'built-in' | 'user'
  region?: string
  quality?: 'low' | 'medium' | 'high'
  isOrganic?: boolean
  description?: string
  warnings?: string[]
}

export interface FeedConstraint {
  maxAsFedKgPerDay?: number
  minAsFedKgPerDay?: number
  priceOverrideTLPerKg?: number
  note?: string
}

export interface SelectedFeed extends FeedConstraint {
  feedId: string
  enabled: boolean
}

export interface OptimizationPreferences {
  solver?: 'auto' | 'greedy' | 'lp'
  lpDmiTolerancePercent?: number
  maxCostPerDay?: number
  prioritizeOrganic?: boolean
  excludeFeeds?: string[]
  minForagePercent?: number
  maxConcentratePercent?: number
  feedConstraints?: Record<string, FeedConstraint>
  /**
   * Çeşitlilik/rol kısıtları (MIP ile uygulanır).
   * Not: Bu değerler tanımlanırsa LP problemi MIP'e döner (binary değişkenler).
   */
  minActiveFeeds?: number
  minForageFeeds?: number
  minConcentrateFeeds?: number
  minMineralFeeds?: number
}

export interface NutrientRequirement {
  dmiKg: number
  meMcal: number
  nelMcal?: number
  /**
   * Beef energy system (optional): Net energy for maintenance and gain.
   * When present, LP can enforce NEm/NEg constraints instead of ME-only.
   */
  nemMcal?: number
  negMcal?: number
  cpGrams: number
  mpGrams?: number
  /**
   * Protein fractions requirements (optional, g/day)
   * When present, optimizer can track RDP/RUP balance for better microbial protein synthesis
   */
  rdpGrams?: number
  rupGrams?: number
  ndfPercentMin: number
  ndfPercentMax?: number
  starchPercentMax: number
  sugarPercentMax: number
  fatPercentMax: number
  
  // Macro Minerals (grams per day)
  caGrams: number
  pGrams: number
  mgGrams: number
  naGrams: number
  kGrams: number
  sGrams: number
  clGrams: number
  
  // Trace Minerals (mg per day)
  feMg?: number
  znMg?: number
  cuMg?: number
  mnMg?: number
  coMg?: number
  iMg?: number
  seMg?: number
  
  // Fat-Soluble Vitamins (IU or mg per day)
  vitaminAIU?: number
  vitaminDIU?: number
  vitaminEIU?: number
  vitaminKMg?: number
}

export interface RationIngredient {
  feedId: string
  feedName: string
  feedCategory?: FeedCategory
  ndfPercent?: number
  kgAsFedPerDay: number
  kgDMPerDay: number
  costTL: number
}

export interface RationTotals {
  dmiKg: number
  mePerDay: number
  /** Optional beef energy totals (Mcal/day) */
  nemPerDay?: number
  negPerDay?: number
  cpGrams: number
  /** Optional protein fractions (g/day) */
  rdpGrams?: number
  rupGrams?: number
  mcpGrams?: number // Microbial crude protein
  mpGrams?: number // Metabolizable protein
  ndfPercent: number
  starchPercent: number
  sugarPercent: number
  fatPercent: number
  
  // Macro Minerals (grams)
  caGrams: number
  pGrams: number
  mgGrams: number
  naGrams: number
  kGrams: number
  sGrams: number
  clGrams: number
  
  // Trace Minerals (mg)
  feMg?: number
  znMg?: number
  cuMg?: number
  mnMg?: number
  coMg?: number
  iMg?: number
  seMg?: number
  
  // Fat-Soluble Vitamins (IU or mg)
  vitaminAIU?: number
  vitaminDIU?: number
  vitaminEIU?: number
  vitaminKMg?: number
}

export interface CostSummary {
  dailyFeedCostTL: number
  costPerKgMilk?: number
  costPerKgGain?: number
  monthlyCostTL: number
}

export interface AIExplanation {
  summary: string
  feedReasons: Array<{
    feedName: string
    reason: string
  }>
  criticalPoints: string[]
  recommendations: string[]
}

export interface Alternative {
  feedId: string
  feedName: string
  reason: string
  potentialCostSaving?: number
  impactOnNutrients?: string
}

export interface ShadowPrice {
  constraintName: string
  constraintLabel: string
  shadowPrice: number
  slack: number
  isBinding: boolean
  explanation: string
}

export interface OptimizerDiagnostics {
  shadowPrices?: ShadowPrice[]
  objectiveValue?: number
  solverStatus?: string
  iterations?: number
  solveDurationMs?: number
}

export interface InfeasibilityDiagnostic {
  constraintType: string
  constraintLabel: string
  current: number
  target: number
  deficit: number
  suggestion: string
  severity: 'critical' | 'major' | 'minor'
}

export interface Ration {
  id: string
  createdAt: string
  updatedAt?: string

  // Metadata
  solver?: 'lp' | 'greedy'
  optimizerNotes?: string[]
  optimizerDiagnostics?: OptimizerDiagnostics
  userEnteredPrices?: Record<string, number> // feedId -> priceOverrideTLPerKg
  
  // Input
  profile: AnimalProfile
  
  // Requirements
  requirements: NutrientRequirement
  
  // Solution
  ingredients: RationIngredient[]
  totals: RationTotals
  
  // Cost
  cost: CostSummary
  
  // AI & Advanced
  riskScore?: RiskScore
  aiExplanation?: AIExplanation
  alternatives?: Alternative[]
  
  // Evaluation (for feedback loop - actual vs predicted performance)
  evaluations?: Array<{
    evaluatedAt: string // ISO date when evaluation was performed
    actualPerformance: import('./evaluation').ActualPerformance
    comparison: import('./evaluation').PerformanceComparison
  }>
}
