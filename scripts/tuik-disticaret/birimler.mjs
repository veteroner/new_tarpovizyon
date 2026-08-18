/**
 * Canlı hayvan ve yumurta gruplarında birim normalleştirmesi.
 *
 * ─── SORUN ──────────────────────────────────────────────────────────────────
 * TÜİK bu gruplarda birim ETİKETİNİ seri ortasında değiştirmiş:
 *
 *   Besilik/Damızlık Büyükbaş, Kasaplık, Damızlık Küçükbaş
 *       BAŞ  (2000-2018)  →  ADET (2019-)      — aynı şey, sadece ad değişmiş
 *   Sofralik Tavuk Yumurtası
 *       ADET (2000-2004)  →  1000ADET (2005-)  — ÖLÇEK değişmiş, 1000 kat
 *   Kuluçkalık Tavuk Yumurtası
 *       ADET (2000-2026)                        — hiç değişmemiş
 *
 * Ölçek değişimi grafikte 1000 katlık sahte sıçrama yaratıyor; etiket değişimi
 * de aynı seriyi iki ayrı birimmiş gibi gösteriyor.
 *
 * ─── KARAR ──────────────────────────────────────────────────────────────────
 * Kullanıcı tercihi (18 Ağustos 2026): canlı hayvan BAŞ, her iki yumurta türü
 * BİN ADET. Kural hem geçmişe uygulanıyor hem de yeni aylarda otomatik.
 */

/** Canlı hayvan grupları — etiket ADET yerine BAŞ (miktar aynı kalır). */
export const CANLI_HAYVAN = [
  'Besilik Büyükbaş', 'Damızlık Büyükbaş', 'Büyükbaş Kasaplık',
  'Küçükbaş Kasaplık', 'Damızlık Küçükbaş',
];

/** Yumurta grupları — bin adede çevrilir (ADET ise miktar 1000'e bölünür). */
export const YUMURTA_ONEK = ['Kuluçkalık', 'Sofralik', 'Sofralık'];

const yumurtaMi = (ana) => YUMURTA_ONEK.some((p) => String(ana ?? '').startsWith(p));

/**
 * Tek satırı normalleştirir (yerinde değiştirir) ve değişti mi döndürür.
 * `mikAlanlari`: miktar sütunlarının adları (tablo ailesine göre değişiyor).
 */
export function satiriNormalleştir(satir, mikAlanlari = ['ihracat_mik', 'ithalat_mik']) {
  const birim = String(satir.miktar_birim ?? '');

  if (CANLI_HAYVAN.includes(satir.ana_urun) && birim === 'ADET') {
    satir.miktar_birim = 'BAŞ';           // yalnızca etiket
    return true;
  }

  if (yumurtaMi(satir.ana_urun) && birim === 'ADET') {
    for (const a of mikAlanlari) {
      const v = Number(satir[a]);
      satir[a] = Number.isFinite(v) ? v / 1000 : satir[a];
    }
    satir.miktar_birim = '1000ADET';
    return true;
  }

  return false;
}
