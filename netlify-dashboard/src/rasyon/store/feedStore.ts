import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Feed, FeedCategory } from '@/types'
import { feeds as builtInFeeds } from '@/data/feedsV2'
import type { AnalysisSource } from '@/types/inventory'

type FeedOverrideRecord = {
  patch: Partial<Feed>
  source: AnalysisSource
  updatedAt: string
}

export type NewFeedInput = {
  name: string
  category: FeedCategory
  dmPercent: number
  meMcalPerKg: number
  cpPercent: number
  ndfPercent: number
  caPercent: number
  pPercent: number
  priceTLPerKg: number

  starchPercent?: number
  sugarPercent?: number
  fatPercent?: number
  mgPercent?: number
  naPercent?: number
  kPercent?: number
  sPercent?: number
  clPercent?: number
  
  // Trace Minerals (mg/kg DM)
  fePpm?: number
  znPpm?: number
  cuPpm?: number
  mnPpm?: number
  coPpm?: number
  iPpm?: number
  sePpm?: number
  
  // Vitamins (IU/kg or mg/kg DM)
  vitaminAIUPerKg?: number
  vitaminDIUPerKg?: number
  vitaminEIUPerKg?: number
  vitaminKMgPerKg?: number
  
  // Nutritional Constraints (scientifically validated limits)
  minInclusionPctOfDM?: number
  maxInclusionPctOfDM?: number
  constraintReason?: string
  
  description?: string
}

interface FeedStore {
  userFeeds: Feed[]
  feedOverrides: Record<string, FeedOverrideRecord>
  addUserFeed: (input: NewFeedInput) => Feed
  addUserFeeds: (inputs: NewFeedInput[]) => { added: number; skipped: number }
  updateUserFeed: (id: string, patch: Partial<Feed>) => void
  removeUserFeed: (id: string) => void
  upsertFeedOverride: (feedId: string, patch: Partial<Feed>, source: AnalysisSource) => void
  clearFeedOverride: (feedId: string) => void
  getAllFeeds: () => Feed[]
  exportUserFeedsCsv: () => string
  importUserFeeds: (feeds: Feed[]) => void
}

function slugifyTurkish(text: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c',
    ğ: 'g', Ğ: 'g',
    ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o',
    ş: 's', Ş: 's',
    ü: 'u', Ü: 'u',
  }

  const normalized = text
    .trim()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

function normalizeNameKey(name: string): string {
  return slugifyTurkish(name).replace(/-/g, '')
}

function toCsvValue(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  const escaped = s.replace(/"/g, '""')
  return `"${escaped}"`
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function createUniqueId(base: string, existing: Set<string>): string {
  let id = base
  let i = 2
  while (existing.has(id) || id.length === 0) {
    id = `${base}-${i}`
    i += 1
  }
  return id
}

function toFeed(input: NewFeedInput, id: string): Feed {
  const feed: Feed = {
    id,
    name: input.name.trim(),
    category: input.category,

    dmPercent: clamp(input.dmPercent, 5, 99),
    meMcalPerKg: clamp(input.meMcalPerKg, 0, 4),
    cpPercent: clamp(input.cpPercent, 0, 90),
    ndfPercent: clamp(input.ndfPercent, 0, 90),

    starchPercent: input.starchPercent == null ? undefined : clamp(input.starchPercent, 0, 90),
    sugarPercent: input.sugarPercent == null ? undefined : clamp(input.sugarPercent, 0, 90),
    fatPercent: input.fatPercent == null ? undefined : clamp(input.fatPercent, 0, 30),

    caPercent: clamp(input.caPercent, 0, 50),
    pPercent: clamp(input.pPercent, 0, 30),
    mgPercent: input.mgPercent == null ? undefined : clamp(input.mgPercent, 0, 30),
    naPercent: input.naPercent == null ? undefined : clamp(input.naPercent, 0, 60),
    kPercent: input.kPercent == null ? undefined : clamp(input.kPercent, 0, 10),
    sPercent: input.sPercent == null ? undefined : clamp(input.sPercent, 0, 10),
    clPercent: input.clPercent == null ? undefined : clamp(input.clPercent, 0, 60),

    // Trace minerals
    fePpm: input.fePpm == null ? undefined : clamp(input.fePpm, 0, 10000),
    znPpm: input.znPpm == null ? undefined : clamp(input.znPpm, 0, 1000),
    cuPpm: input.cuPpm == null ? undefined : clamp(input.cuPpm, 0, 500),
    mnPpm: input.mnPpm == null ? undefined : clamp(input.mnPpm, 0, 1000),
    coPpm: input.coPpm == null ? undefined : clamp(input.coPpm, 0, 10),
    iPpm: input.iPpm == null ? undefined : clamp(input.iPpm, 0, 100),
    sePpm: input.sePpm == null ? undefined : clamp(input.sePpm, 0, 10),

    // Vitamins
    vitaminAIUPerKg: input.vitaminAIUPerKg == null ? undefined : clamp(input.vitaminAIUPerKg, 0, 1000000),
    vitaminDIUPerKg: input.vitaminDIUPerKg == null ? undefined : clamp(input.vitaminDIUPerKg, 0, 100000),
    vitaminEIUPerKg: input.vitaminEIUPerKg == null ? undefined : clamp(input.vitaminEIUPerKg, 0, 100000),
    vitaminKMgPerKg: input.vitaminKMgPerKg == null ? undefined : clamp(input.vitaminKMgPerKg, 0, 1000),

    priceTLPerKg: clamp(input.priceTLPerKg, 0, 1000),

    source: 'user',
    description: input.description,
  }

  // Add nutritional constraints if provided
  if (
    input.minInclusionPctOfDM != null ||
    input.maxInclusionPctOfDM != null ||
    input.constraintReason
  ) {
    feed.nutritionalConstraints = {
      minInclusionPctOfDM: input.minInclusionPctOfDM,
      maxInclusionPctOfDM: input.maxInclusionPctOfDM,
      reason: input.constraintReason,
    }
  }

  return feed
}

export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      userFeeds: [],
      feedOverrides: {},

      addUserFeed: (input) => {
        const builtInIds = new Set(builtInFeeds.map((f) => f.id))
        const userIds = new Set(get().userFeeds.map((f) => f.id))
        const allIds = new Set<string>([...builtInIds, ...userIds])

        const base = slugifyTurkish(input.name)
        const id = createUniqueId(base, allIds)
        const feed = toFeed(input, id)

        set((state) => ({ userFeeds: [...state.userFeeds, feed] }))
        return feed
      },

      addUserFeeds: (inputs) => {
        const existing = new Map<string, Feed>()
        for (const f of get().userFeeds) {
          existing.set(`${normalizeNameKey(f.name)}|${f.category}`, f)
        }

        let added = 0
        let skipped = 0

        for (const input of inputs) {
          const key = `${normalizeNameKey(input.name)}|${input.category}`
          if (existing.has(key)) {
            skipped += 1
            continue
          }
          const created = get().addUserFeed(input)
          existing.set(key, created)
          added += 1
        }

        return { added, skipped }
      },

      updateUserFeed: (id, patch) =>
        set((state) => ({
          userFeeds: state.userFeeds.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      removeUserFeed: (id) =>
        set((state) => ({
          userFeeds: state.userFeeds.filter((f) => f.id !== id),
        })),

      upsertFeedOverride: (feedId, patch, source) =>
        set((state) => ({
          feedOverrides: {
            ...state.feedOverrides,
            [feedId]: {
              patch,
              source,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      clearFeedOverride: (feedId) =>
        set((state) => {
          const next = { ...state.feedOverrides }
          delete next[feedId]
          return { feedOverrides: next }
        }),

      getAllFeeds: () => {
        const overrides = get().feedOverrides
        const apply = (feed: Feed): Feed => {
          const override = overrides[feed.id]
          return override ? { ...feed, ...override.patch } : feed
        }
        return [...builtInFeeds.map(apply), ...get().userFeeds.map(apply)]
      },

      exportUserFeedsCsv: () => {
        const feeds = get().userFeeds
        const header = [
          'name',
          'category',
          'dmPercent',
          'meMcalPerKg',
          'cpPercent',
          'ndfPercent',
          'starchPercent',
          'sugarPercent',
          'fatPercent',
          'caPercent',
          'pPercent',
          'mgPercent',
          'naPercent',
          'kPercent',
          'sPercent',
          'clPercent',
          'fePpm',
          'znPpm',
          'cuPpm',
          'mnPpm',
          'coPpm',
          'iPpm',
          'sePpm',
          'vitaminAIUPerKg',
          'vitaminDIUPerKg',
          'vitaminEIUPerKg',
          'vitaminKMgPerKg',
          'minInclusionPctOfDM',
          'maxInclusionPctOfDM',
          'constraintReason',
          'priceTLPerKg',
          'description',
        ]

        const lines: string[] = []
        lines.push(header.map(toCsvValue).join(';'))

        for (const f of feeds) {
          const row = [
            f.name,
            f.category,
            f.dmPercent,
            f.meMcalPerKg,
            f.cpPercent,
            f.ndfPercent,
            f.starchPercent,
            f.sugarPercent,
            f.fatPercent,
            f.caPercent,
            f.pPercent,
            f.mgPercent,
            f.naPercent,
            f.kPercent,
            f.sPercent,
            f.clPercent,
            f.fePpm,
            f.znPpm,
            f.cuPpm,
            f.mnPpm,
            f.coPpm,
            f.iPpm,
            f.sePpm,
            f.vitaminAIUPerKg,
            f.vitaminDIUPerKg,
            f.vitaminEIUPerKg,
            f.vitaminKMgPerKg,
            f.nutritionalConstraints?.minInclusionPctOfDM,
            f.nutritionalConstraints?.maxInclusionPctOfDM,
            f.nutritionalConstraints?.reason,
            f.priceTLPerKg,
            f.description,
          ]
          lines.push(row.map(toCsvValue).join(';'))
        }

        return lines.join('\n')
      },

      importUserFeeds: (feeds) =>
        set((state) => ({
          userFeeds: [...state.userFeeds, ...feeds],
        })),
    }),
    {
      name: 'teknova-feed-store',
      version: 1,
    }
  )
)
