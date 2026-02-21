import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save, Sliders, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRationStore } from '@/store/rationStore'
import { useUIStore } from '@/store/uiStore'
import { getFeedById } from '@/data/feedsV2'
import { optimizeRation } from '@/engine/optimizerV2'
import { calculateRiskScore } from '@/engine/riskScoring'

export default function RationEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ration = useRationStore((state) => state.rations.find((r) => r.id === id))
  const updateRation = useRationStore((state) => state.updateRation)
  const showToast = useUIStore((state) => state.showToast)

  const [editedAmounts, setEditedAmounts] = useState<{ [feedId: string]: number }>({})
  const [optimizing, setOptimizing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (ration) {
      // Initialize edited amounts from current ration
      const amounts: { [feedId: string]: number } = {}
      ration.ingredients.forEach((ing) => {
        amounts[ing.feedId] = ing.kgAsFedPerDay
      })
      setEditedAmounts(amounts)
    }
  }, [ration])

  if (!ration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Rasyon bulunamadı</p>
          <button onClick={() => navigate('/rasyon/history')} className="btn-primary">
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  const handleAmountChange = (feedId: string, value: number) => {
    setEditedAmounts({ ...editedAmounts, [feedId]: value })
    setHasChanges(true)
  }

  const handleSaveManual = () => {
    // Recalculate ingredients, totals and cost based on edited as-fed amounts
    let dmiKg = 0
    let mePerDay = 0
    let cpGrams = 0

    let ndfDm = 0
    let starchDm = 0
    let sugarDm = 0
    let fatDm = 0

    let caGrams = 0
    let pGrams = 0
    let mgGrams = 0
    let naGrams = 0
    let kGrams = 0
    let sGrams = 0
    let clGrams = 0

    let dailyFeedCostTL = 0

    const updatedIngredients = ration.ingredients.map((ing) => {
      const newAmount = editedAmounts[ing.feedId] || 0
      const feed = getFeedById(ing.feedId)
      
      if (feed) {
        const kgDMPerDay = (newAmount * feed.dmPercent) / 100
        const costTL = newAmount * feed.priceTLPerKg

        dmiKg += kgDMPerDay
        mePerDay += kgDMPerDay * feed.meMcalPerKg
        cpGrams += (kgDMPerDay * feed.cpPercent * 10)

        ndfDm += (kgDMPerDay * feed.ndfPercent) / 100
        starchDm += (kgDMPerDay * (feed.starchPercent ?? 0)) / 100
        sugarDm += (kgDMPerDay * (feed.sugarPercent ?? 0)) / 100
        fatDm += (kgDMPerDay * (feed.fatPercent ?? 0)) / 100

        caGrams += (kgDMPerDay * feed.caPercent * 10)
        pGrams += (kgDMPerDay * feed.pPercent * 10)
        mgGrams += (kgDMPerDay * (feed.mgPercent ?? 0) * 10)
        naGrams += (kgDMPerDay * (feed.naPercent ?? 0) * 10)
        kGrams += (kgDMPerDay * (feed.kPercent ?? 0) * 10)
        sGrams += (kgDMPerDay * (feed.sPercent ?? 0) * 10)
        clGrams += (kgDMPerDay * (feed.clPercent ?? 0) * 10)

        dailyFeedCostTL += costTL

        return {
          ...ing,
          feedName: feed.name,
          feedCategory: feed.category,
          ndfPercent: feed.ndfPercent,
          kgAsFedPerDay: newAmount,
          kgDMPerDay,
          costTL,
        }
      }

      return {
        ...ing,
        kgAsFedPerDay: newAmount,
      }
    })

    const updatedTotals = {
      ...ration.totals,
      dmiKg,
      mePerDay,
      cpGrams,
      ndfPercent: dmiKg > 0 ? (ndfDm / dmiKg) * 100 : 0,
      starchPercent: dmiKg > 0 ? (starchDm / dmiKg) * 100 : 0,
      sugarPercent: dmiKg > 0 ? (sugarDm / dmiKg) * 100 : 0,
      fatPercent: dmiKg > 0 ? (fatDm / dmiKg) * 100 : 0,
      caGrams,
      pGrams,
      mgGrams,
      naGrams,
      kGrams,
      sGrams,
      clGrams,
    }

    const updatedCost = {
      ...ration.cost,
      dailyFeedCostTL,
      monthlyCostTL: dailyFeedCostTL * 30,
      costPerKgMilk: ration.profile.milkYieldKgPerDay
        ? dailyFeedCostTL / ration.profile.milkYieldKgPerDay
        : undefined,
    }

    const updatedRation = {
      ...ration,
      ingredients: updatedIngredients,
      totals: updatedTotals,
      cost: updatedCost,
      updatedAt: new Date().toISOString(),
    }

    const updatedRisk = calculateRiskScore(updatedRation, updatedRation.profile)

    updateRation(ration.id, {
      ingredients: updatedIngredients,
      totals: updatedTotals,
      cost: updatedCost,
      riskScore: updatedRisk,
      updatedAt: updatedRation.updatedAt,
    })

    showToast({
      type: 'success',
      message: '✅ Değişiklikler kaydedildi!',
    })

    setHasChanges(false)
    navigate(`/rasyon/ration/${ration.id}`)
  }

  const handleReoptimize = async () => {
    setOptimizing(true)
    try {
      const selectedFeeds = ration.ingredients
        .map((ing) => getFeedById(ing.feedId))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))

      if (selectedFeeds.length === 0) {
        showToast({ type: 'error', message: 'Seçili yem bulunamadı.' })
        return
      }

      const result = await optimizeRation(ration.profile, selectedFeeds, { solver: 'auto' })
      if (result.status !== 'success' || !result.ration) {
        showToast({
          type: 'error',
          message: `❌ Optimizasyon başarısız: ${result.message}`,
        })
        return
      }

      updateRation(ration.id, {
        profile: result.ration.profile,
        requirements: result.ration.requirements,
        ingredients: result.ration.ingredients,
        totals: result.ration.totals,
        cost: result.ration.cost,
        riskScore: result.ration.riskScore,
        alternatives: result.ration.alternatives,
        aiExplanation: undefined,
        updatedAt: new Date().toISOString(),
      })

      showToast({
        type: 'success',
        message: '🎯 Rasyon yeniden optimize edildi!',
      })

      setHasChanges(false)
      navigate(`/rasyon/ration/${ration.id}`)
    } catch (err) {
      console.error('Reoptimization failed:', err)
      showToast({
        type: 'error',
        message: '❌ Optimizasyon sırasında hata oluştu.',
      })
    } finally {
      setOptimizing(false)
    }
  }

  const totalDMI = Object.entries(editedAmounts).reduce((sum, [feedId, amount]) => {
    const feed = getFeedById(feedId)
    return sum + (feed ? (amount * feed.dmPercent) / 100 : 0)
  }, 0)

  const totalCost = ration.ingredients.reduce((sum, ing) => {
    const feed = getFeedById(ing.feedId)
    return sum + (editedAmounts[ing.feedId] || 0) * (feed?.priceTLPerKg || 0)
  }, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/rasyon/ration/${ration.id}`)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Geri
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rasyon Düzenle</h1>
        <p className="text-gray-600">
          {ration.profile.breed} • {ration.profile.purpose}
        </p>
      </div>

      {/* Warning Banner */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-yellow-50 border-yellow-200 mb-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Kaydedilmemiş değişiklikler var
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Değişikliklerinizi kaydetmek için "Manuel Kaydet" veya yeniden optimize etmek için "Yeniden Optimize Et" butonunu kullanın.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Toplam KM Alımı</div>
          <div className="text-2xl font-bold text-gray-900">{totalDMI.toFixed(2)} kg</div>
          <div className="text-xs text-gray-500 mt-1">Mevcut rasyon üzerinden hesaplanır</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Günlük Maliyet</div>
          <div className="text-2xl font-bold text-gray-900">{totalCost.toFixed(2)} ₺</div>
          <div className="text-xs text-gray-500 mt-1">
            Önceki: {ration.cost.dailyFeedCostTL.toFixed(2)} ₺
          </div>
        </div>
      </div>

      {/* Feed Amounts */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Yem Miktarları</h2>
        <div className="space-y-4">
          {ration.ingredients.map((ing) => {
            const amount = editedAmounts[ing.feedId] || 0
            const feed = getFeedById(ing.feedId)
            const dmIntake = feed ? (amount * feed.dmPercent) / 100 : 0
            const ratio = totalDMI > 0 ? (dmIntake / totalDMI) * 100 : 0

            return (
              <div key={ing.feedId} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">{ing.feedName}</label>
                  <div className="text-sm text-gray-600">
                    {ratio.toFixed(1)}% (KM) • {(feed?.priceTLPerKg ?? 0).toFixed(2)} ₺/kg
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={amount}
                    onChange={(e) => handleAmountChange(ing.feedId, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={amount}
                    onChange={(e) => handleAmountChange(ing.feedId, parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-sm text-gray-600 w-16">kg/gün</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Constraints */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Kısıtlar</h2>
        </div>
        <p className="text-sm text-gray-600">
          Yeniden optimizasyon, seçili yemlerle mevcut profil hedeflerine göre yapılır.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReoptimize}
          disabled={optimizing}
          className="btn-primary flex-1"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${optimizing ? 'animate-spin' : ''}`} />
          {optimizing ? 'Optimize ediliyor...' : 'Yeniden Optimize Et'}
        </button>
        <button
          onClick={handleSaveManual}
          disabled={!hasChanges}
          className="btn-secondary flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Manuel Kaydet
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">💡 İpucu:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>"Manuel Kaydet" miktarları olduğu gibi kaydeder</li>
          <li>"Yeniden Optimize Et" kısıtlara göre en iyi çözümü bulur</li>
          <li>Slider ile hızlı, sayı girişi ile hassas ayarlama yapabilirsiniz</li>
        </ul>
      </div>
    </div>
  )
}
