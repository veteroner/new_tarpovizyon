import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line, PieChart, Pie, Cell, LineChart,
  BarChart, Bar
} from 'recharts';
import { COLORS, formatTon, formatShort, type YearPoint, type Productivity, type ProductivityComparison } from './milkUtils';

type Props = {
  series: YearPoint[];
  latest: YearPoint | undefined;
  latestBreakdown: { total: number; rows: { name: string; value: number; share: number }[] };
  growthRates: { year: number; rate: number }[];
  productivity: Productivity[];
  productivityComparison: ProductivityComparison[];
  sufficiency: Record<string, string | number> | null;
};

export default function MilkProductionSection({
  series, latest, latestBreakdown, growthRates,
  productivity, productivityComparison, sufficiency
}: Props) {
  return (
    <>
      {/* Üretim Analizi Bölümü */}
      <div style={{ marginTop: '48px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          📊 Üretim Analizi
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Türkiye süt üretimi tarihsel trendler ve türlere göre detaylı analiz
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Toplam Üretim Trendi - 2 kolon */}
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📈 Toplam Süt Üretimi Trendi (Tüm Yıllar)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]} 
                labelFormatter={(label) => `Yıl: ${label}`}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="totalTon" name="Toplam" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              <Line type="monotone" dataKey="cattleTon" name="Büyükbaş" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sheepTon" name="Koyun" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="goatTon" name="Keçi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Türlere Göre Dağılım Pie */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🥧 Türlere Göre Dağılım ({latest?.year ?? '-'})
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={latestBreakdown.rows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
              >
                {latestBreakdown.rows.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatTon(value), ''] } />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Yıllık Büyüme Oranları */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Yıllık Büyüme Oranları (%)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={growthRates.slice(-15)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                name="Büyüme %" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Son 5 Yıl Toplam Üretim */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          gridColumn: 'span 2'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📈 Son 5 Yıl Toplam Üretim Trendi
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Area 
                type="monotone" 
                dataKey="totalTon" 
                name="Toplam Üretim" 
                fill="#8b5cf6" 
                stroke="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="totalTon" 
                stroke="#7c3aed" 
                strokeWidth={4}
                dot={{ fill: '#7c3aed', r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Büyükbaş Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐄 Büyükbaş (Son 5 Yıl)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="cattleTon" name="Büyükbaş" radius={[6, 6, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Koyun Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐑 Koyun (Son 5 Yıl)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="sheepTon" name="Koyun" radius={[6, 6, 0, 0]} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Keçi Son 5 Yıl */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐐 Keçi (Son 5 Yıl)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={series.slice(-5)} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                formatter={(value: number) => [formatTon(value)]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} 
              />
              <Bar dataKey="goatTon" name="Keçi" radius={[6, 6, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Verimlilik Bölümü */}
      {(productivity.length > 0 || sufficiency) && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              ⚡ Verimlilik Göstergeleri
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye süt üretim verimi ve dünya karşılaştırması
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {productivity.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Süt Verimi Trendi (Litre/Baş)
                </h3>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={productivity} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)} lt/baş`]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cig_sut_verimi_lt" 
                      fill="#8b5cf6" 
                      stroke="#8b5cf6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cig_sut_verimi_lt" 
                      name="Süt Verimi" 
                      stroke="#7c3aed" 
                      strokeWidth={3}
                      dot={{ fill: '#7c3aed', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {productivityComparison.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🌍 Dünya Karkas Verimi Karşılaştırması
                </h3>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={productivityComparison} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="ulke" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} kg/baş`]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey="karkas_verimi" 
                      name="Karkas Verimi"
                      radius={[6, 6, 0, 0]}
                    >
                      {productivityComparison.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.ulke === 'Türkiye' ? '#ef4444' : '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
