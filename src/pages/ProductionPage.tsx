import { useEffect, useState, useCallback } from 'react';
import { Leaf, Grid, BarChart3, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import ProductSelector from '../components/ProductSelector';
import { fetchQuery, formatNumber } from '../services/api';

const COLORS = ['#14b8a6', '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#f59e0b', '#3b82f6'];

const YEAR_OPTIONS = [
  { id: 'y2023', name: '2023' },
  { id: 'y2022', name: '2022' },
  { id: 'y2021', name: '2021' },
  { id: 'y2020', name: '2020' },
];

interface YearlyDataItem {
  year: string;
  [key: string]: string | number;
}

interface CityDataItem {
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

function formatProduction(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar Ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon Ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin Ton';
  return value.toFixed(0) + ' Ton';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function ProductionPage() {
  const [selectedYear, setSelectedYear] = useState('y2023');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Buğday']);
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [productCount, setProductCount] = useState(0);

  // Load product list from TÜİK
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
          setProductCount(products.length);
        }
      } catch (error) {
        console.error('Ürün listesi yüklenirken hata:', error);
      }
    };
    loadProducts();
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

      // City-level data (Top 15)
      const cityQuery = `SELECT ili, SUM(CAST(${yearCol} AS DECIMAL(20,2))) as toplam 
        FROM tuik_bitkisel_uretim 
        WHERE unsur='Üretim' AND urun IN (${productList}) AND duzeykod='3'
        GROUP BY ili ORDER BY toplam DESC LIMIT 15`;

      // Yearly trend (Turkey total)
      const yearlyQuery = `SELECT 
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
        SUM(CAST(y2023 AS DECIMAL(20,2))) as v2023
        FROM tuik_bitkisel_uretim 
        WHERE unsur='Üretim' AND urun IN (${productList}) AND duzeykod='1'`;

      const [cityRes, yearlyRes] = await Promise.all([
        fetchQuery(cityQuery),
        fetchQuery(yearlyQuery)
      ]);

      // Process city data
      const cityRaw = cityRes.data || [];
      const totalCity = cityRaw.reduce((sum, item) => sum + (parseFloat(String(item.toplam)) || 0), 0);
      setTotalValue(totalCity);

      const cityProcessed = cityRaw.map((item, idx) => {
        const value = parseFloat(String(item.toplam)) || 0;
        const share = totalCity > 0 ? ((value / totalCity) * 100).toFixed(1) : '0';
        return {
          name: String(item.ili),
          value,
          share: share + '%',
          fill: COLORS[idx % COLORS.length]
        };
      });
      setCityData(cityProcessed);

      // Process yearly data
      if (yearlyRes.data && yearlyRes.data.length > 0) {
        const row = yearlyRes.data[0];
        const years = ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
        const yearlyProcessed = years.map(y => ({
          year: y,
          value: parseFloat(String(row[`v${y}`])) || 0
        }));
        setYearlyData(yearlyProcessed);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  const avgPerCity = cityData.length > 0 ? totalValue / cityData.length : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tarımsal Üretim</h1>
        <p className="page-subtitle">TÜİK bitkisel üretim verileri — İl bazlı dağılım ve yıllık trendler</p>
      </div>

      {/* Year and Product Selector */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Yıl Seçin</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          >
            {YEAR_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: '300px' }}>
          <ProductSelector
            products={productList}
            selectedProducts={selectedProducts}
            onProductsChange={setSelectedProducts}
            label="Ürün Seçin (TÜİK)"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Üretim"
          value={formatProduction(totalValue)}
          subtitle={`${selectedProducts.length} ürün • ${cityData.length} il`}
          icon={Leaf}
          color="teal"
          large
        />
        <KPICard
          title="Kayıtlı Ürün"
          value={String(productCount)}
          subtitle="TÜİK veritabanı"
          icon={Grid}
          color="green"
        />
        <KPICard
          title="İl Başına Ort."
          value={formatProduction(avgPerCity)}
          subtitle="Top 15 il ortalaması"
          icon={BarChart3}
          color="blue"
        />
        <KPICard
          title="Seçili Ürün"
          value={String(selectedProducts.length)}
          subtitle={selectedProducts.join(', ').substring(0, 20)}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">İllere Göre Üretim (Top 15)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                angle={-30} 
                textAnchor="end" 
                height={100} 
              />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                tickFormatter={(v: number) => formatShort(v)} 
              />
              <Tooltip 
                formatter={(value: unknown) => [formatProduction(Number(value) || 0), 'Üretim']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">İl Payları (%)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={cityData.slice(0, 8)}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.share}`}
              >
                {cityData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) => [formatProduction(Number(value) || 0), 'Üretim']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly Trend */}
      <div className="chart-card">
        <h3 className="chart-title">Yıllık Üretim Trendi (Türkiye Geneli)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={yearlyData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="year" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
            />
            <YAxis 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
              tickFormatter={(v: number) => formatShort(v)} 
            />
            <Tooltip
              formatter={(value: unknown) => [formatProduction(Number(value) || 0), 'Üretim']}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#14b8a6" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              name="Toplam Üretim"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* City Production Table */}
      <div className="data-table">
        <h3 className="data-table-title">İllere Göre Üretim Detayı</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr auto auto', 
          gap: '8px', 
          padding: '12px 16px', 
          background: 'var(--card-bg)',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase'
        }}>
          <div>#</div>
          <div>İl</div>
          <div style={{ textAlign: 'right' }}>Pay</div>
          <div style={{ textAlign: 'right' }}>Üretim</div>
        </div>
        {cityData.map((city, index) => (
          <div key={index} className="table-row" style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto auto',
            gap: '8px',
            alignItems: 'center'
          }}>
            <div className="table-rank" style={{ 
              background: city.fill + '20', 
              color: city.fill,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              fontWeight: 600
            }}>
              {index + 1}
            </div>
            <div className="table-info">
              <div className="table-name" style={{ fontSize: '14px', fontWeight: 500 }}>{city.name}</div>
            </div>
            <div style={{ 
              textAlign: 'right',
              fontSize: '13px',
              fontWeight: 500,
              color: city.fill,
              whiteSpace: 'nowrap'
            }}>
              {city.share}
            </div>
            <div className="table-value" style={{ 
              color: city.fill,
              textAlign: 'right',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              fontSize: '14px'
            }}>
              {formatProduction(city.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
