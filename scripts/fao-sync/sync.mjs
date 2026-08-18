#!/usr/bin/env node
/**
 * FAO yıllık veri setleri → D1 (`tarpovizyon-dunya`).
 *
 *   node scripts/fao-sync/sync.mjs                     # tümünü denetle, yazma
 *   node scripts/fao-sync/sync.mjs --yaz               # eksik yılları yükle
 *   node scripts/fao-sync/sync.mjs --set nufus --yaz
 *
 * Gerekçeler ve tablo biçimleri `tanimlar.mjs` başında; CSV akışı `csv.mjs`.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BULK_KOK, TANIMLAR } from './tanimlar.mjs';
import { csvSatirlari } from './csv.mjs';

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

/* ─── bulk indirme ────────────────────────────────────────────────────────── */

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

/*
 * BÖLGE/DÜNYA TOPLAMLARI ATLANIR. Bulk dosyalarda ülke satırlarının yanında
 * toplam satırları da var (Area Code >= 5000: World, kıtalar, gelir grupları;
 * gübrede 51000+). D1 yalnızca ÜLKELERİ tutuyor — toplamları da yazmak satır
 * sayısını %12-28, değer toplamını 2-3 kat şişiriyordu.
 */
const ULKE_SINIRI = 5000;

/* ─── tek geçişte dosya okuma ─────────────────────────────────────────────── */

/**
 * Dosyayı BİR KEZ dolaşıp hem yeni yılın satırlarını hem çapa yılının
 * değerlerini toplar. Üretim dosyası ~1,5 GB metin; iki kez okumak da tek
 * parça belleğe almak da çalışmıyor.
 */
async function dosyaTara(zip, t, sonYil, urunKodlari) {
  const ustYil = t.ustYil ? t.ustYil() : Infinity;
  const it = csvSatirlari(zip);
  const ilk = await it.next();
  const baslik = ilk.value.map((x) => x.trim());
  const I = (adi) => {
    const i = baslik.indexOf(adi);
    if (i < 0) throw new Error(`CSV'de sütun yok: ${adi} (mevcut: ${baslik.join(',')})`);
    return i;
  };

  const pivot = t.bicim === 'pivot';
  const kolon = pivot
    ? { ...Object.fromEntries(Object.entries(t.anahtar).map(([d, c]) => [d, I(c)])),
      ...Object.fromEntries(Object.entries(t.tasinan).map(([d, c]) => [d, I(c)])),
      yayilan: I(t.yayilanSutun ?? 'Element Code'),
      value: I('Value'), year: I('Year'), areacode: I('Area Code'),
      unit: I('Unit'),
      urunKod: t.urunKodAlani ? I(t.urunKodAlani) : -1 }
    : Object.fromEntries(Object.entries(t.esleme).map(([d, c]) => [d, I(c)]));

  // Tanımdaki satır süzgeci (ör. yalnızca USD/ton, yalnızca yıllık).
  const suzgecler = Object.entries(t.suzgec ?? {}).map(([csvSutun, kontrol]) => [I(csvSutun), kontrol]);

  const yeni = new Map();      // pivot: anahtar → satır | duz: sıra → satır
  const capa = new Map();      // anahtar → değer(ler)
  let dosyaSonYil = 0;
  let sira = 0;

  for await (const r of it) {
    if (r.length < 3) continue;
    if (Number(r[kolon.areacode]) >= ULKE_SINIRI) continue;
    if (suzgecler.some(([i, kontrol]) => !kontrol(r[i]))) continue;
    // Kapsam D1'den geliyorsa listede olmayan ürünü almıyoruz.
    if (urunKodlari && kolon.urunKod >= 0 && !urunKodlari.has(Number(r[kolon.urunKod]))) continue;
    const yil = Number(r[kolon.year]);
    if (!Number.isFinite(yil)) continue;
    if (yil > dosyaSonYil) dosyaSonYil = yil;

    const yeniMi = yil > sonYil && yil <= ustYil;
    const capaMi = yil === sonYil;
    if (!yeniMi && !capaMi) continue;

    if (pivot) {
      const ak = Object.keys(t.anahtar).map((d) => r[kolon[d]]).join('|');
      const hedef = yeniMi ? yeni : capa;
      let satir = hedef.get(ak);
      if (!satir) {
        satir = {};
        for (const d of Object.keys(t.anahtar)) satir[d] = r[kolon[d]];
        for (const d of Object.keys(t.tasinan)) satir[d] = r[kolon[d]];
        hedef.set(ak, satir);
      }
      /*
       * Yayılan boyutun kodu hangi sütuna gidiyor? Değer tek sütuna da
       * gidebilir (nüfus), değer+birim çiftine de (işlenmiş üretim).
       */
      const hedefSutun = t.elementSutun[Number(r[kolon.yayilan])];
      if (hedefSutun) {
        if (typeof hedefSutun === 'string') satir[hedefSutun] = r[kolon.value];
        else {
          satir[hedefSutun.deger] = r[kolon.value];
          if (hedefSutun.birim) satir[hedefSutun.birim] = r[kolon.unit];
        }
      }
    } else {
      const ak = `${r[kolon.areacode]}|${r[kolon.itemcode]}|${r[kolon.elementcode]}`;
      if (yeniMi) { const o = {}; for (const [d, i] of Object.entries(kolon)) o[d] = r[i]; yeni.set(sira++, o); }
      else capa.set(ak, Number(r[kolon.value]));
    }
  }
  return { yeni, capa, dosyaSonYil, pivot };
}

/* ─── çapa doğrulaması ────────────────────────────────────────────────────── */

/**
 * Yeni yılı yazmadan önce, D1'de ZATEN OLAN son yılı aynı eşlemeyle dosyadan
 * üretip karşılaştırıyoruz. Sütun/element eşlemesini yanlış yapmak hata vermez,
 * sessizce yanlış veri yazar.
 *
 * TOPLAM karşılaştırmıyoruz: FAO geçmişi ciddi revize ediyor (pestisitte
 * satırların ~%23'ü değişmiş). Eşlemenin doğruluğunu ANAHTAR EŞLEŞMESİ ve
 * ORTANCA ORAN gösterir — yanlış sütun/birim alınsaydı oran 1'den uzaklaşırdı.
 */
function capaKarsilastir(d1Satir, capa, t, capaYil) {
  let eslesen = 0; let ayni = 0;
  const oranlar = [];

  for (const r of d1Satir) {
    let dosyaDegerleri;
    if (t.bicim === 'pivot') {
      const ak = Object.keys(t.anahtar).map((d) => String(r[d])).join('|');
      const o = capa.get(ak);
      if (!o) continue;
      dosyaDegerleri = Object.values(t.elementSutun)
        .map((c) => (typeof c === 'string' ? c : c.deger))
        .map((c) => [Number(o[c]), Number(r[c])]);
    } else {
      const v = capa.get(`${r.areacode}|${r.itemcode}|${r.elementcode}`);
      if (v === undefined) continue;
      dosyaDegerleri = [[v, Number(r.value)]];
    }
    eslesen += 1;
    let hepsiAyni = true;
    for (const [dosya, d1] of dosyaDegerleri) {
      if (!Number.isFinite(dosya) && !Number.isFinite(d1)) continue;
      const buyuk = Math.max(Math.abs(dosya), Math.abs(d1), 1e-9);
      if (Math.abs(dosya - d1) / buyuk >= 0.001) hepsiAyni = false;
      if (Number.isFinite(dosya) && Number.isFinite(d1) && d1 !== 0) oranlar.push(dosya / d1);
    }
    if (hepsiAyni) ayni += 1;
  }

  oranlar.sort((a, b) => a - b);
  const ortanca = oranlar.length ? oranlar[Math.floor(oranlar.length / 2)] : 1;
  const anahtarOran = d1Satir.length ? (eslesen / d1Satir.length) * 100 : 0;
  const ayniOran = eslesen ? (ayni / eslesen) * 100 : 0;

  console.log(`   çapa ${capaYil}: anahtar eşleşmesi %${anahtarOran.toFixed(1)}`
    + ` (${eslesen.toLocaleString('tr-TR')}/${d1Satir.length.toLocaleString('tr-TR')}),`
    + ` değeri birebir aynı %${ayniOran.toFixed(1)}, ortanca oran ${ortanca.toFixed(3)}`);

  /*
   * Eşik neden 95 değil 70: D1'de olup dosyada artık bulunmayan alanlar
   * olabiliyor (FAO ülke/bölge tanımlarını değiştiriyor) — nüfusta 264 satırın
   * 28'i böyle. Eşlemenin doğruluğunun ASIL kanıtı ORTANCA ORAN: yanlış sütunu
   * ya da yanlış birimi alsaydık 1'den uzaklaşırdı.
   */
  return anahtarOran >= 70 && ortanca >= 0.99 && ortanca <= 1.01;
}

/* ─── senkron ─────────────────────────────────────────────────────────────── */

async function setIsle(ad, t) {
  console.log(`\n── ${ad} → ${t.tablo} ──`);

  const yilSutun = t.bicim === 'pivot' ? Object.keys(t.anahtar).find((k) => /year|yil/i.test(k)) : 'year';
  const [mevcut] = await sorgu(`SELECT MAX(${yilSutun}) son, COUNT(*) n FROM ${t.tablo}`);
  const sonYil = Number(mevcut.son);
  console.log(`   D1: son yıl ${sonYil}, ${Number(mevcut.n).toLocaleString('tr-TR')} satır`);

  const urunKodlari = t.urunKodlariD1
    ? new Set((await sorgu(t.urunKodlariD1)).map((x) => Number(x.k)))
    : null;
  if (urunKodlari) console.log(`   kapsam: D1'den ${urunKodlari.size} ürün kodu`);

  const zip = await bulkIndir(t.dosya);
  const { yeni, capa, dosyaSonYil } = await dosyaTara(zip, t, sonYil, urunKodlari);
  console.log(`   FAO: son yıl ${dosyaSonYil}, eklenecek ${yeni.size.toLocaleString('tr-TR')} satır`);

  /*
   * Tablo BOŞSA çapa yok — karşılaştıracak veri bulunmuyor. İlk yüklemede bu
   * normal; doğrulama bir sonraki çalıştırmadan itibaren devreye giriyor.
   */
  if (!Number(mevcut.n)) {
    console.log('   ⚠ tablo boş — ilk yükleme, çapa doğrulaması yapılamıyor');
  } else {
  const d1Capa = await sorgu(`SELECT * FROM ${t.tablo} WHERE ${yilSutun}=${sonYil}`);
  if (!capaKarsilastir(d1Capa, capa, t, sonYil)) {
    console.log('   ✗ ÇAPA TUTMADI — eşleme şüpheli, yazılmadı');
    process.exitCode = 1;
    return;
  }
  console.log('   ✓ çapa tuttu (kalan fark FAO revizyonu)');
  }

  if (!yeni.size) { console.log('   ✓ güncel'); return; }
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

  const d1Sutun = t.bicim === 'pivot'
    ? [...Object.keys(t.anahtar), ...Object.keys(t.tasinan),
      ...Object.values(t.elementSutun).flatMap((c) => (typeof c === 'string' ? [c] : [c.deger, c.birim].filter(Boolean))),
      ...Object.keys(t.sabit ?? {}), ...Object.keys(t.ceviri ?? {})]
    : [...Object.keys(t.esleme), ...Object.keys(t.sabit ?? {}), ...Object.keys(t.ceviri ?? {})];

  const SAYISAL = new Set(['areacode', 'itemcode', 'elementcode', 'year', 'yearcode', 'value',
    ...(t.bicim === 'pivot'
      ? Object.values(t.elementSutun).map((c) => (typeof c === 'string' ? c : c.deger))
      : [])]);

  let cevirisiz = 0;
  const degerler = [...yeni.values()].map((satir) => {
    Object.assign(satir, t.sabit ?? {});
    for (const [trSutun, { kodSutun, harita }] of Object.entries(ceviriler)) {
      const tr = harita.get(String(satir[kodSutun]));
      if (!tr) cevirisiz += 1;
      satir[trSutun] = tr ?? null;
    }
    return `(${d1Sutun.map((c) => (SAYISAL.has(c) ? n(satir[c]) : s(satir[c]))).join(',')})`;
  });
  if (cevirisiz) console.log(`   ⚠ ${cevirisiz} alanda Türkçe çeviri bulunamadı (boş yazıldı)`);

  const alintili = d1Sutun.map((c) => `"${c}"`).join(',');
  const parca = [];
  for (let i = 0; i < degerler.length; i += 200) {
    parca.push(`INSERT INTO ${t.tablo} (${alintili}) VALUES\n${degerler.slice(i, i + 200).join(',\n')};`);
  }
  for (let i = 0; i < parca.length; i += 40) {
    // eslint-disable-next-line no-await-in-loop
    await dosyaCalistir(parca.slice(i, i + 40).join('\n'));
    process.stdout.write(`\r   yazılıyor… ${Math.min((i + 40) * 200, degerler.length).toLocaleString('tr-TR')}/${degerler.length.toLocaleString('tr-TR')}`);
  }
  process.stdout.write('\n');

  const [sonra] = await sorgu(`SELECT MAX(${yilSutun}) son, COUNT(*) n FROM ${t.tablo}`);
  console.log(`   ✓ D1: son yıl ${sonra.son}, ${Number(sonra.n).toLocaleString('tr-TR')} satır`);
}

const setler = SET ? [SET] : Object.keys(TANIMLAR);
for (const a of setler) {
  if (!TANIMLAR[a]) throw new Error(`Bilinmeyen set: ${a} (${Object.keys(TANIMLAR).join(', ')})`);
  await setIsle(a, TANIMLAR[a]);
}
