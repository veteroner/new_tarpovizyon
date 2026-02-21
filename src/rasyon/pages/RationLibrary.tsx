import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Wand2 } from 'lucide-react'

import type { BreedType, ProductionPhase, Purpose, Species } from '@/types'
import { getFeedById } from '@/data/feedsV2'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { buildAllPresetTemplates, buildPresetTemplates, type PresetCategory } from '@/data/rationPresets'
import {
  getBreedLabel,
  getBreedsForSpecies,
  getPhaseLabel,
  getPhaseOptionsForPurpose,
  getPurposeLabel,
  getSpeciesLabel,
} from '@/utils/animalMetadata'
import { useUIStore } from '@/store/uiStore'

const purposeOptions: Array<{ value: Purpose; label: string }> = [
  { value: 'dairy', label: 'Süt' },
  { value: 'beef', label: 'Besi' },
  { value: 'dry', label: 'Kuru' },
  { value: 'grower', label: 'Düve/Genç' },
]

const categoryOptions: Array<{ value: PresetCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'economic', label: 'Ekonomik' },
  { value: 'performance', label: 'Yüksek Performans' },
  { value: 'low-risk', label: 'Düşük Risk' },
  { value: 'high-forage', label: 'Yüksek Kaba Yem' },
  { value: 'mineral-balanced', label: 'Mineral/DCAD' },
]

export default function RationLibrary() {
  const navigate = useNavigate()
  const applyPresetTemplate = useRationWizardStore((s) => s.applyPresetTemplate)
  const showToast = useUIStore((s) => s.showToast)

  const [species, setSpecies] = useState<Species>('cattle')
  const [breed, setBreed] = useState<BreedType>('holstein')
  const [purpose, setPurpose] = useState<Purpose>('dairy')
  const [phase, setPhase] = useState(() => getPhaseOptionsForPurpose('dairy')[2])
  const [category, setCategory] = useState<PresetCategory | 'all'>('all')
  const [showAll, setShowAll] = useState(false)

  const breeds = useMemo(() => getBreedsForSpecies(species), [species])
  const phases = useMemo(() => getPhaseOptionsForPurpose(purpose), [purpose])

  const allTemplates = useMemo(() => buildAllPresetTemplates(), [])

  const templates = useMemo(() => {
    if (showAll) {
      const filtered = allTemplates.filter((t) => {
        const matchesSpecies = t.species === species
        const matchesBreed = t.breed === breed
        const matchesPurpose = t.purpose === purpose
        const matchesPhase = t.productionPhase === phase
        const matchesCategory = category === 'all' || t.category === category
        return matchesSpecies && matchesBreed && matchesPurpose && matchesPhase && matchesCategory
      })
      return filtered
    }

    const list = buildPresetTemplates({
      species,
      breed,
      purpose,
      productionPhase: phase,
    })
    return category === 'all' ? list : list.filter((t) => t.category === category)
  }, [allTemplates, species, breed, purpose, phase, category, showAll])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Hazır Rasyon Kütüphanesi</h1>
            <p className="text-gray-600 text-sm">
              Tür, ırk ve faz seç; uygun başlangıç şablonlarını sihirbaza uygula.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => navigate('/rasyon/wizard/mode')}
          >
            <Wand2 size={16} />
            Sihirbaza git
          </button>
        </div>
      </div>

      <div className="card mb-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-semibold">
          <BookOpen size={18} />
          Filtreler
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Tür</label>
            <select
              className="input-field mt-1"
              value={species}
              onChange={(e) => {
                const nextSpecies = e.target.value as Species
                const nextBreeds = getBreedsForSpecies(nextSpecies)
                setSpecies(nextSpecies)
                setBreed(nextBreeds[0])
              }}
            >
              <option value="cattle">Sığır</option>
              <option value="sheep">Koyun</option>
              <option value="goat">Keçi</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Irk</label>
            <select className="input-field mt-1" value={breed} onChange={(e) => setBreed(e.target.value as BreedType)}>
              {breeds.map((b) => (
                <option key={b} value={b}>
                  {getBreedLabel(b)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Amaç</label>
            <select
              className="input-field mt-1"
              value={purpose}
              onChange={(e) => {
                const nextPurpose = e.target.value as Purpose
                setPurpose(nextPurpose)
                const nextPhases = getPhaseOptionsForPurpose(nextPurpose)
                setPhase(nextPhases[0])
              }}
            >
              {purposeOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Faz</label>
            <select className="input-field mt-1" value={phase} onChange={(e) => setPhase(e.target.value as ProductionPhase)}>
              {phases.map((ph) => (
                <option key={ph} value={ph}>
                  {getPhaseLabel(ph)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Kategori</label>
            <select className="input-field mt-1" value={category} onChange={(e) => setCategory(e.target.value as PresetCategory | 'all')}>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Seçim: {getSpeciesLabel(species)} • {getBreedLabel(breed)} • {getPurposeLabel(purpose)} • {getPhaseLabel(phase)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Gösterilen şablon sayısı: {templates.length}
          </span>
          <button
            type="button"
            className="text-green-700 font-medium hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Sadece bu filtredeki 5 şablonu göster' : 'Tüm havuzda filtrele'}
          </button>
        </div>
        {templates.map((t) => {
          const feedNames = t.feedIds
            .map((id) => getFeedById(id)?.name)
            .filter((x): x is string => Boolean(x))

          const defaultTargets = (() => {
            const parts: string[] = []

            const weightKg = t.profilePatch.weightKg
            const milk = t.profilePatch.milkYieldKgPerDay
            const adg = t.profilePatch.targetAdgKgPerDay
            const parity = t.profilePatch.parity

            if (typeof weightKg === 'number' && Number.isFinite(weightKg)) {
              parts.push(`Canlı ağırlık: ${Math.round(weightKg)} kg`)
            }
            if (typeof milk === 'number' && Number.isFinite(milk) && milk > 0) {
              parts.push(`Süt: ${milk.toFixed(0)} kg/gün`)
            }
            if (typeof adg === 'number' && Number.isFinite(adg) && adg > 0) {
              parts.push(`Hedef ADG: ${adg.toFixed(1)} kg/gün`)
            }
            if (typeof parity === 'number' && Number.isFinite(parity)) {
              parts.push(`Parite: ${parity}`)
            }

            return parts
          })()

          return (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                      {getPhaseLabel(t.productionPhase)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{t.subtitle}</p>

                  {defaultTargets.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Varsayılan hedefler</p>
                      <p className="text-sm text-gray-600">{defaultTargets.join(' • ')}</p>
                    </div>
                  )}

                  {feedNames.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-700 mb-1">Önerilen yem seti</p>
                      <p className="text-sm text-gray-700">{feedNames.slice(0, 6).join(' • ')}{feedNames.length > 6 ? ' • ...' : ''}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Not: Yem seti bazı ırklarda benzer görünebilir; asıl fark hedeflerden (canlı ağırlık/süt/ADG) gelir.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      applyPresetTemplate({
                        profilePatch: t.profilePatch,
                        feedIds: t.feedIds,
                        preferencesPatch: t.preferencesPatch,
                      })
                      showToast({
                        type: 'success',
                        message: `${t.title} şablonu yüklendi! İsterseniz yem setini düzenleyebilirsiniz.`,
                        duration: 4000,
                      })
                      navigate('/rasyon/wizard/review')
                    }}
                  >
                    Sihirbaza uygula
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {templates.length === 0 && (
          <div className="card text-sm text-gray-600">Bu filtre kombinasyonu için preset bulunamadı.</div>
        )}
      </div>
    </div>
  )
}
