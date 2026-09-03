#!/usr/bin/env node
/**
 * MEDAS pivot XLS'leri → `tuik_bitkisel_uretim` İL satırları (duzeykod=3).
 *
 *   node scripts/medas-pivot-il-yukle.mjs ~/Downloads/pivot\ *.xls
 *   node scripts/medas-pivot-il-yukle.mjs ~/Downloads/pivot\ *.xls --yaz
 *   … --unsur "Ekilen Alan"        (varsayılan: Üretim)
 *
 * NEDEN BU BETİK VAR
 * ------------------
 * TÜİK bitkisel üretimi iki aşamada yayımlıyor: ekim alanı ilkbaharda, ÜRETİM
 * hasat sonrası. İl kırılımı indirilebilir tablolarda yok, yalnızca MEDAS'ın
 * pivot dışa aktarımında — ve MEDAS Node'dan çekilemiyor. Bu yüzden dosyalar
 * elle indiriliyor, betik yalnızca ayrıştırıp yüklüyor.
 *
 * ─── PİVOT DOSYALARININ ÜÇ TUZAĞI ───────────────────────────────────────────
 * Hepsi ölçülerek bulundu; ikisi sessizce YANLIŞ SAYI üretiyordu.
 *
 * 1) YİNELENEN DIŞA AKTARIM. Aynı veri iki dosyada olabiliyor (15 ve 17 ürün
 *    bazında birebir aynıydı). Toplarsan her şey iki katına çıkar.
 *
 * 2) KIRILIM DOSYALARI. "(Kuru/Sulu) - (1./2. Ekiliş)" dosyası aynı toplamın
 *    parçalarını veriyor; ana dosyayla toplamak %200'e kadar şişiriyordu.
 *
 * 3) ÖRTÜALTI AYRI. "Örtüaltı Sebzeler/Meyveler" ayrı üretim. D1'in il
 *    satırları AÇIK ALAN üretimine karşılık geliyor — ölçüldü: örtüaltı
 *    eklenince ülke satırıyla tutan ürün sayısı 173'ten 143'e düşüyor.
 *
 * Bu yüzden dosyalar ada göre sınıflanıyor ve yalnız ANA olanlar toplanıyor;
 * geri kalanı raporlanıp DIŞARIDA bırakılıyor. Sessizce atlamak, bir dahaki
 * sefere yanlış dosya indirildiğinde fark edilmezdi.
 *
 * ─── GÜVENLİK AĞI ───────────────────────────────────────────────────────────
 * a) Anahtar eşlemesi (urunkod + yerkod) D1'de ZATEN DOLU bir göstergeyle
 *    doğrulanabiliyor; ilk kurulumda Ekilen Alan'da 12 örnekten 11'i birebir
 *    tuttu (12.'si D1'de hiç olmayan bir ürün-il çiftiydi).
 * b) Yazmadan önce il toplamları, BAĞIMSIZ kaynaktan gelen Türkiye satırıyla
 *    (duzeykod=1) karşılaştırılıyor. Tutan oranı düşükse betik duruyor.
 * c) Dolu bir hücrenin üzerine YAZILMIYOR; üzerine yazılacak satır varsa
 *    sayısı raporlanıp atlanıyor.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const YAZ = arg.includes('--yaz');
const UNSUR = arg.includes('--unsur') ? arg[arg.indexOf('--unsur') + 1] : 'Üretim';
const DOSYALAR = arg.filter((a) => a.endsWith('.xls') || a.endsWith('.xlsx'));

if (!DOSYALAR.length) {
  console.error('Kullanım: node scripts/medas-pivot-il-yukle.mjs <pivot.xls…> [--unsur X] [--yaz]');
  process.exit(1);
}

/** Pivot etiketindeki gösterge adı → D1'deki `unsur`. */
const UNSUR_ADI = {
  'Üretim Miktarı': 'Üretim',
  'Ekilen Alan': 'Ekilen Alan',
  'Hasat Edilen Alan': 'Hasat Edilen Alan',
  Verim: 'Verim',
  'Meyve Veren Yaşta Ağaç Sayısı': 'Meyve Veren Yaşta Ağaç Sayısı',
  'Meyve Vermeyen Yaşta Ağaç Sayısı': 'Meyve Vermeyen Yaşta Ağaç Sayısı',
  'Toplu Meyveliklerin Alanı': 'Toplu Meyveliklerin Alanı',
};

/** Sayfa başlığından dosya sınıfı. Bkz. başlıktaki "üç tuzak". */
function sinif(basligi) {
  const b = (basligi || '').toLocaleLowerCase('tr');
  if (b.includes('örtüaltı')) return 'örtüaltı';
  if (b.includes('ekiliş') || b.includes('kuru') || b.includes('sulu')) return 'kırılım';
  return 'ana';
}

const OBEK = 400;  // D1 tek ifade boyutunu sınırlıyor

function d1(sql) {
  const out = execFileSync('npx', [
    'wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql,
  ], { cwd: KOK, maxBuffer: 6e8, encoding: 'utf8' });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results ?? [];
}

/* ══════════════════════════════════════════════════════════════════════════ */

console.log(`MEDAS pivot → il ${UNSUR}  |  ${DOSYALAR.length} dosya\n`);
console.log('1) ayrıştırma');

const hucreler = [];       // { urunkod, urun, birim, plaka, deger }
const disarida = [];

for (const yol of DOSYALAR) {
  const wb = XLSX.read(readFileSync(yol), { type: 'buffer' });
  const r = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });

  const grup = (r.find((x) => x[0] && x[0] !== 'Satırlar') ?? [])[0] ?? '';
  const tur = sinif(grup);

  /* Başlık: "Adana-1" → plaka 1. Eşleşme ADA göre değil PLAKAYA göre;
     ad eşleştirmesi "Afyonkarahisar"/"Afyon" gibi farklarda kaybederdi. */
  const bas = r.find((x) => String(x[3] ?? '').includes('-')) ?? [];
  const plakalar = bas.map((h) => {
    const m = /^(.*)-(\d{1,2})$/.exec(String(h ?? '').trim());
    return m ? Number(m[2]) : null;
  });

  let n = 0;
  for (const satir of r) {
    const etiket = satir[1];
    if (typeof etiket !== 'string' || !etiket.includes(' ve ')) continue;
    if (UNSUR_ADI[etiket.split(' ve ')[0].trim()] !== UNSUR) continue;

    const m = /ve\s+([\d.]+)\s*\((.+?)\)\s*-\s*(.+)$/.exec(etiket);
    if (!m) continue;
    const [, urunkod, urun, birim] = m;

    for (let c = 3; c < satir.length; c++) {
      const p = plakalar[c];
      const v = Number(satir[c]);
      if (!p || !Number.isFinite(v) || satir[c] === '' || satir[c] === null) continue;
      if (tur === 'ana') hucreler.push({ urunkod, urun, birim: birim.trim(), plaka: p, deger: v });
      n += 1;
    }
  }
  const ad = basename(yol);
  if (tur === 'ana') console.log(`   ${ad.padEnd(16)} ${String(grup).slice(0, 34).padEnd(36)} ${n} hücre`);
  else { disarida.push(`${ad} (${tur}: ${String(grup).slice(0, 40)})`); }
}

if (disarida.length) {
  console.log('\n   DIŞARIDA bırakılan dosyalar — toplanınca sayıyı şişiriyorlar:');
  disarida.forEach((d) => console.log(`     · ${d}`));
}

/*
 * Aynı (ürün, il) birden çok ANA dosyada geçebiliyor ve değerler birebir aynı
 * oluyor (yinelenen dışa aktarım). Toplamıyoruz — tekilleştiriyoruz. Değerler
 * FARKLI çıkarsa bu bir varsayım ihlalidir; sayılıp raporlanıyor.
 */
const tekil = new Map();
let catisma = 0;
for (const h of hucreler) {
  const k = `${h.urunkod}|${h.plaka}`;
  const v = tekil.get(k);
  if (!v) tekil.set(k, h);
  else if (Math.abs(v.deger - h.deger) > 0.5) catisma += 1;
}
console.log(`\n   ${hucreler.length.toLocaleString('tr')} hücre → ${tekil.size.toLocaleString('tr')} tekil (ürün, il)`);
if (catisma) console.log(`   ⚠ ${catisma} çiftte aynı anahtara FARKLI değer geldi — ilki alındı`);

/* ══════════════════════════════════════════════════════════════════════════ */

console.log(`\n2) D1 il satırlarıyla eşleşme (duzeykod=3, unsur='${UNSUR}')`);
const d1Satir = d1(
  `SELECT autoid, urunkod, yerkod, urun, y2025 FROM tuik_bitkisel_uretim
   WHERE duzeykod=3 AND unsur='${UNSUR.replace(/'/g, "''")}'`,
);
const harita = new Map(d1Satir.map((r) => [`${r.urunkod}|${r.yerkod}`, r]));
console.log(`   D1'de ${d1Satir.length.toLocaleString('tr')} satır`);

const yazilacak = [];
let eslesmeyen = 0; let doluAtlandi = 0;
const eslesmeyenUrun = new Map();
for (const [k, h] of tekil) {
  const r = harita.get(k);
  if (!r) {
    eslesmeyen += 1;
    eslesmeyenUrun.set(h.urun, (eslesmeyenUrun.get(h.urun) ?? 0) + 1);
    continue;
  }
  /* Dolu hücrenin üzerine yazılmıyor. */
  if (Number(r.y2025) > 0) { doluAtlandi += 1; continue; }
  yazilacak.push([r.autoid, h.deger]);
}
console.log(`   eşleşen ve yazılacak : ${yazilacak.length.toLocaleString('tr')}`);
console.log(`   D1'de satırı olmayan : ${eslesmeyen.toLocaleString('tr')} (${eslesmeyenUrun.size} ürün)`);
console.log(`   zaten dolu, atlandı  : ${doluAtlandi.toLocaleString('tr')}`);

/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\n3) güvenlik ağı: il toplamları Türkiye satırıyla tutuyor mu');
const ulke = d1(
  `SELECT urunkod, urun, y2025 FROM tuik_bitkisel_uretim
   WHERE duzeykod=1 AND unsur='${UNSUR.replace(/'/g, "''")}' AND y2025 > 0`,
);
const ilToplam = new Map();
for (const h of tekil.values()) {
  ilToplam.set(h.urunkod, (ilToplam.get(h.urunkod) ?? 0) + h.deger);
}

let tutan = 0; let sapan = 0; const sapmalar = [];
for (const u of ulke) {
  const t = ilToplam.get(u.urunkod);
  if (t === undefined) continue;
  const hedef = Number(u.y2025);
  const fark = hedef ? Math.abs(t - hedef) / hedef * 100 : 0;
  if (fark < 1) tutan += 1;
  else { sapan += 1; sapmalar.push([fark, u.urun, hedef, t]); }
}
const oran = tutan + sapan ? tutan / (tutan + sapan) : 0;
console.log(`   %1 içinde tutan: ${tutan} / ${tutan + sapan}  (%${(oran * 100).toFixed(1)})`);
sapmalar.sort((a, b) => b[0] - a[0]).slice(0, 6).forEach(([f, ad, h, t]) => console.log(
  `     %${f.toFixed(1).padStart(6)}  ${ad.slice(0, 28).padEnd(30)} ülke=${Math.round(h).toLocaleString('tr').padStart(12)}  il=${Math.round(t).toLocaleString('tr').padStart(12)}`,
));

/*
 * Eşik: ürünlerin %90'ı tutmalı. Kalan sapmalar TÜİK'in il düzeyinde gizlediği
 * küçük üreticilerden geliyor (il toplamı ülkeden KÜÇÜK çıkar) — bu normal.
 * Oran bunun altına düşerse yanlış dosya kümesi yüklenmiş demektir.
 */
if (oran < 0.9) {
  console.error(`\n✗ Tutma oranı %${(oran * 100).toFixed(1)} — beklenen ≥%90. `
    + 'Yanlış dosya kümesi olabilir (kırılım/örtüaltı karışmış). YAZILMADI.');
  process.exit(1);
}

if (!YAZ) {
  console.log("\n(--yaz verilmedi; D1'e YAZILMADI.)");
  process.exit(0);
}

/* ══════════════════════════════════════════════════════════════════════════ */

console.log('\n4) yazılıyor');
const ifadeler = [];
for (let i = 0; i < yazilacak.length; i += OBEK) {
  const dilim = yazilacak.slice(i, i + OBEK);
  ifadeler.push(
    `UPDATE tuik_bitkisel_uretim SET y2025 = CASE autoid ${
      dilim.map(([id, v]) => `WHEN ${id} THEN ${v}`).join(' ')
    } END WHERE autoid IN (${dilim.map(([id]) => id).join(',')});`,
  );
}
const dizin = join(KOK, '.tuik-indirme');
mkdirSync(dizin, { recursive: true });
const sqlYol = join(dizin, `il-${UNSUR.replace(/\s+/g, '-')}-2025.sql`);
writeFileSync(sqlYol, `${ifadeler.join('\n')}\n`);
execFileSync('npx', [
  'wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--file', sqlYol, '-y',
], { cwd: KOK, stdio: 'inherit', maxBuffer: 6e8 });

console.log('\n5) doğrulama');
const son = d1(
  `SELECT COUNT(*) n, SUM(CASE WHEN y2025>0 THEN 1 ELSE 0 END) dolu
   FROM tuik_bitkisel_uretim WHERE duzeykod=3 AND unsur='${UNSUR.replace(/'/g, "''")}'`,
);
console.log(`   il ${UNSUR}: ${son[0].n} satır, y2025 dolu ${son[0].dolu}`);

// Önbellek damgası: atlanırsa sayfalar ~1 saat eski veriyi gösterir.
d1(`INSERT INTO veri_damga (tablo, damga)
    VALUES ('tuik_bitkisel_uretim', strftime('%s','now')*1000)
    ON CONFLICT(tablo) DO UPDATE SET damga=excluded.damga`);
console.log('   önbellek damgası ilerletildi');
