import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

interface YearlyDataItem {
  year: string;
  value: number;
}

interface CityDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

const ANIMAL_GROUPS = [
  { id: 'Sığır', name: 'Sığır (Büyükbaş)' },
  { id: 'Manda', name: 'Manda' },
];

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function TuikLivestockPage() {
  const [selectedYear, setSelectedYear] = useState('y2023');
  const [selectedAnimal, setSelectedAnimal] = useState('Sığır');
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yearCol = selectedYear;

      // İl bazında hayvan sayıları
      const cityQuery = `SELECT il, SUM(CAST(${yearCol} AS DECIMAL(20,2))) as toplam 
        FROM tuik_hayvansayisi 
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
        GROUP BY il ORDER BY toplam DESC LIMIT 20`;

      // Yıllık trend (Türkiye toplamı)
      const yearlyQuery = `SELECT 
        SUM(CAST(y2004 AS DECIMAL(20,2))) as v2004,
        SUM(CAST(y2005 AS DECIMAL(20,2))) as v2005,
        SUM(CAST(y2006 AS DECIMAL(20,2))) as v2006,
        SUM(CAST(y2007 AS DECIMAL(20,2))) as v2007,
        SUM(CAST(y2008 AS DECIMAL(20,2))) as v2008,
        SUM(CAST(y2009 AS DECIMAL(20,2))) as v2009,
        SUM(CAST(y2010 AS DECIMAL(20,2))) as v2010,
        SUM(CAST(y2011 AS DECIMAL(20,2))) as v2011,
        SUM(CAST(y2012 AS DECIMAL(20,2))) as v2012,
        SUM(CAST(y2013 AS DECIMAL(20,2))) as v2013,
        SUM(CAST(y2014 AS DECIMAL(20,2))) as v2014,
        SUM(CAST(y2015 AS DECIMAL(20,2))) as v2015,
        SUM(CAST(y2016 AS DECIMAL(20,2))) as v2016,
        SUM(CAST(y2017 AS DECIMAL(20,2))) as v2017,
        SUM(CAST(y2018 AS DECIMAL(20,2))) as v2018,
        SUM(CAST(y2019 AS DECIMAL(20,2))) as v2019,
        SUM(CAST(y2020 AS DECIMAL(20,2))) as v2020,
        SUM(CAST(y2021 AS DECIMAL(20,2))) as v2021,
        SUM(CAST(y2022 AS DECIMAL(20,2))) as v2022,
        SUM(CAST(y2023 AS DECIMAL(20,2))) as v2023,
        SUM(CAST(y2024 AS DECIMAL(20,2))) as v2024
        FROM tuik_hayvansayisi 
        WHERE grup='${selectedAnimal}' AND duzeykod='3'`;

      const [cityRes, yearlyRes] = await Promise.all([
        fetchQuery(cityQuery),
        fetchQuery(yearlyQuery)
      ]);

      if (cityRes.data) {
        const total = cityRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        setTotalValue(total);
        const mapped = cityRes.data.map((item, index: number) => ({
          name: String(item['il'] || ''),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        }));
        setCityData(mapped);
      }

      if (yearlyRes.data && yearlyRes.data[0]) {
        const row = yearlyRes.data[0];
        const mapped = [];
        for (let y = 2004; y <= 2024; y++) {
          mapped.push({
            year: String(y),
            value: Number(row[`v${y}`]) || 0
          });
        }
        setYearlyData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedAnimal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const yearLabel = selectedYear.replace('y', '');
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const avgValue = cityData.length > 0 ? totalValue / cityData.length : 0;

  // Yıllık değişim
  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const yearChange = prevYearIdx >= 0 && yearlyData[prevYearIdx]?.value > 0
    ? ((Number(yearlyData[currentYearIdx]?.value) - Number(yearlyData[prevYearIdx]?.value)) / Number(yearlyData[prevYearIdx]?.value) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🐄 TÜİK Hayvan İstatistikleri</h1>
        <p className="page-subtitle">Türkiye İl Bazında Hayvan Sayıları - {yearLabel}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Hayvan Grubu</label>
          <select className="filter-select" value={selectedAnimal} onChange={(e) => setSelectedAnimal(e.target.value)}>
            {ANIMAL_GROUPS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: 21 }, (_, i) => 2024 - i).map(year => (
              <option key={year} value={`y${year}`}>{year}</option>
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
              <div className="kpi-header"><span className="kpi-title">TÜRKİYE TOPLAMI</span></div>
              <div className="kpi-value">{formatNumber(totalValue)}</div>
              <div className="kpi-subtitle">baş ({yearLabel})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
              <div className="kpi-subtitle">{formatNumber(topCityValue)} baş</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">{formatNumber(avgValue)}</div>
              <div className="kpi-subtitle">baş/il</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık {selectedAnimal} Sayısı Trendi (2004-2024)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🏙️ İl Bazında {selectedAnimal} Sayısı ({yearLabel})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                  <Bar dataKey="value" name={selectedAnimal} radius={[0, 4, 4, 0]}>
                    {cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 İl Payları Dağılımı</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie 
                    data={cityData.slice(0, 10)} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={130} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name?.substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {cityData.slice(0, 10).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <h3 className="data-table-title">📋 İl Sıralaması - {selectedAnimal} Sayısı</h3>
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
      )}
    </div>
  );
}
