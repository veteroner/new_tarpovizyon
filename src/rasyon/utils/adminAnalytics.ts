/**
 * Admin Analytics Utilities
 * 
 * Aggregates and analyzes data from localStorage stores for admin dashboard.
 * Data privacy: All data is local (localStorage), no server collection.
 */

import { useRationStore } from '@/store/rationStore'
import { useFeedStore } from '@/store/feedStore'
import { useInventoryStore } from '@/store/inventoryStore'

export interface RationStats {
  total: number
  last7Days: number
  last30Days: number
  byAnimalType: Record<string, number>
  byPurpose: Record<string, number>
  avgCost: number
  avgProtein: number // grams per day
  avgEnergy: number // Mcal per day
}

export interface FeedUsageStats {
  totalFeeds: number
  customFeeds: number
  mostUsed: Array<{ feedId: string; feedName: string; usageCount: number; category: string }>
  byCategory: Record<string, number>
  avgCostPerKg: number
}

export interface PerformanceStats {
  evaluationsCount: number
  avgAccuracy: number // 0-100
  successRate: number // 0-100
  trendsOverTime: Array<{ date: string; count: number }>
}

export interface SystemHealth {
  storageUsed: number // bytes
  storageLimit: number // bytes
  rationCount: number
  feedCount: number
  inventoryLots: number
  lastBackup?: string
}

/**
 * Get comprehensive ration statistics
 */
export function getRationStats(): RationStats {
  const { rations } = useRationStore.getState()
  
  const now = Date.now()
  const day7Ago = now - 7 * 24 * 60 * 60 * 1000
  const day30Ago = now - 30 * 24 * 60 * 60 * 1000

  const last7Days = rations.filter(r => r.createdAt && new Date(r.createdAt).getTime() > day7Ago).length
  const last30Days = rations.filter(r => r.createdAt && new Date(r.createdAt).getTime() > day30Ago).length

  // Group by animal type (species)
  const byAnimalType: Record<string, number> = {}
  rations.forEach(r => {
    const type = r.profile?.species || 'unknown'
    byAnimalType[type] = (byAnimalType[type] || 0) + 1
  })

  // Group by purpose
  const byPurpose: Record<string, number> = {}
  rations.forEach(r => {
    const purpose = r.profile?.purpose || 'unknown'
    byPurpose[purpose] = (byPurpose[purpose] || 0) + 1
  })

  // Calculate averages
  const avgCost = rations.length > 0
    ? rations.reduce((sum, r) => sum + (r.cost?.dailyFeedCostTL || 0), 0) / rations.length
    : 0

  const avgProtein = rations.length > 0
    ? rations.reduce((sum, r) => sum + (r.totals?.cpGrams || 0), 0) / rations.length
    : 0

  const avgEnergy = rations.length > 0
    ? rations.reduce((sum, r) => sum + (r.totals?.mePerDay || 0), 0) / rations.length
    : 0

  return {
    total: rations.length,
    last7Days,
    last30Days,
    byAnimalType,
    byPurpose,
    avgCost,
    avgProtein,
    avgEnergy,
  }
}

/**
 * Get feed usage statistics
 */
export function getFeedUsageStats(): FeedUsageStats {
  const { rations } = useRationStore.getState()
  const { getAllFeeds } = useFeedStore.getState()
  const allFeeds = getAllFeeds()
  
  const customFeeds = allFeeds.filter(f => f.source === 'user').length

  // Track feed usage across all rations
  const feedUsageMap: Record<string, { name: string; count: number; category: string }> = {}
  
  rations.forEach(r => {
    r.ingredients?.forEach((ing) => {
      if (!feedUsageMap[ing.feedId]) {
        feedUsageMap[ing.feedId] = {
          name: ing.feedName,
          count: 0,
          category: ing.feedCategory || 'unknown',
        }
      }
      feedUsageMap[ing.feedId].count++
    })
  })

  // Sort by usage count and get top 10
  const mostUsed = Object.entries(feedUsageMap)
    .map(([feedId, data]) => ({ feedId, feedName: data.name, usageCount: data.count, category: data.category }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)

  // Group by category
  const byCategory: Record<string, number> = {}
  Object.values(feedUsageMap).forEach(feed => {
    byCategory[feed.category] = (byCategory[feed.category] || 0) + feed.count
  })

  // Calculate average cost per kg
  const avgCostPerKg = allFeeds.length > 0
    ? allFeeds.reduce((sum, f) => sum + f.priceTLPerKg, 0) / allFeeds.length
    : 0

  return {
    totalFeeds: allFeeds.length,
    customFeeds,
    mostUsed,
    byCategory,
    avgCostPerKg,
  }
}

/**
 * Get performance evaluation statistics
 */
export function getPerformanceStats(): PerformanceStats {
  const { rations } = useRationStore.getState()

  // Count all evaluations
  let evaluationsCount = 0
  let totalAccuracy = 0
  let successCount = 0

  rations.forEach(r => {
    const evals = r.evaluations || []
    evaluationsCount += evals.length

    evals.forEach(ev => {
      // Calculate accuracy (inverse of deviation percentage)
      const milkDeviation = Math.abs(ev.comparison?.variances?.milkYieldVariancePercent || 0)
      const accuracy = Math.max(0, 100 - milkDeviation)
      totalAccuracy += accuracy

      // Success if deviation is less than 10%
      if (milkDeviation < 10) {
        successCount++
      }
    })
  })

  const avgAccuracy = evaluationsCount > 0 ? totalAccuracy / evaluationsCount : 0
  const successRate = evaluationsCount > 0 ? (successCount / evaluationsCount) * 100 : 0

  // Generate 30-day trend
  const now = Date.now()
  const trendsOverTime: Array<{ date: string; count: number }> = []
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    
    const count = rations.filter(r => {
      if (!r.createdAt) return false
      const rationDate = new Date(r.createdAt).toISOString().split('T')[0]
      return rationDate === dateStr
    }).length

    trendsOverTime.push({ date: dateStr, count })
  }

  return {
    evaluationsCount,
    avgAccuracy,
    successRate,
    trendsOverTime,
  }
}

/**
 * Get system health metrics
 */
export function getSystemHealth(): SystemHealth {
  const { rations } = useRationStore.getState()
  const { getAllFeeds } = useFeedStore.getState()
  const { inventory } = useInventoryStore.getState()

  // Calculate localStorage usage
  let storageUsed = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const value = localStorage.getItem(key) ?? ''
      storageUsed += key.length + value.length
    }
  } catch {
    storageUsed = 0
  }

  // Typical localStorage limit is 5-10MB
  const storageLimit = 5 * 1024 * 1024 // 5MB in bytes

  // Count inventory lots
  const inventoryLots = inventory.reduce((sum, item) => sum + (item.lots?.length || 0), 0)

  // Last backup timestamp (set on export in DataBackup page)
  const lastBackup = (() => {
    try {
      return localStorage.getItem('teknova-rasyon-last-backup') ?? undefined
    } catch {
      return undefined
    }
  })()

  return {
    storageUsed,
    storageLimit,
    rationCount: rations.length,
    feedCount: getAllFeeds().length,
    inventoryLots,
    lastBackup,
  }
}

/**
 * Export all analytics data as JSON
 */
export function exportAnalyticsData(): string {
  const data = {
    timestamp: new Date().toISOString(),
    rationStats: getRationStats(),
    feedUsageStats: getFeedUsageStats(),
    performanceStats: getPerformanceStats(),
    systemHealth: getSystemHealth(),
  }

  return JSON.stringify(data, null, 2)
}
