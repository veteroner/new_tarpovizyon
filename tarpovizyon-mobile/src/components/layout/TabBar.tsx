import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, BarChart3, Bot, Settings } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isPlatform } from '../../utils/platform';

/**
 * Bottom Tab Bar - 5 Tab
 * 
 * 1. Ana Sayfa (Home)      - Dashboard, hava durumu, bildirimler
 * 2. Keşfet (Compass)      - Tüm modüller, dünya & Türkiye verileri
 * 3. Piyasa (BarChart3)    - Borsa, fiyatlar, dış ticaret
 * 4. AI Asistan (Bot)      - Yapay zeka sohbet
 * 5. Ayarlar (Settings)    - Tercihler, bildirimler, hakkında
 */

interface TabItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const tabs: TabItem[] = [
  { path: '/',           label: 'Ana Sayfa',   icon: Home },
  { path: '/explore',    label: 'Keşfet',      icon: Compass },
  { path: '/market',     label: 'Piyasa',      icon: BarChart3 },
  { path: '/ai',         label: 'AI Asistan',  icon: Bot },
  { path: '/settings',   label: 'Ayarlar',     icon: Settings },
];

function hapticTap() {
  if (isPlatform('capacitor')) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}

export default function TabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around px-1 pb-safe">
        {tabs.map((tab) => {
          // Tab aktif mi kontrol et
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);

          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={hapticTap}
              className={`
                flex flex-col items-center justify-center
                min-w-[64px] py-2 px-1
                transition-all duration-200
                ${isActive
                  ? 'text-primary-400'
                  : 'text-gray-500 active:text-gray-300'
                }
              `}
            >
              {/* Icon */}
              <div className={`
                relative flex items-center justify-center
                w-10 h-7 rounded-2xl
                transition-all duration-300
                ${isActive
                  ? 'bg-primary-500/15'
                  : 'bg-transparent'
                }
              `}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200"
                />
                
                {/* Aktif indicator dot */}
                {isActive && (
                  <span className="absolute -top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-soft" />
                )}
              </div>

              {/* Label */}
              <span className={`
                text-[10px] mt-0.5 font-medium
                transition-all duration-200
                ${isActive ? 'opacity-100' : 'opacity-60'}
              `}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
