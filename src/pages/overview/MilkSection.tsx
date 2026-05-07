import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatShort } from './overviewTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { OverviewData } from './overviewTypes';

interface Props {
  data: OverviewData;
}

export function MilkSection({ data }: Props) {
  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>🥛 Süt Üretimi</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card large" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="kpi-header"><span className="kpi-title">TOPLAM SÜT</span><div className="kpi-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>🥛</div></div>
          <div className="kpi-value" style={{ color: '#3b82f6' }}>{formatNumber(data.milkProduction.total)} ton</div>
          <div className="kpi-subtitle">2023 Yılı Toplam</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI</span></div>
          <div className="kpi-value">{Math.round((data.milkProduction.total * 1000) / (data.population || 1))}</div>
          <div className="kpi-subtitle">kg/yıl</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">İNEK SÜTÜ</span></div>
          <div className="kpi-value">{formatNumber(data.milkProduction.cattle)} ton</div>
          <div className="kpi-subtitle">Toplam süt üretiminin %{((data.milkProduction.cattle) / (data.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KOYUN SÜTÜ</span></div>
          <div className="kpi-value">{formatNumber(data.milkProduction.sheep)} ton</div>
          <div className="kpi-subtitle">Toplam süt üretiminin %{((data.milkProduction.sheep) / (data.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KEÇİ SÜTÜ</span></div>
          <div className="kpi-value">{formatNumber(data.milkProduction.goat)} ton</div>
          <div className="kpi-subtitle">Toplam süt üretiminin %{((data.milkProduction.goat) / (data.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 Süt Türlerine Göre Dağılım (2023)</h3>
            <ChartInsightButton title="Süt Türlerine Göre Dağılım (2023)" description="İnek, koyun ve keçi sütü dağılımı" data={data.milkProduction.breakdown} context={{ toplamSüt: formatNumber(data.milkProduction.total)+' ton', inekSütü: formatNumber(data.milkProduction.cattle)+' ton', koyunSütü: formatNumber(data.milkProduction.sheep)+' ton' }} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.milkProduction.breakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.milkProduction.breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Süt Üretim Trendi (2010-2023)</h3>
            <ChartInsightButton title="Süt Üretim Trendi (2010-2023)" description="Yıllık süt üretimi değişimi" data={data.milkProduction.yearly} context={{ toplamSüt: formatNumber(data.milkProduction.total)+' ton' }} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.milkProduction.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', 'Üretim']} />
              <Area type="monotone" dataKey="milk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
