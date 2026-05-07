import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { translateProduct } from '../../utils/productTranslations';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { calculateCAGR, forecastLinear, detectAnomalies, type YearValue } from '../../utils/livestockCalculations';
import { EXCLUDED_FULL, formatNumber, formatShort } from './livestockUtils';

interface Props {
  selectedYear: string;
  setLoading: (v: boolean) => void;
}

export default function LivestockPredictionsSection({ selectedYear, setLoading }: Props) {
  const [predictionsData, setPredictionsData] = useState<Array<{
    country: string; product: string;
    forecast: Array<{year: number; value: number}>;
    trend: string; r2: number;
  }>>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<Array<{
    country: string; product: string; year: string; type: string; zScore: number;
  }>>([]);
  const [riskAlerts, setRiskAlerts] = useState<Array<{
    country: string; product: string; decline: number;
  }>>([]);
  const [predKPIs, setPredKPIs] = useState<{
    totalForecasts: number; highConfidence: number; anomalyCount: number; riskCount: number;
    avgR2: number; upTrend: number; downTrend: number; turkeyForecasts: number;
  } | null>(null);
  const [predForecastChart, setPredForecastChart] = useState<Array<{
    year: string; actual?: number; forecast?: number; upper?: number; lower?: number;
  }>>([]);
  const [predTurkeyForecasts, setPredTurkeyForecasts] = useState<Array<{
    product: string; current: number; forecast2027: number; changePercent: number; r2: number; trend: string;
  }>>([]);
  const [predR2GrowthScatter, setPredR2GrowthScatter] = useState<Array<{
    country: string; product: string; r2: number; growth: number; volume: number;
  }>>([]);
  const [predAnomalyTimeline, setPredAnomalyTimeline] = useState<Array<{
    year: string; spikes: number; drops: number; total: number;
  }>>([]);
  const [predInsights, setPredInsights] = useState<Insight[]>([]);
  const [predSelectedCountry, setPredSelectedCountry] = useState<string>('Türkiye');

  const loadPredictionsData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = EXCLUDED_FULL;
      const currentYear = parseInt(selectedYear);

      const [prophetRes, histRes, globalYearlyRes] = await Promise.all([
        fetchQuery(`SELECT urunad, ulkead, tahmin_yil, tahmin_deger, alt_sinir, ust_sinir, trend, r2_cv, mae_cv, mape_cv FROM fao_tahmin_sonuclari WHERE veri_tipi = 'birincil' ORDER BY ulkead, urunad, tahmin_yil`),
        fetchQuery(`SELECT year, ulkead, urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year >= ${currentYear - 14} AND year <= ${currentYear} AND uretim_birim='t' AND ulkead NOT IN ${excludedAreas} AND (urunad LIKE '%Meat%' OR urunad LIKE '%Milk%' OR urunad LIKE '%Egg%') GROUP BY year, ulkead, urunad HAVING total > 10000 ORDER BY year, total DESC`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year >= ${currentYear - 14} AND year <= ${currentYear} AND uretim_birim='t' AND ulkead NOT IN ${excludedAreas} AND (urunad LIKE '%Meat%' OR urunad LIKE '%Milk%' OR urunad LIKE '%Egg%') GROUP BY year ORDER BY year`)
      ]);

      const prophetData = prophetRes.data || [];
      const hasProphet = prophetData.length > 0;

      const grouped = new Map<string, YearValue[]>();
      (histRes.data || []).forEach((item: Record<string, string | number>) => {
        const country = String(item.ulkead || '');
        const product = String(item.urunad || '');
        const key = `${country}|||${product}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push({ year: String(item.year), value: Number(item.total) || 0 });
      });

      const anomalies: Array<{ country: string; product: string; year: string; type: string; zScore: number }> = [];
      const risks: Array<{ country: string; product: string; decline: number }> = [];
      grouped.forEach((values, key) => {
        const [country, product] = key.split('|||');
        if (values.length < 10) return;
        values.sort((a, b) => parseInt(a.year) - parseInt(b.year));

        const detected = detectAnomalies(values, 2.5);
        detected.forEach(a => {
          if (a.isAnomaly) anomalies.push({ country: translateCountry(country), product, year: a.year, type: a.type, zScore: a.zScore });
        });

        const cagrResult = calculateCAGR(values);
        if (cagrResult && cagrResult.cagr < -5) {
          risks.push({ country: translateCountry(country), product, decline: cagrResult.cagr });
        }
      });

      let forecasts: Array<{ country: string; rawCountry: string; product: string; forecast: Array<{year: number; value: number}>; trend: string; r2: number; historical: YearValue[]; upperBounds: number[]; lowerBounds: number[] }> = [];

      if (hasProphet) {
        const prophetGrouped = new Map<string, { forecasts: Array<{year: number; value: number; lower: number; upper: number}>; trend: string; r2: number }>();
        prophetData.forEach((row: Record<string, string | number>) => {
          const key = `${row.ulkead}|||${row.urunad}`;
          if (!prophetGrouped.has(key)) {
            prophetGrouped.set(key, { forecasts: [], trend: String(row.trend || 'STABLE'), r2: Number(row.r2_cv) || 0 });
          }
          prophetGrouped.get(key)!.forecasts.push({
            year: Number(row.tahmin_yil), value: Number(row.tahmin_deger),
            lower: Number(row.alt_sinir), upper: Number(row.ust_sinir),
          });
        });

        prophetGrouped.forEach((data, key) => {
          const [country, product] = key.split('|||');
          const historical = grouped.get(key) || [];
          forecasts.push({
            country: translateCountry(country), rawCountry: country, product,
            forecast: data.forecasts.map(f => ({ year: f.year, value: f.value })),
            trend: data.trend, r2: data.r2,
            historical, upperBounds: data.forecasts.map(f => f.upper), lowerBounds: data.forecasts.map(f => f.lower),
          });
        });
      } else {
        grouped.forEach((values, key) => {
          const [country, product] = key.split('|||');
          if (values.length < 10) return;
          values.sort((a, b) => parseInt(a.year) - parseInt(b.year));

          const forecastResult = forecastLinear(values, 3);
          const vals = values.map(v => v.value);
          const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
          const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);

          forecasts.push({
            country: translateCountry(country), rawCountry: country, product,
            forecast: forecastResult.forecast.map(f => ({ year: parseInt(f.year), value: f.value })),
            trend: forecastResult.trend, r2: forecastResult.r2,
            historical: values,
            upperBounds: forecastResult.forecast.map(f => f.value + stdDev),
            lowerBounds: forecastResult.forecast.map(f => Math.max(0, f.value - stdDev)),
          });
        });
      }

      forecasts.sort((a, b) => b.r2 - a.r2);
      setPredictionsData(forecasts.slice(0, 50));
      setAnomalyAlerts(anomalies.slice(0, 20));
      setRiskAlerts(risks.sort((a, b) => a.decline - b.decline).slice(0, 15));

      // Global forecast chart
      const globalYearly = (globalYearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year), value: Number(d.total) || 0
      }));
      const chartData: Array<{year: string; actual?: number; forecast?: number; upper?: number; lower?: number}> = [];
      globalYearly.forEach((d: {year: string; value: number}) => {
        chartData.push({ year: d.year, actual: d.value });
      });

      if (hasProphet && forecasts.length > 0) {
        const yearTotals = new Map<number, {sum: number; lower: number; upper: number}>();
        forecasts.forEach(f => {
          f.forecast.forEach((fc, idx) => {
            if (!yearTotals.has(fc.year)) yearTotals.set(fc.year, {sum: 0, lower: 0, upper: 0});
            const yt = yearTotals.get(fc.year)!;
            yt.sum += fc.value;
            yt.lower += f.lowerBounds[idx] ?? fc.value;
            yt.upper += f.upperBounds[idx] ?? fc.value;
          });
        });
        Array.from(yearTotals.entries()).sort((a, b) => a[0] - b[0]).forEach(([year, v]) => {
          chartData.push({ year: String(year), forecast: v.sum, upper: v.upper, lower: Math.max(0, v.lower) });
        });
      } else {
        const globalForecast = forecastLinear(globalYearly, 3);
        const gVals = globalYearly.map((d: {value: number}) => d.value);
        const gMean = gVals.reduce((s: number, v: number) => s + v, 0) / (gVals.length || 1);
        const gStd = Math.sqrt(gVals.reduce((s: number, v: number) => s + (v - gMean) ** 2, 0) / (gVals.length || 1));
        globalForecast.forecast.forEach((f) => {
          chartData.push({ year: f.year, forecast: f.value, upper: f.value + gStd, lower: Math.max(0, f.value - gStd) });
        });
      }
      setPredForecastChart(chartData);

      // Turkey forecasts
      const turkeyForecasts = forecasts
        .filter(f => f.rawCountry === 'Türkiye')
        .map(f => {
          const lastVal = f.historical[f.historical.length - 1]?.value || 0;
          const fc2027 = f.forecast[f.forecast.length - 1]?.value || 0;
          return {
            product: f.product, current: lastVal, forecast2027: fc2027,
            changePercent: lastVal > 0 ? ((fc2027 - lastVal) / lastVal) * 100 : 0,
            r2: f.r2, trend: f.trend
          };
        })
        .sort((a, b) => b.current - a.current);
      setPredTurkeyForecasts(turkeyForecasts);

      // R² vs Growth
      const r2GrowthData = forecasts.slice(0, 40).map(f => {
        const lastVal = f.historical[f.historical.length - 1]?.value || 0;
        const firstVal = f.historical[0]?.value || 0;
        const growth = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
        return { country: f.country, product: f.product, r2: f.r2, growth, volume: lastVal };
      });
      setPredR2GrowthScatter(r2GrowthData);

      // Anomaly Timeline
      const tlMap = new Map<string, {spikes: number; drops: number}>();
      anomalies.forEach(a => {
        if (!tlMap.has(a.year)) tlMap.set(a.year, {spikes: 0, drops: 0});
        const e = tlMap.get(a.year)!;
        if (a.type === 'SPIKE') e.spikes++; else e.drops++;
      });
      const timeline = Array.from(tlMap.entries())
        .map(([year, v]) => ({year, spikes: v.spikes, drops: v.drops, total: v.spikes + v.drops}))
        .sort((a, b) => a.year.localeCompare(b.year));
      setPredAnomalyTimeline(timeline);

      // KPIs
      const highConf = forecasts.filter(f => f.r2 > 0.8).length;
      const upTrend = forecasts.filter(f => f.trend.includes('UP') || f.trend === 'ACCELERATING').length;
      const downTrend = forecasts.filter(f => f.trend === 'DOWN' || f.trend === 'DECLINING').length;
      const avgR2 = forecasts.length > 0 ? forecasts.reduce((s, f) => s + f.r2, 0) / forecasts.length : 0;
      setPredKPIs({
        totalForecasts: forecasts.length, highConfidence: highConf,
        anomalyCount: anomalies.length, riskCount: risks.length,
        avgR2, upTrend, downTrend, turkeyForecasts: turkeyForecasts.length
      });

      // Insights
      const modelType = hasProphet ? 'Prophet' : 'Lineer Regresyon';
      const cvLabel = hasProphet ? 'Çapraz-doğrulama R²' : 'R²';
      const ins: Insight[] = [];
      let iid = 1;
      ins.push({ id: `pr${iid++}`, type: avgR2 > 0.7 ? 'achievement' : 'info',
        message: `${forecasts.length} ${modelType} tahmin modeli. Ortalama ${cvLabel}: ${avgR2.toFixed(3)}. ${highConf} model yüksek güvenilirlikte (>${hasProphet ? 'CV ' : ''}R²>0.8).`,
        severity: 'medium', category: 'MODEL' });
      ins.push({ id: `pr${iid++}`, type: upTrend > downTrend ? 'growth' : 'decline',
        message: `Trend dağılımı: ${upTrend} yükselen, ${downTrend} düşen, ${forecasts.length - upTrend - downTrend} stabil. ${upTrend > downTrend ? 'Genel görünüm pozitif.' : 'Dikkat: düşüş trendi baskın!'}`,
        severity: downTrend > upTrend ? 'high' : 'medium', category: 'TREND' });
      if (hasProphet) {
        ins.push({ id: `pr${iid++}`, type: 'achievement',
          message: `🧠 Prophet modeli aktif: Güven bantları %%80 CI, trend kırılma noktaları otomatik tespit, çapraz-doğrulama ile gerçek performans ölçümü.`,
          severity: 'low', category: 'MODEL' });
      }
      if (turkeyForecasts.length > 0) {
        const trGrowing = turkeyForecasts.filter(t => t.changePercent > 0);
        ins.push({ id: `pr${iid++}`, type: trGrowing.length > turkeyForecasts.length / 2 ? 'growth' : 'warning',
          message: `🇹🇷 Türkiye: ${turkeyForecasts.length} üründe tahmin. ${trGrowing.length} üründe büyüme bekleniyor.${trGrowing[0] ? ` En hızlı: ${translateProduct(trGrowing[0].product)} (+%${trGrowing[0].changePercent.toFixed(1)})` : ''}`,
          severity: 'medium', category: 'TÜRKİYE' });
      }
      if (risks.length > 0) {
        ins.push({ id: `pr${iid++}`, type: 'warning',
          message: `⚠️ ${risks.length} ülke-ürün kombinasyonunda kritik düşüş (CAGR<-5%). En şiddetli: ${risks[0].country} - ${translateProduct(risks[0].product)} (%${risks[0].decline.toFixed(1)})`,
          severity: 'high', category: 'RİSK' });
      }
      if (anomalies.length > 0) {
        ins.push({ id: `pr${iid}`, type: 'info',
          message: `🔍 ${anomalies.length} anomali tespit edildi (Z>2.5). ${anomalies.filter(a => a.type === 'SPIKE').length} ani artış, ${anomalies.filter(a => a.type === 'DROP').length} ani düşüş.`,
          severity: 'medium', category: 'ANOMALİ' });
      }
      setPredInsights(ins);
    } catch (error) {
      console.error('Predictions data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, setLoading]);

  useEffect(() => {
    loadPredictionsData();
  }, [loadPredictionsData]);

  return (
    <>
      {/* Intelligence KPIs */}
      {predKPIs && (
        <div className="kpi-grid">
          <div className="kpi-card large">
            <div className="kpi-header"><span className="kpi-title">🔮 TAHMİN MODELLERİ</span></div>
            <div className="kpi-value" style={{fontSize: '1.4rem', color: 'var(--accent)'}}>{predKPIs.totalForecasts}</div>
            <div className="kpi-subtitle">Prophet / 3Y projeksiyon ({parseInt(selectedYear) + 1}-{parseInt(selectedYear) + 3})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">ORTALAMA R²</span><div className="kpi-icon" style={{background: predKPIs.avgR2 > 0.7 ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)', color: predKPIs.avgR2 > 0.7 ? '#22c55e' : '#f59e0b'}}>📐</div></div>
            <div className="kpi-value" style={{color: predKPIs.avgR2 > 0.7 ? '#22c55e' : '#f59e0b'}}>{predKPIs.avgR2.toFixed(3)}</div>
            <div className="kpi-subtitle">{predKPIs.highConfidence} yüksek güvenilir (R²&gt;0.8)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">📈 YÜKSELEN</span><div className="kpi-icon green">🚀</div></div>
            <div className="kpi-value" style={{color: '#22c55e'}}>{predKPIs.upTrend}</div>
            <div className="kpi-subtitle">Büyüme trendi</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">📉 DÜŞEN</span><div className="kpi-icon" style={{background:'rgba(239,68,68,.15)', color:'#ef4444'}}>⚠️</div></div>
            <div className="kpi-value" style={{color: '#ef4444'}}>{predKPIs.downTrend}</div>
            <div className="kpi-subtitle">Düşüş trendi</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">ANOMALİ</span><div className="kpi-icon red">⚡</div></div>
            <div className="kpi-value">{predKPIs.anomalyCount}</div>
            <div className="kpi-subtitle">Z-score &gt; 2.5</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">KRİTİK RİSK</span><div className="kpi-icon orange">🔥</div></div>
            <div className="kpi-value" style={{color: '#ef4444'}}>{predKPIs.riskCount}</div>
            <div className="kpi-subtitle">CAGR &lt; -5%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE</span></div>
            <div className="kpi-value" style={{color: '#a855f7'}}>{predKPIs.turkeyForecasts}</div>
            <div className="kpi-subtitle">Ürün tahmini</div>
          </div>
        </div>
      )}

      {/* Auto-Insights */}
      {predInsights.length > 0 && <InsightCard insights={predInsights} />}

      {/* Global Forecast Chart */}
      <div className="chart-grid" style={{marginTop: '20px'}}>
        <div className="chart-card" style={{gridColumn: 'span 2'}}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🔮 Küresel Üretim Tahmini — Prophet (Tarihçe + 3Y Projeksiyon)</h3>
            <ChartInsightButton title="Küresel Üretim Tahmini" description="Prophet modeli ile küresel üretim tahmin ve projeksiyon analizi" data={predForecastChart} context={{}} />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={predForecastChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name === 'actual' ? 'Gerçek' : name === 'forecast' ? 'Tahmin' : name === 'upper' ? 'İyimser' : 'Kötümser']}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#22c55e" fillOpacity={0.1} name="upper" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#ef4444" fillOpacity={0.1} name="lower" />
              <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2.5} name="actual" />
              <Area type="monotone" dataKey="forecast" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2.5} strokeDasharray="8 4" name="forecast" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)'}}>
            <span><span style={{display: 'inline-block', width: '12px', height: '3px', background: '#3b82f6', marginRight: '4px', verticalAlign: 'middle'}} /> Tarihçe</span>
            <span><span style={{display: 'inline-block', width: '12px', height: '3px', background: '#f59e0b', borderBottom: '2px dashed #f59e0b', marginRight: '4px', verticalAlign: 'middle'}} /> Tahmin</span>
            <span><span style={{display: 'inline-block', width: '12px', height: '8px', background: 'rgba(34,197,94,.2)', marginRight: '4px', verticalAlign: 'middle'}} /> %80 Güven Bandı</span>
          </div>
        </div>
      </div>

      {/* R² vs Growth Scatter + Anomaly Timeline */}
      <div className="chart-grid" style={{marginTop: '20px'}}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📐 Çapraz-Doğrulama R² × Büyüme Oranı</h3>
            <ChartInsightButton title="Tahmin Doğrulama: R² × Büyüme" description="Model doğruluk ve büyüme oranı scatter analizi" data={predR2GrowthScatter} context={{}} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="r2" name="R²" domain={[0, 1]} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis type="number" dataKey="growth" name="Büyüme" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <ZAxis type="number" dataKey="volume" range={[30, 300]} />
              <Tooltip
                formatter={(value: number, name: string) => [name === 'R²' ? value.toFixed(3) : `${value.toFixed(1)}%`, name]}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const d = payload[0].payload as {country: string; product: string};
                    return `${d.country} - ${translateProduct(d.product)}`;
                  }
                  return '';
                }}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}}
              />
              <Scatter name="Tahminler" data={predR2GrowthScatter} fill="#3b82f6">
                {predR2GrowthScatter.map((d, idx) => (
                  <Cell key={`r2g-${idx}`} fill={d.r2 > 0.8 ? (d.growth > 0 ? '#22c55e' : '#ef4444') : '#94a3b8'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px'}}>
            🟢 Güvenilir+Büyüme &nbsp; 🔴 Güvenilir+Düşüş &nbsp; ⚪ Düşük Güven
          </div>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>⚡ Anomali Zaman Çizelgesi</h3>
            <ChartInsightButton title="Anomali Zaman Çizelgesi" description="Yıllara göre ani artış ve düşü anomali tespitleri" data={predAnomalyTimeline} context={{}} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={predAnomalyTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <Tooltip contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
              <Bar dataKey="spikes" stackId="a" fill="#22c55e" name="Ani Artış" radius={[0, 0, 0, 0]} />
              <Bar dataKey="drops" stackId="a" fill="#ef4444" name="Ani Düşüş" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Turkey Forecast Cards */}
      {predTurkeyForecasts.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">🇹🇷 Türkiye Ürün Tahminleri ({parseInt(selectedYear) + 3})</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginTop: '12px'}}>
            {predTurkeyForecasts.slice(0, 8).map((tf, i) => {
              const isUp = tf.changePercent >= 0;
              return (
                <div key={i} style={{background: isUp ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.06)', border: `1px solid ${isUp ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`, borderRadius: '12px', padding: '14px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                    <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', maxWidth: '70%', lineHeight: 1.3}}>{translateProduct(tf.product)}</div>
                    <span style={{fontSize: '10px', fontWeight: 700, color: isUp ? '#22c55e' : '#ef4444', background: isUp ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', borderRadius: '6px', padding: '2px 8px'}}>{isUp ? '📈' : '📉'} {tf.changePercent > 0 ? '+' : ''}{tf.changePercent.toFixed(1)}%</span>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px'}}>
                    <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Mevcut</div><div style={{fontWeight: 700, fontSize: '13px'}}>{formatShort(tf.current)}</div></div>
                    <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 3}</div><div style={{fontWeight: 700, fontSize: '13px', color: isUp ? '#22c55e' : '#ef4444'}}>{formatShort(tf.forecast2027)}</div></div>
                    <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>R²</div><div style={{fontWeight: 700, fontSize: '13px', color: tf.r2 > 0.8 ? '#22c55e' : tf.r2 > 0.6 ? '#f59e0b' : '#94a3b8'}}>{tf.r2.toFixed(2)}</div></div>
                  </div>
                  <div style={{marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)'}}>
                    Trend: <span style={{fontWeight: 600, color: tf.trend === 'ACCELERATING' || tf.trend.includes('UP') || tf.trend === 'EXPONENTIAL' ? '#22c55e' : tf.trend === 'DOWN' || tf.trend === 'DECLINING' ? '#ef4444' : '#f59e0b'}}>
                    {tf.trend === 'ACCELERATING' || tf.trend === 'EXPONENTIAL' ? '🚀 Hızlanan Artış' : tf.trend.includes('UP') ? '📈 Yükselen' : tf.trend === 'DOWN' || tf.trend === 'DECLINING' ? '📉 Düşüş' : '➡️ Stabil'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Country Selector */}
      <div className="chart-card" style={{marginTop: '20px'}}>
        <h3 className="chart-title">🌐 Ülke Bazlı Tahmin Karşılaştırması</h3>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
          {['Türkiye', 'Brezilya', 'ABD', 'Hindistan', 'Çin', 'Almanya', 'Fransa', 'Rusya'].map(c => (
            <button key={c} onClick={() => setPredSelectedCountry(c)}
              style={{padding: '6px 14px', borderRadius: '8px', border: `1px solid ${predSelectedCountry === c ? 'var(--primary)' : 'var(--border)'}`, background: predSelectedCountry === c ? 'var(--primary)' : 'var(--bg-primary)', color: predSelectedCountry === c ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600}}>{c}</button>
          ))}
        </div>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ürün</th>
                <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Trend</th>
                <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>R²</th>
                <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 1}</th>
                <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 3}</th>
              </tr>
            </thead>
            <tbody>
              {predictionsData.filter(p => p.country === predSelectedCountry).slice(0, 15).map((pred, idx) => (
                <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '6px', fontWeight: 500}}>{translateProduct(pred.product)}</td>
                  <td style={{padding: '6px', textAlign: 'right'}}>
                    <span style={{fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      background: pred.trend === 'ACCELERATING' || pred.trend.includes('UP') || pred.trend === 'EXPONENTIAL' ? 'rgba(34,197,94,.15)' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)',
                      color: pred.trend === 'ACCELERATING' || pred.trend.includes('UP') || pred.trend === 'EXPONENTIAL' ? '#22c55e' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? '#ef4444' : '#f59e0b'}}>
                      {pred.trend === 'ACCELERATING' || pred.trend === 'EXPONENTIAL' ? '🚀 Hızlanan' : pred.trend.includes('UP') ? '📈 Yükselen' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? '📉 Düşüş' : '➡️ Stabil'}
                    </span>
                  </td>
                  <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: pred.r2 > 0.8 ? '#22c55e' : pred.r2 > 0.6 ? '#f59e0b' : '#94a3b8'}}>{pred.r2.toFixed(3)}</td>
                  <td style={{padding: '6px', textAlign: 'right'}}>{pred.forecast[0] ? formatShort(pred.forecast[0].value) : '-'}</td>
                  <td style={{padding: '6px', textAlign: 'right'}}>{pred.forecast[2] ? formatShort(pred.forecast[2].value) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {predictionsData.filter(p => p.country === predSelectedCountry).length === 0 && (
            <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px'}}>Bu ülke için tahmin verisi bulunamadı.</div>
          )}
        </div>
      </div>

      {/* Risk Matrix */}
      {riskAlerts.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px', background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.2)'}}>
          <h3 className="chart-title">🚨 Kritik Risk Matrisi (CAGR &lt; -5%)</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px'}}>
            {riskAlerts.slice(0, 9).map((risk, idx) => {
              const severity = risk.decline < -15 ? 'critical' : risk.decline < -10 ? 'high' : 'medium';
              const sColor = severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ef4444' : '#f97316';
              return (
                <div key={idx} style={{background: 'var(--bg-card)', border: `1px solid ${sColor}40`, borderRadius: '12px', padding: '14px', position: 'relative'}}>
                  <span style={{position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, color: sColor, background: `${sColor}15`, borderRadius: '6px', padding: '2px 8px'}}>
                    {severity === 'critical' ? '🔴 KRİTİK' : severity === 'high' ? '🟠 YÜKSEK' : '🟡 ORTA'}
                  </span>
                  <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px'}}>{risk.country}</div>
                  <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', maxWidth: '70%'}}>{translateProduct(risk.product)}</div>
                  <div style={{fontSize: '1.2rem', fontWeight: 700, color: sColor}}>%{risk.decline.toFixed(1)} CAGR</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomaly Table */}
      {anomalyAlerts.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">⚡ Anomali Tespitleri (Z-score &gt; 2.5)</h3>
          <div style={{maxHeight: '320px', overflowY: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
              <thead>
                <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                  <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ülke</th>
                  <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ürün</th>
                  <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Yıl</th>
                  <th style={{textAlign: 'center', padding: '8px 6px', color: 'var(--text-secondary)'}}>Tip</th>
                  <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Z-Score</th>
                </tr>
              </thead>
              <tbody>
                {anomalyAlerts.slice(0, 15).map((a, idx) => (
                  <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '6px'}}>{a.country}</td>
                    <td style={{padding: '6px', color: 'var(--text-secondary)'}}>{translateProduct(a.product)}</td>
                    <td style={{padding: '6px'}}>{a.year}</td>
                    <td style={{padding: '6px', textAlign: 'center'}}>
                      <span style={{fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                        background: a.type === 'SPIKE' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
                        color: a.type === 'SPIKE' ? '#22c55e' : '#ef4444'}}>
                        {a.type === 'SPIKE' ? '📈 ARTIŞ' : '📉 DÜŞÜŞ'}
                      </span>
                    </td>
                    <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: Math.abs(a.zScore) > 3 ? '#ef4444' : '#f59e0b'}}>{a.zScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Methodology */}
      <div style={{marginTop: '20px', padding: '15px', background: 'rgba(59,130,246,.08)', borderRadius: '12px', border: '1px solid rgba(59,130,246,.2)'}}>
        <div style={{fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6}}>
          💡 <strong>Tahmin Metodolojisi:</strong> Lineer regresyon modeli 15 yıllık tarihçe üzerinden çalışır. R² değeri modelin açıklayıcılığını ölçer (0-1). <br/>
          <span style={{color: '#22c55e'}}>■</span> R²&gt;0.8 = Mükemmel &nbsp; <span style={{color: '#f59e0b'}}>■</span> 0.6-0.8 = İyi &nbsp; <span style={{color: '#94a3b8'}}>■</span> &lt;0.6 = Düşük güven. Anomali: Z-score&gt;2.5 olan olağandışı değişimler.
        </div>
      </div>
    </>
  );
}
