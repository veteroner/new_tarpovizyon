import { useQuery } from '@tanstack/react-query';
import { fetchAgg, num, type Row } from '../../../services/d1';

/**
 * "Diğer hayvansal ürünler" sayfasının veri katmanı — yapağı, tiftik, keçi kılı,
 * balmumu, ipek böceği kozası, kovan.
 *
 * ─── İKİ ÖLÇÜLMÜŞ TUZAK ─────────────────────────────────────────────────────
 *
 * 1) ÜLKE SATIRI 2025'TE BOŞ. `duzeykod=1` satırlarında bütün ürünlerin 2025
 *    değeri 0; 2024 dolu. Sayfa ülke satırından beslendiği için bir yıl geride
 *    kalıyordu. İl satırlarında (`duzeykod=3`) 2025 DOLU.
 *
 * 2) İL SATIRLARINDA İSTANBUL YOK. `duzeykod=3` yalnızca 80 il içeriyor;
 *    İstanbul yalnızca ilçe düzeyinde (`duzeykod=4`, `il='İSTANBUL'`) var.
 *    Bölge düzeyi (`duzeykod=2`) daha da eksik: 12 İBBS bölgesinden 10'u var,
 *    toplamları ülkenin %82'si. Yani bölge düzeyi kullanılamaz.
 *
 * ─── ÇÖZÜM VE DOĞRULAMASI ───────────────────────────────────────────────────
 * Türkiye toplamı = 80 il + İstanbul'un ilçeleri. Bu toplam 2024 için TÜİK'in
 * kendi ülke satırını BİREBİR üretiyor — ölçüldü:
 *
 *   ürün                ülke 2024    il+İstanbul 2024    fark
 *   Balmumu                 3.316               3.316   0,00%
 *   Keçi Kılı               6.001               6.001   0,00%
 *   Kovan               8.961.975           8.961.975   0,00%
 *   Yapağı                 84.270              84.270   0,00%
 *   İpek Böceği Kozası         85                  85   0,00%
 *   Tiftik                    339                 338  -0,29%  (yuvarlama)
 *
 * Aynı toplama 2025'e uygulanınca TÜİK'in henüz yayımlamadığı ülke rakamı
 * elde ediliyor. Uydurma değil, TÜİK'in kendi il verisinin toplamı.
 */

const R = 'tuik/hayvancilik-hayvansaluretim';
const FAO = 'fao/uretim-hayvansal-birincil';

export const ILK_YIL = 2004;
export const SON_YIL = 2025;
export const YILLAR = Array.from({ length: SON_YIL - ILK_YIL + 1 }, (_, i) => ILK_YIL + i);

/** İl satırlarında olmayan tek il — ilçelerinden toplanıyor. */
const EKSIK_IL = 'İSTANBUL';

export type UrunKimlik = {
  id: string;
  /** D1'deki `urun` değeri. */
  urun: string;
  /** D1'deki `tur` değeri — tek türlü ürünlerde boş. */
  tur: string;
  ad: string;
  birim: string;
  /** FAO'daki karşılığı (LIKE deseni) — karşılığı olmayanlarda null. */
  faoDesen: string | null;
};

/**
 * Tabloda ölçülmüş sekiz seri. `tur` yalnızca Yapağı ve Kovan'da dolu;
 * diğerlerinde boş string ve süzgece HİÇ konmuyor — boş değerli bir sorgu
 * parametresi URL'de kayboluyor ve süzgeç sessizce düşüyor.
 */
export const URUNLER: UrunKimlik[] = [
  { id: 'yapagi_yerli', urun: 'Yapağı', tur: 'Yerli ve Diğerleri', ad: 'Yerli Yapağı', birim: 'ton', faoDesen: null },
  { id: 'yapagi_merinos', urun: 'Yapağı', tur: 'Merinos', ad: 'Merinos Yapağı', birim: 'ton', faoDesen: null },
  { id: 'keci_kili', urun: 'Keçi Kılı', tur: '', ad: 'Keçi Kılı', birim: 'ton', faoDesen: null },
  { id: 'tiftik', urun: 'Tiftik', tur: '', ad: 'Tiftik (Ankara Keçisi)', birim: 'ton', faoDesen: null },
  { id: 'balmumu', urun: 'Balmumu', tur: '', ad: 'Balmumu', birim: 'ton', faoDesen: 'Beeswax' },
  { id: 'ipek', urun: 'İpek Böceği Kozası', tur: '', ad: 'İpek Böceği Kozası', birim: 'ton', faoDesen: 'Silk-worm cocoons%' },
  { id: 'kovan_yeni', urun: 'Kovan', tur: 'Yeni Tip', ad: 'Kovan (Yeni Tip)', birim: 'adet', faoDesen: null },
  { id: 'kovan_eski', urun: 'Kovan', tur: 'Eski Tip', ad: 'Kovan (Eski Tip)', birim: 'adet', faoDesen: null },
];

/** Ürün bazında (tür ayrımı olmadan) toplam — yapağı ve kovan için. */
export const URUN_TOPLAMLARI = [
  { id: 'yapagi', urun: 'Yapağı', ad: 'Yapağı', birim: 'ton', faoDesen: 'Shorn wool, greasy%' },
  { id: 'kovan', urun: 'Kovan', ad: 'Kovan', birim: 'adet', faoDesen: null },
];

export const urunBul = (id: string) => URUNLER.find((u) => u.id === id) ?? URUNLER[0];

/** Tür süzgeci — boşsa hiç eklenmiyor (bkz. URUNLER yorumu). */
const turSuzgeci = (tur: string) => (tur ? { tur } : {});

const anahtar = (urun: unknown, tur: unknown) => `${String(urun ?? '')}|${String(tur ?? '')}`;

export type SeriNoktasi = { yil: number; deger: number };
export type UrunSerisi = UrunKimlik & {
  /** 2004–2025, Türkiye toplamı (80 il + İstanbul ilçeleri). */
  seri: SeriNoktasi[];
  /** Verisi olan en yeni yıl ve değeri. */
  sonYil: number | null;
  sonDeger: number;
  oncekiDeger: number;
};

/**
 * Sekiz serinin tamamı, bütün yıllar, Türkiye toplamı olarak.
 *
 * İki sorgu: il satırları + İstanbul'un ilçe satırları. Ürün başına ayrı sorgu
 * atmak 16 istek olurdu; `groupBy: ['urun','tur']` ile ikiye iniyor.
 */
export function useTurkiyeSerileri() {
  return useQuery({
    queryKey: ['diger-hayvansal-turkiye'],
    queryFn: async (): Promise<UrunSerisi[]> => {
      const yilAlanlari = YILLAR.map(String);
      const [iller, istanbul] = await Promise.all([
        fetchAgg(R, {
          groupBy: ['urun', 'tur'], sum: yilAlanlari,
          where: { duzeykod: 3 }, limit: 100,
        }),
        fetchAgg(R, {
          groupBy: ['urun', 'tur'], sum: yilAlanlari,
          where: { duzeykod: 4, il: EKSIK_IL }, limit: 100,
        }),
      ]);

      const topla = (rows: Row[]) => {
        const m = new Map<string, Row>();
        for (const r of rows) m.set(anahtar(r.urun, r.tur), r);
        return m;
      };
      const ilHarita = topla(iller);
      const istHarita = topla(istanbul);

      return URUNLER.map((u) => {
        const k = anahtar(u.urun, u.tur);
        const a = ilHarita.get(k);
        const b = istHarita.get(k);
        const seri: SeriNoktasi[] = YILLAR.map((y) => ({
          yil: y,
          deger: num(a?.[`sum_${y}`]) + num(b?.[`sum_${y}`]),
        }));
        const dolu = seri.filter((n) => n.deger > 0);
        const son = dolu.at(-1) ?? null;
        const onceki = dolu.at(-2) ?? null;
        return {
          ...u,
          seri,
          sonYil: son?.yil ?? null,
          sonDeger: son?.deger ?? 0,
          oncekiDeger: onceki?.deger ?? 0,
        };
      });
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type IlPayi = { il: string; deger: number; pay: number };

/**
 * Bir serinin il dağılımı — 80 il + İstanbul, 81 il.
 *
 * `il` sütunu il düzeyinde BOŞ (639 satırın 639'unda); il adı `yer` sütununda.
 * Sayfa eskiden `groupBy: ['il']` yapıp boş adları eleyince liste her zaman
 * boş kalıyordu: il grafiği, pasta ve sıralama tablosu hiç çizilmiyordu.
 */
export function useIlDagilimi(urunId: string, yil: number | null) {
  const u = urunBul(urunId);
  return useQuery({
    queryKey: ['diger-hayvansal-il', urunId, yil],
    enabled: yil != null,
    queryFn: async (): Promise<IlPayi[]> => {
      const alan = String(yil);
      const ortak = { urun: u.urun, ...turSuzgeci(u.tur) };
      const [iller, istanbul] = await Promise.all([
        fetchAgg(R, {
          groupBy: ['yer'], sum: [alan],
          where: { ...ortak, duzeykod: 3 }, limit: 100,
        }),
        fetchAgg(R, {
          sum: [alan], where: { ...ortak, duzeykod: 4, il: EKSIK_IL }, limit: 1,
        }),
      ]);

      const liste: IlPayi[] = iller
        .map((r) => ({ il: String(r.yer ?? ''), deger: num(r[`sum_${alan}`]), pay: 0 }))
        .filter((r) => r.il !== '' && r.deger > 0);

      const istDeger = num(istanbul[0]?.[`sum_${alan}`]);
      if (istDeger > 0) liste.push({ il: 'İstanbul', deger: istDeger, pay: 0 });

      const toplam = liste.reduce((t, r) => t + r.deger, 0);
      for (const r of liste) r.pay = toplam ? (r.deger / toplam) * 100 : 0;
      return liste.sort((a, b) => b.deger - a.deger);
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type Yogunlasma = UrunKimlik & {
  /** Üretim yapan il sayısı (81 üzerinden). */
  ilSayisi: number;
  /** İlk üç ilin toplam paydaki yüzdesi. */
  ilk3Pay: number;
  /** En büyük il ve payı. */
  lider: string;
  liderPay: number;
};

/**
 * Bütün serilerin coğrafi yoğunlaşması — tek sorguda.
 *
 * Seri başına ayrı il sorgusu 16 istek olurdu; `groupBy: ['urun','tur','yer']`
 * il düzeyinde 639 satır döndürüyor ve hepsi tek istekte geliyor.
 */
export function useYogunlasma(yil: number | null) {
  return useQuery({
    queryKey: ['diger-hayvansal-yogunlasma', yil],
    enabled: yil != null,
    queryFn: async (): Promise<Yogunlasma[]> => {
      const alan = String(yil);
      const [iller, istanbul] = await Promise.all([
        fetchAgg(R, {
          groupBy: ['urun', 'tur', 'yer'], sum: [alan],
          where: { duzeykod: 3 }, limit: 2000,
        }),
        fetchAgg(R, {
          groupBy: ['urun', 'tur'], sum: [alan],
          where: { duzeykod: 4, il: EKSIK_IL }, limit: 100,
        }),
      ]);

      const kova = new Map<string, IlPayi[]>();
      for (const r of iller) {
        const d = num(r[`sum_${alan}`]);
        if (d <= 0) continue;
        const k = anahtar(r.urun, r.tur);
        const liste = kova.get(k) ?? [];
        liste.push({ il: String(r.yer ?? ''), deger: d, pay: 0 });
        kova.set(k, liste);
      }
      for (const r of istanbul) {
        const d = num(r[`sum_${alan}`]);
        if (d <= 0) continue;
        const k = anahtar(r.urun, r.tur);
        const liste = kova.get(k) ?? [];
        liste.push({ il: 'İstanbul', deger: d, pay: 0 });
        kova.set(k, liste);
      }

      return URUNLER.map((u) => {
        const liste = (kova.get(anahtar(u.urun, u.tur)) ?? []).sort((a, b) => b.deger - a.deger);
        const toplam = liste.reduce((t, r) => t + r.deger, 0);
        const ilk3 = liste.slice(0, 3).reduce((t, r) => t + r.deger, 0);
        return {
          ...u,
          ilSayisi: liste.length,
          ilk3Pay: toplam ? (ilk3 / toplam) * 100 : 0,
          lider: liste[0]?.il ?? '—',
          liderPay: toplam && liste[0] ? (liste[0].deger / toplam) * 100 : 0,
        };
      }).sort((a, b) => b.ilk3Pay - a.ilk3Pay);
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type DunyaSirasi = { ulke: string; uretim: number; turkiyeMi: boolean };

/**
 * FAO'ya göre bir ürünün dünya sıralaması.
 *
 * `ulkekod <= 4999` ŞART: 5000+ kodlar "World", "Asia" gibi TOPLAM satırlar.
 *
 * DÜRÜSTLÜK NOTU: FAO'nun Türkiye rakamları TÜİK'ten geliyor — 2024'te yapağı
 * 84.270, balmumu 3.316, ipek kozası 85; üçü de TÜİK'in ülke satırıyla aynı.
 * Yani bu bağımsız bir doğrulama DEĞİL, yalnızca uluslararası karşılaştırma.
 */
export function useDunyaSiralamasi(faoDesen: string | null, yil: number, adet = 10) {
  return useQuery({
    queryKey: ['diger-hayvansal-fao', faoDesen, yil, adet],
    enabled: faoDesen != null,
    queryFn: async () => {
      const rows = await fetchAgg(FAO, {
        groupBy: ['ulkead'], sum: ['uretim_deger'],
        where: { year: yil }, like: { urunad: faoDesen as string },
        whereLte: { ulkekod: 4999 },
        orderBy: 'sum_uretim_deger', dir: 'desc', limit: 300,
      });
      const tum: DunyaSirasi[] = rows
        .map((r) => ({
          ulke: String(r.ulkead ?? ''),
          uretim: num(r.sum_uretim_deger),
          turkiyeMi: /türkiye|turkey/i.test(String(r.ulkead ?? '')),
        }))
        .filter((r) => r.uretim > 0);

      const dunya = tum.reduce((t, r) => t + r.uretim, 0);
      const sira = tum.findIndex((r) => r.turkiyeMi);
      const tr = sira >= 0 ? tum[sira] : null;
      return {
        /** İlk `adet` ülke; Türkiye listede yoksa sonuna eklenmiyor, sıra ayrıca veriliyor. */
        ilkler: tum.slice(0, adet),
        ulkeSayisi: tum.length,
        dunyaToplam: dunya,
        turkiye: tr
          ? { sira: sira + 1, uretim: tr.uretim, pay: dunya ? (tr.uretim / dunya) * 100 : 0 }
          : null,
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}
