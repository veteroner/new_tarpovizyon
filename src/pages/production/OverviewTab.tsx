/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, Layers, Activity, Factory, Leaf, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import {
  formatValue, formatShort, formatHa, formatYield,
  TABS, TURKEY_COLOR, CHART_COLORS
} from './productionTypes';
import type { Insight, OverviewKPIs, SupplyChainData, OverviewTrendPoint, Tab } from './productionTypes';

interface OverviewTabProps {
  overviewKPIs: OverviewKPIs;
  overviewTrends: OverviewTrendPoint[];
  overviewCategoryData: any[];
  overviewTopCountries: any[];
  overviewInsights: Insight[];
  overviewSupplyChain: SupplyChainData | null;
  setActiveTab: (tab: Tab) => void;
}

export function OverviewTab({
  overviewKPIs, overviewTrends, overviewCategoryData,
  overviewTopCountries, overviewInsights, overviewSupplyChain, setActiveTab
}: OverviewTabProps) {
  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <KPICard title="Dünya Toplam Üretim" value={formatValue(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.worldYoY >= 0 ? '+' : ''}${overviewKPIs.worldYoY.toFixed(1)}% | ${overviewKPIs.countryCount} ülke`} icon={Globe} color="blue" large />
        <KPICard title="Dünya Ekim Alanı" value={formatHa(overviewKPIs.worldArea)} subtitle={`${overviewKPIs.productCount} ürün`} icon={Layers} color="green" />
        <KPICard title="Dünya Ort. Verim" value={formatYield(overviewKPIs.worldYield)} subtitle="Tüm ürünler ortalaması" icon={Activity} color="teal" />
        <KPICard title="İşlenmiş Üretim" value={formatValue(overviewKPIs.processedTotal)} subtitle={`İşleme oranı: %${overviewKPIs.processingRatio.toFixed(1)}`} icon={Factory} color="purple" />
      </div>
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <KPICard title="🇹🇷 Türkiye Üretim" value={formatValue(overviewKPIs.turkeyTotal)} subtitle={`Dünya ${overviewKPIs.turkeyRank}. | Pay: %${overviewKPIs.turkeyShare.toFixed(1)} | Yıllık: ${overviewKPIs.turkeyYoY >= 0 ? '+' : ''}${overviewKPIs.turkeyYoY.toFixed(1)}%`} icon={Leaf} color="green" large />
        <KPICard title="🇹🇷 Ekim Alanı" value={formatHa(overviewKPIs.turkeyArea)} subtitle={`${overviewKPIs.turkeyProductCount} ürün`} icon={MapPin} color="teal" />
        <KPICard title="🇹🇷 Ort. Verim" value={formatYield(overviewKPIs.turkeyYield)} subtitle={overviewKPIs.turkeyYield > overviewKPIs.worldYield ? '✅ Dünya üstü' : '⚠️ Dünya altı'} icon={TrendingUp} color={overviewKPIs.turkeyYield > overviewKPIs.worldYield ? 'green' : 'red'} />
        <KPICard title="🇹🇷 İşlenmiş" value={formatValue(overviewKPIs.turkeyProcessedTotal)} subtitle={`İşleme: %${overviewSupplyChain?.turkeyProcessingRatio?.toFixed(1) || '?'}`} icon={Factory} color="orange" />
      </div>

      <div style={{ marginBottom: '24px' }}><InsightCard insights={overviewInsights} maxDisplay={10} /></div>

      {overviewSupplyChain && (
        <div className="chart-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 className="chart-title" style={{ marginBottom: '20px' }}>📦 Tedarik Zinciri — Birincil → İşlenmiş</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '2px solid #10b981' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>🌾 Birincil</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>{formatValue(overviewSupplyChain.primaryTotal)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 {formatValue(overviewSupplyChain.turkeyPrimary)}</div>
            </div>
            <div style={{ fontSize: '28px', color: 'var(--text-secondary)' }}>→</div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(168,85,247,0.1)', borderRadius: '12px', border: '2px solid #a855f7' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>⚙️ İşleme</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#a855f7' }}>%{overviewSupplyChain.processingRatio.toFixed(1)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 %{overviewSupplyChain.turkeyProcessingRatio.toFixed(1)}</div>
            </div>
            <div style={{ fontSize: '28px', color: 'var(--text-secondary)' }}>→</div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '2px solid #3b82f6' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>🏭 İşlenmiş</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6' }}>{formatValue(overviewSupplyChain.processedTotal)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 {formatValue(overviewSupplyChain.turkeyProcessed)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="chart-grid" style={{ marginBottom: '24px' }}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🇹🇷 Türkiye Ürün Kategorileri (2023)</h3>
            <ChartInsightButton title="Türkiye Ürün Kategorileri (2023)" description="Türkiye bitkisel üretim kategori dağılımı" data={overviewCategoryData} context={{ dünyaToplamUretim: overviewKPIs.worldTotal, türkiyeToplamUretim: overviewKPIs.turkeyTotal }} />
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie data={overviewCategoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value"
                label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${p.name} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                {overviewCategoryData.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🌍 Top 15 Üretici Ülke (2023)</h3>
            <ChartInsightButton title="Top 15 Üretici Ülke (2023)" description="Dünya bitkisel üretiminde lider ülkeler" data={overviewTopCountries} context={{ türkiyeSira: overviewKPIs.turkeyRank, türkiyePayi: overviewKPIs.turkeyShare }} />
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={overviewTopCountries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {overviewTopCountries.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid" style={{ marginBottom: '24px' }}>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Dünya Üretim Trendi</h3>
            <ChartInsightButton title="Dünya Üretim Trendi" description="Yıllık dünya bitkisel üretim değişimi" data={overviewTrends} context={{ yillikDegisim: overviewKPIs.worldYoY }} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={overviewTrends}>
              <defs><linearGradient id="ovPG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.1} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
              <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
              <Area type="monotone" dataKey="worldProduction" stroke="#10b981" strokeWidth={2} fill="url(#ovPG)" name="Üretim" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Verim Trendi (kg/ha)</h3>
            <ChartInsightButton title="Verim Trendi (kg/ha)" description="Dünya ortalama verim trendi" data={overviewTrends} context={{ dünyaOrtVerim: overviewKPIs.worldYield, türkiyeVerim: overviewKPIs.turkeyYield }} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overviewTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
              <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
              <Line type="monotone" dataKey="worldYield" stroke="#3b82f6" strokeWidth={2} dot={false} name="Verim" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 className="chart-title" style={{ marginBottom: '16px' }}>🧭 Derin Analiz Modülleri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {TABS.filter(t => t.id !== 'overview').map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '16px', background: 'var(--bg-primary)', border: '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tab.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{tab.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tab.desc}</div>
              <div style={{ marginTop: '8px', color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Detaylı Analiz <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <strong>📊 Metodoloji:</strong> FAO FAOSTAT • {overviewKPIs.countryCount} ülke • {overviewKPIs.productCount} birincil + 24 işlenmiş • CAGR, HHI, Volatilite, Anomali, Forecast
      </div>
    </div>
  );
}
