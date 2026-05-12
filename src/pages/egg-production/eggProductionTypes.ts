export type YearPoint = {
  year: number;
  eggsMillion: number;
};

export type TuikTab = 'overview' | 'production' | 'yield' | 'projection';

export type TuikEggData = {
  year: string;
  eggProduction: number;
  layerCount: number;
  yieldPerBird: number;
  nativeLayer: number;
  hybridLayer: number;
  hatchedEggs: number;
};

export type MonthlyEggData = {
  month: string;
  value: number;
};

export type EggEconomicData = {
  tarih: string;
  yumurta_maliyet_tl_kg: number;
  yumurta_uretici_fiyati_tl_kg: number;
  yumurtaci_tavuk_yemi_tl_kg: number;
  tuketici_fiyati_tl: number;
  karlilik: number;
  uretici_fiyati_maliyet_farki_tl_kg: number;
  parite_yumurta_yem_paritesi: number;
};

export function parseTrNumber(input: unknown): number {
  const raw = String(input ?? '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(/\s+/g, '');
  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 0) {
    const n = Number.parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount > 1) {
    const n = Number.parseFloat(normalized.replace(/\./g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount === 1) {
    const [intPart, fracOrGroup] = normalized.split('.');
    if (fracOrGroup?.length === 3) {
      const n = Number.parseFloat(intPart + fracOrGroup);
      return Number.isFinite(n) ? n : 0;
    }
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function extractYear(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const m = raw.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  return Number.parseInt(raw, 10) || 0;
}

export function formatMillion(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
}

export function formatTL(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export type EggTradeData = {
  yil: number;
  ihracat_musd: number;
  ithalat_musd: number;
};

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}
