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
  kaynak: string;
  revizyonTarihi: string;
  varsayim: string;
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
