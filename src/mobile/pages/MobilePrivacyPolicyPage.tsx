import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft } from 'lucide-react';

/**
 * Gizlilik Politikası — TarpoVizyon.
 *
 * Metin UYDURULMADI: uygulamanın gerçekte ne gönderdiği ölçülerek yazıldı.
 * OneSignal aktif (abonelik kimliği + jeton), AI sorusu Worker üzerinden
 * sağlayıcıya gidiyor, hava durumu SEÇİLEN İLİN sabit koordinatını yolluyor
 * (konum izni yok), ses tanıma cihazın OS servisini kullanıyor. Analitik ve
 * çökme raporlama pakette YOK — GA anahtarı tanımsız, Sentry tree-shake
 * edilmiş; ikisi de derlenen pakette doğrulandı.
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
          <p className="text-xs text-slate-500 mb-1">Son güncelleme: Eylül 2026</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            TarpoVizyon, TARPOL tarafından geliştirilen bir tarımsal veri ve
            istatistik uygulamasıdır. Uygulamayı kullanmak için hesap açmanız
            gerekmez; kimliğinizi belirleyen bir bilgi istenmez.
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
                'Uygulama tercihleri (tema, dil, asistan sesi seçimi)',
                'Görüntülenen verilerin geçici önbelleği',
                'Son bakılan sayfa ve arama geçmişi (yalnızca cihazda)',
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
              Verileriniz <span className="font-semibold text-emerald-700">satılmaz veya kiralanmaz</span>.
              Uygulamada reklam, kullanım analitiği (Google Analytics vb.) ve
              çökme raporlama bulunmaz.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mt-2">
              Yapay zekâ asistanına sorduğunuz soru metni, yanıtın
              üretilebilmesi için TARPOL sunucusuna ve oradan bir yapay zekâ
              sağlayıcısına iletilir. Asistana kişisel veya gizli bilgi
              yazmamanızı öneririz.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">3. Üçüncü Taraf Hizmetler</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            {[
              {
                name: 'TARPOL Veri Servisi',
                desc: 'Tarımsal istatistikler ve yapay zekâ asistanı için sorgular gönderilir. '
                  + 'Asistana yazdığınız soru metni buraya iletilir; kimlik bilgisi eklenmez.',
              },
              {
                name: 'OneSignal (bildirimler)',
                desc: 'Bildirim izni verirseniz cihazınıza ait bir abonelik kimliği ve bildirim '
                  + 'jetonu oluşturulur; bunlar bildirim gönderebilmek için kullanılır. '
                  + 'İzni cihaz ayarlarından istediğiniz zaman geri alabilirsiniz.',
              },
              {
                name: 'OpenWeather (hava durumu)',
                desc: 'Yalnızca listeden seçilen ilin sabit koordinatı gönderilir. '
                  + 'Uygulama cihazınızın konumuna erişmez, konum izni istemez.',
              },
              {
                name: 'Yahoo Finance (piyasa)',
                desc: 'Emtia fiyatları anonim olarak sorgulanır; kişisel veri iletilmez.',
              },
              {
                name: 'Cihazın ses tanıma servisi',
                desc: 'Sesli soru sorduğunuzda ses, cihazın işletim sistemine ait tanıma '
                  + 'servisiyle (Apple veya Google) metne çevrilir ve bu işlem sırasında '
                  + 'ilgili sağlayıcıya iletilebilir. Ses kaydı uygulama tarafından saklanmaz.',
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
              Uygulamanın cihazda sakladığı tercihler ve önbellek şifrelenmez; bunlar
              kimlik belirleyici veri içermez. Sunucuya giden tüm istekler HTTPS ile
              şifrelenir. Uygulamayı sildiğinizde cihazdaki tüm yerel veriler de
              silinir; Ayarlar → Önbelleği temizle ile dilediğiniz zaman kendiniz de
              silebilirsiniz.
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
            © 2024–2026 TARPOL · TarpoVizyon
          </p>
        </div>
      </div>
    </div>
  );
}
