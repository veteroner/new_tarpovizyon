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
/* Panel oturumu — TOTP ile alınan kısa ömürlü jeton (8 saat). Sabit
   anahtardan farkı: sızarsa kendiliğinden ölüyor. */
const PANEL_DEPO = 'tarpovizyon_panel_oturum';
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

export function panelJetonuOku(): string {
  try { return localStorage.getItem(PANEL_DEPO) ?? ''; } catch { return ''; }
}

export function panelJetonuYaz(v: string): void {
  try {
    if (v) localStorage.setItem(PANEL_DEPO, v); else localStorage.removeItem(PANEL_DEPO);
  } catch { /* yoksay */ }
}

function basliklar(): Record<string, string> {
  const panel = panelJetonuOku();
  const anahtar = anahtarOku();
  const otp = otpOku();
  return {
    'Content-Type': 'application/json',
    /* Panel jetonu ÖNCE: sunucu da onu ilk deniyor. Diğer ikisi TOTP
       kurulana kadar duran geçiş yolları. */
    ...(panel ? { 'x-panel-oturum': panel } : {}),
    ...(anahtar ? { 'x-admin-key': anahtar } : {}),
    ...(otp ? { 'x-admin-otp': otp } : {}),
  };
}

/* ── Panel girişi ────────────────────────────────────────────────────────── */

export async function panelGiris(g: { kod?: string; anahtar?: string }): Promise<void> {
  const s = await cagir<{ jeton: string }>('admin/panel-giris', {
    method: 'POST', body: JSON.stringify(g),
  });
  panelJetonuYaz(s.jeton);
}

export async function panelCikis(): Promise<void> {
  try { await cagir('admin/panel-cikis', { method: 'POST' }); } catch { /* yerelden yine sil */ }
  panelJetonuYaz('');
}

/**
 * Panel oturumu SUNUCUDA geçerli mi.
 *
 * ─── NEDEN YEREL KONTROL YETMİYORDU ─────────────────────────────────────────
 * Önceki hali `Boolean(panelJetonuOku())` idi: localStorage'da herhangi bir
 * dize varsa kabuk açılıyordu. Uydurma bir değer yazan biri veriye erişemiyordu
 * (uçlar 401 döndürüyor) ama panelin VARLIĞINI, dört sekmenin adını ve hangi
 * işlemlerin bulunduğunu görebiliyordu — kapıyı kurma sebebinin tam tersi.
 * Ölçüldü: `tamamen-uydurma-bir-dize` ile canlıda kabuk çizildi.
 *
 * Ayrıca süresi dolmuş jeton da yerelde "var" görünüyordu; kullanıcı paneli
 * açık sanıp her isteğinde 401 alıyordu.
 *
 * Jeton yoksa AĞA HİÇ ÇIKILMIYOR: sonuç belli, istek israf.
 */
export async function panelGecerliMi(): Promise<boolean> {
  if (!panelJetonuOku()) return false;
  try {
    await cagir('admin/panel-ben');
    return true;
  } catch {
    /* Geçersiz ya da süresi dolmuş — yerel kalıntıyı da temizle ki bir daha
       sorulmasın. */
    panelJetonuYaz('');
    return false;
  }
}

export const panelHatasi = (e: unknown): string => {
  const x = e as { kod?: string; http?: number; ek?: { dakika?: number; totpKurulu?: boolean } };
  if (x?.kod === 'cok_fazla_deneme') {
    return `Çok fazla hatalı deneme. ${x.ek?.dakika ?? 10} dakika sonra tekrar deneyin.`;
  }
  if (x?.kod === 'gecersiz' || x?.http === 401) {
    return x.ek?.totpKurulu === false
      ? 'Kod doğrulanamadı. Doğrulama uygulaması henüz kurulmamış olabilir — anahtar ile girin.'
      : 'Kod geçersiz.';
  }
  if (x?.http === 403) return 'Bu adresten yönetim isteği kabul edilmiyor.';
  return 'Giriş yapılamadı. Lütfen tekrar deneyin.';
};

async function cagir<T>(yol: string, secenek: RequestInit = {}): Promise<T> {
  const y = await fetch(`${API_TABAN}/api/${yol}`, {
    ...secenek,
    headers: { ...basliklar(), ...(secenek.headers ?? {}) },
  });
  const govde = await y.json().catch(() => ({}));
  if (!y.ok) {
    /* Gövde de taşınıyor: hata mesajını yararlı kılan ayrıntılar orada
       (`totpKurulu`, `dakika`, `alanlar`). */
    throw Object.assign(new Error(govde?.hata ?? 'hata'),
      { kod: govde?.hata, http: y.status, ek: govde });
  }
  return govde as T;
}

/* ── Ayarlar ─────────────────────────────────────────────────────────────── */

export type Ayarlar = {
  fiyat_aylik?: string;
  fiyat_yillik?: string;
  deneme_gun?: string;
  /** '1' → iyzico plan kodları tanımlı, ödeme akışı açık. Plan kodlarının
   *  kendisi DIŞARI ÇIKMIYOR; bu yalnız türetilmiş bir bayrak. */
  odeme_hazir?: string;
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
