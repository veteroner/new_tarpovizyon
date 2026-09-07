import { useQuery } from '@tanstack/react-query';
import { fetchAgg, num, type Row } from '../../services/d1';
import { MAKRO_URUNLER, tekrarOruntusu, type MakroSatir } from './makroOlcek';

/**
 * Makro ölçek verisi — ürün başına Türkiye ve dünya toplamı.
 *
 * Her ürün için iki istek (Türkiye + dünya), toplama ucuyla ve yıl bazında
 * gruplanmış: ham satır inmiyor, sunucu topluyor. Beş ürün × iki = on istek,
 * her biri ~25 satır.
 *
 * Yıl aralığı KISITLANMIYOR: örüntü ölçümü uzun geçmiş istiyor. 23 yıllık
 * değişim gözlemi, "düşüş sonrası ne oldu" sorusunu 7-11 vaka üzerinden
 * yanıtlamaya yetiyor; on yılla sınırlasaydık vaka sayısı üçe düşerdi ve
 * ortalama tek bir kötü hasadın esiri olurdu.
 */

const R = 'fao/uretim-bitkisel-birincil';

const seriyeCevir = (rows: Row[]): [number, number][] => rows
  .map((r) => [Number(r.year), num(r.sum_uretim_deger)] as [number, number])
  .filter(([y, v]) => Number.isFinite(y) && v > 0)
  .sort((a, b) => a[0] - b[0]);

const sonDegisim = (seri: [number, number][]): { degisim: number; yil: number } | null => {
  if (seri.length < 2) return null;
  const [oy, ov] = seri[seri.length - 2];
  const [sy, sv] = seri[seri.length - 1];
  void oy;
  return ov > 0 ? { degisim: ((sv - ov) / ov) * 100, yil: sy } : null;
};

export function useMakroOlcek() {
  return useQuery({
    queryKey: ['makro-olcek'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<MakroSatir[]> => {
      const istek = (urun: string, ulke: string) => fetchAgg(R, {
        groupBy: ['year'],
        sum: ['uretim_deger'],
        where: { urunad: urun, ulkead: ulke },
        limit: 40,
      });

      const cevaplar = await Promise.all(
        MAKRO_URUNLER.flatMap((u) => [istek(u.fao, 'Türkiye'), istek(u.fao, 'World')]),
      );

      return MAKRO_URUNLER.map((u, i) => {
        const trSeri = seriyeCevir(cevaplar[i * 2] as Row[]);
        const dunyaSeri = seriyeCevir(cevaplar[i * 2 + 1] as Row[]);
        const trSon = sonDegisim(trSeri);
        const dunyaSon = sonDegisim(dunyaSeri);
        return {
          urun: u.ad,
          trDegisim: trSon?.degisim ?? null,
          dunyaDegisim: dunyaSon?.degisim ?? null,
          yil: trSon?.yil ?? dunyaSon?.yil ?? null,
          tr: tekrarOruntusu(trSeri),
          dunya: tekrarOruntusu(dunyaSeri),
        };
      });
    },
  });
}
