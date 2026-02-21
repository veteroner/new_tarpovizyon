import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, FileText, Video, Mail, Github } from 'lucide-react';
import { useAppConfig } from '@/contexts/ConfigContext';

export default function HelpPage() {
  const config = useAppConfig()
  
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📖 Yardım & Dokümantasyon
        </h1>
        <p className="text-gray-600">
          {config.appName} Hesaplama Sistemi'ni kullanmak için ihtiyacınız olan tüm bilgiler burada
        </p>
      </div>

      {/* Quick Start Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
          <BookOpen size={24} />
          🚀 Hızlı Başlangıç
        </h2>
        <p className="text-blue-800 mb-4">
          İlk rasyonunuzu 5 dakikada hesaplayın:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-blue-900">
          <li><strong>Yeni Rasyon</strong> butonuna tıklayın</li>
          <li><strong>Hayvan bilgilerini</strong> girin (ağırlık, süt verimi, laktasyon günü)</li>
          <li><strong>En az 5-6 yem</strong> seçin (kaba yem + tahıl + protein + mineral)</li>
          <li><strong>Hedef seçin</strong> (Maliyet veya Besin Değeri Optimizasyonu)</li>
          <li><strong>"Hesapla"</strong> butonuna basın → Sonuç gelir!</li>
        </ol>
        <Link
          to="/rasyon/wizard/animal"
          className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Hemen Başla →
        </Link>
      </div>

      {/* Documentation Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Guide */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="text-green-600" size={32} />
            <h3 className="text-xl font-bold text-gray-900">Kullanıcı Kılavuzu</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Tüm özelliklerin detaylı açıklaması, adım adım rehber, örnek kullanımlar
          </p>
          <a
            href="https://github.com/veteroner/teknovarasyon/blob/main/USER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Kılavuzu Aç →
          </a>
        </div>

        {/* FAQ */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="text-purple-600" size={32} />
            <h3 className="text-xl font-bold text-gray-900">Sıkça Sorulan Sorular</h3>
          </div>
          <p className="text-gray-600 mb-4">
            En çok sorulan 50+ soru ve detaylı cevaplar, sorun giderme ipuçları
          </p>
          <a
            href="https://github.com/veteroner/teknovarasyon/blob/main/FAQ.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            SSS'yi Gör →
          </a>
        </div>

        {/* Features */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="text-orange-600" size={32} />
            <h3 className="text-xl font-bold text-gray-900">Özellik Listesi</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Tüm özellikler, teknik detaylar, bilimsel standartlar (NRC 2021)
          </p>
          <a
            href="https://github.com/veteroner/teknovarasyon/blob/main/FEATURES.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Özellikleri İncele →
          </a>
        </div>

        {/* Video Tutorials (placeholder) */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <Video className="text-red-600" size={32} />
            <h3 className="text-xl font-bold text-gray-900">Video Eğitimler</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Adım adım video rehberler (yakında eklenecek)
          </p>
          <span className="text-gray-400 font-medium">
            Çok Yakında...
          </span>
        </div>
      </div>

      {/* Common Issues */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
          <HelpCircle size={24} />
          ⚠️ Sık Karşılaşılan Sorunlar
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-yellow-900 mb-1">
              ❌ "Rasyon bulunamadı" hatası alıyorum
            </h3>
            <p className="text-yellow-800 text-sm">
              <strong>Çözüm:</strong> Yem kısıtlarını gevşetin (min/max aralıklarını genişletin), 
              daha fazla yem ekleyin (en az 6-8 yem), bütçe sınırını kaldırın veya artırın.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-900 mb-1">
              ⚠️ Yüksek asidoz riski uyarısı
            </h3>
            <p className="text-yellow-800 text-sm">
              <strong>Çözüm:</strong> Tahıl oranını azaltın (%20-25 ideal), kaba yem (yonca/ot) artırın, 
              NDF hedefini {'>'}30% yapın, buffer (sodyum bikarbonat) ekleyin.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-900 mb-1">
              💾 Verilerim kayboldu
            </h3>
            <p className="text-yellow-800 text-sm">
              <strong>Çözüm:</strong> Son yedeği geri yükleyin (Veri Yedekleme → İçe Aktar). 
              <strong>Önlem:</strong> Rutin yedekleme alışkanlığı edinin (haftada 1 kez).
            </p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-900 mb-1">
              📱 Mobil cihazda tablolar sığmıyor
            </h3>
            <p className="text-yellow-800 text-sm">
              <strong>Çözüm:</strong> Telefonu yatay çevirin (landscape), parmak hareketiyle kaydırın, 
              veya tablet/desktop kullanın (detaylı analiz için önerilir).
            </p>
          </div>
        </div>
      </div>

      {/* Scientific Info */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          🔬 Bilimsel Temeller
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">NRC 2021 Standardı</h3>
            <p className="text-gray-600 text-sm mb-2">
              ABD Ulusal Araştırma Konseyi'nin en güncel (8. baskı) süt sığırı besin 
              gereksinimleri standardı. Dünya çapında kabul görmüş bilimsel referans.
            </p>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Metabolik Protein (MP) + Amino Asitler</li>
              <li>Net Enerji Laktasyon (NEL) detaylı hesap</li>
              <li>14 mineral + 8 vitamin</li>
              <li>Gebelik trimester bazlı düzeltme</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">GLPK Optimizasyon</h3>
            <p className="text-gray-600 text-sm mb-2">
              GNU Linear Programming Kit - En yaygın kullanılan açık kaynak 
              doğrusal programlama kütüphanesi.
            </p>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Simplex Method (klasik LP)</li>
              <li>Interior Point Method (büyük problemler)</li>
              <li>0.01 kg hassasiyetinde çözüm</li>
              <li>1-5 saniyede optimal rasyon</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Support & Contact */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📞 Destek & İletişim
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Github size={20} />
              GitHub
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              Hata bildirimi, özellik önerisi, kod katkısı
            </p>
            <a
              href="https://github.com/veteroner/teknovarasyon/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Yeni Issue Aç →
            </a>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail size={20} />
              E-posta
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              Teknik destek ve genel sorular
            </p>
            <a
              href="mailto:info@teknova.vet"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              info@teknova.vet
            </a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            <strong>Açık Kaynak:</strong> MIT License - Ticari/akademik kullanım serbesttir. 
            <a
              href="https://github.com/veteroner/teknovarasyon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 ml-1"
            >
              Kaynak kodunu görüntüle →
            </a>
          </p>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div className="mt-8 p-4 bg-gray-100 border border-gray-300 rounded-lg">
        <p className="text-gray-600 text-sm">
          <strong>⚠️ Sorumluluk Reddi:</strong> Bu yazılım bilimsel hesaplamalar yapar ancak 
          veteriner tavsiyesi yerini tutmaz. Rasyon uygulamadan önce bir veteriner hekim 
          veya beslenme uzmanı ile görüşünüz.
        </p>
      </div>

      {/* Back to Home */}
      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
        >
          ← Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
