import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line,
  AreaChart, Area,
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';

// --------------- Types ---------------
export interface FaoProduct {
  id: string;
  name: string;
  nameTR: string;
}

export interface FaoPageConfig {
  colors: string[];
  products: FaoProduct[];
  defaultSelected: string[];
  pageTitle: string;
  pageSubtitle: string;          // {year} placeholder
  comparisonTitle: string;
  distributionTitle: string;
  primaryColor: string;
  unit: 'ton' | 'adet';
  productPlaceholder: string;
  kpiIcon: string;
}

// --------------- Internals ---------------
interface ProductDataItem {
  [key: string]: string | number;
  name: string;
  nameEN: string;
  value: number;
  fill: string;
}

interface CountryDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

function makeFormatLong(unit: string) {
  return (value: number): string => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + ` Milyar ${unit}`;
    if (value >= 1e6) return (value / 1e6).toFixed(2) + ` Milyon ${unit}`;
    if (value >= 1e3) return (value / 1e3).toFixed(1) + ` Bin ${unit}`;
    return value.toFixed(0) + ` ${unit}`;
  };
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

// --------------- Component ---------------
export default function FaoAnimalProductionPage({ config }: { config: FaoPageConfig }) {
  const { colors, products, defaultSelected, primaryColor, unit, kpiIcon } = config;
  const formatValue = makeFormatLong(unit);

  const [selectedProducts, setSelectedProducts] = useState<string[]>(defaultSelected);
  const [selectedYear, setSelectedYear] = useState('2023');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<ProductDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; value: number}[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchQuery(
        "SELECT MAX(year) as max_year FROM fao_uretim_hayvansal_birincil"
      );
      const maxYear = String(res.data?.[0]?.max_year ?? '').trim();
      if (!cancelled && maxYear) setSelectedYear(maxYear);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setProductData([]);
      setCountryData([]);
      setYearlyData([]);
      return;
    }

    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";
      const productList = selectedProducts.map(p => `'${p.replace(/'/g, "''")}'`).join(',');

      const productQuery = `SELECT urunad as item, SUM(CAST(REPLACE(uretim_deger, ',', '.') AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND urunad IN (${productList})
          AND ulkead IS NOT NULL AND ulkead != ''
          AND ulkead NOT IN ${excludedAreas}
        GROUP BY urunad ORDER BY toplam DESC`;

      const countryQuery = `SELECT ulkead as area, SUM(CAST(REPLACE(uretim_deger, ',', '.') AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND urunad IN (${productList})
          AND ulkead IS NOT NULL AND ulkead != ''
          AND ulkead NOT IN ${excludedAreas}
        GROUP BY ulkead ORDER BY toplam DESC LIMIT 20`;

      const yearlyQuery = `SELECT year, SUM(CAST(REPLACE(uretim_deger, ',', '.') AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_hayvansal_birincil 
        WHERE urunad IN (${productList})
          AND ulkead IS NOT NULL AND ulkead != ''
          AND ulkead NOT IN ${excludedAreas}
        GROUP BY year ORDER BY year`;

      const [productRes, countryRes, yearlyRes] = await Promise.all([
        fetchQuery(productQuery),
        fetchQuery(countryQuery),
        fetchQuery(yearlyQuery),
      ]);

      if (productRes.data) {
        setProductData(productRes.data.map((item, index: number) => {
          const itemName = String(item['item'] || '');
          const product = products.find(p => p.id === itemName);
          return {
            name: product?.nameTR || itemName,
            nameEN: itemName,
            value: Number(item['toplam']) || 0,
            fill: colors[index % colors.length]
          } as ProductDataItem;
        }));
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        setCountryData(countryRes.data.map((item, index: number) => ({
          name: translateCountry(String(item['area'] || '')),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: colors[index % colors.length]
        } as CountryDataItem)));
      }

      if (yearlyRes.data) {
        setYearlyData(yearlyRes.data.map((item) => ({
          year: String(item['year'] || ''),
          value: Number(item['toplam']) || 0
        })));
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear, products, colors]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalValue = productData.reduce((sum, item) => sum + item.value, 0);
  const topCountry = countryData[0]?.name || '-';
  const countryCount = countryData.length;

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'value') return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  const radarData = countryData.slice(0, 6).map(item => ({
    country: item.name?.substring(0, 12) || 'Unknown',
    value: item.value / 1000000,
    fullMark: countryData[0]?.value / 1000000 || 100
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{config.pageTitle}</h1>
        <p className="page-subtitle">{config.pageSubtitle.replace('{year}', selectedYear)}</p>
      </div>

      {/* Filtreler */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Ürün Seçimi
          </label>
          <ProductSelector
            products={products}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder={config.productPlaceholder}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Yıl
          </label>
          <select 
            className="filter-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {Array.from({ length: 20 }, (_, i) => 2024 - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* KPI Kartları */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">TOPLAM ÜRETİM</span>
              </div>
              <div className="kpi-value">{formatValue(totalValue)}</div>
              <div className="kpi-subtitle">{selectedProducts.length} ürün seçili</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ÜRÜN SAYISI</span>
                <div className="kpi-icon green">{kpiIcon}</div>
              </div>
              <div className="kpi-value">{productData.length}</div>
              <div className="kpi-subtitle">Aktif ürün</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ÜRETİCİ ÜLKE</span>
                <div className="kpi-icon purple">🌍</div>
              </div>
              <div className="kpi-value">{countryCount}</div>
              <div className="kpi-subtitle">İlk 15 ülke</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">LİDER ÜLKE</span>
                <div className="kpi-icon orange">🏆</div>
              </div>
              <div className="kpi-value" style={{fontSize: '1.1rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">En yüksek üretim</div>
            </div>
          </div>

          {/* Grafikler - Satır 1 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 {config.comparisonTitle}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                  <Tooltip 
                    formatter={(value: number) => [formatValue(value), 'Üretim']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {productData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 {config.distributionTitle}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {productData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatValue(value), 'Üretim']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafikler - Satır 2 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🗺️ Ülke Üretim Dağılımı (Treemap)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={countryData.slice(0, 12)}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="var(--bg-card)"
                  content={({ x, y, width, height, name, value }: { x: number; y: number; width: number; height: number; name: string; value: number }) => (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                          fill: colors[countryData.findIndex(c => c.name === name) % colors.length],
                          stroke: 'var(--bg-card)',
                          strokeWidth: 2,
                        }}
                      />
                      {width > 50 && height > 30 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
                            {name?.substring(0, 10)}
                          </text>
                          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={9}>
                            {formatShort(value)}
                          </text>
                        </>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Üretim ve Pazar Payı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatValue(value) : `%${value}`, name === 'value' ? 'Üretim' : 'Pay']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Üretim" fill={primaryColor} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="share" name="Pay %" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafikler - Satır 3 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🎯 Top 6 Ülke Performansı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                  <Radar name="Üretim (M ton)" dataKey="value" stroke={primaryColor} fill={primaryColor} fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}M ton`, 'Üretim']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📅 Yıllık Üretim Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <Tooltip formatter={(value: number) => [formatValue(value), 'Üretim']} />
                  <Area type="monotone" dataKey="value" stroke={primaryColor} fill={primaryColor} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ülke Sıralaması Tablosu */}
          <div className="data-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="data-table-title" style={{ margin: 0 }}>📋 Ülke Sıralaması</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => { setSortBy('value'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ 
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', 
                    background: sortBy === 'value' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: sortBy === 'value' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}
                >
                  Üretime Göre {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button 
                  onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ 
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', 
                    background: sortBy === 'name' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: sortBy === 'name' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}
                >
                  İsme Göre {sortBy === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
              </div>
            </div>
            {sortedCountryData.map((country, index) => (
              <div className="table-row" key={country.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{country.name}</div>
                  <div className="table-subtext">Pay: %{country.share}</div>
                </div>
                <div className="table-value green">{formatValue(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
