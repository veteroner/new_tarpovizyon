import { describe, expect, it } from 'vitest'
import type { Feed, OptimizationPreferences } from '@/types'
import { getEffectiveMaxAsFedKgPerDay, getFeedPriceTLPerKg, getMaxAsFedKgPerDay, getMinAsFedKgPerDay } from '@/engine/optimizer/feedConstraints'

function baseFeed(overrides: Partial<Feed> = {}): Feed {
  return {
    id: 'test_feed',
    name: 'Test Yem',
    category: 'concentrate',
    dmPercent: 88,
    meMcalPerKg: 3.0,
    cpPercent: 16,
    ndfPercent: 25,
    caPercent: 0.3,
    pPercent: 0.25,
    priceTLPerKg: 10,
    ...overrides,
  }
}

describe('optimizer/feedConstraints', () => {
  it('ignores NaN max/min constraints', () => {
    const feed = baseFeed()

    const preferences: OptimizationPreferences = {
      feedConstraints: {
        [feed.id]: {
          maxAsFedKgPerDay: Number.NaN,
          minAsFedKgPerDay: Number.NaN,
        },
      },
    }

    expect(getMaxAsFedKgPerDay(feed, preferences)).toBeUndefined()
    // getMinAsFedKgPerDay now requires req parameter, pass undefined to test fallback
    expect(getMinAsFedKgPerDay(feed, undefined, preferences)).toBeUndefined()
  })

  it('falls back to base price if override is NaN or non-positive', () => {
    const feed = baseFeed({ priceTLPerKg: 12.5 })

    const preferencesNaN: OptimizationPreferences = {
      feedConstraints: {
        [feed.id]: { priceOverrideTLPerKg: Number.NaN },
      },
    }

    const preferencesZero: OptimizationPreferences = {
      feedConstraints: {
        [feed.id]: { priceOverrideTLPerKg: 0 },
      },
    }

    expect(getFeedPriceTLPerKg(feed, preferencesNaN)).toBe(12.5)
    expect(getFeedPriceTLPerKg(feed, preferencesZero)).toBe(12.5)
  })

  it('prefers explicit maxAsFedKgPerDay over %DM caps', () => {
    const feed = baseFeed({
      nutritionalConstraints: { maxInclusionPctOfDM: 10 },
    })

    const preferences: OptimizationPreferences = {
      feedConstraints: {
        [feed.id]: { maxAsFedKgPerDay: 3 },
      },
    }

    const max = getEffectiveMaxAsFedKgPerDay(feed, { dmiKg: 20 }, undefined, preferences)
    expect(max).toBe(3)
  })

  it('computes max from feed maxInclusionPctOfDM when present', () => {
    const feed = baseFeed({ dmPercent: 50, nutritionalConstraints: { maxInclusionPctOfDM: 10 } })
    const max = getEffectiveMaxAsFedKgPerDay(feed, { dmiKg: 20 })
    // 20 kg DM * 10% = 2 kg DM from this feed; DM=50% => 4 kg as-fed
    expect(max).toBeCloseTo(4, 6)
  })

  it('applies a default max for unconstrained feeds (prevents unlimited single-ingredient diets)', () => {
    const feed = baseFeed({ category: 'concentrate', dmPercent: 88 })
    const max = getEffectiveMaxAsFedKgPerDay(feed, { dmiKg: 20 })
    // Default concentrate cap: 60% DM => 12 kg DM; DM=88% => ~13.636 kg as-fed
    expect(max).toBeCloseTo(13.636, 2)
  })
})
