import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { COLORS, formatNumber, formatShort, OverviewData } from './overviewTypes';

interface Props {
  data: OverviewData;
  ruralPercent: string;
  urbanPercent: string;
  agriLandPercent: string;
}

export function GeneralStatsSection({ data, ruralPercent, urbanPercent, agriLandPercent }: Props) {
  return (
    <>
      <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>📊 Genel Göstergeler</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">NÜFUS</span><div className="kpi-icon blue">👥</div></div>
          <div className="kpi-value">{formatNumber(data.population)}</div>
          <div className="kpi-subtitle">2023 Yılı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">GSYİH</span><div className="kpi-icon green">💰</div></div>
          <div className="kpi-value">{data.gdp ? `$${formatNumber(data.gdp)}` : '—'}</div>
          <div className="kpi-subtitle">USD (2023)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI GSYİH</span><div className="kpi-icon blue">📊</div></div>
          <div className="kpi-value">{data.gdpPerCapita ? `$${formatNumber(data.gdpPerCapita)}` : '—'}</div>
          <div className="kpi-subtitle">USD/kişi</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM ARAZİSİ</span><div className="kpi-icon green">🌾</div></div>
          <div className="kpi-value">{formatNumber(data.agriculturalLand)} ha</div>
          <div className="kpi-subtitle">Toplam alanın %{agriLandPercent}'i</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginTop: '1rem' }}>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIMSAL KATMA DEĞER</span><div className="kpi-icon green">🌱</div></div>
          <div className="kpi-value">{data.agriculturalGDP ? `$${formatNumber(data.agriculturalGDP)}` : '—'}</div>
          <div className="kpi-subtitle">Tarım+Orman+Balıkçılık (2023)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM PAYI (GSYİH)</span><div className="kpi-icon blue">📌</div></div>
          <div className="kpi-value">{data.agriculturalGDPShare ? `%${data.agriculturalGDPShare.toFixed(1)}` : '—'}</div>
          <div className="kpi-subtitle">GSYİH içindeki pay</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM İSTİHDAMI</span><div className="kpi-icon orange">👨‍🌾</div></div>
          <div className="kpi-value">{data.agriculturalEmployment ? formatNumber(data.agriculturalEmployment) : '—'}</div>
          <div className="kpi-subtitle">Kişi (15+), 2023</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM PAYI (İSTİHDAM)</span><div className="kpi-icon pink">%</div></div>
          <div className="kpi-value">{data.agriculturalEmploymentShare ? `%${data.agriculturalEmploymentShare.toFixed(1)}` : '—'}</div>
          <div className="kpi-subtitle">Toplam istihdam içindeki pay</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">👥 Nüfus Dağılımı (2023)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Kentsel', value: data.urbanPopulation, fill: COLORS.economy[0] },
                  { name: 'Kırsal', value: data.ruralPopulation, fill: COLORS.economy[2] },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name }) => `${name} %${name === 'Kentsel' ? urbanPercent : ruralPercent}`}
              />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' kişi', '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🌍 Arazi Kullanımı (2022)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.landUseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ha', '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.landUseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
