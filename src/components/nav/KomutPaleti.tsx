import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MENU, BASIC_MENU, KAPSAM_ADI, type Kapsam, type MenuItem } from './menu';
import { ara, type AranabilirOge } from './arama';
import { useModelArama } from './modelArama';
import { PALET_OLAY } from './kabukOlaylari';
import '../../styles/KomutPaleti.css';

/**
 * Komut paleti — ⌘K ile açılan, tüm sayfalara tek adımda giden arama.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Pro'nun masaüstü başlığında arama HİÇ yoktu. Basic'in kendi kutusu var
 * (`BasicArama`), mobilde Keşfet sekmesi var, ama Pro kabuğunda 50 menü
 * öğesine + Basic'ten gelen 84 panoya tek yol mega menüyü açıp doğru bölümü
 * tahmin etmekti. Sayfanın adını bilen kullanıcı bile onu tıklaya tıklaya
 * arıyordu.
 *
 * ─── AYNI MOTOR ─────────────────────────────────────────────────────────────
 * Eşleştirme `nav/arama.ts` ile — Basic kutusunun ve mobil Keşfet'in
 * kullandığı motorun aynısı. Ayrı bir kopya yazmak, üç arama kutusunun aynı
 * sorguya farklı cevap vermesi demekti.
 *
 * ─── KAPSAM SATIRLARI ───────────────────────────────────────────────────────
 * Bir konunun iki kapsamda karşılığı varsa (ör. "Süt" hem Türkiye hem Dünya)
 * palette İKİ AYRI SATIR olarak duruyor. Tek satır gösterip kullanıcının
 * bulunduğu kapsama gitmek yanlış olurdu: kullanıcı çoğu zaman tam da diğer
 * kapsamı arıyor. Satırın sağındaki rozet hangisine gideceğini söylüyor.
 *
 * Kapsamı ayrıca AYARLAMAK gerekmiyor: `TarpoShell` kapsamı yoldan türetiyor
 * (`kapsamFromPath`), yani `/tarpovizyon/world/...` adresine gitmek kabuğu
 * kendiliğinden Dünya'ya alıyor.
 */

/** Açılır listede en fazla bu kadar sonuç; gerisi için kullanıcı daraltsın. */
const EN_FAZLA = 9;

/** Aranabilir satır: menü öğesi + gidilecek yol ve gösterim bağlamı. */
type PaletOge = AranabilirOge & {
  yol: string;
  /**
   * `yol`'un kopyası. `useModelArama` öğelerde YALNIZCA `any` alanına bakıyor
   * (`ogeler.map((o) => o.any)`), kapsama göre çözülmüş yolu göremiyor. Burada
   * yolu `any` olarak da yazınca model kapsamlı sayfaları da görebiliyor —
   * yoksa modele giden liste Basic panolarıyla sınırlı kalırdı.
   */
  any: string;
  kategori: string;
  /** null → kapsamsız (Basic panosu veya araç). */
  kapsam: Kapsam | null;
  kaynak: 'pro' | 'basic';
  /** Aynı label iki kapsamda da varsa React anahtarı çakışmasın. */
  anahtar: string;
};

/**
 * Menü ağacını düz aranabilir listeye çevirir.
 *
 * `sadeceMasaustu` öğeler (Veri Düzenle, Sektör Fiyat Girişi) dar ekranda
 * dışarıda: `visibleMenu` da aynı kuralı uyguluyor, palet ondan sapmamalı.
 */
function dizinKur(mobil: boolean): PaletOge[] {
  const out: PaletOge[] = [];
  const ekle = (item: MenuItem, kategori: string, yol: string,
                kapsam: Kapsam | null, kaynak: 'pro' | 'basic') => {
    out.push({
      label: item.label,
      bolum: item.bolum ?? kategori,
      icerik: item.icerik,
      yol, any: yol, kategori, kapsam, kaynak,
      anahtar: `${kaynak}:${kapsam ?? 'any'}:${yol}`,
    });
  };

  for (const kat of MENU) {
    for (const item of kat.items) {
      if (mobil && item.sadeceMasaustu) continue;
      if (item.any) { ekle(item, kat.title, item.any, null, 'pro'); continue; }
      // İki kapsamda da varsa iki satır — bkz. başlıktaki "KAPSAM SATIRLARI".
      if (item.turkey) ekle(item, kat.title, item.turkey, 'turkey', 'pro');
      if (item.world) ekle(item, kat.title, item.world, 'world', 'pro');
    }
  }
  for (const kat of BASIC_MENU) {
    for (const item of kat.items) {
      // BASIC_MENU her öğeye `any` yazıyor — Basic panoları kapsamsız.
      if (item.any) ekle(item, kat.title, item.any, null, 'basic');
    }
  }
  return out;
}

export function KomutPaleti() {
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState('');
  const [imlec, setImlec] = useState(0);
  const girisRef = useRef<HTMLInputElement | null>(null);
  const listeRef = useRef<HTMLDivElement | null>(null);
  /* Palet kapanınca odak, açılmadan önceki öğeye dönmeli. */
  const oncekiOdakRef = useRef<HTMLElement | null>(null);

  const mobil = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
    [],
  );
  const dizin = useMemo(() => dizinKur(mobil), [mobil]);
  const cikti = useMemo(() => ara(dizin, metin), [dizin, metin]);

  /* Boş sorguda liste açılmıyor: 134 öğeyi kutuya dökmenin anlamı yok.
     `BasicArama` da aynı davranışta. */
  const sonuclar = cikti.bos ? [] : cikti.sonuclar.slice(0, EN_FAZLA);
  const oneriler = cikti.bos ? [] : cikti.oneriler;
  const gosterilen = sonuclar.length ? sonuclar : oneriler;

  /* Model yalnızca yerel arama boş kaldığında soruluyor. Gerekçe: modelArama.ts */
  const yerelBos = !cikti.bos && cikti.sonuclar.length === 0;
  const model = useModelArama(dizin, metin, yerelBos && acik);

  /* Sorgu değişince imleç başa dönmeli; yoksa eski satır seçili kalıyor.
     Efektte değil, yazma olayında sıfırlanıyor: efektte setState çağırmak
     art arda render tetikliyor (react-hooks/set-state-in-effect). */
  const metinDegisti = useCallback((v: string) => { setMetin(v); setImlec(0); }, []);

  const kapat = useCallback(() => {
    setAcik(false);
    setMetin('');
    oncekiOdakRef.current?.focus?.();
  }, []);

  const ac = useCallback(() => {
    oncekiOdakRef.current = document.activeElement as HTMLElement | null;
    setAcik(true);
  }, []);

  /* ⌘K (Mac) / Ctrl+K (diğer). Tarayıcı kısayolunu bastırıyoruz. */
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (acik) kapat(); else ac();
      }
    }
    window.addEventListener('keydown', tus);
    window.addEventListener(PALET_OLAY, ac);
    return () => {
      window.removeEventListener('keydown', tus);
      window.removeEventListener(PALET_OLAY, ac);
    };
  }, [acik, ac, kapat]);

  /* Açılınca odak kutuya. */
  useEffect(() => { if (acik) girisRef.current?.focus(); }, [acik]);

  /* Seçili satır listenin dışına taşarsa görünüre kaydır. */
  useEffect(() => {
    if (!acik) return;
    const el = listeRef.current?.querySelector<HTMLElement>('[data-secili="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [imlec, acik, gosterilen.length]);

  const git = useCallback((oge: PaletOge) => {
    navigate(oge.yol);
    setAcik(false);
    setMetin('');
  }, [navigate]);

  function kutuTus(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { e.preventDefault(); kapat(); return; }
    if (!gosterilen.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setImlec((i) => (i + 1) % gosterilen.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setImlec((i) => (i - 1 + gosterilen.length) % gosterilen.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const secili = gosterilen[imlec];
      if (secili) git(secili);
    }
  }

  if (!acik) return null;

  const macMi = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  return (
    <>
      <div className="kp-fon" onClick={kapat} aria-hidden="true" />
      <div className="kp" role="dialog" aria-modal="true" aria-label="Sayfa ara">
        <div className="kp-giris">
          <span className="kp-im" aria-hidden="true">⌕</span>
          <input
            ref={girisRef}
            type="text"
            value={metin}
            onChange={(e) => metinDegisti(e.target.value)}
            onKeyDown={kutuTus}
            placeholder="Sayfa, ürün veya araç ara…"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={gosterilen.length > 0}
            aria-controls="kp-liste"
            aria-activedescendant={gosterilen[imlec] ? `kp-${imlec}` : undefined}
          />
          <button className="kp-kapat" type="button" onClick={kapat} aria-label="Kapat">esc</button>
        </div>

        <div className="kp-liste" id="kp-liste" role="listbox" ref={listeRef}>
          {cikti.bos && (
            <p className="kp-bos">
              Sayfa adı, ürün ya da araç yazın. Türkçe katlama açık —
              {' '}<em>bugday</em>, <em>tavuk</em>, <em>KIRMIZI</em> hepsi çalışır.
            </p>
          )}

          {!cikti.bos && !sonuclar.length && oneriler.length > 0 && (
            <p className="kp-baslik">Bunu mu demek istediniz?</p>
          )}

          {gosterilen.map((o, i) => (
            <button
              key={o.anahtar}
              id={`kp-${i}`}
              type="button"
              role="option"
              aria-selected={i === imlec}
              data-secili={i === imlec}
              className={`kp-satir${i === imlec ? ' secili' : ''}`}
              onMouseEnter={() => setImlec(i)}
              onClick={() => git(o)}
            >
              <span className={`kp-tur${o.kaynak === 'basic' ? ' pano' : ''}`}>
                {o.kaynak === 'basic' ? 'Pano' : 'Sayfa'}
              </span>
              <span className="kp-ad">{o.label}</span>
              <span className="kp-yol">
                {o.kapsam ? `${KAPSAM_ADI[o.kapsam]} · ` : ''}{o.kategori}
              </span>
            </button>
          ))}

          {yerelBos && !oneriler.length && (
            <p className="kp-bos">
              {model.araniyor
                ? 'Aranıyor…'
                : model.sonuc
                  ? 'Şunu mu arıyordunuz?'
                  : `“${metin}” için sonuç yok.`}
            </p>
          )}

          {yerelBos && model.sonuc && (() => {
            const m = model.sonuc;
            const hedef = dizin.find((d) => d.yol === m.yol);
            return (
              <button
                type="button"
                className="kp-satir"
                onClick={() => (hedef ? git(hedef) : navigate(m.yol))}
              >
                <span className="kp-tur oneri">Öneri</span>
                <span className="kp-ad">{m.ad || hedef?.label}</span>
                <span className="kp-yol">{hedef?.kategori ?? ''}</span>
              </button>
            );
          })()}
        </div>

        <div className="kp-alt">
          <span><kbd>↑</kbd><kbd>↓</kbd> gez</span>
          <span><kbd>↵</kbd> aç</span>
          <span><kbd>esc</kbd> kapat</span>
          <span className="kp-sag"><kbd>{macMi ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd></span>
        </div>
      </div>
    </>
  );
}
