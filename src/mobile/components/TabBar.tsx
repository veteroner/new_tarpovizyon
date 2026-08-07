import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, BarChart3, Bot, Settings } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isPlatform } from '../utils/platform';

/**
 * Alt sekme çubuğu.
 *
 * ─── TASARIM ────────────────────────────────────────────────────────────────
 * iOS HIG'e taşındı. Önceki hâlde aktif sekmede yeşil rozet, nabız gibi atan
 * bir nokta ve 300 ms geçişler vardı — dikkat çekiyor ama gezinme çubuğu
 * dikkat çekmemeli, YERİNİ göstermeli. Şimdi: seçili sekme vurgu renginde ve
 * yarı kalın, gerisi gri. Rozet ve animasyon yok.
 *
 * Beş sekme HIG'in üst sınırı; altıncı eklenirse "Daha" menüsü gerekir.
 * Derin gezinme sekmenin İÇİNDE kalır — sekme değiştirmek yığını sıfırlamaz.
 */

interface TabItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const tabs: TabItem[] = [
  { path: '/m',          label: 'Ana Sayfa', icon: Home },
  { path: '/m/explore',  label: 'Keşfet',    icon: Compass },
  { path: '/m/market',   label: 'Piyasa',    icon: BarChart3 },
  { path: '/m/ai',       label: 'AI',        icon: Bot },
  { path: '/m/settings', label: 'Ayarlar',   icon: Settings },
];

function hapticTap() {
  // Dokunma geri bildirimi yalnızca gerçek cihazda; tarayıcıda sessizce geçer.
  if (isPlatform('capacitor')) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}

export default function TabBar() {
  const location = useLocation();

  return (
    <nav className="ios-tabbar" aria-label="Ana gezinme">
      {tabs.map((tab) => {
        const aktif = tab.path === '/m'
          ? location.pathname === '/m'
          : location.pathname.startsWith(tab.path);
        const Icon = tab.icon;

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            onClick={hapticTap}
            className="ios-tab"
            aria-current={aktif ? 'page' : undefined}
          >
            {/* Seçili sekmede dolgun, diğerlerinde ince çizgi — HIG'in
                filled/outline ayrımı. Renk tek başına anlam taşımıyor. */}
            <Icon size={24} strokeWidth={aktif ? 2.4 : 1.7} aria-hidden="true" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
