import { useNavigate } from 'react-router-dom';
import {
  Globe, Wheat, Beef, Egg, Milk, Bug,
  Factory, Tractor, Leaf, FlaskConical, Users, Scale,
  MapPin, BarChart3, TrendingUp, DollarSign, Building2,
  ChevronRight, Beaker, Landmark, Map, Package,
  Apple, Coffee, Nut, Grape, Flower2,
} from 'lucide-react';

/**
 * Keşfet / Explore Page
 * 
 * Tüm modüllere erişim sağlayan ana hub sayfası.
 * Dünya verileri, Türkiye verileri, araçlar ve dış uygulamalar burada listelenir.
 */

interface ModuleItem {
  title: string;
  subtitle?: string;
  icon: typeof Globe;
  path: string;
  iconColor: string;
  bgColor: string;
  badge?: string;
}

interface ModuleSection {
  title: string;
  emoji: string;
  modules: ModuleItem[];
}

const sections: ModuleSection[] = [
  {
    title: 'Dünya Bitkisel Üretim (FAO)',
    emoji: '🌍',
    modules: [
      { title: 'Tahıllar', subtitle: 'Buğday, Mısır, Pirinç', icon: Wheat, path: '/data/world/cereals', iconColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
      { title: 'Sebzeler', subtitle: 'Domates, Patates, Soğan', icon: Leaf, path: '/data/world/vegetables', iconColor: 'text-green-400', bgColor: 'bg-green-500/10' },
      { title: 'Meyveler', subtitle: 'Elma, Portakal, Muz', icon: Apple, path: '/data/world/fruits', iconColor: 'text-red-400', bgColor: 'bg-red-500/10' },
      { title: 'Baklagiller', subtitle: 'Nohut, Mercimek, Fasulye', icon: Package, path: '/data/world/legumes', iconColor: 'text-orange-400', bgColor: 'bg-orange-500/10' },
      { title: 'Yağlı Tohumlar', subtitle: 'Soya, Ayçiçeği, Kanola', icon: Flower2, path: '/data/world/oilseeds', iconColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
      { title: 'Şekerli Bitkiler', subtitle: 'Şeker Kamışı, Pancar', icon: Beaker, path: '/data/world/sugar-crops', iconColor: 'text-pink-400', bgColor: 'bg-pink-500/10' },
      { title: 'Sert Kabuklu', subtitle: 'Fındık, Ceviz, Badem', icon: Nut, path: '/data/world/nuts', iconColor: 'text-amber-600', bgColor: 'bg-amber-600/10' },
      { title: 'İçecek Bitkileri', subtitle: 'Çay, Kahve, Kakao', icon: Coffee, path: '/data/world/beverages', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
      { title: 'Lif Bitkileri', subtitle: 'Pamuk, Keten, Jüt', icon: Grape, path: '/data/world/fiber-crops', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    ],
  },
  {
    title: 'Dünya Hayvancılık (FAO)',
    emoji: '🐄',
    modules: [
      { title: 'Hayvan Varlığı', subtitle: 'Büyükbaş, Küçükbaş', icon: Beef, path: '/data/world/livestock', iconColor: 'text-red-400', bgColor: 'bg-red-500/10' },
      { title: 'Kırmızı Et', subtitle: 'Sığır, Koyun, Keçi', icon: Beef, path: '/data/world/red-meat', iconColor: 'text-rose-400', bgColor: 'bg-rose-500/10' },
      { title: 'Beyaz Et', subtitle: 'Tavuk, Hindi', icon: Egg, path: '/data/world/white-meat', iconColor: 'text-sky-400', bgColor: 'bg-sky-500/10' },
      { title: 'Süt', subtitle: 'İnek, Koyun, Keçi Sütü', icon: Milk, path: '/data/world/milk', iconColor: 'text-blue-300', bgColor: 'bg-blue-300/10' },
      { title: 'Yumurta', subtitle: 'Tavuk Yumurtası', icon: Egg, path: '/data/world/eggs', iconColor: 'text-amber-300', bgColor: 'bg-amber-300/10' },
      { title: 'Diğer Hayvansal', subtitle: 'Bal, Yün, Deri', icon: Bug, path: '/data/world/other-animal', iconColor: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    ],
  },
  {
    title: 'Dünya Kaynaklar (FAO)',
    emoji: '🌱',
    modules: [
      { title: 'Arazi Kullanımı', subtitle: 'Tarım arazisi, orman', icon: Map, path: '/data/world/land-use', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
      { title: 'Gübre', subtitle: 'N, P, K kullanımı', icon: FlaskConical, path: '/data/world/fertilizer', iconColor: 'text-teal-400', bgColor: 'bg-teal-500/10' },
      { title: 'Pestisit', subtitle: 'İlaçlama verileri', icon: Beaker, path: '/data/world/pesticide', iconColor: 'text-red-300', bgColor: 'bg-red-300/10' },
      { title: 'İstihdam', subtitle: 'Tarım iş gücü', icon: Users, path: '/data/world/employment', iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
      { title: 'Gıda Dengesi', subtitle: 'Üretim, tüketim, kayıp', icon: Scale, path: '/data/world/food-balance', iconColor: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    ],
  },
  {
    title: 'Türkiye Bitkisel (TÜİK)',
    emoji: '🇹🇷',
    modules: [
      { title: 'Bitkisel Üretim', subtitle: 'İl/İlçe bazlı TÜİK', icon: Wheat, path: '/production/turkey', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
      { title: 'Tahıllar', subtitle: 'Buğday, Arpa, Mısır', icon: Wheat, path: '/data/turkey/cereals', iconColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
      { title: 'Sebzeler', subtitle: 'Domates, Biber, Patates', icon: Leaf, path: '/data/turkey/vegetables', iconColor: 'text-green-400', bgColor: 'bg-green-500/10' },
      { title: 'Meyveler', subtitle: 'Elma, Kiraz, Üzüm', icon: Apple, path: '/data/turkey/fruits', iconColor: 'text-red-400', bgColor: 'bg-red-500/10' },
      { title: 'Baklagiller', subtitle: 'Nohut, Mercimek', icon: Package, path: '/data/turkey/legumes', iconColor: 'text-orange-400', bgColor: 'bg-orange-500/10' },
      { title: 'Dış Ticaret', subtitle: 'İhracat & İthalat', icon: TrendingUp, path: '/market/trade', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    ],
  },
  {
    title: 'Türkiye Hayvancılık (TÜİK)',
    emoji: '🐑',
    modules: [
      { title: 'Hayvan Varlığı', subtitle: 'Büyükbaş, Küçükbaş', icon: Beef, path: '/data/turkey/livestock', iconColor: 'text-red-400', bgColor: 'bg-red-500/10' },
      { title: 'Kırmızı Et', subtitle: 'Kesim & Üretim', icon: Beef, path: '/data/turkey/red-meat', iconColor: 'text-rose-400', bgColor: 'bg-rose-500/10' },
      { title: 'Beyaz Et', subtitle: 'Kanatlı üretimi', icon: Egg, path: '/data/turkey/white-meat', iconColor: 'text-sky-400', bgColor: 'bg-sky-500/10' },
      { title: 'Süt Üretimi', subtitle: 'İnek, Koyun, Keçi', icon: Milk, path: '/data/turkey/milk', iconColor: 'text-blue-300', bgColor: 'bg-blue-300/10' },
      { title: 'Yumurta', subtitle: 'Tavuk & Fiyatlar', icon: Egg, path: '/data/turkey/eggs', iconColor: 'text-amber-300', bgColor: 'bg-amber-300/10', badge: 'Canlı Fiyat' },
      { title: 'Arıcılık', subtitle: 'Bal, Kovan, İlçe bazlı', icon: Bug, path: '/data/turkey/beekeeping', iconColor: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    ],
  },
  {
    title: 'İl Bazlı Veriler',
    emoji: '📍',
    modules: [
      { title: 'İl Hayvancılık', subtitle: 'İl bazlı hayvan varlığı', icon: MapPin, path: '/data/provincial/livestock', iconColor: 'text-red-400', bgColor: 'bg-red-500/10' },
      { title: 'İl Bitkisel', subtitle: 'İl bazlı bitkisel üretim', icon: MapPin, path: '/data/provincial/crops', iconColor: 'text-green-400', bgColor: 'bg-green-500/10' },
      { title: 'Havza Üretimi', subtitle: 'Havza bazlı veriler', icon: Map, path: '/data/provincial/basin', iconColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
      { title: 'Coğrafi İşaret', subtitle: 'Tescilli ürünler', icon: Landmark, path: '/data/provincial/geo-indication', iconColor: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    ],
  },
  {
    title: 'Ekonomik Göstergeler',
    emoji: '💰',
    modules: [
      { title: 'Fiyat Endeksleri', subtitle: 'ÜFE, TÜFE, Tarım', icon: DollarSign, path: '/data/economic/price-index', iconColor: 'text-green-400', bgColor: 'bg-green-500/10' },
      { title: 'Ürün Dengesi', subtitle: 'Üretim-Tüketim', icon: Scale, path: '/data/economic/product-balance', iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
      { title: 'Makro Ekonomi', subtitle: 'GSYH, Nüfus, İstihdam', icon: Building2, path: '/data/economic/macro', iconColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
      { title: 'Çapraz İçgörü', subtitle: 'Korelasyon analizi', icon: BarChart3, path: '/data/economic/cross-intelligence', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    ],
  },
  {
    title: 'Uygulamalar & Araçlar',
    emoji: '🛠️',
    modules: [
      { title: 'Rasyon Hesaplayıcı', subtitle: 'NRC 2021 bazlı yem', icon: Beaker, path: '/apps/rasyon', iconColor: 'text-green-400', bgColor: 'bg-green-500/10', badge: 'Yeni' },
      { title: 'TARPOL', subtitle: 'Tarım Politikaları', icon: Landmark, path: '/apps/tarpol', iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
      { title: 'Hasat Tahmini', subtitle: 'İl/İlçe bazlı', icon: Tractor, path: '/tools/harvest', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
      { title: 'Sulama Planlayıcı', subtitle: 'ETc & su ihtiyacı', icon: Factory, path: '/tools/irrigation', iconColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    ],
  },
];

export default function ExplorePage() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* ── Header ────────────────────────── */}
      <header className="px-5 pt-safe pb-3">
        <div>
          <h1 className="text-xl font-bold text-white">Keşfet</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tüm veri modülleri ve uygulamalar
          </p>
        </div>
      </header>

      {/* ── İstatistik Barı ───────────────── */}
      <section className="px-5 mb-4">
        <div className="glass-card rounded-xl p-3 flex items-center justify-around">
          <div className="text-center">
            <p className="text-lg font-bold text-primary-400">60+</p>
            <p className="text-[10px] text-gray-500">Modül</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-400">8</p>
            <p className="text-[10px] text-gray-500">Kategori</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">4</p>
            <p className="text-[10px] text-gray-500">Araç</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-purple-400">2</p>
            <p className="text-[10px] text-gray-500">Uygulama</p>
          </div>
        </div>
      </section>

      {/* ── Modül Sections ────────────────── */}
      {sections.map((section) => (
        <section key={section.title} className="px-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            {section.emoji} {section.title}
          </h2>
          
          <div className="space-y-2">
            {section.modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-white/5 tap-active text-left transition-all active:scale-[0.98]"
                >
                  <div className={`w-10 h-10 rounded-xl ${mod.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={mod.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{mod.title}</p>
                      {mod.badge && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400 flex-shrink-0">
                          {mod.badge}
                        </span>
                      )}
                    </div>
                    {mod.subtitle && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{mod.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* ── Footer ────────────────────────── */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[10px] text-gray-600">
          TarpoVizyon v2.0 — Tarım Komuta Merkezi
        </p>
      </div>
    </div>
  );
}
