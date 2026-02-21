/**
 * Ration Evaluation Mode Types
 * 
 * Enables validation of currently fed rations with predicted vs actual performance comparison.
 * Critical for enterprise workflows where users need to evaluate existing feeding programs.
 */

import type { AnimalProfile, Ration } from './index'

/**
 * Actual performance data (user-provided)
 */
export interface ActualPerformance {
  // Dairy
  actualMilkYieldKgPerDay?: number
  actualMilkFatPercent?: number
  actualMilkProteinPercent?: number
  actualMilkUreaNitrogen?: number // MUN (mg/dL)
  
  // Beef/Growth
  actualAdgKgPerDay?: number
  actualBodyConditionScore?: number // 1-5 scale
  
  // General
  actualDmiKg?: number
  actualBodyWeightKg?: number
  
  // Health indicators
  fecalScore?: number // 1-5 (1=hard, 5=watery)
  rumenFillScore?: number // 1-5
  
  // Measurement period
  measurementStartDate: string
  measurementEndDate: string
  daysOnRation: number
}

/**
 * Predicted performance (from model)
 */
export interface PredictedPerformance {
  // Dairy
  predictedMilkYieldKgPerDay?: number
  predictedMilkFatPercent?: number
  predictedMilkProteinPercent?: number
  predictedMUN?: number
  
  // Beef/Growth
  predictedAdgKgPerDay?: number
  predictedBcsChange?: number
  
  // Intake
  predictedDmiKg: number
  
  // Model confidence
  confidenceLevel?: 'high' | 'medium' | 'low'
  modelNotes?: string[]
}

/**
 * Performance comparison and validation
 */
export interface PerformanceComparison {
  // Actual vs predicted
  actual: ActualPerformance
  predicted: PredictedPerformance
  
  // Variance analysis
  variances: {
    milkYieldVariancePercent?: number
    adgVariancePercent?: number
    dmiVariancePercent?: number
    bodyWeightVariancePercent?: number
  }
  
  // Validation status
  validationStatus: 'excellent' | 'good' | 'fair' | 'poor'
  
  // Recommendations
  recommendations: string[]
  
  // Possible issues
  potentialIssues?: Array<{
    issue: string
    severity: 'critical' | 'major' | 'minor'
    suggestion: string
  }>
}

/**
 * Ration evaluation request (user input)
 */
export interface RationEvaluationRequest {
  // Animal info
  profile: AnimalProfile
  
  // Fed ration (can be manual input or from library)
  fedRation: {
    ingredients: Array<{
      feedId: string
      feedName: string
      kgAsFedPerDay: number
      lotId?: string // Optional lot reference
    }>
  }
  
  // Actual performance
  actualPerformance: ActualPerformance
  
  // Optional context
  feedingManagement?: {
    feedingsPerDay: number
    tmrUsed: boolean
    waterAccess: '24h' | 'limited'
  }
}

/**
 * Ration evaluation result
 */
export interface RationEvaluationResult {
  // Input
  request: RationEvaluationRequest
  
  // Calculated ration (from optimizer analysis)
  analyzedRation: Ration
  
  // Performance comparison
  performanceComparison: PerformanceComparison
  
  // Nutrient balance check
  nutrientBalance: {
    energyBalance: 'excess' | 'adequate' | 'deficit'
    proteinBalance: 'excess' | 'adequate' | 'deficit'
    mineralBalance: 'good' | 'imbalanced'
    notes: string[]
  }
  
  // Overall assessment
  overallScore: number // 0-100
  evaluationSummary: string
  
  // Improvement suggestions
  improvementSuggestions?: Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'ingredient' | 'amount' | 'timing' | 'management'
    suggestion: string
    expectedImpact: string
  }>
}
