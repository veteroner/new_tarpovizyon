#!/usr/bin/env node
/**
 * Masaüstü TOTP üreteci — TarpoVizyon yönetici girişi.
 *
 * Masaüstündeki "TarpoVizyon Kod.command" dosyasına çift tıklayınca bu çalışır:
 * ekranda büyük punto 6 haneli kod, kaç saniye kaldığı ve otomatik panoya kopya.
 *
 * ─── SIR NEREDE DURUYOR ─────────────────────────────────────────────────────
 * macOS Anahtar Zinciri'nde (`tarpovizyon-totp`). Düz dosyada DURMUYOR; bu
 * betiğin içinde de yok. İlk açılışta sır yoksa burada üretilip Anahtar
 * Zinciri'ne yazılıyor ve bir daha sorulmuyor.
 *
 * Bilinen küçük sınır: Anahtar Zinciri'ne YAZARKEN sır bir anlığına `security`
 * komutunun argümanı oluyor, yani o saniye içinde `ps` ile görülebilir. Tek
 * kullanıcılı bir Mac'te kabul edilebilir; okuma işleminde böyle bir durum yok.
 */

import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const SERVIS = 'tarpovizyon-totp';
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const renk = {
  sifirla: '\x1b[0m', kalin: '\x1b[1m', soluk: '\x1b[2m',
  yesil: '\x1b[38;5;42m', sari: '\x1b[38;5;214m', kirmizi: '\x1b[38;5;203m',
  gri: '\x1b[38;5;245m',
};

/* ─── base32 ──────────────────────────────────────────────────────────────── */

function base32Yaz(baytlar) {
  let bit = 0; let deger = 0; let cikti = '';
  for (const b of baytlar) {
    deger = (deger << 8) | b; bit += 8;
    while (bit >= 5) { bit -= 5; cikti += ABC[(deger >> bit) & 31]; }
  }
  if (bit > 0) cikti += ABC[(deger << (5 - bit)) & 31];
  return cikti;
}

function base32Coz(s) {
  let bit = 0; let deger = 0; const cikti = [];
  for (const ch of String(s).toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '')) {
    const i = ABC.indexOf(ch);
    if (i < 0) throw new Error(`Geçersiz base32 karakteri: ${ch}`);
    deger = (deger << 5) | i; bit += 5;
    if (bit >= 8) { bit -= 8; cikti.push((deger >> bit) & 0xff); }
  }
  return Buffer.from(cikti);
}

/* ─── TOTP (RFC 6238) — Worker'daki doğrulayıcının aynısı ─────────────────── */

function kodUret(sirB32, zamanMs = Date.now()) {
  const adim = Math.floor(zamanMs / 1000 / 30);
  const sayac = Buffer.alloc(8);
  sayac.writeUInt32BE(Math.floor(adim / 2 ** 32), 0);
  sayac.writeUInt32BE(adim >>> 0, 4);
  const imza = createHmac('sha1', base32Coz(sirB32)).update(sayac).digest();
  const ofset = imza[imza.length - 1] & 0x0f;
  const ikili = ((imza[ofset] & 0x7f) << 24)
    | ((imza[ofset + 1] & 0xff) << 16)
    | ((imza[ofset + 2] & 0xff) << 8)
    | (imza[ofset + 3] & 0xff);
  return String(ikili % 1_000_000).padStart(6, '0');
}

const kalanSaniye = () => 30 - (Math.floor(Date.now() / 1000) % 30);

/* ─── Anahtar Zinciri ─────────────────────────────────────────────────────── */

function sirOku() {
  try {
    return execFileSync('security',
      ['find-generic-password', '-a', process.env.USER ?? '', '-s', SERVIS, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;                       // kayıt yok
  }
}

function sirYaz(sir) {
  execFileSync('security',
    ['add-generic-password', '-a', process.env.USER ?? '', '-s', SERVIS,
      '-l', 'TarpoVizyon yönetici kodu', '-U', '-w', sir],
    { stdio: ['ignore', 'ignore', 'inherit'] });
}

const panoyaKopyala = (metin) => {
  try { execFileSync('pbcopy', { input: metin }); return true; } catch { return false; }
};

/* ─── İlk kurulum ─────────────────────────────────────────────────────────── */

async function ilkKurulum() {
  // Boru/otomasyondan çalıştırılırsa soru hiç yanıtlanmaz ve süreç asılı kalır.
  if (!process.stdin.isTTY) {
    console.log(`\n${renk.kirmizi}Kurulum için gerçek bir terminal gerekiyor.`
      + ` Masaüstündeki "TarpoVizyon Kod" dosyasına çift tıkla.${renk.sifirla}\n`);
    process.exit(1);
  }

  const oku = createInterface({ input: process.stdin, output: process.stdout });

  console.log(`
${renk.kalin}TarpoVizyon — yönetici kodu kurulumu${renk.sifirla}

Bu Mac'te henüz sır yok. İki seçenek var:

  ${renk.kalin}1${renk.sifirla}  Yeni sır üret  ${renk.gri}(ilk kurulumsa bunu seç)${renk.sifirla}
  ${renk.kalin}2${renk.sifirla}  Elimdeki sırrı gir  ${renk.gri}(başka cihazda zaten kurduysan)${renk.sifirla}
`);

  // Terminal yerine boru/otomasyondan çalıştırılırsa soru EOF alıyor; çökmesin.
  const sor = async (metin) => {
    const c = await oku.question(metin).catch(() => null);
    if (c === null || c === undefined) {
      console.log(`\n${renk.kirmizi}Kurulum için gerçek bir terminal gerekiyor.`
        + ` Masaüstündeki dosyaya çift tıkla.${renk.sifirla}\n`);
      oku.close();
      process.exit(1);
    }
    return c;
  };

  const secim = (await sor('Seçim [1/2]: ')).trim();

  let sir;
  if (secim === '2') {
    sir = (await sor('Sırrı yapıştır (base32): ')).trim().toUpperCase().replace(/\s/g, '');
    try {
      if (base32Coz(sir).length < 10) throw new Error('çok kısa');
    } catch (e) {
      console.log(`\n${renk.kirmizi}Sır geçersiz (${e.message}). Baştan çalıştır.${renk.sifirla}\n`);
      oku.close();
      process.exit(1);
    }
  } else {
    sir = base32Yaz(randomBytes(20));   // 160 bit — RFC 4226'nın önerdiği uzunluk
  }

  sirYaz(sir);

  const yayinci = encodeURIComponent('TarpoVizyon');
  const url = `otpauth://totp/${yayinci}:${encodeURIComponent('yönetici')}`
    + `?secret=${sir}&issuer=${yayinci}&algorithm=SHA1&digits=6&period=30`;

  console.log(`
${renk.yesil}✓ Sır Anahtar Zinciri'ne kaydedildi.${renk.sifirla} Bir daha sorulmayacak.

${renk.kalin}Şimdi iki iş kaldı:${renk.sifirla}

${renk.kalin}1)${renk.sifirla} Aynı sırrı Cloudflare Worker'a kur — depo klasöründe:

     cd workers/tarpovizyon-api && npx wrangler secret put ADMIN_TOTP_SECRET

   İstediğinde bu sırrı yapıştır ${renk.gri}(panoya kopyalandı)${renk.sifirla}:

     ${renk.kalin}${sir}${renk.sifirla}

${renk.kalin}2)${renk.sifirla} Yedek olarak telefonundaki kimlik doğrulayıcıya da ekle:

     ${renk.gri}${url}${renk.sifirla}

${renk.gri}Sırrı kaybedersen Worker'daki secret'ı silip baştan kurman gerekir.${renk.sifirla}
`);

  panoyaKopyala(sir);
  await oku.question('Kurulum bitti. Kod ekranına geçmek için Enter…');
  oku.close();
  return sir;
}

/* ─── Ekran ───────────────────────────────────────────────────────────────── */

// 3×5 blok rakamlar — koda göz atmak için, okumak için değil.
const RAKAM = [
  ['███', '█ █', '█ █', '█ █', '███'], ['  █', '  █', '  █', '  █', '  █'],
  ['███', '  █', '███', '█  ', '███'], ['███', '  █', '███', '  █', '███'],
  ['█ █', '█ █', '███', '  █', '  █'], ['███', '█  ', '███', '  █', '███'],
  ['███', '█  ', '███', '█ █', '███'], ['███', '  █', '  █', '  █', '  █'],
  ['███', '█ █', '███', '█ █', '███'], ['███', '█ █', '███', '  █', '███'],
];

function buyukYaz(kod, boya) {
  return RAKAM[0].map((_, satir) =>
    `  ${boya}${[...kod].map((d) => RAKAM[Number(d)][satir]).join('  ')}${renk.sifirla}`,
  ).join('\n');
}

function ciz(sir, sonKod) {
  const kod = kodUret(sir);
  const kalan = kalanSaniye();
  const boya = kalan <= 5 ? renk.kirmizi : kalan <= 10 ? renk.sari : renk.yesil;

  // Kod değiştiyse panoya al — kullanıcı doğrudan yapıştırabilsin.
  const yeni = kod !== sonKod;
  if (yeni) panoyaKopyala(kod);

  const dolu = Math.round((kalan / 30) * 34);
  const cubuk = `${boya}${'━'.repeat(dolu)}${renk.sifirla}${renk.soluk}${'━'.repeat(34 - dolu)}${renk.sifirla}`;

  process.stdout.write('\x1b[H\x1b[2J');   // imleci başa al + temizle
  process.stdout.write(`
  ${renk.kalin}TarpoVizyon — yönetici kodu${renk.sifirla}

${buyukYaz(kod, boya)}

  ${cubuk}  ${boya}${String(kalan).padStart(2)} sn${renk.sifirla}

  ${renk.gri}Panoya kopyalandı — veri giriş ekranında ⌘V ile yapıştır.${renk.sifirla}
  ${renk.gri}Kapatmak için Ctrl-C.${renk.sifirla}
`);
  return kod;
}

/* ─── Giriş ───────────────────────────────────────────────────────────────── */

let sir = sirOku();
if (!sir) sir = await ilkKurulum();

// Sır bozuksa kullanıcıyı belirsizlikte bırakma.
try {
  kodUret(sir);
} catch {
  console.log(`
${renk.kirmizi}Anahtar Zinciri'ndeki sır okunamıyor.${renk.sifirla}

Silip baştan kurmak için:
  security delete-generic-password -s ${SERVIS}
Sonra bu dosyaya yeniden çift tıkla.
`);
  process.exit(1);
}

process.stdout.write('\x1b[?25l');                       // imleci gizle
const temizle = () => { process.stdout.write('\x1b[?25h\n'); process.exit(0); };
process.on('SIGINT', temizle);
process.on('SIGTERM', temizle);

let son = ciz(sir, null);
setInterval(() => { son = ciz(sir, son); }, 250);
