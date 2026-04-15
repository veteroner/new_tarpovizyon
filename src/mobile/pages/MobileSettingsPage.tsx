import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Bell, BellOff, Moon, Globe, Info,
  ChevronRight, Shield, Smartphone, FileText,
  LogOut, Database, Trash2,
} from 'lucide-react';
import { getAppInfo } from '../capacitor/app';
import { isPlatform } from '../utils/platform';

/**
 * Ayarlar Tab Page — Settings, notifications, about
 */

interface SettingToggle {
  key: string;
  label: string;
  description: string;
  icon: typeof Bell;
  iconColor: string;
}

const notificationSettings: SettingToggle[] = [
  {
    key: 'market_alerts',
    label: 'Piyasa Bildirimleri',
    description: 'Fiyat değişikliklerinde bildirim al',
    icon: Bell,
    iconColor: 'text-amber-400',
  },
  {
    key: 'weather_alerts',
    label: 'Hava Durumu Uyarıları',
    description: 'Kritik hava olaylarında bildirim al',
    icon: Bell,
    iconColor: 'text-sky-400',
  },
  {
    key: 'weekly_digest',
    label: 'Haftalık Özet',
    description: 'Her Pazartesi haftalık rapor al',
    icon: Bell,
    iconColor: 'text-purple-400',
  },
];

export default function MobileSettingsPage() {
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

  const navigate = useNavigate();

  const offlineDataSize = useMemo(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const val = localStorage.getItem(key) || '';
        total += key.length + val.length;
      }
      const kb = Math.round(total * 2 / 1024); // UTF-16 approx
      return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
    } catch {
      return '--';
    }
  }, []);

  const handleToggle = (key: string) => {
    const newValue = !toggles[key];
    setToggles((prev) => ({ ...prev, [key]: newValue }));
  };

  return (
    <div className="page-container bg-emerald-50">
      {/* Header */}
      <header className="px-5 pt-safe pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-500/15 flex items-center justify-center">
            <Settings size={22} className="text-slate-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Ayarlar</h1>
            <p className="text-[10px] text-slate-400">Tercihler & Bilgi</p>
          </div>
        </div>
      </header>

      {/* Notification Settings */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Bildirimler
        </h2>

        {!isPlatform('capacitor') && (
          <div className="mb-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2">
              <BellOff size={16} className="text-blue-400" />
              <p className="text-xs text-blue-300">
                Web ortamında bildirimler sınırlıdır.
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
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={setting.iconColor} />
                  <div>
                    <p className="text-sm text-slate-700">{setting.label}</p>
                    <p className="text-[10px] text-slate-400">{setting.description}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(setting.key)}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors duration-200
                    ${toggles[setting.key] ? 'bg-emerald-500' : 'bg-gray-700'}
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

      {/* General Settings */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Genel
        </h2>

        <div className="space-y-1">
          <SettingsRow icon={Moon} iconColor="text-emerald-400" label="Tema" value="Açık (Yeşil)" />
          <SettingsRow icon={Globe} iconColor="text-sky-400" label="Dil" value="Türkçe" />
          <SettingsRow icon={Database} iconColor="text-green-400" label="Çevrimdışı Veri" value={offlineDataSize} />
        </div>
      </section>

      {/* About */}
      <section className="px-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Hakkında
        </h2>

        <div className="space-y-1">
          <button onClick={() => navigate('/rasyon/privacy')} className="w-full">
            <SettingsRow icon={Shield} iconColor="text-emerald-500" label="Gizlilik Politikası" value="" showArrow />
          </button>

          <button onClick={() => navigate('/rasyon/terms')} className="w-full">
            <SettingsRow icon={FileText} iconColor="text-blue-500" label="Kullanım Şartları" value="" showArrow />
          </button>

          <SettingsRow
            icon={Smartphone}
            iconColor="text-slate-500"
            label="Versiyon"
            value={`v${appVersion} (${buildNumber})`}
          />

          <SettingsRow icon={Info} iconColor="text-indigo-400" label="Lisanslar" value="" showArrow />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="px-5 mb-8">
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 tap-active">
            <Trash2 size={18} className="text-orange-400" />
            <span className="text-sm text-orange-400">Önbelleği Temizle</span>
          </button>

          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-red-500/10 tap-active">
            <LogOut size={18} className="text-red-400" />
            <span className="text-sm text-red-400">Oturumu Kapat</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[10px] text-slate-400">
          TarpoVizyon © 2025 TARPOL
        </p>
        <p className="text-[9px] text-slate-500 mt-0.5">
          Tarım Komuta Merkezi
        </p>
      </div>
    </div>
  );
}

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
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
      <div className="flex items-center gap-3">
        <Icon size={18} className={iconColor} />
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {value && <span className="text-xs text-slate-400">{value}</span>}
        {showArrow && <ChevronRight size={16} className="text-slate-400" />}
      </div>
    </div>
  );
}
