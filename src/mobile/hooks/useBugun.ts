import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../../tarpovizyon-basic/api';

/**
 * Ana sayfadaki "Bugün" sayıları.
 *
 * ─── NEDEN VAR ──────────────────────────────────────────────────────────────
 * Ana sayfa bir MENÜYDÜ: sayıyı görmek için önce bir sayfa açman gerekiyordu.
 * Buradaki üç gösterge doğrudan ana sayfaya geliyor — uygulamayı açan kişi
 * önce "ne oldu"yu görsün, gezinmeyi sonra düşünsün.
 *
 * ─── NEDEN BU ÜÇÜ ───────────────────────────────────────────────────────────
 * Veri tazeliği ölçüldü (YAYIN_HAZIRLIK.md): en güncel kaynaklar bunlar —
 * kanatlı 2026-05, çiğ süt 2026-02, ÜFE aylık senkronla güncel. Bayat bir
 * sayıyı ana sayfaya koymak, sayfayı açmadan yanlış bilgi vermek olurdu.
 *
 * ─── ÖNEMLİ: SAYILAR ARTIK GERÇEK ───────────────────────────────────────────
 * Bu kancadan önce ana sayfada "Tarım ÜFE 1 209 ▲%0.6" YAZIYORDU ve bu değer
 * elle yazılmıştı — veriyle ilgisi yoktu. Gerçek gösterge yıllık değişim
 * yüzdesi (`tarim_ufe`), Haziran 2026 için %9,55.
 */

export type BugunSatiri = {
  etiket: string;
  deger: string;
  alt: string;
  yol: string;
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2026-02-01 00:00:00" → "Şubat 2026" */
function donem(tarih: unknown): string {
  const d = new Date(String(tarih ?? '').replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : `${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
}

const sayi = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const tr = (n: number, basamak = 1) =>
  n.toLocaleString('tr-TR', { maximumFractionDigits: basamak });

/** Dizideki en son tarihli satır. */
function sonTarihli<T extends Record<string, unknown>>(satirlar: T[]): T | undefined {
  return satirlar
    .filter((r) => r.tarih)
    .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)))
    .at(-1);
}

export function useBugun() {
  return useQuery<BugunSatiri[]>({
    queryKey: ['bugun'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      // Biri düşerse diğerleri gösterilsin; ana sayfa tek bir uç yüzünden boş kalmasın.
      const [ufe, sut, kanatli] = await Promise.all([
        fetchRows('makro/ufe-aylik', { limit: '600' }).catch(() => []),
        fetchRows('cig-sut/ekonomik-gostergeler', { limit: '200' }).catch(() => []),
        fetchRows('kanatli/uretimleri', { limit: '400' }).catch(() => []),
      ]);

      const cikti: BugunSatiri[] = [];

      // Tarım ÜFE — yıllık değişim (%)
      const sonUfe = (ufe as Record<string, unknown>[])
        .filter((r) => r.tarim_ufe != null)
        .sort((a, b) => (sayi(a.yil) - sayi(b.yil)) || (sayi(a.ay) - sayi(b.ay)))
        .at(-1);
      if (sonUfe) {
        cikti.push({
          etiket: 'Tarım ÜFE',
          deger: `%${tr(sayi(sonUfe.tarim_ufe), 2)}`,
          alt: `Yıllık değişim · ${AYLAR[sayi(sonUfe.ay) - 1]} ${sayi(sonUfe.yil)}`,
          yol: '/tarpovizyon-basic/makro/tarim-ufe',
        });
      }

      // Çiğ süt tavsiye fiyatı
      const sonSut = sonTarihli(sut as Record<string, unknown>[]);
      const fiyat = sayi(sonSut?.usk_tavsiye_fiyat_tl_lt);
      if (fiyat > 0) {
        cikti.push({
          etiket: 'Çiğ süt fiyatı',
          deger: `${tr(fiyat, 2)} ₺/lt`,
          alt: `USK tavsiye · ${donem(sonSut?.tarih)}`,
          yol: '/tarpovizyon-basic/cig-sut/ekonomik-gostergeler',
        });
      }

      // Tavuk eti üretimi (aylık, ton)
      const sonKanatli = sonTarihli(kanatli as Record<string, unknown>[]);
      const ton = sayi(sonKanatli?.tavuk_eti_ton);
      if (ton > 0) {
        cikti.push({
          etiket: 'Tavuk eti üretimi',
          deger: `${tr(ton / 1000)} bin ton`,
          alt: donem(sonKanatli?.tarih),
          yol: '/tarpovizyon-basic/kanatli/pilic-eti-uretim',
        });
      }

      return cikti;
    },
  });
}
