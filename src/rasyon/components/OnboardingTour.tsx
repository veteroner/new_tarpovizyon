import { useEffect, useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps, Step } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import { TOUR_COMPLETED_KEY, markOnboardingCompleted } from '@/utils/onboardingHelpers';
import { useAppConfig } from '@/contexts/ConfigContext';

interface OnboardingTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export default function OnboardingTour({ run = false, onComplete }: OnboardingTourProps) {
  const config = useAppConfig()
  const [runTour, setRunTour] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Sadece ana sayfada ve tour tamamlanmamışsa başlat
    if (location.pathname === '/rasyon/wizard/mode' && run) {
      const hasCompletedTour = localStorage.getItem(TOUR_COMPLETED_KEY);
      if (!hasCompletedTour) {
        // Kısa bir gecikme ile başlat (sayfa render olduktan sonra)
        setTimeout(() => setRunTour(true), 1000);
      }
    }
  }, [location.pathname, run]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">🎉 {config.appName}'a Hoş Geldiniz!</h2>
          <p className="text-gray-700 mb-3">
            Bu hızlı tur ile 2 dakikada rasyon hesaplama sistemini öğreneceksiniz.
          </p>
          <p className="text-sm text-gray-600">
            İpucu: Turu istediğiniz zaman ESC ile kapatabilirsiniz.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="wizard-mode"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">📋 Mod Seçimi</h3>
          <p className="text-sm">
            <strong>Manuel Mod:</strong> Tüm parametreleri kendiniz kontrol edersiniz.<br />
            <strong>Otomatik Mod:</strong> Sistem sizin için önerilerde bulunur.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Yeni başlayanlar için Manuel Mod önerilir.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="help-link"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">❓ Yardım Bölümü</h3>
          <p className="text-sm">
            Takıldığınız her an buradan detaylı kullanım kılavuzu, SSS ve 
            sorun giderme rehberine ulaşabilirsiniz.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="feed-library"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">🌾 Yem Kütüphanesi</h3>
          <p className="text-sm">
            86+ hazır yem verisi + kendi özel yemlerinizi ekleyebilirsiniz.
            CSV toplu içe aktarma desteklenir.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="backup-link"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">💾 Veri Yedekleme</h3>
          <p className="text-sm text-orange-700 mb-2">
            <strong>ÖNEMLİ:</strong> Verileriniz tarayıcınızda saklanır!
          </p>
          <p className="text-sm">
            Düzenli olarak buradan JSON yedek alın. Cihaz değişikliklerinde 
            verilerinizi kaybetmezsiniz.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">✅ Hazırsınız!</h2>
          <p className="text-gray-700 mb-3">
            Şimdi <strong>"Yeni Rasyon"</strong> butonuna tıklayarak ilk rasyonunuzu 
            hesaplayabilirsiniz.
          </p>
          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="font-semibold text-blue-900 mb-1">5 Adımda İlk Rasyon:</p>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Hayvan bilgilerini girin</li>
              <li>En az 5-6 yem seçin</li>
              <li>Hedef belirleyin (Maliyet/Besin)</li>
              <li>"Hesapla" butonuna basın</li>
              <li>Sonucu inceleyin & kaydedin</li>
            </ol>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Bu turu tekrar görmek isterseniz: Ayarlar → "Başlangıç Turunu Göster"
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      markOnboardingCompleted();
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb', // blue-600
          zIndex: 10000,
        },
        tooltip: {
          fontSize: 14,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: 14,
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: 13,
        },
      }}
      locale={{
        back: 'Geri',
        close: 'Kapat',
        last: 'Bitir',
        next: 'Sonraki',
        skip: 'Atla',
      }}
    />
  );
}
