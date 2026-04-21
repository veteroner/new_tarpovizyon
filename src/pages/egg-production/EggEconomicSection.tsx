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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EggEconomicData } from './eggProductionTypes';

interface EggEconomicSectionProps {
  economicData: EggEconomicData[];
  econStartDate: string;
  setEconStartDate: (v: string) => void;
  econEndDate: string;
  setEconEndDate: (v: string) => void;
}

export function EggEconomicSection({ economicData, econStartDate, setEconStartDate, econEndDate, setEconEndDate }: EggEconomicSectionProps) {
  if (economicData.length === 0) return null;

  const filteredData = economicData.filter((d) => {
    if (!econStartDate || !econEndDate) return true;
    return d.tarih >= econStartDate && d.tarih <= econEndDate;
  });

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          🥚 Yumurta Ekonomik Göstergeleri
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>(
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
                  cursor: 'pointer',
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
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ekonomik KPI Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>ÜRETİCİ FİYATI</span>
            <div style={{ fontSize: '1.5rem' }}>💰</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>{filteredData[0]?.yumurta_uretici_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>TÜKETİCİ FİYATI</span>
            <div style={{ fontSize: '1.5rem' }}>🛒</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2563eb' }}>{filteredData[0]?.tuketici_fiyati_tl.toFixed(2)} ₺/adet</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>KARLILIK ORANI</span>
            <div style={{ fontSize: '1.5rem' }}>📊</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: filteredData[0]?.karlilik >= 0 ? '#22c55e' : '#ef4444' }}>
            {filteredData[0]?.karlilik.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>YEM PARİTESİ</span>
            <div style={{ fontSize: '1.5rem' }}>🌾</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>{filteredData[0]?.parite_yumurta_yem_paritesi.toFixed(2)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
        </div>
      </div>

      {/* Ekonomik Grafikler - Satır 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>💰 Fiyat Gelişimi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Legend />
              <Line type="monotone" dataKey="yumurta_uretici_fiyati_tl_kg" name="Üretici Fiyatı" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 4 }} />
              <Line type="monotone" dataKey="yumurta_maliyet_tl_kg" name="Maliyet" stroke="#dc2626" strokeWidth={4} dot={{ fill: '#dc2626', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>📊 Karlılık Trendi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={filteredData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`]}
              />
              <Area type="monotone" dataKey="karlilik" name="Karlılık (%)" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} strokeWidth={3.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ekonomik Grafikler - Satır 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>🌾 Yem Fiyatı ve Paritesi</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={filteredData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="yumurtaci_tavuk_yemi_tl_kg" name="Yem Fiyatı (₺/kg)" stroke="#f59e0b" strokeWidth={4} dot={{ fill: '#f59e0b', r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="parite_yumurta_yem_paritesi" name="Yem Paritesi" stroke="#6366f1" strokeWidth={4} dot={{ fill: '#6366f1', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>💵 Üretici Fiyatı-Maliyet Farkı</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={filteredData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
              />
              <Bar dataKey="uretici_fiyati_maliyet_farki_tl_kg" name="Fark (Fiyat-Maliyet)" radius={[4, 4, 0, 0]}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.uretici_fiyati_maliyet_farki_tl_kg >= 0 ? '#16a34a' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ekonomik Özet */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
          📝 Yumurta Ekonomik Göstergeleri Özeti
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ortalama Karlılık</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: filteredData.reduce((sum, d) => sum + d.karlilik, 0) / filteredData.length >= 0 ? '#22c55e' : '#ef4444' }}>
              {(filteredData.reduce((sum, d) => sum + d.karlilik, 0) / filteredData.length).toFixed(2)}%
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ortalama Üretici Fiyatı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {(filteredData.reduce((sum, d) => sum + d.yumurta_uretici_fiyati_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ortalama Yem Fiyatı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {(filteredData.reduce((sum, d) => sum + d.yumurtaci_tavuk_yemi_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Veri Aralığı</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
              {filteredData[filteredData.length - 1]?.tarih} - {filteredData[0]?.tarih}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
