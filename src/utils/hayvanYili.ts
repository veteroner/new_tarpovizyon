/**
 * Hayvancılık tablolarında "en güncel yıl" — SEVİYEYE GÖRE DEĞİŞİYOR.
 *
 * Sayfalarda 'y2024' düz metin olarak dört ayrı yere yazılıydı. Tek sabite
 * çekmenin sebebi yalnızca tekrar değil: bu tabloda son yıl her seviyede aynı
 * DEĞİL, ve bunu bilmeden yılı ilerletmek sessizce sıfır gösteriyor.
 *
 * ─── ÖLÇÜM (tuik_hayvancilik_canlihayvan, 2026-09-03) ───────────────────────
 * Ülke satırı (duzey='ülke', yer='TÜRKİYE'), 2024 → 2025:
 *   Sığır   16.824.208 → 17.544.200      Koyun  44.080.584 → 46.688.813
 *   Keçi    10.822.084 → 11.185.505      Manda     162.051 →     164.785
 *   Tavuk  379.626.813 →           0     Hindi   2.826.858 →           0
 *   Kaz      1.303.026 →           0     Ördek     389.957 →           0
 *
 * Bölge satırları (duzey='bölge'), 2025: BEŞ GRUBUN DA TOPLAMI 0.
 * İl/ilçe satırları (duzeykod=3/4), 2025: DOLU — kanatlı dahil
 *   (Tavuk il toplamı 2025'te 387.164.365).
 *
 * Yani 2025 yalnızca İL ve İLÇE seviyesine yazılmış; ülke satırına kısmen
 * (geviş getirenler), bölge satırına hiç yazılmamış. Bu bir D1 boşluğu, bir
 * arayüz tercihi değil — toplu seviyeler tazelenince buradaki sabit
 * ilerletilmeli.
 */

/** duzeykod=3 (il) ve 4 (ilçe) satırları — 2025 dolu. */
export const HAYVAN_IL_YIL = 2025;

/**
 * duzey='bölge' ve 'ülke' satırları.
 *
 * Ülke satırında geviş getirenlerin 2025'i var ama bölgenin hiç yok. Genel
 * Bakış sayfası ikisini YAN YANA çiziyor (ülke KPI'ları + bölge grafikleri);
 * yalnızca KPI'ları 2025'e almak, hemen yanında 2024 bölge toplamı duran
 * içsel olarak tutarsız bir sayfa üretirdi. Bu yüzden toplu seviyeler
 * bütün olarak 2024'te.
 */
export const HAYVAN_TOPLU_YIL = 2024;

/** `y2025` gibi sütun adı üretir. */
export const yilSutunu = (yil: number) => `y${yil}`;
