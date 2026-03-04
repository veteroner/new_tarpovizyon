import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, DollarSign, Building2, Scale, BarChart3 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchQuery, formatNumber } from '../../services/api';

/**
 * Economic Data Page
 * 
 * Ekonomik gösterge sayfası. 
 * URL params: /data/economic/:category
 */

interface CategoryConfig {
  title: string;
  emoji: string;
  icon: typeof DollarSign;
  description: string;
  items: { label: string; query: string; unit: string }[];
}

const CATEGORIES: Record<string, CategoryConfig> = {
  'price-index': {
    title: 'Tarım Fiyat Endeksleri',
    emoji: '📊',
    icon: DollarSign,
    description: 'ÜFE, TÜFE ve tarımsal fiyat endeksleri',
    items: [
      { label: 'Bitkisel Ürün İhracatı (Toplam $)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_bitkisel WHERE unsur='İhracat ($)' AND duzey='ülke'`, unit: '$' },
      { label: 'Bitkisel Ürün İthalatı (Toplam $)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_bitkisel WHERE unsur='İthalat ($)' AND duzey='ülke'`, unit: '$' },
      { label: 'Hayvansal Ürün İhracatı (Toplam $)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_hayvansal WHERE unsur='İhracat ($)' AND duzey='ülke'`, unit: '$' },
      { label: 'Hayvansal Ürün İthalatı (Toplam $)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_hayvansal WHERE unsur='İthalat ($)' AND duzey='ülke'`, unit: '$' },
    ],
  },
  'product-balance': {
    title: 'Ürün Dengesi',
    emoji: '⚖️',
    icon: Scale,
    description: 'Üretim-Tüketim dengesi ve arz-talep analizi',
    items: [
      { label: 'Türkiye Toplam Bitkisel Üretim', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_bitkisel_uretim WHERE duzey='Türkiye' AND unsur='Üretim' AND y2024>0`, unit: 'ton' },
      { label: 'En Çok Üretilen 1. Ürün', query: `SELECT urun as label, y2024 as value, y2023 as prev FROM tuik_bitkisel_uretim WHERE duzey='Türkiye' AND unsur='Üretim' AND y2024>0 ORDER BY y2024 DESC LIMIT 1`, unit: 'ton' },
      { label: 'Toplam Bitkisel İhracat ($)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_bitkisel WHERE unsur='İhracat ($)'`, unit: '$' },
      { label: 'Toplam Bitkisel İthalat ($)', query: `SELECT SUM(y2024) as value, SUM(y2023) as prev FROM tuik_ticaret_bitkisel WHERE unsur='İthalat ($)'`, unit: '$' },
    ],
  },
  macro: {
    title: 'Makroekonomik Göstergeler',
    emoji: '🏛️',
    icon: Building2,
    description: 'GSYH, nüfus, istihdam ve genel ekonomik veriler',
    items: [
      { label: 'Tarımsal İhracat Ülke Sayısı', query: `SELECT COUNT(DISTINCT ulke) as value FROM tuik_ticaret_bitkisel WHERE duzey='ülke' AND y2024>0`, unit: '' },
      { label: 'Bitkisel İhracat Ürün Sayısı', query: `SELECT COUNT(DISTINCT urun) as value FROM tuik_ticaret_bitkisel WHERE unsur='İhracat ($)' AND duzey='ülke' AND y2024>0`, unit: '' },
      { label: 'İl Bazlı Üretim Yapan İl Sayısı', query: `SELECT COUNT(DISTINCT ili) as value FROM tuik_bitkisel_uretim WHERE duzey='il' AND y2024>0`, unit: '' },
      { label: 'Toplam Ürün Çeşidi (Bitkisel)', query: `SELECT COUNT(DISTINCT urun) as value FROM tuik_bitkisel_uretim WHERE duzey='Türkiye' AND unsur='Üretim' AND y2024>0`, unit: '' },
    ],
  },
  'cross-intelligence': {
    title: 'Çapraz İstihbarat',
    emoji: '🔗',
    icon: BarChart3,
    description: 'Bitkisel ve hayvansal korelasyon analizleri',
    items: [
      { label: 'Top 5 Bitkisel İhracat Seçim', query: `SELECT urun as label, y2024 as value, y2023 as prev FROM tuik_ticaret_bitkisel WHERE unsur='İhracat ($)' AND duzey='ülke' AND y2024>0 ORDER BY y2024 DESC LIMIT 5`, unit: '$' },
      { label: 'Top 5 Hayvansal İhracat Seçim', query: `SELECT urun as label, y2024 as value, y2023 as prev FROM tuik_ticaret_hayvansal WHERE unsur='İhracat ($)' AND duzey='ülke' AND y2024>0 ORDER BY y2024 DESC LIMIT 5`, unit: '$' },
      { label: 'Top 5 Üretim - Bitkisel', query: `SELECT urun as label, y2024 as value, y2023 as prev FROM tuik_bitkisel_uretim WHERE duzey='Türkiye' AND unsur='Üretim' AND y2024>0 ORDER BY y2024 DESC LIMIT 5`, unit: 'ton' },
    ],
  },
};

interface DataItem {
  label: string;
  value: number;
  prev: number;
  unit: string;
  extra?: string;
  subItems?: { label: string; value: number; prev: number }[];
}

export default function EconomicDataPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const config = category ? CATEGORIES[category] : null;

  const loadData = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError('');

    try {
      const results = await Promise.all(
        config.items.map(async (item) => {
          try {
            const result = await fetchQuery(item.query);
            if (result.error) return null;
            const rows = result.data || [];

            // If query returns multiple rows (top N), collect as subItems
            if (rows.length > 1 && rows[0]?.label) {
              const subItems = rows.map((r: Record<string, unknown>) => ({
                label: String(r.label || r.urun || ''),
                value: Number(r.value || 0),
                prev: Number(r.prev || 0),
              }));
              const total = subItems.reduce((s: number, si: { value: number }) => s + si.value, 0);
              return {
                label: item.label,
                value: total,
                prev: subItems.reduce((s: number, si: { prev: number }) => s + si.prev, 0),
                unit: item.unit,
                subItems,
              } as DataItem;
            }

            // Single value
            const row = rows[0] || {};
            return {
              label: row.label ? `${item.label}: ${row.label}` : item.label,
              value: Number(row.value || 0),
              prev: Number(row.prev || 0),
              unit: item.unit,
            } as DataItem;
          } catch {
            return null;
          }
        })
      );

      setItems(results.filter(Boolean) as DataItem[]);
    } catch {
      setError('Ekonomik veriler yüklenirken hata oluştu');
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
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active">← Geri Dön</button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

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

      {/* Content */}
      <div className="px-5 pb-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Ekonomik veriler yükleniyor...</span>
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
          <div className="space-y-3">
            {/* Category Header Card */}
            <div className="glass-card rounded-xl p-5 flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <Icon size={28} className="text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{config.title}</p>
                <p className="text-[10px] text-gray-500 mt-1">{items.length} gösterge yüklendi</p>
              </div>
            </div>

            {/* Data Items */}
            {items.map((item, idx) => {
              const change = item.prev > 0 ? ((item.value - item.prev) / item.prev) * 100 : null;

              return (
                <div key={idx} className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-300">{item.label}</p>
                      <p className="text-xl font-bold text-white mt-1">
                        {item.unit === '$' ? '$' : ''}{formatNumber(item.value)}
                        {item.unit && item.unit !== '$' ? <span className="text-xs text-gray-500 ml-1">{item.unit}</span> : null}
                      </p>
                      {item.prev > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Önceki: {item.unit === '$' ? '$' : ''}{formatNumber(item.prev)} {item.unit !== '$' ? item.unit : ''}
                        </p>
                      )}
                    </div>
                    {change !== null && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${change > 0 ? 'bg-green-500/10' : change < 0 ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                        {change > 0 ? <TrendingUp size={12} className="text-green-400" /> : change < 0 ? <TrendingDown size={12} className="text-red-400" /> : <Minus size={12} className="text-gray-400" />}
                        <span className={`text-xs font-semibold ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sub items for Top N queries */}
                  {item.subItems && item.subItems.length > 0 && (
                    <div className="mt-3 space-y-1.5 pt-2 border-t border-white/5">
                      {item.subItems.map((sub, si) => {
                        const subChange = sub.prev > 0 ? ((sub.value - sub.prev) / sub.prev) * 100 : null;
                        return (
                          <div key={si} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600 w-4">#{si + 1}</span>
                              <span className="text-xs text-gray-300">{sub.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {item.unit === '$' ? '$' : ''}{formatNumber(sub.value)}
                              </span>
                              {subChange !== null && (
                                <span className={`text-[9px] ${subChange > 0 ? 'text-green-400' : subChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                  {subChange > 0 ? '↑' : subChange < 0 ? '↓' : '−'}{Math.abs(subChange).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && !loading && (
              <div className="text-center py-10">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-gray-400 mt-3">Ekonomik veriler yüklenemedi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
