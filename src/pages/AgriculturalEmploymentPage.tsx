import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ComposedChart, Line,
  LineChart
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface CountryDataItem {
  [key: string]: string | number;
  name: string;
  total: number;
  male: number;
  female: number;
  share: string;
  fill: string;
}

function formatPop(value: number): string {
  // value is in 1000s
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(2) + ' Milyar';
  if (actual >= 1e6) return (actual / 1e6).toFixed(2) + ' Milyon';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + ' Bin';
  return actual.toFixed(0);
}

function formatShort(value: number): string {
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(1) + 'B';
  if (actual >= 1e6) return (actual / 1e6).toFixed(1) + 'M';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + 'K';
  return actual.toFixed(0);
}

export default function AgriculturalEmploymentPage() {
  const [selectedYear, setSelectedYear] = useState('2021');
  const [loading, setLoading] = useState(true);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; total: number; male: number; female: number}[]>([]);
  const [genderData, setGenderData] = useState<{name: string; value: number; fill: string}[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'name'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const countryQuery = `SELECT area, 
        SUM(CAST(total_v AS DECIMAL(20,2))) as toplam,
        SUM(CAST(male_v AS DECIMAL(20,2))) as erkek,
        SUM(CAST(female_v AS DECIMAL(20,2))) as kadin
        FROM fao_tarim_istihdam 
        WHERE year='${selectedYear}'
        GROUP BY area ORDER BY toplam DESC LIMIT 25`;

      const yearlyQuery = `SELECT year, 
        SUM(CAST(total_v AS DECIMAL(20,2))) as toplam,
        SUM(CAST(male_v AS DECIMAL(20,2))) as erkek,
        SUM(CAST(female_v AS DECIMAL(20,2))) as kadin
        FROM fao_tarim_istihdam 
        GROUP BY year ORDER BY year`;

      const globalQuery = `SELECT 
        SUM(CAST(male_v AS DECIMAL(20,2))) as erkek,
        SUM(CAST(female_v AS DECIMAL(20,2))) as kadin
        FROM fao_tarim_istihdam 
        WHERE year='${selectedYear}'`;

      const [countryRes, yearlyRes, globalRes] = await Promise.all([
        fetchQuery(countryQuery),
        fetchQuery(yearlyQuery),
        fetchQuery(globalQuery)
      ]);

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => ({
          name: String(item['area'] || ''),
          total: Number(item['toplam']) || 0,
          male: Number(item['erkek']) || 0,
          female: Number(item['kadin']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        } as CountryDataItem));
        setCountryData(mapped);
      }

      if (yearlyRes.data) {
        const mapped = yearlyRes.data.map((item) => ({
          year: String(item['year'] || ''),
          total: Number(item['toplam']) || 0,
          male: Number(item['erkek']) || 0,
          female: Number(item['kadin']) || 0
        }));
        setYearlyData(mapped);
      }

      if (globalRes.data && globalRes.data[0]) {
        const g = globalRes.data[0];
        setGenderData([
          { name: 'Erkek', value: Number(g['erkek']) || 0, fill: '#3b82f6' },
          { name: 'Kadın', value: Number(g['kadin']) || 0, fill: '#ec4899' },
        ]);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalEmployment = countryData.reduce((sum, item) => sum + item.total, 0);
  const topCountry = countryData[0]?.name || '-';
  const maleTotal = genderData.find(g => g.name === 'Erkek')?.value || 0;
  const femaleTotal = genderData.find(g => g.name === 'Kadın')?.value || 0;
  const femalePercent = ((femaleTotal / (maleTotal + femaleTotal)) * 100) || 0;

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'total') {
      return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
    }
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👨‍🌾 Tarım İstihdamı</h1>
        <p className="page-subtitle">Dünya tarım sektörü istihdam verileri ({selectedYear})</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
            <option value="2018">2018</option>
            <option value="2017">2017</option>
            <option value="2015">2015</option>
            <option value="2010">2010</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">TOPLAM İSTİHDAM</span></div>
              <div className="kpi-value">{formatPop(totalEmployment)}</div>
              <div className="kpi-subtitle">Tarım sektöründe çalışan</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ERKEK</span><div className="kpi-icon blue">👨</div></div>
              <div className="kpi-value">{formatPop(maleTotal)}</div>
              <div className="kpi-subtitle">{(100 - femalePercent).toFixed(1)}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KADIN</span><div className="kpi-icon pink">👩</div></div>
              <div className="kpi-value">{formatPop(femaleTotal)}</div>
              <div className="kpi-subtitle">{femalePercent.toFixed(1)}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">EN YÜKSEK</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{fontSize: '1.1rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">{formatPop(countryData[0]?.total || 0)}</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥧 Cinsiyet Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}>
                    {genderData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatPop(value), 'İstihdam']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📊 Top 15 Ülke İstihdamı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryData.slice(0, 15)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [formatPop(value), 'İstihdam']} />
                  <Bar dataKey="total" name="Toplam" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📈 Erkek vs Kadın (Top 10)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatPop(value), '']} />
                  <Legend />
                  <Bar dataKey="male" name="Erkek" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="female" name="Kadın" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="total" name="Toplam" stroke="#22c55e" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">👨👩 Cinsiyet Dağılımı (Top 10)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatPop(value), '']} />
                  <Legend />
                  <Line type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="female" name="Kadın" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📅 Yıllık İstihdam Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatPop(value), '']} />
                  <Legend />
                  <Area type="monotone" dataKey="total" name="Toplam" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="female" name="Kadın" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="data-table-title" style={{ margin: 0 }}>📋 Ülke İstihdam Sıralaması</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setSortBy('total'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'total' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'total' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  İstihdama Göre {sortBy === 'total' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'name' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'name' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  İsme Göre {sortBy === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
              </div>
            </div>
            {sortedCountryData.map((country, index) => (
              <div className="table-row" key={country.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{country.name}</div>
                  <div className="table-subtext">Erkek: {formatPop(country.male)} | Kadın: {formatPop(country.female)}</div>
                </div>
                <div className="table-value green">{formatPop(country.total)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
