// Types
export type YearPoint = {
  year: number;
  totalTon: number;
  cattleTon: number;
  sheepTon: number;
  goatTon: number;
  buffaloTon: number;
  buyukbasToplam: number;
  kucukbasToplam: number;
};

export type EconomicData = {
  tarih: string;
  karkas_paritesi: number;
  besi_yemi_fiyatlari_tl_kg: number;
  dolar_kuru_tl: number;
  besilik_dana_fiyatlari_tl_kg: number;
  dana_karkas_maliyet_tl_kg: number;
  dana_karkas_fiyati_tl_kg: number;
  karlilik: number;
  kuzu_karkas_fiyati_tl_kg: number;
  besilik_kucukbas_fiyatlari_tl_kg: number;
  dana_karkas_fiyat_maliyet_farki_tl_kg: number;
};

export type WorldCarcassPrices = {
  ingiltere: number;
  abd: number;
  ab_27: number;
  yeni_zelanda: number;
  avustralya: number;
  arjantin: number;
  uruguay: number;
  brezilya: number;
  turkiye: number;
};

export type ProductivityComparison = {
  ulke: string;
  karkas_verimi: number;
};

export type CarcassWeightData = {
  ulke: string;
  karkas_verimi_kg: number;
};

export type ConsumptionData = {
  kirmizi_et_tuketimi_kg: number;
  yumurta_tuketimi_adet: number;
  pilic_eti_kg: number;
  bal_tuketimi_kg: number;
};

export type ConsumptionComparison = {
  ulke: string;
  kanatli_eti: number;
  sigir_eti: number;
  koyun_keci_eti: number;
  domuz_eti: number;
  balik_ve_deniz_urunleri: number;
  diger_etler: number;
};

export type ImportData = {
  yil: string;
  karkas_et_ithalati_ton: number;
  besilik_sigir_bas: number;
  besilik_kesimlik_kucukbas_sayisi_bas: number;
  toplam_ithalata_odenen_dolar: number;
};

export type WorldRankings = {
  cattle: { world: number; eu: number };
  sheep: { world: number; eu: number };
  goat: { world: number; eu: number };
};

export type ImportAnalytics = {
  latest: {
    carcass: number;
    cattle: number;
    smallRuminant: number;
    spending: number;
    year: string;
  };
  yoy: {
    carcass: number;
    cattle: number;
    smallRuminant: number;
    spending: number;
  } | null;
  averages: {
    carcass: number;
    cattle: number;
    smallRuminant: number;
    spending: number;
  };
  cagr: {
    carcass: number;
    cattle: number;
    smallRuminant: number;
    spending: number;
  };
  unitCost: number;
};

// Constants
export const MEAT_COLORS: Record<string, string> = {
  'Sığır': '#c0392b',
  'Koyun': '#e67e22',
  'Keçi': '#16a085',
  'Manda': '#8e44ad',
  'Büyükbaş': '#3b82f6',
  'Küçükbaş': '#f59e0b'
};

// Helpers
export function extractYear(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const m = raw.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  return Number.parseInt(raw, 10) || 0;
}

export function formatTon(value: number): string {
  if (value >= 1e6) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1e6) + ' M ton';
  if (value >= 1e3) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + ' ton';
}

export function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);
}
