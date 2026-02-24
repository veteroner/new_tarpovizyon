/**
 * Resource Intelligence Calculations
 * Cross-data analytics for FAO resource & environment data
 */

import type { YearValue } from './livestockCalculations';
import { calculateCAGR, calculateHHI, calculateVolatility, forecastLinear, detectAnomalies, calculateYoY } from './livestockCalculations';

// Re-export for convenience
export { calculateCAGR, calculateHHI, calculateVolatility, forecastLinear, detectAnomalies, calculateYoY };
export type { YearValue };

// ─── TYPES ──────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'positive' | 'info';

export interface IntelligenceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

export interface BenchmarkResult {
  country: string;
  value: number;
  worldAvg: number;
  percentile: number;
  rank: number;
  totalCountries: number;
  gapPercent: number; // positive = above average, negative = below
  rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
}

export interface TrendAnalysis {
  cagr: number;
  direction: 'up' | 'down' | 'stable';
  acceleration: number; // change in growth rate
  volatility: number;
  anomalyCount: number;
  forecast3y: number;
  r2: number;
}

export interface CountryScore {
  country: string;
  score: number; // 0-100
  components: Record<string, number>;
  rank: number;
  percentile: number;
}

export interface CorrelationResult {
  r: number;
  rSquared: number;
  strength: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
  xLabel: string;
  yLabel: string;
  dataPoints: { x: number; y: number; label: string }[];
  slope: number;
  intercept: number;
}

export interface SelfSufficiencyResult {
  score: number; // 0-200+ (100 = fully sufficient)
  rating: 'surplus' | 'sufficient' | 'dependent' | 'critical';
  importDependency: number; // %
  exportStrength: number; // %
  netBalance: number;
}

// ─── CORE CALCULATIONS ──────────────────────────────────────

/**
 * Pearson correlation coefficient between two datasets
 */
export function calculateCorrelation(
  xValues: number[],
  yValues: number[],
  xLabel: string = 'X',
  yLabel: string = 'Y',
  labels?: string[]
): CorrelationResult | null {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 3) return null;

  const x = xValues.slice(0, n);
  const y = yValues.slice(0, n);

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const sumY2 = y.reduce((s, v) => s + v * v, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return null;

  const r = numerator / denominator;
  const rSquared = r * r;

  // Linear regression
  const slope = numerator / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  let strength: CorrelationResult['strength'] = 'weak';
  if (r > 0.7) strength = 'strong_positive';
  else if (r > 0.4) strength = 'moderate_positive';
  else if (r < -0.7) strength = 'strong_negative';
  else if (r < -0.4) strength = 'moderate_negative';

  const dataPoints = x.map((xv, i) => ({
    x: xv,
    y: y[i],
    label: labels?.[i] || `#${i + 1}`
  }));

  return { r, rSquared, strength, xLabel, yLabel, dataPoints, slope, intercept };
}

/**
 * Calculate Self-Sufficiency and Import Dependency
 */
export function calculateSelfSufficiencyScore(
  production: number,
  imports: number,
  exports: number
): SelfSufficiencyResult {
  const consumption = production + imports - exports;
  const score = consumption > 0 ? (production / consumption) * 100 : 0;
  const importDependency = consumption > 0 ? (imports / consumption) * 100 : 0;
  const exportStrength = production > 0 ? (exports / production) * 100 : 0;
  const netBalance = exports - imports;

  let rating: SelfSufficiencyResult['rating'];
  if (score >= 100) rating = 'surplus';
  else if (score >= 80) rating = 'sufficient';
  else if (score >= 50) rating = 'dependent';
  else rating = 'critical';

  return { score, rating, importDependency, exportStrength, netBalance };
}

/**
 * Comprehensive trend analysis for a time series
 */
export function analyzeTrend(data: YearValue[]): TrendAnalysis | null {
  if (data.length < 3) return null;

  const cagr = calculateCAGR(data);
  const volatility = calculateVolatility(data);
  const anomalies = detectAnomalies(data, 2.0);
  const forecast = forecastLinear(data, 3);

  // Calculate acceleration (change in growth rate)
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);
  const firstCAGR = calculateCAGR(firstHalf);
  const secondCAGR = calculateCAGR(secondHalf);
  const acceleration = (secondCAGR?.cagr ?? 0) - (firstCAGR?.cagr ?? 0);

  const direction: 'up' | 'down' | 'stable' = 
    (cagr?.cagr ?? 0) > 1 ? 'up' : (cagr?.cagr ?? 0) < -1 ? 'down' : 'stable';

  return {
    cagr: cagr?.cagr ?? 0,
    direction,
    acceleration,
    volatility,
    anomalyCount: anomalies.filter(a => a.isAnomaly).length,
    forecast3y: forecast.forecast[forecast.forecast.length - 1]?.value ?? 0,
    r2: forecast.r2
  };
}

/**
 * Benchmark a country against all countries
 */
export function benchmarkCountry(
  targetCountry: string,
  allCountryValues: { country: string; value: number }[]
): BenchmarkResult | null {
  if (allCountryValues.length === 0) return null;

  const sorted = [...allCountryValues].sort((a, b) => b.value - a.value);
  const targetIdx = sorted.findIndex(c => c.country === targetCountry);
  if (targetIdx === -1) return null;

  const targetValue = sorted[targetIdx].value;
  const values = sorted.map(c => c.value);
  const worldAvg = values.reduce((s, v) => s + v, 0) / values.length;
  const gapPercent = worldAvg > 0 ? ((targetValue - worldAvg) / worldAvg) * 100 : 0;
  const rank = targetIdx + 1;
  const percentile = ((sorted.length - rank) / sorted.length) * 100;

  let rating: BenchmarkResult['rating'];
  if (percentile >= 90) rating = 'excellent';
  else if (percentile >= 70) rating = 'good';
  else if (percentile >= 40) rating = 'average';
  else if (percentile >= 20) rating = 'below_average';
  else rating = 'poor';

  return {
    country: targetCountry,
    value: targetValue,
    worldAvg,
    percentile,
    rank,
    totalCountries: sorted.length,
    gapPercent,
    rating
  };
}

/**
 * Generate intelligence alerts from data patterns
 */
export function generateAlerts(params: {
  turkeyValue?: number;
  worldAvg?: number;
  trend?: TrendAnalysis;
  benchmark?: BenchmarkResult;
  label: string;
  unit?: string;
}): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];
  const { turkeyValue, worldAvg, trend, benchmark, label, unit = '' } = params;

  // Trend-based alerts
  if (trend) {
    if (trend.cagr < -3) {
      alerts.push({
        id: `alert-decline-${label}`,
        severity: 'critical',
        title: `${label} Hızla Azalıyor`,
        message: `Yıllık %${Math.abs(trend.cagr).toFixed(1)} oranında düşüş. ${trend.acceleration < -1 ? 'Düşüş hızlanıyor!' : ''}`,
        metric: 'CAGR',
        value: trend.cagr
      });
    } else if (trend.cagr < -1) {
      alerts.push({
        id: `alert-decline-${label}`,
        severity: 'warning',
        title: `${label} Azalma Eğiliminde`,
        message: `Son dönemde yıllık %${Math.abs(trend.cagr).toFixed(1)} azalma trendi`,
        metric: 'CAGR',
        value: trend.cagr
      });
    } else if (trend.cagr > 5) {
      alerts.push({
        id: `alert-growth-${label}`,
        severity: 'positive',
        title: `${label} Güçlü Büyüme`,
        message: `Yıllık %${trend.cagr.toFixed(1)} oranında artış`,
        metric: 'CAGR',
        value: trend.cagr
      });
    }

    if (trend.volatility > 20) {
      alerts.push({
        id: `alert-volatility-${label}`,
        severity: 'warning',
        title: `${label} Yüksek Dalgalanma`,
        message: `Volatilite %${trend.volatility.toFixed(1)} — istikrarsız gidiş`,
        metric: 'CV',
        value: trend.volatility
      });
    }

    if (trend.anomalyCount > 0) {
      alerts.push({
        id: `alert-anomaly-${label}`,
        severity: 'info',
        title: `${trend.anomalyCount} Anomali Tespit Edildi`,
        message: `${label} verisinde ${trend.anomalyCount} istatistiksel anomali (z>2.0)`,
        value: trend.anomalyCount
      });
    }
  }

  // Benchmark alerts
  if (benchmark) {
    if (benchmark.rating === 'excellent') {
      alerts.push({
        id: `alert-bench-${label}`,
        severity: 'positive',
        title: `Türkiye ${label} — Dünya Lider Grubu`,
        message: `${benchmark.rank}/${benchmark.totalCountries} ülke arasında, üst %${(100 - benchmark.percentile).toFixed(0)} dilimde`,
        value: benchmark.rank
      });
    } else if (benchmark.rating === 'poor') {
      alerts.push({
        id: `alert-bench-${label}`,
        severity: 'critical',
        title: `Türkiye ${label} — Kritik Düşük`,
        message: `${benchmark.rank}/${benchmark.totalCountries} sırada. Dünya ortalamasının %${Math.abs(benchmark.gapPercent).toFixed(0)} altında`,
        value: benchmark.rank
      });
    }
  }

  // Value vs world avg
  if (turkeyValue !== undefined && worldAvg !== undefined && worldAvg > 0) {
    const gap = ((turkeyValue - worldAvg) / worldAvg) * 100;
    if (gap < -30) {
      alerts.push({
        id: `alert-gap-${label}`,
        severity: 'warning',
        title: `${label} Dünya Ortalamasının Çok Altında`,
        message: `Türkiye: ${turkeyValue.toFixed(1)}${unit} vs Dünya: ${worldAvg.toFixed(1)}${unit} (%${Math.abs(gap).toFixed(0)} fark)`,
        value: gap
      });
    } else if (gap > 30) {
      alerts.push({
        id: `alert-gap-${label}`,
        severity: 'positive',
        title: `${label} Dünya Ortalamasının Üstünde`,
        message: `Türkiye: ${turkeyValue.toFixed(1)}${unit} vs Dünya: ${worldAvg.toFixed(1)}${unit} (+%${gap.toFixed(0)})`,
        value: gap
      });
    }
  }

  return alerts;
}

/**
 * Calculate land productivity (production per ha)
 */
export function calculateLandProductivity(
  production: number,
  landArea: number
): number {
  if (landArea === 0) return 0;
  return production / landArea;
}

/**
 * Calculate per-capita metric
 */
export function calculatePerCapita(
  value: number,
  population: number
): number {
  if (population === 0) return 0;
  return value / population;
}

/**
 * Score normalizer (0-100 scale)
 */
export function normalizeScore(
  value: number,
  minVal: number,
  maxVal: number
): number {
  if (maxVal === minVal) return 50;
  const score = ((value - minVal) / (maxVal - minVal)) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Composite country score from multiple dimensions
 */
export function calculateCompositeScore(
  dimensions: { name: string; value: number; weight: number; allValues: number[] }[]
): { score: number; components: Record<string, number> } {
  let totalWeight = 0;
  let weightedSum = 0;
  const components: Record<string, number> = {};

  for (const dim of dimensions) {
    const min = Math.min(...dim.allValues);
    const max = Math.max(...dim.allValues);
    const normalized = normalizeScore(dim.value, min, max);
    components[dim.name] = normalized;
    weightedSum += normalized * dim.weight;
    totalWeight += dim.weight;
  }

  return {
    score: totalWeight > 0 ? weightedSum / totalWeight : 0,
    components
  };
}

/**
 * Format a score value with color coding context
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Mükemmel';
  if (score >= 60) return 'İyi';
  if (score >= 40) return 'Orta';
  if (score >= 20) return 'Düşük';
  return 'Kritik';
}

/**
 * Calculate change between two periods for multiple metrics
 */
export function calculatePeriodChange(
  currentValues: Record<string, number>,
  previousValues: Record<string, number>
): Record<string, { current: number; previous: number; change: number; changePercent: number }> {
  const result: Record<string, { current: number; previous: number; change: number; changePercent: number }> = {};
  
  for (const key of Object.keys(currentValues)) {
    const current = currentValues[key] || 0;
    const previous = previousValues[key] || 0;
    const change = current - previous;
    const changePercent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    result[key] = { current, previous, change, changePercent };
  }

  return result;
}

// ─── EXCLUDED AREAS (shared constant) ───────────────────────

export const EXCLUDED_AREAS = "('World','WORLD','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
