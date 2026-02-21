/**
 * Ration Evaluation Engine
 * 
 * Evaluates currently fed rations and compares predicted vs actual performance.
 */

import type { RationEvaluationRequest, RationEvaluationResult, PerformanceComparison, PredictedPerformance } from '@/types/evaluation'
import type { Ration } from '@/types'
import { calculateRequirements_NRC2021 } from './nrc2021'

/**
 * Calculate predicted performance from ration and profile
 */
export function calculatePredictedPerformance(
  ration: Ration
): PredictedPerformance {
  const { profile, totals } = ration

  const predicted: PredictedPerformance = {
    predictedDmiKg: totals.dmiKg,
  }

  // Dairy: predict milk yield based on energy balance
  if (profile.purpose === 'dairy' && profile.milkYieldKgPerDay) {
    // Energy available for milk production
    const requirements = calculateRequirements_NRC2021(profile)
    const energySurplus = totals.mePerDay - requirements.meMcal

    // Rough: 1 kg milk ≈ 0.7 Mcal ME
    const additionalMilkPotential = energySurplus / 0.7
    predicted.predictedMilkYieldKgPerDay = Math.max(
      0,
      profile.milkYieldKgPerDay + additionalMilkPotential
    )

    // Milk composition (simplified)
    // TODO: Add milkFatPercent and milkProteinPercent to AnimalProfile
    predicted.predictedMilkFatPercent = 3.5 // profile.milkFatPercent || 3.5
    predicted.predictedMilkProteinPercent = 3.2 // profile.milkProteinPercent || 3.2

    // MUN estimation (very simplified)
    const cpPercent = (totals.cpGrams / (totals.dmiKg * 1000)) * 100
    predicted.predictedMUN = Math.max(8, Math.min(20, cpPercent * 2 - 20))
  }

  // Beef/Grower: predict ADG based on energy balance
  if ((profile.purpose === 'beef' || profile.purpose === 'grower') && typeof totals.negPerDay === 'number') {
    // NEg available for gain
    const requirements = calculateRequirements_NRC2021(profile)
    
    if (typeof requirements.negMcal === 'number') {
      const negSurplus = totals.negPerDay - requirements.negMcal
      
      // Rough: 1 kg gain ≈ 5 Mcal NEg (varies by body composition)
      predicted.predictedAdgKgPerDay = Math.max(0, negSurplus / 5.0)
    } else {
      // Fallback to ME-based estimation
      const energySurplus = totals.mePerDay - requirements.meMcal
      predicted.predictedAdgKgPerDay = Math.max(0, energySurplus / 12.0)
    }
  }

  predicted.confidenceLevel = 'medium'
  predicted.modelNotes = [
    'Tahminler basitleştirilmiş enerji dengesi modelinden türetilmiştir.',
    'Hayvan sağlığı, çevre koşulları ve bireysel farklılıklar performansı etkileyebilir.',
  ]

  return predicted
}

/**
 * Compare actual vs predicted performance
 */
export function comparePerformance(
  request: RationEvaluationRequest,
  ration: Ration
): PerformanceComparison {
  const actual = request.actualPerformance
  const predicted = calculatePredictedPerformance(ration)

  const variances: PerformanceComparison['variances'] = {}

  // Milk yield variance
  if (actual.actualMilkYieldKgPerDay && predicted.predictedMilkYieldKgPerDay) {
    const variance = ((actual.actualMilkYieldKgPerDay - predicted.predictedMilkYieldKgPerDay) / predicted.predictedMilkYieldKgPerDay) * 100
    variances.milkYieldVariancePercent = variance
  }

  // ADG variance
  if (actual.actualAdgKgPerDay && predicted.predictedAdgKgPerDay) {
    const variance = ((actual.actualAdgKgPerDay - predicted.predictedAdgKgPerDay) / predicted.predictedAdgKgPerDay) * 100
    variances.adgVariancePercent = variance
  }

  // DMI variance
  if (actual.actualDmiKg) {
    const variance = ((actual.actualDmiKg - predicted.predictedDmiKg) / predicted.predictedDmiKg) * 100
    variances.dmiVariancePercent = variance
  }

  // Body weight variance
  if (actual.actualBodyWeightKg) {
    const variance = ((actual.actualBodyWeightKg - request.profile.weightKg) / request.profile.weightKg) * 100
    variances.bodyWeightVariancePercent = variance
  }

  // Determine validation status
  const avgVariance = Object.values(variances).reduce((sum, v) => sum + Math.abs(v), 0) / Object.values(variances).length
  const validationStatus: PerformanceComparison['validationStatus'] =
    avgVariance <= 5 ? 'excellent' :
    avgVariance <= 10 ? 'good' :
    avgVariance <= 20 ? 'fair' : 'poor'

  // Generate recommendations
  const recommendations: string[] = []
  const potentialIssues: PerformanceComparison['potentialIssues'] = []

  if (variances.dmiVariancePercent && Math.abs(variances.dmiVariancePercent) > 10) {
    if (variances.dmiVariancePercent > 0) {
      recommendations.push('DMI tahmin edilen seviyenin üzerinde. Yem palatability ve yem katma sıklığını kontrol edin.')
    } else {
      potentialIssues.push({
        issue: 'DMI tahmin edilen seviyenin altında',
        severity: 'major',
        suggestion: 'Yem kalitesi, rumen sağlığı ve stres faktörlerini kontrol edin. NDF seviyesi çok yüksek olabilir.',
      })
    }
  }

  if (variances.milkYieldVariancePercent && variances.milkYieldVariancePercent < -10) {
    potentialIssues.push({
      issue: 'Süt verimi beklenenden düşük',
      severity: 'critical',
      suggestion: 'Enerji ve protein dengesi yetersiz olabilir. ME ve MP seviyelerini kontrol edin.',
    })
  }

  if (variances.adgVariancePercent && variances.adgVariancePercent < -15) {
    potentialIssues.push({
      issue: 'Canlı ağırlık artışı hedefin altında',
      severity: 'major',
      suggestion: 'NEg yeterli mi kontrol edin. Hayvan sağlığı ve stres faktörlerini değerlendirin.',
    })
  }

  return {
    actual,
    predicted,
    variances,
    validationStatus,
    recommendations,
    potentialIssues: potentialIssues.length > 0 ? potentialIssues : undefined,
  }
}

/**
 * Evaluate a fed ration
 */
export function evaluateRation(
  request: RationEvaluationRequest,
  analyzedRation: Ration
): RationEvaluationResult {
  // Compare performance
  const performanceComparison = comparePerformance(request, analyzedRation)

  // Nutrient balance assessment
  const totals = analyzedRation.totals
  const requirements = analyzedRation.requirements

  const energyBalance: 'excess' | 'adequate' | 'deficit' =
    totals.mePerDay > requirements.meMcal * 1.1 ? 'excess' :
    totals.mePerDay < requirements.meMcal * 0.95 ? 'deficit' : 'adequate'

  const proteinBalance: 'excess' | 'adequate' | 'deficit' =
    totals.cpGrams > requirements.cpGrams * 1.15 ? 'excess' :
    totals.cpGrams < requirements.cpGrams * 0.95 ? 'deficit' : 'adequate'

  const mineralBalance: 'good' | 'imbalanced' =
    (totals.caGrams >= requirements.caGrams * 0.95 && totals.pGrams >= requirements.pGrams * 0.95) ? 'good' : 'imbalanced'

  const nutrientNotes: string[] = []
  if (energyBalance === 'deficit') nutrientNotes.push('Enerji yetersiz')
  if (energyBalance === 'excess') nutrientNotes.push('Enerji fazlası (maliyet optimizasyonu yapılabilir)')
  if (proteinBalance === 'deficit') nutrientNotes.push('Protein yetersiz')
  if (proteinBalance === 'excess') nutrientNotes.push('Protein fazlası (maliyet optimizasyonu yapılabilir)')
  if (mineralBalance === 'imbalanced') nutrientNotes.push('Mineral dengesi problemli')

  // Overall score (0-100)
  let overallScore = 100

  // Deductions based on variances
  Object.values(performanceComparison.variances).forEach((variance) => {
    const absVariance = Math.abs(variance)
    if (absVariance > 20) overallScore -= 20
    else if (absVariance > 10) overallScore -= 10
    else if (absVariance > 5) overallScore -= 5
  })

  // Deductions based on nutrient balance
  if (energyBalance === 'deficit') overallScore -= 15
  if (proteinBalance === 'deficit') overallScore -= 10
  if (mineralBalance === 'imbalanced') overallScore -= 5

  overallScore = Math.max(0, overallScore)

  // Summary
  const evaluationSummary =
    overallScore >= 90 ? 'Mükemmel - Rasyon performans hedeflerini karşılıyor' :
    overallScore >= 75 ? 'İyi - Küçük iyileştirmeler yapılabilir' :
    overallScore >= 60 ? 'Orta - Dikkate değer iyileştirmeler gerekli' :
    'Zayıf - Ciddi düzeltmeler gerekli'

  return {
    request,
    analyzedRation,
    performanceComparison,
    nutrientBalance: {
      energyBalance,
      proteinBalance,
      mineralBalance,
      notes: nutrientNotes,
    },
    overallScore,
    evaluationSummary,
  }
}
