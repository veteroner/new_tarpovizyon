import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ComposedChart, Line,
  Treemap
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface LandDataItem {
  [key: string]: string | number;
  name: string;
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

const LAND_USE_ITEMS = [
  { id: 'Tarım arazisi', name: 'Agricultural land', nameTR: 'Tarım Arazisi' },
  { id: 'İşlenebilir arazi', name: 'Arable land', nameTR: 'İşlenebilir Arazi' },
  { id: 'Ekili alan', name: 'Cropland', nameTR: 'Ekili Alan' },
  { id: 'Çok yıllık ürün alanı', name: 'Permanent crops', nameTR: 'Çok Yıllık Ürün' },
  { id: 'Çayır-Mera', name: 'Meadows', nameTR: 'Çayır-Mera' },
  { id: 'Ormanlık alan', name: 'Forest land', nameTR: 'Ormanlık Alan' },
  { id: 'Nadas alanı', name: 'Fallow', nameTR: 'Nadas Alanı' },
  { id: 'Sulama altyapısına sahip kara alanı', name: 'Irrigation', nameTR: 'Sulama Altyapılı' },
  { id: 'Tarım', name: 'Agriculture', nameTR: 'Tarım' },
];

// Not: item_tr kullanıyor

function formatArea(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyar ha';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + ' Milyon ha';
  return value.toFixed(0) + ' Bin ha';
}

function formatAreaShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'B';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'M';
  return value.toFixed(0) + 'K';
}

export default function LandUsePage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([
    'Tarım arazisi',
    'Ormanlık alan',
    'Çayır-Mera'
  ]);
  const [selectedYear, setSelectedYear] = useState('2022');
  const [loading, setLoading] = useState(true);
  const [landData, setLandData] = useState<LandDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; value: number}[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (selectedItems.length === 0) {
      setLandData([]);
      setCountryData([]);
      setYearlyData([]);
      return;
    }
    
    setLoading(true);
    try {
      const itemList = selectedItems.map(p => `'${p}'`).join(',');
      
      const landQuery = `SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_land_use 
        WHERE year='${selectedYear}' AND item_tr IN (${itemList})
        GROUP BY item_tr ORDER BY toplam DESC`;
      
      const countryQuery = `SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_land_use 
        WHERE year='${selectedYear}' AND item_tr IN (${itemList})
        GROUP BY area ORDER BY toplam DESC LIMIT 20`;

      const yearlyQuery = `SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_land_use 
        WHERE item_tr IN (${itemList})
        GROUP BY year ORDER BY year`;

      const [landRes, countryRes, yearlyRes] = await Promise.all([
        fetchQuery(landQuery),
        fetchQuery(countryQuery),
        fetchQuery(yearlyQuery)
      ]);

      if (landRes.data) {
        const mapped = landRes.data.map((item, index: number) => {
          const itemTr = String(item['item_tr'] || item['item'] || '');
          return {
            name: itemTr,
            value: Number(item['toplam']) || 0,
            fill: COLORS[index % COLORS.length]
          } as LandDataItem;
        });
        setLandData(mapped);
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => ({
          name: translateCountry(String(item['area'] || '')),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        } as CountryDataItem));
        setCountryData(mapped);
      }

      if (yearlyRes.data) {
        const mapped = yearlyRes.data.map((item) => ({
          year: String(item['year'] || ''),
          value: Number(item['toplam']) || 0
        }));
        setYearlyData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedItems, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalValue = landData.reduce((sum, item) => sum + item.value, 0);
  const topCountry = countryData[0]?.name || '-';

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'value') {
      return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    }
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗺️ Arazi Kullanımı</h1>
        <p className="page-subtitle">Dünya arazi kullanım verileri - 1000 Hektar ({selectedYear})</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Arazi Türü
          </label>
          <ProductSelector
            products={LAND_USE_ITEMS}
            selectedProducts={selectedItems}
            onSelectionChange={setSelectedItems}
            placeholder="Arazi türü seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: 62 }, (_, i) => 2022 - i).map(year => (
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
              <div className="kpi-header"><span className="kpi-title">TOPLAM ALAN</span></div>
              <div className="kpi-value">{formatArea(totalValue)}</div>
              <div className="kpi-subtitle">{selectedItems.length} kategori seçili</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KATEGORİ</span><div className="kpi-icon green">🌿</div></div>
              <div className="kpi-value">{landData.length}</div>
              <div className="kpi-subtitle">Arazi türü</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ÜLKE SAYISI</span><div className="kpi-icon purple">🌍</div></div>
              <div className="kpi-value">{countryData.length}</div>
              <div className="kpi-subtitle">İlk 15 ülke</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER ÜLKE</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{fontSize: '1.1rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">En geniş alan</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Arazi Türü Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={landData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatAreaShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {landData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Arazi Payı Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={landData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name?.substring(0,15)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {landData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🗺️ Ülke Arazi Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap data={countryData.slice(0, 12)} dataKey="value" aspectRatio={4/3} stroke="var(--bg-card)"
                  content={({ x, y, width, height, name, value }: { x: number; y: number; width: number; height: number; name: string; value: number }) => (
                    <g>
                      <rect x={x} y={y} width={width} height={height} style={{ fill: COLORS[countryData.findIndex(c => c.name === name) % COLORS.length], stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                      {width > 50 && height > 30 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">{name?.substring(0, 10)}</text>
                          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={9}>{formatAreaShort(value)}</text>
                        </>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Ülke ve Pazar Payı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatAreaShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatArea(value) : `%${value}`, name === 'value' ? 'Alan' : 'Pay']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Alan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="share" name="Pay %" stroke="#3b82f6" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📅 Yıllık Arazi Değişimi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatAreaShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="data-table-title" style={{ margin: 0 }}>📋 Ülke Sıralaması</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setSortBy('value'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'value' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'value' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Alana Göre {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
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
                  <div className="table-subtext">Pay: %{country.share}</div>
                </div>
                <div className="table-value green">{formatArea(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
