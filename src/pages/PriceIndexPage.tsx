import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  ComposedChart
} from 'recharts';
import { fetchQuery } from '../services/api';
import { translateCountry } from '../utils/countryTranslations';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface MonthlyDataItem {
  month: string;
  value: number;
}

interface YearlyDataItem {
  year: string;
  value: number;
}

interface CountryDataItem {
  name: string;
  value: number;
  share: string;
  fill: string;
}

type DatasetId = 'FAO_TUFE' | 'EXCEL_TUFE' | 'EXCEL_UFE' | 'EXCEL_GFE' | 'EXCEL_FAO_FOOD';

const MONTHS_TR: Record<string, string> = {
  'January': 'Ocak', 'February': 'Şubat', 'March': 'Mart', 'April': 'Nisan',
  'May': 'Mayıs', 'June': 'Haziran', 'July': 'Temmuz', 'August': 'Ağustos',
  'September': 'Eylül', 'October': 'Ekim', 'November': 'Kasım', 'December': 'Aralık'
};

const MONTHS_TR_NUM: Record<string, string> = {
  '1': 'Ocak',
  '2': 'Şubat',
  '3': 'Mart',
  '4': 'Nisan',
  '5': 'Mayıs',
  '6': 'Haziran',
  '7': 'Temmuz',
  '8': 'Ağustos',
  '9': 'Eylül',
  '10': 'Ekim',
  '11': 'Kasım',
  '12': 'Aralık'
};

function formatIndex(value: number): string {
  return value.toFixed(1);
}

export default function PriceIndexPage() {
  const [dataset, setDataset] = useState<DatasetId>('EXCEL_TUFE');
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);

  const datasetTitle = useMemo(() => {
    switch (dataset) {
      case 'FAO_TUFE':
        return '📈 Fiyat Endeksleri (FAO TÜFE - Gıda)';
      case 'EXCEL_TUFE':
        return '📈 Fiyat Endeksleri (TÜFE)';
      case 'EXCEL_UFE':
        return '📈 Fiyat Endeksleri (Tarım ÜFE)';
      case 'EXCEL_GFE':
        return '📈 Fiyat Endeksleri (GFE)';
      case 'EXCEL_FAO_FOOD':
        return '📈 FAO Gıda Fiyat Endeksi';
      default:
        return '📈 Fiyat Endeksleri';
    }
  }, [dataset]);

  const datasetSubtitle = useMemo(() => {
    if (dataset === 'FAO_TUFE') {
      return `FAO TÜFE - Gıda (2015=100) - ${selectedYear}`;
    }
    if (dataset === 'EXCEL_FAO_FOOD') {
      return `${selectedSeries || 'Endeks'} - ${selectedYear}`;
    }
    return `${selectedSeries || 'Endeks'} - ${selectedYear}`;
  }, [dataset, selectedSeries, selectedYear]);

  const supportsCountryCompare = dataset === 'FAO_TUFE';

  const loadMeta = useCallback(async () => {
    try {
      let sql = '';
      if (dataset === 'EXCEL_TUFE') sql = 'SELECT DISTINCT donem as s FROM excel_tufe ORDER BY donem';
      if (dataset === 'EXCEL_UFE') sql = 'SELECT DISTINCT donem as s FROM excel_ufe ORDER BY donem';
      if (dataset === 'EXCEL_GFE') sql = 'SELECT DISTINCT "GFE" as s';
      if (dataset === 'EXCEL_FAO_FOOD') sql = 'SELECT DISTINCT endeks_turu as s FROM excel_fao_gida_endeksi ORDER BY endeks_turu';
      if (dataset === 'FAO_TUFE') sql = 'SELECT DISTINCT "FAO TÜFE (Gıda)" as s';

      const res = await fetchQuery(sql);
      const options = (res.data || []).map((r) => String(r.s)).filter(Boolean);
      setSeriesOptions(options);
      if (options.length > 0 && !options.includes(selectedSeries)) {
        setSelectedSeries(options[0]);
      }
      if (options.length === 0) {
        setSelectedSeries('');
      }
    } catch (e) {
      console.error('Meta yüklenirken hata:', e);
      setSeriesOptions([]);
      setSelectedSeries('');
    }
  }, [dataset, selectedSeries]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (dataset === 'FAO_TUFE') {
        const monthlyQuery = `SELECT Months, AVG(CAST(REPLACE(Value, ',', '.') AS DECIMAL(10,2))) as avg_value 
          FROM FAO_tufe 
          WHERE Year='${selectedYear}' AND AreaCodeFAO='5000'
          GROUP BY Months, MonthsCode ORDER BY MonthsCode`;
        
        const yearlyQuery = `SELECT Year, AVG(CAST(REPLACE(Value, ',', '.') AS DECIMAL(10,2))) as avg_value 
          FROM FAO_tufe 
          WHERE AreaCodeFAO='5000'
          GROUP BY Year ORDER BY Year`;

        const countryQuery = `SELECT Area, AVG(CAST(REPLACE(Value, ',', '.') AS DECIMAL(10,2))) as avg_value 
          FROM FAO_tufe 
          WHERE Year='${selectedYear}' AND AreaCodeFAO NOT IN ('5000', '5100', '5200', '5300', '5400', '5500')
          GROUP BY Area ORDER BY avg_value DESC LIMIT 20`;

        const [monthlyRes, yearlyRes, countryRes] = await Promise.all([
          fetchQuery(monthlyQuery),
          fetchQuery(yearlyQuery),
          fetchQuery(countryQuery)
        ]);

        setMonthlyData(
          (monthlyRes.data || []).map((item) => ({
            month: MONTHS_TR[String(item['Months'])] || String(item['Months']),
            value: Number(item['avg_value']) || 0
          }))
        );

        setYearlyData(
          (yearlyRes.data || []).map((item) => ({
            year: String(item['Year']),
            value: Number(item['avg_value']) || 0
          }))
        );

        const total = (countryRes.data || []).reduce((sum: number, item) => sum + (Number(item['avg_value']) || 0), 0);
        setCountryData(
          (countryRes.data || []).map((item, index: number) => ({
            name: translateCountry(String(item['Area'] || '')),
            value: Number(item['avg_value']) || 0,
            share: total > 0 ? ((Number(item['avg_value']) || 0) / total * 100).toFixed(1) : '0.0',
            fill: COLORS[index % COLORS.length]
          }))
        );
        return;
      }

      let monthlyQuery = '';
      let yearlyQuery = '';

      if (dataset === 'EXCEL_TUFE') {
        monthlyQuery = `SELECT MONTH(kategori) as m, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_tufe
          WHERE donem='${selectedSeries}' AND YEAR(kategori)='${selectedYear}'
          GROUP BY MONTH(kategori)
          ORDER BY MONTH(kategori)`;
        yearlyQuery = `SELECT YEAR(kategori) as y, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_tufe
          WHERE donem='${selectedSeries}'
          GROUP BY YEAR(kategori)
          ORDER BY YEAR(kategori)`;
      }

      if (dataset === 'EXCEL_UFE') {
        monthlyQuery = `SELECT MONTH(kategori) as m, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_ufe
          WHERE donem='${selectedSeries}' AND YEAR(kategori)='${selectedYear}'
          GROUP BY MONTH(kategori)
          ORDER BY MONTH(kategori)`;
        yearlyQuery = `SELECT YEAR(kategori) as y, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_ufe
          WHERE donem='${selectedSeries}'
          GROUP BY YEAR(kategori)
          ORDER BY YEAR(kategori)`;
      }

      if (dataset === 'EXCEL_GFE') {
        monthlyQuery = `SELECT MONTH(kategori) as m, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_gfe
          WHERE YEAR(kategori)='${selectedYear}'
          GROUP BY MONTH(kategori)
          ORDER BY MONTH(kategori)`;
        yearlyQuery = `SELECT YEAR(kategori) as y, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_gfe
          GROUP BY YEAR(kategori)
          ORDER BY YEAR(kategori)`;
      }

      if (dataset === 'EXCEL_FAO_FOOD') {
        monthlyQuery = `SELECT MONTH(tarih) as m, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_fao_gida_endeksi
          WHERE endeks_turu='${selectedSeries}' AND YEAR(tarih)='${selectedYear}'
          GROUP BY MONTH(tarih)
          ORDER BY MONTH(tarih)`;
        yearlyQuery = `SELECT YEAR(tarih) as y, AVG(CAST(deger AS DECIMAL(10,4))) as avg_value
          FROM excel_fao_gida_endeksi
          WHERE endeks_turu='${selectedSeries}'
          GROUP BY YEAR(tarih)
          ORDER BY YEAR(tarih)`;
      }

      const [monthlyRes, yearlyRes] = await Promise.all([
        monthlyQuery ? fetchQuery(monthlyQuery) : Promise.resolve({ data: [] }),
        yearlyQuery ? fetchQuery(yearlyQuery) : Promise.resolve({ data: [] }),
      ]);

      setMonthlyData(
        (monthlyRes.data || []).map((item) => ({
          month: MONTHS_TR_NUM[String(item['m'])] || String(item['m']),
          value: Number(item['avg_value']) || 0
        }))
      );

      setYearlyData(
        (yearlyRes.data || []).map((item) => ({
          year: String(item['y']),
          value: Number(item['avg_value']) || 0
        }))
      );

      setCountryData([]);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [dataset, selectedSeries, selectedYear]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (dataset === 'FAO_TUFE') {
      loadData();
      return;
    }

    if (dataset === 'EXCEL_GFE' || selectedSeries) {
      loadData();
    }
  }, [dataset, selectedSeries, loadData]);

  const avgIndex = monthlyData.length > 0 ? monthlyData.reduce((sum, m) => sum + m.value, 0) / monthlyData.length : 0;
  const maxMonth = monthlyData.reduce((max, m) => m.value > max.value ? m : max, { month: '-', value: 0 });
  const minMonth = monthlyData.reduce((min, m) => m.value < min.value ? m : min, monthlyData[0] || { month: '-', value: Infinity });

  // Yıllık değişim hesapla
  const currentYearData = yearlyData.find(y => y.year === selectedYear);
  const prevYearData = yearlyData.find(y => y.year === String(Number(selectedYear) - 1));
  const yearChange = currentYearData && prevYearData ? ((currentYearData.value - prevYearData.value) / prevYearData.value * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{datasetTitle}</h1>
        <p className="page-subtitle">{datasetSubtitle}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Kaynak</label>
          <select className="filter-select" value={dataset} onChange={(e) => setDataset(e.target.value as DatasetId)}>
            <option value="EXCEL_TUFE">TÜFE (Excel/TR)</option>
            <option value="EXCEL_UFE">Tarım ÜFE (Excel/TR)</option>
            <option value="EXCEL_GFE">GFE (Excel/TR)</option>
            <option value="EXCEL_FAO_FOOD">FAO Gıda Endeksi (Excel)</option>
            <option value="FAO_TUFE">FAO TÜFE (Ülke karşılaştırma)</option>
          </select>
        </div>

        {dataset !== 'EXCEL_GFE' && seriesOptions.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Seri</label>
            <select className="filter-select" value={selectedSeries} onChange={(e) => setSelectedSeries(e.target.value)}>
              {seriesOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: 30 }, (_, i) => 2024 - i).map(year => (
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
              <div className="kpi-header"><span className="kpi-title">YIL ORTALAMASI</span></div>
              <div className="kpi-value">{formatIndex(avgIndex)}</div>
              <div className="kpi-subtitle">Endeks (2015=100)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'red' : 'green'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#ef4444' : '#22c55e' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">EN YÜKSEK AY</span><div className="kpi-icon orange">🔺</div></div>
              <div className="kpi-value">{maxMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(maxMonth.value)} endeks</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">EN DÜŞÜK AY</span><div className="kpi-icon green">🔻</div></div>
              <div className="kpi-value">{minMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(minMonth.value)} endeks</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Aylık Endeks Değişimi ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatIndex(value)}`, 'Endeks']} />
                  <Bar dataKey="value" name="TÜFE" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Aylık Trend Çizgisi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatIndex(value)}`, 'Endeks']} />
                  <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık Endeks Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatIndex(value)}`, 'Endeks']} />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {supportsCountryCompare && (
            <>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">🌍 Ülke Bazında Karşılaştırma ({selectedYear})</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={countryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(value: number) => [`${formatIndex(value)}`, 'Endeks']} />
                      <Legend />
                      <Bar dataKey="value" name="Endeks" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="data-table">
                <h3 className="data-table-title">📋 Ülke Sıralaması</h3>
                {countryData.map((country, index) => (
                  <div className="table-row" key={country.name}>
                    <div className={`table-rank ${index < 3 ? 'red' : ''}`}>{index + 1}</div>
                    <div className="table-info">
                      <div className="table-name">{country.name}</div>
                      <div className="table-subtext">2015=100 baz yılı</div>
                    </div>
                    <div className="table-value red">{formatIndex(country.value)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
