/**
 * Preset doğrulama ve sanity-check araçları
 */

import { buildPresetTemplates } from '@/data/rationPresets'
import { getFeedById } from '@/data/feedsV2'
import { getBreedsForSpecies, getPhaseOptionsForPurpose } from '@/utils/animalMetadata'
import type { Purpose, Species } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalPresets: number
    validPresets: number
    missingFeeds: number
    emptyFeedSets: number
  }
}

export function validateAllPresets(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let totalPresets = 0
  let validPresets = 0
  let missingFeeds = 0
  let emptyFeedSets = 0

  const species: Species[] = ['cattle', 'sheep', 'goat']
  const purposes: Purpose[] = ['dairy', 'beef', 'dry', 'grower']

  for (const sp of species) {
    const breeds = getBreedsForSpecies(sp)

    for (const breed of breeds) {
      for (const purpose of purposes) {
        const phases = getPhaseOptionsForPurpose(purpose)

        for (const phase of phases) {
          const presets = buildPresetTemplates({
            species: sp,
            breed,
            purpose,
            productionPhase: phase,
          })

          totalPresets += presets.length

          for (const preset of presets) {
            let isValid = true

            // Check feed IDs exist
            const invalidFeeds: string[] = []
            for (const feedId of preset.feedIds) {
              const feed = getFeedById(feedId)
              if (!feed) {
                invalidFeeds.push(feedId)
                isValid = false
              }
            }

            if (invalidFeeds.length > 0) {
              errors.push(
                `Preset ${preset.id}: Missing feeds: ${invalidFeeds.join(', ')}`
              )
              missingFeeds += invalidFeeds.length
            }

            // Check feed set not empty
            if (preset.feedIds.length === 0) {
              errors.push(`Preset ${preset.id}: Empty feed set`)
              emptyFeedSets++
              isValid = false
            }

            // Warn if no forage
            const hasForage = preset.feedIds.some((id) => {
              const feed = getFeedById(id)
              return feed?.category === 'forage'
            })
            if (!hasForage) {
              warnings.push(`Preset ${preset.id}: No forage feeds`)
            }

            // Warn if no mineral
            const hasMineral = preset.feedIds.some((id) => {
              const feed = getFeedById(id)
              return feed?.category === 'mineral'
            })
            if (!hasMineral) {
              warnings.push(`Preset ${preset.id}: No mineral feeds`)
            }

            if (isValid) {
              validPresets++
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalPresets,
      validPresets,
      missingFeeds,
      emptyFeedSets,
    },
  }
}

export function getPresetSample() {
  // Generate a few representative samples for manual testing
  return [
    {
      label: 'Holstein Dairy Peak - Performance',
      preset: buildPresetTemplates({
        species: 'cattle',
        breed: 'holstein',
        purpose: 'dairy',
        productionPhase: 'peak',
      }).find((p) => p.category === 'performance'),
    },
    {
      label: 'Jersey Dairy Mid - Economic',
      preset: buildPresetTemplates({
        species: 'cattle',
        breed: 'jersey',
        purpose: 'dairy',
        productionPhase: 'mid',
      }).find((p) => p.category === 'economic'),
    },
    {
      label: 'Holstein Dry Close-up - Mineral Balanced',
      preset: buildPresetTemplates({
        species: 'cattle',
        breed: 'holstein',
        purpose: 'dry',
        productionPhase: 'dry-closeup',
      }).find((p) => p.category === 'mineral-balanced'),
    },
    {
      label: 'Native Cattle Beef Finisher - Performance',
      preset: buildPresetTemplates({
        species: 'cattle',
        breed: 'native-cattle',
        purpose: 'beef',
        productionPhase: 'finisher',
      }).find((p) => p.category === 'performance'),
    },
    {
      label: 'Merino Sheep Dairy Mid - Low Risk',
      preset: buildPresetTemplates({
        species: 'sheep',
        breed: 'merino',
        purpose: 'dairy',
        productionPhase: 'mid',
      }).find((p) => p.category === 'low-risk'),
    },
    {
      label: 'Saanen Goat Dairy Peak - Performance',
      preset: buildPresetTemplates({
        species: 'goat',
        breed: 'saanen',
        purpose: 'dairy',
        productionPhase: 'peak',
      }).find((p) => p.category === 'performance'),
    },
  ]
}
