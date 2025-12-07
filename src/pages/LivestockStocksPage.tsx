import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ComposedChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface AnimalDataItem {
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

const ANIMAL_ITEMS = [
  { id: 'Sığır', name: 'Cattle', nameTR: 'Sığır' },
  { id: 'Koyun', name: 'Sheep', nameTR: 'Koyun' },
  { id: 'Keçi', name: 'Goat', nameTR: 'Keçi' },
  { id: 'Domuz', name: 'Pig', nameTR: 'Domuz' },
  { id: 'Tavuk', name: 'Chicken', nameTR: 'Tavuk' },
  { id: 'Manda', name: 'Buffalo', nameTR: 'Manda' },
  { id: 'At', name: 'Horse', nameTR: 'At' },
  { id: 'Deve', name: 'Camel', nameTR: 'Deve' },
  { id: 'Eşek', name: 'Donkey', nameTR: 'Eşek' },
  { id: 'Hindi', name: 'Turkey', nameTR: 'Hindi' },
  { id: 'Ördek', name: 'Duck', nameTR: 'Ördek' },
  { id: 'Kaz', name: 'Goose', nameTR: 'Kaz' },
  { id: 'Arı', name: 'Bee', nameTR: 'Arı Kovanı' },
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

export default function LivestockStocksPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>(['Sığır', 'Koyun', 'Keçi', 'Tavuk']);
  const [selectedYear, setSelectedYear] = useState('2022');
  const [loading, setLoading] = useState(true);
  const [animalData, setAnimalData] = useState<AnimalDataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; value: number}[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (selectedItems.length === 0) {
      setAnimalData([]);
      setCountryData([]);
      setYearlyData([]);
      return;
    }
    
    setLoading(true);
    try {
      const itemList = selectedItems.map(p => `'${p}'`).join(',');
      
      const animalQuery = `SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_canlihayvan 
        WHERE year='${selectedYear}' AND element_tr='Stoklar' AND item_tr IN (${itemList})
        GROUP BY item_tr ORDER BY toplam DESC`;
      
      const countryQuery = `SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_canlihayvan 
        WHERE year='${selectedYear}' AND element_tr='Stoklar' AND item_tr IN (${itemList})
        GROUP BY area ORDER BY toplam DESC LIMIT 20`;

      const yearlyQuery = `SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as toplam 
        FROM fao_uretim_canlihayvan 
        WHERE element_tr='Stoklar' AND item_tr IN (${itemList})
        GROUP BY year ORDER BY year DESC LIMIT 20`;

      const [animalRes, countryRes, yearlyRes] = await Promise.all([
        fetchQuery(animalQuery),
        fetchQuery(countryQuery),
        fetchQuery(yearlyQuery)
      ]);

      if (animalRes.data) {
        const mapped = animalRes.data.map((item, index: number) => ({
          name: String(item['item_tr'] || ''),
          value: Number(item['toplam']) || 0,
          fill: COLORS[index % COLORS.length]
        } as AnimalDataItem));
        setAnimalData(mapped);
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
        })).reverse();
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

  const totalValue = animalData.reduce((sum, item) => sum + item.value, 0);
  const topCountry = countryData[0]?.name || '-';

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'value') {
      return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    }
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  const radarData = countryData.slice(0, 6).map(item => ({
    country: item.name?.substring(0, 12) || 'Unknown',
    value: item.value / 1e6,
    fullMark: countryData[0]?.value / 1e6 || 100
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🐄 Canlı Hayvan Stokları</h1>
        <p className="page-subtitle">Dünya hayvan varlığı verileri - Baş/Adet ({selectedYear})</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Hayvan Türü</label>
          <ProductSelector
            products={ANIMAL_ITEMS}
            selectedProducts={selectedItems}
            onSelectionChange={setSelectedItems}
            placeholder="Hayvan seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
            <option value="2018">2018</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">TOPLAM VARLIK</span></div>
              <div className="kpi-value">{formatNumber(totalValue)}</div>
              <div className="kpi-subtitle">{selectedItems.length} hayvan türü</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TÜR SAYISI</span><div className="kpi-icon green">🐑</div></div>
              <div className="kpi-value">{animalData.length}</div>
              <div className="kpi-subtitle">Seçili tür</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ÜLKE SAYISI</span><div className="kpi-icon purple">🌍</div></div>
              <div className="kpi-value">{countryData.length}</div>
              <div className="kpi-subtitle">Top ülkeler</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER ÜLKE</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{fontSize: '1.1rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">En yüksek stok</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Hayvan Türü Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={animalData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {animalData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Hayvan Payı Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={animalData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {animalData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🎯 Top 6 Ülke Performansı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                  <Radar name="Stok (M)" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}M`, 'Stok']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Ülke ve Pazar Payı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={countryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatNumber(value) : `%${value}`, name === 'value' ? 'Stok' : 'Pay']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Stok" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="share" name="Pay %" stroke="#22c55e" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📅 Yıllık Stok Değişimi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']} />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
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
                  Stoğa Göre {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
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
                <div className="table-value green">{formatNumber(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
