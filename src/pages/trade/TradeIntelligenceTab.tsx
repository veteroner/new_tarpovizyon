import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart,
} from 'recharts';
import {
  AlertTriangle, BarChart3, Calendar, Globe, Shield, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { Loading } from '../../components/Loading';
import { formatMoney } from '../../services/api';
import { useTradeIntelligenceData, MONTHS_TR } from './useTradeIntelligenceData';
import type { HHIResult } from './useTradeIntelligenceData';

const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#991b1b' };

export default function TradeIntelligenceTab() {
  const {
    loading, year, setYear, yearOptions,
    seasonalData, hhiExport, hhiImport, imbalanced, unitPrices, opportunities, radarData,
    totalAlerts, riskScore,
  } = useTradeIntelligenceData();

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Zap className="w-6 h-6 text-amber-500" />
            Ticaret İçgörüleri
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Mevsimsellik, pazar yoğunlaşma, birim fiyat trendi, dengesizlik &amp; fırsat analizi
          </p>
        </div>
        <select
          className="px-3 py-2 border rounded-lg text-sm"
          value={year}
          onChange={e => setYear(e.target.value)}
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 border-2 ${riskScore >= 60 ? 'border-green-200 bg-green-50' : riskScore >= 40 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Genel Sağlık Skoru</span>
          </div>
          <div className={`text-3xl font-bold ${riskScore >= 60 ? 'text-green-700' : riskScore >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
            {riskScore}/100
          </div>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Dengesizlik Uyarıları</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{totalAlerts}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ürün (ithalat&gt;3x ihracat)</p>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>İhracat HHI</span>
          </div>
          <div className={`text-3xl font-bold ${hhiExport && hhiExport.hhi > 1500 ? 'text-red-600' : 'text-green-600'}`}>
            {hhiExport?.hhi?.toLocaleString() || 0}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {hhiExport?.hhi && hhiExport.hhi > 2500 ? 'Çok yoğun' : hhiExport?.hhi && hhiExport.hhi > 1500 ? 'Yoğun' : hhiExport?.hhi && hhiExport.hhi > 1000 ? 'Orta' : 'Rekabetçi'}
          </p>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Sezonsal Fırsatlar</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{opportunities.length}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ürün (mevsimsel avantaj)</p>
        </div>
      </div>

      {/* Radar + HHI Detay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-4 h-4 text-green-600" />
            Ticaret Sağlık Profili
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Skor" dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <strong>Yorum:</strong> {riskScore >= 70
              ? 'Ticaret profili sağlıklı. Çeşitlilik ve denge iyi seviyede.'
              : riskScore >= 45
                ? 'Orta risk. Bazı ürünlerde yoğunlaşma ve dengesizlik tespit edildi.'
                : 'Yüksek risk! Pazar yoğunlaşması aşırı, ithalat bağımlılığı yüksek.'
            }
          </div>
        </div>

        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-4 h-4 text-blue-600" />
            HHI Pazar Yoğunlaşma Endeksi
          </h3>
          <div className="space-y-6">
            {[hhiExport, hhiImport].filter(Boolean).map((hhi) => (
              <div key={(hhi as HHIResult).type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{(hhi as HHIResult).type}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${(hhi as HHIResult).riskLevel === 'critical' ? 'bg-red-100 text-red-700' : (hhi as HHIResult).riskLevel === 'high' ? 'bg-orange-100 text-orange-700' : (hhi as HHIResult).riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    HHI: {(hhi as HHIResult).hhi.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (hhi as HHIResult).hhi / 40)}%`,
                      backgroundColor: RISK_COLORS[(hhi as HHIResult).riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.low,
                    }}
                  />
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Top 3 ülke payı: %{(hhi as HHIResult).top3share.toFixed(1)}</div>
                <div className="flex flex-wrap gap-1">
                  {(hhi as HHIResult).topCountries.map(c => (
                    <span key={c.name} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {c.name} <strong>%{c.share.toFixed(1)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-xs bg-blue-50 text-blue-700">
            <strong>HHI Ölçeği:</strong> &lt;1000 Rekabetçi | 1000-1500 Orta | 1500-2500 Yoğun | &gt;2500 Çok Yoğun
          </div>
        </div>
      </div>

      {/* Mevsimsellik Heatmap */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4 text-purple-600" />
          Mevsimsellik Heatmap — Ürün × Ay İhracat Yoğunluğu ({year})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-primary)' }}>
                <th className="text-left px-2 py-2 sticky left-0 z-10" style={{ background: 'var(--bg-primary)' }}>Ürün</th>
                {Object.values(MONTHS_TR).map(m => (
                  <th key={m} className="px-2 py-2 text-center min-w-[50px]">{m}</th>
                ))}
                <th className="px-2 py-2 text-center">Amp.</th>
              </tr>
            </thead>
            <tbody>
              {seasonalData.map((s, idx) => {
                const max = Math.max(...s.months);
                return (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1.5 sticky left-0 z-10 font-medium whitespace-nowrap" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {s.product.length > 22 ? s.product.substring(0, 22) + '..' : s.product}
                    </td>
                    {s.months.map((v, i) => {
                      const intensity = max > 0 ? v / max : 0;
                      const bg = intensity > 0.8 ? 'bg-green-600 text-white' :
                        intensity > 0.5 ? 'bg-green-300 text-green-900' :
                          intensity > 0.2 ? 'bg-green-100 text-green-800' :
                            v > 0 ? 'bg-green-50 text-green-700' : 'text-gray-300';
                      return (
                        <td key={i} className={`px-1 py-1.5 text-center ${bg} font-mono`}>
                          {v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : v > 0 ? '·' : '-'}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-bold ${s.amplitude > 100 ? 'text-red-600' : s.amplitude > 50 ? 'text-amber-600' : 'text-green-600'}`}>
                        %{s.amplitude.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Amplitüd = (Peak - Ortalama) / Ortalama × 100. Yüksek amplitüd = güçlü mevsimsellik
        </p>
      </div>

      {/* Ticaret Dengesizliği */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Ticaret Dengesizliği Uyarıları — {year}
        </h3>
        {imbalanced.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Ciddi dengesizlik tespit edilmedi ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <th className="text-left px-3 py-2">Ürün</th>
                  <th className="text-right px-3 py-2">İhracat</th>
                  <th className="text-right px-3 py-2">İthalat</th>
                  <th className="text-right px-3 py-2">Oran</th>
                  <th className="text-center px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {imbalanced.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-green-50">
                    <td className="px-3 py-2 font-medium">{r.product}</td>
                    <td className="px-3 py-2 text-right text-green-600">{formatMoney(r.exp)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatMoney(r.imp)}</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {r.ratio === Infinity ? '∞' : `${r.ratio.toFixed(1)}x`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.direction === 'İthalat Ağırlıklı' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-0.5 rounded-full">
                          <TrendingDown className="w-3 h-3" /> İthalat Bağımlı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                          <TrendingUp className="w-3 h-3" /> İhracat Gücü
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Birim Fiyat Trendi */}
      {unitPrices.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Birim Fiyat Trendi ($/birim) — Top 5 Ürün
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unitPrices.map((up, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'var(--text-primary)' }}>{up.product}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={up.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="yil" fontSize={9} />
                    <YAxis fontSize={9} tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                    <Bar dataKey="exp_usd_ton" fill="#10b981" name="İhracat $/birim" opacity={0.6} />
                    <Line dataKey="imp_usd_ton" stroke="#f59e0b" name="İthalat $/birim" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sezonsal Fırsat Takvimi */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4 text-indigo-600" />
          Sezonsal İhracat Fırsat Takvimi — {year}
        </h3>
        {opportunities.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Belirgin mevsimsel fırsat bulunamadı</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={opportunities.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={10} tickFormatter={v => `${v.toFixed(1)}x`} />
                <YAxis type="category" dataKey="product" fontSize={10} width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}x`, 'Mevsimsel Endeks']} />
                <Bar dataKey="seasonalIndex" name="Mevsimsel Endeks" radius={[0, 4, 4, 0]}>
                  {opportunities.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={i < 3 ? '#7c3aed' : i < 6 ? '#a78bfa' : '#c4b5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {opportunities.slice(0, 9).map((o, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium truncate mr-2" style={{ color: 'var(--text-primary)' }}>{o.product}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-purple-600 font-bold">{o.bestMonths.join(', ')}</span>
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>|</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatMoney(o.peakExp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mevsimsellik Trend */}
      {seasonalData.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-4 h-4 text-teal-600" />
            En Yüksek Mevsimsel Amplitüd — Top 3 Ürün Aylık Profil
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={Object.entries(MONTHS_TR).map(([k, v]) => ({
              ax: v,
              ...(seasonalData.slice(0, 3).reduce((acc, s, i) => {
                acc[`p${i}`] = s.months[Number(k) - 1] || 0;
                return acc;
              }, {} as Record<string, number>)),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ax" fontSize={10} />
              <YAxis fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
              <Legend />
              {seasonalData.slice(0, 3).map((s, i) => (
                <Area
                  key={i}
                  type="monotone"
                  dataKey={`p${i}`}
                  name={s.product.substring(0, 20)}
                  stroke={(['#10b981', '#f59e0b', '#6366f1'] as string[])[i]}
                  fill={(['#10b981', '#f59e0b', '#6366f1'] as string[])[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
