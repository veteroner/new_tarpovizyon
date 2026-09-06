import { useQuery } from '@tanstack/react-query';
import { fetchRows, num, type Row } from '../../services/d1';
import {
  SUT_ZINCIRI, YEM_BITKILERI, bilesikOrtalama, sonAy,
  tufeUzeriFazla, yansima, yillikDegisim,
  type AySerisi, type Yansima, type ZincirDugum,
} from './zincir';

/**
 * Aktarım zinciri verisi.
 *
 * ─── TEK KAYNAK ─────────────────────────────────────────────────────────────
 * Hiçbir seri burada elle yazılmıyor; hepsi Basic'in de okuduğu D1 tablolarını
 * besleyen aynı uçlardan geliyor:
 *   yem bitkisi endeksleri → tuik/fiyatendex   (tuik_fiyatendex)
 *   TÜFE + gıda            → makro/tufe-aylik  (tufe_aylik)
 *   süt maliyet/fiyat      → cig-sut/ekonomik-gostergeler
 * Böylece bir tabloyu güncellemek hem Basic'i hem burayı aynı anda tazeliyor.
 */

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Endeks tablosunun geniş (yıl × 12 ay sütunu) düzenini ay serisine çevirir. */
function endekstenSeri(satirlar: Row[]): AySerisi {
  const s: AySerisi = {};
  for (const satir of satirlar) {
    const yil = Number(satir.yil);
    if (!Number.isFinite(yil)) continue;
    AYLAR.forEach((ad, i) => {
      const deger = num(satir[ad]);
      if (deger > 0) s[`${yil}-${String(i + 1).padStart(2, '0')}`] = deger;
    });
  }
  return s;
}

/** Uzun (satır başına bir ay) düzeni ay serisine çevirir. */
function tarihtenSeri(satirlar: Row[], alan: string): AySerisi {
  const s: AySerisi = {};
  for (const satir of satirlar) {
    const ay = String(satir.tarih ?? '').slice(0, 7);
    const deger = num(satir[alan]);
    if (ay.length === 7 && deger > 0) s[ay] = deger;
  }
  return s;
}

export type ZincirVerisi = {
  yansima: Yansima | null;
  sut: ZincirDugum[];
  /** Bileşiğin son 36 ayı — küçük grafik için. */
  bilesikSeri: { ay: string; deger: number }[];
};

export function useZincir() {
  return useQuery({
    queryKey: ['aktarim-zinciri'],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<ZincirVerisi> => {
      /* Kanatlı maliyet-fiyat ucu ARTIK ÇEKİLMİYOR — kanatlı kolu kaldırıldı
         (gerekçesi `zincir.ts`te). */
      const [tufe, sut, ...bitkiler] = await Promise.all([
        fetchRows('makro/tufe-aylik', { limit: 600 }),
        fetchRows('cig-sut/ekonomik-gostergeler', { limit: 400 }),
        ...YEM_BITKILERI.map((b) =>
          fetchRows('tuik/fiyatendex', { endeks: 'T-UFE', maddekod: b.maddekod, limit: 60 })),
      ]);

      /*
       * Genel TÜFE ve gıda kalemi.
       *
       * DİKKAT: `tufe_aylik` ENDEKS DEĞİL, ORAN tutuyor — sütunlardaki 31,75
       * "endeks 31,75" değil "yıllık %31,75 artış" demek. Buraya bir de yıllık
       * değişim uygulamak (ilk yazdığımda yaptığım hata) oranın oranını
       * hesaplıyor ve bütün zinciri kaydırıyordu: Temmuz 2026 bileşiği
       * −11,0 yerine +26,0 çıkmıştı. Bu iki seri OLDUĞU GİBİ kullanılır;
       * yıllık değişim yalnızca seviye tutan serilere (yem fiyatı TL, endeks)
       * uygulanır.
       */
      const tufeDegisim: AySerisi = {};
      const gidaDegisim: AySerisi = {};
      for (const satir of tufe) {
        const ay = `${satir.yil}-${String(satir.ay).padStart(2, '0')}`;
        const genel = num(satir.tufe);
        const gida = num(satir.gida_alkolsuz);
        if (genel) tufeDegisim[ay] = genel;
        if (gida) gidaDegisim[ay] = gida;
      }
      const fazla = (s: AySerisi) => tufeUzeriFazla(yillikDegisim(s), tufeDegisim);

      /* Bileşik yem bitkisi baskısı — altı ürünün TÜFE üzeri fazlalarının
         ortalaması. Tek ürün yerine bileşik: ölçülen ilişki daha güçlü
         (r=0,95 vs tek üründe 0,79–0,93) ve tek ürünün hasat şoku
         zinciri yanıltmıyor. */
      const bilesik = bilesikOrtalama(
        bitkiler.map((satirlar) => fazla(endekstenSeri(satirlar))).filter((s) => Object.keys(s).length),
      );

      /* Gıda kalemi zaten oran; yalnızca genel TÜFE'nin üzeri alınıyor. */
      const gidaFazla = tufeUzeriFazla(gidaDegisim, tufeDegisim);

      const olcu = (iskelet: typeof SUT_ZINCIRI, seriler: Record<string, AySerisi>) =>
        iskelet.map((halka): ZincirDugum => {
          const seri = seriler[halka.id];
          const son = seri ? sonAy(seri) : null;
          return { ...halka, deger: son?.deger ?? null, ay: son?.ay ?? null };
        });

      return {
        yansima: yansima(bilesik),
        sut: olcu(SUT_ZINCIRI, {
          'yem-bitkisi': bilesik,
          'yem-fiyati': fazla(tarihtenSeri(sut, 'sut_yemi_19hp')),
          maliyet: fazla(tarihtenSeri(sut, 'uretim_maliyeti_tl_lt')),
          'uretici-fiyati': fazla(tarihtenSeri(sut, 'usk_tavsiye_fiyat_tl_lt')),
          'gida-enflasyonu': gidaFazla,
        }),
        bilesikSeri: Object.keys(bilesik).sort().slice(-36)
          .map((ay) => ({ ay, deger: bilesik[ay] })),
      };
    },
  });
}
