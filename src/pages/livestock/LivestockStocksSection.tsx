import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { fetchQuery } from '../../services/api';
import ProductSelector from '../../components/ProductSelector';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { calculateCAGR, calculateHHI } from '../../utils/livestockCalculations';
import { COLORS, ANIMAL_ITEMS, EXCLUDED_FULL, type DataItem, formatNumber, formatShort } from './livestockUtils';

interface Props {
  selectedYear: string;
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
  setLoading: (v: boolean) => void;
}

export default function LivestockStocksSection({ selectedYear, selectedItems, setSelectedItems, setLoading }: Props) {
  const [stocksData, setStocksData] = useState<DataItem[]>([]);
  const [stocksCountryData, setStocksCountryData] = useState<DataItem[]>([]);
  const [, setStocksYearlyData] = useState<DataItem[]>([]);
  const [stocksKPIs, setStocksKPIs] = useState<{
    totalStock: number; countryCount: number; speciesCount: number;
    turkeyRankGlobal: number; turkeyTotal: number;
    globalCAGR5: number; globalCAGR10: number;
    turkeyCAGR5: number; topGrower: string; topGrowerCAGR: number;
    hhi: number;
  } | null>(null);
  const [stocksAnimalCAGR, setStocksAnimalCAGR] = useState<Array<{
    animal: string; cagr5: number; cagr10: number; current: number;
    trend: 'surge' | 'growth' | 'stable' | 'decline' | 'collapse';
  }>>([]);
  const [stocksCountryCAGR, setStocksCountryCAGR] = useState<Array<{
    country: string; total: number; cagr5: number; share: number;
  }>>([]);
  const [stocksDeepTrend, setStocksDeepTrend] = useState<Array<{
    year: string; total: number; [key: string]: string | number;
  }>>([]);
  const [stocksRiskAlerts, setStocksRiskAlerts] = useState<Array<{
    animal: string; country: string; decline10: number; type: 'collapse' | 'sharp_decline' | 'anomaly_surge';
  }>>([]);
  const [stocksTurkeyProfile, setStocksTurkeyProfile] = useState<Array<{
    animal: string; count: number; rank: number; share: number; cagr5: number;
  }>>([]);
  const [stocksInsights, setStocksInsights] = useState<Insight[]>([]);

  const loadStocksData = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    try {
      const EXCLUDED = EXCLUDED_FULL;
      const SV = "CASE WHEN miktar_birim='1000 An' THEN CAST(miktar_deger AS DECIMAL(20,2))*1000 ELSE CAST(miktar_deger AS DECIMAL(20,2)) END";
      const selNames = selectedItems.map(id => ANIMAL_ITEMS.find(a => a.id === id)?.name).filter((v): v is string => Boolean(v));
      const itemList = selNames.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
      if (!itemList) { setStocksData([]); setStocksCountryData([]); setStocksYearlyData([]); return; }
      const yr = parseInt(selectedYear);

      const [animalRes, countryAllRes, yearlyRes, turkeyRes, animalYearRes, countryCAGRRes, deepTrendRes, riskRes] = await Promise.all([
        fetchQuery(`SELECT urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${selectedYear}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad ORDER BY toplam DESC`),
        fetchQuery(`SELECT ulkead, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${selectedYear}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead ORDER BY toplam DESC`),
        fetchQuery(`SELECT year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE ulkead='Türkiye' AND urunad IN (${itemList}) AND year IN ('${yr}','${yr-5}','${yr-10}') GROUP BY urunad, year`),
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}','${yr-10}') GROUP BY urunad, year`),
        fetchQuery(`SELECT ulkead, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY ulkead, year ORDER BY ulkead`),
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad, year ORDER BY year, urunad`),
        fetchQuery(`SELECT a.ulkead, a.urunad, a.toplam as current_val, b.toplam as old_val FROM (SELECT ulkead, urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${yr}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead, urunad HAVING toplam > 100000) a JOIN (SELECT ulkead, urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${yr-10}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead, urunad HAVING toplam > 100000) b ON a.ulkead=b.ulkead AND a.urunad=b.urunad WHERE (a.toplam - b.toplam)/b.toplam < -0.2 OR (a.toplam - b.toplam)/b.toplam > 1.0 ORDER BY (a.toplam - b.toplam)/b.toplam ASC LIMIT 30`)
      ]);

      if (animalRes.data) {
        setStocksData(animalRes.data.map((item: Record<string, string | number>, index: number) => ({
          name: String(item.urunad || ''), value: Number(item.toplam) || 0, fill: COLORS[index % COLORS.length]
        })));
      }

      const allCountries = (countryAllRes.data || []).map((item: Record<string, string | number>) => ({
        area: String(item.ulkead || ''), name: translateCountry(String(item.ulkead || '')),
        value: Number(item.toplam) || 0
      }));
      const globalTotal = allCountries.reduce((s: number, c: {value: number}) => s + c.value, 0);
      const top20Display = allCountries.slice(0, 20).map((c: {area: string; name: string; value: number}, i: number) => ({
        ...c, share: ((c.value / globalTotal) * 100).toFixed(1), fill: COLORS[i % COLORS.length]
      }));
      setStocksCountryData(top20Display);

      const trIdx = allCountries.findIndex((c: {area: string}) => c.area === 'Türkiye');
      const trTotal = trIdx >= 0 ? allCountries[trIdx].value : 0;
      const shares = allCountries.map((c: {value: number}) => c.value);
      const hhiResult = calculateHHI(shares);

      const yearlyArr = (yearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year || ''), value: Number(d.toplam) || 0
      }));
      setStocksYearlyData(yearlyArr.slice(-20));

      const latestYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr));
      const fiveAgoVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 5));
      const tenAgoVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 10));
      const globalCAGR5 = latestYearVal && fiveAgoVal && fiveAgoVal.value > 0
        ? (Math.pow(latestYearVal.value / fiveAgoVal.value, 1 / 5) - 1) * 100 : 0;
      const globalCAGR10 = latestYearVal && tenAgoVal && tenAgoVal.value > 0
        ? (Math.pow(latestYearVal.value / tenAgoVal.value, 1 / 10) - 1) * 100 : 0;

      const animalYearMap = new Map<string, Map<string, number>>();
      (animalYearRes.data || []).forEach((d: Record<string, string | number>) => {
        const name = String(d.urunad);
        if (!animalYearMap.has(name)) animalYearMap.set(name, new Map());
        animalYearMap.get(name)!.set(String(d.year), Number(d.toplam) || 0);
      });
      const animalCAGRArr = Array.from(animalYearMap.entries()).map(([animal, yrs]) => {
        const cur = yrs.get(String(yr)) || 0;
        const y5 = yrs.get(String(yr - 5)) || 0;
        const y10 = yrs.get(String(yr - 10)) || 0;
        const cagr5 = y5 > 0 ? (Math.pow(cur / y5, 1 / 5) - 1) * 100 : 0;
        const cagr10 = y10 > 0 ? (Math.pow(cur / y10, 1 / 10) - 1) * 100 : 0;
        const trend: 'surge' | 'growth' | 'stable' | 'decline' | 'collapse' =
          cagr5 > 5 ? 'surge' : cagr5 > 1 ? 'growth' : cagr5 > -1 ? 'stable' : cagr5 > -5 ? 'decline' : 'collapse';
        return { animal, cagr5, cagr10, current: cur, trend };
      }).sort((a, b) => b.current - a.current);
      setStocksAnimalCAGR(animalCAGRArr);

      const trAnimalMap = new Map<string, Map<string, number>>();
      (turkeyRes.data || []).forEach((d: Record<string, string | number>) => {
        const name = String(d.urunad);
        if (!trAnimalMap.has(name)) trAnimalMap.set(name, new Map());
        trAnimalMap.get(name)!.set(String(d.year), Number(d.toplam) || 0);
      });
      const trProfile = selNames.map(animal => {
        const trYrs = trAnimalMap.get(animal);
        const trCur = trYrs?.get(String(yr)) || 0;
        const trY5 = trYrs?.get(String(yr - 5)) || 0;
        const trCagr5 = trY5 > 0 ? (Math.pow(trCur / trY5, 1 / 5) - 1) * 100 : 0;
        const animalTotal = animalYearMap.get(animal)?.get(String(yr)) || 1;
        const share = (trCur / animalTotal) * 100;
        return { animal, count: trCur, rank: 0, share, cagr5: trCagr5 };
      }).filter(p => p.count > 0).sort((a, b) => b.count - a.count);
      setStocksTurkeyProfile(trProfile);

      const countryCAGRMap = new Map<string, {cur: number; old: number}>();
      (countryCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const c = String(d.ulkead);
        const y = String(d.year);
        if (!countryCAGRMap.has(c)) countryCAGRMap.set(c, { cur: 0, old: 0 });
        const entry = countryCAGRMap.get(c)!;
        if (y === String(yr)) entry.cur = Number(d.toplam) || 0;
        else entry.old = Number(d.toplam) || 0;
      });
      const countryCAGRArr = Array.from(countryCAGRMap.entries())
        .filter(([, v]) => v.cur > 0 && v.old > 0)
        .map(([country, v]) => ({
          country: translateCountry(country),
          total: v.cur,
          cagr5: (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100,
          share: (v.cur / globalTotal) * 100
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 30);
      setStocksCountryCAGR(countryCAGRArr);

      const significantGrowers = countryCAGRArr.filter(c => c.share > 0.5).sort((a, b) => b.cagr5 - a.cagr5);
      const topGrower = significantGrowers[0];

      const trCAGREntry = countryCAGRMap.get('Türkiye');
      const turkeyCAGR5 = trCAGREntry && trCAGREntry.old > 0
        ? (Math.pow(trCAGREntry.cur / trCAGREntry.old, 1 / 5) - 1) * 100 : 0;

      setStocksKPIs({
        totalStock: globalTotal,
        countryCount: allCountries.length,
        speciesCount: (animalRes.data || []).length,
        turkeyRankGlobal: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: trTotal,
        globalCAGR5,
        globalCAGR10,
        turkeyCAGR5,
        topGrower: topGrower?.country || '-',
        topGrowerCAGR: topGrower?.cagr5 || 0,
        hhi: hhiResult.hhi
      });

      const deepMap = new Map<string, Map<string, number>>();
      (deepTrendRes.data || []).forEach((d: Record<string, string | number>) => {
        const y = String(d.year);
        const a = String(d.urunad);
        if (!deepMap.has(y)) deepMap.set(y, new Map());
        deepMap.get(y)!.set(a, Number(d.toplam) || 0);
      });
      const deepArr = Array.from(deepMap.entries()).map(([year, animals]) => {
        const row: Record<string, string | number> = { year, total: 0 };
        let tot = 0;
        animals.forEach((v, k) => { row[k] = v; tot += v; });
        row.total = tot;
        return row as { year: string; total: number; [key: string]: string | number };
      }).sort((a, b) => String(a.year).localeCompare(String(b.year)));
      setStocksDeepTrend(deepArr);

      const risks = (riskRes.data || []).map((d: Record<string, string | number>) => {
        const cur = Number(d.current_val) || 0;
        const old = Number(d.old_val) || 0;
        const change = old > 0 ? ((cur - old) / old) * 100 : 0;
        let type: 'collapse' | 'sharp_decline' | 'anomaly_surge' = 'sharp_decline';
        if (change < -50) type = 'collapse';
        else if (change > 100) type = 'anomaly_surge';
        return {
          animal: String(d.urunad),
          country: translateCountry(String(d.ulkead)),
          decline10: change,
          type
        };
      });
      setStocksRiskAlerts(risks);

      // Auto-generate insights
      const insArr: Insight[] = [];
      let iid = 1;
      if (globalCAGR5 > 1) {
        insArr.push({ id: `si${iid++}`, type: 'growth', message: `Küresel hayvan stoku 5 yılda yıllık %${globalCAGR5.toFixed(1)} büyüyor. Toplam ${formatNumber(globalTotal)} baş hayvan mevcut.`, severity: 'medium', category: 'TREND' });
      } else if (globalCAGR5 < -1) {
        insArr.push({ id: `si${iid++}`, type: 'decline', message: `Küresel stok 5 yılda yıllık %${Math.abs(globalCAGR5).toFixed(1)} azalıyor! ${formatNumber(globalTotal)} baş seviyesine geriledi.`, severity: 'high', category: 'TREND' });
      }
      if (trIdx >= 0) {
        insArr.push({ id: `si${iid++}`, type: turkeyCAGR5 > 0 ? 'achievement' : 'warning',
          message: `Türkiye dünya ${trIdx + 1}. sırada (${formatNumber(trTotal)} baş, pay %${((trTotal / globalTotal) * 100).toFixed(1)}). 5Y BBO: %${turkeyCAGR5.toFixed(1)}`,
          severity: turkeyCAGR5 < 0 ? 'high' : 'medium', category: 'TÜRKİYE' });
      }
      const topGrowAnimal = [...animalCAGRArr].sort((a, b) => b.cagr5 - a.cagr5)[0];
      if (topGrowAnimal && topGrowAnimal.cagr5 > 1) {
        insArr.push({ id: `si${iid++}`, type: 'growth', message: `En hızlı büyüyen tür: ${topGrowAnimal.animal} (5Y BBO %${topGrowAnimal.cagr5.toFixed(1)}). Mevcut stok: ${formatNumber(topGrowAnimal.current)}`, severity: 'medium', category: 'TÜR ANALİZİ' });
      }
      const decAnimal = [...animalCAGRArr].sort((a, b) => a.cagr5 - b.cagr5)[0];
      if (decAnimal && decAnimal.cagr5 < -1) {
        insArr.push({ id: `si${iid++}`, type: 'decline', message: `⚠️ ${decAnimal.animal} populasyonu eriyor! 5Y BBO %${decAnimal.cagr5.toFixed(1)}, acil dikkat gerekiyor.`, severity: 'high', category: 'RİSK' });
      }
      if (hhiResult.hhi < 500) {
        insArr.push({ id: `si${iid++}`, type: 'info', message: `Pazar çok dağınık (HHI: ${hhiResult.hhi.toFixed(0)}). İlk 3 ülke payı: %${hhiResult.top3Share.toFixed(1)}`, severity: 'low', category: 'PAZAR YAPISI' });
      } else if (hhiResult.hhi > 1500) {
        insArr.push({ id: `si${iid++}`, type: 'warning', message: `Yüksek konsantrasyon (HHI: ${hhiResult.hhi.toFixed(0)}). Lider ülke tek başına %${hhiResult.top1Share.toFixed(1)} paza kontrol ediyor.`, severity: 'high', category: 'PAZAR YAPISI' });
      }
      const collapseCount = risks.filter(r => r.type === 'collapse').length;
      if (collapseCount > 0) {
        insArr.push({ id: `si${iid}`, type: 'warning', message: `🚨 ${collapseCount} ülke-tür kombinasyonunda populasyon çöküşü tespit edildi (10 yılda >%50 düşüş).`, severity: 'high', category: 'RİSK' });
      }
      setStocksInsights(insArr);
    } catch (error) {
      console.error('Stocks data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedItems, selectedYear, setLoading]);

  useEffect(() => {
    loadStocksData();
  }, [loadStocksData]);

  return (
    <>
      {/* Filter */}
      <div className="date-filter" style={{marginTop: '20px'}}>
        <div className="filter-group">
          <label className="filter-label">Hayvan Türü</label>
          <ProductSelector
            products={ANIMAL_ITEMS}
            selectedProducts={selectedItems}
            onSelectionChange={setSelectedItems}
            placeholder="Hayvan seçin..."
          />
        </div>
      </div>

      {/* KPI Grid */}
      {stocksKPIs && (
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
          <div className="kpi-card large">
            <div className="kpi-header"><span className="kpi-title">KÜRESEL STOK</span></div>
            <div className="kpi-value">{formatNumber(stocksKPIs.totalStock)}</div>
            <div className="kpi-subtitle">{stocksKPIs.countryCount} ülke · {stocksKPIs.speciesCount} tür</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: stocksKPIs.globalCAGR5 > 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: stocksKPIs.globalCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>📈</div></div>
            <div className="kpi-value" style={{color: stocksKPIs.globalCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>%{stocksKPIs.globalCAGR5.toFixed(2)}</div>
            <div className="kpi-subtitle">10Y: %{stocksKPIs.globalCAGR10.toFixed(2)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">TÜRKİYE</span><div className="kpi-icon purple">🇹🇷</div></div>
            <div className="kpi-value">#{stocksKPIs.turkeyRankGlobal}</div>
            <div className="kpi-subtitle">{formatNumber(stocksKPIs.turkeyTotal)} baş · %{((stocksKPIs.turkeyTotal / stocksKPIs.totalStock) * 100).toFixed(1)} pay</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">🇹🇷 5Y CAGR</span></div>
            <div className="kpi-value" style={{color: stocksKPIs.turkeyCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>%{stocksKPIs.turkeyCAGR5.toFixed(2)}</div>
            <div className="kpi-subtitle">{stocksKPIs.turkeyCAGR5 > stocksKPIs.globalCAGR5 ? '✅ Küresel ortalamanın üstünde' : '⚠️ Küresel ortalamanın altında'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">EN HIZLI BÜYÜYEN</span><div className="kpi-icon green">🚀</div></div>
            <div className="kpi-value" style={{fontSize: '1rem'}}>{stocksKPIs.topGrower}</div>
            <div className="kpi-subtitle">CAGR %{stocksKPIs.topGrowerCAGR.toFixed(1)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">LİDER ÜLKE</span><div className="kpi-icon orange">🏆</div></div>
            <div className="kpi-value" style={{fontSize: '1rem'}}>{stocksCountryData[0]?.name || '-'}</div>
            <div className="kpi-subtitle">Pay: %{stocksCountryData[0]?.share || '0'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">KONSANTRASYON</span></div>
            <div className="kpi-value">{stocksKPIs.hhi.toFixed(0)}</div>
            <div className="kpi-subtitle">HHI · {stocksKPIs.hhi < 500 ? '🟢 Dağınık' : stocksKPIs.hhi < 1500 ? '🟡 Orta' : '🔴 Yoğun'}</div>
          </div>
        </div>
      )}

      {/* Insights */}
      {stocksInsights.length > 0 && (
        <div style={{marginTop: '16px'}}>
          <InsightCard insights={stocksInsights} />
        </div>
      )}

      {/* Row 1: Animal CAGR cards */}
      {stocksAnimalCAGR.length > 0 && (
        <div style={{marginTop: '24px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🐾 Tür Populasyon Trendleri</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px'}}>
            {stocksAnimalCAGR.map((a, i) => {
              const trendIcon = a.trend === 'surge' ? '🚀' : a.trend === 'growth' ? '📈' : a.trend === 'stable' ? '➡️' : a.trend === 'decline' ? '📉' : '💀';
              const trendColor = a.trend === 'surge' ? '#22c55e' : a.trend === 'growth' ? '#3b82f6' : a.trend === 'stable' ? '#f59e0b' : a.trend === 'decline' ? '#f97316' : '#ef4444';
              const trendLabel = a.trend === 'surge' ? 'PATLAMA' : a.trend === 'growth' ? 'BÜYÜME' : a.trend === 'stable' ? 'STABİL' : a.trend === 'decline' ? 'DÜŞÜŞ' : 'ÇÖKÜŞ';
              return (
                <div key={i} style={{background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: `1px solid ${trendColor}33`, position: 'relative', overflow: 'hidden'}}>
                  <div style={{position: 'absolute', top: '8px', right: '8px', fontSize: '1.5rem'}}>{trendIcon}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{ANIMAL_ITEMS.find(ai => ai.name === a.animal)?.nameTR || a.animal}</div>
                  <div style={{fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)'}}>{formatNumber(a.current)}</div>
                  <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                    <span style={{fontSize: '0.8rem', color: trendColor, fontWeight: '600'}}>5Y: {a.cagr5 > 0 ? '+' : ''}{a.cagr5.toFixed(1)}%</span>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>10Y: {a.cagr10 > 0 ? '+' : ''}{a.cagr10.toFixed(1)}%</span>
                  </div>
                  <div style={{marginTop: '6px', fontSize: '0.7rem', fontWeight: '700', color: trendColor, background: `${trendColor}15`, display: 'inline-block', padding: '2px 8px', borderRadius: '4px'}}>{trendLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 2: Deep Trend Stacked Area */}
      <div className="chart-grid" style={{marginTop: '24px'}}>
        <div className="chart-card" style={{gridColumn: 'span 2'}}>
          <h3 className="chart-title">📈 Uzun Vadeli Populasyon Trendi (Stacked)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={stocksDeepTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(stocksDeepTrend.length / 15))} />
              <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [formatNumber(value), '']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              {selectedItems.map((id, idx) => {
                const animal = ANIMAL_ITEMS.find(a => a.id === id);
                if (!animal) return null;
                return <Area key={animal.name} type="monotone" dataKey={animal.name} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} />;
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Animal CAGR Bar + Animal Share Pie */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📊 Tür CAGR Karşılaştırması</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stocksAnimalCAGR.map(a => ({
              name: ANIMAL_ITEMS.find(ai => ai.name === a.animal)?.nameTR || a.animal,
              cagr5: parseFloat(a.cagr5.toFixed(2)),
              cagr10: parseFloat(a.cagr10.toFixed(2))
            }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v: number) => `${v}%`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
              <Tooltip formatter={(value: number, name: string) => [`%${value.toFixed(2)}`, name === 'cagr5' ? '5Y CAGR' : '10Y CAGR']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend formatter={(v: string) => v === 'cagr5' ? '5 Yıl CAGR' : '10 Yıl CAGR'} />
              <Bar dataKey="cagr5" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="cagr10" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">🥧 Küresel Tür Dağılımı</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={stocksData.map((d, i) => ({...d, fill: COLORS[i % COLORS.length]}))} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                label={(props) => { const p = props as unknown as Record<string, unknown>; const name = String(p.name ?? ''); const pct = Number(p.percent ?? 0); return `${ANIMAL_ITEMS.find(ai => ai.name === name)?.nameTR || name} ${(pct * 100).toFixed(0)}%`; }} labelLine={false}>
                {stocksData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Baş']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Country Growth Quadrant */}
      {stocksCountryCAGR.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card" style={{gridColumn: 'span 2'}}>
            <h3 className="chart-title">🎯 Ülke Growth Quadrant (Büyüme × Stok)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="total" name="Stok" tickFormatter={(v: number) => formatShort(v)}
                  label={{ value: 'Toplam Stok (Baş)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)' }}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="number" dataKey="cagr5" name="CAGR"
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  label={{ value: '5Y CAGR (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <ZAxis range={[60, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'CAGR') return [`%${value.toFixed(2)}`, '5Y CAGR'];
                    if (name === 'Stok') return [formatNumber(value), 'Toplam Stok'];
                    return [value, name];
                  }}
                  labelFormatter={(label: number) => stocksCountryCAGR[label]?.country || ''}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Scatter name="Ülkeler" data={stocksCountryCAGR} fill="#8884d8">
                  {stocksCountryCAGR.map((c, idx) => (
                    <Cell key={`sc-${idx}`} fill={c.country === 'Türkiye' ? '#ef4444' : c.cagr5 > 3 ? '#22c55e' : c.cagr5 > 0 ? '#3b82f6' : c.cagr5 > -3 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />Yüksek Büyüme (&gt;3%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />Büyüme (0-3%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />Düşüş (0 to -3%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />Ciddi Düşüş / 🇹🇷 Türkiye</span>
            </div>
          </div>
        </div>
      )}

      {/* Row 5: Top 20 Country Ranking */}
      <div className="chart-grid">
        <div className="chart-card" style={{gridColumn: 'span 2'}}>
          <h3 className="chart-title">🌍 Top 20 Ülke Sıralaması ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={stocksCountryData.slice(0, 20)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stocksCountryData.slice(0, 20).map((item, idx) => (
                  <Cell key={`cc-${idx}`} fill={String(item.name).includes('Türkiye') ? '#ef4444' : COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 6: Turkey Profile Cards */}
      {stocksTurkeyProfile.length > 0 && (
        <div style={{marginTop: '24px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🇹🇷 Türkiye Hayvan Profili</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
            {stocksTurkeyProfile.map((p, i) => (
              <div key={i} style={{background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{ANIMAL_ITEMS.find(ai => ai.name === p.animal)?.nameTR || p.animal}</div>
                <div style={{fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px'}}>{formatNumber(p.count)}</div>
                <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
                  <span style={{fontSize: '0.75rem', background: 'rgba(59,130,246,.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px'}}>Pay %{p.share.toFixed(1)}</span>
                  <span style={{fontSize: '0.75rem', background: p.cagr5 >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: p.cagr5 >= 0 ? '#22c55e' : '#ef4444', padding: '2px 6px', borderRadius: '4px'}}>5Y {p.cagr5 > 0 ? '+' : ''}{p.cagr5.toFixed(1)}%</span>
                </div>
                <div style={{marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '4px', height: '6px', overflow: 'hidden'}}>
                  <div style={{width: `${Math.min(p.share * 5, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '4px'}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 7: Risk Alerts Table */}
      {stocksRiskAlerts.length > 0 && (
        <div style={{marginTop: '24px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🚨 Populasyon Risk Uyarıları (10 Yıllık Değişim)</h3>
          <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
              <thead>
                <tr style={{borderBottom: '2px solid var(--border)'}}>
                  <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Durum</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Ülke</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Hayvan</th>
                  <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>10Y Değişim</th>
                </tr>
              </thead>
              <tbody>
                {stocksRiskAlerts.slice(0, 20).map((r, i) => (
                  <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '10px 16px'}}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px',
                        background: r.type === 'collapse' ? 'rgba(239,68,68,.15)' : r.type === 'sharp_decline' ? 'rgba(249,115,22,.15)' : 'rgba(34,197,94,.15)',
                        color: r.type === 'collapse' ? '#ef4444' : r.type === 'sharp_decline' ? '#f97316' : '#22c55e'
                      }}>
                        {r.type === 'collapse' ? '💀 ÇÖKÜŞ' : r.type === 'sharp_decline' ? '📉 DÜŞÜŞ' : '🚀 PATLAMA'}
                      </span>
                    </td>
                    <td style={{padding: '10px 16px', color: 'var(--text-primary)', fontWeight: '500'}}>{r.country}</td>
                    <td style={{padding: '10px 16px', color: 'var(--text-secondary)'}}>{ANIMAL_ITEMS.find(ai => ai.name === r.animal)?.nameTR || r.animal}</td>
                    <td style={{padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: r.decline10 < 0 ? '#ef4444' : '#22c55e'}}>
                      {r.decline10 > 0 ? '+' : ''}{r.decline10.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 8: Country CAGR Rankings Table */}
      {stocksCountryCAGR.length > 0 && (
        <div style={{marginTop: '24px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>📋 Ülke Stok Sıralaması & Büyüme</h3>
          <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
              <thead>
                <tr style={{borderBottom: '2px solid var(--border)'}}>
                  <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>#</th>
                  <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Ülke</th>
                  <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Toplam Stok</th>
                  <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Küresel Pay</th>
                  <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>5Y CAGR</th>
                  <th style={{textAlign: 'center', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {stocksCountryCAGR.map((c, i) => {
                  const isTurkey = c.country === 'Türkiye';
                  return (
                    <tr key={i} style={{borderBottom: '1px solid var(--border)', background: isTurkey ? 'rgba(239,68,68,.06)' : 'transparent'}}>
                      <td style={{padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: '500'}}>{i + 1}</td>
                      <td style={{padding: '10px 16px', color: 'var(--text-primary)', fontWeight: isTurkey ? '700' : '500'}}>
                        {isTurkey ? '🇹🇷 ' : ''}{c.country}
                      </td>
                      <td style={{padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)'}}>{formatNumber(c.total)}</td>
                      <td style={{padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)'}}>%{c.share.toFixed(2)}</td>
                      <td style={{padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: c.cagr5 > 1 ? '#22c55e' : c.cagr5 > -1 ? '#f59e0b' : '#ef4444'}}>
                        {c.cagr5 > 0 ? '+' : ''}{c.cagr5.toFixed(2)}%
                      </td>
                      <td style={{padding: '10px 16px', textAlign: 'center'}}>
                        {c.cagr5 > 3 ? '🚀' : c.cagr5 > 1 ? '📈' : c.cagr5 > -1 ? '➡️' : c.cagr5 > -3 ? '📉' : '💀'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
