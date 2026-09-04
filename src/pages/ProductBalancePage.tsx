import { seriesColor } from '../utils/chartColors';
import { yuzde } from '../utils/sayi';
import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, LabelList } from 'recharts';
import {
  Wheat, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert,
  Scale, Package, Users, BarChart3, Activity, Search, ArrowRightLeft, Info,
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { FlowSankeyCard } from '../components/FlowSankeyCard';
import { useProductBalanceData, YEAR_LABELS, YEAR_KEYS, PRODUCT_GROUPS, HEATMAP_COLORS, getHeatColor, fmt, pct, GREEN, GREEN_LIGHT, BLUE, RED, ORANGE } from './productBalance/useProductBalanceData';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { compactValue } from '../utils/chartTicks';
import { SplitAxisChart } from '../components/ui/SplitAxisChart';

const CYAN = '#06b6d4';
const PURPLE = '#8b5cf6';

/* ─── Local KPI Card ─── */
/*
 * Kartlardaki sayılar kendi başlarına ne olduklarını söylemiyordu: "Yeterlilik
 * %118,4" bir kullanıcı için ne demek, nereden geliyor? Her kart artık isteğe
 * bağlı bir açıklama taşıyor — ⓘ düğmesiyle açılıyor, varsayılan kapalı, yani
 * bilen kullanıcıyı yormuyor ama bilmeyene cevabı yerinde veriyor.
 */
function AciklamaDugmesi({ metin, renk }: { metin: string; renk: string }) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        aria-label={acik ? 'Açıklamayı gizle' : 'Bu değer nasıl hesaplanıyor?'}
        className="p-1 -m-1 rounded-full flex-shrink-0 transition-opacity"
        style={{ color: renk, opacity: acik ? 1 : 0.55, cursor: 'pointer' }}
      >
        <Info size={15} />
      </button>
      {acik && (
        <p className="text-[11px] leading-relaxed mt-2 basis-full"
           style={{ color: 'var(--text-secondary)' }}>
          {metin}
        </p>
      )}
    </>
  );
}

function KPI({ icon: Icon, title, value, sub, color, alert, aciklama }: {
  icon: typeof Wheat; title: string; value: string; sub?: string; color: string;
  alert?: boolean; aciklama?: string;
}) {
  return (
    <div className={`rounded-xl shadow-md p-5 border-l-4 min-h-[140px] flex flex-col ${alert ? 'animate-pulse' : ''}`}
         style={{ background: 'var(--bg-card)', borderLeftColor: color }}>
      <div className="flex justify-between items-start mb-auto gap-2">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        </div>
        <Icon size={24} style={{ color }} className="opacity-70 flex-shrink-0" />
      </div>
      <div className="mt-2 flex flex-wrap items-start gap-x-2">
        <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
        {aciklama && <AciklamaDugmesi metin={aciklama} renk={color} />}
        {sub && <p className="text-xs basis-full" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function ProductBalancePage() {
  const {
    loading, error, selectedProduct, setSelectedProduct,
    searchTerm, setSearchTerm, activeGroup, setActiveGroup,
    detail, heatmapData, importRanking,
    latestIdx, prevIdx, get, getUnit,
    production, imports, exports, selfSufficiency, perCapita,
    stockChange, supplyUse, importDep, exportRatio, prodYoY, ssYoY,
    waterfallData, yearlyTrend, alerts, foodSecurityScore,
    filteredProducts, groupedProducts,
    perCapitaChartData, perCapitaProducts,
    loadDetail,
  } = useProductBalanceData();

  const humanConsumption = get('İnsan tüketimi');
  const industrialUse = get('Endüstriyel kullanım');
  const feedUse = get('Yemlik kullanım');
  const seedUse = get('Tohumluk kullanım');
  const losses = get('Üretim kayıpları') + get('Kayıplar');
  const domesticUse = Math.max(
    0,
    humanConsumption + industrialUse + feedUse + seedUse + Math.max(0, losses) + Math.max(0, stockChange),
  );

  const sankeyNodes = [
    { name: 'Üretim', color: GREEN },
    { name: 'İthalat', color: BLUE },
    { name: 'Toplam Arz', color: '#6366f1' },
    { name: 'Doğrudan Tüketim', color: ORANGE },
    { name: 'İşleme', color: CYAN },
    { name: 'Yem', color: PURPLE },
    { name: 'Tohum', color: '#64748b' },
    { name: 'Kayıp / Stok', color: '#a855f7' },
    { name: 'İhracat', color: RED },
  ];

  const sankeyLinks = [
    { source: 0, target: 2, value: production },
    ...(imports > 0 ? [{ source: 1, target: 2, value: imports }] : []),
    ...(humanConsumption > 0 ? [{ source: 2, target: 3, value: humanConsumption }] : []),
    ...(industrialUse > 0 ? [{ source: 2, target: 4, value: industrialUse }] : []),
    ...(feedUse > 0 ? [{ source: 2, target: 5, value: feedUse }] : []),
    ...(seedUse > 0 ? [{ source: 2, target: 6, value: seedUse }] : []),
    ...(domesticUse - humanConsumption - industrialUse - feedUse - seedUse > 0
      ? [{ source: 2, target: 7, value: domesticUse - humanConsumption - industrialUse - feedUse - seedUse }]
      : []),
    ...(exports > 0 ? [{ source: 2, target: 8, value: exports }] : []),
  ];

  if (error && !loading) return <ErrorState title="Ürün dengesi yüklenemedi" onRetry={() => selectedProduct && loadDetail(selectedProduct)} />;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Header ─── */}
      <div className="rounded-2xl p-6 shadow-lg" style={{ background: 'var(--bg-card)', borderLeft: '4px solid #16a34a' }}>
        <div className="flex items-center gap-3 mb-2">
          <Scale size={28} style={{ color: '#16a34a' }} />
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Ürün Arz-Talep Dengesi</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          TÜİK Ürün Dengesi Tablosu • 75 Ürün • Gıda Güvenliği &amp; Yeterlilik Analizi • 2014-2024
        </p>
      </div>

      {/* ─── Product Selector ─── */}
      <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(PRODUCT_GROUPS).map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeGroup === g ? 'bg-green-600 text-white shadow-sm' : ''
              }`}
              style={activeGroup !== g ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {groupedProducts.map(p => (
            <button key={p} onClick={() => setSelectedProduct(p)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                selectedProduct === p ? 'bg-green-100 text-green-800 font-bold ring-2 ring-green-400' : ''
              }`}
              style={selectedProduct !== p ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}>
              {p}
            </button>
          ))}
        </div>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-2.5" style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
          <input
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          {searchTerm && (
            <div className="absolute z-20 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto w-full"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {filteredProducts.slice(0, 15).map(p => (
                <div key={p} onClick={() => { setSelectedProduct(p); setSearchTerm(''); }}
                  className="px-3 py-2 text-sm hover:bg-green-50 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}>{p}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? <Loading /> : detail['Üretim'] && (
        <>
          {/* ─── Food Security Score + KPIs ─── */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-2 lg:col-span-1 rounded-xl shadow-md p-4 flex flex-col items-center justify-center border-2 min-h-[140px]"
                 style={{ background: 'var(--bg-card)', borderColor: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }}>
              <Activity size={28} style={{ color: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }} />
              <p className="text-4xl font-black mt-2" style={{ color: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }}>
                {foodSecurityScore}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
                <p className="text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Gıda Güvenlik Skoru</p>
                {/*
                  * Bu skor RESMÎ BİR ENDEKS DEĞİL — bu uygulamanın kendi bileşik
                  * göstergesi. Açıklama şart: 100 üzerinden bir sayı görüp
                  * Global Food Security Index sanmak çok kolay.
                  */}
                <AciklamaDugmesi
                  renk={foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED}
                  metin={
                    'TarpoVizyon’un kendi bileşik göstergesi — resmî bir endeks değildir. '
                    + '100 puan dört parçadan oluşur: kendine yeterlilik (40 puan, %150 ve üstü tam puan), '
                    + 'ithalat bağımlılığı (30 puan, bağımlılık arttıkça düşer), '
                    + 'stok değişimi (15 puan, stok artıyorsa tam) ve '
                    + 'üretim trendi (15 puan, bir önceki yıla göre artış varsa tam). '
                    + '70 üstü yeşil, 40–70 turuncu, altı kırmızı.'
                  }
                />
              </div>
            </div>
            <KPI icon={Wheat} title="Üretim" value={fmt(production) + ' ' + getUnit('Üretim')}
                 sub={`Yıllık: ${prodYoY >= 0 ? '+' : ''}${yuzde(prodYoY, 1)}`} color={GREEN}
                 aciklama={'Seçili ürünün Türkiye’deki yıllık üretim miktarı (TÜİK ürün denge tabloları). '
                   + 'Alttaki yüzde, bir önceki yıla göre değişimi gösterir.'} />
            <KPI icon={selfSufficiency >= 100 ? ShieldCheck : ShieldAlert}
                 title="Yeterlilik" value={pct(selfSufficiency)}
                 sub={`Δ ${ssYoY >= 0 ? '+' : ''}${ssYoY.toFixed(1)} puan`}
                 color={selfSufficiency >= 100 ? GREEN : selfSufficiency >= 70 ? ORANGE : RED}
                 alert={selfSufficiency < 70}
                 aciklama={'Kendine yeterlilik oranı: üretimin yurt içi kullanıma bölümü. '
                   + '%100’ün üstü, ülkenin kendi tüketimini karşılayıp fazla verdiği anlamına gelir; '
                   + 'altı, açığın ithalatla veya stoktan kapatıldığını gösterir.'} />
            <KPI icon={Users} title="Kişi Başı" value={perCapita.toFixed(1) + ' ' + getUnit('Kişi başına tüketim')}
                 sub="Yıllık tüketim" color={BLUE}
                 aciklama={'Bir kişinin yıl boyunca tükettiği ortalama miktar — yurt içi tüketimin nüfusa bölümü. '
                   + 'Fiili tüketimi değil, arz üzerinden hesaplanan ortalamayı gösterir.'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI icon={ArrowRightLeft} title="İthalat Bağımlılığı" value={pct(importDep)}
                 sub={fmt(imports) + ' Ton ithalat'} color={importDep > 30 ? RED : importDep > 15 ? ORANGE : GREEN}
                 alert={importDep > 50}
                 aciklama={'Yurt içi kullanımın ne kadarının ithalatla karşılandığı. '
                   + 'Yükseldikçe dış kaynağa bağımlılık artar: %15 altı yeşil, %15–30 turuncu, üstü kırmızı; '
                   + '%50’yi aşınca kart uyarı verir.'} />
            <KPI icon={TrendingUp} title="İhracat/Üretim" value={pct(exportRatio)}
                 sub={fmt(exports) + ' Ton ihracat'} color={exportRatio > 20 ? GREEN_LIGHT : BLUE}
                 aciklama={'Üretimin yüzde kaçının ihraç edildiği. Yüksek oran, ürünün iç pazardan çok '
                   + 'dış pazara yöneldiğini gösterir.'} />
            <KPI icon={Package} title="Stok Değişimi" value={fmt(stockChange) + ' Ton'}
                 sub={stockChange > 0 ? 'Stok artışı ↑' : 'Stok erimesi ↓'}
                 color={stockChange > 0 ? GREEN : RED} />
          </div>

          {/* ─── Waterfall + Yearly Trend ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>
                <Scale size={16} className="text-green-600" />
                Arz-Talep Akışı — {selectedProduct} ({YEAR_KEYS[latestIdx].replace('y','')})
              </h3>
              <ChartInsightButton title={`Arz-Talep Akışı — ${selectedProduct}`} description="Arz talep akışı" data={waterfallData} context={{ section: 'Ürün Dengesi' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={waterfallData} margin={{ top: 10, right: 8, bottom: 10, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} width={46} />
                  <Tooltip formatter={(v: number) => [fmt(v) + ' Ton', '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((d, i) => (
                      <Cell key={i} fill={d.fill} opacity={d.value < 0 ? 0.8 : 1} />
                    ))}
                  </Bar>
                  <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                Pozitif: Arza eklenen • Negatif: Arzdan düşen
              </p>
            </div>

            <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>
                <BarChart3 size={16} className="text-green-600" />
                10 Yıllık Trend — {selectedProduct}
              </h3>
              <ChartInsightButton title={`10 Yıllık Trend — ${selectedProduct}`} description="10 yıllık ürün trendi" data={yearlyTrend} context={{ section: 'Ürün Dengesi' }} compact />
              </div>
              {/* Sağ eksendeki seri soldakilerden TÜRETİLMİŞ; iki ölçeğin keyfi
              hizası sahte bir kesişme üretiyordu. Ortak x eksenli şeride
              taşındı — bkz. components/ui/SplitAxisChart. */}
          <SplitAxisChart
            data={yearlyTrend as unknown as Record<string, unknown>[]}
            xKey="year"
            height={270}
            stripKey="Yeterlilik"
            stripLabel="Yeterlilik Derecesi"
            stripFormat={(v: number) => `%${Number(v).toFixed(0)}`}
          >
            <Legend />
            <Bar dataKey="Üretim" fill={GREEN} opacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="İthalat" fill={BLUE} opacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="İhracat" fill={ORANGE} opacity={0.7} radius={[3, 3, 0, 0]} />
          </SplitAxisChart>
            </div>
          </div>

          {/* ─── Sankey Akış ─── */}
          {production > 0 && (
            <FlowSankeyCard
              title={`Arz-Kullanım Akış Diyagramı — ${selectedProduct} (${YEAR_KEYS[latestIdx].replace('y', '')})`}
              subtitle="Üretim ve ithalatın doğrudan tüketim, işleme, yem, tohum, kayıp/stok ve ihracata dağılımı"
              nodes={sankeyNodes}
              links={sankeyLinks}
              height={320}
              formatValue={v => `${fmt(v, 0)} Ton`}
            />
          )}

          {/* ─── Detail Table ─── */}
          <div className="rounded-xl shadow-md p-4 overflow-x-auto" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Package size={16} className="text-green-600" />
              Detay Tablosu — {selectedProduct}
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-2 font-medium sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Fasıl</th>
                  <th className="text-left py-2 px-1" style={{ color: 'var(--text-secondary)' }}>Birim</th>
                  {YEAR_LABELS.map(y => (
                    <th key={y} className="text-right py-2 px-2" style={{ color: 'var(--text-primary)' }}>{y}</th>
                  ))}
                  <th className="text-right py-2 px-2" style={{ color: 'var(--text-primary)' }}>Δ%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(detail)
                  .sort(([a], [b]) => a.localeCompare(b, 'tr'))
                  .map(([fasil, data]) => {
                    const last = data.values[latestIdx];
                    const prev = data.values[prevIdx];
                    const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
                    return (
                      <tr key={fasil} className="hover:bg-green-50" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-1.5 px-2 font-medium sticky left-0 whitespace-nowrap"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{fasil}</td>
                        <td className="py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{data.birim}</td>
                        {data.values.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                            {data.birim === '%' ? (v ? v.toFixed(1) + '%' : '-') : fmt(v)}
                          </td>
                        ))}
                        <td className={`py-1.5 px-2 text-right font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : ''}`}
                            style={!change ? { color: 'var(--text-secondary)', opacity: 0.6 } : {}}>
                          {change ? (change > 0 ? '+' : '') + change.toFixed(1) + '%' : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Heatmap ─── */}
      {heatmapData.length > 0 && (
        <div className="rounded-xl shadow-md p-4 overflow-x-auto" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck size={16} className="text-green-600" />
            Yeterlilik Derecesi Haritası — Tüm Ürünler (%)
          </h3>
          <div className="flex gap-3 mb-3">
            {HEATMAP_COLORS.map(c => (
              <div key={c.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
              </div>
            ))}
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-1 px-2 sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Ürün</th>
                {YEAR_LABELS.map(y => (
                  <th key={y} className="text-center py-1 px-1" style={{ color: 'var(--text-secondary)' }}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData
                .filter(h => h.values[latestIdx] > 0)
                .sort((a, b) => a.values[latestIdx] - b.values[latestIdx])
                .map(h => (
                  <tr key={h.urun} className={`cursor-pointer ${selectedProduct === h.urun ? 'bg-green-100 font-bold' : ''}`}
                      onClick={() => setSelectedProduct(h.urun)}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-1 px-2 whitespace-nowrap sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {h.urun}
                    </td>
                    {h.values.map((v, i) => (
                      <td key={i} className="py-1 px-1 text-center">
                        {v > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-white font-bold"
                                style={{ backgroundColor: getHeatColor(v), fontSize: '9px' }}>
                            {v.toFixed(0)}
                          </span>
                        ) : <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Import Dependency + Per Capita ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {importRanking.length > 0 && (
          <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>
              <AlertTriangle size={16} className="text-red-500" />
              İthalat Bağımlılığı Sıralaması (2023/24)
            </h3>
            <ChartInsightButton title="İthalat Bağımlılığı Sıralaması" description="İthalat bağımlılığı sıralaması" data={importRanking} context={{ section: 'Ürün Dengesi' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={Math.max(300, importRanking.length * 28)}>
              <BarChart data={importRanking} layout="vertical" margin={{ top: 5, right: 8, bottom: 5, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="urun" tick={{ fontSize: 10 }} width={95} interval={0} />
                <Tooltip formatter={(v: number) => [v.toFixed(1) + '%', 'İthalat/Arz']} />
                <Bar dataKey="ratio" radius={[0, 4, 4, 0]}>
                  {importRanking.map((d, i) => (
                    <Cell key={i} fill={d.ratio > 50 ? RED : d.ratio > 30 ? ORANGE : GREEN} />
                  ))}
                
                <LabelList dataKey="ratio" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
                <ReferenceLine x={50} stroke={RED} strokeDasharray="5 5"
                               label={{ value: 'Kritik %50', fontSize: 9, fill: RED }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {perCapitaChartData.length > 0 && (
          <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>
              <Users size={16} className="text-blue-600" />
              Kişi Başı Tüketim Trendleri (Kg/yıl)
            </h3>
            <ChartInsightButton title="Kişi Başı Tüketim Trendleri" description="Kişi başı tüketim trendleri (Kg/yıl)" data={perCapitaChartData} context={{ section: 'Ürün Dengesi' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={perCapitaChartData} margin={{ top: 10, right: 8, bottom: 10, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => v.toFixed(0)} tick={{ fontSize: 10 }} width={46} />
                <Tooltip formatter={(v: number) => [v.toFixed(1) + ' Kg', '']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {perCapitaProducts.map((p, i) => (
                  <Area key={p} type="monotone" dataKey={p}
                        stroke={seriesColor(i)}
                        fill={seriesColor(i)}
                        fillOpacity={0.1} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── Food Security Alerts ─── */}
      {alerts.length > 0 && (
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} className="text-red-500" />
            Gıda Güvenliği Uyarıları — Yeterlilik Derecesi Risk Analizi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map(a => (
              <div key={a.urun}
                className={`rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                  a.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                  a.severity === 'warning' ? 'bg-orange-50 border border-orange-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}
                onClick={() => setSelectedProduct(a.urun)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{a.urun}</p>
                    <p className={`text-xs mt-0.5 ${
                      a.severity === 'critical' ? 'text-red-600' :
                      a.severity === 'warning' ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {a.severity === 'critical' ? 'KRİTİK' :
                       a.severity === 'warning' ? 'UYARI' : 'İZLEME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: getHeatColor(a.value) }}>
                      {yuzde(a.value, 0)}
                    </p>
                    <p className={`text-[10px] ${a.trend < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {a.trend >= 0 ? '↑' : '↓'} {Math.abs(a.trend).toFixed(1)} puan
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Intelligence Summary ─── */}
      {detail['Üretim'] && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity size={16} className="text-green-400" />
            İçgörü Özeti — {selectedProduct}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-green-300 font-bold mb-1">Arz Durumu</p>
              <p>{selfSufficiency >= 100
                ? `Kendine yeterli (${yuzde(selfSufficiency, 0)}). Üretim iç talebi karşılıyor.`
                : selfSufficiency >= 70
                ? `Kısmen yeterli (${yuzde(selfSufficiency, 0)}). İthalata %${importDep.toFixed(0)} bağımlılık.`
                : `Yetersiz (${yuzde(selfSufficiency, 0)}). Kritik ithalat bağımlılığı: %${importDep.toFixed(0)}.`}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-blue-300 font-bold mb-1">Üretim Trendi</p>
              <p>{prodYoY > 5
                ? `Güçlü artış (+${yuzde(prodYoY, 1)}). Üretim kapasitesi genişliyor.`
                : prodYoY > 0
                ? `Hafif artış (+${yuzde(prodYoY, 1)}). İstikrarlı üretim.`
                : prodYoY > -5
                ? `Hafif düşüş (${yuzde(prodYoY, 1)}). İzlenmeli.`
                : `Sert düşüş (${yuzde(prodYoY, 1)}). Acil müdahale gerekli.`}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-orange-300 font-bold mb-1">Ticaret Dengesi</p>
              <p>{exports > imports
                ? `Net ihracatçı. İhracat/ithalat: ${(exports/Math.max(imports,1)).toFixed(1)}x.`
                : `Net ithalatçı. İthalat/ihracat: ${(imports/Math.max(exports,1)).toFixed(1)}x.`}
                {' '}AB payı: İhracat {yuzde(get('İhracat AB 27-28') > 0? (get('İhracat AB 27-28') / exports * 100) : 0, 0)},
                İthalat {yuzde(get('İthalat AB 27-28') > 0? (get('İthalat AB 27-28') / imports * 100) : 0, 0)}.</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-purple-300 font-bold mb-1">Kullanım Dağılımı</p>
              <p>İnsan: {supplyUse > 0 ? yuzde(get('İnsan tüketimi') / supplyUse * 100, 0) : '—'}
                {' '}Yem: {supplyUse > 0 ? yuzde(get('Yemlik kullanım') / supplyUse * 100, 0) : '—'}
                {' '}Sanayi: {supplyUse > 0 ? yuzde(get('Endüstriyel kullanım') / supplyUse * 100, 0) : '—'}
                {' '}İhracat: {supplyUse > 0 ? yuzde(exports / supplyUse * 100, 0) : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
