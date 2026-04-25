import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { COLORS, formatNumber, formatShort } from './tuikLivestockTypes';
import type { UseTuikLivestockDataReturn } from './useTuikLivestockData';

type Props = Pick<UseTuikLivestockDataReturn,
  | 'selectedAnimal' | 'selectedCategory' | 'yearLabel'
  | 'totalValue' | 'provinceCount' | 'topCity' | 'topCityValue' | 'avgValue' | 'yearChange'
  | 'groupChartData' | 'yearlyData' | 'growthData'
  | 'categoryData' | 'cityData' | 'cagrAnalysis'
>;

export default function OverviewTab({
  selectedAnimal, selectedCategory, yearLabel,
  totalValue, provinceCount, topCity, topCityValue, avgValue, yearChange,
  groupChartData, yearlyData, growthData, categoryData, cityData
}: Props) {
  return (
    <>
      {/* KPI Kartları */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TOPLAM {selectedAnimal.toUpperCase()}</span><div className="kpi-icon orange">🐄</div></div>
          <div className="kpi-value">{formatShort(totalValue)}</div>
          <div className="kpi-subtitle">baş ({yearLabel})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">EN FAZLA İL</span><div className="kpi-icon orange">🏆</div></div>
          <div className="kpi-value">{topCity}</div>
          <div className="kpi-subtitle">{formatNumber(topCityValue)} baş</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon orange">📊</div></div>
          <div className="kpi-value">{formatShort(avgValue)}</div>
          <div className="kpi-subtitle">{provinceCount} il ortalaması</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className="kpi-icon orange">📈</div></div>
          <div className={`kpi-value ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%</div>
          <div className="kpi-subtitle">Bir önceki yıla göre</div>
        </div>
      </div>

      {/* Intelligence Panel + Group Bar */}
      <div className="chart-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="intelligence-panel" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(59,130,246,0.1) 100%)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>🧠 Akıllı Analiz</h3>
          <div style={{ lineHeight: '2', fontSize: '0.9rem' }}>
            {yearChange > 5 && <p style={{ color: '#22c55e' }}>📈 <strong>Güçlü büyüme</strong>: {selectedAnimal} sayısı geçen yıla göre %{yearChange.toFixed(1)} arttı.</p>}
            {yearChange < -5 && <p style={{ color: '#ef4444' }}>📉 <strong>Dikkat</strong>: {selectedAnimal} sayısı geçen yıla göre %{Math.abs(yearChange).toFixed(1)} azaldı.</p>}
            {Math.abs(yearChange) <= 5 && <p style={{ color: '#3b82f6' }}>📊 <strong>Stabil seyir</strong>: {selectedAnimal} sayısı görece istikrarlı.</p>}
            <p style={{ color: 'var(--text-secondary)' }}>🏆 En yüksek il: <strong>{topCity}</strong> — {formatNumber(topCityValue)} baş</p>
            <p style={{ color: 'var(--text-secondary)' }}>🗺️ {provinceCount} il takip ediliyor.</p>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📊 Hayvan Grubu Özeti ({yearLabel})</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={groupChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
              <Bar dataKey="value" name="Hayvan Sayısı" radius={[4, 4, 0, 0]}>
                {groupChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isSelected ? '#f59e0b' : entry.fill} opacity={entry.isSelected ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend + Growth */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📈 {selectedAnimal} Trend Grafiği (2004–2025)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" angle={-30} textAnchor="end" height={60} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
              <Area type="monotone" dataKey="value" name={selectedAnimal} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📊 Yıllık Büyüme Oranı (%)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Büyüme']} />
              <Bar dataKey="growth" name="Büyüme (%)" radius={[4, 4, 0, 0]}>
                {growthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Charts */}
      {categoryData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">🥧 Kategori Dağılımı — {selectedAnimal}</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={120} innerRadius={50} dataKey="value"
                  label={({ name, percent }) => `${name?.substring(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">📊 Kategori Karşılaştırma</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                <Bar dataKey="value" name="Hayvan Sayısı" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* City Bar + Pie */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🏙️ İl Bazında {selectedAnimal} Sayısı ({yearLabel})</h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
              <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
              <Bar dataKey="value" name={selectedAnimal} radius={[0, 4, 4, 0]}>
                {cityData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🥧 İl Payları Dağılımı (Top 10)</h3>
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie data={cityData.slice(0, 10)} cx="50%" cy="50%" outerRadius={140} innerRadius={40}
                dataKey="value"
                label={({ name, percent }) => `${name?.substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}>
                {cityData.slice(0, 10).map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* City Ranking Table */}
      <div className="data-table">
        <h3 className="data-table-title">📋 İl Sıralaması — {selectedAnimal} Sayısı ({yearLabel}){selectedCategory !== 'Tümü' ? ` — ${selectedCategory}` : ''}</h3>
        {cityData.map((city, index) => (
          <div className="table-row" key={city.name}>
            <div className={`table-rank ${index < 3 ? 'orange' : ''}`}>{index + 1}</div>
            <div className="table-info">
              <div className="table-name">{city.name}</div>
              <div className="table-subtext">Pay: %{city.share}</div>
            </div>
            <div className="table-value orange">{formatNumber(city.value)} baş</div>
          </div>
        ))}
      </div>
    </>
  );
}
