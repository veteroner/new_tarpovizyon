#!/usr/bin/env node
/**
 * Konsol ve ağ denetimi — görünmeyen hatalar.
 *
 * ─── NEDEN DÖRDÜNCÜ BİR DENETİM ─────────────────────────────────────────────
 * Diğer üçü ekranda GÖRÜNENİ ölçüyor: sayının biçimi, grafiğin boş olup
 * olmadığı, metnin uzunluğu. Hiçbiri sayfanın sessizce hata verdiğini
 * göremiyor — bir API çağrısı 500 dönebilir, bir bileşen render sırasında
 * patlayıp yakalanabilir, bir istek hiç cevap alamayabilir. Bunların hepsi
 * ekranda "veri yok" ya da eksik bir bölüm olarak görünür; tıpkı bu depoda
 * üç bölümü birden öldüren yarış koşulunun tek belirtisinin boş bir grafik
 * olması gibi.
 *
 * ─── NE ARIYOR ──────────────────────────────────────────────────────────────
 *   · console.error / pageerror — React hataları, yakalanmamış istisnalar
 *   · 4xx / 5xx dönen ağ istekleri
 *   · isteği tamamlanamayan (failed) çağrılar
 *
 * Gürültü elenir: tarayıcı eklentileri, kaynak haritası uyarıları ve
 * geliştirme modu uyarıları AYIKLANIR — bunlar üretimde kullanıcıyı
 * etkilemiyor ve raporu doldurup gerçek hatayı gizliyorlar.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   npx vite build && npx vite preview --port 5178 --strictPort &
 *   node scripts/konsol-tara.mjs
 *
 * Hata bulursa çıkış kodu 1; hiçbir sayfa yüklenemezse 2 (bkz. sessiz
 * başarısızlık kapısı — sunucu düşükken "temiz" demek en kötü sonuç).
 */

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const KOK = path.resolve(import.meta.dirname, '..');
const bayrak = (ad, varsayilan) => {
  const i = process.argv.indexOf(ad);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : varsayilan;
};
const TABAN = bayrak('--url', 'http://localhost:5178');
const BEKLE = Number(bayrak('--bekle', '4500'));

const app = fs.readFileSync(path.join(KOK, 'src/App.tsx'), 'utf8');
const ATLA = new Set(['/tarpovizyon/veri-girisi', '/tarpovizyon/veri-yukle', '/tarpovizyon/ai-assistant']);
const hedefler = [...new Set(
  [...app.matchAll(/path="(\/tarpovizyon\/[^"]*)"/g)].map((m) => m[1])
    .filter((r) => !r.includes('*') && !r.includes(':') && !ATLA.has(r)),
)].sort();

/* Üretimde kullanıcıyı etkilemeyen, raporu dolduran bilinen gürültü. */
const GURULTU = [
  /favicon/i, /sourcemap/i, /source map/i, /DevTools/i,
  /Download the React DevTools/i, /ResizeObserver loop/i,
  /chrome-extension:/i, /web-vitals/i,
];
const gurultuMu = (s) => GURULTU.some((r) => r.test(s));

const chrome = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => p && fs.existsSync(p));

console.log(`${hedefler.length} rota taranacak → ${TABAN}`);

const tarayici = await puppeteer.launch({
  headless: 'new',
  ...(chrome.length ? { executablePath: chrome[0] } : {}),
});
const sayfa = await tarayici.newPage();
await sayfa.setViewport({ width: 1440, height: 2400 });

let gecerliYol = '';
let yuklenen = 0;
const bulgular = new Map();   // yol → Set(mesaj)

const ekle = (mesaj) => {
  if (!gecerliYol || gurultuMu(mesaj)) return;
  if (!bulgular.has(gecerliYol)) bulgular.set(gecerliYol, new Set());
  bulgular.get(gecerliYol).add(mesaj.slice(0, 160));
};

sayfa.on('console', (m) => {
  if (m.type() === 'error') ekle(`konsol: ${m.text()}`);
});
sayfa.on('pageerror', (e) => ekle(`sayfa hatası: ${e.message}`));
sayfa.on('requestfailed', (r) => {
  const h = r.failure()?.errorText ?? '';
  // İptal edilen istekler hata değil: sayfa geçişinde normal.
  if (/ABORTED|net::ERR_ABORTED/.test(h)) return;
  ekle(`istek başarısız (${h}): ${r.url().slice(0, 90)}`);
});
sayfa.on('response', (r) => {
  if (r.status() >= 400) ekle(`HTTP ${r.status()}: ${r.url().slice(0, 90)}`);
});

for (const [i, yol] of hedefler.entries()) {
  gecerliYol = yol;
  try {
    const r = await sayfa.goto(TABAN + yol, { waitUntil: 'networkidle2', timeout: 45000 });
    if (r && r.status() < 400) yuklenen += 1;
  } catch { /* ölçmeye devam */ }
  await new Promise((r) => setTimeout(r, BEKLE));
  process.stdout.write(`\r  ${i + 1}/${hedefler.length} ${yol.padEnd(44)}`);
}
process.stdout.write('\r' + ' '.repeat(70) + '\r');
await tarayici.close();

if (yuklenen === 0) {
  console.error(`\nHATA: ${hedefler.length} rotanın hiçbiri yüklenemedi.`);
  console.error(`Önizleme sunucusu ${TABAN} adresinde ayakta mı?`);
  process.exit(2);
}

if (!bulgular.size) {
  console.log(`\n${yuklenen}/${hedefler.length} rota yüklendi · konsol ve ağ temiz.`);
  process.exit(0);
}

/* Aynı hata ortak bir uçtan geliyorsa onlarca sayfada çıkıyor; mesaja göre
   grupla ki bir hata elli hata gibi görünmesin. */
const gruplar = new Map();
for (const [yol, mesajlar] of bulgular) {
  for (const m of mesajlar) {
    if (!gruplar.has(m)) gruplar.set(m, []);
    gruplar.get(m).push(yol);
  }
}

console.log(`\n${gruplar.size} farklı hata, ${bulgular.size} sayfada `
  + `(${yuklenen}/${hedefler.length} rota yüklendi):\n`);
for (const [mesaj, yollar] of [...gruplar].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${mesaj}`);
  console.log(`    ${yollar.length} sayfa: ${yollar.slice(0, 3).join(', ')}${yollar.length > 3 ? ' …' : ''}\n`);
}
process.exit(1);
