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

const onbellek = new Map<string, ModelSonucu[]>();

/* Önbellek anahtarına ADET de giriyor: aynı soru 1 ve 3 sayfa için farklı. */
const anahtar = (soru: string, adet: number) => `${adet}|${soru.trim().toLocaleLowerCase('tr')}`;

function oturumdanOku(k: string): ModelSonucu[] | undefined {
  try {
    const ham = sessionStorage.getItem(`tarpo.sayfabul.${k}`);
    if (ham === null) return undefined;
    return JSON.parse(ham) as ModelSonucu[];
  } catch { return undefined; }
}

function oturumaYaz(k: string, v: ModelSonucu[]) {
  try { sessionStorage.setItem(`tarpo.sayfabul.${k}`, JSON.stringify(v)); } catch { /* özel mod */ }
}

/**
 * Sorguyu sunucuya sorar. Bulunamazsa (ya da bir şey ters giderse) null.
 * Hata fırlatmıyor: arama kutusu, modele ulaşılamadı diye kırmızı yanmamalı.
 */
export async function sayfalarBul(
  soru: string,
  ogeler: MenuItem[],
  adet = 1,
  signal?: AbortSignal,
): Promise<ModelSonucu[]> {
  const k = anahtar(soru, adet);
  const bellek = onbellek.get(k);
  if (bellek) return bellek;
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
        adet,
        sayfalar: ogeler
          .filter((o) => o.any)
          .map((o) => ({ yol: o.any, ad: o.label, bolum: o.bolum ?? '' })),
      }),
    });
    if (!yanit.ok) return [];
    const veri = await yanit.json() as {
      yol?: string | null; ad?: string | null;
      sayfalar?: { yol?: string; ad?: string }[];
    };

    /*
     * Sunucu numarayı zaten doğruluyor; burada bir kez daha yola bakılıyor.
     * Sunucu bir gün değişirse ya da araya bir şey girerse, kullanıcı olmayan
     * bir sayfaya gönderilmesin.
     *
     * `sayfalar` yoksa tek sonuçlu eski biçime düşülüyor.
     */
    const ham = veri.sayfalar?.length
      ? veri.sayfalar
      : (veri.yol ? [{ yol: veri.yol, ad: veri.ad ?? '' }] : []);

    const sonuc: ModelSonucu[] = ham
      .filter((x): x is { yol: string; ad?: string } => Boolean(x.yol) && gecerliYollar.has(x.yol!))
      .map((x) => ({ yol: x.yol, ad: x.ad ?? '' }));

    onbellek.set(k, sonuc);
    oturumaYaz(k, sonuc);
    return sonuc;
  } catch {
    /* İptal ya da ağ hatası — sessizce yerel sonuçlara bırak. */
    return [];
  }
}

/** Tek sayfa isteyen çağıranlar için (arama kutusu). */
export async function sayfaBul(
  soru: string,
  ogeler: MenuItem[],
  signal?: AbortSignal,
): Promise<ModelSonucu | null> {
  return (await sayfalarBul(soru, ogeler, 1, signal))[0] ?? null;
}

/**
 * Yerel arama boş kaldığında modeli soran kanca.
 *
 * `etkin` false ise hiçbir şey yapmıyor; yani model çağrısını tetikleme kararı
 * çağıran tarafta ve tek bir yerde: "yerel arama sonuç bulamadı mı?"
 */
export function useModelArama(ogeler: MenuItem[], metin: string, etkin: boolean) {
  /*
   * ─── DURUM YALNIZCA AĞDAN GELENİ TUTUYOR ──────────────────────────────────
   * Eskiden efekt, geçersiz sorgu ve önbellek isabeti hâllerinde de
   * `setSonuc`/`setAraniyor` çağırıyordu. İkisi de EŞZAMANLI setState: efekt
   * render'dan sonra çalışıp durumu değiştirdiği için bileşen bir kez boşa
   * çiziliyordu (zincirleme render; React derleyicisi de hata veriyordu).
   *
   * Oysa o iki hâl zaten TÜRETİLEBİLİR — sorgu kısa mı, önbellekte var mı,
   * ikisi de render sırasında bilinebiliyor. Durumda yalnızca gerçekten
   * beklenmesi gereken şey kalıyor: ağdan dönen cevap ve hangi soruya ait
   * olduğu.
   */
  const [agdan, setAgdan] = useState<{ soru: string; sonuc: ModelSonucu | null } | null>(null);
  const [bekleniyor, setBekleniyor] = useState<string | null>(null);
  const iptalRef = useRef<AbortController | null>(null);

  const soru = metin.trim();
  const gecerli = etkin && soru.length >= EN_AZ_HARF;
  const onbellekteki = gecerli ? onbellek.get(anahtar(soru, 1)) : undefined;

  useEffect(() => {
    iptalRef.current?.abort();
    /* Geçersiz sorgu ya da önbellek isabeti: istek YOK, durum dokunulmuyor —
       ikisi de aşağıda render sırasında türetiliyor. */
    if (!gecerli || onbellekteki) return;

    const ctrl = new AbortController();
    iptalRef.current = ctrl;

    /*
     * Her tuşta istek atılmıyor. Kullanıcı yazmayı bırakınca tek istek gidiyor;
     * yoksa "yumurta" yazan biri için yedi ayrı çağrı yapılırdı.
     *
     * "Aranıyor" işareti de BEKLEME BİTİNCE yakılıyor, efektin içinde değil.
     * İkisi birden doğru: efektte eşzamanlı setState zincirleme render
     * üretiyordu, ve bekleme süresinde henüz uçan bir istek yokken çark
     * döndürmek kullanıcıya yanlış şey söylüyordu.
     */
    const zaman = setTimeout(() => {
      setBekleniyor(soru);
      sayfaBul(soru, ogeler, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setAgdan({ soru, sonuc: r });
          setBekleniyor(null);
        })
        .catch(() => { if (!ctrl.signal.aborted) setBekleniyor(null); });
    }, BEKLEME_MS);

    return () => { clearTimeout(zaman); ctrl.abort(); };
  }, [ogeler, soru, gecerli, onbellekteki]);

  /* Üç kaynak, öncelik sırasıyla: geçersiz → boş, önbellek → anında,
     ağ → yalnızca AYNI soruya aitse (eski cevap yeni sorguya sızmasın). */
  if (!gecerli) return { araniyor: false, sonuc: null };
  if (onbellekteki) return { araniyor: false, sonuc: onbellekteki[0] ?? null };
  if (agdan?.soru === soru) return { araniyor: false, sonuc: agdan.sonuc };
  return { araniyor: bekleniyor === soru, sonuc: null };
}
