#!/usr/bin/env node
/**
 * Yönetici TOTP sırrını ÜRETİR — ekrana basar, hiçbir yere yazmaz.
 *
 * Çıktıdaki sırrı iki yere koyacaksın:
 *   1. Masaüstündeki kimlik doğrulayıcıya (Apple Şifreler, 1Password, Authy…)
 *      — otpauth:// bağlantısını yapıştırman yeterli.
 *   2. Worker secret'ına:  wrangler secret put ADMIN_TOTP_SECRET
 *
 * Sır hiçbir dosyaya yazılmıyor; bu betik yalnızca rastgele üretiyor. Terminal
 * geçmişinde kalmasın diye kapatmadan önce ekranı temizle (Cmd+K).
 */

import { randomBytes } from 'node:crypto';

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Baytları base32'ye (RFC 4648, padding'siz) çevirir. */
function base32Yaz(baytlar) {
  let bit = 0;
  let deger = 0;
  let cikti = '';
  for (const b of baytlar) {
    deger = (deger << 8) | b;
    bit += 8;
    while (bit >= 5) {
      bit -= 5;
      cikti += ABC[(deger >> bit) & 31];
    }
  }
  if (bit > 0) cikti += ABC[(deger << (5 - bit)) & 31];
  return cikti;
}

// 20 bayt = 160 bit: RFC 4226'nın önerdiği HMAC-SHA1 anahtar uzunluğu.
const sir = base32Yaz(randomBytes(20));
const hesap = encodeURIComponent('TarpoVizyon yönetici');
const yayinci = encodeURIComponent('TarpoVizyon');
const url = `otpauth://totp/${yayinci}:${hesap}?secret=${sir}&issuer=${yayinci}&algorithm=SHA1&digits=6&period=30`;

console.log(`
SIR (base32):
  ${sir}

Kimlik doğrulayıcıya eklemek için bu bağlantıyı yapıştır:
  ${url}

Sonra Worker'a kur (sırrı istendiğinde yapıştır):
  cd workers/tarpovizyon-api && npx wrangler secret put ADMIN_TOTP_SECRET

Kod çalıştığını doğruladıktan SONRA sabit anahtarı kapat:
  npx wrangler secret delete ADMIN_KEY

Bu çıktı hiçbir dosyaya yazılmadı. İşin bitince terminali temizle (Cmd+K).
`);
