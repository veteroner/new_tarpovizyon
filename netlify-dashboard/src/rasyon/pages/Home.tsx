import { useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Shield, Zap, BarChart3, FileText } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Hayvan Rasyonlarını
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> Bilimsel </span>
            ve
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> Ekonomik </span>
            Hesaplayın
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            NRC 2021 standartlarına uygun, yapay zeka destekli rasyon optimizasyonu.
            Süt, besi, büyütme ve kuru dönem için dakikalar içinde dengeli rasyon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/rasyon/wizard/mode')}
              className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Hemen Başla
            </button>
            <button
              onClick={() => navigate('/rasyon/help')}
              className="btn-secondary text-lg px-8 py-4 inline-flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Nasıl Çalışır?
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Destekli Optimizasyon</h3>
            <p className="text-gray-600">
              Yapay zeka ile yemleri analiz edin, alternatif öneriler alın ve rasyonunuzu açıklayın.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Maliyet Analizi</h3>
            <p className="text-gray-600">
              Günlük rasyon maliyeti, kg süt/et başına maliyet, aylık toplam gider otomatik hesaplanır.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Analizi</h3>
            <p className="text-gray-600">
              SARA, ketozis, şişkinlik, mineral dengesizlik gibi sağlık risklerini otomatik tespit edin.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hızlı & Offline</h3>
            <p className="text-gray-600">
              Tüm hesaplamalar tarayıcınızda çalışır. İnternet bağlantısı gereksiz, anında sonuç.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">85+ Türk Yemi</h3>
            <p className="text-gray-600">
              Türkiye'de yaygın kullanılan yerleşik yem veritabanı. CSV/JSON ile kendi yemlerinizi ekleyin.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF & Excel Export</h3>
            <p className="text-gray-600">
              Rasyonlarınızı profesyonel PDF veya Excel formatında indirin, paylaşın.
            </p>
          </div>
        </div>

        {/* Supported Animals */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Desteklenen Hayvanlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">🐄</span>
                Büyükbaş
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Süt İnekleri (Holstein, Simental, Brown Swiss, Jersey)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Besi Sığırları (Büyütme, Finisher)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Kuru Dönem & Gebelik</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">🐑</span>
                Küçükbaş
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Koyun (Merino, Akkaraman, Yerli)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Keçi (Saanen, Yerli)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Süt & Besi Amaçlı</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Şimdi Deneyin - Tamamen Ücretsiz</h2>
          <p className="text-lg mb-6 opacity-90">
            Kayıt gereksiz. Hesaplamalar tarayıcınızda çalışır, verileriniz sizde kalır.
          </p>
          <button
            onClick={() => navigate('/rasyon/wizard/mode')}
            className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Rasyon Hesaplamaya Başla
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>
            NRC 2021 (National Research Council) standartlarına uygun bilimsel hesaplamalar.
            <br />
            Tüm hesaplamalar tarayıcınızda çalışır, hiçbir veri sunucuya gönderilmez.
          </p>
        </div>
      </div>
    </div>
  )
}
