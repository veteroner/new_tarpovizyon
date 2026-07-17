// Migrates tuik_ticaret_hayvansal -> tr_dis_ticaret_hayvansal, one SQL file per year.
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://dersbende.com/api.php?action=query&api_key=REDACTED_DASHBOARD_KEY&sql=';
async function q(sql) {
  const r = await axios.get(API + encodeURIComponent(sql));
  if (r.data.error) throw new Error(r.data.error + ' :: ' + sql);
  return r.data.data || [];
}

function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const s = String(v);
  if (s.trim() === '') return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}
function num(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : 'NULL';
}

const cols = ['yil','ay','ana_urun','alt_urun_kod','alt_urun','ulke_kod','ulke','miktar_birim','ihracat_miktar','ithalat_miktar','deger_birim','ihracat_deger','ithalat_deger'];

async function main() {
  const outDir = path.join(__dirname, 'migrations', 'trade');
  fs.mkdirSync(outDir, { recursive: true });
  for (let year = 2000; year <= 2026; year++) {
    // The source table stores the same figures at multiple aggregation grains
    // (duzey_1: tüm/ülke, duzey_2: ürün/alt ürün, duzey_3: ay/yıl) in one flat
    // table. Restrict to country + main-product + month rows only, otherwise
    // the same trade value gets summed 4-8x across grains.
    const rows = await q(`SELECT yil,ay,ana_urun,alt_urunkod,alt_urun,ulkekod,ulke,miktar_birim,ihracat_mik,ithalat_mik,deger_birim,ihracat_deger,ithalat_deger FROM tuik_ticaret_hayvansal WHERE yil=${year} AND duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay'`);
    if (!rows.length) continue;
    const chunkSize = 300;
    const lines = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values = chunk.map(r => `(${[
        num(r.yil), num(r.ay), esc(r.ana_urun), esc(r.alt_urunkod), esc(r.alt_urun),
        esc(r.ulkekod), esc(r.ulke), esc(r.miktar_birim), num(r.ihracat_mik), num(r.ithalat_mik),
        esc(r.deger_birim), num(r.ihracat_deger), num(r.ithalat_deger)
      ].join(',')})`).join(',\n');
      lines.push(`INSERT INTO tr_dis_ticaret_hayvansal (${cols.join(',')}) VALUES\n${values};`);
    }
    const file = path.join(outDir, `trade_${year}.sql`);
    fs.writeFileSync(file, lines.join('\n'));
    console.log(year, rows.length, 'rows ->', file);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
