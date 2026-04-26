import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)
  ?? (import.meta.env.DEV ? '' : 'https://dersbende.com');
const API_KEY = 'dashboard_secret_key_2024';

const IS_DEV = import.meta.env.DEV;

export interface QueryResult {
  success?: boolean;
  data?: Record<string, string | number>[];
  error?: string;
}

export const DEFAULT_TRADE_YEAR = '2025';

export async function fetchQuery(sql: string): Promise<QueryResult> {
  try {
    const url = `${API_BASE}/api.php?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`;
    const response = await axios.get(url);
    const payload = response.data as QueryResult;
    if (payload?.error) {
      if (IS_DEV) console.error('API Query Error:', payload.error);
      return { data: [], error: payload.error };
    }
    return payload;
  } catch (error) {
    if (IS_DEV) console.error('API Error:', error);
    return { data: [], error: 'API bağlantı hatası' };
  }
}

// ─── SQL Escaping (internal use only) ────────────────────────────────────────

function _sqlEsc(value: string): string {
  return value
    .replace(/\\/g, '')
    .replace(/"/g, '')
    .replace(/;/g, '')
    .replace(/-{2,}/g, '')
    .replace(/'/g, "''");
}

// ─── Hasat Tahmini — Safe API Layer ──────────────────────────────────────────
// SQL'ler burada izole edilmiştir; page bileşenleri asla doğrudan SQL oluşturmaz.

const BITKISEL_TABLE = 'tuik_bitkisel_uretim';
const YIELD_COLS = 'y2018,y2019,y2020,y2021,y2022,y2023,y2024';

/** İl listesi (il bazlı kayıtlara sahip tüm iller) */
export async function fetchProvinces(): Promise<QueryResult> {
  return fetchQuery(
    `SELECT DISTINCT ili FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' ORDER BY ili`
  );
}

/** Belirli bir ilin ilçe listesi */
export async function fetchDistricts(il: string): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  return fetchQuery(
    `SELECT DISTINCT yer FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' ORDER BY yer`
  );
}

/** Belirli il/ilçe'de yetiştirilen ürünler (son 3 yılda verimi >0 olanlar) */
export async function fetchCrops(il: string, ilce: string): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  const safeIlce = _sqlEsc(ilce);
  return fetchQuery(
    `SELECT DISTINCT urun FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' AND yer='${safeIlce}' AND unsur='Verim' AND birim='Kg/Dekar' AND (y2022+y2023+y2024) > 0 ORDER BY urun`
  );
}

/** Verim verisi (7 yıllık) — level: 'ilçe' | 'il' | 'Turkey' */
export async function fetchYieldData(
  il: string,
  ilce: string,
  urun: string,
  level: 'ilçe' | 'il' | 'Turkey',
): Promise<QueryResult> {
  const safeIl = _sqlEsc(il);
  const safeIlce = _sqlEsc(ilce);
  const safeUrun = _sqlEsc(urun);

  if (level === 'ilçe') {
    return fetchQuery(
      `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='ilçe' AND ili='${safeIl}' AND yer='${safeIlce}' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`
    );
  }
  if (level === 'il') {
    return fetchQuery(
      `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='il' AND ili='${safeIl}' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`
    );
  }
  // Turkey
  return fetchQuery(
    `SELECT ${YIELD_COLS} FROM ${BITKISEL_TABLE} WHERE duzey='Turkey' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar'`
  );
}

/** İl bazlı verim sıralaması (en son yıl) */
export async function fetchProvinceRanking(urun: string): Promise<QueryResult> {
  const safeUrun = _sqlEsc(urun);
  return fetchQuery(
    `SELECT ili, y2024 FROM ${BITKISEL_TABLE} WHERE duzey='il' AND urun='${safeUrun}' AND unsur='Verim' AND birim='Kg/Dekar' AND y2024 > 0 ORDER BY y2024 DESC`
  );
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

let eggPricesCache: EggPricesResult | null = null;
let eggPricesCacheAt = 0;
const EGG_PRICES_CACHE_MS = 5 * 60 * 1000;

export async function fetchEggPrices(): Promise<EggPricesResult> {
  try {
    const now = Date.now();
    if (eggPricesCache && now - eggPricesCacheAt < EGG_PRICES_CACHE_MS) {
      if (IS_DEV) console.log('🥚 Using cached egg prices');
      return eggPricesCache;
    }

    if (IS_DEV) console.log('🥚 Fetching egg prices from Puppeteer endpoint...');
    const url = `${API_BASE}/egg-prices-puppeteer`;
    const response = await axios.get(url, { timeout: 60000 }); // 60s timeout for Puppeteer+OCR
    const data = response.data as EggPricesResult;

    if (IS_DEV) console.log('🥚 Received prices:', data);

    if (data && data.success && data.prices && Object.keys(data.prices).length > 0) {
      eggPricesCache = data;
      eggPricesCacheAt = now;
      return data;
    }

    return { success: false, error: 'No prices returned from backend' };
  } catch (err) {
    if (IS_DEV) console.error('🥚 Egg prices fetch failed:', err);
    return { success: false, error: 'Egg prices fetch failed' };
  }
}

// Year filter helper - adds WHERE or AND clause
export function addYearFilter(sql: string, year: string, table: 'trade' | 'production' = 'trade'): string {
  if (year === 'all') return sql;
  
  const yearColumn = table === 'trade' ? 'yil' : 'yil';
  const hasWhere = sql.toLowerCase().includes('where');
  const yearCondition = `${yearColumn} = '${year}'`;
  
  if (hasWhere) {
    // Add AND before GROUP BY if exists, otherwise at the end
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `AND ${yearCondition} GROUP BY`);
    }
    return sql + ` AND ${yearCondition}`;
  } else {
    // Add WHERE before GROUP BY if exists
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `WHERE ${yearCondition} GROUP BY`);
    }
    if (sql.toLowerCase().includes('order by')) {
      return sql.replace(/order by/i, `WHERE ${yearCondition} ORDER BY`);
    }
    return sql + ` WHERE ${yearCondition}`;
  }
}

// Format helpers
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

// Available years for filters
export const TRADE_YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005', '2004', '2003', '2002', '2001', '2000'];
export const PRODUCTION_YEARS = ['2021'];

// Correct table names
export const TRADE_TABLES = {
  PLANT: 'tuik_ticaret_bitkisel',
  ANIMAL: 'tuik_ticaret_hayvansal',
} as const;

// Duzey filter helper — prevents data duplication
export function duzeyFilter(level1: 'tüm' | 'ülke', level3: 'ay' | 'yil'): string {
  return `duzey_1 = '${level1}' AND duzey_3 = '${level3}'`;
}

// Predefined SQL queries - yct_20 kolonları: primaryValue, fobvalue, cifvalue, flowCode, partnerCode, motDesc, qty, netWgt
// üretimindex kolonları: ürün, deger, birim, yil, ülke, grup
export const queries = {
  // Trade queries - primaryValue kullanıyoruz (ana değer)
  totalTrade: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20`,
  totalExport: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('X', 'DX', 'RX')`,
  totalImport: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('M', 'FM', 'RM')`,
  
  flowDistribution: `SELECT flowCode, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam FROM yct_20 GROUP BY flowCode ORDER BY toplam DESC`,
  monthlyTrend: `SELECT ay, 
    SUM(CASE WHEN flowCode IN ('X','DX','RX') THEN CAST(primaryValue AS DECIMAL(20,2)) ELSE 0 END) as ihracat,
    SUM(CASE WHEN flowCode IN ('M','FM','RM') THEN CAST(primaryValue AS DECIMAL(20,2)) ELSE 0 END) as ithalat
    FROM yct_20 GROUP BY ay ORDER BY ay`,
  
  // partnerCode yerine motDesc veya başka alanlar kullanabiliriz
  topExportCountries: `SELECT partnerCode as ulke, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('X','DX','RX') 
    GROUP BY partnerCode ORDER BY toplam DESC LIMIT 10`,
  topImportCountries: `SELECT partnerCode as ulke, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('M','FM','RM') 
    GROUP BY partnerCode ORDER BY toplam DESC LIMIT 10`,
  
  // motDesc = Mode of Transport Description
  transportModes: `SELECT motDesc as tasimaSekli, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE motDesc IS NOT NULL AND motDesc != '' 
    GROUP BY motDesc ORDER BY toplam DESC`,
  
  // Production queries - üretimindex tablosu (birim filtresi kaldırıldı)
  productionStats: `SELECT SUM(deger) as toplamUretim, COUNT(DISTINCT ürün) as toplamUrun FROM üretimindex`,
  topProducts: `SELECT ürün as ad, SUM(deger) as miktar, birim FROM üretimindex GROUP BY ürün, birim ORDER BY miktar DESC LIMIT 10`,
  yearlyProduction: `SELECT yil, SUM(deger) as toplam FROM üretimindex GROUP BY yil ORDER BY yil`,
  
  // DETAILED TRADE QUERIES - Plant (Bitkisel)
  plantExportDetail: `
    SELECT 
      ana_urun,
      ulke,
      yil,
      SUM(ihracat_mik) as miktar,
      SUM(ihracat_deger) as deger,
      miktar_birim as birim,
      COUNT(*) as islem_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as birim_fiyat
    FROM tuik_ticaret_bitkisel
    WHERE ihracat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
    GROUP BY ana_urun, ulke, yil, miktar_birim
    ORDER BY deger DESC
  `,
  
  plantImportDetail: `
    SELECT 
      ana_urun,
      ulke,
      yil,
      SUM(ithalat_mik) as miktar,
      SUM(ithalat_deger) as deger,
      miktar_birim as birim,
      COUNT(*) as islem_sayisi,
      (SUM(ithalat_deger) / NULLIF(SUM(ithalat_mik), 0)) as birim_fiyat
    FROM tuik_ticaret_bitkisel
    WHERE ithalat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
    GROUP BY ana_urun, ulke, yil, miktar_birim
    ORDER BY deger DESC
  `,
  
  // DETAILED TRADE QUERIES - Animal (Hayvansal)
  animalExportDetail: `
    SELECT 
      ana_urun,
      ulke,
      yil,
      SUM(ihracat_mik) as miktar,
      SUM(ihracat_deger) as deger,
      miktar_birim as birim,
      COUNT(*) as islem_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as birim_fiyat
    FROM tuik_ticaret_hayvansal
    WHERE ihracat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
    GROUP BY ana_urun, ulke, yil, miktar_birim
    ORDER BY deger DESC
  `,
  
  animalImportDetail: `
    SELECT 
      ana_urun,
      ulke,
      yil,
      SUM(ithalat_mik) as miktar,
      SUM(ithalat_deger) as deger,
      miktar_birim as birim,
      COUNT(*) as islem_sayisi,
      (SUM(ithalat_deger) / NULLIF(SUM(ithalat_mik), 0)) as birim_fiyat
    FROM tuik_ticaret_hayvansal
    WHERE ithalat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
    GROUP BY ana_urun, ulke, yil, miktar_birim
    ORDER BY deger DESC
  `,
  
  // SUMMARY QUERIES
  plantExportSummary: `
    SELECT 
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      COUNT(*) as islem_sayisi
    FROM tuik_ticaret_bitkisel
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `,
  
  animalExportSummary: `
    SELECT 
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      COUNT(*) as islem_sayisi
    FROM tuik_ticaret_hayvansal
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
  `,
  
  // TOP PRODUCTS BY VALUE
  topPlantExports: `
    SELECT 
      ana_urun,
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as ort_birim_fiyat
    FROM tuik_ticaret_bitkisel
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
    GROUP BY ana_urun
    ORDER BY toplam_deger DESC
    LIMIT 20
  `,
  
  topAnimalExports: `
    SELECT 
      ana_urun,
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as ort_birim_fiyat
    FROM tuik_ticaret_hayvansal
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
    GROUP BY ana_urun
    ORDER BY toplam_deger DESC
    LIMIT 20
  `,
  
  // YEARLY TREND
  plantExportYearlyTrend: `
    SELECT 
      yil,
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi,
      COUNT(DISTINCT ulke) as ulke_sayisi
    FROM tuik_ticaret_bitkisel
    WHERE ihracat_deger > 0 AND duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'
    GROUP BY yil
    ORDER BY yil
  `,
  
  // TOP COUNTRIES
  topPlantExportCountries: `
    SELECT 
      ulke,
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as ort_birim_fiyat
    FROM tuik_ticaret_bitkisel
    WHERE ihracat_deger > 0 AND duzey_1 = 'ülke' AND duzey_3 = 'yil'
    GROUP BY ulke
    ORDER BY toplam_deger DESC
    LIMIT 20
  `,
};

// ========== EMTİA FİYATLARI (Yahoo Finance via Backend) ==========
export interface CommodityItem {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  exchange: string;
  time: number;
}

export interface CommodityResult {
  success?: boolean;
  commodities?: CommodityItem[];
  source?: string;
  updated?: string;
  count?: number;
  error?: string;
}

let commodityCache: CommodityResult | null = null;
let commodityCacheAt = 0;
const COMMODITY_CACHE_MS = 3 * 60 * 1000;

export async function fetchCommodityPrices(): Promise<CommodityResult> {
  try {
    const now = Date.now();
    if (commodityCache && now - commodityCacheAt < COMMODITY_CACHE_MS) {
      return commodityCache;
    }
    const url = `${API_BASE}/api.php?action=commodity_prices&api_key=${API_KEY}`;
    const response = await axios.get(url, { timeout: 30000 });
    const data = response.data as CommodityResult;
    if (data && data.success && data.commodities && data.commodities.length > 0) {
      commodityCache = data;
      commodityCacheAt = now;
      return data;
    }
    return { success: false, error: 'No commodity data returned' };
  } catch {
    return { success: false, error: 'Commodity prices fetch failed' };
  }
}

export interface ChartPoint { t: number; c: number; }
export interface ChartResult {
  success?: boolean;
  symbol?: string;
  range?: string;
  data?: ChartPoint[];
  error?: string;
}

export async function fetchCommodityChart(symbol: string, range = '1mo', interval = '1d'): Promise<ChartResult> {
  try {
    const url = `${API_BASE}/api.php?action=commodity_chart&api_key=${API_KEY}&symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
    const response = await axios.get(url, { timeout: 15000 });
    return response.data as ChartResult;
  } catch {
    return { success: false, error: 'Chart fetch failed' };
  }
}

// ========== AI CHAT ==========
export interface AIChatResult {
  success?: boolean;
  reply?: string;
  model?: string;
  error?: string;
}

// Faz 8.2 — chart-json sözleşmesi (bkz. AI_CHART_CONTRACT.md). Backend system
// prompt'una uygun davranabilmesi için opsiyonel hint olarak kullanıcı mesajına
// ön-eklenir. Backend bu satırları görmezse bile zarar vermez (yalnızca metin).
const CHART_JSON_HINT = '[Grafik gerekiyorsa cevabına ```chart-json {type,data,xKey,series,title,unit}``` bloğu ekle (şema: AI_CHART_CONTRACT.md). Gerek yoksa ekleme.]\n\n';

export async function fetchAIChat(message: string, chartHint = true): Promise<AIChatResult> {
  try {
    const url = `${API_BASE}/api.php?action=ai_chat&api_key=${API_KEY}`;
    const payload = chartHint ? CHART_JSON_HINT + message : message;
    const response = await axios.post(url, { message: payload }, { timeout: 60000 });
    return response.data as AIChatResult;
  } catch {
    return { success: false, error: 'AI Chat bağlantı hatası' };
  }
}

// Helper function to calculate unit price
export function calculateUnitPrice(value: number, quantity: number): number | null {
  if (!quantity || quantity === 0) return null;
  return value / quantity;
}

// Helper function to calculate year-over-year change
export function calculateYoYChange(current: number, previous: number): number | null {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Format unit price
export function formatUnitPrice(price: number | null): string {
  if (price === null || price === undefined) return 'N/A';
  if (price >= 1e6) return '$' + (price / 1e6).toFixed(2) + 'M';
  if (price >= 1e3) return '$' + (price / 1e3).toFixed(2) + 'K';
  return '$' + price.toFixed(2);
}

// Format percentage change
export function formatPercentChange(change: number | null): string {
  if (change === null || change === undefined) return 'N/A';
  const sign = change > 0 ? '+' : '';
  return sign + change.toFixed(1) + '%';
}

// Build dynamic WHERE clause for filters
export function buildWhereClause(filters: {
  year?: string;
  product?: string;
  country?: string;
  minValue?: number;
}): string {
  const conditions: string[] = [];
  
  if (filters.year && filters.year !== 'all') {
    conditions.push(`yil = '${filters.year}'`);
  }
  
  if (filters.product) {
    conditions.push(`ana_urun = '${filters.product.replace(/'/g, "''")}'`);
  }
  
  if (filters.country) {
    conditions.push(`ulke = '${filters.country.replace(/'/g, "''")}'`);
  }
  
  if (filters.minValue !== undefined) {
    conditions.push(`ihracat_deger >= ${filters.minValue}`);
  }
  
  return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}
