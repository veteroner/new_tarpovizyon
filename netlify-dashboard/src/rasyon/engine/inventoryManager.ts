/**
 * Feed Inventory Management
 * 
 * Handles lot tracking, stock management, and feed availability checking.
 */

import type { FeedInventoryItem, FeedLot, InventoryAlert, InventoryStatus } from '@/types/inventory'

function hasLotQuantities(lots: FeedLot[]): boolean {
  return lots.some((lot) => typeof lot.remainingQuantityKg === 'number')
}

function getLotRemainingKg(lot: FeedLot): number {
  return Math.max(0, lot.remainingQuantityKg ?? 0)
}

function sumLotRemainingKg(lots: FeedLot[]): number {
  return lots.reduce((sum, lot) => sum + getLotRemainingKg(lot), 0)
}

function sortLotsForConsumption(lots: FeedLot[]): FeedLot[] {
  return [...lots].sort((a, b) => {
    const aKey = a.purchaseDate ?? a.analysisDate
    const bKey = b.purchaseDate ?? b.analysisDate
    return new Date(aKey).getTime() - new Date(bKey).getTime()
  })
}

/**
 * Calculate inventory status based on current stock and usage
 */
export function calculateInventoryStatus(item: FeedInventoryItem): InventoryStatus {
  const { currentStockKg, minStockKg, averageDailyUsageKg } = item

  // Check expiration
  const hasExpiredLots = item.lots.some((lot) => {
    if (!lot.expirationDate) return false
    return new Date(lot.expirationDate) < new Date()
  })

  if (hasExpiredLots && currentStockKg === 0) {
    return 'expired'
  }

  // Check stock levels
  if (currentStockKg <= 0) {
    return 'out-of-stock'
  }

  if (currentStockKg <= minStockKg) {
    return 'low-stock'
  }

  // Check if reorder needed based on usage
  if (averageDailyUsageKg && averageDailyUsageKg > 0) {
    const daysRemaining = currentStockKg / averageDailyUsageKg
    if (daysRemaining <= 3) {
      return 'low-stock'
    }
  }

  return 'available'
}

/**
 * Calculate days until stock is depleted
 */
export function calculateDaysUntilEmpty(currentStockKg: number, averageDailyUsageKg?: number): number | null {
  if (!averageDailyUsageKg || averageDailyUsageKg <= 0) return null
  if (currentStockKg <= 0) return 0

  return Math.floor(currentStockKg / averageDailyUsageKg)
}

/**
 * Generate inventory alerts for a feed item
 */
export function generateInventoryAlerts(item: FeedInventoryItem): InventoryAlert[] {
  const alerts: InventoryAlert[] = []

  // Low stock alert
  if (item.status === 'low-stock') {
    const daysRemaining = item.daysUntilEmpty ?? 0
    alerts.push({
      alertId: `${item.feedId}-low-stock-${Date.now()}`,
      feedId: item.feedId,
      feedName: item.feedName,
      type: 'low-stock',
      severity: daysRemaining <= 1 ? 'critical' : 'warning',
      message: `Düşük stok: ${item.currentStockKg.toFixed(1)} kg kaldı${daysRemaining > 0 ? ` (~${daysRemaining} gün)` : ''}`,
      createdAt: new Date().toISOString(),
    })
  }

  // Out of stock alert
  if (item.status === 'out-of-stock') {
    alerts.push({
      alertId: `${item.feedId}-out-of-stock-${Date.now()}`,
      feedId: item.feedId,
      feedName: item.feedName,
      type: 'out-of-stock',
      severity: 'critical',
      message: 'Stok tükendi! Acil sipariş gerekli.',
      createdAt: new Date().toISOString(),
    })
  }

  // Expiring soon alerts
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  item.lots.forEach((lot) => {
    if (!lot.expirationDate) return

    const expirationDate = new Date(lot.expirationDate)

    // Expired
    if (expirationDate < now) {
      alerts.push({
        alertId: `${lot.lotId}-expired-${Date.now()}`,
        feedId: item.feedId,
        feedName: item.feedName,
        type: 'expired',
        severity: 'critical',
        message: `Lot ${lot.lotNumber || lot.lotId} süresi dolmuş (${lot.expirationDate})`,
        createdAt: new Date().toISOString(),
      })
    }
    // Expiring soon
    else if (expirationDate < threeDaysFromNow) {
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      alerts.push({
        alertId: `${lot.lotId}-expiring-${Date.now()}`,
        feedId: item.feedId,
        feedName: item.feedName,
        type: 'expiring-soon',
        severity: daysUntilExpiration <= 1 ? 'critical' : 'warning',
        message: `Lot ${lot.lotNumber || lot.lotId} yakında sona erecek (${daysUntilExpiration} gün)`,
        createdAt: new Date().toISOString(),
      })
    }
  })

  // Quality issues
  item.lots.forEach((lot) => {
    if (lot.quality === 'poor' || (lot.warnings && lot.warnings.length > 0)) {
      alerts.push({
        alertId: `${lot.lotId}-quality-${Date.now()}`,
        feedId: item.feedId,
        feedName: item.feedName,
        type: 'quality-issue',
        severity: lot.quality === 'poor' ? 'warning' : 'info',
        message: `Lot ${lot.lotNumber || lot.lotId} kalite uyarısı: ${lot.warnings?.join(', ') || 'Düşük kalite'}`,
        createdAt: new Date().toISOString(),
      })
    }
  })

  return alerts
}

/**
 * Get the most recent lot for a feed (FIFO principle)
 */
export function getMostRecentLot(lots: FeedLot[]): FeedLot | null {
  if (lots.length === 0) return null

  // Sort by analysis date (most recent first)
  const sorted = [...lots].sort((a, b) => {
    return new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
  })

  // Filter out expired lots
  const now = new Date()
  const validLots = sorted.filter((lot) => {
    if (!lot.expirationDate) return true
    return new Date(lot.expirationDate) >= now
  })

  return validLots[0] || null
}

/**
 * Check if a feed is available for use in ration formulation
 */
export function isFeedAvailable(item: FeedInventoryItem, requiredKg: number): boolean {
  if (item.status === 'out-of-stock' || item.status === 'expired') {
    return false
  }

  // If lots have explicit quantities, use them as the source of truth.
  if (hasLotQuantities(item.lots)) {
    const totalRemaining = sumLotRemainingKg(item.lots)
    if (totalRemaining < requiredKg) return false

    const now = new Date()
    const hasValidRemainingLot = item.lots.some((lot) => {
      if (getLotRemainingKg(lot) <= 0) return false
      if (!lot.expirationDate) return true
      return new Date(lot.expirationDate) >= now
    })
    return hasValidRemainingLot
  }

  // Check if we have enough stock
  if (item.currentStockKg < requiredKg) {
    return false
  }

  // Check if we have valid lots
  const validLot = getMostRecentLot(item.lots)
  return validLot !== null
}

/**
 * Update inventory after ration usage
 */
export function updateInventoryAfterUsage(
  item: FeedInventoryItem,
  usedKg: number
): FeedInventoryItem {
  if (hasLotQuantities(item.lots)) {
    let remainingToUse = Math.max(0, usedKg)
    const sorted = sortLotsForConsumption(item.lots)

    const updatedLots = sorted.map((lot) => {
      if (remainingToUse <= 0) return lot
      const lotRemaining = getLotRemainingKg(lot)
      if (lotRemaining <= 0) return lot

      const usedFromLot = Math.min(lotRemaining, remainingToUse)
      remainingToUse -= usedFromLot
      return {
        ...lot,
        remainingQuantityKg: lotRemaining - usedFromLot,
      }
    })

    // Restore original order (stable display): keep by lotId order from original array
    const byId = new Map(updatedLots.map((l) => [l.lotId, l]))
    const lotsInOriginalOrder = item.lots.map((l) => byId.get(l.lotId) ?? l)

    const newStockKg = sumLotRemainingKg(lotsInOriginalOrder)
    const daysUntilEmpty = calculateDaysUntilEmpty(newStockKg, item.averageDailyUsageKg)
    const newStatus = calculateInventoryStatus({
      ...item,
      lots: lotsInOriginalOrder,
      currentStockKg: newStockKg,
    })

    return {
      ...item,
      lots: lotsInOriginalOrder,
      currentStockKg: newStockKg,
      status: newStatus,
      daysUntilEmpty: daysUntilEmpty ?? undefined,
    }
  }

  const newStockKg = Math.max(0, item.currentStockKg - usedKg)
  const newStatus = calculateInventoryStatus({
    ...item,
    currentStockKg: newStockKg,
  })

  const daysUntilEmpty = calculateDaysUntilEmpty(newStockKg, item.averageDailyUsageKg)

  return {
    ...item,
    currentStockKg: newStockKg,
    status: newStatus,
    daysUntilEmpty: daysUntilEmpty ?? undefined,
  }
}
