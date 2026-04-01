import { useMemo, useRef, useState } from 'react'
import { Search, Filter, Trash2, Edit3, Save, X, Upload, Download, ClipboardPaste, BarChart3, Package } from 'lucide-react'
import type { Feed } from '@/types'
import { useFeedStore } from '@/store/feedStore'
import { useInventoryStore } from '@/store/inventoryStore'
import type { NewFeedInput } from '@/store/feedStore'
import { feeds as builtInFeeds } from '@/data/feedsV2'
import { mapRowToNewFeedInput, parseCsvFeeds, parseJsonFeedInputs, parseLabelText } from '@/utils/feedImport'
import FeedComparisonModal from '@/components/FeedComparisonModal'
import FeedImportModal from '@/components/FeedImportModal'

function isUserFeedCategory(value: string): value is 'forage' | 'concentrate' | 'mineral' {
  return value === 'forage' || value === 'concentrate' || value === 'mineral'
}

export default function FeedLibrary() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [importTab, setImportTab] = useState<'csv' | 'label'>('csv')
  const [csvText, setCsvText] = useState('')
  const [csvDefaultCategory, setCsvDefaultCategory] = useState<'forage' | 'concentrate' | 'mineral'>('concentrate')
  const [csvDefaultPrice, setCsvDefaultPrice] = useState(10)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const [labelName, setLabelName] = useState('')
  const [labelCategory, setLabelCategory] = useState<'forage' | 'concentrate' | 'mineral'>('concentrate')
  const [labelPrice, setLabelPrice] = useState(10)
  const [labelText, setLabelText] = useState('')
  const [labelStatus, setLabelStatus] = useState<string | null>(null)

  const userFeeds = useFeedStore((s) => s.userFeeds)
  const addUserFeeds = useFeedStore((s) => s.addUserFeeds)
  const addUserFeed = useFeedStore((s) => s.addUserFeed)
  const exportUserFeedsCsv = useFeedStore((s) => s.exportUserFeedsCsv)
  
  const allFeeds = useMemo(() => [...builtInFeeds, ...userFeeds], [userFeeds])
  const builtInCount = builtInFeeds.length

  const filteredFeeds = allFeeds.filter((feed) => {
    const matchesSearch = feed.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || feed.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { value: 'all', label: 'Tümü' },
    { value: 'forage', label: 'Kaba Yem' },
    { value: 'concentrate', label: 'Konsantre' },
    { value: 'mineral', label: 'Mineral' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Yem Kütüphanesi</h1>
        <p className="text-gray-600">
          Sistemdeki tüm yemler ve besin değerleri ({allFeeds.length} yem; fabrika: {builtInCount}, senin: {userFeeds.length})
        </p>
      </div>

      <div className="card mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fabrika Yemi Ekle</h2>
            <p className="text-xs text-gray-500">
              Piyasadaki yemler çok fazla ve sık güncelleniyor; en doğru yöntem etiket/garanti analiziyle eklemek.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => setShowComparisonModal(true)}
              title="Yemleri karşılaştır"
            >
              <BarChart3 size={16} />
              Karşılaştır
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => setShowImportModal(true)}
              title="CSV/JSON'i modal ile içe aktar"
            >
              <Upload size={16} />
              Gelişmiş İçe Aktar
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => {
                const csv = exportUserFeedsCsv()
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'tarpol-user-feeds.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              title="Kullanıcı yemlerini CSV indir"
            >
              <Download size={16} />
              CSV İndir
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={
              importTab === 'csv'
                ? 'rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
            onClick={() => {
              setImportStatus(null)
              setLabelStatus(null)
              setImportTab('csv')
            }}
          >
            <Upload size={16} className="inline mr-2" />
            CSV İçe Aktar
          </button>
          <button
            type="button"
            className={
              importTab === 'label'
                ? 'rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white'
                : 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
            onClick={() => {
              setImportStatus(null)
              setLabelStatus(null)
              setImportTab('label')
            }}
          >
            <ClipboardPaste size={16} className="inline mr-2" />
            Etiket Yapıştır
          </button>
        </div>

        {importTab === 'csv' && (
          <div className="space-y-3">
            {importStatus && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                {importStatus}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.json,application/json,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return

                setImportStatus(null)
                try {
                  const text = await file.text()
                  setCsvText(text)
                  setImportStatus(`Dosya yüklendi: ${file.name} (${Math.round(file.size / 1024)} KB)`)
                } catch {
                  setImportStatus('Dosya okunamadı')
                } finally {
                  // allow re-selecting the same file
                  e.target.value = ''
                }
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Varsayılan kategori</label>
                <select
                  className="input-field mt-1"
                  value={csvDefaultCategory}
                  onChange={(e) => {
                    const v = e.target.value
                    if (isUserFeedCategory(v)) setCsvDefaultCategory(v)
                  }}
                >
                  <option value="forage">Kaba Yem</option>
                  <option value="concentrate">Konsantre</option>
                  <option value="mineral">Mineral</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Varsayılan fiyat (₺/kg)</label>
                <input
                  className="input-field mt-1"
                  type="number"
                  min={0}
                  step={0.1}
                  value={csvDefaultPrice}
                  onChange={(e) => setCsvDefaultPrice(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <div className="w-full flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    title="CSV/JSON dosyası seç"
                  >
                    <Upload size={16} />
                    Dosya Seç
                  </button>
                  <button
                    type="button"
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    onClick={() => {
                      setImportStatus(null)
                      const trimmed = csvText.trim()
                      if (!trimmed) {
                        setImportStatus('İçe aktarılacak veri yok')
                        return
                      }

                      // JSON bulk import
                      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                        const parsed = parseJsonFeedInputs(trimmed, {
                          category: csvDefaultCategory,
                          priceTLPerKg: csvDefaultPrice,
                        })

                        if (parsed.inputs.length === 0) {
                          setImportStatus(parsed.errors.length ? parsed.errors.slice(0, 5).join(' • ') : 'JSON içeriği geçersiz')
                          return
                        }

                        const res = addUserFeeds(parsed.inputs)
                        const errPreview = parsed.errors.length > 0 ? ` • Hatalı kayıtlar: ${parsed.errors.length}` : ''
                        setImportStatus(`İçe aktarıldı: ${res.added} • Atlandı (aynı isim/kategori): ${res.skipped}` + errPreview)
                        return
                      }

                      // CSV import
                      const parsed = parseCsvFeeds(csvText)
                      if (parsed.errors.length > 0) {
                        setImportStatus(parsed.errors.join(' • '))
                        return
                      }

                      const inputs: NewFeedInput[] = []
                      const rowErrors: string[] = []
                      parsed.rows.forEach((row, idx) => {
                        const mapped = mapRowToNewFeedInput(row, {
                          category: csvDefaultCategory,
                          priceTLPerKg: csvDefaultPrice,
                        })
                        if (mapped.value) inputs.push(mapped.value)
                        else rowErrors.push(`Satır ${idx + 2}: ${mapped.error ?? 'Geçersiz'}`)
                      })

                      if (inputs.length === 0) {
                        setImportStatus(rowErrors.length ? rowErrors.slice(0, 5).join(' • ') : 'İçe aktarılacak satır bulunamadı')
                        return
                      }

                      const res = addUserFeeds(inputs)
                      const summary = `İçe aktarıldı: ${res.added} • Atlandı (aynı isim/kategori): ${res.skipped}`
                      const errPreview = rowErrors.length > 0 ? ` • Hatalı satırlar: ${rowErrors.length}` : ''
                      setImportStatus(summary + errPreview)
                    }}
                  >
                    <Upload size={16} />
                    İçe Aktar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">CSV yapıştır (ayraç: ; önerilir)</label>
              <textarea
                className="input-field mt-1"
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={
                  'name;category;dmPercent;meMcalPerKg;cpPercent;ndfPercent;caPercent;pPercent;priceTLPerKg\n' +
                  '"Süt yemi 18";concentrate;88;2.9;18;22;0.8;0.5;12\n'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                CSV veya JSON yapıştırabilirsin. Zorunlu alanlar: name + (ME, HP/CP, NDF, Ca, P). ME için `meMcalPerKg` veya `meKcalPerKg`.
              </p>
            </div>
          </div>
        )}

        {importTab === 'label' && (
          <div className="space-y-3">
            {labelStatus && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                {labelStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Yem adı</label>
                <input
                  className="input-field mt-1"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="Örn: X Marka Süt Yemi 18"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Kategori</label>
                <select
                  className="input-field mt-1"
                  value={labelCategory}
                  onChange={(e) => {
                    const v = e.target.value
                    if (isUserFeedCategory(v)) setLabelCategory(v)
                  }}
                >
                  <option value="forage">Kaba Yem</option>
                  <option value="concentrate">Konsantre</option>
                  <option value="mineral">Mineral</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fiyat (₺/kg)</label>
                <input
                  className="input-field mt-1"
                  type="number"
                  min={0}
                  step={0.1}
                  value={labelPrice}
                  onChange={(e) => setLabelPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Etiket / garanti analizi metni</label>
              <textarea
                className="input-field mt-1"
                rows={6}
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                placeholder={
                  'Örn: Ham Protein %18, Metabolik Enerji 2600 kcal/kg, NDF %22, Ca %0.8, P %0.5, Ham Yağ %3\n' +
                  'Not: NDF yoksa eklemeyi unutma (rasyon hesabında önemli).'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Metin içinden HP/Protein, ME, NDF, Ca, P vb. yakalanır. Eksik kalan değerleri manuel tamamlayabilirsin.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => {
                setLabelStatus(null)
                if (!labelName.trim()) {
                  setLabelStatus('Yem adı zorunlu')
                  return
                }

                const parsed = parseLabelText(labelText)
                if (parsed.meMcalPerKg == null) {
                  setLabelStatus('ME bulunamadı. Metinde "ME 2600 kcal/kg" veya "ME 2.6 Mcal/kg" gibi yazmalı.')
                  return
                }
                if (parsed.cpPercent == null) {
                  setLabelStatus('HP/Protein bulunamadı. Metinde "Ham Protein %18" gibi yazmalı.')
                  return
                }
                if (parsed.ndfPercent == null) {
                  setLabelStatus('NDF bulunamadı. Rasyon için gerekli; etiketinde yoksa yaklaşık değer girmen gerekir.')
                  return
                }
                if (parsed.caPercent == null || parsed.pPercent == null) {
                  setLabelStatus('Ca ve P bulunamadı. Mineral dengesi için gerekli; etiketinde yoksa değer girmen gerekir.')
                  return
                }

                const sum = (parsed.starchPercent ?? 0) + (parsed.sugarPercent ?? 0) + (parsed.fatPercent ?? 0)
                if ((parsed.starchPercent != null || parsed.sugarPercent != null || parsed.fatPercent != null) && sum > 100) {
                  setLabelStatus('Nişasta + Şeker + Yağ toplamı %100\'ü geçiyor (etiket parse hatası olabilir).')
                  return
                }

                addUserFeed({
                  name: labelName,
                  category: labelCategory,
                  dmPercent: parsed.dmPercent ?? 88,
                  meMcalPerKg: parsed.meMcalPerKg,
                  cpPercent: parsed.cpPercent,
                  ndfPercent: parsed.ndfPercent,
                  caPercent: parsed.caPercent,
                  pPercent: parsed.pPercent,
                  priceTLPerKg: labelPrice,

                  starchPercent: parsed.starchPercent,
                  sugarPercent: parsed.sugarPercent,
                  fatPercent: parsed.fatPercent,
                  mgPercent: parsed.mgPercent,
                  naPercent: parsed.naPercent,
                  kPercent: parsed.kPercent,
                  sPercent: parsed.sPercent,
                  clPercent: parsed.clPercent,
                  description: 'Etiket/garanti analizi metninden eklenmiştir.',
                })

                setLabelStatus('Eklendi. Düzenlemek için aşağıdan açıp “Düzenle” kullanabilirsin.')
                setLabelText('')
              }}
            >
              <ClipboardPaste size={16} />
              Parse Et ve Ekle
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="card mb-6 space-y-4">
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
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredFeeds.map((feed) => (
          <FeedCard key={feed.id} feed={feed} />
        ))}
      </div>

      {filteredFeeds.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p>Aradığınız kriterlerde yem bulunamadı</p>
        </div>
      )}

      {showComparisonModal && (
        <FeedComparisonModal feeds={allFeeds} onClose={() => setShowComparisonModal(false)} />
      )}

      {showImportModal && <FeedImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  )
}

function FeedCard({ feed }: { feed: Feed }) {
  const [expanded, setExpanded] = useState(false)
  const updateUserFeed = useFeedStore((s) => s.updateUserFeed)
  const removeUserFeed = useFeedStore((s) => s.removeUserFeed)
  
  const inventory = useInventoryStore((s) => s.inventory)
  const addInventoryItem = useInventoryStore((s) => s.addInventoryItem)

  const isUserFeed = feed.source === 'user'
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => ({
    name: feed.name,
    category: feed.category,
    dmPercent: feed.dmPercent,
    meMcalPerKg: feed.meMcalPerKg,
    cpPercent: feed.cpPercent,
    ndfPercent: feed.ndfPercent,
    starchPercent: feed.starchPercent,
    sugarPercent: feed.sugarPercent,
    fatPercent: feed.fatPercent,
    caPercent: feed.caPercent,
    pPercent: feed.pPercent,
    mgPercent: feed.mgPercent,
    naPercent: feed.naPercent,
    kPercent: feed.kPercent,
    sPercent: feed.sPercent,
    clPercent: feed.clPercent,
    priceTLPerKg: feed.priceTLPerKg,
    description: feed.description,
  }))

  return (
    <div className="card">
      <div className="flex w-full items-start justify-between gap-3 text-left">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{feed.name}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {feed.priceTLPerKg.toFixed(2)} ₺/kg • KM: {feed.dmPercent}% • {feed.cpPercent.toFixed(1)}% HP
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isUserFeed && (
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Kullanıcı
                  </span>
                )}
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
                    const statusLabels = {
                      available: 'Stokta',
                      'low-stock': 'Azaldı',
                      'out-of-stock': 'Tükendi',
                      expired: 'Süresi Doldu',
                      'on-order': 'Siparişte',
                    }
                    return (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[invItem.status]}`}>
                        📦 {statusLabels[invItem.status]} ({invItem.currentStockKg.toFixed(0)} kg)
                      </span>
                    )
                  }
                  return null
                })()}
                {feed.quality && (
                  <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {feed.quality === 'high'
                      ? 'Yüksek Kalite'
                      : feed.quality === 'medium'
                        ? 'Orta Kalite'
                        : 'Düşük Kalite'}
                  </span>
                )}
              </div>
            </div>
            <span className="text-gray-400">{expanded ? '−' : '+'}</span>
          </div>
        </button>

        {isUserFeed && (
          <div className="flex items-center gap-2 pt-1">
            {!editing ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    // Add to inventory with default values
                    const existingItem = inventory.find(item => item.feedId === feed.id)
                    if (existingItem) {
                      alert(`${feed.name} zaten envanterde mevcut!`)
                      return
                    }
                    
                    addInventoryItem({
                      feedId: feed.id,
                      feedName: feed.name,
                      category: feed.category,
                      currentStockKg: 1000, // Default 1 ton
                      minStockKg: 100,
                      maxStockKg: 5000,
                      lots: [],
                      status: 'available',
                      currentPriceTLPerKg: feed.priceTLPerKg,
                    })
                    alert(`${feed.name} envantere eklendi!`)
                  }}
                  title="Envantere Ekle"
                >
                  <Package size={16} />
                  Envantere Ekle
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setError(null)
                    setDraft({
                      name: feed.name,
                      category: feed.category,
                      dmPercent: feed.dmPercent,
                      meMcalPerKg: feed.meMcalPerKg,
                      cpPercent: feed.cpPercent,
                      ndfPercent: feed.ndfPercent,
                      starchPercent: feed.starchPercent,
                      sugarPercent: feed.sugarPercent,
                      fatPercent: feed.fatPercent,
                      caPercent: feed.caPercent,
                      pPercent: feed.pPercent,
                      mgPercent: feed.mgPercent,
                      naPercent: feed.naPercent,
                      kPercent: feed.kPercent,
                      sPercent: feed.sPercent,
                      clPercent: feed.clPercent,
                      priceTLPerKg: feed.priceTLPerKg,
                      description: feed.description,
                    })
                    setExpanded(true)
                    setEditing(true)
                  }}
                  title="Düzenle"
                >
                  <Edit3 size={16} />
                  Düzenle
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const ok = window.confirm(`"${feed.name}" yemi silinsin mi?`)
                    if (!ok) return
                    removeUserFeed(feed.id)
                  }}
                  title="Sil"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  onClick={() => {
                    setError(null)
                    if (!draft.name.trim()) {
                      setError('Yem adı zorunlu')
                      return
                    }
                    const sum = (draft.starchPercent ?? 0) + (draft.sugarPercent ?? 0) + (draft.fatPercent ?? 0)
                    if ((draft.starchPercent != null || draft.sugarPercent != null || draft.fatPercent != null) && sum > 100) {
                      setError('Nişasta + Şeker + Yağ toplamı %100\'ü geçemez')
                      return
                    }

                    updateUserFeed(feed.id, {
                      name: draft.name,
                      category: draft.category,
                      dmPercent: draft.dmPercent,
                      meMcalPerKg: draft.meMcalPerKg,
                      cpPercent: draft.cpPercent,
                      ndfPercent: draft.ndfPercent,
                      starchPercent: draft.starchPercent,
                      sugarPercent: draft.sugarPercent,
                      fatPercent: draft.fatPercent,
                      caPercent: draft.caPercent,
                      pPercent: draft.pPercent,
                      mgPercent: draft.mgPercent,
                      naPercent: draft.naPercent,
                      kPercent: draft.kPercent,
                      sPercent: draft.sPercent,
                      clPercent: draft.clPercent,
                      priceTLPerKg: draft.priceTLPerKg,
                      description: draft.description,
                    })
                    setEditing(false)
                  }}
                  title="Kaydet"
                >
                  <Save size={16} />
                  Kaydet
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setError(null)
                    setEditing(false)
                  }}
                  title="Vazgeç"
                >
                  <X size={16} />
                  Vazgeç
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {editing && isUserFeed && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Yem adı</label>
                  <input
                    className="input-field mt-1"
                    value={draft.name}
                    onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Kategori</label>
                  <select
                    className="input-field mt-1"
                    value={draft.category}
                    onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value as Feed['category'] }))}
                  >
                    <option value="forage">Kaba Yem</option>
                    <option value="concentrate">Konsantre</option>
                    <option value="mineral">Mineral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumField label="KM %" value={draft.dmPercent} step={1} onChange={(v) => setDraft((s) => ({ ...s, dmPercent: v }))} />
                <NumField label="ME (Mcal/kg)" value={draft.meMcalPerKg} step={0.05} onChange={(v) => setDraft((s) => ({ ...s, meMcalPerKg: v }))} />
                <NumField label="HP %" value={draft.cpPercent} step={0.5} onChange={(v) => setDraft((s) => ({ ...s, cpPercent: v }))} />
                <NumField label="NDF %" value={draft.ndfPercent} step={0.5} onChange={(v) => setDraft((s) => ({ ...s, ndfPercent: v }))} />
                <NumField label="Ca %" value={draft.caPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, caPercent: v }))} />
                <NumField label="P %" value={draft.pPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, pPercent: v }))} />
                <NumField label="Fiyat ₺/kg" value={draft.priceTLPerKg} step={0.1} onChange={(v) => setDraft((s) => ({ ...s, priceTLPerKg: v }))} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumFieldOptional label="Nişasta %" value={draft.starchPercent} step={0.5} onChange={(v) => setDraft((s) => ({ ...s, starchPercent: v }))} />
                <NumFieldOptional label="Şeker %" value={draft.sugarPercent} step={0.5} onChange={(v) => setDraft((s) => ({ ...s, sugarPercent: v }))} />
                <NumFieldOptional label="Yağ %" value={draft.fatPercent} step={0.1} onChange={(v) => setDraft((s) => ({ ...s, fatPercent: v }))} />
                <NumFieldOptional label="Mg %" value={draft.mgPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, mgPercent: v }))} />
                <NumFieldOptional label="Na %" value={draft.naPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, naPercent: v }))} />
                <NumFieldOptional label="K %" value={draft.kPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, kPercent: v }))} />
                <NumFieldOptional label="S %" value={draft.sPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, sPercent: v }))} />
                <NumFieldOptional label="Cl %" value={draft.clPercent} step={0.01} onChange={(v) => setDraft((s) => ({ ...s, clPercent: v }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Açıklama (opsiyonel)</label>
                <textarea
                  className="input-field mt-1"
                  rows={2}
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Örn: Analiz değerleri (laboratuvar)"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600">Enerji:</span>
              <span className="ml-2 font-medium">{feed.meMcalPerKg.toFixed(1)} Mcal/kg</span>
            </div>
            <div>
              <span className="text-gray-600">Protein:</span>
              <span className="ml-2 font-medium">{feed.cpPercent.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">NDF:</span>
              <span className="ml-2 font-medium">{feed.ndfPercent.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Nişasta:</span>
              <span className="ml-2 font-medium">{feed.starchPercent?.toFixed(1) || 0}%</span>
            </div>
            <div>
              <span className="text-gray-600">Yağ:</span>
              <span className="ml-2 font-medium">{feed.fatPercent?.toFixed(1) || 0}%</span>
            </div>
            <div>
              <span className="text-gray-600">Ca:</span>
              <span className="ml-2 font-medium">{feed.caPercent?.toFixed(2) || 0}%</span>
            </div>
          </div>

          {feed.warnings && feed.warnings.length > 0 && (
            <div className="rounded-lg bg-warning-50 p-2">
              <p className="text-xs font-semibold text-warning-900">Uyarılar:</p>
              {feed.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning-700">
                  • {w}
                </p>
              ))}
            </div>
          )}

          {feed.description && (
            <p className="text-xs text-gray-600">{feed.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

function NumField({
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
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function NumFieldOptional({
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
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        placeholder="(opsiyonel)"
      />
    </div>
  )
}
