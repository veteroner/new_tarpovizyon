import { Link } from 'react-router-dom'

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Kullanım Şartları
      </h1>
      
      <p className="text-sm text-gray-500 mb-8">
        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Kabul</h2>
          <p className="text-gray-600 mb-4">
            TARPOL Rasyon uygulamasını ("Uygulama") kullanarak, bu Kullanım Şartlarını 
            kabul etmiş sayılırsınız. Kabul etmiyorsanız, lütfen Uygulamayı kullanmayınız.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Hizmet Tanımı</h2>
          <p className="text-gray-600 mb-4">
            TARPOL Rasyon, büyükbaş ve küçükbaş hayvanlar için rasyon hesaplama ve 
            optimizasyon aracıdır. Uygulama şunları sağlar:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>NRC 2021 standartlarına dayalı beslenme hesaplamaları</li>
            <li>Yem kütüphanesi ve maliyet analizi</li>
            <li>Rasyon optimizasyonu (LP/MIP algoritmaları)</li>
            <li>PDF ve Excel dışa aktarma</li>
            <li>AI destekli açıklamalar</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Kullanım Koşulları</h2>
          <p className="text-gray-600 mb-4">Kullanıcılar aşağıdaki kurallara uymayı kabul eder:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Uygulamayı yalnızca yasal amaçlarla kullanmak</li>
            <li>Uygulamayı tersine mühendislik yapmamak</li>
            <li>Uygulamanın güvenliğini tehlikeye atmamak</li>
            <li>Diğer kullanıcıların erişimini engelleyecek eylemlerden kaçınmak</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Sorumluluk Reddi</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-yellow-800 font-medium">⚠️ Önemli Uyarı</p>
          </div>
          <p className="text-gray-600 mb-4">
            <strong>Uygulama "olduğu gibi" sunulmaktadır.</strong> Hesaplamalar NRC 2021 
            standartlarına dayanmakla birlikte:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>
              <strong>Veteriner tavsiyesi yerine geçmez:</strong> Tüm rasyon kararları 
              veteriner hekim veya uzman zooteknici danışmanlığında alınmalıdır.
            </li>
            <li>
              <strong>Yerel koşullar değişebilir:</strong> Yem besin değerleri ve hayvan 
              ihtiyaçları coğrafya, mevsim ve işletme koşullarına göre farklılık gösterebilir.
            </li>
            <li>
              <strong>Sonuçlar garantili değildir:</strong> Hesaplama hataları, veri giriş 
              hataları veya beklenmedik durumlar için sorumluluk kabul edilmez.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Fikri Mülkiyet</h2>
          <p className="text-gray-600 mb-4">
            Uygulama ve içeriği (kod, tasarım, algoritmalar) MIT Lisansı altında sunulmaktadır. 
            Detaylar için <a href="https://github.com/tarpol/rasyon/blob/main/LICENSE" 
            className="text-green-600 hover:underline" target="_blank" rel="noopener noreferrer">
            LICENSE</a> dosyasına bakınız.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Sınırlı Garanti</h2>
          <p className="text-gray-600 mb-4">
            TARPOL, Uygulamanın kesintisiz veya hatasız çalışacağını garanti etmez. 
            Uygulamanın kullanımından doğabilecek doğrudan veya dolaylı zararlardan 
            sorumlu tutulamaz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Üçüncü Taraf Hizmetler</h2>
          <p className="text-gray-600 mb-4">
            Uygulama aşağıdaki üçüncü taraf hizmetleri kullanabilir:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Hugging Face API (AI açıklamaları)</li>
            <li>Netlify (hosting)</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Bu hizmetlerin kendi kullanım şartları ve gizlilik politikaları geçerlidir.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Değişiklikler</h2>
          <p className="text-gray-600">
            Bu Kullanım Şartları önceden haber vermeksizin değiştirilebilir. 
            Değişiklikler yayınlandığı andan itibaren geçerli olacaktır.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Uygulanacak Hukuk</h2>
          <p className="text-gray-600">
            Bu Kullanım Şartları Türkiye Cumhuriyeti kanunlarına tabidir. 
            Uyuşmazlıklarda Türkiye mahkemeleri yetkilidir.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">10. İletişim</h2>
          <p className="text-gray-600">
            Sorularınız için: <a href="mailto:info@tarpol.com.tr" className="text-green-600 hover:underline">
              info@tarpol.com.tr
            </a>
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
        <Link 
          to="/" 
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← Ana Sayfaya Dön
        </Link>
        <Link 
          to="/rasyon/privacy" 
          className="text-gray-500 hover:text-gray-700"
        >
          Gizlilik Politikası
        </Link>
      </div>
    </div>
  )
}
