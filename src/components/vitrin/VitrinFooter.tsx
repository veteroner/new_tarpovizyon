import { useNavigate } from 'react-router-dom';

import { GRUPLAR } from './VitrinHeader';

/**
 * Vitrin footer'ı — ana sayfada ve veri sayfalarının altında aynısı.
 *
 * Renk koyu yeşilden Apple'ın açık grisine geçti (istendi); yapı korundu:
 * marka + tanım, platform bağlantıları, kurumsal bağlantılar, adres, ve
 * altta sorumluluk satırı.
 *
 * Platform sütunu `GRUPLAR`'dan besleniyor — menü ile footer'ın ayrı
 * listeler tutup zamanla birbirinden ayrılmasını engelliyor.
 */

const KURUMSAL: [string, string][] = [
  ['TARPOL Hakkında', 'https://www.tarpol.org.tr/tarpol-hakkinda'],
  ['Mütevelli Heyeti', 'https://www.tarpol.org.tr/mutevelli-heyeti'],
  ['Yönetim Kurulu', 'https://www.tarpol.org.tr/yonetim-kurulu'],
  ['Yayınlar', 'https://www.tarpol.org.tr/kitaplar'],
  ['İletişim', 'https://www.tarpol.org.tr/iletisim'],
];

export function VitrinFooter() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-[var(--tv-cizgi-ince)] bg-[var(--tv-zemin)] pt-14">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img
              src="/marka/tarpol-logo.png"
              alt="TARPOL"
              width={460}
              height={86}
              className="tv-logo mb-4 h-7 w-auto"
            />
            <p className="text-[15px] leading-relaxed text-[var(--tv-ikincil)]">
              Tarım ve gıda sektöründe üreticiler, sivil toplum kuruluşları,
              üniversiteler, kamu ve özel sektör kurumlarının katılımını sağlayan
              sektörel hizmet platformunun veri kanadı.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
              Platform
            </h3>
            <ul className="space-y-0.5 text-[15px] text-[var(--tv-ikincil)]">
              {GRUPLAR.map((g) => (
                <li key={g.ad}>
                  <button
                    type="button"
                    onClick={() => navigate(g.yol)}
                    className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                  >
                    {g.ad}
                  </button>
                </li>
              ))}
              {/* `/m` DEĞİL: o adres telefon biçimli uygulama kabuğu ve
                  masaüstünde açılması anlamsız. Mağaza bölümüne gidiyor. */}
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/piyasa')}
                  className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                >
                  Piyasa
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/asistan')}
                  className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                >
                  Yapay Zekâ Asistanı
                </button>
              </li>
              <li>
                <a
                  href="/#mobil"
                  className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                >
                  Mobil uygulama
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
              Kurumsal
            </h3>
            <ul className="space-y-0.5 text-[15px] text-[var(--tv-ikincil)]">
              {KURUMSAL.map(([ad, url]) => (
                <li key={ad}>
                  <a
                    href={url}
                    className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                  >
                    {ad}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
              Adres
            </h3>
            <p className="text-[15px] leading-relaxed text-[var(--tv-ikincil)]">
              Hacettepe Mahallesi
              <br />
              Cingöz Sokak No:10
              <br />
              Altındağ / Ankara
            </p>
            <a
              href="mailto:iletisim@tarpol.org.tr"
              className="mt-2 inline-flex min-h-[36px] items-center text-[15px] text-[var(--tv-vurgu)] hover:underline"
            >
              iletisim@tarpol.org.tr
            </a>
          </div>
        </div>

        <div className="border-t border-[var(--tv-cizgi-ince)] py-6">
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--tv-ikincil)]">
            İstatistikler kamuya açık kaynaklardan derlenir ve sonradan revize
            edilebilir; bilgilendirme amaçlıdır, resmî kaynağın yerini tutmaz.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--tv-ikincil)]">
            <span>© 2024–2026 TARPOL</span>
            <span aria-hidden="true" className="text-[var(--tv-limon)]">
              •
            </span>
            <span>Yapay Zekâ · Veri · Bilim · İnovasyon Merkezi</span>
            <a
              href="https://www.tarpol.org.tr"
              className="ml-auto transition-colors hover:text-[var(--tv-vurgu)]"
            >
              tarpol.org.tr ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
