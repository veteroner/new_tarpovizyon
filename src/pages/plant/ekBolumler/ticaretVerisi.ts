import { useQuery } from '@tanstack/react-query';
import { fetchAgg, type Row } from '../../../services/d1';

/**
 * Bitkisel sayfaların ek bölümleri için veri katmanı — dış ticaret ve FAO.
 *
 * ─── NEDEN VAR ──────────────────────────────────────────────────────────────
 * Dokuz bitkisel sayfa (tahıl, sebze, meyve, bakliyat, yağlı tohum, şeker,
 * kuruyemiş, içecek, lif) aynı bileşeni çağırıyor ve tek farkları ürün
 * filtresi. Her birinin "ek bölümü" vardı ama HİÇBİRİ VERİ ÇEKMİYORDU —
 * hepsi elle yazılmış sabit dizilerdi. En kötüsü lif sayfasındaki
 * `PAMUK_KALITE`: uydurma sayılar, üstelik "ICAC kriterlerine göre" diye
 * kaynak gösterilerek. Bu modül o bölümleri gerçek veriye bağlıyor.
 *
 * ─── KÜP TUZAĞI ─────────────────────────────────────────────────────────────
 * `tuik_ticaret_bitkisel` düz bir olgu tablosu DEĞİL, önceden toplanmış bir
 * küp. Üç kırılım ekseni var:
 *
 *   duzey_1: 'tüm'  | 'ülke'        (ülke kırılımı var mı)
 *   duzey_2: 'ürün' | 'alt ürün'    (ürün kırılımı derinliği)
 *   duzey_3: 'yil'  | 'ay'          (zaman kırılımı)
 *
 * Süzmeden toplarsan aynı miktarı üç kez sayarsın. Ölçüldü: süzgeçsiz
 * "Buğday 2024 ithalatı" 45,4 milyon ton çıkıyor — gerçeği 5,7 milyon.
 *
 * Doğru süzgeçle çıkan seri gerçekle birebir tutuyor: 2020–23'te 9–12 milyon
 * ton, 2024'te 5,7 ve 2025'te 4,6 — Türkiye'nin buğday ithalatını kısıtladığı
 * dönem. Bu, süzgecin doğruluğunun bağımsız kanıtı.
 */

const TICARET = 'tuik/ticaret-bitkisel';
const FAO_BITKISEL = 'fao/uretim-bitkisel-birincil';

/** Ülke kırılımı OLMADAN, ürün düzeyinde, YILLIK — çift sayımı önleyen süzgeç. */
const KUP_TOPLAM = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' } as const;
/** Ülke kırılımıyla, ürün düzeyinde, yıllık. */
const KUP_ULKE = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'yil' } as const;

/** KG → ton. Tabloda miktar birimi KG. */
const ton = (kg: unknown) => (Number(kg) || 0) / 1000;

export type YilSerisi = { yil: number; ithalat: number; ihracat: number };

/**
 * Bir ürünün yıllara göre ithalat/ihracatı (ton).
 *
 * `urunler` birden fazlaysa hepsi toplanıyor — "yağlı tohumlar" gibi grup
 * sorularında tek ürün yetmiyor.
 */
export function useTicaretSerisi(urunler: string[], ilkYil = 2015) {
  return useQuery({
    queryKey: ['ticaret-seri', urunler, ilkYil],
    queryFn: async (): Promise<YilSerisi[]> => {
      const rows = await fetchAgg(TICARET, {
        groupBy: ['yil'],
        sum: ['ithalat_mik', 'ihracat_mik'],
        where: KUP_TOPLAM,
        whereIn: { ana_urun: urunler },
        whereGte: { yil: ilkYil },
        orderBy: 'yil',
        dir: 'asc',
        limit: 40,
      });
      return rows.map((r: Row) => ({
        yil: Number(r.yil),
        ithalat: ton(r.sum_ithalat_mik),
        ihracat: ton(r.sum_ihracat_mik),
      }));
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type UlkePayi = { ulke: string; deger: number };

/**
 * Bir ürünün ihracat ya da ithalatında ülke kırılımı (USD).
 *
 * Miktar değil DEĞER kullanılıyor: fındıkta soru "kime satıyoruz" değil,
 * "para nereden geliyor". Kilo başına fiyat pazara göre değişiyor.
 */
export function useUlkeKirilimi(
  urunler: string[],
  yon: 'ihracat' | 'ithalat',
  yil: number,
  adet = 8,
) {
  const alan = yon === 'ihracat' ? 'ihracat_deger' : 'ithalat_deger';
  return useQuery({
    queryKey: ['ticaret-ulke', urunler, yon, yil, adet],
    queryFn: async (): Promise<UlkePayi[]> => {
      const rows = await fetchAgg(TICARET, {
        groupBy: ['ulke'],
        sum: [alan],
        where: { ...KUP_ULKE, yil },
        whereIn: { ana_urun: urunler },
        orderBy: `sum_${alan}`,
        dir: 'desc',
        limit: adet,
      });
      return rows
        .map((r: Row) => ({ ulke: String(r.ulke ?? ''), deger: Number(r[`sum_${alan}`]) || 0 }))
        .filter((r) => r.deger > 0);
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type DunyaSirasi = { ulke: string; uretim: number; turkiyeMi: boolean };

/**
 * FAO'ya göre bir ürünün dünya sıralaması.
 *
 * `ulkekod < 5000` ŞART: FAO tablosunda "World", "Asia", "Europe" gibi TOPLAM
 * satırlar da ülke gibi duruyor ve kodları 5000'den büyük. Süzmezsen listenin
 * başı "World 794 milyon ton" oluyor.
 */
export function useDunyaSiralamasi(urunDesen: string, yil: number, adet = 10) {
  return useQuery({
    queryKey: ['fao-sira', urunDesen, yil, adet],
    queryFn: async (): Promise<DunyaSirasi[]> => {
      const rows = await fetchAgg(FAO_BITKISEL, {
        groupBy: ['ulkead'],
        sum: ['uretim_deger'],
        where: { year: yil },
        like: { urunad: urunDesen },
        /* 4999 ve altı gerçek ülke; 5000+ FAO'nun TOPLAM satırları. `whereLt`
           diye bir seçenek yok, `whereLte` var — canlı uçta doğrulandı. */
        whereLte: { ulkekod: 4999 },
        orderBy: 'sum_uretim_deger',
        dir: 'desc',
        limit: adet,
      });
      return rows.map((r: Row) => {
        const ad = String(r.ulkead ?? '');
        return {
          ulke: ad,
          uretim: Number(r.sum_uretim_deger) || 0,
          turkiyeMi: /türkiye|turkey/i.test(ad),
        };
      });
    },
    staleTime: 30 * 60 * 1000,
  });
}

/** Türkiye'nin o üründeki dünya sırası ve payı — listede yoksa null. */
export function siraVePay(liste: DunyaSirasi[] | undefined) {
  if (!liste?.length) return null;
  const i = liste.findIndex((r) => r.turkiyeMi);
  if (i < 0) return null;
  const toplam = liste.reduce((t, r) => t + r.uretim, 0);
  return { sira: i + 1, pay: toplam ? (liste[i].uretim / toplam) * 100 : 0, uretim: liste[i].uretim };
}

/* ══════════════════════════════════════════════════════════════════════════
   TÜİK üretim tarafı — meyve sayfasının ağaç yaş yapısı
   ══════════════════════════════════════════════════════════════════════════ */

const BITKISEL = 'tuik/bitkisel-uretim';

export type AgacYas = { urun: string; veren: number; vermeyen: number };

/**
 * Ürün bazında meyve veren / vermeyen ağaç sayısı (Türkiye satırı).
 *
 * TÜİK ağaçları bu iki kategoride AYRI sayıyor; oran bahçenin yaş yapısını
 * veriyor. Vermeyen payı yüksekse bahçe yenileniyor (bugünkü üretim düşük ama
 * yarın artacak), çok düşükse yaşlanıyor.
 *
 * `duzeykod=1` (Türkiye satırı) — illeri toplamak yerine ülke satırı, çünkü
 * ikisi aynı sonucu veriyor ve bu tek sorgu.
 */
export function useAgacYasYapisi(urunler: string[], yil: number) {
  return useQuery({
    queryKey: ['agac-yas', urunler, yil],
    queryFn: async (): Promise<AgacYas[]> => {
      const alan = `y${yil}`;
      const [veren, vermeyen] = await Promise.all([
        fetchAgg(BITKISEL, {
          groupBy: ['urun'], sum: [alan],
          where: { duzeykod: 1, unsur: 'Meyve Veren Yaşta Ağaç Sayısı' },
          whereIn: { urun: urunler }, limit: 200,
        }),
        fetchAgg(BITKISEL, {
          groupBy: ['urun'], sum: [alan],
          where: { duzeykod: 1, unsur: 'Meyve Vermeyen Yaşta Ağaç Sayısı' },
          whereIn: { urun: urunler }, limit: 200,
        }),
      ]);
      const harita = new Map<string, AgacYas>();
      for (const r of veren) {
        harita.set(String(r.urun), {
          urun: String(r.urun), veren: Number(r[`sum_${alan}`]) || 0, vermeyen: 0,
        });
      }
      for (const r of vermeyen) {
        const k = String(r.urun);
        const v = harita.get(k) ?? { urun: k, veren: 0, vermeyen: 0 };
        v.vermeyen = Number(r[`sum_${alan}`]) || 0;
        harita.set(k, v);
      }
      return [...harita.values()];
    },
    staleTime: 30 * 60 * 1000,
  });
}
