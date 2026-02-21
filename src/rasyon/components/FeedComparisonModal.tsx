import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3 } from 'lucide-react'
import type { Feed } from '@/types'

type NumericFeedKey = {
  [K in keyof Feed]-?: Feed[K] extends number | undefined ? K : never
}[keyof Feed]

interface FeedComparisonModalProps {
  feeds: Feed[]
  onClose: () => void
}

export default function FeedComparisonModal({ feeds, onClose }: FeedComparisonModalProps) {
  const [selectedFeeds, setSelectedFeeds] = useState<Feed[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleFeed = (feed: Feed) => {
    if (selectedFeeds.find((f) => f.id === feed.id)) {
      setSelectedFeeds(selectedFeeds.filter((f) => f.id !== feed.id))
    } else if (selectedFeeds.length < 4) {
      setSelectedFeeds([...selectedFeeds, feed])
    }
  }

  const filteredFeeds = feeds.filter((feed) =>
    feed.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const nutrients: Array<{ key: NumericFeedKey; label: string; format: (v: number) => string }> = [
    { key: 'dmPercent', label: 'Kuru Madde (%)', format: (v: number) => v.toFixed(1) },
    { key: 'meMcalPerKg', label: 'ME (Mcal/kg KM)', format: (v: number) => v.toFixed(2) },
    { key: 'nelMcalPerKg', label: 'NEL (Mcal/kg KM)', format: (v: number) => v.toFixed(2) },
    { key: 'cpPercent', label: 'Ham Protein (%)', format: (v: number) => v.toFixed(1) },
    { key: 'ndfPercent', label: 'NDF (%)', format: (v: number) => v.toFixed(1) },
    { key: 'starchPercent', label: 'Nişasta (%)', format: (v: number) => v.toFixed(1) },
    { key: 'sugarPercent', label: 'Şeker (%)', format: (v: number) => v.toFixed(1) },
    { key: 'fatPercent', label: 'Yağ (%)', format: (v: number) => v.toFixed(1) },
    { key: 'caPercent', label: 'Kalsiyum (%)', format: (v: number) => v.toFixed(2) },
    { key: 'pPercent', label: 'Fosfor (%)', format: (v: number) => v.toFixed(2) },
    { key: 'naPercent', label: 'Sodyum (%)', format: (v: number) => v.toFixed(2) },
    { key: 'kPercent', label: 'Potasyum (%)', format: (v: number) => v.toFixed(2) },
    { key: 'mgPercent', label: 'Magnezyum (%)', format: (v: number) => v.toFixed(2) },
    { key: 'priceTLPerKg', label: 'Fiyat (₺/kg yaş)', format: (v: number) => v.toFixed(2) },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Yem Karşılaştırma</h2>
                <p className="text-sm text-gray-600">
                  {selectedFeeds.length}/4 yem seçildi
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Feed Selection */}
            {selectedFeeds.length < 4 && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Karşılaştırmak için yem seçin (maks. 4)
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Yem ara..."
                  className="input-field mb-3"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {filteredFeeds.map((feed) => {
                    const isSelected = selectedFeeds.find((f) => f.id === feed.id)
                    return (
                      <button
                        key={feed.id}
                        onClick={() => toggleFeed(feed)}
                        disabled={!isSelected && selectedFeeds.length >= 4}
                        className={`
                          text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }
                          ${!isSelected && selectedFeeds.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {feed.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Comparison Table */}
            {selectedFeeds.length > 0 && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 bg-gray-50 sticky left-0">
                          Besin Değeri
                        </th>
                        {selectedFeeds.map((feed) => (
                          <th
                            key={feed.id}
                            className="text-center py-3 px-4 text-sm font-semibold text-gray-900 bg-gradient-to-r from-primary-50 to-blue-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-1">{feed.name}</span>
                              <button
                                onClick={() => toggleFeed(feed)}
                                className="p-1 hover:bg-white/50 rounded transition-colors"
                                title="Kaldır"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nutrients.map((nutrient, idx) => {
                        const values = selectedFeeds.map((feed) => {
                          const value = feed[nutrient.key]
                          return typeof value === 'number' ? value : null
                        })
                        const validValues = values.filter((v) => v !== null) as number[]
                        const max = validValues.length > 0 ? Math.max(...validValues) : null
                        const min = validValues.length > 0 ? Math.min(...validValues) : null

                        return (
                          <tr
                            key={nutrient.key}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-inherit">
                              {nutrient.label}
                            </td>
                            {selectedFeeds.map((feed, feedIdx) => {
                              const value = feed[nutrient.key]
                              const numValue = typeof value === 'number' ? value : null
                              const isMax = numValue !== null && numValue === max && validValues.length > 1
                              const isMin = numValue !== null && numValue === min && validValues.length > 1

                              return (
                                <td
                                  key={feedIdx}
                                  className={`
                                    py-3 px-4 text-sm text-center
                                    ${isMax ? 'bg-green-100 text-green-900 font-semibold' : ''}
                                    ${isMin ? 'bg-orange-100 text-orange-900 font-semibold' : 'text-gray-700'}
                                  `}
                                >
                                  {numValue !== null ? nutrient.format(numValue) : '-'}
                                  {isMax && <span className="ml-1 text-xs">🏆</span>}
                                  {isMin && <span className="ml-1 text-xs">📉</span>}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                    <span>En Yüksek Değer 🏆</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
                    <span>En Düşük Değer 📉</span>
                  </div>
                </div>
              </div>
            )}

            {selectedFeeds.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Yem seçilmedi</p>
                <p className="text-sm">
                  Yukarıdan karşılaştırmak için en az 2 yem seçin
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">
              Kapat
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
