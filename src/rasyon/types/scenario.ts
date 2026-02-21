/**
 * Scenario Comparison Types
 * 
 * Enables what-if analysis and side-by-side comparison of multiple ration scenarios.
 * Critical for economic decision-making and feed procurement planning.
 */

import type { Ration, AnimalProfile, OptimizationPreferences } from './index'

/**
 * Price scenario (what-if price changes)
 */
export interface PriceScenario {
  scenarioId: string
  scenarioName: string
  description?: string
  
  // Price adjustments
  priceAdjustments: Array<{
    feedId: string
    feedName: string
    originalPriceTLPerKg: number
    newPriceTLPerKg: number
    changePercent: number
  }>
  
  // Global adjustments (alternative to individual)
  globalAdjustment?: {
    concentrateChangePercent?: number
    forageChangePercent?: number
    allFeedsChangePercent?: number
  }
}

/**
 * Constraint scenario (relaxed/tightened constraints)
 */
export interface ConstraintScenario {
  scenarioId: string
  scenarioName: string
  description?: string
  
  // Modified preferences
  modifiedPreferences: Partial<OptimizationPreferences>
  
  // Constraint changes
  changes: Array<{
    constraint: string
    original: number
    modified: number
    changeType: 'relaxed' | 'tightened'
  }>
}

/**
 * Feed availability scenario
 */
export interface AvailabilityScenario {
  scenarioId: string
  scenarioName: string
  description?: string
  
  // Available feeds (subset or with limits)
  availableFeeds: Array<{
    feedId: string
    maxAvailableKg?: number // Daily or total
  }>
  
  // Excluded feeds
  excludedFeeds: string[]
}

/**
 * Individual scenario configuration
 */
export interface Scenario {
  scenarioId: string
  scenarioName: string
  scenarioType: 'price' | 'constraint' | 'availability' | 'base' | 'custom'
  
  // Scenario-specific modifications
  priceScenario?: PriceScenario
  constraintScenario?: ConstraintScenario
  availabilityScenario?: AvailabilityScenario
}

/**
 * Scenario comparison request
 */
export interface ScenarioComparisonRequest {
  baseProfile: AnimalProfile
  basePreferences: OptimizationPreferences
  
  scenarios: Scenario[]
}

/**
 * Scenario result (single scenario)
 */
export interface ScenarioResult {
  scenarioId: string
  scenarioName: string
  scenarioType: string
  
  // Optimized ration for this scenario
  ration: Ration | null
  
  // Optimization outcome
  status: 'success' | 'infeasible' | 'error'
  message?: string
  
  // Key metrics
  metrics: {
    dailyCostTL: number
    costPerKgMilk?: number
    costPerKgGain?: number
    dmiKg: number
    ingredientCount: number
    foragePercent: number
    concentratePercent: number
  }
}

/**
 * Scenario comparison result
 */
export interface ScenarioComparisonResult {
  request: ScenarioComparisonRequest
  scenarios: ScenarioResult[]
  
  // Comparative analysis
  comparison: {
    // Cost comparison
    lowestCostScenario: string
    highestCostScenario: string
    costRangeTL: {
      min: number
      max: number
      spread: number
      spreadPercent: number
    }
    
    // Ingredient diversity
    mostDiverseScenario: string
    leastDiverseScenario: string
    
    // Feasibility
    feasibleScenarios: string[]
    infeasibleScenarios: string[]
  }
  
  // Trade-off analysis
  tradeoffs: Array<{
    metric: string
    unit: string
    values: Record<string, number> // scenarioId -> value
    bestScenario: string
    worstScenario: string
  }>
  
  // Recommendations
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    recommendation: string
    affectedScenarios: string[]
  }>
}

/**
 * Price sensitivity analysis
 */
export interface PriceSensitivityAnalysis {
  feedId: string
  feedName: string
  
  // Current state
  currentPriceTLPerKg: number
  currentUsageKgPerDay: number
  currentCostTL: number
  
  // Sensitivity points
  sensitivityCurve: Array<{
    priceTLPerKg: number
    priceChangePercent: number
    usageKgPerDay: number
    totalCostTL: number
    inRation: boolean
  }>
  
  // Breakeven analysis
  priceElasticity: number
  breakEvenPriceTL?: number // Price at which feed is dropped from ration
  substitutionPrice?: {
    feedId: string
    feedName: string
    priceTL: number
  }
}
