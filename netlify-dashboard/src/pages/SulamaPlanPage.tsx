import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ILLER, getBolge, BOLGE_META, getETo, getYagis, calcEffectiveRainfall } from '../utils/climate-data';
import WeatherWidget from '../components/WeatherWidget';
import './SulamaPlanPage.css';

// ═══════════════════════════════════════════════════════════════════════════════
//  Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

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
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Calculation Engine — Monthly Water Balance
// ═══════════════════════════════════════════════════════════════════════════════

const AYLAR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

function calculate(state: WizardState): CalcResult | null {
  const cropData = CROP_WATER_DB[state.urun];
  if (!cropData || !state.il) return null;

  const system = IRRIGATION_SYSTEMS[state.sulamaSistemi];
  const sulamaYok = state.sulamaSistemi === 'yok';
  // For "yok" mode, use 1.0 efficiency to show NET water deficit (not brüt/net)
  const effi = sulamaYok ? 1.0 : (system.verimlilik / 100 || 0.5);
  const soil = SOIL_TYPES[state.toprakTipi];
  const nStages = cropData.donemKc.length;
  const nMonths = cropData.sezonAylari.length;

  // Monthly water balance
  const aylikDenge: MonthlyBalance[] = cropData.sezonAylari.map((ayNo, idx) => {
    // Map month index to growth stage (distribute evenly)
    const stageIdx = Math.min(nStages - 1, Math.floor((idx / nMonths) * nStages));
    const kc = cropData.donemKc[stageIdx];

    // Real ETo and rainfall from climate-data (il-specific, monthly)
    const etoDaily = getETo(state.il, ayNo);   // mm/day
    const yagisMonthly = getYagis(state.il, ayNo); // mm/month
    const efektifYagis = calcEffectiveRainfall(yagisMonthly); // mm/month
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][ayNo - 1];

    const etoMonthly = etoDaily * daysInMonth;
    const etcMonthly = etoMonthly * kc;

    // Soil factor: sandy dries faster → +10% need; clay retains → -10%
    const soilFactor = soil.su_tutma < 100 ? 1.10 : soil.su_tutma > 170 ? 0.90 : 1.0;
    const netSulama = Math.max(0, (etcMonthly - efektifYagis) * soilFactor);
    const brutSulama = netSulama / effi;

    return {
      ay: AYLAR[ayNo - 1],
      ayNo,
      eto: +etoMonthly.toFixed(1),
      etc: +etcMonthly.toFixed(1),
      yagis: +yagisMonthly.toFixed(1),
      efektifYagis: +efektifYagis.toFixed(1),
      netSulama: +netSulama.toFixed(1),
      brutSulama: +brutSulama.toFixed(1),
    };
  });

  // Totals
  const sezonGun = cropData.sezonAylari.reduce((sum, ayNo) => {
    return sum + [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][ayNo - 1];
  }, 0);
  const totalBrutMm = aylikDenge.reduce((s, m) => s + m.brutSulama, 0);

  // 1 mm on 1 dekar = 1 m³ (1 dekar = 1000 m², 1 mm = 0.001 m³/m²)
  const sezonlukM3 = totalBrutMm * state.alan; // mm × dekar = m³

  const avgDailyMm = totalBrutMm / sezonGun;
  const haftalikSu = avgDailyMm * 7 * state.alan; // m³/hafta
  const sulamaSayisi = Math.ceil(sezonGun / cropData.sulamaSikligi);
  const sulamaMiktar = sezonlukM3 / sulamaSayisi;

  // Cost
  const pompaMaliyet = sezonlukM3 * state.elektrikBirimFiyat; // ₺/m³ electricity (user-adjustable)
  const sistemKurulum = state.mevcutSistem ? 0 : system.maliyet_kurulum * state.alan;
  const sistemIsletme = system.maliyet_isletme * state.alan;
  const toplamMaliyet = pompaMaliyet + sistemIsletme + (sistemKurulum / 5);

  // Savings
  const optimalSystem = IRRIGATION_SYSTEMS['damla'];
  const suTasarrufu = sulamaYok ? 100 : ((optimalSystem.verimlilik - system.verimlilik) / optimalSystem.verimlilik) * 100;
  // Ürün bazlı verim artışı yüzdesi (sulama ile)
  const cropVerimEtkisi: Record<string, number> = {
    'Buğday': 20, 'Arpa': 15, 'Mısır': 35, 'Domates': 40, 'Biber': 35,
    'Patates': 30, 'Soğan': 25, 'Pamuk': 30, 'Ayçiçeği': 20,
    'Şeker Pancarı': 25, 'Salatalık': 45, 'Kavun': 35, 'Karpuz': 30,
    'Üzüm (Sofralık)': 20, 'Elma': 25, 'Zeytin': 15,
  };
  const baseVerimArtisi = cropVerimEtkisi[state.urun] ?? 25;
  const verimArtisi = sulamaYok ? baseVerimArtisi : suTasarrufu > 0 ? suTasarrufu * 0.5 : 0;

  // Water deficit (total net water need, regardless of system)
  const waterDeficit = aylikDenge.reduce((s, m) => s + m.netSulama, 0);

  return {
    gunlukSu: sulamaYok ? 0 : avgDailyMm,
    haftalikSu: sulamaYok ? 0 : haftalikSu,
    sezonlukSu: sulamaYok ? 0 : sezonlukM3,
    sulamaSayisi: sulamaYok ? 0 : sulamaSayisi,
    sulamaMiktar: sulamaYok ? 0 : sulamaMiktar,
    elektrikMaliyet: sulamaYok ? 0 : pompaMaliyet,
    sistemMaliyet: sulamaYok ? 0 : sistemIsletme + (sistemKurulum / 5),
    toplamMaliyet: sulamaYok ? 0 : toplamMaliyet,
    suTasarrufu: Math.max(0, suTasarrufu),
    verimArtisi,
    aylikDenge,
    sulamaYok,
    waterDeficit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SulamaPlanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);
  const [error, setError] = useState('');

  const cropData = state.urun ? CROP_WATER_DB[state.urun] : null;
  const calc = state.step === 4 ? calculate(state) : null;
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
                        onChange={e => setState(s => ({ ...s, sulamaSistemi: e.target.value as WizardState['sulamaSistemi'] }))} />
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

            <div className="sp-btn-row">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
              <button className="sp-btn sp-btn--primary" onClick={goStep4}>📊 Sonuçları Hesapla →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Sonuçlar ──────────────────────────────────────────── */}
        {state.step === 4 && calc && cropData && (
          <div className="sp-results">

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
                    <div className="sp-kpi__value" style={{ color: '#f59e0b' }}>-%{calc.verimArtisi.toFixed(0)}</div>
                    <div className="sp-kpi__unit">sulamasız</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #f59e0b' }}>
                  <strong>💡 Öneri:</strong> Bu ürün için en az <strong>damla sulama</strong> sistemi kurulması önerilir.
                  Damla sulama ile su kullanımı %30-50 azalır ve verim %{calc.verimArtisi.toFixed(0)} artabilir.
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
                İl bazlı uzun yıl iklim istatistikleriyle hesaplanmıştır (statik veri tablosu, canlı MGM verisi değildir).
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
            {calc.verimArtisi > 0 && (
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
