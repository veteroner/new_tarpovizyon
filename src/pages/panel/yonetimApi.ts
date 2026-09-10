/**
 * Panel → yönetim uçları.
 *
 * ─── ANAHTAR NEREDEN GELİYOR ────────────────────────────────────────────────
 * Mevcut iki yönetim ekranıyla AYNI `localStorage` anahtarını okuyor
 * (`tarpovizyon_admin_key`). Bilerek: yeni bir depo anahtarı uydurmak, aynı
 * panelde sekme değiştirince yeniden giriş istenmesi demekti.
 *
 * TOTP kodu (`x-admin-otp`) da destekleniyor ama şu an sunucuda
 * `ADMIN_TOTP_SECRET` TANIMLI DEĞİL — yani koruma sabit anahtara dayanıyor.
 * Bu, panelin değil dağıtımın bir eksiği; TOTP kurulduğunda buradaki kod
 * değişmeden çalışır.
 */

const API_TABAN = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

const ANAHTAR_DEPO = 'tarpovizyon_admin_key';
const OTP_DEPO = 'tarpovizyon_admin_otp';

export function anahtarOku(): string {
  try { return localStorage.getItem(ANAHTAR_DEPO) ?? ''; } catch { return ''; }
}

export function anahtarYaz(v: string): void {
  try {
    if (v) localStorage.setItem(ANAHTAR_DEPO, v);
    else localStorage.removeItem(ANAHTAR_DEPO);
  } catch { /* saklanamıyorsa oturum bu sekmeyle sınırlı kalır */ }
}

/** Tek seferlik kod bilerek SAKLANMIYOR — otuz saniyede ölüyor zaten. */
export const otpOku = (): string => {
  try { return sessionStorage.getItem(OTP_DEPO) ?? ''; } catch { return ''; }
};
export const otpYaz = (v: string): void => {
  try {
    if (v) sessionStorage.setItem(OTP_DEPO, v); else sessionStorage.removeItem(OTP_DEPO);
  } catch { /* yoksay */ }
};

function basliklar(): Record<string, string> {
  const anahtar = anahtarOku();
  const otp = otpOku();
  return {
    'Content-Type': 'application/json',
    ...(anahtar ? { 'x-admin-key': anahtar } : {}),
    ...(otp ? { 'x-admin-otp': otp } : {}),
  };
}

async function cagir<T>(yol: string, secenek: RequestInit = {}): Promise<T> {
  const y = await fetch(`${API_TABAN}/api/${yol}`, {
    ...secenek,
    headers: { ...basliklar(), ...(secenek.headers ?? {}) },
  });
  const govde = await y.json().catch(() => ({}));
  if (!y.ok) {
    throw Object.assign(new Error(govde?.hata ?? 'hata'), { kod: govde?.hata, http: y.status });
  }
  return govde as T;
}

/* ── Ayarlar ─────────────────────────────────────────────────────────────── */

export type Ayarlar = {
  fiyat_aylik?: string;
  fiyat_yillik?: string;
  deneme_gun?: string;
};

/** Okuma yetkisiz — abonelik sayfası da bunu kullanacak. */
export const ayarOku = () => cagir<Ayarlar>('ayar');

export const ayarYaz = (d: Record<string, string | number>) =>
  cagir<{ kaydedildi: number }>('admin/ayar', { method: 'POST', body: JSON.stringify(d) });

/* ── Aboneler ────────────────────────────────────────────────────────────── */

export type Abone = {
  id: string;
  eposta: string;
  olusma: number;
  sonGiris: number | null;
  durum: string;
  bitis: number | null;
  aktif: boolean;
  kalanGun: number | null;
  acikOturum: number;
};

export const aboneleriOku = () =>
  cagir<{ toplam: number; aktifSayisi: number; aboneler: Abone[] }>('admin/aboneler');

export const abonelikDegistir = (kullaniciId: string, islem: 'uzat' | 'iptal', gun?: number) =>
  cagir<{ durum: string; bitis?: number }>('admin/abonelik', {
    method: 'POST',
    body: JSON.stringify({ kullaniciId, islem, ...(gun ? { gun } : {}) }),
  });

export const yonetimHatasi = (e: unknown): string => {
  const kod = (e as { kod?: string; http?: number })?.kod;
  const http = (e as { http?: number })?.http;
  if (kod === 'yetkisiz' || http === 401) {
    /*
     * Anahtar girişi bu sekmelerde YOK; mevcut iki ekran (Veri Izgarası,
     * Sektör Fiyatları) onu zaten soruyor ve aynı `localStorage` anahtarına
     * yazıyor. Kullanıcıyı oraya yönlendirmek, aynı alanı üçüncü kez
     * çizmekten iyi — iki ayrı yerde anahtar sorulması hangisinin geçerli
     * olduğu sorusunu doğururdu.
     */
    return anahtarOku()
      ? 'Yönetici anahtarı geçersiz.'
      : 'Yönetici anahtarı girilmemiş. "Veri Izgarası" sekmesinden anahtarı girin.';
  }
  if (http === 403) return 'Bu adresten yönetim isteği kabul edilmiyor.';
  if (kod === 'gecersiz_deger') return 'Girilen değer kabul edilebilir aralığın dışında.';
  if (kod === 'gecersiz_gun') return 'Gün sayısı 1–3650 arasında olmalı.';
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
};
