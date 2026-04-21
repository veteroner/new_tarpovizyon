// ── Types & Constants for GubreHesapPage ─────────────────────────────────────

export interface CropNutrientData {
  ad: string;
  emoji: string;
  n: number;
  p2o5: number;
  k2o: number;
  fe: number;
  zn: number;
  mn: number;
  b: number;
  ph_min: number;
  ph_max: number;
  stage_early: number;
  stage_mid: number;
  stage_late: number;
  notes: string;
}

export interface SoilAnalysis {
  n: number;
  p2o5: number;
  k2o: number;
  ph: number;
  organik_madde: number;
}

export interface FertilizerProduct {
  ad: string;
  tip: 'kimyasal' | 'organik';
  n: number;
  p: number;
  k: number;
  fiyat_kg: number;
  uygulama: string;
}

export interface WizardState {
  il: string;
  alan: number;
  urun: string;
  hedef_verim: number;
  toprak: SoilAnalysis | null;
  gubre_tipi: 'kimyasal' | 'organik' | 'her_ikisi';
  senaryo: 'tutucu' | 'standart' | 'agresif';
}

export interface CalcResult {
  ihtiyac: { n: number; p2o5: number; k2o: number };
  eksik: { n: number; p2o5: number; k2o: number };
  mikroIhtiyac: { fe: number; zn: number; mn: number; b: number };
  alan: number;
  oneriler: {
    kimyasal: Array<{ urun: string; miktar: number; fiyat: number }>;
    organik: Array<{ urun: string; miktar: number; fiyat: number }>;
  };
  uygulama_takvimi: Array<{ donem: string; hafta: string; n: number; p: number; k: number; notlar: string }>;
  toplam_maliyet_kimyasal: number;
  toplam_maliyet_organik: number;
  ph_uyari?: string;
  chartData: Array<{ name: string; ihtiyac: number; toprak: number; eksik: number }>;
}

// ── Crop Nutrient Database ────────────────────────────────────────────────────

export const CROP_NUTRIENT_DB: Record<string, CropNutrientData> = {
  bugday:       { ad: 'Buğday',        emoji: '🌾', n: 3.0, p2o5: 1.2, k2o: 2.5, fe: 0.05, zn: 0.008, mn: 0.006, b: 0.003, ph_min: 6.0, ph_max: 7.5, stage_early: 20, stage_mid: 60, stage_late: 20, notes: 'Üre veya amonyum nitrat ile 2-3 parselde N uygulaması etkilidir.' },
  arpa:         { ad: 'Arpa',          emoji: '🌿', n: 2.5, p2o5: 1.0, k2o: 2.0, fe: 0.04, zn: 0.007, mn: 0.005, b: 0.002, ph_min: 6.0, ph_max: 7.5, stage_early: 20, stage_mid: 55, stage_late: 25, notes: 'Buğdaya benzer; serin iklimlerde N ihtiyacı daha düşük olabilir.' },
  misir:        { ad: 'Mısır',         emoji: '🌽', n: 3.5, p2o5: 1.5, k2o: 3.0, fe: 0.06, zn: 0.012, mn: 0.008, b: 0.004, ph_min: 5.8, ph_max: 7.0, stage_early: 15, stage_mid: 65, stage_late: 20, notes: 'Çinko eksikliğine hassas; kireçli topraklarda ZnSO₄ önleyin.' },
  domates:      { ad: 'Domates',       emoji: '🍅', n: 2.5, p2o5: 1.0, k2o: 3.5, fe: 0.08, zn: 0.010, mn: 0.009, b: 0.005, ph_min: 6.0, ph_max: 7.0, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Meyve döneminde K kritik; kalsiyum eksikliği çiçek çürümesine yol açar.' },
  biber:        { ad: 'Biber',         emoji: '🌶️', n: 2.2, p2o5: 0.9, k2o: 3.0, fe: 0.07, zn: 0.009, mn: 0.008, b: 0.004, ph_min: 6.0, ph_max: 7.0, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Düzenli hafif sulama ile besin alımı optimize edilir.' },
  patates:      { ad: 'Patates',       emoji: '🥔', n: 3.0, p2o5: 1.5, k2o: 5.0, fe: 0.06, zn: 0.010, mn: 0.007, b: 0.004, ph_min: 5.5, ph_max: 6.5, stage_early: 15, stage_mid: 55, stage_late: 30, notes: 'Yüksek K ihtiyacı var; K₂SO₄ tercih edin (klorüre hassas).' },
  sogan:        { ad: 'Soğan',         emoji: '🧅', n: 2.0, p2o5: 1.0, k2o: 2.5, fe: 0.05, zn: 0.008, mn: 0.006, b: 0.004, ph_min: 6.0, ph_max: 7.0, stage_early: 25, stage_mid: 50, stage_late: 25, notes: 'Bor eksikliğinde soğan kalitesi düşer; erken dönem P önemli.' },
  pamuk:        { ad: 'Pamuk',         emoji: '🌸', n: 3.5, p2o5: 1.5, k2o: 3.5, fe: 0.07, zn: 0.012, mn: 0.009, b: 0.006, ph_min: 6.0, ph_max: 8.0, stage_early: 10, stage_mid: 60, stage_late: 30, notes: 'Bor çiçeklenme için kritik; yüksek pH\'da demir klorosis görülür.' },
  aycicegi:     { ad: 'Ayçiçeği',      emoji: '🌻', n: 3.0, p2o5: 1.3, k2o: 4.0, fe: 0.06, zn: 0.010, mn: 0.007, b: 0.005, ph_min: 6.0, ph_max: 7.5, stage_early: 20, stage_mid: 55, stage_late: 25, notes: 'Bor çiçek tokmarına kritik; yüksek K leke hastalığını azaltır.' },
  seker_pancari:{ ad: 'Şeker Pancarı', emoji: '🟤', n: 2.5, p2o5: 1.0, k2o: 3.5, fe: 0.05, zn: 0.008, mn: 0.006, b: 0.006, ph_min: 6.5, ph_max: 7.5, stage_early: 15, stage_mid: 55, stage_late: 30, notes: 'Bor kritik; klorür toleransı yüksek, MOP kullanılabilir.' },
  salatalik:    { ad: 'Salatalık',     emoji: '🥒', n: 2.0, p2o5: 0.8, k2o: 3.0, fe: 0.07, zn: 0.009, mn: 0.008, b: 0.004, ph_min: 6.0, ph_max: 7.0, stage_early: 20, stage_mid: 55, stage_late: 25, notes: 'Sık sulanan topraklarda N yıkanması riski; bölünmüş uygulama yapın.' },
  kavun:        { ad: 'Kavun',         emoji: '🍈', n: 2.0, p2o5: 0.9, k2o: 3.5, fe: 0.06, zn: 0.009, mn: 0.007, b: 0.004, ph_min: 6.0, ph_max: 7.0, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Meyve dolgusunda K ve Ca artırın; amonyum N önerilmez.' },
  karpuz:       { ad: 'Karpuz',        emoji: '🍉', n: 1.8, p2o5: 0.8, k2o: 3.0, fe: 0.05, zn: 0.008, mn: 0.007, b: 0.004, ph_min: 6.0, ph_max: 7.0, stage_early: 15, stage_mid: 55, stage_late: 30, notes: 'Meyve olgunlaşmasında K miktarını artırın.' },
  uzum:         { ad: 'Üzüm',          emoji: '🍇', n: 1.5, p2o5: 0.6, k2o: 2.5, fe: 0.06, zn: 0.010, mn: 0.008, b: 0.004, ph_min: 5.5, ph_max: 7.0, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Çiçeklenme öncesi B uygulaması dökümü azaltır.' },
  elma:         { ad: 'Elma',          emoji: '🍎', n: 1.8, p2o5: 0.6, k2o: 2.0, fe: 0.08, zn: 0.010, mn: 0.008, b: 0.005, ph_min: 5.5, ph_max: 7.0, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Kireçli topraklarda Fe ve Mn klorosis yaygın; şelatlar kullanın.' },
  zeytin:       { ad: 'Zeytin',        emoji: '🫒', n: 1.2, p2o5: 0.4, k2o: 1.5, fe: 0.04, zn: 0.006, mn: 0.005, b: 0.003, ph_min: 6.0, ph_max: 8.5, stage_early: 20, stage_mid: 50, stage_late: 30, notes: 'Düşük besin ihtiyacı; aşırı N verimli dal büyümesini artırır.' },
};

// ── Fertilizer Product Database ───────────────────────────────────────────────

export const FERTILIZER_PRODUCTS: FertilizerProduct[] = [
  // Kimyasal
  { ad: 'Üre (46-0-0)',          tip: 'kimyasal', n: 46, p: 0,  k: 0,  fiyat_kg: 18, uygulama: 'Toprak / Yaprak' },
  { ad: 'Amonyum Sülfat (21-0-0)',tip: 'kimyasal', n: 21, p: 0,  k: 0,  fiyat_kg: 14, uygulama: 'Toprak' },
  { ad: 'Amonyum Nitrat (33-0-0)',tip: 'kimyasal', n: 33, p: 0,  k: 0,  fiyat_kg: 16, uygulama: 'Toprak' },
  { ad: 'DAP (18-46-0)',          tip: 'kimyasal', n: 18, p: 46, k: 0,  fiyat_kg: 24, uygulama: 'Toprak' },
  { ad: 'TSP (0-46-0)',           tip: 'kimyasal', n: 0,  p: 46, k: 0,  fiyat_kg: 20, uygulama: 'Toprak' },
  { ad: 'Potasyum Sülfat (0-0-50)',tip: 'kimyasal', n: 0,  p: 0,  k: 50, fiyat_kg: 26, uygulama: 'Toprak' },
  { ad: 'Potasyum Klorür (0-0-60)',tip: 'kimyasal', n: 0,  p: 0,  k: 60, fiyat_kg: 20, uygulama: 'Toprak' },
  { ad: 'NPK 15-15-15',           tip: 'kimyasal', n: 15, p: 15, k: 15, fiyat_kg: 20, uygulama: 'Toprak' },
  { ad: 'NPK 20-20-0',            tip: 'kimyasal', n: 20, p: 20, k: 0,  fiyat_kg: 22, uygulama: 'Toprak' },

  // Organik
  { ad: 'Ahır Gübresi',           tip: 'organik',  n: 0.5, p: 0.3, k: 0.5, fiyat_kg: 2,  uygulama: 'Toprak altı' },
  { ad: 'Tavuk Gübresi',          tip: 'organik',  n: 1.5, p: 1.0, k: 0.8, fiyat_kg: 4,  uygulama: 'Toprak altı' },
  { ad: 'Koyun Gübresi',          tip: 'organik',  n: 0.9, p: 0.5, k: 0.8, fiyat_kg: 3,  uygulama: 'Toprak altı' },
  { ad: 'Kompost',                tip: 'organik',  n: 1.0, p: 0.5, k: 1.0, fiyat_kg: 3,  uygulama: 'Toprak karıştırma' },
  { ad: 'Solucan Gübresi',        tip: 'organik',  n: 2.0, p: 1.0, k: 1.5, fiyat_kg: 8,  uygulama: 'Toprak/Yaprak' },
  { ad: 'Organik NPK (4-2-3)',    tip: 'organik',  n: 4,   p: 2,   k: 3,   fiyat_kg: 12, uygulama: 'Toprak' },
];
