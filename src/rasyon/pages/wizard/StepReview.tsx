import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'

import { optimizeRation } from '@/engine/optimizerV2'
import { useRationStore } from '@/store/rationStore'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { useFeedStore } from '@/store/feedStore'
import type { Feed, Ration, InfeasibilityDiagnostic } from '@/types'
import InfeasibilityPanel from '@/components/InfeasibilityPanel'

export default function StepReview() {
  const navigate = useNavigate()
  const addRation = useRationStore((s) => s.addRation)

  const profile = useRationWizardStore((s) => s.draft.profile)
  const selectedFeeds = useRationWizardStore((s) => s.draft.selectedFeeds)
  const preferences = useRationWizardStore((s) => s.draft.preferences)
  const setPreferences = useRationWizardStore((s) => s.setPreferences)
  const buildOptimizerPreferences = useRationWizardStore((s) => s.buildOptimizerPreferences)
  const addFeeds = useRationWizardStore((s) => s.addFeeds)

  const feedOverrides = useFeedStore((s) => s.feedOverrides)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const allFeeds = useMemo(
    () => useFeedStore.getState().getAllFeeds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedOverrides, userFeeds]
  )

  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewRation, setPreviewRation] = useState<Ration | null>(null)
  const [infeasibilityDiagnostics, setInfeasibilityDiagnostics] = useState<InfeasibilityDiagnostic[]>([])
  const [infeasibleDetails, setInfeasibleDetails] = useState<{
    message: string
    deficits?: { meMcal: number; cpGrams: number }
    notes?: string[]
    suggestions: string[]
    recommendedFeedIds?: string[]
  } | null>(null)

  const selectedFeedObjects = useMemo(() => {
    const byId = new Map<string, Feed>(allFeeds.map((f) => [f.id, f]))
    return selectedFeeds
      .filter((sf) => sf.enabled)
      .map((sf) => byId.get(sf.feedId))
      .filter((x): x is Feed => Boolean(x))
  }, [allFeeds, selectedFeeds])

  const previewKey = useMemo(() => {
    const feedKey = selectedFeeds
      .map((f) => `${f.feedId}:${f.enabled ? 1 : 0}:${f.maxAsFedKgPerDay ?? ''}:${f.minAsFedKgPerDay ?? ''}:${f.priceOverrideTLPerKg ?? ''}`)
      .sort()
      .join('|')
    const profileKey = [
      profile.species,
      profile.breed,
      profile.sex,
      profile.purpose,
      profile.weightKg,
      profile.stage,
      profile.productionPhase ?? '',
      profile.milkYieldKgPerDay ?? '',
      profile.targetAdgKgPerDay ?? '',
      profile.pregnancyMonth ?? '',
    ].join('|')
    const prefKey = [
      preferences.minForagePercent ?? '',
      preferences.maxConcentratePercent ?? '',
      preferences.maxCostPerDay ?? '',
      preferences.prioritizeOrganic ? 1 : 0,
      preferences.solver ?? '',
      preferences.lpDmiTolerancePercent ?? '',
    ].join('|')

    return `${profileKey}__${prefKey}__${feedKey}`
  }, [profile, preferences, selectedFeeds])

  const selectedFeedIds = useMemo(() => new Set(selectedFeedObjects.map((f) => f.id)), [selectedFeedObjects])

  const candidateFeeds = useMemo(() => allFeeds.filter((f) => !selectedFeedIds.has(f.id)), [allFeeds, selectedFeedIds])

  const recommendFeeds = useMemo(() => {
    const topForage = candidateFeeds
      .filter((f) => f.category === 'forage')
      .sort((a, b) => b.meMcalPerKg - a.meMcalPerKg)
      .slice(0, 3)

    const topEnergy = candidateFeeds
      .filter((f) => f.category === 'concentrate')
      .sort((a, b) => b.meMcalPerKg - a.meMcalPerKg)
      .slice(0, 3)

    const topProtein = candidateFeeds
      .filter((f) => f.category !== 'mineral')
      .sort((a, b) => b.cpPercent - a.cpPercent)
      .slice(0, 3)

    const topMineral = candidateFeeds
      .filter((f) => f.category === 'mineral' || /mineral|premiks/i.test(f.name))
      .sort((a, b) => b.caPercent - a.caPercent)
      .slice(0, 2)

    return { topForage, topEnergy, topProtein, topMineral }
  }, [candidateFeeds])

  const profileWarnings = useMemo(() => {
    const warnings: string[] = []

    if (profile.pregnancyMonth != null) {
      if (profile.sex !== 'female') {
        warnings.push('Gebelik ayı girilmiş ama cinsiyet dişi değil. Lütfen kontrol et.')
      }
      if (profile.stage === 'early' && profile.pregnancyMonth >= 4) {
        warnings.push('Erken laktasyon + ileri gebelik kombinasyonu alışılmadık; değerleri kontrol et.')
      }
    }

    if (profile.stage === 'dry' && profile.purpose === 'dairy') {
      warnings.push('Dönem "kuru" seçili. Süt verimi 0 kabul edilir; amaç "kuru" seçmek daha uygun olabilir.')
    }

    if (profile.purpose === 'dry' && profile.stage !== 'dry') {
      warnings.push('Amaç "kuru" seçili. Dönem otomatik olarak kuruya alınır.')
    }

    return warnings
  }, [profile])

  const runOptimization = async () => {
    setError(null)
    setInfeasibleDetails(null)
    setInfeasibilityDiagnostics([])
    setPreviewRation(null)

    if (selectedFeedObjects.length === 0) {
      setError('Lütfen en az 1 yem seçin')
      return { kind: 'error' as const }
    }

    const optPrefs = buildOptimizerPreferences()
    const result = await optimizeRation(profile, selectedFeedObjects, optPrefs)

    if (result.status === 'success' && result.ration) {
      setPreviewRation(result.ration)
      return { kind: 'success' as const, ration: result.ration }
    }

    if (result.status === 'infeasible') {
      // We still may have a best-effort ration; keep it as preview so the user can proceed.
      if (result.ration) {
        setPreviewRation(result.ration)
      }

      // Use new infeasibilityDiagnostics from optimizer
      if (result.diagnostics?.infeasibilityDiagnostics && result.diagnostics.infeasibilityDiagnostics.length > 0) {
        setInfeasibilityDiagnostics(result.diagnostics.infeasibilityDiagnostics)
      }

      const hasForage = selectedFeedObjects.some((f) => f.category === 'forage')
      const hasConcentrate = selectedFeedObjects.some((f) => f.category === 'concentrate')
      const hasMineral = selectedFeedObjects.some((f) => f.category === 'mineral')

      const deficits = result.diagnostics?.deficits
      const suggestions: string[] = []
      const recommendedFeedIds: string[] = []

      if (!hasForage) {
        const names = recommendFeeds.topForage.map((f) => f.name).join(', ')
        suggestions.push(names ? `Kaba yem ekle: ${names}` : 'En az 1-2 kaba yem (silaj/yonca/saman) ekle')
        recommendedFeedIds.push(...recommendFeeds.topForage.map((f) => f.id))
      }
      if (!hasConcentrate) {
        const names = recommendFeeds.topEnergy.map((f) => f.name).join(', ')
        suggestions.push(names ? `Konsantre ekle: ${names}` : 'Enerji/protein için konsantre yem ekle (tahıl/küspe)')
        recommendedFeedIds.push(...recommendFeeds.topEnergy.map((f) => f.id))
      }
      if (!hasMineral) {
        const names = recommendFeeds.topMineral.map((f) => f.name).join(', ')
        suggestions.push(names ? `Mineral/premiks ekle: ${names}` : 'Mineral/premiks ekle (Ca/P dengesi için)')
        recommendedFeedIds.push(...recommendFeeds.topMineral.map((f) => f.id))
      }

      if (deficits) {
        if (deficits.meMcal > 0.5) {
          const names = recommendFeeds.topEnergy.map((f) => f.name).join(', ')
          suggestions.push(names ? `Enerji açığı: şunları eklemeyi dene: ${names}` : 'Enerji açığı var: daha enerji yoğun yem seç veya max limitleri artır')
          recommendedFeedIds.push(...recommendFeeds.topEnergy.map((f) => f.id))
        }
        if (deficits.cpGrams > 50) {
          const names = recommendFeeds.topProtein.map((f) => f.name).join(', ')
          suggestions.push(names ? `Protein açığı: şunları eklemeyi dene: ${names}` : 'Protein açığı var: protein yoğun yem ekle veya max limitleri artır')
          recommendedFeedIds.push(...recommendFeeds.topProtein.map((f) => f.id))
        }
      }

      if (optPrefs.maxCostPerDay) {
        suggestions.push('Maliyet tavanı çok düşükse yükseltmeyi dene')
      }

      suggestions.push('Hedefi (süt/ADG) çok yüksekse düşürmeyi dene')

      setInfeasibleDetails({
        message: result.message || 'Gereksinimler karşılanamadı',
        deficits: deficits ? { meMcal: deficits.meMcal, cpGrams: deficits.cpGrams } : undefined,
        notes: result.diagnostics?.notes,
        suggestions,
        recommendedFeedIds: Array.from(new Set(recommendedFeedIds)).filter((id) => !selectedFeedIds.has(id)),
      })

      return { kind: 'infeasible' as const }
    }

    setError(result.message || 'Rasyon oluşturulamadı')
    return { kind: 'error' as const }
  }

  const lastPreviewKey = useRef<string | null>(null)
  const previewAbortRef = useRef<{ aborted: boolean } | null>(null)

  useEffect(() => {
    // Auto-preview on entry or when inputs change.
    // Keeps UI responsive: user sees infeasibility and suggestions without clicking.
    if (lastPreviewKey.current === previewKey) return
    lastPreviewKey.current = previewKey

    // Cancel previous run
    if (previewAbortRef.current) previewAbortRef.current.aborted = true
    const token = { aborted: false }
    previewAbortRef.current = token

    const run = async () => {
      setIsCalculating(true)
      try {
        await runOptimization()
      } catch (e: unknown) {
        if (token.aborted) return
        setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu')
      } finally {
        if (!token.aborted) setIsCalculating(false)
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey])

  const onCreate = async () => {
    setIsCalculating(true)
    setError(null)
    setInfeasibleDetails(null)

    try {
      // If we already have a successful preview, persist it without recomputing.
      if (previewRation) {
        addRation(previewRation)
        navigate(`/rasyon/ration/${previewRation.id}`)
        return
      }

      const out = await runOptimization()
      if (out.kind === 'success') {
        addRation(out.ration)
        navigate(`/rasyon/ration/${out.ration.id}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu')
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Önizleme & Kısıtlar</h2>
          <p className="text-sm text-gray-600">Seçilen yemlerle otomatik hesaplama yapılır; önerileri takip edin.</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
            isCalculating
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : infeasibleDetails
                ? 'border-orange-200 bg-orange-50 text-orange-800'
                : previewRation
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          {isCalculating
            ? 'Hesaplanıyor...'
            : infeasibleDetails
              ? 'Gereksinimler eksik'
              : previewRation
                ? 'Hesaplama hazır'
                : 'Hesaplama bekliyor'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900">Hayvan & Hedef</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Tür</p>
              <p className="font-medium text-gray-900">{profile.species}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Irk</p>
              <p className="font-medium text-gray-900">{profile.breed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ağırlık</p>
              <p className="font-medium text-gray-900">{profile.weightKg} kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Amaç</p>
              <p className="font-medium text-gray-900">{profile.purpose}</p>
            </div>
            {typeof profile.milkYieldKgPerDay === 'number' && profile.purpose === 'dairy' && (
              <div>
                <p className="text-xs text-gray-500">Süt</p>
                <p className="font-medium text-gray-900">{profile.milkYieldKgPerDay} kg/gün</p>
              </div>
            )}
            {typeof profile.targetAdgKgPerDay === 'number' && (profile.purpose === 'beef' || profile.purpose === 'grower') && (
              <div>
                <p className="text-xs text-gray-500">ADG</p>
                <p className="font-medium text-gray-900">{profile.targetAdgKgPerDay} kg/gün</p>
              </div>
            )}
          </div>

          {profileWarnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-sm font-semibold">Kontrol önerisi</p>
              <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
                {profileWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900">Kısıtlar</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Min Kaba Yem (%)</label>
              <input
                className="input-field mt-1"
                type="number"
                min={0}
                max={90}
                value={preferences.minForagePercent ?? 50}
                onChange={(e) => setPreferences({ minForagePercent: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Max Maliyet (TL/gün)</label>
              <input
                className="input-field mt-1"
                type="number"
                min={0}
                step={1}
                value={preferences.maxCostPerDay ?? ''}
                onChange={(e) =>
                  setPreferences({
                    maxCostPerDay: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                placeholder="opsiyonel"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(preferences.prioritizeOrganic)}
                onChange={(e) => setPreferences({ prioritizeOrganic: e.target.checked })}
              />
              Organik yemleri önceliklendir
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900">Seçili Yem Özeti</h3>
        <p className="mt-1 text-xs text-gray-500">
          {selectedFeedObjects.length} yem ile optimizasyon yapılacak.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedFeedObjects.map((f) => (
            <span
              key={f.id}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {f.name}
            </span>
          ))}
        </div>
      </div>

      {previewRation && (
        <div className="card">
          <h3 className="font-semibold text-gray-900">Önizleme Sonucu</h3>
          <p className="mt-1 text-xs text-gray-500">
            Miktarlar optimizasyonla hesaplanır; isterseniz bir sonraki adımda düzenleyebilirsiniz.
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Enerji</p>
              <p className="font-semibold text-gray-900">
                {previewRation.totals.mePerDay.toFixed(1)} / {previewRation.requirements.meMcal.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Protein</p>
              <p className="font-semibold text-gray-900">
                {previewRation.totals.cpGrams.toFixed(0)} / {previewRation.requirements.cpGrams.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">DMI</p>
              <p className="font-semibold text-gray-900">
                {previewRation.totals.dmiKg.toFixed(1)} / {previewRation.requirements.dmiKg.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Maliyet</p>
              <p className="font-semibold text-gray-900">{previewRation.cost.dailyFeedCostTL.toFixed(0)} ₺/gün</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {infeasibleDetails && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">{infeasibleDetails.message}</p>
              {infeasibleDetails.deficits && (
                <p className="text-sm opacity-90 mt-1">
                  Eksik: Enerji {infeasibleDetails.deficits.meMcal.toFixed(1)} Mcal/gün • Protein{' '}
                  {infeasibleDetails.deficits.cpGrams.toFixed(0)} g/gün
                </p>
              )}
            </div>
          </div>

          {infeasibleDetails.notes && infeasibleDetails.notes.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Notlar</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {infeasibleDetails.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed infeasibility diagnostics panel */}
          {infeasibilityDiagnostics.length > 0 && (
            <div className="mt-4">
              <InfeasibilityPanel diagnostics={infeasibilityDiagnostics} />
            </div>
          )}

          <div className="text-sm">
            <p className="font-medium">Ne yapabilirsin?</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {infeasibleDetails.suggestions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>

            {infeasibleDetails.recommendedFeedIds && infeasibleDetails.recommendedFeedIds.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="font-medium">Önerilen yemler (tek tıkla ekle)</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      addFeeds(infeasibleDetails.recommendedFeedIds || [])
                      navigate('/rasyon/wizard/feeds')
                    }}
                  >
                    Hepsini ekle ve düzenle
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {infeasibleDetails.recommendedFeedIds.map((id) => {
                    const f = allFeeds.find((x) => x.id === id)
                    if (!f) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
                        onClick={() => addFeeds([id])}
                        title="Seçili yemlere ekle"
                      >
                        + {f.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button type="button" className="mt-3 btn-secondary" onClick={() => navigate('/rasyon/wizard/feeds')}>
              Yem setini düzenle
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button className="btn-secondary" type="button" onClick={() => navigate('/rasyon/wizard/feeds')}>
          Geri
        </button>
        <button
          className="btn-primary inline-flex items-center justify-center gap-2"
          type="button"
          onClick={onCreate}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Hesaplanıyor...
            </>
          ) : (
            'Rasyon Hazırla'
          )}
        </button>
      </div>
    </div>
  )
}
