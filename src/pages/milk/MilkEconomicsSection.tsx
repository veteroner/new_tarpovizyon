import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line, BarChart, Bar, Cell
} from 'recharts';
import { type MilkEconomicData, type WorldMilkPrices } from './milkUtils';

type Props = {
  worldMilkPrices: WorldMilkPrices | null;
  economicData: MilkEconomicData[];
  econStartDate: string;
  setEconStartDate: (v: string) => void;
  econEndDate: string;
  setEconEndDate: (v: string) => void;
};

export default function MilkEconomicsSection({
  worldMilkPrices, economicData,
  econStartDate, setEconStartDate, econEndDate, setEconEndDate
}: Props) {
  const filteredData = useMemo(() => {
    return economicData.filter(d => {
      if (!econStartDate || !econEndDate) return true;
      return d.tarih >= econStartDate && d.tarih <= econEndDate;
    });
  }, [economicData, econStartDate, econEndDate]);

  const chronological = useMemo(() => filteredData.slice().reverse(), [filteredData]);

  const yearlySupport = useMemo(() => {
    const yearlyData: Record<string, { totalDestek: number; totalFiyat: number; count: number }> = {};
    filteredData.forEach(item => {
      const year = item.tarih.substring(0, 4);
      if (!yearlyData[year]) {
        yearlyData[year] = { totalDestek: 0, totalFiyat: 0, count: 0 };
      }
      yearlyData[year].totalDestek += item.litre_basina_cig_sut_destegi_tl;
      yearlyData[year].totalFiyat += item.usk_cig_sut_tavsiye_fiyati_tl_lt;
      yearlyData[year].count += 1;
    });
    return Object.entries(yearlyData)
      .map(([year, data]) => ({
        yil: year,
        avgDestek: data.totalDestek / data.count,
        avgFiyat: data.totalFiyat / data.count,
        destekOrani: (data.totalDestek / data.totalFiyat) * 100
      }))
      .sort((a, b) => a.yil.localeCompare(b.yil));
  }, [filteredData]);

  const latest = filteredData[0];

  return (
    <>
      {/* Dünya Süt Fiyatları */}
      {worldMilkPrices && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🌍 Dünya Süt Fiyatları Karşılaştırması
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye ve dünya ülkeleri çiğ süt fiyatları karşılaştırması (USD/kg)
            </p>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💵 Ülkelere Göre Süt Fiyatları
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart 
                data={[
                  { ulke: 'ABD Class 3', fiyat: worldMilkPrices.abd_class_3 },
                  { ulke: 'AB 27', fiyat: worldMilkPrices.ab_27 },
                  { ulke: 'Yeni Zelanda', fiyat: worldMilkPrices.yeni_zelanda },
                  { ulke: 'Almanya', fiyat: worldMilkPrices.almanya },
                  { ulke: 'İtalya', fiyat: worldMilkPrices.italya },
                  { ulke: 'Türkiye', fiyat: worldMilkPrices.turkiye },
                ]}
                margin={{ top: 10, right: 24, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="ulke" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(3)} USD/kg`]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="fiyat" name="Fiyat" radius={[8, 8, 0, 0]}>
                  {[0,1,2,3,4,5].map((index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Ekonomik Göstergeler */}
      {economicData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🥛 Çiğ Süt Ekonomik Göstergeleri
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Fiyatlar, maliyetler, pariteler ve karlılık analizi
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Başlangıç</label>
                <input
                  type="month"
                  value={econStartDate}
                  onChange={(e) => setEconStartDate(e.target.value)}
                  max={econEndDate}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'white', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Bitiş</label>
                <input
                  type="month"
                  value={econEndDate}
                  onChange={(e) => setEconEndDate(e.target.value)}
                  min={econStartDate}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'white', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/* KPI Kartları */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
            gap: '20px', 
            marginBottom: '32px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              padding: '24px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>💰</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  ÜSK TAVSİYE FİYATI
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {latest?.usk_cig_sut_tavsiye_fiyati_tl_lt.toFixed(2)} ₺/lt
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  {latest?.tarih}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
              padding: '24px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(249, 115, 22, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📊</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  ÜRETİM MALİYETİ
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {latest?.cig_sut_uretim_maliyeti_tl_lt.toFixed(2)} ₺/lt
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  {latest?.tarih}
                </div>
              </div>
            </div>

            <div style={{ 
              background: (latest?.karlilik ?? 0) >= 0 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '24px', borderRadius: '14px',
              boxShadow: (latest?.karlilik ?? 0) >= 0 
                ? '0 4px 16px rgba(34, 197, 94, 0.25)'
                : '0 4px 16px rgba(239, 68, 68, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📈</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  KARLILIK ORANI
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {(latest?.karlilik ?? 0) >= 0 ? '+' : ''}{latest?.karlilik.toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  {latest?.tarih}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              padding: '24px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🌾</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  SÜT YEM PARİTESİ
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {latest?.sut_yem_paritesi.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  {latest?.tarih}
                </div>
              </div>
            </div>
          </div>

          {/* Fiyat ve Maliyet Trendi */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              gridColumn: 'span 2',
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Fiyat ve Maliyet Trendi
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value.toFixed(2)} ₺/lt`]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="cig_sut_uretim_maliyeti_tl_lt" name="Maliyet Alanı" fill="#fef3c7" stroke="none" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="usk_cig_sut_tavsiye_fiyati_tl_lt" name="ÜSK Tavsiye Fiyatı" stroke="#059669" strokeWidth={4} dot={{ fill: '#059669', r: 5 }} />
                  <Line type="monotone" dataKey="cig_sut_uretim_maliyeti_tl_lt" name="Üretim Maliyeti" stroke="#dc2626" strokeWidth={4} dot={{ fill: '#dc2626', r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yem Fiyatları KPI */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              padding: '20px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🌾</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>SÜT YEMİ (19% HP)</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{latest?.sut_yemi_19_hp.toFixed(2)} ₺/kg</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>{latest?.tarih}</div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
              padding: '20px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(6, 182, 212, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🌽</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>MISIR SİLAJI</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{latest?.misir_silaji.toFixed(2)} ₺/kg</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>{latest?.tarih}</div>
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              padding: '20px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🍀</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>YONCA</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{latest?.yonca.toFixed(2)} ₺/kg</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px', fontWeight: '600' }}>{latest?.tarih}</div>
              </div>
            </div>
          </div>

          {/* Yem Fiyatları Detay Grafikleri */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Süt Yemi */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌾 Süt Yemi Fiyatları (19% HP)
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="sut_yemi_19_hp" name="Süt Yemi" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.4} strokeWidth={2} />
                  <Line type="monotone" dataKey="sut_yemi_19_hp" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Mısır Silajı */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌽 Mısır Silajı Fiyatları
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="misir_silaji" name="Mısır Silajı" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.4} strokeWidth={2} />
                  <Line type="monotone" dataKey="misir_silaji" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Yonca */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🍀 Yonca Fiyatları
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]} />
                  <Area type="monotone" dataKey="yonca" name="Yonca" fill="#10b981" stroke="#10b981" fillOpacity={0.4} strokeWidth={2} />
                  <Line type="monotone" dataKey="yonca" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Süt-Yem Paritesi */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📈 Süt-Yem Paritesi
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chronological}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)}`]} />
                  <Legend />
                  <Bar dataKey="sut_yem_paritesi" name="Süt-Yem Paritesi" fill="#3b82f6" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                  <Line type="monotone" dataKey="sut_yem_paritesi_destek_dahil" name="Destek Dahil" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Destek Oranı */}
            <div style={{ 
              background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
              border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎁 Destek Oranı (Fiyat İçinde Destek Payı)
              </h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={yearlySupport}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: '%', angle: 0, position: 'top', offset: 10 }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(_value: number, _name: string, props: { payload?: { destekOrani?: number; avgDestek?: number; avgFiyat?: number } }) => {
                      const payload = props.payload;
                      return [
                        `%${payload?.destekOrani?.toFixed(1) ?? '-'} (Ort. Destek: ${payload?.avgDestek?.toFixed(2) ?? '-'} ₺ / Ort. Fiyat: ${payload?.avgFiyat?.toFixed(2) ?? '-'} ₺)`
                      ];
                    }}
                  />
                  <Legend formatter={() => 'Yıllık Ortalama Destek Oranı'} />
                  <Bar dataKey="destekOrani" name="Destek Oranı (%)" fill="#10b981" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
}
