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

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface DataItem {
  [key: string]: string | number;
  name: string;
  production: number;
  imports: number;
  exports: number;
  food: number;
  calories: number;
  fill: string;
}

interface CountryDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

const FOOD_ITEMS = [
  { id: '2511', name: 'Wheat', nameTR: 'Buğday' },
  { id: '2514', name: 'Maize', nameTR: 'Mısır' },
  { id: '2515', name: 'Rice', nameTR: 'Pirinç' },
  { id: '2513', name: 'Barley', nameTR: 'Arpa' },
  { id: '2536', name: 'Sugar cane', nameTR: 'Şeker Kamışı' },
  { id: '2537', name: 'Sugar beet', nameTR: 'Şeker Pancarı' },
  { id: '2731', name: 'Bovine Meat', nameTR: 'Sığır Eti' },
  { id: '2733', name: 'Pigmeat', nameTR: 'Domuz Eti' },
  { id: '2734', name: 'Poultry Meat', nameTR: 'Kümes Hayvanı' },
  { id: '2848', name: 'Milk', nameTR: 'Süt' },
  { id: '2744', name: 'Eggs', nameTR: 'Yumurta' },
  { id: '2532', name: 'Cassava', nameTR: 'Manyok' },
];

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar t';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon t';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin t';
  return value.toFixed(0) + ' t';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function FoodBalancePage() {
  const [selectedItems, setSelectedItems] = useState<string[]>(['2511', '2514', '2515']);
  const [selectedYear, setSelectedYear] = useState('2022');
  const [loading, setLoading] = useState(true);
  const [foodData, setFoodData] = useState<DataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; production: number; imports: number; exports: number}[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (selectedItems.length === 0) {
      setFoodData([]);
      setCountryData([]);
      setYearlyData([]);
      return;
    }
    
    setLoading(true);
    try {
      const itemList = selectedItems.join(',');
      
      // Ürün bazlı veri - urun kodları ile
      const foodQuery = `SELECT b.urun,
        SUM(CAST(b.uretim_v AS DECIMAL(20,2))) as uretim,
        SUM(CAST(b.imp_v AS DECIMAL(20,2))) as ithalat,
        SUM(CAST(b.exp_v AS DECIMAL(20,2))) as ihracat,
        SUM(CAST(b.gida_v AS DECIMAL(20,2))) as gida,
        AVG(CAST(b.kbgtcal_v AS DECIMAL(10,2))) as kalori
        FROM fao_balans b
        WHERE b.yil='${selectedYear}' AND b.urun IN (${itemList})
        GROUP BY b.urun ORDER BY uretim DESC`;
      
      // Ülke bazlı veri - fao_nufus ile JOIN yaparak ülke isimlerini al
      const countryQuery = `SELECT b.ulke, n.area, SUM(CAST(b.uretim_v AS DECIMAL(20,2))) as toplam 
        FROM fao_balans b
        LEFT JOIN (SELECT DISTINCT areacode, area FROM fao_nufus) n ON b.ulke = n.areacode
        WHERE b.yil='${selectedYear}' AND b.urun IN (${itemList})
        GROUP BY b.ulke, n.area ORDER BY toplam DESC LIMIT 20`;

      const yearlyQuery = `SELECT yil as year, 
        SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim,
        SUM(CAST(imp_v AS DECIMAL(20,2))) as ithalat,
        SUM(CAST(exp_v AS DECIMAL(20,2))) as ihracat
        FROM fao_balans 
        WHERE urun IN (${itemList})
        GROUP BY yil ORDER BY yil`;

      const [foodRes, countryRes, yearlyRes] = await Promise.all([
        fetchQuery(foodQuery),
        fetchQuery(countryQuery),
        fetchQuery(yearlyQuery)
      ]);

      if (foodRes.data) {
        const mapped = foodRes.data.map((item, index: number) => {
          const urunKod = String(item['urun'] || '');
          const product = FOOD_ITEMS.find(p => p.id === urunKod);
          return {
            name: product?.nameTR || String(item['item_name'] || urunKod),
            production: Number(item['uretim']) || 0,
            imports: Number(item['ithalat']) || 0,
            exports: Number(item['ihracat']) || 0,
            food: Number(item['gida']) || 0,
            calories: Number(item['kalori']) || 0,
            fill: COLORS[index % COLORS.length]
          } as DataItem;
        });
        setFoodData(mapped);
      }

      if (countryRes.data) {
        const total = countryRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = countryRes.data.map((item, index: number) => {
          const areaName = String(item['area'] || '');
          return {
            name: translateCountry(areaName) || `Ülke ${item['ulke']}`,
            value: Number(item['toplam']) || 0,
            share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
            fill: COLORS[index % COLORS.length]
          } as CountryDataItem;
        });
        setCountryData(mapped);
      }

      if (yearlyRes.data) {
        const mapped = yearlyRes.data.map((item) => ({
          year: String(item['year'] || ''),
          production: Number(item['uretim']) || 0,
          imports: Number(item['ithalat']) || 0,
          exports: Number(item['ihracat']) || 0
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

  const totalProd = foodData.reduce((sum, item) => sum + item.production, 0);
  const totalImport = foodData.reduce((sum, item) => sum + item.imports, 0);
  const totalExport = foodData.reduce((sum, item) => sum + item.exports, 0);
  const avgCalories = foodData.length > 0 ? foodData.reduce((sum, item) => sum + item.calories, 0) / foodData.length : 0;

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

  const tradeBalance = foodData.map(item => ({
    name: item.name?.substring(0, 15) || '',
    uretim: item.production / 1e6,
    ithalat: item.imports / 1e6,
    ihracat: item.exports / 1e6,
    denge: (item.production + item.imports - item.exports) / 1e6
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚖️ Gıda Dengesi</h1>
        <p className="page-subtitle">Dünya gıda üretim, ithalat, ihracat dengesi ({selectedYear})</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Gıda Türü</label>
          <ProductSelector
            products={FOOD_ITEMS}
            selectedProducts={selectedItems}
            onSelectionChange={setSelectedItems}
            placeholder="Gıda seçin..."
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
              <div className="kpi-header"><span className="kpi-title">TOPLAM ÜRETİM</span></div>
              <div className="kpi-value">{formatTon(totalProd)}</div>
              <div className="kpi-subtitle">{selectedItems.length} gıda türü</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İTHALAT</span><div className="kpi-icon blue">📥</div></div>
              <div className="kpi-value">{formatTon(totalImport)}</div>
              <div className="kpi-subtitle">Toplam ithalat</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İHRACAT</span><div className="kpi-icon green">📤</div></div>
              <div className="kpi-value">{formatTon(totalExport)}</div>
              <div className="kpi-subtitle">Toplam ihracat</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ORT. KALORİ</span><div className="kpi-icon orange">🔥</div></div>
              <div className="kpi-value">{avgCalories.toFixed(0)}</div>
              <div className="kpi-subtitle">kcal/kişi/gün</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Gıda Bazında Üretim</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={foodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatTon(value), 'Üretim']} />
                  <Bar dataKey="production" radius={[0, 4, 4, 0]}>
                    {foodData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Üretim Payı Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={foodData} cx="50%" cy="50%" outerRadius={100} dataKey="production" label={({ name, percent }) => `${name?.substring(0,10)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {foodData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatTon(value), 'Üretim']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📈 Üretim vs İthalat vs İhracat</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={tradeBalance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}M ton`, '']} />
                  <Legend />
                  <Bar dataKey="uretim" name="Üretim" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ithalat" name="İthalat" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ihracat" name="İhracat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="denge" name="Net Denge" stroke="#8b5cf6" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🎯 Top 6 Üretici Ülke</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                  <Radar name="Üretim (M ton)" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}M ton`, 'Üretim']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📅 Yıllık Gıda Dengesi Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatTon(value), '']} />
                  <Legend />
                  <Area type="monotone" dataKey="production" name="Üretim" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="imports" name="İthalat" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="exports" name="İhracat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">🔥 Kişi Başı Günlük Kalori (kcal/kişi/gün)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={foodData.filter(f => f.calories > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(0)} kcal`, 'Kalori']} />
                  <Bar dataKey="calories" name="Kalori" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="data-table-title" style={{ margin: 0 }}>📋 Ülke Üretim Sıralaması</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setSortBy('value'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: sortBy === 'value' ? 'var(--primary)' : 'var(--bg-primary)', color: sortBy === 'value' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Üretime Göre {sortBy === 'value' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
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
                <div className="table-value green">{formatTon(country.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
