#!/usr/bin/env node
/**
 * TÜİK Veri Portalı → `tuik_hayvancilik_canlihayvan` ÜLKE satırlarında kanatlı.
 *
 *   node scripts/tuik-kumes-ulke-yukle.mjs            # kuru çalışma
 *   node scripts/tuik-kumes-ulke-yukle.mjs --yaz      # D1'e yaz
 *   node scripts/tuik-kumes-ulke-yukle.mjs --yil 2025 --yaz
 *
 * NEDEN BU BETİK VAR
 * ------------------
 * Tabloda 2025 yalnızca İL ve İLÇE satırlarına yazılmış. Ülke satırında geviş
 * getirenlerin 2025'i var ama KANATLININ YOK: Tavuk/Hindi/Kaz/Ördek 0. Genel
 * Bakış sayfası ülke satırını okuduğu için kanatlı orada sıfır görünüyordu.
 *
 * NEDEN İL SATIRLARINDAN TOPLANMIYOR
 * ----------------------------------
 * Denendi ve GÜVENİLMEZ çıktı. 2024'te il/ilçe/bölge satırlarında Et Tavuğu ile
 * Yumurta Tavuğu BİREBİR AYNI sayıyı taşıyor (il: 108.061.661 = 108.061.661),
 * yani kategori ayrımı o seviyelerde bozulmuş; toplamları ülke satırının
 * %57'sini veriyor. Üstelik il düzeyinde 81 değil 80 il var. Bozuk ve eksik bir
 * temelden türetilen sayıyı üretim verisine yazmak, sıfırdan daha kötü olurdu.
 *
 * KAYNAK
 * ------
 * 13.79 temasında "46_t8 — Türlerine Göre Kümes Hayvan Sayıları". Türkiye
 * toplamı, 1991'den bugüne, beş tür ayrı sütunda.
 *
 * GÜVENLİK AĞI
 * ------------
 * Yazmadan önce BİR ÖNCEKİ YIL kaynakla D1 arasında birebir karşılaştırılıyor.
 * Tutmuyorsa betik yazmadan duruyor: ya TÜİK rakamı revize etmiştir ya da
 * satır eşlemesi kaymıştır; ikisinde de körlemesine yazmak yanlış.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERI_PORTALI = 'https://veriportali.tuik.gov.tr';
const TEMA_DUGUM = '13.79';
const TABLO = '46_t8';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const arg = process.argv.slice(2);
const YAZ = arg.includes('--yaz');
const YIL = Number(arg[arg.indexOf('--yil') + 1]) || 2025;

/**
 * XLS'teki tür sütunu → D1 satırını bulan ölçüt.
 *
 * Tavuk iki KATEGORİYE bölünmüş (Et/Yumurta), diğer üçünde kategori yok.
 * Eşleme ada göre değil bu ölçütlere göre yapılıyor; ada göre eşleştirmek
 * "Ördek" ile "Ördek " gibi farklarda sessizce kaybederdi.
 */
const TURLER = [
  { sutun: 1, grup: 'Tavuk', kategori: 'Yumurta Tavuğu' },
  { sutun: 3, grup: 'Tavuk', kategori: 'Et Tavuğu' },
  { sutun: 5, grup: 'Hindi', kategori: null },
  { sutun: 7, grup: 'Kaz', kategori: null },
  { sutun: 9, grup: 'Ördek', kategori: null },
];

/* ══════════════════════════════════════════════════════════════════════════ */

function getir(url, ekBaslik = []) {
  let son;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    try {
      return execFileSync('curl', [
        '-sS', '--max-time', '120', '-A', UA,
        '-H', `Referer: ${VERI_PORTALI}/`, ...ekBaslik, url,
      ], { maxBuffer: 2e8 });
    } catch (e) {
      son = e;
      if (deneme < 3) execFileSync('sleep', ['10']);
    }
  }
  throw new Error(`İndirilemedi (3 deneme): ${url}\n  ${son?.message ?? ''}`);
}

function tabloUrl() {
  const agac = JSON.parse(getir(
    `${VERI_PORTALI}/api/tr/data/statistical-themes`,
    ['-H', 'X-Requested-With: XMLHttpRequest', '-H', 'Accept: application/json'],
  ).toString('utf8')).data;

  const dugum = (function ara(ns) {
    for (const n of ns ?? []) {
      if (String(n.id) === TEMA_DUGUM) return n;
      const r = ara(n.children);
      if (r) return r;
    }
    return null;
  })(agac);
  if (!dugum) throw new Error(`Tema ${TEMA_DUGUM} bulunamadı — portal ağacı değişmiş.`);

  let url = null;
  (function gez(ns) {
    for (const n of ns ?? []) {
      if (String(n.id ?? '').endsWith(`istab-${TABLO}`) && n.url) url = n.url;
      gez(n.children);
    }
  })([dugum]);
  if (!url) throw new Error(`${TABLO} tablosu temada yok — portal düzeni değişmiş.`);
  return VERI_PORTALI + url;
}

function d1(sql) {
  const out = execFileSync('npx', [
    'wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json',
    '--command', sql,
  ], { cwd: KOK, maxBuffer: 4e8, encoding: 'utf8' });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results ?? [];
}

/** XLS'te ondalık kirlilik var (266597427.00000003); tam sayıya yuvarlanıyor. */
const tam = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/* ══════════════════════════════════════════════════════════════════════════ */

console.log(`TÜİK ${TABLO} → ülke kanatlı satırları  |  hedef yıl ${YIL}\n`);

console.log('1) tablo indiriliyor');
const dizin = join(KOK, '.tuik-indirme');
mkdirSync(dizin, { recursive: true });
const yol = join(dizin, `${TABLO}.xls`);
writeFileSync(yol, getir(tabloUrl()));

/* HTML yerine XLS geldiğini imzadan doğrula: portal hata sayfasını da 200 ile
   döndürüyor ve xlsx bunu sessizce boş sayfa olarak ayrıştırabiliyor. */
const imza = readFileSync(yol).subarray(0, 4).toString('hex');
if (imza !== 'd0cf11e0') {
  throw new Error(`Beklenen XLS imzası gelmedi (${imza}) — muhtemelen HTML hata sayfası.`);
}

const satirlar = XLSX.utils.sheet_to_json(
  XLSX.read(readFileSync(yol), { type: 'buffer' }).Sheets[TABLO],
  { header: 1, raw: true },
);
const yilSatiri = (y) => satirlar.find((r) => Number(r[0]) === y);

const bu = yilSatiri(YIL);
const onceki = yilSatiri(YIL - 1);
if (!bu) throw new Error(`${YIL} satırı tabloda yok — TÜİK henüz yayımlamamış olabilir.`);
if (!onceki) throw new Error(`${YIL - 1} satırı yok; doğrulama yapılamıyor.`);
console.log(`   ${YIL} ve ${YIL - 1} satırları bulundu`);

console.log(`\n2) güvenlik ağı: ${YIL - 1} kaynakla D1 tutuyor mu`);
const hedefler = [];
for (const t of TURLER) {
  const kosul = t.kategori
    ? `grup='${t.grup}' AND kategori='${t.kategori}'`
    : `grup='${t.grup}' AND (kategori IS NULL OR kategori='')`;
  const rows = d1(
    `SELECT id, y${YIL - 1} onceki FROM tuik_hayvancilik_canlihayvan
     WHERE duzey='ülke' AND ${kosul}`,
  );
  if (rows.length !== 1) {
    throw new Error(`${t.grup}/${t.kategori ?? '-'}: ülke satırı ${rows.length} tane (1 bekleniyordu).`);
  }
  const kaynakOnceki = tam(onceki[t.sutun]);
  const d1Onceki = tam(rows[0].onceki);
  const ad = `${t.grup}${t.kategori ? ` (${t.kategori})` : ''}`;
  if (kaynakOnceki !== d1Onceki) {
    throw new Error(
      `${ad}: ${YIL - 1} tutmuyor — kaynak ${kaynakOnceki}, D1 ${d1Onceki}. `
      + 'TÜİK revize etmiş ya da satır eşlemesi kaymış olabilir. YAZILMADI.',
    );
  }
  const deger = tam(bu[t.sutun]);
  if (deger === null) throw new Error(`${ad}: ${YIL} değeri okunamadı.`);
  console.log(`   ✓ ${ad.padEnd(24)} ${YIL - 1}=${d1Onceki.toLocaleString('tr')}  →  ${YIL}=${deger.toLocaleString('tr')}`);
  hedefler.push({ id: rows[0].id, deger, ad });
}

if (!YAZ) {
  console.log('\n(--yaz verilmedi; D1\'e YAZILMADI.)');
  process.exit(0);
}

console.log('\n3) yazılıyor');
const sql = hedefler
  .map((h) => `UPDATE tuik_hayvancilik_canlihayvan SET y${YIL} = ${h.deger} WHERE id = ${h.id};`)
  .join('\n');
const sqlYol = join(dizin, `kumes-ulke-${YIL}.sql`);
writeFileSync(sqlYol, `${sql}\n`);
execFileSync('npx', [
  'wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--file', sqlYol, '-y',
], { cwd: KOK, stdio: 'inherit', maxBuffer: 4e8 });

console.log('\n4) doğrulama');
const kontrol = d1(
  `SELECT grup, kategori, y${YIL} v FROM tuik_hayvancilik_canlihayvan
   WHERE id IN (${hedefler.map((h) => h.id).join(',')}) ORDER BY grup`,
);
kontrol.forEach((r) => console.log(
  `   ${r.grup}${r.kategori ? ` (${r.kategori})` : ''}: ${Number(r.v).toLocaleString('tr')}`,
));

// Önbellek damgası: atlanırsa sayfalar ~1 saat eski veriyi gösterir.
d1(`INSERT INTO veri_damga (tablo, damga)
    VALUES ('tuik_hayvancilik_canlihayvan', strftime('%s','now')*1000)
    ON CONFLICT(tablo) DO UPDATE SET damga=excluded.damga`);
console.log('   önbellek damgası ilerletildi');
