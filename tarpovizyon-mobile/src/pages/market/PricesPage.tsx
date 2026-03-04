import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Emtia Fiyatları Sayfası
 * 
 * Yahoo Finance canlı uluslararası tarım emtia fiyatları.
 */

const API_BASE = 'https://dersbende.com';
const API_KEY = 'dashboard_secret_key_2024';

type Category = 'all' | 'Tahıllar' | 'Yağlı Tohumlar' | 'Tropikal' | 'Endüstriyel' | 'Hayvancılık' | 'Süt Ürünleri' | 'Enerji';

interface CommodityItem {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  exchange: string;
  time: number;
}

const categories: { key: Category; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'Tahıllar', label: 'Tahıllar' },
  { key: 'Yağlı Tohumlar', label: 'Yağlı Toh.' },
  { key: 'Tropikal', label: 'Tropikal' },
  { key: 'Hayvancılık', label: 'Hayvancılık' },
  { key: 'Enerji', label: 'Enerji' },
];

export default function PricesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api.php?action=commodity_prices&api_key=${API_KEY}`, { timeout: 20000 });
      if (res.data?.success && res.data.commodities) {
        setCommodities(res.data.commodities);
        setLastUpdate(res.data.updated || '');
      } else {
        setError('Fiyat verisi alınamadı');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const filtered =
    activeCategory === 'all'
      ? commodities
      : commodities.filter((c) => c.category === activeCategory);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Emtia Fiyatları</h1>
              <p className="text-[10px] text-gray-500">
                Yahoo Finance Canlı
                {lastUpdate && <span> • {lastUpdate}</span>}
              </p>
            </div>
          </div>
          <button onClick={fetchPrices} className="p-2 rounded-lg bg-dark-800 tap-active" disabled={loading}>
            {loading ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <RefreshCw size={16} className="text-gray-400" />}
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${activeCategory === cat.key
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800 text-gray-500 border border-white/5'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Fiyat Listesi */}
      <section className="px-5 mt-4 mb-8">
        {loading && commodities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="animate-spin text-primary-400" />
            <p className="text-xs text-gray-500">Canlı fiyatlar yükleniyor...</p>
          </div>
        ) : error && commodities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-400 mb-3">❌ {error}</p>
            <button onClick={fetchPrices} className="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-medium">
              Tekrar Dene
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((commodity) => (
              <div
                key={commodity.symbol}
                className="rounded-xl bg-dark-800/50 border border-white/5 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      commodity.changePct >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {commodity.changePct >= 0
                        ? <TrendingUp size={16} className="text-green-400" />
                        : <TrendingDown size={16} className="text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{commodity.name}</p>
                      <p className="text-[10px] text-gray-500">{commodity.symbol} • {commodity.category}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      {commodity.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-[9px] text-gray-500 ml-1">{commodity.unit}</span>
                    </p>
                    <div className={`flex items-center justify-end gap-0.5 ${
                      commodity.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {commodity.changePct >= 0
                        ? <ArrowUpRight size={10} />
                        : <ArrowDownRight size={10} />
                      }
                      <span className="text-[10px] font-medium">
                        {commodity.change >= 0 ? '+' : ''}{commodity.change.toFixed(2)} ({commodity.changePct >= 0 ? '+' : ''}{commodity.changePct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
