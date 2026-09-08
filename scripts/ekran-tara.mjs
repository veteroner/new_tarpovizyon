#!/usr/bin/env node
/**
 * Ekran denetimi — basılan sayıların biçimini SAYFADA ölçer.
 *
 * ─── NEDEN KAYNAK TARAMASI YETMİYOR ─────────────────────────────────────────
 * `src/utils/__tests__/grafikBicim.test.ts` kaynağı tarıyor ve Recharts
 * eksen/ipuçlarını kapsıyor: tickFormatter'sız bir eksen eklenirse kırılıyor.
 * Ama JSX'in içine doğrudan yazılmış bir sayı o testin göremediği yer:
 *
 *     <div style={{ fontSize: '24px' }}>{primaryHHI.effectiveCompetitors}</div>
 *
 * Burada biçimlendirici YOK, çağrı da yok — statik olarak "bu ifade sayı mı,
 * sayıysa yuvarlanmış mı" ayırt edilemiyor. Değer `10000 / hhi` bölmesinden
 * geliyordu ve ekranda "5.158791675751894" olarak basılıyordu. Tek satır, ama
 * ortak bileşen olduğu için ON sayfada birden görünüyordu.
 *
 * Bunu bulan şey kaynak okuması değil, üretim derlemesini açıp basılan metni
 * ölçmek oldu. Bu betik o ölçümü tekrarlanabilir yapıyor.
 *
 * ─── NE ARIYOR ──────────────────────────────────────────────────────────────
 * Türkçe biçimde '.' binlik ayracı (tam üçlü gruplar), ',' ondalık ayracıdır.
 * Dolayısıyla hata iki desende görünür:
 *   ,\d{3,}   → ondalıktan sonra üç veya daha fazla hane
 *   \.\d{4,}  → noktadan sonra dört+ hane (binlik ayracı olamaz → ham float)
 *
 * `sayiBicimle` mutlak değeri 1'in altındaki sayılara bilerek 3 ondalık hane
 * veriyor (0,938 gibi oranlar). Bu yüzden |v| < 1 olan değerler eşikten muaf;
 * onları da hata saymak, doğru davranışı alarm haline getirirdi.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   npx vite build && npx vite preview --port 5178 --strictPort &
 *   node scripts/ekran-tara.mjs                  # tüm rotalar
 *   node scripts/ekran-tara.mjs --url http://...  # başka sunucu
 *
 * Hata bulursa çıkış kodu 1 — CI kapısı olarak kullanılabilir.
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
/** Sayfanın veri çekip çizmesi için beklenen süre (ms). */
const BEKLE = Number(bayrak('--bekle', '4000'));

/* ── Rotalar App.tsx'ten ─────────────────────────────────────────────────── */

const app = fs.readFileSync(path.join(KOK, 'src/App.tsx'), 'utf8');
const rotalar = [...new Set(
  [...app.matchAll(/path="(\/tarpovizyon\/[^"]*)"/g)]
    .map((m) => m[1])
    .filter((r) => !r.includes('*') && !r.includes(':')),
)].sort();

/* Elle veri girişi ekranları taranmıyor: ADMIN_KEY isteyip boş form
   gösteriyorlar, yani ölçülecek sayı basmıyorlar. */
const ATLA = new Set(['/tarpovizyon/veri-girisi', '/tarpovizyon/veri-yukle', '/tarpovizyon/ai-assistant']);
const hedefler = rotalar.filter((r) => !ATLA.has(r));

console.log(`${hedefler.length} rota taranacak → ${TABAN}`);

/* ── Sayfa içi ölçüm ─────────────────────────────────────────────────────── */

/**
 * Sayfadaki her metin düğümünü tek tek gezer.
 *
 * `document.body.textContent` KULLANILMIYOR: bitişik hücreleri birleştirip
 * "110,7" + "118,2" → "110,7118,2" gibi sahte eşleşmeler üretiyor. Düğüm
 * düğüm gezmek o gürültüyü tümüyle kaldırıyor.
 */
const OLC = () => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const kotu = []; let n; let sayilanDugum = 0;
  while ((n = w.nextNode())) {
    const s = n.textContent.trim();
    if (s.length > 40 || !/\d/.test(s)) continue;
    sayilanDugum += 1;
    if (!(/,\d{3,}/.test(s) || /\.\d{4,}/.test(s))) continue;
    // |v| < 1 olan oranlarda 3 ondalık hane kasıtlı.
    const sayi = Number(s.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(sayi) && Math.abs(sayi) < 1) continue;
    const p = n.parentElement;
    kotu.push({
      metin: s,
      kutu: p ? p.outerHTML.slice(0, 160) : '',
    });
  }
  return { kotu, sayilanDugum };
};

/*
 * Chrome yolu: puppeteer kendi Chrome'unu indirmemiş olabilir (bu depoda
 * indirilmemişti). Sistemde kurulu olanı kullanmak 200 MB'lık indirmeyi
 * gereksiz kılıyor. CI'da CHROME_PATH ile verilebilir.
 */
const chromeYollari = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p) => p && fs.existsSync(p));

const tarayici = await puppeteer.launch({
  headless: 'new',
  ...(chromeYollari.length ? { executablePath: chromeYollari[0] } : {}),
});
const sayfa = await tarayici.newPage();
await sayfa.setViewport({ width: 1440, height: 2400 });

const bulgular = [];
let toplamDugum = 0;
for (const [i, yol] of hedefler.entries()) {
  try {
    await sayfa.goto(TABAN + yol, { waitUntil: 'networkidle2', timeout: 45000 });
  } catch { /* networkidle gelmese de çizilmiş olabilir; ölçmeye devam */ }
  await new Promise((r) => setTimeout(r, BEKLE));
  const { kotu, sayilanDugum } = await sayfa.evaluate(OLC);
  toplamDugum += sayilanDugum;
  process.stdout.write(`\r  ${i + 1}/${hedefler.length} ${yol.padEnd(44)}`);
  if (kotu.length) bulgular.push({ yol, kotu });
}
process.stdout.write('\r' + ' '.repeat(70) + '\r');
await tarayici.close();

/* ── Rapor ───────────────────────────────────────────────────────────────── */

/*
 * Önizleme sunucusu düşükken bu betik her sayfayı boş yükler, bakacak sayı
 * bulamaz ve "biçimsiz sayı yok" der — ölçmediği halde temiz raporlar.
 * Kardeş betikte (bos-grafik-tara.mjs) bu tam olarak yaşandı. O yüzden
 * "hiçbir şey bulamadım" başarı değil, hata.
 */
if (toplamDugum === 0) {
  console.error(`\nHATA: ${hedefler.length} rotada TEK sayı bulunamadı.`);
  console.error(`Önizleme sunucusu ${TABAN} adresinde ayakta mı?`);
  console.error('  npx vite build && npx vite preview --port 5178 --strictPort');
  process.exit(2);
}

if (!bulgular.length) {
  console.log(`\n${hedefler.length} rotada ${toplamDugum} sayı ölçüldü, biçimsiz yok.`);
  process.exit(0);
}

/* Aynı hata ortak bileşenden geldiğinde onlarca sayfada birden çıkıyor.
   Sayfa sayfa listelemek bir hatayı on hata gibi gösterirdi; bu yüzden
   rapor kutu HTML'ine göre gruplanıyor — asıl birim hata, sayfa değil. */
const gruplar = new Map();
for (const b of bulgular) {
  for (const k of b.kotu) {
    const anahtar = k.kutu.replace(/>[^<]*</, '>…<');
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, { ornek: k.metin, yollar: new Set() });
    gruplar.get(anahtar).yollar.add(b.yol);
  }
}

console.log(`\n${gruplar.size} biçimsiz sayı kaynağı, ${bulgular.length} sayfada:\n`);
for (const [kutu, g] of gruplar) {
  const yollar = [...g.yollar];
  console.log(`  "${g.ornek}"  (${yollar.length} sayfa)`);
  console.log(`    ${kutu}`);
  console.log(`    ${yollar.slice(0, 4).join(', ')}${yollar.length > 4 ? ' …' : ''}\n`);
}
process.exit(1);
