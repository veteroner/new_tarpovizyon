/**
 * TOTP doğrulama (RFC 6238) — yönetici girişi için tek seferlik kod.
 *
 * ─── NEDEN SABİT ANAHTARIN YERİNE ───────────────────────────────────────────
 * `ADMIN_KEY` kalıcı bir kimlik bilgisiydi ve tarayıcının localStorage'ında
 * duruyordu: bir kez sızarsa süresiz geçerli, iptal etmek için Worker secret'ı
 * değiştirmek gerekiyordu. TOTP'de paylaşılan sır sunucuda kalıyor, ağdan
 * yalnızca 30 saniye ömürlü 6 haneli kod geçiyor.
 *
 * ─── SIR NASIL ÜRETİLİR ─────────────────────────────────────────────────────
 * Sırrı KULLANICI üretiyor ve iki yere koyuyor: kimlik doğrulayıcı
 * uygulamasına (Apple Şifreler, 1Password, Authy…) ve Worker secret'ına
 * (`wrangler secret put ADMIN_TOTP_SECRET`). Sır hiçbir dosyada durmuyor.
 *
 * ─── BİLİNEN SINIR ──────────────────────────────────────────────────────────
 * Aynı kod 30 sn'lik pencere içinde tekrar kullanılabilir (replay). Bunu
 * engellemek için kullanılmış kodları saklamak gerekir (KV/Durable Object).
 * Bu uç kimlik doğrulamalı bir yönetim ucu ve saldırganın kodu 30 sn içinde
 * yakalayıp kullanması gerekir; mevcut risk profilinde kabul edildi.
 */

/** Base32 (RFC 4648, padding'siz) → bayt dizisi. */
function base32Coz(s) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const temiz = String(s).toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  let bit = 0;
  let deger = 0;
  const cikti = [];
  for (const ch of temiz) {
    const i = abc.indexOf(ch);
    if (i < 0) throw new Error('Geçersiz base32 karakteri');
    deger = (deger << 5) | i;
    bit += 5;
    if (bit >= 8) {
      bit -= 8;
      cikti.push((deger >> bit) & 0xff);
    }
  }
  return new Uint8Array(cikti);
}

/** Verilen zaman adımı için 6 haneli kod. */
async function kodUret(secretBaytlar, adim) {
  // Sayaç 8 baytlık big-endian.
  const sayac = new ArrayBuffer(8);
  const gorunum = new DataView(sayac);
  gorunum.setUint32(0, Math.floor(adim / 2 ** 32));
  gorunum.setUint32(4, adim >>> 0);

  const anahtar = await crypto.subtle.importKey(
    'raw', secretBaytlar, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const imza = new Uint8Array(await crypto.subtle.sign('HMAC', anahtar, sayac));

  // RFC 4226 dinamik kırpma.
  const ofset = imza[imza.length - 1] & 0x0f;
  const ikili = ((imza[ofset] & 0x7f) << 24)
    | ((imza[ofset + 1] & 0xff) << 16)
    | ((imza[ofset + 2] & 0xff) << 8)
    | (imza[ofset + 3] & 0xff);
  return String(ikili % 1_000_000).padStart(6, '0');
}

/** Sabit süreli karşılaştırma — kod tahmininde zamanlama sızıntısı olmasın. */
function esit(a, b) {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/**
 * Kodu doğrular.
 *
 * `pencere = 1`: bir önceki ve bir sonraki 30 sn adımı da kabul ediliyor —
 * kullanıcının saati birkaç saniye kaysa da kod geçerli olsun diye. Bu
 * standart uygulama (toplam ~90 sn geçerlilik).
 */
export async function totpDogrula(secretBase32, kod, pencere = 1) {
  const temizKod = String(kod ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(temizKod)) return false;

  let baytlar;
  try {
    baytlar = base32Coz(secretBase32);
  } catch {
    return false;
  }
  if (baytlar.length === 0) return false;

  const simdikiAdim = Math.floor(Date.now() / 1000 / 30);
  for (let d = -pencere; d <= pencere; d++) {
    // eslint-disable-next-line no-await-in-loop
    const beklenen = await kodUret(baytlar, simdikiAdim + d);
    if (esit(beklenen, temizKod)) return true;
  }
  return false;
}
