#!/usr/bin/env node
/**
 * MySQL'den dışa aktarılan y2025 sütununu D1'e taşır.
 *
 *   node scripts/bitkisel-y2025-yukle.mjs ~/Downloads/tuik_bitkisel_uretim.csv
 *   node scripts/bitkisel-y2025-yukle.mjs ~/Downloads/... --yaz
 *
 * NEDEN BU BETİK VAR
 * ------------------
 * `tuik_bitkisel_uretim` MySQL'den D1'e taşındığında y2025 sütunu HENÜZ
 * yoktu; sonradan MySQL'e elle eklendi ama D1'e yansımadı. D1'de sütun hiç
 * yoktu (y2004…y2024), dolayısıyla on bir bitkisel sayfası 2024'te kalıyordu.
 *
 * Türkiye seviyesi Veri Portalı Excel'inden dolduruldu (826 satırın 709'u),
 * ama İL ve BÖLGE seviyesi yalnızca MySQL'de var — TÜİK bunu indirilebilir
 * tablo olarak yayımlamıyor, dinamik veritabanında.
 *
 * NEDEN DOĞRUDAN MySQL'DEN ÇEKMİYOR
 * ---------------------------------
 * MySQL 3306 dışarıya kapalı (ECONNREFUSED); erişim yalnızca phpMyAdmin
 * üzerinden. Bu yüzden CSV köprüsü:
 *
 *   phpMyAdmin → ist.tuik_bitkisel_uretim → SQL sekmesi:
 *     SELECT autoid, y2025 FROM tuik_bitkisel_uretim WHERE y2025 IS NOT NULL
 *   → Dışa aktar → CSV → başlık satırı dahil
 *
 * EŞLEŞTİRME
 * ----------
 * `autoid` üzerinden. İki tarafta da 275.099 satır var ve autoid taşındı,
 * yani ürün/il adı eşleştirmeye gerek yok — ad eşleştirmesi Türkçe karakter
 * ve yazım farklarında sessizce kayıp verirdi.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
const YAZ = arg.includes('--yaz');
const CSV = arg.find((a) => !a.startsWith('--'));

if (!CSV) {
  console.error('Kullanım: node scripts/bitkisel-y2025-yukle.mjs <csv> [--yaz]');
  process.exit(1);
}

/** Tek ifadeye sığdırılan satır sayısı. D1 ifade boyutunu sınırlıyor. */
const OBEK = 400;

/* ══════════════════════════════════════════════════════════════════════════
   CSV
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * phpMyAdmin CSV'si tırnaklı ve `;` veya `,` ayraçlı olabiliyor; ondalık
 * ayırıcı da yerel ayara göre değişiyor. İki sütun beklediğimiz için
 * ayrıştırma kasten dar tutuldu: fazlası sessiz hataya davetiye.
 */
function csvOku(yol) {
  const ham = readFileSync(yol, 'utf8').replace(/^﻿/, '');
  const satirlar = ham.split(/\r?\n/).filter((s) => s.trim());
  if (!satirlar.length) throw new Error('CSV boş.');

  const ayrac = satirlar[0].includes(';') ? ';' : ',';
  const bolum = (s) => s.split(ayrac).map((x) => x.trim().replace(/^"|"$/g, ''));

  const baslik = bolum(satirlar[0]).map((h) => h.toLowerCase());
  const iId = baslik.indexOf('autoid');
  const iY = baslik.findIndex((h) => h === 'y2025');
  if (iId < 0 || iY < 0) {
    throw new Error(`Başlıkta autoid ve y2025 bulunamadı. Görülen: ${baslik.join(', ')}`);
  }

  const kayitlar = [];
  let atlanan = 0;
  for (const satir of satirlar.slice(1)) {
    const p = bolum(satir);
    const id = Number(p[iId]);
    const hamDeger = (p[iY] ?? '').replace(/\s/g, '');
    if (!Number.isInteger(id) || hamDeger === '' || hamDeger.toUpperCase() === 'NULL') {
      atlanan += 1; continue;
    }
    // Virgüllü ondalık (TR yerel ayarı) noktaya çevriliyor.
    const deger = Number(hamDeger.includes(',') && !hamDeger.includes('.')
      ? hamDeger.replace(',', '.') : hamDeger);
    if (!Number.isFinite(deger)) { atlanan += 1; continue; }
    kayitlar.push([id, deger]);
  }
  return { kayitlar, atlanan };
}

/* ══════════════════════════════════════════════════════════════════════════
   D1
   ══════════════════════════════════════════════════════════════════════════ */

function d1(sql) {
  const stdout = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 4e8, encoding: 'utf8' },
  );
  return JSON.parse(stdout.slice(stdout.indexOf('[')))[0].results ?? [];
}

/* ══════════════════════════════════════════════════════════════════════════
   ANA AKIŞ
   ══════════════════════════════════════════════════════════════════════════ */

console.log(`CSV okunuyor: ${CSV}\n`);
const { kayitlar, atlanan } = csvOku(CSV);
console.log(`1) ${kayitlar.length} satır okundu (${atlanan} boş/NULL atlandı)`);

const mevcut = await d1('SELECT COUNT(*) n FROM tuik_bitkisel_uretim');
console.log(`   D1'de ${mevcut[0].n} satır var`);

/*
 * DOĞRULAMA: CSV'deki autoid'ler D1'de gerçekten var mı? Yoksa göç sırasında
 * anahtarlar kaymış demektir ve yazmak sessizce hiçbir şey güncellemez.
 */
const ornek = kayitlar.slice(0, 5).map(([id]) => id);
const bulunan = await d1(
  `SELECT COUNT(*) n FROM tuik_bitkisel_uretim WHERE autoid IN (${ornek.join(',')})`,
);
console.log(`2) anahtar denetimi: ${ornek.length} örnek autoid'in ${bulunan[0].n} tanesi D1'de`);
if (bulunan[0].n !== ornek.length) {
  console.error('   ✗ autoid eşleşmiyor — göç anahtarları farklı. Yazılmadı.');
  process.exit(1);
}

/* Türkiye toplamı, yazmadan önce beklenen değeri gösterelim. */
const trToplam = kayitlar.length;
console.log(`3) ${Math.ceil(trToplam / OBEK)} ifade üretiliyor (öbek ${OBEK})`);

const ifadeler = [];
for (let i = 0; i < kayitlar.length; i += OBEK) {
  const dilim = kayitlar.slice(i, i + OBEK);
  const durumlar = dilim.map(([id, v]) => `WHEN ${id} THEN ${v}`).join(' ');
  const idler = dilim.map(([id]) => id).join(',');
  ifadeler.push(
    `UPDATE tuik_bitkisel_uretim SET y2025 = CASE autoid ${durumlar} END WHERE autoid IN (${idler});`,
  );
}

const dizin = join(KOK, '.tuik-indirme');
mkdirSync(dizin, { recursive: true });
const sqlYol = join(dizin, 'bitkisel-y2025.sql');
writeFileSync(sqlYol, ifadeler.join('\n') + '\n');
console.log(`   ${sqlYol}`);

if (!YAZ) {
  console.log("\n(--yaz verilmedi; D1'e YAZILMADI.)");
  process.exit(0);
}

console.log('\n4) D1\'e yazılıyor (dosya olarak)');
execFileSync('npx',
  ['wrangler', 'd1', 'execute', 'tarpovizyon-basic', '--remote', '--file', sqlYol, '-y'],
  { cwd: KOK, stdio: 'inherit', maxBuffer: 4e8 });

console.log('\n5) doğrulama');
const kontrol = await d1(`
  SELECT duzeykod, COUNT(*) n, SUM(CASE WHEN y2025 IS NOT NULL THEN 1 ELSE 0 END) dolu
  FROM tuik_bitkisel_uretim GROUP BY duzeykod ORDER BY duzeykod`);
kontrol.forEach((r) => console.log(`   duzeykod=${r.duzeykod}  satır=${r.n}  y2025 dolu=${r.dolu}`));

const bugday = await d1(`
  SELECT ROUND(SUM(y2025)) t FROM tuik_bitkisel_uretim
  WHERE duzeykod=1 AND unsur='Üretim' AND urun LIKE '%uğday%'`);
console.log(`   Türkiye buğday y2025: ${bugday[0].t}`);

// Önbellek damgası: atlanırsa sayfalar ~1 saat eski veriyi gösterir.
await d1(`INSERT INTO veri_damga (tablo, damga)
  VALUES ('tuik_bitkisel_uretim', strftime('%s','now')*1000)
  ON CONFLICT(tablo) DO UPDATE SET damga=excluded.damga`);
console.log('   önbellek damgası ilerletildi');
