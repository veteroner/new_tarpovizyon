#!/usr/bin/env node
/**
 * FAO yıllık veri setleri → D1 (`tarpovizyon-dunya`).
 *
 *   node scripts/fao-sync/sync.mjs                  # tümünü denetle, yazma
 *   node scripts/fao-sync/sync.mjs --yaz            # eksik yılları yükle
 *   node scripts/fao-sync/sync.mjs --set pestisit --yaz
 *
 * Ayrıntılı gerekçeler `tanimlar.mjs` başında.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BULK_KOK, TANIMLAR } from './tanimlar.mjs';

const calistir = promisify(execFile);
const KOK = new URL('../../workers/tarpovizyon-api/', import.meta.url).pathname;
const ONBELLEK = join(tmpdir(), 'fao-bulk');
const VT = 'tarpovizyon-dunya';

const arg = process.argv.slice(2);
const YAZ = arg.includes('--yaz');
// indexOf -1 dönerse arg[0]'a düşmesin diye açıkça kontrol ediliyor.
const SET = arg.includes('--set') ? arg[arg.indexOf('--set') + 1] : null;

/* ─── D1 ──────────────────────────────────────────────────────────────────── */

function ayikla(cikti) {
  const i = cikti.indexOf('[');
  if (i < 0) throw new Error(`wrangler JSON döndürmedi: ${cikti.slice(0, 300)}`);
  const j = JSON.parse(cikti.slice(i));
  if (j?.error) throw new Error(`D1: ${JSON.stringify(j.error).slice(0, 300)}`);
  return j;
}

async function sorgu(sql) {
  const { stdout } = await calistir('npx',
    ['wrangler', 'd1', 'execute', VT, '--remote', '--json', '--command', sql],
    { cwd: KOK, maxBuffer: 512 * 1024 * 1024 });
  return ayikla(stdout)[0].results ?? [];
}

async function dosyaCalistir(sql) {
  const yol = join(tmpdir(), `fao-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(yol, sql);
  try {
    const { stdout } = await calistir('npx',
      ['wrangler', 'd1', 'execute', VT, '--remote', '--json', '--file', yol],
      { cwd: KOK, maxBuffer: 512 * 1024 * 1024 });
    return ayikla(stdout);
  } finally { try { unlinkSync(yol); } catch { /* geçici */ } }
}

const s = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => {
  if (v === null || v === undefined || v === '') return 'NULL';
  const x = Number(v);
  return Number.isFinite(x) ? String(x) : 'NULL';
};

/* ─── bulk indirme ve CSV ─────────────────────────────────────────────────── */

async function bulkIndir(dosya) {
  mkdirSync(ONBELLEK, { recursive: true });
  const yerel = join(ONBELLEK, dosya);
  if (!existsSync(yerel)) {
    const r = await fetch(BULK_KOK + encodeURI(dosya), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' },
    });
    if (!r.ok) throw new Error(`indirilemedi (HTTP ${r.status}): ${dosya}`);
    writeFileSync(yerel, Buffer.from(await r.arrayBuffer()));
  }
  return yerel;
}

/**
 * Zip içindeki tek CSV'yi metin olarak verir (macOS/Linux `unzip`).
 * FAO dosyaları UTF-8; latin1 okumak 'Türkiye'yi 'TÃ¼rkiye' yapıyor ve hata
 * vermeden veritabanına bozuk yazıyor.
 */
async function csvOku(zipYolu) {
  const { stdout: liste } = await calistir('unzip', ['-Z1', zipYolu], { maxBuffer: 4 * 1024 * 1024 });
  const csv = liste.split('\n').find((x) => /\.csv$/i.test(x.trim()));
  if (!csv) throw new Error(`zip içinde CSV yok: ${zipYolu}`);
  const { stdout } = await calistir('unzip', ['-p', zipYolu, csv.trim()],
    { maxBuffer: 1024 * 1024 * 1024, encoding: 'utf8' });
  return stdout;
}

/** Tırnaklı CSV ayrıştırıcı — Value ve Item alanlarında virgül olabiliyor. */
function csvAyristir(metin) {
  const satirlar = [];
  let alan = ''; let satir = []; let tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; }
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n') { satir.push(alan); satirlar.push(satir); satir = []; alan = ''; }
    else if (c !== '\r') alan += c;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar;
}

/* ─── senkron ─────────────────────────────────────────────────────────────── */

async function setIsle(ad, t) {
  console.log(`\n── ${ad} → ${t.tablo} ──`);

  const [mevcut] = await sorgu(`SELECT MAX(year) son, COUNT(*) n FROM ${t.tablo}`);
  const sonYil = Number(mevcut.son);
  console.log(`   D1: son yıl ${sonYil}, ${Number(mevcut.n).toLocaleString('tr-TR')} satır`);

  const zip = await bulkIndir(t.dosya);
  const satirlar = csvAyristir(await csvOku(zip));
  const baslik = satirlar[0].map((x) => x.trim());
  const idx = (adi) => {
    const i = baslik.indexOf(adi);
    if (i < 0) throw new Error(`CSV'de sütun yok: ${adi} (mevcut: ${baslik.join(',')})`);
    return i;
  };
  const kolon = Object.fromEntries(Object.entries(t.esleme).map(([d1, csv]) => [d1, idx(csv)]));

  /*
   * BÖLGE/DÜNYA TOPLAMLARI ATLANIR. FAO bulk dosyalarında ülke satırlarının
   * yanında toplam satırları da var (Area Code >= 5000: World, kıtalar, gelir
   * grupları; gübrede 51000+). D1 yalnızca ÜLKELERİ tutuyor — toplamları da
   * yazmak satır sayısını %12-28, değer toplamını 2-3 kat şişiriyordu.
   */
  const ulkeSatiri = (r) => Number(r[kolon.areacode]) < 5000;

  const yeni = satirlar.slice(1)
    .filter((r) => r.length > 2 && ulkeSatiri(r) && Number(r[kolon.year]) > sonYil);
  // Math.max(...dizi) 200 bin elemanda yığını taşırıyor; döngüyle bul.
  let dosyaSonYil = 0;
  for (let i = 1; i < satirlar.length; i++) {
    const y = Number(satirlar[i][kolon.year]);
    if (Number.isFinite(y) && y > dosyaSonYil) dosyaSonYil = y;
  }
  console.log(`   FAO: son yıl ${dosyaSonYil}, eklenecek ${yeni.length.toLocaleString('tr-TR')} satır`);

  /*
   * EŞLEME DOĞRULAMASI. Yeni yılı yazmadan önce, D1'de ZATEN OLAN son yılı
   * dosyadan aynı eşlemeyle üretip karşılaştırıyoruz. Sütunları yanlış
   * eşlemek hata vermez, sessizce yanlış veri yazar; bu kontrol onu yakalar.
   */
  const capaYil = sonYil;
  const dosyaCapa = new Map();
  for (let i = 1; i < satirlar.length; i++) {
    const r = satirlar[i];
    if (Number(r[kolon.year]) !== capaYil || !ulkeSatiri(r)) continue;
    dosyaCapa.set(`${r[kolon.areacode]}|${r[kolon.itemcode]}|${r[kolon.elementcode]}`,
      Number(r[kolon.value]));
  }
  const d1Capa = await sorgu(`SELECT areacode, itemcode, elementcode, value
    FROM ${t.tablo} WHERE year=${capaYil}`);

  /*
   * Toplamları karşılaştırmak yanıltıcı: FAO geçmiş yılları revize ediyor ve
   * D1 daha eski bir sürümden gelmiş olabiliyor. Bu yüzden SATIR EŞLEŞTİRİP
   * eşleşenlerin DEĞERİNE bakıyoruz — sütun eşlemesi yanlışsa değerler tutmaz,
   * revizyon ise yalnızca birkaç satır kayar.
   */
  let eslesen = 0; let ayni = 0;
  const oranlar = [];
  for (const r of d1Capa) {
    const v = dosyaCapa.get(`${r.areacode}|${r.itemcode}|${r.elementcode}`);
    if (v === undefined) continue;
    eslesen += 1;
    const d = Number(r.value);
    if (!Number.isFinite(v) && !Number.isFinite(d)) { ayni += 1; continue; }
    const buyuk = Math.max(Math.abs(v), Math.abs(d), 1e-9);
    if (Math.abs(v - d) / buyuk < 0.001) ayni += 1;
    if (Number.isFinite(v) && Number.isFinite(d) && d !== 0) oranlar.push(v / d);
  }
  oranlar.sort((a, b) => a - b);
  const ortancaOran = oranlar.length ? oranlar[Math.floor(oranlar.length / 2)] : 1;
  const ayniOran = eslesen ? (ayni / eslesen) * 100 : 0;
  const anahtarOran = d1Capa.length ? (eslesen / d1Capa.length) * 100 : 0;

  console.log(`   çapa ${capaYil}: anahtar eşleşmesi %${anahtarOran.toFixed(1)}`
    + ` (${eslesen.toLocaleString('tr-TR')}/${d1Capa.length.toLocaleString('tr-TR')}),`
    + ` değeri birebir aynı %${ayniOran.toFixed(1)}, ortanca oran ${ortancaOran.toFixed(3)}`);

  /*
   * Eşleme doğruluğunun asıl kanıtı ANAHTAR EŞLEŞMESİ ve ORTANCA ORAN.
   * FAO geçmiş yılları epey revize ediyor (pestisitte satırların ~%23'ü
   * değişmiş), o yüzden "birebir aynı" oranı düşük olabilir ve bu normaldir.
   * Ama yanlış sütunu eşleseydik anahtarlar tutmaz, yanlış birimi alsaydık
   * ortanca oran 1'den uzaklaşırdı (ör. 1000).
   */
  if (anahtarOran < 95 || ortancaOran < 0.99 || ortancaOran > 1.01) {
    console.log('   ✗ ÇAPA TUTMADI — sütun/birim eşlemesi şüpheli, yazılmadı');
    process.exitCode = 1;
    return;
  }
  console.log('   ✓ çapa tuttu (kalan fark FAO revizyonu)');

  if (!yeni.length) { console.log('   ✓ güncel'); return; }
  if (!YAZ) { console.log('   (--yaz verilmedi)'); return; }

  // Türkçe çevirileri mevcut satırlardan taşı.
  const ceviriler = {};
  for (const [trSutun, kodSutun] of Object.entries(t.ceviri ?? {})) {
    const r = await sorgu(`SELECT ${kodSutun} kod, ${trSutun} tr, COUNT(*) n FROM ${t.tablo}
      WHERE ${trSutun} IS NOT NULL AND ${trSutun} <> ''
      GROUP BY ${kodSutun}, ${trSutun} ORDER BY ${kodSutun}, n DESC`);
    const h = new Map();
    for (const x of r) if (!h.has(String(x.kod))) h.set(String(x.kod), x.tr);
    ceviriler[trSutun] = { kodSutun, harita: h };
  }

  const d1Sutun = [...Object.keys(t.esleme), ...Object.keys(t.sabit ?? {}), ...Object.keys(t.ceviri ?? {})];
  const SAYISAL = new Set(['areacode', 'itemcode', 'elementcode', 'year', 'value']);

  let cevirisiz = 0;
  const degerler = yeni.map((r) => {
    const satir = {};
    for (const [d1c, i] of Object.entries(kolon)) satir[d1c] = r[i];
    Object.assign(satir, t.sabit ?? {});
    for (const [trSutun, { kodSutun, harita }] of Object.entries(ceviriler)) {
      const tr = harita.get(String(satir[kodSutun]));
      if (!tr) cevirisiz += 1;
      satir[trSutun] = tr ?? null;
    }
    return `(${d1Sutun.map((c) => (SAYISAL.has(c) ? n(satir[c]) : s(satir[c]))).join(',')})`;
  });

  if (cevirisiz) console.log(`   ⚠ ${cevirisiz} alanda Türkçe çeviri bulunamadı (boş yazıldı)`);

  const parca = [];
  for (let i = 0; i < degerler.length; i += 200) {
    parca.push(`INSERT INTO ${t.tablo} (${d1Sutun.join(',')}) VALUES\n${degerler.slice(i, i + 200).join(',\n')};`);
  }
  // D1 tek istekte çok büyük dosyayı sevmiyor; öbekler hâlinde gönder.
  for (let i = 0; i < parca.length; i += 40) {
    // eslint-disable-next-line no-await-in-loop
    await dosyaCalistir(parca.slice(i, i + 40).join('\n'));
    process.stdout.write(`\r   yazılıyor… ${Math.min((i + 40) * 200, degerler.length).toLocaleString('tr-TR')}/${degerler.length.toLocaleString('tr-TR')}`);
  }
  process.stdout.write('\n');

  const [sonra] = await sorgu(`SELECT MAX(year) son, COUNT(*) n FROM ${t.tablo}`);
  console.log(`   ✓ D1: son yıl ${sonra.son}, ${Number(sonra.n).toLocaleString('tr-TR')} satır`);
}

const setler = SET ? [SET] : Object.keys(TANIMLAR);
for (const a of setler) {
  if (!TANIMLAR[a]) throw new Error(`Bilinmeyen set: ${a} (${Object.keys(TANIMLAR).join(', ')})`);
  await setIsle(a, TANIMLAR[a]);
}
