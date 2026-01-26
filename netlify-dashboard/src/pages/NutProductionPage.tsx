import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchQuery, formatNumber } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';

const COLORS = ['#A0522D', '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3', '#D2B48C', '#BC8F8F', '#F4A460', '#DAA520'];

// FAO ürün kodları ile sert kabuklu meyveler
const NUT_PRODUCTS = [
  { id: '234', name: 'Almonds, in shell', nameTR: 'Badem' },
  { id: '226', name: 'Cashew nuts, in shell', nameTR: 'Kaju' },
  { id: '225', name: 'Hazelnuts, in shell', nameTR: 'Fındık' },
  { id: '232', name: 'Pistachios, in shell', nameTR: 'Antep Fıstığı' },
  { id: '222', name: 'Walnuts, in shell', nameTR: 'Ceviz' },
  { id: '229', name: 'Chestnuts, in shell', nameTR: 'Kestane' },
  { id: '220', name: 'Brazil nuts, in shell', nameTR: 'Brezilya Cevizi' },
  { id: '224', name: 'Macadamia nuts', nameTR: 'Makademya' },
];

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar t';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon t';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin t';
  return value.toFixed(0) + ' t';
}

interface ProductData {
  name: string;
  nameEN: string;
  value: number;
  fill: string;
  [key: string]: string | number;
}

interface CountryData {
  name: string;
  value: number;
  share: string;
  fill: string;
  [key: string]: string | number;
}

export default function NutProductionPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['234', '225', '232']);
  const [selectedYear, setSelectedYear] = useState('2022');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
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
      const productList = selectedProducts.join(',');
      
      const productQuery = `SELECT u.urunkod, SUM(CAST(u.uretim_deger AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_son u
        WHERE u.yilkod='${selectedYear}' AND u.urunkod IN (${productList}) AND u.ulkekod='5000'
        GROUP BY u.urunkod ORDER BY toplam DESC`;
      
      const countryQuery = `SELECT u.ulkekod, n.area, SUM(CAST(u.uretim_deger AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_son u
        LEFT JOIN (SELECT DISTINCT areacode, area FROM fao_nufus) n ON u.ulkekod = n.areacode
        WHERE u.yilkod='${selectedYear}' AND u.urunkod IN (${productList}) 
        AND u.ulkekod NOT IN ('5000', '5100', '5200', '5300', '5400', '5500')
        GROUP BY u.ulkekod, n.area ORDER BY toplam DESC LIMIT 20`;

      const [productRes, countryRes] = await Promise.all([
        fetchQuery(productQuery),
        fetchQuery(countryQuery)
      ]);

      if (productRes.data) {
        const mapped = productRes.data.map((item, index: number) => {
          const urunKod = String(item['urunkod'] || '');
          const product = NUT_PRODUCTS.find(p => p.id === urunKod);
          return {
            name: product?.nameTR || urunKod,
            nameEN: product?.name || urunKod,
            value: Number(item['toplam']) || 0,
            fill: COLORS[index % COLORS.length]
          };
        });
        setProductData(mapped);
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => ({
          name: translateCountry(String(item['area'] || '')),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        }));
        setCountryData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear]);

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

  const radarData = countryData.slice(0, 6).map(item => ({
    country: item.name?.substring(0, 15) || 'Unknown',
    value: item.value / 1000000,
    fullMark: countryData[0]?.value / 1000000 || 100
  }));

  const scatterData = productData.map((item, index) => ({
    x: index + 1,
    y: item.value / 1000000,
    z: item.value / 1000000,
    name: item.name
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥜 Sert Kabuklu Meyve Üretimi</h1>
        <p className="page-subtitle">Dünya sert kabuklu meyve üretim miktarları - FAO {selectedYear} (Ton)</p>
      </div>

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
            products={NUT_PRODUCTS}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder="Sert kabuklu seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Yıl
          </label>
          <select 
            className="filter-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {Array.from({ length: 63 }, (_, i) => 2022 - i).map(year => (
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
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">TOPLAM ÜRETİM</span>
              </div>
              <div className="kpi-value">{formatTon(totalValue)}</div>
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
              <div className="kpi-subtitle">İlk 20 ülke</div>
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

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Ürün Karşılaştırması</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value: number) => [formatTon(value), 'Üretim']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {productData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Ürün Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={productData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {productData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatTon(value), 'Üretim']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🗺️ Ülke Dağılımı (Treemap)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={countryData.slice(0, 12)}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="var(--bg-card)"
                  content={({ x, y, width, height, name, value }: { x: number; y: number; width: number; height: number; name: string; value: number }) => (
                    <g>
                      <rect x={x} y={y} width={width} height={height} style={{ fill: COLORS[countryData.findIndex(c => c.name === name) % COLORS.length], stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                      {width > 60 && height > 30 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold">{name?.substring(0, 12)}</text>
                          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={10}>{formatNumber(value)}</text>
                        </>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Değer ve Pay</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatTon(value) : `${value}%`, name === 'value' ? 'Üretim' : 'Pay']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Üretim" fill="#A0522D" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="share" name="Pay %" stroke="#D2691E" strokeWidth={2} dot={{ fill: '#D2691E' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🎯 Top 6 Ülke (Radar)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Radar name="Üretim (M ton)" dataKey="value" stroke="#A0522D" fill="#A0522D" fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}M ton`, 'Üretim']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🔵 Ürün Scatter</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="Sıra" tick={{ fill: 'var(--text-secondary)' }} />
                  <YAxis type="number" dataKey="y" name="Üretim (M)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(v) => `${v.toFixed(0)}M`} />
                  <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number, name: string) => [name === 'y' ? `${value.toFixed(1)}M ton` : value, name === 'y' ? 'Üretim' : 'Sıra']} />
                  <Scatter name="Ürünler" data={scatterData} fill="#A0522D">
                    {scatterData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="data-table-title" style={{ margin: 0 }}>📋 Ülke Sıralaması</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setSortBy('value'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'value' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'value' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Üretim {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
                <button onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'name' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'name' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  İsim {sortBy === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </button>
              </div>
            </div>
            {sortedCountryData.map((country, index) => (
              <div className="table-row" key={country.name}>
                <div className={`table-rank ${index < 3 ? 'orange' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{country.name}</div>
                  <div className="table-subtext">Pay: %{country.share}</div>
                </div>
                <div className="table-value orange">{formatTon(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
