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
          💰 Türkiye Kırmızı Et Ekonomik Göstergeleri
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
            <div className="kpi-icon red">💵</div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.dana_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KUZU KARKAS FİYATI</span>
            <div className="kpi-icon green">💵</div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.kuzu_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KARLILIK ORANI</span>
            <div className="kpi-icon blue">📊</div>
          </div>
          <div className="kpi-value" style={{ color: filteredEconomicData[0]?.karlilik >= 0 ? '#22c55e' : '#ef4444' }}>
            {filteredEconomicData[0]?.karlilik.toFixed(2)}%
          </div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">DOLAR KURU</span>
            <div className="kpi-icon yellow">💱</div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.dolar_kuru_tl.toFixed(2)} ₺</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YEM FİYATI</span>
            <div className="kpi-icon orange">🌾</div>
          </div>
          <div className="kpi-value">{filteredEconomicData[0]?.besi_yemi_fiyatlari_tl_kg.toFixed(2)} ₺/kg</div>
          <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
        </div>
      </div>

      {/* Karkas Fiyat Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📈 Karkas Fiyat Trendi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="tarih"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Karkas" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
              <Line type="monotone" dataKey="kuzu_karkas_fiyati_tl_kg" name="Kuzu Karkas" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maliyet, Karlılık, Dolar/Yem */}
      <div className="chart-grid" style={{ marginTop: '20px' }}>
        <div className="chart-card">
          <h3 className="chart-title">💰 Maliyet vs Fiyat</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Bar dataKey="dana_karkas_maliyet_tl_kg" name="Dana Maliyet" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Fiyat" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📊 Karlılık Trendi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`]}
              />
              <Area type="monotone" dataKey="karlilik" name="Karlılık (%)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">💱 Dolar Kuru & Yem Fiyatları</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 40, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
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
        </div>
      </div>

      {/* Korelasyon Analizi */}
      <div className="chart-grid" style={{ marginTop: '20px' }}>
        <div className="chart-card">
          <h3 className="chart-title">🔄 Dolar-Fiyat Korelasyonu</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                label={{ value: 'Dana Karkas Fiyatı (₺/kg)', angle: -90, position: 'left', fill: 'var(--text-secondary)' }}
              />
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
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📈 Besilik Hayvan Fiyatları</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Line type="monotone" dataKey="besilik_dana_fiyatlari_tl_kg" name="Besilik Dana" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
              <Line type="monotone" dataKey="besilik_kucukbas_fiyatlari_tl_kg" name="Besilik Küçükbaş" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📉 Fiyat-Maliyet Farkı</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
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
        </div>
      </div>
    </>
  );
}
