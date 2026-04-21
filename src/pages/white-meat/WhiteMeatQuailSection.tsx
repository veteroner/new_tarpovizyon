import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikTurkeyMeatData, MonthlyData } from './whiteMeatUtils';

type Props = {
  quailMeatData: TuikTurkeyMeatData[];
  quailSlaughterData: TuikTurkeyMeatData[];
  monthlyQuailMeat: MonthlyData[];
};

export default function WhiteMeatQuailSection({ quailMeatData, quailSlaughterData, monthlyQuailMeat }: Props) {
  if (quailMeatData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '60px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          🐦 Bıldırcın Eti Üretimi (TÜİK)
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          Türkiye'de yıllık bıldırcın eti üretimi ve kesilen bıldırcın sayısı
        </p>
      </div>

      {/* Bıldırcın KPI Kartları */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">BILDIRCIN ETİ ({quailMeatData[0]?.year})</span>
            <div className="kpi-icon orange">🐦</div>
          </div>
          <div className="kpi-value">
            {(quailMeatData[0]?.production || 0).toLocaleString('tr-TR')} ton
          </div>
          <div className="kpi-subtitle">Yıllık toplam</div>
        </div>

        {quailSlaughterData.length > 0 && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">KESİLEN ({quailSlaughterData[0]?.year})</span>
              <div className="kpi-icon blue">🔪</div>
            </div>
            <div className="kpi-value">
              {(quailSlaughterData[0]?.production || 0).toLocaleString('tr-TR')} bin adet
            </div>
            <div className="kpi-subtitle">Yıllık toplam</div>
          </div>
        )}

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">BÜYÜME</span>
            <div className="kpi-icon green">📈</div>
          </div>
          <div className="kpi-value">
            {(() => {
              if (quailMeatData.length < 2) return '0%';
              const current = quailMeatData[0]?.production || 0;
              const previous = quailMeatData[1]?.production || 1;
              const growth = ((current - previous) / previous * 100);
              return (growth > 0 ? '+' : '') + growth.toFixed(1) + '%';
            })()}
          </div>
          <div className="kpi-subtitle">Yıllık değişim</div>
        </div>

        {quailMeatData.length > 0 && quailSlaughterData.length > 0 && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">VERİM</span>
              <div className="kpi-icon purple">📊</div>
            </div>
            <div className="kpi-value">
              {(() => {
                const meat = quailMeatData[0]?.production || 0;
                const slaughter = quailSlaughterData[0]?.production || 1;
                return ((meat * 1000) / (slaughter * 1000)).toFixed(3) + ' kg/baş';
              })()}
            </div>
            <div className="kpi-subtitle">Bıldırcın başına</div>
          </div>
        )}
      </div>

      {/* Bıldırcın Eti Yıllık Trend */}
      <div className="chart-grid" style={{ marginTop: '30px' }}>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📈 Bıldırcın Eti Yıllık Üretim Trendi</h3>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={quailMeatData.slice().reverse()}>
              <defs>
                <linearGradient id="colorQuail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Üretim (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']} />
              <Area type="monotone" dataKey="production" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorQuail)" />
              <Line type="monotone" dataKey="production" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Kesilen Bıldırcın vs Et */}
        {quailSlaughterData.length > 0 && (
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="chart-title">🔄 Kesilen Bıldırcın vs Et Üretimi</h3>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={(() => {
                const merged = quailMeatData.slice().reverse().map(d => {
                  const slaughter = quailSlaughterData.find(s => s.year === d.year);
                  return { year: d.year, meat: d.production, slaughtered: slaughter?.production || 0 };
                });
                return merged;
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Et (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Kesilen (bin adet)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
                <Bar yAxisId="right" dataKey="slaughtered" name="Kesilen (bin adet)" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="meat" name="Et (ton)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bıldırcın Aylık Dağılım */}
      {monthlyQuailMeat.some(m => m.value > 0) && (
        <div className="chart-grid" style={{ marginTop: '20px' }}>
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="chart-title">📅 Aylık Bıldırcın Eti Üretimi ({quailMeatData[0]?.year})</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={monthlyQuailMeat}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']} />
                <Bar dataKey="value" name="Aylık Üretim" radius={[8, 8, 0, 0]}>
                  {monthlyQuailMeat.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${260 + index * 8}, 65%, ${50 + (index % 2) * 10}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
