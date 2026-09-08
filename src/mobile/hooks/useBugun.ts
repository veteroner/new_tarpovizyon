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
 * ─── NEDEN BU DÖRDÜ ─────────────────────────────────────────────────────────
 * Ölçüt tazelik değil yalnız; kartın BİR ŞEY SÖYLEMESİ gerekiyor.
 *
 * Tavuk eti üretimi ÇIKARILDI. İki sebeple: en bayat gösterge (Haziran) ve
 * tek hacim göstergesiydi — "232,2 bin ton" tek başına iyi mi kötü mü
 * söylemiyor, okunması için geçen yılın aynı ayına göre bilinmesi gerekiyor.
 * Oran gösteren kartlar bu bağlamı kendi içlerinde taşıyor.
 *
 * GFE (tarımsal girdi) EKLENDİ: eski üç kartın üçü de gelir ya da hacim
 * tarafındaydı, MALİYET tarafı hiç yoktu. Üretici için "ne ödüyorum" en az
 * "ne kazanıyorum" kadar belirleyici, ve ikisi yan yana durunca makas
 * kendiliğinden görünüyor — Temmuz 2026'da ürün fiyatı %18,81, girdi %32,06.
 * Makas TEK SAYI olarak yazılmıyor: iki serinin son ayları farklı olabiliyor
 * (Tarım ÜFE Temmuz, GFE Haziran) ve Tarım ÜFE çok oynak (Mayıs %43,08 →
 * Haziran %9,55), o yüzden tek bir fark sayısı ay seçimine fazla duyarlı.
 *
 * Gıda enflasyonu EKLENDİ: en taze seri (Ağustos) ve üreticinin ürettiğinin
 * market ucu. TÜFE ile Tarım ÜFE ayrı endeksler, ayrı yayım takvimleri.
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
      const [ufe, gfe, sut, tufe] = await Promise.all([
        fetchRows('makro/ufe-aylik', { limit: '600' }).catch(() => []),
        fetchRows('makro/gfe-alt-grup-aylik',
          { alt_grup: 'Tarımsal Girdi Fiyat Endeksi', limit: '600' }).catch(() => []),
        fetchRows('cig-sut/ekonomik-gostergeler', { limit: '200' }).catch(() => []),
        fetchRows('makro/tufe-aylik', { limit: '600' }).catch(() => []),
      ]);

      /** yil/ay taşıyan seride son ay. */
      const sonAy = (satirlar: unknown[], alan: string) =>
        (satirlar as Record<string, unknown>[])
          .filter((r) => r[alan] != null)
          .sort((a, b) => (sayi(a.yil) - sayi(b.yil)) || (sayi(a.ay) - sayi(b.ay)))
          .at(-1);

      const cikti: BugunSatiri[] = [];

      // Tarım ÜFE — üreticinin eline geçen fiyat, yıllık değişim (%)
      const sonUfe = sonAy(ufe, 'tarim_ufe');
      if (sonUfe) {
        cikti.push({
          etiket: 'Tarım ÜFE',
          deger: `%${tr(sayi(sonUfe.tarim_ufe), 2)}`,
          alt: `Ürün fiyatı · ${AYLAR[sayi(sonUfe.ay) - 1]} ${sayi(sonUfe.yil)}`,
          yol: '/tarpovizyon-basic/makro/tarim-ufe',
        });
      }

      // Tarımsal girdi (GFE) — üreticinin ödediği fiyat. Tarım ÜFE'nin hemen
      // ardında: makas ancak yan yana okununca görünüyor.
      const sonGfe = sonAy(gfe, 'yillik_degisim');
      if (sonGfe) {
        cikti.push({
          etiket: 'Tarımsal girdi',
          deger: `%${tr(sayi(sonGfe.yillik_degisim), 2)}`,
          alt: `Girdi maliyeti · ${AYLAR[sayi(sonGfe.ay) - 1]} ${sayi(sonGfe.yil)}`,
          yol: '/tarpovizyon-basic/makro/tarimsal-gfe',
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

      // Gıda enflasyonu — ürettiğinin market ucu. `tufe_aylik` ORAN tutuyor
      // (endeks değil), yani alan doğrudan yıllık değişim yüzdesi.
      const sonTufe = sonAy(tufe, 'gida_alkolsuz');
      if (sonTufe) {
        cikti.push({
          etiket: 'Gıda enflasyonu',
          deger: `%${tr(sayi(sonTufe.gida_alkolsuz), 2)}`,
          alt: `Yıllık · ${AYLAR[sayi(sonTufe.ay) - 1]} ${sayi(sonTufe.yil)}`,
          yol: '/tarpovizyon-basic/makro/tufe',
        });
      }

      return cikti;
    },
  });
}
