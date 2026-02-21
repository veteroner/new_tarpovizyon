/**
 * Ration Evaluation Page
 * 
 * Allows users to evaluate currently fed rations and compare predicted vs actual performance.
 */

import React, { useState } from 'react'
import { ClipboardCheck, TrendingUp, AlertCircle, Plus, Trash2, Save } from 'lucide-react'
import type { RationEvaluationRequest, RationEvaluationResult, ActualPerformance } from '@/types/evaluation'
import type { AnimalProfile, Parity, Ration, NutrientRequirement, CostSummary, RationTotals } from '@/types'
import { evaluateRation } from '@/engine/rationEvaluator'
import { useRationStore } from '@/store/rationStore'
import logger from '@/utils/logger'

export function RationEvaluationPage() {
  const [evaluationResult, setEvaluationResult] = useState<RationEvaluationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRationId, setSelectedRationId] = useState<string>('')
  
  const { rations, addEvaluation } = useRationStore()

  // Animal Profile
  const [animalType, setAnimalType] = useState<'dairy' | 'beef'>('dairy')
  const [bodyWeightKg, setBodyWeightKg] = useState(600)
  const [milkKgPerDay, setMilkKgPerDay] = useState(30)
  const [daysInMilk, setDaysInMilk] = useState(120)
  const [lactationNumber, setLactationNumber] = useState(2)
  const [targetAdgKg, setTargetAdgKg] = useState(0)

  // Current Ration Ingredients
  const [ingredients, setIngredients] = useState<Array<{ feedName: string; kgAsFedPerDay: number }>>([
    { feedName: 'Mısır Silajı', kgAsFedPerDay: 30 },
  ])

  // Actual Performance
  const [actualMilkKgPerDay, setActualMilkKgPerDay] = useState(28)
  const [actualAdgKg, setActualAdgKg] = useState(0)
  const [actualDmiKg, setActualDmiKg] = useState(22)
  const [actualBcs, setActualBcs] = useState(3.0)

  const handleEvaluate = async () => {
    setLoading(true)
    try {
      const profile: AnimalProfile = {
        species: 'cattle',
        breed: 'holstein',
        sex: 'female',
        purpose: animalType,
        weightKg: bodyWeightKg,
        stage: 'mid',
        parity: lactationNumber as Parity,
        milkYieldKgPerDay: animalType === 'dairy' ? milkKgPerDay : undefined,
        targetAdgKgPerDay: animalType === 'beef' ? targetAdgKg : undefined,
      }

      const actualPerformance: ActualPerformance = {
        actualMilkYieldKgPerDay: animalType === 'dairy' ? actualMilkKgPerDay : undefined,
        actualAdgKgPerDay: animalType === 'beef' ? actualAdgKg : undefined,
        actualDmiKg,
        actualBodyConditionScore: actualBcs,
        measurementStartDate: new Date().toISOString(),
        measurementEndDate: new Date().toISOString(),
        daysOnRation: 30,
      }

      const request: RationEvaluationRequest = {
        profile,
        fedRation: {
          ingredients: ingredients.map((ing) => ({
            feedId: ing.feedName.toLowerCase().replace(/\s+/g, '-'),
            feedName: ing.feedName,
            kgAsFedPerDay: ing.kgAsFedPerDay,
          })),
        },
        actualPerformance,
      }

      // Create a minimal Ration object for evaluation
      const dummyRation: Ration = {
        id: 'evaluation-temp',
        createdAt: new Date().toISOString(),
        profile,
        requirements: {} as NutrientRequirement,
        ingredients: [],
        totals: { dmiKg: 0 } as RationTotals,
        cost: { dailyFeedCostTL: 0 } as CostSummary,
      }
      const result = await evaluateRation(request, dummyRation)
      setEvaluationResult(result)
    } catch (error) {
      logger.error('Evaluation error:', error)
      alert('Değerlendirme sırasında bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { feedName: '', kgAsFedPerDay: 0 }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: 'feedName' | 'kgAsFedPerDay', value: string | number) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const handleSaveEvaluation = () => {
    if (!evaluationResult || !selectedRationId) {
      alert('Lütfen bir rasyon seçin ve değerlendirme yapın')
      return
    }

    try {
      const actualPerformance: ActualPerformance = {
        actualMilkYieldKgPerDay: animalType === 'dairy' ? actualMilkKgPerDay : undefined,
        actualAdgKgPerDay: animalType === 'beef' ? actualAdgKg : undefined,
        actualDmiKg,
        actualBodyConditionScore: actualBcs,
        measurementStartDate: new Date().toISOString(),
        measurementEndDate: new Date().toISOString(),
        daysOnRation: 30,
      }

      addEvaluation(selectedRationId, actualPerformance, evaluationResult.performanceComparison)
      alert('✅ Değerlendirme kaydedildi! Rasyon Kütüphanesi\'nde görüntüleyebilirsiniz.')
    } catch (error) {
      logger.error('Failed to save evaluation:', error)
      alert('Değerlendirme kaydedilemedi')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Rasyon Değerlendirme</h3>
              <p className="text-sm text-blue-700 mt-1">
                Şu anda beslediğiniz rasyonu değerlendirin ve tahmin edilen performansı gerçek performansla karşılaştırın.
                Bu araç, rasyon formülasyonunuzu doğrulamak ve iyileştirme fırsatlarını belirlemek için kullanılır.
              </p>
            </div>
          </div>
        </div>

        {/* Evaluation Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Değerlendirme Formu</h2>
          
          <div className="space-y-6">
            {/* Ration Selection Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 mb-2">📋 Rasyon Seçimi (Opsiyonel)</h3>
              <p className="text-sm text-amber-700 mb-3">
                Değerlendirmeyi kaydetmek için kütüphanenizden bir rasyon seçin. 
                Seçmezseniz sadece sonuçları görüntüleyebilirsiniz (kaydetmeden).
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kütüphaneden Rasyon Seç</label>
                <select
                  value={selectedRationId}
                  onChange={(e) => setSelectedRationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Seçiniz (kaydetmek için) --</option>
                  {rations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.createdAt).toLocaleDateString('tr-TR')} - {r.profile.breed} ({r.cost.dailyFeedCostTL.toFixed(2)} ₺/gün)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Animal Profile Section */}
            <div>
              <h3 className="font-medium mb-3">Hayvan Profili</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hayvan Tipi</label>
                  <select
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value as 'dairy' | 'beef')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="dairy">Süt Sığırı</option>
                    <option value="beef">Besi Sığırı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canlı Ağırlık (kg)</label>
                  <input
                    type="number"
                    value={bodyWeightKg}
                    onChange={(e) => setBodyWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {animalType === 'dairy' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Süt (kg/gün)</label>
                      <input
                        type="number"
                        value={milkKgPerDay}
                        onChange={(e) => setMilkKgPerDay(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Laktasyon Günü</label>
                      <input
                        type="number"
                        value={daysInMilk}
                        onChange={(e) => setDaysInMilk(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Laktasyon Sayısı</label>
                      <input
                        type="number"
                        value={lactationNumber}
                        onChange={(e) => setLactationNumber(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {animalType === 'beef' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Günlük Kilo Alımı (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetAdgKg}
                      onChange={(e) => setTargetAdgKg(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Current Ration Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Beslenen Rasyon</h3>
                <button
                  onClick={addIngredient}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} />
                  Yem Ekle
                </button>
              </div>

              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Yem adı"
                      value={ing.feedName}
                      onChange={(e) => updateIngredient(index, 'feedName', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="kg/gün"
                      value={ing.kgAsFedPerDay}
                      onChange={(e) => updateIngredient(index, 'kgAsFedPerDay', Number(e.target.value))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actual Performance Section */}
            <div>
              <h3 className="font-medium mb-3">Gerçek Performans</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {animalType === 'dairy' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gerçek Süt (kg/gün)</label>
                    <input
                      type="number"
                      value={actualMilkKgPerDay}
                      onChange={(e) => setActualMilkKgPerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                {animalType === 'beef' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gerçek Günlük Kilo Alımı (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={actualAdgKg}
                      onChange={(e) => setActualAdgKg(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gerçek Yem Tüketimi (kg KM/gün)</label>
                  <input
                    type="number"
                    value={actualDmiKg}
                    onChange={(e) => setActualDmiKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vücut Kondisyon Skoru (1-5)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={actualBcs}
                    onChange={(e) => setActualBcs(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Evaluate Button */}
            <button
              onClick={handleEvaluate}
              disabled={loading || ingredients.length === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Değerlendiriliyor...' : 'Rasyonu Değerlendir'}
            </button>
          </div>
        </div>

        {/* Result Preview (when available) */}
        {evaluationResult && (
          <>
            <EvaluationResultPanel 
              result={evaluationResult} 
              onSave={handleSaveEvaluation}
              canSave={!!selectedRationId}
            />
          </>
        )}

        {/* Feature List */}
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            title="Performans Karşılaştırma"
            description="Tahmin edilen vs gerçek süt verimi, canlı ağırlık artışı ve yem tüketimi"
          />
          <FeatureCard
            icon={<ClipboardCheck className="w-6 h-6 text-blue-600" />}
            title="Besin Dengesi Kontrolü"
            description="Enerji, protein ve mineral dengesinin değerlendirilmesi"
          />
          <FeatureCard
            icon={<AlertCircle className="w-6 h-6 text-purple-600" />}
            title="İyileştirme Önerileri"
            description="Performansı artırmak için özel öneriler ve ayarlamalar"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function EvaluationResultPanel({ 
  result, 
  onSave, 
  canSave 
}: { 
  result: RationEvaluationResult
  onSave: () => void
  canSave: boolean
}) {
  const { performanceComparison, nutrientBalance, overallScore, evaluationSummary } = result

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Değerlendirme Sonuçları</h2>
        {canSave && (
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        )}
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Genel Puan</span>
          <span className="text-2xl font-bold">{overallScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${
              overallScore >= 90 ? 'bg-green-600' :
              overallScore >= 75 ? 'bg-blue-600' :
              overallScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
            }`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{evaluationSummary}</p>
      </div>

      {/* Performance Variances */}
      {Object.keys(performanceComparison.variances).length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Performans Sapmaları</h3>
          <div className="space-y-2">
            {Object.entries(performanceComparison.variances).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{key}</span>
                <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrient Balance */}
      <div>
        <h3 className="font-medium mb-2">Besin Dengesi</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className={`p-2 rounded ${
            nutrientBalance.energyBalance === 'adequate' ? 'bg-green-50 text-green-700' :
            nutrientBalance.energyBalance === 'excess' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Enerji: {nutrientBalance.energyBalance}
          </div>
          <div className={`p-2 rounded ${
            nutrientBalance.proteinBalance === 'adequate' ? 'bg-green-50 text-green-700' :
            nutrientBalance.proteinBalance === 'excess' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Protein: {nutrientBalance.proteinBalance}
          </div>
          <div className={`p-2 rounded ${
            nutrientBalance.mineralBalance === 'good' ? 'bg-green-50 text-green-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            Mineral: {nutrientBalance.mineralBalance}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RationEvaluationPage
