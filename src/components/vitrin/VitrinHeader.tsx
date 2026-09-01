import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, TrendingUp, Sparkles } from 'lucide-react';

/**
 * Vitrin başlığı — hem ana sayfada hem veri sayfalarının içinde.
 *
 * ─── SEKMELER NEDEN BUNLAR ──────────────────────────────────────────────────
 * Önce "Veri Platformu · Mobil · Vakıf" vardı. "Mobil" bir gezinme başlığı
 * değil, bir indirme çağrısıydı — menüde yeri yoktu (sayfanın gövdesinde ve
 * footer'da zaten duruyor). Sekmeler artık UYGULAMANIN KENDİ dört grubuyla
 * birebir aynı (pages.ts → NAV_GROUPS): Makro, Hayvancılık, Bitkisel, İl
 * Bölgesel. Böylece vitrin ile içerisi aynı haritayı gösteriyor; ziyaretçi
 * içeri girince yeni bir yapıyla karşılaşmıyor.
 *
 * Hedefler her grubun GERÇEK giriş sayfası — uydurma değil, pages.ts'ten.
 *
 * ─── DOLU CTA KALDIRILDI ────────────────────────────────────────────────────
 * Başlıkta dolu yeşil bir "Veriye gir" düğmesi vardı. İki sorun: bir ekranda
 * TEK birincil eylem olmalı, oysa hero'daki "Veri platformuna gir" ile aynı
 * anda yarışıyordu; ve "Veriye gir" ifadesi emir kipiyle sert kaçıyordu.
 * Apple'ın kendi menüsünde de dolu CTA yok — sadece bağlantılar.
 */

export const GRUPLAR = [
  { ad: 'Makro Veriler', yol: '/tarpovizyon-basic/makro/genel', kok: '/tarpovizyon-basic/makro' },
  { ad: 'Hayvancılık', yol: '/tarpovizyon-basic/genel/hayvansal-uretim', kok: '/tarpovizyon-basic/genel' },
  { ad: 'Bitkisel Üretim', yol: '/tarpovizyon-basic/bitkisel-genel/uretim-ozeti', kok: '/tarpovizyon-basic/bitkisel' },
  { ad: 'Bölgesel Veriler', yol: '/tarpovizyon-basic/il-duzeyinde/bitkisel-uretim', kok: '/tarpovizyon-basic/il-duzeyinde' },
];

export function VitrinHeader({
  arama,
  merkez,
  gruplariGoster = true,
}: {
  /** Arama kutusu (veri sayfalarının içinde geçiliyor). */
  arama?: React.ReactNode;
  /**
   * Başlığın ORTASINA konacak özel gezinme. Veri sayfaları kendi mega
   * menüsünü buraya geçiriyor; önce menü başlığın ALTINDA ayrı bir satırdaydı
   * ve logo / sekmeler / arama üç ayrı hizada duruyordu — başlık dağınık
   * görünüyordu. Artık üçü de tek satırda.
   */
  merkez?: React.ReactNode;
  /**
   * Grup sekmeleri gösterilsin mi? Veri sayfalarının İÇİNDE kapalı: orada
   * zaten alt satırda tüm sayfaları açan mega menü var, dört grubu iki kez
   * listelemek gürültü olurdu.
   */
  gruplariGoster?: boolean;
}) {
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--tv-cizgi-ince)] bg-[var(--tv-ust-cam)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-5 px-5 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex min-h-[44px] shrink-0 items-center"
          aria-label="TarpoVizyon ana sayfa"
        >
          <img
            src="/marka/tarpol-logo.png"
            alt="TARPOL — Tarımsal Strateji ve Politika Geliştirme Merkezi"
            width={460}
            height={86}
            className="tv-logo h-7 w-auto"
          />
        </button>

        {merkez}

        {gruplariGoster && (
        <nav className="hidden items-center gap-5 lg:flex">
          {GRUPLAR.map((g) => (
            <NavLink
              key={g.ad}
              to={g.yol}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center whitespace-nowrap text-[17px] transition-opacity ${
                  isActive
                    ? 'font-medium text-[var(--tv-vurgu)] opacity-100'
                    : 'text-[var(--tv-murekkep)] opacity-75 hover:opacity-100'
                }`
              }
            >
              {g.ad}
            </NavLink>
          ))}
        </nav>
        )}

        <div className="ml-auto flex items-center gap-1">
          {arama}

          {/*
            * Piyasa ve Asistan mobil uygulamada vardı, webde hiç yoktu.
            * Sekme listesine değil sağ tarafa konuldu: bunlar veri BÖLÜMÜ
            * değil, ayrı araçlar — dört veri grubuyla aynı hizaya koymak
            * gezinme hiyerarşisini bulandırırdı.
            */}
          <NavLink
            to="/piyasa"
            className={({ isActive }) =>
              `hidden min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13.5px] font-medium transition-colors sm:inline-flex ${
                isActive
                  ? 'bg-[var(--tv-vurgu-sis)] text-[var(--tv-vurgu)]'
                  : 'text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)]'
              }`
            }
          >
            <TrendingUp size={16} /> Piyasa
          </NavLink>
          <NavLink
            to="/asistan"
            className={({ isActive }) =>
              `hidden min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13.5px] font-medium transition-colors sm:inline-flex ${
                isActive
                  ? 'bg-[var(--tv-vurgu-sis)] text-[var(--tv-vurgu)]'
                  : 'text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)]'
              }`
            }
          >
            <Sparkles size={16} /> Asistan
          </NavLink>
          <button
            type="button"
            onClick={() => setAcik((v) => !v)}
            className={`h-11 w-11 items-center justify-center rounded-full text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)] lg:hidden ${gruplariGoster ? 'flex' : 'hidden'}`}
            aria-label={acik ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={acik}
          >
            {acik ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {acik && gruplariGoster && (
        <div className="border-t border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col px-5 py-2 sm:px-6">
            {GRUPLAR.map((g) => (
              <NavLink
                key={g.ad}
                to={g.yol}
                onClick={() => setAcik(false)}
                className={({ isActive }) =>
                  `flex min-h-[48px] items-center border-b border-[var(--tv-cizgi-ince)] text-[17px] last:border-b-0 ${
                    isActive ? 'font-medium text-[var(--tv-vurgu)]' : 'text-[var(--tv-murekkep)]'
                  }`
                }
              >
                {g.ad}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
