import axios from 'axios';
import { fetchAgg, num, type Row } from './d1';

// Veri artık Cloudflare D1'den (services/d1.ts) geliyor; burada kalan tek
// api.php kullanımı AI sohbet ucu. Aynı orijin ('') kullanılıyor ki istek
// netlify.toml'daki /api.php redirect'inden geçip kendi Netlify Function'ımıza
// düşsün.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
// api.php'nin uygulama anahtarı. Depoda sabit yazılıydı; ortam değişkeni
// tanımlıysa o kullanılıyor. Kalan tek kullanım emtia fiyatları / AI sohbet.
const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? 'dashboard_secret_key_2024';

const IS_DEV = import.meta.env.DEV;

export interface QueryResult {
  success?: boolean;
  data?: Row[];
  error?: string;
}

// ─── Hasat Tahmini — veri katmanı ────────────────────────────────────────────
// Eskiden burada ham SQL kuruluyordu; artık D1 toplama ucu kullanılıyor.

const R_BITKISEL = 'tuik/bitkisel-uretim';
const YIELD_YEARS = ['y2018', 'y2019', 'y2020', 'y2021', 'y2022', 'y2023', 'y2024'];

/** İl listesi (il bazlı kayıtlara sahip tüm iller) */
export async function fetchProvinces(): Promise<QueryResult> {
  return { data: await fetchAgg(R_BITKISEL, {
    groupBy: ['ili'], where: { duzey: 'ilçe' }, orderBy: 'ili', dir: 'asc',
  }) };
}

/** Belirli bir ilin ilçe listesi */
export async function fetchDistricts(il: string): Promise<QueryResult> {
  return { data: await fetchAgg(R_BITKISEL, {
    groupBy: ['yer'], where: { duzey: 'ilçe', ili: il }, orderBy: 'yer', dir: 'asc',
  }) };
}

/** Belirli il/ilçe'de yetiştirilen ürünler (son 3 yılda verimi >0 olanlar) */
export async function fetchCrops(il: string, ilce: string): Promise<QueryResult> {
  // (y2022+y2023+y2024) > 0 koşulu istemcide.
  const rows = await fetchAgg(R_BITKISEL, {
    groupBy: ['urun'], sum: ['y2022', 'y2023', 'y2024'],
    where: { duzey: 'ilçe', ili: il, yer: ilce, unsur: 'Verim', birim: 'Kg/Dekar' },
    orderBy: 'urun', dir: 'asc',
  });
  return { data: rows.filter((r) =>
    num(r.sum_y2022) + num(r.sum_y2023) + num(r.sum_y2024) > 0) };
}

/** Verim serisi — ilçe / il / Türkiye düzeyinde */
export async function fetchYieldData(
  il: string,
  ilce: string,
  urun: string,
  level: 'ilçe' | 'il' | 'Turkey',
): Promise<QueryResult> {
  const kosul = level === 'ilçe'
    ? { duzey: 'ilçe', ili: il, yer: ilce }
    : level === 'il'
      ? { duzey: 'il', ili: il }
      : { duzey: 'Turkey' };
  const rows = await fetchAgg(R_BITKISEL, {
    sum: YIELD_YEARS,
    where: { ...kosul, urun, unsur: 'Verim', birim: 'Kg/Dekar' },
  });
  // Çağıranlar y2018… adlarını bekliyor; sum_ önekini kaldır.
  return { data: [Object.fromEntries(YIELD_YEARS.map((y) => [y, num(rows[0]?.[`sum_${y}`])]))] };
}

/** İl bazlı verim sıralaması (en son yıl) */
export async function fetchProvinceRanking(urun: string): Promise<QueryResult> {
  const rows = await fetchAgg(R_BITKISEL, {
    groupBy: ['ili'], sum: ['y2024'],
    where: { duzey: 'il', urun, unsur: 'Verim', birim: 'Kg/Dekar' },
    orderBy: 'sum_y2024', dir: 'desc',
  });
  return { data: rows.filter((r) => num(r.sum_y2024) > 0)
    .map((r) => ({ ili: r.ili, y2024: num(r.sum_y2024) })) };
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

// NOT: burada ham SQL'e dayalı bir yardımcı yığını vardı — `queries` sözlüğü
// (yct_20 tablosuna gidiyordu; o tablo veritabanında hiç yok, sorgular her
// zaman hata dönüyordu), addYearFilter, duzeyFilter, TRADE_TABLES ve sabit yıl
// listeleri. Sayfalar D1'e taşındığı için hiçbiri kullanılmıyor; kaldırıldı.

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

// ========== FAO GIEWS Ülke Fiyatları ==========
const FAO_GIEWS_BASE = 'https://fpma.fao.org/giews/v4/global/price_module/api/v1';

export interface GiewsSerie {
  uuid: string;
  iso3_country_code: string;
  country_name: string;
  market_name: string;
  commodity_name: string;
  commodity_code?: string;
  currency: string;
  measure_unit_label: string;
  price_type: string;
  source_name: string;
}

export interface GiewsDatapoint {
  id: number;
  price_value: number;
  price_value_dollar: number;
  date: string;
  periodicity: string;
}

export interface GiewsPriceResult {
  uuid: string;
  datapoints: GiewsDatapoint[];
}

export async function fetchGiewsSeries(iso3: string): Promise<GiewsSerie[]> {
  try {
    const url = `${FAO_GIEWS_BASE}/FpmaSerieDomestic/?format=json&iso3_country_code=${encodeURIComponent(iso3)}&page_size=200`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data?.results ?? [];
  } catch {
    return [];
  }
}

export async function fetchGiewsPricesBatch(uuids: string[]): Promise<GiewsPriceResult[]> {
  if (!uuids.length) return [];
  const CHUNK = 50;
  const results: GiewsPriceResult[] = [];
  for (let i = 0; i < uuids.length; i += CHUNK) {
    const chunk = uuids.slice(i, i + CHUNK);
    try {
      const url = `${FAO_GIEWS_BASE}/FpmaSeriePrice/?uuid__in=${chunk.join(',')}&periodicity=monthly&startdate=2022-01-01&page_size=2000`;
      const res = await axios.get(url, { timeout: 20000 });
      results.push(...(res.data?.results ?? []));
    } catch { /* ignore failed chunks */ }
  }
  return results;
}

/** Commodity bazlı (tüm ülkeler) yurtiçi seri listesi */
export async function fetchGiewsSeriesByCommodity(commodityName: string): Promise<GiewsSerie[]> {
  try {
    const safe = encodeURIComponent(commodityName);
    const primaryUrl = `${FAO_GIEWS_BASE}/FpmaSerieDomestic/?format=json&commodity_name=${safe}&page_size=500`;
    const primary = await axios.get(primaryUrl, { timeout: 20000 });
    const primaryResults = (primary.data?.results ?? []) as GiewsSerie[];
    if (primaryResults.length > 0) return primaryResults;

    // Bazı FPMA sürümlerinde exact filter boş dönebiliyor, geniş filtreyi dene.
    const fallbackUrl = `${FAO_GIEWS_BASE}/FpmaSerieDomestic/?format=json&commodity_name__icontains=${safe}&page_size=500`;
    const fallback = await axios.get(fallbackUrl, { timeout: 20000 });
    return (fallback.data?.results ?? []) as GiewsSerie[];
  } catch {
    return [];
  }
}

/** Uluslararası fiyat serileri (FAO FPMA) */
export async function fetchGiewsInternationalSeries(): Promise<GiewsSerie[]> {
  try {
    const url = `${FAO_GIEWS_BASE}/FpmaSerieInternational/?format=json&page_size=500`;
    const res = await axios.get(url, { timeout: 20000 });
    return (res.data?.results ?? []) as GiewsSerie[];
  } catch {
    return [];
  }
}
