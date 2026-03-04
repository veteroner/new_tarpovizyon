import { useNavigate } from 'react-router-dom';
import {
  Wheat, BarChart3, Globe, Cloud, TrendingUp,
  Sprout, Droplets, Calculator, CalendarDays,
  ChevronRight, Bell, LineChart, Sun, CloudRain,
} from 'lucide-react';
import { useWeather } from '../../hooks/useApi';
import { getWeatherIconUrl } from '../../services/weather';

/**
 * Ana Sayfa - Dashboard
 * 
 * Kullanıcının ilk gördüğü ekran.
 * Gerçek hava durumu + hızlı erişim kartları + tarım araçları.
 */

const weatherIcons: Record<string, typeof Sun> = {
  '01d': Sun, '01n': Sun,
  '09d': CloudRain, '09n': CloudRain,
  '10d': CloudRain, '10n': CloudRain,
};

// Hızlı erişim kartları
const quickAccess = [
  {
    title: 'Türkiye Üretimi',
    subtitle: 'İl bazlı veriler',
    icon: Wheat,
    path: '/production/turkey',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Dünya Üretimi',
    subtitle: 'FAO & USDA',
    icon: Globe,
    path: '/production/world',
    gradient: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
  },
  {
    title: 'Piyasa Fiyatları',
    subtitle: 'Anlık borsa',
    icon: TrendingUp,
    path: '/market/prices',
    gradient: 'from-amber-500/20 to-amber-600/5',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Dış Ticaret',
    subtitle: 'İthalat & İhracat',
    icon: LineChart,
    path: '/market/trade',
    gradient: 'from-purple-500/20 to-purple-600/5',
    iconColor: 'text-purple-400',
  },
];

// Araçlar
const tools = [
  {
    title: 'Hasat Tahmini',
    icon: Sprout,
    path: '/tools/harvest',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    title: 'Sulama',
    icon: Droplets,
    path: '/tools/irrigation',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    title: 'Gübre',
    icon: Calculator,
    path: '/tools/fertilizer',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    title: 'Takvim',
    icon: CalendarDays,
    path: '/tools/calendar',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: weather, isLoading: weatherLoading } = useWeather('Ankara');

  const WeatherIcon = weather?.icon ? (weatherIcons[weather.icon] || Cloud) : Cloud;

  return (
    <div className="page-container">
      {/* ── Header ────────────────────────── */}
      <header className="px-5 pt-safe pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">TarpoVizyon</h1>
            <p className="text-xs text-gray-500 mt-0.5">Tarım İstihbarat Platformu</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="relative p-2.5 rounded-xl bg-dark-800/80 tap-active"
          >
            <Bell size={20} className="text-gray-400" />
            {/* Bildirim badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>

      {/* ── Hava Durumu Kartı ─────────────── */}
      <section className="px-5 mb-5">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center">
              {weather?.icon ? (
                <img src={getWeatherIconUrl(weather.icon)} alt={weather.description} className="w-10 h-10" />
              ) : (
                <WeatherIcon size={26} className="text-sky-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{weather?.city || 'Ankara'}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {weatherLoading ? 'Yükleniyor...' : weather?.description || 'Hava durumu verisi yok'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{weather ? `${weather.temp}°` : '--°'}</p>
              <p className="text-[10px] text-gray-500">
                {weather ? `Nem %${weather.humidity}` : 'API key gerekli'}
              </p>
            </div>
          </div>
          {weather && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Hissedilen</p>
                <p className="text-xs font-semibold text-gray-300">{weather.feelsLike}°</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Rüzgar</p>
                <p className="text-xs font-semibold text-gray-300">{weather.windSpeed} m/s</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Basınç</p>
                <p className="text-xs font-semibold text-gray-300">{weather.pressure} hPa</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Hızlı Erişim Kartları ─────────── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Hızlı Erişim</h2>
          <BarChart3 size={16} className="text-gray-600" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {quickAccess.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  relative overflow-hidden rounded-2xl p-4 text-left
                  bg-gradient-to-br ${item.gradient}
                  border border-white/5
                  tap-active transition-transform duration-150
                `}
              >
                <Icon size={24} className={`${item.iconColor} mb-2`} />
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.subtitle}</p>
                <ChevronRight
                  size={16}
                  className="absolute top-3 right-3 text-gray-600"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Araçlar ───────────────────────── */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Tarım Araçları</h2>
        
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.path}
                onClick={() => navigate(tool.path)}
                className="flex-shrink-0 flex flex-col items-center gap-2 tap-active"
              >
                <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center`}>
                  <Icon size={24} className={tool.color} />
                </div>
                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                  {tool.title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Son Güncellemeler ──────────────── */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Son Güncellemeler</h2>
        
        <div className="space-y-2">
          {[
            { title: 'TÜİK 2024 verim verileri güncellendi', time: 'Bugün', color: 'bg-green-500' },
            { title: 'Dış ticaret 2025 verileri eklendi', time: 'Bu hafta', color: 'bg-blue-500' },
            { title: 'Yumurta fiyatları canlı takip aktif', time: 'Yeni', color: 'bg-amber-500' },
          ].map((update, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-white/5"
            >
              <span className={`w-2 h-2 rounded-full ${update.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{update.title}</p>
              </div>
              <span className="text-[10px] text-gray-600 flex-shrink-0">{update.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Asistan Teaser ─────────────── */}
      <section className="px-5 mb-8">
        <button
          onClick={() => navigate('/ai')}
          className="w-full glass-card rounded-2xl p-4 text-left tap-active"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">AI Tarım Asistanı</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Tarımsal sorularınızı yapay zeka ile yanıtlayın
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </div>
        </button>
      </section>
    </div>
  );
}
