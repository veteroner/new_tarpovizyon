import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)
  ?? (import.meta.env.DEV ? '' : 'https://dersbende.com');
const API_KEY = 'REDACTED_DASHBOARD_KEY';

export interface QueryResult {
  success?: boolean;
  data?: Record<string, string | number>[];
  error?: string;
}

export async function fetchQuery(sql: string): Promise<QueryResult> {
  try {
    const url = `${API_BASE}/api.php?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return { data: [], error: 'API bağlantı hatası' };
  }
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

function parseTrMoneyToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEggPricesFromText(text: string): EggPricesResult {
  const labels: Array<{ key: EggPriceKey; label: string }> = [
    { key: 'double', label: 'Double' },
    { key: 'eski_ana', label: 'Eski Ana' },
    { key: 'yeni_ana', label: 'Yeni Ana' },
    { key: 'yarka', label: 'Yarka' },
    { key: 'pilic', label: 'Piliç' },
    { key: 'kilavuz', label: 'Kılavuz' },
  ];

  const dateMatch = text.match(/\b(\d{2}-\d{2}-\d{4})\b/);
  const date = dateMatch?.[1] ?? null;

  const prices: Partial<Record<EggPriceKey, number>> = {};
  for (const { key, label } of labels) {
    const re = new RegExp(`${label}\\s*[:\u00A0 ]*\\s*([0-9.,]+)\\s*TL`, 'i');
    const match = text.match(re);
    const num = match?.[1] ? parseTrMoneyToNumber(match[1]) : null;
    if (num != null) prices[key] = num;
  }

  return { success: true, source: 'basmakcitavukculuk.com', date, prices };
}

let eggPricesCache: EggPricesResult | null = null;
let eggPricesCacheAt = 0;
const EGG_PRICES_CACHE_MS = 5 * 60 * 1000;

async function ocrEggPricesFromImage(imageUrl: string): Promise<EggPricesResult> {
  try {
    const img = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    let blob = new Blob([img.data], { type: 'image/png' });

    if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(blob);
        const scale = 3;
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.filter = 'contrast(180%)';
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const processed = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (processed) blob = processed;
        }
      } catch {
        // ignore preprocessing failures
      }
    }

    const tesseract = await import('tesseract.js');
    const lang = 'tur';
    const worker = await tesseract.createWorker(lang);

    try {
      await worker.load();
      await worker.reinitialize(lang);

      await worker.setParameters({
        tessedit_pageseg_mode: tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });

      const { data } = await worker.recognize(blob);
      const text = String(data?.text ?? '').replace(/\s+/g, ' ').trim();
      return parseEggPricesFromText(text);
    } finally {
      await worker.terminate();
    }
  } catch {
    return { success: false, error: 'Egg prices OCR failed' };
  }
}

export async function fetchEggPrices(): Promise<EggPricesResult> {
  try {
    const now = Date.now();
    if (eggPricesCache && now - eggPricesCacheAt < EGG_PRICES_CACHE_MS) return eggPricesCache;

    const url = `${API_BASE}/egg-prices`;
    const response = await axios.get(url, { responseType: 'text' });
    const data = response.data as unknown;

    let parsed: EggPricesResult | null = null;

    if (typeof data === 'string') {
      const text = stripHtmlToText(data);
      parsed = parseEggPricesFromText(text);
    } else if (data && typeof data === 'object') {
      parsed = data as EggPricesResult;
    }

    if (parsed) {
      const hasAnyPrice = Boolean(parsed.prices && Object.keys(parsed.prices).length > 0);
      if (hasAnyPrice) {
        eggPricesCache = parsed;
        eggPricesCacheAt = now;
        return parsed;
      }

      const imageUrl = `${API_BASE}${parsed.imageUrl ?? '/egg-prices-image'}`;
      const ocr = await ocrEggPricesFromImage(imageUrl);
      eggPricesCache = ocr;
      eggPricesCacheAt = now;
      return ocr;
    }

    return { success: false, error: 'Unexpected egg prices response' };
  } catch (error) {
    console.error('Egg prices API error:', error);
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
export const TRADE_YEARS = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011'];
export const PRODUCTION_YEARS = ['2021'];

export const TRADE_TABLES = {
  PLANT: 'tuik_ticaret_bitkisel',
  ANIMAL: 'tuik_ticaret_hayvansal',
} as const;

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
    FROM tuik_ticaret
    WHERE ihracat_deger > 0
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
    FROM tuik_ticaret
    WHERE ithalat_deger > 0
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
    FROM tuik_ticarethayvansal
    WHERE ihracat_deger > 0
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
    FROM tuik_ticarethayvansal
    WHERE ithalat_deger > 0
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
    FROM tuik_ticaret
    WHERE ihracat_deger > 0
  `,
  
  animalExportSummary: `
    SELECT 
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ana_urun) as urun_sayisi,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      COUNT(*) as islem_sayisi
    FROM tuik_ticarethayvansal
    WHERE ihracat_deger > 0
  `,
  
  // TOP PRODUCTS BY VALUE
  topPlantExports: `
    SELECT 
      ana_urun,
      SUM(ihracat_deger) as toplam_deger,
      SUM(ihracat_mik) as toplam_miktar,
      COUNT(DISTINCT ulke) as ulke_sayisi,
      (SUM(ihracat_deger) / NULLIF(SUM(ihracat_mik), 0)) as ort_birim_fiyat
    FROM tuik_ticaret
    WHERE ihracat_deger > 0
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
    FROM tuik_ticarethayvansal
    WHERE ihracat_deger > 0
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
    FROM tuik_ticaret
    WHERE ihracat_deger > 0
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
    FROM tuik_ticaret
    WHERE ihracat_deger > 0
    GROUP BY ulke
    ORDER BY toplam_deger DESC
    LIMIT 20
  `,
};

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
