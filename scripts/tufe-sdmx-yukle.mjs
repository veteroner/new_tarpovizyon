#!/usr/bin/env node
/**
 * TÜFE ana harcama grubu endekslerini TÜİK SDMX'ten çekip D1'e yazar.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * `tuik_fiyatendex` tablosunun TUFE bölümü iki türlü bozuktu:
 *
 *   1. BAYAT — kategori satırları 2026 Nisan'da bitiyordu; yalnızca en üstteki
 *      genel TÜFE satırı Temmuz'a kadar doluydu (o da elle doldurulmuştu).
 *   2. YANLIŞ — alt kategori satırları ana grupların değerlerini SIRAYLA
 *      taşıyordu. Ölçüldü: "Gıda" satırında ana grup #1'in değeri, "Alkolsüz
 *      içecekler" satırında #2'nin, "Tahıllar" satırında yine #1'in değeri
 *      vardı. Değerler satır listesine, hangi kategoriye ait olduklarına
 *      bakılmaksızın sırayla yazılmış.
 *
 * İkincisi birincisinden kötü: bayat veri eski ama doğru, bu veri hiç doğru
 * değildi ve düzeltilmeden tazelenseydi yanlışlık tazelenmiş olurdu.
 *
 * ─── KAYNAK ─────────────────────────────────────────────────────────────────
 * SDMX akışı `DF_TUFE_SDMX_TT01` — "Ana harcama gruplarına göre TÜFE ve
 * değişim oranları". Daha önce "TÜFE SDMX kataloğunda yok" diye kayıtlıydı;
 * o ölçüm 406 akış üzerindeydi, katalog 421'e çıkmış ve TÜFE eklenmiş.
 *
 * DEGISIM kodları veriden çözüldü ve çapraz doğrulandı:
 *   1 → ENDEKS          (2026-07 Gıda 134,02)
 *   2 → aylık % değişim (1,61 — tufe_aylik_snapshot ile birebir)
 *   4 → yıllık % değişim (37,53 — tufe_aylik.gida_alkolsuz ile birebir)
 * Bu betik yalnızca DEGISIM=1'i, yani endeksi yazıyor.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   TUIK_API_KEY=... node scripts/tufe-sdmx-yukle.mjs               # yalnız rapor
 *   TUIK_API_KEY=... node scripts/tufe-sdmx-yukle.mjs --sql cikti.sql
 *   npx wrangler d1 execute tarpovizyon-basic --remote --file cikti.sql
 *
 * Anahtar ORTAM DEĞİŞKENİNDEN okunuyor, depoda tutulmuyor.
 *
 * ─── NEDEN SQL DOSYASI, NEDEN DOĞRUDAN YAZMIYOR ─────────────────────────────
 * Betik önce wrangler'ı `execFileSync` ile kendi içinden çağırıyordu; alt
 * süreç "Authentication error [code: 10000]" veriyor, aynı komut kabuktan
 * elle çalıştırılınca sorunsuz geçiyor — wrangler'ın oturum anahtarına alt
 * süreçten erişilemiyor. SQL'i dosyaya yazıp wrangler'ı dışarıdan çağırmak
 * hem bu engeli kaldırıyor hem de yazılacakları çalıştırmadan önce
 * okunabilir kılıyor.
 */

import { writeFileSync } from 'node:fs';
import { damgaSql } from './lib/damga.mjs';

const sqlBayrak = process.argv.indexOf('--sql');
const SQL_YOL = sqlBayrak > -1 ? process.argv[sqlBayrak + 1] : null;
const DB = 'tarpovizyon-basic';
const TABLO = 'tuik_fiyatendex';
const AKIS = 'DF_TUFE_SDMX_TT01';

const ANAHTAR = process.env.TUIK_API_KEY;
if (!ANAHTAR) {
  console.error('TUIK_API_KEY tanımlı değil. Anahtar depoda tutulmuyor; ortamdan verin.');
  process.exit(1);
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Token 300 saniye yaşıyor — her çalıştırmada yenisi alınıyor. */
async function token() {
  const r = await fetch('https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password', client_id: 'nsi-ws-consumer', api_key: ANAHTAR,
    }),
  });
  if (!r.ok) throw new Error(`token: HTTP ${r.status}`);
  return (await r.json()).access_token;
}

/**
 * SDMX-CSV çekimi.
 *
 * İKİ BAŞLIK DA ŞART: `Accept` olmadan XML dönüyor (belgelenen `?format=`
 * parametresi yok sayılıyor), `Accept-Language` olmadan uç `500 languageTag1`
 * veriyor. curl ikincisi olmadan da çalışıyor, Node/undici çalışmıyor — hata
 * yalnızca koda dökülünce ortaya çıkıyor.
 */
async function veri(tkn) {
  const r = await fetch(`https://nsiws.tuik.gov.tr/rest/data/TR,${AKIS},1.0/all`, {
    headers: {
      Authorization: `Bearer ${tkn}`,
      'Accept-Language': 'tr',
      Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
    },
  });
  if (!r.ok) throw new Error(`veri: HTTP ${r.status}`);
  return r.text();
}

const csvAyristir = (metin) => {
  const [basSatir, ...satirlar] = metin.trim().split('\n');
  const bas = basSatir.split(',');
  return satirlar.map((s) => Object.fromEntries(s.split(',').map((v, i) => [bas[i], v])));
};

const tkn = await token();
const satirlar = csvAyristir(await veri(tkn));

/*
 * Yalnızca aylık ENDEKS (DEGISIM=1).
 *
 * İki tür satır alınıyor:
 *   COICOP_2018 = '01'..'13'  → ana harcama grupları, D1'de d1=1..13
 *   COICOP_2018 = '0'         → GENEL TÜFE, D1'de d1=0
 *
 * Genel satır ilk sürümde atlanmıştı ve sayfadaki "Aylık Endeks"/"Aylık
 * Trend" grafikleri Temmuz'da kalmaya devam etti — o grafikler ana grupları
 * değil genel TÜFE satırını okuyor. Ana grupları doldurup genel satırı
 * atlamak, tam da düzeltilmek istenen boşluğu bırakıyordu.
 *
 * DİKKAT — genel satırın kodu '_Z' DEĞİL. SDMX'te "boyut yok" işareti olan
 * '_Z', bu akışta COICOP_1999 sütununda duruyor; COICOP_2018'de genel TÜFE
 * tek haneli '0' olarak geliyor. `/^\d{2}$/` iki hane şart koştuğu için '0'
 * sessizce eleniyordu: betik hatasız çalışıp "286 grup×yıl yazıldı" diyor,
 * üretilen SQL'de tek bir d1=0 satırı bulunmuyordu. Onun için süzgeç artık
 * SINIFLAMA_DUZEYI'ne bakıyor — 'TUFE' genel, '2' ana grup — yani kod
 * biçimine değil, TÜİK'in kendi etiketine dayanıyor.
 */
const endeks = satirlar.filter((s) => s.FREQ === 'M' && s.DEGISIM === '1'
  && (s.SINIFLAMA_DUZEYI === 'TUFE' || /^\d{2}$/.test(s.COICOP_2018)));

/* COICOP '01'..'13' → D1'in d1 sütunu 1..13. Ana grup satırı, o d1 için
   id sırasına göre İLK satır; alt kategoriler aynı d1'i paylaşıyor. */
const grupla = new Map();
for (const s of endeks) {
  const d1 = s.SINIFLAMA_DUZEYI === 'TUFE' ? 0 : Number(s.COICOP_2018);
  const [yil, ay] = s.TIME_PERIOD.split('-').map(Number);
  if (!Number.isFinite(d1) || !yil || !ay) continue;
  const anahtar = `${d1}|${yil}`;
  if (!grupla.has(anahtar)) grupla.set(anahtar, {});
  grupla.get(anahtar)[AYLAR[ay - 1]] = Number(s.OBS_VALUE);
}

console.log(`SDMX: ${endeks.length} aylık endeks gözlemi, ${grupla.size} grup×yıl`);
const yillar = [...new Set([...grupla.keys()].map((k) => Number(k.split('|')[1])))].sort();
console.log(`yıl aralığı: ${yillar[0]} → ${yillar.at(-1)}`);

if (!SQL_YOL) {
  const son = yillar.at(-1);
  console.log(`\n${son} ana grup endeksleri:`);
  for (let d1 = 0; d1 <= 13; d1 += 1) {
    const v = grupla.get(`${d1}|${son}`);
    if (v) console.log(`  ${String(d1).padStart(2)}: ` + AYLAR.map((a) => (v[a] != null ? v[a].toFixed(1) : '—')).join(' '));
  }
  console.log('\n--sql verilmedi, dosya üretilmedi.');
  process.exit(0);
}

/*
 * Hedef satır: o d1 ve yıl için EN KÜÇÜK id — yani ana grup satırı. Alt
 * kategoriler aynı d1'i paylaşıyor ve bilerek güncellenmiyor; onların
 * değerleri zaten yanlış ve bu akıştan doğrusu türetilemiyor (TT01 yalnızca
 * ana grupları taşıyor). Yanlışı tazelemektense dokunmamak doğru.
 *
 * İfadeler TOPLU gönderiliyor: 286 ayrı wrangler çağrısı 286 alt süreç
 * demekti; elli ifadelik demetler tek çağrıya sığıyor.
 */
const ifadeler = [];
for (const [anahtar, aylar] of grupla) {
  const [d1, yil] = anahtar.split('|').map(Number);
  const set = AYLAR.filter((a) => aylar[a] != null)
    .map((a) => `"${a}" = ${aylar[a]}`).join(', ');
  if (!set) continue;
  ifadeler.push(`UPDATE ${TABLO} SET ${set} WHERE id = (SELECT MIN(id) FROM ${TABLO} `
    + `WHERE endeks='TUFE' AND d1=${d1} AND yil=${yil});`);
}

/*
 * ─── BASIC'İN OKUDUĞU ÜÇ TABLO DA AYNI AKIŞTAN ──────────────────────────────
 * Yukarısı `tuik_fiyatendex`i (Pro'nun tablosu) yazıyordu. Basic ise TÜFE
 * sayfasında BAŞKA üç tabloyu okuyor — `tufe_aylik` (trend), `tufe_yillik_
 * snapshot` ve `tufe_aylik_snapshot` (ana grup çubukları). Ağustos yayımlandığı
 * halde mobil uygulama Temmuz'da kalmıştı: endeks tablosu tazelendi, bu üçü
 * tazelenmedi. Aynı verinin iki ayrı besleme yolu olması sorunun kendisiydi.
 *
 * Üçü de `scripts/tufe-guncelle.mjs` ile TÜİK bülten JSON'undan besleniyordu;
 * o dosya Node'dan 404 verdiği için elle çalıştırılması gerekiyordu — yani
 * unutulmaya açıktı. Aynı sayılar bu SDMX akışında zaten var:
 *
 *   DEGISIM=2 → aylık % değişim   → tufe_aylik_snapshot.aylik_degisim
 *   DEGISIM=4 → yıllık % değişim  → tufe_aylik.tufe / .gida_alkolsuz
 *                                 → tufe_yillik_snapshot.yillik_degisim
 *
 * ─── KOD → AD EŞLEMESİ VARSAYIM DEĞİL, ÖLÇÜM ────────────────────────────────
 * SDMX yalnız COICOP kodunu taşıyor, snapshot tabloları Türkçe grup adını.
 * Eşleme "herhalde sırayla" diye kabul edilmedi: Temmuz 2026'nın 14 değeri
 * D1'deki 14 satırla karşılaştırıldı ve 14/14 birebir tuttu (genel 31,75 ·
 * gıda 37,53 · eğitim 44,18 …). Sıra yanlış olsaydı bu eşleşme çıkmazdı.
 */
const GRUP_ADLARI = [
  'TÜFE (Genel Endeks)', 'Gıda ve alkolsüz içecekler', 'Alkollü içecekler ve tütün',
  'Giyim ve ayakkabı', 'Konut', 'Mobilya ve ev eşyası', 'Sağlık', 'Ulaştırma',
  'Bilgi ve iletişim', 'Eğlence ve kültür', 'Eğitim', 'Lokanta ve konaklama',
  'Sigorta ve finansal hizmetler', 'Çeşitli mal ve hizmetler',
];

/** DEGISIM koduna göre {d1 → {dönem → değer}} çıkarır. */
const oranSerisi = (degisim) => {
  const cikti = new Map();
  for (const s of satirlar) {
    if (s.FREQ !== 'M' || s.DEGISIM !== degisim) continue;
    const genel = s.SINIFLAMA_DUZEYI === 'TUFE';
    if (!genel && !/^\d{2}$/.test(s.COICOP_2018)) continue;
    const d1 = genel ? 0 : Number(s.COICOP_2018);
    if (!cikti.has(d1)) cikti.set(d1, new Map());
    cikti.get(d1).set(s.TIME_PERIOD, Number(s.OBS_VALUE));
  }
  return cikti;
};

const yillikOran = oranSerisi('4');
const aylikOran = oranSerisi('2');
const tumDonemler = [...new Set([...yillikOran.get(0)?.keys() ?? []])].sort();
const sonDonem = tumDonemler.at(-1);
const [sonYil, sonAy] = sonDonem.split('-').map(Number);

const tirnak = (s) => `'${String(s).replace(/'/g, "''")}'`;

/* tufe_aylik: her ay için genel TÜFE ve gıda grubunun YILLIK değişimi.
   Var olan satır güncelleniyor, yoksa ekleniyor — tablo (yil, ay) anahtarında
   benzersiz değil, o yüzden önce silip sonra eklemek yinelenen satır bırakırdı. */
for (const donem of tumDonemler) {
  const [yil, ay] = donem.split('-').map(Number);
  const tufe = yillikOran.get(0)?.get(donem);
  const gida = yillikOran.get(1)?.get(donem);
  if (tufe == null || gida == null) continue;
  ifadeler.push(
    `UPDATE tufe_aylik SET tufe = ${tufe}, gida_alkolsuz = ${gida} WHERE yil=${yil} AND ay=${ay};`,
    `INSERT INTO tufe_aylik (yil, ay, tufe, gida_alkolsuz) SELECT ${yil}, ${ay}, ${tufe}, ${gida} `
      + `WHERE NOT EXISTS (SELECT 1 FROM tufe_aylik WHERE yil=${yil} AND ay=${ay});`,
  );
}

/* Snapshot'lar tanım gereği TEK dönem tutuyor: son ay. Bu yüzden satır
   eklemek değil, var olan 14 satırı ada göre güncellemek doğru olan. */
for (const [i, ad] of GRUP_ADLARI.entries()) {
  const y = yillikOran.get(i)?.get(sonDonem);
  const a = aylikOran.get(i)?.get(sonDonem);
  if (y != null) {
    ifadeler.push(`UPDATE tufe_yillik_snapshot SET yillik_degisim = ${y} WHERE harcama_grubu = ${tirnak(ad)};`);
  }
  if (a != null) {
    ifadeler.push(`UPDATE tufe_aylik_snapshot SET aylik_degisim = ${a} WHERE harcama_grubu = ${tirnak(ad)};`);
  }
}

/* Damga da aynı dosyada: yazma ile damga ilerletme ayrılırsa, arada bir hata
   olduğunda tablo yeni ama önbellek eski kalıyor. */
ifadeler.push(damgaSql([TABLO, 'tufe_aylik', 'tufe_yillik_snapshot', 'tufe_aylik_snapshot']));
writeFileSync(SQL_YOL, ifadeler.join('\n'), 'utf8');
console.log(`\nson dönem: ${sonYil}-${String(sonAy).padStart(2, '0')} `
  + `(genel yıllık ${yillikOran.get(0)?.get(sonDonem)}%, gıda ${yillikOran.get(1)?.get(sonDonem)}%)`);
console.log(`${ifadeler.length - 1} ifade + damga → ${SQL_YOL}`);
console.log(`Çalıştır: npx wrangler d1 execute ${DB} --remote --file ${SQL_YOL}`);
