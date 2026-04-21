import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, Legend
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { TurkeyHeatMap, type RegionTotal } from '../../components/TurkeyHeatMap';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { generateLivestockInsights } from '../../utils/livestockInsights';
import {
  calculateCAGR, calculateHHI, calculateYoY, calculateVolatility,
  type YearValue
} from '../../utils/livestockCalculations';
import { COLORS, type Tab, type DataItem, formatNumber, formatShort, EXCLUDED_FULL } from './livestockUtils';

interface Props {
  selectedYear: string;
  setActiveTab: (tab: Tab) => void;
  setLoading: (v: boolean) => void;
}

export default function LivestockOverviewSection({ selectedYear, setActiveTab, setLoading }: Props) {
  const [overviewKPIs, setOverviewKPIs] = useState<Record<string, number> | null>(null);
  const [overviewTrend, setOverviewTrend] = useState<DataItem[]>([]);
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<{
    cagr5Year: number | null;
    yoyGrowth: number | null;
    marketHHI: number | null;
    volatility: number | null;
    topMoverCountry: string | null;
    topMoverGrowth: number | null;
  } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [countryGrowthData, setCountryGrowthData] = useState<Array<{country: string; cagr: number; marketShare: number}>>([]);
  const [execSummary, setExecSummary] = useState<{
    supplyChainRatio: number;
    primaryTotal: number; processedTotal: number;
    turkeyPrimaryRank: number; turkeyEffRank: string;
    topRisk: string; topOpportunity: string;
    crossInsights: Insight[];
  } | null>(null);
  const [provincialLivestock, setProvincialLivestock] = useState<RegionTotal[]>([]);
  const [livestockMapType, setLivestockMapType] = useState<'cattle' | 'sheep' | 'goat' | 'total'>('total');

  // Load provincial livestock data for Turkey map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const provincialQuery = `
          SELECT 
            il as province,
            (CAST(sigir_varligi_bas AS UNSIGNED) + CAST(manda_varligi_bas AS UNSIGNED)) as cattle_count,
            CAST(koyun_varligi_bas AS UNSIGNED) as sheep_count,
            CAST(keci_varligi_bas AS UNSIGNED) as goat_count,
            (CAST(sigir_varligi_bas AS UNSIGNED) + CAST(manda_varligi_bas AS UNSIGNED) + 
             CAST(koyun_varligi_bas AS UNSIGNED) + CAST(keci_varligi_bas AS UNSIGNED)) as total_livestock
          FROM oner_i_llerin_hayvan_sayisi
          WHERE tarih = (SELECT MAX(tarih) FROM oner_i_llerin_hayvan_sayisi)
          ORDER BY il
        `;
        const provincialRes = await fetchQuery(provincialQuery);
        if (!cancelled && provincialRes.data && provincialRes.data.length > 0) {
          const mapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.total_livestock) || 0,
            unit: 'baş',
            cattle: Number(row.cattle_count) || 0,
            sheep: Number(row.sheep_count) || 0,
            goat: Number(row.goat_count) || 0
          }));
          setProvincialLivestock(mapped);
        }
      } catch (err) {
        console.error('İl bazlı hayvancılık verileri yüklenemedi:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";
      const stockValueExpr = "CASE WHEN miktar_birim='1000 An' THEN CAST(miktar_deger AS DECIMAL(20,2)) * 1000 ELSE CAST(miktar_deger AS DECIMAL(20,2)) END";
      
      const stocksQuery = `SELECT SUM(${stockValueExpr}) as total 
        FROM fao_uretim_hayvansal_canlihayvan 
        WHERE year='${selectedYear}' AND ulkead NOT IN ${excludedAreas}`;
      
      const meatQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND uretim_birim='t'
          AND (
            urunad LIKE '%Meat%' OR urunad LIKE '%meat%' OR
            urunad LIKE '%offal%' OR urunad LIKE '%Offal%' OR
            urunad LIKE '%fat%' OR urunad LIKE '%Fat%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const milkQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND uretim_birim='t'
          AND (
            urunad LIKE '%Milk%' OR urunad LIKE '%milk%' OR
            urunad LIKE '%Cheese%' OR urunad LIKE '%cheese%' OR
            urunad LIKE '%Butter%' OR urunad LIKE '%butter%' OR
            urunad LIKE '%Cream%' OR urunad LIKE '%cream%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const eggsQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}'
          AND (
            urunad LIKE '%Egg%' OR urunad LIKE '%egg%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const trendQuery = `SELECT year, 
        SUM(${stockValueExpr}) as stocks
        FROM fao_uretim_hayvansal_canlihayvan 
        WHERE ulkead NOT IN ${excludedAreas}
        GROUP BY year ORDER BY year DESC LIMIT 20`;

      const [stocksRes, meatRes, milkRes, eggsRes, trendRes] = await Promise.all([
        fetchQuery(stocksQuery),
        fetchQuery(meatQuery),
        fetchQuery(milkQuery),
        fetchQuery(eggsQuery),
        fetchQuery(trendQuery)
      ]);

      setOverviewKPIs({
        totalStocks: Number(stocksRes.data?.[0]?.total || 0),
        totalMeat: Number(meatRes.data?.[0]?.total || 0),
        totalMilk: Number(milkRes.data?.[0]?.total || 0),
        totalEggs: Number(eggsRes.data?.[0]?.total || 0),
      });

      if (trendRes.data) {
        const trendData = trendRes.data.map((d: Record<string, string | number>) => ({
          year: String(d.year),
          value: Number(d.stocks) || 0
        })).reverse();
        setOverviewTrend(trendData);

        const yearValues: YearValue[] = trendData.map(d => ({
          year: d.year as string,
          value: d.value as number
        }));

        const recentYears = yearValues.slice(-5);
        const cagrResult = calculateCAGR(recentYears);
        
        let yoyGrowth = null;
        if (yearValues.length >= 2) {
          const current = yearValues[yearValues.length - 1].value;
          const previous = yearValues[yearValues.length - 2].value;
          yoyGrowth = calculateYoY(current, previous);
        }

        const volatility = calculateVolatility(yearValues);

        const countryGrowthQuery = `
          SELECT ulkead, year, SUM(${stockValueExpr}) as total
          FROM fao_uretim_hayvansal_canlihayvan
          WHERE ulkead NOT IN ${excludedAreas} AND year >= ${parseInt(selectedYear) - 5}
          GROUP BY ulkead, year
          ORDER BY ulkead, year
        `;
        const countryGrowthRes = await fetchQuery(countryGrowthQuery);

        if (countryGrowthRes.data) {
          const countryMap = new Map<string, YearValue[]>();
          countryGrowthRes.data.forEach((row: Record<string, string | number>) => {
            const country = String(row.ulkead);
            if (!countryMap.has(country)) {
              countryMap.set(country, []);
            }
            countryMap.get(country)!.push({
              year: String(row.year),
              value: Number(row.total) || 0
            });
          });

          const countryCAGRs = Array.from(countryMap.entries())
            .map(([country, values]) => {
              const cagr = calculateCAGR(values);
              const latestShare = values[values.length - 1]?.value || 0;
              return {
                country: translateCountry(country),
                cagr: cagr?.cagr || 0,
                marketShare: latestShare
              };
            })
            .filter(c => c.marketShare > 0)
            .sort((a, b) => b.cagr - a.cagr);

          setCountryGrowthData(countryCAGRs);

          const topMover = countryCAGRs[0];
          const marketShares = countryCAGRs.map(c => c.marketShare);
          const hhiResult = calculateHHI(marketShares);

          setIntelligenceMetrics({
            cagr5Year: cagrResult?.cagr || null,
            yoyGrowth,
            marketHHI: hhiResult.hhi,
            volatility,
            topMoverCountry: topMover?.country || null,
            topMoverGrowth: topMover?.cagr || null
          });

          const generatedInsights = generateLivestockInsights({
            cagrData: countryCAGRs.slice(0, 10).map(c => ({ country: c.country, cagr: c.cagr })),
            hhiData: {
              hhi: hhiResult.hhi,
              top1Share: hhiResult.top1Share,
              top1Country: countryCAGRs[0]?.country
            },
            volatilityData: countryCAGRs.filter(c => {
              const countryData = countryMap.get(c.country);
              if (!countryData) return false;
              const vol = calculateVolatility(countryData);
              return vol > 20;
            }).map(c => {
              const countryData = countryMap.get(c.country)!;
              return {
                country: c.country,
                volatility: calculateVolatility(countryData)
              };
            }).slice(0, 5)
          });
          setInsights(generatedInsights);
        }
      }

      // Sprint 7: Supply Chain Intelligence + Executive Summary
      try {
        const yr = parseInt(selectedYear);

        const [primaryTotalRes, processedTotalRes, turkeyPrimaryRes] = await Promise.all([
          fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL}`),
          fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_islenmis WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL}`),
          fetchQuery(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL} GROUP BY ulkead ORDER BY total DESC`),
        ]);

        const pTotal = Number(primaryTotalRes.data?.[0]?.total || 0);
        const prTotal = Number(processedTotalRes.data?.[0]?.total || 0);
        const ratio = pTotal > 0 ? (prTotal / pTotal) * 100 : 0;

        const pRanks = (turkeyPrimaryRes.data || []) as Array<Record<string, string | number>>;
        const trPrimaryRank = pRanks.findIndex(r => String(r.ulkead) === 'Türkiye') + 1 || 0;

        const xIns: Insight[] = [];
        xIns.push({ id: 'x-1', type: 'info', message: `Tedarik Zinciri: Dünya birincil üretiminin %${ratio.toFixed(1)}'i işlenmiş ürüne dönüştürülüyor`, severity: 'medium' });
        if (trPrimaryRank > 0 && trPrimaryRank <= 10) {
          xIns.push({ id: 'x-2', type: 'achievement', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada`, severity: 'medium' });
        } else if (trPrimaryRank > 10) {
          xIns.push({ id: 'x-2', type: 'warning', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada — ilk 10'a girme potansiyeli mevcut`, severity: 'medium' });
        }
        if (ratio < 20) {
          xIns.push({ id: 'x-3', type: 'decline', message: `İşleme oranı düşük (%${ratio.toFixed(1)}) — katma değerli üretim potansiyeli büyük`, severity: 'high' });
        }

        setExecSummary({
          supplyChainRatio: ratio,
          primaryTotal: pTotal,
          processedTotal: prTotal,
          turkeyPrimaryRank: trPrimaryRank,
          turkeyEffRank: '—',
          topRisk: 'Verimlilik açığı',
          topOpportunity: 'İşleme kapasitesi',
          crossInsights: xIns,
        });
      } catch (e) {
        console.error('Executive summary error:', e);
      }

    } catch (error) {
      console.error('Overview data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, setLoading]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  return (
    <>
      {/* ─── KPI Row 1: Main Stats ─── */}
      {overviewKPIs && (
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
          <div className="kpi-card large">
            <div className="kpi-header"><span className="kpi-title">KÜRESEL HAYVAN STOKU</span></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalStocks)}</div>
            <div className="kpi-subtitle">Canlı hayvan varlığı ({selectedYear})</div>
          </div>
          {intelligenceMetrics && (
            <>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? '#22c55e' : '#ef4444'}}>📈</div></div>
                <div className="kpi-value" style={{color: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? '#22c55e' : '#ef4444'}}>%{(intelligenceMetrics.cagr5Year ?? 0).toFixed(2)}</div>
                <div className="kpi-subtitle">Yıllık bileşik büyüme</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">KONSANTRASYON</span></div>
                <div className="kpi-value">{(intelligenceMetrics.marketHHI ?? 0).toFixed(0)}</div>
                <div className="kpi-subtitle">HHI · {(intelligenceMetrics.marketHHI ?? 0) < 500 ? '🟢 Dağınık' : (intelligenceMetrics.marketHHI ?? 0) < 1500 ? '🟡 Orta' : '🔴 Yoğun'}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">VOLATİLİTE</span></div>
                <div className="kpi-value">%{(intelligenceMetrics.volatility ?? 0).toFixed(1)}</div>
                <div className="kpi-subtitle">{(intelligenceMetrics.volatility ?? 0) < 5 ? '🟢 Düşük' : (intelligenceMetrics.volatility ?? 0) < 15 ? '🟡 Orta' : '🔴 Yüksek'}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Row 2: Highlights */}
      {overviewKPIs && intelligenceMetrics && (
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '12px'}}>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">EN HIZLI BÜYÜYEN</span><div className="kpi-icon green">🚀</div></div>
            <div className="kpi-value" style={{fontSize: '1rem'}}>{intelligenceMetrics.topMoverCountry || '-'}</div>
            <div className="kpi-subtitle">CAGR %{(intelligenceMetrics.topMoverGrowth ?? 0).toFixed(1)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">ET ÜRETİMİ</span><div className="kpi-icon red">🥩</div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalMeat)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">SÜT ÜRETİMİ</span><div className="kpi-icon blue">🥛</div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalMilk)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">YUMURTA</span><div className="kpi-icon orange">🥚</div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalEggs)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{marginTop: '16px'}}>
          <InsightCard insights={[...insights, ...(execSummary?.crossInsights || [])]} />
        </div>
      )}

      {/* Executive Summary Card */}
      {execSummary && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">📊 Executive Summary — Tedarik Zinciri</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px'}}>
            <div style={{background: 'rgba(59,130,246,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Birincil Üretim</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6'}}>{formatShort(execSummary.primaryTotal)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>ton</div>
            </div>
            <div style={{background: 'rgba(168,85,247,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>İşleme Oranı</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#a855f7'}}>%{execSummary.supplyChainRatio.toFixed(1)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>dönüşüm</div>
            </div>
            <div style={{background: 'rgba(139,92,246,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>İşlenmiş Üretim</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6'}}>{formatShort(execSummary.processedTotal)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>ton</div>
            </div>
            <div style={{background: 'rgba(239,68,68,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>🇹🇷 Birincil Sıra</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#ef4444'}}>#{execSummary.turkeyPrimaryRank || '—'}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>dünya</div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Tab Navigation */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px'}}>
        {[
          {tab: 'stocks' as Tab, icon: '🐄', label: 'Canlı Hayvan', desc: 'Stok ve tür analizi'},
          {tab: 'primary' as Tab, icon: '🥩', label: 'Birincil Üretim', desc: 'Et, süt, yumurta'},
          {tab: 'processed' as Tab, icon: '🏭', label: 'İşlenmiş Ürünler', desc: 'Katma değerli'},
          {tab: 'efficiency' as Tab, icon: '⚡', label: 'Verimlilik', desc: 'Ülke karşılaştırma'},
          {tab: 'predictions' as Tab, icon: '🔮', label: 'Tahminler', desc: 'AI projeksiyon'},
        ].map(item => (
          <button key={item.tab} onClick={() => setActiveTab(item.tab)}
            style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'}}>
            <div style={{fontSize: '1.5rem', marginBottom: '8px'}}>{item.icon}</div>
            <div style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem'}}>{item.label}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Row 3: 20-Year Trend */}
      {overviewTrend.length > 0 && (
        <div className="chart-grid" style={{marginTop: '24px'}}>
          <div className="chart-card" style={{gridColumn: 'span 2'}}>
            <h3 className="chart-title">📈 Küresel Hayvan Stoku Trendi (20 Yıl)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={overviewTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatNumber(value), 'Hayvan Stoku']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 4: Growth Quadrant */}
      {countryGrowthData.length > 0 && (
        <div className="chart-grid" style={{marginTop: '20px'}}>
          <div className="chart-card" style={{gridColumn: 'span 2'}}>
            <h3 className="chart-title">🎯 Ülke Growth Quadrant (CAGR × Pazar Payı)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="marketShare" name="Pazar Payı" tickFormatter={(v: number) => formatShort(v)}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="number" dataKey="cagr" name="CAGR" unit="%"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <ZAxis range={[40, 400]} />
                <Tooltip formatter={(value: number, name: string) => [name === 'CAGR' ? `%${value.toFixed(2)}` : formatNumber(value), name]}
                  labelFormatter={(_, payload) => { if (payload && payload.length > 0) { const d = payload[0].payload as {country: string}; return d.country; } return ''; }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
                <Scatter name="Ülkeler" data={countryGrowthData.slice(0, 30)} fill="#3b82f6">
                  {countryGrowthData.slice(0, 30).map((c, idx) => (
                    <Cell key={`gq-${idx}`} fill={c.country === 'Türkiye' ? '#ef4444' : c.cagr > 3 ? '#22c55e' : c.cagr > 0 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 5: Turkey Provincial Heat Map */}
      {provincialLivestock.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">🇹🇷 İl Bazlı Hayvan Varlığı Haritası</h3>
          <div style={{display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap'}}>
            {(['total', 'cattle', 'sheep', 'goat'] as const).map(type => (
              <button key={type} onClick={() => setLivestockMapType(type)}
                style={{padding: '6px 14px', borderRadius: '8px',
                  border: `1px solid ${livestockMapType === type ? 'var(--primary)' : 'var(--border)'}`,
                  background: livestockMapType === type ? 'var(--primary)' : 'var(--bg-primary)',
                  color: livestockMapType === type ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600}}>
                {type === 'total' ? '📊 Toplam' : type === 'cattle' ? '🐄 Sığır+Manda' : type === 'sheep' ? '🐑 Koyun' : '🐐 Keçi'}
              </button>
            ))}
          </div>
          <TurkeyHeatMap
            data={provincialLivestock.map(p => ({
              ...p,
              value: livestockMapType === 'total' ? p.value
                : livestockMapType === 'cattle' ? (p.cattle || 0)
                : livestockMapType === 'sheep' ? (p.sheep || 0)
                : (p.goat || 0)
            }))}
            title={livestockMapType === 'total' ? 'Toplam Hayvan Varlığı' : livestockMapType === 'cattle' ? 'Sığır+Manda Varlığı' : livestockMapType === 'sheep' ? 'Koyun Varlığı' : 'Keçi Varlığı'}
            unit="baş"
            colorScheme="green"
          />
        </div>
      )}
    </>
  );
}
