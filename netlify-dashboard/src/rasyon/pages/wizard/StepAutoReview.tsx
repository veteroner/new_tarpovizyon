import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { useRationStore } from '@/store/rationStore'
import { optimizeRation } from '@/engine/optimizerV2'
import { useUIStore } from '@/store/uiStore'
import { useFeedStore } from '@/store/feedStore'
import logger from '@/utils/logger'
import { trackEvent } from '@/utils/analytics'

export default function StepAutoReview() {
  const navigate = useNavigate()
  const showToast = useUIStore((s) => s.showToast)
  const draft = useRationWizardStore((s) => s.draft)
  const buildOptimizerPreferences = useRationWizardStore((s) => s.buildOptimizerPreferences)
  const addRation = useRationStore((s) => s.addRation)
  const feedOverrides = useFeedStore((s) => s.feedOverrides)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const allFeeds = useMemo(
    () => useFeedStore.getState().getAllFeeds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedOverrides, userFeeds]
  )

  const feedById = useMemo(() => new Map(allFeeds.map((f) => [f.id, f])), [allFeeds])

  const selectedFeedDetails = useMemo(() => {
    return draft.selectedFeeds
      .map((sf) => {
        const feed = feedById.get(sf.feedId)
        return feed ? { sf, feed } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [draft.selectedFeeds, feedById])

  const handleOptimize = async () => {
    try {
      const basePreferences = buildOptimizerPreferences()

      // Besi (beef) otomatik modunda "enterprise" beklentisine daha yakın davranış:
      // Solver'ın 2-3 yemle hedefleri tutturup durmasını engellemek için MIP çeşitlilik/rol kısıtları.
      const isBeef = draft.profile.purpose === 'beef'
      const preferences = {
        ...basePreferences,
        minActiveFeeds: basePreferences.minActiveFeeds ?? (isBeef ? 6 : undefined),
        minForageFeeds: basePreferences.minForageFeeds ?? (isBeef ? 2 : undefined),
        minConcentrateFeeds: basePreferences.minConcentrateFeeds ?? (isBeef ? 2 : undefined),
        minMineralFeeds: basePreferences.minMineralFeeds ?? (isBeef ? 1 : undefined),
      }

      const enabledIds = new Set(draft.selectedFeeds.filter((f) => f.enabled).map((f) => f.feedId))
      const enabledFeeds = allFeeds.filter((f) => enabledIds.has(f.id))

      const result = await optimizeRation(
        draft.profile,
        enabledFeeds,
        preferences
      )

      if ((result.status === 'success' || result.status === 'infeasible') && result.ration) {
        addRation(result.ration)
        const usedCount = result.ration.ingredients.length
        const selectedCount = enabledIds.size
        
        // Track wizard completion event
        trackEvent('wizard_complete', {
          animal_type: draft.profile.species,
          purpose: draft.profile.purpose,
          feed_count: usedCount,
          cost_per_day: result.ration.cost.dailyFeedCostTL,
          solver: result.ration.solver,
        })
        
        showToast({
          type: result.status === 'success' ? 'success' : 'warning',
          message:
            result.status === 'success'
              ? `Rasyon oluşturuldu! (${usedCount}/${selectedCount} yem kullanıldı)`
              : `${result.message || 'Kısıtlar tam sağlanamadı'} (rasyon yine de oluşturuldu)`,
        })
        navigate(`/rasyon/ration/${result.ration.id}`)
      } else {
        showToast({
          type: 'error',
          message: result.message || 'Rasyon hesaplanamadı. Lütfen yem seçimini gözden geçirin.'
        })
      }
    } catch (error) {
      logger.error('Optimization error:', error)
      showToast({
        type: 'error',
        message: 'Bir hata oluştu. Lütfen tekrar deneyin.'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Rasyon Özeti</h2>
        <p className="text-sm text-gray-600">
          Seçtiğiniz yemleri kontrol edin ve otomatik hesaplamayı başlatın.
        </p>
      </div>

      {/* Seçili Yemler */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Seçili Yemler</h3>
        <div className="space-y-2">
          {selectedFeedDetails.map(({ sf, feed }) => (
            <div key={feed.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{feed.name}</div>
                <div className="text-xs text-gray-500">
                  {feed.category === 'forage' && 'Kaba Yem'}
                  {feed.category === 'concentrate' && 'Konsantre'}
                  {feed.category === 'mineral' && 'Mineral'}
                  {' • '}
                  KM {feed.dmPercent}% • HP {feed.cpPercent}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-primary-600">
                  {(sf.priceOverrideTLPerKg ?? feed.priceTLPerKg ?? 0).toFixed(2)} ₺/kg
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bilgilendirme */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Sparkles className="shrink-0 text-blue-600 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Otomatik Hesaplama</h4>
            <p className="text-sm text-blue-800">
              Program, seçtiğiniz yemlerden en ekonomik ve dengeli rasyonu otomatik olarak hesaplayacak.
              Bazı yemler optimizasyonda 0 çıkabilir; bir yemi zorunlu kılmak için önceki adımda “Min kg/gün” girin.
              Girdiğiniz hayvan profili ({draft.profile.breed}, {draft.profile.weightKg}kg
              {draft.profile.milkYieldKgPerDay && `, ${draft.profile.milkYieldKgPerDay}kg/gün süt`}
              {draft.profile.targetAdgKgPerDay && `, ${draft.profile.targetAdgKgPerDay}kg/gün büyüme`}) kullanılacaktır.
            </p>
          </div>
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/rasyon/wizard/auto-feeds')}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Geri
        </button>

        <button
          type="button"
          onClick={handleOptimize}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Sparkles size={18} />
          Rasyonu Hesapla
        </button>
      </div>
    </div>
  )
}
