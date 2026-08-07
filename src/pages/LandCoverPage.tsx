import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList } from 'recharts';
import { fetchAgg, latestYear, num } from '../services/d1';

const R = 'fao/land-cover';
// Kıta/toplam satırlarını dışla — ülke sıralamasına karışıyorlardı.
const EX = { preset: 'v1' as const, col: 'area' };
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { VALUE_HEADROOM, compactValue, truncTick } from '../utils/chartTicks';
import { BAR_COLOR } from '../utils/chartColors';
import { ChartCard } from '../components/ui/Card';
import { SplitAxisChart } from '../components/ui/SplitAxisChart';

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface DataItem {
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

const LAND_COVER_ITEMS = [
  { id: 'Ağaç örtülü alanlar', name: 'Tree Cover', nameTR: 'Ağaç Örtülü' },
  { id: 'Çayır', name: 'Grasslands', nameTR: 'Çayır' },
  { id: 'Karasal çorak arazi', name: 'Barren', nameTR: 'Çorak Arazi' },
  { id: 'Otsu bitkiler', name: 'Herbaceous', nameTR: 'Otsu Bitkiler' },
  { id: 'Çalılarla kaplı alanlar', name: 'Shrubs', nameTR: 'Çalılıklar' },
  { id: 'Yapay yüzeyler (kentsel ve ilgili alanlar dahil)', name: 'Urban', nameTR: 'Kentsel' },
  { id: 'Seyrek doğal bitki örtüsü alanları', name: 'Sparse Veg', nameTR: 'Seyrek Bitki' },
  { id: 'Mangrovlar', name: 'Mangroves', nameTR: 'Mangrovlar' },
  { id: 'Odunsu bitkiler', name: 'Woody', nameTR: 'Odunsu Bitkiler' },
];

function formatArea(value: number): string {
  // value is in 1000 ha
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyar ha';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + ' Milyon ha';
  return value.toFixed(0) + ' Bin ha';
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'B';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'M';
  return value.toFixed(0) + 'K';
}

export default function LandCoverPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>(['Ağaç örtülü alanlar', 'Çayır', 'Otsu bitkiler', 'Yapay yüzeyler (kentsel ve ilgili alanlar dahil)']);
  const [selectedYear, setSelectedYear] = useState('');
  const [maxYear, setMaxYear] = useState(2022);
  const [loading, setLoading] = useState(true);
  const [coverData, setCoverData] = useState<DataItem[]>([]);
  const [countryData, setCountryData] = useState<CountryDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<{year: string; value: number}[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Auto-detect latest available year from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Körlemesine MAX(year) değil, son DOLU yıl (kısmi yıllar eleniyor).
      const my = (await latestYear(R, 'year')) ?? 2022;
      if (!cancelled && my) {
        setMaxYear(my);
        setSelectedYear(String(my));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async () => {
    if (selectedItems.length === 0) {
      setCoverData([]);
      setCountryData([]);
      setYearlyData([]);
      return;
    }
    
    setLoading(true);
    try {
      const ORTAK = { whereIn: { item_tr: selectedItems } };
      const [coverRes, countryRes, yearlyRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: selectedYear }, ...ORTAK,
          orderBy: 'sum_value', dir: 'desc' })
          .then((rows) => ({ data: rows.map((r) => ({ item_tr: r.item_tr, toplam: num(r.sum_value) })) })),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: selectedYear }, ...ORTAK,
          exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 20 })
          .then((rows) => ({ data: rows.map((r) => ({ area: r.area, toplam: num(r.sum_value) })) })),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], ...ORTAK, exclude: EX,
          orderBy: 'year', dir: 'asc' })
          .then((rows) => ({ data: rows.map((r) => ({ year: r.year, toplam: num(r.sum_value) })) })),
      ]);

      if (coverRes.data) {
        const mapped = coverRes.data.map((item, index: number) => ({
          name: String(item['item_tr'] || ''),
          value: Number(item['toplam']) || 0,
          fill: COLORS[index % COLORS.length]
        } as DataItem));
        setCoverData(mapped);
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

  const totalValue = coverData.reduce((sum, item) => sum + item.value, 0);
  const topCountry = countryData[0]?.name || '-';

  const sortedCountryData = [...countryData].sort((a, b) => {
    if (sortBy === 'value') {
      return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    }
    return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  const radarData = countryData.slice(0, 6).map(item => ({
    country: item.name?.substring(0, 12) || 'Unknown',
    value: item.value / 1e3,
    fullMark: countryData[0]?.value / 1e3 || 100
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌿 Arazi Örtüsü</h1>
        <p className="page-subtitle">Dünya arazi örtüsü dağılımı - 1000 ha ({selectedYear})</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Arazi Örtüsü Türü</label>
          <ProductSelector
            products={LAND_COVER_ITEMS}
            selectedProducts={selectedItems}
            onSelectionChange={setSelectedItems}
            placeholder="Örtü türü seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: maxYear - 1991 }, (_, i) => maxYear - i).map(year => (
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
              <div className="kpi-header"><span className="kpi-title">TOPLAM ALAN</span></div>
              <div className="kpi-value">{formatArea(totalValue)}</div>
              <div className="kpi-subtitle">{selectedItems.length} örtü türü</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ÖRTÜ TÜRÜ</span><div className="kpi-icon green">🌲</div></div>
              <div className="kpi-value">{coverData.length}</div>
              <div className="kpi-subtitle">Seçili tür</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ÜLKE SAYISI</span><div className="kpi-icon purple">🌍</div></div>
              <div className="kpi-value">{countryData.length}</div>
              <div className="kpi-subtitle">İlk 15 ülke</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">EN BÜYÜK</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{fontSize: '1.1rem'}}>{topCountry}</div>
              <div className="kpi-subtitle">En geniş alan</div>
            </div>
          </div>

          <div className="chart-grid">
            <ChartCard title="📊 Arazi Örtüsü Dağılımı" action={<ChartInsightButton title="Arazi Örtüsü Dağılımı" description="Arazi örtüsü tiplerine göre dağılım" data={coverData} context={{ section: 'Arazi Örtüsü' }} compact />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coverData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={110} tickFormatter={truncTick} interval={0} />
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {coverData.map((_, index) => (<Cell key={`cell-${index}`} fill={BAR_COLOR} />))}
                  
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="🥧 Örtü Payı Dağılımı" action={<ChartInsightButton title="Örtü Payı Dağılımı" description="Arazi örtüsü pay dağılımı" data={coverData} context={{ section: 'Arazi Örtüsü' }} compact />}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={coverData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name?.substring(0,10)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {coverData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="chart-grid">
            <ChartCard title="🎯 Top 6 Ülke Alan Karşılaştırması" action={<ChartInsightButton title="Top 6 Ülke Alan Karşılaştırması" description="Top 6 ülke arazi alanı karşılaştırması" data={radarData} context={{ section: 'Arazi Örtüsü' }} compact />}>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                  <Radar name="Alan (M ha)" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}M ha`, 'Alan']} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="📈 Ülke ve Alan Payı" action={<ChartInsightButton title="Ülke ve Alan Payı" description="Ülke ve arazi alanı payı" data={countryData.slice(0,10)} context={{ section: 'Arazi Örtüsü' }} compact />}>
              {/* Sağ eksendeki seri soldakilerden TÜRETİLMİŞ; iki ölçeğin keyfi
              hizası sahte bir kesişme üretiyordu. Ortak x eksenli şeride
              taşındı — bkz. components/ui/SplitAxisChart. */}
          <SplitAxisChart
            data={countryData.slice(0, 10) as unknown as Record<string, unknown>[]}
            xKey="name"
            height={270}
            stripKey="share"
            stripLabel="Pay"
            stripFormat={(v: number) => `%${Number(v).toFixed(1)}`}
          >
            <Legend />
            <Bar dataKey="value" name="Alan" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </SplitAxisChart>
            </ChartCard>
          </div>

          <div className="chart-grid">
            <ChartCard title="📅 Yıllık Arazi Örtüsü Trendi" span={2} action={<ChartInsightButton title="Yıllık Arazi Örtüsü Trendi" description="Yıllık arazi örtüsü değişim trendi" data={yearlyData} context={{ section: 'Arazi Örtüsü' }} compact />}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                  <Tooltip formatter={(value: number) => [formatArea(value), 'Alan']} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
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
