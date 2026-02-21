/**
 * Livestock Intelligence Calculations
 * Advanced analytics for FAO livestock data
 */

export interface YearValue {
  year: string;
  value: number;
}

export interface CountryProductData {
  country: string;
  product: string;
  values: YearValue[];
}

export interface CAGRResult {
  cagr: number;
  startValue: number;
  endValue: number;
  years: number;
  trend: 'GROWTH' | 'DECLINE' | 'STABLE';
}

export interface AnomalyPoint {
  year: string;
  value: number;
  zScore: number;
  isAnomaly: boolean;
  type: 'SPIKE' | 'DROP' | 'NORMAL';
}

export interface ForecastResult {
  historical: YearValue[];
  forecast: YearValue[];
  slope: number;
  intercept: number;
  r2: number;
  trend: 'LINEAR_UP' | 'LINEAR_DOWN' | 'EXPONENTIAL' | 'PLATEAU' | 'DECLINING';
}

export interface EfficiencyMetrics {
  meatPerAnimal: number;
  milkPerAnimal: number;
  eggsPerAnimal: number;
  yieldEfficiency: number;
}

export interface HHIResult {
  hhi: number;
  concentration: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  top1Share: number;
  top3Share: number;
  top5Share: number;
  effectiveCompetitors: number;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(data: YearValue[]): CAGRResult | null {
  if (data.length < 2) return null;

  const sorted = [...data].sort((a, b) => parseInt(a.year) - parseInt(b.year));
  const startValue = sorted[0].value;
  const endValue = sorted[sorted.length - 1].value;
  const years = parseInt(sorted[sorted.length - 1].year) - parseInt(sorted[0].year);

  if (startValue === 0 || years === 0) return null;

  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;

  let trend: 'GROWTH' | 'DECLINE' | 'STABLE' = 'STABLE';
  if (cagr > 1) trend = 'GROWTH';
  else if (cagr < -1) trend = 'DECLINE';

  return {
    cagr,
    startValue,
    endValue,
    years,
    trend
  };
}

/**
 * Calculate Year-over-Year growth rate
 */
export function calculateYoY(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI) for market concentration
 * HHI = sum of squared market shares
 * < 1500: Low concentration (competitive)
 * 1500-2500: Moderate concentration
 * > 2500: High concentration (oligopoly/monopoly risk)
 */
export function calculateHHI(marketShares: number[]): HHIResult {
  const total = marketShares.reduce((sum, share) => sum + share, 0);
  if (total === 0) {
    return {
      hhi: 0,
      concentration: 'LOW',
      top1Share: 0,
      top3Share: 0,
      top5Share: 0,
      effectiveCompetitors: 0
    };
  }

  const shares = marketShares.map(s => (s / total) * 100);
  const sortedShares = [...shares].sort((a, b) => b - a);

  const hhi = shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

  let concentration: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'LOW';
  if (hhi > 5000) concentration = 'VERY_HIGH';
  else if (hhi > 2500) concentration = 'HIGH';
  else if (hhi > 1500) concentration = 'MODERATE';

  const top1Share = sortedShares[0] || 0;
  const top3Share = sortedShares.slice(0, 3).reduce((sum, s) => sum + s, 0);
  const top5Share = sortedShares.slice(0, 5).reduce((sum, s) => sum + s, 0);

  // Effective number of competitors (1/HHI in decimal form)
  const effectiveCompetitors = hhi > 0 ? 10000 / hhi : 0;

  return {
    hhi,
    concentration,
    top1Share,
    top3Share,
    top5Share,
    effectiveCompetitors
  };
}

/**
 * Detect anomalies using Z-score method
 * |Z| > 2.5 = significant anomaly
 */
export function detectAnomalies(data: YearValue[], threshold: number = 2.5): AnomalyPoint[] {
  if (data.length < 3) return data.map(d => ({
    year: d.year,
    value: d.value,
    zScore: 0,
    isAnomaly: false,
    type: 'NORMAL' as const
  }));

  const values = data.map(d => d.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return data.map(d => ({
      year: d.year,
      value: d.value,
      zScore: 0,
      isAnomaly: false,
      type: 'NORMAL' as const
    }));
  }

  return data.map(d => {
    const zScore = (d.value - mean) / stdDev;
    const isAnomaly = Math.abs(zScore) > threshold;
    const type = zScore > threshold ? 'SPIKE' : zScore < -threshold ? 'DROP' : 'NORMAL';

    return {
      year: d.year,
      value: d.value,
      zScore,
      isAnomaly,
      type
    };
  });
}

/**
 * Linear regression forecast
 * Returns predicted values for next N years
 */
export function forecastLinear(historicalData: YearValue[], yearsAhead: number = 3): ForecastResult {
  if (historicalData.length < 2) {
    return {
      historical: historicalData,
      forecast: [],
      slope: 0,
      intercept: 0,
      r2: 0,
      trend: 'PLATEAU'
    };
  }

  // Prepare data: convert years to numeric offsets
  const sorted = [...historicalData].sort((a, b) => parseInt(a.year) - parseInt(b.year));
  const startYear = parseInt(sorted[0].year);
  const n = sorted.length;

  const x = sorted.map((_, i) => i);
  const y = sorted.map(d => d.value);

  // Calculate linear regression coefficients
  const sumX = x.reduce((sum, xi) => sum + xi, 0);
  const sumY = y.reduce((sum, yi) => sum + yi, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  // Generate forecast
  const forecast: YearValue[] = [];
  for (let i = 1; i <= yearsAhead; i++) {
    const futureX = n - 1 + i;
    const futureYear = (startYear + futureX).toString();
    const futureValue = Math.max(0, slope * futureX + intercept); // No negative forecasts
    forecast.push({ year: futureYear, value: futureValue });
  }

  // Determine trend type
  const trend: ForecastResult['trend'] = (() => {
  const avgValue = sumY / n;
  const relativeSlope = (slope / avgValue) * 100; // % change per year

  if (Math.abs(relativeSlope) < 0.5) {
    return 'PLATEAU';
  } else if (slope > 0) {
    // Check if exponential by comparing last 5 years vs first 5 years growth
    if (n >= 10) {
      const firstHalf = y.slice(0, Math.floor(n / 2));
      const secondHalf = y.slice(Math.floor(n / 2));
      const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      const acceleration = (secondAvg - firstAvg) / firstAvg;
      return acceleration > 0.5 ? 'EXPONENTIAL' : 'LINEAR_UP';
    } else {
      return 'LINEAR_UP';
    }
  } else {
    return 'DECLINING';
  }
  })();

  return {
    historical: sorted,
    forecast,
    slope,
    intercept,
    r2,
    trend
  };
}

/**
 * Calculate volatility (coefficient of variation)
 * CV = (stdDev / mean) * 100
 */
export function calculateVolatility(data: YearValue[]): number {
  if (data.length < 2) return 0;

  const values = data.map(d => d.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  if (mean === 0) return 0;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return (stdDev / mean) * 100;
}

/**
 * Calculate production efficiency metrics
 */
export function calculateEfficiency(
  production: number,
  stockCount: number,
  productType: 'meat' | 'milk' | 'eggs'
): number {
  if (stockCount === 0) return 0;

  const efficiency = production / stockCount;

  // Normalize to per-animal-per-year basis
  switch (productType) {
    case 'meat':
      return efficiency; // kg per animal
    case 'milk':
      return efficiency; // liters per animal
    case 'eggs':
      return efficiency; // eggs per chicken
    default:
      return efficiency;
  }
}

/**
 * Find top movers (countries with highest growth)
 */
export interface TopMover {
  country: string;
  growth: number;
  startValue: number;
  endValue: number;
  'type': 'RISING_STAR' | 'FALLING_KNIFE';
}

export function findTopMovers(
  countryData: Array<{ country: string; yearValues: YearValue[] }>,
  limit: number = 5
): { risers: TopMover[]; fallers: TopMover[] } {
  const movers = countryData
    .map(cd => {
      const cagr = calculateCAGR(cd.yearValues);
      if (!cagr || cd.yearValues.length < 2) return null;

      return {
        country: cd.country,
        growth: cagr.cagr,
        startValue: cagr.startValue,
        endValue: cagr.endValue,
        type: cagr.cagr > 0 ? 'RISING_STAR' : 'FALLING_KNIFE'
      } as TopMover;
    })
    .filter((m): m is TopMover => m !== null);

  const risers = movers
    .filter(m => m.type === 'RISING_STAR')
    .sort((a, b) => b.growth - a.growth)
    .slice(0, limit);

  const fallers = movers
    .filter(m => m.type === 'FALLING_KNIFE')
    .sort((a, b) => a.growth - b.growth)
    .slice(0, limit);

  return { risers, fallers };
}

/**
 * Calculate self-sufficiency ratio (Production / Consumption)
 * In absence of consumption data, use production/population proxy
 */
export function calculateSelfSufficiency(
  production: number,
  consumption: number
): number {
  if (consumption === 0) return 0;
  return (production / consumption) * 100;
}

/**
 * Generate percentile rankings
 */
export function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 0;
  
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  
  if (index === -1) return 100;
  
  return (index / sorted.length) * 100;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatMetric(value: number, decimals: number = 1): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}
