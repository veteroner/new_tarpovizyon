import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Gizlilik Politikası ve KVKK Aydınlatma Metni
      </h1>
      
      <p className="text-sm text-gray-500 mb-8">
        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Giriş</h2>
          <p className="text-gray-600 mb-4">
            Teknova Rasyon uygulaması ("Uygulama"), kullanıcılarının gizliliğine saygı gösterir. 
            Bu Gizlilik Politikası, Uygulama'nın kişisel verileri nasıl topladığını, kullandığını 
            ve koruduğunu açıklamaktadır.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Toplanan Veriler</h2>
          <p className="text-gray-600 mb-4">Uygulama aşağıdaki verileri işleyebilir:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Rasyon Verileri:</strong> Hayvan profilleri, yem karışımları, beslenme hesaplamaları</li>
            <li><strong>Teknik Veriler:</strong> Tarayıcı tipi, cihaz bilgisi, IP adresi (anonim)</li>
            <li><strong>Kullanım Verileri:</strong> Uygulama içi etkileşimler (anonim analitik)</li>
          </ul>
          <p className="text-gray-600 mt-4">
            <strong>Önemli:</strong> Tüm rasyon verileri yalnızca tarayıcınızın yerel depolamasında 
            (localStorage) saklanır. Sunucularımıza kişisel veri gönderilmez.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. AI Özelliği ve Üçüncü Taraf Hizmetler</h2>
          <p className="text-gray-600 mb-4">
            Uygulama, yapay zeka destekli açıklama özelliği için üçüncü taraf API'ler kullanabilir:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Hugging Face API - rasyon açıklamaları için</li>
            <li>Bu hizmetlere gönderilen veriler anonim ve hayvan besleme ile ilgilidir</li>
            <li>Kişisel tanımlayıcı bilgi paylaşılmaz</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Çerezler (Cookies)</h2>
          <p className="text-gray-600 mb-4">
            Uygulama, temel işlevsellik için yalnızca gerekli çerezleri kullanır:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Oturum yönetimi</li>
            <li>Kullanıcı tercihleri (tema, dil)</li>
            <li>PWA durumu</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Pazarlama veya izleme çerezleri kullanılmamaktadır.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. KVKK Kapsamında Haklarınız</h2>
          <p className="text-gray-600 mb-4">
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
            <li>KVKK madde 7'deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Veri Güvenliği</h2>
          <p className="text-gray-600 mb-4">
            Verilerinizi korumak için aşağıdaki önlemleri alıyoruz:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>HTTPS ile şifreli bağlantı</li>
            <li>Yerel depolama (sunucu tarafında veri saklanmaz)</li>
            <li>Minimum veri toplama ilkesi</li>
            <li>Düzenli güvenlik güncellemeleri</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">7. İletişim</h2>
          <p className="text-gray-600 mb-4">
            Gizlilik ile ilgili sorularınız için:
          </p>
          <p className="text-gray-600">
            E-posta: <a href="mailto:privacy@teknova.com.tr" className="text-green-600 hover:underline">
              privacy@teknova.com.tr
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Değişiklikler</h2>
          <p className="text-gray-600">
            Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler 
            uygulama içinde bildirilecektir.
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link 
          to="/" 
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}
