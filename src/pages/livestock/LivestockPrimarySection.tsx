import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { translateProduct } from '../../utils/productTranslations';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { COLORS, EXCLUDED_FULL, type DataItem, type PrimaryTab, formatNumber, formatShort } from './livestockUtils';

interface Props {
  selectedYear: string;
  activePrimaryTab: PrimaryTab;
  setActivePrimaryTab: (tab: PrimaryTab) => void;
  setLoading: (v: boolean) => void;
}

export default function LivestockPrimarySection({ selectedYear, activePrimaryTab, setActivePrimaryTab, setLoading }: Props) {
  const [primaryCountryData, setPrimaryCountryData] = useState<DataItem[]>([]);
  const [primaryYearlyData, setPrimaryYearlyData] = useState<DataItem[]>([]);
  const [primaryKPIs, setPrimaryKPIs] = useState<{
    totalProduction: number; productCount: number; countryCount: number;
    turkeyRank: number; turkeyTotal: number; turkeyShare: number;
    globalCAGR5: number; turkeyCAGR5: number; leader: string; leaderShare: number;
  } | null>(null);
  const [primaryProductCAGR, setPrimaryProductCAGR] = useState<Array<{
    product: string; current: number; cagr5: number; share: number;
    lifecycle: 'emerging' | 'growth' | 'mature' | 'declining';
  }>>([]);
  const [primaryCountryCAGR, setPrimaryCountryCAGR] = useState<Array<{
    country: string; total: number; cagr5: number; share: number;
  }>>([]);
  const [primaryTurkeyProducts, setPrimaryTurkeyProducts] = useState<Array<{
    product: string; production: number; rank: number; cagr5: number;
  }>>([]);
  const [primaryInsights, setPrimaryInsights] = useState<Insight[]>([]);

  const renderPrimaryTabButton = (tab: PrimaryTab, icon: string, label: string) => (
    <button
      onClick={() => setActivePrimaryTab(tab)}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: activePrimaryTab === tab ? '#22c55e' : 'var(--bg-primary)',
        color: activePrimaryTab === tab ? 'white' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const loadPrimaryData = useCallback(async () => {
    setLoading(true);
    try {
      const EXCLUDED = EXCLUDED_FULL;
      const yr = parseInt(selectedYear);
      let itemFilter = '';
      if (activePrimaryTab === 'meat') {
        itemFilter = "(urunad LIKE '%Meat%' OR urunad LIKE '%meat%' OR urunad LIKE '%offal%' OR urunad LIKE '%Offal%' OR urunad LIKE '%fat%' OR urunad LIKE '%Fat%')";
      } else if (activePrimaryTab === 'milk') {
        itemFilter = "(urunad LIKE '%Milk%' OR urunad LIKE '%milk%')";
      } else if (activePrimaryTab === 'eggs') {
        itemFilter = "(urunad LIKE '%Egg%' OR urunad LIKE '%egg%')";
      } else {
        itemFilter = "(urunad NOT LIKE '%Meat%' AND urunad NOT LIKE '%meat%' AND urunad NOT LIKE '%Milk%' AND urunad NOT LIKE '%milk%' AND urunad NOT LIKE '%Egg%' AND urunad NOT LIKE '%egg%' AND urunad NOT LIKE '%Cheese%' AND urunad NOT LIKE '%Butter%')";
      }
      const W = `AND ${itemFilter}`;

      const [productRes, countryAllRes, yearlyRes, productCAGRRes, countryCAGRRes, turkeyProdRes] = await Promise.all([
        fetchQuery(`SELECT urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE year='${selectedYear}' AND uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad ORDER BY toplam DESC LIMIT 15`),
        fetchQuery(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE year='${selectedYear}' AND uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead ORDER BY toplam DESC`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT urunad, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY urunad, year`),
        fetchQuery(`SELECT ulkead, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY ulkead, year`),
        fetchQuery(`SELECT urunad, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead='Türkiye' AND year IN ('${yr}','${yr-5}') GROUP BY urunad, year`)
      ]);

      // Products
      const primaryData = productRes.data ? productRes.data.map((item: Record<string, string | number>, index: number) => ({
        name: String(item.urunad || ''), value: Number(item.toplam) || 0, fill: COLORS[index % COLORS.length]
      })) : [];

      // Countries
      const allCountries = (countryAllRes.data || []).map((item: Record<string, string | number>) => ({
        area: String(item.ulkead || ''), name: translateCountry(String(item.ulkead || '')), value: Number(item.toplam) || 0
      }));
      const globalTotal = allCountries.reduce((s: number, c: {value: number}) => s + c.value, 0);
      const top20 = allCountries.slice(0, 20).map((c: {area: string; name: string; value: number}, i: number) => ({
        ...c, share: ((c.value / globalTotal) * 100).toFixed(1), fill: COLORS[i % COLORS.length]
      }));
      setPrimaryCountryData(top20);

      // Yearly
      const yearlyArr = (yearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year || ''), value: Number(d.toplam) || 0
      }));
      setPrimaryYearlyData(yearlyArr.slice(-20));

      const curYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr));
      const pastYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 5));
      const globalCAGR5 = curYearVal && pastYearVal && pastYearVal.value > 0
        ? (Math.pow(curYearVal.value / pastYearVal.value, 1 / 5) - 1) * 100 : 0;

      // Product CAGR + lifecycle
      const prodMap = new Map<string, {cur: number; old: number}>();
      (productCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const p = String(d.urunad);
        if (!prodMap.has(p)) prodMap.set(p, {cur: 0, old: 0});
        const e = prodMap.get(p)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const prodCAGRArr = Array.from(prodMap.entries())
        .filter(([, v]) => v.cur > 0)
        .map(([product, v]) => {
          const cagr5 = v.old > 0 ? (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100 : 0;
          const share = (v.cur / globalTotal) * 100;
          const lifecycle: 'emerging' | 'growth' | 'mature' | 'declining' =
            cagr5 > 5 && share < 5 ? 'emerging' : cagr5 > 2 ? 'growth' : cagr5 >= -1 ? 'mature' : 'declining';
          return { product, current: v.cur, cagr5, share, lifecycle };
        })
        .sort((a, b) => b.current - a.current);
      setPrimaryProductCAGR(prodCAGRArr);

      // Country CAGR
      const cntMap = new Map<string, {cur: number; old: number}>();
      (countryCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const c = String(d.ulkead);
        if (!cntMap.has(c)) cntMap.set(c, {cur: 0, old: 0});
        const e = cntMap.get(c)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const cntCAGRArr = Array.from(cntMap.entries())
        .filter(([, v]) => v.cur > 0 && v.old > 0)
        .map(([country, v]) => ({
          country: translateCountry(country),
          total: v.cur,
          cagr5: (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100,
          share: (v.cur / globalTotal) * 100
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 30);
      setPrimaryCountryCAGR(cntCAGRArr);

      // Turkey
      const trIdx = allCountries.findIndex((c: {area: string}) => c.area === 'Türkiye');
      const trTotal = trIdx >= 0 ? allCountries[trIdx].value : 0;
      const trCAGREntry = cntMap.get('Türkiye');
      const turkeyCAGR5 = trCAGREntry && trCAGREntry.old > 0
        ? (Math.pow(trCAGREntry.cur / trCAGREntry.old, 1 / 5) - 1) * 100 : 0;

      // Turkey products
      const trProdMap = new Map<string, {cur: number; old: number}>();
      (turkeyProdRes.data || []).forEach((d: Record<string, string | number>) => {
        const p = String(d.urunad);
        if (!trProdMap.has(p)) trProdMap.set(p, {cur: 0, old: 0});
        const e = trProdMap.get(p)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const trProducts = Array.from(trProdMap.entries())
        .filter(([, v]) => v.cur > 0)
        .map(([product, v]) => {
          const cagr5 = v.old > 0 ? (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100 : 0;
          return { product, production: v.cur, rank: 0, cagr5 };
        })
        .sort((a, b) => b.production - a.production);
      setPrimaryTurkeyProducts(trProducts);

      // KPIs
      setPrimaryKPIs({
        totalProduction: globalTotal,
        productCount: primaryData.length,
        countryCount: allCountries.length,
        turkeyRank: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: trTotal,
        turkeyShare: globalTotal > 0 ? (trTotal / globalTotal) * 100 : 0,
        globalCAGR5,
        turkeyCAGR5,
        leader: allCountries[0]?.name || '-',
        leaderShare: globalTotal > 0 ? (allCountries[0]?.value / globalTotal) * 100 : 0
      });

      // Insights
      const ins: Insight[] = [];
      let iid = 1;
      ins.push({ id: `pi${iid++}`, type: globalCAGR5 > 0 ? 'growth' : 'decline',
        message: `Küresel ${activePrimaryTab === 'meat' ? 'et' : activePrimaryTab === 'milk' ? 'süt' : activePrimaryTab === 'eggs' ? 'yumurta' : ''} üretimi ${globalCAGR5 > 0 ? 'büyüyor' : 'azalıyor'}: 5Y BBO %${globalCAGR5.toFixed(1)}. Toplam: ${formatNumber(globalTotal)} ton.`,
        severity: 'medium', category: 'TREND' });
      if (trIdx >= 0) {
        ins.push({ id: `pi${iid++}`, type: turkeyCAGR5 > globalCAGR5 ? 'achievement' : 'warning',
          message: `Türkiye dünya #${trIdx + 1} (${formatNumber(trTotal)} ton, pay %${((trTotal / globalTotal) * 100).toFixed(1)}). 5Y BBO %${turkeyCAGR5.toFixed(1)} ${turkeyCAGR5 > globalCAGR5 ? '- küreselden hızlı!' : '- küreselden yavaş.'}`,
          severity: turkeyCAGR5 < 0 ? 'high' : 'medium', category: 'TÜRKİYE' });
      }
      const emerging = prodCAGRArr.filter(p => p.lifecycle === 'emerging');
      if (emerging.length > 0) {
        ins.push({ id: `pi${iid++}`, type: 'growth', message: `🌱 ${emerging.length} yükselen ürün tespit edildi: ${emerging.slice(0, 3).map(e => `${translateProduct(e.product)} (BBO %${e.cagr5.toFixed(1)})`).join(', ')}`, severity: 'medium', category: 'FIRSAT' });
      }
      const declining = prodCAGRArr.filter(p => p.lifecycle === 'declining');
      if (declining.length > 0) {
        ins.push({ id: `pi${iid++}`, type: 'decline', message: `📉 ${declining.length} üründ düşüş trendi: ${declining.slice(0, 3).map(d => `${translateProduct(d.product)} (BBO %${d.cagr5.toFixed(1)})`).join(', ')}`, severity: 'high', category: 'RİSK' });
      }
      ins.push({ id: `pi${iid}`, type: 'info', message: `Pazar lideri: ${allCountries[0]?.name || '-'} (%${(allCountries[0]?.value / globalTotal * 100).toFixed(1)} pay). Top 3 ülke toplam %${(allCountries.slice(0, 3).reduce((s: number, c: {value: number}) => s + c.value, 0) / globalTotal * 100).toFixed(1)} kontrol ediyor.`, severity: 'low', category: 'PAZAR' });
      setPrimaryInsights(ins);

    } catch (error) {
      console.error('Primary data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, activePrimaryTab, setLoading]);

  useEffect(() => {
    loadPrimaryData();
  }, [loadPrimaryData]);

  return (
    <>
      {/* Sub-tab buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {renderPrimaryTabButton('meat', '🥩', 'Et Ürünleri')}
        {renderPrimaryTabButton('milk', '🥛', 'Süt Ürünleri')}
        {renderPrimaryTabButton('eggs', '🥚', 'Yumurta')}
        {renderPrimaryTabButton('other', '🍯', 'Diğer Ürünler')}
      </div>

      {/* Intelligence KPIs */}
      {primaryKPIs && (
        <div className="kpi-grid">
          <div className="kpi-card large">
            <div className="kpi-header"><span className="kpi-title">KÜRESEL ÜRETİM</span></div>
            <div className="kpi-value">{formatNumber(primaryKPIs.totalProduction)}</div>
            <div className="kpi-subtitle">ton · {primaryKPIs.productCount} ürün · {primaryKPIs.countryCount} ülke</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: primaryKPIs.globalCAGR5 >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: primaryKPIs.globalCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>{primaryKPIs.globalCAGR5 >= 0 ? '📈' : '📉'}</div></div>
            <div className="kpi-value" style={{color: primaryKPIs.globalCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>%{primaryKPIs.globalCAGR5.toFixed(1)}</div>
            <div className="kpi-subtitle">Küresel yıllık büyüme</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">LİDER</span><div className="kpi-icon orange">🏆</div></div>
            <div className="kpi-value" style={{fontSize: '1rem'}}>{primaryKPIs.leader}</div>
            <div className="kpi-subtitle">%{primaryKPIs.leaderShare.toFixed(1)} pazar payı</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE SIRA</span></div>
            <div className="kpi-value" style={{color: '#a855f7'}}>#{primaryKPIs.turkeyRank || '-'}</div>
            <div className="kpi-subtitle">{formatNumber(primaryKPIs.turkeyTotal)} ton</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE PAY</span></div>
            <div className="kpi-value" style={{color: '#3b82f6'}}>%{primaryKPIs.turkeyShare.toFixed(2)}</div>
            <div className="kpi-subtitle">Küresel üretimdeki pay</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE CAGR</span></div>
            <div className="kpi-value" style={{color: primaryKPIs.turkeyCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>%{primaryKPIs.turkeyCAGR5.toFixed(1)}</div>
            <div className="kpi-subtitle">{primaryKPIs.turkeyCAGR5 > primaryKPIs.globalCAGR5 ? '✅ Küreselden hızlı' : '⚠️ Küreselden yavaş'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">YÜKSELEN</span><div className="kpi-icon green">🌱</div></div>
            <div className="kpi-value" style={{color: '#22c55e'}}>{primaryProductCAGR.filter(p => p.lifecycle === 'emerging').length}</div>
            <div className="kpi-subtitle">Emerging ürün</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">DÜŞEN</span><div className="kpi-icon" style={{background:'rgba(239,68,68,.15)', color:'#ef4444'}}>⚠️</div></div>
            <div className="kpi-value" style={{color: '#ef4444'}}>{primaryProductCAGR.filter(p => p.lifecycle === 'declining').length}</div>
            <div className="kpi-subtitle">Declining ürün</div>
          </div>
        </div>
      )}

      {/* Auto-Insights */}
      {primaryInsights.length > 0 && <InsightCard insights={primaryInsights} />}

      {/* Product Lifecycle Cards */}
      <div className="chart-card" style={{marginTop: '20px'}}>
        <h3 className="chart-title">🧬 Ürün Yaşam Döngüsü Matrisi</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px'}}>
          {primaryProductCAGR.slice(0, 12).map((p, i) => {
            const lcStyle = p.lifecycle === 'emerging' ? {bg: 'rgba(34,197,94,.1)', border: '#22c55e', badge: '🌱 Emerging', color: '#22c55e'}
              : p.lifecycle === 'growth' ? {bg: 'rgba(59,130,246,.1)', border: '#3b82f6', badge: '📈 Growth', color: '#3b82f6'}
              : p.lifecycle === 'mature' ? {bg: 'rgba(168,85,247,.1)', border: '#a855f7', badge: '⚖️ Mature', color: '#a855f7'}
              : {bg: 'rgba(239,68,68,.1)', border: '#ef4444', badge: '📉 Declining', color: '#ef4444'};
            return (
              <div key={i} style={{background: lcStyle.bg, border: `1px solid ${lcStyle.border}`, borderRadius: '12px', padding: '14px', position: 'relative'}}>
                <span style={{position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, color: lcStyle.color, background: 'var(--bg-card)', borderRadius: '6px', padding: '2px 8px', border: `1px solid ${lcStyle.border}`}}>{lcStyle.badge}</span>
                <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', maxWidth: '70%', lineHeight: 1.3}}>{translateProduct(p.product)}</div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px'}}>
                  <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Üretim</div><div style={{fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)'}}>{formatShort(p.current)}</div></div>
                  <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>CAGR</div><div style={{fontWeight: 700, fontSize: '13px', color: p.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>%{p.cagr5.toFixed(1)}</div></div>
                  <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Pay</div><div style={{fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)'}}>%{p.share.toFixed(1)}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product CAGR Chart + Country Growth Quadrant */}
      <div className="chart-grid" style={{marginTop: '20px'}}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Ürnün CAGR Karşılaştırması (5Y)</h3>
            <ChartInsightButton title="Ürnün CAGR Karşılaştırması" description="Birincil hayvansal ürünlerin 5 yıllık büléik büyüme analizi" data={primaryProductCAGR.slice(0, 12)} context={{}} compact />
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={primaryProductCAGR.slice(0, 12).map(p => ({...p, product: translateProduct(p.product)}))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v: number) => `%${v.toFixed(0)}`} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis type="category" dataKey="product" tick={{fill: 'var(--text-secondary)', fontSize: 9}} width={140} />
              <Tooltip formatter={(value: number) => [`%${value.toFixed(2)}`, '5Y CAGR']}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
              <Bar dataKey="cagr5" radius={[0, 4, 4, 0]}>
                {primaryProductCAGR.slice(0, 12).map((p, idx) => (
                  <Cell key={`pcagr-${idx}`} fill={
                    p.lifecycle === 'emerging' ? '#22c55e' : p.lifecycle === 'growth' ? '#3b82f6'
                    : p.lifecycle === 'mature' ? '#a855f7' : '#ef4444'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🌐 Ülke Büyüme Kadranı</h3>
            <ChartInsightButton title="Ülke Büyüme Kadranı" description="Ülkelerin pazar payı ve büyüme hızı dağılımı" data={primaryCountryCAGR.slice(0, 25)} context={{}} compact />
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="share" name="Pazar Payı" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis type="number" dataKey="cagr5" name="5Y CAGR" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <ZAxis type="number" dataKey="total" range={[40, 400]} />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const d = payload[0].payload as {country: string};
                    return d.country;
                  }
                  return '';
                }}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}}
              />
              <Scatter name="Ülkeler" data={primaryCountryCAGR.slice(0, 25)} fill="#3b82f6">
                {primaryCountryCAGR.slice(0, 25).map((c, idx) => (
                  <Cell key={`psc-${idx}`} fill={c.country.includes('Türkiye') || c.country.includes('Turkey') ? '#ef4444' : COLORS[idx % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 20 Country Ranking */}
      <div className="chart-grid" style={{marginTop: '20px'}}>
        <div className="chart-card" style={{gridColumn: 'span 2'}}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🌍 Top 20 Ülke Üretim Sıralaması</h3>
            <ChartInsightButton title="Top 20 Ülke Üretim Sıralaması" description="Birincil hayvansal üretimde önde gelen 20 ülke" data={primaryCountryData.slice(0, 20)} context={{}} />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={primaryCountryData.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 9}} angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Üretim (ton)']}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {primaryCountryData.slice(0, 20).map((item) => (
                  <Cell key={`pc20-${item.area || item.name}`} fill={
                    (item.area === 'Türkiye' || item.name === 'Türkiye' || item.name === 'Turkey') ? '#ef4444' : String(item.fill)
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Turkey Product Profile */}
      {primaryTurkeyProducts.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">🇹🇷 Türkiye Ürün Profili</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px'}}>
            {primaryTurkeyProducts.slice(0, 8).map((tp, i) => {
              const maxProd = primaryTurkeyProducts[0]?.production || 1;
              const pct = (tp.production / maxProd) * 100;
              return (
                <div key={i} style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px'}}>
                  <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px'}}>{translateProduct(tp.product)}</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{formatNumber(tp.production)} ton</span>
                    <span style={{fontSize: '12px', fontWeight: 700, color: tp.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>CAGR %{tp.cagr5.toFixed(1)}</span>
                  </div>
                  <div style={{width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                    <div style={{width: `${pct}%`, height: '100%', background: tp.cagr5 >= 0 ? 'linear-gradient(90deg, #22c55e, #3b82f6)' : 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: '3px', transition: 'width 0.5s ease'}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Yearly Trend + Country CAGR Table */}
      <div className="chart-grid" style={{marginTop: '20px'}}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📅 Küresel Üretim Trendi</h3>
            <ChartInsightButton title="Küresel Birincil Hayvansal Üretim Trendi" description="Uzun vadeli küresel birincil hayvansal üretim trendi" data={primaryYearlyData} context={{}} compact />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={primaryYearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
              <Tooltip formatter={(value: number) => [formatNumber(value), 'Üretim (ton)']}
                contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
              <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📋 Ülke CAGR Sıralaması (5Y)</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
              <thead>
                <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                  <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>#</th>
                  <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ülke</th>
                  <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Üretim</th>
                  <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Pay</th>
                  <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>CAGR</th>
                </tr>
              </thead>
              <tbody>
                {primaryCountryCAGR.slice(0, 20).map((c, i) => {
                  const isTurkey = c.country.includes('Türkiye') || c.country.includes('Turkey');
                  return (
                    <tr key={i} style={{borderBottom: '1px solid var(--border)', background: isTurkey ? 'rgba(239,68,68,.08)' : 'transparent'}}>
                      <td style={{padding: '6px', fontWeight: isTurkey ? 700 : 400}}>{i + 1}</td>
                      <td style={{padding: '6px', fontWeight: isTurkey ? 700 : 400, color: isTurkey ? '#ef4444' : 'var(--text-primary)'}}>{isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                      <td style={{padding: '6px', textAlign: 'right'}}>{formatShort(c.total)}</td>
                      <td style={{padding: '6px', textAlign: 'right'}}>%{c.share.toFixed(1)}</td>
                      <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: c.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>
                        {c.cagr5 > 3 ? '🚀' : c.cagr5 > 0 ? '📈' : c.cagr5 > -2 ? '📉' : '⚠️'} %{c.cagr5.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
