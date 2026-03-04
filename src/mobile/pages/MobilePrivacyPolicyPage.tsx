import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft } from 'lucide-react';

/**
 * Gizlilik Politikası Sayfası — TarpoRasyon
 */
export default function MobilePrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 pt-safe pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center tap-active"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-600" />
            <h1 className="text-base font-bold text-slate-800">Gizlilik Politikası</h1>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Intro */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Son güncelleme: Mart 2026</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            TarpoRasyon uygulaması, TARPOL tarafından geliştirilmiş ve
            kullanıcı gizliliğine saygı göstermeyi taahhüt eden bir tarımsal
            karar destek sistemidir.
          </p>
        </div>

        {/* Section 1 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">1. Toplanan Veriler</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              Uygulama, aşağıdaki verileri yalnızca cihazınızda yerel olarak saklar:
            </p>
            <ul className="space-y-1.5 mt-2">
              {[
                'Oluşturduğunuz rasyon formülleri ve hesaplamaları',
                'Yem kütüphanesi tercihleri ve fiyat girişleri',
                'Uygulama ayarları ve bildirim tercihleri',
                'Seçilen hayvan türü ve hedef değerleri',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">2. Veri Paylaşımı</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Kişisel verileriniz üçüncü taraflarla <span className="font-semibold text-emerald-700">paylaşılmaz</span>,
              satılmaz veya kiralanmaz. Uygulama içindeki yapay zeka
              özelliği, yalnızca girdiğiniz metin sorgusunu işler; hayvan
              ve rasyon verilerinizi sunucuya göndermez.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">3. Üçüncü Taraf Hizmetler</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            {[
              {
                name: 'OpenWeatherMap',
                desc: 'Hava durumu verisi için konum bilgisi (şehir adı) iletilir. IP tabanlı konum kullanılabilir.',
              },
              {
                name: 'Yahoo Finance',
                desc: 'Emtia piyasa fiyatları için anonim olarak sorgulanır. Kişisel veri iletilmez.',
              },
              {
                name: 'TARPOL API',
                desc: 'Tarımsal istatistik verileri için anonim sorgular gönderilir.',
              },
            ].map((s) => (
              <div key={s.name}>
                <p className="text-xs font-semibold text-slate-700 mb-1">{s.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">4. Veri Güvenliği</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Tüm veriler cihazınızın yerel depolama alanında (localStorage /
              SQLite) şifrelenmeden saklanır. Uygulamayı sildiğinizde tüm
              yerel veriler de silinir. Yedekleme sorumluluğu kullanıcıya
              aittir.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">5. Çocukların Gizliliği</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Uygulama, 13 yaş altı çocuklara yönelik değildir ve bu
              yaştaki bireylerden bilerek veri toplanmaz.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">6. İletişim</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Gizlilik politikasına ilişkin sorularınız için:
            </p>
            <p className="text-sm font-medium text-emerald-700 mt-2">
              iletisim@tarpol.org.tr
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-[10px] text-slate-400">
            © 2026 TARPOL · TarpoRasyon v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
