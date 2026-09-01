import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Vitrin kartlarının verisi.
 *
 * ─── İKİ DALGA ──────────────────────────────────────────────────────────────
 * Uçların hepsi aynı ağırlıkta değil. Makro, hayvancılık ve bitkisel uçları
 * toplam ~17 KB (gzip) — sayfa açılır açılmaz çekiliyor. İl düzeyindeki üç
 * uç ise ~54 KB: iki sayı göstermek için giriş sayfasına bindirilecek bir
 * yük değil. Onlar ancak İL DÜZEYİNDE BÖLÜMÜ EKRANA GİRİNCE çekiliyor
 * (`ilBolumunuYukle`), ve yalnızca bir kez.
 *
 * ─── NEDEN BAŞLANGIÇ DEĞERLERİ VAR ──────────────────────────────────────────
 * Kartlar ölçülmüş gerçek değerlerle doluyor, istek dönünce üzerine
 * yazılıyor. Böylece sayfa hiçbir zaman iskelet/boş görünmüyor. Değerlerin
 * yanında yazan DÖNEM de veriden okunuyor — sabit "2025" yazısı yok ki
 * kaynak ilerlediğinde etiket yalan söylemesin.
 *
 * Ağ yoksa başlangıç değerleri kalır; kart boş kalmaz ama yanlış da olmaz,
 * çünkü dönem etiketi de onlarla birlikte gelir.
 */

const API = 'https://tarpovizyon-api.veteroner.workers.dev';

export type Kart = {
  id: string;
  etiket: string;
  /** Sayısal gösterim; `metin` doluysa onun yerine o basılır. */
  deger: number;
  metin?: string;
  birim: string;
  /** "2025", "Tem 2026" gibi dönem ya da kapsam bilgisi. */
  alt: string;
  /** Sparkline serisi; boşsa grafik çizilmez. */
  seri: number[];
  /** Tıklanınca gidilecek gerçek sayfa. */
  yol: string;
  /** Yüzde mi (biçimlendirme farklı). */
  yuzde?: boolean;
};

export type Bolum = {
  id: string;
  ad: string;
  ac: string;
  /** "Tümünü gör" bağlantısı. */
  yol: string;
  /** Bölüm kimliğini taşıyan renk değişkeni. */
  renk: string;
  kartlar: Kart[];
};

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** Ölçülen mevcut değerler — ilk boyama için. */
const BASLANGIC: Bolum[] = [
  {
    id: 'makro',
    ad: 'Makro Veriler',
    ac: 'Tarımın ekonomideki yeri, fiyat endeksleri ve dış ticaret.',
    yol: '/tarpovizyon-basic/makro/genel',
    renk: 'var(--tv-d2)',
    kartlar: [
      {
        id: 'gsyh', etiket: "Tarımın GSYH'deki payı", deger: 5.6, birim: '', alt: '2024',
        seri: [], yol: '/tarpovizyon-basic/makro/genel', yuzde: true,
      },
      {
        id: 'gida', etiket: 'Gıda enflasyonu (yıllık)', deger: 37.53, birim: '', alt: 'Tem 2026',
        seri: [], yol: '/tarpovizyon-basic/makro/tufe', yuzde: true,
      },
      {
        id: 'tarimufe', etiket: 'Tarım ÜFE (yıllık)', deger: 18.81, birim: '', alt: 'Tem 2026',
        seri: [], yol: '/tarpovizyon-basic/makro/tarim-ufe', yuzde: true,
      },
    ],
  },
  {
    id: 'hayvancilik',
    ad: 'Hayvancılık',
    ac: 'Hayvan varlığı, süt, kırmızı et, kanatlı ve arıcılık.',
    yol: '/tarpovizyon-basic/genel/hayvansal-uretim',
    renk: 'var(--tv-d3)',
    kartlar: [
      {
        id: 'sut', etiket: 'İnek sütü üretimi', deger: 20241858, birim: 'ton', alt: '2025',
        seri: [16706956, 17053653, 16996271, 16849348, 18831720, 20112619, 19592521,
               21749342, 21370116, 19912135, 19961908, 21098564, 20241858],
        yol: '/tarpovizyon-basic/cig-sut/uretim-yeterlilik',
      },
      {
        id: 'et', etiket: 'Büyükbaş kırmızı et', deger: 1325916, birim: 'ton', alt: '2025',
        seri: [803364, 820677, 867399, 961650, 1099709, 1287749, 1337320,
               1349870, 1471550, 1586333, 1685992, 1496824, 1325916],
        yol: '/tarpovizyon-basic/kirmizi-et/uretim-yeterlilik',
      },
      {
        id: 'varlik', etiket: 'Toplam hayvan varlığı', deger: 75583303, birim: 'baş', alt: '2025',
        seri: [], yol: '/tarpovizyon-basic/genel/turkiye-hayvan-varligi',
      },
    ],
  },
  {
    id: 'bitkisel',
    ad: 'Bitkisel Üretim',
    ac: 'Tahıl, sebze, meyve ve endüstri bitkilerinde üretim, alan ve verim.',
    yol: '/tarpovizyon-basic/bitkisel-genel/uretim-ozeti',
    renk: 'var(--tv-d1)',
    kartlar: [
      {
        id: 'tahil', etiket: 'Tahıllar ve diğer bitkisel ürünler', deger: 66970000, birim: 'ton',
        alt: '2025', seri: [], yol: '/tarpovizyon-basic/bitkisel-genel/uretim-ozeti',
      },
      {
        id: 'sebze', etiket: 'Sebzeler', deger: 33300000, birim: 'ton', alt: '2025',
        seri: [], yol: '/tarpovizyon-basic/bitkisel-genel/tr-uretim-miktari',
      },
      {
        id: 'meyve', etiket: 'Meyveler ve sert kabuklular', deger: 19618888, birim: 'ton',
        alt: '2025', seri: [], yol: '/tarpovizyon-basic/bitkisel-genel/dis-ticaret',
      },
    ],
  },
  {
    id: 'il',
    ad: 'Bölgesel Veriler',
    ac: '81 ilde üretim, havza ürün deseni ve coğrafi işaretli ürünler.',
    yol: '/tarpovizyon-basic/il-duzeyinde/bitkisel-uretim',
    renk: 'var(--tv-d4)',
    kartlar: [
      {
        id: 'topil', etiket: 'Hayvan varlığında ilk il', deger: 0, metin: '—', birim: '',
        alt: 'yükleniyor', seri: [], yol: '/tarpovizyon-basic/il-duzeyinde/hayvansal-uretim',
      },
      {
        id: 'havza', etiket: 'Tarım havzası', deger: 0, metin: '—', birim: '', alt: 'yükleniyor',
        seri: [], yol: '/tarpovizyon-basic/il-duzeyinde/havza-urun-deseni',
      },
      {
        id: 'ci', etiket: 'Coğrafi işaretli ürün', deger: 0, metin: '—', birim: '',
        alt: 'yükleniyor', seri: [], yol: '/tarpovizyon-basic/il-duzeyinde/cografi-isaret',
      },
    ],
  },
];

type Satir = Record<string, unknown>;

async function al(uc: string): Promise<Satir[]> {
  const r = await fetch(`${API}/api/${uc}`);
  if (!r.ok) throw new Error(`${uc}: ${r.status}`);
  const j = await r.json();
  const d = Array.isArray(j) ? j : (j as { data?: unknown }).data;
  return Array.isArray(d) ? (d as Satir[]) : [];
}

const sayi = (v: unknown) => (typeof v === 'number' ? v : Number(v));

/** Bir bölümün belirli kartını değiştirir (kalanına dokunmadan). */
function kartGuncelle(bolumler: Bolum[], bolumId: string, kartId: string, yama: Partial<Kart>): Bolum[] {
  return bolumler.map((b) =>
    b.id !== bolumId ? b : { ...b, kartlar: b.kartlar.map((k) => (k.id !== kartId ? k : { ...k, ...yama })) },
  );
}

export function useVitrinVerisi() {
  const [bolumler, setBolumler] = useState<Bolum[]>(BASLANGIC);
  const ilIstendi = useRef(false);

  /* ─── 1. DALGA: hafif uçlar, açılışta ─── */
  useEffect(() => {
    let iptal = false;
    const uygula = (fn: (b: Bolum[]) => Bolum[]) => {
      if (!iptal) setBolumler(fn);
    };

    // Makro — tarımın GSYH payı (23 yıllık seri, oran hesaplanıyor)
    al('makro/tarim-gsyh')
      .then((r) => {
        const pay = r
          .filter((x) => sayi(x.toplam_gsyh_milyar_usd) > 0)
          .map((x) => ({
            yil: sayi(x.yil),
            oran: (sayi(x.tarim_gsyh_milyar_usd) / sayi(x.toplam_gsyh_milyar_usd)) * 100,
          }))
          .sort((a, b) => a.yil - b.yil);
        if (!pay.length) return;
        const son = pay[pay.length - 1];
        uygula((b) => kartGuncelle(b, 'makro', 'gsyh', {
          deger: son.oran, alt: String(son.yil), seri: pay.map((p) => p.oran),
        }));
      })
      .catch(() => { /* başlangıç değeri kalır */ });

    // Makro — gıda enflasyonu (aylık seri)
    al('makro/tufe-aylik')
      .then((r) => {
        const s = r.filter((x) => typeof x.gida_alkolsuz === 'number');
        if (!s.length) return;
        const son = s[s.length - 1];
        uygula((b) => kartGuncelle(b, 'makro', 'gida', {
          deger: sayi(son.gida_alkolsuz),
          alt: `${AY[sayi(son.ay) - 1] ?? ''} ${sayi(son.yil)}`.trim(),
          seri: s.slice(-36).map((x) => sayi(x.gida_alkolsuz)),
        }));
      })
      .catch(() => {});

    // Makro — tarım ÜFE (aylık seri)
    al('makro/ufe-aylik')
      .then((r) => {
        const s = r.filter((x) => typeof x.tarim_ufe === 'number');
        if (!s.length) return;
        const son = s[s.length - 1];
        uygula((b) => kartGuncelle(b, 'makro', 'tarimufe', {
          deger: sayi(son.tarim_ufe),
          alt: `${AY[sayi(son.ay) - 1] ?? ''} ${sayi(son.yil)}`.trim(),
          seri: s.slice(-36).map((x) => sayi(x.tarim_ufe)),
        }));
      })
      .catch(() => {});

    // Hayvancılık — süt
    al('cig-sut/uretim-miktari')
      .then((r) => {
        const s = r.filter((x) => sayi(x.yil) >= 2013 && typeof x.buyukbas_sut_uretimi_ton === 'number');
        if (!s.length) return;
        const son = s[s.length - 1];
        uygula((b) => kartGuncelle(b, 'hayvancilik', 'sut', {
          deger: sayi(son.buyukbas_sut_uretimi_ton), alt: String(sayi(son.yil)),
          seri: s.map((x) => sayi(x.buyukbas_sut_uretimi_ton)),
        }));
      })
      .catch(() => {});

    // Hayvancılık — kırmızı et
    al('kirmizi-et/uretim-miktari')
      .then((r) => {
        const s = r.filter((x) => sayi(x.yil) >= 2013 && typeof x.buyukbas_et_uretimi_ton === 'number');
        if (!s.length) return;
        const son = s[s.length - 1];
        uygula((b) => kartGuncelle(b, 'hayvancilik', 'et', {
          deger: sayi(son.buyukbas_et_uretimi_ton), alt: String(sayi(son.yil)),
          seri: s.map((x) => sayi(x.buyukbas_et_uretimi_ton)),
        }));
      })
      .catch(() => {});

    // Hayvancılık — toplam varlık (yıl `tarih` alanında, iki sütunun toplamı)
    al('tr/hayvan-varliklari')
      .then((r) => {
        const yillik = new Map<number, number>();
        r.forEach((x) => {
          const yil = new Date(String(x.tarih)).getFullYear();
          if (!Number.isFinite(yil) || yil < 2013) return;
          const t = sayi(x.buyukbas_toplam_bas ?? 0) + sayi(x.kucukbas_toplam_bas ?? 0);
          if (t > 0) yillik.set(yil, t);
        });
        const s = [...yillik.entries()].sort((a, b) => a[0] - b[0]);
        if (!s.length) return;
        uygula((b) => kartGuncelle(b, 'hayvancilik', 'varlik', {
          deger: s[s.length - 1][1], alt: String(s[s.length - 1][0]), seri: s.map(([, v]) => v),
        }));
      })
      .catch(() => {});

    // Bitkisel — bülten grup toplamları
    al('bitkisel/bulten-grup')
      .then((r) => {
        /*
         * Bu uçta 2026 satırları TAHMİN (`tahmin: 1`). Vitrinde yalnızca
         * GERÇEKLEŞEN yıl gösteriliyor — tahmini gerçekleşmiş gibi sunmamak
         * için tahmin satırları eleniyor.
         */
        const kesin = r.filter((x) => !sayi(x.tahmin));
        const enSonToplam = (dosya: string) => {
          const s = kesin
            .filter((x) => x.dosya === dosya && x.grup === 'Toplam')
            .sort((a, b) => sayi(a.yil) - sayi(b.yil));
          return s.length ? { deger: sayi(s[s.length - 1].deger), yil: sayi(s[s.length - 1].yil) } : null;
        };
        const esle: [string, string][] = [['tahil', 'tahillar'], ['sebze', 'sebzeler'], ['meyve', 'meyveler']];
        esle.forEach(([kartId, dosya]) => {
          const v = enSonToplam(dosya);
          if (v) uygula((b) => kartGuncelle(b, 'bitkisel', kartId, { deger: v.deger, alt: String(v.yil) }));
        });
      })
      .catch(() => {});

    return () => { iptal = true; };
  }, []);

  /* ─── 2. DALGA: ağır il uçları, bölüm görününce ─── */
  const ilBolumunuYukle = useCallback(() => {
    if (ilIstendi.current) return;
    ilIstendi.current = true;

    al('il/hayvan-sayilari')
      .then((r) => {
        // İl başına EN SON yılın toplamı; aynı il birden çok yılda geçiyor.
        const sonYil = new Map<string, { yil: number; toplam: number }>();
        r.forEach((x) => {
          const il = String(x.il ?? '');
          const yil = new Date(String(x.tarih)).getFullYear();
          if (!il || !Number.isFinite(yil)) return;
          const toplam = sayi(x.sigir_varligi_bas ?? 0) + sayi(x.manda_varligi_bas ?? 0)
            + sayi(x.koyun_varligi_bas ?? 0) + sayi(x.keci_varligi_bas ?? 0);
          const onceki = sonYil.get(il);
          if (!onceki || yil > onceki.yil) sonYil.set(il, { yil, toplam });
        });
        const sirali = [...sonYil.entries()].sort((a, b) => b[1].toplam - a[1].toplam);
        if (!sirali.length) return;
        const [il, bilgi] = sirali[0];
        setBolumler((b) => kartGuncelle(b, 'il', 'topil', {
          metin: il, deger: bilgi.toplam, birim: 'baş', alt: String(bilgi.yil),
        }));
      })
      .catch(() => {});

    al('il-duzeyinde/havza-ilce')
      .then((r) => {
        const havza = new Set(r.map((x) => String(x.havza)));
        const ilce = r.length;
        setBolumler((b) => kartGuncelle(b, 'il', 'havza', {
          metin: String(havza.size), deger: havza.size, birim: 'havza',
          alt: `${ilce.toLocaleString('tr-TR')} ilçe`,
        }));
      })
      .catch(() => {});

    al('il-duzeyinde/cografi-isaret')
      .then((r) => {
        const iller = new Set(r.map((x) => String(x.il)));
        setBolumler((b) => kartGuncelle(b, 'il', 'ci', {
          metin: r.length.toLocaleString('tr-TR'), deger: r.length, birim: 'ürün',
          alt: `${iller.size} ilde`,
        }));
      })
      .catch(() => {});
  }, []);

  return { bolumler, ilBolumunuYukle };
}

/** Kart değerini Türkçe biçimde yazar. */
export function bicimle(k: Kart): { sayi: string; birim: string } {
  if (k.metin !== undefined) return { sayi: k.metin, birim: k.birim };
  if (k.yuzde) return { sayi: `%${k.deger.toFixed(2).replace('.', ',')}`, birim: '' };
  if (k.deger >= 1_000_000) {
    return { sayi: (k.deger / 1_000_000).toFixed(2).replace('.', ','), birim: `mn ${k.birim}`.trim() };
  }
  if (k.deger >= 1_000) {
    return { sayi: (k.deger / 1_000).toFixed(1).replace('.', ','), birim: `bin ${k.birim}`.trim() };
  }
  return { sayi: k.deger.toLocaleString('tr-TR'), birim: k.birim };
}
