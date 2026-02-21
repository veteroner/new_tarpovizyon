import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search, Trash2, Package } from 'lucide-react'

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

function parseLocaleNumber(raw: string): number | undefined {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (normalized === '') return undefined
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

export default function StepFeeds() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | FeedCategory>('all')
  const [showNewFeed, setShowNewFeed] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newFeed, setNewFeed] = useState({
    name: '',
    category: 'concentrate' as FeedCategory,
    dmPercent: 88,
    meMcalPerKg: 2.9,
    cpPercent: 16,
    ndfPercent: 25,
    caPercent: 0.3,
    pPercent: 0.25,
    priceTLPerKg: 10,

    starchPercent: undefined as number | undefined,
    sugarPercent: undefined as number | undefined,
    fatPercent: undefined as number | undefined,
    mgPercent: undefined as number | undefined,
    naPercent: undefined as number | undefined,
    kPercent: undefined as number | undefined,
    sPercent: undefined as number | undefined,
    clPercent: undefined as number | undefined,
  })
  const [newFeedError, setNewFeedError] = useState<string | null>(null)

  const selectedFeeds = useRationWizardStore((s) => s.draft.selectedFeeds)
  const toggleFeed = useRationWizardStore((s) => s.toggleFeed)
  const setFeed = useRationWizardStore((s) => s.setFeed)
  const clearFeeds = useRationWizardStore((s) => s.clearFeeds)

  const addUserFeed = useFeedStore((s) => s.addUserFeed)
  const feedOverrides = useFeedStore((s) => s.feedOverrides)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const allFeeds = useMemo(
    () => useFeedStore.getState().getAllFeeds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedOverrides, userFeeds]
  )
  const inventory = useInventoryStore((s) => s.inventory)

  const selectedIds = useMemo(
    () => new Set(selectedFeeds.map((f) => f.feedId)),
    [selectedFeeds]
  )

  const filteredFeeds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allFeeds.filter((feed) => {
      const matchesSearch = q.length === 0 || feed.name.toLowerCase().includes(q)
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

  const canContinue = selectedFeeds.length > 0

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Eldeki Yemler</h2>
        <p className="text-sm text-gray-600">
          Sadece elindeki yemlerden rasyon oluşturulacak. ({selectedFeeds.length} seçili)
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Yeni Yem Ekle</h3>
            <p className="text-xs text-gray-500">Kütüphanede yoksa kendin ekleyebilirsin (cihazında saklanır).</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setShowNewFeed((v) => !v)}>
            {showNewFeed ? 'Kapat' : 'Aç'}
          </button>
        </div>

        {showNewFeed && (
          <div className="space-y-3">
            {newFeedError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{newFeedError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Yem adı</label>
                <input
                  className="input-field mt-1"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Örn: Arpa kırması"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Kategori</label>
                <select
                  className="input-field mt-1"
                  value={newFeed.category}
                  onChange={(e) => setNewFeed((s) => ({ ...s, category: e.target.value as FeedCategory }))}
                >
                  <option value="forage">Kaba Yem</option>
                  <option value="concentrate">Konsantre</option>
                  <option value="mineral">Mineral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="KM %" value={newFeed.dmPercent} step={1} onChange={(v) => setNewFeed((s) => ({ ...s, dmPercent: v }))} />
              <Field label="ME (Mcal/kg)" value={newFeed.meMcalPerKg} step={0.05} onChange={(v) => setNewFeed((s) => ({ ...s, meMcalPerKg: v }))} />
              <Field label="HP %" value={newFeed.cpPercent} step={0.5} onChange={(v) => setNewFeed((s) => ({ ...s, cpPercent: v }))} />
              <Field label="NDF %" value={newFeed.ndfPercent} step={0.5} onChange={(v) => setNewFeed((s) => ({ ...s, ndfPercent: v }))} />
              <Field label="Ca %" value={newFeed.caPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, caPercent: v }))} />
              <Field label="P %" value={newFeed.pPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, pPercent: v }))} />
              <Field label="Fiyat ₺/kg" value={newFeed.priceTLPerKg} step={0.1} onChange={(v) => setNewFeed((s) => ({ ...s, priceTLPerKg: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Gelişmiş alanlar: nişasta/şeker/yağ ve makro mineraller (opsiyonel)
              </p>
              <button type="button" className="btn-secondary" onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? 'Gizle' : 'Göster'}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FieldOptional label="Nişasta %" value={newFeed.starchPercent} step={0.5} onChange={(v) => setNewFeed((s) => ({ ...s, starchPercent: v }))} />
                <FieldOptional label="Şeker %" value={newFeed.sugarPercent} step={0.5} onChange={(v) => setNewFeed((s) => ({ ...s, sugarPercent: v }))} />
                <FieldOptional label="Yağ %" value={newFeed.fatPercent} step={0.1} onChange={(v) => setNewFeed((s) => ({ ...s, fatPercent: v }))} />
                <FieldOptional label="Mg %" value={newFeed.mgPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, mgPercent: v }))} />
                <FieldOptional label="Na %" value={newFeed.naPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, naPercent: v }))} />
                <FieldOptional label="K %" value={newFeed.kPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, kPercent: v }))} />
                <FieldOptional label="S %" value={newFeed.sPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, sPercent: v }))} />
                <FieldOptional label="Cl %" value={newFeed.clPercent} step={0.01} onChange={(v) => setNewFeed((s) => ({ ...s, clPercent: v }))} />
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setNewFeedError(null)
                  if (!newFeed.name.trim()) {
                    setNewFeedError('Yem adı zorunlu')
                    return
                  }

                  const starch = newFeed.starchPercent
                  const sugar = newFeed.sugarPercent
                  const fat = newFeed.fatPercent
                  const sum = (starch ?? 0) + (sugar ?? 0) + (fat ?? 0)
                  if ((starch != null || sugar != null || fat != null) && sum > 100) {
                    setNewFeedError('Nişasta + Şeker + Yağ toplamı %100\'ü geçemez')
                    return
                  }

                  const created = addUserFeed({
                    name: newFeed.name,
                    category: newFeed.category,
                    dmPercent: newFeed.dmPercent,
                    meMcalPerKg: newFeed.meMcalPerKg,
                    cpPercent: newFeed.cpPercent,
                    ndfPercent: newFeed.ndfPercent,
                    caPercent: newFeed.caPercent,
                    pPercent: newFeed.pPercent,
                    priceTLPerKg: newFeed.priceTLPerKg,

                    starchPercent: newFeed.starchPercent,
                    sugarPercent: newFeed.sugarPercent,
                    fatPercent: newFeed.fatPercent,
                    mgPercent: newFeed.mgPercent,
                    naPercent: newFeed.naPercent,
                    kPercent: newFeed.kPercent,
                    sPercent: newFeed.sPercent,
                    clPercent: newFeed.clPercent,

                    description: 'Kullanıcı tarafından eklenen yem (değerler kullanıcı girişi).',
                  })
                  toggleFeed(created.id)
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setNewFeed((s) => ({ ...s, name: '' }))
                }}
              >
                Ekle ve seç
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Yem ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={16} />
            Kategori
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as 'all' | FeedCategory)}
            className="input-field"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Toplam: {filteredFeeds.length} yem</p>
          <button
            type="button"
            onClick={clearFeeds}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Trash2 className="w-4 h-4" />
            Seçimleri temizle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {filteredFeeds.map((feed) => (
            <FeedPickCard
              key={feed.id}
              feed={feed}
              selected={selectedIds.has(feed.id)}
              onToggle={() => toggleFeed(feed.id)}
            />
          ))}
        </div>

        <div className="card h-fit">
          <h3 className="font-semibold text-gray-900">Seçili Yemler</h3>
          <p className="mt-1 text-xs text-gray-500">
            Miktarlar optimizasyonla bulunur. İstersen günlük maksimum kullanım ve fiyat (₺/kg) girebilirsin.
          </p>

          {selectedFeedDetails.length === 0 ? (
            <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Henüz yem seçmedin.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedFeedDetails.map(({ sf, feed }) => (
                <div key={feed.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{feed.name}</p>
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
                      <p className="text-xs text-gray-500">
                        {feed.category === 'forage'
                          ? '🌾 Kaba Yem'
                          : feed.category === 'concentrate'
                            ? '🌽 Konsantre'
                            : '💊 Mineral'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                      onClick={() => toggleFeed(feed.id)}
                    >
                      Kaldır
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Max (kg/gün)</label>
                      <input
                        className="input-field mt-1"
                        type="number"
                        min={0}
                        step={0.1}
                        value={sf.maxAsFedKgPerDay ?? ''}
                        onChange={(e) =>
                          setFeed(feed.id, {
                            maxAsFedKgPerDay: (() => {
                              const n = parseLocaleNumber(e.target.value)
                              if (n == null) return undefined
                              return Math.max(0, n)
                            })(),
                          })
                        }
                        placeholder="örn: 12"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Fiyat (₺/kg)</label>
                      <input
                        className="input-field mt-1"
                        type="number"
                        min={0}
                        step={0.01}
                        value={sf.priceOverrideTLPerKg ?? ''}
                        onChange={(e) =>
                          setFeed(feed.id, {
                            priceOverrideTLPerKg:
                              (() => {
                                const n = parseLocaleNumber(e.target.value)
                                if (n == null) return undefined
                                return n > 0 ? n : undefined
                              })(),
                          })
                        }
                        placeholder={feed.priceTLPerKg.toFixed(2)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="btn-secondary" type="button" onClick={() => navigate('/rasyon/wizard/goal')}>
          Geri
        </button>
        <button
          className="btn-primary"
          type="button"
          onClick={() => navigate('/rasyon/wizard/review')}
          disabled={!canContinue}
          title={!canContinue ? 'Devam etmek için en az 1 yem seçin' : undefined}
        >
          Devam
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input
        className="input-field mt-1"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = parseLocaleNumber(e.target.value)
          if (n == null) return
          onChange(n)
        }}
      />
    </div>
  )
}

function FieldOptional({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number | undefined
  step: number
  onChange: (value: number | undefined) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input
        className="input-field mt-1"
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(parseLocaleNumber(e.target.value))}
        placeholder="(opsiyonel)"
      />
    </div>
  )
}

function FeedPickCard({
  feed,
  selected,
  onToggle,
}: {
  feed: Feed
  selected: boolean
  onToggle: () => void
}) {
  const inventory = useInventoryStore((s) => s.inventory)
  const invItem = inventory.find(item => item.feedId === feed.id)
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        selected
          ? 'w-full rounded-xl border-2 border-primary-500 bg-primary-50 p-4 text-left'
          : 'w-full rounded-xl border-2 border-gray-200 bg-white p-4 text-left hover:bg-gray-50'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{feed.name}</p>
            {invItem && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                invItem.status === 'available' ? 'bg-green-100 text-green-800' :
                invItem.status === 'low-stock' ? 'bg-yellow-100 text-yellow-800' :
                invItem.status === 'out-of-stock' ? 'bg-red-100 text-red-800' :
                invItem.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                <Package size={10} />
                {invItem.currentStockKg.toFixed(0)} kg
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {feed.category === 'forage'
              ? '🌾 Kaba Yem'
              : feed.category === 'concentrate'
                ? '🌽 Konsantre'
                : '💊 Mineral'}
            {' • '}
            {feed.priceTLPerKg.toFixed(2)} ₺/kg
          </p>
        </div>
        <div
          className={
            selected
              ? 'rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white'
              : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700'
          }
        >
          {selected ? 'Seçili' : 'Seç'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div>KM: {feed.dmPercent}%</div>
        <div>ME: {feed.meMcalPerKg.toFixed(1)}</div>
        <div>HP: {feed.cpPercent.toFixed(1)}%</div>
      </div>
    </button>
  )
}
