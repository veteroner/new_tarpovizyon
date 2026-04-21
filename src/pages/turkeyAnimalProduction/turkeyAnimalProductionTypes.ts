// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface HistoricalData {
  yillar: string;
  bal_uretimi: number;
  cig_sut_uretimi: number;
  kirmizi_et_uretimi: number;
  yumurta_milyon_adet: number;
  kanatli_eti_ton: number;
}

export interface WorldData {
  ulke: string;
  urun: string;
  uretim_miktari_ton: number;
}

export interface RedMeatData {
  yil: number;
  sigir: number;
  manda: number;
  buyukbas_toplam: number;
  koyun: number;
  keci: number;
  kucukbas_toplam: number;
  toplam: number;
}

export interface PoultryData {
  tarih: string;
  tavuk_yumurtasi_bin_adet: number;
  tavuk_eti_ton: number;
}

export interface CityData {
  il: string;
  sigir: number;
  manda: number;
  koyun: number;
  keci: number;
  balUretimi: number;
  kovan: number;
  balmumu: number;
  etTavugu: number;
  yumurtaTavugu: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const COLORS: Record<string, string> = {
  'Bal': '#f59e0b',
  'Süt': '#3b82f6',
  'Kırmızı Et': '#ef4444',
  'Yumurta': '#fbbf24',
  'Kanatlı': '#10b981',
  'Sığır': '#8b4513',
  'Koyun': '#a0522d',
  'Keçi': '#d2691e',
  'Manda': '#654321',
};

export type MapFilterKey = 'toplam' | 'sigir' | 'manda' | 'koyun' | 'keci' | 'kovan' | 'etTavugu' | 'yumurtaTavugu';

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatValue = (v: number): string =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)} Milyon` :
  v >= 1_000 ? `${(v / 1_000).toFixed(0)} Bin` :
  v.toFixed(0);

export const formatShort = (v: number): string =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} Mln` :
  v >= 1_000 ? `${(v / 1_000).toFixed(0)} Bin` :
  v.toString();
