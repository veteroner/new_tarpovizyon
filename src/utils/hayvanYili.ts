/**
 * Hayvancılık tablolarında "en güncel yıl" — SEVİYEYE GÖRE DEĞİŞİYOR.
 *
 * Sayfalarda 'y2024' düz metin olarak dört ayrı yere yazılıydı. Tek sabite
 * çekmenin sebebi yalnızca tekrar değil: bu tabloda son yıl her seviyede aynı
 * DEĞİL, ve bunu bilmeden yılı ilerletmek sessizce sıfır gösteriyor.
 *
 * ─── ÖLÇÜM (tuik_hayvancilik_canlihayvan, 2026-09-03) ───────────────────────
 * Ülke satırı (duzey='ülke', yer='TÜRKİYE'), 2024 → 2025 — kanatlı satırları
 * doldurulduktan SONRAKİ hâl:
 *   Tavuk  379.626.813 → 389.186.697     Koyun  44.080.584 → 46.688.813
 *   Sığır   16.824.208 →  17.544.200     Keçi   10.822.084 → 11.185.505
 *   Hindi    2.826.858 →   3.192.168     Kaz     1.303.026 →  1.263.907
 *   Ördek      389.957 →     389.086     Manda     162.051 →    164.785
 * (Kanatlının dördü ölçüm anında 0'dı; 46_t8'den yazıldı.)
 *
 * Bölge satırları (duzey='bölge'), 2025: BEŞ GRUBUN DA TOPLAMI 0.
 *   Üstelik bölge 2024'ü de bozuk: Et Tavuğu ile Yumurta Tavuğu birebir aynı
 *   sayıyı taşıyor (76.118.438 = 76.118.438) ve toplamları ülkenin %40'ı.
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
 * duzey='ülke' satırı — ARTIK 2025.
 *
 * Kanatlının 2025'i başta boştu; TÜİK'in "Türlerine Göre Kümes Hayvan
 * Sayıları" tablosundan (46_t8) dolduruldu — bkz. scripts/tuik-kumes-ulke-yukle.mjs.
 * Kaynağın 2024 değerleri D1'deki satırlarla birebir tuttuğu doğrulandıktan
 * sonra yazıldı. Sekiz grubun da 2025'i dolu.
 */
export const HAYVAN_ULKE_YIL = 2025;

/**
 * duzey='bölge' satırları — 2024'te KALIYOR.
 *
 * Bölgede 2025 hiç yok ve türetilecek güvenilir kaynak da yok: il satırları
 * 81 değil 80 il içeriyor ve 2024'te kategori ayrımı bozulmuş. Uydurulmuş bir
 * bölge dağılımı yazmaktansa grafiğin kendi yılını söylemesi doğru.
 *
 * Bu yüzden Genel Bakış'ta ülke KPI'ları 2025, bölge grafikleri 2024 — ve
 * HER İKİSİ de kendi yılını başlığında yazıyor. Karışıklık, tarihi gizlemekten
 * değil, iki farklı yılı tek etiket altında toplamaktan doğar.
 */
export const HAYVAN_BOLGE_YIL = 2024;

/** `y2025` gibi sütun adı üretir. */
export const yilSutunu = (yil: number) => `y${yil}`;
