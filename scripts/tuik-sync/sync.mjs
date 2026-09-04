#!/usr/bin/env node
/**
 * TÜİK → Cloudflare D1 senkronizasyonu.
 *
 * GitHub Actions üzerinde günde bir kez çalışır. TÜİK SDMX servisinden veri
 * setlerini çeker, D1'deki mevcut hâliyle karşılaştırır ve YALNIZCA değişen
 * satırları yazar. Böylece yeni dönemleri ekler, TÜİK geçmiş bir dönemi revize
 * ettiğinde de düzeltir. Tekrar tekrar çalıştırmak güvenlidir (idempotent).
 *
 * Neden Worker değil de Actions: TÜİK, Cloudflare Workers çıkış IP'lerini
 * engelliyor (her iki host da zaman aşımına uğruyor). GitHub runner'larından
 * erişim sorunsuz — bu ölçülerek doğrulandı.
 *
 * Gerekli ortam değişkenleri:
 *   TUIK_API_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID
 * Seçimlik:
 *   DRY_RUN=1  → hiçbir şey yazmaz, sadece ne yapacağını raporlar
 */

import { DATASETS } from './datasets.mjs';
import { bildirGerekiyorsa } from './bildirim.mjs';
import { damgala } from '../lib/damga.mjs';

const TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token';
const SDMX_BASE = 'https://nsiws.tuik.gov.tr/rest/data/TR,';
const SDMX_CSV = 'application/vnd.sdmx.data+csv;version=1.0.0';

const DRY_RUN = process.env.DRY_RUN === '1';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} ortam değişkeni tanımlı değil.`);
  return v;
}

// ─── Cloudflare D1 ───────────────────────────────────────────────────────────

const D1_URL = () =>
  `https://api.cloudflare.com/client/v4/accounts/${requireEnv('CLOUDFLARE_ACCOUNT_ID')}` +
  `/d1/database/${requireEnv('CLOUDFLARE_D1_DATABASE_ID')}/query`;

async function d1(sql, params) {
  const res = await fetch(D1_URL(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('CLOUDFLARE_API_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params === undefined ? { sql } : { sql, params }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(`D1 hatası (HTTP ${res.status}): ${JSON.stringify(body?.errors ?? body)}`);
  }
  return body.result[0].results;
}

// ─── TÜİK ────────────────────────────────────────────────────────────────────

/** Erişim belirteci alır. */
async function requestToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'nsi-ws-consumer',
      api_key: requireEnv('TUIK_API_KEY'),
    }),
  });
  if (!res.ok) {
    throw new Error(`Token alınamadı (HTTP ${res.status}). API anahtarı geçersiz veya süresi dolmuş olabilir.`);
  }
  const body = await res.json();
  if (!body.access_token) throw new Error('Token yanıtında access_token yok.');
  return { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 };
}

/**
 * TÜİK token'ı yalnızca 300 saniye yaşıyor ve veri setleri megabaytlarca.
 * Bu yüzden her kullanımda süreyi kontrol edip gerekirse yeniliyoruz.
 */
let cachedToken = null;
async function getToken() {
  if (!cachedToken || cachedToken.expiresAt - Date.now() < 60_000) {
    cachedToken = await requestToken();
  }
  return cachedToken.token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDataset(ds) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${SDMX_BASE}${ds.flow},${ds.version}`, {
        // Accept-Language şart: başlıksız istekte servis "languageTag1" ile 500 döner.
        headers: {
          Authorization: `Bearer ${await getToken()}`,
          Accept: SDMX_CSV,
          'Accept-Language': 'tr',
        },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status === 401) {
        cachedToken = null; // süresi dolmuş olabilir; sonraki denemede yenilenir
        throw new Error(`${ds.flow}: yetkilendirme reddedildi (401).`);
      }
      if (!res.ok) throw new Error(`${ds.flow} indirilemedi (HTTP ${res.status}).`);
      return await res.text();
    } catch (e) {
      lastError = e;
      if (attempt < 3) await sleep(attempt * 3000);
    }
  }
  throw new Error(`${ds.flow}: ${lastError.message} (3 deneme başarısız)`);
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** SDMX-CSV'yi satır nesnelerine çevirir (tırnaklı alanlar dahil). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];

  const header = rows[0];
  return rows.slice(1)
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const matchesFilter = (row, filter) => Object.entries(filter).every(([k, v]) => row[k] === v);

/**
 * @param bolen Kaynak birimi hedef birime çevirir. TÜİK bazı serileri farklı
 *   ölçekte veriyor: GSYH `TUSD` (bin dolar) geliyor ama tablo milyar dolar
 *   tutuyor, yani 1e6'ya bölünmeli. Verilmezse 1 — mevcut veri setleri
 *   etkilenmiyor.
 */
function toNumber(raw, decimals, bolen = 1) {
  if (raw === undefined || raw === '') return null;
  const n = Number(raw) / (bolen || 1);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** İki değeri karşılaştırır; kayan nokta gürültüsünü yok sayar. */
function same(a, b) {
  if (a === null || a === undefined) return b === null;
  if (b === null) return false;
  return Math.abs(Number(a) - b) < 1e-6;
}

const isMonth = (p) => /^\d{4}-\d{2}$/.test(p);
const isYear = (p) => /^\d{4}$/.test(p);

/*
 * ─── AYLIK / YILLIK ─────────────────────────────────────────────────────────
 * Senkron başlangıçta yalnız aylık veri setleri için yazılmıştı ve üç yerde
 * aylık biçim varsayılıyordu: dönem deseni, SQL'deki `substr(...,1,7)` ve
 * INSERT'e yazılan `YYYY-MM-01 00:00:00`. GSYH gibi YILLIK setlerde dönem
 * "2024" geliyor; desen tutmadığı için tüm satırlar SESSİZCE eleniyordu —
 * hata da vermiyor, sadece "değişiklik yok" diyordu.
 *
 * `donem: 'yillik'` diyen veri setleri için üçü birden değişiyor.
 */
const yillikMi = (ds) => ds.donem === 'yillik';

/** Dönem, veri setinin kapsamı içinde mi? */
const inRange = (ds, p) =>
  (yillikMi(ds) ? isYear(p) : isMonth(p)) && (!ds.minPeriod || p >= ds.minPeriod);

/** Dönem sütununun SQL'de karşılaştırılabilir hâli. */
const donemIfade = (ds) =>
  yillikMi(ds) ? ds.periodColumn : `substr(${ds.periodColumn},1,7)`;

/** INSERT'e yazılacak dönem değeri. */
const donemDegeri = (ds, p) => (yillikMi(ds) ? Number(p) : `${p}-01 00:00:00`);

/** Yazma işlemlerini sırayla uygular (günlük fark tipik olarak birkaç satır). */
async function applyWrites(writes) {
  if (DRY_RUN) return;
  for (const w of writes) await d1(w.sql, w.params);
}

// ─── Geniş tablolar ─────────────────────────────────────────────────────────

async function syncWide(ds) {
  const rows = parseCsv(await fetchDataset(ds)).filter((r) => matchesFilter(r, ds.filter));
  const cols = Object.keys(ds.columns);
  const codeToCol = new Map(Object.entries(ds.columns).map(([col, code]) => [code, col]));

  // Kod listesi değişmiş mi? Beklenen kodların hiçbiri gelmiyorsa yazma.
  const seen = new Set(rows.map((r) => r[ds.productDim]));
  if (Object.values(ds.columns).every((c) => !seen.has(c))) {
    throw new Error(`Beklenen ürün kodlarının hiçbiri gelmedi (${ds.productDim}). Kod listesi değişmiş olabilir.`);
  }

  const byPeriod = new Map();
  for (const r of rows) {
    const col = codeToCol.get(r[ds.productDim]);
    if (!col || !inRange(ds, r.TIME_PERIOD)) continue;
    if (!byPeriod.has(r.TIME_PERIOD)) byPeriod.set(r.TIME_PERIOD, {});
    byPeriod.get(r.TIME_PERIOD)[col] = toNumber(r.OBS_VALUE, ds.decimals, ds.bolen);
  }

  /*
   * TÜİK henüz yayımlamadığı aylar için de satır döndürüyor; OBS_VALUE boş
   * geliyor ve toNumber bunu null yapıyor. Bu dönemleri yazmak tabloya
   * TAMAMI BOŞ satırlar ekliyordu — arayüz de onları 0 diye çizip "Aralık
   * 2025'te yumurta üretimi sıfır" gibi bir grafik çıkarıyordu.
   * Hiçbir sütununda değer olmayan dönem hiç yazılmaz.
   */
  for (const [period, values] of [...byPeriod]) {
    if (cols.every((c) => values[c] === null || values[c] === undefined)) byPeriod.delete(period);
  }

  const existing = new Map();
  for (const r of await d1(`SELECT ${donemIfade(ds)} AS p, ${cols.join(',')} FROM ${ds.table}`)) {
    existing.set(String(r.p), r);
  }

  const writes = [];
  let inserted = 0;
  let updated = 0;

  for (const period of [...byPeriod.keys()].sort()) {
    const values = byPeriod.get(period);
    const next = cols.map((c) => values[c] ?? null);
    const prev = existing.get(period);
    if (prev && cols.every((c, i) => same(prev[c], next[i]))) continue;

    if (prev) {
      updated++;
      writes.push({
        sql: `UPDATE ${ds.table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE ${donemIfade(ds)}=?`,
        params: [...next, donemDegeri(ds, period)],
      });
    } else {
      inserted++;
      writes.push({
        sql: `INSERT INTO ${ds.table} (${ds.periodColumn},${cols.join(',')}) VALUES (${Array(cols.length + 1).fill('?').join(',')})`,
        params: [donemDegeri(ds, period), ...next],
      });
    }
  }

  await applyWrites(writes);
  const periods = [...byPeriod.keys()].sort();
  return { dataset: ds.name, status: 'ok', inserted, updated, latestPeriod: periods.at(-1) ?? null, message: null };
}

// ─── Uzun tablolar ──────────────────────────────────────────────────────────

async function syncLong(ds) {
  const rows = parseCsv(await fetchDataset(ds)).filter((r) => matchesFilter(r, ds.filter));
  if (!rows.length) throw new Error(`${ds.flow}: filtreye uyan satır yok. Boyut kodları değişmiş olabilir.`);

  const labelCol = ds.labelColumn;
  const keyCols = labelCol ? [labelCol, 'yil', 'ay'] : ['yil', 'ay'];
  /*
   * Bazı tablolarda etiketin kendisine bağlı SABİT bir alan daha var
   * (madde fiyatlarında birim: TL/kg, TL/baş…). Değere göre değişmediği için
   * gözlemden değil, koddan gelen haritadan yazılıyor.
   */
  const sabitSutunlar = ds.staticColumns ?? {};

  const wanted = new Map();
  for (const r of rows) {
    if (!inRange(ds, r.TIME_PERIOD)) continue;
    let label = null;
    if (ds.labelDim) {
      label = ds.labels?.[r[ds.labelDim]] ?? null;
      if (label === null) continue; // tanınmayan kod → atla
    }
    const [y, m] = r.TIME_PERIOD.split('-');
    const yil = Number(y);
    const ay = Number(m);
    const value = toNumber(r.OBS_VALUE, ds.decimals);
    if (value === null) continue; // yayımlanmamış dönem — boş satır yazma (bkz. 'wide' yolundaki not)
    wanted.set(`${label ?? ''}|${yil}|${ay}`, { label, yil, ay, value, code: ds.labelDim ? r[ds.labelDim] : null });
  }
  if (!wanted.size) throw new Error(`${ds.flow}: eşleşen etiket bulunamadı. Kod listesi değişmiş olabilir.`);

  const existing = new Map();
  for (const r of await d1(`SELECT ${keyCols.join(',')}, ${ds.valueColumn} FROM ${ds.table}`)) {
    existing.set(`${labelCol ? r[labelCol] : ''}|${r.yil}|${r.ay}`, r[ds.valueColumn]);
  }

  const writes = [];
  let inserted = 0;
  let updated = 0;

  for (const [key, v] of wanted) {
    const had = existing.has(key);
    if (had && same(existing.get(key), v.value)) continue;
    const keyVals = labelCol ? [v.label, v.yil, v.ay] : [v.yil, v.ay];

    if (had) {
      updated++;
      writes.push({
        sql: `UPDATE ${ds.table} SET ${ds.valueColumn}=? WHERE ${keyCols.map((c) => `${c}=?`).join(' AND ')}`,
        params: [v.value, ...keyVals],
      });
    } else {
      inserted++;
      // Etikete bağlı sabit alanlar (ör. birim) yalnızca INSERT'te yazılır;
      // UPDATE onlara dokunmaz çünkü değere göre değişmezler.
      const sabitAd = Object.keys(sabitSutunlar);
      const sabitDeger = sabitAd.map((c) => sabitSutunlar[c][v.code] ?? null);
      const cols = [...keyCols, ...sabitAd, ds.valueColumn];
      writes.push({
        sql: `INSERT INTO ${ds.table} (${cols.join(',')}) VALUES (${Array(cols.length).fill('?').join(',')})`,
        params: [...keyVals, ...sabitDeger, v.value],
      });
    }
  }

  await applyWrites(writes);
  const periods = [...wanted.values()].map((v) => `${v.yil}-${String(v.ay).padStart(2, '0')}`).sort();
  return { dataset: ds.name, status: 'ok', inserted, updated, latestPeriod: periods.at(-1) ?? null, message: null };
}

// ─── Ay sütunlu tablolar (tuik_fiyatendex) ──────────────────────────────────

const AY_SUTUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/**
 * `tuik_fiyatendex` düzeni: her satır bir (endeks, maddekod, yil) üçlüsü ve
 * 12 ay ayrı SÜTUN. Diğer tablolardaki "her dönem bir satır" düzeninden
 * farklı olduğu için ayrı bir yazıcı gerekiyor.
 *
 * YALNIZCA GÜNCELLER, satır eklemez. Tablo `urun`, `d1..d4`, `bazyil` gibi
 * SDMX'ten türetilemeyen alanlar da taşıyor; yeni bir madde kodu geldiğinde
 * onu uydurmak yerine atlayıp raporluyoruz — eksik ürün adıyla satır eklemek
 * ön yüzdeki eşleştirmeleri sessizce bozar.
 */
async function syncMonthCols(ds) {
  const rows = parseCsv(await fetchDataset(ds)).filter((r) => matchesFilter(r, ds.filter));
  if (!rows.length) throw new Error(`${ds.flow}: filtreye uyan satır yok. Boyut kodları değişmiş olabilir.`);

  // TÜİK kodu → D1'deki maddekod. GFE'de D1 sıfır dolgulu 6 haneli kod
  // kullanıyor (20_1 yerine 201000), o yüzden eşleme dışarıdan verilebiliyor.
  const kodEsle = (k) => (ds.codeMap ? ds.codeMap[k] : k);

  const gelen = new Map(); // "kod|yil" -> { ay: değer }
  for (const r of rows) {
    if (!inRange(ds, r.TIME_PERIOD)) continue;
    const kod = kodEsle(r[ds.codeDim]);
    if (!kod) continue;
    const deger = toNumber(r.OBS_VALUE, ds.decimals);
    if (deger === null) continue; // yayımlanmamış dönem
    const [y, m] = r.TIME_PERIOD.split('-');
    const anahtar = `${kod}|${Number(y)}`;
    if (!gelen.has(anahtar)) gelen.set(anahtar, {});
    gelen.get(anahtar)[Number(m)] = deger;
  }
  if (!gelen.size) throw new Error(`${ds.flow}: eşleşen madde kodu yok.`);

  const aySutun = AY_SUTUN.map((a) => `"${a}"`).join(',');
  const mevcut = new Map();
  for (const r of await d1(
    `SELECT ${ds.codeColumn}, ${ds.yearColumn}, ${aySutun} FROM ${ds.table} WHERE endeks = ?`,
    [ds.endeks],
  )) {
    mevcut.set(`${r[ds.codeColumn]}|${r[ds.yearColumn]}`, r);
  }

  const writes = [];
  let updated = 0;
  let atlanan = 0;

  for (const [anahtar, aylar] of gelen) {
    const prev = mevcut.get(anahtar);
    if (!prev) { atlanan++; continue; }
    const setler = [];
    const params = [];
    for (const [ay, deger] of Object.entries(aylar)) {
      const sutun = AY_SUTUN[Number(ay) - 1];
      if (same(prev[sutun], deger)) continue;
      setler.push(`"${sutun}" = ?`);
      params.push(deger);
    }
    if (!setler.length) continue;
    const [kod, yil] = anahtar.split('|');
    updated++;
    writes.push({
      sql: `UPDATE ${ds.table} SET ${setler.join(', ')} `
        + `WHERE endeks = ? AND ${ds.codeColumn} = ? AND ${ds.yearColumn} = ?`,
      params: [...params, ds.endeks, kod, Number(yil)],
    });
  }

  await applyWrites(writes);
  const donemler = rows.map((r) => r.TIME_PERIOD).filter(isMonth).sort();
  return {
    dataset: ds.name, status: 'ok', inserted: 0, updated,
    latestPeriod: donemler.at(-1) ?? null,
    message: atlanan ? `${atlanan} bilinmeyen (kod,yıl) atlandı` : null,
  };
}

// ─── Orkestrasyon ────────────────────────────────────────────────────────────

async function writeLog(startedAt, results) {
  if (DRY_RUN) return;
  try {
    for (const r of results) {
      await d1(
        `INSERT INTO tuik_sync_log (calisma_zamani,veri_seti,durum,eklenen,guncellenen,son_donem,mesaj)
         VALUES (?,?,?,?,?,?,?)`,
        [startedAt, r.dataset, r.status, r.inserted, r.updated, r.latestPeriod, r.message],
      );
    }
  } catch (e) {
    console.error('Uyarı: senkron kaydı yazılamadı —', e.message);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  if (DRY_RUN) console.log('DRY_RUN=1 — hiçbir şey yazılmayacak.\n');

  // API anahtarını erkenden doğrula: bozuksa her veri seti için ayrı ayrı
  // patlamak yerine tek ve anlaşılır bir hatayla çık.
  try {
    await getToken();
  } catch (e) {
    const failed = [{ dataset: '(tümü)', status: 'error', inserted: 0, updated: 0, latestPeriod: null, message: e.message }];
    await writeLog(startedAt, failed);
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }

  const results = [];
  const degisenTablolar = [];
  for (const ds of DATASETS) {
    try {
      const yazici = { wide: syncWide, long: syncLong, monthCols: syncMonthCols }[ds.kind];
      if (!yazici) throw new Error(`Bilinmeyen veri seti türü: ${ds.kind}`);
      const r = await yazici(ds);
      results.push(r);
      // Yalnızca gerçekten satır değişen tablolar damgalanır: değişmeyen bir
      // tablonun önbelleğini atmak boşuna D1 okuması demek olurdu.
      if (r.inserted + r.updated > 0) degisenTablolar.push(ds.table);
    } catch (e) {
      results.push({ dataset: ds.name, status: 'error', inserted: 0, updated: 0, latestPeriod: null, message: e.message });
    }
  }

  await writeLog(startedAt, results);

  /*
   * Önbellek damgası. Bu adım olmadan senkron D1'i tazeler ama site bir saate
   * kadar eski veriyi göstermeye devam eder — senkron Worker'a hiç uğramadığı
   * (Cloudflare HTTP API'sine doğrudan yazdığı) için okuma önbelleğini
   * geçersizleştirecek başka bir yol yok.
   *
   * Yazma bittikten sonra ve kendi try/catch'iyle: veri D1'de, damga
   * atılamadıysa en kötü sonuç eski davranış.
   */
  if (!DRY_RUN && degisenTablolar.length) {
    try {
      await damgala(d1, degisenTablolar);
    } catch (e) {
      console.error('Damga adımı hata verdi (veri yazıldı, önbellek 1 saat bayat kalabilir):', e.message);
    }
  }

  /*
   * Bildirim, log yazıldıktan SONRA: modül "önceki dönemi" loga bakarak
   * buluyor ve `calisma_zamani < startedAt` ile bu çalışmanın kendi kaydını
   * dışarıda bırakıyor. DRY_RUN'da log yazılmadığı için bildirim de anlamsız;
   * atlanıyor.
   */
  if (!DRY_RUN) {
    try {
      await bildirGerekiyorsa(d1, results, startedAt);
    } catch (e) {
      console.error('Bildirim adımı hata verdi (senkron etkilenmedi):', e.message);
    }
  }

  for (const r of results) {
    const mark = r.status === 'ok' ? '✓' : '✗';
    const detail = r.status === 'ok'
      ? `+${r.inserted} eklendi, ~${r.updated} güncellendi, son dönem ${r.latestPeriod}`
      : r.message;
    console.log(`${mark} ${r.dataset}: ${detail}`);
  }

  await elleTablolariDenetle();

  const failed = results.filter((r) => r.status === 'error');
  if (failed.length) {
    console.error(`\n${failed.length} veri seti başarısız.`);
    process.exit(1);
  }
  console.log('\nSenkron tamam.');
}

/**
 * Otomatik tazelenemeyen tabloların geride kalıp kalmadığını RAPORLAR.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * TÜFE, TÜİK'in SDMX kataloğunda yok; yalnızca haber bülteninde yayımlanıyor
 * ve bültenin JSON uçları Node'dan 404 dönüyor (WAF). Yani bu tablo elle
 * güncelleniyor — ve tam da bu yüzden İKİ AY geride kaldığı fark edilmedi
 * (Mayıs'ta kalmışken Temmuz yayımlanmıştı).
 *
 * Burada veri ÇEKİLMİYOR, yalnızca gecikme ölçülüp uyarı basılıyor: senkron
 * her gün çalıştığı için gecikme en geç ertesi gün görünür oluyor.
 * Senkronu ASLA düşürmüyor — bu bir bilgi mesajı, hata değil.
 */
async function elleTablolariDenetle() {
  const ELLE = [
    { tablo: 'tufe_aylik', ad: 'TÜFE (aylık)', gecikmeAy: 2,
      komut: 'node scripts/tufe-guncelle.mjs --yil <yıl> --ay <ay> --url "<bülten-xls>"' },
  ];

  for (const t of ELLE) {
    try {
      const satirlar = await d1(`SELECT MAX(yil * 100 + ay) AS son FROM ${t.tablo}`);
      const son = satirlar?.[0]?.son;
      if (!son) continue;
      const sonYil = Math.floor(son / 100);
      const sonAy = son % 100;

      const simdi = new Date();
      const gecenAy = (simdi.getFullYear() - sonYil) * 12 + (simdi.getMonth() + 1 - sonAy);
      if (gecenAy > t.gecikmeAy) {
        console.warn(`\n⚠ ${t.ad}: son dönem ${sonYil}-${String(sonAy).padStart(2, '0')} `
          + `(${gecenAy} ay geride). Elle güncellenmeli:\n   ${t.komut}`);
      }
    } catch (e) {
      console.error(`Elle tablo denetimi atlandı (${t.tablo}): ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('Beklenmeyen hata:', e);
  process.exit(1);
});
