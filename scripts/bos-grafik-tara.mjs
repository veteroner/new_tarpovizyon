#!/usr/bin/env node
/**
 * Boş grafik denetimi — çizilmiş ama içi boş grafikleri bulur.
 *
 * ─── NEDEN AYRI BİR DENETİM ─────────────────────────────────────────────────
 * `ekran-tara.mjs` basılan SAYILARIN biçimine bakıyor, `veri-kutugu.mjs`
 * tabloların TAZELİĞİNE. İkisi de "grafik hiç çizilmemiş" durumunu göremiyor:
 * biçim denetimi bakacak sayı bulamayınca sessizce geçiyor, tazelik denetimi
 * tabloyu "bayat" ya da "denetlenemiyor" diye raporlasa bile bunun ekranda
 * boş bir kutu olarak göründüğünü söylemiyor.
 *
 * Fatura kesildi: "Kişi Başı Tüketim Trendleri (Kg/yıl)" kartı üretimde
 * bomboş duruyordu — eksenler ve yıl etiketleri çizilmiş, tek bir çizgi yok.
 * Her iki denetim de o sayfadan temiz geçmişti.
 *
 * ─── BOŞ NEDİR ──────────────────────────────────────────────────────────────
 * Recharts bir kabuk çizip veri elemanı üretmeyebiliyor: eksen, ızgara ve
 * etiketler görünür, `path.recharts-line-curve` / `.recharts-bar-rectangle` /
 * `.recharts-area-area` / nokta ve dilim elemanları yok. Aranan tam olarak bu:
 * SVG var, VERİ elemanı yok.
 *
 * Yükleme iskeletleriyle karışmasın diye grafik kabuğu (eksen ya da ızgara)
 * çizilmiş olmalı; hiç SVG'si olmayan kart "henüz yüklenmedi" sayılıyor.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   npx vite build && npx vite preview --port 5178 --strictPort &
 *   node scripts/bos-grafik-tara.mjs
 *
 * Boş grafik bulursa çıkış kodu 1.
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
const BEKLE = Number(bayrak('--bekle', '5000'));

const app = fs.readFileSync(path.join(KOK, 'src/App.tsx'), 'utf8');
const ATLA = new Set(['/tarpovizyon/veri-girisi', '/tarpovizyon/veri-yukle', '/tarpovizyon/ai-assistant']);
const hedefler = [...new Set(
  [...app.matchAll(/path="(\/tarpovizyon\/[^"]*)"/g)].map((m) => m[1])
    .filter((r) => !r.includes('*') && !r.includes(':') && !ATLA.has(r)),
)].sort();

console.log(`${hedefler.length} rota taranacak → ${TABAN}`);

const OLC = () => {
  /* Veri elemanı sınıfları — Recharts bunları yalnız gerçek veri varsa üretir. */
  const VERI = [
    '.recharts-line-curve', '.recharts-bar-rectangle', '.recharts-area-area',
    '.recharts-scatter-symbol', '.recharts-pie-sector', '.recharts-radar-polygon',
    '.recharts-rectangle', '.recharts-sector', '.recharts-symbols',
  ].join(',');
  /* Kabuk: eksen ya da ızgara çizilmişse grafik render olmuş demektir. */
  const KABUK = '.recharts-cartesian-axis,.recharts-cartesian-grid,.recharts-polar-grid';

  const bos = [];
  const kapsayicilar = document.querySelectorAll('.recharts-wrapper');
  for (const kap of kapsayicilar) {
    if (!kap.querySelector(KABUK)) continue;      // henüz çizilmemiş → yükleniyor
    if (kap.querySelector(VERI)) continue;        // veri var → sorun yok
    /* Başlık: en yakın karttaki ilk başlık öğesi. */
    const kart = kap.closest('.chart-card, .card, section, div');
    let baslik = '';
    for (let e = kart; e && !baslik; e = e.parentElement) {
      const h = e.querySelector('h1,h2,h3,h4,.chart-title,.card-title');
      if (h) baslik = h.textContent.trim().slice(0, 60);
    }
    bos.push(baslik || '(başlıksız)');
  }
  return { bos, grafikSayisi: kapsayicilar.length };
};

const chrome = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => p && fs.existsSync(p));

const tarayici = await puppeteer.launch({
  headless: 'new',
  ...(chrome.length ? { executablePath: chrome[0] } : {}),
});
const sayfa = await tarayici.newPage();
await sayfa.setViewport({ width: 1440, height: 3000 });

const bulgular = [];
let toplamGrafik = 0;
for (const [i, yol] of hedefler.entries()) {
  try {
    await sayfa.goto(TABAN + yol, { waitUntil: 'networkidle2', timeout: 45000 });
  } catch { /* çizilmiş olabilir, ölçmeye devam */ }
  await new Promise((r) => setTimeout(r, BEKLE));
  const { bos, grafikSayisi } = await sayfa.evaluate(OLC);
  toplamGrafik += grafikSayisi;
  process.stdout.write(`\r  ${i + 1}/${hedefler.length} ${yol.padEnd(44)}`);
  if (bos.length) bulgular.push({ yol, bos });
}
process.stdout.write('\r' + ' '.repeat(70) + '\r');
await tarayici.close();

/*
 * ─── SESSİZ BAŞARISIZLIK KAPISI ─────────────────────────────────────────────
 * Bu betiğin ilk çalıştırması "59 rotada boş grafik yok" dedi ve YANLIŞTI:
 * önizleme sunucusu düşmüştü, her sayfa boş yükleniyordu, hiçbir grafik
 * bulunamadığı için de hiç boş grafik bulunamadı. Ölçmeyen bir denetim
 * "temiz" raporlarsa, denetimin kendisi yanlış güven üretiyor — düzeltmeye
 * çalıştığı sorunun aynısı.
 *
 * Bu yüzden "hiçbir şey bulamadım" artık başarı değil, hata.
 */
if (toplamGrafik === 0) {
  console.error(`\nHATA: ${hedefler.length} rotada TEK grafik bulunamadı.`);
  console.error(`Önizleme sunucusu ${TABAN} adresinde ayakta mı?`);
  console.error('  npx vite build && npx vite preview --port 5178 --strictPort');
  process.exit(2);
}

if (!bulgular.length) {
  console.log(`\n${hedefler.length} rotada ${toplamGrafik} grafik ölçüldü, boş yok.`);
  process.exit(0);
}

const toplam = bulgular.reduce((t, b) => t + b.bos.length, 0);
console.log(`\n${toplam} boş grafik, ${bulgular.length} sayfada:\n`);
for (const b of bulgular) {
  console.log(`  ${b.yol}`);
  for (const ad of b.bos) console.log(`      ${ad}`);
}
process.exit(1);
