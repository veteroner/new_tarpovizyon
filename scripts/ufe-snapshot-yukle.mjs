#!/usr/bin/env node
/**
 * Tarım-ÜFE alt kırılım "fotoğraflarını" TÜİK SDMX'ten tazeler.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * Tarım-ÜFE sayfasındaki iki çubuk grafik iki FOTOĞRAF tablosunu okuyor:
 *
 *   ufe_alt_grup_snapshot  (7 satır × 5 ölçü)  → `makro/tarim-ufe`
 *   ufe_detay_snapshot     (13 satır × 1 ölçü) → `makro/tarim-ufe-detay`
 *
 * Fotoğraf = tek dönemin değerleri, dönem sütunu yok. İkisine de HİÇBİR iş
 * yazmıyordu: trend serisi (`ufe_aylik`) günlük senkronla Ağustos'a ilerlerken
 * alt kırılım Mayıs 2026'da kalmıştı. Sayfanın rozeti bunu doğru söylüyordu —
 * referans satırının değeri (43,08) trend serisinde Mayıs'a denk geliyor.
 *
 * ─── KAYNAK VE EŞLEME ───────────────────────────────────────────────────────
 * Akış `DF_TARIM_URUNLERI_UFE_DEGISIM_V1` — günlük senkronun `ufe_aylik` için
 * zaten okuduğu akış. Alt gruplar aynı akışta, `TAORBA_2008_2_678` boyutunda.
 *
 * Eşleme TAHMİN EDİLMEDİ, 2026-05 değerleriyle ölçüldü:
 *   · DEGISIM kodları: genel satır (A) beş ölçünün beşinde birebir tuttu —
 *     1/IX endeks 1208,99 · 2 aylık 0,61 · 3 aralığa göre 18,41 ·
 *     4 yıllık 43,08 · 5 on iki aylık ortalama 41,54.
 *   · Alt grup kodları: ufe_alt_grup_snapshot 7/7, ufe_detay_snapshot 13/13.
 *
 * ─── DİKKAT: ufe_detay_snapshot.yillik_degisim AYLIK DEĞİŞİM TUTUYOR ────────
 * Sütunun adı "yillik" ama içindeki 13 değerin 13'ü DEGISIM=2 (aylık) ile
 * tuttu, DEGISIM=4 (yıllık) ile hiçbiri. Grafik başlığı da nötr ("Değişim
 * Oranı"). Anlamı burada SESSİZCE değiştirmek sayfanın gösterdiği şeyi
 * habersizce değiştirmek olurdu; mevcut anlam (aylık) korunuyor.
 *
 * ─── DÖNEM SEÇİMİ ───────────────────────────────────────────────────────────
 * Fotoğraf TEK dönem olmalı. En son dönem, eşlenen kodların HEPSİNİN değeri
 * olan dönem seçiliyor; bir alt grup son ayda gizli/eksikse fotoğraf o ayı
 * atlayıp hepsinin dolu olduğu aya gidiyor — farklı ayların değerleri aynı
 * grafikte yan yana durmasın diye.
 *
 * Kullanım:
 *   TUIK_API_KEY=... node scripts/ufe-snapshot-yukle.mjs                 # rapor
 *   TUIK_API_KEY=... node scripts/ufe-snapshot-yukle.mjs --sql u.sql --beklenti b.json
 *   npx wrangler d1 execute tarpovizyon-basic --remote --file u.sql
 *   node scripts/d1-beklenti-dogrula.mjs b.json
 */

import { writeFileSync } from 'node:fs';
import { damgaSql } from './lib/damga.mjs';

const arg = (ad) => {
  const i = process.argv.indexOf(ad);
  return i > -1 ? process.argv[i + 1] : null;
};
const SQL_YOL = arg('--sql');
const BEKLENTI_YOL = arg('--beklenti');
const AKIS = 'DF_TARIM_URUNLERI_UFE_DEGISIM_V1';
const BOYUT = 'TAORBA_2008_2_678';

const ANAHTAR = process.env.TUIK_API_KEY;
if (!ANAHTAR) {
  console.error('TUIK_API_KEY tanımlı değil. Anahtar depoda tutulmuyor; ortamdan verin.');
  process.exit(1);
}

/*
 * Adlar D1'DEKİ HÂLİYLE — UPDATE'in anahtarı bunlar. Bir harf farkı UPDATE'i
 * sessizce 0 satıra düşürür; doğrulayıcı (beklenti dosyası) bunu yakalıyor.
 */
const ALT_GRUP = {
  A: 'Tarım-ÜFE',
  '01': 'Tarım ve avcılık ürünleri ve ilgili hizmetler',
  '01_1': 'Tek yıllık (uzun ömürlü olmayan) bitkisel ürünler',
  '01_2': 'Çok yıllık (uzun ömürlü) bitkisel ürünler',
  '01_4': 'Canlı hayvanlar ve hayvansal ürünler',
  '02': 'Orman ürünleri ve ilgili hizmetler',
  '03': 'Balık ve diğer balıkçılık ürünleri; su ürünleri; balıkçılık için destekleyici hizmetler',
};

/** Sütun → [UNIT_MEASURE, DEGISIM]. */
const ALT_GRUP_OLCU = {
  endeks: ['IX', '1'],
  aylik_degisim: ['RO', '2'],
  aralik_gore_degisim: ['RO', '3'],
  yillik_degisim: ['RO', '4'],
  oniki_aylik_ort_degisim: ['RO', '5'],
};

const DETAY = {
  A: 'Tarım ÜFE (genel)',
  '01_11': 'Tahıllar (pirinç hariç), baklagiller ve yağlı tohumlar',
  '01_12': 'Çeltik',
  '01_13': 'Sebze ve kavun-karpuz, kök ve yumrular',
  '01_16': 'Lifli bitkiler',
  '01_22': 'Tropikal ve subtropikal meyveler',
  '01_25': 'Diğer ağaç ve çalı meyveleri ile sert kabuklu meyveler',
  '01_26': 'Yağlı meyveler',
  '01_41': 'Süt sığırları (manda dahil), bunlardan elde edilen işlenmemiş süt',
  '01_42': 'Diğer sığır, manda (süt için yetiştirilenler hariç) ve bizonlar, canlı',
  '01_45': 'Koyun ve keçi, canlı; bunların işlenmemiş süt ve yapağıları',
  '01_47': 'Canlı kümes hayvanları ve yumurtalar',
  '01_49': 'Diğer çiftlik hayvanları ve hayvansal ürünler',
};
/* Yukarıdaki uyarıya bakınız: sütun adı "yillik", içerik AYLIK değişim. */
const DETAY_OLCU = ['RO', '2'];

async function token() {
  const r = await fetch('https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: 'nsi-ws-consumer', api_key: ANAHTAR }),
  });
  if (!r.ok) throw new Error(`token: HTTP ${r.status}`);
  return (await r.json()).access_token;
}

/*
 * Accept-Language ŞART: başlıksız istekte uç `500 languageTag1` veriyor.
 *
 * ─── YENİDEN DENEME ─────────────────────────────────────────────────────────
 * İlk sürüm tek deneme yapıyordu ve ilk kuru çalıştırmada 120 sn'de zaman
 * aşımına uğradı — aynı akışı birkaç dakika önce `sync.mjs` sorunsuz okumuştu.
 * TÜİK ucu ara ara yavaşlıyor; senkron bu yüzden 3 deneme yapıyor, burası da
 * aynısını yapıyor. Token 300 sn yaşadığı için her denemede yenisi alınıyor.
 */
async function veri() {
  let son;
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      const r = await fetch(`https://nsiws.tuik.gov.tr/rest/data/TR,${AKIS},1.0`, {
        headers: {
          Authorization: `Bearer ${await token()}`,
          'Accept-Language': 'tr',
          Accept: 'application/vnd.sdmx.data+csv;version=1.0.0',
        },
        signal: AbortSignal.timeout(180_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      son = e;
      console.error(`  deneme ${deneme}/3 başarısız: ${e.name === 'TimeoutError' ? 'zaman aşımı' : e.message}`);
      if (deneme < 3) await new Promise((ok) => setTimeout(ok, deneme * 5000));
    }
  }
  throw new Error(`${AKIS}: 3 deneme başarısız (${son?.message ?? son})`);
}

/* Tırnak bilen bölücü — boş alanlar ve tırnaklı etiketler sütun kaydırmasın. */
function satirBol(satir) {
  const alan = [];
  let s = '';
  let tirnak = false;
  for (let i = 0; i < satir.length; i++) {
    const c = satir[i];
    if (tirnak) {
      if (c === '"' && satir[i + 1] === '"') { s += '"'; i++; } else if (c === '"') tirnak = false;
      else s += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { alan.push(s); s = ''; } else s += c;
  }
  alan.push(s);
  return alan;
}

const metin = await veri();
const [basSatir, ...govde] = metin.trim().split('\n').map((l) => l.replace(/\r$/, ''));
const bas = satirBol(basSatir);
const satirlar = govde.map((l) => Object.fromEntries(satirBol(l).map((v, i) => [bas[i], v])));

/*
 * (kod|birim|degisim) → (dönem → değer). Aynı anahtar bir dönemde İKİ kez
 * gelirse hangisinin yazılacağı CSV sırasına kalırdı; o yüzden durduruyoruz.
 */
const seri = new Map();
for (const r of satirlar) {
  if (r.FREQ !== 'M' || !/^\d{4}-\d{2}$/.test(r.TIME_PERIOD ?? '')) continue;
  if (r.OBS_VALUE === '' || r.OBS_VALUE === undefined) continue;
  const v = Number(r.OBS_VALUE);
  if (!Number.isFinite(v)) continue;
  const k = `${r[BOYUT]}|${r.UNIT_MEASURE}|${r.DEGISIM}`;
  if (!seri.has(k)) seri.set(k, new Map());
  const m = seri.get(k);
  if (m.has(r.TIME_PERIOD)) {
    console.error(`HATA: ${k} ${r.TIME_PERIOD} iki kez geldi — boyut yapısı değişmiş olabilir.`);
    process.exit(1);
  }
  m.set(r.TIME_PERIOD, v);
}

const deger = (kod, [birim, degisim], donem) => seri.get(`${kod}|${birim}|${degisim}`)?.get(donem) ?? null;

const ayKaydir = (donem, n) => {
  const [y, a] = donem.split('-').map(Number);
  const t = y * 12 + (a - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/*
 * ─── HÜCRE SAĞLAM MI ────────────────────────────────────────────────────────
 * TÜİK'in TÜFE akışında 2026-04 ve 2026-08 çöp geldi (beş ölçünün beşi aynı
 * sayı); bu akışta da olabilir. Değer, endeks serisinden bağımsız olarak
 * yeniden hesaplanıp karşılaştırılıyor:
 *   yıllık(P) ≟ endeks(P)/endeks(P-12) − 1     aylık(P) ≟ endeks(P)/endeks(P-1) − 1
 * Endeks yoksa sınanamıyor ve kabul ediliyor — ama değer olmadan değil.
 */
function gecerli(kod, [birim, degisim], donem) {
  const v = deger(kod, [birim, degisim], donem);
  if (v === null) return false;
  const geri = { 4: 12, 2: 1 }[degisim];
  if (!geri) return true;
  const iP = deger(kod, ['IX', '1'], donem);
  const iG = deger(kod, ['IX', '1'], ayKaydir(donem, -geri));
  if (iP === null || iG === null || iG === 0) return true;
  return Math.abs((iP / iG) * 100 - 100 - v) <= 0.15;
}

/** Kodların HEPSİNİN verilen ölçüde SAĞLAM olduğu en son dönem. */
function ortakSonDonem(kodlar, olcu) {
  const donemler = [...new Set(kodlar.flatMap((k) => [...(seri.get(`${k}|${olcu[0]}|${olcu[1]}`)?.keys() ?? [])]))].sort();
  const sagMi = (d) => kodlar.every((k) => gecerli(k, olcu, d));
  for (const d of donemler.reverse()) {
    if (sagMi(d)) return d;
    const kotu = kodlar.filter((k) => deger(k, olcu, d) !== null && !gecerli(k, olcu, d));
    if (kotu.length) {
      console.log(`::warning::Tarım-ÜFE ${d}: ${kotu.join(', ')} kodlarında değer endeksle tutmuyor — fotoğraf bu ayı atlıyor.`);
    }
  }
  return null;
}

const altDonem = ortakSonDonem(Object.keys(ALT_GRUP), ALT_GRUP_OLCU.yillik_degisim);
const detayDonem = ortakSonDonem(Object.keys(DETAY), DETAY_OLCU);
if (!altDonem || !detayDonem) {
  console.error(`HATA: ortak dönem bulunamadı (alt grup: ${altDonem}, detay: ${detayDonem}). `
    + 'Kodlar değişmiş olabilir — eşleme yeniden ölçülmeli.');
  process.exit(1);
}

/* Akışın kendi son dönemi; fotoğraf bunun gerisinde kaldıysa söylüyoruz. */
const akisSon = [...(seri.get('A|RO|4')?.keys() ?? [])].sort().at(-1);
console.log(`akışın son dönemi: ${akisSon}`);
console.log(`ufe_alt_grup_snapshot → ${altDonem}${altDonem !== akisSon ? '  (UYARI: bir alt grup son ayda eksik)' : ''}`);
console.log(`ufe_detay_snapshot    → ${detayDonem}${detayDonem !== akisSon ? '  (UYARI: bir alt grup son ayda eksik)' : ''}`);

const tirnak = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sayi = (v) => (v === null ? 'NULL' : String(v));

const ifadeler = [];
const beklenti = [];

for (const [kod, ad] of Object.entries(ALT_GRUP)) {
  const set = Object.entries(ALT_GRUP_OLCU)
    .map(([sutun, olcu]) => `${sutun} = ${sayi(deger(kod, olcu, altDonem))}`).join(', ');
  ifadeler.push(`UPDATE ufe_alt_grup_snapshot SET ${set} WHERE tur = ${tirnak(ad)};`);
  beklenti.push({
    aciklama: `ufe_alt_grup_snapshot "${ad}" yıllık (${altDonem})`,
    sorgu: `SELECT yillik_degisim AS v FROM ufe_alt_grup_snapshot WHERE tur = ${tirnak(ad)}`,
    deger: deger(kod, ALT_GRUP_OLCU.yillik_degisim, altDonem),
  });
}

for (const [kod, ad] of Object.entries(DETAY)) {
  const v = deger(kod, DETAY_OLCU, detayDonem);
  ifadeler.push(`UPDATE ufe_detay_snapshot SET yillik_degisim = ${sayi(v)} WHERE alt_grup = ${tirnak(ad)};`);
  beklenti.push({
    aciklama: `ufe_detay_snapshot "${ad}" (${detayDonem})`,
    sorgu: `SELECT yillik_degisim AS v FROM ufe_detay_snapshot WHERE alt_grup = ${tirnak(ad)}`,
    deger: v,
  });
}

console.log('\nTarım-ÜFE alt gruplar (yıllık %):');
for (const [kod, ad] of Object.entries(ALT_GRUP)) {
  console.log(`  ${String(deger(kod, ALT_GRUP_OLCU.yillik_degisim, altDonem)).padStart(7)}  ${ad}`);
}

if (!SQL_YOL) {
  console.log('\n--sql verilmedi, dosya üretilmedi.');
  process.exit(0);
}

ifadeler.push(damgaSql(['ufe_alt_grup_snapshot', 'ufe_detay_snapshot']));
writeFileSync(SQL_YOL, ifadeler.join('\n'), 'utf8');
console.log(`\n${ifadeler.length - 1} ifade + damga → ${SQL_YOL}`);

if (BEKLENTI_YOL) {
  const dolu = beklenti.filter((b) => b.deger !== null);
  writeFileSync(BEKLENTI_YOL, JSON.stringify(dolu, null, 2), 'utf8');
  console.log(`${dolu.length} beklenti → ${BEKLENTI_YOL}`);
}
