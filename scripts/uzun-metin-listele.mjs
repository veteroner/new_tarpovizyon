#!/usr/bin/env node
/**
 * Uzun metin listeleyici — ekrandaki açıklama bloklarını sayar.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Ölçüm yaparken vardığım sonuçları arayüze yazmaya eğilimliyim: "bu yöntem
 * 2024'te sınandı", "eşikler ölçünün kendi anlamından geliyor", "bu tablo
 * bağımsız doğrulama değil". Hepsi doğru ve hepsi kodun yorumuna ait. Sayfayı
 * açan kişi ürünün durumuna bakmaya geliyor, ölçümün savunmasını okumaya değil.
 *
 * Bu betik bir HATA denetimi DEĞİL: uzun metin kendiliğinden kötü değil.
 * Sektör bilgisi ve veri yorumu ("Türkiye kırmızı mercimekte dünyanın en büyük
 * üreticisi") tam da okuyucunun aradığı şey. Ayrım şu:
 *
 *   YÖNTEM anlatısı  → koda yorum   (nasıl doğruladım, hangi sınamayı yaptım)
 *   VERİNİN NE OLDUĞU → tek satır dipnot (.ui-dipnot)
 *   VERİ YORUMU      → kalsın       (bu sayı ne anlama geliyor)
 *
 * Betik listeler, ayrımı insan yapar. Çıkış kodu her zaman 0.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   npx vite build && npx vite preview --port 5178 --strictPort &
 *   node scripts/uzun-metin-listele.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
const KOK = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(KOK, 'src/App.tsx'), 'utf8');
const ATLA = new Set(['/tarpovizyon/veri-girisi', '/tarpovizyon/veri-yukle', '/tarpovizyon/ai-assistant']);
const hedefler = [...new Set([...app.matchAll(/path="(\/tarpovizyon\/[^"]*)"/g)].map(m => m[1])
  .filter(r => !r.includes('*') && !r.includes(':') && !ATLA.has(r)))].sort();
const b = await puppeteer.launch({ headless: 'new',
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 3000 });
const hepsi = [];
for (const yol of hedefler) {
  try { await p.goto('http://localhost:5178' + yol, { waitUntil: 'networkidle2', timeout: 45000 }); } catch {}
  await new Promise(r => setTimeout(r, 3500));
  const bloklar = await p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('p, li, div')) {
      if (e.children.length > 0) continue;
      const t = (e.textContent || '').trim();
      if (t.length >= 160) out.push(t.slice(0, 110));
    }
    return out;
  });
  if (bloklar.length) hepsi.push({ yol, sayi: bloklar.length, ornek: bloklar });
}
await b.close();
const toplam = hepsi.reduce((t, h) => t + h.sayi, 0);
console.log(`\n${toplam} uzun metin bloğu, ${hepsi.length} sayfada:\n`);
for (const h of hepsi) {
  console.log(`  ${h.yol}  (${h.sayi})`);
  for (const o of h.ornek) console.log(`      "${o}…"`);
}
