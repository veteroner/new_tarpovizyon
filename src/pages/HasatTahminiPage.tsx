import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import { fetchProvinces, fetchDistricts, fetchCrops, fetchYieldData, fetchProvinceRanking } from '../services/api';
import { TurkeyHeatMap, type RegionTotal } from '../components/TurkeyHeatMap';
import { getBolge, BOLGE_META, getETo, getYagis } from '../utils/climate-data';
import WeatherWidget from '../components/WeatherWidget';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ModelWarningBox } from '../components/ModelWarningBox';
import './HasatTahminiPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearData {
  y2018: number; y2019: number; y2020: number;
  y2021: number; y2022: number; y2023: number; y2024: number;
}

interface CostInputs {
  fiyatTL: number;          // ₺/kg pazar fiyatı (0 = girilmedi)
  maliyetDekar: number;     // toplam maliyet ₺/dekar (0 = girilmedi)
}

interface SavedForecast {
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

interface WizardState {
  step: 1 | 2 | 3 | 4;
  il: string;
  ilce: string;
  locationMethod: 'manual' | 'gps';
  urun: string;
  alan: number;
  sulama: boolean;
  toprakKalite: 'iyi' | 'orta' | 'zayif';
  cost: CostInputs;
  compareUrunler: string[];   // multi-crop comparison (max 5)
  ilceData: YearData | null;
  ilData: YearData | null;
  turkiyeData: YearData | null;
  compareData: { urun: string; ilceData: YearData | null; ilData: YearData | null; turkiyeData: YearData | null }[];
  ilVerimler: RegionTotal[];       // all provinces' yield for map
  ilRanking: { il: string; verim: number }[];
}

// ─── Sowing Calendar ──────────────────────────────────────────────────────────

function getSowingCalendar(urun: string): { ekimAy: string; ekimBitis: string; aciklama: string } {
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

function getHarvestCalendar(urun: string): { baslangic: string; bitis: string; aciklama: string } {
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

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (arr.length - 1));
}

function getYearsAll(d: YearData): { year: number; value: number }[] {
  const pairs: { year: number; value: number }[] = [
    { year: 2018, value: d.y2018 }, { year: 2019, value: d.y2019 },
    { year: 2020, value: d.y2020 }, { year: 2021, value: d.y2021 },
    { year: 2022, value: d.y2022 }, { year: 2023, value: d.y2023 },
    { year: 2024, value: d.y2024 },
  ];
  return pairs.filter(p => p.value > 0);
}

function getValues(d: YearData): number[] {
  return getYearsAll(d).map(p => p.value);
}

// Simple linear regression: y = a + b*x
function linearRegression(points: { year: number; value: number }[]): { a: number; b: number; r2: number } {
  const n = points.length;
  if (n < 2) return { a: points[0]?.value ?? 0, b: 0, r2: 0 };
  const sx = points.reduce((s, p) => s + p.year, 0);
  const sy = points.reduce((s, p) => s + p.value, 0);
  const sxx = points.reduce((s, p) => s + p.year * p.year, 0);
  const sxy = points.reduce((s, p) => s + p.year * p.value, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  // R²
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

function riskLabel(cv: number): { label: string; color: string; emoji: string } {
  if (cv < 0.10) return { label: 'Düşük Risk', color: '#22c55e', emoji: '🟢' };
  if (cv < 0.20) return { label: 'Orta Risk',  color: '#f59e0b', emoji: '🟡' };
  return             { label: 'Yüksek Risk', color: '#ef4444', emoji: '🔴' };
}

// ─── Climate Risk Score ───────────────────────────────────────────────────────

interface ClimateRisk {
  skor: number;            // 0-100 (100 = very risky)
  label: string;
  color: string;
  emoji: string;
  faktorler: { ad: string; puan: number; aciklama: string }[];
}

function calcClimateRisk(il: string, urun: string): ClimateRisk | null {
  const bolge = getBolge(il);
  if (!bolge) return null;
  const meta = BOLGE_META[bolge];
  const faktorler: { ad: string; puan: number; aciklama: string }[] = [];

  // 1. Summer heat stress (July ETo)
  const etoJul = getETo(il, 7);
  const heatPuan = etoJul > 7.5 ? 25 : etoJul > 6 ? 15 : etoJul > 4 ? 8 : 3;
  faktorler.push({ ad: 'Sıcaklık Stresi', puan: heatPuan, aciklama: `Temmuz ETo: ${etoJul.toFixed(1)} mm/gün` });

  // 2. Drought risk (summer rainfall sum Jun-Aug)
  const yazYagis = [6, 7, 8].reduce((s, m) => s + getYagis(il, m), 0);
  const droughtPuan = yazYagis < 30 ? 25 : yazYagis < 60 ? 18 : yazYagis < 100 ? 10 : 4;
  faktorler.push({ ad: 'Kuraklık Riski', puan: droughtPuan, aciklama: `Yaz yağışı: ${yazYagis.toFixed(0)} mm` });

  // 3. Spring frost risk (March avg temp proxy — lower ETo = colder)
  const etoMar = getETo(il, 3);
  const frostPuan = etoMar < 1.5 ? 25 : etoMar < 2.5 ? 15 : etoMar < 3.5 ? 8 : 3;
  faktorler.push({ ad: 'Don Riski', puan: frostPuan, aciklama: `Mart ETo: ${etoMar.toFixed(1)} mm/gün` });

  // 4. Annual rainfall sufficiency
  const yillikYagis = Array.from({ length: 12 }, (_, i) => getYagis(il, i + 1)).reduce((a, b) => a + b, 0);
  // Adjust threshold by crop type
  const u = urun.toLocaleLowerCase('tr-TR');
  const isWaterHungry = u.includes('pirinç') || u.includes('mısır') || u.includes('pamuk') || u.includes('şeker');
  const threshold = isWaterHungry ? 700 : 450;
  const rainPuan = yillikYagis < threshold * 0.5 ? 25 : yillikYagis < threshold * 0.75 ? 18 : yillikYagis < threshold ? 10 : 4;
  faktorler.push({ ad: 'Yağış Yeterliliği', puan: rainPuan, aciklama: `Yıllık: ${yillikYagis.toFixed(0)} mm (eşik: ${threshold} mm)` });

  const skor = faktorler.reduce((s, f) => s + f.puan, 0);
  const label = skor >= 60 ? 'Yüksek İklim Riski' : skor >= 35 ? 'Orta İklim Riski' : 'Düşük İklim Riski';
  const color = skor >= 60 ? '#ef4444' : skor >= 35 ? '#f59e0b' : '#22c55e';
  const emoji = skor >= 60 ? '🔴' : skor >= 35 ? '🟡' : '🟢';

  // Add bolge context
  faktorler.push({ ad: 'İklim Bölgesi', puan: 0, aciklama: `${meta.emoji} ${meta.ad}` });

  return { skor, label, color, emoji, faktorler };
}

interface CalcResult {
  avgVerim: number; adjVerim: number;
  projVerim: number;          // linear regression → 2025 projection
  regR2: number;
  tahminiUretim: number; minUretim: number; maxUretim: number;
  trend: number; cv: number;
  risk: { label: string; color: string; emoji: string };
  dataLevel: 'ilce' | 'il' | 'turkiye';
  perfVsIl: number | null;
  perfVsTR: number | null;
  stdDev: number;              // for confidence interval
  // Optional economics
  brutGelir: number | null;        // ₺
  toplamMaliyet: number | null;     // ₺
  netKar: number | null;            // ₺
  karMarji: number | null;          // %
}

function calculate(state: WizardState): CalcResult | null {
  const src = state.ilceData ?? state.ilData ?? state.turkiyeData;
  if (!src) return null;
  const level: 'ilce' | 'il' | 'turkiye' = state.ilceData ? 'ilce' : state.ilData ? 'il' : 'turkiye';
  const pts = getYearsAll(src);
  const vals = pts.map(p => p.value);
  if (!vals.length) return null;
  const avg = mean(vals);
  const sd  = stddev(vals, avg);
  const cv  = avg > 0 ? sd / avg : 0;
  
  // Linear regression for 2025 projection
  const reg = linearRegression(pts);
  const projRaw = Math.max(0, reg.a + reg.b * 2025);
  // If R² < 0.3 or only 2 data points, fall back to average
  const projVerim = (reg.r2 >= 0.3 && pts.length >= 3) ? projRaw : avg;
  
  const sf  = state.sulama ? 1.25 : 1.0;
  const tf  = state.toprakKalite === 'iyi' ? 1.15 : state.toprakKalite === 'zayif' ? 0.85 : 1.0;
  const adjVerim       = projVerim * sf * tf;
  const margin         = sd * sf * tf;
  const tahminiUretim  = (adjVerim * state.alan) / 1000;

  // Performance vs. il & Türkiye
  const ilAvg = state.ilData ? mean(getValues(state.ilData)) : 0;
  const trAvg = state.turkiyeData ? mean(getValues(state.turkiyeData)) : 0;
  const perfVsIl = (ilAvg > 0 && state.ilceData) ? ((avg - ilAvg) / ilAvg) * 100 : null;
  const perfVsTR = (trAvg > 0 && (state.ilceData || state.ilData)) ? ((avg - trAvg) / trAvg) * 100 : null;

  // Economics (optional — only if user entered values)
  const { fiyatTL, maliyetDekar } = state.cost;
  const brutGelir = fiyatTL > 0 ? tahminiUretim * 1000 * fiyatTL : null;   // ton→kg × ₺/kg
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

function loadHistory(): SavedForecast[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToHistory(state: WizardState, calc: CalcResult): void {
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
  } catch { /* quota exceeded — silently fail */ }
}

function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Multi-crop quick compare ─────────────────────────────────────────────────

function calcQuick(data: YearData | null, alan: number, sulama: boolean, toprak: 'iyi' | 'orta' | 'zayif'): { verim: number; uretim: number; trend: number; risk: string } | null {
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

function normalizeTR(value: string): string {
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

function findBestMatch(list: string[], candidate: string): string {
  const c = normalizeTR(candidate);
  const exact = list.find(v => normalizeTR(v) === c);
  if (exact) return exact;
  const prefix = list.find(v => normalizeTR(v).startsWith(c));
  if (prefix) return prefix;
  const contains = list.find(v => normalizeTR(v).includes(c));
  return contains ?? '';
}

// ─── GPS ──────────────────────────────────────────────────────────────────────

// Simple localStorage cache for Nominatim results (avoids repeated API calls)
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
    // Keep max 50 entries
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const sorted = keys.sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0));
      sorted.slice(0, keys.length - 50).forEach(k => delete cache[k]);
    }
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full or unavailable */ }
}

async function reverseGeocode(lat: number, lon: number): Promise<{ il: string; ilce: string } | null> {
  // Round coordinates to ~1km precision for cache key
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = getGeocodeCache()[cacheKey];
  // Cache entries valid for 30 days
  if (cached && (Date.now() - cached.ts) < 30 * 24 * 60 * 60 * 1000) {
    return { il: cached.il, ilce: cached.ilce };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
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
    return null; // Network error / timeout — graceful degradation
  }
}

// ─── Row → YearData ───────────────────────────────────────────────────────────

function toYD(res: { data?: Record<string, string | number>[] }): YearData | null {
  const row = res.data?.[0];
  if (!row) return null;
  const n = (k: string) => Number(row[k] ?? 0);
  return { y2018: n('y2018'), y2019: n('y2019'), y2020: n('y2020'), y2021: n('y2021'), y2022: n('y2022'), y2023: n('y2023'), y2024: n('y2024') };
}

// ─── Chart years ──────────────────────────────────────────────────────────────

const CHART_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
const PROJ_YEARS  = ['2025', '2026'];

const KATEGORILER: Record<string, string[]> = {
  'Tahıllar':           ['buğday', 'arpa', 'mısır', 'çavdar', 'yulaf', 'triticale', 'pirinç'],
  'Baklagiller':        ['nohut', 'mercimek', 'fasulye', 'bakla', 'bezelye'],
  'Endüstri Bitkileri': ['pamuk', 'tütün', 'ayçiçeği', 'kanola', 'şeker pancarı', 'soya'],
  'Sebzeler':           ['domates', 'biber', 'salatalık', 'patlıcan', 'kabak', 'soğan', 'sarımsak', 'havuç', 'patates'],
  'Meyveler':           ['elma', 'armut', 'erik', 'şeftali', 'kiraz', 'vişne', 'kayısı', 'üzüm', 'incir', 'zeytin', 'portakal', 'mandalina', 'limon'],
  'Yem Bitkileri':      ['yonca', 'korunga', 'fiğ', 'sorgum', 'silaj'],
};

const INITIAL: WizardState = {
  step: 1, il: '', ilce: '', locationMethod: 'manual',
  urun: '', alan: 100, sulama: false, toprakKalite: 'orta',
  cost: { fiyatTL: 0, maliyetDekar: 0 },
  compareUrunler: [],
  ilceData: null, ilData: null, turkiyeData: null,
  compareData: [],
  ilVerimler: [], ilRanking: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════════

export function HasatTahminiPage(): React.ReactElement {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);

  const pendingGpsIlceRef = useRef('');

  const [ilList,    setIlList]    = useState<string[]>([]);
  const [ilceList,  setIlceList]  = useState<string[]>([]);
  const [urunList,  setUrunList]  = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [gpsLoad,   setGpsLoad]   = useState(false);
  const [ilceLoad,  setIlceLoad]  = useState(false);
  const [error,     setError]     = useState('');
  const [kategori,  setKategori]  = useState('');
  const [showCost,   setShowCost]   = useState(false);   // collapse toggle for economic inputs
  const [history,     setHistory]    = useState<SavedForecast[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const AREA_PRESETS = [10, 25, 50, 100, 200, 500, 1000, 5000, 10000] as const;
  const AREA_MIN = 1;
  const AREA_MAX = 20000;
  const clampArea = (v: number) => Math.max(AREA_MIN, Math.min(AREA_MAX, Math.round(v)));

  // Load il list on mount
  useEffect(() => {
    fetchProvinces()
      .then(r => {
        if (r.error) setError(r.error);
        if (r.data) setIlList(r.data.map(row => String(row.ili)));
      });
  }, []);

  // Load ilçe list when il changes (no sync setState — reset happens in onChange)
  useEffect(() => {
    if (!state.il) return;
    let stale = false;
    fetchDistricts(state.il)
      .then(r => {
        if (stale) return;
        setIlceLoad(false);
        if (r.error) setError(r.error);
        if (!r.data) return;
        const list = r.data.map(row => String(row.yer));
        setIlceList(list);

        // If GPS set an ilçe name, try to select it as soon as the list arrives.
        if (pendingGpsIlceRef.current) {
          const matchIlce = findBestMatch(list, pendingGpsIlceRef.current);
          pendingGpsIlceRef.current = '';
          if (matchIlce) {
            setState(s => (s.ilce ? s : { ...s, ilce: matchIlce }));
          } else {
            setError('GPS ilçe eşleşmedi. Lütfen ilçeyi listeden seçin.');
          }
        }
      });
    return () => { stale = true; };
  }, [state.il]);

  const loadCrops = useCallback(async (il: string, ilce: string) => {
    setLoading(true);
    const r = await fetchCrops(il, ilce);
    if (r.error) setError(r.error);
    if (r.data) setUrunList(r.data.map(row => String(row.urun)));
    setLoading(false);
  }, []);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setError('Tarayıcınız konum özelliğini desteklemiyor.'); return; }
    setGpsLoad(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsLoad(false);
        if (!result?.il) { setError('Konum çözümlenemedi, lütfen manuel seçin.'); return; }

        const matchIl = findBestMatch(ilList, result.il);
        if (!matchIl) {
          setError(`GPS ile bulunan il (${result.il}) sistemde eşleşmedi. Lütfen manuel seçin.`);
          return;
        }

        pendingGpsIlceRef.current = result.ilce;
        setIlceList([]);
        setIlceLoad(true);
        setState(s => ({ ...s, il: matchIl, ilce: '', locationMethod: 'gps' }));
      },
      () => { setGpsLoad(false); setError('Konum izni reddedildi.'); },
    );
  }, [ilList]);

  const fetchAndGoResults = useCallback(async () => {
    setError('');
    setLoading(true);
    const [ilceRes, ilRes, trRes] = await Promise.all([
      fetchYieldData(state.il, state.ilce, state.urun, 'ilçe'),
      fetchYieldData(state.il, state.ilce, state.urun, 'il'),
      fetchYieldData(state.il, state.ilce, state.urun, 'Turkey'),
    ]);
    if (ilceRes.error || ilRes.error || trRes.error) {
      setError(ilceRes.error ?? ilRes.error ?? trRes.error ?? 'Veri alınamadı');
      setLoading(false);
      return;
    }
    setState(s => ({ ...s, ilceData: toYD(ilceRes), ilData: toYD(ilRes), turkiyeData: toYD(trRes), step: 4 }));
    setLoading(false);

    // Fetch all provinces' yield for the map + ranking (async, non-blocking)
    fetchProvinceRanking(state.urun).then(mapRes => {
      if (mapRes.data) {
        const ranking = mapRes.data.map(r => ({ il: String(r.ili), verim: Number(r.y2024) || 0 }))
          .filter(r => r.verim > 0)
          .sort((a, b) => b.verim - a.verim);
        const regionTotals: RegionTotal[] = ranking.map(r => ({ name: r.il, value: r.verim, unit: 'Kg/da' }));
        setState(s => ({ ...s, ilVerimler: regionTotals, ilRanking: ranking }));
      }
    });

    // Also fetch comparison crops (if any selected)
    if (state.compareUrunler.length > 0) {
      const cmpPromises = state.compareUrunler.map(async (cu) => {
        const [cI, cIl, cTr] = await Promise.all([
          fetchYieldData(state.il, state.ilce, cu, 'ilçe'),
          fetchYieldData(state.il, state.ilce, cu, 'il'),
          fetchYieldData(state.il, state.ilce, cu, 'Turkey'),
        ]);
        return { urun: cu, ilceData: toYD(cI), ilData: toYD(cIl), turkiyeData: toYD(cTr) };
      });
      const cmpResults = await Promise.all(cmpPromises);
      setState(s => ({ ...s, compareData: cmpResults }));
    }
  }, [state.il, state.ilce, state.urun, state.compareUrunler]);

  // Navigation guards
  const goStep2 = () => {
    if (!state.il || !state.ilce) { setError('Lütfen il ve ilçe seçin.'); return; }
    setError(''); setKategori('');
    loadCrops(state.il, state.ilce);
    setState(s => ({ ...s, step: 2 }));
  };
  const goStep3 = () => {
    if (!state.urun) { setError('Lütfen bir ürün seçin.'); return; }
    setError(''); setState(s => ({ ...s, step: 3 }));
  };
  const goResults = () => {
    if (state.alan <= 0) { setError('Lütfen geçerli bir arazi büyüklüğü girin.'); return; }
    setError(''); fetchAndGoResults();
  };
  const reset = () => { setState(INITIAL); setError(''); setKategori(''); pendingGpsIlceRef.current = ''; };

  // Filtered crop list (Turkish-locale lowercase for İ/ı correctness)
  const cropMatchesCategory = useCallback((urun: string, cat: string): boolean => {
    if (!cat) return true;
    const lu = urun.toLocaleLowerCase('tr-TR');
    const keys = KATEGORILER[cat] ?? [];
    return keys.some(k => lu.includes(k));
  }, []);

  const filteredCrops = urunList.filter(u => cropMatchesCategory(u, kategori));

  // Count per category (for badge display)
  const categoryCounts = Object.fromEntries(
    Object.keys(KATEGORILER).map(k => [k, urunList.filter(u => cropMatchesCategory(u, k)).length]),
  );

  // Step-4 values
  const calc    = state.step === 4 ? calculate(state) : null;
  const harvest = state.urun ? getHarvestCalendar(state.urun) : null;
  const sowing  = state.urun ? getSowingCalendar(state.urun) : null;

  // Save to history when results are calculated
  useEffect(() => {
    if (calc && state.step === 4) {
      saveToHistory(state, calc);
      setHistory(loadHistory());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, calc]);

  const ydVal = (yd: YearData | null | undefined, yr: string): number | undefined => {
    if (!yd) return undefined;
    const k = `y${yr}` as keyof YearData;
    return yd[k] || undefined;
  };

  // Build chart data for 7 historical years + 2 projection years (with confidence bands)
  const regIlce = state.ilceData ? linearRegression(getYearsAll(state.ilceData)) : null;
  const regIl   = state.ilData   ? linearRegression(getYearsAll(state.ilData)) : null;
  const regTR   = state.turkiyeData ? linearRegression(getYearsAll(state.turkiyeData)) : null;

  const sdBand = calc?.stdDev ?? 0;
  const sf = state.sulama ? 1.25 : 1.0;
  const tf = state.toprakKalite === 'iyi' ? 1.15 : state.toprakKalite === 'zayif' ? 0.85 : 1.0;
  const combinedFactor = sf * tf;

  const chartData = [
    ...CHART_YEARS.map(yr => ({
      yil: yr,
      ilce:    ydVal(state.ilceData, yr),
      il:      ydVal(state.ilData, yr),
      turkiye: ydVal(state.turkiyeData, yr),
      band: undefined as [number, number] | undefined,
    })),
    ...PROJ_YEARS.map(yr => {
      const projVal = regIlce && regIlce.r2 >= 0.3 ? Math.max(0, regIlce.a + regIlce.b * Number(yr))
        : regIl && regIl.r2 >= 0.3 ? Math.max(0, regIl.a + regIl.b * Number(yr))
        : undefined;
      return {
        yil: `${yr}*`,
        ilce:    regIlce && regIlce.r2 >= 0.3 ? Math.max(0, regIlce.a + regIlce.b * Number(yr)) : undefined,
        il:      regIl   && regIl.r2   >= 0.3 ? Math.max(0, regIl.a   + regIl.b   * Number(yr)) : undefined,
        turkiye: regTR   && regTR.r2   >= 0.3 ? Math.max(0, regTR.a   + regTR.b   * Number(yr)) : undefined,
        band: projVal !== undefined
          ? [Math.max(0, (projVal - sdBand) * combinedFactor), (projVal + sdBand) * combinedFactor] as [number, number]
          : undefined,
      };
    }),
  ];

  // Climate risk
  const climateRisk = state.il ? calcClimateRisk(state.il, state.urun) : null;

  // Province ranking — find user's province rank
  const userIlRank = state.ilRanking.findIndex(r => r.il === state.il) + 1;

  // Multi-crop comparison results
  const compareResults = state.compareData.map(cd => ({
    urun: cd.urun,
    quick: calcQuick(cd.ilceData ?? cd.ilData ?? cd.turkiyeData, state.alan, state.sulama, state.toprakKalite),
  }));

  const STEPS = [
    { n: 1, icon: '📍', label: 'Konum' },
    { n: 2, icon: '🌾', label: 'Ürün' },
    { n: 3, icon: '📐', label: 'Arazi' },
    { n: 4, icon: '📊', label: 'Sonuçlar' },
  ];

  return (
    <div className="hz-wizard">

      {/* Topbar */}
      <div className="hz-topbar">
        <button className="hz-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="hz-topbar__title">
          <span role="img" aria-label="hasat">🌾</span>
          <span>Hasat Tahmincisi</span>
        </div>
        {state.step > 1 && (
          <button className="hz-topbar__reset" onClick={reset}>Yeniden Başla</button>
        )}
      </div>

      <div className="hz-content">

        {/* Step indicator */}
        <div className="hz-steps">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className={`hz-step ${state.step === s.n ? 'hz-step--active' : state.step > s.n ? 'hz-step--done' : ''}`}>
                <div className="hz-step__bubble">{state.step > s.n ? '✓' : s.icon}</div>
                <span className="hz-step__label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`hz-step__line ${state.step > s.n ? 'hz-step__line--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="hz-error" role="alert">{error}</div>}

        {/* ── STEP 1: Konum ─────────────────────────────────────────────── */}
        {state.step === 1 && (
          <div className="hz-card">
            <h2 className="hz-card__title">📍 Konum Seçin</h2>
            <p className="hz-card__desc">Arazi konumunuzu girin veya GPS ile otomatik tespit edin.</p>

            <button className={`hz-gps-btn ${gpsLoad ? 'hz-gps-btn--loading' : ''}`} onClick={handleGPS} disabled={gpsLoad}>
              <span role="img" aria-label="gps">📡</span>
              {gpsLoad ? ' Konum alınıyor…' : ' GPS ile Konumu Tespit Et'}
            </button>

            <div className="hz-divider"><span>veya manuel seçin</span></div>

            <div className="hz-form-row">
              <div className="hz-field">
                <label className="hz-label" htmlFor="il-sel">İl</label>
                <select id="il-sel" className="hz-select" value={state.il}
                  onChange={e => { setIlceList([]); setIlceLoad(true); setState(s => ({ ...s, il: e.target.value, ilce: '', urun: '' })); }}>
                  <option value="">— İl seçin —</option>
                  {ilList.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </div>
              <div className="hz-field">
                <label className="hz-label" htmlFor="ilce-sel">İlçe</label>
                <select id="ilce-sel" className="hz-select" value={state.ilce}
                  disabled={!state.il || ilceLoad}
                  onChange={e => setState(s => ({ ...s, ilce: e.target.value, urun: '' }))}>
                  <option value="">{ilceLoad ? '⏳ Yükleniyor…' : '— İlçe seçin —'}</option>
                  {ilceList.map(ilce => <option key={ilce} value={ilce}>{ilce}</option>)}
                </select>
              </div>
            </div>

            {state.il && (
              <>
                <WeatherWidget il={state.il} />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#718096', textAlign: 'center' }}>
                  Canlı hava verisi referans amaçlıdır; hesaplamalar uzun yıl iklim ortalamalarına dayanır.
                </p>
              </>
            )}

            {state.il && state.ilce && (
              <div className="hz-location-badge">
                <span role="img" aria-label="pin">📍</span>
                <span>{state.ilce}, {state.il}</span>
                {state.locationMethod === 'gps' && <span className="hz-gps-tag">GPS</span>}
              </div>
            )}

            <button className="hz-btn hz-btn--primary hz-btn--full" onClick={goStep2} disabled={!state.il || !state.ilce}>
              Devam Et →
            </button>
          </div>
        )}

        {/* ── STEP 2: Ürün ──────────────────────────────────────────────── */}
        {state.step === 2 && (
          <div className="hz-card hz-card--wide">
            <h2 className="hz-card__title">🌾 Ürün Seçin</h2>
            <p className="hz-card__desc"><strong>{state.ilce}, {state.il}</strong> ilçesinde kayıtlı ürünler</p>

            <div className="hz-cat-row" role="group" aria-label="Ürün Kategorisi">
              <button
                type="button"
                className={`hz-cat-btn ${kategori === '' ? 'hz-cat-btn--active' : ''}`}
                onClick={() => { setKategori(''); setState(s => ({ ...s, urun: '' })); }}
              >
                Tümü
              </button>
              {Object.keys(KATEGORILER).map(k => {
                const cnt = categoryCounts[k] ?? 0;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`hz-cat-btn ${kategori === k ? 'hz-cat-btn--active' : ''} ${cnt === 0 ? 'hz-cat-btn--empty' : ''}`}
                    onClick={() => { setKategori(prev => prev === k ? '' : k); setState(s => ({ ...s, urun: '' })); }}
                  >
                    {k} {cnt > 0 && <span className="hz-cat-badge">{cnt}</span>}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="hz-loading">⏳ Ürün listesi yükleniyor…</div>
            ) : (
              <>
                <p className="hz-count">{filteredCrops.length} ürün</p>
                <div className="hz-crop-grid">
                  {filteredCrops.map(urun => (
                    <button key={urun}
                      className={`hz-crop-btn ${state.urun === urun ? 'hz-crop-btn--selected' : ''}`}
                      onClick={() => setState(s => ({ ...s, urun }))}>
                      {urun}
                    </button>
                  ))}
                  {filteredCrops.length === 0 && <p className="hz-empty">Bu ilçe ve kategoride ürün bulunamadı.</p>}
                </div>
              </>
            )}

            <div className="hz-btn-row">
              <button className="hz-btn hz-btn--secondary" onClick={() => { setKategori(''); setState(s => ({ ...s, step: 1, urun: '' })); }}>← Geri</button>
              <button className="hz-btn hz-btn--primary" onClick={goStep3} disabled={!state.urun}>Devam Et →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Arazi ─────────────────────────────────────────────── */}
        {state.step === 3 && (
          <div className="hz-card">
            <h2 className="hz-card__title">📐 Arazi Bilgileri</h2>
            <p className="hz-card__desc">Seçilen ürün: <strong>{state.urun}</strong></p>

            <div className="hz-field">
              <label className="hz-label" htmlFor="alan-inp">Arazi Büyüklüğü</label>
              <div className="hz-area">
                <div className="hz-area__top">
                  <div className="hz-area__value" aria-live="polite">
                    {state.alan.toLocaleString('tr-TR')} <span>dekar</span>
                  </div>
                  <div className="hz-area__sub">
                    ≈ {(state.alan / 10).toFixed(1)} hektar
                  </div>
                </div>

                <div className="hz-area__stepper" role="group" aria-label="Arazi adım ayarı">
                  <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan - 100) }))}>−100</button>
                  <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan - 10) }))}>−10</button>
                  <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan + 10) }))}>+10</button>
                  <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan + 100) }))}>+100</button>
                </div>

                <input
                  id="alan-inp"
                  className="hz-range"
                  type="range"
                  min={AREA_MIN}
                  max={AREA_MAX}
                  step={10}
                  value={state.alan}
                  onChange={e => setState(s => ({ ...s, alan: clampArea(Number(e.target.value)) }))}
                />

                <div className="hz-area__presets" role="group" aria-label="Hazır arazi değerleri">
                  {AREA_PRESETS.map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`hz-preset-btn ${state.alan === v ? 'hz-preset-btn--active' : ''}`}
                      onClick={() => setState(s => ({ ...s, alan: v }))}
                    >
                      {v >= 1000 ? `${(v / 1000).toLocaleString('tr-TR')}k` : v}
                    </button>
                  ))}
                </div>

                <p className="hz-hint">Yazı yazmadan ayarlayabilirsiniz (slider + hazır değerler).</p>
              </div>
            </div>

            <div className="hz-field">
              <label className="hz-label">Sulama Durumu</label>
              <div className="hz-toggle-row">
                <button className={`hz-toggle-btn ${!state.sulama ? 'hz-toggle-btn--active' : ''}`} onClick={() => setState(s => ({ ...s, sulama: false }))}>
                  💧 Sulamasız (Kuru)
                </button>
                <button className={`hz-toggle-btn ${state.sulama ? 'hz-toggle-btn--active' : ''}`} onClick={() => setState(s => ({ ...s, sulama: true }))}>
                  🚿 Sulamalı (+%25)
                </button>
              </div>
            </div>

            <div className="hz-field">
              <label className="hz-label">Toprak Kalitesi</label>
              <div className="hz-toggle-row">
                {([['iyi', '🟢 İyi (+%15)'], ['orta', '🟡 Orta'], ['zayif', '🔴 Zayıf (-%15)']] as const).map(([val, lbl]) => (
                  <button key={val}
                    className={`hz-toggle-btn ${state.toprakKalite === val ? 'hz-toggle-btn--active' : ''}`}
                    onClick={() => setState(s => ({ ...s, toprakKalite: val }))}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Ekonomik Analiz (Opsiyonel) ── */}
            <div className="hz-econ-section">
              <button
                type="button"
                className={`hz-econ-toggle ${showCost ? 'hz-econ-toggle--open' : ''}`}
                onClick={() => setShowCost(!showCost)}
              >
                <span>💰 Ekonomik Analiz (Opsiyonel)</span>
                <span className="hz-econ-toggle__arrow">{showCost ? '▲' : '▼'}</span>
              </button>
              {showCost && (
                <div className="hz-econ-fields">
                  <p className="hz-hint">Fiyat ve maliyet bilgisi girerseniz, sonuç sayfasında gelir/kâr analizi gösterilir.</p>
                  <div className="hz-form-row">
                    <div className="hz-field">
                      <label className="hz-label" htmlFor="fiyat-inp">Pazar Fiyatı (₺/kg)</label>
                      <input
                        id="fiyat-inp"
                        className="hz-input"
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Örn: 12.5"
                        value={state.cost.fiyatTL || ''}
                        onChange={e => setState(s => ({ ...s, cost: { ...s.cost, fiyatTL: Math.max(0, Number(e.target.value)) } }))}
                      />
                    </div>
                    <div className="hz-field">
                      <label className="hz-label" htmlFor="maliyet-inp">Toplam Maliyet (₺/dekar)</label>
                      <input
                        id="maliyet-inp"
                        className="hz-input"
                        type="number"
                        min={0}
                        step={10}
                        placeholder="Örn: 850"
                        value={state.cost.maliyetDekar || ''}
                        onChange={e => setState(s => ({ ...s, cost: { ...s.cost, maliyetDekar: Math.max(0, Number(e.target.value)) } }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Ürün Karşılaştırma (Opsiyonel) ── */}
            <div className="hz-compare-picker">
              <label className="hz-label">Karşılaştırma Ürünleri (max 5, opsiyonel)</label>
              <p className="hz-hint">Aynı ilçede farklı ürünlerin verimlerini kıyaslayın.</p>
              <div className="hz-compare-chips">
                {state.compareUrunler.map(cu => (
                  <span key={cu} className="hz-chip hz-chip--selected">
                    {cu}
                    <button type="button" className="hz-chip__x"
                      onClick={() => setState(s => ({ ...s, compareUrunler: s.compareUrunler.filter(x => x !== cu) }))}>×</button>
                  </span>
                ))}
              </div>
              {state.compareUrunler.length < 5 && (
                <select
                  className="hz-select hz-select--sm"
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val && !state.compareUrunler.includes(val) && val !== state.urun) {
                      setState(s => ({ ...s, compareUrunler: [...s.compareUrunler, val] }));
                    }
                  }}
                >
                  <option value="">+ Ürün ekle…</option>
                  {urunList.filter(u => u !== state.urun && !state.compareUrunler.includes(u)).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="hz-btn-row">
              <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
              <button className="hz-btn hz-btn--primary" onClick={goResults} disabled={loading || state.alan <= 0}>
                {loading ? '⏳ Hesaplanıyor…' : '📊 Sonuçları Gör →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Sonuçlar ──────────────────────────────────────────── */}
        {state.step === 4 && loading && (
          <div className="hz-loading hz-loading--page">⏳ Veriler yükleniyor…</div>
        )}

        {state.step === 4 && !loading && calc && (
          <div className="hz-results">

            {/* ── Model Şeffaflık Kutusu ────────────────────────────────── */}
            {(() => {
              // Güven skoru hesabı
              const dataYears = state.ilceData
                ? Object.values(state.ilceData).filter(v => v > 0).length
                : state.ilData
                ? Object.values(state.ilData).filter(v => v > 0).length
                : 0;
              let conf = 10;
              if (calc.regR2 >= 0.5) conf += 40;
              else if (calc.regR2 >= 0.3) conf += 20;
              if (calc.dataLevel === 'ilce') conf += 30;
              else if (calc.dataLevel === 'il') conf += 15;
              if (dataYears >= 5) conf += 20;
              else if (dataYears >= 3) conf += 10;
              conf = Math.min(100, conf);

              const levelLabel =
                calc.dataLevel === 'ilce' ? `${state.ilce} ilçesi (ilçe verisi)` :
                calc.dataLevel === 'il'   ? `${state.il} ili ortalaması` :
                                            'Türkiye ulusal ortalaması';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <ConfidenceBadge score={conf} label="Tahmin Güveni" />
                    {calc.dataLevel !== 'ilce' && (
                      <span style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid #f59e0b' }}>
                        ⚠️ İlçe verisi yok — veri kaydırıldı
                      </span>
                    )}
                  </div>
                  <ModelWarningBox
                    modelType={`Lineer Regresyon (trend bazlı) — R² = ${calc.regR2.toFixed(2)}`}
                    dataLevel={levelLabel}
                    message="Bu sonuç tarihsel ilçe/il verilerine dayalı istatistiksel bir tahmindir. Hava koşulları, hastalık ve fiyat dalgalanmalarını yansıtmaz. Kesin üretim kararları için uzman görüşü alınız."
                  />
                </div>
              );
            })()}

            {calc.dataLevel !== 'ilce' && (
              <div className="hz-warning">
                ⚠️ {state.ilce} ilçesi için verim verisi bulunamadı —{' '}
                {calc.dataLevel === 'il' ? `${state.il} ili` : 'Türkiye'} ortalaması kullanıldı.
              </div>
            )}


            {/* KPI cards */}
            <div className="hz-kpi-grid">
              <div className="hz-kpi hz-kpi--main">
                <div className="hz-kpi__label">Tahmini Üretim</div>
                <div className="hz-kpi__value">{calc.tahminiUretim.toFixed(1)}</div>
                <div className="hz-kpi__unit">Ton</div>
                <div className="hz-kpi__range">{calc.minUretim.toFixed(1)} – {calc.maxUretim.toFixed(1)} ton arası</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">Projeksiyon Verim (2025)</div>
                <div className="hz-kpi__value">{calc.projVerim.toFixed(0)}</div>
                <div className="hz-kpi__unit">Kg/da</div>
                <div className="hz-kpi__range">R² = {calc.regR2.toFixed(2)}</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">Düzeltilmiş Verim</div>
                <div className="hz-kpi__value">{calc.adjVerim.toFixed(0)}</div>
                <div className="hz-kpi__unit">Kg/da</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">Ort. Verim (7 yıl)</div>
                <div className="hz-kpi__value">{calc.avgVerim.toFixed(0)}</div>
                <div className="hz-kpi__unit">Kg/da</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">Arazi</div>
                <div className="hz-kpi__value">{state.alan.toLocaleString('tr-TR')}</div>
                <div className="hz-kpi__unit">Dekar</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">7 Yıl Trendi</div>
                <div className={`hz-kpi__value ${calc.trend >= 0 ? 'hz-kpi__value--green' : 'hz-kpi__value--red'}`}>
                  {calc.trend >= 0 ? '+' : ''}{calc.trend.toFixed(1)}%
                </div>
                <div className="hz-kpi__unit">değişim</div>
              </div>
              <div className="hz-kpi">
                <div className="hz-kpi__label">Risk Seviyesi</div>
                <div className="hz-kpi__value" style={{ color: calc.risk.color }}>{calc.risk.emoji}</div>
                <div className="hz-kpi__unit">{calc.risk.label}</div>
                <div className="hz-kpi__range">Değişkenlik: %{(calc.cv * 100).toFixed(1)}</div>
              </div>
            </div>

            {/* ── Ekonomik Analiz (if data entered) ── */}
            {(calc.brutGelir !== null || calc.toplamMaliyet !== null) && (
              <div className="hz-econ-card">
                <h3>💰 Ekonomik Analiz</h3>
                <div className="hz-econ-grid">
                  {calc.brutGelir !== null && (
                    <div className="hz-econ-item">
                      <div className="hz-econ-item__label">Brüt Gelir</div>
                      <div className="hz-econ-item__value hz-econ-item__value--green">₺{calc.brutGelir.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                      <div className="hz-econ-item__sub">{calc.tahminiUretim.toFixed(1)} ton × {state.cost.fiyatTL} ₺/kg</div>
                    </div>
                  )}
                  {calc.toplamMaliyet !== null && (
                    <div className="hz-econ-item">
                      <div className="hz-econ-item__label">Toplam Maliyet</div>
                      <div className="hz-econ-item__value hz-econ-item__value--red">₺{calc.toplamMaliyet.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                      <div className="hz-econ-item__sub">{state.cost.maliyetDekar} ₺/da × {state.alan.toLocaleString('tr-TR')} da</div>
                    </div>
                  )}
                  {calc.netKar !== null && (
                    <div className={`hz-econ-item hz-econ-item--highlight ${calc.netKar >= 0 ? 'hz-econ-item--profit' : 'hz-econ-item--loss'}`}>
                      <div className="hz-econ-item__label">Net {calc.netKar >= 0 ? 'Kâr' : 'Zarar'}</div>
                      <div className="hz-econ-item__value">₺{Math.abs(calc.netKar).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                      {calc.karMarji !== null && (
                        <div className="hz-econ-item__sub">Kâr Marjı: %{calc.karMarji.toFixed(1)}</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="hz-econ-disclaimer">⚠️ Bu analiz girdiğiniz fiyat/maliyet bilgisine dayanır. Gerçek sonuçlar farklılık gösterebilir.</p>
              </div>
            )}

            {/* Performance scores */}
            {(calc.perfVsIl !== null || calc.perfVsTR !== null) && (
              <div className="hz-perf-card">
                <h3>📈 Performans Karşılaştırması</h3>
                <div className="hz-perf-row">
                  {calc.perfVsIl !== null && (
                    <div className={`hz-perf-item ${calc.perfVsIl >= 0 ? 'hz-perf-item--positive' : 'hz-perf-item--negative'}`}>
                      <span className="hz-perf-label">İl Ortalamasına Göre</span>
                      <span className="hz-perf-value">{calc.perfVsIl >= 0 ? '+' : ''}{calc.perfVsIl.toFixed(1)}%</span>
                      <span className="hz-perf-desc">{calc.perfVsIl >= 0 ? '↗ İl ortalamasının üzerinde' : '↘ İl ortalamasının altında'}</span>
                    </div>
                  )}
                  {calc.perfVsTR !== null && (
                    <div className={`hz-perf-item ${calc.perfVsTR >= 0 ? 'hz-perf-item--positive' : 'hz-perf-item--negative'}`}>
                      <span className="hz-perf-label">Türkiye Ortalamasına Göre</span>
                      <span className="hz-perf-value">{calc.perfVsTR >= 0 ? '+' : ''}{calc.perfVsTR.toFixed(1)}%</span>
                      <span className="hz-perf-desc">{calc.perfVsTR >= 0 ? '↗ Ulusal ortalamanın üzerinde' : '↘ Ulusal ortalamanın altında'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Params summary */}
            <div className="hz-params-card">
              <h3>Hesaplama Parametreleri</h3>
              <div className="hz-params">
                <span className="hz-param">📍 {state.ilce}, {state.il}</span>
                <span className="hz-param">🌾 {state.urun}</span>
                <span className="hz-param">📐 {state.alan.toLocaleString('tr-TR')} da</span>
                <span className="hz-param">{state.sulama ? '🚿 Sulamalı (+%25)' : '💧 Sulamasız'}</span>
                <span className="hz-param">🪨 Toprak: {state.toprakKalite === 'iyi' ? 'İyi (+%15)' : state.toprakKalite === 'zayif' ? 'Zayıf (-%15)' : 'Orta'}</span>
                <span className="hz-param">📊 Veri: {calc.dataLevel === 'ilce' ? 'İlçe' : calc.dataLevel === 'il' ? 'İl Ort.' : 'Türkiye Ort.'}</span>
                <span className="hz-param">📈 Model: Linear Regresyon (R² = {calc.regR2.toFixed(2)})</span>
              </div>
            </div>

            {/* Trend chart — 7 yıl + projeksiyon + güven aralığı */}
            <div className="hz-chart-card">
              <h3>Verim Trendi, Projeksiyon ve Güven Aralığı (Kg/da)</h3>
              <p className="hz-chart-note">* 2025-2026 değerleri lineer regresyon projeksiyonudur. Renkli bant ±1σ güven aralığını gösterir.</p>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="yil" />
                  <YAxis tickFormatter={(v: number) => v.toFixed(0)} />
                  <Tooltip formatter={(v: number | number[]) => {
                    if (Array.isArray(v)) return [`${v[0].toFixed(0)} – ${v[1].toFixed(0)} Kg/da`, 'Güven Aralığı'];
                    return [`${v.toFixed(0)} Kg/da`];
                  }} />
                  <Legend />
                  <Area type="monotone" dataKey="band" name="±1σ Güven Aralığı"
                    fill="#f59e0b" fillOpacity={0.15} stroke="none" connectNulls />
                  {state.ilceData && (
                    <Line type="monotone" dataKey="ilce" name={state.ilce}
                      stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  )}
                  {state.ilData && (
                    <Line type="monotone" dataKey="il" name={`${state.il} Ort.`}
                      stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls />
                  )}
                  {state.turkiyeData && (
                    <Line type="monotone" dataKey="turkiye" name="Türkiye Ort."
                      stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison bars */}
            {(state.ilceData || state.ilData) && (() => {
              const rows = [
                { label: state.ilce,              value: state.ilceData?.y2024 ?? 0,    color: '#f59e0b' },
                { label: `${state.il} İl Ort.`,   value: state.ilData?.y2024 ?? 0,      color: '#3b82f6' },
                { label: 'Türkiye Ort.',           value: state.turkiyeData?.y2024 ?? 0, color: '#9ca3af' },
              ].filter(r => r.value > 0);
              const maxV = Math.max(...rows.map(r => r.value));
              return (
                <div className="hz-compare-card">
                  <h3>2024 Yılı Verim Karşılaştırması (Kg/da)</h3>
                  {rows.map(row => (
                    <div key={row.label} className="hz-bar-row">
                      <span className="hz-bar-label">{row.label}</span>
                      <div className="hz-bar-track">
                        <div className="hz-bar-fill" style={{ width: `${maxV ? (row.value / maxV) * 100 : 0}%`, background: row.color }} />
                      </div>
                      <span className="hz-bar-val">{row.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Turkey Yield HeatMap ── */}
            {state.ilVerimler.length > 0 && (
              <div className="hz-map-card">
                <h3>🗺️ Türkiye Verim Haritası — {state.urun} (2024)</h3>
                <p className="hz-chart-note">İller üzerinde gezinerek verim değerini görebilirsiniz. Koyu renk = yüksek verim.</p>
                <TurkeyHeatMap
                  regionTotals={state.ilVerimler}
                  unitLabel="Kg/da"
                  height={420}
                  fillMode="heat"
                />
                {userIlRank > 0 && (
                  <div className="hz-map-rank-badge">
                    📍 <strong>{state.il}</strong> — Türkiye genelinde <strong>{userIlRank}.</strong> sırada
                    ({state.ilRanking.length} il arasında)
                  </div>
                )}
              </div>
            )}

            {/* ── İl Sıralaması Tablosu ── */}
            {state.ilRanking.length > 0 && (
              <div className="hz-ranking-card">
                <h3>🏆 İl Verim Sıralaması — {state.urun} (2024, Kg/da)</h3>
                <div className="hz-ranking-table-wrap">
                  <table className="hz-ranking-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>İl</th>
                        <th>Verim</th>
                        <th>Grafik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const topN = 10;
                        const maxV = state.ilRanking[0]?.verim ?? 1;
                        const userIdx = state.ilRanking.findIndex(r => r.il === state.il);
                        const showRows = state.ilRanking.slice(0, topN);
                        const userOutside = userIdx >= topN;
                        return (
                          <>
                            {showRows.map((r, i) => (
                              <tr key={r.il} className={r.il === state.il ? 'hz-ranking-row--highlight' : ''}>
                                <td className="hz-ranking-rank">
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                </td>
                                <td>{r.il} {r.il === state.il && '📍'}</td>
                                <td className="hz-ranking-verim">{r.verim.toFixed(0)}</td>
                                <td>
                                  <div className="hz-ranking-bar">
                                    <div style={{ width: `${(r.verim / maxV) * 100}%`, background: r.il === state.il ? '#f59e0b' : '#3b82f6' }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {userOutside && (
                              <>
                                <tr className="hz-ranking-row--sep">
                                  <td colSpan={4}>···</td>
                                </tr>
                                <tr className="hz-ranking-row--highlight">
                                  <td className="hz-ranking-rank">{userIdx + 1}</td>
                                  <td>{state.il} 📍</td>
                                  <td className="hz-ranking-verim">{state.ilRanking[userIdx].verim.toFixed(0)}</td>
                                  <td>
                                    <div className="hz-ranking-bar">
                                      <div style={{ width: `${(state.ilRanking[userIdx].verim / maxV) * 100}%`, background: '#f59e0b' }} />
                                    </div>
                                  </td>
                                </tr>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                <p className="hz-chart-note">Toplam {state.ilRanking.length} il arasında {state.urun} verimi karşılaştırması</p>
              </div>
            )}

            {/* ── İklim Risk Skoru ── */}
            {climateRisk && (
              <div className="hz-climate-card">
                <h3>🌡️ İklim Risk Analizi — {state.il}</h3>
                <div className="hz-climate-header">
                  <div className="hz-climate-score" style={{ borderColor: climateRisk.color }}>
                    <span className="hz-climate-score__val">{climateRisk.skor}</span>
                    <span className="hz-climate-score__max">/100</span>
                  </div>
                  <div className="hz-climate-label" style={{ color: climateRisk.color }}>
                    {climateRisk.emoji} {climateRisk.label}
                  </div>
                </div>
                <div className="hz-climate-factors">
                  {climateRisk.faktorler.filter(f => f.puan > 0).map(f => (
                    <div key={f.ad} className="hz-climate-factor">
                      <div className="hz-climate-factor__head">
                        <span className="hz-climate-factor__name">{f.ad}</span>
                        <span className="hz-climate-factor__puan" style={{
                          color: f.puan >= 20 ? '#ef4444' : f.puan >= 12 ? '#f59e0b' : '#22c55e'
                        }}>
                          {f.puan}/25
                        </span>
                      </div>
                      <div className="hz-climate-factor__bar">
                        <div style={{
                          width: `${(f.puan / 25) * 100}%`,
                          background: f.puan >= 20 ? '#ef4444' : f.puan >= 12 ? '#f59e0b' : '#22c55e',
                        }} />
                      </div>
                      <span className="hz-climate-factor__desc">{f.aciklama}</span>
                    </div>
                  ))}
                  {climateRisk.faktorler.filter(f => f.puan === 0).map(f => (
                    <div key={f.ad} className="hz-climate-factor hz-climate-factor--info">
                      <span>{f.aciklama}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Multi-crop Comparison Matrix ── */}
            {compareResults.length > 0 && (
              <div className="hz-multicrop-card">
                <h3>🔄 Ürün Karşılaştırma Matrisi</h3>
                <div className="hz-multicrop-table-wrap">
                  <table className="hz-multicrop-table">
                    <thead>
                      <tr>
                        <th>Ürün</th>
                        <th>Verim (Kg/da)</th>
                        <th>Üretim (Ton)</th>
                        <th>Trend</th>
                        <th>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Current crop first */}
                      <tr className="hz-multicrop-table__current">
                        <td><strong>{state.urun}</strong> ⭐</td>
                        <td>{calc.adjVerim.toFixed(0)}</td>
                        <td>{calc.tahminiUretim.toFixed(1)}</td>
                        <td className={calc.trend >= 0 ? 'hz-trend--up' : 'hz-trend--down'}>
                          {calc.trend >= 0 ? '+' : ''}{calc.trend.toFixed(1)}%
                        </td>
                        <td>{calc.risk.emoji}</td>
                      </tr>
                      {compareResults.map(cr => cr.quick && (
                        <tr key={cr.urun}>
                          <td>{cr.urun}</td>
                          <td>{cr.quick.verim.toFixed(0)}</td>
                          <td>{cr.quick.uretim.toFixed(1)}</td>
                          <td className={cr.quick.trend >= 0 ? 'hz-trend--up' : 'hz-trend--down'}>
                            {cr.quick.trend >= 0 ? '+' : ''}{cr.quick.trend.toFixed(1)}%
                          </td>
                          <td>{cr.quick.risk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Sowing + Harvest Calendar ── */}
            <div className="hz-calendar-card">
              <h3>📅 Tarım Takvimi — {state.urun}</h3>
              <div className="hz-cal-dual">
                {sowing && (
                  <div className="hz-cal-section">
                    <h4>🌱 Ekim Dönemi</h4>
                    <div className="hz-cal-timeline">
                      <div className="hz-cal-item">
                        <span className="hz-cal-label">Başlangıç</span>
                        <span className="hz-cal-value">{sowing.ekimAy}</span>
                      </div>
                      <div className="hz-cal-arrow">→</div>
                      <div className="hz-cal-item">
                        <span className="hz-cal-label">Bitiş</span>
                        <span className="hz-cal-value">{sowing.ekimBitis}</span>
                      </div>
                    </div>
                    <p className="hz-cal-note">🌱 {sowing.aciklama}</p>
                  </div>
                )}
                {harvest && (
                  <div className="hz-cal-section">
                    <h4>🌾 Hasat Dönemi</h4>
                    <div className="hz-cal-timeline">
                      <div className="hz-cal-item">
                        <span className="hz-cal-label">Başlangıç</span>
                        <span className="hz-cal-value">{harvest.baslangic}</span>
                      </div>
                      <div className="hz-cal-arrow">→</div>
                      <div className="hz-cal-item">
                        <span className="hz-cal-label">Bitiş</span>
                        <span className="hz-cal-value">{harvest.bitis}</span>
                      </div>
                    </div>
                    <p className="hz-cal-note">ℹ️ {harvest.aciklama}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Forecast History ── */}
            {history.length > 0 && (
              <div className="hz-history-card">
                <div className="hz-history-header">
                  <h3>📋 Geçmiş Tahminler</h3>
                  <div className="hz-history-actions">
                    <button type="button" className="hz-btn hz-btn--xs hz-btn--ghost"
                      onClick={() => setShowHistory(!showHistory)}>
                      {showHistory ? 'Gizle ▲' : `Göster (${history.length}) ▼`}
                    </button>
                    <button type="button" className="hz-btn hz-btn--xs hz-btn--ghost hz-btn--danger"
                      onClick={() => { clearHistory(); setHistory([]); }}>
                      🗑️ Temizle
                    </button>
                  </div>
                </div>
                {showHistory && (
                  <div className="hz-history-list">
                    {history.slice(0, 10).map(h => (
                      <div key={h.id} className="hz-history-item">
                        <div className="hz-history-item__main">
                          <span className="hz-history-item__urun">{h.urun}</span>
                          <span className="hz-history-item__loc">{h.ilce}, {h.il}</span>
                        </div>
                        <div className="hz-history-item__stats">
                          <span>{h.tahminiUretim.toFixed(1)} ton</span>
                          <span>{h.projVerim.toFixed(0)} Kg/da</span>
                          <span>{h.alan} da</span>
                        </div>
                        <div className="hz-history-item__date">
                          {new Date(h.ts).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Model Disclaimer ──────────────────────────────────────── */}
            <div className="hz-card" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '2px solid #f59e0b' }}>
              <h3 style={{ color: '#92400e', margin: '0 0 8px 0', fontSize: '1rem' }}>⚠️ Tahmin Uyarısı</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li>Bu sonuçlar <strong>istatistiksel bir tahmin modeline</strong> dayanmaktadır ve kesin verim garantisi değildir.</li>
                <li>Model, TÜİK il bazlı yıllık üretim istatistiklerinden lineer regresyon ile hesaplanmıştır.</li>
                <li>İklim düzeltmeleri il bazlı uzun yıl ortalamaları kullanılmıştır; canlı hava verileri yalnızca bilgi amaçlıdır.</li>
                <li>Gerçek verim; hava koşulları, hastalık, sulama, gübreleme, tohum kalitesi gibi faktörlere bağlıdır.</li>
                <li>Profesyonel tarımsal danışmanlık yerine geçmez — karar vermeden önce uzman görüşü alınız.</li>
              </ul>
            </div>

            <div className="hz-btn-row hz-btn-row--center">
              <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 3 }))}>
                ← Arazi Bilgileri
              </button>
              <button className="hz-btn hz-btn--secondary" onClick={() => window.print()}>
                🖨️ Yazdır
              </button>
              <button className="hz-btn hz-btn--primary" onClick={reset}>🔄 Yeni Tahmin</button>
            </div>
          </div>
        )}

        {state.step === 4 && !loading && !calc && (
          <div className="hz-card">
            <p className="hz-empty">Seçilen ürün için verim verisi bulunamadı. Farklı bir ürün deneyin.</p>
            <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Ürün Seçimine Dön</button>
          </div>
        )}

      </div>
    </div>
  );
}
