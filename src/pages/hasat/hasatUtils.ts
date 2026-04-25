// ─── Types ────────────────────────────────────────────────────────────────────

export interface YearData {
  y2018: number; y2019: number; y2020: number;
  y2021: number; y2022: number; y2023: number; y2024: number;
}

export interface CostInputs {
  fiyatTL: number;
  maliyetDekar: number;
}

export interface SavedForecast {
  id: string;
  ts: number;
  il: string;
  ilce: string;
  urun: string;
  alan: number;
  sulama: boolean;
  toprakKalite: string;
  tahminiUretim: number;
  projVerim: number;
  fiyatTL: number;
  maliyetDekar: number;
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  il: string;
  ilce: string;
  locationMethod: 'manual' | 'gps';
  urun: string;
  alan: number;
  sulama: boolean;
  toprakKalite: 'iyi' | 'orta' | 'zayif';
  cost: CostInputs;
  compareUrunler: string[];
  ilceData: YearData | null;
  ilData: YearData | null;
  turkiyeData: YearData | null;
  compareData: { urun: string; ilceData: YearData | null; ilData: YearData | null; turkiyeData: YearData | null }[];
  ilVerimler: RegionTotal[];
  ilRanking: { il: string; verim: number }[];
}

export interface ClimateRisk {
  skor: number;
  label: string;
  color: string;
  emoji: string;
  faktorler: { ad: string; puan: number; aciklama: string }[];
}

export interface CalcResult {
  avgVerim: number; adjVerim: number;
  projVerim: number;
  regR2: number;
  tahminiUretim: number; minUretim: number; maxUretim: number;
  trend: number; cv: number;
  risk: { label: string; color: string; emoji: string };
  dataLevel: 'ilce' | 'il' | 'turkiye';
  perfVsIl: number | null;
  perfVsTR: number | null;
  stdDev: number;
  brutGelir: number | null;
  toplamMaliyet: number | null;
  netKar: number | null;
  karMarji: number | null;
}

// Re-export RegionTotal type from TurkeyHeatMap
import { type RegionTotal } from '../../components/TurkeyHeatMap';
export type { RegionTotal };

// ─── Sowing Calendar ──────────────────────────────────────────────────────────

export function getSowingCalendar(urun: string): { ekimAy: string; ekimBitis: string; aciklama: string } {
  const u = urun.toLocaleLowerCase('tr-TR');
  if (u.includes('buğday'))
    return { ekimAy: 'Ekim', ekimBitis: 'Kasım', aciklama: 'Sonbahar ekimi; toprak sıcaklığı 8-12°C' };
  if (u.includes('arpa') || u.includes('çavdar') || u.includes('yulaf') || u.includes('triticale'))
    return { ekimAy: 'Ekim', ekimBitis: 'Kasım', aciklama: 'Sonbahar ekimi; buğdaydan 1-2 hafta önce' };
  if (u.includes('mısır'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Toprak sıcaklığı 10°C üzeri olmalı' };
  if (u.includes('pirinç'))
    return { ekimAy: 'Mayıs', ekimBitis: 'Haziran', aciklama: 'Fide dikim; su sıcaklığı 18°C üzeri' };
  if (u.includes('ayçiçeği'))
    return { ekimAy: 'Mart', ekimBitis: 'Nisan', aciklama: 'Don riski geçtikten sonra ekim' };
  if (u.includes('pamuk'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Toprak sıcaklığı 18°C üzeri olmalı' };
  if (u.includes('şeker pancarı'))
    return { ekimAy: 'Mart', ekimBitis: 'Nisan', aciklama: 'Erken ilkbahar ekimi; 5-6°C yeterli' };
  if (u.includes('kanola') || u.includes('kolza'))
    return { ekimAy: 'Eylül', ekimBitis: 'Ekim', aciklama: 'Sonbahar ekimi; kışa güçlü girsin' };
  if (u.includes('nohut'))
    return { ekimAy: 'Şubat', ekimBitis: 'Mart', aciklama: 'Kışlık ekim tercih; ilkbahar da olabilir' };
  if (u.includes('mercimek'))
    return { ekimAy: 'Ekim', ekimBitis: 'Kasım', aciklama: 'Kışlık ekim; don dayanıklı çeşitler' };
  if (u.includes('fasulye'))
    return { ekimAy: 'Mayıs', ekimBitis: 'Haziran', aciklama: 'Don riski tamamen geçtikten sonra' };
  if (u.includes('bakla') || u.includes('bezelye'))
    return { ekimAy: 'Ekim', ekimBitis: 'Kasım', aciklama: 'Kışlık ekim; soğuğa dayanıklı' };
  if (u.includes('patates'))
    return { ekimAy: 'Mart', ekimBitis: 'Nisan', aciklama: 'Toprak 7-8°C; çimlenmiş tohumla ekim' };
  if (u.includes('domates'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Fide dikimi; don riski sonrası' };
  if (u.includes('biber') || u.includes('patlıcan'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Fide dikimi; sıcak seven bitkiler' };
  if (u.includes('salatalık') || u.includes('kabak'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Dona duyarlı; sıcak toprak gerekli' };
  if (u.includes('soğan'))
    return { ekimAy: 'Şubat', ekimBitis: 'Mart', aciklama: 'Arpacık/fide ile erken ilkbahar dikimi' };
  if (u.includes('sarımsak'))
    return { ekimAy: 'Ekim', ekimBitis: 'Kasım', aciklama: 'Sonbahar dikimi; kış soğuğu gerekli' };
  if (u.includes('havuç'))
    return { ekimAy: 'Mart', ekimBitis: 'Nisan', aciklama: 'Derin, taşsız toprakta doğrudan ekim' };
  if (u.includes('tütün'))
    return { ekimAy: 'Nisan', ekimBitis: 'Mayıs', aciklama: 'Fide dikimi; hafif eğimli araziler' };
  if (u.includes('soya'))
    return { ekimAy: 'Mayıs', ekimBitis: 'Haziran', aciklama: 'II. ürün olarak Haziranda ekilebilir' };
  return { ekimAy: 'Mart', ekimBitis: 'Nisan', aciklama: 'İlkbahar ekimi; bölge iklimine göre ayarlayın' };
}

// ─── Harvest Calendar ─────────────────────────────────────────────────────────

export function getHarvestCalendar(urun: string): { baslangic: string; bitis: string; aciklama: string } {
  const u = urun.toLocaleLowerCase('tr-TR');
  if (u.includes('buğday') || u.includes('arpa') || u.includes('çavdar') || u.includes('yulaf') || u.includes('triticale'))
    return { baslangic: 'Haziran', bitis: 'Temmuz', aciklama: 'Sıcaklık yükseldikçe hasat hızlanır' };
  if (u.includes('mısır'))
    return { baslangic: 'Eylül', bitis: 'Ekim', aciklama: 'Tane nem oranı %25 altına inince başlanır' };
  if (u.includes('pirinç'))
    return { baslangic: 'Eylül', bitis: 'Ekim', aciklama: 'Sap kuruması ve tane dolumu tamamlanmalı' };
  if (u.includes('ayçiçeği'))
    return { baslangic: 'Ağustos', bitis: 'Eylül', aciklama: 'Tabla sarardığında kombine ile hasat' };
  if (u.includes('pamuk'))
    return { baslangic: 'Eylül', bitis: 'Kasım', aciklama: 'Koza açılma oranı %60+ olunca başlanabilir' };
  if (u.includes('şeker pancarı'))
    return { baslangic: 'Eylül', bitis: 'Kasım', aciklama: 'Şeker içeriği en yüksek dönemde hasat' };
  if (u.includes('kanola') || u.includes('kolza'))
    return { baslangic: 'Haziran', bitis: 'Temmuz', aciklama: 'Bakla kabuğu sararıp sertleşince hasat' };
  if (u.includes('nohut') || u.includes('mercimek') || u.includes('fasulye') || u.includes('bakla') || u.includes('bezelye'))
    return { baslangic: 'Haziran', bitis: 'Ağustos', aciklama: 'Bakla nem oranı %14 altına inince hasat' };
  if (u.includes('patates'))
    return { baslangic: 'Temmuz', bitis: 'Eylül', aciklama: 'Yaprak sararması ve kuruma başlayınca hasat' };
  if (u.includes('domates') || u.includes('biber') || u.includes('salatalık') || u.includes('patlıcan') || u.includes('kabak'))
    return { baslangic: 'Temmuz', bitis: 'Ekim', aciklama: 'Olgunluk rengi ve sertliğe göre hasat' };
  if (u.includes('soğan') || u.includes('sarımsak'))
    return { baslangic: 'Haziran', bitis: 'Temmuz', aciklama: 'Yaprak yatma oranı %60-70 olunca hasat' };
  if (u.includes('havuç'))
    return { baslangic: 'Ekim', bitis: 'Kasım', aciklama: 'Kış öncesi hasat, soğukta tatlılık artar' };
  if (u.includes('elma') || u.includes('armut'))
    return { baslangic: 'Ağustos', bitis: 'Ekim', aciklama: 'Çeşide göre; parmakla bastırma testi' };
  if (u.includes('kiraz') || u.includes('vişne'))
    return { baslangic: 'Mayıs', bitis: 'Temmuz', aciklama: 'Meyve rengi koyu kırmızıya döndüğünde' };
  if (u.includes('kayısı') || u.includes('şeftali') || u.includes('erik'))
    return { baslangic: 'Haziran', bitis: 'Ağustos', aciklama: 'Meyve yumuşamaya başlayınca hasat' };
  if (u.includes('üzüm'))
    return { baslangic: 'Ağustos', bitis: 'Ekim', aciklama: 'Refraktometre ile şeker ölçümü yapılır' };
  if (u.includes('zeytin'))
    return { baslangic: 'Ekim', bitis: 'Aralık', aciklama: 'Yağlıkta çekirdek-et oranı, sofralıkta renk' };
  if (u.includes('portakal') || u.includes('mandalina') || u.includes('limon'))
    return { baslangic: 'Kasım', bitis: 'Mart', aciklama: 'Renk değişimi ve refraktometre ölçümü' };
  if (u.includes('incir'))
    return { baslangic: 'Ağustos', bitis: 'Eylül', aciklama: 'Meyve yumuşadığında elle toplanır' };
  if (u.includes('tütün'))
    return { baslangic: 'Temmuz', bitis: 'Eylül', aciklama: 'Alt yapraklardan başlayarak elle hasat' };
  return { baslangic: 'Mayıs', bitis: 'Eylül', aciklama: 'Çiçeklenme döneminde biçim yapılır' };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (arr.length - 1));
}

export function getYearsAll(d: YearData): { year: number; value: number }[] {
  const pairs: { year: number; value: number }[] = [
    { year: 2018, value: d.y2018 }, { year: 2019, value: d.y2019 },
    { year: 2020, value: d.y2020 }, { year: 2021, value: d.y2021 },
    { year: 2022, value: d.y2022 }, { year: 2023, value: d.y2023 },
    { year: 2024, value: d.y2024 },
  ];
  return pairs.filter(p => p.value > 0);
}

export function getValues(d: YearData): number[] {
  return getYearsAll(d).map(p => p.value);
}

export function linearRegression(points: { year: number; value: number }[]): { a: number; b: number; r2: number } {
  const n = points.length;
  if (n < 2) return { a: points[0]?.value ?? 0, b: 0, r2: 0 };
  const sx = points.reduce((s, p) => s + p.year, 0);
  const sy = points.reduce((s, p) => s + p.value, 0);
  const sxx = points.reduce((s, p) => s + p.year * p.year, 0);
  const sxy = points.reduce((s, p) => s + p.year * p.value, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  const yMean = sy / n;
  const ssTot = points.reduce((s, p) => s + (p.value - yMean) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.value - (a + b * p.year)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { a, b, r2 };
}

function getTrend(d: YearData): number {
  const pts = getYearsAll(d);
  if (pts.length < 2) return 0;
  const first = pts[0].value;
  const last = pts[pts.length - 1].value;
  if (!first) return 0;
  return ((last - first) / first) * 100;
}

export function riskLabel(cv: number): { label: string; color: string; emoji: string } {
  if (cv < 0.10) return { label: 'Düşük Risk', color: '#22c55e', emoji: '🟢' };
  if (cv < 0.20) return { label: 'Orta Risk',  color: '#f59e0b', emoji: '🟡' };
  return             { label: 'Yüksek Risk', color: '#ef4444', emoji: '🔴' };
}

// ─── Climate Risk Score ───────────────────────────────────────────────────────

import { getBolge, BOLGE_META, getETo, getYagis } from '../../utils/climate-data';

export function calcClimateRisk(il: string, urun: string): ClimateRisk | null {
  const bolge = getBolge(il);
  if (!bolge) return null;
  const meta = BOLGE_META[bolge];
  const faktorler: { ad: string; puan: number; aciklama: string }[] = [];

  const etoJul = getETo(il, 7);
  const heatPuan = etoJul > 7.5 ? 25 : etoJul > 6 ? 15 : etoJul > 4 ? 8 : 3;
  faktorler.push({ ad: 'Sıcaklık Stresi', puan: heatPuan, aciklama: `Temmuz ETo: ${etoJul.toFixed(1)} mm/gün` });

  const yazYagis = [6, 7, 8].reduce((s, m) => s + getYagis(il, m), 0);
  const droughtPuan = yazYagis < 30 ? 25 : yazYagis < 60 ? 18 : yazYagis < 100 ? 10 : 4;
  faktorler.push({ ad: 'Kuraklık Riski', puan: droughtPuan, aciklama: `Yaz yağışı: ${yazYagis.toFixed(0)} mm` });

  const etoMar = getETo(il, 3);
  const frostPuan = etoMar < 1.5 ? 25 : etoMar < 2.5 ? 15 : etoMar < 3.5 ? 8 : 3;
  faktorler.push({ ad: 'Don Riski', puan: frostPuan, aciklama: `Mart ETo: ${etoMar.toFixed(1)} mm/gün` });

  const yillikYagis = Array.from({ length: 12 }, (_, i) => getYagis(il, i + 1)).reduce((a, b) => a + b, 0);
  const u = urun.toLocaleLowerCase('tr-TR');
  const isWaterHungry = u.includes('pirinç') || u.includes('mısır') || u.includes('pamuk') || u.includes('şeker');
  const threshold = isWaterHungry ? 700 : 450;
  const rainPuan = yillikYagis < threshold * 0.5 ? 25 : yillikYagis < threshold * 0.75 ? 18 : yillikYagis < threshold ? 10 : 4;
  faktorler.push({ ad: 'Yağış Yeterliliği', puan: rainPuan, aciklama: `Yıllık: ${yillikYagis.toFixed(0)} mm (eşik: ${threshold} mm)` });

  const skor = faktorler.reduce((s, f) => s + f.puan, 0);
  const label = skor >= 60 ? 'Yüksek İklim Riski' : skor >= 35 ? 'Orta İklim Riski' : 'Düşük İklim Riski';
  const color = skor >= 60 ? '#ef4444' : skor >= 35 ? '#f59e0b' : '#22c55e';
  const emoji = skor >= 60 ? '🔴' : skor >= 35 ? '🟡' : '🟢';

  faktorler.push({ ad: 'İklim Bölgesi', puan: 0, aciklama: `${meta.emoji} ${meta.ad}` });

  return { skor, label, color, emoji, faktorler };
}

// ─── Calculate ────────────────────────────────────────────────────────────────

export function calculate(state: WizardState): CalcResult | null {
  const src = state.ilceData ?? state.ilData ?? state.turkiyeData;
  if (!src) return null;
  const level: 'ilce' | 'il' | 'turkiye' = state.ilceData ? 'ilce' : state.ilData ? 'il' : 'turkiye';
  const pts = getYearsAll(src);
  const vals = pts.map(p => p.value);
  if (!vals.length) return null;
  const avg = mean(vals);
  const sd  = stddev(vals, avg);
  const cv  = avg > 0 ? sd / avg : 0;

  const reg = linearRegression(pts);
  const projRaw = Math.max(0, reg.a + reg.b * 2025);
  const projVerim = (reg.r2 >= 0.3 && pts.length >= 3) ? projRaw : avg;

  const sf  = state.sulama ? 1.25 : 1.0;
  const tf  = state.toprakKalite === 'iyi' ? 1.15 : state.toprakKalite === 'zayif' ? 0.85 : 1.0;
  const adjVerim       = projVerim * sf * tf;
  const margin         = sd * sf * tf;
  const tahminiUretim  = (adjVerim * state.alan) / 1000;

  const ilAvg = state.ilData ? mean(getValues(state.ilData)) : 0;
  const trAvg = state.turkiyeData ? mean(getValues(state.turkiyeData)) : 0;
  const perfVsIl = (ilAvg > 0 && state.ilceData) ? ((avg - ilAvg) / ilAvg) * 100 : null;
  const perfVsTR = (trAvg > 0 && (state.ilceData || state.ilData)) ? ((avg - trAvg) / trAvg) * 100 : null;

  const { fiyatTL, maliyetDekar } = state.cost;
  const brutGelir = fiyatTL > 0 ? tahminiUretim * 1000 * fiyatTL : null;
  const toplamMaliyet = maliyetDekar > 0 ? maliyetDekar * state.alan : null;
  const netKar = (brutGelir !== null && toplamMaliyet !== null) ? brutGelir - toplamMaliyet : null;
  const karMarji = (brutGelir !== null && toplamMaliyet !== null && brutGelir > 0)
    ? ((brutGelir - toplamMaliyet) / brutGelir) * 100 : null;

  return {
    avgVerim: avg, adjVerim, projVerim, regR2: reg.r2, tahminiUretim,
    minUretim: Math.max(0, ((adjVerim - margin) * state.alan) / 1000),
    maxUretim: ((adjVerim + margin) * state.alan) / 1000,
    trend: getTrend(src), cv, risk: riskLabel(cv), dataLevel: level,
    perfVsIl, perfVsTR, stdDev: sd,
    brutGelir, toplamMaliyet, netKar, karMarji,
  };
}

// ─── Forecast History (localStorage) ──────────────────────────────────────────

const HISTORY_KEY = 'hasat_tahmini_gecmis';
const MAX_HISTORY = 20;

export function loadHistory(): SavedForecast[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveToHistory(state: WizardState, calc: CalcResult): void {
  try {
    const list = loadHistory();
    const entry: SavedForecast = {
      id: Date.now().toString(36),
      ts: Date.now(),
      il: state.il, ilce: state.ilce, urun: state.urun,
      alan: state.alan, sulama: state.sulama, toprakKalite: state.toprakKalite,
      tahminiUretim: calc.tahminiUretim, projVerim: calc.projVerim,
      fiyatTL: state.cost.fiyatTL, maliyetDekar: state.cost.maliyetDekar,
    };
    list.unshift(entry);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch { /* quota exceeded */ }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Multi-crop quick compare ─────────────────────────────────────────────────

export function calcQuick(data: YearData | null, alan: number, sulama: boolean, toprak: 'iyi' | 'orta' | 'zayif'): { verim: number; uretim: number; trend: number; risk: string } | null {
  if (!data) return null;
  const pts = getYearsAll(data);
  const vals = pts.map(p => p.value);
  if (!vals.length) return null;
  const avg = mean(vals);
  const reg = linearRegression(pts);
  const proj = (reg.r2 >= 0.3 && pts.length >= 3) ? Math.max(0, reg.a + reg.b * 2025) : avg;
  const sf = sulama ? 1.25 : 1.0;
  const tf = toprak === 'iyi' ? 1.15 : toprak === 'zayif' ? 0.85 : 1.0;
  const adjV = proj * sf * tf;
  const sd = stddev(vals, avg);
  const cv = avg > 0 ? sd / avg : 0;
  return {
    verim: adjV,
    uretim: (adjV * alan) / 1000,
    trend: getTrend(data),
    risk: riskLabel(cv).emoji,
  };
}

// ─── String Normalization / Match ─────────────────────────────────────────────

export function normalizeTR(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('â', 'a')
    .replaceAll('î', 'i')
    .replaceAll('û', 'u');
}

export function findBestMatch(list: string[], candidate: string): string {
  const c = normalizeTR(candidate);
  const exact = list.find(v => normalizeTR(v) === c);
  if (exact) return exact;
  const prefix = list.find(v => normalizeTR(v).startsWith(c));
  if (prefix) return prefix;
  const contains = list.find(v => normalizeTR(v).includes(c));
  return contains ?? '';
}

// ─── GPS ──────────────────────────────────────────────────────────────────────

const GEOCODE_CACHE_KEY = 'nominatim_cache';
function getGeocodeCache(): Record<string, { il: string; ilce: string; ts: number }> {
  try {
    return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
  } catch { return {}; }
}
function setGeocodeCache(key: string, value: { il: string; ilce: string }) {
  try {
    const cache = getGeocodeCache();
    cache[key] = { ...value, ts: Date.now() };
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const sorted = keys.sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0));
      sorted.slice(0, keys.length - 50).forEach(k => delete cache[k]);
    }
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full or unavailable */ }
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ il: string; ilce: string } | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = getGeocodeCache()[cacheKey];
  if (cached && (Date.now() - cached.ts) < 30 * 24 * 60 * 60 * 1000) {
    return { il: cached.il, ilce: cached.ilce };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr&zoom=10`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json() as { address?: Record<string, string> };
    const addr = data?.address ?? {};
    if (!Object.keys(addr).length) return null;
    const clean = (s: string) => s.replace(/\s+İl(?:i|çe)?$/i, '').replace(/\s+Merkez$/i, '').trim();
    const result = {
      il:   clean(addr.province ?? addr.state ?? ''),
      ilce: clean(addr.county ?? addr.municipality ?? addr.district ?? ''),
    };
    if (result.il) setGeocodeCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ─── Row → YearData ───────────────────────────────────────────────────────────

export function toYD(res: { data?: Record<string, string | number>[] }): YearData | null {
  const row = res.data?.[0];
  if (!row) return null;
  const n = (k: string) => Number(row[k] ?? 0);
  return { y2018: n('y2018'), y2019: n('y2019'), y2020: n('y2020'), y2021: n('y2021'), y2022: n('y2022'), y2023: n('y2023'), y2024: n('y2024') };
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHART_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
export const PROJ_YEARS  = ['2025', '2026'];

export const KATEGORILER: Record<string, string[]> = {
  'Tahıllar':           ['buğday', 'arpa', 'mısır', 'çavdar', 'yulaf', 'triticale', 'pirinç'],
  'Baklagiller':        ['nohut', 'mercimek', 'fasulye', 'bakla', 'bezelye'],
  'Endüstri Bitkileri': ['pamuk', 'tütün', 'ayçiçeği', 'kanola', 'şeker pancarı', 'soya'],
  'Sebzeler':           ['domates', 'biber', 'salatalık', 'patlıcan', 'kabak', 'soğan', 'sarımsak', 'havuç', 'patates'],
  'Meyveler':           ['elma', 'armut', 'erik', 'şeftali', 'kiraz', 'vişne', 'kayısı', 'üzüm', 'incir', 'zeytin', 'portakal', 'mandalina', 'limon'],
  'Yem Bitkileri':      ['yonca', 'korunga', 'fiğ', 'sorgum', 'silaj'],
};

export const INITIAL: WizardState = {
  step: 1, il: '', ilce: '', locationMethod: 'manual',
  urun: '', alan: 100, sulama: false, toprakKalite: 'orta',
  cost: { fiyatTL: 0, maliyetDekar: 0 },
  compareUrunler: [],
  ilceData: null, ilData: null, turkiyeData: null,
  compareData: [],
  ilVerimler: [], ilRanking: [],
};

export const AREA_PRESETS = [10, 25, 50, 100, 200, 500, 1000, 5000, 10000] as const;
export const AREA_MIN = 1;
export const AREA_MAX = 20000;
export const clampArea = (v: number) => Math.max(AREA_MIN, Math.min(AREA_MAX, Math.round(v)));
