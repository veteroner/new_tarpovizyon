import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Scatter, ScatterChart, ZAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRightLeft, BarChart3, Brain, Crosshair, FileWarning,
  Lightbulb, Shield, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { useCrossIntelligenceData } from './crossIntelligence/useCrossIntelligenceData';
import type { ScatterPoint } from './crossIntelligence/useCrossIntelligenceData';

export default function CrossIntelligencePage() {
  const {
    loading, error,
    selected, setSelected,
    crossData, insights, radar, scatterData, foodSecurityTable,
    product,
    retry,
  } = useCrossIntelligenceData();

  if (loading) return <Loading />;
  if (error) return <ErrorState title="Çapraz analiz yüklenemedi" onRetry={retry} />;

  const latestRow = crossData[crossData.length - 1];

  return (
    <div className="space-y-6 pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Brain className="w-7 h-7 text-green-600" />
            Çapraz İçgörü
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Üretim ↔ Fiyat ↔ Ticaret ↔ Gıda Güvenliği bağlantısı
          </p>
        </div>
        <select
          className="px-4 py-2 border-2 border-green-200 rounded-lg text-sm font-medium bg-green-50"
          value={selected}
          onChange={e => setSelected(Number(e.target.value))}
        >
          {['Buğday','Arpa','Mısır','Pirinç','Ayçiçeği','Şekerpancarı','Patates','Mercimek','Nohut','Çay'].map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>

      {/* Insights Panel */}
      <div className="rounded-xl p-5 shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Akıllı Sinyaller — {product.label}
        </h3>
        <div className="space-y-2">
          {insights.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
              m.type === 'danger' ? 'bg-red-500/20 border border-red-500/30' :
              m.type === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' :
              m.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
              'bg-blue-500/20 border border-blue-500/30'
            }`}>
              {m.type === 'danger' ? <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> :
               m.type === 'warning' ? <FileWarning className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /> :
               m.type === 'success' ? <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> :
               <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {latestRow && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border p-5 shadow-sm min-h-[120px] flex flex-col justify-between" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Üretim (Son Yıl)</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{latestRow.production > 1e6 ? `${(latestRow.production / 1e6).toFixed(1)}M ton` : `${(latestRow.production / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-5 shadow-sm min-h-[120px] flex flex-col justify-between" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>İthalat</p>
            <p className="text-2xl font-bold text-red-600">{latestRow.imports > 1e6 ? `${(latestRow.imports / 1e6).toFixed(1)}M ton` : `${(latestRow.imports / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-5 shadow-sm min-h-[120px] flex flex-col justify-between" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>İhracat</p>
            <p className="text-2xl font-bold text-green-600">{latestRow.exports > 1e6 ? `${(latestRow.exports / 1e6).toFixed(1)}M ton` : `${(latestRow.exports / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-5 shadow-sm min-h-[120px] flex flex-col justify-between" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Yeterlilik</p>
            <p className={`text-2xl font-bold ${latestRow.sufficiency >= 100 ? 'text-green-600' : latestRow.sufficiency >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
              %{latestRow.sufficiency.toFixed(0)}
            </p>
          </div>
          <div className="rounded-xl border p-5 shadow-sm min-h-[120px] flex flex-col justify-between" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Fiyat Endeksi</p>
            <p className="text-2xl font-bold text-purple-600">{latestRow.priceIndex.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Main Cross Chart + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ArrowRightLeft className="w-4 h-4 text-green-600" />
            {product.label} — Üretim × İthalat × İhracat × Fiyat (2015-2024)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={crossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" fontSize={10} />
              <YAxis yAxisId="left" fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" fontSize={9} />
              <Tooltip formatter={(v: number, name: string) => {
                if (name.includes('Fiyat') || name.includes('Yeterlilik')) return [v.toFixed(1), name];
                return [v > 1e6 ? `${(v / 1e6).toFixed(2)}M ton` : `${(v / 1e3).toFixed(0)}K ton`, name];
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="production" fill="#10b981" name="Üretim" opacity={0.7} />
              <Bar yAxisId="left" dataKey="imports" fill="#ef4444" name="İthalat" opacity={0.7} />
              <Bar yAxisId="left" dataKey="exports" fill="#3b82f6" name="İhracat" opacity={0.7} />
              <Line yAxisId="right" type="monotone" dataKey="priceIndex" stroke="#8b5cf6" strokeWidth={2.5} name="Fiyat Endeksi" dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="sufficiency" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Yeterlilik %" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-4 h-4 text-green-600" />
            Gıda Güvenliği Radarı
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name={product.label} dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {radar.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-primary)' }}>{r.dimension}</span>
                <span className={`font-bold ${r.value >= 70 ? 'text-green-600' : r.value >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {r.value.toFixed(0)}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production vs Sufficiency Scatter */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Crosshair className="w-4 h-4 text-blue-600" />
          Üretim vs Yeterlilik Derecesi — Tüm Ürünler (2023/24)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" name="Üretim (ton)" fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
            <YAxis dataKey="y" name="Yeterlilik %" fontSize={9} domain={[0, 'auto']} />
            <ZAxis dataKey="size" range={[50, 400]} />
            <Tooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload as ScatterPoint;
              return (
                <div className="border rounded-lg shadow-lg p-3 text-xs" style={{ background: 'var(--bg-card)' }}>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                  <p>Üretim: {d.x > 1e6 ? `${(d.x / 1e6).toFixed(1)}M ton` : `${(d.x / 1e3).toFixed(0)}K ton`}</p>
                  <p className={d.y >= 100 ? 'text-green-600' : 'text-red-600'}>Yeterlilik: %{d.y.toFixed(0)}</p>
                </div>
              );
            }} />
            <Scatter data={scatterData} fill="#16a34a"
              cursor="pointer"
              onClick={(d: any) => {
                const labels = ['Buğday','Arpa','Mısır','Pirinç','Ayçiçeği','Şekerpancarı','Patates','Mercimek','Nohut','Çay'];
                const idx = labels.indexOf(d?.name);
                if (idx >= 0 && idx !== selected) {
                  setSelected(idx);
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}>
              {scatterData.map((s, i) => (
                <Cell key={i} fill={s.y >= 100 ? '#10b981' : s.y >= 80 ? '#f59e0b' : '#ef4444'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-primary)' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Yeterli (%100+)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Kısmi (%80-100)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Yetersiz (&lt;%80)</span>
          <span className="ml-auto italic" style={{ color: 'var(--text-secondary)' }}>💡 Bir noktaya tıklayarak ürünü seçebilirsiniz.</span>
        </div>
      </div>

      {/* Food Security Ranking Table */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 className="w-4 h-4 text-red-600" />
          Gıda Güvenliği Risk Sıralaması — En Düşük Yeterlilik (2023/24)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Ürün</th>
                <th className="text-center px-3 py-2">Yeterlilik</th>
                <th className="text-center px-3 py-2">İthalat Bağımlılığı</th>
                <th className="text-center px-3 py-2">Kişi Başı Tüketim</th>
                <th className="text-center px-3 py-2">Trend</th>
                <th className="text-center px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {foodSecurityTable.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-t hover:bg-green-50">
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.product}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold ${r.sufficiency >= 100 ? 'text-green-600' : r.sufficiency >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      %{r.sufficiency.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--bg-primary)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, r.importDep)}%`,
                            backgroundColor: r.importDep > 50 ? '#ef4444' : r.importDep > 20 ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--text-primary)' }}>%{r.importDep.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: 'var(--text-primary)' }}>{r.consumption > 0 ? `${r.consumption.toFixed(1)} kg` : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {r.trend.includes('↑') ? (
                      <span className="text-red-500 text-xs flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> {r.trend}</span>
                    ) : r.trend.includes('↓') ? (
                      <span className="text-green-500 text-xs flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> {r.trend}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.trend}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.sufficiency < 80 && r.importDep > 30 ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">KRİTİK</span>
                    ) : r.sufficiency < 100 ? (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">ORTA</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">DÜŞÜK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Korelasyon Matrisi Heatmap ──────────────────────────────── */}
      {crossData.length > 4 && (() => {
        type CKey = 'production' | 'imports' | 'exports' | 'priceIndex' | 'sufficiency';
        const CORR_KEYS: Array<{ key: CKey; label: string }> = [
          { key: 'production', label: 'Üretim' },
          { key: 'imports', label: 'İthalat' },
          { key: 'exports', label: 'İhracat' },
          { key: 'priceIndex', label: 'Fiyat' },
          { key: 'sufficiency', label: 'Yeterlilik' },
        ];
        const pearson = (xs: number[], ys: number[]): number => {
          const n = xs.length;
          const mx = xs.reduce((a, b) => a + b, 0) / n;
          const my = ys.reduce((a, b) => a + b, 0) / n;
          const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
          const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
          const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
          return dx * dy === 0 ? 0 : num / (dx * dy);
        };
        const cd = crossData as unknown as Record<CKey | 'year', number>[];
        const matrix = CORR_KEYS.map(r =>
          CORR_KEYS.map(c => pearson(cd.map(d => d[r.key]), cd.map(d => d[c.key])))
        );
        const cellBg = (v: number) =>
          v >= 0.7 ? '#15803d' : v >= 0.4 ? '#4ade80' : v >= 0.1 ? '#bbf7d0' :
          v >= -0.1 ? '#f1f5f9' : v >= -0.4 ? '#fca5a5' : v >= -0.7 ? '#ef4444' : '#991b1b';
        const cellFg = (v: number) => (Math.abs(v) >= 0.4 ? '#fff' : 'var(--text-primary)');
        return (
          <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              Gösterge Korelasyon Matrisi — {product.label}
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Pearson korelasyon katsayısı (tüm yıllar). +1 = tam pozitif ilişki, -1 = tam negatif ilişki.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 3, margin: '0 auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: 90 }} />
                    {CORR_KEYS.map(k => (
                      <th key={k.key} style={{ padding: '4px 8px', fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {k.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CORR_KEYS.map((row, ri) => (
                    <tr key={row.key}>
                      <td style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>
                        {row.label}
                      </td>
                      {matrix[ri].map((v, ci) => (
                        <td key={ci} style={{
                          padding: '10px 16px', textAlign: 'center',
                          background: cellBg(v), color: cellFg(v),
                          fontSize: '0.82rem', fontWeight: 700, borderRadius: 6,
                        }}>
                          {v.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><span style={{ display: 'inline-block', width: 12, height: 12, background: '#15803d', borderRadius: 2 }} /> Güçlü (+)</span>
              <span className="flex items-center gap-1"><span style={{ display: 'inline-block', width: 12, height: 12, background: '#4ade80', borderRadius: 2 }} /> Orta (+)</span>
              <span className="flex items-center gap-1"><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f1f5f9', borderRadius: 2, border: '1px solid #e5e7eb' }} /> Zayıf</span>
              <span className="flex items-center gap-1"><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fca5a5', borderRadius: 2 }} /> Orta (-)</span>
              <span className="flex items-center gap-1"><span style={{ display: 'inline-block', width: 12, height: 12, background: '#991b1b', borderRadius: 2 }} /> Güçlü (-)</span>
            </div>
          </div>
        );
      })()}

      {/* ── Segment Decomposition: Arz Dağılımı (Üretim/İthalat/İhracat) ─────── */}
      {crossData.length > 0 && (() => {
        const decomp = crossData.map(d => {
          const supply = d.production + d.imports;
          const consumption = supply - d.exports;
          const importDep = supply > 0 ? (d.imports / supply) * 100 : 0;
          const exportRatio = d.production > 0 ? (d.exports / d.production) * 100 : 0;
          return {
            year: d.year,
            production: d.production,
            imports: d.imports,
            exports: -d.exports, // negative bar — net çıkış
            consumption,
            importDep: parseFloat(importDep.toFixed(1)),
            exportRatio: parseFloat(exportRatio.toFixed(1)),
          };
        });
        const avgImportDep = decomp.reduce((a, b) => a + b.importDep, 0) / decomp.length;
        const avgExportRatio = decomp.reduce((a, b) => a + b.exportRatio, 0) / decomp.length;
        return (
          <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Arz Dağılımı (Segment Decomposition) — {product.label}
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Yerli üretim + ithalat = toplam arz · İhracat negatif olarak gösterilir · Ortalama ithalat bağımlılığı: <strong>%{avgImportDep.toFixed(1)}</strong> · Ortalama ihracat oranı: <strong>%{avgExportRatio.toFixed(1)}</strong>
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={decomp} margin={{ top: 10, right: 55, left: 20, bottom: 5 }} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" fontSize={10} />
                <YAxis yAxisId="left" fontSize={9} tickFormatter={v => {
                  const n = Math.abs(v as number);
                  return n > 1e6 ? `${((v as number) / 1e6).toFixed(0)}M` : `${((v as number) / 1e3).toFixed(0)}K`;
                }} />
                <YAxis yAxisId="right" orientation="right" fontSize={9} domain={[0, 'auto']} tickFormatter={v => `%${v}`} />
                <Tooltip formatter={(v: number, name: string) => {
                  if (name.includes('Bağımlılık') || name.includes('Oran')) return [`%${Math.abs(v).toFixed(1)}`, name];
                  const n = Math.abs(v);
                  return [n > 1e6 ? `${(n / 1e6).toFixed(2)}M ton` : `${(n / 1e3).toFixed(0)}K ton`, name];
                }} />
                <Legend />
                <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" />
                <Bar yAxisId="left" dataKey="production" stackId="supply" fill="#10b981" name="Yerli Üretim" />
                <Bar yAxisId="left" dataKey="imports" stackId="supply" fill="#ef4444" name="İthalat" />
                <Bar yAxisId="left" dataKey="exports" fill="#3b82f6" name="İhracat (negatif)" />
                <Line yAxisId="right" type="monotone" dataKey="importDep" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="İthalat Bağımlılığı %" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Yerli üretim</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> İthalat</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> İhracat (negatif)</span>
              <span className="flex items-center gap-1"><span style={{ width: 20, height: 2, background: '#f59e0b', display: 'inline-block', verticalAlign: 'middle' }} /> İthalat bağımlılığı %</span>
            </div>
          </div>
        );
      })()}

      {/* ── Anomali Tespiti (Z-Skor) ─────────────────────────────── */}
      {crossData.length > 4 && (() => {
        const typed = crossData as unknown as { production: number; year: number }[];
        const vals = typed.map(d => d.production);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
        const anomalyData = typed.map(d => ({
          year: d.year,
          production: d.production,
          z: parseFloat(((d.production - mean) / std).toFixed(2)),
          isOutlier: Math.abs((d.production - mean) / std) > 1.5,
        }));
        const outlierCount = anomalyData.filter(d => d.isOutlier).length;
        return (
          <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Üretim Anomali Tespiti — {product.label}
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Z-skor analizi · |z| &gt; 1,5 olan yıllar anomali olarak işaretlenir · Tespit edilen anomali: <strong>{outlierCount} yıl</strong>
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={anomalyData} margin={{ top: 10, right: 55, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" fontSize={10} />
                <YAxis yAxisId="prod" fontSize={9} tickFormatter={v => (v as number) > 1e6 ? `${((v as number) / 1e6).toFixed(0)}M` : `${((v as number) / 1e3).toFixed(0)}K`} />
                <YAxis yAxisId="z" orientation="right" fontSize={9} domain={[-3.5, 3.5]} tickFormatter={v => `z${(v as number) >= 0 ? '+' : ''}${v}`} />
                <Tooltip formatter={(v: number, name: string) => {
                  if (name === 'Z-Skor') return [`z=${v}`, 'Z-Skor'];
                  return [v > 1e6 ? `${(v / 1e6).toFixed(2)}M ton` : `${(v / 1e3).toFixed(0)}K ton`, 'Üretim'];
                }} />
                <ReferenceLine yAxisId="z" y={1.5} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '+1.5σ', fontSize: 9, fill: '#f59e0b', position: 'right' }} />
                <ReferenceLine yAxisId="z" y={-1.5} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '-1.5σ', fontSize: 9, fill: '#f59e0b', position: 'right' }} />
                <Bar yAxisId="prod" dataKey="production" name="Üretim" isAnimationActive={false}>
                  {anomalyData.map((d, i) => (
                    <Cell key={i} fill={d.isOutlier ? '#ef4444' : '#10b981'} fillOpacity={0.8} />
                  ))}
                </Bar>
                <Line yAxisId="z" type="monotone" dataKey="z" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Z-Skor" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Normal yıl</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Anomali (|z| &gt; 1,5)</span>
              <span className="flex items-center gap-1"><span style={{ width: 20, height: 2, background: '#8b5cf6', display: 'inline-block', verticalAlign: 'middle' }} /> Z-skor</span>
            </div>
          </div>
        );
      })()}

      {/* Cross Correlation Explanation */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '2px solid #16a34a' }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Brain className="w-5 h-5 text-green-600" />
          Çapraz Analiz Nasıl Çalışır?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-primary)' }}>
          <div className="space-y-1">
            <p className="font-medium text-green-700">1. Üretim ↔ Fiyat</p>
            <p className="text-xs">Üretim düşünce fiyatlar artar mı? Arz-talep yasası test edilir.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-blue-700">2. Üretim ↔ Ticaret</p>
            <p className="text-xs">Üretim açığı ithalatla kapatılıyor mu? Bağımlılık oranı ölçülür.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-purple-700">3. Fiyat ↔ Gıda Güvenliği</p>
            <p className="text-xs">Yeterlilik derecesi düşük ürünlerde fiyat volatilitesi yüksek mi?</p>
          </div>
        </div>
      </div>
    </div>
  );
}
