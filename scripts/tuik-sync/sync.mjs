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

function toNumber(raw, decimals) {
  if (raw === undefined || raw === '') return null;
  const n = Number(raw);
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

/** Dönem, veri setinin kapsamı içinde mi? */
const inRange = (ds, p) => isMonth(p) && (!ds.minPeriod || p >= ds.minPeriod);

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
    byPeriod.get(r.TIME_PERIOD)[col] = toNumber(r.OBS_VALUE, ds.decimals);
  }

  const existing = new Map();
  for (const r of await d1(`SELECT substr(${ds.periodColumn},1,7) AS p, ${cols.join(',')} FROM ${ds.table}`)) {
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
        sql: `UPDATE ${ds.table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE substr(${ds.periodColumn},1,7)=?`,
        params: [...next, period],
      });
    } else {
      inserted++;
      writes.push({
        sql: `INSERT INTO ${ds.table} (${ds.periodColumn},${cols.join(',')}) VALUES (${Array(cols.length + 1).fill('?').join(',')})`,
        params: [`${period}-01 00:00:00`, ...next],
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
    wanted.set(`${label ?? ''}|${yil}|${ay}`, { label, yil, ay, value: toNumber(r.OBS_VALUE, ds.decimals) });
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
      const cols = [...keyCols, ds.valueColumn];
      writes.push({
        sql: `INSERT INTO ${ds.table} (${cols.join(',')}) VALUES (${Array(cols.length).fill('?').join(',')})`,
        params: [...keyVals, v.value],
      });
    }
  }

  await applyWrites(writes);
  const periods = [...wanted.values()].map((v) => `${v.yil}-${String(v.ay).padStart(2, '0')}`).sort();
  return { dataset: ds.name, status: 'ok', inserted, updated, latestPeriod: periods.at(-1) ?? null, message: null };
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
  for (const ds of DATASETS) {
    try {
      results.push(ds.kind === 'wide' ? await syncWide(ds) : await syncLong(ds));
    } catch (e) {
      results.push({ dataset: ds.name, status: 'error', inserted: 0, updated: 0, latestPeriod: null, message: e.message });
    }
  }

  await writeLog(startedAt, results);

  for (const r of results) {
    const mark = r.status === 'ok' ? '✓' : '✗';
    const detail = r.status === 'ok'
      ? `+${r.inserted} eklendi, ~${r.updated} güncellendi, son dönem ${r.latestPeriod}`
      : r.message;
    console.log(`${mark} ${r.dataset}: ${detail}`);
  }

  const failed = results.filter((r) => r.status === 'error');
  if (failed.length) {
    console.error(`\n${failed.length} veri seti başarısız.`);
    process.exit(1);
  }
  console.log('\nSenkron tamam.');
}

main().catch((e) => {
  console.error('Beklenmeyen hata:', e);
  process.exit(1);
});
