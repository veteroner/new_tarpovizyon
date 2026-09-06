import { useQuery } from '@tanstack/react-query';
import { fetchRows, num, type Row } from '../../services/d1';
import {
  gidaEnflasyonSinyali, karlilikSinyali, sirala, uretimSinyali,
  yeterlilikSinyali, type Sinyal,
} from './rontgen';

/**
 * Röntgen verisi — sinyalleri hesaplamak için gereken en son ölçüler.
 *
 * Her kaynak SON SATIRINI veriyor; seri gerekmiyor çünkü sinyaller "şu an ne
 * durumda" sorusunu yanıtlıyor, trend grafikleri zaten sayfalarda var.
 */

const SON = <T extends Row>(rows: T[], anahtar = 'tarih'): T | undefined =>
  [...rows].sort((a, b) => String(a[anahtar] ?? '').localeCompare(String(b[anahtar] ?? ''))).at(-1);

export function useRontgen() {
  return useQuery({
    queryKey: ['tarim-rontgeni'],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Sinyal[]> => {
      const [
        beyazEt, yumurta, sut, kirmiziEt, yeterlilik, uretim, tufe,
      ] = await Promise.all([
        fetchRows('kanatli/maliyet-fiyat', { limit: 400 }),
        fetchRows('yumurta/maliyet-fiyat', { limit: 400 }),
        fetchRows('cig-sut/ekonomik-gostergeler', { limit: 400 }),
        fetchRows('kirmizi-et/ekonomik-gostergeler', { limit: 400 }),
        fetchRows('tr/yeterlilikler', { limit: 5 }),
        fetchRows('tr/hayvansal-urun-uretimi', { limit: 200 }),
        fetchRows('makro/tufe-aylik', { limit: 600 }),
      ]);

      const sinyaller: Sinyal[] = [];
      const ay = (r?: Row) => String(r?.tarih ?? '').slice(0, 7);

      /* ── Kârlılık: dört sektör ─────────────────────────────────────────── */
      const k = [
        { ad: 'Beyaz et', rows: beyazEt, yol: '/tarpovizyon/turkey/white-meat' },
        { ad: 'Yumurta', rows: yumurta, yol: '/tarpovizyon/turkey/eggs' },
        { ad: 'Çiğ süt', rows: sut, yol: '/tarpovizyon/turkey/milk' },
        { ad: 'Kırmızı et', rows: kirmiziEt, yol: '/tarpovizyon/turkey/red-meat' },
      ];
      for (const s of k) {
        const son = SON(s.rows);
        const sinyal = karlilikSinyali(s.ad, son ? num(son.karlilik) : null, ay(son), s.yol);
        if (sinyal) sinyaller.push(sinyal);
      }

      /* ── Yeterlilik: tek satırlık tablo, oran olarak tutuluyor ─────────── */
      const y = yeterlilik[0];
      if (y) {
        const kalemler = [
          { ad: 'Kırmızı et', alan: 'kirmizi_et_ton', yol: '/tarpovizyon/turkey/red-meat' },
          { ad: 'Çiğ süt', alan: 'sut_ton', yol: '/tarpovizyon/turkey/milk' },
          { ad: 'Beyaz et', alan: 'beyaz_et_ton', yol: '/tarpovizyon/turkey/white-meat' },
          { ad: 'Yumurta', alan: 'yumurta_milyon_adet', yol: '/tarpovizyon/turkey/eggs' },
          { ad: 'Bal', alan: 'bal_ton', yol: '/tarpovizyon/turkey/beekeeping' },
        ];
        for (const kk of kalemler) {
          const s = yeterlilikSinyali(kk.ad, num(y[kk.alan]) || null, kk.yol);
          if (s) sinyaller.push(s);
        }
      }

      /* ── Üretim değişimi: özet tablonun son iki yılı ───────────────────── */
      const yillik = [...uretim]
        .map((r) => ({ yil: Number(r.yil), r }))
        .filter((x) => Number.isFinite(x.yil))
        .sort((a, b) => a.yil - b.yil);
      const sonY = yillik.at(-1);
      const oncekiY = yillik.at(-2);
      if (sonY && oncekiY) {
        const olcum = [
          { ad: 'Kırmızı et', alan: 'kirmizi_et_uretimi', yol: '/tarpovizyon/turkey/red-meat' },
          { ad: 'Çiğ süt', alan: 'cig_sut_uretimi', yol: '/tarpovizyon/turkey/milk' },
          { ad: 'Yumurta', alan: 'yumurta_milyon_adet', yol: '/tarpovizyon/turkey/eggs' },
          { ad: 'Kanatlı eti', alan: 'kanatli_eti_ton', yol: '/tarpovizyon/turkey/white-meat' },
          { ad: 'Bal', alan: 'bal_uretimi', yol: '/tarpovizyon/turkey/beekeeping' },
        ];
        for (const o of olcum) {
          const s = uretimSinyali(
            o.ad, num(oncekiY.r[o.alan]) || null, num(sonY.r[o.alan]) || null,
            String(sonY.yil), o.yol,
          );
          if (s) sinyaller.push(s);
        }
      }

      /* ── Gıda enflasyonu: genel TÜFE'ye göre ──────────────────────────── */
      const tufeSirali = [...tufe]
        .map((r) => ({ satir: r, anahtar: `${r.yil}-${String(r.ay).padStart(2, '0')}` }))
        .sort((a, b) => a.anahtar.localeCompare(b.anahtar));
      const sonTufe = tufeSirali.at(-1);
      if (sonTufe) {
        const s = gidaEnflasyonSinyali(
          num(sonTufe.satir.gida_alkolsuz) || null, num(sonTufe.satir.tufe) || null,
          sonTufe.anahtar, '/tarpovizyon/turkey/price-index',
        );
        if (s) sinyaller.push(s);
      }

      return sirala(sinyaller);
    },
  });
}
