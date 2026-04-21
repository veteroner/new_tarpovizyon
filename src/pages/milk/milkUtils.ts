/* ── Types ────────────────────────────────────────────────────────────── */

export type YearPoint = {
  year: number;
  totalTon: number;
  cattleTon: number;
  sheepTon: number;
  goatTon: number;
};

export type MilkEconomicData = {
  tarih: string;
  misir_silaji: number;
  yonca: number;
  saman: number;
  sut_yemi_19_hp: number;
  cig_sut_uretim_maliyeti_tl_lt: number;
  usk_cig_sut_tavsiye_fiyati_tl_lt: number;
  sut_yem_paritesi: number;
  litre_basina_cig_sut_destegi_tl: number;
  sut_yem_paritesi_destek_dahil: number;
  fiyat_maliyet_farki_tl_lt: number;
  fiyat_maliyet_farki_tl_lt_destek_dahil: number;
  karlilik: number;
};

export type IndustrySutData = {
  yil: string;
  inek_sutu_ton: number;
  yagsiz_sut_tozu_ton: number;
  tereyag_ton: number;
  inek_peyniri_ton: number;
  yogurt_ton: number;
  ayran_ton: number;
  icme_sutu_pastorize_uht_vb_ton: number;
};

export type WorldMilkPrices = {
  abd_class_3: number;
  ab_27: number;
  yeni_zelanda: number;
  almanya: number;
  italya: number;
  turkiye: number;
};

export type Productivity = {
  yil: string;
  cig_sut_verimi_lt: number;
};

export type ProductivityComparison = {
  ulke: string;
  karkas_verimi: number;
};

export type TuikSutUrunData = {
  urun: string;
  birim: string;
  yil: number;
  toplam: number;
  aylar: number[];
};

export type WorldRankings = {
  cattle: { world: number; eu: number };
  sheep: { world: number; eu: number };
  goat: { world: number; eu: number };
};

/* ── Constants ────────────────────────────────────────────────────────── */

export const COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981'];

export const TUIK_SUT_URUNLER = [
  { id: 'İnek Sütü', label: 'İnek Sütü', emoji: '🥛', color: '#3b82f6' },
  { id: 'İnek Peyniri', label: 'İnek Peyniri', emoji: '🧀', color: '#f59e0b' },
  { id: 'Yoğurt', label: 'Yoğurt', emoji: '🥣', color: '#10b981' },
  { id: 'Ayran', label: 'Ayran', emoji: '🥤', color: '#06b6d4' },
  { id: 'İçme Sütü', label: 'İçme Sütü', emoji: '🧃', color: '#8b5cf6' },
  { id: 'Tereyağı', label: 'Tereyağı', emoji: '🧈', color: '#eab308' },
  { id: 'Süt Tozu', label: 'Süt Tozu', emoji: '📦', color: '#a855f7' },
  { id: 'Yağsız Süt Tozu', label: 'Yağsız Süt Tozu', emoji: '🧪', color: '#64748b' },
  { id: 'Konsantre Süt', label: 'Konsantre Süt', emoji: '🥫', color: '#ef4444' },
  { id: 'Krema (İşlenmiş)', label: 'Krema', emoji: '🍦', color: '#ec4899' },
  { id: 'Diğer Peynir', label: 'Diğer Peynir', emoji: '🧀', color: '#14b8a6' },
] as const;

export const AY_ADLARI = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;
export const AY_TAM = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;

/* ── Utility Functions ────────────────────────────────────────────────── */

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
