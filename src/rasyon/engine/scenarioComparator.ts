/**
 * Scenario Comparison Engine
 * 
 * Enables what-if analysis by comparing multiple ration scenarios side-by-side.
 */

import type { ScenarioComparisonRequest, ScenarioComparisonResult, ScenarioResult, PriceSensitivityAnalysis } from '@/types/scenario'
import type { Feed, OptimizationPreferences, AnimalProfile } from '@/types'
import { optimizeRation } from './optimizerV2'

/**
 * Compare multiple scenarios
 */
export async function compareScenarios(
  request: ScenarioComparisonRequest,
  availableFeeds: Feed[]
): Promise<ScenarioComparisonResult> {
  const scenarios: ScenarioResult[] = []

  // Run optimization for each scenario
  for (const scenario of request.scenarios) {
    let modifiedFeeds = [...availableFeeds]
    let modifiedPreferences = { ...request.basePreferences }

    // Apply price scenario
    if (scenario.priceScenario) {
      modifiedFeeds = modifiedFeeds.map((feed) => {
        const priceAdj = scenario.priceScenario!.priceAdjustments.find((adj) => adj.feedId === feed.id)
        if (priceAdj) {
          return {
            ...feed,
            priceTLPerKg: priceAdj.newPriceTLPerKg,
          }
        }

        // Global adjustments
        const global = scenario.priceScenario!.globalAdjustment
        if (global) {
          let newPrice = feed.priceTLPerKg

          if (global.allFeedsChangePercent) {
            newPrice *= 1 + global.allFeedsChangePercent / 100
          } else {
            if (feed.category === 'concentrate' && global.concentrateChangePercent) {
              newPrice *= 1 + global.concentrateChangePercent / 100
            }
            if (feed.category === 'forage' && global.forageChangePercent) {
              newPrice *= 1 + global.forageChangePercent / 100
            }
          }

          return { ...feed, priceTLPerKg: newPrice }
        }

        return feed
      })
    }

    // Apply constraint scenario
    if (scenario.constraintScenario) {
      modifiedPreferences = {
        ...modifiedPreferences,
        ...scenario.constraintScenario.modifiedPreferences,
      }
    }

    // Apply availability scenario
    if (scenario.availabilityScenario) {
      // Filter available feeds
      modifiedFeeds = modifiedFeeds.filter(
        (feed) => !scenario.availabilityScenario!.excludedFeeds.includes(feed.id)
      )

      // Apply availability limits
      const limits = scenario.availabilityScenario.availableFeeds
      modifiedPreferences.feedConstraints = modifiedPreferences.feedConstraints || {}

      limits.forEach((limit) => {
        if (limit.maxAvailableKg !== undefined) {
          modifiedPreferences.feedConstraints![limit.feedId] = {
            ...modifiedPreferences.feedConstraints![limit.feedId],
            maxAsFedKgPerDay: limit.maxAvailableKg,
          }
        }
      })
    }

    // Run optimization
    const result = await optimizeRation(request.baseProfile, modifiedFeeds, modifiedPreferences)

    // Extract key metrics
    const metrics: ScenarioResult['metrics'] = {
      dailyCostTL: 0,
      dmiKg: 0,
      ingredientCount: 0,
      foragePercent: 0,
      concentratePercent: 0,
    }

    if (result.ration) {
      const { totals, cost, ingredients } = result.ration

      metrics.dailyCostTL = cost.dailyFeedCostTL
      metrics.costPerKgMilk = cost.costPerKgMilk
      metrics.dmiKg = totals.dmiKg
      metrics.ingredientCount = ingredients.length

      const forageDM = ingredients
        .filter((ing) => ing.feedCategory === 'forage')
        .reduce((sum, ing) => sum + ing.kgDMPerDay, 0)
      const concentrateDM = ingredients
        .filter((ing) => ing.feedCategory === 'concentrate')
        .reduce((sum, ing) => sum + ing.kgDMPerDay, 0)

      metrics.foragePercent = (forageDM / totals.dmiKg) * 100
      metrics.concentratePercent = (concentrateDM / totals.dmiKg) * 100
    }

    scenarios.push({
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
      scenarioType: scenario.scenarioType,
      ration: result.ration,
      status: result.status,
      message: result.message,
      metrics,
    })
  }

  // Comparative analysis
  const feasibleScenarios = scenarios.filter((s) => s.status === 'success')
  const costs = feasibleScenarios.map((s) => s.metrics.dailyCostTL)

  const lowestCostScenario = feasibleScenarios.reduce((min, s) =>
    s.metrics.dailyCostTL < min.metrics.dailyCostTL ? s : min
  , feasibleScenarios[0])

  const highestCostScenario = feasibleScenarios.reduce((max, s) =>
    s.metrics.dailyCostTL > max.metrics.dailyCostTL ? s : max
  , feasibleScenarios[0])

  const mostDiverseScenario = feasibleScenarios.reduce((max, s) =>
    s.metrics.ingredientCount > max.metrics.ingredientCount ? s : max
  , feasibleScenarios[0])

  const leastDiverseScenario = feasibleScenarios.reduce((min, s) =>
    s.metrics.ingredientCount < min.metrics.ingredientCount ? s : min
  , feasibleScenarios[0])

  const comparison = {
    lowestCostScenario: lowestCostScenario?.scenarioId || '',
    highestCostScenario: highestCostScenario?.scenarioId || '',
    costRangeTL: {
      min: Math.min(...costs),
      max: Math.max(...costs),
      spread: Math.max(...costs) - Math.min(...costs),
      spreadPercent: ((Math.max(...costs) - Math.min(...costs)) / Math.min(...costs)) * 100,
    },
    mostDiverseScenario: mostDiverseScenario?.scenarioId || '',
    leastDiverseScenario: leastDiverseScenario?.scenarioId || '',
    feasibleScenarios: feasibleScenarios.map((s) => s.scenarioId),
    infeasibleScenarios: scenarios.filter((s) => s.status !== 'success').map((s) => s.scenarioId),
  }

  // Trade-off analysis
  const tradeoffs = [
    {
      metric: 'Günlük Maliyet',
      unit: 'TL',
      values: Object.fromEntries(scenarios.map((s) => [s.scenarioId, s.metrics.dailyCostTL])),
      bestScenario: lowestCostScenario?.scenarioId || '',
      worstScenario: highestCostScenario?.scenarioId || '',
    },
    {
      metric: 'Yem Çeşitliliği',
      unit: 'adet',
      values: Object.fromEntries(scenarios.map((s) => [s.scenarioId, s.metrics.ingredientCount])),
      bestScenario: mostDiverseScenario?.scenarioId || '',
      worstScenario: leastDiverseScenario?.scenarioId || '',
    },
  ]

  // Recommendations
  const recommendations = []

  if (comparison.costRangeTL.spreadPercent > 10) {
    recommendations.push({
      priority: 'high' as const,
      recommendation: `Senaryolar arası maliyet farkı %${comparison.costRangeTL.spreadPercent.toFixed(1)} (${comparison.costRangeTL.spread.toFixed(2)} TL/gün). En ekonomik senaryo: ${comparison.lowestCostScenario}`,
      affectedScenarios: [comparison.lowestCostScenario, comparison.highestCostScenario],
    })
  }

  if (comparison.infeasibleScenarios.length > 0) {
    recommendations.push({
      priority: 'medium' as const,
      recommendation: `${comparison.infeasibleScenarios.length} senaryo çözülemedi. Kısıtları gevşetmeyi veya yem setini genişletmeyi düşünün.`,
      affectedScenarios: comparison.infeasibleScenarios,
    })
  }

  return {
    request,
    scenarios,
    comparison,
    tradeoffs,
    recommendations,
  }
}

/**
 * Analyze price sensitivity for a specific feed
 */
export async function analyzePriceSensitivity(
  feed: Feed,
  profile: AnimalProfile,
  availableFeeds: Feed[],
  preferences: OptimizationPreferences,
  priceRange: { min: number; max: number; steps: number }
): Promise<PriceSensitivityAnalysis> {
  const baseResult = await optimizeRation(profile, availableFeeds, preferences)
  const baseIngredient = baseResult.ration?.ingredients.find((ing) => ing.feedId === feed.id)

  const sensitivityCurve = []
  const priceStep = (priceRange.max - priceRange.min) / priceRange.steps

  for (let i = 0; i <= priceRange.steps; i++) {
    const testPrice = priceRange.min + i * priceStep
    const priceChangePercent = ((testPrice - feed.priceTLPerKg) / feed.priceTLPerKg) * 100

    const modifiedFeeds = availableFeeds.map((f) =>
      f.id === feed.id ? { ...f, priceTLPerKg: testPrice } : f
    )

    const result = await optimizeRation(profile, modifiedFeeds, preferences)
    const ingredient = result.ration?.ingredients.find((ing) => ing.feedId === feed.id)

    sensitivityCurve.push({
      priceTLPerKg: testPrice,
      priceChangePercent,
      usageKgPerDay: ingredient?.kgAsFedPerDay || 0,
      totalCostTL: result.ration?.cost.dailyFeedCostTL || 0,
      inRation: !!ingredient,
    })
  }

  // Calculate price elasticity
  const usageChange = sensitivityCurve[sensitivityCurve.length - 1].usageKgPerDay - sensitivityCurve[0].usageKgPerDay
  const usageChangePercent = (usageChange / (sensitivityCurve[0].usageKgPerDay || 1)) * 100
  const priceChangePercent = ((priceRange.max - priceRange.min) / priceRange.min) * 100
  const priceElasticity = usageChangePercent / priceChangePercent

  // Find breakeven price
  const breakEvenPoint = sensitivityCurve.find((point) => !point.inRation)

  return {
    feedId: feed.id,
    feedName: feed.name,
    currentPriceTLPerKg: feed.priceTLPerKg,
    currentUsageKgPerDay: baseIngredient?.kgAsFedPerDay || 0,
    currentCostTL: baseIngredient?.costTL || 0,
    sensitivityCurve,
    priceElasticity,
    breakEvenPriceTL: breakEvenPoint?.priceTLPerKg,
  }
}
