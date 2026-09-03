import { yuzde } from '../../utils/sayi';
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { fetchAgg, latestYear, num } from '../../services/d1';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { translateProduct } from '../../utils/productTranslations';
import { formatNumber, formatShort } from './livestockUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { truncTick } from '../../utils/chartTicks';
import { ChartCard } from '../../components/ui/Card';

interface Props {
  selectedYear: string;
  setLoading: (v: boolean) => void;
}

// Kıta/toplam satırları sunucudaki 'v2' hazır listesiyle dışlanıyor (bu
// sayfanın eski listesiyle aynı içerik + 'China' toplamı).
const R_ISL = 'fao/uretim-hayvansal-islenmis';
const R_BIR = 'fao/uretim-hayvansal-birincil';
const EX = { preset: 'v2' as const, col: 'ulkead' };

// LIKE desenleri COLLATE NOCASE; büyük/küçük varyantlara gerek yok.
const SUT_DESENLERI = ['cheese', 'butter', 'milk', 'yoghurt', 'cream', 'whey', 'buttermilk', 'ghee'];
const YAG_DESENLERI = ['tallow', 'fat', 'lard'];
const esles = (ad: string, desenler: string[]) => {
  const k = ad.toLowerCase();
  return desenler.some((d) => k.includes(d));
};
/** Ürün adını süt / yağ / diğer kategorisine ayırır (eski CASE WHEN karşılığı). */
const kategori = (ad: string): 'dairy' | 'fats' | 'other' =>
  esles(ad, SUT_DESENLERI) ? 'dairy' : esles(ad, YAG_DESENLERI) ? 'fats' : 'other';


export default function LivestockProcessedSection({ selectedYear, setLoading }: Props) {
  const [processedKPIs, setProcessedKPIs] = useState<{
    totalProduction: number; countryCount: number; productCount: number;
    turkeyRank: number; turkeyTotal: number; processingRate: number;
  } | null>(null);
  const [processedCountryData, setProcessedCountryData] = useState<Array<{
    country: string; total: number; dairy: number; fats: number; other: number;
  }>>([]);
  const [processedProductData, setProcessedProductData] = useState<Array<{
    product: string; total: number; turkeyVal: number; turkeyRank: number; topCountry: string;
  }>>([]);
  const [processedTurkeyTrend, setProcessedTurkeyTrend] = useState<Array<{
    year: string; dairy: number; fats: number; other: number;
  }>>([]);
  const [processedGrowthData, setProcessedGrowthData] = useState<Array<{
    product: string; cagr: number; current: number; lifecycle: string;
  }>>([]);
  const [processedInsights, setProcessedInsights] = useState<Insight[]>([]);

  const loadProcessedData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      // Yıl üst sınırı '2023' diye sabitti; işlenmiş ürün tablosunun son DOLU
      // yılı veriden çözülüyor.
      const sonIslenmisYil = (await latestYear(R_ISL, 'year')) ?? 2023;
      const safeYear = String(Math.min(parseInt(yr), sonIslenmisYil));
      const pastYr = String(parseInt(safeYear) - 5);
      const TON = { uretim_birim: 't' };

      const [ulkeUrunRaw, trYilRaw, productRaw, pastProductRaw, rawMilkRaw] = await Promise.all([
        fetchAgg(R_ISL, { groupBy: ['ulkead', 'urunad'], sum: ['uretim_deger'], where: { year: safeYear, ...TON }, exclude: EX }),
        fetchAgg(R_ISL, { groupBy: ['year', 'urunad'], sum: ['uretim_deger'], where: { ulkead: 'Türkiye', ...TON } }),
        fetchAgg(R_ISL, { groupBy: ['urunad'], sum: ['uretim_deger'], where: { year: safeYear, ...TON }, exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc' }),
        fetchAgg(R_ISL, { groupBy: ['urunad'], sum: ['uretim_deger'], where: { year: pastYr, ...TON }, exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc' }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { ulkead: 'Türkiye', year: safeYear, ...TON }, likeAny: { urunad: ['%milk%'] } }),
      ]);

      // SUM(CASE WHEN …) pivotlarının karşılığı: ürün adına göre sınıflandırıp topla.
      const pivotla = <K extends string>(satirlar: typeof ulkeUrunRaw, anahtar: K) => {
        const harita = new Map<string, { total: number; dairy: number; fats: number; other: number }>();
        for (const r of satirlar) {
          const k = String(r[anahtar] ?? '');
          const kayit = harita.get(k) ?? { total: 0, dairy: 0, fats: 0, other: 0 };
          const v = num(r.sum_uretim_deger);
          kayit.total += v;
          kayit[kategori(String(r.urunad ?? ''))] += v;
          harita.set(k, kayit);
        }
        return [...harita.entries()].map(([ad, v]) => ({ ...v, [anahtar]: ad })) as Array<
          { total: number; dairy: number; fats: number; other: number } & Record<string, string | number>>;
      };

      const countryRes = { data: pivotla(ulkeUrunRaw, 'ulkead').sort((a, b) => b.total - a.total) };
      const turkeyTrendRes = { data: pivotla(trYilRaw, 'year').sort((a, b) => Number(a.year) - Number(b.year)) };
      const productRes = { data: productRaw.map((r) => ({ urunad: r.urunad, total: num(r.sum_uretim_deger) })) };
      const pastProductRes = { data: pastProductRaw.map((r) => ({ urunad: r.urunad, total: num(r.sum_uretim_deger) })) };
      const rawMilkRes = { data: [{ total: num(rawMilkRaw[0]?.sum_uretim_deger) }] };


      const countries = (countryRes.data || []).map((d) => ({
        country: translateCountry(String(d.ulkead || '')),
        total: parseFloat(String(d.total || 0)),
        dairy: parseFloat(String(d.dairy || 0)),
        fats: parseFloat(String(d.fats || 0)),
        other: parseFloat(String(d.other || 0)),
      })).filter(c => c.total > 0);
      setProcessedCountryData(countries);

      const trIdx = countries.findIndex(c =>
        c.country.includes('Türkiye') || c.country.toLowerCase().includes('turkey'));
      const tr = trIdx >= 0 ? countries[trIdx] : null;
      const worldTotal = countries.reduce((s, c) => s + c.total, 0);
      const rawMilk = parseFloat(String(rawMilkRes.data?.[0]?.total || 0));
      const processingRate = rawMilk > 0 && tr ? (tr.total / rawMilk) * 100 : 0;

      setProcessedKPIs({
        totalProduction: worldTotal,
        countryCount: countries.length,
        productCount: (productRes.data || []).length,
        turkeyRank: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: tr?.total || 0,
        processingRate,
      });

      const trend = (turkeyTrendRes.data || []).map((d) => ({
        year: String(d.year),
        dairy: parseFloat(String(d.dairy || 0)),
        fats: parseFloat(String(d.fats || 0)),
        other: parseFloat(String(d.other || 0)),
      }));
      setProcessedTurkeyTrend(trend);

      const turkeyProducts = { data: (await fetchAgg(R_ISL, {
        groupBy: ['urunad'], sum: ['uretim_deger'],
        where: { ulkead: 'Türkiye', year: safeYear, ...TON },
      })).map((r) => ({ urunad: r.urunad, val: num(r.sum_uretim_deger) })) };
      const trProdMap: Record<string, number> = {};
      turkeyProducts.data.forEach((d) => {
        trProdMap[String(d.urunad)] = parseFloat(String(d.val || 0));
      });

      const topPerProduct = { data: ulkeUrunRaw
        .map((r) => ({ urunad: r.urunad, ulkead: r.ulkead, val: num(r.sum_uretim_deger) }))
        .sort((a, b) => String(a.urunad).localeCompare(String(b.urunad)) || b.val - a.val) };
      const topMap: Record<string, string> = {};
      topPerProduct.data.forEach((d) => {
        const pn = String(d.urunad);
        if (!topMap[pn]) topMap[pn] = translateCountry(String(d.ulkead || ''));
      });

      const trRankMap: Record<string, number> = {};
      const allByProduct: Record<string, Array<{ country: string; val: number }>> = {};
      topPerProduct.data.forEach((d) => {
        const pn = String(d.urunad);
        if (!allByProduct[pn]) allByProduct[pn] = [];
        allByProduct[pn].push({ country: String(d.ulkead), val: parseFloat(String(d.val || 0)) });
      });
      Object.entries(allByProduct).forEach(([pn, arr]) => {
        arr.sort((a, b) => b.val - a.val);
        const idx = arr.findIndex(a => a.country === 'Türkiye');
        trRankMap[pn] = idx >= 0 ? idx + 1 : 999;
      });

      const products = (productRes.data || []).map((d) => ({
        product: String(d.urunad),
        total: parseFloat(String(d.total || 0)),
        turkeyVal: trProdMap[String(d.urunad)] || 0,
        turkeyRank: trRankMap[String(d.urunad)] || 0,
        topCountry: topMap[String(d.urunad)] || '',
      }));
      setProcessedProductData(products);

      const pastMap: Record<string, number> = {};
      (pastProductRes.data || []).forEach((d) => {
        pastMap[String(d.urunad)] = parseFloat(String(d.total || 0));
      });
      const growths = products.map(p => {
        const past = pastMap[p.product] || 0;
        const cagr = past > 0 ? (Math.pow(p.total / past, 1 / 5) - 1) * 100 : 0;
        const lifecycle = cagr > 5 ? '🌱 Emerging' : cagr > 3 ? '🚀 Growth' : cagr > 0 ? '💎 Mature' : '📉 Declining';
        return { product: p.product, cagr, current: p.total, lifecycle };
      }).sort((a, b) => b.cagr - a.cagr);
      setProcessedGrowthData(growths);

      const pInsights: Insight[] = [];
      let iid = 0;
      if (tr && trIdx >= 0 && trIdx < 20) {
        pInsights.push({ id: `pi${iid++}`, type: 'achievement', severity: 'medium',
          message: `Türkiye işlenmiş hayvansal üretimde dünya #${trIdx + 1} – toplam ${formatNumber(tr.total)} ton`, category: 'SIRALAMA' });
      }
      if (processingRate > 0) {
        pInsights.push({ id: `pi${iid++}`, type: processingRate > 20 ? 'achievement' : 'warning', severity: 'medium',
          message: `Türkiye süt işleme oranı: %${processingRate.toFixed(1)} (ham süt → işlenmiş ürün dönüşümü)`, category: 'VERİMLİLİK' });
      }
      const trBestProd = products
        .filter(p => p.turkeyRank > 0 && p.turkeyRank <= 10)
        .sort((a, b) => a.turkeyRank - b.turkeyRank);
      if (trBestProd.length > 0) {
        pInsights.push({ id: `pi${iid++}`, type: 'achievement', severity: 'high',
          message: `Türkiye'nin en güçlü işlenmiş ürünü: ${translateProduct(trBestProd[0].product)} (Dünya #${trBestProd[0].turkeyRank})`, category: 'REKABET' });
      }
      const fastGrowing = growths.filter(g => g.cagr > 3 && g.current > 1e6);
      if (fastGrowing.length > 0) {
        pInsights.push({ id: `pi${iid++}`, type: 'growth', severity: 'medium',
          message: `En hızlı büyüyen: ${translateProduct(fastGrowing[0].product)} (%${fastGrowing[0].cagr.toFixed(1)} CAGR)`, category: 'BÜYÜME' });
      }
      const declining = growths.filter(g => g.cagr < -2 && g.current > 1e5);
      if (declining.length > 0) {
        pInsights.push({ id: `pi${iid}`, type: 'decline', severity: 'medium',
          message: `Dikkat: ${translateProduct(declining[0].product)} küresel olarak daralıyor (%${Math.abs(declining[0].cagr).toFixed(1)} yıllık)`, category: 'RİSK' });
      }
      setProcessedInsights(pInsights);

    } catch (error) {
      console.error('Processed data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, setLoading]);

  useEffect(() => {
    loadProcessedData();
  }, [loadProcessedData]);

  if (!processedKPIs) return null;

  return (
    <>
      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">İŞLENMİŞ ÜRETİM</span></div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: '#8b5cf6' }}>
            {formatShort(processedKPIs.totalProduction)}
          </div>
          <div className="kpi-subtitle">
            {processedKPIs.countryCount} ülke · {processedKPIs.productCount} ürün tipi
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE SIRASI</span>
            <div className="kpi-icon red">#{processedKPIs.turkeyRank}</div>
          </div>
          <div className="kpi-value">{formatShort(processedKPIs.turkeyTotal)}</div>
          <div className="kpi-subtitle">
            Pay: {yuzde(processedKPIs.totalProduction > 0? ((processedKPIs.turkeyTotal / processedKPIs.totalProduction) * 100) : 0, 2)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">İŞLEME ORANI</span></div>
          <div className="kpi-value" style={{ color: processedKPIs.processingRate > 20 ? '#22c55e' : '#f59e0b' }}>
            {yuzde(processedKPIs.processingRate, 1)}
          </div>
          <div className="kpi-subtitle">Ham süt → İşlenmiş ürün dönüşümü</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">ÜRÜN ÇESİTLİLİĞİ</span></div>
          <div className="kpi-value" style={{ color: '#06b6d4' }}>
            {processedProductData.filter(p => p.turkeyVal > 0).length}
          </div>
          <div className="kpi-subtitle">Türkiye üretim yaptığı ürün sayısı / {processedKPIs.productCount}</div>
        </div>
      </div>

      {/* Insights */}
      {processedInsights.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <InsightCard insights={processedInsights} />
        </div>
      )}

      {/* Turkey Best Products */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🇹🇷 Türkiye'nin Güçlü Olduğu İşlenmiş Ürünler</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15, padding: 15 }}>
          {processedProductData.filter(p => p.turkeyRank > 0 && p.turkeyRank <= 20).sort((a, b) => a.turkeyRank - b.turkeyRank).slice(0, 8).map((p, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16,
              border: `1px solid ${p.turkeyRank <= 5 ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '1.5rem', fontWeight: 700,
                color: p.turkeyRank <= 3 ? '#f59e0b' : p.turkeyRank <= 10 ? '#22c55e' : 'var(--text-primary)',
                marginBottom: 5,
              }}>#{p.turkeyRank}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, minHeight: 32 }}>
                {translateProduct(p.product).length > 40 ? translateProduct(p.product).substring(0, 40) + '...' : translateProduct(p.product)}
              </div>
              <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '1.1rem' }}>{formatShort(p.turkeyVal)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Lider: {p.topCountry}
              </div>
              {p.total > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 8, transition: 'width .5s',
                      width: `${Math.min((p.turkeyVal / p.total) * 100 * 5, 100)}%`,
                      background: p.turkeyRank <= 5 ? '#22c55e' : '#3b82f6',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                    {yuzde(((p.turkeyVal / p.total) * 100), 1)} pay
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid" style={{ marginTop: 20 }}>
        <ChartCard title={<>Top 15 İşlenmiş Ürnün Üreticileri ({selectedYear})</>} action={<ChartInsightButton title="Top 15 İşlenmiş Ürnün Üreticileri" description="Seçilen yılda işlenmiş hayvansal ürünlerde önde gelen 15 ülke" data={processedCountryData.slice(0, 15)} context={{ yıl: selectedYear }} />}>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={processedCountryData.slice(0, 15).map(c => ({
                name: c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country,
                dairy: c.dairy / 1e6, fats: c.fats / 1e6, other: c.other / 1e6,
                isTR: c.country.includes('Türkiye') || c.country.toLowerCase().includes('turkey'),
              }))}
              layout="vertical"
              margin={{ top: 5, right: 8, left: 4, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${Number(v).toFixed(0)}M`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={95} interval={0} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number, n: string) => [`${(v as number).toFixed(2)}M ton`, n === 'dairy' ? '🧀 Süt Ürünleri' : n === 'fats' ? '🫒 Yağlar' : '📦 Diğer']} />
              <Legend formatter={(v: string) => v === 'dairy' ? '🧀 Süt Ürünleri' : v === 'fats' ? '🫒 Yağlar' : '📦 Diğer'} />
              <Bar dataKey="dairy" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="fats" stackId="a" fill="#f59e0b" />
              <Bar dataKey="other" stackId="a" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📊 Ürnün CAGR & Yaşam Döngüsü (5 Yıllık)" action={<ChartInsightButton title="İşlenmiş Ürnün CAGR & Yaşam Döngüsü" description="5 yıllık işlenmiş hayvansal ürünlerin büyüme ve yaşam döngüsü analizi" data={processedGrowthData.slice(0, 15)} context={{}} compact />}>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={processedGrowthData.slice(0, 15).map(g => ({
                name: translateProduct(g.product).length > 25 ? translateProduct(g.product).substring(0, 25) + '..' : translateProduct(g.product),
                cagr: g.cagr,
                fill: g.cagr > 5 ? '#22c55e' : g.cagr > 0 ? '#3b82f6' : g.cagr > -3 ? '#f59e0b' : '#ef4444',
              }))}
              layout="vertical"
              margin={{ top: 5, right: 8, left: 4, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${yuzde(Number(v), 1)}`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={110} tickFormatter={truncTick} interval={0} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number) => [`%${(v as number).toFixed(2)} CAGR`, 'Büyüme']} />
              {processedGrowthData.slice(0, 15).map((g, i) => (
                <Bar key={i} dataKey="cagr" fill={g.cagr > 5 ? '#22c55e' : g.cagr > 0 ? '#3b82f6' : g.cagr > -3 ? '#f59e0b' : '#ef4444'} />
              ))}
              <Bar dataKey="cagr" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Turkey Trend */}
      <ChartCard title="📈 Türkiye İşlenmiş Ürnün Trendi (Tüm Yıllar)" action={<ChartInsightButton title="Türkiye İşlenmiş Ürnün Trendi" description="Türkiye'nin tüm yıllar işlenmiş hayvansal üretim trendi" data={processedTurkeyTrend} context={{}} />}>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={processedTurkeyTrend} margin={{ top: 10, right: 8, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${(Number(v) / 1e6).toFixed(1)}M`} width={46} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              formatter={(v: number, n: string) => [formatNumber(v) + ' ton', n === 'dairy' ? '🧀 Süt Ürünleri' : n === 'fats' ? '🫒 Yağlar' : '📦 Diğer']} />
            <Legend formatter={(v: string) => v === 'dairy' ? '🧀 Süt Ürünleri' : v === 'fats' ? '🫒 Yağlar' : '📦 Diğer'} />
            <Area type="monotone" dataKey="dairy" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
            <Area type="monotone" dataKey="fats" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
            <Area type="monotone" dataKey="other" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Product Rankings Table */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">Tüm İşlenmiş Ürünler – Dünya & Türkiye ({selectedYear})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                {['Ürün', 'Dünya Toplam', 'Lider Ülke', 'TR Üretim', 'TR Sıra', 'TR Pay', 'Yaşam Döngüsü'].map(h => (
                  <th key={h} style={{
                    padding: 12,
                    textAlign: h === 'Ürün' || h === 'Lider Ülke' ? 'left' : h === 'Yaşam Döngüsü' ? 'center' : 'right',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedProductData.map((p, i) => {
                const growth = processedGrowthData.find(g => g.product === p.product);
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: p.turkeyRank > 0 && p.turkeyRank <= 5 ? 'rgba(34,197,94,.05)' : 'transparent',
                  }}>
                    <td style={{ padding: 12, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {translateProduct(p.product)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatShort(p.total)}</td>
                    <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{p.topCountry}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: p.turkeyVal > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                      {p.turkeyVal > 0 ? formatShort(p.turkeyVal) : '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {p.turkeyRank > 0 && p.turkeyRank < 999 ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                          background: p.turkeyRank <= 5 ? 'rgba(34,197,94,.2)' : p.turkeyRank <= 15 ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.05)',
                          color: p.turkeyRank <= 5 ? '#22c55e' : p.turkeyRank <= 15 ? '#3b82f6' : 'var(--text-secondary)',
                        }}>#{p.turkeyRank}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {p.turkeyVal > 0 && p.total > 0 ? `%${((p.turkeyVal / p.total) * 100).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', fontSize: '0.85rem' }}>
                      {growth ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem',
                          background: growth.cagr > 3 ? 'rgba(34,197,94,.15)' : growth.cagr > 0 ? 'rgba(59,130,246,.15)' : growth.cagr > -3 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)',
                          color: growth.cagr > 3 ? '#22c55e' : growth.cagr > 0 ? '#3b82f6' : growth.cagr > -3 ? '#f59e0b' : '#ef4444',
                        }}>
                          {growth.lifecycle} {growth.cagr > 0 ? '+' : ''}{growth.cagr.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{
          marginTop: 15, padding: 15, background: 'rgba(139,92,246,.1)', borderRadius: 8,
          border: '1px solid rgba(139,92,246,.3)'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            💡 <strong>Not:</strong> İşlenmiş ürünler peynir, tereyağı, yoğurt, süt tozu, hayvansal yağlar ve ipek gibi katma değerli ürünleri kapsar.
            Veri kaynağı: FAO · fao_uretim_hayvansal_islenmis ({processedProductData.length} ürün, 2000-2023)
          </div>
        </div>
      </div>
    </>
  );
}
