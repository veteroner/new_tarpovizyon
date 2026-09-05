/**
 * Yıllık değişim hesabı.
 *
 * `YillikDegisim.tsx`'ten AYRILDI: bir dosya hem bileşen hem başka şey dışa
 * aktarınca Vite'ın hızlı yenilemesi o dosyada çalışmıyor — her düzenlemede
 * sayfa baştan yükleniyor. Aynı sebeple `components/bolumSekmeleri.ts` de
 * ayrılmıştı.
 */

export type DegisimNoktasi = { etiket: string | number; deger: number };

/**
 * Ardışık noktalar arası yüzde değişim.
 *
 * Sıfır ya da eksi taban ATLANIYOR: bölme patlar ve "sonsuz büyüme" gibi
 * anlamsız bir değer üretir. Veri boşluğu olan yıl sessizce düşüyor.
 */
export function degisimSerisi(
  seri: { etiket: string | number; deger: number }[],
): DegisimNoktasi[] {
  const cikti: DegisimNoktasi[] = [];
  for (let i = 1; i < seri.length; i++) {
    const onceki = seri[i - 1].deger;
    if (!(onceki > 0)) continue;
    cikti.push({ etiket: seri[i].etiket, deger: ((seri[i].deger - onceki) / onceki) * 100 });
  }
  return cikti;
}
