/**
 * Grafiklerde sayı biçimlendirme — TEK YER.
 *
 * ─── NEDEN MERKEZÎ ──────────────────────────────────────────────────────────
 * Recharts, biçimlendirici verilmediğinde sayıyı OLDUĞU GİBİ basıyor. Kayan
 * nokta aritmetiğinden gelen kuyruklar da öyle: ekranda "154.3380999999999",
 * ipucunda "GFE : 1074.4916666666666", "Gıda TÜFE : 129.29875" görünüyordu.
 *
 * Bu hata projede en az üç kez ayrı ayrı düzeltildi — her seferinde tek bir
 * grafikte, tek bir tick biçimlendiricisiyle. Sorun grafiklerde değil, EKSİK
 * VARSAYILANDA: 367 ipucunun 143'ünde, 315 eksenin 125'inde hiç biçimlendirici
 * yoktu. Tek tek kovalamak yerine ortak varsayılan konuldu ve
 * `src/utils/__tests__/grafikBicim.test.ts` yenisinin eklenmesini engelliyor.
 *
 * ─── BİÇİM KURALLARI ────────────────────────────────────────────────────────
 * Türkçe yerel ayar: binlik nokta, ondalık virgül. Ondalık hane sayısı
 * BÜYÜKLÜĞE göre, sabit değil — 0,047'de üç hane bilgi taşıyor, 1.074'te
 * taşımıyor.
 */

/** Türkçe biçimli sayı; ondalık hane büyüklüğe göre seçiliyor. */
export function sayiBicimle(v: number): string {
  if (!Number.isFinite(v)) return '';
  const m = Math.abs(v);
  const hane = m === 0 ? 0
    : m < 1 ? 3
      : m < 10 ? 2
        : m < 1000 ? 1
          : 0;
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: hane });
}

/**
 * Eksen tick'i — kısaltmalı.
 *
 * Eksende yer dar; binden büyük sayılar B/M/K ile kısaltılıyor. Kısaltma
 * eşikleri `chartTicks.compactValue` ile BİREBİR aynı tutuldu: aynı sayının
 * eksende "1,2M", çubuk ucunda "1.200K" yazması okuyucuya iki ayrı büyüklük
 * gösterir.
 */
export function eksenTick(v: number | string): string {
  const s = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(s)) return String(v ?? '');
  const m = Math.abs(s);
  if (m >= 1e9) return `${(s / 1e9).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}B`;
  if (m >= 1e6) return `${(s / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`;
  if (m >= 1e4) return `${(s / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K`;
  return sayiBicimle(s);
}

/**
 * İpucu değeri.
 *
 * Recharts `formatter`ı [değer, ad] döndürmeyi bekliyor; AD OLDUĞU GİBİ
 * geçiyor, yalnızca sayı biçimleniyor. Adı da değiştirseydik seri adlarını
 * özelleştirmiş her grafiği bozardık.
 *
 * Eksende kısaltma var, ipucunda YOK: ipucu tek bir sayı gösteriyor ve yer
 * sorunu yok — orada tam değer daha faydalı.
 */
export function ipucuBicim(v: unknown, ad?: unknown): [string, string] {
  const s = typeof v === 'number' ? v : Number(v);
  return [Number.isFinite(s) ? sayiBicimle(s) : String(v ?? ''), String(ad ?? '')];
}
