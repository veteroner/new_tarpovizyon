import {
  getBolge, BOLGE_META, getETo, getYagis, calcEffectiveRainfall,
  calcEToByMetod, ETO_METOD_LISTESI, donRiskiVar,
  type EToMetodId,
} from '../../utils/climate-data';
import type { ForecastSummary, WeatherData } from '../../services/weather';

// Re-exports used by section components
export { ILLER, getBolge, BOLGE_META, getETo, getYagis, ETO_METOD_LISTESI, donRiskiVar } from '../../utils/climate-data';
export type { EToMetodId } from '../../utils/climate-data';

// ═══════════════════════════════════════════════════════════════════════════════
//  Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export type IklimSenaryosuKey = 'normal' | 'kurak' | 'yagisli';

export interface CropWaterData {
  urun: string;
  katsayi: number;
  donem: string[];
  donemKc: number[];
  kritikDonem: string;
  sulamaSikligi: number;
  sezonAylari: number[];
  aciklama: string;
}

export interface MonthlyBalance {
  ay: string;
  ayNo: number;
  eto: number;
  etc: number;
  yagis: number;
  efektifYagis: number;
  netSulama: number;
  brutSulama: number;
}

export interface SoilData {
  tip: string;
  su_tutma: number;
  sizma: number;
  verimlilik: number;
}

export interface IrrigationSystem {
  tip: string;
  verimlilik: number;
  maliyet_kurulum: number;
  maliyet_isletme: number;
  emoji: string;
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  il: string;
  ilce: string;
  urun: string;
  alan: number;
  toprakTipi: 'kumlu' | 'tınlı' | 'killi' | 'organik';
  sulamaSistemi: 'damla' | 'yagmurlama' | 'salma' | 'yok';
  mevcutSistem: boolean;
  gelismeDonemi: number;
  elektrikBirimFiyat: number;

  etoYontemi: EToMetodId;
  iklimSenaryosu: IklimSenaryosuKey;
  kcModeli: 'tek' | 'cift';
  sulamaKarsilamaPct: number;
  kokDerinligiM: number;
  katmanAnalizi: boolean;
  akilliPlan: boolean;
  fertigasyon: boolean;
  fertN_kgDa: number;
  fertP2O5_kgDa: number;
  fertK2O_kgDa: number;
  fertBolum: number;
}

export interface CalcResult {
  gunlukSu: number;
  haftalikSu: number;
  sezonlukSu: number;
  sulamaSayisi: number;
  sulamaMiktar: number;
  elektrikMaliyet: number;
  sistemMaliyet: number;
  toplamMaliyet: number;
  suTasarrufu: number;
  verimArtisi: number;
  aylikDenge: MonthlyBalance[];
  sulamaYok: boolean;
  waterDeficit: number;

  etoYontemiLabel: string;
  iklimSenaryosuLabel: string;
  kcModeliLabel: string;
  verimKaybiPct: number;
  sezonStresOrani: number;
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
  ilkSulama?: { date: string; netMm: number; brutMm: number; reason: string };
  parMol?: number;
  toprakKatmanlari?: Array<{ katman: string; derinlikCm: number; suTutmaMm: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Data
// ═══════════════════════════════════════════════════════════════════════════════

export const CROP_WATER_DB: Record<string, CropWaterData> = {
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

export const SOIL_TYPES: Record<string, SoilData> = {
  kumlu:    { tip: 'Kumlu',    su_tutma: 70,  sizma: 8, verimlilik: 4 },
  tınlı:    { tip: 'Tınlı',    su_tutma: 150, sizma: 5, verimlilik: 8 },
  killi:    { tip: 'Killi',    su_tutma: 200, sizma: 2, verimlilik: 7 },
  organik:  { tip: 'Organik',  su_tutma: 180, sizma: 6, verimlilik: 9 },
};

export const IRRIGATION_SYSTEMS: Record<string, IrrigationSystem> = {
  damla:       { tip: 'Damla Sulama',       verimlilik: 92, maliyet_kurulum: 1800, maliyet_isletme: 200, emoji: '💧' },
  yagmurlama:  { tip: 'Yağmurlama',         verimlilik: 80, maliyet_kurulum: 1200, maliyet_isletme: 180, emoji: '🌧️' },
  salma:       { tip: 'Salma/Karık Sulama', verimlilik: 60, maliyet_kurulum: 300,  maliyet_isletme: 80,  emoji: '🌊' },
  yok:         { tip: 'Sulama Yok',         verimlilik: 0,  maliyet_kurulum: 0,    maliyet_isletme: 0,   emoji: '🚫' },
};

export const STEPS = [
  { n: 1, icon: '📍', label: 'Konum & İklim' },
  { n: 2, icon: '🌾', label: 'Ürün' },
  { n: 3, icon: '💧', label: 'Sistem & Arazi' },
  { n: 4, icon: '📊', label: 'Sonuçlar' },
] as const;

export const INITIAL: WizardState = {
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

export const IKLIM_SENARYOLARI: Record<IklimSenaryosuKey, { label: string; etoCarpan: number; yagisCarpan: number }> = {
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

const PAR_CLEAR_SKY_BY_MONTH: number[] = [
  18, 24, 32, 38, 44, 48, 50, 46, 38, 28, 20, 16,
];

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

export function clamp(min: number, v: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export const AREA_PRESETS = [10, 25, 50, 100, 200, 500, 1000];
export function clampArea(v: number): number { return Math.max(1, Math.min(20000, v)); }

// ═══════════════════════════════════════════════════════════════════════════════
//  Calculation Engine — Monthly Water Balance
// ═══════════════════════════════════════════════════════════════════════════════

const AYLAR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export function calculate(
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
  const taw = soil.su_tutma * rootDepthM;
  const p = clamp(0.30, 0.55 - 0.12 * (stageKcEff - 0.8), 0.65);
  const raw = taw * p;

  const fertSplits = Math.max(1, Math.round(state.fertBolum || 1));
  const fertDoseN = state.fertigasyon ? (state.fertN_kgDa / fertSplits) : 0;
  const fertDoseP = state.fertigasyon ? (state.fertP2O5_kgDa / fertSplits) : 0;
  const fertDoseK = state.fertigasyon ? (state.fertK2O_kgDa / fertSplits) : 0;
  let fertEventIdx = 0;

  let depletion = 0;
  const gunlukPlan: CalcResult['gunlukPlan'] = [];
  let ilkSulama: CalcResult['ilkSulama'] | undefined;

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: '2-digit' });

    const rainFc = forecastMap.get(dateKey) ?? 0;
    const rainEff = rainFc * 0.8;

    depletion = Math.max(0, depletion + etcDailyEff - rainEff);

    let sulamaNet = 0;
    let not: string | undefined;

    if (!sulamaYok) {
      if (state.akilliPlan) {
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
