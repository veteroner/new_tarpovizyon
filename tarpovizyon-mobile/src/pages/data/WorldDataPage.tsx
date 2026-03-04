import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchQuery, formatNumber } from '../../services/api';

/**
 * Generic World Data Category Page
 * 
 * FAO dünya verilerini kategori bazlı gösteren genel sayfa.
 * URL params: /data/world/:category
 */

interface CategoryConfig {
  title: string;
  emoji: string;
  table: string;
  description: string;
  products: string[];
}

const CATEGORIES: Record<string, CategoryConfig> = {
  cereals: {
    title: 'Tahıllar',
    emoji: '🌾',
    table: 'üretimindex',
    description: 'Dünya tahıl üretimi — Buğday, Mısır, Pirinç, Arpa ve diğer tahıllar',
    products: ['Wheat', 'Maize (corn)', 'Rice', 'Barley', 'Sorghum', 'Oats', 'Millet', 'Rye', 'Triticale'],
  },
  vegetables: {
    title: 'Sebzeler',
    emoji: '🥬',
    table: 'üretimindex',
    description: 'Dünya sebze üretimi — Domates, Patates, Soğan ve diğer sebzeler',
    products: ['Tomatoes', 'Potatoes', 'Onions', 'Cabbages', 'Cucumbers', 'Carrots', 'Peppers', 'Eggplants', 'Lettuce'],
  },
  fruits: {
    title: 'Meyveler',
    emoji: '🍎',
    table: 'üretimindex',
    description: 'Dünya meyve üretimi — Elma, Portakal, Muz, Üzüm ve diğer meyveler',
    products: ['Apples', 'Oranges', 'Bananas', 'Grapes', 'Watermelons', 'Mangoes', 'Pineapples', 'Peaches', 'Pears', 'Strawberries'],
  },
  legumes: {
    title: 'Baklagiller',
    emoji: '🫘',
    table: 'üretimindex',
    description: 'Dünya baklagil üretimi — Fasulye, Nohut, Mercimek ve diğerleri',
    products: ['Beans', 'Chickpeas', 'Lentils', 'Peas', 'Broad beans', 'Soybeans', 'Groundnuts', 'Lupins'],
  },
  oilseeds: {
    title: 'Yağlı Tohumlar',
    emoji: '🌻',
    table: 'üretimindex',
    description: 'Dünya yağlı tohum üretimi — Soya, Ayçiçeği, Kanola ve diğerleri',
    products: ['Soybeans', 'Sunflower seed', 'Rape or colza seed', 'Palm oil', 'Coconuts', 'Sesame seed', 'Linseed'],
  },
  'sugar-crops': {
    title: 'Şekerli Bitkiler',
    emoji: '🍬',
    table: 'üretimindex',
    description: 'Dünya şekerli bitki üretimi — Şeker Kamışı ve Şeker Pancarı',
    products: ['Sugar cane', 'Sugar beet'],
  },
  nuts: {
    title: 'Sert Kabuklu Meyveler',
    emoji: '🥜',
    table: 'üretimindex',
    description: 'Dünya sert kabuklu meyve üretimi — Fındık, Ceviz, Badem ve diğerleri',
    products: ['Almonds', 'Walnuts', 'Cashew nuts', 'Hazelnuts', 'Pistachios', 'Chestnuts', 'Macadamia nuts'],
  },
  beverages: {
    title: 'İçecek Bitkileri',
    emoji: '☕',
    table: 'üretimindex',
    description: 'Dünya içecek bitkisi üretimi — Çay, Kahve, Kakao',
    products: ['Coffee', 'Tea', 'Cocoa beans', 'Hops', 'Mate'],
  },
  'fiber-crops': {
    title: 'Lif Bitkileri',
    emoji: '🧵',
    table: 'üretimindex',
    description: 'Dünya lif bitkisi üretimi — Pamuk, Keten, Jüt ve diğerleri',
    products: ['Cotton lint', 'Jute', 'Flax', 'Hemp', 'Sisal'],
  },
  livestock: {
    title: 'Hayvan Varlığı',
    emoji: '🐄',
    table: 'hayvanvarligiindex',
    description: 'Dünya hayvan varlığı — Büyükbaş, Küçükbaş, Kanatlı sayıları',
    products: ['Cattle', 'Sheep', 'Goats', 'Pigs', 'Chickens', 'Buffaloes', 'Horses', 'Camels', 'Ducks'],
  },
  'red-meat': {
    title: 'Kırmızı Et',
    emoji: '🥩',
    table: 'hayvanüretimindex',
    description: 'Dünya kırmızı et üretimi — Sığır, Koyun, Keçi eti',
    products: ['Meat of cattle', 'Meat of sheep', 'Meat of goats', 'Meat of pig', 'Meat of buffalo'],
  },
  'white-meat': {
    title: 'Beyaz Et',
    emoji: '🍗',
    table: 'hayvanüretimindex',
    description: 'Dünya beyaz et üretimi — Tavuk, Hindi, Ördek',
    products: ['Meat of chickens', 'Meat of turkeys', 'Meat of ducks'],
  },
  milk: {
    title: 'Süt',
    emoji: '🥛',
    table: 'hayvanüretimindex',
    description: 'Dünya süt üretimi — İnek, Koyun, Keçi sütü',
    products: ['Milk whole fresh cow', 'Milk whole fresh goat', 'Milk whole fresh sheep', 'Milk whole fresh buffalo'],
  },
  eggs: {
    title: 'Yumurta',
    emoji: '🥚',
    table: 'hayvanüretimindex',
    description: 'Dünya yumurta üretimi',
    products: ['Eggs primary'],
  },
  'other-animal': {
    title: 'Diğer Hayvansal Ürünler',
    emoji: '🐝',
    table: 'hayvanüretimindex',
    description: 'Dünya bal, yün, deri üretimi',
    products: ['Honey', 'Beeswax', 'Wool', 'Silk-worm cocoons'],
  },
  'land-use': {
    title: 'Arazi Kullanımı',
    emoji: '🗺️',
    table: 'kaynakindex',
    description: 'Dünya arazi kullanım verileri — Tarım, Orman, Mera arazileri',
    products: ['Agricultural land', 'Arable land', 'Permanent crops', 'Forest land', 'Permanent meadows'],
  },
  fertilizer: {
    title: 'Gübre Kullanımı',
    emoji: '🧪',
    table: 'kaynakindex',
    description: 'Dünya gübre tüketimi — Azot (N), Fosfor (P), Potasyum (K)',
    products: ['Nitrogen', 'Phosphate', 'Potash'],
  },
  pesticide: {
    title: 'Pestisit Kullanımı',
    emoji: '🔬',
    table: 'kaynakindex',
    description: 'Dünya pestisit verileri',
    products: ['Pesticides', 'Insecticides', 'Herbicides', 'Fungicides'],
  },
  employment: {
    title: 'Tarım İstihdamı',
    emoji: '👷',
    table: 'kaynakindex',
    description: 'Dünya tarım iş gücü ve istihdam verileri',
    products: ['Employment in agriculture'],
  },
  'food-balance': {
    title: 'Gıda Dengesi',
    emoji: '⚖️',
    table: 'kaynakindex',
    description: 'Dünya gıda arz-talep dengesi',
    products: ['Food supply', 'Food production', 'Food imports', 'Food waste'],
  },
};

interface ProductData {
  product: string;
  totalValue: number;
  unit: string;
  yearlyData: { year: string; value: number }[];
}

export default function WorldDataPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const config = category ? CATEGORIES[category] : null;

  const loadData = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError('');

    try {
      // Try to fetch data from the API for each product
      const results: ProductData[] = [];

      for (const product of config.products) {
        const safeProduct = product.replace(/'/g, "''");
        const result = await fetchQuery(
          `SELECT ürün, yil, SUM(deger) as toplam, birim 
           FROM ${config.table} 
           WHERE ürün LIKE '%${safeProduct}%' 
           GROUP BY ürün, yil, birim 
           ORDER BY yil DESC 
           LIMIT 20`
        );

        if (result.data && result.data.length > 0) {
          const yearlyData = result.data.map((row) => ({
            year: String(row.yil || ''),
            value: Number(row.toplam || 0),
          })).filter(d => d.year && d.value > 0);

          const total = yearlyData.length > 0 ? yearlyData[0].value : 0;
          const unit = String(result.data[0]?.birim || 'Ton');

          results.push({
            product,
            totalValue: total,
            unit,
            yearlyData,
          });
        } else {
          // Add placeholder entry even if no data
          results.push({
            product,
            totalValue: 0,
            unit: 'Ton',
            yearlyData: [],
          });
        }
      }

      setData(results);
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
              <span className="text-xs text-gray-500">Veriler yükleniyor...</span>
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
            {/* Summary Card */}
            <div className="glass-card rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Toplam Ürün</p>
                  <p className="text-xl font-bold text-white">{data.filter(d => d.totalValue > 0).length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Veri Durumu</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {data.filter(d => d.totalValue > 0).length > 0 ? '✅ Aktif' : '⏳ Yükleniyor'}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Cards */}
            {data.map((item) => {
              const latestYear = item.yearlyData[0];
              const prevYear = item.yearlyData[1];
              const change = latestYear && prevYear && prevYear.value > 0
                ? ((latestYear.value - prevYear.value) / prevYear.value) * 100
                : null;

              return (
                <div
                  key={item.product}
                  className="glass-card rounded-xl p-4 border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{item.product}</p>
                      {item.totalValue > 0 ? (
                        <>
                          <p className="text-lg font-bold text-primary-400 mt-1">
                            {formatNumber(item.totalValue)}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {item.unit} • {latestYear?.year || 'N/A'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Veri bekleniyor...</p>
                      )}
                    </div>
                    {change !== null && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                        change > 0 ? 'bg-green-500/10' : change < 0 ? 'bg-red-500/10' : 'bg-gray-500/10'
                      }`}>
                        {change > 0 ? (
                          <TrendingUp size={14} className="text-green-400" />
                        ) : change < 0 ? (
                          <TrendingDown size={14} className="text-red-400" />
                        ) : (
                          <Minus size={14} className="text-gray-400" />
                        )}
                        <span className={`text-xs font-semibold ${
                          change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mini year chart */}
                  {item.yearlyData.length > 1 && (
                    <div className="flex items-end gap-1 mt-3 h-8">
                      {item.yearlyData.slice(0, 7).reverse().map((yd, i) => {
                        const max = Math.max(...item.yearlyData.slice(0, 7).map(d => d.value));
                        const height = max > 0 ? (yd.value / max) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-primary-500/30"
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={`${yd.year}: ${formatNumber(yd.value)}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {data.length === 0 && !loading && (
              <div className="text-center py-10">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-gray-400 mt-3">Bu kategori için veri bulunamadı</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
