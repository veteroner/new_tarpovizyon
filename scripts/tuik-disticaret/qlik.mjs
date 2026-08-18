/**
 * TÜİK dış ticaret — Qlik Engine'e gerçek tarayıcı üzerinden bağlanma katmanı.
 *
 * ─── NEDEN TARAYICI ─────────────────────────────────────────────────────────
 * TÜİK'in belgelenmiş SDMX servisinde (nsiws.tuik.gov.tr, 406 veri akışı) mal
 * ticareti ürün×ülke kırılımıyla YAYIMLANMIYOR; ticaret başlıklı 27 akışın
 * hepsi endeks. Ayrıntılı veri yalnızca bi.tuik.gov.tr'deki Qlik Sense
 * uygulamasında.
 *
 * Qlik'in kendi API'si var (Engine, WebSocket üstünde JSON-RPC) ve anonim
 * erişim açık, ama düz Node `ws` istemcisiyle WebSocket upgrade 403 dönüyor:
 * anon çerez, Origin/Referer, xrfkey — hepsi denendi. Gerçek tarayıcıda
 * çalışıyor. Bu yüzden Playwright: Chromium oturumu açıyor, sorguları sayfanın
 * içinden Qlik API'siyle yapıyoruz. Kazıma değil — uygulamanın kendi API'si,
 * yalnızca çağıran taraf tarayıcı.
 *
 * ─── KIRILGANLIK ────────────────────────────────────────────────────────────
 * TÜİK uygulamayı değiştirirse burası kırılır. Bu yüzden her adımda ne
 * beklediğimizi açıkça doğruluyor ve hata veriyoruz; sessizce boş veri
 * yazmıyoruz.
 */

import { chromium } from 'playwright';

export const MASHUP = 'https://bi.tuik.gov.tr/extensions/tuik-mashup/index.html?report_type=2';

/*
 * ─── HANGİ TİCARET SİSTEMİ ──────────────────────────────────────────────────
 * TÜİK aynı veriyi iki sistemde yayımlıyor ve rakamlar FARKLI:
 *
 *   Genel Ticaret Sistemi — serbest bölge/antrepo hareketleri DAHİL
 *   Özel  Ticaret Sistemi — bunlar HARİÇ (daha küçük)
 *
 * D1'deki tarihsel veri GENEL'den geliyor. Ölçüldü — 2025-05, her iki tablo,
 * ihracat ve ithalat: GENEL %0,00 (birebir), ÖZEL bitkiselde %-18,7,
 * hayvansalda %-8,3 sapıyor. Yanlış uygulamayı seçmek hata vermez, sadece
 * sistematik olarak düşük değer yazar — bu yüzden varsayılan burada sabit.
 */
export const APP_GENEL_TR = 'bd4b4757-a3c9-45ba-b4fb-5c8d7e2d2c42';
export const APP_OZEL_TR = '8db826a9-59f2-4a33-a91e-88ca417dddf9';
/** Çekimde kullanılan uygulama. */
export const APP = APP_GENEL_TR;

/**
 * Tarayıcıyı açar, mashup'ı yükler ve Qlik API'sini hazır hale getirir.
 * Dönen `calis(fn, ...args)` verilen işlevi SAYFA İÇİNDE çalıştırır.
 */
export async function qlikOturum({ gorunur = false } = {}) {
  const tarayici = await chromium.launch({ headless: !gorunur });
  const baglam = await tarayici.newContext({
    locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const sayfa = await baglam.newPage();

  await sayfa.goto(MASHUP, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  // qlik.js RequireJS ile yükleniyor; hazır olana kadar bekle.
  await sayfa.waitForFunction(() => typeof window.require === 'function', { timeout: 60_000 });
  await sayfa.evaluate(() => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('js/qlik 60 sn içinde yüklenmedi')), 60_000);
    window.require(['js/qlik'], (q) => { clearTimeout(t); window.__qlik = q; res(); });
  }));

  return {
    sayfa,
    async kapat() { await tarayici.close(); },
    /** Sayfa içinde çalıştırır; `window.__qlik` hazır. */
    calis: (fn, arg) => sayfa.evaluate(fn, arg),
  };
}

/**
 * Sayfa içinde bir uygulama açar ve hazır olmasını bekler.
 * Qlik'in geri çağırmalı (callback) API'sini söz verilerine (promise) sarıyor.
 */
export const SAYFA_ICI_YARDIMCILAR = `
  window.__uygulamaAc = (id) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('uygulama açılmadı: ' + id)), 60000);
    const app = window.__qlik.openApp(id, {});
    // openApp senkron bir nesne döndürüyor; bağlantı kurulduğunda global hazır olur.
    const dene = (kalan) => {
      app.getAppLayout((l) => { clearTimeout(t); res(app); });
      if (kalan <= 0) return;
      setTimeout(() => dene(kalan - 1), 500);
    };
    dene(60);
  });
`;
