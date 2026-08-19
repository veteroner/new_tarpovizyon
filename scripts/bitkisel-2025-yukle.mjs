#!/usr/bin/env node
/**
 * TÜİK bitkisel üretim bülteninden ÜRÜN seviyesinde eksik yılı D1'e yazar.
 *
 *   node scripts/bitkisel-2025-yukle.mjs --dizin ~/Downloads          # rapor
 *   node scripts/bitkisel-2025-yukle.mjs --dizin ~/Downloads --yaz
 *
 * ─── 2024 SÜTUNU BİR DOĞRULAMA ANAHTARIDIR ──────────────────────────────────
 * Bültenin ürün adları D1'inkilerle her zaman aynı değil: bazıları sadece
 * farklı yazılmış ("Nohut" ↔ "Nohut, Kuru"), bazıları ise GERÇEKTEN TOPLU
 * ("Buğday", D1'de "Buğday, Durum Buğdayı Hariç" + "Durum Buğdayı" olarak
 * ayrık). İkincisine bültenin toplu rakamını yazmak veriyi bozar.
 *
 * Ayrımı isimden tahmin etmek yerine ÖLÇÜYORUZ: bu dosyalar hem 2024 hem 2025
 * taşıyor ve 2024 D1'de zaten dolu. Bir eşleme ancak bültenin 2024 değeri
 * D1'in 2024 değerine (binde 1 toleransla) EŞİTSE kabul ediliyor. Tutmayan
 * eşleme yazılmıyor ve raporda gerekçesiyle listeleniyor.
 *
 * ─── NEDEN ELLE ─────────────────────────────────────────────────────────────
 * Bülten indirme bağlantıları imzalı ve tarayıcı oturumuna bağlı; dosyalar
 * elle indirilip `--dizin` ile veriliyor.
 */

import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as XLSX from 'xlsx';

const calistir = promisify(execFile);
const KOK = new URL('../workers/tarpovizyon-api/', import.meta.url).pathname;

const arg = process.argv.slice(2);
const deger = (a) => { const i = arg.indexOf(a); return i >= 0 ? arg[i + 1] : null; };
const DIZIN = (deger('--dizin') ?? '').replace(/^~/, process.env.HOME ?? '~');
const YAZ = arg.includes('--yaz');
const TOLERANS = 0.001;
if (!DIZIN) throw new Error('--dizin zorunlu');

async function d1(sql) {
  const { stdout } = await calistir('npx',
    ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 2e8 });
  return JSON.parse(stdout.slice(stdout.indexOf('[')))[0].results ?? [];
}

/** Ad karşılaştırması için sadeleştirme — noktalama ve büyük/küçük harf farkı önemsiz. */
const norm = (x) => String(x).toLocaleLowerCase('tr')
  .replace(/[()]/g, ' ').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();

/** Bir bülten dosyasındaki ürün satırlarını yıl değerleriyle çıkarır. */
function bultenOku(yol) {
  const wb = XLSX.read(readFileSync(yol), { type: 'buffer' });
  const r = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  let bas = -1; const yilSut = [];
  for (let i = 0; i < r.length; i++) {
    const t = r[i].map((c) => String(c ?? '').trim());
    const y = t.map((x, j) => [x, j]).filter(([x]) => /^(19|20)\d{2}$/.test(x));
    if (y.length >= 2) { bas = i; y.forEach(([x, j]) => yilSut.push([Number(x), j])); break; }
  }
  if (bas < 0) throw new Error(`${yol}: yıl başlığı yok`);
  const out = [];
  for (const s of r.slice(bas + 1)) {
    const ham = String(s[0] ?? '');
    const ad = ham.split(' - ')[0].trim().replace(/\n[\s\S]*/, '').replace(/\s*\(\d\)\s*$/, '');
    if (!ad || /^(Toplam|TÜİK|TurkStat|Kaynak|Source|Tablo|Figures|\(|\d|\*)/i.test(ad)) continue;
    const d = {};
    for (const [yil, j] of yilSut) { const v = Number(s[j]); if (Number.isFinite(v) && v > 0) d[yil] = v; }
    if (Object.keys(d).length) out.push({ ad, degerler: d });
  }
  return { yillar: [...new Set(yilSut.map(([y]) => y))].sort(), satirlar: out };
}

/* ─── dosyaları oku ───────────────────────────────────────────────────────── */

const bulten = [];
let yillar = [];
for (const f of readdirSync(DIZIN)) {
  if (!/\.xls$/i.test(f)) continue;
  if (!/(tah[ıi]l|sebze|meyve|süs|sus)/i.test(f)) continue;
  const { yillar: y, satirlar } = bultenOku(join(DIZIN, f));
  // Yalnızca 2024+2025 taşıyan dosyalar; 2025/2026 tahmini olanlar burada değil.
  if (!(y.includes(2024) && y.includes(2025))) continue;
  yillar = y;
  for (const s of satirlar) bulten.push(s);
}
if (!bulten.length) throw new Error(`${DIZIN} içinde 2024+2025 taşıyan bülten dosyası bulunamadı`);

const [ONCEKI, HEDEF] = [2024, 2025];
console.log(`bülten satırı: ${bulten.length} (yıllar: ${yillar.join(', ')})`);

/* ─── D1 gerçeği ──────────────────────────────────────────────────────────── */

const d1Satir = await d1(`SELECT urun, yil, deger FROM bitkisel_tr_uretim_detay
  WHERE unsur='Üretim' AND yil IN (${ONCEKI}, ${HEDEF})`);
const d1Deger = new Map();     // "urun|yil" → deger
const d1AdNorm = new Map();    // normalize ad → gerçek ad
for (const r of d1Satir) {
  d1Deger.set(`${r.urun}|${r.yil}`, Number(r.deger));
  d1AdNorm.set(norm(r.urun), r.urun);
}
const tumAdlar = await d1("SELECT DISTINCT urun FROM bitkisel_tr_uretim_detay WHERE unsur='Üretim'");
for (const r of tumAdlar) if (!d1AdNorm.has(norm(r.urun))) d1AdNorm.set(norm(r.urun), r.urun);

/* ─── eşle ve 2024 ile DOĞRULA ────────────────────────────────────────────── */

const kabul = []; const redAd = []; const redDeger = []; const zatenVar = [];
/**
 * Ad birebir tutmuyorsa ADAY ara: bültenin adıyla başlayan D1 ürünleri.
 * ("Nohut" → "Nohut, Kuru";  "Mercimek (kırmızı)" → "Mercimek, Kuru (Kırmızı)")
 *
 * Aday ismi TAHMİN, kanıt değil. Bu yüzden aday ancak ONCEKI yılın değeri
 * D1'inkiyle birebir tutarsa kabul ediliyor ve BİRDEN ÇOK aday tutarsa hiçbiri
 * alınmıyor — hangisi olduğu belirsizse yazmamak doğrusu.
 */
function adaylar(bultenAd) {
  const n = norm(bultenAd);
  const kelimeler = n.split(' ').filter((x) => x.length > 2);
  return [...d1AdNorm.entries()]
    .filter(([dn]) => dn !== n && kelimeler.length > 0 && kelimeler.every((k) => dn.includes(k)))
    .map(([, ad]) => ad);
}

let adayIle = 0;
for (const b of bulten) {
  let d1Ad = d1AdNorm.get(norm(b.ad));
  if (!d1Ad) {
    const bultenOnceki0 = b.degerler[ONCEKI];
    const gecen = adaylar(b.ad).filter((c) => {
      const v = d1Deger.get(`${c}|${ONCEKI}`);
      return Number.isFinite(v) && Number.isFinite(bultenOnceki0)
        && Math.abs(v - bultenOnceki0) / Math.max(Math.abs(v), 1) <= TOLERANS;
    });
    if (gecen.length === 1) { d1Ad = gecen[0]; adayIle += 1; }
  }
  if (!d1Ad) { redAd.push(b.ad); continue; }
  if (d1Deger.has(`${d1Ad}|${HEDEF}`)) { zatenVar.push(d1Ad); continue; }

  const bultenOnceki = b.degerler[ONCEKI];
  const d1Onceki = d1Deger.get(`${d1Ad}|${ONCEKI}`);
  const hedefDeger = b.degerler[HEDEF];
  if (!Number.isFinite(hedefDeger)) continue;

  // Doğrulama: bültenin ONCEKI yılı D1'inkiyle aynı mı?
  if (!Number.isFinite(bultenOnceki) || !Number.isFinite(d1Onceki)) {
    redDeger.push({ ad: b.ad, d1Ad, sebep: `${ONCEKI} karşılaştırılamadı` });
    continue;
  }
  const fark = Math.abs(bultenOnceki - d1Onceki) / Math.max(Math.abs(d1Onceki), 1);
  if (fark > TOLERANS) {
    redDeger.push({ ad: b.ad, d1Ad, sebep: `${ONCEKI}: bülten ${Math.round(bultenOnceki).toLocaleString('tr-TR')} ≠ D1 ${Math.round(d1Onceki).toLocaleString('tr-TR')}` });
    continue;
  }
  kabul.push({ d1Ad, yil: HEDEF, deger: hedefDeger });
}

console.log(`\n✓ yazılabilir (${ONCEKI} doğrulaması geçti): ${kabul.length}`);
console.log(`   bunların ${adayIle}'i farklı yazımdan aday eşleşmeyle bulundu`);
console.log(`• ${HEDEF} zaten dolu                     : ${zatenVar.length}`);
console.log(`✗ D1'de adı yok (toplu/kapsam dışı)      : ${redAd.length}`);
console.log(`✗ ${ONCEKI} tutmadı — granülerlik farkı   : ${redDeger.length}`);

if (kabul.length) {
  console.log(`\nyazılacaklardan örnekler:`);
  for (const k of kabul.slice(0, 12)) {
    console.log(`   ${k.d1Ad.slice(0, 40).padEnd(42)} ${Math.round(k.deger).toLocaleString('tr-TR')}`);
  }
}
if (redDeger.length) {
  console.log(`\n${ONCEKI} tutmadığı için ATLANANLAR (ilk 10):`);
  for (const r of redDeger.slice(0, 10)) console.log(`   ${r.ad.slice(0, 26).padEnd(28)} → ${r.d1Ad.slice(0, 26).padEnd(28)} ${r.sebep}`);
}

if (!YAZ) { console.log('\n(--yaz verilmedi, D1\'e yazılmadı)'); process.exit(0); }
if (!kabul.length) { console.log('\nYazılacak satır yok.'); process.exit(0); }

const s = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = kabul.map((k) =>
  `INSERT INTO bitkisel_tr_uretim_detay (urun, unsur, yil, deger) VALUES (${s(k.d1Ad)}, 'Üretim', ${k.yil}, ${k.deger});`).join('\n');
const yol = join(tmpdir(), `bitkisel-${Date.now()}.sql`);
writeFileSync(yol, sql);
try {
  await calistir('npx', ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--file', yol],
    { cwd: KOK, maxBuffer: 2e8 });
  const [sonra] = await d1(`SELECT COUNT(DISTINCT urun) n FROM bitkisel_tr_uretim_detay WHERE unsur='Üretim' AND yil=${HEDEF}`);
  console.log(`\n✓ ${kabul.length} satır yazıldı — ${HEDEF} artık ${sonra.n} ürün`);
} finally { try { unlinkSync(yol); } catch { /* geçici */ } }
