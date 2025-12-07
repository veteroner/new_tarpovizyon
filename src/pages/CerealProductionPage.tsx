import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchQuery, formatNumber, formatMoney } from '../services/api';
import ProductSelector from '../components/ProductSelector';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

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

const CEREAL_PRODUCTS = [
  { id: 'Rice', name: 'Rice', nameTR: 'Pirinç' },
  { id: 'Wheat', name: 'Wheat', nameTR: 'Buğday' },
  { id: 'Maize (corn)', name: 'Maize (corn)', nameTR: 'Mısır' },
  { id: 'Barley', name: 'Barley', nameTR: 'Arpa' },
  { id: 'Oats', name: 'Oats', nameTR: 'Yulaf' },
  { id: 'Rye', name: 'Rye', nameTR: 'Çavdar' },
  { id: 'Sorghum', name: 'Sorghum', nameTR: 'Sorgum' },
  { id: 'Buckwheat', name: 'Buckwheat', nameTR: 'Karabuğday' },
  { id: 'Millet', name: 'Millet', nameTR: 'Darı' },
];

export default function CerealProductionPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Rice', 'Wheat', 'Maize (corn)']);
  const [unit, setUnit] = useState('1000 USD');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<ProductDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setProductData([]);
      setCountryData([]);
      return;
    }
    
    setLoading(true);
    try {
      const productList = selectedProducts.map(p => `'${p}'`).join(',');
      
      // Ürün bazlı veri
      const productQuery = `SELECT ürün, SUM(deger) as toplam FROM üretimindex 
        WHERE birim='${unit}' AND yil='2021' AND ürün IN (${productList})
        GROUP BY ürün ORDER BY toplam DESC`;
      
      // Ülke bazlı veri
      const countryQuery = `SELECT ülke, SUM(deger) as toplam FROM üretimindex 
        WHERE birim='${unit}' AND yil='2021' AND ürün IN (${productList})
        GROUP BY ülke ORDER BY toplam DESC LIMIT 20`;

      const [productRes, countryRes] = await Promise.all([
        fetchQuery(productQuery),
        fetchQuery(countryQuery)
      ]);

      if (productRes.data) {
        const mapped = productRes.data.map((item, index: number) => {
          const urun = String(item['ürün'] || '');
          const product = CEREAL_PRODUCTS.find(p => p.id === urun);
          return {
            name: product?.nameTR || urun,
            nameEN: urun,
            value: Number(item['toplam']) || 0,
            fill: COLORS[index % COLORS.length]
          } as ProductDataItem;
        });
        setProductData(mapped);
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => ({
          name: String(item['ülke'] || ''),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        } as CountryDataItem));
        setCountryData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, unit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalValue = productData.reduce((sum, item) => sum + item.value, 0);
  const topCountry = countryData[0]?.name || '-';
  const countryCount = countryData.length;

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'value') {
      return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    }
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  // Radar chart için top 6 ülke
  const radarData = countryData.slice(0, 6).map(item => ({
    country: item.name?.substring(0, 15) || 'Unknown',
    value: item.value / 1000000, // Milyon cinsinden
    fullMark: countryData[0]?.value / 1000000 || 100
  }));

  // Scatter chart için veri
  const scatterData = productData.map((item, index) => ({
    x: index + 1,
    y: item.value / 1000000,
    z: item.value / 1000000,
    name: item.name
  }));

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">🌾 Tahıl Üretimi</h1>
        <p className="page-subtitle">Dünya tahıl üretim değerleri ve istatistikleri (2021)</p>
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
            products={CEREAL_PRODUCTS}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder="Tahıl seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Birim
          </label>
          <select 
            className="filter-select" 
            value={unit} 
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="1000 USD">1000 USD</option>
            <option value="1000 SLC">1000 SLC</option>
            <option value="1000 Int$">1000 Int$</option>
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
                <span className="kpi-title">TOPLAM DEĞER</span>
              </div>
              <div className="kpi-value">{formatMoney(totalValue * 1000)}</div>
              <div className="kpi-subtitle">{selectedProducts.length} ürün seçili</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ÜRÜN SAYISI</span>
                <div className="kpi-icon green">📊</div>
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
              <div className="kpi-subtitle">Top ülkeler</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">LİDER ÜLKE</span>
                <div className="kpi-icon orange">🏆</div>
              </div>
              <div className="kpi-value" style={{fontSize: '1.2rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">En yüksek üretim</div>
            </div>
          </div>

          {/* Grafikler - Satır 1 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Ürün Karşılaştırması (Bar Chart)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(value: number) => [formatMoney(value * 1000), 'Değer']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {productData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Ürün Dağılımı (Pie Chart)</h3>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatMoney(value * 1000), 'Değer']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafikler - Satır 2 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🗺️ Ülke Değer Dağılımı (Treemap)</h3>
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
                          fill: COLORS[countryData.findIndex(c => c.name === name) % COLORS.length],
                          stroke: 'var(--bg-card)',
                          strokeWidth: 2,
                        }}
                      />
                      {width > 60 && height > 30 && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - 8}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={11}
                            fontWeight="bold"
                          >
                            {name?.substring(0, 12)}
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 10}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={10}
                          >
                            {formatNumber(value * 1000)}
                          </text>
                        </>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Değer ve Sıralama (Composed Chart)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatMoney(value * 1000) : `${value}%`, name === 'value' ? 'Değer' : 'Pay']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Değer" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="share" name="Pay %" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafikler - Satır 3 */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🎯 Top 6 Ülke Performansı (Radar Chart)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Radar name="Üretim Değeri (M)" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}M`, 'Değer']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🔵 Ürün Değer Dağılımı (Scatter Plot)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="Sıra" tick={{ fill: 'var(--text-secondary)' }} />
                  <YAxis type="number" dataKey="y" name="Değer (M)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(v) => `${v.toFixed(0)}M`} />
                  <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => [name === 'y' ? `${value.toFixed(1)}M` : value, name === 'y' ? 'Değer' : 'Sıra']}
                  />
                  <Scatter name="Ürünler" data={scatterData} fill="#f59e0b">
                    {scatterData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
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
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: sortBy === 'value' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: sortBy === 'value' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Değere Göre {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button 
                  onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: sortBy === 'name' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: sortBy === 'name' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
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
                <div className="table-value green">{formatMoney(country.value * 1000)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
