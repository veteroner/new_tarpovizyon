#!/usr/bin/env node
/**
 * Dünya Bankası makro göstergeleri → D1.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Genel Bakış'ın makro kartları FAO'nun `fao_ME_indicator` tablosundan geliyor
 * ve o seri Türkiye için 2024'te BİTİYOR. Sayfa bu yüzden 2026'da 2024
 * rakamını gösteriyordu.
 *
 * Dünya Bankası aynı göstergeleri 2025 için YAYIMLIYOR, API'si açık, anahtar
 * istemiyor ve Node'dan doğrudan çalışıyor (ölçüldü). Kazanç bir tam yıl:
 *
 *   GSYİH        FAO 2024: 1,32 T$   →  DB 2025: 1,597 T$
 *   Kişi başı    FAO 2024: 15.893 $  →  DB 2025: 18.599 $
 *   Tarım payı   FAO 2024: %5,82     →  DB 2025: %5,21
 *
 * ─── NEDEN AYRI TABLO ───────────────────────────────────────────────────────
 * Dünya Bankası satırlarını `fao_ME_indicator`'a yazmak kaynağı gizlerdi:
 * tablo adı FAO diyor ama içinde başka kurumun rakamı olurdu. İki kurumun
 * aynı yıl için değerleri de birebir aynı değil (2024 GSYİH: FAO 1,32 T$,
 * DB 1,359 T$ — %3 fark, farklı revizyon takvimleri).
 *
 * Bu yüzden kendi tablosu var ve sayfa hangi kaynağı gösterdiğini yazıyor.
 * "Tek kaynak" ilkesi kaynakları KARIŞTIRMAK değil, her ölçünün TEK ve BELLİ
 * bir kaynağı olması demek.
 *
 * ─── KULLANIM ───────────────────────────────────────────────────────────────
 *   node scripts/dunya-bankasi-sync.mjs          # yalnız rapor
 *   node scripts/dunya-bankasi-sync.mjs --yaz    # D1'e yaz
 */

import { execFileSync } from 'node:child_process';
import { damgaSql } from './lib/damga.mjs';

const YAZ = process.argv.includes('--yaz');
const DB = 'tarpovizyon-basic';
const TABLO = 'dunya_bankasi_makro';
const ULKE = 'TUR';

/** Gösterge kodu → D1'de tutulacak ad ve birim. */
const GOSTERGELER = [
  { kod: 'NY.GDP.MKTP.CD', ad: 'gsyh_usd', birim: 'USD' },
  { kod: 'NY.GDP.PCAP.CD', ad: 'gsyh_kisi_basi_usd', birim: 'USD' },
  { kod: 'SP.POP.TOTL', ad: 'nufus', birim: 'kişi' },
  { kod: 'NV.AGR.TOTL.ZS', ad: 'tarim_gsyh_payi', birim: '%' },
  { kod: 'NV.AGR.TOTL.CD', ad: 'tarimsal_katma_deger_usd', birim: 'USD' },
  { kod: 'AG.LND.AGRI.K2', ad: 'tarim_arazisi_km2', birim: 'km²' },
  { kod: 'SL.AGR.EMPL.ZS', ad: 'tarim_istihdam_payi', birim: '%' },
];

async function cek(kod) {
  const url = `https://api.worldbank.org/v2/country/${ULKE}/indicator/${kod}`
    + '?format=json&per_page=200';
  const r = await fetch(url, { headers: { 'User-Agent': 'tarpovizyon-sync' } });
  if (!r.ok) throw new Error(`${kod}: HTTP ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j) || !j[1]) throw new Error(`${kod}: beklenmeyen yanıt`);
  return j[1]
    .filter((x) => x.value != null)
    .map((x) => ({ yil: Number(x.date), deger: Number(x.value) }));
}

const satirlar = [];
for (const g of GOSTERGELER) {
  try {
    const veri = await cek(g.kod);
    if (!veri.length) { console.log(`   ${g.ad.padEnd(26)} veri yok`); continue; }
    const son = veri.reduce((a, b) => (b.yil > a.yil ? b : a));
    console.log(`   ${g.ad.padEnd(26)} ${veri.length} yıl · son ${son.yil} = `
      + `${son.deger.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${g.birim}`);
    for (const v of veri) satirlar.push({ gosterge: g.ad, birim: g.birim, ...v });
  } catch (e) {
    console.error(`   ${g.ad.padEnd(26)} HATA: ${e.message}`);
  }
}

if (!satirlar.length) { console.error('Hiç veri alınamadı.'); process.exit(1); }
console.log(`\ntoplam ${satirlar.length} satır`);

if (!YAZ) { console.log('\n--yaz verilmedi, yazılmadı.'); process.exit(0); }

const kur = `CREATE TABLE IF NOT EXISTS ${TABLO} (
  gosterge TEXT NOT NULL,
  yil INTEGER NOT NULL,
  deger REAL,
  birim TEXT,
  PRIMARY KEY (gosterge, yil)
);`;

/* Parça parça: tek ifadede binlerce VALUES D1'in sınırını aşıyor. */
const PARCA = 400;
execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', kur],
  { encoding: 'utf8', stdio: 'inherit' });

for (let i = 0; i < satirlar.length; i += PARCA) {
  const dilim = satirlar.slice(i, i + PARCA);
  const sql = `INSERT INTO ${TABLO} (gosterge, yil, deger, birim) VALUES\n`
    + dilim.map((s) => `('${s.gosterge}', ${s.yil}, ${s.deger}, '${s.birim}')`).join(',\n')
    + '\nON CONFLICT(gosterge, yil) DO UPDATE SET deger=excluded.deger, birim=excluded.birim;';
  execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', sql],
    { encoding: 'utf8', stdio: 'inherit' });
}

execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', damgaSql([TABLO])],
  { encoding: 'utf8', stdio: 'inherit' });
console.log('\nyazıldı ve önbellek damgası ilerletildi.');
