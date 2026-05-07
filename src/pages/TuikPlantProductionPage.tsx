import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { ChartInsightButton } from '../components/ChartInsightButton';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

interface YearlyDataItem {
  year: string;
  [key: string]: string | number;
}

interface CityDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

interface ProductItem {
  id: string;
  name: string;
  nameTR: string;
}

const UNSUR_OPTIONS = [
  { id: 'Üretim', name: 'Üretim (Ton)' },
  { id: 'Ekilen Alan', name: 'Ekilen Alan (Dekar)' },
  { id: 'Hasat Edilen Alan', name: 'Hasat Edilen Alan (Dekar)' },
];

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + ' Mly';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + ' Mln';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + ' Bin';
  return value.toFixed(0);
}

export default function TuikPlantProductionPage() {
  const [selectedYear, setSelectedYear] = useState('y2024');
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Buğday']);
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  // Ürün listesini yükle
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const query = `SELECT DISTINCT urun FROM tuik_bitkisel_uretim WHERE unsur='Üretim' ORDER BY urun LIMIT 100`;
        const res = await fetchQuery(query);
        if (res.data) {
          const products = res.data.map((item) => ({
            id: String(item['urun']),
            name: String(item['urun']),
            nameTR: String(item['urun'])
          }));
          setProductList(products);
          if (products.length > 0 && selectedProducts.length === 0) {
            setSelectedProducts([products[0].id]);
          }
        }
      } catch (error) {
        console.error('Ürün listesi yüklenirken hata:', error);
      }
    };
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setCityData([]);
      setYearlyData([]);
      return;
    }

    setLoading(true);
    try {
      const productList = selectedProducts.map(p => `'${p}'`).join(',');
      const yearCol = selectedYear;

      // İl bazında veriler
      const cityQuery = `SELECT yer, SUM(CAST(${yearCol} AS DECIMAL(20,2))) as toplam 
        FROM tuik_bitkisel_uretim 
        WHERE unsur='${selectedUnsur}' AND urun IN (${productList}) AND duzeykod='3'
        GROUP BY yer ORDER BY toplam DESC LIMIT 20`;

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
        FROM tuik_bitkisel_uretim 
        WHERE unsur='${selectedUnsur}' AND urun IN (${productList}) AND duzeykod='3'`;

      const [cityRes, yearlyRes] = await Promise.all([
        fetchQuery(cityQuery),
        fetchQuery(yearlyQuery)
      ]);

      if (cityRes.data) {
        const total = cityRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        setTotalValue(total);
        const mapped = cityRes.data.map((item, index: number) => ({
          name: String(item['yer'] || ''),
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
  }, [selectedProducts, selectedYear, selectedUnsur]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const yearLabel = selectedYear.replace('y', '');
  const unit = selectedUnsur === 'Üretim' ? 'ton' : 'dekar';
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const avgValue = cityData.length > 0 ? totalValue / cityData.length : 0;

  // Yıllık değişim
  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const currentVal = currentYearIdx >= 0 ? Number(yearlyData[currentYearIdx]?.value) : 0;
  const prevVal = prevYearIdx >= 0 ? Number(yearlyData[prevYearIdx]?.value) : 0;
  const yearChange = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🇹🇷 TÜİK Bitkisel Üretim</h1>
        <p className="page-subtitle">Türkiye İl Bazında Bitkisel Üretim Verileri - {yearLabel}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Ürün Seçimi</label>
          <ProductSelector
            products={productList}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder="Ürün seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Gösterge</label>
          <select className="filter-select" value={selectedUnsur} onChange={(e) => setSelectedUnsur(e.target.value)}>
            {UNSUR_OPTIONS.map(opt => (
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
              <div className="kpi-value">{formatTon(totalValue)}</div>
              <div className="kpi-subtitle">{unit} ({yearLabel})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
              <div className="kpi-subtitle">{formatTon(topCityValue)} {unit}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">{formatTon(avgValue)}</div>
              <div className="kpi-subtitle">{unit}/il</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📅 Yıllık Üretim Trendi (2004-2024)</h3>
              <ChartInsightButton title="Yıllık Üretim Trendi" description="Yıllık üretim trendi (2004-2024)" data={yearlyData} context={{ section: 'Bitkisel Üretim' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🏙️ İl Bazında {selectedUnsur} ({yearLabel})</h3>
              <ChartInsightButton title={`İl Bazında ${selectedUnsur}`} description="İl bazında üretim" data={cityData} context={{ section: 'Bitkisel Üretim' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                  <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                    {cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 İl Payları Dağılımı</h3>
              <ChartInsightButton title="İl Payları Dağılımı" description="İl payları dağılımı" data={cityData.slice(0,10)} context={{ section: 'Bitkisel Üretim' }} compact />
              </div>
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
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <h3 className="data-table-title">📋 İl Sıralaması - {selectedUnsur}</h3>
            {cityData.map((city, index) => (
              <div className="table-row" key={city.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{city.name}</div>
                  <div className="table-subtext">Pay: %{city.share}</div>
                </div>
                <div className="table-value green">{formatTon(city.value)} {unit}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
