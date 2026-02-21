import type { AnimalProfile, Feed, OptimizationPreferences } from '@/types'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function getFeedConstraint(feed: Feed, preferences?: OptimizationPreferences) {
  return preferences?.feedConstraints?.[feed.id]
}

export function getFeedPriceTLPerKg(feed: Feed, preferences?: OptimizationPreferences): number {
  const override = getFeedConstraint(feed, preferences)?.priceOverrideTLPerKg
  return isFiniteNumber(override) && override > 0 ? override : feed.priceTLPerKg
}

export function getMaxAsFedKgPerDay(feed: Feed, preferences?: OptimizationPreferences): number | undefined {
  const max = getFeedConstraint(feed, preferences)?.maxAsFedKgPerDay
  if (!isFiniteNumber(max)) return undefined
  if (max <= 0) return 0
  return max
}

type DefaultMaxRule = { pctOfDM: number; reason: string }

function getDefaultMaxInclusionRule(feed: Feed, profile?: AnimalProfile): DefaultMaxRule | undefined {
  const name = (feed.name || '').toLowerCase()

  // Minerals/supplements: keep small but not overly restrictive
  if (feed.category === 'mineral') {
    return {
      pctOfDM: 5,
      reason: 'Default safety cap for mineral/supplement ingredients (% of total DM).',
    }
  }

  // Forages
  if (feed.category === 'forage') {
    if (name.includes('saman') || name.includes('straw')) {
      return {
        pctOfDM: 15,
        reason: 'Default cap for straw: low digestibility; used mainly as effective fiber (% of total DM).',
      }
    }

    if (name.includes('yonca')) {
      // Slightly tighter defaults for lactating dairy (legume forage can dominate protein/K)
      const dairyLactating = profile?.purpose === 'dairy' && profile.stage !== 'dry'
      return {
        pctOfDM: dairyLactating ? 30 : 35,
        reason: 'Default cap for alfalfa/legume forages to prevent over-reliance (% of total DM).',
      }
    }

    if (name.includes('mısır silaj') || name.includes('misir silaj') || name.includes('corn silage')) {
      return {
        pctOfDM: 55,
        reason: 'Default cap for corn silage (% of total DM).',
      }
    }

    if (name.includes('silaj')) {
      return {
        pctOfDM: 55,
        reason: 'Default cap for silages (% of total DM).',
      }
    }

    return {
      pctOfDM: 65,
      reason: 'Default cap for forage ingredients (% of total DM).',
    }
  }

  // Concentrates: allow flexibility but avoid 100% single ingredient
  if (feed.category === 'concentrate') {
    return {
      pctOfDM: 60,
      reason: 'Default cap for concentrate ingredients (% of total DM).',
    }
  }

  return undefined
}

function getRawDmFraction(feed: Feed): number | undefined {
  const frac = (feed.dmPercent || 0) / 100
  if (!Number.isFinite(frac) || frac <= 0.05) return undefined
  return frac
}

export function getEffectiveMaxAsFedKgPerDay(
  feed: Feed,
  req: Pick<{ dmiKg: number }, 'dmiKg'>,
  profile?: AnimalProfile,
  preferences?: OptimizationPreferences
): number | undefined {
  // 1) Explicit user/preset absolute cap
  const explicit = getMaxAsFedKgPerDay(feed, preferences)
  if (typeof explicit === 'number') return explicit

  // 2) Compute max from %DM caps (feed-specific AND default). We use target DMI, not DMI tolerance.
  const dmFrac = getRawDmFraction(feed)
  if (!dmFrac) return undefined

  const feedPct = feed.nutritionalConstraints?.maxInclusionPctOfDM
  const defaultPct = getDefaultMaxInclusionRule(feed, profile)?.pctOfDM

  const pct =
    typeof feedPct === 'number' && typeof defaultPct === 'number'
      ? Math.min(feedPct, defaultPct)
      : typeof feedPct === 'number'
        ? feedPct
        : typeof defaultPct === 'number'
          ? defaultPct
          : undefined

  if (typeof pct !== 'number') return undefined
  const maxDmFromFeed = req.dmiKg * (pct / 100)
  return maxDmFromFeed / dmFrac
}

export function getMinAsFedKgPerDay(
  feed: Feed,
  req?: Pick<{ dmiKg: number }, 'dmiKg'>,
  preferences?: OptimizationPreferences
): number | undefined {
  // 1. Explicit user/preset constraint takes priority
  const min = getFeedConstraint(feed, preferences)?.minAsFedKgPerDay
  if (isFiniteNumber(min)) {
    if (min <= 0) return 0
    return min
  }

  // 2. Use feed's scientifically validated nutritional constraint (new)
  const minPctDM = feed.nutritionalConstraints?.minInclusionPctOfDM
  if (typeof minPctDM === 'number' && minPctDM > 0 && req) {
    const dmFrac = feed.dmPercent / 100
    if (!Number.isFinite(dmFrac) || dmFrac <= 0.05) return undefined

    const minDmFromFeed = req.dmiKg * (minPctDM / 100)
    return minDmFromFeed / dmFrac
  }

  return undefined
}
