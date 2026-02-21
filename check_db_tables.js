const axios = require('axios');
const API = 'https://dersbende.com/api.php?action=query&api_key=dashboard_secret_key_2024&sql=';
async function q(sql) { const r = await axios.get(API + encodeURIComponent(sql)); return r.data; }

async function main() {
  console.log('=== BIRINCIL TABLO ===');
  const r1 = await q('SELECT * FROM fao_uretim_hayvansal_birincil LIMIT 3');
  console.log(JSON.stringify(r1.data?.slice(0,3), null, 2));
  
  console.log('\n=== CANLIHAYVAN TABLO ===');
  const r2 = await q('SELECT * FROM fao_uretim_hayvansal_canlihayvan LIMIT 3');
  console.log(JSON.stringify(r2.data?.slice(0,3), null, 2));
  
  console.log('\n=== ISLENMIS TABLO ===');
  const r3 = await q('SELECT * FROM fao_uretim_hayvansal_islenmis LIMIT 3');
  console.log(JSON.stringify(r3.data?.slice(0,3), null, 2));
  
  console.log('\n=== ISLENMIS URUN LISTESI ===');
  const r4 = await q('SELECT DISTINCT urunad FROM fao_uretim_hayvansal_islenmis ORDER BY urunad LIMIT 30');
  console.log(r4.data?.map(d => d.urunad).join('\n'));
  
  console.log('\n=== BIRINCIL URUN LISTESI ===');
  const r5 = await q('SELECT DISTINCT urunad FROM fao_uretim_hayvansal_birincil ORDER BY urunad LIMIT 30');
  console.log(r5.data?.map(d => d.urunad).join('\n'));
  
  console.log('\n=== CANLIHAYVAN URUN LISTESI ===');
  const r6 = await q('SELECT DISTINCT urunad FROM fao_uretim_hayvansal_canlihayvan ORDER BY urunad LIMIT 30');
  console.log(r6.data?.map(d => d.urunad).join('\n'));
  
  console.log('\n=== YEAR RANGES ===');
  const r7 = await q('SELECT MIN(year) as mn, MAX(year) as mx, COUNT(*) as cnt FROM fao_uretim_hayvansal_birincil');
  console.log('Birincil:', JSON.stringify(r7.data?.[0]));
  const r8 = await q('SELECT MIN(year) as mn, MAX(year) as mx, COUNT(*) as cnt FROM fao_uretim_hayvansal_canlihayvan');
  console.log('Canlihayvan:', JSON.stringify(r8.data?.[0]));
  const r9 = await q('SELECT MIN(year) as mn, MAX(year) as mx, COUNT(*) as cnt FROM fao_uretim_hayvansal_islenmis');
  console.log('Islenmis:', JSON.stringify(r9.data?.[0]));
  
  console.log('\n=== TURKEY DATA CHECK ===');
  const r10 = await q("SELECT DISTINCT ulkead FROM fao_uretim_hayvansal_birincil WHERE ulkead LIKE '%urk%' OR ulkead LIKE '%Türk%' LIMIT 5");
  console.log('Turkey names:', JSON.stringify(r10.data));
  
  console.log('\n=== URETIMINDEX TABLE CHECK ===');
  const r11 = await q("SELECT * FROM üretimindex LIMIT 3");
  console.log(JSON.stringify(r11.data?.slice(0,3), null, 2));
}

main().catch(console.error);
