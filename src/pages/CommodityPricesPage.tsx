import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchCommodityPrices, fetchCommodityChart } from '../services/api';
import type { CommodityItem, ChartPoint } from '../services/api';
import { BackToHome } from '../components/BackToHome';

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
          Yahoo Finance canlı veriler
          {lastUpdate && <span className="ml-2 text-xs opacity-70">• Son güncelleme: {lastUpdate}</span>}
          {source && <span className="ml-2 text-xs opacity-70">• Kaynak: {source}</span>}
        </p>
      </div>

      {loading && !commodities.length ? (
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
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                      ${selectedCommodity.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ color: selectedCommodity.changePct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {selectedCommodity.changePct >= 0 ? '▲' : '▼'} {Math.abs(selectedCommodity.changePct).toFixed(2)}%
                    </div>
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
      )}
    </div>
  );
}
