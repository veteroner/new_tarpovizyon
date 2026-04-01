import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnimalProfile, OptimizationPreferences, Ration, SelectedFeed } from '@/types'
import { normalizeProfile } from '@/utils/profileNormalizer'

export type WizardMode = 'auto' | 'manual'

interface RationWizardDraft {
  hasChosenMode: boolean
  mode: WizardMode
  profile: AnimalProfile
  selectedFeeds: SelectedFeed[]
  preferences: OptimizationPreferences
}

interface RationWizardStore {
  draft: RationWizardDraft
  setMode: (mode: WizardMode) => void
  setProfile: (patch: Partial<AnimalProfile>) => void
  toggleFeed: (feedId: string) => void
  ensureFeedSelected: (feedId: string) => void
  addFeeds: (feedIds: string[]) => void
  setFeed: (feedId: string, patch: Partial<SelectedFeed>) => void
  clearFeeds: () => void
  setPreferences: (patch: Partial<OptimizationPreferences>) => void
  applyPresetTemplate: (preset: {
    profilePatch: Partial<AnimalProfile>
    feedIds: string[]
    preferencesPatch?: Partial<OptimizationPreferences>
  }) => void
  loadFromRation: (ration: Ration) => void
  reset: () => void
  buildOptimizerPreferences: () => OptimizationPreferences
}

const defaultDraft: RationWizardDraft = {
  hasChosenMode: false,
  mode: 'manual',
  profile: {
    species: 'cattle',
    breed: 'holstein',
    sex: 'female',
    purpose: 'dairy',
    weightKg: 600,
    stage: 'mid',
    parity: 2,
    productionPhase: 'mid',
    milkYieldKgPerDay: 25,
  },
  selectedFeeds: [],
  preferences: {
    minForagePercent: 50,
    maxConcentratePercent: 60,
  },
}

export const useRationWizardStore = create<RationWizardStore>()(
  persist(
    (set, get) => ({
      draft: defaultDraft,

      setMode: (mode) =>
        set((state) => ({
          draft: {
            ...state.draft,
            hasChosenMode: true,
            mode,
          },
        })),

      setProfile: (patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            profile: {
              ...normalizeProfile({
                ...state.draft.profile,
                ...patch,
              }),
            },
          },
        })),

      toggleFeed: (feedId) =>
        set((state) => {
          const existing = state.draft.selectedFeeds.find((f) => f.feedId === feedId)
          const nextSelectedFeeds = existing
            ? state.draft.selectedFeeds.filter((f) => f.feedId !== feedId)
            : [...state.draft.selectedFeeds, { feedId, enabled: true }]

          return {
            draft: {
              ...state.draft,
              selectedFeeds: nextSelectedFeeds,
            },
          }
        }),

      ensureFeedSelected: (feedId) =>
        set((state) => {
          const existing = state.draft.selectedFeeds.find((f) => f.feedId === feedId)
          if (existing) return state
          return {
            draft: {
              ...state.draft,
              selectedFeeds: [...state.draft.selectedFeeds, { feedId, enabled: true }],
            },
          }
        }),

      addFeeds: (feedIds) =>
        set((state) => {
          const existingIds = new Set(state.draft.selectedFeeds.map((f) => f.feedId))
          const toAdd = feedIds.filter((id) => !existingIds.has(id)).map((id) => ({ feedId: id, enabled: true }))
          if (toAdd.length === 0) return state
          return {
            draft: {
              ...state.draft,
              selectedFeeds: [...state.draft.selectedFeeds, ...toAdd],
            },
          }
        }),

      setFeed: (feedId, patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            selectedFeeds: state.draft.selectedFeeds.map((f) =>
              f.feedId === feedId ? { ...f, ...patch } : f
            ),
          },
        })),

      clearFeeds: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            selectedFeeds: [],
          },
        })),

      setPreferences: (patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            preferences: {
              ...state.draft.preferences,
              ...patch,
            },
          },
        })),

      applyPresetTemplate: (preset) =>
        set((state) => ({
          draft: {
            profile: normalizeProfile({
              ...state.draft.profile,
              ...preset.profilePatch,
            }),
            selectedFeeds: Array.from(new Set(preset.feedIds)).map((feedId) => ({ feedId, enabled: true })),
            preferences: {
              ...state.draft.preferences,
              ...(preset.preferencesPatch ?? {}),
            },
            hasChosenMode: state.draft.hasChosenMode,
            mode: state.draft.mode,
          },
        })),

      loadFromRation: (ration) =>
        set((state) => ({
          draft: {
            profile: ration.profile,
            selectedFeeds: Array.from(new Set(ration.ingredients.map((i) => i.feedId))).map(
              (feedId) => ({ feedId, enabled: true })
            ),
            preferences: state.draft.preferences,
            hasChosenMode: state.draft.hasChosenMode,
            mode: state.draft.mode,
          },
        })),

      reset: () => set({ draft: defaultDraft }),

      buildOptimizerPreferences: () => {
        const { selectedFeeds, preferences } = get().draft

        const finiteOrUndefined = (value: unknown): number | undefined => {
          if (typeof value !== 'number') return undefined
          return Number.isFinite(value) ? value : undefined
        }

        const positiveOrUndefined = (value: unknown): number | undefined => {
          const n = finiteOrUndefined(value)
          if (n == null) return undefined
          return n > 0 ? n : undefined
        }

        const nonNegativeOrUndefined = (value: unknown): number | undefined => {
          const n = finiteOrUndefined(value)
          if (n == null) return undefined
          return Math.max(0, n)
        }

        const excludeFeeds = selectedFeeds.filter((f) => !f.enabled).map((f) => f.feedId)
        const feedConstraints = Object.fromEntries(
          selectedFeeds
            .filter((f) => f.enabled)
            .map((f) => {
              const maxAsFedKgPerDay = nonNegativeOrUndefined(f.maxAsFedKgPerDay)
              const minAsFedKgPerDay = nonNegativeOrUndefined(f.minAsFedKgPerDay)
              const priceOverrideTLPerKg = positiveOrUndefined(f.priceOverrideTLPerKg)
              const note = typeof f.note === 'string' && f.note.trim().length > 0 ? f.note : undefined

              return [
                f.feedId,
                {
                  maxAsFedKgPerDay,
                  minAsFedKgPerDay,
                  priceOverrideTLPerKg,
                  note,
                },
              ] as const
            })
            .filter(([, c]) =>
              typeof c.note === 'string' ||
              typeof c.maxAsFedKgPerDay === 'number' ||
              typeof c.minAsFedKgPerDay === 'number' ||
              typeof c.priceOverrideTLPerKg === 'number'
            )
        )

        return {
          ...preferences,
          excludeFeeds: excludeFeeds.length > 0 ? excludeFeeds : undefined,
          feedConstraints: Object.keys(feedConstraints).length > 0 ? feedConstraints : undefined,
        }
      },
    }),
    {
      name: 'tarpol-ration-wizard-draft',
      version: 2,
      migrate: (persistedState: unknown) => {
        if (typeof persistedState !== 'object' || persistedState === null) return persistedState

        const state = persistedState as {
          draft?: {
            profile?: unknown
            hasChosenMode?: unknown
            mode?: unknown
          }
        }

        if (!state.draft?.profile) return persistedState

        return {
          ...state,
          draft: {
            ...state.draft,
            profile: normalizeProfile(state.draft.profile as unknown as AnimalProfile),
            hasChosenMode: typeof state.draft.hasChosenMode === 'boolean' ? state.draft.hasChosenMode : false,
            mode:
              state.draft.mode === 'auto' || state.draft.mode === 'manual'
                ? (state.draft.mode as WizardMode)
                : 'manual',
          },
        }
      },
    }
  )
)
