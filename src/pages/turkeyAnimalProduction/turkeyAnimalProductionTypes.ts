import { kisa, eksen } from '../../utils/sayi';
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
  // null = TÜİK o ayı henüz yayımlamadı (0 DEĞİL — grafikte boşluk olmalı)
  tavuk_yumurtasi_bin_adet: number | null;
  tavuk_eti_ton: number | null;
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

/* Merkezî biçimlendirici: yerel kopya nokta ondalık üretiyordu. */
export const formatValue = (v: number): string => kisa(v);

export const formatShort = (v: number): string => eksen(v);
