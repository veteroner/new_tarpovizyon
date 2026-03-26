import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ILLER, getBolge, BOLGE_META, getETo, getYagis, calcEffectiveRainfall,
  calcEToByMetod, ETO_METOD_LISTESI, donRiskiVar,
  type EToMetodId, type IklimBolge,
} from '../utils/climate-data';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ModelWarningBox } from '../components/ModelWarningBox';
import WeatherWidget from '../components/WeatherWidget';
import { fetchForecast, fetchWeather, isWeatherConfigured, type ForecastSummary, type WeatherData } from '../services/weather';
import './SulamaPlanPage.css';

// ═══════════════════════════════════════════════════════════════════════════════
//  Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

type IklimSenaryosuKey = 'normal' | 'kurak' | 'yagisli';

interface CropWaterData {
  urun: string;
  katsayi: number;        // Kc - crop coefficient (0.4 - 1.2)
  donem: string[];        // Gelişme dönemleri
  donemKc: number[];      // Dönemlere göre Kc değerleri
  kritikDonem: string;    // En kritik sulama dönemi
  sulamaSikligi: number;  // Ortalama gün
  sezonAylari: number[];  // Sulama sezonu ayları (1-12)
  aciklama: string;
}

interface MonthlyBalance {
  ay: string;
  ayNo: number;
  eto: number;
  etc: number;
  yagis: number;
  efektifYagis: number;
  netSulama: number;
  brutSulama: number;
}

interface SoilData {
  tip: string;
  su_tutma: number;       // mm/m derinlik
  sizma: number;          // 1-10 arası (1=çok hızlı, 10=çok yavaş)
  verimlilik: number;     // 1-10 arası
}

interface IrrigationSystem {
  tip: string;
  verimlilik: number;     // % (damla: 90-95, yağmurlama: 75-85, salma: 50-70)
  maliyet_kurulum: number; // ₺/dekar
  maliyet_isletme: number; // ₺/dekar/sezon
  emoji: string;
}

interface WizardState {
  step: 1 | 2 | 3 | 4;
  il: string;
  ilce: string;
  urun: string;
  alan: number;              // dekar
  toprakTipi: 'kumlu' | 'tınlı' | 'killi' | 'organik';
  sulamaSistemi: 'damla' | 'yagmurlama' | 'salma' | 'yok';
  mevcutSistem: boolean;     // Kurulu sistem var mı?
  gelismeDonemi: number;     // 0-3 arası indeks
  elektrikBirimFiyat: number; // ₺/m³ (varsayılan 0.15)

  // ── Gelişmiş ayarlar (10 madde) ─────────────────────────────────────────
  etoYontemi: EToMetodId;
  iklimSenaryosu: IklimSenaryosuKey;
  kcModeli: 'tek' | 'cift';
  /** 0-100. 100: tam sulama, 0: sulamasız / defisit sulama */
  sulamaKarsilamaPct: number;
  /** m */
  kokDerinligiM: number;
  /** Toprak katman tablosunu göster */
  katmanAnalizi: boolean;
  /** Günlük plan + (kural tabanlı) akıllı öneri */
  akilliPlan: boolean;
  /** Fertigasyon planı */
  fertigasyon: boolean;
  fertN_kgDa: number;
  fertP2O5_kgDa: number;
  fertK2O_kgDa: number;
  fertBolum: number;
}

interface CalcResult {
  gunlukSu: number;          // mm/gün
  haftalikSu: number;        // m³/hafta (tüm arazi)
  sezonlukSu: number;        // m³/sezon
  sulamaSayisi: number;      // Sezon boyunca kaç kez
  sulamaMiktar: number;      // Her sulamada m³
  elektrikMaliyet: number;   // ₺/sezon (pompa)
  sistemMaliyet: number;     // ₺/sezon kurulum+işletme
  toplamMaliyet: number;     // ₺/sezon
  suTasarrufu: number;       // Mevcut vs optimal fark (%)
  verimArtisi: number;       // Optimal sulama ile tahmini % artış
  aylikDenge: MonthlyBalance[];   // Monthly water balance for chart
  sulamaYok: boolean;        // "Sulama Yok" seçildi mi?
  waterDeficit: number;      // mm/sezon — sulama olmadan su açığı

  // ── Gelişmiş çıktılar ───────────────────────────────────────────────────
  etoYontemiLabel: string;
  iklimSenaryosuLabel: string;
  kcModeliLabel: string;
  /** 0-100 */
  verimKaybiPct: number;
  /** 0-1 */
  sezonStresOrani: number;
  /** Günlük plan (14 gün) */
  gunlukPlan: Array<{
    date: string;
    label: string;
    eto: number;
    etc: number;
    yagisTahmin: number;
    sulamaNet: number;
    sulamaBrut: number;
    toprakAcigi: number;
    not?: string;
    fertN_kgDa?: number;
    fertP2O5_kgDa?: number;
    fertK2O_kgDa?: number;
  }>;
  /** İlk önerilen sulama */
  ilkSulama?: { date: string; netMm: number; brutMm: number; reason: string };
  /** Tahmini PAR (mol/m²/gün) — canlı hava varsa */
  parMol?: number;
  /** Toprak katman profili */
  toprakKatmanlari?: Array<{ katman: string; derinlikCm: number; suTutmaMm: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Data
// ═══════════════════════════════════════════════════════════════════════════════

const CROP_WATER_DB: Record<string, CropWaterData> = {
  'Buğday': { urun: 'Buğday', katsayi: 1.05, donem: ['Çıkış', 'Kardeşlenme', 'Sapa Kalkma', 'Başaklanma', 'Olgunlaşma'], donemKc: [0.4, 0.75, 1.15, 1.10, 0.4], kritikDonem: 'Başaklanma', sulamaSikligi: 12, sezonAylari: [3, 4, 5, 6], aciklama: 'Sapa kalkma ve başaklanma kritik' },
  'Arpa': { urun: 'Arpa', katsayi: 1.0, donem: ['Çıkış', 'Kardeşlenme', 'Sapa Kalkma', 'Başaklanma', 'Olgunlaşma'], donemKc: [0.35, 0.70, 1.10, 1.05, 0.35], kritikDonem: 'Başaklanma', sulamaSikligi: 14, sezonAylari: [3, 4, 5], aciklama: 'Buğdaydan az su ister' },
  'Mısır': { urun: 'Mısır', katsayi: 1.20, donem: ['Çıkış', 'Gelişme', 'Tepe atma', 'Koçan dolum', 'Olgunlaşma'], donemKc: [0.40, 0.80, 1.15, 1.20, 0.60], kritikDonem: 'Koçan dolum', sulamaSikligi: 7, sezonAylari: [5, 6, 7, 8, 9], aciklama: 'Çok su seven, tepe atma kritik' },
  'Domates': { urun: 'Domates', katsayi: 1.15, donem: ['Fide', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.45, 0.75, 1.15, 1.10, 0.80], kritikDonem: 'Meyve tutum', sulamaSikligi: 5, sezonAylari: [4, 5, 6, 7, 8, 9], aciklama: 'Düzenli sulama gerekli, çatlama riski' },
  'Biber': { urun: 'Biber', katsayi: 1.05, donem: ['Fide', 'Çiçeklenme', 'Meyve tutum', 'Büyüme', 'Hasat'], donemKc: [0.40, 0.70, 1.05, 1.00, 0.85], kritikDonem: 'Çiçeklenme', sulamaSikligi: 6, sezonAylari: [4, 5, 6, 7, 8, 9], aciklama: 'Kök çürüklüğüne hassas, aşırı sulama zararlı' },
  'Patates': { urun: 'Patates', katsayi: 1.15, donem: ['Çıkış', 'Gelişme', 'Yumru tutum', 'Yumru büyüme', 'Olgunlaşma'], donemKc: [0.50, 0.80, 1.15, 1.10, 0.75], kritikDonem: 'Yumru büyüme', sulamaSikligi: 6, sezonAylari: [4, 5, 6, 7], aciklama: 'Yumru döneminde bol su' },
  'Soğan': { urun: 'Soğan', katsayi: 1.05, donem: ['Çıkış', 'Gelişme', 'Baş oluşum', 'Büyüme', 'Olgunlaşma'], donemKc: [0.50, 0.75, 1.05, 1.00, 0.75], kritikDonem: 'Baş oluşum', sulamaSikligi: 8, sezonAylari: [3, 4, 5, 6], aciklama: 'Olgunlaşma öncesi sulamayı kes' },
  'Pamuk': { urun: 'Pamuk', katsayi: 1.15, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Koza oluşum', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.15, 1.10, 0.70], kritikDonem: 'Çiçeklenme', sulamaSikligi: 10, sezonAylari: [5, 6, 7, 8, 9], aciklama: 'Çiçeklenmede su stresi zararlı' },
  'Ayçiçeği': { urun: 'Ayçiçeği', katsayi: 1.10, donem: ['Çıkış', 'Gelişme', 'Tabla oluşum', 'Çiçeklenme', 'Olgunlaşma'], donemKc: [0.35, 0.75, 1.10, 1.05, 0.35], kritikDonem: 'Tabla oluşum', sulamaSikligi: 12, sezonAylari: [5, 6, 7, 8], aciklama: 'Derin köklü, kurağa dayanıklı' },
  'Şeker Pancarı': { urun: 'Şeker Pancarı', katsayi: 1.20, donem: ['Çıkış', 'Yaprak gelişim', 'Kök gelişim', 'Kök büyüme', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.05, 1.20, 0.90], kritikDonem: 'Kök büyüme', sulamaSikligi: 10, sezonAylari: [4, 5, 6, 7, 8, 9], aciklama: 'Uzun sezon, düzenli su' },
  'Salatalık': { urun: 'Salatalık', katsayi: 1.00, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve', 'Hasat'], donemKc: [0.50, 0.70, 1.00, 0.90, 0.75], kritikDonem: 'Çiçeklenme', sulamaSikligi: 3, sezonAylari: [5, 6, 7, 8], aciklama: 'Sık sulama, küçük dozlar' },
  'Kavun': { urun: 'Kavun', katsayi: 1.05, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve büyüme', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.05, 0.85, 0.65], kritikDonem: 'Çiçeklenme', sulamaSikligi: 7, sezonAylari: [5, 6, 7, 8], aciklama: 'Olgunlaşmada suyu azalt, şeker artar' },
  'Karpuz': { urun: 'Karpuz', katsayi: 1.00, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve büyüme', 'Olgunlaşma'], donemKc: [0.40, 0.70, 1.00, 0.80, 0.65], kritikDonem: 'Meyve büyüme', sulamaSikligi: 7, sezonAylari: [5, 6, 7, 8], aciklama: 'Hasat öncesi suyu kes' },
  'Üzüm (Sofralık)': { urun: 'Üzüm (Sofralık)', katsayi: 0.85, donem: ['Tomurcuk', 'Çiçeklenme', 'Tane tutum', 'Olgunlaşma', 'Hasat'], donemKc: [0.30, 0.70, 0.85, 0.70, 0.45], kritikDonem: 'Tane tutum', sulamaSikligi: 14, sezonAylari: [4, 5, 6, 7, 8, 9], aciklama: 'Az su ister, kuraklığa dayanıklı' },
  'Elma': { urun: 'Elma', katsayi: 0.95, donem: ['Tomurcuk', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.45, 0.60, 0.95, 0.95, 0.75], kritikDonem: 'Meyve büyüme', sulamaSikligi: 10, sezonAylari: [4, 5, 6, 7, 8, 9], aciklama: 'Düzenli ama az sulama' },
  'Zeytin': { urun: 'Zeytin', katsayi: 0.65, donem: ['Tomurcuk', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.50, 0.65, 0.65, 0.60, 0.50], kritikDonem: 'Çiçeklenme', sulamaSikligi: 21, sezonAylari: [5, 6, 7, 8, 9, 10], aciklama: 'Kuraklığa en dayanıklı meyve' },
};

const SOIL_TYPES: Record<string, SoilData> = {
  kumlu:    { tip: 'Kumlu',    su_tutma: 70,  sizma: 8, verimlilik: 4 },
  tınlı:    { tip: 'Tınlı',    su_tutma: 150, sizma: 5, verimlilik: 8 },
  killi:    { tip: 'Killi',    su_tutma: 200, sizma: 2, verimlilik: 7 },
  organik:  { tip: 'Organik',  su_tutma: 180, sizma: 6, verimlilik: 9 },
};

const IRRIGATION_SYSTEMS: Record<string, IrrigationSystem> = {
  damla:       { tip: 'Damla Sulama',       verimlilik: 92, maliyet_kurulum: 1800, maliyet_isletme: 200, emoji: '💧' },
  yagmurlama:  { tip: 'Yağmurlama',         verimlilik: 80, maliyet_kurulum: 1200, maliyet_isletme: 180, emoji: '🌧️' },
  salma:       { tip: 'Salma/Karık Sulama', verimlilik: 60, maliyet_kurulum: 300,  maliyet_isletme: 80,  emoji: '🌊' },
  yok:         { tip: 'Sulama Yok',         verimlilik: 0,  maliyet_kurulum: 0,    maliyet_isletme: 0,   emoji: '🚫' },
};

const STEPS = [
  { n: 1, icon: '📍', label: 'Konum & İklim' },
  { n: 2, icon: '🌾', label: 'Ürün' },
  { n: 3, icon: '💧', label: 'Sistem & Arazi' },
  { n: 4, icon: '📊', label: 'Sonuçlar' },
] as const;

const INITIAL: WizardState = {
  step: 1,
  il: '',
  ilce: '',
  urun: '',
  alan: 100,
  toprakTipi: 'tınlı',
  sulamaSistemi: 'damla',
  mevcutSistem: false,
  gelismeDonemi: 2,
  elektrikBirimFiyat: 0.15,

  etoYontemi: 'tablo',
  iklimSenaryosu: 'normal',
  kcModeli: 'tek',
  sulamaKarsilamaPct: 100,
  kokDerinligiM: 0.6,
  katmanAnalizi: false,
  akilliPlan: true,
  fertigasyon: false,
  fertN_kgDa: 0,
  fertP2O5_kgDa: 0,
  fertK2O_kgDa: 0,
  fertBolum: 6,
};

// ETO metodları artık ETO_METOD_LISTESI'nden (climate-data.ts) geliyor — gerçek formüller!
// Sahte çarpan tablosu kaldırıldı.

const IKLIM_SENARYOLARI: Record<IklimSenaryosuKey, { label: string; etoCarpan: number; yagisCarpan: number }> = {
  normal:  { label: 'Normal (uzun yıl)', etoCarpan: 1.00, yagisCarpan: 1.00 },
  kurak:   { label: 'Kurak yıl',        etoCarpan: 1.15, yagisCarpan: 0.80 },
  yagisli: { label: 'Yağışlı yıl',      etoCarpan: 0.90, yagisCarpan: 1.20 },
};

const WET_FRACTION_BY_SYSTEM: Record<WizardState['sulamaSistemi'], number> = {
  damla: 0.30,
  yagmurlama: 0.85,
  salma: 0.70,
  yok: 0,
};

// Basit PAR (Photosynthetically Active Radiation) yaklaşımı: açık gökyüzü PAR (mol/m²/gün)
// ay bazlı kaba referans; bulutluluk ile ölçeklenir.
const PAR_CLEAR_SKY_BY_MONTH: number[] = [
  18, 24, 32, 38, 44, 48, 50, 46, 38, 28, 20, 16,
];

function clamp(min: number, v: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Ky faktörleri (yaklaşık) — ürün ve dönem hassasiyetlerini göstermek için.
// Not: Bunlar resmi değerler değildir; uygulama içi karar desteği amacıyla kullanılır.
const KY_DB: Record<string, number[]> = {
  'Buğday': [0.4, 0.7, 1.05, 1.05, 0.45],
  'Arpa': [0.35, 0.6, 0.95, 0.95, 0.4],
  'Mısır': [0.4, 0.7, 1.1, 1.25, 0.6],
  'Domates': [0.5, 0.8, 1.1, 1.1, 0.7],
  'Biber': [0.45, 0.9, 1.05, 1.0, 0.8],
  'Patates': [0.5, 0.8, 1.05, 1.15, 0.75],
  'Soğan': [0.5, 0.75, 1.0, 1.05, 0.8],
  'Pamuk': [0.45, 0.8, 1.15, 1.1, 0.7],
  'Ayçiçeği': [0.35, 0.7, 1.0, 1.05, 0.4],
  'Şeker Pancarı': [0.45, 0.7, 0.95, 1.1, 0.9],
  'Salatalık': [0.55, 0.85, 1.05, 1.0, 0.75],
  'Kavun': [0.45, 0.75, 1.0, 0.85, 0.65],
  'Karpuz': [0.4, 0.7, 0.95, 0.8, 0.65],
  'Üzüm (Sofralık)': [0.3, 0.6, 0.85, 0.7, 0.45],
  'Elma': [0.45, 0.6, 0.95, 0.95, 0.75],
  'Zeytin': [0.5, 0.65, 0.65, 0.6, 0.5],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Calculation Engine — Monthly Water Balance
// ═══════════════════════════════════════════════════════════════════════════════

const AYLAR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

function calculate(
  state: WizardState,
  forecast: ForecastSummary | null,
  weather: WeatherData | null,
): CalcResult | null {
  const cropData = CROP_WATER_DB[state.urun];
  if (!cropData || !state.il) return null;

  const system = IRRIGATION_SYSTEMS[state.sulamaSistemi];
  const sulamaYok = state.sulamaSistemi === 'yok';
  const effi = sulamaYok ? 1.0 : (system.verimlilik / 100 || 0.5);
  const soil = SOIL_TYPES[state.toprakTipi];

  const etoMetodInfo = ETO_METOD_LISTESI.find(m => m.id === state.etoYontemi) ?? ETO_METOD_LISTESI[0];
  const senaryoMeta = IKLIM_SENARYOLARI[state.iklimSenaryosu];
  const kcModeliLabel = state.kcModeli === 'cift' ? 'Çift Kc (Kcb+Ke, yaklaşık)' : 'Tek Kc';
  const bolge = getBolge(state.il);

  const coverage = sulamaYok ? 0 : clamp(0, state.sulamaKarsilamaPct, 100) / 100;
  const wetFrac = WET_FRACTION_BY_SYSTEM[state.sulamaSistemi];

  const nStages = cropData.donemKc.length;
  const nMonths = cropData.sezonAylari.length;

  const daysInMonthArr = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let totalDemand = 0;
  let totalDeficit = 0;
  let weightedYieldLoss = 0;

  const aylikDenge: MonthlyBalance[] = cropData.sezonAylari.map((ayNo, idx) => {
    const stageIdx = Math.min(nStages - 1, Math.floor((idx / nMonths) * nStages));
    const kcBase = cropData.donemKc[stageIdx];

    // ── Gerçek ETo hesabı — seçilen metoda göre ─────────────────────────
    const etoBaseDaily = calcEToByMetod(state.etoYontemi, state.il, bolge, ayNo);
    const etoDaily = etoBaseDaily * senaryoMeta.etoCarpan;
    const yagisMonthly = getYagis(state.il, ayNo) * senaryoMeta.yagisCarpan;
    const efektifYagis = calcEffectiveRainfall(yagisMonthly);
    const daysInMonth = daysInMonthArr[ayNo - 1];

    let kcEff = kcBase;
    if (state.kcModeli === 'cift') {
      const kcb = kcBase * 0.9;
      const keBase = kcBase * 0.1;
      const keRainBoost = efektifYagis > 15 ? 0.04 : 0;
      const ke = clamp(0, (keBase + keRainBoost) * (0.6 + 0.4 * wetFrac), 0.25);
      kcEff = clamp(0.1, kcb + ke, 1.25);
    }

    const etoMonthly = etoDaily * daysInMonth;
    const etcMonthly = etoMonthly * kcEff;

    const soilFactor = soil.su_tutma < 100 ? 1.10 : soil.su_tutma > 170 ? 0.90 : 1.0;
    const demand = etcMonthly * soilFactor;
    const netRequired = Math.max(0, demand - efektifYagis);
    const netApplied = sulamaYok ? 0 : netRequired * coverage;
    const brutApplied = sulamaYok ? netRequired : (netApplied / effi);

    const supply = efektifYagis + netApplied;
    const deficit = Math.max(0, demand - supply);

    // Ky bazlı verim kaybı (ağırlıklı)
    const kyArr = KY_DB[state.urun] ?? new Array(nStages).fill(1.0);
    const ky = kyArr[Math.min(kyArr.length - 1, stageIdx)] ?? 1.0;
    const stress = demand > 0 ? deficit / demand : 0;

    totalDemand += demand;
    totalDeficit += deficit;
    weightedYieldLoss += ky * stress * demand;

    return {
      ay: AYLAR[ayNo - 1],
      ayNo,
      eto: round1(etoMonthly),
      etc: round1(etcMonthly),
      yagis: round1(yagisMonthly),
      efektifYagis: round1(efektifYagis),
      netSulama: round1(sulamaYok ? netRequired : netApplied),
      brutSulama: round1(brutApplied),
    };
  });

  const sezonGun = cropData.sezonAylari.reduce((sum, ayNo) => sum + daysInMonthArr[ayNo - 1], 0);
  const totalBrutMmForTotals = sulamaYok ? 0 : aylikDenge.reduce((s, m) => s + m.brutSulama, 0);
  const sezonlukM3 = totalBrutMmForTotals * state.alan;

  const avgDailyMm = sezonGun > 0 ? totalBrutMmForTotals / sezonGun : 0;
  const haftalikSu = avgDailyMm * 7 * state.alan;
  const sulamaSayisi = sulamaYok ? 0 : Math.max(1, Math.ceil(sezonGun / cropData.sulamaSikligi));
  const sulamaMiktar = sulamaYok ? 0 : (sezonlukM3 / sulamaSayisi);

  const pompaMaliyet = sulamaYok ? 0 : sezonlukM3 * state.elektrikBirimFiyat;
  const sistemKurulum = sulamaYok ? 0 : (state.mevcutSistem ? 0 : system.maliyet_kurulum * state.alan);
  const sistemIsletme = sulamaYok ? 0 : (system.maliyet_isletme * state.alan);
  const toplamMaliyet = sulamaYok ? 0 : (pompaMaliyet + sistemIsletme + (sistemKurulum / 5));

  const optimalSystem = IRRIGATION_SYSTEMS['damla'];
  const suTasarrufu = sulamaYok ? 100 : ((optimalSystem.verimlilik - system.verimlilik) / optimalSystem.verimlilik) * 100;

  const cropVerimEtkisi: Record<string, number> = {
    'Buğday': 20, 'Arpa': 15, 'Mısır': 35, 'Domates': 40, 'Biber': 35,
    'Patates': 30, 'Soğan': 25, 'Pamuk': 30, 'Ayçiçeği': 20,
    'Şeker Pancarı': 25, 'Salatalık': 45, 'Kavun': 35, 'Karpuz': 30,
    'Üzüm (Sofralık)': 20, 'Elma': 25, 'Zeytin': 15,
  };
  const baseVerimArtisi = cropVerimEtkisi[state.urun] ?? 25;
  const verimArtisi = sulamaYok ? baseVerimArtisi : clamp(0, baseVerimArtisi * coverage, 80);

  const sezonStresOrani = totalDemand > 0 ? clamp(0, totalDeficit / totalDemand, 1) : 0;
  const verimKaybiPct = totalDemand > 0 ? clamp(0, (weightedYieldLoss / totalDemand) * 100, 100) : 0;

  // Toprak katmanları (yaklaşık)
  let toprakKatmanlari: Array<{ katman: string; derinlikCm: number; suTutmaMm: number }> | undefined;
  if (state.katmanAnalizi) {
    const rd = clamp(0.2, state.kokDerinligiM, 2.0);
    const top = Math.min(0.2, rd);
    const mid = Math.min(0.2, Math.max(0, rd - top));
    const bot = Math.max(0, rd - top - mid);
    const layers: Array<{ name: string; depth: number }> = [];
    if (top > 0) layers.push({ name: '0-20 cm', depth: top });
    if (mid > 0) layers.push({ name: '20-40 cm', depth: mid });
    if (bot > 0) layers.push({ name: `40-${Math.round((top + mid + bot) * 100)} cm`, depth: bot });
    toprakKatmanlari = layers.map(l => ({
      katman: l.name,
      derinlikCm: Math.round(l.depth * 100),
      suTutmaMm: Math.round(soil.su_tutma * l.depth),
    }));
  }

  // PAR tahmini (bugün) — canlı hava verisi varsa
  let parMol: number | undefined;
  if (weather) {
    const month = new Date().getMonth();
    const clear = PAR_CLEAR_SKY_BY_MONTH[month] ?? 30;
    const cloud = clamp(0, weather.clouds ?? 50, 100);
    parMol = round1(clear * (1 - cloud / 100));
  }

  // ── Günlük plan (14 gün) ───────────────────────────────────────────────
  const forecastMap = new Map<string, number>();
  if (forecast?.daily) {
    for (const d of forecast.daily) {
      forecastMap.set(d.date, d.rainMm);
    }
  }

  const today = new Date();
  const monthNo = today.getMonth() + 1;

  // Günlük ETo/ETc için seçilen dönem Kc kullanılır
  const stageKcBase = cropData.donemKc[state.gelismeDonemi] ?? cropData.katsayi;
  let stageKcEff = stageKcBase;
  if (state.kcModeli === 'cift') {
    const kcb = stageKcBase * 0.9;
    const ke = clamp(0, (stageKcBase * 0.1) * (0.6 + 0.4 * wetFrac), 0.25);
    stageKcEff = clamp(0.1, kcb + ke, 1.25);
  }

  const etoDailyEff = calcEToByMetod(state.etoYontemi, state.il, bolge, monthNo) * senaryoMeta.etoCarpan;
  const soilFactorDaily = soil.su_tutma < 100 ? 1.10 : soil.su_tutma > 170 ? 0.90 : 1.0;
  const etcDailyEff = etoDailyEff * stageKcEff * soilFactorDaily;

  const rootDepthM = clamp(0.2, state.kokDerinligiM, 2.0);
  const taw = soil.su_tutma * rootDepthM; // mm
  const p = clamp(0.30, 0.55 - 0.12 * (stageKcEff - 0.8), 0.65);
  const raw = taw * p;

  const fertSplits = Math.max(1, Math.round(state.fertBolum || 1));
  const fertDoseN = state.fertigasyon ? (state.fertN_kgDa / fertSplits) : 0;
  const fertDoseP = state.fertigasyon ? (state.fertP2O5_kgDa / fertSplits) : 0;
  const fertDoseK = state.fertigasyon ? (state.fertK2O_kgDa / fertSplits) : 0;
  let fertEventIdx = 0;

  let depletion = 0; // mm
  const gunlukPlan: CalcResult['gunlukPlan'] = [];
  let ilkSulama: CalcResult['ilkSulama'] | undefined;

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: '2-digit' });

    const rainFc = forecastMap.get(dateKey) ?? 0;
    const rainEff = rainFc * 0.8; // günlük efektif yağış için kaba yaklaşım

    depletion = Math.max(0, depletion + etcDailyEff - rainEff);

    let sulamaNet = 0;
    let not: string | undefined;

    if (!sulamaYok) {
      if (state.akilliPlan) {
        // yağış çok yüksekse sulamayı bir gün ertele
        const tomorrow = new Date(d);
        tomorrow.setDate(d.getDate() + 1);
        const tKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        const rainTomorrow = (forecastMap.get(tKey) ?? 0);

        if (depletion >= raw) {
          if (rainTomorrow >= 5) {
            not = '🌧️ Yarın yağış bekleniyor, ertelenebilir';
          } else {
            sulamaNet = depletion * coverage;
            depletion = Math.max(0, depletion - sulamaNet);
            not = '💧 Toprak açığı (RAW) aşıldı';
          }
        }
      } else {
        // Sabit aralıklı sulama (ürün tabanlı)
        const interval = Math.max(1, Math.round(cropData.sulamaSikligi));
        if (i % interval === 0 && i !== 0) {
          sulamaNet = etcDailyEff * interval * coverage;
          depletion = Math.max(0, depletion - sulamaNet);
          not = `⏱️ ${interval} gün aralık`; 
        }
      }
    }

    const sulamaBrut = sulamaYok ? 0 : (sulamaNet / effi);

    let fertN: number | undefined;
    let fertP: number | undefined;
    let fertK: number | undefined;
    if (!sulamaYok && state.fertigasyon && sulamaNet > 0 && fertEventIdx < fertSplits) {
      fertN = round1(fertDoseN);
      fertP = round1(fertDoseP);
      fertK = round1(fertDoseK);
      fertEventIdx += 1;
    }

    if (!ilkSulama && sulamaNet > 0) {
      ilkSulama = {
        date: dateKey,
        netMm: round1(sulamaNet),
        brutMm: round1(sulamaBrut),
        reason: not || 'Plan',
      };
    }

    gunlukPlan.push({
      date: dateKey,
      label,
      eto: round1(etoDailyEff),
      etc: round1(etcDailyEff),
      yagisTahmin: round1(rainFc),
      sulamaNet: round1(sulamaNet),
      sulamaBrut: round1(sulamaBrut),
      toprakAcigi: round1(depletion),
      not,
      fertN_kgDa: fertN,
      fertP2O5_kgDa: fertP,
      fertK2O_kgDa: fertK,
    });
  }

  // Water deficit
  const waterDeficit = sulamaYok ? aylikDenge.reduce((s, m) => s + m.netSulama, 0) : round1(totalDeficit);

  return {
    gunlukSu: sulamaYok ? 0 : avgDailyMm,
    haftalikSu: sulamaYok ? 0 : haftalikSu,
    sezonlukSu: sulamaYok ? 0 : sezonlukM3,
    sulamaSayisi,
    sulamaMiktar,
    elektrikMaliyet: pompaMaliyet,
    sistemMaliyet: sulamaYok ? 0 : sistemIsletme + (sistemKurulum / 5),
    toplamMaliyet,
    suTasarrufu: Math.max(0, suTasarrufu),
    verimArtisi,
    aylikDenge,
    sulamaYok,
    waterDeficit,

    etoYontemiLabel: etoMetodInfo.label,
    iklimSenaryosuLabel: senaryoMeta.label,
    kcModeliLabel,
    verimKaybiPct: round1(verimKaybiPct),
    sezonStresOrani: round1(sezonStresOrani),
    gunlukPlan,
    ilkSulama,
    parMol,
    toprakKatmanlari,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SulamaPlanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);
  const [error, setError] = useState('');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [wxStatus, setWxStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  const cropData = state.urun ? CROP_WATER_DB[state.urun] : null;
  const calc = useMemo(
    () => (state.step === 4 ? calculate(state, forecast, weather) : null),
    [state, forecast, weather],
  );
  const bolge = state.il ? getBolge(state.il) : null;
  const bolgeMeta = bolge ? BOLGE_META[bolge] : null;

  const clampArea = (v: number) => Math.max(1, Math.min(20000, v));
  const AREA_PRESETS = [10, 25, 50, 100, 200, 500, 1000];

  const goStep2 = () => {
    if (!state.il) { setError('Lütfen il seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 2 }));
  };
  const goStep3 = () => {
    if (!state.urun) { setError('Lütfen ürün seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 3 }));
  };
  const goStep4 = () => {
    if (state.alan <= 0) { setError('Geçerli arazi büyüklüğü girin'); return; }
    setError(''); setState(s => ({ ...s, step: 4 }));
  };
  const reset = () => { setState(INITIAL); setError(''); };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!state.il) {
        setWeather(null);
        setForecast(null);
        setWxStatus('idle');
        return;
      }

      if (!isWeatherConfigured()) {
        setWeather(null);
        setForecast(null);
        setWxStatus('unavailable');
        return;
      }

      setWxStatus('loading');
      const [w, f] = await Promise.all([fetchWeather(state.il), fetchForecast(state.il)]);
      if (cancelled) return;
      setWeather(w);
      setForecast(f);
      setWxStatus('ready');
    }

    run();
    return () => { cancelled = true; };
  }, [state.il]);

  return (
    <div className="sp-wizard">
      <div className="sp-topbar">
        <button className="sp-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="sp-topbar__title">
          <span>💧</span>
          <span>Sulama Planlayıcı</span>
        </div>
        {state.step > 1 && (
          <button className="sp-topbar__reset" onClick={reset}>Yeniden Başla</button>
        )}
      </div>

      <div className="sp-content">
        {/* Steps */}
        <div className="sp-steps">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className={`sp-step ${state.step === s.n ? 'sp-step--active' : state.step > s.n ? 'sp-step--done' : ''}`}>
                <div className="sp-step__bubble">{state.step > s.n ? '✓' : s.icon}</div>
                <span className="sp-step__label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`sp-step__line ${state.step > s.n ? 'sp-step__line--done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="sp-error">{error}</div>}

        {/* ── STEP 1: Konum & İklim ─────────────────────────────────────── */}
        {state.step === 1 && (
          <div className="sp-card">
            <h2 className="sp-card__title">📍 Konum Bilgileri</h2>
            <p className="sp-card__desc">İl seçerek iklim bölgesi otomatik belirlensin. Gerçek ETo ve yağış verileri hesaplanacak.</p>

            <div className="sp-field">
              <label className="sp-label" htmlFor="il-sel">İl</label>
              <select id="il-sel" className="sp-select" value={state.il}
                onChange={e => setState(s => ({ ...s, il: e.target.value }))}>
                <option value="">— İl seçin —</option>
                {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
              </select>
            </div>

            {state.il && (
              <>
                <WeatherWidget il={state.il} compact />
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#718096', textAlign: 'center' }}>
                  Canlı hava verisi referans amaçlıdır; sulama hesaplamaları uzun yıl iklim ortalamalarına dayanır.
                </p>
              </>
            )}

            {bolge && bolgeMeta && (
              <div className="sp-bolge-card">
                <div className="sp-bolge-card__header">
                  <span style={{ fontSize: '1.5rem' }}>{bolgeMeta.emoji}</span>
                  <span style={{ fontWeight: 800 }}>{bolgeMeta.ad}</span>
                </div>
                <p className="sp-bolge-card__desc">{bolgeMeta.aciklama}</p>
                <div className="sp-bolge-card__stats">
                  <span>📊 Yıllık Ort. ETo: {(Array.from({ length: 12 }, (_, i) => getETo(state.il, i + 1)).reduce((s, v) => s + v, 0) / 12).toFixed(1)} mm/gün</span>
                  <span>🌧️ Yıllık Toplam Yağış: {Array.from({ length: 12 }, (_, i) => getYagis(state.il, i + 1)).reduce((s, v) => s + v, 0).toFixed(0)} mm</span>
                </div>
              </div>
            )}

            <button className="sp-btn sp-btn--primary sp-btn--full" onClick={goStep2}>
              Devam Et →
            </button>
          </div>
        )}

        {/* ── STEP 2: Ürün ──────────────────────────────────────────────── */}
        {state.step === 2 && (
          <div className="sp-card sp-card--wide">
            <h2 className="sp-card__title">🌾 Ürün Seçimi</h2>
            <p className="sp-card__desc">Sulama planı yapılacak ürünü seçin</p>

            <div className="sp-crop-grid">
              {Object.values(CROP_WATER_DB).map(crop => (
                <button key={crop.urun}
                  className={`sp-crop-btn ${state.urun === crop.urun ? 'sp-crop-btn--selected' : ''}`}
                  onClick={() => setState(s => ({ ...s, urun: crop.urun }))}>
                  <span className="sp-crop-btn__name">{crop.urun}</span>
                  <span className="sp-crop-btn__hint">Kc: {crop.katsayi.toFixed(2)}</span>
                </button>
              ))}
            </div>

            {state.urun && cropData && (
              <div className="sp-crop-info">
                <h3>ℹ️ {cropData.urun} Sulama Profili</h3>
                <p><strong>Kritik Dönem:</strong> {cropData.kritikDonem}</p>
                <p><strong>Sulama Sıklığı:</strong> {cropData.sulamaSikligi} günde bir</p>
                <p><strong>Açıklama:</strong> {cropData.aciklama}</p>
              </div>
            )}

            <div className="sp-btn-row">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 1 }))}>← Geri</button>
              <button className="sp-btn sp-btn--primary" onClick={goStep3} disabled={!state.urun}>Devam Et →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Sistem & Arazi ────────────────────────────────────── */}
        {state.step === 3 && (
          <div className="sp-card">
            <h2 className="sp-card__title">💧 Sulama Sistemi ve Arazi Bilgileri</h2>
            <p className="sp-card__desc">Seçilen ürün: <strong>{state.urun}</strong></p>

            <div className="sp-field">
              <label className="sp-label">Arazi Büyüklüğü</label>
              <div className="sp-area">
                <div className="sp-area__value">{state.alan.toLocaleString('tr-TR')} <span>dekar</span></div>
                <input className="sp-range" type="range" min={1} max={5000} step={10} value={state.alan}
                  onChange={e => setState(s => ({ ...s, alan: clampArea(Number(e.target.value)) }))} />
                <div className="sp-area__presets">
                  {AREA_PRESETS.map(v => (
                    <button key={v} type="button"
                      className={`sp-preset-btn ${state.alan === v ? 'sp-preset-btn--active' : ''}`}
                      onClick={() => setState(s => ({ ...s, alan: v }))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Toprak Tipi</label>
              <div className="sp-toggle-row">
                {(['kumlu', 'tınlı', 'killi', 'organik'] as const).map(tip => (
                  <button key={tip}
                    className={`sp-toggle-btn ${state.toprakTipi === tip ? 'sp-toggle-btn--active' : ''}`}
                    onClick={() => setState(s => ({ ...s, toprakTipi: tip }))}>
                    {SOIL_TYPES[tip].tip}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Sulama Sistemi</label>
              <div className="sp-system-grid">
                {(['damla', 'yagmurlama', 'salma', 'yok'] as const).map(sys => {
                  const sysData = IRRIGATION_SYSTEMS[sys];
                  return (
                    <label key={sys} className={`sp-system-card ${state.sulamaSistemi === sys ? 'sp-system-card--active' : ''}`}>
                      <input type="radio" name="sistem" value={sys} checked={state.sulamaSistemi === sys}
                        onChange={e => {
                          const v = e.target.value as WizardState['sulamaSistemi'];
                          setState(s => ({
                            ...s,
                            sulamaSistemi: v,
                            sulamaKarsilamaPct: v === 'yok' ? 0 : s.sulamaKarsilamaPct,
                            fertigasyon: v === 'yok' ? false : s.fertigasyon,
                          }));
                        }} />
                      <div className="sp-system-card__emoji">{sysData.emoji}</div>
                      <div className="sp-system-card__name">{sysData.tip}</div>
                      <div className="sp-system-card__stats">
                        <span>Verim: %{sysData.verimlilik}</span>
                        {sysData.maliyet_kurulum > 0 && (
                          <span>{sysData.maliyet_kurulum.toLocaleString('tr-TR')} ₺/da</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {state.sulamaSistemi !== 'yok' && (
              <div className="sp-field">
                <label className="sp-checkbox">
                  <input type="checkbox" checked={state.mevcutSistem}
                    onChange={e => setState(s => ({ ...s, mevcutSistem: e.target.checked }))} />
                  <span>Sistemim mevcut (kurulum maliyeti yok)</span>
                </label>
              </div>
            )}

            {state.sulamaSistemi !== 'yok' && (
              <div className="sp-field">
                <label className="sp-label">⚡ Elektrik Birim Fiyatı (₺/m³)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" step="0.01" min="0.01" max="5"
                    value={state.elektrikBirimFiyat}
                    onChange={e => setState(s => ({ ...s, elektrikBirimFiyat: Math.max(0.01, Math.min(5, parseFloat(e.target.value) || 0.15)) }))}
                    style={{ width: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Varsayılan: 0.15 ₺/m³</span>
                </div>
              </div>
            )}

            {cropData && (
              <div className="sp-field">
                <label className="sp-label">Gelişme Dönemi</label>
                <div className="sp-donem-select">
                  {cropData.donem.map((donem, idx) => (
                    <label key={idx} className={`sp-donem-btn ${state.gelismeDonemi === idx ? 'sp-donem-btn--active' : ''}`}>
                      <input type="radio" name="donem" value={idx} checked={state.gelismeDonemi === idx}
                        onChange={() => setState(s => ({ ...s, gelismeDonemi: idx }))} />
                      <span>{donem}</span>
                      <span className="sp-donem-kc">Kc: {cropData.donemKc[idx].toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <hr style={{ margin: '18px 0', border: 0, borderTop: '1px solid #e5e7eb' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>⚙️ Gelişmiş Ayarlar</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Bu bölümdeki seçenekler, eldeki veri seti (uzun yıl ETo/yağış tablosu + opsiyonel OpenWeather tahmini) nedeniyle
              <strong> yaklaşık / karar-destek</strong> amaçlı uygulanır.
            </p>

            <div className="sp-field">
              <label className="sp-label" htmlFor="eto-yontem">Referans ETo Yöntemi</label>
              <select
                id="eto-yontem"
                className="sp-select"
                value={state.etoYontemi}
                onChange={e => setState(s => ({ ...s, etoYontemi: e.target.value as EToMetodId }))}
              >
                {ETO_METOD_LISTESI.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.gercekFormul ? '✅ ' : '📊 '}{m.label}
                  </option>
                ))}
              </select>
              {(() => {
                const secilen = ETO_METOD_LISTESI.find(m => m.id === state.etoYontemi);
                return secilen ? (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: secilen.gercekFormul ? '#065f46' : '#6b7280',
                    background: secilen.gercekFormul ? 'rgba(6,95,70,0.06)' : 'transparent',
                    padding: secilen.gercekFormul ? '6px 10px' : '0', borderRadius: 6 }}>
                    {secilen.gercekFormul && <strong>Gerçek formül: </strong>}{secilen.aciklama}
                  </div>
                ) : null;
              })()}
            </div>

            <div className="sp-field">
              <label className="sp-label">İklim Senaryosu</label>
              <div className="sp-toggle-row">
                {(['normal', 'kurak', 'yagisli'] as const).map(k => (
                  <button
                    key={k}
                    className={`sp-toggle-btn ${state.iklimSenaryosu === k ? 'sp-toggle-btn--active' : ''}`}
                    onClick={() => setState(s => ({ ...s, iklimSenaryosu: k }))}
                    type="button"
                  >
                    {IKLIM_SENARYOLARI[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Kc Modeli</label>
              <div className="sp-toggle-row">
                {(['tek', 'cift'] as const).map(k => (
                  <button
                    key={k}
                    className={`sp-toggle-btn ${state.kcModeli === k ? 'sp-toggle-btn--active' : ''}`}
                    onClick={() => setState(s => ({ ...s, kcModeli: k }))}
                    type="button"
                  >
                    {k === 'tek' ? 'Tek Kc' : 'Çift Kc (Kcb+Ke)'}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                Çift Kc: yağış/buharlaşma bileşenini (Ke) yaklaşık olarak ayırır.
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Kök Derinliği (m)</label>
              <input
                type="number"
                min={0.2}
                max={2.0}
                step={0.05}
                value={state.kokDerinligiM}
                onChange={e => setState(s => ({ ...s, kokDerinligiM: clamp(0.2, Number(e.target.value) || 0.6, 2.0) }))}
                className="sp-select"
              />
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                Toplam kullanılabilir su (TAW) ve kritik açığı (RAW) etkiler.
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Sulama Karşılama Oranı (%)</label>
              {state.sulamaSistemi === 'yok' ? (
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Sulama sistemi yok seçildiği için karşılama oranı 0% kabul edilir.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={state.sulamaKarsilamaPct}
                      onChange={e => setState(s => ({ ...s, sulamaKarsilamaPct: clamp(0, Number(e.target.value) || 0, 100) }))}
                      className="sp-range"
                    />
                    <strong style={{ width: 52, textAlign: 'right' }}>%{state.sulamaKarsilamaPct}</strong>
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                    %100: tam sulama, %60-80: defisit sulama senaryosu.
                  </div>
                </>
              )}
            </div>

            <div className="sp-field">
              <label className="sp-checkbox">
                <input
                  type="checkbox"
                  checked={state.akilliPlan}
                  onChange={e => setState(s => ({ ...s, akilliPlan: e.target.checked }))}
                />
                <span>Akıllı günlük plan (tahmini yağışa göre erteleme)</span>
              </label>
            </div>

            <div className="sp-field">
              <label className="sp-checkbox">
                <input
                  type="checkbox"
                  checked={state.katmanAnalizi}
                  onChange={e => setState(s => ({ ...s, katmanAnalizi: e.target.checked }))}
                />
                <span>Toprak katman profili (0-20 / 20-40 / alt)</span>
              </label>
            </div>

            <div className="sp-field">
              <label className="sp-checkbox">
                <input
                  type="checkbox"
                  checked={state.fertigasyon}
                  onChange={e => setState(s => ({ ...s, fertigasyon: e.target.checked }))}
                  disabled={state.sulamaSistemi === 'yok'}
                />
                <span>Fertigasyon planı (sulamaya böl)</span>
              </label>
              {state.sulamaSistemi === 'yok' && (
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                  Sulama yok iken fertigasyon uygulanamaz.
                </div>
              )}
            </div>

            {state.fertigasyon && state.sulamaSistemi !== 'yok' && (
              <div className="sp-field" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="sp-label">N (kg/da)</label>
                    <input type="number" min={0} max={100} step={0.1} value={state.fertN_kgDa}
                      onChange={e => setState(s => ({ ...s, fertN_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="sp-select" />
                  </div>
                  <div>
                    <label className="sp-label">P₂O₅ (kg/da)</label>
                    <input type="number" min={0} max={100} step={0.1} value={state.fertP2O5_kgDa}
                      onChange={e => setState(s => ({ ...s, fertP2O5_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="sp-select" />
                  </div>
                  <div>
                    <label className="sp-label">K₂O (kg/da)</label>
                    <input type="number" min={0} max={100} step={0.1} value={state.fertK2O_kgDa}
                      onChange={e => setState(s => ({ ...s, fertK2O_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="sp-select" />
                  </div>
                  <div>
                    <label className="sp-label">Bölüm Sayısı</label>
                    <input type="number" min={1} max={12} step={1} value={state.fertBolum}
                      onChange={e => setState(s => ({ ...s, fertBolum: clamp(1, parseInt(e.target.value, 10) || 6, 12) }))}
                      className="sp-select" />
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                  Günlük plan tablosunda sulama olan günlere eşit bölünmüş doz olarak yansır.
                </div>
              </div>
            )}

            <div className="sp-btn-row">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
              <button className="sp-btn sp-btn--primary" onClick={goStep4}>📊 Sonuçları Hesapla →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Sonuçlar ──────────────────────────────────────────── */}
        {state.step === 4 && calc && cropData && (
          <div className="sp-results">

            {/* ── Model Şeffaflık ve Güven Skoru ─────────────────────────── */}
            {(() => {
              const etoMetod = ETO_METOD_LISTESI.find(m => m.id === state.etoYontemi);
              let conf = 30;
              if (etoMetod?.gercekFormul) conf += 30;  // gerçek ETo formülü
              if (wxStatus === 'ready' && forecast) conf += 15;  // canlı hava tahmini
              const donRisk = donRiskiVar(bolge ?? 'ic_anadolu', new Date().getMonth() + 1);
              const bolgeLabel = BOLGE_META[bolge ?? 'ic_anadolu']?.ad ?? '';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <ConfidenceBadge score={Math.min(100, conf)} label="Hesap Güveni" />
                    {donRisk && (
                      <span style={{ fontSize: '0.8rem', color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '3px 10px', borderRadius: 999, border: '1px solid #fca5a5' }}>
                        ❄️ Bu ay bölgede don riski var
                      </span>
                    )}
                    {wxStatus !== 'ready' && (
                      <span style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid #f59e0b' }}>
                        ⚠️ Hava tahmini yok — günlük plan statik
                      </span>
                    )}
                  </div>
                  <ModelWarningBox
                    modelType={`Su dengesi modeli — ETo: ${etoMetod?.label ?? state.etoYontemi}`}
                    dataLevel={`${state.il}, ${bolgeLabel} bölgesi — uzun yıl iklim ortalaması`}
                    message="Hesaplamalar uzun yıl iklim tablosu ve seçilen ETo yöntemine dayanır. Gerçek toprak nem sensörü veya istasyon verisi kullanılmamaktadır. Kesin sulama kararları için tarla ölçümü alınız."
                  />
                </div>
              );
            })()}

            <div className="sp-card">
              <h3 style={{ margin: '0 0 10px 0' }}>⚙️ Gelişmiş Özet</h3>
              <div className="sp-params">
                <span>🧮 ETo: {calc.etoYontemiLabel}</span>
                <span>🌤️ Senaryo: {calc.iklimSenaryosuLabel}</span>
                <span>🌿 Kc: {calc.kcModeliLabel}</span>
                <span>🎯 Karşılama: %{state.sulamaKarsilamaPct}</span>
                <span>🌱 Kök: {state.kokDerinligiM.toFixed(2)} m</span>
                <span>🌧️ Tahmin: {wxStatus === 'ready' && forecast ? 'Var' : wxStatus === 'unavailable' ? 'API anahtarı yok' : 'Yok'}</span>
                {calc.parMol != null && <span>☀️ PAR: {calc.parMol.toFixed(1)} mol/m²/gün</span>}
              </div>
              {calc.ilkSulama && !calc.sulamaYok && (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                  <strong>İlk sulama önerisi:</strong> {calc.ilkSulama.date} — Net {calc.ilkSulama.netMm.toFixed(1)} mm (Brüt {calc.ilkSulama.brutMm.toFixed(1)} mm)
                  <span style={{ color: '#6b7280' }}> — {calc.ilkSulama.reason}</span>
                </div>
              )}
            </div>

            <div className="sp-card">
              <h3 style={{ margin: '0 0 10px 0' }}>🌾 Stres & Verim</h3>
              <div className="sp-kpi-grid">
                <div className="sp-kpi" style={{ borderColor: '#f59e0b' }}>
                  <div className="sp-kpi__label">Sezon Stres Oranı</div>
                  <div className="sp-kpi__value" style={{ color: '#f59e0b' }}>%{(calc.sezonStresOrani * 100).toFixed(0)}</div>
                  <div className="sp-kpi__unit">(defisit / talep)</div>
                </div>
                <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
                  <div className="sp-kpi__label">Tahmini Verim Kaybı</div>
                  <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>-%{calc.verimKaybiPct.toFixed(0)}</div>
                  <div className="sp-kpi__unit">Ky (yaklaşık)</div>
                </div>
                <div className="sp-kpi">
                  <div className="sp-kpi__label">Su Açığı (mm)</div>
                  <div className="sp-kpi__value">{calc.waterDeficit.toFixed(0)}</div>
                  <div className="sp-kpi__unit">mm/sezon</div>
                </div>
              </div>
              <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
                Verim kaybı, dönem bazlı Ky çarpanları ile su stresi oranının ağırlıklı toplamından hesaplanır (resmî kalibrasyon değildir).
              </p>
            </div>

            {forecast && (
              <div className="sp-card">
                <h3 style={{ margin: '0 0 10px 0' }}>🌧️ Yağış Tahmini (OpenWeather)</h3>
                <div className="sp-kpi-grid">
                  <div className="sp-kpi">
                    <div className="sp-kpi__label">24 saat</div>
                    <div className="sp-kpi__value">{forecast.next24hRainMm.toFixed(1)}</div>
                    <div className="sp-kpi__unit">mm</div>
                  </div>
                  <div className="sp-kpi">
                    <div className="sp-kpi__label">48 saat</div>
                    <div className="sp-kpi__value">{forecast.next48hRainMm.toFixed(1)}</div>
                    <div className="sp-kpi__unit">mm</div>
                  </div>
                  <div className="sp-kpi">
                    <div className="sp-kpi__label">5 gün</div>
                    <div className="sp-kpi__value">{forecast.next5dRainMm.toFixed(1)}</div>
                    <div className="sp-kpi__unit">mm</div>
                  </div>
                </div>
                <div className="sp-table-wrap" style={{ marginTop: 12 }}>
                  <table className="sp-detail-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Yağış (mm)</th>
                        <th>Min/Max (°C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.daily.map(d => (
                        <tr key={d.date}>
                          <td><strong>{d.date}</strong></td>
                          <td>{d.rainMm.toFixed(1)}</td>
                          <td>{d.tempMin.toFixed(0)} / {d.tempMax.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
                  Tahmin verisi, günlük plan ekranında yağışa göre sulama ertelemesi için kullanılır.
                </p>
              </div>
            )}

            {/* Water Deficit Warning for "Sulama Yok" */}
            {calc.sulamaYok && (
              <div className="sp-card" style={{ border: '2px solid #e74c3c', background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)' }}>
                <h3 style={{ color: '#c53030', margin: '0 0 12px 0' }}>🚫 Su Açığı Analizi — Sulama Sistemsiz</h3>
                <p style={{ color: '#742a2a', marginBottom: 16 }}>
                  Sulama sistemi seçilmediği için aşağıda bitkinin <strong>karşılanamayan su ihtiyacı</strong> gösterilmektedir.
                  Bu, yalnızca yağış ile karşılanamayan miktardır.
                </p>
                <div className="sp-kpi-grid">
                  <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
                    <div className="sp-kpi__label">Sezonluk Su Açığı</div>
                    <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>{(calc.waterDeficit * state.alan).toFixed(0)}</div>
                    <div className="sp-kpi__unit">m³ (toplam)</div>
                  </div>
                  <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
                    <div className="sp-kpi__label">Açık (mm/sezon)</div>
                    <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>{calc.waterDeficit.toFixed(0)}</div>
                    <div className="sp-kpi__unit">mm</div>
                  </div>
                  <div className="sp-kpi" style={{ borderColor: '#f59e0b' }}>
                    <div className="sp-kpi__label">Tahmini Verim Kaybı</div>
                    <div className="sp-kpi__value" style={{ color: '#f59e0b' }}>-%{calc.verimKaybiPct.toFixed(0)}</div>
                    <div className="sp-kpi__unit">sulamasız</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #f59e0b' }}>
                  <strong>💡 Öneri:</strong> Bu ürün için en az <strong>damla sulama</strong> sistemi kurulması önerilir.
                  Damla sulama ile su kullanımı azalır ve verim artışı mümkün olabilir (ürün ve yönetim koşullarına bağlı).
                  Tahmini kurulum maliyeti: {(IRRIGATION_SYSTEMS['damla'].maliyet_kurulum * state.alan).toLocaleString('tr-TR')} ₺
                </div>
              </div>
            )}

            {/* KPI Grid — only when irrigation system is selected */}
            {!calc.sulamaYok && (
            <div className="sp-kpi-grid">
              <div className="sp-kpi sp-kpi--main">
                <div className="sp-kpi__label">Sezonluk Su İhtiyacı</div>
                <div className="sp-kpi__value">{calc.sezonlukSu >= 1000 ? (calc.sezonlukSu / 1000).toFixed(1) + 'k' : calc.sezonlukSu.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³/sezon</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Ort. Günlük</div>
                <div className="sp-kpi__value">{calc.gunlukSu.toFixed(1)}</div>
                <div className="sp-kpi__unit">mm/gün</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Haftalık</div>
                <div className="sp-kpi__value">{calc.haftalikSu.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³/hafta</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Sulama Sayısı</div>
                <div className="sp-kpi__value">{calc.sulamaSayisi}</div>
                <div className="sp-kpi__unit">kez/sezon</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Her Sulamada</div>
                <div className="sp-kpi__value">{calc.sulamaMiktar.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³</div>
              </div>
            </div>
            )}

            {/* Monthly Water Balance Chart */}
            <div className="sp-chart-card">
              <h3>📊 Aylık Su Dengesi — {state.il}</h3>
              <p className="sp-chart-desc">
                {bolgeMeta && <span style={{ marginRight: 8 }}>{bolgeMeta.emoji} {bolgeMeta.ad}</span>}
                İl bazlı uzun yıl iklim istatistikleriyle hesaplanmıştır (statik veri tablosu, canlı MGM verisi değildir). ETo: <strong>{calc.etoYontemiLabel}</strong>, Senaryo: <strong>{calc.iklimSenaryosuLabel}</strong>, Kc: <strong>{calc.kcModeliLabel}</strong>.
                {calc.sulamaYok && <span style={{ color: '#e74c3c', fontWeight: 600, marginLeft: 8 }}>
                  (Sulama sistemi yok — Brüt Sulama kolonu karşılanamayan su açığını gösterir)
                </span>}
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={calc.aylikDenge} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${v}`} tick={{ fontSize: 11 }} label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value.toFixed(1)} mm`, name]}
                    labelFormatter={(label: string) => `📅 ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="etc" name="ETc (Bitki Su Tük.)" fill="#e67e22" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="efektifYagis" name="Efektif Yağış" fill="#3498db" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="brutSulama" name="Brüt Sulama" fill="#e74c3c" radius={[3, 3, 0, 0]} />
                  <ReferenceLine y={0} stroke="#666" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Detail Table */}
            <div className="sp-table-card">
              <h3>📋 Aylık Detay Tablosu</h3>
              <div className="sp-table-wrap">
                <table className="sp-detail-table">
                  <thead>
                    <tr>
                      <th>Ay</th>
                      <th>ETo (mm)</th>
                      <th>ETc (mm)</th>
                      <th>Yağış (mm)</th>
                      <th>Ef. Yağış (mm)</th>
                      <th>Net Sul. (mm)</th>
                      <th>Brüt Sul. (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.aylikDenge.map(m => (
                      <tr key={m.ayNo} className={m.brutSulama > 50 ? 'sp-row--critical' : ''}>
                        <td><strong>{m.ay}</strong></td>
                        <td>{m.eto}</td>
                        <td>{m.etc}</td>
                        <td>{m.yagis}</td>
                        <td>{m.efektifYagis}</td>
                        <td>{m.netSulama}</td>
                        <td style={{ fontWeight: m.brutSulama > 0 ? 700 : 400, color: m.brutSulama > 50 ? 'var(--sp-danger, #e74c3c)' : 'inherit' }}>
                          {m.brutSulama}
                        </td>
                      </tr>
                    ))}
                    <tr className="sp-row--total">
                      <td><strong>TOPLAM</strong></td>
                      <td>{calc.aylikDenge.reduce((s, m) => s + m.eto, 0).toFixed(0)}</td>
                      <td>{calc.aylikDenge.reduce((s, m) => s + m.etc, 0).toFixed(0)}</td>
                      <td>{calc.aylikDenge.reduce((s, m) => s + m.yagis, 0).toFixed(0)}</td>
                      <td>{calc.aylikDenge.reduce((s, m) => s + m.efektifYagis, 0).toFixed(0)}</td>
                      <td>{calc.aylikDenge.reduce((s, m) => s + m.netSulama, 0).toFixed(0)}</td>
                      <td><strong>{calc.aylikDenge.reduce((s, m) => s + m.brutSulama, 0).toFixed(0)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Analysis */}
            {!calc.sulamaYok && (
            <div className="sp-cost-card">
              <h3>💰 Maliyet Analizi (Sezonluk)</h3>
              <div className="sp-cost-row">
                <span>Elektrik (Pompa)</span>
                <span>{calc.elektrikMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-row">
                <span>Sistem (Kurulum + İşletme)</span>
                <span>{calc.sistemMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-row sp-cost-row--total">
                <span>Toplam</span>
                <span>{calc.toplamMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-perda">
                <span>≈ {(calc.toplamMaliyet / state.alan).toFixed(0)} ₺/dekar</span>
              </div>
              <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#92400e', background: '#fffbeb', padding: '8px 12px', borderRadius: 6, border: '1px solid #f59e0b' }}>
                ⚠️ <strong>Hesaplama Uyarısı:</strong> Fiyatlar 2024 ortalamasıdır; gerçek maliyetler bölge ve tarifeye göre değişir. Su ihtiyacı hesaplamaları il bazlı uzun yıl iklim ortalamalarına dayanır; canlı hava verileri kullanılmamaktadır.
              </p>
            </div>
            )}

            {/* Benefits */}
            {!calc.sulamaYok && calc.verimArtisi > 0 && (
              <div className="sp-benefit-card">
                <h3>🌱 Potansiyel Faydalar</h3>
                <div className="sp-benefit-item">
                  <span className="sp-benefit-icon">📈</span>
                  <div>
                    <div className="sp-benefit-title">Verim Artışı</div>
                    <div className="sp-benefit-value">+%{calc.verimArtisi.toFixed(0)}</div>
                    <div className="sp-benefit-hint">Optimal sulama ile tahmini</div>
                  </div>
                </div>
                {calc.suTasarrufu > 0 && (
                  <div className="sp-benefit-item">
                    <span className="sp-benefit-icon">💧</span>
                    <div>
                      <div className="sp-benefit-title">Su Tasarrufu</div>
                      <div className="sp-benefit-value">%{calc.suTasarrufu.toFixed(0)}</div>
                      <div className="sp-benefit-hint">Damla sulama sistemine geçişle</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="sp-table-card">
              <h3>📅 Günlük Plan (14 gün)</h3>
              <div className="sp-table-wrap">
                <table className="sp-detail-table">
                  <thead>
                    <tr>
                      <th>Gün</th>
                      <th>ETo</th>
                      <th>ETc</th>
                      <th>Yağış</th>
                      <th>Net</th>
                      <th>Brüt</th>
                      <th>Açık</th>
                      {state.fertigasyon && <th>N/P/K</th>}
                      <th>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.gunlukPlan.map(d => (
                      <tr key={d.date}>
                        <td><strong>{d.label}</strong></td>
                        <td>{d.eto.toFixed(1)}</td>
                        <td>{d.etc.toFixed(1)}</td>
                        <td>{d.yagisTahmin.toFixed(1)}</td>
                        <td>{d.sulamaNet.toFixed(1)}</td>
                        <td>{d.sulamaBrut.toFixed(1)}</td>
                        <td style={{ fontWeight: d.toprakAcigi >= 50 ? 700 : 400 }}>{d.toprakAcigi.toFixed(1)}</td>
                        {state.fertigasyon && (
                          <td>
                            {d.fertN_kgDa != null ? `${d.fertN_kgDa.toFixed(1)}/${(d.fertP2O5_kgDa ?? 0).toFixed(1)}/${(d.fertK2O_kgDa ?? 0).toFixed(1)}` : '—'}
                          </td>
                        )}
                        <td style={{ color: '#6b7280' }}>{d.not || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
                Açık (mm), kök derinliği ve toprak tipine göre hesaplanan RAW eşiğine yaklaştıkça sulama önerilir.
              </p>
            </div>

            {calc.toprakKatmanlari && (
              <div className="sp-table-card">
                <h3>🪨 Toprak Katman Profili (Yaklaşık)</h3>
                <div className="sp-table-wrap">
                  <table className="sp-detail-table">
                    <thead>
                      <tr>
                        <th>Katman</th>
                        <th>Derinlik</th>
                        <th>Su Tutma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.toprakKatmanlari.map(k => (
                        <tr key={k.katman}>
                          <td><strong>{k.katman}</strong></td>
                          <td>{k.derinlikCm} cm</td>
                          <td>{k.suTutmaMm} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Irrigation Schedule */}
            {!calc.sulamaYok && (
            <div className="sp-schedule-card">
              <h3>📅 Sulama Takvimi — {cropData.urun}</h3>
              <div className="sp-schedule-grid">
                {cropData.donem.map((donem, idx) => (
                  <div key={idx} className={`sp-schedule-item ${state.gelismeDonemi === idx ? 'sp-schedule-item--current' : ''}`}>
                    <div className="sp-schedule-donem">{donem}</div>
                    <div className="sp-schedule-kc">Kc: {cropData.donemKc[idx].toFixed(2)}</div>
                    <div className="sp-schedule-freq">Her {Math.ceil(cropData.sulamaSikligi * (1 - cropData.donemKc[idx] * 0.2))} gün</div>
                  </div>
                ))}
              </div>
              <p className="sp-schedule-note">⚠️ <strong>Kritik dönem:</strong> {cropData.kritikDonem} — su stresinden kaçının!</p>
            </div>
            )}

            {/* Parameters */}
            <div className="sp-params-card">
              <h3>Hesaplama Parametreleri</h3>
              <div className="sp-params">
                <span>📍 {state.il}{bolgeMeta ? ` (${bolgeMeta.emoji} ${bolgeMeta.ad})` : ''}</span>
                <span>🌾 {state.urun}</span>
                <span>📐 {state.alan.toLocaleString('tr-TR')} da</span>
                <span>🪨 Toprak: {SOIL_TYPES[state.toprakTipi].tip}</span>
                <span>💧 Sistem: {IRRIGATION_SYSTEMS[state.sulamaSistemi].tip}</span>
                <span>📊 Dönem: {cropData.donem[state.gelismeDonemi]}</span>
                <span>🧮 ETo: {calc.etoYontemiLabel}</span>
                <span>🌤️ Senaryo: {calc.iklimSenaryosuLabel}</span>
                <span>🌿 Kc: {calc.kcModeliLabel}</span>
                <span>🎯 Karşılama: %{state.sulamaKarsilamaPct}</span>
              </div>
            </div>

            <div className="sp-btn-row sp-btn-row--center">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 3 }))}>← Sistem Bilgileri</button>
              <button className="sp-btn sp-btn--secondary" onClick={() => window.print()}>🖨️ Yazdır</button>
              <button className="sp-btn sp-btn--primary" onClick={reset}>🔄 Yeni Plan</button>
            </div>
          </div>
        )}

        {state.step === 4 && !calc && (
          <div className="sp-card">
            <p className="sp-empty">Hesaplama yapılamadı. Lütfen bilgileri kontrol edin.</p>
            <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Ürün Seçimine Dön</button>
          </div>
        )}
      </div>
    </div>
  );
}
