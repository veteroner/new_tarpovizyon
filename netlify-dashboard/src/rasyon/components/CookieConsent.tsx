import { useState } from 'react';
import { trackingConsent } from '../utils/trackingConsent';
import { useAppConfig } from '@/contexts/ConfigContext';

/**
 * Cookie Consent Banner - KVKK/GDPR Compliance
 * 
 * Kullanıcı ilk ziyarette analytics'i kabul/reddetmeli.
 * Tercih localStorage'da saklanır.
 */
export function CookieConsent() {
  const config = useAppConfig()
  // Lazy init: mount anında tercih kontrol edilir, useEffect gereksiz extra render'ı önler
  const [show, setShow] = useState(() => trackingConsent.getConsent() === null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleAccept = () => {
    trackingConsent.setConsent(true);
    setShow(false);
    window.location.reload(); // Analytics'i aktif et
  };

  const handleReject = () => {
    trackingConsent.setConsent(false);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              🍪 Çerez Kullanımı ve Gizlilik
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {config.appName}'da deneyiminizi iyileştirmek için çerezler kullanıyoruz.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            Uygulamamız şu amaçlarla çerez ve yerel depolama kullanır:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Zorunlu:</strong> Oturum yönetimi, kullanıcı tercihleri (reddedilemez)</li>
            <li><strong>Analitik:</strong> Google Analytics ile kullanım istatistikleri (anonim)</li>
            <li><strong>Hata Takibi:</strong> Sentry ile uygulama hatalarını tespit etme</li>
          </ul>

          {/* Detaylı bilgi toggle */}
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {detailsOpen ? '▼ Detayları gizle' : '▶ Detaylı bilgi'}
          </button>

          {detailsOpen && (
            <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-2 text-xs">
              <div>
                <strong>Zorunlu Çerezler (Her zaman aktif):</strong>
                <p className="text-gray-600 mt-1">
                  - <code>tour_completed</code>: Onboarding turu tamamlandı mı?<br />
                  - <code>user_mode</code>: Hayvan türü seçimi (beef/dairy)<br />
                  - <code>ration_history</code>: Kayıtlı rasyonlar (localStorage)<br />
                  - <code>feed_inventory</code>: Yem envanteri (localStorage)
                </p>
              </div>
              <div>
                <strong>Analitik Çerezler (Kabul edilebilir):</strong>
                <p className="text-gray-600 mt-1">
                  - <code>_ga</code>, <code>_ga_*</code>: Google Analytics (anonim kullanım istatistikleri)<br />
                  - Toplanan veriler: Sayfa görüntüleme, tıklama olayları, oturum süresi<br />
                  - IP adresi: Anonimleştirilir (son oktet maskelenir)
                </p>
              </div>
              <div>
                <strong>Hata Takibi (Kabul edilebilir):</strong>
                <p className="text-gray-600 mt-1">
                  - Sentry: Uygulama hataları ve performans metrikleri<br />
                  - Toplanan veriler: Hata stack trace, tarayıcı bilgisi, URL<br />
                  - Kişisel veri: Loglanmaz (PII filtering aktif)
                </p>
              </div>
              <div className="pt-2 border-t border-gray-300">
                <strong>Haklarınız:</strong>
                <p className="text-gray-600 mt-1">
                  - Analitik çerezleri reddetme hakkı<br />
                  - Verilerinizi silme talebi ({config.contact?.email || 'destek email'})<br />
                  - Tercihlerinizi değiştirme (Ayarlar sayfası)
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Daha fazla bilgi için{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
              Gizlilik Politikası
            </a>
            'nı inceleyebilirsiniz.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Sadece Zorunlu Çerezler
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Tümünü Kabul Et
          </button>
        </div>

        {/* Fine print */}
        <p className="text-xs text-gray-400 text-center">
          "Tümünü Kabul Et" seçeneği ile analitik ve hata takibi çerezlerini kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
