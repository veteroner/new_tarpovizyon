/**
 * Feed Inventory Page
 * 
 * Displays and manages feed inventory with lot tracking and alerts.
 */

import React, { useMemo, useState } from 'react'
import { AlertTriangle, Package, TrendingDown, Calendar, Plus, Edit, Trash2, X, Upload } from 'lucide-react'
import { useInventoryStore } from '@/store/inventoryStore'
import { useFeedStore } from '@/store/feedStore'
import { useUIStore } from '@/store/uiStore'
import type { FeedInventoryItem, InventoryAlert, FeedLot, AnalysisSource } from '@/types/inventory'
import type { FeedCategory } from '@/types'
import type { Feed } from '@/types'
import AnalysisImportModal from '@/components/AnalysisImportModal'

export function FeedInventory() {
  const {
    inventory,
    getActiveAlerts,
    getCriticalAlerts,
    dismissAlert,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    addLot,
    updateLot,
    removeLot,
  } = useInventoryStore()

  const showToast = useUIStore((s) => s.showToast)

  const feedOverrides = useFeedStore((s) => s.feedOverrides)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const allFeeds = useMemo(
    () => useFeedStore.getState().getAllFeeds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedOverrides, userFeeds]
  )
  const feedsById = useMemo(() => new Map(allFeeds.map((f) => [f.id, f])), [allFeeds])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLotModal, setShowLotModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<FeedInventoryItem | null>(null)

  const feedsByNameKey = useMemo(() => {
    const keyOf = (name: string) =>
      name
        .trim()
        .toLocaleLowerCase('tr')
        .replace(/\s+/g, '')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/[ıİ]/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')

    const map = new Map<string, Feed>()
    for (const f of allFeeds) map.set(keyOf(f.name), f)
    return { map, keyOf }
  }, [allFeeds])

  const upsertFeedOverride = useFeedStore((s) => s.upsertFeedOverride)

  // Direct calls - store selectors are already optimized, no useMemo needed
  const activeAlerts = getActiveAlerts()
  const criticalAlerts = getCriticalAlerts()

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Alerts Summary */}
        {activeAlerts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">
                  {criticalAlerts.length > 0
                    ? `${criticalAlerts.length} Kritik Uyarı`
                    : `${activeAlerts.length} Uyarı`}
                </h3>
                <div className="mt-2 space-y-2">
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <AlertItem key={alert.alertId} alert={alert} onDismiss={dismissAlert} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Package className="w-5 h-5 text-blue-600" />}
            label="Toplam Yem"
            value={inventory.length}
            color="blue"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
            label="Düşük Stok"
            value={inventory.filter((item) => item.status === 'low-stock').length}
            color="yellow"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5 text-red-600" />}
            label="Tükenmiş"
            value={inventory.filter((item) => item.status === 'out-of-stock').length}
            color="red"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-purple-600" />}
            label="Süresi Yaklaşan"
            value={activeAlerts.filter((a) => a.type === 'expiring-soon').length}
            color="purple"
          />
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-lg">Yem Stokları</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                CSV İçe Aktar
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Yem Ekle
              </button>
            </div>
          </div>

          {inventory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Henüz yem eklenmedi</p>
              <p className="text-sm">Envanter takibi için yem ekleyin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Yem Adı</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kategori</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Stok (kg)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Min. Stok</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Günlük Kullanım</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Kalan Gün</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Lot Sayısı</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Durum</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inventory.map((item) => (
                    <InventoryRow 
                      key={item.feedId} 
                      item={item}
                      onEdit={(item) => {
                        setSelectedItem(item)
                        setShowEditModal(true)
                      }}
                      onManageLots={(item) => {
                        setSelectedItem(item)
                        setShowLotModal(true)
                      }}
                      onDelete={(feedId) => {
                        if (confirm('Bu yemi envanterden silmek istediğinize emin misiniz?')) {
                          removeInventoryItem(feedId)
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && (
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onAdd={addInventoryItem}
        />
      )}

      {/* Edit Inventory Modal */}
      {showEditModal && selectedItem && (
        <EditInventoryModal
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false)
            setSelectedItem(null)
          }}
          onUpdate={updateInventoryItem}
        />
      )}

      {/* Lot Management Modal */}
      {showLotModal && selectedItem && (
        <LotManagementModal
          item={selectedItem}
          baseFeed={feedsById.get(selectedItem.feedId)}
          onClose={() => {
            setShowLotModal(false)
            setSelectedItem(null)
          }}
          onAddLot={(lot) => addLot(selectedItem.feedId, lot)}
          onUpdateLot={(lotId, updates) => updateLot(selectedItem.feedId, lotId, updates)}
          onRemoveLot={(lotId) => removeLot(selectedItem.feedId, lotId)}
        />
      )}

      {showImportModal && (
        <AnalysisImportModal
          onClose={() => setShowImportModal(false)}
          onApply={(payload, opts) => {
            const lots = payload.lots

            if (payload.errors.length > 0) {
              showToast({
                type: 'error',
                message: `İçe aktarma hatası: ${payload.errors[0]}`,
              })
              return
            }

            const inventoryByFeedId = new Map(inventory.map((i) => [i.feedId, i]))
            let addedInventoryItems = 0
            let addedLots = 0
            let skippedLots = 0
            const latestLotByFeedId = new Map<string, { analysisDate: string; source: AnalysisSource; patch: Partial<Feed> }>()

            for (const row of lots) {
              const byId = row.feedId ? feedsById.get(row.feedId) : undefined
              const byName = !byId && row.feedName ? feedsByNameKey.map.get(feedsByNameKey.keyOf(row.feedName)) : undefined
              const feed = byId ?? byName

              const resolvedFeedId = feed?.id ?? row.feedId
              const resolvedFeedName = feed?.name ?? row.feedName

              if (!resolvedFeedId || !resolvedFeedName) {
                skippedLots += 1
                continue
              }

              if (!inventoryByFeedId.has(resolvedFeedId)) {
                const category = feed?.category ?? ('other' as unknown as FeedCategory)
                const priceTLPerKg = feed?.priceTLPerKg ?? 0
                const newItem: FeedInventoryItem = {
                  feedId: resolvedFeedId,
                  feedName: resolvedFeedName,
                  category: String(category),
                  currentStockKg: 0,
                  minStockKg: 0,
                  maxStockKg: 0,
                  lots: [],
                  status: 'available',
                  currentPriceTLPerKg: priceTLPerKg,
                }
                addInventoryItem(newItem)
                inventoryByFeedId.set(resolvedFeedId, newItem)
                addedInventoryItems += 1
              }

              const lot: FeedLot = {
                lotId: `lot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                feedId: resolvedFeedId,
                feedName: resolvedFeedName,
                lotNumber: row.lotNumber,
                analysisSource: row.analysisSource,
                analysisDate: row.analysisDate,
                labName: row.labName,
                dmPercent: row.dmPercent,
                meMcalPerKg: row.meMcalPerKg,
                cpPercent: row.cpPercent,
                ndfPercent: row.ndfPercent,
                caPercent: row.caPercent,
                pPercent: row.pPercent,
                initialQuantityKg: row.initialQuantityKg,
                remainingQuantityKg: row.remainingQuantityKg,
                expirationDate: row.expirationDate,
              }

              addLot(resolvedFeedId, lot)
              addedLots += 1

              if (opts.applyFeedOverrides) {
                const patch: Partial<Feed> = {
                  dmPercent: row.dmPercent,
                  meMcalPerKg: row.meMcalPerKg,
                  cpPercent: row.cpPercent,
                  ndfPercent: row.ndfPercent,
                  caPercent: row.caPercent,
                  pPercent: row.pPercent,
                }
                const prev = latestLotByFeedId.get(resolvedFeedId)
                if (!prev || row.analysisDate > prev.analysisDate) {
                  latestLotByFeedId.set(resolvedFeedId, { analysisDate: row.analysisDate, source: row.analysisSource, patch })
                }
              }
            }

            if (opts.applyFeedOverrides) {
              for (const [feedId, rec] of latestLotByFeedId.entries()) {
                upsertFeedOverride(feedId, rec.patch, rec.source)
              }
            }

            if (payload.warnings.length > 0) {
              showToast({
                type: 'warning',
                message: `İçe aktarma tamamlandı (${addedLots} lot). ${payload.warnings[0]}`,
                duration: 7000,
              })
            } else {
              showToast({
                type: 'success',
                message: `İçe aktarıldı: ${addedLots} lot, ${addedInventoryItems} yeni yem. ${skippedLots > 0 ? `${skippedLots} satır atlandı.` : ''}`.trim(),
              })
            }

            setShowImportModal(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const bgColor = {
    blue: 'bg-blue-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50',
  }[color]

  return (
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  )
}

function AlertItem({ alert, onDismiss }: { alert: InventoryAlert; onDismiss: (id: string) => void }) {
  const severityColor = {
    critical: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
  }[alert.severity]

  return (
    <div className="flex items-start justify-between gap-2">
      <p className={`text-sm ${severityColor}`}>{alert.message}</p>
      <button
        onClick={() => onDismiss(alert.alertId)}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Kapat
      </button>
    </div>
  )
}

function InventoryRow({ 
  item, 
  onEdit,
  onManageLots,
  onDelete 
}: { 
  item: FeedInventoryItem
  onEdit: (item: FeedInventoryItem) => void
  onManageLots: (item: FeedInventoryItem) => void
  onDelete: (feedId: string) => void
}) {
  const statusColors = {
    available: 'bg-green-100 text-green-800',
    'low-stock': 'bg-yellow-100 text-yellow-800',
    'out-of-stock': 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    'on-order': 'bg-blue-100 text-blue-800',
  }

  const statusLabels = {
    available: 'Mevcut',
    'low-stock': 'Düşük',
    'out-of-stock': 'Tükenmiş',
    expired: 'Süresi Dolmuş',
    'on-order': 'Sipariş',
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium">{item.feedName}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{item.category}</td>
      <td className="px-4 py-3 text-right font-mono">{item.currentStockKg.toFixed(0)}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">{item.minStockKg.toFixed(0)}</td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {item.averageDailyUsageKg ? item.averageDailyUsageKg.toFixed(1) : '-'}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {item.daysUntilEmpty !== undefined ? (
          <span className={item.daysUntilEmpty <= 3 ? 'text-red-600 font-semibold' : ''}>
            {item.daysUntilEmpty}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onManageLots(item)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          {item.lots.length}
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusColors[item.status]}`}>
          {statusLabels[item.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-gray-600 hover:text-blue-600"
            title="Düzenle"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(item.feedId)}
            className="p-1 text-gray-600 hover:text-red-600"
            title="Sil"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Add Inventory Modal Component
function AddInventoryModal({ 
  onClose, 
  onAdd,
}: {
  onClose: () => void
  onAdd: (item: FeedInventoryItem) => void
}) {
  const [feedId, setFeedId] = useState('')
  const [feedName, setFeedName] = useState('')
  const [category, setCategory] = useState<FeedCategory>('concentrate')
  const [currentStockKg, setCurrentStockKg] = useState(1000)
  const [minStockKg, setMinStockKg] = useState(100)
  const [maxStockKg, setMaxStockKg] = useState(5000)
  const [currentPriceTLPerKg, setCurrentPriceTLPerKg] = useState(10)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedId || !feedName) return
    
    onAdd({
      feedId,
      feedName,
      category,
      currentStockKg,
      minStockKg,
      maxStockKg,
      currentPriceTLPerKg,
      lots: [],
      status: currentStockKg <= 0 ? 'out-of-stock' : currentStockKg < minStockKg ? 'low-stock' : 'available',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Yem Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yem ID</label>
            <input
              type="text"
              required
              value={feedId}
              onChange={(e) => setFeedId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="feed_001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yem Adı</label>
            <input
              type="text"
              required
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Mısır Silajı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="forage">Kaba Yem</option>
              <option value="concentrate">Konsantre</option>
              <option value="mineral">Mineral</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Stok (kg)</label>
              <input
                type="number"
                required
                value={currentStockKg}
                onChange={(e) => setCurrentStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok (kg)</label>
              <input
                type="number"
                required
                value={minStockKg}
                onChange={(e) => setMinStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max. Stok (kg)</label>
              <input
                type="number"
                required
                value={maxStockKg}
                onChange={(e) => setMaxStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺/kg)</label>
              <input
                type="number"
                step="0.01"
                required
                value={currentPriceTLPerKg}
                onChange={(e) => setCurrentPriceTLPerKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Inventory Modal Component
function EditInventoryModal({ 
  item,
  onClose, 
  onUpdate 
}: { 
  item: FeedInventoryItem
  onClose: () => void
  onUpdate: (feedId: string, updates: Partial<FeedInventoryItem>) => void
}) {
  const [currentStockKg, setCurrentStockKg] = useState(item.currentStockKg)
  const [minStockKg, setMinStockKg] = useState(item.minStockKg)
  const [maxStockKg, setMaxStockKg] = useState(item.maxStockKg)
  const [currentPriceTLPerKg, setCurrentPriceTLPerKg] = useState(item.currentPriceTLPerKg)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    onUpdate(item.feedId, {
      currentStockKg,
      minStockKg,
      maxStockKg,
      currentPriceTLPerKg,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Stoğu Düzenle: {item.feedName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Stok (kg)</label>
              <input
                type="number"
                required
                value={currentStockKg}
                onChange={(e) => setCurrentStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok (kg)</label>
              <input
                type="number"
                required
                value={minStockKg}
                onChange={(e) => setMinStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max. Stok (kg)</label>
              <input
                type="number"
                required
                value={maxStockKg}
                onChange={(e) => setMaxStockKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺/kg)</label>
              <input
                type="number"
                step="0.01"
                required
                value={currentPriceTLPerKg}
                onChange={(e) => setCurrentPriceTLPerKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Güncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Lot Management Modal Component
function LotManagementModal({ 
  item,
  baseFeed,
  onClose, 
  onAddLot,
  onUpdateLot,
  onRemoveLot 
}: { 
  item: FeedInventoryItem
  baseFeed?: Feed
  onClose: () => void
  onAddLot: (lot: FeedLot) => void
  onUpdateLot: (lotId: string, updates: Partial<FeedLot>) => void
  onRemoveLot: (lotId: string) => void
}) {
  const [showAddLot, setShowAddLot] = useState(false)
  const [editingLotId, setEditingLotId] = useState<string | null>(null)

  const [lotNumber, setLotNumber] = useState('')
  const [quantityKg, setQuantityKg] = useState(500)
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>('lab')
  const [analysisDate, setAnalysisDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expirationDate, setExpirationDate] = useState<string>('')
  const [labName, setLabName] = useState<string>('')

  // Required analysis fields (prefill from feed library)
  const [dmPercent, setDmPercent] = useState<number>(baseFeed?.dmPercent ?? 88)
  const [meMcalPerKg, setMeMcalPerKg] = useState<number>(baseFeed?.meMcalPerKg ?? 2.6)
  const [cpPercent, setCpPercent] = useState<number>(baseFeed?.cpPercent ?? 14)
  const [ndfPercent, setNdfPercent] = useState<number>(baseFeed?.ndfPercent ?? 30)
  const [caPercent, setCaPercent] = useState<number>(baseFeed?.caPercent ?? 0.5)
  const [pPercent, setPPercent] = useState<number>(baseFeed?.pPercent ?? 0.3)

  const [editRemainingKg, setEditRemainingKg] = useState<number>(0)
  const [editExpirationDate, setEditExpirationDate] = useState<string>('')

  const handleAddLot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lotNumber) return

    const analysisDateIso = new Date(`${analysisDate}T00:00:00.000Z`).toISOString()
    const newLot: FeedLot = {
      lotId: `lot_${Date.now()}`,
      feedId: item.feedId,
      feedName: item.feedName,
      lotNumber,
      analysisSource,
      analysisDate: analysisDateIso,
      labName: labName.trim() ? labName.trim() : undefined,

      dmPercent,
      meMcalPerKg,
      cpPercent,
      ndfPercent,
      caPercent,
      pPercent,

      initialQuantityKg: quantityKg,
      remainingQuantityKg: quantityKg,
      expirationDate: expirationDate ? new Date(`${expirationDate}T00:00:00.000Z`).toISOString().slice(0, 10) : undefined,
    }

    onAddLot(newLot)
    setLotNumber('')
    setQuantityKg(500)
    setShowAddLot(false)
  }

  const startEditLot = (lot: FeedLot) => {
    setEditingLotId(lot.lotId)
    setEditRemainingKg(typeof lot.remainingQuantityKg === 'number' ? lot.remainingQuantityKg : 0)
    setEditExpirationDate(lot.expirationDate ?? '')
  }

  const submitEditLot = () => {
    if (!editingLotId) return
    onUpdateLot(editingLotId, {
      remainingQuantityKg: Math.max(0, editRemainingKg),
      expirationDate: editExpirationDate || undefined,
    })
    setEditingLotId(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Lot Yönetimi: {item.feedName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Existing Lots */}
          <div>
            <h4 className="font-medium mb-2">Mevcut Lotlar ({item.lots.length})</h4>
            {item.lots.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz lot eklenmedi</p>
            ) : (
              <div className="space-y-2">
                {item.lots.map((lot) => (
                  <div key={lot.lotId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{lot.lotNumber}</div>
                      <div className="text-sm text-gray-600">
                        {lot.analysisSource === 'lab' ? 'Laboratuvar' : 'NIR'} Analiz
                        {typeof lot.cpPercent === 'number' && ` • HP: ${lot.cpPercent.toFixed(1)}%`}
                        {typeof lot.ndfPercent === 'number' && ` • NDF: ${lot.ndfPercent.toFixed(1)}%`}
                        {typeof lot.remainingQuantityKg === 'number' && ` • Kalan: ${lot.remainingQuantityKg.toFixed(0)} kg`}
                      </div>
                      {lot.expirationDate && (
                        <div className="text-xs text-gray-500">SKT: {lot.expirationDate}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditLot(lot)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                        title="Lot düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${lot.lotNumber} lotunu silmek istediğinize emin misiniz?`)) {
                            onRemoveLot(lot.lotId)
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Lot sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {editingLotId && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="font-medium mb-2">Lot Düzenle</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kalan Miktar (kg)</label>
                        <input
                          type="number"
                          min={0}
                          value={editRemainingKg}
                          onChange={(e) => setEditRemainingKg(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SKT (opsiyonel)</label>
                        <input
                          type="text"
                          value={editExpirationDate}
                          onChange={(e) => setEditExpirationDate(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setEditingLotId(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={submitEditLot}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Lot Form */}
          <div>
            <button
              onClick={() => setShowAddLot(!showAddLot)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
            >
              <Plus size={16} />
              Yeni Lot Ekle
            </button>

            {showAddLot && (
              <form onSubmit={handleAddLot} className="mt-4 p-4 border rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lot Numarası</label>
                  <input
                    type="text"
                    required
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="LOT-2026-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Miktar (kg)</label>
                    <input
                      type="number"
                      required
                      value={quantityKg}
                      onChange={(e) => setQuantityKg(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Analiz Kaynağı</label>
                    <select
                      value={analysisSource}
                      onChange={(e) => setAnalysisSource(e.target.value as AnalysisSource)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="lab">Laboratuvar</option>
                      <option value="nir">NIR</option>
                      <option value="user-input">Kullanıcı Girişi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Analiz Tarihi</label>
                    <input
                      type="date"
                      required
                      value={analysisDate}
                      onChange={(e) => setAnalysisDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKT (opsiyonel)</label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lab Adı (opsiyonel)</label>
                    <input
                      type="text"
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Örn: XYZ Lab"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KM %</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={dmPercent}
                      onChange={(e) => setDmPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ME (Mcal/kg KM)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={meMcalPerKg}
                      onChange={(e) => setMeMcalPerKg(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HP %</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={cpPercent}
                      onChange={(e) => setCpPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NDF %</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={ndfPercent}
                      onChange={(e) => setNdfPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ca %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={caPercent}
                      onChange={(e) => setCaPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">P %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pPercent}
                      onChange={(e) => setPPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLot(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Lot Ekle
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedInventory
