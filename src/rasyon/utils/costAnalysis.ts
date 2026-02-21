/**
 * Gelişmiş Maliyet Analizi
 * 
 * Sadece yem maliyeti değil, toplam üretim maliyeti tahmini sağlar.
 * Literatür ve benchmark veriler kullanılarak hesaplanır.
 */

import type { AnimalProfile, CostSummary } from '@/types'

/**
 * Toplam Üretim Maliyeti Bileşenleri (Benchmarklar)
 * Kaynak: Türkiye Süt Sığırcılığı Sektör Analizi 2023-2024
 */
interface ProductionCostBreakdown {
  feedCostPercent: number // Yem maliyetinin toplam içindeki payı
  laborCostPercent: number // İşçilik
  energyCostPercent: number // Enerji (elektrik, yakıt)
  healthCostPercent: number // Veteriner, ilaç
  depreciationPercent: number // Amortisman
  otherCostPercent: number // Diğer (su, bakım, sigorta)
}

/**
 * Üretim tiplerine göre maliyet dağılımı
 */
const COST_BENCHMARKS: Record<string, ProductionCostBreakdown> = {
  'dairy-intensive': {
    feedCostPercent: 65, // Yoğun süt üretiminde yem maliyeti dominant
    laborCostPercent: 12,
    energyCostPercent: 8,
    healthCostPercent: 5,
    depreciationPercent: 7,
    otherCostPercent: 3,
  },
  'dairy-extensive': {
    feedCostPercent: 55, // Ekstansif sistemde yem payı daha düşük
    laborCostPercent: 18,
    energyCostPercent: 6,
    healthCostPercent: 6,
    depreciationPercent: 9,
    otherCostPercent: 6,
  },
  beef: {
    feedCostPercent: 70, // Besi'de yem maliyeti çok yüksek
    laborCostPercent: 10,
    energyCostPercent: 5,
    healthCostPercent: 4,
    depreciationPercent: 7,
    otherCostPercent: 4,
  },
  grower: {
    feedCostPercent: 60, // Genç hayvan gelişimi
    laborCostPercent: 15,
    energyCostPercent: 7,
    healthCostPercent: 6,
    depreciationPercent: 8,
    otherCostPercent: 4,
  },
}

/**
 * Profil bazında uygun benchmark seçimi
 */
function selectBenchmark(profile: AnimalProfile): ProductionCostBreakdown {
  if (profile.purpose === 'dairy') {
    // Yüksek verimli süt sığırı → intensive
    const isIntensive = (profile.milkYieldKgPerDay ?? 0) > 25
    return COST_BENCHMARKS[isIntensive ? 'dairy-intensive' : 'dairy-extensive']
  }

  if (profile.purpose === 'beef') {
    return COST_BENCHMARKS.beef
  }

  return COST_BENCHMARKS.grower
}

/**
 * Gelişmiş maliyet analizi hesapla
 */
export interface EnhancedCostAnalysis extends CostSummary {
  breakdown: {
    feedCostTL: number
    laborCostTL: number
    energyCostTL: number
    healthCostTL: number
    depreciationCostTL: number
    otherCostTL: number
  }
  totalDailyCostTL: number
  totalMonthlyCostTL: number
  feedCostRatio: number // Yem maliyetinin toplam içindeki oranı
  benchmarkSource: string
}

export function calculateEnhancedCost(
  dailyFeedCostTL: number,
  profile: AnimalProfile
): EnhancedCostAnalysis {
  const benchmark = selectBenchmark(profile)

  // Yem maliyeti toplam maliyetin X%'si ise, toplam maliyet = yem maliyeti / (X/100)
  const totalDailyCostTL = dailyFeedCostTL / (benchmark.feedCostPercent / 100)

  const breakdown = {
    feedCostTL: dailyFeedCostTL,
    laborCostTL: totalDailyCostTL * (benchmark.laborCostPercent / 100),
    energyCostTL: totalDailyCostTL * (benchmark.energyCostPercent / 100),
    healthCostTL: totalDailyCostTL * (benchmark.healthCostPercent / 100),
    depreciationCostTL: totalDailyCostTL * (benchmark.depreciationPercent / 100),
    otherCostTL: totalDailyCostTL * (benchmark.otherCostPercent / 100),
  }

  const totalMonthlyCostTL = totalDailyCostTL * 30

  // Süt başına maliyet (varsa)
  let costPerKgMilk: number | undefined
  if (profile.milkYieldKgPerDay && profile.milkYieldKgPerDay > 0) {
    costPerKgMilk = totalDailyCostTL / profile.milkYieldKgPerDay
  }

  // Canlı ağırlık artışı başına maliyet (varsa)
  let costPerKgGain: number | undefined
  if (profile.targetAdgKgPerDay && profile.targetAdgKgPerDay > 0) {
    costPerKgGain = totalDailyCostTL / profile.targetAdgKgPerDay
  }

  const benchmarkName = 
    profile.purpose === 'dairy' && (profile.milkYieldKgPerDay ?? 0) > 25
      ? 'Yoğun Süt Üretimi'
      : profile.purpose === 'dairy'
        ? 'Ekstansif Süt Üretimi'
        : profile.purpose === 'beef'
          ? 'Besi'
          : 'Genç Hayvan Gelişimi'

  return {
    dailyFeedCostTL,
    costPerKgMilk,
    costPerKgGain,
    monthlyCostTL: dailyFeedCostTL * 30,
    breakdown,
    totalDailyCostTL,
    totalMonthlyCostTL,
    feedCostRatio: benchmark.feedCostPercent / 100,
    benchmarkSource: `${benchmarkName} Benchmark`,
  }
}

/**
 * Maliyet breakdown'ını formatla
 */
export function formatCostBreakdown(analysis: EnhancedCostAnalysis): string {
  const lines: string[] = []
  lines.push(`📊 Toplam Günlük Maliyet: ${analysis.totalDailyCostTL.toFixed(2)} TL`)
  lines.push(`📅 Toplam Aylık Maliyet: ${analysis.totalMonthlyCostTL.toFixed(2)} TL`)
  lines.push('')
  lines.push('Maliyet Dağılımı:')
  lines.push(`  • Yem: ${analysis.breakdown.feedCostTL.toFixed(2)} TL (${(analysis.feedCostRatio * 100).toFixed(0)}%)`)
  lines.push(`  • İşçilik: ${analysis.breakdown.laborCostTL.toFixed(2)} TL`)
  lines.push(`  • Enerji: ${analysis.breakdown.energyCostTL.toFixed(2)} TL`)
  lines.push(`  • Sağlık: ${analysis.breakdown.healthCostTL.toFixed(2)} TL`)
  lines.push(`  • Amortisman: ${analysis.breakdown.depreciationCostTL.toFixed(2)} TL`)
  lines.push(`  • Diğer: ${analysis.breakdown.otherCostTL.toFixed(2)} TL`)
  lines.push('')
  lines.push(`Kaynak: ${analysis.benchmarkSource}`)

  if (analysis.costPerKgMilk) {
    lines.push(`Süt Maliyeti: ${analysis.costPerKgMilk.toFixed(2)} TL/kg`)
  }

  if (analysis.costPerKgGain) {
    lines.push(`Büyüme Maliyeti: ${analysis.costPerKgGain.toFixed(2)} TL/kg CA artışı`)
  }

  return lines.join('\n')
}
