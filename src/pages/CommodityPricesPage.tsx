import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchCommodityPrices, fetchCommodityChart, fetchGiewsSeries, fetchGiewsPricesBatch } from '../services/api';
import type { CommodityItem, ChartPoint, GiewsSerie, GiewsDatapoint, GiewsPriceResult } from '../services/api';
import { BackToHome } from '../components/BackToHome';
import { ChartInsightButton } from '../components/ChartInsightButton';

const CATEGORY_ICONS: Record<string, string> = {
  'Tahıllar': '🌾',
  'Yağlı Tohumlar': '🫘',
  'Endüstriyel': '🏭',
  'Tropikal': '☕',
  'Hayvancılık': '🐄',
  'Süt Ürünleri': '🥛',
  'Enerji': '⚡',
  'Orman Ürünleri': '🪵',
  'Gübre': '🧪',
  'Et & Gıda': '🥩',
  'Metaller': '🥇',
  'Döviz': '💱',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Tahıllar': 'from-amber-500 to-yellow-600',
  'Yağlı Tohumlar': 'from-green-500 to-emerald-600',
  'Endüstriyel': 'from-blue-500 to-indigo-600',
  'Tropikal': 'from-orange-500 to-red-500',
  'Hayvancılık': 'from-red-500 to-pink-600',
  'Süt Ürünleri': 'from-sky-400 to-blue-500',
  'Enerji': 'from-purple-500 to-violet-600',
  'Orman Ürünleri': 'from-stone-500 to-amber-700',
  'Gübre': 'from-lime-500 to-green-600',
  'Et & Gıda': 'from-red-600 to-orange-600',
  'Metaller': 'from-yellow-400 to-amber-500',
  'Döviz': 'from-teal-500 to-cyan-600',
};

const RANGE_OPTIONS = [
  { value: '1d', label: '1G' },
  { value: '5d', label: '5G' },
  { value: '1mo', label: '1A' },
  { value: '3mo', label: '3A' },
  { value: '6mo', label: '6A' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

const GIEWS_COUNTRIES = [
  { iso3: 'AFG', name: 'Afghanistan' },
  { iso3: 'DZA', name: 'Algeria' },
  { iso3: 'AGO', name: 'Angola' },
  { iso3: 'ARG', name: 'Argentina' },
  { iso3: 'ARM', name: 'Armenia' },
  { iso3: 'AUT', name: 'Austria' },
  { iso3: 'AZE', name: 'Azerbaijan' },
  { iso3: 'BGD', name: 'Bangladesh' },
  { iso3: 'BLR', name: 'Belarus' },
  { iso3: 'BEL', name: 'Belgium' },
  { iso3: 'BLZ', name: 'Belize' },
  { iso3: 'BEN', name: 'Benin' },
  { iso3: 'BTN', name: 'Bhutan' },
  { iso3: 'BOL', name: 'Bolivia' },
  { iso3: 'BWA', name: 'Botswana' },
  { iso3: 'BRA', name: 'Brazil' },
  { iso3: 'BGR', name: 'Bulgaria' },
  { iso3: 'BFA', name: 'Burkina Faso' },
  { iso3: 'BDI', name: 'Burundi' },
  { iso3: 'CPV', name: 'Cabo Verde' },
  { iso3: 'KHM', name: 'Cambodia' },
  { iso3: 'CMR', name: 'Cameroon' },
  { iso3: 'CAF', name: 'Central African Republic' },
  { iso3: 'TCD', name: 'Chad' },
  { iso3: 'CHL', name: 'Chile' },
  { iso3: 'CHN', name: 'China' },
  { iso3: 'COL', name: 'Colombia' },
  { iso3: 'CRI', name: 'Costa Rica' },
  { iso3: 'HRV', name: 'Croatia' },
  { iso3: 'CYP', name: 'Cyprus' },
  { iso3: 'CZE', name: 'Czech Republic' },
  { iso3: 'CIV', name: "Côte d'Ivoire" },
  { iso3: 'COD', name: 'DR Congo' },
  { iso3: 'DNK', name: 'Denmark' },
  { iso3: 'DJI', name: 'Djibouti' },
  { iso3: 'DOM', name: 'Dominican Republic' },
  { iso3: 'ECU', name: 'Ecuador' },
  { iso3: 'EGY', name: 'Egypt' },
  { iso3: 'SLV', name: 'El Salvador' },
  { iso3: 'EST', name: 'Estonia' },
  { iso3: 'SWZ', name: 'Eswatini' },
  { iso3: 'ETH', name: 'Ethiopia' },
  { iso3: 'FIN', name: 'Finland' },
  { iso3: 'FRA', name: 'France' },
  { iso3: 'GMB', name: 'Gambia' },
  { iso3: 'GEO', name: 'Georgia' },
  { iso3: 'DEU', name: 'Germany' },
  { iso3: 'GHA', name: 'Ghana' },
  { iso3: 'GRC', name: 'Greece' },
  { iso3: 'GTM', name: 'Guatemala' },
  { iso3: 'GIN', name: 'Guinea' },
  { iso3: 'GNB', name: 'Guinea-Bissau' },
  { iso3: 'HTI', name: 'Haiti' },
  { iso3: 'HND', name: 'Honduras' },
  { iso3: 'HUN', name: 'Hungary' },
  { iso3: 'IND', name: 'India' },
  { iso3: 'IDN', name: 'Indonesia' },
  { iso3: 'IRN', name: 'Iran' },
  { iso3: 'IRQ', name: 'Iraq' },
  { iso3: 'IRL', name: 'Ireland' },
  { iso3: 'ISR', name: 'Israel' },
  { iso3: 'ITA', name: 'Italy' },
  { iso3: 'JPN', name: 'Japan' },
  { iso3: 'JOR', name: 'Jordan' },
  { iso3: 'KAZ', name: 'Kazakhstan' },
  { iso3: 'KEN', name: 'Kenya' },
  { iso3: 'KGZ', name: 'Kyrgyzstan' },
  { iso3: 'LAO', name: 'Laos' },
  { iso3: 'LVA', name: 'Latvia' },
  { iso3: 'LBN', name: 'Lebanon' },
  { iso3: 'LSO', name: 'Lesotho' },
  { iso3: 'LBR', name: 'Liberia' },
  { iso3: 'LBY', name: 'Libya' },
  { iso3: 'LTU', name: 'Lithuania' },
  { iso3: 'LUX', name: 'Luxembourg' },
  { iso3: 'MDG', name: 'Madagascar' },
  { iso3: 'MWI', name: 'Malawi' },
  { iso3: 'MLI', name: 'Mali' },
  { iso3: 'MLT', name: 'Malta' },
  { iso3: 'MRT', name: 'Mauritania' },
  { iso3: 'MUS', name: 'Mauritius' },
  { iso3: 'MEX', name: 'Mexico' },
  { iso3: 'MNG', name: 'Mongolia' },
  { iso3: 'MOZ', name: 'Mozambique' },
  { iso3: 'MMR', name: 'Myanmar' },
  { iso3: 'NAM', name: 'Namibia' },
  { iso3: 'NPL', name: 'Nepal' },
  { iso3: 'NLD', name: 'Netherlands' },
  { iso3: 'NIC', name: 'Nicaragua' },
  { iso3: 'NER', name: 'Niger' },
  { iso3: 'NGA', name: 'Nigeria' },
  { iso3: 'PSE', name: 'Palestine' },
  { iso3: 'PAK', name: 'Pakistan' },
  { iso3: 'PAN', name: 'Panama' },
  { iso3: 'PRY', name: 'Paraguay' },
  { iso3: 'PER', name: 'Peru' },
  { iso3: 'PHL', name: 'Philippines' },
  { iso3: 'POL', name: 'Poland' },
  { iso3: 'PRT', name: 'Portugal' },
  { iso3: 'KOR', name: 'Republic of Korea' },
  { iso3: 'MDA', name: 'Moldova' },
  { iso3: 'ROU', name: 'Romania' },
  { iso3: 'RUS', name: 'Russia' },
  { iso3: 'RWA', name: 'Rwanda' },
  { iso3: 'SAU', name: 'Saudi Arabia' },
  { iso3: 'SEN', name: 'Senegal' },
  { iso3: 'SLE', name: 'Sierra Leone' },
  { iso3: 'SVK', name: 'Slovakia' },
  { iso3: 'SVN', name: 'Slovenia' },
  { iso3: 'SOM', name: 'Somalia' },
  { iso3: 'ZAF', name: 'South Africa' },
  { iso3: 'SSD', name: 'South Sudan' },
  { iso3: 'ESP', name: 'Spain' },
  { iso3: 'LKA', name: 'Sri Lanka' },
  { iso3: 'SDN', name: 'Sudan' },
  { iso3: 'SWE', name: 'Sweden' },
  { iso3: 'SYR', name: 'Syria' },
  { iso3: 'TJK', name: 'Tajikistan' },
  { iso3: 'THA', name: 'Thailand' },
  { iso3: 'TLS', name: 'Timor-Leste' },
  { iso3: 'TGO', name: 'Togo' },
  { iso3: 'TON', name: 'Tonga' },
  { iso3: 'TUN', name: 'Tunisia' },
  { iso3: 'TKM', name: 'Turkmenistan' },
  { iso3: 'TUR', name: 'Türkiye' },
  { iso3: 'UGA', name: 'Uganda' },
  { iso3: 'UKR', name: 'Ukraine' },
  { iso3: 'GBR', name: 'United Kingdom' },
  { iso3: 'TZA', name: 'Tanzania' },
  { iso3: 'USA', name: 'United States' },
  { iso3: 'URY', name: 'Uruguay' },
  { iso3: 'UZB', name: 'Uzbekistan' },
  { iso3: 'VNM', name: 'Viet Nam' },
  { iso3: 'YEM', name: 'Yemen' },
  { iso3: 'ZMB', name: 'Zambia' },
  { iso3: 'ZWE', name: 'Zimbabwe' },
].sort((a, b) => a.name.localeCompare(b.name));

const COMMODITY_EMOJI: Record<string, string> = {
  'Wheat': '🌾', 'Maize': '🌽', 'Rice': '🍚', 'Barley': '🌾', 'Sorghum': '🌾',
  'Millet': '🌾', 'Teff': '🌾', 'Cassava': '🥬', 'Potato': '🥔', 'Potatoes': '🥔',
  'Beans': '🫘', 'Lentils': '🫘', 'Chickpeas': '🫘', 'Cowpeas': '🫘', 'Soya': '🫘',
  'Groundnuts': '🥜', 'Sugar': '🍬', 'Milk': '🥛', 'Eggs': '🥚', 'Chicken': '🐔',
  'Beef': '🥩', 'Lamb': '🥩', 'Pork': '🥩', 'Goat': '🐐', 'Fish': '🐟',
  'Onions': '🧅', 'Tomatoes': '🍅', 'Potatoes': '🥔', 'Bananas': '🍌',
  'Oranges': '🍊', 'Apples': '🍎', 'Mangoes': '🥭', 'Palm Oil': '🌴',
  'Sunflower': '🌻', 'Vegetable': '🫙', 'Bread': '🍞', 'Flour': '🌾',
  'Oil': '🫙', 'Soybean': '🫘',
};

function getCommodityEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(COMMODITY_EMOJI)) {
    if (name.toLowerCase().startsWith(key.toLowerCase())) return emoji;
  }
  return '🌿';
}

export default function CommodityPricesPage() {
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [source, setSource] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityItem | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartRange, setChartRange] = useState('1mo');
  const [chartLoading, setChartLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'yahoo' | 'fao'>('yahoo');

  // FAO GIEWS state
  const [giewsCountry, setGiewsCountry] = useState('TUR');
  const [giewsSeries, setGiewsSeries] = useState<GiewsSerie[]>([]);
  const [giewsPriceMap, setGiewsPriceMap] = useState<Map<string, GiewsDatapoint[]>>(new Map());
  const [giewsLoading, setGiewsLoading] = useState(false);
  const [giewsError, setGiewsError] = useState('');
  const [giewsSelected, setGiewsSelected] = useState<{ serie: GiewsSerie; history: GiewsDatapoint[] } | null>(null);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCommodityPrices();
      if (res.success && res.commodities) {
        setCommodities(res.commodities);
        setLastUpdate(res.updated || '');
        setSource(res.source || '');
      } else {
        setError(res.error || 'Veriler alınamadı');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  const loadChart = useCallback(async (symbol: string, range: string) => {
    setChartLoading(true);
    try {
      const res = await fetchCommodityChart(symbol, range);
      if (res.success && res.data) {
        setChartData(res.data);
      }
    } catch { /* ignore */ }
    setChartLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCommodity) {
      loadChart(selectedCommodity.symbol, chartRange);
    }
  }, [selectedCommodity, chartRange, loadChart]);

  // FAO GIEWS loading
  useEffect(() => {
    if (activeTab !== 'fao') return;
    let cancelled = false;
    async function loadGiews() {
      setGiewsLoading(true);
      setGiewsError('');
      setGiewsSeries([]);
      setGiewsPriceMap(new Map());
      try {
        const series = await fetchGiewsSeries(giewsCountry);
        if (cancelled) return;
        if (!series.length) { setGiewsError('Bu ülke için veri bulunamadı'); setGiewsLoading(false); return; }
        setGiewsSeries(series);
        const uuids = series.map(s => s.uuid);
        const priceResults: GiewsPriceResult[] = await fetchGiewsPricesBatch(uuids);
        if (cancelled) return;
        const map = new Map<string, GiewsDatapoint[]>();
        for (const r of priceResults) {
          map.set(r.uuid, r.datapoints);
        }
        setGiewsPriceMap(map);
      } catch {
        if (!cancelled) setGiewsError('FAO GIEWS verisi alınamadı');
      } finally {
        if (!cancelled) setGiewsLoading(false);
      }
    }
    loadGiews();
    return () => { cancelled = true; };
  }, [activeTab, giewsCountry]);

  const categories = ['all', ...Array.from(new Set(commodities.map(c => c.category)))];
  const filtered = selectedCategory === 'all' 
    ? commodities 
    : commodities.filter(c => c.category === selectedCategory);

  // Grouped by category
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, CommodityItem[]>);

  // Summary KPIs
  const gainers = commodities.filter(c => c.changePct > 0).length;
  const losers = commodities.filter(c => c.changePct < 0).length;
  const avgChange = commodities.length > 0 
    ? commodities.reduce((s, c) => s + c.changePct, 0) / commodities.length 
    : 0;

  return (
    <div>
      <BackToHome />
      <div className="page-header">
        <h1 className="page-title">📊 Uluslararası Emtia Fiyatları</h1>
        <p className="page-subtitle">
          {activeTab === 'yahoo' ? 'Yahoo Finance canlı veriler' : 'FAO GIEWS ülke bazlı iç piyasa fiyatları'}
          {activeTab === 'yahoo' && lastUpdate && <span className="ml-2 text-xs opacity-70">• Son güncelleme: {lastUpdate}</span>}
          {activeTab === 'yahoo' && source && <span className="ml-2 text-xs opacity-70">• Kaynak: {source}</span>}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['yahoo', 'fao'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '0.75rem',
              border: activeTab === tab ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab ? 700 : 500,
              background: activeTab === tab ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#ffffff',
              color: activeTab === tab ? '#fff' : '#475569',
              boxShadow: activeTab === tab ? '0 2px 10px rgba(59,130,246,0.35)' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'yahoo' ? '📊 Yahoo Finance' : '🌍 FAO Ülke Fiyatları'}
          </button>
        ))}
      </div>

      {/* ===== Yahoo Finance Tab ===== */}
      {activeTab === 'yahoo' && (
        loading && !commodities.length ? (
          <div className="loading"><div className="loading-spinner"></div><p>Emtia fiyatları yükleniyor...</p></div>
        ) : error && !commodities.length ? (
        <div className="text-center py-12 text-red-400">
          <p className="text-lg">❌ {error}</p>
          <button onClick={loadPrices} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Tekrar Dene</button>
        </div>
      ) : (
        <>
          {/* KPI Summary */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TOPLAM EMTİA</span></div>
              <div className="kpi-value">{commodities.length}</div>
              <div className="kpi-subtitle">Takip edilen ürün</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YÜKSELENLER</span><span className="kpi-icon green">📈</span></div>
              <div className="kpi-value text-green-400">{gainers}</div>
              <div className="kpi-subtitle">Bugün artış gösteren</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">DÜŞENLER</span><span className="kpi-icon red">📉</span></div>
              <div className="kpi-value text-red-400">{losers}</div>
              <div className="kpi-subtitle">Bugün düşüş gösteren</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ORT. DEĞİŞİM</span></div>
              <div className={`kpi-value ${avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
              </div>
              <div className="kpi-subtitle">Günlük ortalama</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="date-filter" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.75rem',
                    border: selectedCategory === cat ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    background: selectedCategory === cat ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#ffffff',
                    color: selectedCategory === cat ? '#fff' : '#475569',
                    transition: 'all 0.2s',
                    boxShadow: selectedCategory === cat ? '0 2px 8px rgba(59,130,246,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {cat === 'all' ? '🌐 Tümü' : `${CATEGORY_ICONS[cat] || '📦'} ${cat}`}
                </button>
              ))}
            </div>
          </div>

          {/* Commodity Cards by Category */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {CATEGORY_ICONS[category] || '📦'} {category}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {items.map(c => (
                  <div
                    key={c.symbol}
                    onClick={() => { setSelectedCommodity(c); setChartRange('1mo'); }}
                    style={{
                      background: '#ffffff',
                      border: selectedCommodity?.symbol === c.symbol ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '1rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    }}
                    className="hover:shadow-md"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.symbol} • {c.unit}</div>
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${CATEGORY_COLORS[category] || 'from-gray-500 to-gray-600'} text-white`}>
                        {CATEGORY_ICONS[category] || '📦'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                        ${c.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                        color: c.changePct >= 0 ? '#22c55e' : '#ef4444',
                        fontWeight: 600, fontSize: '0.85rem',
                      }}>
                        <span>{c.changePct >= 0 ? '▲' : '▼'} {Math.abs(c.changePct).toFixed(2)}%</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                          {c.change >= 0 ? '+' : ''}{c.change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Chart Modal */}
          {selectedCommodity && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }} onClick={() => setSelectedCommodity(null)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem',
                  width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {selectedCommodity.name} ({selectedCommodity.symbol})
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      {selectedCommodity.category} • {selectedCommodity.unit}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                      ${selectedCommodity.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ color: selectedCommodity.changePct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {selectedCommodity.changePct >= 0 ? '▲' : '▼'} {Math.abs(selectedCommodity.changePct).toFixed(2)}%
                    </div>
                  </div>
                  <ChartInsightButton title={`${selectedCommodity.name} Fiyat Grafiği`} description="Emtia fiyat grafiği" data={chartData.map(p => ({ date: new Date(p.t * 1000).toLocaleDateString('tr-TR'), price: p.c }))} context={{ section: 'Emtia Fiyatları' }} compact />
                  </div>
                </div>

                {/* Range selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {RANGE_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setChartRange(r.value)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: chartRange === r.value ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                        color: chartRange === r.value ? '#fff' : '#cbd5e1',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ width: '100%', height: 300 }}>
                  {chartLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                      Grafik yükleniyor...
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.map(p => ({ date: new Date(p.t * 1000).toLocaleDateString('tr-TR'), price: p.c }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f1f5f9' }}
                          formatter={(v: number) => [`$${v.toFixed(2)}`, 'Fiyat']}
                        />
                        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                      Grafik verisi bulunamadı
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedCommodity(null)}
                  style={{
                    marginTop: '1rem', width: '100%', padding: '0.75rem',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.9rem',
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              onClick={loadPrices}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem', borderRadius: '1rem', border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
                fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontSize: '0.9rem',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '⏳ Güncelleniyor...' : '🔄 Fiyatları Güncelle'}
            </button>
          </div>
        </>
      )
      )}

      {/* ===== FAO GIEWS Ülke Fiyatları Tab ===== */}
      {activeTab === 'fao' && (() => {
        // Group series by commodity_name
        const grouped = giewsSeries.reduce((acc, s) => {
          if (!acc[s.commodity_name]) acc[s.commodity_name] = [];
          acc[s.commodity_name].push(s);
          return acc;
        }, {} as Record<string, GiewsSerie[]>);
        const sortedCommodities = Object.keys(grouped).sort();

        return (
          <div>
            {/* Country Selector */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.95rem' }}>🌍 Ülke Seç:</label>
              <select
                value={giewsCountry}
                onChange={e => setGiewsCountry(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  minWidth: '200px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                }}
              >
                {GIEWS_COUNTRIES.map(c => (
                  <option key={c.iso3} value={c.iso3}>{c.name} ({c.iso3})</option>
                ))}
              </select>
              {!giewsLoading && giewsSeries.length > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {giewsSeries.length} fiyat serisi • {sortedCommodities.length} ürün
                </span>
              )}
            </div>

            {/* Loading */}
            {giewsLoading && (
              <div className="loading"><div className="loading-spinner"></div><p>FAO GIEWS fiyatları yükleniyor...</p></div>
            )}

            {/* Error */}
            {giewsError && !giewsLoading && (
              <div className="text-center py-12 text-red-400">
                <p className="text-lg">❌ {giewsError}</p>
              </div>
            )}

            {/* Commodity Cards */}
            {!giewsLoading && !giewsError && sortedCommodities.map(commodityName => (
              <div key={commodityName} style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getCommodityEmoji(commodityName)} {commodityName}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {grouped[commodityName].map(serie => {
                    const datapoints = giewsPriceMap.get(serie.uuid) ?? [];
                    const latest = datapoints[0] ?? null;
                    const prev = datapoints[1] ?? null;
                    const pctChange = latest && prev && prev.price_value ? ((latest.price_value - prev.price_value) / prev.price_value) * 100 : null;
                    return (
                      <div
                        key={serie.uuid}
                        onClick={() => setGiewsSelected({ serie, history: datapoints })}
                        style={{
                          background: '#ffffff',
                          border: giewsSelected?.serie.uuid === serie.uuid ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '1rem',
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        }}
                        className="hover:shadow-md"
                      >
                        {/* Card header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {serie.market_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                              {serie.price_type} • {serie.source_name}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                            borderRadius: '0.5rem', background: serie.price_type === 'RETAIL' ? '#dbeafe' : '#fef3c7',
                            color: serie.price_type === 'RETAIL' ? '#1d4ed8' : '#92400e',
                            whiteSpace: 'nowrap', marginLeft: '0.5rem',
                          }}>
                            {serie.price_type}
                          </span>
                        </div>
                        {/* Price */}
                        {latest ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                                {latest.price_value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b', marginLeft: '0.3rem' }}>
                                  {serie.currency}/{serie.measure_unit_label}
                                </span>
                              </div>
                              {latest.price_value_dollar != null && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  ≈ ${latest.price_value_dollar.toFixed(2)} USD
                                </div>
                              )}
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                {new Date(latest.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                              </div>
                            </div>
                            {pctChange !== null && (
                              <div style={{
                                color: pctChange >= 0 ? '#22c55e' : '#ef4444',
                                fontWeight: 700, fontSize: '0.85rem', textAlign: 'right',
                              }}>
                                {pctChange >= 0 ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Fiyat verisi yok</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* FAO Chart Modal */}
            {giewsSelected && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
              }} onClick={() => setGiewsSelected(null)}>
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem',
                    width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {getCommodityEmoji(giewsSelected.serie.commodity_name)} {giewsSelected.serie.commodity_name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                      {giewsSelected.serie.market_name} • {giewsSelected.serie.price_type} • {giewsSelected.serie.source_name}
                    </p>
                    {giewsSelected.history[0] && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                            {giewsSelected.history[0].price_value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '0.4rem' }}>
                              {giewsSelected.serie.currency}/{giewsSelected.serie.measure_unit_label}
                            </span>
                          </div>
                          {giewsSelected.history[0].price_value_dollar != null && (
                            <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
                              ≈ ${giewsSelected.history[0].price_value_dollar.toFixed(2)} USD
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {giewsSelected.history.length > 1 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={[...giewsSelected.history].reverse().map(p => ({
                        date: new Date(p.date).toLocaleDateString('tr-TR', { year: '2-digit', month: 'short' }),
                        price: p.price_value,
                        usd: p.price_value_dollar,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f1f5f9' }}
                          formatter={(v: number, name: string) => [
                            name === 'usd' ? `$${v?.toFixed(2)}` : v?.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
                            name === 'usd' ? 'USD' : `${giewsSelected.serie.currency}/${giewsSelected.serie.measure_unit_label}`,
                          ]}
                        />
                        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} name="price" />
                        {giewsSelected.history[0]?.price_value_dollar != null && (
                          <Line type="monotone" dataKey="usd" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="usd" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Grafik için yeterli veri yok</div>
                  )}

                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                    Kaynak: FAO GIEWS — {giewsSelected.serie.source_name} • Mavi: yerel para, Sarı kesikli: USD
                  </div>

                  <button
                    onClick={() => setGiewsSelected(null)}
                    style={{
                      marginTop: '1rem', width: '100%', padding: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '0.75rem', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.9rem',
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
