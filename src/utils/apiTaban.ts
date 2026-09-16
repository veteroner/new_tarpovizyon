/**
 * Worker API'sinin tabanı — TEK YER.
 *
 * ─── NEDEN workers.dev'E DOĞRUDAN GİDİLMİYOR ────────────────────────────────
 * Bazı ağlar *.workers.dev adlarını SNI'ye bakarak kesiyor. 16 Eylül 2026'da
 * ölçüldü: aynı Cloudflare IP'sine SNI "example.com" ile TLS 1.2 kuruluyor,
 * SNI "tarpovizyon-api.veteroner.workers.dev" ile WRONG_VERSION_NUMBER dönüyor.
 * Cloudflare'da olay yoktu; Pro sayfaları "Veriler yükleniyor…"da kaldı.
 *
 * İstekler Netlify vekilinden (`/_w/*`, netlify.toml) geçiyor: tarayıcı yalnız
 * kendi alan adına bağlanıyor, workers.dev'e Netlify sunucusu gidiyor. Aynı
 * kökende olduğu için CORS ön kontrolü de hiç oluşmuyor.
 *
 * ─── ORTAM DEĞİŞKENİ NEDEN NETLIFY'DA YOK SAYILIYOR ─────────────────────────
 * `VITE_TARPOVIZYON_BASIC_API` derleme ortamında workers.dev'e ayarlıysa tüm
 * düzeltme sessizce etkisiz kalırdı (VITE_ değişkeni pakete gömülüyor). Netlify
 * alan adlarında vekil her koşulda kazanıyor; değişken yalnız yerel/başka
 * ortamlarda geçerli.
 *
 * Capacitor (capacitor://localhost) ve yerel geliştirme göreli yol kullanamaz,
 * mutlak Pro adresindeki vekile gidiyor.
 */

const NETLIFY_ALANLARI = new Set(['pro.tarpovizyon.com', 'www.tarpovizyon.com', 'tarpovizyon.com']);
const VEKIL = 'https://pro.tarpovizyon.com/_w';

export function apiTaban(ortam?: string): string {
  if (typeof window !== 'undefined' && NETLIFY_ALANLARI.has(window.location.hostname)) {
    return `${window.location.origin}/_w`;
  }
  return ortam || VEKIL;
}
