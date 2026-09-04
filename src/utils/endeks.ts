/**
 * Farklı birimli serileri tek eksende karşılaştırılabilir hâle getirir.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Uygulamada 13 dosyada çift (birinde üç, birinde dört) Y ekseni vardı. İki
 * eksen, iki seriyi İSTEDİĞİN YERDE kesiştirmene izin verir — kesişimin hiçbir
 * anlamı yoktur, eksen aralığını değiştirince kaybolur. Okuyucu bunu bilmez,
 * kesişimi olay sanar. Grafik tasarımının bir numaralı hatası budur.
 *
 * Çoğu durumda ikinci eksenin sebebi "iki seri farklı büyüklükte" oluyor:
 * Türkiye ile Dünya üretimi, kırmızı et (bin ton) ile yumurta (milyon adet),
 * yem fiyatı (TL/kg) ile üretim (ton)… Bunların ortak sorusu zaten mutlak
 * değer değil, ORANSAL DEĞİŞİM: "hangisi daha hızlı büyüdü?"
 *
 * Endeks tam olarak bunu veriyor. Tek eksen, tek ölçek, 100 çizgisi
 * başlangıcı işaretliyor, ham değerler ipucunda kalıyor.
 *
 * ─── NE ZAMAN KULLANILMAZ ───────────────────────────────────────────────────
 * Seri zaten oranlıysa (yüzde, pay, verim endeksi) endekslemek anlamsız —
 * yüzdenin yüzdesi olur. O durumda grafiği İKİYE BÖL, X eksenini paylaştır.
 * Ayrıca seride sıfır/negatif başlangıç varsa endeks patlar; bu yüzden ilk
 * DOLU ve POZİTİF değer taban alınıyor, bulunamazsa seri 0 bırakılıyor.
 */

/** Bir seri için taban değeri: ilk dolu ve pozitif nokta. */
function taban<T>(satirlar: T[], alan: keyof T): number | null {
  for (const r of satirlar) {
    const v = Number(r[alan]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/**
 * Verilen alanları ilk dolu yıllarına göre 100'e endeksler.
 *
 * Ham değerler `ham_<alan>` olarak korunuyor — ipucunda gösterilsin diye;
 * endeksi gösterip mutlak sayıyı gizlemek soruyu yarım cevaplar.
 *
 *   endeksle(veri, ['turkey', 'world'])
 *   → [{ ...satır, turkey: 100, world: 100, ham_turkey: 16.4e6, … }, …]
 */
export function endeksle<T extends Record<string, unknown>>(
  satirlar: T[],
  alanlar: (keyof T)[],
): (T & Record<string, number>)[] {
  const tabanlar = new Map<keyof T, number | null>(
    alanlar.map((a) => [a, taban(satirlar, a)]),
  );
  return satirlar.map((r) => {
    const cikti: Record<string, unknown> = { ...r };
    for (const a of alanlar) {
      const t = tabanlar.get(a);
      const v = Number(r[a]);
      cikti[`ham_${String(a)}`] = Number.isFinite(v) ? v : null;
      cikti[a as string] = t && Number.isFinite(v) ? (v / t) * 100 : 0;
    }
    return cikti as T & Record<string, number>;
  });
}

/** Endeksin taban aldığı ilk etiketi döndürür — grafik notunda yazsın diye. */
export function endeksTabanEtiketi<T extends Record<string, unknown>>(
  satirlar: T[],
  alan: keyof T,
  etiketAlani: keyof T,
): string {
  const i = satirlar.findIndex((r) => Number(r[alan]) > 0);
  return i >= 0 ? String(satirlar[i][etiketAlani]) : 'ilk';
}
