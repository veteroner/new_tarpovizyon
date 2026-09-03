/**
 * Türkçe sayı biçimlendirme — TEK KAYNAK.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Uygulamada 1.333 `toFixed(` çağrısına karşılık 128 `toLocaleString('tr')`
 * vardı. `toFixed` NOKTA ondalık üretiyor; Türkçede nokta BİNLİK ayırıcı. Aynı
 * ekranda yan yana duruyorlardı:
 *
 *     TÜRKİYE TOPLAMI   14.19 Milyon     ← nokta = ondalık
 *     KANATLI          389.186.697       ← nokta = binlik
 *
 * Türkçe okuyan biri için "14.19" ondört bin yüz doksan da olabilir, ondört
 * virgül on dokuz da. Rakam satan bir üründe en ucuz ve en ağır hata.
 *
 * ─── İKİNCİ HATA: NEGATİF SAYILAR ───────────────────────────────────────────
 * Eski biçimlendiricilerin hepsi `if (value >= 1e6)` diye yazılmıştı; -14
 * milyon bu eşiklerin hiçbirine girmiyor ve "-14000000" olarak basılıyordu.
 * Burada işaret ayrılıp büyüklük üzerinden karar veriliyor.
 *
 * ─── ÜÇ AYRI SON EK GELENEĞİ BİRLEŞTİ ───────────────────────────────────────
 * Kodda "Milyar/Milyon/Bin", "Mly/Mln/Bin" ve "B/M/K" (İngilizce Billion ile
 * Türkçe Bin aynı harf!) bir aradaydı. İkiye indi:
 *   `kisa()`  → KPI kartları için uzun:  "14,19 Milyon"
 *   `eksen()` → grafik ekseni için dar:  "14,2 Mn"
 */

const BICIM = new Map<string, Intl.NumberFormat>();

/** Aynı seçeneklerle tekrar tekrar `Intl.NumberFormat` kurmak pahalı. */
function bicim(min: number, max: number): Intl.NumberFormat {
  const k = `${min}:${max}`;
  let f = BICIM.get(k);
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: min, maximumFractionDigits: max,
    });
    BICIM.set(k, f);
  }
  return f;
}

/** Ham sayı, Türkçe ayırıcılarla. `sayi(1234.5, 1)` → "1.234,5" */
export function sayi(deger: number, ondalik = 0): string {
  if (!Number.isFinite(deger)) return '—';
  return bicim(ondalik, ondalik).format(deger);
}

type KisaSecenek = {
  /** Sonuna eklenecek birim: `kisa(x, { birim: 'ton' })` → "14,19 Milyon ton" */
  birim?: string;
  /** Para birimi öne/arkaya: `{ para: '$' }` → "14,19 Milyar $" */
  para?: string;
};

/**
 * KPI kartları için uzun biçim.
 *
 *   kisa(14187000)            → "14,19 Milyon"
 *   kisa(389186697)           → "389,19 Milyon"
 *   kisa(-2340, {birim:'ton'})→ "-2,3 Bin ton"
 */
export function kisa(deger: number, s: KisaSecenek = {}): string {
  if (!Number.isFinite(deger)) return '—';
  const ek = (g: string) => g + (s.para ? ` ${s.para}` : '') + (s.birim ? ` ${s.birim}` : '');
  const isaret = deger < 0 ? '-' : '';
  const b = Math.abs(deger);

  if (b >= 1e12) return ek(`${isaret}${sayi(b / 1e12, 2)} Trilyon`);
  if (b >= 1e9) return ek(`${isaret}${sayi(b / 1e9, 2)} Milyar`);
  if (b >= 1e6) return ek(`${isaret}${sayi(b / 1e6, 2)} Milyon`);
  if (b >= 1e3) return ek(`${isaret}${sayi(b / 1e3, 1)} Bin`);
  return ek(`${isaret}${sayi(b, b % 1 === 0 ? 0 : 1)}`);
}

/**
 * Grafik ekseni ve etiketi için dar biçim. Eksende yer dar, ondalık tek hane.
 *
 *   eksen(14187000) → "14,2 Mn"      eksen(2340) → "2,3 B"
 *
 * "B" = Bin, "Mn" = Milyon, "Mr" = Milyar. Eski koddaki "B"nin İngilizce
 * Billion anlamında da kullanılması, milyar ile bini aynı harfe bindiriyordu.
 */
export function eksen(deger: number): string {
  if (!Number.isFinite(deger)) return '';
  const isaret = deger < 0 ? '-' : '';
  const b = Math.abs(deger);

  if (b >= 1e12) return `${isaret}${sayi(b / 1e12, 1)} Tr`;
  if (b >= 1e9) return `${isaret}${sayi(b / 1e9, 1)} Mr`;
  if (b >= 1e6) return `${isaret}${sayi(b / 1e6, 1)} Mn`;
  if (b >= 1e3) return `${isaret}${sayi(b / 1e3, 1)} B`;
  return `${isaret}${sayi(b)}`;
}

/**
 * Yüzde. İşareti Türkçe yazımla önde: `%-13,5`, `%1,8`.
 *
 * `artiIsaret` pozitiflerde "+" ister: değişim kartlarında yön okunur olsun.
 */
export function yuzde(deger: number, ondalik = 1, artiIsaret = false): string {
  if (!Number.isFinite(deger)) return '—';
  const on = artiIsaret && deger > 0 ? '+' : '';
  return `%${on}${sayi(deger, ondalik)}`;
}

/** Para. `paraTL(1234.5)` → "1.234,50 ₺" */
export const paraTL = (deger: number, ondalik = 2): string =>
  (Number.isFinite(deger) ? `${sayi(deger, ondalik)} ₺` : '—');

export const paraUSD = (deger: number, ondalik = 2): string =>
  (Number.isFinite(deger) ? `${sayi(deger, ondalik)} $` : '—');
