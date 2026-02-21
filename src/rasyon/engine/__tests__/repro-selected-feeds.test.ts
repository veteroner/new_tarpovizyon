import { describe, expect, it } from 'vitest'
import { feeds } from '@/data/feedsV2'
import { optimizeRation } from '@/engine/optimizerV2'
import { getEffectiveMaxAsFedKgPerDay } from '@/engine/optimizer/feedConstraints'

describe('repro: selected feeds ration (alfalfa/corn silage + dairy feed + wheat straw)', () => {
  it('builds a ration and respects per-feed max caps', async () => {
    const selected = feeds.filter((f) =>
      ['alfalfa-silage', 'corn-silage-high', 'dairy-feed-19-2700', 'wheat-straw'].includes(f.id)
    )

    expect(selected.map((f) => f.id).sort()).toEqual(
      ['alfalfa-silage', 'corn-silage-high', 'dairy-feed-19-2700', 'wheat-straw'].sort()
    )

    const profile = {
      species: 'cattle',
      breed: 'holstein',
      sex: 'female',
      purpose: 'dairy',
      weightKg: 600,
      stage: 'mid',
      milkYieldKgPerDay: 25,
    } as const

    const result = await optimizeRation(profile, selected, { solver: 'auto' })

    expect(['success', 'infeasible']).toContain(result.status)
    expect(result.ration).toBeTruthy()

    const ration = result.ration!

    console.log('Status:', result.status)
    console.log('Message:', result.message)
    console.log('Notes:', ration.optimizerNotes)

    // Print a stable, inspectable summary in test output (useful for debugging).
    console.log(
      '\nRepro ration (solver=' + ration.solver + '): DMI ' + ration.totals.dmiKg.toFixed(2) + ' / ' + ration.requirements.dmiKg.toFixed(2)
    )

    for (const ing of ration.ingredients) {
      const feed = selected.find((f) => f.id === ing.feedId)
      expect(feed).toBeTruthy()
      const maxAllowed = getEffectiveMaxAsFedKgPerDay(feed!, ration.requirements, ration.profile)

      console.log(
        `- ${ing.feedName}: ${ing.kgAsFedPerDay.toFixed(2)} kg as-fed (max ${maxAllowed?.toFixed(2) ?? '—'})`
      )

      if (typeof maxAllowed === 'number') {
        // Allow tiny numerical tolerance due to incremental greedy steps.
        expect(ing.kgAsFedPerDay).toBeLessThanOrEqual(maxAllowed * 1.001)
      }
    }
  })
})
