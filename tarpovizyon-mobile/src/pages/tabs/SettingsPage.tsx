import { useState, useEffect } from 'react';
import {
  Settings, Bell, BellOff, Moon, Globe, Info,
  ChevronRight, Shield, Smartphone, ExternalLink,
  LogOut, Database, Trash2,
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { getAppInfo } from '../../capacitor/app';
import { setNotificationTag, hasNotificationPermission } from '../../capacitor/push';
import { isPlatform } from '../../utils/platform';

/**
 * Ayarlar Tab Page
 * 
 * Bildirim tercihleri, tema, hakkında, versiyon bilgisi.
 */

interface SettingToggle {
  key: string;
  label: string;
  description: string;
  icon: typeof Bell;
  iconColor: string;
  default: boolean;
}

const notificationSettings: SettingToggle[] = [
  {
    key: 'market_alerts',
    label: 'Piyasa Bildirimleri',
    description: 'Fiyat değişikliklerinde bildirim al',
    icon: Bell,
    iconColor: 'text-amber-400',
    default: true,
  },
  {
    key: 'weather_alerts',
    label: 'Hava Durumu Uyarıları',
    description: 'Kritik hava olaylarında bildirim al',
    icon: Bell,
    iconColor: 'text-sky-400',
    default: true,
  },
  {
    key: 'weekly_digest',
    label: 'Haftalık Özet',
    description: 'Her Pazartesi haftalık rapor al',
    icon: Bell,
    iconColor: 'text-purple-400',
    default: true,
  },
];

export default function SettingsPage() {
  const [appVersion, setAppVersion] = useState('2.0.0');
  const [buildNumber, setBuildNumber] = useState('7');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    market_alerts: true,
    weather_alerts: true,
    weekly_digest: true,
  });

  useEffect(() => {
    getAppInfo().then((info) => {
      setAppVersion(info.version || '2.0.0');
      setBuildNumber(info.build || '7');
    });
  }, []);

  const handleToggle = (key: string) => {
    const newValue = !toggles[key];
    setToggles((prev) => ({ ...prev, [key]: newValue }));
    setNotificationTag(key, newValue);
  };

  const openLink = async (url: string) => {
    if (isPlatform('capacitor')) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="px-5 pt-safe pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-500/15 flex items-center justify-center">
            <Settings size={22} className="text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Ayarlar</h1>
            <p className="text-[10px] text-gray-500">Tercihler & Bilgi</p>
          </div>
        </div>
      </header>

      {/* Bildirim Ayarları */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Bildirimler
        </h2>

        {!hasNotificationPermission() && isPlatform('capacitor') && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <BellOff size={16} className="text-red-400" />
              <p className="text-xs text-red-300">
                Bildirim izni verilmemiş. Cihaz ayarlarından etkinleştirin.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {notificationSettings.map((setting) => {
            const Icon = setting.icon;
            return (
              <div
                key={setting.key}
                className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={setting.iconColor} />
                  <div>
                    <p className="text-sm text-gray-200">{setting.label}</p>
                    <p className="text-[10px] text-gray-500">{setting.description}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(setting.key)}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors duration-200
                    ${toggles[setting.key] ? 'bg-primary-500' : 'bg-gray-700'}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
                      transition-transform duration-200 shadow-sm
                      ${toggles[setting.key] ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Genel Ayarlar */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Genel
        </h2>

        <div className="space-y-1">
          <SettingsRow
            icon={Moon}
            iconColor="text-indigo-400"
            label="Tema"
            value="Koyu"
          />
          <SettingsRow
            icon={Globe}
            iconColor="text-sky-400"
            label="Dil"
            value="Türkçe"
          />
          <SettingsRow
            icon={Database}
            iconColor="text-green-400"
            label="Çevrimdışı Veri"
            value="32 MB"
          />
        </div>
      </section>

      {/* Hakkında */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Hakkında
        </h2>

        <div className="space-y-1">
          <button
            onClick={() => openLink('https://www.tarpol.org.tr/')}
            className="w-full"
          >
            <SettingsRow
              icon={ExternalLink}
              iconColor="text-primary-400"
              label="TARPOL Web Sitesi"
              value=""
              showArrow
            />
          </button>

          <SettingsRow
            icon={Shield}
            iconColor="text-emerald-400"
            label="Gizlilik Politikası"
            value=""
            showArrow
          />

          <SettingsRow
            icon={Smartphone}
            iconColor="text-gray-400"
            label="Versiyon"
            value={`v${appVersion} (${buildNumber})`}
          />

          <SettingsRow
            icon={Info}
            iconColor="text-blue-400"
            label="Lisanslar"
            value=""
            showArrow
          />
        </div>
      </section>

      {/* Tehlikeli Bölge */}
      <section className="px-5 mb-8">
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-white/5 tap-active">
            <Trash2 size={18} className="text-orange-400" />
            <span className="text-sm text-orange-400">Önbelleği Temizle</span>
          </button>

          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-red-500/10 tap-active">
            <LogOut size={18} className="text-red-400" />
            <span className="text-sm text-red-400">Oturumu Kapat</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[10px] text-gray-600">
          TarpoVizyon © 2024 TARPOL
        </p>
        <p className="text-[9px] text-gray-700 mt-0.5">
          Tarım İstihbarat Platformu
        </p>
      </div>
    </div>
  );
}

// ── Helper Component ───────────────────────────────────

function SettingsRow({
  icon: Icon,
  iconColor,
  label,
  value,
  showArrow,
}: {
  icon: typeof Bell;
  iconColor: string;
  label: string;
  value: string;
  showArrow?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50 border border-white/5">
      <div className="flex items-center gap-3">
        <Icon size={18} className={iconColor} />
        <span className="text-sm text-gray-200">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {value && <span className="text-xs text-gray-500">{value}</span>}
        {showArrow && <ChevronRight size={16} className="text-gray-600" />}
      </div>
    </div>
  );
}
