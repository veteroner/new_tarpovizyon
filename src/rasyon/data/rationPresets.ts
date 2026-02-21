import type { AnimalProfile, BreedType, OptimizationPreferences, Parity, ProductionPhase, Purpose, Species } from '@/types'
import { getBreedsForSpecies, getPhaseOptionsForPurpose } from '@/utils/animalMetadata'

export type PresetCategory = 'economic' | 'performance' | 'low-risk' | 'high-forage' | 'mineral-balanced'

export interface PresetTemplate {
  id: string
  title: string
  subtitle: string
  species: Species
  breed: BreedType
  purpose: Purpose
  productionPhase: ProductionPhase
  category: PresetCategory
  profilePatch: Partial<AnimalProfile>
  feedIds: string[]
  preferencesPatch?: Partial<OptimizationPreferences>
  tags: string[]
}

function stageFromPhase(phase: ProductionPhase): AnimalProfile['stage'] {
  if (phase === 'dry-faroff' || phase === 'dry-closeup') return 'dry'
  if (phase === 'fresh' || phase === 'peak') return 'early'
  if (phase === 'mid') return 'mid'
  if (phase === 'late') return 'late'
  // beef/grower phases don't map cleanly; keep mid as neutral
  return 'mid'
}

function defaultsForBreed(species: Species, breed: BreedType): { weightKg: number } {
  if (species === 'cattle') {
    switch (breed) {
      case 'holstein':
        return { weightKg: 650 }
      case 'simental':
        return { weightKg: 600 }
      case 'brown-swiss':
        return { weightKg: 620 }
      case 'jersey':
        return { weightKg: 450 }
      case 'native-cattle':
        return { weightKg: 550 }
      default:
        return { weightKg: 600 }
    }
  }

  if (species === 'sheep') {
    switch (breed) {
      case 'merino':
        return { weightKg: 60 }
      case 'akkaraman':
        return { weightKg: 65 }
      case 'native-sheep':
        return { weightKg: 60 }
      default:
        return { weightKg: 60 }
    }
  }

  // goat
  switch (breed) {
    case 'saanen':
      return { weightKg: 55 }
    case 'native-goat':
      return { weightKg: 50 }
    default:
      return { weightKg: 52 }
  }
}

function defaultMilkFor(species: Species, breed: BreedType, phase: ProductionPhase): number {
  // Only meaningful for dairy + non-dry phases.
  if (phase === 'dry-faroff' || phase === 'dry-closeup') return 0

  if (species === 'cattle') {
    const base = (() => {
      switch (breed) {
        case 'holstein':
          return { fresh: 18, peak: 40, mid: 30, late: 22 }
        case 'brown-swiss':
          return { fresh: 16, peak: 34, mid: 26, late: 20 }
        case 'simental':
          return { fresh: 16, peak: 34, mid: 26, late: 20 }
        case 'jersey':
          return { fresh: 14, peak: 28, mid: 20, late: 15 }
        case 'native-cattle':
          return { fresh: 11, peak: 22, mid: 16, late: 12 }
        default:
          return { fresh: 16, peak: 34, mid: 26, late: 20 }
      }
    })()

    if (phase === 'fresh') return base.fresh
    if (phase === 'peak') return base.peak
    if (phase === 'mid') return base.mid
    if (phase === 'late') return base.late
    return base.mid
  }

  // Small ruminants (very rough defaults)
  if (species === 'sheep') {
    if (phase === 'fresh') return 1.8
    if (phase === 'peak') return 2.3
    if (phase === 'late') return 1.5
    return 2.0
  }

  // goat
  if (phase === 'fresh') return breed === 'saanen' ? 3.0 : 2.2
  if (phase === 'peak') return breed === 'saanen' ? 4.0 : 3.0
  if (phase === 'late') return breed === 'saanen' ? 2.5 : 1.8
  return breed === 'saanen' ? 3.2 : 2.4
}

function defaultAdgFor(phase: ProductionPhase): number {
  if (phase === 'starter') return 1.0
  if (phase === 'finisher') return 1.1
  return 1.2
}

function defaultParityFor(species: Species, purpose: Purpose): Parity | undefined {
  if (species !== 'cattle') return undefined
  if (purpose !== 'dairy') return undefined
  return 2
}

function feedSetFor(
  species: Species,
  breed: BreedType,
  purpose: Purpose,
  phase: ProductionPhase,
  category: PresetCategory
): string[] {
  // NOTE: feed ids are from src/data/feedsV2.ts

  const includes = (arr: string[], id: string) => (arr.includes(id) ? arr : [...arr, id])

  // Common minerals
  const dairyMineral = 'mineral-dairy-premium'
  const beefMineral = 'mineral-beef-standard'
  const smallMineral = 'mineral-sheep-goat'

  if (purpose === 'dairy') {
    let feedIds: string[] = []

    // Base forage
    feedIds = includes(feedIds, 'corn-silage-high')
    feedIds = includes(feedIds, 'alfalfa-hay-high')
    feedIds = includes(feedIds, 'grass-silage')

    // Breed-aware forage options
    if (species === 'cattle') {
      if (breed === 'native-cattle') {
        // Native cattle: often more pasture/roughage based
        feedIds = includes(feedIds, 'grass-hay')
      }
      if (breed === 'brown-swiss') {
        // Swiss-type dairy: slightly more legume silage option
        feedIds = includes(feedIds, 'alfalfa-silage')
      }
    }

    // Straw increases physically effective fiber but can depress energy density.
    // Avoid straw in fresh low-risk where DMI is already limited.
    if (category === 'high-forage' || (category === 'low-risk' && phase !== 'fresh')) {
      feedIds = includes(feedIds, 'wheat-straw')
    }

    // Concentrate / protein
    if (category === 'performance') {
      if (breed === 'native-cattle') {
        // Performance but with moderate concentrate density
        feedIds = includes(feedIds, 'dairy-feed-20-2800')
      } else if (breed === 'jersey') {
        // Jersey: energy density matters; offer safe energy options
        feedIds = includes(feedIds, 'dairy-feed-22-2900')
        feedIds = includes(feedIds, 'bypass-fat')
        feedIds = includes(feedIds, 'sugar-beet-pulp')
      } else {
        feedIds = includes(feedIds, 'dairy-feed-22-2900')
      }
    } else if (category === 'economic') {
      if (breed === 'native-cattle') {
        feedIds = includes(feedIds, 'dairy-feed-16-2400')
        feedIds = includes(feedIds, 'wheat-bran')
      } else {
        feedIds = includes(feedIds, 'dairy-feed-18-2600')
      }
    } else if (category === 'low-risk' && phase === 'fresh') {
      // Fresh + low-risk: prioritize digestible fiber & safe energy without excessive starch.
      feedIds = includes(feedIds, 'dairy-feed-21-2850')
      feedIds = includes(feedIds, 'sugar-beet-pulp')
      feedIds = includes(feedIds, 'bypass-fat')
    } else {
      if (breed === 'jersey' && (phase === 'peak' || phase === 'fresh')) {
        // Small-bodied high-solids dairy: keep a slightly higher density option available
        feedIds = includes(feedIds, 'dairy-feed-21-2850')
      } else {
        feedIds = includes(feedIds, 'dairy-feed-20-2800')
      }
    }

    if (!(category === 'low-risk' && phase === 'fresh')) {
      // Breed-aware grain options
      if (species === 'cattle' && (breed === 'holstein' || breed === 'brown-swiss' || breed === 'simental')) {
        feedIds = includes(feedIds, 'corn-grain')
      }
      feedIds = includes(feedIds, 'barley-grain')
      if (breed === 'native-cattle') {
        feedIds = includes(feedIds, 'wheat-bran')
      }
    }

    // Protein sources (offer alternatives; optimizer will choose amounts)
    feedIds = includes(feedIds, 'soybean-meal')
    if (breed === 'native-cattle') {
      feedIds = includes(feedIds, 'sunflower-meal')
    }
    if (species === 'cattle' && (category === 'economic' || category === 'performance')) {
      feedIds = includes(feedIds, 'ddgs-corn')
    }

    // Minerals
    feedIds = includes(feedIds, species === 'cattle' ? dairyMineral : smallMineral)

    // Dry close-up: add anionic premix option
    if (phase === 'dry-closeup') {
      feedIds = includes(feedIds, 'anionic-premix-dry')
    }

    return feedIds
  }

  if (purpose === 'dry') {
    // Dry cow / dry small ruminants: emphasize fiber, control starch.
    let feedIds: string[] = []
    feedIds = includes(feedIds, 'corn-silage-medium')
    feedIds = includes(feedIds, 'grass-hay')
    feedIds = includes(feedIds, 'wheat-straw')

    if (species === 'cattle') {
      feedIds = includes(feedIds, dairyMineral)
      if (phase === 'dry-closeup' || category === 'mineral-balanced') {
        feedIds = includes(feedIds, 'anionic-premix-dry')
        // Add phosphorus source to balance high Ca from anionic salts
        feedIds = includes(feedIds, 'dicalcium-phosphate')
      }
    } else {
      feedIds = includes(feedIds, smallMineral)
    }

    // Close-up and performance categories need more energy/protein
    if (phase === 'dry-closeup' || category === 'performance' || category === 'mineral-balanced') {
      feedIds = includes(feedIds, 'barley-grain')
      feedIds = includes(feedIds, 'dairy-feed-18-2600') // moderate energy concentrate
    }

    return feedIds
  }

  // beef / grower
  let feedIds: string[] = []
  feedIds = includes(feedIds, 'corn-silage-medium')
  feedIds = includes(feedIds, 'wheat-straw')
  feedIds = includes(feedIds, 'barley-grain')
  feedIds = includes(feedIds, 'corn-grain')
  feedIds = includes(feedIds, 'soybean-meal')

  if (species === 'cattle') feedIds = includes(feedIds, beefMineral)
  else feedIds = includes(feedIds, smallMineral)

  // Breed-aware beef tweaks
  if (species === 'cattle' && breed === 'native-cattle') {
    // Make a slightly more locally-available, economic set possible
    feedIds = includes(feedIds, 'wheat-bran')
    feedIds = includes(feedIds, 'sunflower-meal')
  }

  // Performance/finisher: allow a higher-energy dairy feed substitute in cattle
  if (species === 'cattle' && (category === 'performance' || phase === 'finisher')) {
    feedIds = includes(feedIds, 'dairy-feed-21-2850')
  }

  return feedIds
}

function preferencesFor(category: PresetCategory, phase?: ProductionPhase): Partial<OptimizationPreferences> {
  switch (category) {
    case 'economic':
      return { minForagePercent: 50, maxConcentratePercent: 60, maxCostPerDay: 220 }
    case 'performance':
      return { minForagePercent: 40, maxConcentratePercent: 70 }
    case 'low-risk':
      // Low-risk generally targets higher forage.
      // Fresh is DMI-limited; keep forage reasonable and allow safe energy via bypass fat.
      if (phase === 'fresh') {
        return {
          minForagePercent: 50,
          maxConcentratePercent: 60,
          feedConstraints: {
            'bypass-fat': { maxAsFedKgPerDay: 0.6 },
          },
        }
      }
      return { minForagePercent: 60, maxConcentratePercent: 55 }
    case 'high-forage':
      return { minForagePercent: 70, maxConcentratePercent: 45 }
    case 'mineral-balanced':
      // Dry-closeup needs higher anionic premix to achieve negative DCAD
      if (phase === 'dry-closeup') {
        return {
          minForagePercent: 50,
          maxConcentratePercent: 60,
          feedConstraints: {
            'anionic-premix-dry': { minAsFedKgPerDay: 0.15, maxAsFedKgPerDay: 0.35 },
            'dicalcium-phosphate': { minAsFedKgPerDay: 0.05, maxAsFedKgPerDay: 0.15 },
          },
        }
      }
      return { minForagePercent: 50, maxConcentratePercent: 60 }
    default:
      return {}
  }
}

function categoryTitle(category: PresetCategory): { title: string; subtitle: string; tags: string[] } {
  switch (category) {
    case 'economic':
      return { title: 'Ekonomik', subtitle: 'Maliyet odaklı başlangıç şablonu', tags: ['ekonomik', 'pratik'] }
    case 'performance':
      return { title: 'Yüksek Performans', subtitle: 'Enerji yoğun, yüksek hedefler için', tags: ['performans', 'enerji'] }
    case 'low-risk':
      return { title: 'Düşük Risk', subtitle: 'Rumen sağlığı için daha konservatif', tags: ['sara', 'güvenli'] }
    case 'high-forage':
      return { title: 'Yüksek Kaba Yem', subtitle: 'Fiber odaklı, daha stabil rasyon', tags: ['kaba yem', 'ndf'] }
    case 'mineral-balanced':
      return { title: 'Mineral/DCAD', subtitle: 'Mineral dengesi ve DCAD odaklı', tags: ['mineral', 'dcad'] }
    default:
      return { title: 'Preset', subtitle: '', tags: [] }
  }
}

export function buildPresetTemplates(input: {
  species: Species
  breed: BreedType
  purpose: Purpose
  productionPhase: ProductionPhase
}): PresetTemplate[] {
  const { species, breed, purpose, productionPhase } = input

  const { weightKg } = defaultsForBreed(species, breed)
  const parity = defaultParityFor(species, purpose)
  const stage = stageFromPhase(productionPhase)

  const baseProfile: Partial<AnimalProfile> = {
    species,
    breed,
    purpose,
    weightKg,
    stage,
    parity,
    productionPhase,
  }

  if (purpose === 'dairy') {
    baseProfile.milkYieldKgPerDay = defaultMilkFor(species, breed, productionPhase)
  }
  if (purpose === 'beef' || purpose === 'grower') {
    baseProfile.targetAdgKgPerDay = defaultAdgFor(productionPhase)
  }
  if (purpose === 'dry') {
    baseProfile.milkYieldKgPerDay = 0
  }

  const categories: PresetCategory[] = ['economic', 'performance', 'low-risk', 'high-forage', 'mineral-balanced']

  return categories.map((cat) => {
    const meta = categoryTitle(cat)
    const feedIds = feedSetFor(species, breed, purpose, productionPhase, cat)
    const basePreferencesPatch = preferencesFor(cat, productionPhase)

    // Beef (besi) preset'lerinde çeşitlilik/rol kısıtlarını varsayılan olarak aç.
    // Bu, solver'ın 2-3 yemle hedefleri tutturup durmasını engeller.
    const diversityPatch: Partial<OptimizationPreferences> =
      purpose === 'beef'
        ? {
            minActiveFeeds: 6,
            minForageFeeds: 2,
            minConcentrateFeeds: 2,
            minMineralFeeds: 1,
          }
        : {}

    const preferencesPatch: Partial<OptimizationPreferences> = {
      ...basePreferencesPatch,
      ...diversityPatch,
    }

    return {
      id: `${species}:${breed}:${purpose}:${productionPhase}:${cat}`,
      title: meta.title,
      subtitle: meta.subtitle,
      species,
      breed,
      purpose,
      productionPhase,
      category: cat,
      profilePatch: baseProfile,
      feedIds,
      preferencesPatch,
      tags: meta.tags,
    }
  })
}

export function buildAllPresetTemplates(): PresetTemplate[] {
  const speciesList: Species[] = ['cattle', 'sheep', 'goat']
  const purposes: Purpose[] = ['dairy', 'beef', 'dry', 'grower']

  const all: PresetTemplate[] = []

  for (const sp of speciesList) {
    const breeds = getBreedsForSpecies(sp)
    for (const breed of breeds) {
      for (const purpose of purposes) {
        const phases = getPhaseOptionsForPurpose(purpose)
        for (const phase of phases) {
          all.push(
            ...buildPresetTemplates({
              species: sp,
              breed,
              purpose,
              productionPhase: phase,
            })
          )
        }
      }
    }
  }

  return all
}
