import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Ration } from '@/types'
import type { ActualPerformance, PerformanceComparison } from '@/types/evaluation'

interface RationStore {
  rations: Ration[]
  currentRation: Ration | null
  addRation: (ration: Ration) => void
  setCurrentRation: (ration: Ration | null) => void
  deleteRation: (id: string) => void
  getRationById: (id: string) => Ration | undefined
  updateRation: (id: string, updates: Partial<Ration>) => void
  importRations: (rations: Ration[]) => void
  addEvaluation: (
    rationId: string,
    actualPerformance: ActualPerformance,
    comparison: PerformanceComparison
  ) => void
}

export const useRationStore = create<RationStore>()(
  persist(
    (set, get) => ({
      rations: [],
      currentRation: null,
      
      addRation: (ration) =>
        set((state) => ({
          rations: [ration, ...state.rations],
          currentRation: ration,
        })),
      
      setCurrentRation: (ration) =>
        set({ currentRation: ration }),
      
      deleteRation: (id) =>
        set((state) => ({
          rations: state.rations.filter((r) => r.id !== id),
          currentRation: state.currentRation?.id === id ? null : state.currentRation,
        })),
      
      getRationById: (id) => {
        const state = get()
        return state.rations.find((r) => r.id === id)
      },

      updateRation: (id, updates) =>
        set((state) => ({
          rations: state.rations.map((r) => (r.id === id ? { ...r, ...updates } : r)),
          currentRation: state.currentRation?.id === id ? { ...state.currentRation, ...updates } : state.currentRation,
        })),

      importRations: (rations) =>
        set((state) => ({
          rations: [...state.rations, ...rations],
        })),

      addEvaluation: (rationId, actualPerformance, comparison) =>
        set((state) => {
          const evaluation = {
            evaluatedAt: new Date().toISOString(),
            actualPerformance,
            comparison,
          }

          return {
            rations: state.rations.map((r) =>
              r.id === rationId
                ? {
                    ...r,
                    evaluations: [...(r.evaluations || []), evaluation],
                    updatedAt: new Date().toISOString(),
                  }
                : r
            ),
            currentRation:
              state.currentRation?.id === rationId
                ? {
                    ...state.currentRation,
                    evaluations: [...(state.currentRation.evaluations || []), evaluation],
                    updatedAt: new Date().toISOString(),
                  }
                : state.currentRation,
          }
        }),
    }),
    {
      name: 'tarpol-ration-storage',
      version: 1,
    }
  )
)
