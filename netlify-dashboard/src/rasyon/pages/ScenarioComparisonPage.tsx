/**
 * Scenario Comparison Page
 * 
 * Enables what-if analysis and side-by-side comparison of multiple ration scenarios.
 */

import React, { useState } from 'react'
import { GitCompare, TrendingUp, DollarSign, Plus, Trash2, Play } from 'lucide-react'
import type { ScenarioComparisonRequest, ScenarioComparisonResult, Scenario } from '@/types/scenario'
import type { AnimalProfile, OptimizationPreferences } from '@/types'
import { compareScenarios } from '@/engine/scenarioComparator'
import { feeds as builtInFeeds } from '@/data/feedsV2'
import logger from '@/utils/logger'

export function ScenarioComparisonPage() {
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Base Profile
  const [animalType, setAnimalType] = useState<'dairy' | 'beef'>('dairy')
  const [bodyWeightKg, setBodyWeightKg] = useState(600)
  const [milkKgPerDay, setMilkKgPerDay] = useState(30)

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      scenarioId: 'base',
      scenarioName: 'Mevcut Durum',
      scenarioType: 'base',
    },
  ])

  const addPriceScenario = () => {
    const newScenario: Scenario = {
      scenarioId: `scenario_${Date.now()}`,
      scenarioName: `Senaryo ${scenarios.length + 1}`,
      scenarioType: 'price',
      priceScenario: {
        scenarioId: `scenario_${Date.now()}`,
        scenarioName: `Senaryo ${scenarios.length + 1}`,
        globalAdjustment: {
          allFeedsChangePercent: 10,
        },
        priceAdjustments: [],
      },
    }
    setScenarios([...scenarios, newScenario])
  }

  const removeScenario = (index: number) => {
    if (index === 0) return // Don't remove base scenario
    setScenarios(scenarios.filter((_, i) => i !== index))
  }

  const updateScenarioName = (index: number, name: string) => {
    const updated = [...scenarios]
    updated[index] = { ...updated[index], scenarioName: name }
    setScenarios(updated)
  }

  const updatePriceChange = (index: number, percent: number) => {
    const updated = [...scenarios]
    if (updated[index].priceScenario) {
      updated[index] = {
        ...updated[index],
        priceScenario: {
          ...updated[index].priceScenario!,
          globalAdjustment: {
            allFeedsChangePercent: percent,
          },
        },
      }
      setScenarios(updated)
    }
  }

  const handleCompare = async () => {
    setLoading(true)
    try {
      const baseProfile: AnimalProfile = {
        species: 'cattle',
        breed: 'holstein',
        sex: 'female',
        purpose: animalType,
        weightKg: bodyWeightKg,
        stage: 'mid',
        milkYieldKgPerDay: animalType === 'dairy' ? milkKgPerDay : undefined,
        targetAdgKgPerDay: animalType === 'beef' ? 1.2 : undefined,
      }

      const basePreferences: OptimizationPreferences = {
        minForagePercent: 40,
      }

      const request: ScenarioComparisonRequest = {
        baseProfile,
        basePreferences,
        scenarios,
      }

      const result = await compareScenarios(request, builtInFeeds)
      setComparisonResult(result)
    } catch (error) {
      logger.error('Comparison error:', error)
      alert('Karşılaştırma sırasında bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <GitCompare className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-purple-900">Senaryo Analizi</h3>
            <p className="text-sm text-purple-700 mt-1">
              Farklı fiyat senaryolarını, kısıt değişikliklerini ve yem kullanılabilirliğini yan yana karşılaştırın.
              "Ya olursa?" (what-if) analizi yaparak en ekonomik ve uygulanabilir rasyonu belirleyin.
            </p>
          </div>
        </div>
      </div>

      {/* Base Profile */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Temel Hayvan Profili</h2>
        <div className="grid md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Süt (kg/gün)</label>
              <input
                type="number"
                value={milkKgPerDay}
                onChange={(e) => setMilkKgPerDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scenario Builder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Senaryolar</h2>
          <button
            onClick={addPriceScenario}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={16} />
            Fiyat Senaryosu Ekle
          </button>
        </div>

        <div className="space-y-3">
          {scenarios.map((scenario, index) => (
            <div key={scenario.scenarioId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={scenario.scenarioName}
                      onChange={(e) => updateScenarioName(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-medium"
                      placeholder="Senaryo adı"
                    />
                    {index > 0 && (
                      <button
                        onClick={() => removeScenario(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {scenario.scenarioType === 'price' && scenario.priceScenario && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tüm Yemler Fiyat Değişimi (%)
                        </label>
                        <input
                          type="number"
                          value={scenario.priceScenario.globalAdjustment?.allFeedsChangePercent || 0}
                          onChange={(e) => updatePriceChange(index, Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Örn: 10 (10% artış), -5 (5% düşüş)"
                        />
                      </div>
                    </div>
                  )}

                  {index === 0 && (
                    <p className="text-xs text-gray-500">Bu temel senaryodur (mevcut fiyatlar)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || scenarios.length < 2}
          className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          <Play size={20} />
          {loading ? 'Karşılaştırılıyor...' : `${scenarios.length} Senaryoyu Karşılaştır`}
        </button>
      </div>

      {/* Comparison Result */}
      {comparisonResult && (
        <ComparisonResultPanel result={comparisonResult} />
      )}

      {/* Feature List */}
      <div className="grid md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          title="Fiyat Duyarlılık Analizi"
          description="Yem fiyatlarındaki değişikliklerin rasyon maliyetine etkisini analiz edin"
        />
        <FeatureCard
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          title="Trade-off Görselleştirme"
          description="Maliyet vs performans, çeşitlilik vs basitlik gibi ödünleşimleri görün"
        />
        <FeatureCard
          icon={<GitCompare className="w-6 h-6 text-purple-600" />}
          title="Yan Yana Karşılaştırma"
          description="Birden fazla senaryoyu aynı anda karşılaştırın ve en iyisini seçin"
        />
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

function ComparisonResultPanel({ result }: { result: ScenarioComparisonResult }) {
  const { scenarios, recommendations } = result

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Karşılaştırma Sonuçları</h2>

      {/* Cost Comparison */}
      <div className="mb-6">
        <h3 className="font-medium mb-3">Maliyet Karşılaştırması</h3>
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <div key={scenario.scenarioId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{scenario.scenarioName}</div>
                <div className="text-sm text-gray-600">
                  {scenario.metrics.ingredientCount} yem, {scenario.metrics.foragePercent.toFixed(0)}% kaba
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{scenario.metrics.dailyCostTL.toFixed(2)} ₺</div>
                {scenario.metrics.costPerKgMilk && (
                  <div className="text-sm text-gray-600">
                    {scenario.metrics.costPerKgMilk.toFixed(2)} ₺/kg süt
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Öneriler</h3>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-3 rounded ${
                  rec.priority === 'high' ? 'bg-red-50 border border-red-200' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <p className="text-sm">{rec.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioComparisonPage
