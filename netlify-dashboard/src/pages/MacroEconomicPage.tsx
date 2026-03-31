import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchQuery } from '../services/api';
import { translateCountry } from '../utils/countryTranslations';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface YearlyDataItem {
  year: string;
  value: number;
}

interface CountryDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

const INDICATOR_OPTIONS = [
  { id: 'Gross Domestic Product', name: 'GSYH (Gayri Safi Yurtiçi Hasıla)' },
  { id: 'Gross Fixed Capital Formation', name: 'Brüt Sabit Sermaye Oluşumu' },
];

function formatValue(value: number): string {
  if (value >= 1e12) return (value / 1e12).toFixed(2) + ' Trilyon $';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar $';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + ' Milyon $';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin $';
  return value.toFixed(0) + ' $';
}

function formatShort(value: number): string {
  if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function MacroEconomicPage() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedIndicator, setSelectedIndicator] = useState('Gross Domestic Product');
  const [loading, setLoading] = useState(true);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [worldTotal, setWorldTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Dünya toplam GSYH yıllık trend
      const yearlyQuery = `SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total 
        FROM fao_ME_indicator 
        WHERE item='${selectedIndicator}' AND elementcode='6110' AND unit='million USD'
        GROUP BY year ORDER BY year`;

      // Ülke bazında GSYH (en büyük 20)
      const countryQuery = `SELECT area, SUM(CAST(value AS DECIMAL(20,4))) as total 
        FROM fao_ME_indicator 
        WHERE item='${selectedIndicator}' AND year='${selectedYear}' AND elementcode='6110' AND unit='million USD'
        GROUP BY area ORDER BY total DESC LIMIT 20`;

      const [yearlyRes, countryRes] = await Promise.all([
        fetchQuery(yearlyQuery),
        fetchQuery(countryQuery)
      ]);

      if (yearlyRes.data) {
        const mapped = yearlyRes.data.map((item) => ({
          year: String(item['year']),
          value: (Number(item['total']) || 0) * 1e6 // Million to actual
        }));
        setYearlyData(mapped);
        
        // Seçili yıl toplam
        const selectedYearData = mapped.find(y => y.year === selectedYear);
        setWorldTotal(selectedYearData?.value || 0);
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['total']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => ({
          name: translateCountry(String(item['area'] || '')),
          value: (Number(item['total']) || 0) * 1e6,
          share: ((Number(item['total']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        }));
        setCountryData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedIndicator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topCountry = countryData[0]?.name || '-';
  const topCountryValue = countryData[0]?.value || 0;
  const top5Total = countryData.slice(0, 5).reduce((sum, c) => sum + c.value, 0);
  const top5Share = worldTotal > 0 ? (top5Total / worldTotal * 100) : 0;

  // Yıllık büyüme
  const currentYearData = yearlyData.find(y => y.year === selectedYear);
  const prevYearData = yearlyData.find(y => y.year === String(Number(selectedYear) - 1));
  const yearGrowth = currentYearData && prevYearData && prevYearData.value > 0 
    ? ((currentYearData.value - prevYearData.value) / prevYearData.value * 100) 
    : 0;

  const indicatorName = INDICATOR_OPTIONS.find(i => i.id === selectedIndicator)?.name || selectedIndicator;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">💰 Makroekonomik Göstergeler</h1>
        <p className="page-subtitle">{indicatorName} - {selectedYear}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Gösterge</label>
          <select className="filter-select" value={selectedIndicator} onChange={(e) => setSelectedIndicator(e.target.value)}>
            {INDICATOR_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: 55 }, (_, i) => 2024 - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">DÜNYA TOPLAMI</span></div>
              <div className="kpi-value">{formatValue(worldTotal)}</div>
              <div className="kpi-subtitle">{selectedYear} yılı</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK BÜYÜME</span><div className={`kpi-icon ${yearGrowth >= 0 ? 'green' : 'red'}`}>{yearGrowth >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearGrowth >= 0 ? '#22c55e' : '#ef4444' }}>%{yearGrowth.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER ÜLKE</span><div className="kpi-icon blue">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCountry}</div>
              <div className="kpi-subtitle">{formatValue(topCountryValue)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TOP 5 PAYI</span><div className="kpi-icon purple">📊</div></div>
              <div className="kpi-value">%{top5Share.toFixed(1)}</div>
              <div className="kpi-subtitle">Dünya toplamından</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık {indicatorName} Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatValue(value), indicatorName]} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🌍 Ülke Dağılımı ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={countryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [formatValue(value), indicatorName]} />
                  <Bar dataKey="value" name={indicatorName} fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {countryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Top 8 Ülke Payı</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie 
                    data={countryData.slice(0, 8)} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={120} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name?.substring(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {countryData.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatValue(value), indicatorName]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <h3 className="data-table-title">📋 Ülke Sıralaması - {indicatorName}</h3>
            {countryData.map((country, index) => (
              <div className="table-row" key={country.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{country.name}</div>
                  <div className="table-subtext">Pay: %{country.share}</div>
                </div>
                <div className="table-value blue">{formatValue(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
