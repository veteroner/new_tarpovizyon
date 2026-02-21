/**
 * Feed Inventory Store
 * 
 * Manages feed inventory, lot tracking, and alerts.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FeedInventoryItem, InventoryAlert, FeedLot, FeedUsageRecord } from '@/types/inventory'
import {
  calculateInventoryStatus,
  calculateDaysUntilEmpty,
  generateInventoryAlerts,
  updateInventoryAfterUsage,
} from '@/engine/inventoryManager'

interface InventoryState {
  // Data
  inventory: FeedInventoryItem[]
  alerts: InventoryAlert[]
  usageHistory: FeedUsageRecord[]

  // Actions
  addInventoryItem: (item: FeedInventoryItem) => void
  updateInventoryItem: (feedId: string, updates: Partial<FeedInventoryItem>) => void
  removeInventoryItem: (feedId: string) => void
  
  addLot: (feedId: string, lot: FeedLot) => void
  updateLot: (feedId: string, lotId: string, updates: Partial<FeedLot>) => void
  removeLot: (feedId: string, lotId: string) => void
  
  recordUsage: (record: FeedUsageRecord) => void
  
  refreshAlerts: () => void
  dismissAlert: (alertId: string) => void
  
  getInventoryItem: (feedId: string) => FeedInventoryItem | undefined
  getActiveAlerts: () => InventoryAlert[]
  getCriticalAlerts: () => InventoryAlert[]
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventory: [],
      alerts: [],
      usageHistory: [],

      addInventoryItem: (item) => {
        set((state) => ({
          inventory: [...state.inventory, item],
        }))
        get().refreshAlerts()
      },

      updateInventoryItem: (feedId, updates) => {
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.feedId === feedId
              ? {
                  ...item,
                  ...updates,
                  status: calculateInventoryStatus({ ...item, ...updates }),
                  daysUntilEmpty: calculateDaysUntilEmpty(
                    updates.currentStockKg ?? item.currentStockKg,
                    updates.averageDailyUsageKg ?? item.averageDailyUsageKg
                  ) ?? undefined,
                }
              : item
          ),
        }))
        get().refreshAlerts()
      },

      removeInventoryItem: (feedId) => {
        set((state) => ({
          inventory: state.inventory.filter((item) => item.feedId !== feedId),
        }))
        get().refreshAlerts()
      },

      addLot: (feedId, lot) => {
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.feedId === feedId
              ? {
                  ...item,
                  lots: [...(item.lots ?? []), lot],
                  currentStockKg:
                    item.currentStockKg + (typeof lot.remainingQuantityKg === 'number' ? Math.max(0, lot.remainingQuantityKg) : 0),
                }
              : item
          ),
        }))
        get().refreshAlerts()
      },

      updateLot: (feedId, lotId, updates) => {
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.feedId !== feedId) return item

            const prevLots = item.lots ?? []
            const prev = prevLots.find((l) => l.lotId === lotId)
            const nextLots = prevLots.map((l) => (l.lotId === lotId ? { ...l, ...updates } : l))

            const prevRemaining = typeof prev?.remainingQuantityKg === 'number' ? Math.max(0, prev.remainingQuantityKg) : 0
            const next = nextLots.find((l) => l.lotId === lotId)
            const nextRemaining = typeof next?.remainingQuantityKg === 'number' ? Math.max(0, next.remainingQuantityKg) : 0

            const nextStock = item.currentStockKg - prevRemaining + nextRemaining

            return {
              ...item,
              lots: nextLots,
              currentStockKg: Math.max(0, nextStock),
            }
          }),
        }))
        get().refreshAlerts()
      },

      removeLot: (feedId, lotId) => {
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.feedId === feedId
              ? (() => {
                  const toRemove = (item.lots ?? []).find((lot) => lot.lotId === lotId)
                  const removedRemaining = typeof toRemove?.remainingQuantityKg === 'number' ? Math.max(0, toRemove.remainingQuantityKg) : 0
                  return {
                    ...item,
                    lots: (item.lots ?? []).filter((lot) => lot.lotId !== lotId),
                    currentStockKg: Math.max(0, item.currentStockKg - removedRemaining),
                  }
                })()
              : item
          ),
        }))
        get().refreshAlerts()
      },

      recordUsage: (record) => {
        set((state) => ({
          usageHistory: [...state.usageHistory, record],
        }))

        // Update inventory stock
        const item = get().getInventoryItem(record.feedId)
        if (item) {
          const updated = updateInventoryAfterUsage(item, record.usedKg)
          get().updateInventoryItem(record.feedId, updated)
        }
      },

      refreshAlerts: () => {
        const inventory = get().inventory
        const allAlerts: InventoryAlert[] = []

        inventory.forEach((item) => {
          const itemAlerts = generateInventoryAlerts(item)
          allAlerts.push(...itemAlerts)
        })

        set({ alerts: allAlerts })
      },

      dismissAlert: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.alertId === alertId
              ? { ...alert, resolvedAt: new Date().toISOString() }
              : alert
          ),
        }))
      },

      getInventoryItem: (feedId) => {
        return get().inventory.find((item) => item.feedId === feedId)
      },

      getActiveAlerts: () => {
        return get().alerts.filter((alert) => !alert.resolvedAt)
      },

      getCriticalAlerts: () => {
        return get()
          .alerts.filter((alert) => !alert.resolvedAt && alert.severity === 'critical')
      },
    }),
    {
      name: 'inventory-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as unknown as InventoryState
        const migratedInventory = (state.inventory ?? []).map((item) => ({
          ...item,
          lots: (item.lots ?? []).map((lot) => {
            const legacyAnalysisSource = (lot as unknown as { analysisSource?: unknown }).analysisSource
            const analysisSource = legacyAnalysisSource === 'estimated' ? 'user-input' : lot.analysisSource
            const initialQuantityKg = lot.initialQuantityKg ?? lot.remainingQuantityKg ?? 0
            const remainingQuantityKg = lot.remainingQuantityKg ?? lot.initialQuantityKg ?? 0
            return {
              ...lot,
              analysisSource,
              initialQuantityKg,
              remainingQuantityKg,
            }
          }),
        }))

        return {
          ...state,
          inventory: migratedInventory,
          alerts: state.alerts ?? [],
          usageHistory: state.usageHistory ?? [],
        }
      },
    }
  )
)
