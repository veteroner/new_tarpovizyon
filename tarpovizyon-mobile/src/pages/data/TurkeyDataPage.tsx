import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchQuery, formatNumber, BITKISEL_TABLE } from '../../services/api';

/**
 * Turkey Data Category Page
 * 
 * TÜİK Bitkisel ve Hayvansal verilerini kategori bazlı gösteren sayfa.
 * URL params: /data/turkey/:category
 */

interface CategoryConfig {
  title: string;
  emoji: string;
  description: string;
  type: 'bitkisel' | 'hayvansal' | 'special';
  query: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  cereals: {
    title: 'Tahıllar (TÜİK)',
    emoji: '🌾',
    description: 'Türkiye tahıl üretimi — İl bazlı TÜİK verileri',
    type: 'bitkisel',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM ${BITKISEL_TABLE} WHERE duzey='Türkiye' AND unsur='Üretim' AND (urun LIKE '%buğday%' OR urun LIKE '%arpa%' OR urun LIKE '%mısır%' OR urun LIKE '%çavdar%' OR urun LIKE '%yulaf%' OR urun LIKE '%pirinç%' OR urun LIKE '%triticale%' OR urun LIKE '%darı%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  vegetables: {
    title: 'Sebzeler (TÜİK)',
    emoji: '🥬',
    description: 'Türkiye sebze üretimi — İl bazlı TÜİK verileri',
    type: 'bitkisel',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM ${BITKISEL_TABLE} WHERE duzey='Türkiye' AND unsur='Üretim' AND (urun LIKE '%domates%' OR urun LIKE '%biber%' OR urun LIKE '%patates%' OR urun LIKE '%soğan%' OR urun LIKE '%salatalık%' OR urun LIKE '%patlıcan%' OR urun LIKE '%havuç%' OR urun LIKE '%kabak%' OR urun LIKE '%lahana%' OR urun LIKE '%fasulye (taze)%' OR urun LIKE '%ıspanak%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  fruits: {
    title: 'Meyveler (TÜİK)',
    emoji: '🍎',
    description: 'Türkiye meyve üretimi — İl bazlı TÜİK verileri',
    type: 'bitkisel',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM ${BITKISEL_TABLE} WHERE duzey='Türkiye' AND unsur='Üretim' AND (urun LIKE '%elma%' OR urun LIKE '%üzüm%' OR urun LIKE '%portakal%' OR urun LIKE '%kiraz%' OR urun LIKE '%şeftali%' OR urun LIKE '%kayısı%' OR urun LIKE '%incir%' OR urun LIKE '%zeytin%' OR urun LIKE '%fındık%' OR urun LIKE '%ceviz%' OR urun LIKE '%nar%' OR urun LIKE '%limon%' OR urun LIKE '%mandalina%' OR urun LIKE '%erik%' OR urun LIKE '%armut%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  legumes: {
    title: 'Baklagiller (TÜİK)',
    emoji: '🫘',
    description: 'Türkiye baklagil üretimi — Nohut, Mercimek, Fasulye',
    type: 'bitkisel',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM ${BITKISEL_TABLE} WHERE duzey='Türkiye' AND unsur='Üretim' AND (urun LIKE '%nohut%' OR urun LIKE '%mercimek%' OR urun LIKE '%fasulye (kuru)%' OR urun LIKE '%bakla%' OR urun LIKE '%bezelye%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  livestock: {
    title: 'Hayvan Varlığı (TÜİK)',
    emoji: '🐄',
    description: 'Türkiye hayvan varlığı — Büyükbaş, Küçükbaş, Kanatlı',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND (unsur='Hayvan Sayısı' OR unsur='Varlık') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC LIMIT 20`,
  },
  'red-meat': {
    title: 'Kırmızı Et (TÜİK)',
    emoji: '🥩',
    description: 'Türkiye kırmızı et üretimi — Sığır, Koyun, Keçi',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND unsur LIKE '%Et%' AND (urun LIKE '%sığır%' OR urun LIKE '%koyun%' OR urun LIKE '%keçi%' OR urun LIKE '%manda%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  'white-meat': {
    title: 'Beyaz Et (TÜİK)',
    emoji: '🍗',
    description: 'Türkiye beyaz et üretimi — Tavuk, Hindi',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND (urun LIKE '%tavuk%' OR urun LIKE '%hindi%' OR urun LIKE '%kanatlı%' OR urun LIKE '%broiler%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  milk: {
    title: 'Süt Üretimi (TÜİK)',
    emoji: '🥛',
    description: 'Türkiye süt üretimi — İnek, Koyun, Keçi',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND unsur LIKE '%Süt%' AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  eggs: {
    title: 'Yumurta (TÜİK)',
    emoji: '🥚',
    description: 'Türkiye yumurta üretimi ve fiyatları',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND urun LIKE '%yumurta%' AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
  beekeeping: {
    title: 'Arıcılık (TÜİK)',
    emoji: '🐝',
    description: 'Türkiye arıcılık — Bal üretimi, Kovan sayısı',
    type: 'hayvansal',
    query: `SELECT urun, SUM(y2024) as y2024, SUM(y2023) as y2023, SUM(y2022) as y2022 FROM tuik_hayvansal_uretim WHERE duzey='Türkiye' AND (urun LIKE '%bal%' OR urun LIKE '%arı%' OR urun LIKE '%kovan%' OR urun LIKE '%balmumu%') AND (y2024>0 OR y2023>0) GROUP BY urun ORDER BY y2024 DESC`,
  },
};

interface DataRow {
  urun: string;
  y2024: number;
  y2023: number;
  y2022: number;
}

export default function TurkeyDataPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const rows: DataRow[] = (result.data || []).map((row) => ({
          urun: String(row.urun || ''),
          y2024: Number(row.y2024 || 0),
          y2023: Number(row.y2023 || 0),
          y2022: Number(row.y2022 || 0),
        })).filter(r => r.urun && (r.y2024 > 0 || r.y2023 > 0));
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

  if (!config) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">❌</span>
          <p className="text-sm text-gray-300 mt-3">Kategori bulunamadı</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active"
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const totalProduction = data.reduce((sum, row) => sum + row.y2024, 0);

  return (
    <div className="page-container">
      {/* ── Header ────────────────────────── */}
      <header className="flex items-center gap-3 px-5 pt-safe pb-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl tap-active">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">
            {config.emoji} {config.title}
          </h1>
          <p className="text-[10px] text-gray-500">{config.description}</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl tap-active">
          <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* ── Content ───────────────────────── */}
      <div className="px-5 pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">TÜİK verileri yükleniyor...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-gray-300 mt-3">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="glass-card rounded-xl p-4 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Ürün Sayısı</p>
                  <p className="text-lg font-bold text-white">{data.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Toplam (2024)</p>
                  <p className="text-lg font-bold text-primary-400">{formatNumber(totalProduction)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Kaynak</p>
                  <p className="text-sm font-semibold text-gray-300">TÜİK</p>
                </div>
              </div>
            </div>

            {/* Product Cards */}
            {data.map((item, idx) => {
              const change = item.y2023 > 0
                ? ((item.y2024 - item.y2023) / item.y2023) * 100
                : null;
              const share = totalProduction > 0 ? (item.y2024 / totalProduction) * 100 : 0;

              return (
                <div key={item.urun} className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">#{idx + 1}</span>
                        <p className="text-sm font-semibold text-white">{item.urun}</p>
                      </div>
                      <p className="text-lg font-bold text-primary-400 mt-1">
                        {formatNumber(item.y2024)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        2024 • Pay: %{share.toFixed(1)}
                      </p>
                    </div>
                    {change !== null && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                        change > 0 ? 'bg-green-500/10' : change < 0 ? 'bg-red-500/10' : 'bg-gray-500/10'
                      }`}>
                        {change > 0 ? (
                          <TrendingUp size={12} className="text-green-400" />
                        ) : change < 0 ? (
                          <TrendingDown size={12} className="text-red-400" />
                        ) : (
                          <Minus size={12} className="text-gray-400" />
                        )}
                        <span className={`text-xs font-semibold ${
                          change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Year comparison bar */}
                  <div className="mt-3 space-y-1">
                    {[
                      { year: '2024', value: item.y2024, color: 'bg-primary-500' },
                      { year: '2023', value: item.y2023, color: 'bg-blue-500/60' },
                      { year: '2022', value: item.y2022, color: 'bg-gray-600/60' },
                    ].filter(y => y.value > 0).map((y) => {
                      const max = Math.max(item.y2024, item.y2023, item.y2022);
                      const width = max > 0 ? (y.value / max) * 100 : 0;
                      return (
                        <div key={y.year} className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-500 w-8">{y.year}</span>
                          <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${y.color}`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500 w-12 text-right">
                            {formatNumber(y.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {data.length === 0 && !loading && (
              <div className="text-center py-10">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-gray-400 mt-3">Bu kategori için TÜİK verisi bulunamadı</p>
                <p className="text-xs text-gray-600 mt-1">Veritabanı tabloları güncelleniyor olabilir</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
