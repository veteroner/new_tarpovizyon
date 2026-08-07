import { useEffect, useMemo, useState } from 'react';
import { fetchRows } from '../../services/d1';

export type MaddeFiyat = {
  maddekod: string;
  urun: string;
  birim: string;
  yil: number;
  ay: number;
  fiyat: number | null;
};

export type FiyatDegisim = {
  urun: string;
  birim: string;
  sonFiyat: number;
  oncekiFiyat: number;
  degisim: number;
};

const sayi = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Tarım Ürünleri ÜFE Madde Fiyatları (TL).
 *
 * Sayfanın geri kalanı ENDEKS gösteriyor (2020=100) — yani "ne kadar arttı".
 * Bu veri aynı maddelerin KAÇ LİRA olduğunu söylüyor. İkisi farklı soruların
 * cevabı olduğu için ayrı bir bölüm; endeksle aynı grafikte gösterilirse
 * ölçekleri karışır.
 *
 * Kaynak TÜİK SDMX, 2024-01'den itibaren aylık; günlük senkron güncel tutuyor.
 */
export function useMaddeFiyatData() {
  const [rows, setRows] = useState<MaddeFiyat[]>([]);
  const [loading, setLoading] = useState(true);
  const [secili, setSecili] = useState<string>('');

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const ham = await fetchRows('tuik/madde-fiyat', { limit: 5000 });
        if (iptal) return;
        setRows(ham.map((r) => ({
          maddekod: String(r.maddekod ?? ''),
          urun: String(r.urun ?? ''),
          birim: String(r.birim ?? ''),
          yil: Number(r.yil) || 0,
          ay: Number(r.ay) || 0,
          fiyat: sayi(r.fiyat),
        })));
      } catch (e) {
        if (!iptal) console.error('Madde fiyatları yüklenemedi:', e);
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, []);

  const urunler = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (!m.has(r.urun)) m.set(r.urun, r.birim); });
    return [...m.entries()]
      .map(([urun, birim]) => ({ urun, birim }))
      .sort((a, b) => a.urun.localeCompare(b.urun, 'tr'));
  }, [rows]);

  /*
   * Varsayılan ürün. Alfabetik ilk sırada "Ahtapot" var; bir tarım panosunun
   * açılışta onu göstermesi anlamsız. Türkiye tarımında ağırlığı olan
   * ürünlerden ilk BULUNANI seçiyoruz — liste veriden doğrulanıyor, yani
   * TÜİK madde listesini değiştirirse sayfa yine de dolu açılıyor.
   */
  const aktifUrun = useMemo(() => {
    if (secili) return secili;
    const tercih = ['Buğday', 'Arpa', 'Mısır', 'Çiğ süt', 'Ayçiçeği'];
    const bulunan = tercih.find((t) => urunler.some((u) => u.urun === t));
    return bulunan ?? urunler[0]?.urun ?? '';
  }, [secili, urunler]);

  const seri = useMemo(() => rows
    .filter((r) => r.urun === aktifUrun && r.fiyat !== null)
    .sort((a, b) => (a.yil - b.yil) || (a.ay - b.ay))
    .map((r) => ({
      donem: `${r.yil}-${String(r.ay).padStart(2, '0')}`,
      fiyat: r.fiyat as number,
    })), [rows, aktifUrun]);

  const aktifBirim = urunler.find((u) => u.urun === aktifUrun)?.birim ?? '';

  /** Son yayımlanan ay ile bir önceki ayın karşılaştırması. */
  const { sonDonem, degisimler } = useMemo(() => {
    if (!rows.length) return { sonDonem: '', degisimler: [] as FiyatDegisim[] };
    const anahtar = (r: MaddeFiyat) => r.yil * 100 + r.ay;
    const dolu = rows.filter((r) => r.fiyat !== null);
    if (!dolu.length) return { sonDonem: '', degisimler: [] as FiyatDegisim[] };
    const son = Math.max(...dolu.map(anahtar));
    const oncekiAy = son % 100 === 1 ? (Math.floor(son / 100) - 1) * 100 + 12 : son - 1;

    const sonHar = new Map(dolu.filter((r) => anahtar(r) === son).map((r) => [r.urun, r]));
    const oncHar = new Map(dolu.filter((r) => anahtar(r) === oncekiAy).map((r) => [r.urun, r]));

    const out: FiyatDegisim[] = [];
    sonHar.forEach((r, urun) => {
      const onc = oncHar.get(urun);
      if (!onc || !onc.fiyat) return;
      out.push({
        urun,
        birim: r.birim,
        sonFiyat: r.fiyat as number,
        oncekiFiyat: onc.fiyat,
        degisim: (((r.fiyat as number) - onc.fiyat) / onc.fiyat) * 100,
      });
    });
    out.sort((a, b) => b.degisim - a.degisim);
    return { sonDonem: `${Math.floor(son / 100)}-${String(son % 100).padStart(2, '0')}`, degisimler: out };
  }, [rows]);

  return {
    loading,
    urunler,
    aktifUrun,
    setSecili,
    aktifBirim,
    seri,
    sonDonem,
    enCokArtan: degisimler.slice(0, 8),
    enCokAzalan: [...degisimler].reverse().slice(0, 8),
  };
}
