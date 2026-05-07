import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikTurkeyMeatData, MonthlyData } from './whiteMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  turkeyMeatData: TuikTurkeyMeatData[];
  monthlyTurkeyMeat: MonthlyData[];
};

export default function WhiteMeatTurkeyMeatSection({ turkeyMeatData, monthlyTurkeyMeat }: Props) {
  if (turkeyMeatData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '60px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          🦃 Hindi Eti Üretimi (TÜİK)
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          Türkiye'de yıllık hindi eti üretimi ve aylık dağılım verileri
        </p>
      </div>

      {/* Hindi Eti KPI Kartları */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">2025 ÜRETİM</span>
            <div className="kpi-icon orange">🦃</div>
          </div>
          <div className="kpi-value">
            {(turkeyMeatData[0]?.production || 0).toLocaleString('tr-TR')} ton
          </div>
          <div className="kpi-subtitle">Yıllık toplam</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">ORTALAMA (10 YIL)</span>
            <div className="kpi-icon blue">📊</div>
          </div>
          <div className="kpi-value">
            {(() => {
              const recent10 = turkeyMeatData.slice(0, Math.min(10, turkeyMeatData.length));
              const avg = recent10.reduce((sum, d) => sum + d.production, 0) / recent10.length;
              return avg.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ton';
            })()}
          </div>
          <div className="kpi-subtitle">Son 10 yıl ortalaması</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">BÜYÜME ORANI</span>
            <div className="kpi-icon green">📈</div>
          </div>
          <div className="kpi-value">
            {(() => {
              if (turkeyMeatData.length < 2) return '0%';
              const current = turkeyMeatData[0]?.production || 0;
              const previous = turkeyMeatData[1]?.production || 1;
              const growth = ((current - previous) / previous * 100);
              return (growth > 0 ? '+' : '') + growth.toFixed(2) + '%';
            })()}
          </div>
          <div className="kpi-subtitle">Yıllık değişim</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">TOPLAM ({turkeyMeatData.length} YIL)</span>
            <div className="kpi-icon purple">🔢</div>
          </div>
          <div className="kpi-value">
            {turkeyMeatData.reduce((sum, d) => sum + d.production, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
          </div>
          <div className="kpi-subtitle">Toplam üretim</div>
        </div>
      </div>

      {/* Hindi Eti Yıllık Trend */}
      <div className="chart-grid" style={{ marginTop: '30px' }}>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Hindi Eti Yıllık Üretim Trendi</h3>
            <ChartInsightButton title="📈 Hindi Eti Yıllık Üretim Trendi" description="Yıllık hindi eti üretim verisi" data={turkeyMeatData} context={{ section: 'Trend' }} />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={turkeyMeatData.slice().reverse()}>
              <defs>
                <linearGradient id="colorTurkey" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Üretim (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']} />
              <Area type="monotone" dataKey="production" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorTurkey)" />
              <Line type="monotone" dataKey="production" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#ea580c', r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>Analiz:</strong> {turkeyMeatData.length} yıllık veriye göre hindi eti üretimi{' '}
            {(() => {
              const first = turkeyMeatData[turkeyMeatData.length - 1]?.production || 1;
              const last = turkeyMeatData[0]?.production || 0;
              const change = ((last - first) / first * 100).toFixed(1);
              return Number(change) > 0
                ? `artış trendi göstermektedir (+${change}%).`
                : `düşüş trendi göstermektedir (${change}%).`;
            })()}
          </div>
        </div>
      </div>

      {/* 2025 Aylık Dağılım */}
      {monthlyTurkeyMeat.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
              📅 2025 Aylık Hindi Eti Üretimi
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              * Bazı aylar TÜİK tarafından gizli tutulmuştur. Eksik aylar, mevcut ayların ortalaması ile tahmin edilmiştir.
            </p>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Aylık Üretim Dağılımı</h3>
                <ChartInsightButton title="📊 Aylık Üretim Dağılımı" description="Aylık hindi eti üretim dağılımı" data={turkeyMeatData} context={{ section: 'Aylık' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={monthlyTurkeyMeat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Üretim (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ton', 'Üretim']} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {monthlyTurkeyMeat.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${20 + index * 10}, 75%, ${50 + (index % 2) * 10}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong>En yüksek ay:</strong>{' '}
                  {monthlyTurkeyMeat.reduce((max, m) => m.value > max.value ? m : max, monthlyTurkeyMeat[0]).month}
                  {' '}
                  ({monthlyTurkeyMeat.reduce((max, m) => m.value > max.value ? m : max, monthlyTurkeyMeat[0]).value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton)
                </div>
                <div>
                  <strong>Aylık ortalama:</strong>{' '}
                  {(monthlyTurkeyMeat.reduce((sum, m) => sum + m.value, 0) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                </div>
                <div>
                  <strong>2025 toplam:</strong>{' '}
                  {monthlyTurkeyMeat.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hindi Eti Özet */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>
          📊 Hindi Eti Üretimi Özet
        </h3>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>🔍 Veri Kaynağı:</strong> TÜİK Kümes Hayvancılığı İstatistikleri
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>📅 Dönem:</strong> {turkeyMeatData[turkeyMeatData.length - 1]?.year} - {turkeyMeatData[0]?.year} ({turkeyMeatData.length} yıl)
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>⚠️ Not:</strong> Bazı yıllarda TÜİK tarafından aylık detay veriler gizli tutulmuştur.
            Bu durumlarda yıllık toplam kullanılmış veya mevcut ayların ortalaması ile tahmin yapılmıştır.
          </p>
          <p style={{ marginBottom: '0' }}>
            <strong>💡 Bilgi:</strong> Hindi eti üretimi, Türkiye'de beyaz et sektörünün küçük ama önemli bir parçasıdır.
            Özellikle bayram dönemlerinde ve özel günlerde talep artışı görülmektedir.
          </p>
        </div>
      </div>
    </>
  );
}
