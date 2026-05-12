import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type ImportData,
  type ImportAnalytics,
  type YearPoint,
  extractYear,
  formatTon,
  formatShort,
  formatNumber,
} from './redMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  importData: ImportData[];
  series: YearPoint[];
  importAnalytics: ImportAnalytics | null;
};

export default function ImportAnalysisSection({ importData, series, importAnalytics }: Props) {
  const importRangeLabel = useMemo(() => {
    if (!importData.length) return '2010-…';
    const first = String(importData[0].yil);
    const last = String(importData[importData.length - 1].yil);
    return `${first}–${last}`;
  }, [importData]);

  const importComposition = useMemo(() => {
    if (importData.length === 0) return [];
    const latest = importData[importData.length - 1];
    return [
      { name: 'Karkas Et', value: latest.karkas_et_ithalati_ton, color: '#dc2626' },
      { name: 'Besilik Sığır', value: latest.besilik_sigir_bas, color: '#ea580c' },
      { name: 'Küçükbaş', value: latest.besilik_kesimlik_kucukbas_sayisi_bas, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [importData]);

  const ssrProxyLatest = useMemo(() => {
    if (!importAnalytics) return null;
    const importYear = extractYear(importAnalytics.latest.year);
    if (!importYear) return null;

    const prodPoint = [...series]
      .filter((p) => p.year <= importYear && p.totalTon > 0)
      .sort((a, b) => a.year - b.year)
      .at(-1);

    const prodYear = prodPoint?.year ?? 0;
    const prod = prodPoint?.totalTon ?? 0;
    if (!prodYear || prod <= 0) return null;

    const carcassImportTon = importAnalytics.latest.carcass ?? 0;
    const cattleHead = importAnalytics.latest.cattle ?? 0;
    const smallRuminantHead = importAnalytics.latest.smallRuminant ?? 0;

    const cattleCweTon = cattleHead * 0.165;
    const smallRuminantCweTon = smallRuminantHead * 0.05;
    const liveCweTon = cattleCweTon + smallRuminantCweTon;

    const totalImportTon = carcassImportTon + liveCweTon;
    const denom = prod + totalImportTon;
    if (denom <= 0) return null;

    const ssr = (prod / denom) * 100;
    const importShare = (totalImportTon / denom) * 100;
    const carcassShare = (carcassImportTon / denom) * 100;
    const liveShare = (liveCweTon / denom) * 100;

    return {
      year: prodYear,
      importYear,
      ssr,
      importShare,
      carcassShare,
      liveShare,
    };
  }, [importAnalytics, series]);

  const ssrProxyTrend = useMemo(() => {
    if (importData.length === 0 || series.length === 0) return [] as Array<{ yil: string; ssr: number }>;

    const sortedProd = [...series].filter((p) => p.totalTon > 0).sort((a, b) => a.year - b.year);

    const findProdTon = (year: number) => {
      const exact = sortedProd.find((p) => p.year === year);
      if (exact) return exact.totalTon;
      const fallback = sortedProd.filter((p) => p.year <= year).at(-1);
      return fallback?.totalTon ?? 0;
    };

    return importData
      .map((row) => {
        const y = extractYear(row.yil);
        if (!y) return null;

        const prodTon = findProdTon(y);
        if (prodTon <= 0) return null;

        const carcassImportTon = row.karkas_et_ithalati_ton ?? 0;
        const cattleHead = row.besilik_sigir_bas ?? 0;
        const smallRuminantHead = row.besilik_kesimlik_kucukbas_sayisi_bas ?? 0;

        const liveCweTon = cattleHead * 0.165 + smallRuminantHead * 0.05;
        const totalImportTon = carcassImportTon + liveCweTon;
        const denom = prodTon + totalImportTon;
        if (denom <= 0) return null;

        const ssr = (prodTon / denom) * 100;
        return { yil: String(y), ssr };
      })
      .filter((x): x is { yil: string; ssr: number } => Boolean(x));
  }, [importData, series]);

  if (importData.length === 0 || !importAnalytics) return null;

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          📦 Kırmızı Et ve Canlı Hayvan İthalat Analizi ({importRangeLabel})
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Türkiye'nin kırmızı et ve canlı hayvan ithalatının detaylı analizi ve etkileri
        </p>
      </div>

      {/* İthalat Özet KPI Kartları */}
      <div className="kpi-grid" style={{ marginBottom: '30px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KARKAS ET İTHALATI</span>
            <div className="kpi-icon red">🥩</div>
          </div>
          <div className="kpi-value">{formatTon(importAnalytics.latest.carcass)}</div>
          <div className="kpi-subtitle">
            {importAnalytics.yoy && (
              <span style={{ color: importAnalytics.yoy.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
                {importAnalytics.yoy.carcass >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.carcass).toFixed(1)} Yıllık Değişim
              </span>
            )}
          </div>
        </div>

        {ssrProxyLatest && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">YETERLİLİK (PROXY)</span>
              <div className="kpi-icon green">🏠</div>
            </div>
            <div className="kpi-value">%{ssrProxyLatest.ssr.toFixed(1)}</div>
            <div className="kpi-subtitle">
              {ssrProxyLatest.year !== ssrProxyLatest.importYear ? `${ssrProxyLatest.year} üretimi` : `${ssrProxyLatest.year}`}{' '}—
              %{ssrProxyLatest.importShare.toFixed(1)} ithalat payı (karkas: %{ssrProxyLatest.carcassShare.toFixed(1)}, canlı CWE: %{ssrProxyLatest.liveShare.toFixed(1)})
            </div>
          </div>
        )}

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">BESİLİK SIĞIR</span>
            <div className="kpi-icon orange">🐄</div>
          </div>
          <div className="kpi-value">{formatNumber(importAnalytics.latest.cattle)} baş</div>
          <div className="kpi-subtitle">
            {importAnalytics.yoy && (
              <span style={{ color: importAnalytics.yoy.cattle >= 0 ? '#22c55e' : '#ef4444' }}>
                {importAnalytics.yoy.cattle >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.cattle).toFixed(1)} Yıllık Değişim
              </span>
            )}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KÜÇÜKBAŞ</span>
            <div className="kpi-icon yellow">🐑</div>
          </div>
          <div className="kpi-value">{formatNumber(importAnalytics.latest.smallRuminant)} baş</div>
          <div className="kpi-subtitle">
            {importAnalytics.yoy && (
              <span style={{ color: importAnalytics.yoy.smallRuminant >= 0 ? '#22c55e' : '#ef4444' }}>
                {importAnalytics.yoy.smallRuminant >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.smallRuminant).toFixed(1)} Yıllık Değişim
              </span>
            )}
          </div>
        </div>

        {importAnalytics.latest.spending > 0 && (
          <>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">TOPLAM HARCAMA</span>
                <div className="kpi-icon blue">💰</div>
              </div>
              <div className="kpi-value">${formatShort(importAnalytics.latest.spending)}</div>
              <div className="kpi-subtitle">
                {importAnalytics.yoy && (
                  <span style={{ color: importAnalytics.yoy.spending >= 0 ? '#ef4444' : '#22c55e' }}>
                    {importAnalytics.yoy.spending >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.spending).toFixed(1)} Yıllık Değişim
                  </span>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">BİRİM MALİYET</span>
                <div className="kpi-icon green">📊</div>
              </div>
              <div className="kpi-value">${formatNumber(importAnalytics.unitCost)}</div>
              <div className="kpi-subtitle">$/ton (karkas et)</div>
            </div>
          </>
        )}

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">ET İTHALAT CAGR</span>
            <div className="kpi-icon purple">📈</div>
          </div>
          <div className="kpi-value" style={{ color: importAnalytics.cagr.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
            %{importAnalytics.cagr.carcass.toFixed(1)}
          </div>
          <div className="kpi-subtitle">{importRangeLabel} bileşik</div>
        </div>
      </div>

      {/* SSR Proxy Trend */}
      {ssrProxyTrend.length > 0 && (
        <div className="chart-grid" style={{ marginBottom: '20px' }}>
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🏠 Yeterlilik (Proxy) Trendi ({importRangeLabel})</h3>
              <ChartInsightButton title={`🏠 Yeterlilik (Proxy) Trendi (${importRangeLabel})`} description="Kırmızı et yeterlilik proxy trendi" data={ssrProxyTrend} context={{ section: 'Yeterlilik' }} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={ssrProxyTrend} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value: number) => [`%${Number(value).toFixed(1)}`, 'Yeterlilik (Proxy)']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="ssr"
                  name="Yeterlilik (Proxy)"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Kategori Bazında Ayrı Grafikler */}
      <div className="chart-grid" style={{ marginBottom: '20px' }}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥩 Karkas Et İthalatı Trendi</h3>
            <ChartInsightButton title="🥩 Karkas Et İthalatı Trendi" description="Yıllık karkas et ithalat trendi" data={importData} context={{ section: 'Karkas Et' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [`${formatNumber(value)} ton`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="karkas_et_ithalati_ton" name="Karkas Et" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🐄 Besilik Sığır İthalatı Trendi</h3>
            <ChartInsightButton title="🐄 Besilik Sığır İthalatı Trendi" description="Yıllık besilik sığır ithalatı" data={importData} context={{ section: 'Besilik Sığır' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [`${formatNumber(value)} baş`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="besilik_sigir_bas" name="Besilik Sığır" stroke="#ea580c" fill="#ea580c" fillOpacity={0.3} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🐑 Küçükbaş İthalatı Trendi</h3>
            <ChartInsightButton title="🐑 Küçükbaş İthalatı Trendi" description="Yıllık küçükbaş ithalatı" data={importData} context={{ section: 'Küçükbaş' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [`${formatNumber(value)} baş`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="besilik_kesimlik_kucukbas_sayisi_bas" name="Küçükbaş" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {importAnalytics.latest.spending > 0 && (
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>💰 İthalat Harcama Trendi</h3>
              <ChartInsightButton title="💰 İthalat Harcama Trendi" description="Yıllık ithalat harcaması (USD)" data={importData} context={{ section: 'Harcama' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                <Tooltip 
                  formatter={(value: number) => [`$${formatNumber(value)}`]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="toplam_ithalata_odenen_dolar" name="Toplam Harcama" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bileşik İthalat Trendi */}
      <div className="chart-grid" style={{ marginBottom: '20px' }}>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Bileşik İthalat Kompozisyonu Trendi</h3>
            <ChartInsightButton title="📈 Bileşik İthalat Kompozisyonu Trendi" description="Bileşik ithalat kompozisyonu yıllık trendi" data={importData} context={{ section: 'Kompozisyon' }} />
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={importData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Karkas Et') return [`${formatNumber(value)} ton`, name];
                  return [`${formatNumber(value)} baş`, name];
                }}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="karkas_et_ithalati_ton" stackId="1" name="Karkas Et" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} />
              <Area type="monotone" dataKey="besilik_sigir_bas" stackId="2" name="Besilik Sığır" stroke="#ea580c" fill="#ea580c" fillOpacity={0.6} />
              <Area type="monotone" dataKey="besilik_kesimlik_kucukbas_sayisi_bas" stackId="2" name="Küçükbaş" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* İthalat Kompozisyonu & Ortalamalar */}
      <div className="chart-grid" style={{ marginBottom: '20px' }}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 Son Yıl İthalat Dağılımı ({importAnalytics.latest.year})</h3>
            <ChartInsightButton title="🥧 Son Yıl İthalat Dağılımı" description="Son yıl ithalat dönüşüm dağılımı" data={importComposition} context={{ year: importAnalytics.latest.year }} compact />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={importComposition}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={true}
              >
                {importComposition.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Karkas Et') return [`${formatNumber(value)} ton`];
                  return [`${formatNumber(value)} baş`];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Ortalama İthalat Değerleri ({importRangeLabel})</h3>
            <ChartInsightButton title={`📊 Ortalama İthalat Değerleri (${importRangeLabel})`} description={`${importRangeLabel} dönem ortalama ithalat değerleri`} data={importAnalytics ? [importAnalytics.averages] : []} context={{ section: 'Ortalamalar' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart 
              data={[
                { category: 'Karkas Et', value: importAnalytics.averages.carcass, unit: 'ton', color: '#dc2626' },
                { category: 'Besilik Sığır', value: importAnalytics.averages.cattle, unit: 'baş', color: '#ea580c' },
                { category: 'Küçükbaş', value: importAnalytics.averages.smallRuminant, unit: 'baş', color: '#f59e0b' },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="category" 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number, _name: string, props: { payload?: { unit?: string; category?: string } }) => [
                  `${formatNumber(value)} ${props.payload?.unit ?? ''}`,
                  props.payload?.category ?? ''
                ]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[
                  { category: 'Karkas Et', value: importAnalytics.averages.carcass, unit: 'ton', color: '#dc2626' },
                  { category: 'Besilik Sığır', value: importAnalytics.averages.cattle, unit: 'baş', color: '#ea580c' },
                  { category: 'Küçükbaş', value: importAnalytics.averages.smallRuminant, unit: 'baş', color: '#f59e0b' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Etki Analizi Özeti */}
      <div style={{ 
        marginTop: '30px', 
        padding: '24px', 
        background: 'var(--bg-card)', 
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
          📝 İthalat Etki Analizi Özeti
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px' 
        }}>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              📈 Karkas Et CAGR ({importRangeLabel})
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
              %{importAnalytics.cagr.carcass.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {importAnalytics.cagr.carcass >= 0 ? 'Artan trend' : 'Azalan trend'}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              🐄 Besilik Sığır CAGR
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.cattle >= 0 ? '#22c55e' : '#ef4444' }}>
              %{importAnalytics.cagr.cattle.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Yıllık ortalama değişim
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              🐑 Küçükbaş CAGR
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.smallRuminant >= 0 ? '#22c55e' : '#ef4444' }}>
              %{importAnalytics.cagr.smallRuminant.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Bileşik büyüme oranı
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              💰 Harcama CAGR
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
              %{importAnalytics.cagr.spending.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Döviz etkisi dahil
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              📊 Ortalama Yıllık Karkas Et
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {formatNumber(importAnalytics.averages.carcass)} ton
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {importRangeLabel} ortalaması
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              🔢 Ortalama Yıllık Harcama
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              ${formatShort(importAnalytics.averages.spending)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Toplam ithalat maliyeti (USD)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
