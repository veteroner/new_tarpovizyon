import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ILLER, getBolge, BOLGE_META, getToprakProfil, getToprakProfilAd } from '../utils/climate-data';
import ProductTrustPanel from '../components/ProductTrustPanel';
import './GubreHesapPage.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   Gübre Hesaplayıcı - Fertilizer Calculator
   NPK + Organic/Chemical Comparison + Application Schedule
   ═══════════════════════════════════════════════════════════════════════════════ */

interface CropNutrientData {
  ad: string;
  emoji: string;
  // kg/dekar for 100 kg yield
  n: number;      // Nitrogen
  p2o5: number;   // Phosphorus (P₂O₅)
  k2o: number;    // Potassium (K₂O)
  // Mikro besin elementleri (kg/dekar per 100kg verim)
  fe: number;     // Iron (Demir)
  zn: number;     // Zinc (Çinko)
  mn: number;     // Manganese (Mangan)
  b: number;      // Boron (Bor)
  // Optimal soil pH
  ph_min: number;
  ph_max: number;
  // Growth stage requirements (% of total)
  stage_early: number;   // ilk gelişim
  stage_mid: number;     // çiçeklenme/meyve bağlama
  stage_late: number;    // olgunlaşma
  notes: string;
}

interface SoilAnalysis {
  n: number;      // kg/dekar
  p2o5: number;
  k2o: number;
  ph: number;
  organik_madde: number; // %
}

interface FertilizerProduct {
  ad: string;
  tip: 'kimyasal' | 'organik';
  n: number;
  p: number;
  k: number;
  fiyat_kg: number; // TL/kg
  uygulama: string;
}

interface WizardState {
  il: string;
  alan: number;               // dekar
  urun: string;
  hedef_verim: number;        // ton/dekar
  toprak: SoilAnalysis | null;
  gubre_tipi: 'kimyasal' | 'organik' | 'her_ikisi';
  senaryo: 'tutucu' | 'standart' | 'agresif';
}

interface CalcResult {
  ihtiyac: { n: number; p2o5: number; k2o: number };
  eksik: { n: number; p2o5: number; k2o: number };
  mikroIhtiyac: { fe: number; zn: number; mn: number; b: number };
  mikroOneriler: Array<{ urun: string; doz_kgDa: number; doz_toplam: number; maliyet: number; aciklama: string }>;
  omMinN: number;              // OM mineralizasyonundan gelen N (kg/dekar/yıl)
  alan: number;                // dekar — for total field calculations
  oneriler: {
    kimyasal: Array<{ urun: string; miktar: number; fiyat: number }>;
    organik: Array<{ urun: string; miktar: number; fiyat: number }>;
  };
  uygulama_takvimi: Array<{
    donem: string;
    hafta: string;
    n: number;
    p: number;
    k: number;
    notlar: string;
  }>;
  toplam_maliyet_kimyasal: number;
  toplam_maliyet_organik: number;
  ph_uyari?: string;
  phDoz?: string;              // Kireçleme/kükürt miktarı (kg/dekar)
  chartData: Array<{ name: string; ihtiyac: number; toprak: number; eksik: number }>;
}

// ── Nutrient Database ─────────────────────────────────────────────────────────

const CROP_NUTRIENT_DB: Record<string, CropNutrientData> = {
  bugday: { ad: 'Buğday', emoji: '🌾', n: 2.5, p2o5: 1.0, k2o: 2.0, fe: 0.08, zn: 0.02, mn: 0.04, b: 0.006, ph_min: 6.0, ph_max: 7.5, stage_early: 40, stage_mid: 40, stage_late: 20, notes: 'Sapa kalkma döneminde azot kritik' },
  arpa: { ad: 'Arpa', emoji: '🌾', n: 2.2, p2o5: 1.0, k2o: 1.8, fe: 0.07, zn: 0.02, mn: 0.03, b: 0.005, ph_min: 6.0, ph_max: 7.0, stage_early: 45, stage_mid: 35, stage_late: 20, notes: 'Erken azot uygulaması önemli' },
  misir: { ad: 'Mısır', emoji: '🌽', n: 3.0, p2o5: 1.2, k2o: 2.5, fe: 0.12, zn: 0.03, mn: 0.05, b: 0.008, ph_min: 5.8, ph_max: 7.0, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Koçan bağlama döneminde bol azot' },
  domates: { ad: 'Domates', emoji: '🍅', n: 3.5, p2o5: 1.5, k2o: 4.0, fe: 0.15, zn: 0.04, mn: 0.06, b: 0.015, ph_min: 6.0, ph_max: 6.8, stage_early: 25, stage_mid: 40, stage_late: 35, notes: 'Meyve gelişiminde potasyum kritik' },
  biber: { ad: 'Biber', emoji: '🫑', n: 3.0, p2o5: 1.2, k2o: 3.5, fe: 0.12, zn: 0.03, mn: 0.05, b: 0.012, ph_min: 6.0, ph_max: 7.0, stage_early: 30, stage_mid: 40, stage_late: 30, notes: 'Düzenli gübreleme gerekir' },
  patates: { ad: 'Patates', emoji: '🥔', n: 2.8, p2o5: 1.8, k2o: 4.5, fe: 0.10, zn: 0.03, mn: 0.05, b: 0.010, ph_min: 5.0, ph_max: 6.5, stage_early: 35, stage_mid: 45, stage_late: 20, notes: 'Yumru gelişiminde potasyum önemli' },
  sogan: { ad: 'Soğan', emoji: '🧅', n: 2.5, p2o5: 1.0, k2o: 2.2, fe: 0.08, zn: 0.02, mn: 0.04, b: 0.008, ph_min: 6.0, ph_max: 7.0, stage_early: 40, stage_mid: 40, stage_late: 20, notes: 'Baş bağlama döneminde azot azaltılmalı' },
  pamuk: { ad: 'Pamuk', emoji: '🌱', n: 3.2, p2o5: 1.5, k2o: 3.0, fe: 0.10, zn: 0.03, mn: 0.05, b: 0.012, ph_min: 6.0, ph_max: 7.5, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Çiçeklenme döneminde potasyum' },
  aycicegi: { ad: 'Ayçiçeği', emoji: '🌻', n: 2.5, p2o5: 1.8, k2o: 3.5, fe: 0.10, zn: 0.03, mn: 0.04, b: 0.020, ph_min: 6.0, ph_max: 7.5, stage_early: 35, stage_mid: 45, stage_late: 20, notes: 'Tabla oluşumunda fosfor önemli, bor eksikliğine dikkat' },
  seker_pancari: { ad: 'Şeker Pancarı', emoji: '🥕', n: 3.5, p2o5: 2.0, k2o: 4.5, fe: 0.12, zn: 0.03, mn: 0.06, b: 0.018, ph_min: 6.5, ph_max: 7.5, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Kök gelişiminde dengeli NPK, bor kritik' },
  salatalik: { ad: 'Salatalık', emoji: '🥒', n: 2.8, p2o5: 1.2, k2o: 3.0, fe: 0.10, zn: 0.03, mn: 0.04, b: 0.010, ph_min: 6.0, ph_max: 7.0, stage_early: 25, stage_mid: 45, stage_late: 30, notes: 'Meyve tutumu için potasyum' },
  kavun: { ad: 'Kavun', emoji: '🍈', n: 2.5, p2o5: 1.0, k2o: 3.5, fe: 0.08, zn: 0.02, mn: 0.04, b: 0.008, ph_min: 6.0, ph_max: 7.0, stage_early: 30, stage_mid: 40, stage_late: 30, notes: 'Tatlılık için potasyum artırılmalı' },
  karpuz: { ad: 'Karpuz', emoji: '🍉', n: 2.8, p2o5: 1.2, k2o: 4.0, fe: 0.10, zn: 0.03, mn: 0.04, b: 0.010, ph_min: 6.0, ph_max: 7.0, stage_early: 25, stage_mid: 45, stage_late: 30, notes: 'Meyve büyümesinde potasyum' },
  uzum: { ad: 'Üzüm', emoji: '🍇', n: 2.0, p2o5: 1.0, k2o: 2.5, fe: 0.12, zn: 0.03, mn: 0.05, b: 0.012, ph_min: 6.0, ph_max: 7.0, stage_early: 40, stage_mid: 35, stage_late: 25, notes: 'Salkım gelişiminde dengeli, demir klorozu riski' },
  elma: { ad: 'Elma', emoji: '🍎', n: 1.8, p2o5: 0.8, k2o: 2.0, fe: 0.10, zn: 0.04, mn: 0.04, b: 0.015, ph_min: 6.0, ph_max: 7.0, stage_early: 35, stage_mid: 40, stage_late: 25, notes: 'Meyve renklenmesinde potasyum, çinko eksikliğine dikkat' },
  zeytin: { ad: 'Zeytin', emoji: '🫒', n: 1.5, p2o5: 0.6, k2o: 1.8, fe: 0.08, zn: 0.02, mn: 0.03, b: 0.015, ph_min: 6.5, ph_max: 7.5, stage_early: 40, stage_mid: 35, stage_late: 25, notes: 'Yıllık bakım gübrelemesi yeterli, bor önemli' },
};

const FERTILIZER_PRODUCTS: FertilizerProduct[] = [
  // Kimyasal — Fiyatlar 2025 Türkiye piyasası (TL/kg)
  { ad: 'Üre (46-0-0)', tip: 'kimyasal', n: 46, p: 0, k: 0, fiyat_kg: 40, uygulama: 'Toprak' },
  { ad: 'Amonyum Sülfat (21-0-0)', tip: 'kimyasal', n: 21, p: 0, k: 0, fiyat_kg: 22, uygulama: 'Toprak' },
  { ad: 'Amonyum Nitrat (33-0-0)', tip: 'kimyasal', n: 33, p: 0, k: 0, fiyat_kg: 28, uygulama: 'Toprak' },
  { ad: 'Diamonyum Fosfat (18-46-0)', tip: 'kimyasal', n: 18, p: 46, k: 0, fiyat_kg: 46, uygulama: 'Toprak' },
  { ad: 'Triple Süper Fosfat (0-46-0)', tip: 'kimyasal', n: 0, p: 46, k: 0, fiyat_kg: 38, uygulama: 'Toprak' },
  { ad: 'Potasyum Sülfat (0-0-50)', tip: 'kimyasal', n: 0, p: 0, k: 50, fiyat_kg: 55, uygulama: 'Toprak' },
  { ad: 'Potasyum Klorür (0-0-60)', tip: 'kimyasal', n: 0, p: 0, k: 60, fiyat_kg: 42, uygulama: 'Toprak' },
  { ad: 'NPK 15-15-15', tip: 'kimyasal', n: 15, p: 15, k: 15, fiyat_kg: 46, uygulama: 'Toprak' },
  { ad: 'NPK 20-20-0', tip: 'kimyasal', n: 20, p: 20, k: 0, fiyat_kg: 44, uygulama: 'Toprak' },
  
  // Organik
  { ad: 'Ahır Gübresi', tip: 'organik', n: 0.5, p: 0.3, k: 0.5, fiyat_kg: 3, uygulama: 'Toprak altı' },
  { ad: 'Tavuk Gübresi', tip: 'organik', n: 1.5, p: 1.0, k: 0.8, fiyat_kg: 6, uygulama: 'Toprak altı' },
  { ad: 'Koyun Gübresi', tip: 'organik', n: 0.9, p: 0.5, k: 0.8, fiyat_kg: 4, uygulama: 'Toprak altı' },
  { ad: 'Kompost', tip: 'organik', n: 1.0, p: 0.5, k: 1.0, fiyat_kg: 4, uygulama: 'Toprak karıştırma' },
  { ad: 'Solucan Gübresi', tip: 'organik', n: 2.0, p: 1.0, k: 1.5, fiyat_kg: 15, uygulama: 'Toprak/Yaprak' },
  { ad: 'Organik NPK (4-2-3)', tip: 'organik', n: 4, p: 2, k: 3, fiyat_kg: 20, uygulama: 'Toprak' },
];

// Mikro besin ürünleri — element % cinsinden, 2025 fiyatları
interface MicroProduct { ad: string; element: 'fe' | 'zn' | 'mn' | 'b'; elementPct: number; fiyat_kg: number; uygulama: string; doz_kgDa: number; }
const MICRO_PRODUCTS: MicroProduct[] = [
  { ad: 'Demir Sülfat (FeSO₄·7H₂O) %19 Fe', element: 'fe', elementPct: 19, fiyat_kg: 16, uygulama: 'Toprak/Yaprak', doz_kgDa: 7 },
  { ad: 'Şelat Demir (EDDHA %6 Fe)', element: 'fe', elementPct: 6, fiyat_kg: 85, uygulama: 'Toprak', doz_kgDa: 2 },
  { ad: 'Çinko Sülfat (ZnSO₄·7H₂O) %22 Zn', element: 'zn', elementPct: 22, fiyat_kg: 26, uygulama: 'Toprak', doz_kgDa: 3 },
  { ad: 'Mangan Sülfat (MnSO₄·H₂O) %32 Mn', element: 'mn', elementPct: 32, fiyat_kg: 22, uygulama: 'Toprak', doz_kgDa: 4 },
  { ad: 'Boraks (%11 B)', element: 'b', elementPct: 11, fiyat_kg: 18, uygulama: 'Toprak', doz_kgDa: 1.5 },
];

function getTrustTone(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function buildFertilizerTrust(state: WizardState, result: CalcResult, crop: CropNutrientData | null) {
  let score = 46;

  if (state.toprak) score += 18;
  if (state.senaryo === 'standart') score += 5;
  if (state.gubre_tipi === 'her_ikisi') score += 4;
  if (crop && state.toprak && state.toprak.ph >= crop.ph_min && state.toprak.ph <= crop.ph_max) score += 6;
  if (result.ph_uyari) score -= 6;

  score = Math.max(18, Math.min(84, score));

  return {
    title: 'Gubre plani guven siniri',
    score,
    tone: getTrustTone(score),
    summary: 'Bu cikti, elle girilen toprak analizi degerleri ve statik urun/veri tabani ile uretilen bir on recetedir. Satin alma ve uygulama karari oncesinde saha uzmani teyidi gerekir.',
    badges: [
      `${state.senaryo} senaryo`,
      `${state.gubre_tipi === 'her_ikisi' ? 'Kimyasal + organik kiyas' : state.gubre_tipi}`,
      `pH: ${state.toprak?.ph ?? '-'}${result.ph_uyari ? ' uyari var' : ''}`,
      `${state.alan} da alan`,
    ],
    bullets: [
      'Besin acigi, hedef verim ve urun basina sabit NPK katsayilariyla hesaplanir.',
      'Gubre onerileri optimizasyon motoru degil, urun veri tabanina dayali kural tabanli bir karmadir.',
      'Mikro besin ve fiyatlar piyasa teyidi olmadan kullanilmamalidir.',
    ],
    sources: ['Elle girilen toprak analizi', 'Statik urun besin veri tabani', 'Kural tabanli gubre karisimi'],
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GubreHesapPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    il: '',
    alan: 50,
    urun: '',
    hedef_verim: 0,
    toprak: null,
    gubre_tipi: 'her_ikisi',
    senaryo: 'standart',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState('');

  // ── Calculations ────────────────────────────────────────────────────────────

  const calculate = (): CalcResult => {
    const crop = CROP_NUTRIENT_DB[state.urun];
    if (!crop || !state.toprak) throw new Error('Eksik veri');

    // Scenario multiplier: conservative saves cost, aggressive maximizes yield
    const senaryoCarpan = state.senaryo === 'tutucu' ? 0.80 : state.senaryo === 'agresif' ? 1.20 : 1.0;

    // Total nutrient requirement (based on target yield × scenario)
    const ihtiyac = {
      n: crop.n * (state.hedef_verim * 10) * senaryoCarpan,
      p2o5: crop.p2o5 * (state.hedef_verim * 10) * senaryoCarpan,
      k2o: crop.k2o * (state.hedef_verim * 10) * senaryoCarpan,
    };

    // Organik madde mineralizasyonu: yıllık yaklaşık 5 kg N / (% OM × dekar)
    // Kaynak: 25 cm toprak derinliği, 1.3 g/cm³ özgül ağırlık, %5 N içeriği, %2 mineralizasyon oranı
    // ≈ 1000 m²/da × 0.25 m × 1300 kg/m³ × (OM/100) × 0.05 × 0.02 = 3.25 × OM% ≈ pratik 5 kg N/da/yıl
    const omMinN = +(state.toprak.organik_madde * 5).toFixed(1);

    // Subtract existing soil nutrients + OM-available N
    const eksik = {
      n: Math.max(0, ihtiyac.n - state.toprak.n - omMinN),
      p2o5: Math.max(0, ihtiyac.p2o5 - state.toprak.p2o5),
      k2o: Math.max(0, ihtiyac.k2o - state.toprak.k2o),
    };

    // Micro-nutrient requirements (total for alan)
    const verimFaktor = state.hedef_verim * 10; // 100kg units
    const mikroIhtiyac = {
      fe: +(crop.fe * verimFaktor).toFixed(2),
      zn: +(crop.zn * verimFaktor).toFixed(3),
      mn: +(crop.mn * verimFaktor).toFixed(3),
      b: +(crop.b * verimFaktor).toFixed(3),
    };

    // Mikro besin ürün önerileri: eksiklik eşikleri aşıldığında ürün dozajı hesapla
    // Eşikler (kg/dekar): Fe>0.05, Zn>0.015, Mn>0.025, B>0.005
    const mikroEsikler = { fe: 0.05, zn: 0.015, mn: 0.025, b: 0.005 };
    const mikroAciklamalar: Record<string, string> = {
      fe: 'Yüksek pH veya kireçli topraklarda demir klorozu riski. Toprak uygulaması veya yapraktan şelatlı demir.',
      zn: 'Çinko eksikliği mısır ve meyve bahçelerinde yaygın. Toprak uygulaması veya yapraktan ZnSO₄.',
      mn: 'Asit topraklarda fazla, alkali topraklarda az çözünür. Yapraktan uygulama daha etkili.',
      b: 'Bor, çiçeklenme ve meyve tutumunda kritik. Aşırı uygulamadan kaçın (toksik eşik düşük).',
    };
    const mikroOneriler: CalcResult['mikroOneriler'] = [];
    // Her element için ayrı değerlendir: ilk eşleşen ürünü öner
    const seenElements = new Set<string>();
    for (const mp of MICRO_PRODUCTS) {
      if (seenElements.has(mp.element)) continue;
      const deficit = mikroIhtiyac[mp.element];
      const esik = mikroEsikler[mp.element];
      if (deficit > esik) {
        const dozHesap = deficit / (mp.elementPct / 100);
        const doz = Math.min(mp.doz_kgDa, Math.max(0.5, +dozHesap.toFixed(1)));
        const dozToplam = +(doz * state.alan).toFixed(1);
        mikroOneriler.push({
          urun: mp.ad,
          doz_kgDa: doz,
          doz_toplam: dozToplam,
          maliyet: Math.round(dozToplam * mp.fiyat_kg),
          aciklama: mikroAciklamalar[mp.element],
        });
        seenElements.add(mp.element);
      }
    }

    // Calculate optimal fertilizer combinations
    const oneriler = {
      kimyasal: calculateFertilizerMix(eksik, 'kimyasal'),
      organik: calculateFertilizerMix(eksik, 'organik'),
    };

    // Chart data for NPK visualization
    const chartData = [
      { name: 'Azot (N)', ihtiyac: +ihtiyac.n.toFixed(1), toprak: state.toprak.n, eksik: +eksik.n.toFixed(1) },
      { name: 'Fosfor (P₂O₅)', ihtiyac: +ihtiyac.p2o5.toFixed(1), toprak: state.toprak.p2o5, eksik: +eksik.p2o5.toFixed(1) },
      { name: 'Potasyum (K₂O)', ihtiyac: +ihtiyac.k2o.toFixed(1), toprak: state.toprak.k2o, eksik: +eksik.k2o.toFixed(1) },
    ];

    // Application schedule
    const uygulama_takvimi = [
      {
        donem: 'İlk Gelişim',
        hafta: '0-4',
        n: Math.round(eksik.n * crop.stage_early / 100),
        p: Math.round(eksik.p2o5 * 0.7), // Most P at planting
        k: Math.round(eksik.k2o * crop.stage_early / 100),
        notlar: 'Ekimle birlikte taban gübresi',
      },
      {
        donem: 'Gelişme/Çiçeklenme',
        hafta: '4-10',
        n: Math.round(eksik.n * crop.stage_mid / 100),
        p: Math.round(eksik.p2o5 * 0.3),
        k: Math.round(eksik.k2o * crop.stage_mid / 100),
        notlar: 'Üst gübreleme (2-3 parselde)',
      },
      {
        donem: 'Meyve/Olgunlaşma',
        hafta: '10-16',
        n: Math.round(eksik.n * crop.stage_late / 100),
        p: 0,
        k: Math.round(eksik.k2o * crop.stage_late / 100),
        notlar: 'Kalite için potasyum ağırlıklı',
      },
    ];

    // pH uyarısı + düzeltme dozajı
    // Kireçleme: Her 0.1 pH birimi artış için yaklaşık 10-15 kg/dekar kireç (CaCO₃ %90)
    // Kükürt: Her 0.1 pH birimi düşürme için yaklaşık 3-5 kg/dekar elementel kükürt
    let ph_uyari: string | undefined;
    let phDoz: string | undefined;
    if (state.toprak.ph < crop.ph_min) {
      const fark = +(crop.ph_min - state.toprak.ph).toFixed(1);
      const kirecKgDa = Math.round(fark * 10 * 12);  // ~12 kg/dekar per 0.1 birim
      const kirecToplam = kirecKgDa * state.alan;
      ph_uyari = `⚠️ Toprak pH değeri düşük (${state.toprak.ph}). Kireçleme önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
      phDoz = `Tahmini kireç (CaCO₃ %90) ihtiyacı: ${kirecKgDa} kg/dekar → toplam ${kirecToplam.toLocaleString('tr-TR')} kg (${state.alan} dekar). Sonbaharda toprak işleme öncesi uygulayın, etki 6-12 ayda gerçekleşir.`;
    } else if (state.toprak.ph > crop.ph_max) {
      const fark = +(state.toprak.ph - crop.ph_max).toFixed(1);
      const kukurtKgDa = Math.round(fark * 10 * 4);  // ~4 kg/dekar per 0.1 birim
      const kukurtToplam = kukurtKgDa * state.alan;
      ph_uyari = `⚠️ Toprak pH değeri yüksek (${state.toprak.ph}). Kükürt uygulaması önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
      phDoz = `Tahmini elementel kükürt ihtiyacı: ${kukurtKgDa} kg/dekar → toplam ${kukurtToplam.toLocaleString('tr-TR')} kg (${state.alan} dekar). Sulama ile birlikte ince öğütülmüş kükürt uygulanmalıdır.`;
    }

    return {
      ihtiyac,
      eksik,
      mikroIhtiyac,
      mikroOneriler,
      omMinN,
      alan: state.alan,
      oneriler,
      uygulama_takvimi,
      toplam_maliyet_kimyasal: oneriler.kimyasal.reduce((sum, x) => sum + x.fiyat, 0) * state.alan,
      toplam_maliyet_organik: oneriler.organik.reduce((sum, x) => sum + x.fiyat, 0) * state.alan,
      ph_uyari,
      phDoz,
      chartData,
    };
  };

  const calculateFertilizerMix = (
    needed: { n: number; p2o5: number; k2o: number },
    tip: 'kimyasal' | 'organik'
  ): Array<{ urun: string; miktar: number; fiyat: number }> => {
    const products = FERTILIZER_PRODUCTS.filter((p) => p.tip === tip);
    const mix: Array<{ urun: string; miktar: number; fiyat: number }> = [];

    let remainingN = needed.n;
    let remainingP = needed.p2o5;
    let remainingK = needed.k2o;

    // Strategy: Use compound fertilizers first, then single-nutrient ones

    // 1. Find best compound fertilizer
    const compounds = products.filter((p) => p.n > 0 && p.p > 0 && p.k > 0);
    if (compounds.length > 0 && remainingN > 0 && remainingP > 0 && remainingK > 0) {
      const best = compounds.reduce((a, b) => (a.fiyat_kg < b.fiyat_kg ? a : b));
      // Calculate how much we can use (limited by the nutrient in shortest supply)
      const maxByN = remainingN / (best.n / 100);
      const maxByP = remainingP / (best.p / 100);
      const maxByK = remainingK / (best.k / 100);
      const amount = Math.min(maxByN, maxByP, maxByK);
      
      if (amount > 0) {
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
        remainingN -= amount * (best.n / 100);
        remainingP -= amount * (best.p / 100);
        remainingK -= amount * (best.k / 100);
      }
    }

    // Thresholds adapt to organik vs kimyasal
    const isOrganik = tip === 'organik';
    const pThreshold  = isOrganik ? 0.5 : 30;
    const nThreshold  = isOrganik ? 0.3 : 20;
    const kThreshold  = isOrganik ? 0.5 : 40;

    // 2. Add phosphorus if needed (apply early)
    if (remainingP > (isOrganik ? 0.5 : 5)) {
      const pProducts = products.filter((p) => p.p > pThreshold).sort((a, b) => b.p - a.p);
      if (pProducts.length > 0) {
        const best = pProducts[0];
        const amount = remainingP / (best.p / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
        remainingN -= amount * (best.n / 100); // DAP adds N too — subtract from remaining need
        remainingK -= amount * (best.k / 100); // Track K contribution too
      }
    }

    // 3. Add nitrogen if needed
    if (remainingN > (isOrganik ? 0.5 : 5)) {
      const nProducts = products.filter((p) => p.n > nThreshold && p.p <= pThreshold && p.k <= kThreshold).sort((a, b) => b.n - a.n);
      if (nProducts.length > 0) {
        const best = nProducts[0];
        const amount = remainingN / (best.n / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
        // N fulfilled — track K side-contribution for downstream K step
        remainingK -= amount * (best.k / 100);
      }
    }

    // 4. Add potassium if needed
    if (remainingK > (isOrganik ? 0.5 : 5)) {
      const kProducts = products.filter((p) => p.k > kThreshold).sort((a, b) => b.k - a.k);
      if (kProducts.length > 0) {
        const best = kProducts[0];
        const amount = remainingK / (best.k / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      }
    }

    return mix;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleNext = () => {
    setError('');
    if (step === 1 && !state.urun) return setError('Lütfen ürün seçin');
    if (step === 1 && state.hedef_verim <= 0) return setError('Lütfen hedef verim girin');
    if (step === 2 && !state.toprak) return setError('Lütfen toprak analizi bilgilerini girin');
    
    if (step === 3) {
      try {
        const res = calculate();
        setResult(res);
        setStep(4);
      } catch (_err) {
        setError('Hesaplama hatası');
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => { setStep(step - 1); setError(''); };
  const handleReset = () => {
    setStep(1);
    setState({ il: '', alan: 50, urun: '', hedef_verim: 0, toprak: null, gubre_tipi: 'her_ikisi', senaryo: 'standart' });
    setResult(null);
    setError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const cropData = state.urun ? CROP_NUTRIENT_DB[state.urun] : null;
  const bolge = state.il ? getBolge(state.il) : null;
  const bolgeMeta = bolge ? BOLGE_META[bolge] : null;
  const bolgeProfilAd = state.il ? getToprakProfilAd(state.il) : (bolgeMeta?.ad ?? '');
  const bolgeProfil = state.il ? getToprakProfil(state.il) : null;
  const fertilizerTrust = result ? buildFertilizerTrust(state, result, cropData) : null;

  return (
    <div className="gh-wizard">
      {/* Topbar */}
      <div className="gh-topbar">
        <button className="gh-topbar__back" onClick={() => navigate(-1)}>← Geri</button>
        <div className="gh-topbar__title">
          <span>🧪</span>
          <span>Gubre Plan Taslagi</span>
        </div>
        {step > 1 && <button className="gh-topbar__reset" onClick={handleReset}>Yeniden Başlat</button>}
        {step === 1 && <div style={{ width: '140px' }} />}
      </div>

      <div className="gh-content">
        {/* Steps */}
        <div className="gh-steps">
          <div className={`gh-step ${step >= 1 ? 'gh-step--active' : ''} ${step > 1 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">1</div>
            <div className="gh-step__label">Ürün & Hedef</div>
          </div>
          <div className={`gh-step__line ${step > 1 ? 'gh-step__line--done' : ''}`} />
          
          <div className={`gh-step ${step >= 2 ? 'gh-step--active' : ''} ${step > 2 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">2</div>
            <div className="gh-step__label">Toprak Analizi</div>
          </div>
          <div className={`gh-step__line ${step > 2 ? 'gh-step__line--done' : ''}`} />
          
          <div className={`gh-step ${step >= 3 ? 'gh-step--active' : ''} ${step > 3 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">3</div>
            <div className="gh-step__label">Gübre Tipi</div>
          </div>
          <div className={`gh-step__line ${step > 3 ? 'gh-step__line--done' : ''}`} />
          
          <div className={`gh-step ${step >= 4 ? 'gh-step--active' : ''} ${step > 4 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">4</div>
            <div className="gh-step__label">Sonuçlar</div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="gh-error">{error}</div>}

        {/* STEP 1: Crop & Target Yield */}
        {step === 1 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Konum, Ürün ve Hedef</h2>
            <p className="gh-card__desc">İl, ürün, alan ve hedef verim bilgilerinizi girin.</p>

            {/* İl Seçimi */}
            <div className="gh-field">
              <label className="gh-label" htmlFor="gh-il">İl</label>
              <select id="gh-il" className="gh-select" value={state.il}
                onChange={e => setState({ ...state, il: e.target.value })}>
                <option value="">— İl seçin (opsiyonel) —</option>
                {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
              </select>
              {bolgeMeta && bolgeProfil && (
                <div className="gh-bolge-hint">
                  {bolgeMeta.emoji} <strong>{bolgeMeta.ad}</strong> — {bolgeProfil.aciklama}
                </div>
              )}
            </div>

            {/* Alan (dekar) */}
            <div className="gh-field">
              <label className="gh-label">Arazi Alanı (dekar)</label>
              <div className="gh-yield">
                <div className="gh-yield__value">{state.alan.toLocaleString('tr-TR')} <span>dekar</span></div>
                <input
                  type="range"
                  min="1"
                  max="2000"
                  step="1"
                  value={state.alan}
                  onChange={(e) => setState({ ...state, alan: parseInt(e.target.value) })}
                  className="gh-range"
                />
                <div className="gh-yield__presets">
                  {[10, 25, 50, 100, 250, 500].map((v) => (
                    <button
                      key={v}
                      className={`gh-preset-btn ${state.alan === v ? 'gh-preset-btn--active' : ''}`}
                      onClick={() => setState({ ...state, alan: v })}
                    >
                      {v} da
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ürün Seçimi */}
            <div className="gh-field">
              <label className="gh-label">Ürün Seçimi</label>
              <div className="gh-crop-grid">
                {Object.keys(CROP_NUTRIENT_DB).map((key) => {
                  const crop = CROP_NUTRIENT_DB[key];
                  return (
                    <div
                      key={key}
                      className={`gh-crop-btn ${state.urun === key ? 'gh-crop-btn--selected' : ''}`}
                      onClick={() => setState({ ...state, urun: key })}
                    >
                      <div className="gh-crop-btn__emoji">{crop.emoji}</div>
                      <div className="gh-crop-btn__name">{crop.ad}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {cropData && (
              <div className="gh-crop-info">
                <h3>{cropData.emoji} {cropData.ad} — Besin İhtiyacı (100 kg verim için)</h3>
                <div className="gh-nutrient-bars">
                  <div className="gh-nutrient-row">
                    <span className="gh-nutrient-label">N (Azot)</span>
                    <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.n / 4 * 100)}%`, background: '#3b82f6' }} /></div>
                    <span className="gh-nutrient-val">{cropData.n} kg/da</span>
                  </div>
                  <div className="gh-nutrient-row">
                    <span className="gh-nutrient-label">P₂O₅ (Fosfor)</span>
                    <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.p2o5 / 2.5 * 100)}%`, background: '#f59e0b' }} /></div>
                    <span className="gh-nutrient-val">{cropData.p2o5} kg/da</span>
                  </div>
                  <div className="gh-nutrient-row">
                    <span className="gh-nutrient-label">K₂O (Potasyum)</span>
                    <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.k2o / 5 * 100)}%`, background: '#10b981' }} /></div>
                    <span className="gh-nutrient-val">{cropData.k2o} kg/da</span>
                  </div>
                </div>
                <div className="gh-micro-grid">
                  <span title="Demir">🔩 Fe: {cropData.fe} kg</span>
                  <span title="Çinko">⚡ Zn: {cropData.zn} kg</span>
                  <span title="Mangan">🔧 Mn: {cropData.mn} kg</span>
                  <span title="Bor">💎 B: {cropData.b} kg</span>
                </div>
                <p><strong>Uygun pH:</strong> {cropData.ph_min} — {cropData.ph_max}</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>💡 {cropData.notes}</p>
              </div>
            )}

            <div className="gh-field">
              <label className="gh-label">Hedef Verim (ton/dekar)</label>
              <div className="gh-yield">
                <div className="gh-yield__value">{state.hedef_verim.toFixed(1)} <span>ton/dekar</span></div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={state.hedef_verim}
                  onChange={(e) => setState({ ...state, hedef_verim: parseFloat(e.target.value) })}
                  className="gh-range"
                />
                <div className="gh-yield__presets">
                  {[0.5, 1, 2, 3, 5].map((v) => (
                    <button
                      key={v}
                      className={`gh-preset-btn ${state.hedef_verim === v ? 'gh-preset-btn--active' : ''}`}
                      onClick={() => setState({ ...state, hedef_verim: v })}
                    >
                      {v} ton
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="gh-btn-row">
              <button className="gh-btn gh-btn--primary gh-btn--full" onClick={handleNext}>
                İleri →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Soil Analysis */}
        {step === 2 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Toprak Analizi</h2>
            <p className="gh-card__desc">
              Toprağınızın mevcut besin değerlerini girin. Toprak analizi yaptırmadıysanız ortalama değerleri kullanabilirsiniz.
            </p>

            <div className="gh-soil-grid">
              <div className="gh-field">
                <label className="gh-label">Azot (N) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 5"
                  value={state.toprak?.n ?? ''}
                  onChange={(e) => {
                    const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
                    setState({ ...state, toprak: { ...base, n: parseFloat(e.target.value) || 0 } });
                  }}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Fosfor (P₂O₅) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 3"
                  value={state.toprak?.p2o5 ?? ''}
                  onChange={(e) => {
                    const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
                    setState({ ...state, toprak: { ...base, p2o5: parseFloat(e.target.value) || 0 } });
                  }}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Potasyum (K₂O) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 8"
                  value={state.toprak?.k2o ?? ''}
                  onChange={(e) => {
                    const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
                    setState({ ...state, toprak: { ...base, k2o: parseFloat(e.target.value) || 0 } });
                  }}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">pH Değeri</label>
                <input
                  type="number"
                  step="0.1"
                  className="gh-input"
                  placeholder="Örn: 6.5"
                  value={state.toprak?.ph ?? ''}
                  onChange={(e) => {
                    const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
                    setState({ ...state, toprak: { ...base, ph: parseFloat(e.target.value) || 0 } });
                  }}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Organik Madde (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="gh-input"
                  placeholder="Örn: 2.5"
                  value={state.toprak?.organik_madde ?? ''}
                  onChange={(e) => {
                    const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
                    setState({ ...state, toprak: { ...base, organik_madde: parseFloat(e.target.value) || 0 } });
                  }}
                />
              </div>
            </div>

            <div className="gh-preset-soil">
              <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Hızlı Seçenekler:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {bolgeProfil && (
                  <button
                    className="gh-preset-btn gh-preset-btn--bolge"
                    onClick={() => setState({ ...state, toprak: { n: bolgeProfil.n, p2o5: bolgeProfil.p2o5, k2o: bolgeProfil.k2o, ph: bolgeProfil.ph, organik_madde: bolgeProfil.organik_madde } })}
                  >
                    {bolgeMeta?.emoji} {bolgeProfilAd} Profili
                  </button>
                )}
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 3, p2o5: 2, k2o: 5, ph: 6.5, organik_madde: 1.5 } })}
                >
                  Fakir Toprak
                </button>
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 6, p2o5: 4, k2o: 10, ph: 6.8, organik_madde: 2.5 } })}
                >
                  Orta Verimli
                </button>
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 10, p2o5: 7, k2o: 15, ph: 7.0, organik_madde: 3.5 } })}
                >
                  Verimli Toprak
                </button>
              </div>
            </div>

            <div className="gh-btn-row">
              <button className="gh-btn gh-btn--secondary" onClick={handleBack}>← Geri</button>
              <button className="gh-btn gh-btn--primary" onClick={handleNext}>İleri →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Fertilizer Type */}
        {step === 3 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Gübre Tipi & Senaryo</h2>
            <p className="gh-card__desc">
              Kimyasal, organik veya her iki tip gübrenin karşılaştırmasını görmek istediğinizi seçin.
            </p>

            <div className="gh-radio-group">
              <label className={`gh-radio-btn ${state.gubre_tipi === 'kimyasal' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'kimyasal'}
                  onChange={() => setState({ ...state, gubre_tipi: 'kimyasal' })}
                />
                <span>🧪 Kimyasal Gübreler</span>
                <span className="gh-radio-hint">Hızlı etki, hassas doz kontrolü, düşük hacim</span>
              </label>

              <label className={`gh-radio-btn ${state.gubre_tipi === 'organik' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'organik'}
                  onChange={() => setState({ ...state, gubre_tipi: 'organik' })}
                />
                <span>🌿 Organik Gübreler</span>
                <span className="gh-radio-hint">Toprak yapısını iyileştirir, yavaş salınım, çevre dostu</span>
              </label>

              <label className={`gh-radio-btn ${state.gubre_tipi === 'her_ikisi' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'her_ikisi'}
                  onChange={() => setState({ ...state, gubre_tipi: 'her_ikisi' })}
                />
                <span>⚖️ Her İkisini Karşılaştır</span>
                <span className="gh-radio-hint">Kimyasal ve organik seçenekleri yan yana gör</span>
              </label>
            </div>

            {/* Scenario Selector */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--gh-text-primary, #1a1a2e)' }}>📊 Gübreleme Senaryosu</h3>
              <div className="gh-radio-group">
                {([
                  { key: 'tutucu' as const, label: '🛡️ Tutumlu (-%20)', hint: 'Maliyet odaklı — temel ihtiyaçların %80\'ini karşılar' },
                  { key: 'standart' as const, label: '⚖️ Standart', hint: 'Kitap değerleri — referans ihtiyaçların tamamı' },
                  { key: 'agresif' as const, label: '🚀 Maksimum (+%20)', hint: 'Verim odaklı — yüksek verim hedefi için %20 fazla' },
                ] as const).map(s => (
                  <label key={s.key} className={`gh-radio-btn ${state.senaryo === s.key ? 'gh-radio-btn--active' : ''}`}>
                    <input
                      type="radio"
                      name="senaryo"
                      checked={state.senaryo === s.key}
                      onChange={() => setState({ ...state, senaryo: s.key })}
                    />
                    <span>{s.label}</span>
                    <span className="gh-radio-hint">{s.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="gh-btn-row">
              <button className="gh-btn gh-btn--secondary" onClick={handleBack}>← Geri</button>
              <button className="gh-btn gh-btn--primary" onClick={handleNext}>Hesapla 🧮</button>
            </div>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 4 && result && (
          <div className="gh-results">
            {fertilizerTrust && (
              <ProductTrustPanel
                title={fertilizerTrust.title}
                summary={fertilizerTrust.summary}
                score={fertilizerTrust.score}
                tone={fertilizerTrust.tone}
                badges={fertilizerTrust.badges}
                bullets={fertilizerTrust.bullets}
                sources={fertilizerTrust.sources}
              />
            )}

            {/* Scenario Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                background: state.senaryo === 'tutucu' ? '#dbeafe' : state.senaryo === 'agresif' ? '#fef3c7' : '#d1fae5',
                color: state.senaryo === 'tutucu' ? '#1e40af' : state.senaryo === 'agresif' ? '#92400e' : '#065f46',
              }}>
                {state.senaryo === 'tutucu' ? '🛡️ Tutumlu Senaryo (-%20)' : state.senaryo === 'agresif' ? '🚀 Maksimum Senaryo (+%20)' : '⚖️ Standart Senaryo'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Taslak gübre planı — profesyonel uygulama öncesi uzman görüşü alınız
              </span>
            </div>

            {/* pH Warning + düzeltme dozajı */}
            {result.ph_uyari && (
              <div className="gh-ph-warning">
                <div>{result.ph_uyari}</div>
                {result.phDoz && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>📐 {result.phDoz}</div>}
              </div>
            )}

            {/* NPK Chart */}
            <div className="gh-card">
              <h2 className="gh-card__title">📊 NPK Besin Dengesi</h2>
              <p className="gh-card__desc" style={{ marginBottom: '1rem' }}>
                {state.alan} dekar alan için — per-dekar değerler (kg/da)
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'kg/da', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                  <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} kg/da`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ihtiyac" name="Toplam İhtiyaç" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="toprak" name="Toprakta Mevcut" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="eksik" name="Eksik (Gübrelenecek)" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary with total field amounts */}
            <div className="gh-card">
              <h2 className="gh-card__title">🧪 Makro Besin İhtiyacı</h2>
              <div className="gh-summary-grid">
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Azot (N)</div>
                  <div className="gh-summary-value">{result.eksik.n.toFixed(1)} <small>kg/da</small></div>
                  <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.n * result.alan).toFixed(0)} kg</strong></div>
                  <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.n.toFixed(1)} | Toprak: {state.toprak?.n?.toFixed(1) ?? '-'} | OM mineralizasyonu: <strong>{result.omMinN.toFixed(1)} kg/da</strong> (×{state.toprak?.organik_madde}% OM)</div>
                </div>
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Fosfor (P₂O₅)</div>
                  <div className="gh-summary-value">{result.eksik.p2o5.toFixed(1)} <small>kg/da</small></div>
                  <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.p2o5 * result.alan).toFixed(0)} kg</strong></div>
                  <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.p2o5.toFixed(1)} | Toprak: {(result.ihtiyac.p2o5 - result.eksik.p2o5).toFixed(1)}</div>
                </div>
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Potasyum (K₂O)</div>
                  <div className="gh-summary-value">{result.eksik.k2o.toFixed(1)} <small>kg/da</small></div>
                  <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.k2o * result.alan).toFixed(0)} kg</strong></div>
                  <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.k2o.toFixed(1)} | Toprak: {(result.ihtiyac.k2o - result.eksik.k2o).toFixed(1)}</div>
                </div>
              </div>
            </div>

            {/* Micro-nutrients */}
            <div className="gh-card">
              <h2 className="gh-card__title">🔬 Mikro Besin İhtiyacı ve Ürün Önerisi</h2>
              <div className="gh-micro-result-grid">
                {[{k:'fe',icon:'🔩',ad:'Demir (Fe)'},{k:'zn',icon:'⚡',ad:'Çinko (Zn)'},{k:'mn',icon:'🔧',ad:'Mangan (Mn)'},{k:'b',icon:'💎',ad:'Bor (B)'}].map(({k,icon,ad})=>(
                  <div className="gh-micro-item" key={k}>
                    <span className="gh-micro-icon">{icon}</span>
                    <div>
                      <div className="gh-micro-name">{ad}</div>
                      <div className="gh-micro-val">{result.mikroIhtiyac[k as keyof typeof result.mikroIhtiyac]} kg/da</div>
                      <div className="gh-micro-total">Toplam: {(result.mikroIhtiyac[k as keyof typeof result.mikroIhtiyac] * result.alan).toFixed(2)} kg</div>
                    </div>
                  </div>
                ))}
              </div>
              {result.mikroOneriler.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gh-text-primary)' }}>📦 Önerilen Mikro Besin Ürünleri</h3>
                  {result.mikroOneriler.map((m, i) => (
                    <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.8rem', marginBottom: '0.4rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.urun}</div>
                      <div style={{ fontSize: '0.83rem', color: '#4b5563', marginTop: 2 }}>
                        Doz: <strong>{m.doz_kgDa} kg/da</strong> → Toplam: <strong>{m.doz_toplam} kg</strong> ({state.alan} da) · Tahmini maliyet: <strong>₺{m.maliyet.toLocaleString('tr-TR')}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{m.aciklama}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.mikroOneriler.length === 0 && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>✅ Hesaplanan mikro besin önemsiz düzeyde — normal koşullarda ek uygulama gerekli değildir.</p>
              )}
            </div>

            {/* Fertilizer Recommendations — amounts multiplied by alan */}
            {(state.gubre_tipi === 'kimyasal' || state.gubre_tipi === 'her_ikisi') && (
              <div className="gh-card">
                <h2 className="gh-card__title">🧪 Kimyasal Gübre Önerisi ({state.alan} dekar)</h2>
                <div className="gh-fertilizer-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Gübre Adı</th>
                        <th>Per Dekar</th>
                        <th>Toplam ({state.alan} da)</th>
                        <th>Maliyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.oneriler.kimyasal.map((item, i) => (
                        <tr key={i}>
                          <td>{item.urun}</td>
                          <td>{item.miktar} kg</td>
                          <td><strong>{(item.miktar * result.alan).toLocaleString()} kg</strong></td>
                          <td>₺{(item.fiyat * result.alan).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="gh-fertilizer-total">
                        <td><strong>TOPLAM</strong></td>
                        <td></td>
                        <td></td>
                        <td><strong>₺{result.toplam_maliyet_kimyasal.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  ℹ️ Fiyatlar 2025 Türkiye piyasası referansıdır; güncel fiyatlar için tedarikçinize danışınız.
                </p>
              </div>
            )}

            {(state.gubre_tipi === 'organik' || state.gubre_tipi === 'her_ikisi') && (
              <div className="gh-card">
                <h2 className="gh-card__title">🌿 Organik Gübre Önerisi ({state.alan} dekar)</h2>
                <div className="gh-fertilizer-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Gübre Adı</th>
                        <th>Per Dekar</th>
                        <th>Toplam ({state.alan} da)</th>
                        <th>Maliyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.oneriler.organik.map((item, i) => (
                        <tr key={i}>
                          <td>{item.urun}</td>
                          <td>{item.miktar} kg</td>
                          <td><strong>{(item.miktar * result.alan).toLocaleString()} kg</strong></td>
                          <td>₺{(item.fiyat * result.alan).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="gh-fertilizer-total">
                        <td><strong>TOPLAM</strong></td>
                        <td></td>
                        <td></td>
                        <td><strong>₺{result.toplam_maliyet_organik.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  ℹ️ Fiyatlar 2025 Türkiye piyasası referansıdır; güncel fiyatlar için tedarikçinize danışınız.
                </p>
              </div>
            )}

            {/* Comparison */}
            {state.gubre_tipi === 'her_ikisi' && (
              <div className="gh-card gh-comparison">
                <h3>⚖️ Maliyet Karşılaştırması ({state.alan} dekar)</h3>
                <div className="gh-comparison-row">
                  <div className="gh-comparison-item">
                    <span>Kimyasal Gübre</span>
                    <strong>₺{result.toplam_maliyet_kimyasal.toLocaleString()}</strong>
                  </div>
                  <div className="gh-comparison-vs">VS</div>
                  <div className="gh-comparison-item">
                    <span>Organik Gübre</span>
                    <strong>₺{result.toplam_maliyet_organik.toLocaleString()}</strong>
                  </div>
                </div>
                <p className="gh-comparison-note">
                  {result.toplam_maliyet_kimyasal < result.toplam_maliyet_organik
                    ? '💡 Kimyasal gübre daha ekonomik ancak organik gübre toprak sağlığını uzun vadede iyileştirir.'
                    : '💡 Organik gübre bu durumda daha ekonomik ve toprak için daha faydalıdır.'}
                </p>
              </div>
            )}

            {/* Application Schedule */}
            <div className="gh-card">
              <h2 className="gh-card__title">📅 Uygulama Takvimi (kg/dekar)</h2>
              <div className="gh-schedule-table">
                <table>
                  <thead>
                    <tr>
                      <th>Dönem</th>
                      <th>Hafta</th>
                      <th>N (kg)</th>
                      <th>P₂O₅ (kg)</th>
                      <th>K₂O (kg)</th>
                      <th>Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.uygulama_takvimi.map((item, i) => (
                      <tr key={i}>
                        <td><strong>{item.donem}</strong></td>
                        <td>{item.hafta}</td>
                        <td>{item.n}</td>
                        <td>{item.p}</td>
                        <td>{item.k}</td>
                        <td style={{ fontSize: '0.85rem' }}>{item.notlar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--gh-text-secondary)' }}>
                💡 Gübreleme zamanlaması hava koşullarına ve bitki gelişimine göre ayarlanmalıdır.
              </p>
            </div>

            {/* Price Disclaimer */}
            <div className="gh-card" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
                ⚠️ <strong>Fiyat Notu (2025 Referansı):</strong> Fiyatlar 2025 Türkiye piyasa referanslarına güncellenmiştir (Üre ~40 TL/kg, DAP ~46 TL/kg, K₂SO₄ ~55 TL/kg).
                Yerel bayi fiyatları bölgeye ve döneme göre %15-25 farklılaşabilir. Organik madde mineralizasyonu hesaba katılmıştır (<strong>{result.omMinN} kg N/da/yıl</strong>).
                Bu plan uygulama öncesi bir gübreleme mühendisi veya tarım danışmanı ile gözden geçirilmelidir.
              </p>
            </div>

            <div className="gh-btn-row gh-btn-row--center">
              <button className="gh-btn gh-btn--secondary" onClick={handleReset}>🔄 Yeni Hesaplama</button>
              <button className="gh-btn gh-btn--primary" onClick={() => window.print()}>🖨️ Yazdır</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
