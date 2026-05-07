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
import { type TuikKovanYearData, type TuikKovanKpi, type TuikProvinceKovan, formatNumber } from './beekeepingTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  tuikKovanYear: TuikKovanYearData[];
  tuikKovanKpi: TuikKovanKpi;
  tuikTopKovan: TuikProvinceKovan[];
  tuikTopBalmumu: TuikProvinceKovan[];
};

export function BeekeepingTuikSection({ tuikKovanYear, tuikKovanKpi, tuikTopKovan, tuikTopBalmumu }: Props) {
  return (
    <>
      <div style={{ marginTop: '50px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          📊 TÜİK Kovan &amp; Balmumu Analizi (2004-2024)
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          TÜİK resmi verilerine göre kovan sayıları (eski/yeni tip) ve balmumu üretimi il bazlı trend analizi
        </p>
      </div>

      {/* TÜİK KPI Kartları */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
          padding: '24px', 
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🪔</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
              TOPLAM KOVAN ({tuikKovanKpi.latest.year})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
              {formatNumber(tuikKovanKpi.latest.toplam)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
              {tuikKovanKpi.latest.toplam.toLocaleString('tr-TR')} adet
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '14px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            YILLIK DEĞİŞİM
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: tuikKovanKpi.yoy >= 0 ? '#22c55e' : '#ef4444', lineHeight: 1 }}>
            {tuikKovanKpi.yoy >= 0 ? '+' : ''}{tuikKovanKpi.yoy.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Toplam kovan ({tuikKovanKpi.prev?.year} → {tuikKovanKpi.latest.year})
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '14px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            ESKİ / YENİ TİP ORANI
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
            %{(100 - tuikKovanKpi.eskiPay).toFixed(1)} Yeni
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Eski Tip: %{tuikKovanKpi.eskiPay.toFixed(1)} | CAGR: %{tuikKovanKpi.cagr.toFixed(2)}
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
          padding: '24px', 
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🕯️</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
              BALMUMU ÜRETİMİ ({tuikKovanKpi.latest.year})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
              {tuikKovanKpi.latest.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
              Yıllık: {tuikKovanKpi.balmumuYoy >= 0 ? '+' : ''}{tuikKovanKpi.balmumuYoy.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Kovan Trendi - Stacked Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🪔 Kovan Sayısı Gelişimi (Eski Tip + Yeni Tip)
            </h3>
            <ChartInsightButton title="🪔 Kovan Sayısı Gelişimi" description="Eski ve yeni tip kovan sayısı yıllık trend" data={tuikKovanYear} context={{ section: 'TÜİK Kovan' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={tuikKovanYear} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis 
                yAxisId="left"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                tickFormatter={formatNumber}
                label={{ value: 'Kovan (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString('tr-TR') + ' adet',
                  name
                ]}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="eskiTip" 
                name="Eski Tip Kovan" 
                stackId="a"
                fill="#fbbf24"
                opacity={0.8}
              />
              <Bar 
                yAxisId="left"
                dataKey="yeniTip" 
                name="Yeni Tip Kovan" 
                stackId="a"
                fill="#f59e0b"
                opacity={0.9}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="toplam" 
                name="Toplam Kovan" 
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'var(--bg-primary)', 
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div><strong>Eski Tip:</strong> {tuikKovanKpi.latest.eskiTip.toLocaleString('tr-TR')} adet</div>
            <div><strong>Yeni Tip:</strong> {tuikKovanKpi.latest.yeniTip.toLocaleString('tr-TR')} adet</div>
            <div><strong>Toplam:</strong> {tuikKovanKpi.latest.toplam.toLocaleString('tr-TR')} adet</div>
            <div><strong>Zirve:</strong> {tuikKovanKpi.peak.year} ({tuikKovanKpi.peak.toplam.toLocaleString('tr-TR')})</div>
          </div>
        </div>
      </div>

      {/* Balmumu Trendi */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🕯️ Balmumu Üretimi Trendi (Ton)
            </h3>
            <ChartInsightButton title="🕯️ Balmumu Üretimi Trendi" description="Balmumu üretimi yıllık trend" data={tuikKovanYear} context={{ section: 'TÜİK Balmumu' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={tuikKovanYear} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalmumu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => v.toLocaleString('tr-TR')}
                label={{ value: 'Balmumu (Ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' ton', 'Balmumu']}
              />
              <Area 
                type="monotone" 
                dataKey="balmumu" 
                stroke="#3b82f6" 
                fill="url(#colorBalmumu)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'var(--bg-primary)', 
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div><strong>Son Yıl ({tuikKovanKpi.latest.year}):</strong> {tuikKovanKpi.latest.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton</div>
            <div><strong>Ortalama:</strong> {(tuikKovanYear.reduce((s, d) => s + d.balmumu, 0) / tuikKovanYear.length).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton</div>
            <div><strong>Zirve:</strong> {tuikKovanYear.reduce((best, d) => d.balmumu > best.balmumu ? d : best, tuikKovanYear[0]).year} ({tuikKovanYear.reduce((best, d) => d.balmumu > best.balmumu ? d : best, tuikKovanYear[0]).balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton)</div>
          </div>
        </div>
      </div>

      {/* Kovan başına Balmumu Verimi + Eski vs Yeni Tip Kovan Oranı */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              📊 Kovan Başına Balmumu Verimi (kg/kovan)
            </h3>
            <ChartInsightButton title="📊 Kovan Başına Balmumu Verimi" description="kg/kovan verimlilik trendi" data={tuikKovanYear} context={{ section: 'TÜİK Verim' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart 
              data={tuikKovanYear.map(d => ({
                year: d.year,
                verim: d.toplam > 0 ? (d.balmumu * 1000 / d.toplam) : 0
              }))}
              margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [value.toFixed(3) + ' kg/kovan', 'Balmumu Verimi']}
              />
              <Line 
                type="monotone" 
                dataKey="verim" 
                stroke="#a855f7" 
                strokeWidth={3}
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              🔄 Yeni Tip Kovan Oranı Gelişimi (%)
            </h3>
            <ChartInsightButton title="🔄 Yeni Tip Kovan Oranı Gelişimi" description="Yeni/eski tip kovan oranı trendi" data={tuikKovanYear} context={{ section: 'TÜİK Kovan' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart 
              data={tuikKovanYear.map(d => ({
                year: d.year,
                yeniOran: d.toplam > 0 ? (d.yeniTip / d.toplam * 100) : 0,
                eskiOran: d.toplam > 0 ? (d.eskiTip / d.toplam * 100) : 0,
              }))}
              margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => v + '%'}
              />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  '%' + value.toFixed(1),
                  name === 'yeniOran' ? 'Yeni Tip' : 'Eski Tip'
                ]}
              />
              <Legend formatter={(value) => value === 'yeniOran' ? 'Yeni Tip %' : 'Eski Tip %'} />
              <Area type="monotone" dataKey="yeniOran" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="eskiOran" stackId="1" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* İl Bazlı Kovan & Balmumu Sıralama */}
      {tuikTopKovan.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                🪔 En Fazla Kovan Olan İller (2024 - TÜİK)
              </h3>
              <ChartInsightButton title="🪔 En Fazla Kovan Olan İller" description="İl bazında kovan sıralaması" data={tuikTopKovan} context={{ section: 'İl Kovan' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={tuikTopKovan} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
                <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('tr-TR') + ' adet',
                    name === 'yeniTip' ? 'Yeni Tip' : name === 'eskiTip' ? 'Eski Tip' : name
                  ]}
                />
                <Legend formatter={(value) => value === 'yeniTip' ? 'Yeni Tip' : value === 'eskiTip' ? 'Eski Tip' : value} />
                <Bar dataKey="yeniTip" stackId="a" fill="#f59e0b" />
                <Bar dataKey="eskiTip" stackId="a" fill="#fbbf24" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                🕯️ En Fazla Balmumu Üreten İller (2024 - TÜİK)
              </h3>
              <ChartInsightButton title="🕯️ En Fazla Balmumu Üreten İller" description="İl bazında balmumu sıralaması" data={tuikTopBalmumu} context={{ section: 'İl Balmumu' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={tuikTopBalmumu} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => [value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' ton', 'Balmumu']}
                />
                <Bar dataKey="balmumu" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  {tuikTopBalmumu.map((_, index) => (
                    <Cell key={`cell-bm-${index}`} fill={index < 3 ? '#2563eb' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TÜİK Özet Tablo */}
      <div style={{ 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700' }}>
          📋 TÜİK Kovan &amp; Balmumu Yıllık Veri Tablosu
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Yıl</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Eski Tip</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Yeni Tip</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Toplam Kovan</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Balmumu (ton)</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Verim (kg/kovan)</th>
            </tr>
          </thead>
          <tbody>
            {tuikKovanYear.slice().reverse().map((row, idx) => (
              <tr key={row.year} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent' }}>
                <td style={{ padding: '8px', fontWeight: '600' }}>{row.year}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{row.eskiTip.toLocaleString('tr-TR')}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{row.yeniTip.toLocaleString('tr-TR')}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>{row.toplam.toLocaleString('tr-TR')}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{row.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{row.toplam > 0 ? (row.balmumu * 1000 / row.toplam).toFixed(3) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
