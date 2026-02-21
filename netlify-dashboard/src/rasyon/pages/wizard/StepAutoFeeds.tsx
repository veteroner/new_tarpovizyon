import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, Check, Package } from 'lucide-react'

import type { Feed, FeedCategory } from '@/types'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { useFeedStore } from '@/store/feedStore'
import { useInventoryStore } from '@/store/inventoryStore'

const categories: Array<{ value: 'all' | FeedCategory; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'forage', label: 'Kaba Yem' },
  { value: 'concentrate', label: 'Konsantre' },
  { value: 'mineral', label: 'Mineral' },
]

function parsePrice(raw: string): number | undefined {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (normalized === '') return undefined
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function parseNonNegative(raw: string): number | undefined {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (normalized === '') return undefined
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export default function StepAutoFeeds() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | FeedCategory>('all')

  const selectedFeeds = useRationWizardStore((s) => s.draft.selectedFeeds)
  const toggleFeed = useRationWizardStore((s) => s.toggleFeed)
  const setFeed = useRationWizardStore((s) => s.setFeed)

  const inventory = useInventoryStore((s) => s.inventory)
  const feedOverrides = useFeedStore((s) => s.feedOverrides)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const allFeeds = useMemo(
    () => useFeedStore.getState().getAllFeeds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedOverrides, userFeeds]
  )

  const selectedIds = useMemo(
    () => new Set(selectedFeeds.map((f) => f.feedId)),
    [selectedFeeds]
  )

  const filteredFeeds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q && selectedCategory === 'all') return allFeeds
    
    return allFeeds.filter((feed) => {
      const matchesSearch = !q || feed.name.toLowerCase().includes(q)
      const matchesCategory = selectedCategory === 'all' || feed.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [allFeeds, searchQuery, selectedCategory])

  const selectedFeedDetails = useMemo(() => {
    const byId = new Map<string, Feed>(allFeeds.map((f) => [f.id, f]))
    return selectedFeeds
      .map((sf) => ({
        sf,
        feed: byId.get(sf.feedId),
      }))
      .filter((x): x is { sf: typeof selectedFeeds[number]; feed: Feed } => Boolean(x.feed))
  }, [allFeeds, selectedFeeds])

  const canContinue = selectedFeeds.length > 0 && selectedFeedDetails.every(
    (item) => item.sf.priceOverrideTLPerKg !== undefined && item.sf.priceOverrideTLPerKg > 0
  )

  const handleContinue = () => {
    if (!canContinue) return
    navigate('/rasyon/wizard/auto-review')
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Otomatik Rasyon Hesaplama</h2>
        <p className="text-sm text-gray-600">
          Elinizdeki yemleri seçin ve fiyatlarını girin. Program en ekonomik ve dengeli rasyonu otomatik hesaplayacak.
        </p>
      </div>

      {/* Seçili Yemler ve Fiyatlar */}
      {selectedFeedDetails.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Seçili Yemler ({selectedFeedDetails.length})</h3>
          <div className="space-y-2">
            {selectedFeedDetails.map(({ sf, feed }) => {
              const hasPrice = sf.priceOverrideTLPerKg !== undefined && sf.priceOverrideTLPerKg > 0
              return (
                <div key={feed.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleFeed(feed.id)}
                    className="shrink-0 w-5 h-5 rounded border-2 border-primary-500 bg-primary-500 text-white flex items-center justify-center"
                  >
                    <Check size={14} />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{feed.name}</div>
                      {(() => {
                        const invItem = inventory.find(item => item.feedId === feed.id)
                        if (invItem) {
                          const statusColors = {
                            available: 'bg-green-100 text-green-800',
                            'low-stock': 'bg-yellow-100 text-yellow-800',
                            'out-of-stock': 'bg-red-100 text-red-800',
                            expired: 'bg-gray-100 text-gray-800',
                            'on-order': 'bg-blue-100 text-blue-800',
                          }
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[invItem.status]}`}>
                              <Package size={10} />
                              {invItem.currentStockKg.toFixed(0)} kg
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {feed.category === 'forage' && 'Kaba Yem'}
                      {feed.category === 'concentrate' && 'Konsantre'}
                      {feed.category === 'mineral' && 'Mineral'}
                    </div>
                  </div>

                  <div className="shrink-0 w-32">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="₺/kg"
                      value={sf.priceOverrideTLPerKg ?? ''}
                      onChange={(e) => {
                        const price = parsePrice(e.target.value)
                        setFeed(feed.id, { priceOverrideTLPerKg: price })
                      }}
                      className={`input-field text-sm ${!hasPrice ? 'border-red-300 bg-red-50' : ''}`}
                    />
                  </div>

                  <div className="shrink-0 w-28">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Min kg/gün"
                      value={sf.minAsFedKgPerDay ?? ''}
                      onChange={(e) => {
                        const minAsFedKgPerDay = parseNonNegative(e.target.value)
                        setFeed(feed.id, { minAsFedKgPerDay })
                      }}
                      className="input-field text-sm"
                      title="Seçili yemin rasyonda mutlaka yer alması için minimum kullanım (kg/gün, yaş ağırlık). Boş bırakılırsa optimizer 0 seçebilir."
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Not: Otomatik optimizasyon seçtiğiniz yemlerden en uygun kombinasyonu kurar; bazı yemleri 0 seçebilir.
            Bir yemin mutlaka rasyonda yer almasını istiyorsanız “Min kg/gün” girin.
          </p>
        </div>
      )}

      {/* Yem Kütüphanesi */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Yem Kütüphanesi</h3>
          <div className="text-sm text-gray-500">{filteredFeeds.length} yem</div>
        </div>

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Yem ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Yem Listesi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
          {filteredFeeds.map((feed) => {
            const isSelected = selectedIds.has(feed.id)
            return (
              <button
                key={feed.id}
                type="button"
                onClick={() => toggleFeed(feed.id)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-primary-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 text-sm">{feed.name}</div>
                      {(() => {
                        const invItem = inventory.find(item => item.feedId === feed.id)
                        if (invItem) {
                          const statusColors = {
                            available: 'bg-green-100 text-green-700',
                            'low-stock': 'bg-yellow-100 text-yellow-700',
                            'out-of-stock': 'bg-red-100 text-red-700',
                            expired: 'bg-gray-100 text-gray-700',
                            'on-order': 'bg-blue-100 text-blue-700',
                          }
                          return (
                            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${statusColors[invItem.status]}`}>
                              <Package size={10} />
                              {invItem.currentStockKg.toFixed(0)}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {feed.category === 'forage' && 'Kaba Yem'}
                      {feed.category === 'concentrate' && 'Konsantre'}
                      {feed.category === 'mineral' && 'Mineral'}
                      {' • '}
                      KM {feed.dmPercent}% • HP {feed.cpPercent}%
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {filteredFeeds.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Yem bulunamadı</p>
          </div>
        )}
      </div>

      {/* Devam Et Butonu */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/rasyon/wizard/mode')}
          className="btn-secondary"
        >
          Geri
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="btn-primary inline-flex items-center gap-2"
        >
          Rasyonu Hesapla
          <ArrowRight size={18} />
        </button>
      </div>

      {selectedFeeds.length > 0 && !canContinue && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            ⚠️ Lütfen seçtiğiniz tüm yemlerin fiyatlarını girin.
          </p>
        </div>
      )}
    </div>
  )
}
