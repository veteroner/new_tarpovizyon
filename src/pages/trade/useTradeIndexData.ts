import { useEffect, useMemo, useState } from 'react';
import { fetchRows, num, type Row } from '../../services/d1';

/**
 * Dış ticaret endeksleri (2015=100) — veri kancası.
 *
 * ─── BU SEKME NEYİ AYIRIYOR ─────────────────────────────────────────────────
 * Diğer ticaret sekmeleri ürün×ülke MİKTAR ve DEĞER gösteriyor. Oradan
 * "ihracat geliri arttı" görülüyor ama sebebi görülmüyor: daha çok mu sattık,
 * yoksa daha pahalıya mı? Birim değer endeksi fiyatı, miktar endeksi hacmi
 * ayırıyor — bu sekmenin tek işi o ayrım.
 *
 * ─── İKİ KAPSAM BİRLİKTE ────────────────────────────────────────────────────
 * `gida_` önekli sütunlar SITC Rev.4 0. bölümü (Gıda ve canlı hayvanlar),
 * öneksizler Türkiye toplamı. Gıdayı tek başına göstermek "yüksek mi düşük mü"
 * sorusunu cevapsız bırakıyor; ülke çizgisi kıyas ekseni.
 */

const ROTA = 'makro/dis-ticaret-endeks';

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export type EndeksNoktasi = {
  /** 'YYYY-MM' — sıralama ve karşılaştırma için. */
  donem: string;
  /** 'Tem 26' — eksende gösterilen. */
  etiket: string;
  ihracatBde: number | null;
  ithalatBde: number | null;
  ihracatMe: number | null;
  ithalatMe: number | null;
  haddi: number | null;
  gidaIhracatBde: number | null;
  gidaIthalatBde: number | null;
  gidaIhracatMe: number | null;
  gidaIthalatMe: number | null;
  gidaHaddi: number | null;
};

/** null'ı 0'a çevirmeden sayıya döker — 0 ile "veri yok" aynı şey değil. */
const sayiVeyaNull = (v: unknown): number | null =>
  (v === null || v === undefined || v === '' ? null : num(v));

function satirdan(r: Row): EndeksNoktasi {
  const donem = String(r.tarih ?? '').slice(0, 7);
  const ay = Number(donem.slice(5, 7));
  return {
    donem,
    etiket: `${AY_KISA[ay - 1] ?? ''} ${donem.slice(2, 4)}`,
    ihracatBde: sayiVeyaNull(r.ihracat_bde),
    ithalatBde: sayiVeyaNull(r.ithalat_bde),
    ihracatMe: sayiVeyaNull(r.ihracat_me),
    ithalatMe: sayiVeyaNull(r.ithalat_me),
    haddi: sayiVeyaNull(r.dis_ticaret_haddi),
    gidaIhracatBde: sayiVeyaNull(r.gida_ihracat_bde),
    gidaIthalatBde: sayiVeyaNull(r.gida_ithalat_bde),
    gidaIhracatMe: sayiVeyaNull(r.gida_ihracat_me),
    gidaIthalatMe: sayiVeyaNull(r.gida_ithalat_me),
    gidaHaddi: sayiVeyaNull(r.gida_dis_ticaret_haddi),
  };
}

export type Aralik = 12 | 24 | 48 | 0;

export function useTradeIndexData(aralik: Aralik) {
  const [tumu, setTumu] = useState<EndeksNoktasi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        /*
         * Tüm seri (79 ay) TEK istekte alınıyor ve aralık istemcide
         * kesiliyor. Aralık düğmeleri her basışta ağa çıkmıyor, seri de
         * küçük — sunucuya dönmenin karşılığı yok.
         */
        const satirlar = await fetchRows(ROTA, { limit: 1000 });
        if (iptal) return;
        setTumu(satirlar.map(satirdan).sort((a, b) => a.donem.localeCompare(b.donem)));
        setHata(null);
      } catch (e) {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Veri alınamadı');
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, []);

  const seri = useMemo(
    () => (aralik ? tumu.slice(-aralik) : tumu),
    [tumu, aralik],
  );

  /** Son dönem ve bir önceki — kartlardaki değişim buradan. */
  const son = tumu.at(-1) ?? null;
  const onceki = tumu.at(-2) ?? null;

  return { seri, tumu, son, onceki, yukleniyor, hata };
}

/** İki endeks arasındaki yüzde fark; biri yoksa null (0 yazmaz). */
export function fark(simdi: number | null, once: number | null): number | null {
  if (simdi === null || once === null || once === 0) return null;
  return ((simdi - once) / once) * 100;
}
