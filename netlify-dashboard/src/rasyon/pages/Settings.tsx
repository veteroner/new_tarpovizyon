import { BookOpen, Play, RotateCcw } from 'lucide-react';
import { resetOnboardingTour, isOnboardingCompleted } from '@/utils/onboardingHelpers';
import { useState } from 'react';
import { admobRewarded } from '@/services/ads/admobRewarded'
import { useUIStore } from '@/store/uiStore'
import { pushNotifications } from '@/services/push/pushNotifications'

export default function SettingsPage() {
  // Lazy init: mount anında storage'dan oku
  const [tourCompleted, setTourCompleted] = useState(() => isOnboardingCompleted());
  const showToast = useUIStore((s) => s.showToast)

  const handleResetTour = () => {
    resetOnboardingTour();
    setTourCompleted(false);
    alert('✅ Başlangıç turu sıfırlandı! Ana sayfayı yenilediğinizde tur tekrar başlayacak.');
  };

  const handleStartTour = () => {
    resetOnboardingTour();
    window.location.href = '/rasyon/wizard/mode';
  };

  const handleWatchAd = async () => {
    const shown = await admobRewarded.showRewardedAd({
      placement: 'settings_support',
      onReward: () => {
        showToast({
          type: 'success',
          message: '🙏 Teşekkürler! Desteğiniz için sağ olun.',
        })
      },
    })

    if (!shown) {
      showToast({
        type: 'info',
        message: 'Reklam şu an kullanılamıyor (web/test ayarı).',
      })
    }
  }

  const handleEnablePush = async () => {
    const result = await pushNotifications.enable()

    if (result.ok) {
      showToast({
        type: 'success',
        message: '🔔 Bildirimler açıldı.',
      })
      return
    }

    if (result.reason === 'not-native') {
      showToast({
        type: 'info',
        message: 'Bildirimler yalnızca iOS/Android uygulamasında kullanılabilir.',
      })
      return
    }

    if (result.reason === 'permission-denied') {
      showToast({
        type: 'warning',
        message: 'Bildirim izni verilmedi. Ayarlar’dan izin verebilirsiniz.',
      })
      return
    }

    showToast({
      type: 'error',
      message: 'Bildirimler etkinleştirilemedi. Lütfen tekrar deneyin.',
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Ayarlar
        </h1>
        <p className="text-gray-600">
          Uygulama tercihlerinizi yönetin
        </p>
      </div>

      {/* Onboarding Section */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen size={24} />
          Başlangıç Turu
        </h2>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-gray-700 mb-2">
                İlk kullanım için hazırlanan interaktif rehber turu
              </p>
              <p className="text-sm text-gray-600">
                Durum: {tourCompleted ? (
                  <span className="text-green-600 font-medium">✅ Tamamlandı</span>
                ) : (
                  <span className="text-orange-600 font-medium">⏳ Henüz görüntülenmedi</span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              {tourCompleted ? (
                <button
                  onClick={handleResetTour}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  <RotateCcw size={18} />
                  Sıfırla
                </button>
              ) : (
                <button
                  onClick={handleStartTour}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Play size={18} />
                  Başlat
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-1">📖 Tur İçeriği:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mod seçimi (Manuel / Otomatik)</li>
              <li>Yardım bölümü kullanımı</li>
              <li>Yem kütüphanesi tanıtımı</li>
              <li>Veri yedekleme önemi</li>
              <li>5 adımda ilk rasyon</li>
            </ul>
          </div>
        </div>
      </div>

      {/* General Settings (placeholder) */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 opacity-60">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          🔧 Genel Ayarlar
        </h2>
        <p className="text-gray-600 text-sm">
          Yakında eklenecek: Tema seçimi, dil ayarları, bildirim tercihleri...
        </p>
      </div>

      {/* Notifications */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🔔 Bildirimler
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Stok uyarıları ve güncellemeler için bildirimleri açabilirsiniz.
        </p>
        <button
          onClick={handleEnablePush}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Bildirimleri Aç
        </button>
      </div>

      {/* Support Section */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          💛 Destek
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Uygulamayı ücretsiz tutmak için isterseniz bir reklam izleyerek destek olabilirsiniz.
        </p>
        <button
          onClick={handleWatchAd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Reklam İzle
        </button>
      </div>
    </div>
  );
}
