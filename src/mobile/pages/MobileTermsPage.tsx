import { useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft } from 'lucide-react';

/**
 * Kullanım Şartları Sayfası — TarpoRasyon
 */
export default function MobileTermsPage() {
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
            <FileText size={18} className="text-emerald-600" />
            <h1 className="text-base font-bold text-slate-800">Kullanım Şartları</h1>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Intro */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Son güncelleme: Mart 2026</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            TarpoRasyon uygulamasını kullanarak aşağıdaki kullanım şartlarını
            kabul etmiş sayılırsınız. Lütfen dikkatli okuyunuz.
          </p>
        </div>

        {/* Section 1 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">1. Uygulamanın Amacı</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              TarpoRasyon, çiftçi ve ziraat uzmanlarına yönelik bir
              <span className="font-semibold"> karar destek</span> aracıdır.
              Uygulama; NRC 2021 standartlarına dayalı rasyon hesaplamaları,
              yem kütüphanesi yönetimi ve tarımsal veri analitiği sunar.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">2. Sorumluluk Reddi</h2>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 leading-relaxed font-medium mb-2">
              ⚠️ Önemli Uyarı
            </p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Uygulama sonuçları <span className="font-bold">tahmindir</span>; kesin
              veteriner veya ziraat mühendisi tavsiyesinin yerini tutmaz.
              Gerçek hayvan performansı; genetik yapı, çevre koşulları ve
              yönetim uygulamalarına göre farklılık gösterebilir.
            </p>
            <p className="text-sm text-amber-700 leading-relaxed mt-2">
              TARPOL, uygulamanın kullanımından doğan doğrudan veya dolaylı
              zararlardan sorumlu tutulamaz.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">3. Kullanım Koşulları</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <ul className="space-y-2">
              {[
                'Uygulamayı yalnızca yasal amaçlarla kullanabilirsiniz.',
                'Uygulamayı tersine mühendislik yaparak kopyalayamazsınız.',
                'Ticari kullanım için TARPOL\'dan yazılı izin alınmalıdır.',
                'Uygulama içi verileri başka sistemlere izinsiz aktaramazsınız.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">4. Fikri Mülkiyet</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Uygulama içindeki tüm içerik, tasarım, algoritmalar ve
              veritabanları TARPOL'ün mülkiyetindedir ve telif hukuku
              kapsamında korunmaktadır. NRC 2021 standartları National
              Academies of Sciences lisansı altındadır.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">5. Güncellemeler</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              TARPOL, kullanım şartlarını önceden bildirim yapmaksızın
              değiştirme hakkını saklı tutar. Değişiklikler uygulama
              güncellemesiyle veya bu sayfada yayınlanır.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">6. Uygulanacak Hukuk</h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Olası
              anlaşmazlıklarda Ankara Mahkemeleri ve İcra Daireleri yetkilidir.
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
