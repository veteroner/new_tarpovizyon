const API_KEY = 'REDACTED_DASHBOARD_KEY';
const BASE = 'https://dersbende.com';

async function q(sql) {
  const url = `${BASE}/api.php?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`;
  const r = await fetch(url);
  const j = await r.json();
  return j.data || [];
}

const EXCLUDED = "('World','Europe','Americas','Asia','Africa','Northern America','Southern America','Eastern Europe','Western Europe','Northern Europe','Southern Europe','Southern Asia','Eastern Asia','South-eastern Asia','Central Asia','Western Asia','Northern Africa','Eastern Africa','Western Africa','Middle Africa','Southern Africa','Caribbean','Central America','South America','Oceania','European Union (27)','European Union','Melanesia','Polynesia','Micronesia','Aggregate','Least Developed Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','Land Locked Developing Countries')";

(async () => {
  const tops = await q(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_islenmis WHERE year='2022' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead ORDER BY total DESC LIMIT 20`);
  console.log('=== Top 20 Countries (2022) ===');
  tops.forEach((r,i) => console.log(`${i+1}. ${r.ulkead} | ${r.total}`));

  const trMilk = await q("SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE ulkead='Türkiye' AND year='2022' AND uretim_birim='t' AND (urunad LIKE '%milk%' OR urunad LIKE '%Milk%')");
  const trProc = await q("SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_islenmis WHERE ulkead='Türkiye' AND year='2022' AND uretim_birim='t'");
  console.log('\nTR Raw Milk:', trMilk[0]?.total, '| TR Processed:', trProc[0]?.total);

  // Category breakdown for Turkey
  const trCats = await q("SELECT urunad, CAST(uretim_deger AS DECIMAL(20,2)) as val FROM fao_uretim_hayvansal_islenmis WHERE ulkead='Türkiye' AND year='2022' AND uretim_birim='t' ORDER BY val DESC");
  console.log('\n=== Turkey Categories ===');
  trCats.forEach(r => console.log(`  ${r.urunad}: ${r.val}`));

  // Turkey rank per product
  const trRanks = await q(`
    SELECT a.urunad, a.val, 
      (SELECT COUNT(DISTINCT b.ulkead) FROM fao_uretim_hayvansal_islenmis b 
       WHERE b.urunad=a.urunad AND b.year='2022' AND b.uretim_birim='t' 
       AND CAST(b.uretim_deger AS DECIMAL(20,2)) > a.val
       AND b.ulkead NOT IN ${EXCLUDED}) + 1 as rank
    FROM (
      SELECT urunad, CAST(uretim_deger AS DECIMAL(20,2)) as val
      FROM fao_uretim_hayvansal_islenmis 
      WHERE ulkead='Türkiye' AND year='2022' AND uretim_birim='t'
    ) a ORDER BY a.val DESC
  `);
  console.log('\n=== Turkey Ranks ===');
  trRanks.forEach(r => console.log(`  #${r.rank} ${r.urunad}: ${r.val}`));
})();

