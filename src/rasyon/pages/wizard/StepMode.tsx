import { useNavigate } from 'react-router-dom'
import { Sparkles, Settings2 } from 'lucide-react'
import { useRationWizardStore } from '@/store/rationWizardStore'

export default function StepMode() {
  const navigate = useNavigate()
  const setMode = useRationWizardStore((s) => s.setMode)

  const handleModeSelect = (mode: 'auto' | 'manual') => {
    setMode(mode)
    if (mode === 'auto') {
      navigate('/rasyon/wizard/auto-goal')
    } else {
      navigate('/rasyon/wizard/animal')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Rasyon Oluşturma Yöntemi</h2>
        <p className="text-gray-600">
          Rasyonunuzu nasıl oluşturmak istersiniz?
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto" data-tour="wizard-mode">
        {/* Otomatik Mod */}
        <button
          type="button"
          onClick={() => handleModeSelect('auto')}
          className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-8 text-left transition-all hover:border-primary-500 hover:shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-50 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Otomatik Hesaplama
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Sadece yemleri seçin ve fiyatları girin. Program sizin için en uygun rasyonu otomatik olarak hesaplar.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <span>Hızlı ve kolay</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <span>Yem seçimi ve fiyat girişi</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <span>Otomatik optimizasyon</span>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 group-hover:gap-3 transition-all">
              Devam Et
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Manuel Mod */}
        <button
          type="button"
          onClick={() => handleModeSelect('manual')}
          className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-8 text-left transition-all hover:border-blue-500 hover:shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <Settings2 className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Manuel Düzenleme
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Hayvan seçimi yapın, yemleri belirleyin, rasyonu kendiniz düzenleyin. İhtiyaç duyduğunuzda program otomatik çözüm önerir.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span>Tam kontrol</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span>Hayvan ve hedef belirleme</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span>Elle düzenleme + otomatik yardım</span>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all">
              Devam Et
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          İstediğiniz zaman başa dönüp modu değiştirebilirsiniz.
        </p>
      </div>
    </div>
  )
}
