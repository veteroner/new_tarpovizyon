import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, MapPin, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchQuery, formatNumber, BITKISEL_TABLE } from '../../services/api';

/**
 * Provincial Data Page
 * 
 * İl bazlı bitkisel / hayvansal veri sayfası.
 * URL params: /data/provincial/:category
 */

interface CategoryConfig {
  title: string;
  emoji: string;
  description: string;
  query: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  crops: {
    title: 'İl Bazlı Bitkisel Üretim',
    emoji: '🌾',
    description: 'İl bazlı bitkisel üretim verileri — TÜİK',
    query: `SELECT ili, urun, y2024, y2023 FROM ${BITKISEL_TABLE} WHERE duzey='il' AND unsur='Üretim' AND (y2024>0 OR y2023>0) ORDER BY y2024 DESC LIMIT 100`,
  },
  livestock: {
    title: 'İl Bazlı Hayvancılık',
    emoji: '🐄',
    description: 'İl bazlı hayvan varlığı — TÜİK',
    query: `SELECT ili, urun, y2024, y2023 FROM tuik_hayvansal_uretim WHERE duzey='il' AND (unsur='Hayvan Sayısı' OR unsur='Varlık') AND (y2024>0 OR y2023>0) ORDER BY y2024 DESC LIMIT 100`,
  },
  basin: {
    title: 'Havza Bazlı Üretim',
    emoji: '💧',
    description: 'Havza bazlı tarımsal üretim verileri',
    query: `SELECT ili as havza, urun, y2024, y2023 FROM ${BITKISEL_TABLE} WHERE duzey='il' AND unsur='Üretim' AND y2024>0 ORDER BY y2024 DESC LIMIT 80`,
  },
  'geo-indication': {
    title: 'Coğrafi İşaretli Ürünler',
    emoji: '🏷️',
    description: 'Türkiye coğrafi işaretli tarım ürünleri',
    query: `SELECT ili, urun, y2024, y2023 FROM ${BITKISEL_TABLE} WHERE duzey='il' AND unsur='Üretim' AND y2024>0 ORDER BY ili, y2024 DESC LIMIT 100`,
  },
};

interface DataRow {
  ili: string;
  urun: string;
  y2024: number;
  y2023: number;
}

export default function ProvincialDataPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const config = category ? CATEGORIES[category] : null;

  const loadData = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchQuery(config.query);
      if (result.error) {
        setError(result.error);
      } else {
        const rows = (result.data || []).map((row: Record<string, unknown>) => ({
          ili: String(row.ili || row.havza || ''),
          urun: String(row.urun || ''),
          y2024: Number(row.y2024 || 0),
          y2023: Number(row.y2023 || 0),
        })).filter((r: DataRow) => r.ili && r.urun);
        setData(rows);
      }
    } catch {
      setError('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;
    loadData();
  }, [config, loadData]);

  // Group by province
  const grouped = useMemo(() => {
    const map = new Map<string, DataRow[]>();
    data.forEach((row) => {
      if (!searchTerm || row.ili.toLowerCase().includes(searchTerm.toLowerCase()) || row.urun.toLowerCase().includes(searchTerm.toLowerCase())) {
        const existing = map.get(row.ili) || [];
        existing.push(row);
        map.set(row.ili, existing);
      }
    });
    return Array.from(map.entries()).sort((a, b) => {
      const sumA = a[1].reduce((s, r) => s + r.y2024, 0);
      const sumB = b[1].reduce((s, r) => s + r.y2024, 0);
      return sumB - sumA;
    });
  }, [data, searchTerm]);

  if (!config) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">❌</span>
          <p className="text-sm text-gray-300 mt-3">Kategori bulunamadı</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active">← Geri Dön</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-safe pb-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl tap-active">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{config.emoji} {config.title}</h1>
          <p className="text-[10px] text-gray-500">{config.description}</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl tap-active">
          <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="İl veya ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-dark-800 border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">İl verileri yükleniyor...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-gray-300 mt-3">{error}</p>
            <button onClick={loadData} className="mt-3 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active">Tekrar Dene</button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">İl Sayısı</p>
                  <p className="text-lg font-bold text-primary-400">{grouped.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Toplam Kayıt</p>
                  <p className="text-lg font-bold text-emerald-400">{data.length}</p>
                </div>
              </div>
            </div>

            {/* Province Groups */}
            {grouped.map(([province, rows]) => (
              <div key={province} className="glass-card rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-primary-400" />
                  <h3 className="text-sm font-bold text-white">{province}</h3>
                  <span className="text-[10px] text-gray-500 ml-auto">{rows.length} ürün</span>
                </div>

                <div className="space-y-2">
                  {rows.slice(0, 5).map((row, idx) => {
                    const change = row.y2023 > 0 ? ((row.y2024 - row.y2023) / row.y2023) * 100 : null;
                    return (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-300">{row.urun}</p>
                          <p className="text-[10px] text-gray-500">{formatNumber(row.y2024)}</p>
                        </div>
                        {change !== null && (
                          <div className="flex items-center gap-1">
                            {change > 0 ? <TrendingUp size={10} className="text-green-400" /> : change < 0 ? <TrendingDown size={10} className="text-red-400" /> : <Minus size={10} className="text-gray-400" />}
                            <span className={`text-[10px] font-semibold ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {change > 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {rows.length > 5 && (
                    <p className="text-[10px] text-gray-600 text-center pt-1">+ {rows.length - 5} ürün daha</p>
                  )}
                </div>
              </div>
            ))}

            {grouped.length === 0 && (
              <div className="text-center py-10">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-gray-400 mt-3">Bu kategori için il verisi bulunamadı</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
