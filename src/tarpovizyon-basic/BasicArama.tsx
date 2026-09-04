import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASIC_MENU, type MenuItem } from '../components/nav/menu';
import { ara } from '../components/nav/arama';
import { useModelArama } from '../components/nav/modelArama';

/**
 * Masaüstü başlığındaki sayfa arama kutusu.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Arama yalnızca mobil Keşfet sekmesinde vardı. Masaüstünde 84 sayfaya tek
 * yol, dört başlıklı mega menüyü açıp doğru bölümü tahmin etmekti — sayfanın
 * adını bilen kullanıcı bile onu tıklaya tıklaya arıyordu.
 *
 * Eşleştirme mobil ile AYNI motoru kullanıyor (`components/nav/arama.ts`).
 * Ayrı bir kopya yazmak, iki arama kutusunun aynı sorguya farklı cevap
 * vermesi demekti.
 */

/** Açılır listede en fazla bu kadar sonuç; gerisi için kullanıcı daraltsın. */
const EN_FAZLA = 8;

export function BasicArama() {
  const navigate = useNavigate();
  const [metin, setMetin] = useState('');
  const [acik, setAcik] = useState(false);
  const [imlec, setImlec] = useState(0);
  const kutuRef = useRef<HTMLDivElement | null>(null);

  const tumOgeler = useMemo(() => BASIC_MENU.flatMap((k) => k.items), []);
  const cikti = useMemo(() => ara(tumOgeler, metin), [tumOgeler, metin]);

  /* Boş sorguda liste açılmıyor: 84 sayfayı açılır kutuya dökmenin anlamı yok. */
  const sonuclar = cikti.bos ? [] : cikti.sonuclar.slice(0, EN_FAZLA);
  const oneriler = cikti.bos ? [] : cikti.oneriler;
  const gosterilen = sonuclar.length ? sonuclar : oneriler;
  const listeAcik = acik && !cikti.bos;

  /* Model yalnızca yerel arama boş kaldığında soruluyor. Gerekçe: modelArama.ts */
  const yerelBos = !cikti.bos && cikti.sonuclar.length === 0;
  const model = useModelArama(tumOgeler, metin, yerelBos);

  /* Sorgu değişince imleç başa dönmeli; yoksa eski satır seçili kalıyor.
     Efektte DEĞİL yazma olayında: efektte setState çağırmak render'dan sonra
     ikinci bir çizim tetikliyor (zincirleme render). Pro'daki komut paletinde
     de aynı şekilde. */
  const metniDegistir = (v: string) => { setMetin(v); setImlec(0); setAcik(true); };

  useEffect(() => {
    function disariTiklandi(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener('mousedown', disariTiklandi);
    return () => document.removeEventListener('mousedown', disariTiklandi);
  }, []);

  const git = (item: MenuItem) => {
    // BASIC_MENU her öğeye `any` yazıyor — Basic sayfaları kapsamsız.
    navigate(item.any!);
    setMetin('');
    setAcik(false);
  };

  const tus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setAcik(false); return; }
    if (!gosterilen.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setImlec((i) => (i + 1) % gosterilen.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setImlec((i) => (i - 1 + gosterilen.length) % gosterilen.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      git(gosterilen[imlec]);
    }
  };

  return (
    <div className="tvb-arama" ref={kutuRef}>
      <svg
        className="tvb-arama__ikon" width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        type="search"
        className="tvb-arama__giris"
        value={metin}
        onChange={(e) => metniDegistir(e.target.value)}
        onFocus={() => setAcik(true)}
        onKeyDown={tus}
        placeholder="Sayfa ara"
        aria-label="Sayfa ara"
        aria-expanded={listeAcik}
        role="combobox"
        aria-controls="tvb-arama-liste"
      />

      {listeAcik && (
        <div className="tvb-arama__liste" id="tvb-arama-liste" role="listbox">
          {/*
            * Sonuç yokken boş kutu göstermek yerine en yakın başlıklar.
            * Çoğu başarısız aramada tek harf eksik oluyor.
            */}
          {!sonuclar.length && oneriler.length > 0 && (
            <div className="tvb-arama__baslik">Bunu mu demek istediniz?</div>
          )}

          {gosterilen.map((item, i) => (
            <button
              key={item.any}
              type="button"
              role="option"
              aria-selected={i === imlec}
              className={`tvb-arama__satir${i === imlec ? ' tvb-arama__satir--secili' : ''}`}
              onMouseEnter={() => setImlec(i)}
              onClick={() => git(item)}
            >
              <span className="tvb-arama__ad">{item.label}</span>
              {/*
                * Bölüm adı şart: "Ekonomik Göstergeler ve Maliyet Unsurları"
                * hem Çiğ Süt hem Kırmızı Et bölümünde var ve iki satır
                * birbirinden ayırt edilemiyor.
                */}
              {item.bolum && <span className="tvb-arama__bolum">{item.bolum}</span>}
            </button>
          ))}

          {!gosterilen.length && !model.araniyor && !model.sonuc && (
            <div className="tvb-arama__bos">“{metin.trim()}” için sonuç yok.</div>
          )}

          {/*
            * Model önerisi AYRI başlık altında ve en altta: yerel eşleşme
            * kesin, bu bir tahmin. Aynı listede göstermek kullanıcının
            * hangisine ne kadar güveneceğini bilememesi demekti.
            */}
          {yerelBos && model.araniyor && (
            <div className="tvb-arama__bos">Yapay zekâya soruluyor…</div>
          )}
          {yerelBos && model.sonuc && (
            <>
              <div className="tvb-arama__baslik">Yapay zekânın önerisi</div>
              <button
                type="button"
                className="tvb-arama__satir"
                onClick={() => { navigate(model.sonuc!.yol); setMetin(''); setAcik(false); }}
              >
                <span className="tvb-arama__ad">{model.sonuc.ad}</span>
                <span className="tvb-arama__bolum">Aradığınız bu olabilir</span>
              </button>
            </>
          )}

          {cikti.sonuclar.length > EN_FAZLA && (
            <div className="tvb-arama__dipnot">
              {cikti.sonuclar.length} sonuçtan ilk {EN_FAZLA} tanesi
            </div>
          )}
        </div>
      )}
    </div>
  );
}
