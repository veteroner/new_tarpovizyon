import {
  BarChart, Bar, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatShort, OverviewData } from './overviewTypes';

interface Props {
  data: OverviewData;
}

export function MeatSection({ data }: Props) {
  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>🥩 Et Üretimi</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card large" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="kpi-header"><span className="kpi-title">TOPLAM ET</span><div className="kpi-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>🥩</div></div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>{formatNumber(data.meatProduction.total)} ton</div>
          <div className="kpi-subtitle">2023 Yılı Toplam</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI</span></div>
          <div className="kpi-value">{Math.round((data.meatProduction.total * 1000) / (data.population || 1))}</div>
          <div className="kpi-subtitle">kg/yıl</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KIRMIZI ET</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.redMeat)} ton</div>
          <div className="kpi-subtitle">Toplam etin %{((data.meatProduction.redMeat) / (data.meatProduction.total || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">BEYAZ ET</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.whiteMeat)} ton</div>
          <div className="kpi-subtitle">Toplam etin %{((data.meatProduction.whiteMeat) / (data.meatProduction.total || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">BEYAZ/KIRMIZI</span></div>
          <div className="kpi-value">{((data.meatProduction.whiteMeat) / (data.meatProduction.redMeat || 1)).toFixed(2)}</div>
          <div className="kpi-subtitle">Oran</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626' }}>🐄 Kırmızı Et Detayı</h3>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">SIĞIR ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.cattle)} ton</div>
          <div className="kpi-subtitle">Kırmızı etin %{((data.meatProduction.cattle) / (data.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KOYUN ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.sheep)} ton</div>
          <div className="kpi-subtitle">Kırmızı etin %{((data.meatProduction.sheep) / (data.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KEÇİ ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.goat)} ton</div>
          <div className="kpi-subtitle">Kırmızı etin %{((data.meatProduction.goat) / (data.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">MANDA ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.buffalo)} ton</div>
          <div className="kpi-subtitle">Kırmızı etin %{((data.meatProduction.buffalo) / (data.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fb923c' }}>🐔 Beyaz Et Detayı</h3>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">PİLİÇ ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.chicken)} ton</div>
          <div className="kpi-subtitle">Beyaz etin %{((data.meatProduction.chicken) / (data.meatProduction.whiteMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">HİNDİ ETİ</span></div>
          <div className="kpi-value">{formatNumber(data.meatProduction.turkey)} ton</div>
          <div className="kpi-subtitle">Beyaz etin %{((data.meatProduction.turkey) / (data.meatProduction.whiteMeat || 1) * 100).toFixed(0)}'i</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🥩 Et Türleri Dağılımı (2023)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.meatProduction.breakdown} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.meatProduction.breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📈 Et Üretim Trendi (2010-2023)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.meatProduction.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', 'Üretim']} />
              <Area type="monotone" dataKey="meat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
