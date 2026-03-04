import { useNavigate } from 'react-router-dom';
import { Wheat, Globe, ChevronRight, TrendingUp, MapPin, Loader2 } from 'lucide-react';
import { useProvinceRanking } from '../../hooks/useApi';
import { formatNumber } from '../../services/api';

/**
 * Üretim Tab Page
 * 
 * Türkiye ve Dünya tarımsal üretim verilerine erişim merkezi.
 * Kategori kartları ve özet istatistikler.
 */

const categories = [
  {
    title: 'Türkiye Bitkisel Üretim',
    subtitle: 'TÜİK verileri ile il bazlı üretim miktarları',
    icon: MapPin,
    path: '/production/turkey',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
    stats: [
      { label: 'İl Sayısı', value: '81' },
      { label: 'Ürün Sayısı', value: '200+' },
    ],
  },
  {
    title: 'Dünya Tarımsal Üretim',
    subtitle: 'FAO & USDA uluslararası üretim verileri',
    icon: Globe,
    path: '/production/world',
    gradient: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
    stats: [
      { label: 'Ülke', value: '190+' },
      { label: 'Kaynak', value: 'FAO/USDA' },
    ],
  },
];

export default function ProductionPage() {
  const navigate = useNavigate();

  // Her ürün için sabit hook çağrıları (hooks-in-loop yasak)
  const r0 = useProvinceRanking('Buğday');
  const r1 = useProvinceRanking('Arpa');
  const r2 = useProvinceRanking('Mısır (dane)');
  const r3 = useProvinceRanking('Ayçiçeği');

  function calcTotal(data: typeof r0) {
    const rows = data.data?.data || [];
    if (data.isLoading) return { value: '--', loading: true };
    if (rows.length === 0) return { value: '--', loading: false };
    const total = rows.reduce((sum: number, row: Record<string, unknown>) =>
      sum + Number(row.y2024 || row.y2023 || 0), 0);
    return { value: formatNumber(total) + ' ton', loading: false };
  }

  const highlights = [
    { product: 'Buğday',        ...calcTotal(r0) },
    { product: 'Arpa',          ...calcTotal(r1) },
    { product: 'Mısır (dane)',  ...calcTotal(r2) },
    { product: 'Ayçiçeği',     ...calcTotal(r3) },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Wheat size={22} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Üretim Verileri</h1>
            <p className="text-[10px] text-gray-500">Bitkisel & Hayvansal Üretim</p>
          </div>
        </div>
      </header>

      {/* Kategori Kartları */}
      <section className="px-5 mb-6">
        <div className="space-y-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.path}
                onClick={() => navigate(cat.path)}
                className={`
                  w-full rounded-2xl p-4 text-left
                  bg-gradient-to-br ${cat.gradient}
                  border border-white/5
                  tap-active transition-transform duration-150
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon size={24} className={cat.iconColor} />
                    <div>
                      <p className="text-sm font-semibold text-white">{cat.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{cat.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 mt-0.5" />
                </div>

                {/* Mini stats */}
                <div className="flex gap-4 mt-2 pt-2 border-t border-white/5">
                  {cat.stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className="text-[10px] text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Öne Çıkan Ürünler */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Türkiye Öne Çıkan Ürünler
        </h2>

        <div className="space-y-2">
          {highlights.map((item) => (
            <div
              key={item.product}
              className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <Wheat size={16} className="text-emerald-400/60" />
                <span className="text-sm text-gray-200">{item.product}</span>
              </div>
              <div className="flex items-center gap-3">
                {item.loading ? (
                  <Loader2 size={14} className="animate-spin text-gray-500" />
                ) : (
                  <span className="text-sm font-medium text-white">{item.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Looker Report'lara Erişim */}
      <section className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Detaylı Raporlar</h2>
        
        <button
          onClick={() => navigate('/report/turkey-production')}
          className="w-full glass-card rounded-xl p-3 text-left tap-active flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
            <TrendingUp size={16} className="text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-200">Looker Studio Raporu</p>
            <p className="text-[10px] text-gray-500">Detaylı interaktif analiz</p>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </section>
    </div>
  );
}
