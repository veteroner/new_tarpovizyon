import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { katla } from './nav/arama';

/**
 * Ürün seçici — seçilenleri GÖSTEREN jeton alanı.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Eskisi onay kutulu bir açılır listeydi ve seçim TETİKTE KAYBOLUYORDU: iki
 * üründen sonrası "3 ürün seçili" yazısına dönüşüyordu. Neyin seçili olduğunu
 * görmek ya da birini çıkarmak için listeyi yeniden açıp 230 satır içinde
 * işaretlileri aramak gerekiyordu. Sayfa çok ürünlü karşılaştırmayı
 * destekliyor ama arayüz bunu gizlediği için tek ürünlük gibi duruyordu.
 *
 * Şimdi seçilenler alanın içinde jeton olarak duruyor; her jetonun kendi
 * çarpısı var, yani çıkarmak için liste açmak gerekmiyor.
 *
 * ─── EN AZ BİR ÜRÜN ─────────────────────────────────────────────────────────
 * Kural korundu (seçim boşalınca sayfa tamamen boşalıyor), ama artık sessiz
 * değil: son jetonun çarpısı devre dışı ve sebebini söylüyor. Eskiden tıklama
 * hiçbir şey yapmıyordu ve bu arıza gibi görünüyordu.
 *
 * ─── "TÜMÜNÜ SEÇ" KOŞULLU ───────────────────────────────────────────────────
 * 230 ürünün hepsini seçmek tek sorguya 230 ürün koyuyor; grafik de okunmaz
 * hâle geliyor. Düğme yalnızca görünen liste kısayken (≤ TOPLU_SINIR) ve o
 * zaman da "görünen"leri seçiyor — yani arama kutusuyla daraltılmış küme.
 */

interface Product {
  id: string;
  name: string;
  nameTR: string;
}

interface ProductSelectorProps {
  products: Product[];
  selectedProducts: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
}

/** Görünen liste bundan uzunsa toplu seçim düğmesi çıkmıyor. */
const TOPLU_SINIR = 25;

export default function ProductSelector({
  products,
  selectedProducts,
  onSelectionChange,
  placeholder = 'Ürün seçin…',
}: ProductSelectorProps) {
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');
  const [imlec, setImlec] = useState(0);
  const kokRef = useRef<HTMLDivElement>(null);
  const aramaRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  const kapat = useCallback(() => { setAcik(false); setArama(''); }, []);

  useEffect(() => {
    if (!acik) return;
    const disaTikla = (e: MouseEvent) => {
      if (kokRef.current && !kokRef.current.contains(e.target as Node)) kapat();
    };
    const kacis = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('mousedown', disaTikla);
    document.addEventListener('keydown', kacis);
    return () => {
      document.removeEventListener('mousedown', disaTikla);
      document.removeEventListener('keydown', kacis);
    };
  }, [acik, kapat]);

  /* Açılınca odak arama kutusuna: 230 ürünü fareyle taramak yerine yazarak
     daralt. Palet de aynı davranışta. */
  useEffect(() => { if (acik) aramaRef.current?.focus(); }, [acik]);

  /*
   * Süzme `katla()` ile — düz `toLowerCase()` Türkçe'de I→i ve İ→i̇ üretiyor,
   * yani "İNCİR" yazınca "İncir" eşleşmiyordu. Arama motorunun kullandığı
   * katlamanın aynısı; iki ayrı kural iki farklı sonuç demekti.
   */
  const gorunen = useMemo(() => {
    const q = katla(arama.trim());
    if (!q) return products;
    return products.filter(
      (p) => katla(p.nameTR).includes(q) || katla(p.name).includes(q),
    );
  }, [products, arama]);

  const secili = useMemo(
    () => selectedProducts
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as Product[],
    [selectedProducts, products],
  );

  const cevir = (id: string) => {
    if (selectedProducts.includes(id)) {
      if (selectedProducts.length > 1) {
        onSelectionChange(selectedProducts.filter((x) => x !== id));
      }
    } else {
      onSelectionChange([...selectedProducts, id]);
    }
  };

  /* Sorgu değişince imleç başa. Efektte değil olay içinde: efektte setState
     art arda render tetikliyor (react-hooks/set-state-in-effect). */
  const aramaDegisti = (v: string) => { setArama(v); setImlec(0); };

  function listeTus(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!gorunen.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setImlec((i) => (i + 1) % gorunen.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setImlec((i) => (i - 1 + gorunen.length) % gorunen.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = gorunen[imlec];
      if (o) cevir(o.id);
    }
  }

  /* Seçili satır kutunun dışına taşarsa görünüre kaydır. */
  useEffect(() => {
    if (!acik) return;
    listeRef.current
      ?.querySelector<HTMLElement>('[data-imlec="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [imlec, acik]);

  const topluGoster = gorunen.length > 1 && gorunen.length <= TOPLU_SINIR;

  return (
    <div className="us" ref={kokRef}>
      {/*
        * Alan bir <button> DEĞİL: içinde jetonların kendi çarpı düğmeleri var,
        * iç içe düğme hem geçersiz HTML hem de ekran okuyucuda karışık.
        * Klavye kullanıcısı sondaki "Ekle" düğmesiyle açıyor.
        */}
      <div className="us-alan" onClick={(e) => {
        if (e.target === e.currentTarget) setAcik((a) => !a);
      }}>
        {secili.length === 0 && <span className="us-bos">{placeholder}</span>}

        {secili.map((p) => (
          <span key={p.id} className="us-jeton">
            <span className="us-jeton-ad">{p.nameTR}</span>
            <button
              type="button"
              className="us-jeton-x"
              disabled={secili.length <= 1}
              title={secili.length <= 1
                ? 'En az bir ürün seçili kalmalı'
                : `${p.nameTR} seçimini kaldır`}
              aria-label={`${p.nameTR} seçimini kaldır`}
              onClick={() => cevir(p.id)}
            >
              ✕
            </button>
          </span>
        ))}

        <button
          type="button"
          className="us-ekle"
          onClick={() => setAcik((a) => !a)}
          aria-expanded={acik}
          aria-haspopup="listbox"
        >
          {secili.length ? '+ Ekle' : 'Seç'}
        </button>
      </div>

      {acik && (
        <div className="us-pano" role="dialog" aria-label="Ürün seç">
          <div className="us-ara">
            <span className="us-ara-im" aria-hidden="true">⌕</span>
            <input
              ref={aramaRef}
              type="text"
              value={arama}
              onChange={(e) => aramaDegisti(e.target.value)}
              onKeyDown={listeTus}
              placeholder="Ürün ara…"
              autoComplete="off"
              spellCheck={false}
              aria-controls="us-liste"
            />
          </div>

          <div className="us-bilgi">
            <span>
              {gorunen.length === products.length
                ? `${products.length} ürün`
                : `${gorunen.length} eşleşme`}
              {' · '}{secili.length} seçili
            </span>
            <span className="us-bilgi-dg">
              {topluGoster && (
                <button
                  type="button"
                  onClick={() => onSelectionChange(
                    Array.from(new Set([...selectedProducts, ...gorunen.map((p) => p.id)])),
                  )}
                >
                  Görünenleri seç
                </button>
              )}
              {secili.length > 1 && (
                <button
                  type="button"
                  /* Tamamen boşaltmıyor: sayfa seçimsiz kalınca bomboş
                     açılıyor. İlk seçili ürün kalıyor. */
                  onClick={() => onSelectionChange([selectedProducts[0]])}
                >
                  Temizle
                </button>
              )}
            </span>
          </div>

          <div className="us-liste" id="us-liste" role="listbox" aria-multiselectable ref={listeRef}>
            {gorunen.map((p, i) => {
              const isaretli = selectedProducts.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isaretli}
                  data-imlec={i === imlec}
                  className={`us-satir${i === imlec ? ' imlecli' : ''}${isaretli ? ' isaretli' : ''}`}
                  onMouseEnter={() => setImlec(i)}
                  onClick={() => cevir(p.id)}
                >
                  <span className="us-satir-ad">{p.nameTR}</span>
                  {/* Onay işareti SAĞDA: solda kutu dizmek 230 satırda ağır
                      bir ızgara oluşturuyordu. Seçili satır ayrıca zeminden
                      ayrışıyor — işaret tek başına taşımıyor. */}
                  <span className="us-satir-tik" aria-hidden="true">{isaretli ? '✓' : ''}</span>
                </button>
              );
            })}
            {!gorunen.length && (
              <p className="us-yok">“{arama}” için ürün yok.</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .us { position: relative; min-width: 280px; }

        .us-alan {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
          min-height: 44px;                       /* dokunma hedefi */
          padding: 7px 9px;
          background: var(--tv-kart, #fff);
          border: 1px solid var(--tv-cizgi, #d2d2d7);
          border-radius: 12px;
          cursor: pointer;
          transition: border-color 160ms ease-out, box-shadow 160ms ease-out;
        }
        .us-alan:hover { border-color: var(--tv-vurgu, #17693a); }
        .us-alan:focus-within {
          border-color: var(--tv-vurgu, #17693a);
          box-shadow: 0 0 0 3px var(--tv-vurgu-sis, rgba(23,105,58,.14));
        }

        .us-bos { color: var(--tv-ikincil, #6e6e73); font-size: 14px; padding: 0 4px; }

        .us-jeton {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 4px 4px 10px;
          background: var(--tv-vurgu-sis, rgba(23,105,58,.10));
          color: var(--tv-vurgu-koyu, #0f4d29);
          border-radius: 999px;
          font-size: 13px; font-weight: 600;
          max-width: 100%;
        }
        .us-jeton-ad { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .us-jeton-x {
          border: none; background: none; cursor: pointer;
          color: inherit; font-size: 11px; line-height: 1;
          width: 20px; height: 20px; border-radius: 50%;
          display: grid; place-items: center;
          transition: background-color 140ms ease-out;
        }
        .us-jeton-x:hover:not(:disabled) { background: rgba(0,0,0,.10); }
        .us-jeton-x:disabled { opacity: .35; cursor: not-allowed; }

        .us-ekle {
          border: 1px dashed var(--tv-cizgi, #d2d2d7);
          background: none; cursor: pointer;
          color: var(--tv-ikincil, #6e6e73);
          font-size: 13px; font-weight: 600;
          padding: 5px 11px; border-radius: 999px;
          transition: color 140ms ease-out, border-color 140ms ease-out;
        }
        .us-ekle:hover {
          color: var(--tv-vurgu, #17693a);
          border-color: var(--tv-vurgu, #17693a);
        }

        .us-pano {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          z-index: 1000;
          background: var(--tv-kart, #fff);
          border: 1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07));
          border-radius: 14px;
          box-shadow: var(--tv-golge, 0 12px 32px rgba(0,0,0,.14));
          overflow: hidden;
          display: flex; flex-direction: column;
          max-height: 380px;
        }

        .us-ara { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
        .us-ara-im { color: var(--tv-ikincil, #6e6e73); font-size: 15px; }
        .us-ara input {
          flex: 1; border: none; background: none; outline: none;
          font-size: 15px; color: var(--tv-murekkep, #1d1d1f);
        }
        .us-ara input::placeholder { color: var(--tv-ikincil, #6e6e73); }

        .us-bilgi {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 6px 12px;
          font-size: 12px; color: var(--tv-ikincil, #6e6e73);
          border-top: 1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07));
          border-bottom: 1px solid var(--tv-cizgi-ince, rgba(0,0,0,.07));
        }
        .us-bilgi-dg { display: flex; gap: 10px; }
        .us-bilgi-dg button {
          border: none; background: none; cursor: pointer; padding: 2px 0;
          font: inherit; font-weight: 600;
          color: var(--tv-vurgu, #17693a);
        }
        .us-bilgi-dg button:hover { text-decoration: underline; }

        .us-liste { overflow-y: auto; padding: 6px; }

        .us-satir {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          width: 100%; text-align: left;
          border: none; background: none; cursor: pointer;
          padding: 9px 10px; border-radius: 9px;
          font-size: 14px; color: var(--tv-murekkep, #1d1d1f);
          transition: background-color 120ms ease-out;
        }
        .us-satir.imlecli { background: var(--tv-zemin-2, #f5f5f7); }
        .us-satir.isaretli { font-weight: 600; }
        .us-satir-ad { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .us-satir-tik {
          flex: none; width: 16px; text-align: center;
          color: var(--tv-vurgu, #17693a); font-weight: 700;
        }

        .us-yok { margin: 0; padding: 18px 12px; text-align: center;
                  font-size: 13px; color: var(--tv-ikincil, #6e6e73); }

        @media (prefers-reduced-motion: reduce) {
          .us-alan, .us-ekle, .us-satir, .us-jeton-x { transition: none; }
        }
      `}</style>
    </div>
  );
}
