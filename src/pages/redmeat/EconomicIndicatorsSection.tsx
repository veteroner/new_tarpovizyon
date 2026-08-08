import { useState, useMemo, useEffect } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { type EconomicData } from './redMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';
import { ChartCard } from '../../components/ui/Card';
import { ArrowRightLeft, Banknote, BarChart3, Wheat } from 'lucide-react';

type Props = {
  economicData: EconomicData[];
};

export default function EconomicIndicatorsSection({ economicData }: Props) {
  const [econStartDate, setEconStartDate] = useState('');
  const [econEndDate, setEconEndDate] = useState('');

  useEffect(() => {
    if (economicData.length > 0 && !econEndDate) {
      setEconEndDate(economicData[0].tarih);
      setEconStartDate(economicData[Math.min(11, economicData.length - 1)].tarih);
    }
  }, [economicData, econEndDate]);

  const filteredEconomicData = useMemo(() => {
    if (!econStartDate || !econEndDate) return economicData;
    return economicData.filter(d => d.tarih >= econStartDate && d.tarih <= econEndDate);
  }, [economicData, econStartDate, econEndDate]);

  if (filteredEconomicData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Türkiye Kırmızı Et Ekonomik Göstergeleri
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Başlangıç</label>
            <input
              type="month"
              value={econStartDate}
              onChange={(e) => setEconStartDate(e.target.value)}
              max={econEndDate}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Bitiş</label>
            <input
              type="month"
              value={econEndDate}
              onChange={(e) => setEconEndDate(e.target.value)}
              min={econStartDate}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="kpi-grid" style={{ marginBottom: '30px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">DANA KARKAS FİYATI</span>
            <div className="kpi-icon red"><Banknote size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.dana_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KUZU KARKAS FİYATI</span>
            <div className="kpi-icon green"><Banknote size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.kuzu_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KARLILIK ORANI</span>
            <div className="kpi-icon blue"><BarChart3 size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value" style={{ color: filteredEconomicData[0]?.karlilik >= 0 ? '#22c55e' : '#ef4444' }}>
            {filteredEconomicData[0]?.karlilik.toFixed(2)}%
          </div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">DOLAR KURU</span>
            <div className="kpi-icon yellow"><ArrowRightLeft size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.dolar_kuru_tl.toFixed(2)} ₺</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YEM FİYATI</span>
            <div className="kpi-icon orange"><Wheat size={18} aria-hidden="true" /></div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.besi_yemi_fiyatlari_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>
      </div>

      {/* Karkas Fiyat Trendi */}
      <div className="chart-grid">
        <ChartCard title="📈 Karkas Fiyat Trendi" span={2} action={<ChartInsightButton title="📈 Karkas Fiyat Trendi" description="Dana ve kuzu karkas fiyat trendi" data={filteredEconomicData} context={{ section: 'Fiyat Trendi' }} />}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="tarih"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={LINE_Y_DOMAIN} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Karkas" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
              <Line type="monotone" dataKey="kuzu_karkas_fiyati_tl_kg" name="Kuzu Karkas" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Maliyet, Karlılık, Dolar/Yem */}
      <div className="chart-grid" style={{ marginTop: '20px' }}>
        <ChartCard title="💰 Maliyet vs Fiyat" action={<ChartInsightButton title="💰 Maliyet vs Fiyat" description="Dana karkas maliyet ve fiyat karşılaştırması" data={filteredEconomicData} context={{ section: 'Maliyet-Fiyat' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Bar dataKey="dana_karkas_maliyet_tl_kg" name="Dana Maliyet" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Fiyat" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📊 Karlılık Trendi" action={<ChartInsightButton title="📊 Karlılık Trendi" description="Dana karkas karlılık oranı trendi" data={filteredEconomicData} context={{ section: 'Karlılık' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`]}
              />
              <Area type="monotone" dataKey="karlilik" name="Karlılık (%)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="💱 Dolar Kuru &amp; Yem Fiyatları" action={<ChartInsightButton title="💱 Dolar Kuru & Yem Fiyatları" description="Dolar kuru ve besi yemi fiyatları trendi" data={filteredEconomicData} context={{ section: 'Kur-Yem' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={LINE_Y_DOMAIN} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Dolar Kuru') return [`${value.toFixed(2)} ₺`];
                  return [`${value.toFixed(2)} ₺/kg`];
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="dolar_kuru_tl" name="Dolar Kuru" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="besi_yemi_fiyatlari_tl_kg" name="Besi Yemi" stroke="#eab308" strokeWidth={2.5} dot={{ fill: '#eab308', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Korelasyon Analizi */}
      <div className="chart-grid" style={{ marginTop: '20px' }}>
        <ChartCard title="🔄 Dolar-Fiyat Korelasyonu" action={<ChartInsightButton title="🔄 Dolar-Fiyat Korelasyonu" description="Dolar kuru ile dana karkas fiyatı korelasyon analizi" data={filteredEconomicData} context={{ section: 'Korelasyon' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 20, right: 8, bottom: 20, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="dolar_kuru_tl"
                name="Dolar Kuru"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                label={{ value: 'Dolar Kuru (₺)', position: 'bottom', fill: 'var(--text-secondary)' }}
              />
              <YAxis
                dataKey="dana_karkas_fiyati_tl_kg"
                name="Dana Karkas"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                label={{ value: 'Dana Karkas Fiyatı (₺/kg)', angle: -90, position: 'left', fill: 'var(--text-secondary)' }} width={58} />
              <ZAxis range={[50, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Dolar Kuru') return [`${value.toFixed(2)} ₺`];
                  return [`${value.toFixed(2)} ₺/kg`];
                }}
              />
              <Scatter data={filteredEconomicData} fill="#dc2626" name="Dana Karkas" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📈 Besilik Hayvan Fiyatları" action={<ChartInsightButton title="📈 Besilik Hayvan Fiyatları" description="Besilik dana ve küçükbaş hayvan fiyatları" data={filteredEconomicData} context={{ section: 'Besilik Fiyatlar' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={LINE_Y_DOMAIN} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Line type="monotone" dataKey="besilik_dana_fiyatlari_tl_kg" name="Besilik Dana" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
              <Line type="monotone" dataKey="besilik_kucukbas_fiyatlari_tl_kg" name="Besilik Küçükbaş" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📉 Fiyat-Maliyet Farkı" action={<ChartInsightButton title="📉 Fiyat-Maliyet Farkı" description="Dana karkas fiyat-maliyet farkı trendi" data={filteredEconomicData} context={{ section: 'Fiyat-Maliyet Fark' }} compact />}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Bar dataKey="dana_karkas_fiyat_maliyet_farki_tl_kg" name="Fark (Fiyat-Maliyet)" radius={[4, 4, 0, 0]}>
                {filteredEconomicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.dana_karkas_fiyat_maliyet_farki_tl_kg >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
