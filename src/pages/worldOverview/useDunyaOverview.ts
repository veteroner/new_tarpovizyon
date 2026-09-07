import { useQuery } from '@tanstack/react-query';
import { fetchAgg, num, type Row } from '../../services/d1';
import {
  TICARET_URUNLERI, ULKELER, URUNLER, seriSinyali, sirala, type DunyaSinyal,
} from './dunyaSinyal';

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
 * ─── DIŞ TİCARET: ÖNCE TABLO ONARILDI ───────────────────────────────────────
 * `fao_balans` ilk bakıldığında BOZUKTU: 2023 yılında 16.319 ülke×ürün çifti
 * iki kez yazılmıştı (2022 satırları 2023 damgasıyla yüklenmiş, 2022'de
 * 20.000 yerine 2.678 satır kalmıştı). Toplama 2023'te ikiye katlıyor,
 * her ülke ithalatını %75–1300 artırmış görünüyordu.
 *
 * FAO'nun kendi bulk dosyasıyla karşılaştırıldı (API 401 veriyor, bulk açık):
 * çiftin ALT id'li satırının 2022 olduğu 380 çiftte 380/380 doğrulandı,
 * uyuşmazlık sıfır. 16.319 satır 2022'ye taşındı; artık hiçbir yılda ikiz yok
 * ve Almanya sığır eti ithalatı FAO ile birebir (2021:463, 2022:463, 2023:429).
 */

const BASLANGIC_YIL = 2014;
const R_BITKISEL = 'fao/uretim-bitkisel-birincil';
const R_BALANS = 'fao/balans';

export function useDunyaOverview() {
  return useQuery({
    queryKey: ['dunya-panosu'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<DunyaSinyal[]> => {
      const ulkeAdlari = ULKELER.map((u) => u.fao);

      const [cevaplar, ithalat, ihracat] = await Promise.all([
        Promise.all(URUNLER.map((u) => fetchAgg(R_BITKISEL, {
          groupBy: ['ulkead', 'year'],
          sum: ['uretim_deger'],
          where: { urunad: u.fao },
          whereIn: { ulkead: ulkeAdlari },
          whereGte: { year: BASLANGIC_YIL },
          limit: 500,
        }))),
        /* Dış ticaret: gıda denge tablosunda ithalat `imp_v`, ihracat `exp_v`.
           Yıl sütunu burada `yil`, üretim tablosunda `year` — aynı veri
           ailesinde iki farklı ad; karıştırılırsa süzgeç sessizce boş döner. */
        Promise.all(TICARET_URUNLERI.map((u) => fetchAgg(R_BALANS, {
          groupBy: ['ulkead', 'yil'],
          sum: ['imp_v'],
          where: { urunad: u.fao },
          whereIn: { ulkead: ulkeAdlari },
          whereGte: { yil: BASLANGIC_YIL },
          limit: 500,
        }))),
        Promise.all(TICARET_URUNLERI.map((u) => fetchAgg(R_BALANS, {
          groupBy: ['ulkead', 'yil'],
          sum: ['exp_v'],
          where: { urunad: u.fao },
          whereIn: { ulkead: ulkeAdlari },
          whereGte: { yil: BASLANGIC_YIL },
          limit: 500,
        }))),
      ]);

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
          const s = seriSinyali('uretim', ad, urun.ad, seri);
          if (s) sinyaller.push(s);
        }
      });

      /* Dış ticaret aynı kurala tabi; tek fark alan ve yıl sütunu adı. */
      const ticaret = (
        cevap: Row[][], alan: string, tur: 'ithalat' | 'ihracat',
      ) => TICARET_URUNLERI.forEach((urun, i) => {
        const seriler = new Map<string, [number, number][]>();
        for (const satir of cevap[i]) {
          const ulke = String(satir.ulkead ?? '');
          const yil = Number(satir.yil);
          const deger = num(satir[alan]);
          if (!ulke || !Number.isFinite(yil) || !deger) continue;
          if (!seriler.has(ulke)) seriler.set(ulke, []);
          seriler.get(ulke)!.push([yil, deger]);
        }
        for (const { fao, ad } of ULKELER) {
          const seri = seriler.get(fao);
          if (!seri) continue;
          const s = seriSinyali(tur, ad, urun.ad, seri);
          if (s) sinyaller.push(s);
        }
      });
      ticaret(ithalat as Row[][], 'sum_imp_v', 'ithalat');
      ticaret(ihracat as Row[][], 'sum_exp_v', 'ihracat');

      return sirala(sinyaller);
    },
  });
}
