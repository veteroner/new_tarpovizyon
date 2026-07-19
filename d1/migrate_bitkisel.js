// Migrates crop/plant production data -> D1 (global uretim + TR uretim detay).
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://dersbende.com/api.php?action=query&api_key=dashboard_secret_key_2024&sql=';
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

// English FAO product name -> Turkish sector label used by the Looker report / our nav.
const GLOBAL_PRODUCT_MAP = {
  Wheat: 'Buğday', Barley: 'Arpa', 'Maize (corn)': 'Mısır', 'Seed cotton, unginned': 'Pamuk',
  'Sunflower seed': 'Ayçiçeği', 'Chick peas, dry': 'Nohut', 'Lentils, dry': 'Mercimek',
  'Beans, dry': 'Fasulye (Kuru)', 'Soya beans': 'Soya', 'Rape or colza seed': 'Kolza (Kanola)',
  'Sugar beet': 'Şeker Pancarı', 'Safflower seed': 'Aspir', Rice: 'Çeltik', Potatoes: 'Patates',
  'Pistachios, in shell': 'Antep Fıstığı', Pears: 'Armut', 'Almonds, in shell': 'Badem',
  'Walnuts, in shell': 'Ceviz', Apples: 'Elma', 'Peaches and nectarines': 'Şeftali',
  Strawberries: 'Çilek', 'Hazelnuts, in shell': 'Fındık', 'Pomelos and grapefruits': 'Greyfurt',
  Figs: 'İncir (Yaş)', Apricots: 'Kayısı (Yaş)', Cherries: 'Kiraz', 'Lemons and limes': 'Limon',
  'Tangerines, mandarins, clementines': 'Mandalina', Bananas: 'Muz', Grapes: 'Üzüm (Yaş)',
  Oranges: 'Portakal', Olives: 'Zeytin', 'Chillies and peppers, green (Capsicum spp. and Pimenta spp.)': 'Biber',
  Tomatoes: 'Domates', 'Cucumbers and gherkins': 'Hıyar', Watermelons: 'Karpuz',
  'Cantaloupes and other melons': 'Kavun', 'Onions and shallots, dry (excluding dehydrated)': 'Soğan (Kuru)',
};

const cols1 = ['ulke', 'urun', 'yil', 'ekilen_alan_ha', 'uretim_ton', 'verim_kg_ha'];

async function migrateGlobal() {
  const products = Object.keys(GLOBAL_PRODUCT_MAP);
  const placeholders = products.map((p) => `'${p.replace(/'/g, "''")}'`).join(',');
  const rows = await q(`SELECT ulkead, urunad, year, miktar_deger, uretim_deger, verim_deger FROM fao_uretim_bitkisel_birincil WHERE urunad IN (${placeholders})`);
  const lines = [];
  const chunkSize = 250;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map((r) => `(${[
      esc(r.ulkead), esc(GLOBAL_PRODUCT_MAP[r.urunad] || r.urunad), num(r.year), num(r.miktar_deger), num(r.uretim_deger), num(r.verim_deger),
    ].join(',')})`).join(',\n');
    lines.push(`INSERT INTO bitkisel_global_uretim (${cols1.join(',')}) VALUES\n${values};`);
  }
  fs.writeFileSync(path.join(__dirname, 'migrations', '0005_bitkisel_global.sql'), lines.join('\n'));
  console.log('global uretim rows:', rows.length);
}

const cols2 = ['urun', 'unsur', 'yil', 'deger'];

async function migrateTrUretim() {
  const rows = await q("SELECT urun, unsur, y2004,y2005,y2006,y2007,y2008,y2009,y2010,y2011,y2012,y2013,y2014,y2015,y2016,y2017,y2018,y2019,y2020,y2021,y2022,y2023,y2024 FROM tuik_bitkisel_uretim WHERE duzey='ülke'");
  const long = [];
  const yearCols = [];
  for (let y = 2004; y <= 2024; y++) yearCols.push(`y${y}`);
  for (const r of rows) {
    for (const yc of yearCols) {
      const v = r[yc];
      if (v !== null && v !== undefined && v !== '' && v !== '0') {
        long.push({ urun: r.urun, unsur: r.unsur, yil: parseInt(yc.slice(1), 10), deger: v });
      }
    }
  }
  const lines = [];
  const chunkSize = 250;
  for (let i = 0; i < long.length; i += chunkSize) {
    const chunk = long.slice(i, i + chunkSize);
    const values = chunk.map((r) => `(${[esc(r.urun), esc(r.unsur), num(r.yil), num(r.deger)].join(',')})`).join(',\n');
    lines.push(`INSERT INTO bitkisel_tr_uretim_detay (${cols2.join(',')}) VALUES\n${values};`);
  }
  fs.writeFileSync(path.join(__dirname, 'migrations', '0006_bitkisel_tr_uretim.sql'), lines.join('\n'));
  console.log('tr uretim detay rows:', long.length);
}

async function main() {
  await migrateGlobal();
  await migrateTrUretim();
}
main().catch((e) => { console.error(e); process.exit(1); });
