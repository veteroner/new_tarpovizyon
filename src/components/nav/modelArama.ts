import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from './menu';

/**
 * Model destekli sayfa bulma — yerel arama boş dönerse devreye giren katman.
 *
 * ─── NE ZAMAN ÇALIŞIR ───────────────────────────────────────────────────────
 * Yalnızca `nav/arama.ts` hiçbir sonuç bulamadığında. Yerel arama bir şey
 * bulduysa model hiç çağrılmıyor: yerel sonuç anında geliyor, bedava ve
 * kesin. Model yalnızca "kullanıcı bizim kelimelerimizle konuşmadı" hâli için.
 *
 * ─── NEDEN UYDURAMAZ ────────────────────────────────────────────────────────
 * Model serbest metin üretmiyor, gönderilen listeden bir numara seçiyor.
 * Sunucu numarayı aralık dışıysa atıyor, burada da dönen yol GENE listeye
 * karşı doğrulanıyor. İki tarafta da kontrol var çünkü tek taraflı güvenmek,
 * modelin bir gün var olmayan bir sayfaya yönlendirmesi demek.
 *
 * ─── NEDEN ÖNBELLEK ─────────────────────────────────────────────────────────
 * Aynı cümle iki kez modele gitmiyor. Kullanıcı arama kutusunda ileri geri
 * gidiyor, sayfaya girip çıkıyor; önbelleksiz her dönüşte yeni bir istek
 * demekti. Oturum boyunca saklanıyor.
 */

/**
 * Uç, uygulamanın veri Worker'ında — AI ucuyla aynı yerde.
 *
 * Önce Netlify function'a konmuştu ve native için üretim adresi koda
 * gömülmüştü. Yanlıştı: `workers/.../ai.js` aynı sorunu daha önce çözmüş ve
 * gerekçesini yazmış — native kabuğun Netlify kökeni yok, `capacitor://`
 * üzerinden `/api.php` yönlendirmesi hiç çalışmıyor. Uygulama zaten bütün
 * verisini bu Worker'dan çekiyor, yani gömülü adrese de gerek kalmıyor.
 */
const UC = `${(import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev'}/api/sayfa-bul`;

/** Bundan kısa sorgu modele gitmiyor: iki harf herkesin yolunun üstünde. */
const EN_AZ_HARF = 3;
/** Kullanıcı yazmayı bırakana kadar beklenen süre. */
const BEKLEME_MS = 700;

export type ModelSonucu = { yol: string; ad: string };

const onbellek = new Map<string, ModelSonucu | null>();

const anahtar = (soru: string) => soru.trim().toLocaleLowerCase('tr');

function oturumdanOku(k: string): ModelSonucu | null | undefined {
  try {
    const ham = sessionStorage.getItem(`tarpo.sayfabul.${k}`);
    if (ham === null) return undefined;
    return ham === '' ? null : (JSON.parse(ham) as ModelSonucu);
  } catch { return undefined; }
}

function oturumaYaz(k: string, v: ModelSonucu | null) {
  try { sessionStorage.setItem(`tarpo.sayfabul.${k}`, v ? JSON.stringify(v) : ''); } catch { /* özel mod */ }
}

/**
 * Sorguyu sunucuya sorar. Bulunamazsa (ya da bir şey ters giderse) null.
 * Hata fırlatmıyor: arama kutusu, modele ulaşılamadı diye kırmızı yanmamalı.
 */
export async function sayfaBul(
  soru: string,
  ogeler: MenuItem[],
  signal?: AbortSignal,
): Promise<ModelSonucu | null> {
  const k = anahtar(soru);
  if (onbellek.has(k)) return onbellek.get(k) ?? null;
  const oturum = oturumdanOku(k);
  if (oturum !== undefined) { onbellek.set(k, oturum); return oturum; }

  const gecerliYollar = new Set(ogeler.map((o) => o.any).filter(Boolean) as string[]);

  try {
    const yanit = await fetch(UC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        soru,
        sayfalar: ogeler
          .filter((o) => o.any)
          .map((o) => ({ yol: o.any, ad: o.label, bolum: o.bolum ?? '' })),
      }),
    });
    if (!yanit.ok) return null;
    const veri = await yanit.json() as { yol?: string | null; ad?: string | null };

    /*
     * Sunucu numarayı zaten doğruluyor; burada bir kez daha yola bakılıyor.
     * Sunucu bir gün değişirse ya da araya bir şey girerse, kullanıcı olmayan
     * bir sayfaya gönderilmesin.
     */
    const sonuc: ModelSonucu | null = veri.yol && gecerliYollar.has(veri.yol)
      ? { yol: veri.yol, ad: veri.ad ?? '' }
      : null;

    onbellek.set(k, sonuc);
    oturumaYaz(k, sonuc);
    return sonuc;
  } catch {
    /* İptal ya da ağ hatası — sessizce yerel sonuçlara bırak. */
    return null;
  }
}

/**
 * Yerel arama boş kaldığında modeli soran kanca.
 *
 * `etkin` false ise hiçbir şey yapmıyor; yani model çağrısını tetikleme kararı
 * çağıran tarafta ve tek bir yerde: "yerel arama sonuç bulamadı mı?"
 */
export function useModelArama(ogeler: MenuItem[], metin: string, etkin: boolean) {
  const [araniyor, setAraniyor] = useState(false);
  const [sonuc, setSonuc] = useState<ModelSonucu | null>(null);
  const iptalRef = useRef<AbortController | null>(null);

  useEffect(() => {
    iptalRef.current?.abort();
    const soru = metin.trim();

    if (!etkin || soru.length < EN_AZ_HARF) {
      setSonuc(null);
      setAraniyor(false);
      return;
    }

    /* Önbellekte varsa beklemeye ve "aranıyor" göstermeye gerek yok. */
    const hazir = onbellek.get(anahtar(soru));
    if (hazir !== undefined) {
      setSonuc(hazir);
      setAraniyor(false);
      return;
    }

    const ctrl = new AbortController();
    iptalRef.current = ctrl;
    setAraniyor(true);
    setSonuc(null);

    /*
     * Her tuşta istek atılmıyor. Kullanıcı yazmayı bırakınca tek istek gidiyor;
     * yoksa "yumurta" yazan biri için yedi ayrı çağrı yapılırdı.
     */
    const zaman = setTimeout(() => {
      sayfaBul(soru, ogeler, ctrl.signal)
        .then((r) => { if (!ctrl.signal.aborted) { setSonuc(r); setAraniyor(false); } })
        .catch(() => { if (!ctrl.signal.aborted) setAraniyor(false); });
    }, BEKLEME_MS);

    return () => { clearTimeout(zaman); ctrl.abort(); };
  }, [ogeler, metin, etkin]);

  return { araniyor, sonuc };
}
