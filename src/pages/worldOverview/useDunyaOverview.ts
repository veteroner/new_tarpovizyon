import { useQuery } from '@tanstack/react-query';
import { fetchAgg, num, type Row } from '../../services/d1';
import { ULKELER, URUNLER, sirala, uretimSinyali, type DunyaSinyal } from './dunyaSinyal';

/**
 * Dünya panosu verisi — FAO ülke bazlı üretim.
 *
 * ─── NEDEN TOPLAMA UCU ──────────────────────────────────────────────────────
 * `fao_uretim_bitkisel_birincil` bütün ülkeleri, bütün ürünleri ve 25 yılı
 * tutuyor; tek bir ürünün ham hâli bile 3.700 satır. Altı ürün çekilseydi
 * tarayıcıya megabaytlar inerdi. Toplama ucu gruplamayı SUNUCUDA yapıyor ve
 * ülke süzgeciyle (`whereIn`) yük 15 ülke × 11 yıla iniyor — ürün başına
 * ~165 satır.
 *
 * ─── NEDEN 11 YIL ───────────────────────────────────────────────────────────
 * Eşik her serinin kendi geçmişinden hesaplanıyor ve medyan alabilmek için
 * makul bir gözlem sayısı gerekiyor. 2014'ten beri ~11 değişim gözlemi
 * veriyor; daha kısası medyanı tek bir kötü hasata teslim ederdi.
 *
 * ─── DIŞ TİCARET NEDEN YOK ──────────────────────────────────────────────────
 * `fao_balans` tablosu ithalat/ihracat tutuyor ama 2023 yılı BOZUK: 16.319
 * ülke×ürün çifti iki kez yazılmış (2022 satırları 2023 damgasıyla yüklenmiş,
 * 2022 neredeyse boş). Toplama bu yüzden 2023'te ikiye katlıyor ve her ülke
 * ithalatını %75–%1300 artırmış gibi görünüyor. Ölçüldü ve doğrulandı; tablo
 * düzeltilene kadar buradan sinyal üretilmiyor. Bozuk veriden "Çin ithalatını
 * ikiye katladı" cümlesi kurmak, hiç göstermemekten kötü.
 */

const BASLANGIC_YIL = 2014;
const R_BITKISEL = 'fao/uretim-bitkisel-birincil';

export function useDunyaOverview() {
  return useQuery({
    queryKey: ['dunya-panosu'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<DunyaSinyal[]> => {
      const ulkeAdlari = ULKELER.map((u) => u.fao);

      const cevaplar = await Promise.all(
        URUNLER.map((u) => fetchAgg(R_BITKISEL, {
          groupBy: ['ulkead', 'year'],
          sum: ['uretim_deger'],
          where: { urunad: u.fao },
          whereIn: { ulkead: ulkeAdlari },
          whereGte: { year: BASLANGIC_YIL },
          limit: 500,
        })),
      );

      const sinyaller: DunyaSinyal[] = [];
      URUNLER.forEach((urun, i) => {
        /* ülke → yıl → üretim */
        const ulkeSerileri = new Map<string, [number, number][]>();
        for (const satir of cevaplar[i] as Row[]) {
          const ulke = String(satir.ulkead ?? '');
          const yil = Number(satir.year);
          const deger = num(satir.sum_uretim_deger);
          if (!ulke || !Number.isFinite(yil) || !deger) continue;
          if (!ulkeSerileri.has(ulke)) ulkeSerileri.set(ulke, []);
          ulkeSerileri.get(ulke)!.push([yil, deger]);
        }
        for (const { fao, ad } of ULKELER) {
          const seri = ulkeSerileri.get(fao);
          if (!seri) continue;
          const s = uretimSinyali(ad, urun.ad, seri);
          if (s) sinyaller.push(s);
        }
      });

      return sirala(sinyaller);
    },
  });
}
