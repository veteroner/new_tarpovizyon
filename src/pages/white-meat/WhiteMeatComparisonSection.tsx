import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo } from 'react';
import type { TuikChickenData, TuikTurkeyMeatData, PoultryTradeData } from './whiteMeatUtils';
import { formatShort } from './whiteMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  tuikData: TuikChickenData[];
  turkeyMeatData: TuikTurkeyMeatData[];
  quailMeatData: TuikTurkeyMeatData[];
  tradeData: PoultryTradeData[];
};

export default function WhiteMeatComparisonSection({ tuikData, turkeyMeatData, quailMeatData, tradeData }: Props) {
  if ((!tuikData || tuikData.length === 0) && (!turkeyMeatData || turkeyMeatData.length === 0) && (!quailMeatData || quailMeatData.length === 0)) return null;

  // Ticaret intelligence hesaplamaları
  const tradeIntelligence = useMemo(() => {
    if (!tradeData || tradeData.length === 0) return null;
    const latest = tradeData[tradeData.length - 1];
    const prev = tradeData[tradeData.length - 2];
    const totalIhracat = tradeData.reduce((s, d) => s + d.ihracat_musd, 0);
    const totalIthalat = tradeData.reduce((s, d) => s + d.ithalat_musd, 0);
    const exportCAGR = tradeData.length > 1
      ? (Math.pow(latest.ihracat_musd / tradeData[0].ihracat_musd, 1 / (tradeData.length - 1)) - 1) * 100
      : 0;
    const yoyExport = prev ? ((latest.ihracat_musd - prev.ihracat_musd) / prev.ihracat_musd) * 100 : 0;
    return { latest, prev, totalIhracat, totalIthalat, exportCAGR, yoyExport, netBalance: latest.ihracat_musd - latest.ithalat_musd };
  }, [tradeData]);

  return (
    <>
      {/* Ticaret Intelligence Bölümü */}
      {tradeIntelligence && tradeData.length > 0 && (
        <>
          <div style={{ marginTop: '60px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              🌍 Piliç Eti Dış Ticaret Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Türkiye piliç eti ihracat ve ithalat performansı — yıllık ticaret akışları ve denge analizi
            </p>
          </div>

          {/* Ticaret KPI Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: `İHRACAT (${tradeIntelligence.latest.yil})`, value: `$${tradeIntelligence.latest.ihracat_musd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: '#22c55e', icon: '📤', sub: `${tradeIntelligence.yoyExport >= 0 ? '+' : ''}${tradeIntelligence.yoyExport.toFixed(1)}% YoY` },
              { label: `İTHALAT (${tradeIntelligence.latest.yil})`, value: `$${tradeIntelligence.latest.ithalat_musd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: '#ef4444', icon: '📥', sub: 'Yem hammaddesi ağırlıklı' },
              { label: 'NET TİCARET DENGESİ', value: `$${tradeIntelligence.netBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: tradeIntelligence.netBalance > 0 ? '#10b981' : '#ef4444', icon: '⚖️', sub: tradeIntelligence.netBalance > 0 ? '✅ Net ihracatçı' : '❌ Net ithalatçı' },
              { label: 'İHRACAT CAGR', value: `${tradeIntelligence.exportCAGR >= 0 ? '+' : ''}${tradeIntelligence.exportCAGR.toFixed(1)}%`, color: '#3b82f6', icon: '📈', sub: `${tradeData[0].yil}–${tradeIntelligence.latest.yil} bileşik` },
            ].map(kpi => (
              <div key={kpi.label} className="kpi-card" style={{ borderTop: `3px solid ${kpi.color}` }}>
                <div className="kpi-header"><span className="kpi-title" style={{ fontSize: '0.7rem' }}>{kpi.label}</span><span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span></div>
                <div className="kpi-value" style={{ color: kpi.color, fontSize: '1.4rem' }}>{kpi.value}</div>
                <div className="kpi-subtitle">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Ticaret Trend Grafiği */}
          <div className="chart-grid" style={{ marginBottom: '40px' }}>
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 İhracat vs İthalat Trendi (M$)</h3>
                <ChartInsightButton title="📊 Piliç Eti Dış Ticaret Trendi" description="Türkiye piliç eti ihracat ve ithalat gelişimi" data={tradeData} context={{ section: 'Ticaret' }} />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={tradeData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${formatShort(v)}M`} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(v: number, name: string) => [`$${v.toLocaleString('tr-TR')} M`, name]} />
                  <Legend />
                  <Bar dataKey="ihracat_musd" name="İhracat (M$)" fill="#22c55e" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ithalat_musd" name="İthalat (M$)" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                  <Area dataKey={(d: PoultryTradeData) => d.ihracat_musd - d.ithalat_musd} name="Net Denge (M$)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '60px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          📊 Toplam Beyaz Et Karşılaştırması
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          Tavuk, Hindi ve Bıldırcın eti üretim trendlerinin karşılaştırmalı analizi
        </p>
      </div>

      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Beyaz Et Türlerinin Yıllık Karşılaştırması (ton)</h3>
            <ChartInsightButton title="📈 Beyaz Et Türlerinin Yıllık Karşılaştırması" description="Tavuk, hindi ve bıldırcın eti yıllık üretim karşılaştırması" data={tuikData} context={{ section: 'Karşılaştırma' }} />
          </div>
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={(() => {
              const allYears = new Set<string>();
              tuikData.forEach(d => allYears.add(d.year));
              turkeyMeatData.forEach(d => allYears.add(d.year));
              quailMeatData.forEach(d => allYears.add(d.year));

              return Array.from(allYears).sort().map(year => ({
                year,
                tavuk: tuikData.find(d => d.year === year)?.meatProduction || 0,
                hindi: turkeyMeatData.find(d => d.year === year)?.production || 0,
                bildircin: quailMeatData.find(d => d.year === year)?.production || 0,
              }));
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number, name: string) => [Number(value).toLocaleString('tr-TR') + ' ton', name]} />
              <Legend />
              <Bar dataKey="tavuk" name="Tavuk Eti" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hindi" name="Hindi Eti" fill="#ea580c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bildircin" name="Bıldırcın Eti" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Son Yıl Pay Dağılımı */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 Son Yıl Beyaz Et Bileşimi</h3>
            <ChartInsightButton title="🥧 Son Yıl Beyaz Et Bileşimi" description="Son yıl beyaz et tür dağılımı" data={tuikData.slice(0,1)} context={{ section: 'Bileşim' }} compact />
          </div>
          <div style={{ padding: '20px' }}>
            {(() => {
              const latestTavuk = tuikData[0]?.meatProduction || 0;
              const latestHindi = turkeyMeatData[0]?.production || 0;
              const latestBildircin = quailMeatData[0]?.production || 0;
              const total = latestTavuk + latestHindi + latestBildircin;

              const items = [
                { name: 'Tavuk Eti', value: latestTavuk, color: '#f97316', emoji: '🐔' },
                { name: 'Hindi Eti', value: latestHindi, color: '#ea580c', emoji: '🦃' },
                { name: 'Bıldırcın Eti', value: latestBildircin, color: '#8b5cf6', emoji: '🐦' },
              ];

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {items.map(item => (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{item.emoji} {item.name}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.value.toLocaleString('tr-TR')} ton ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TOPLAM BEYAZ ET</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {total.toLocaleString('tr-TR')} ton
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Toplam Beyaz Et Trendi */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Toplam Beyaz Et Trendi</h3>
            <ChartInsightButton title="📈 Toplam Beyaz Et Trendi" description="Tüm beyaz et türlerinin toplam üretim trendi" data={tuikData} context={{ section: 'Toplam Trend' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={(() => {
              const allYears = new Set<string>();
              tuikData.forEach(d => allYears.add(d.year));
              turkeyMeatData.forEach(d => allYears.add(d.year));
              quailMeatData.forEach(d => allYears.add(d.year));

              return Array.from(allYears).sort().map(year => {
                const tavuk = tuikData.find(d => d.year === year)?.meatProduction || 0;
                const hindi = turkeyMeatData.find(d => d.year === year)?.production || 0;
                const bildircin = quailMeatData.find(d => d.year === year)?.production || 0;
                return { year, toplam: tavuk + hindi + bildircin };
              });
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Toplam']} />
              <Area type="monotone" dataKey="toplam" name="Toplam Beyaz Et" fill="#10b981" stroke="#10b981" fillOpacity={0.3} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
