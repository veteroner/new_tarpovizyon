import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingUp, AlertTriangle, Sparkles, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRationStore } from '@/store/rationStore'
import type { RiskScore } from '@/types'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const getOverallScore = (riskScore?: RiskScore): number | undefined => {
  const overall = riskScore?.overall
  return typeof overall === 'number' ? overall : undefined
}

export default function RationHistory() {
  const navigate = useNavigate()
  const rations = useRationStore((state) => state.rations)

  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: typeof rations } = {}
    
    rations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((ration) => {
        const date = format(new Date(ration.createdAt), 'dd MMMM yyyy', { locale: tr })
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(ration)
      })
    
    return groups
  }, [rations])

  const getRiskColor = (score?: number) => {
    if (typeof score !== 'number') return 'bg-gray-100 text-gray-700'
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    if (score >= 40) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const getRiskLabel = (score?: number) => {
    if (typeof score !== 'number') return 'Bilinmiyor'
    if (score >= 80) return 'Çok İyi'
    if (score >= 60) return 'İyi'
    if (score >= 40) return 'Orta Risk'
    return 'Yüksek Risk'
  }

  if (rations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz rasyon oluşturmadınız</h2>
        <p className="text-gray-600 mb-6">
          İlk rasyonunuzu oluşturmak için sihirbazı kullanabilir veya hazır şablonlara göz atabilirsiniz.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate('/rasyon/wizard/animal')} className="btn-primary">
            Yeni Rasyon Oluştur
          </button>
          <button onClick={() => navigate('/rasyon/rations')} className="btn-secondary">
            Hazır Şablonlar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rasyon Geçmişi</h1>
        <p className="text-gray-600">
          Toplam {rations.length} rasyon oluşturuldu
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedByDate).map(([date, dateRations], dateIdx) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">{date}</h2>
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">{dateRations.length} rasyon</span>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 space-y-4">
              {/* Timeline Line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>

              {dateRations.map((ration, idx) => {
                const time = format(new Date(ration.createdAt), 'HH:mm')
                const hasAI = !!ration.aiExplanation
                const riskScore = ration.riskScore
                const overallScore = getOverallScore(riskScore)
                const warnings = ration.riskScore?.warnings?.length || 0

                return (
                  <motion.div
                    key={ration.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dateIdx * 0.05 + idx * 0.05 }}
                    className="relative"
                  >
                    {/* Timeline Dot */}
                    <div className="absolute -left-5 top-3 w-5 h-5 rounded-full bg-primary-600 border-4 border-white shadow-sm"></div>

                    {/* Card */}
                    <div
                      className="card hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/rasyon/ration/${ration.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">{time}</span>
                            {hasAI && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {ration.profile.breed} • {ration.profile.purpose}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>{ration.profile.weightKg} kg</span>
                            {ration.profile.milkYieldKgPerDay && (
                              <span>{ration.profile.milkYieldKgPerDay} kg süt/gün</span>
                            )}
                          </div>
                        </div>

                        {/* Risk Score Badge */}
                        {typeof overallScore === 'number' && (
                          <div className={`px-3 py-2 rounded-lg ${getRiskColor(overallScore)}`}>
                            <div className="text-xs font-medium mb-0.5">Sağlık Skoru</div>
                            <div className="text-2xl font-bold">{overallScore}</div>
                            <div className="text-xs">{getRiskLabel(overallScore)}</div>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Günlük Maliyet</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {ration.cost.dailyFeedCostTL.toFixed(2)} ₺
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Yem Sayısı</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {ration.ingredients.length} adet
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Uyarılar</div>
                          <div className="flex items-center gap-1">
                            {warnings > 0 && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                            <div className="text-sm font-semibold text-gray-900">
                              {warnings || 'Yok'}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Değerlendirme</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {ration.evaluations?.length || 0}
                            {ration.evaluations && ration.evaluations.length > 0 && (
                              <span className="ml-1 text-xs text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Preview of Feeds */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">Yemlerin özeti:</div>
                        <div className="flex flex-wrap gap-2">
                          {ration.ingredients.slice(0, 4).map((ing) => (
                            <span
                              key={ing.feedId}
                              className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                            >
                              {ing.feedName} • {(ing.kgAsFedPerDay ?? 0).toFixed(1)} kg
                            </span>
                          ))}
                          {ration.ingredients.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                              +{ration.ingredients.length - 4} daha
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Toplam Rasyon</div>
              <div className="text-2xl font-bold text-gray-900">{rations.length}</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">AI Açıklamalı</div>
              <div className="text-2xl font-bold text-gray-900">
                {rations.filter((r) => r.aiExplanation).length}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Düşük Riskli</div>
              <div className="text-2xl font-bold text-gray-900">
                {rations.filter((r) => (getOverallScore(r.riskScore) ?? 0) >= 80).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
