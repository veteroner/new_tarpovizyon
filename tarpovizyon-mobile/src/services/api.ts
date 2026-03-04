/**
 * api.ts — TarpoVizyon Mobile API İstemcisi
 *
 * Dashboard projesindeki api.ts'nin mobil uyumlu versiyonu.
 * Aynı backend'i (dersbende.com) kullanır.
 */

import axios from 'axios';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = 'https://dersbende.com';
const API_KEY = 'REDACTED_DASHBOARD_KEY';
const IS_DEV = import.meta.env.DEV;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueryResult {
  data: Record<string, unknown>[];
  error?: string;
}

export type EggPriceKey = 'double' | 'eski_ana' | 'yeni_ana' | 'yarka' | 'pilic' | 'kilavuz';

export interface EggPricesResult {
  success?: boolean;
  source?: string;
  date?: string | null;
  prices?: Partial<Record<EggPriceKey, number>>;
  imageUrl?: string;
  error?: string;
}

export interface TradeRecord {
  ana_urun: string;
  ulke: string;
  yil: string;
  miktar: number;
  deger: number;
  birim: string;
  islem_sayisi: number;
  birim_fiyat: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BITKISEL_TABLE = 'tuik_bitkisel_uretim';
export const YIELD_COLS = 'y2018,y2019,y2020,y2021,y2022,y2023,y2024';

export const TRADE_YEARS = [
  '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018',
  '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010',
  '2009', '2008', '2007', '2006', '2005', '2004', '2003', '2002', '2001', '2000',
];

export const TRADE_TABLES = {
  PLANT: 'tuik_ticaret_bitkisel',
  ANIMAL: 'tuik_ticaret_hayvansal',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _sqlEsc(value: string): string {
  return value.replace(/'/g, "''");
}

// ─── Core Query ───────────────────────────────────────────────────────────────

export async function fetchQuery(sql: string): Promise<QueryResult> {
  try {
    const url = `${API_BASE}/api.php`;
    const params = {
      action: 'query',
      api_key: API_KEY,
      sql,
    };

    if (IS_DEV) console.log('[API]', sql.substring(0, 120));

    const response = await axios.get(url, { params, timeout: 15000 });
    const raw = response.data;

    if (Array.isArray(raw)) return { data: raw };
    if (raw?.data && Array.isArray(raw.data)) return { data: raw.data };
    if (raw?.error) return { data: [], error: raw.error };

    return { data: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (IS_DEV) console.error('[API] Error:', msg);
    return { data: [], error: msg };
  }
}

// ─── Bitkisel Üretim Queries ─────────────────────────────────────────────────

/** İlleri listele */
export async function fetchProvinces(): Promise<QueryResult> {
  return fetchQuery(
    `SELECT DISTINCT ili FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' ORDER BY ili`
  );
}

/** Belirli ilin ilçelerini listele */
export async function fetchDistricts(il: string): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  return fetchQuery(
    `SELECT DISTINCT ilce FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' ORDER BY ilce`
  );
}

/** Belirli il/ilçe'deki ürünleri listele */
export async function fetchCrops(il: string, ilce: string): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  const safeIlce = _sqlEsc(ilce);
  return fetchQuery(
    `SELECT DISTINCT urun FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' AND ilce='${safeIlce}' AND unsur='Üretim' AND (y2022>0 OR y2023>0 OR y2024>0) ORDER BY urun`
  );
}

/** Verim verisi (ilçe, il veya Türkiye düzeyinde) */
export async function fetchYieldData(
  il: string,
  ilce: string,
  urun: string,
  level: 'ilce' | 'il' | 'turkey'
): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  const safeIlce = _sqlEsc(ilce);
  const safeUrun = _sqlEsc(urun);

  let sql: string;
  if (level === 'ilce') {
    sql = `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' AND ilce='${safeIlce}' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`;
  } else if (level === 'il') {
    sql = `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='il' AND ili='${safeIl}' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`;
  } else {
    sql = `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='Türkiye' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`;
  }

  return fetchQuery(sql);
}

/** İl bazında ürün sıralaması */
export async function fetchProvinceRanking(urun: string): Promise<QueryResult> {
  const safeUrun = _sqlEsc(urun);
  return fetchQuery(
    `SELECT ili, y2024 FROM ${BITKISEL_TABLE} WHERE duzey='il' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar' AND y2024 > 0 ORDER BY y2024 DESC`
  );
}

// ─── Yumurta Fiyatları ────────────────────────────────────────────────────────

let eggPricesCache: EggPricesResult | null = null;
let eggPricesCacheAt = 0;
const EGG_PRICES_CACHE_MS = 5 * 60 * 1000;

export async function fetchEggPrices(): Promise<EggPricesResult> {
  try {
    const now = Date.now();
    if (eggPricesCache && now - eggPricesCacheAt < EGG_PRICES_CACHE_MS) {
      return eggPricesCache;
    }

    const url = `${API_BASE}/egg-prices-puppeteer`;
    const response = await axios.get(url, { timeout: 60000 });
    const data = response.data as EggPricesResult;

    if (data?.success && data.prices && Object.keys(data.prices).length > 0) {
      eggPricesCache = data;
      eggPricesCacheAt = now;
      return data;
    }

    return { success: false, error: 'No prices returned' };
  } catch {
    return { success: false, error: 'Egg prices fetch failed' };
  }
}

// ─── Dış Ticaret Queries ─────────────────────────────────────────────────────

export function duzeyFilter(level1: 'tüm' | 'ülke', level3: 'ay' | 'yil'): string {
  return `duzey_1 = '${level1}' AND duzey_3 = '${level3}'`;
}

/** Bitkisel ihracat top 20 ürün */
export async function fetchTopPlantExports(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT ana_urun, SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ulke) as ulke_sayisi
    FROM ${TRADE_TABLES.PLANT}
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  sql += ` GROUP BY ana_urun ORDER BY toplam_deger DESC LIMIT 20`;
  return fetchQuery(sql);
}

/** Hayvansal ihracat top 20 ürün */
export async function fetchTopAnimalExports(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT ana_urun, SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ulke) as ulke_sayisi
    FROM ${TRADE_TABLES.ANIMAL}
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  sql += ` GROUP BY ana_urun ORDER BY toplam_deger DESC LIMIT 20`;
  return fetchQuery(sql);
}

/** Bitkisel ihracat top ülkeler */
export async function fetchTopPlantExportCountries(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT ulke, SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi
    FROM ${TRADE_TABLES.PLANT}
    WHERE ihracat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  sql += ` GROUP BY ulke ORDER BY toplam_deger DESC LIMIT 20`;
  return fetchQuery(sql);
}

/** Bitkisel ithalat top ülkeler */
export async function fetchTopPlantImportCountries(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT ulke, SUM(ithalat_deger) as toplam_deger, SUM(ithalat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi
    FROM ${TRADE_TABLES.PLANT}
    WHERE ithalat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  sql += ` GROUP BY ulke ORDER BY toplam_deger DESC LIMIT 20`;
  return fetchQuery(sql);
}

/** Bitkisel ihracat özeti */
export async function fetchPlantExportSummary(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi, COUNT(DISTINCT ulke) as ulke_sayisi
    FROM ${TRADE_TABLES.PLANT}
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  return fetchQuery(sql);
}

/** Hayvansal ihracat özeti */
export async function fetchAnimalExportSummary(year?: string): Promise<QueryResult> {
  let sql = `
    SELECT SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi, COUNT(DISTINCT ulke) as ulke_sayisi
    FROM ${TRADE_TABLES.ANIMAL}
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `;
  if (year && year !== 'all') sql += ` AND yil = '${_sqlEsc(year)}'`;
  return fetchQuery(sql);
}

/** Yıllık bitkisel ihracat trendi */
export async function fetchPlantExportYearlyTrend(): Promise<QueryResult> {
  return fetchQuery(`
    SELECT yil, SUM(ihracat_deger) as toplam_deger, SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi
    FROM ${TRADE_TABLES.PLANT}
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
    GROUP BY yil ORDER BY yil
  `);
}

// ─── Üretim İndeks ───────────────────────────────────────────────────────────

/** Dünya üretim istatistikleri */
export async function fetchWorldProductionStats(): Promise<QueryResult> {
  return fetchQuery(
    `SELECT SUM(deger) as toplamUretim, COUNT(DISTINCT ürün) as toplamUrun FROM üretimindex`
  );
}

/** Top 10 ürün (dünya) */
export async function fetchTopWorldProducts(): Promise<QueryResult> {
  return fetchQuery(
    `SELECT ürün as ad, SUM(deger) as miktar, birim FROM üretimindex GROUP BY ürün, birim ORDER BY miktar DESC LIMIT 10`
  );
}

/** Yıllık dünya üretim */
export async function fetchYearlyWorldProduction(): Promise<QueryResult> {
  return fetchQuery(
    `SELECT yil, SUM(deger) as toplam FROM üretimindex GROUP BY yil ORDER BY yil`
  );
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

export function formatMoney(num: number): string {
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toLocaleString();
}

export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function formatUnitPrice(price: number | null): string {
  if (price === null || price === undefined) return 'N/A';
  if (price >= 1e6) return '$' + (price / 1e6).toFixed(2) + 'M';
  if (price >= 1e3) return '$' + (price / 1e3).toFixed(2) + 'K';
  return '$' + price.toFixed(2);
}

export function formatPercentChange(change: number | null): string {
  if (change === null || change === undefined) return 'N/A';
  const sign = change > 0 ? '+' : '';
  return sign + change.toFixed(1) + '%';
}
