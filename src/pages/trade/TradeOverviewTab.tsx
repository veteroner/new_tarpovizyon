import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Scale, ArrowLeftRight, Zap, AlertTriangle } from 'lucide-react';
import { FlowSankeyCard } from '../../components/FlowSankeyCard';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { TreemapContent } from '../../components/TreemapContent';
import { WorldTradeMap, type WorldTradeMetric, type CountryTradeMetrics } from '../../components/WorldTradeMap';
import { formatMoney } from '../../services/api';
import { toWorldGeoCountryKey } from '../../utils/countryTranslations';
import { useTradeOverviewData } from './useTradeOverviewData';

const GROUP_FILTER_LABELS = {
  all: 'Tum Gruplar',
  bitkisel: 'Bitkisel',
  hayvansal: 'Hayvansal',
} as const;

export default function TradeOverviewTab() {
  const {
    loading,
    selectedYear, setSelectedYear, yearOptions,
    productGroupFilter, setProductGroupFilter,
    expTotal, impTotal,
    monthlyData, yearlyData,
    topExpProducts, topImpProducts, topExpCountries, topImpCountries,
    fastestGrowing, biggestImportIncrease, top5CountryShare,
    balance, ratio, yoyExpGrowth, plantShare,
    treemapExpData, treemapImpData,
  } = useTradeOverviewData();

  const [worldMapMetric, setWorldMapMetric] = useState<WorldTradeMetric>('exportValue');

  const worldCountryMetrics = useMemo<Record<string, CountryTradeMetrics>>(() => {
    const acc: Record<string, CountryTradeMetrics> = {};
    const ingest = (rows: { name: string; exp: number; imp: number }[]) => {
      rows.forEach(r => {
        const key = toWorldGeoCountryKey(r.name);
        if (!key) return;
        if (!acc[key]) {
          acc[key] = { exportValue: 0, importValue: 0, balanceValue: 0 };
        }
        acc[key].exportValue = Math.max(acc[key].exportValue, r.exp || 0);
        acc[key].importValue = Math.max(acc[key].importValue, r.imp || 0);
        acc[key].balanceValue = acc[key].exportValue - acc[key].importValue;
      });
    };
    ingest(topExpCountries);
    ingest(topImpCountries);
    return acc;
  }, [topExpCountries, topImpCountries]);

  if (loading) return <Loading />;

  return (
    <div>
      {/* Year Filter */}
      <div className="date-filter" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="date-filter" style={{ marginBottom: 20 }}>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="filter-label">Urun Grubu Filtresi</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(GROUP_FILTER_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setProductGroupFilter(value as keyof typeof GROUP_FILTER_LABELS)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: productGroupFilter === value ? 'var(--primary)' : 'var(--bg-card)',
                  color: productGroupFilter === value ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam İhracat"
          value={formatMoney(expTotal)}
          subtitle={`Yıllık: ${yoyExpGrowth >= 0 ? '+' : ''}${yoyExpGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          color="green"
          large
        />
        <KPICard
          title="Toplam İthalat"
          value={formatMoney(impTotal)}
          subtitle={`${selectedYear} toplamı`}
          icon={TrendingDown}
          color="orange"
          large
        />
        <KPICard
          title="Dış Ticaret Dengesi"
          value={formatMoney(balance)}
          subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'}
          icon={Scale}
          color={balance >= 0 ? 'green' : 'orange'}
        />
        <KPICard
          title="İhracat/İthalat Oranı"
          value={ratio.toFixed(2)}
          subtitle={ratio >= 1 ? 'Pozitif denge' : 'Negatif denge'}
          icon={ArrowLeftRight}
          color="blue"
        />
        <KPICard
          title="Bitkisel Pay"
          value={`%${plantShare.toFixed(1)}`}
          subtitle={`Hayvansal: %${(100 - plantShare).toFixed(1)}`}
          icon={TrendingUp}
          color="purple"
        />
        <KPICard
          title="Yıllık Büyüme"
          value={`${yoyExpGrowth >= 0 ? '+' : ''}${yoyExpGrowth.toFixed(1)}%`}
          subtitle="İhracat büyümesi"
          icon={Zap}
          color={yoyExpGrowth >= 0 ? 'green' : 'orange'}
        />
      </div>

      {/* Intelligence Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {fastestGrowing && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp size={18} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>En Hızlı Büyüyen İhracat</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fastestGrowing.name}</div>
            <div style={{ fontSize: 13, color: '#10b981' }}>+{fastestGrowing.growth.toFixed(1)}% büyüme</div>
          </div>
        )}

        {biggestImportIncrease && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>En Çok Artan İthalat</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{biggestImportIncrease.name}</div>
            <div style={{ fontSize: 13, color: '#f59e0b' }}>+{biggestImportIncrease.growth.toFixed(1)}% artış</div>
          </div>
        )}

        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Scale size={18} color="#6366f1" />
            <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 13 }}>Ülke Yoğunlaşması</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>%{top5CountryShare.toFixed(1)}</div>
          <div style={{ fontSize: 13, color: '#6366f1' }}>İlk 5 ülke ihracat payı</div>
        </div>

        <div style={{
          background: balance >= 0
            ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
          border: balance >= 0
            ? '1px solid rgba(16,185,129,0.3)'
            : '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {balance >= 0 ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#ef4444" />}
            <span style={{ color: balance >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
              Ticaret Dengesi Sinyali
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {balance >= 0 ? '🟢 FAZLA' : '🔴 AÇIK'}
          </div>
          <div style={{ fontSize: 13, color: balance >= 0 ? '#10b981' : '#ef4444' }}>
            {formatMoney(Math.abs(balance))} {balance >= 0 ? 'dış ticaret fazlası' : 'dış ticaret açığı'}
          </div>
        </div>
      </div>

      {/* Charts Row 1: Monthly + Yearly */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📊 Aylık İhracat/İthalat Trendi ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📈 Yıllık Trend + Ticaret Dengesi (2000–2025)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={2} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Ticaret Dengesi'} />
              <Bar yAxisId="left" dataKey="exp" name="exp" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Bar yAxisId="left" dataKey="imp" name="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="denge" name="denge" stroke="#6366f1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Treemaps */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🟢 İhracat Ürün Dağılımı ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap data={treemapExpData} dataKey="size" stroke="#fff" content={<TreemapContent />}>
              {treemapExpData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat Değeri']} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🟠 İthalat Ürün Dağılımı ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap data={treemapImpData} dataKey="size" stroke="#fff" content={<TreemapContent />}>
              {treemapImpData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İthalat Değeri']} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3: Countries */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">🌍 Top 10 İhracat Ülkesi - İhracat vs İthalat ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topExpCountries.map(c => ({
              name: c.name.length > 18 ? c.name.substring(0, 18) + '..' : c.name,
              İhracat: c.exp / 1e6,
              İthalat: c.imp / 1e6,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dünya Ticaret Haritası */}
      {Object.keys(worldCountryMetrics).length > 0 && (
        <div className="chart-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <h3 className="chart-title" style={{ margin: 0 }}>🗺️ Dünya Ticaret Haritası ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'exportValue', label: 'İhracat' },
                { key: 'importValue', label: 'İthalat' },
                { key: 'balanceValue', label: 'Denge' },
              ] as { key: WorldTradeMetric; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setWorldMapMetric(opt.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: worldMapMetric === opt.key ? 'var(--primary)' : 'var(--bg-card)',
                    color: worldMapMetric === opt.key ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <WorldTradeMap
            metric={worldMapMetric}
            countryMetrics={worldCountryMetrics}
            height={460}
          />
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
            Top {Object.keys(worldCountryMetrics).length} ülke birleştirilmiş ihracat/ithalat verisi. Renk yoğunluğu metrik büyüklüğünü, kırmızı/yeşil ayrımı denge metriğinde açık/fazlayı gösterir.
          </div>
        </div>
      )}

      {/* Sankey: İhracat Akış */}
      {topExpCountries.length > 0 && (
        <FlowSankeyCard
          title={`🌊 İhracat Akış Haritası — Türkiye → Hedef Ülkeler (${selectedYear})`}
          subtitle={`${GROUP_FILTER_LABELS[productGroupFilter]} ihracatının ülkelere dağılımı`}
          nodes={[
            { name: 'Türkiye', color: '#10b981' },
            ...topExpCountries.map(c => ({
              name: c.name.length > 18 ? c.name.slice(0, 17) + '..' : c.name,
            })),
          ]}
          links={topExpCountries.map((c, i) => ({ source: 0, target: i + 1, value: c.exp }))}
          height={420}
          formatValue={v => formatMoney(v)}
        />
      )}

      {topImpCountries.length > 0 && (
        <FlowSankeyCard
          title={`🌊 İthalat Akış Haritası — Kaynak Ülkeler → Türkiye (${selectedYear})`}
          subtitle={`${GROUP_FILTER_LABELS[productGroupFilter]} ithalatının kaynak ülke dağılımı`}
          nodes={[
            ...topImpCountries.map(c => ({
              name: c.name.length > 18 ? c.name.slice(0, 17) + '..' : c.name,
            })),
            { name: 'Türkiye', color: '#f59e0b' },
          ]}
          links={topImpCountries.map((c, i) => ({ source: i, target: topImpCountries.length, value: c.imp }))}
          height={420}
          formatValue={v => formatMoney(v)}
        />
      )}

      {/* Products Tables */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🏆 Top İhracat Ürünleri ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Ürün</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Kategori</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Değer ($)</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {topExpProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: p.category === 'bitkisel' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.category === 'bitkisel' ? '#10b981' : '#ef4444',
                      }}>
                        {p.category === 'bitkisel' ? '🌿 Bitkisel' : '🐄 Hayvansal'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {formatMoney(p.value)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      %{expTotal > 0 ? ((p.value / expTotal) * 100).toFixed(1) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📦 Top İthalat Ürünleri ({selectedYear}) — {GROUP_FILTER_LABELS[productGroupFilter]}</h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Ürün</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Kategori</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Değer ($)</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {topImpProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: p.category === 'bitkisel' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                        color: p.category === 'bitkisel' ? '#f59e0b' : '#8b5cf6',
                      }}>
                        {p.category === 'bitkisel' ? '🌿 Bitkisel' : '🐄 Hayvansal'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>
                      {formatMoney(p.value)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      %{impTotal > 0 ? ((p.value / impTotal) * 100).toFixed(1) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
