/**
 * Pro sayfaları telefon genişliğinde kullanılabilir mi — denetim.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * Pro rotaları (66 adet) masaüstü kabuğu için yazıldı ve mağaza derlemesinde
 * hiç açılmadı: Keşfet listesi mobilde Pro'yu gizliyordu. Mod anahtarı bunu
 * açınca 66 sayfa ilk kez telefon genişliğinde kullanıcının önüne geliyor.
 *
 * Beş sayfa elle ölçüldü ve temiz çıktı. Beşten altmış altıya genelleme
 * yapmak, tam olarak bu projede birkaç kez pahalıya patlamış olan varsayım
 * türü — o yüzden hepsi ölçülüyor.
 *
 * ─── SESSİZ BAŞARISIZLIK KAPISI ─────────────────────────────────────────────
 * Bu betiğin en tehlikeli hali "temiz" demesi ama hiçbir şey ölçmemiş olması:
 * önizleme sunucusu kapalıysa her sayfa aynı boş kabuğu döndürür ve rapor
 * yanıltıcı biçimde yeşil çıkar. Daha önce bir denetim tam bunu yaptı.
 *
 * O yüzden: (1) başlamadan sunucu yoklanıyor, (2) rapor kaç sayfa ölçtüğünü
 * YAZIYOR, (3) ölçülen sayfa sayısı beklenenden azsa çıkış kodu 2.
 *
 * ─── YEREL ÖNİZLEME BAZI SAYFALARI ÖLÇEMEZ ──────────────────────────────────
 * Bir kısım sayfa verisini D1 Worker'ından değil, göçten kalan eski MySQL
 * köprüsünden (`/api.php`) alıyor. O dosya Netlify'da var ama `vite preview`'de
 * YOK ve preview her bilinmeyen yolu `index.html` ile karşılıyor — yani istek
 * 200 dönüyor ama JSON yerine HTML geliyor. Sayfa veriyi çözemiyor ve sonsuza
 * kadar "yükleniyor" kalıyor.
 *
 * Bu bir sayfa kusuru DEĞİL, önizleme sunucusunun eksiği: aynı sayfa canlıda
 * sorunsuz çiziliyor (ölçüldü). `/tarpovizyon/commodity-prices` bu yüzden
 * yerelde "neredeyse-bos" işaretlenir.
 *
 * Öyle bir bulgu görünce sayfayı CANLIYA karşı ölçün:
 *   TABAN=https://pro.tarpovizyon.com node scripts/mobil-pro-tara.mjs --yol <yol>
 *
 * Kullanım:
 *   npm run build:netlify && npx vite preview --port 5178 --strictPort &
 *   node scripts/mobil-pro-tara.mjs
 *   node scripts/mobil-pro-tara.mjs --yol /tarpovizyon/turkey/overview   (tek sayfa)
 *   TABAN=https://pro.tarpovizyon.com node scripts/mobil-pro-tara.mjs     (canlı)
 */

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const KOK = path.resolve(import.meta.dirname, '..');
const TABAN = process.env.TABAN ?? 'http://localhost:5178';
const GENISLIK = 375;
const YUKSEKLIK = 812;
/** Sayfa başına veri bekleme süresi — grafikler D1'den geliyor. */
const BEKLE_MS = Number(process.env.BEKLE_MS ?? 4000);

const tekYol = (() => {
  const i = process.argv.indexOf('--yol');
  return i >= 0 ? process.argv[i + 1] : null;
})();

/** Pro rotalarını App.tsx'ten okur — liste elle tutulsa kaçınılmaz olarak bayatlardı. */
function proYollari() {
  const s = fs.readFileSync(path.join(KOK, 'src/App.tsx'), 'utf8');
  const hepsi = [...s.matchAll(/path="(\/tarpovizyon\/[a-z0-9/-]*)"/g)].map((m) => m[1]);
  /*
   * Yönetim ve abonelik yolları DIŞARIDA: ilki TOTP kapısının arkasında (kapı
   * çizilir, sayfa çizilmez — ölçüm anlamsız), ikincisi ödeme ekranı ve
   * abonelik durumuna göre farklı şeyler gösteriyor.
   */
  const haric = ['/tarpovizyon/panel', '/tarpovizyon/veri-yukle', '/tarpovizyon/veri-girisi',
    '/tarpovizyon/abonelik'];
  return [...new Set(hepsi)].filter((y) => !haric.includes(y) && y !== '/tarpovizyon');
}

const yollar = tekYol ? [tekYol] : proYollari();
if (!yollar.length) {
  console.error('HATA: App.tsx içinde Pro rotası bulunamadı — yol deseni değişmiş olabilir.');
  process.exit(2);
}

/* Sunucu yoklaması: kapalıysa ölçüm değil, hata. */
try {
  const y = await fetch(TABAN, { signal: AbortSignal.timeout(8000) });
  if (!y.ok) throw new Error(`HTTP ${y.status}`);
} catch (x) {
  console.error(`HATA: önizleme sunucusu ${TABAN} yanıt vermiyor (${x.message}).`);
  console.error('       npm run build:netlify && npx vite preview --port 5178 --strictPort');
  process.exit(2);
}

const chromeYollari = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p) => p && fs.existsSync(p));

const tarayici = await puppeteer.launch({
  headless: 'new',
  ...(chromeYollari.length ? { executablePath: chromeYollari[0] } : {}),
  args: [`--window-size=${GENISLIK},${YUKSEKLIK}`],
});

const bulgular = [];
let olculen = 0;

for (const yol of yollar) {
  const sayfa = await tarayici.newPage();
  await sayfa.setViewport({ width: GENISLIK, height: YUKSEKLIK, isMobile: true, hasTouch: true });
  const konsolHatalari = [];
  sayfa.on('console', (m) => { if (m.type() === 'error') konsolHatalari.push(m.text().slice(0, 90)); });
  sayfa.on('pageerror', (e) => konsolHatalari.push(`pageerror: ${String(e.message).slice(0, 90)}`));

  try {
    await sayfa.goto(`${TABAN}${yol}`, { waitUntil: 'networkidle2', timeout: 45_000 });
    await new Promise((r) => { setTimeout(r, BEKLE_MS); });

    const o = await sayfa.evaluate(() => {
      const grafikler = [...document.querySelectorAll('.recharts-wrapper')];
      const tablolar = [...document.querySelectorAll('table')];
      return {
        /* Yatay kaydırma: mobilde en görünür ve en can sıkıcı kusur. */
        yatay: document.documentElement.scrollWidth > window.innerWidth + 2,
        grafik: grafikler.length,
        /* Çizim öğesi olmayan grafik = boş grafik. */
        bosGrafik: grafikler.filter((w) => w.querySelectorAll('path,rect,circle').length === 0).length,
        tablo: tablolar.length,
        bosTablo: tablolar.filter((t) => t.querySelectorAll('tbody tr').length === 0).length,
        /* Sayfa gerçekten bir şey çizdi mi — boş kabuk ayrımı. */
        metinUzunlugu: (document.querySelector('main')?.innerText ?? '').length,
        /* Biçimlenmemiş ondalık: "154.3380999999999" gibi. */
        hamOndalik: (document.body.innerText.match(/\d+\.\d{6,}/g) ?? []).slice(0, 3),
      };
    });

    olculen += 1;
    const sorunlar = [];
    if (o.yatay) sorunlar.push('yatay-kaydirma');
    if (o.bosGrafik) sorunlar.push(`bos-grafik:${o.bosGrafik}/${o.grafik}`);
    if (o.bosTablo) sorunlar.push(`bos-tablo:${o.bosTablo}/${o.tablo}`);
    if (o.hamOndalik.length) sorunlar.push(`ham-ondalik:${o.hamOndalik[0]}`);
    if (o.metinUzunlugu < 200) sorunlar.push(`neredeyse-bos:${o.metinUzunlugu}krkt`);
    if (konsolHatalari.length) sorunlar.push(`konsol:${konsolHatalari.length}`);

    bulgular.push({ yol, ...o, sorunlar, konsolHatalari });
    const isaret = sorunlar.length ? '✗' : '·';
    console.log(`${isaret} ${yol.padEnd(46)} grafik ${String(o.grafik).padStart(2)}  tablo ${String(o.tablo).padStart(2)}  ${sorunlar.join(' ') || 'temiz'}`);
  } catch (x) {
    bulgular.push({ yol, sorunlar: ['acilamadi'], hata: String(x.message).split('\n')[0] });
    console.log(`✗ ${yol.padEnd(46)} AÇILAMADI: ${String(x.message).split('\n')[0].slice(0, 50)}`);
  }
  await sayfa.close();
}

await tarayici.close();

const sorunlu = bulgular.filter((b) => b.sorunlar.length);

console.log(`\n${'─'.repeat(74)}`);
console.log(`ÖLÇÜLEN: ${olculen}/${yollar.length} sayfa · ${GENISLIK}px genişlik · sorunlu ${sorunlu.length}`);

if (sorunlu.length) {
  console.log('\nAyrıntı:');
  for (const b of sorunlu) {
    console.log(`  ${b.yol}`);
    console.log(`    ${b.sorunlar.join(', ')}`);
    for (const h of (b.konsolHatalari ?? []).slice(0, 3)) console.log(`    konsol: ${h}`);
    if (b.hata) console.log(`    hata: ${b.hata}`);
  }
}

/* Ölçülemeyen sayfa varsa rapor "temiz" diyemez. */
if (olculen < yollar.length) {
  console.error(`\nHATA: ${yollar.length - olculen} sayfa ölçülemedi — bu rapor eksiktir.`);
  process.exit(2);
}
process.exit(sorunlu.length ? 1 : 0);
