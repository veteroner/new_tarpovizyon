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
    /*
     * KART BAZINDA ölçüm. İlk sürüm tek metin düğümüne bakıyordu ve iki
     * paragraflık bir açıklama kartını iki ayrı "kısa" blok gibi sayıyordu;
     * asıl yük kartın TOPLAMI. Ayrıca eşik 160'tan 110'a indi — 120 karakterlik
     * bir yöntem paragrafı da fazladan.
     */
    /*
     * YALNIZ PARAGRAF öğeleri. Kart/bölüm kaplarını taramak, KPI ızgaralarının
     * birleşik metnini ("5 yıllık BBO%-1,4Yıllık bileşik büyümeVerimlilik…")
     * uzun paragraf sanıp raporu gürültüye boğuyordu; o metinler ekranda
     * ayrı ayrı küçük sayı kartları olarak duruyor, kimse onları okumuyor.
     */
    const nesirMi = (t) => {
      // Düzyazı ölçütü: en az 12 kelime ve harf oranı yüksek. KPI birleşimleri
      // rakam/işaret yoğun olduğu için bu eşiği geçmiyor.
      const kelime = t.split(/\s+/).filter((w) => /[a-zçğıöşü]{3,}/i.test(w));
      const harf = (t.match(/[a-zçğıöşüA-ZÇĞİÖŞÜ ]/g) || []).length / t.length;
      return kelime.length >= 12 && harf > 0.82;
    };
    const out = [];
    for (const e of document.querySelectorAll('p, li, figcaption, blockquote')) {
      if (e.querySelector('p, li, div, table, svg')) continue;
      const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length < 110 || !nesirMi(t)) continue;
      out.push(t.slice(0, 120));
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
