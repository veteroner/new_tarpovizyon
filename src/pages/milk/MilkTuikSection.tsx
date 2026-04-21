import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line, BarChart, Bar, Cell
} from 'recharts';
import { TUIK_SUT_URUNLER, COLORS, AY_ADLARI, AY_TAM, formatShort, type TuikSutUrunData } from './milkUtils';

type Props = {
  tuikSutData: TuikSutUrunData[];
  selectedTuikSutUrun: string;
  setSelectedTuikSutUrun: (id: string) => void;
  tuikSelectedData: TuikSutUrunData[];
  tuikLatestYear: TuikSutUrunData | undefined;
  tuikYoyChange: number;
  tuikAllProductsLatest: (TuikSutUrunData & { birim?: string })[];
  tuikSeasonality: { ay: string; ayTam: string; miktar: number }[];
  tuikSeasonHeatmap: Record<string, number | string>[];
  tuikGrowthRates: { yil: number; rate: number }[];
};

export default function MilkTuikSection({
  tuikSutData, selectedTuikSutUrun, setSelectedTuikSutUrun,
  tuikSelectedData, tuikLatestYear, tuikYoyChange,
  tuikAllProductsLatest, tuikSeasonality, tuikSeasonHeatmap, tuikGrowthRates
}: Props) {
  if (!tuikSutData || tuikSutData.length === 0) return null;

  const fiveYearChange = useMemo(() => {
    if (tuikSelectedData.length < 5 || !tuikLatestYear) return null;
    const fiveAgo = tuikSelectedData[tuikSelectedData.length - 5];
    if (!fiveAgo || fiveAgo.toplam <= 0) return null;
    return ((tuikLatestYear.toplam - fiveAgo.toplam) / fiveAgo.toplam) * 100;
  }, [tuikSelectedData, tuikLatestYear]);

  const maxMonth = useMemo(() => {
    if (!tuikSeasonality || tuikSeasonality.length === 0) return null;
    return tuikSeasonality.reduce((max, m) => m.miktar > max.miktar ? m : max, tuikSeasonality[0]);
  }, [tuikSeasonality]);

  return (
    <>
      <div style={{ marginTop: '48px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          📊 TÜİK Süt ve Süt Ürünleri (2010-2025)
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Sanayiye giden süt ve üretilen ürün miktarları — Yıllık ve aylık detaylı TÜİK verileri
        </p>
      </div>

      {/* Ürün Seçici */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {TUIK_SUT_URUNLER.map(urun => (
          <button
            key={urun.id}
            onClick={() => setSelectedTuikSutUrun(urun.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: selectedTuikSutUrun === urun.id ? `2px solid ${urun.color}` : '2px solid var(--border)',
              background: selectedTuikSutUrun === urun.id ? `${urun.color}15` : 'var(--bg-card)',
              color: selectedTuikSutUrun === urun.id ? urun.color : 'var(--text-secondary)',
              fontWeight: selectedTuikSutUrun === urun.id ? '700' : '500',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {urun.emoji} {urun.label}
          </button>
        ))}
      </div>

      {/* KPI Kartları */}
      {tuikLatestYear && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '16px', 
          marginBottom: '28px' 
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'} 0%, ${TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}dd 100%)`,
            padding: '24px', borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>
              {TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.emoji}
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                {tuikLatestYear.yil} YILLIK TOPLAM
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {new Intl.NumberFormat('tr-TR').format(tuikLatestYear.toplam)} {tuikLatestYear.birim}
              </div>
            </div>
          </div>

          <div style={{
            background: tuikYoyChange >= 0 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            padding: '24px', borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>{tuikYoyChange >= 0 ? '📈' : '📉'}</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                YILLIK DEĞİŞİM
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {tuikYoyChange >= 0 ? '+' : ''}{tuikYoyChange.toFixed(1)}%
              </div>
            </div>
          </div>

          {fiveYearChange !== null && (
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '24px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📊</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                  5 YILLIK DEĞİŞİM
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {fiveYearChange >= 0 ? '+' : ''}{fiveYearChange.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {maxMonth && (
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px', borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>📅</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                  EN YOĞUN AY
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {maxMonth.ayTam}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
                  {new Intl.NumberFormat('tr-TR').format(maxMonth.miktar)} {tuikLatestYear.birim}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Yıllık Trend */}
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📈 {selectedTuikSutUrun} — Yıllık Üretim Trendi (Ton)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={tuikSelectedData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                labelFormatter={(label) => `Yıl: ${label}`}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" dataKey="toplam" name="Yıllık Toplam"
                fill={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                stroke={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                fillOpacity={0.15} strokeWidth={2}
              />
              <Line 
                type="monotone" dataKey="toplam" name="Üretim"
                stroke={TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6'}
                strokeWidth={3} dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Aylık Mevsimsellik */}
        {tuikSeasonality.length > 0 && (
          <div style={{ 
            background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
            border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📅 Aylık Dağılım ({tuikLatestYear?.yil})
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={tuikSeasonality} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                <Tooltip 
                  formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="miktar" name="Aylık Üretim" radius={[6, 6, 0, 0]}>
                  {tuikSeasonality.map((entry, index) => {
                    const maxVal = Math.max(...tuikSeasonality.map(s => s.miktar));
                    const intensity = entry.miktar / (maxVal || 1);
                    const baseColor = TUIK_SUT_URUNLER.find(u => u.id === selectedTuikSutUrun)?.color || '#3b82f6';
                    return <Cell key={index} fill={baseColor} fillOpacity={0.4 + intensity * 0.6} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Büyüme Oranları */}
        {tuikGrowthRates.length > 0 && (
          <div style={{ 
            background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
            border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Yıllık Büyüme Oranları (%)
            </h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={tuikGrowthRates} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="rate" name="Büyüme %" radius={[6, 6, 0, 0]}>
                  {tuikGrowthRates.map((entry, index) => (
                    <Cell key={index} fill={entry.rate >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tüm Ürünler */}
        {tuikAllProductsLatest.length > 0 && (
          <div style={{ 
            gridColumn: 'span 2',
            background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
            border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Tüm Süt Ürünleri Karşılaştırması ({tuikAllProductsLatest[0]?.yil})
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={tuikAllProductsLatest} 
                margin={{ top: 10, right: 24, left: 0, bottom: 60 }}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="urun" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                <Tooltip 
                  formatter={(value: number, _name: string, props: { payload?: { birim?: string } }) => [
                    `${new Intl.NumberFormat('tr-TR').format(value)} ${props.payload?.birim ?? ''}`
                  ]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="toplam" name="Yıllık Toplam" radius={[6, 6, 0, 0]}>
                  {tuikAllProductsLatest.map((entry, index) => {
                    const urunInfo = TUIK_SUT_URUNLER.find(u => u.id === entry.urun);
                    return (
                      <Cell 
                        key={index} 
                        fill={urunInfo?.color || COLORS[index % COLORS.length]} 
                        fillOpacity={entry.urun === selectedTuikSutUrun ? 1 : 0.6}
                        stroke={entry.urun === selectedTuikSutUrun ? '#000' : 'none'}
                        strokeWidth={entry.urun === selectedTuikSutUrun ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mevsimsellik Isı Haritası */}
        {tuikSeasonHeatmap.length > 0 && (
          <div style={{ 
            gridColumn: 'span 2',
            background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
            border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌡️ Mevsimsellik Analizi — {selectedTuikSutUrun} (Yıl x Ay)
            </h3>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={tuikSeasonHeatmap} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                <Tooltip 
                  formatter={(value: number) => [new Intl.NumberFormat('tr-TR').format(value) + ' ton']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend />
                {AY_ADLARI.map((ay, idx) => (
                  <Bar 
                    key={ay} 
                    dataKey={ay} 
                    name={AY_TAM[idx]} 
                    stackId="months"
                    fill={`hsl(${(idx * 30) % 360}, 65%, 55%)`}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detay Tablosu */}
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', 
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 {selectedTuikSutUrun} — Yıllık Detay Tablosu
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: 'var(--text-primary)' }}>Yıl</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>Toplam</th>
                  {AY_ADLARI.map(ay => (
                    <th key={ay} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ay}</th>
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>Değişim</th>
                </tr>
              </thead>
              <tbody>
                {tuikSelectedData.slice().reverse().map((row, idx) => {
                  const prevRow = tuikSelectedData.find(d => d.yil === row.yil - 1);
                  const change = prevRow && prevRow.toplam > 0 ? ((row.toplam - prevRow.toplam) / prevRow.toplam) * 100 : null;
                  return (
                    <tr key={row.yil} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-card)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>{row.yil}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('tr-TR').format(row.toplam)}
                      </td>
                      {row.aylar.map((val, mi) => (
                        <td key={mi} style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {val > 0 ? new Intl.NumberFormat('tr-TR').format(val) : '-'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: change === null ? 'var(--text-secondary)' : change >= 0 ? '#22c55e' : '#ef4444' }}>
                        {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
