// TarpoVizyon Basic API — thin read-only JSON layer in front of D1.
//
// D1 can only be queried from within a Worker (no public REST endpoint like
// PostgREST), so this Worker exposes one fixed, allowlisted route per report
// section. Table names are never taken from the request — only values for a
// small set of per-route filter columns are, and those are always bound as
// prepared-statement parameters. This intentionally avoids the raw-SQL-passthrough
// pattern used by the old PHP proxy.

const ROUTES = {
  'global/uretim': { table: 'global_uretim', filters: ['urun', 'ulke'], order: 'uretim_miktari_ton DESC' },
  'global/hayvan-sayilari': { table: 'global_hayvan_sayilari', filters: ['ulke'], order: 'ulke ASC' },
  'global/hayvan-sayilari-detay': { table: 'global_hayvan_sayilari_detay', filters: ['ulke', 'hayvan_turu'], order: 'ulke ASC' },
  'global/karkas-agirligi': { table: 'global_karkas_agirligi', filters: ['ulke'], order: 'karkas_verimi_kg DESC' },
  'global/et-tuketimi-karsilastirma': { table: 'global_et_tuketimi_karsilastirma', filters: ['ulke'], order: 'ulke ASC' },

  'tr/hayvan-varliklari': { table: 'tr_hayvan_varliklari', filters: [], order: 'tarih ASC' },
  'tr/hayvansal-urun-uretimi': { table: 'tr_hayvansal_urun_uretimi', filters: ['yil'], order: 'yil ASC' },
  'tr/kisi-basi-uretim-tuketim': { table: 'tr_kisi_basi_uretim_tuketim', filters: ['yil'], order: 'yil ASC' },
  'tr/kisi-basina-guncel-tuketim': { table: 'tr_kisi_basina_guncel_tuketim', filters: [], order: 'id ASC' },
  'tr/verimlilikler': { table: 'tr_verimlilikler', filters: ['yil'], order: 'yil ASC' },
  'tr/yeterlilikler': { table: 'tr_yeterlilikler', filters: [], order: 'id ASC' },

  'il/hayvan-sayilari': { table: 'il_hayvan_sayilari', filters: ['il'], order: 'il ASC' },
  'il/bal-cesitleri': { table: 'il_bal_cesitleri', filters: ['il'], order: 'il ASC' },
  'il/arici-sayisi-yillik': { table: 'il_arici_sayisi_yillik', filters: ['il', 'yil'], order: 'il ASC, yil ASC' },

  'dis-ticaret/hayvansal': { table: 'tr_dis_ticaret_hayvansal', filters: ['yil', 'ana_urun', 'ulke'], order: 'yil DESC, ay DESC', maxLimit: 2000 },
  'dis-ticaret/kirmizi-et-hayvan-ithalati': { table: 'kirmizi_et_hayvan_ithalati', filters: ['yil'], order: 'yil ASC' },
  'dis-ticaret/ihracat-onaylari': { table: 'ihracat_onaylari', filters: ['ihracat_ulkesi', 'urun_kategorisi'], order: 'id ASC' },

  'cig-sut/uretim-miktari': { table: 'cig_sut_uretim_miktari', filters: ['yil'], order: 'yil ASC' },
  'cig-sut/ekonomik-gostergeler': { table: 'cig_sut_ekonomik_gostergeler', filters: [], order: 'tarih ASC' },
  'cig-sut/onayli-ciftlikler': { table: 'sut_ciftlikleri_onayli', filters: ['il'], order: 'il ASC' },
  'cig-sut/urun-uretimi': { table: 'sut_urunleri_uretimi', filters: [], order: 'tarih ASC' },

  'kirmizi-et/uretim-miktari': { table: 'kirmizi_et_uretim_miktari', filters: ['yil'], order: 'yil ASC' },
  'kirmizi-et/hayvan-sayilari-yillik': { table: 'kirmizi_et_hayvan_sayilari_yillik', filters: ['yil'], order: 'yil ASC' },
  'kirmizi-et/ekonomik-gostergeler': { table: 'kirmizi_et_ekonomik_gostergeler', filters: [], order: 'tarih ASC' },

  'kanatli/uretimleri': { table: 'kanatli_uretimleri', filters: [], order: 'tarih ASC' },
  'kanatli/maliyet-fiyat': { table: 'kanatli_eti_maliyet_fiyat', filters: [], order: 'tarih ASC' },

  'yumurta/maliyet-fiyat': { table: 'yumurta_maliyet_fiyat', filters: [], order: 'tarih ASC' },

  'bitkisel/global-uretim': { table: 'bitkisel_global_uretim', filters: ['urun', 'ulke', 'yil'], order: 'uretim_ton DESC', maxLimit: 8000 },
  'bitkisel/dis-ticaret': { table: 'bitkisel_tr_dis_ticaret', filters: ['yil', 'ana_urun', 'ulke'], order: 'yil DESC, ay DESC', maxLimit: 2000 },

  'makro/veriler': { table: 'makro_veriler', filters: [], order: 'id ASC' },
  'makro/tarim-gsyh': { table: 'makro_tarim_gsyh', filters: [], order: 'yil ASC' },
  'makro/tarim-disticaret': { table: 'makro_tarim_disticaret', filters: [], order: 'yil ASC' },
  'makro/ufe-aylik': { table: 'ufe_aylik', filters: [], order: 'yil ASC, ay ASC' },
  'makro/ufe-alt-grup-snapshot': { table: 'ufe_alt_grup_snapshot', filters: [], order: 'id ASC' },
  'makro/ufe-detay-snapshot': { table: 'ufe_detay_snapshot', filters: [], order: 'id ASC' },
  'makro/gfe-alt-grup-aylik': { table: 'gfe_alt_grup_aylik', filters: ['alt_grup'], order: 'yil ASC, ay ASC', maxLimit: 2000 },
  'makro/tufe-aylik': { table: 'tufe_aylik', filters: [], order: 'yil ASC, ay ASC' },
  'makro/tufe-yillik-snapshot': { table: 'tufe_yillik_snapshot', filters: [], order: 'id ASC' },
  'makro/tufe-aylik-snapshot': { table: 'tufe_aylik_snapshot', filters: [], order: 'id ASC' },
  'makro/fao-urunler-aylik': { table: 'fao_urunler_aylik', filters: [], order: 'yil ASC, ay ASC' },

  'il-duzeyinde/bitkisel-uretim': { table: 'il_bitkisel_uretim', filters: ['il', 'urun', 'urun_grup'], order: 'uretim_ton DESC', maxLimit: 10000 },
  'il-duzeyinde/havza-ilce': { table: 'havza_ilce', filters: ['havza', 'il'], order: 'havza ASC, il ASC, ilce ASC', maxLimit: 1500 },
  'il-duzeyinde/havza-urun-deseni': { table: 'havza_urun_deseni', filters: ['havza', 'il', 'ilce'], order: 'havza ASC, il ASC, ilce ASC', maxLimit: 6000 },
  'il-duzeyinde/cografi-isaret': { table: 'il_cografi_isaret', filters: ['il'], order: 'il ASC, cografi_isaret_adi ASC', maxLimit: 2000 },

  // ─── TarpoVizyon ana modülü: MySQL'den taşınan TÜİK tabloları ──────────────
  // Bunlar `tuik_*` adlarını koruyor; MySQL şemasının birebir kopyası olduğu
  // için sayfa sorguları yeniden yazılırken alan adları değişmiyor.
  'tuik/bitkisel-uretim': { table: 'tuik_bitkisel_uretim', filters: ['duzeykod', 'yerkod', 'ili', 'urun', 'urunkod', 'urun_grup', 'ugkod', 'unsur', 'duzey'], order: 'urun ASC', maxLimit: 10000 },
  'tuik/urundenge': { table: 'tuik_urundenge', filters: ['urun'], order: 'urun ASC', maxLimit: 2000 },
  'tuik/fiyatendex': { table: 'tuik_fiyatendex', filters: ['endeks', 'maddekod', 'urun', 'yil', 'alan', 'd1', 'd2', 'd3', 'd4'], order: 'yil ASC', maxLimit: 10000 },
  'tuik/gsyh-a21': { table: 'tuik_gsyh_a21', filters: ['yerkod', 'yer', 'sektorkod', 'sektor', 'yil'], order: 'yil ASC', maxLimit: 10000 },
  'tuik/kisibasigelir': { table: 'tuik_kisibasigelir', filters: ['yil', 'yer', 'yerkod', 'duzey'], order: 'yil ASC', maxLimit: 5000 },
  'tuik/hayvancilik-canlihayvan': { table: 'tuik_hayvancilik_canlihayvan', filters: ['duzeykod', 'yerkod', 'il', 'ilkod', 'hayvankod', 'grup', 'kategori', 'tip'], order: 'id ASC', maxLimit: 10000 },
  'tuik/hayvancilik-hayvansaluretim': { table: 'tuik_hayvancilik_hayvansaluretim', filters: [], order: 'id ASC', maxLimit: 10000 },
  'tuik/hayvancilik-kumeshayvanciligi': { table: 'tuik_hayvancilik_kumeshayvanciligi', filters: [], order: 'id ASC', maxLimit: 2000 },
  'tuik/sutvesuturunleri': { table: 'tuik_hayavancilik_sutvesuturunleri', filters: [], order: 'id ASC', maxLimit: 2000 },
  'tuik/ticaret-bitkisel': { table: 'tuik_ticaret_bitkisel', filters: ['yil', 'ay', 'ana_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'alt_urun'], order: 'yil DESC', maxLimit: 5000 },
  'tuik/ticaret-hayvansal': { table: 'tuik_ticaret_hayvansal', filters: ['yil', 'ay', 'ana_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'alt_urun'], order: 'yil DESC', maxLimit: 5000 },

  // Havza / coğrafi işaret ham tabloları (MySQL'deki hâlleriyle)
  'tuik/havza': { table: 'havza', filters: [], order: 'id ASC', maxLimit: 2000 },
  'tuik/havzalist': { table: 'havzalist', filters: [], order: 'id ASC', maxLimit: 2000 },

  // ─── Dünya / FAO verileri (DUNYA veritabanı) ───────────────────────────────
  'fao/uretim-bitkisel-birincil': { db: 'DUNYA', table: 'fao_uretim_bitkisel_birincil', filters: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/uretim-bitkisel-islenmis': { db: 'DUNYA', table: 'fao_uretim_bitkisel_islenmis', filters: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/uretim-hayvansal-birincil': { db: 'DUNYA', table: 'fao_uretim_hayvansal_birincil', filters: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/uretim-hayvansal-islenmis': { db: 'DUNYA', table: 'fao_uretim_hayvansal_islenmis', filters: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/uretim-hayvansal-canlihayvan': { db: 'DUNYA', table: 'fao_uretim_hayvansal_canlihayvan', filters: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/livestock-primary': { db: 'DUNYA', table: 'fao_livestock_primary', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/balans': { db: 'DUNYA', table: 'fao_balans', filters: ['ulke', 'ulkead', 'urun', 'urunad', 'yil'], order: 'yil ASC', maxLimit: 10000 },
  'fao/land-use': { db: 'DUNYA', table: 'fao_land_use', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/land-cover': { db: 'DUNYA', table: 'fao_land_cover', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/input-gubre-ticari': { db: 'DUNYA', table: 'fao_input_gubre_ticari', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/input-pestisit-use': { db: 'DUNYA', table: 'fao_input_pestisit_use', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/nufus': { db: 'DUNYA', table: 'fao_nufus', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/nufus-istihdam-tarim': { db: 'DUNYA', table: 'fao_nufus_istihdam_tarim', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/me-indicator': { db: 'DUNYA', table: 'fao_ME_indicator', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/tahmin-sonuclari': { db: 'DUNYA', table: 'fao_tahmin_sonuclari', filters: [], order: 'rowid ASC', maxLimit: 10000 },
};

/** Bir rotanın hangi D1 bağlantısını kullanacağını çözer (varsayılan: DB). */
function dbFor(env, route) {
  return route.db === 'DUNYA' ? env.DUNYA : env.DB;
}

// ─── Kısıtlı toplama (aggregate) uçları ──────────────────────────────────────
//
// TarpoVizyon sayfaları tarayıcıdan ham SQL gönderiyordu (SUM/AVG/COUNT DISTINCT
// + GROUP BY + dışlanan bölgeler). Her sorgu için ayrı uç yazmak ~200 endpoint
// demek olurdu; bunun yerine tablo başına İZİN VERİLEN sütun/işlem listesi
// tanımlanıyor ve istemci yalnızca yapılandırılmış parametre gönderiyor.
//
// GÜVENLİK: tablo ve sütun adları YALNIZCA aşağıdaki listelerden seçilir —
// istekten gelen hiçbir tanımlayıcı SQL'e doğrudan yazılmaz. Filtre DEĞERLERİ
// her zaman prepared statement parametresi olarak bağlanır. Yani istemci
// sorgunun şeklini değiştiremez, sadece izin verilen alanlar arasından seçer.
const AGG = {
  'fao/uretim-bitkisel-birincil': { db: 'DUNYA', table: 'fao_uretim_bitkisel_birincil',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], nums: ['miktar_deger', 'uretim_deger', 'verim_deger'] },
  'fao/uretim-bitkisel-islenmis': { db: 'DUNYA', table: 'fao_uretim_bitkisel_islenmis',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], nums: ['miktar_deger', 'uretim_deger', 'verim_deger'] },
  'fao/uretim-hayvansal-birincil': { db: 'DUNYA', table: 'fao_uretim_hayvansal_birincil',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], nums: ['miktar_deger', 'uretim_deger', 'verim_deger'] },
  'fao/uretim-hayvansal-islenmis': { db: 'DUNYA', table: 'fao_uretim_hayvansal_islenmis',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], nums: ['miktar_deger', 'uretim_deger', 'verim_deger'] },
  'fao/uretim-hayvansal-canlihayvan': { db: 'DUNYA', table: 'fao_uretim_hayvansal_canlihayvan',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year'], nums: ['miktar_deger', 'uretim_deger', 'verim_deger'] },
  'tuik/ticaret-bitkisel': { table: 'tuik_ticaret_bitkisel',
    dims: ['yil', 'ay', 'ana_urun', 'alt_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'miktar_birim'],
    nums: ['ihracat_mik', 'ithalat_mik', 'ihracat_deger', 'ithalat_deger'] },
  'tuik/ticaret-hayvansal': { table: 'tuik_ticaret_hayvansal',
    dims: ['yil', 'ay', 'ana_urun', 'alt_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'miktar_birim'],
    nums: ['ihracat_mik', 'ithalat_mik', 'ihracat_deger', 'ithalat_deger'] },
  'tuik/gsyh-a21': { table: 'tuik_gsyh_a21',
    dims: ['yerkod', 'yer', 'sektorkod', 'sektor', 'yil'], nums: ['zincir_endeks', 'zincir', 'zincir_degisim', 'cari'] },
  'tuik/kisibasigelir': { table: 'tuik_kisibasigelir', dims: ['yil', 'yer', 'yerkod', 'duzey'], nums: ['USD', 'TR'] },

  // Kimlik benzeri sayısal alanlar (year, *code) gruplanabilsin diye dims'te;
  // nums yalnızca gerçek ölçüleri içerir.
  'fao/balans': { db: 'DUNYA', table: 'fao_balans',
    dims: ['domain', 'ulke', 'ulkead', 'urun', 'urunad', 'yil'],
    nums: ['nuf_v', 'uretim_v', 'imp_v', 'stok_v', 'exp_v', 'arz_v', 'yem_v', 'tohum_v', 'kayip_v'] },
  'fao/land-use': { db: 'DUNYA', table: 'fao_land_use',
    dims: ['domain', 'area', 'areacode', 'hesap', 'Element', 'element_tr', 'elementcode', 'item', 'item_tr', 'itemcode', 'year', 'yearcode', 'unit'],
    nums: ['value'] },
  'fao/land-cover': { db: 'DUNYA', table: 'fao_land_cover',
    dims: ['domain', 'area', 'areacode', 'element', 'element_tr', 'elementcode', 'item', 'item_tr', 'itemcode', 'year', 'unit'],
    nums: ['value'] },
  'fao/input-gubre-ticari': { db: 'DUNYA', table: 'fao_input_gubre_ticari',
    dims: ['domaincode', 'area', 'areacode', 'element', 'element_tr', 'elementcode', 'item', 'item_tr', 'itemcode', 'year', 'unit'],
    nums: ['value'] },
  'fao/input-pestisit-use': { db: 'DUNYA', table: 'fao_input_pestisit_use',
    dims: ['domaincode', 'area', 'areacode', 'element', 'element_tr', 'elementcode', 'item', 'item_tr', 'itemcode', 'year', 'unit'],
    nums: ['value'] },
  'fao/me-indicator': { db: 'DUNYA', table: 'fao_ME_indicator',
    dims: ['domain', 'area', 'areacode', 'element', 'element_tr', 'elementcode', 'item', 'item_tr', 'itemcode', 'year', 'unit'],
    nums: ['value'] },
  // fao_livestock_primary'de `value` metin olarak saklanıyor; CAST ile toplanır.
  'fao/livestock-primary': { db: 'DUNYA', table: 'fao_livestock_primary',
    dims: ['domain', 'area', 'areacode', 'element', 'elementcode', 'item', 'itemcode', 'year', 'unit'],
    nums: ['value'] },
  'fao/nufus': { db: 'DUNYA', table: 'fao_nufus',
    dims: ['domain', 'area', 'areacode', 'item', 'itemcode', 'year', 'unit'],
    nums: ['TOPLAM', 'erkek/T', 'kadın/T', 'kirsal', 'sehir'] },
  'fao/nufus-istihdam-tarim': { db: 'DUNYA', table: 'fao_nufus_istihdam_tarim',
    dims: ['domaincode', 'area', 'areacode', 'indicator', 'indicator_tr', 'indicatorcode', 'element', 'elementcode', 'yearcode', 'unit'],
    nums: ['total', 'male', 'female'] },
  'fao/tahmin-sonuclari': { db: 'DUNYA', table: 'fao_tahmin_sonuclari',
    dims: ['urunad', 'ulkead', 'veri_tipi', 'trend', 'model_tarihi', 'tahmin_yil'],
    nums: ['tahmin_deger', 'alt_sinir', 'ust_sinir', 'r2_cv', 'mae_cv', 'mape_cv'] },
};

// FAO "ülke" sütununda kıta/gelir grubu gibi toplam satırları da var; ülke
// sıralaması yapılırken bunlar dışlanmalı. Frontend'de İKİ AYRI liste vardı
// (içerikleri farklı) — davranışı bire bir korumak için ikisi de burada ayrı
// hazır liste olarak tutuluyor, sayfa hangisini kullanıyorsa onu seçer.
const EXCLUDE_PRESETS = {
  v1: ['World', 'WORLD', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Northern Africa', 'Eastern Africa',
    'Middle Africa', 'Southern Africa', 'Western Africa', 'Northern America', 'Central America', 'Caribbean',
    'South America', 'Central Asia', 'Eastern Asia', 'South-eastern Asia', 'Southern Asia', 'Western Asia',
    'Eastern Europe', 'Northern Europe', 'Southern Europe', 'Western Europe', 'Australia and New Zealand',
    'Melanesia', 'Micronesia', 'Polynesia', 'Least Developed Countries', 'Land Locked Developing Countries',
    'Small Island Developing States', 'Low Income Food Deficit Countries', 'Net Food Importing Developing Countries',
    'European Union (27)', 'China, mainland', 'China, Taiwan Province of'],
  v2: ['World', 'WORLD', 'Europe', 'Americas', 'Asia', 'Africa', 'Northern America', 'Southern America',
    'Eastern Europe', 'Western Europe', 'Northern Europe', 'Southern Europe', 'Southern Asia', 'Eastern Asia',
    'South-eastern Asia', 'Central Asia', 'Western Asia', 'Northern Africa', 'Eastern Africa', 'Western Africa',
    'Middle Africa', 'Southern Africa', 'Caribbean', 'Central America', 'South America', 'Oceania',
    'European Union (27)', 'European Union', 'Melanesia', 'Polynesia', 'Micronesia', 'Aggregate',
    'Least Developed Countries', 'Small Island Developing States', 'Low Income Food Deficit Countries',
    'Net Food Importing Developing Countries', 'Land Locked Developing Countries', 'Dünya', 'DÜNYA', 'Dunya',
    'Total', 'TOTAL', 'Toplam', 'TOPLAM'],
};

const qi = (n) => `"${n}"`;

/**
 * İstemcinin yapılandırılmış parametrelerinden SQL kurar. Her tanımlayıcı
 * cfg.dims / cfg.nums içinde olup olmadığına göre doğrulanır; olmayan bir ad
 * gelirse istek 400 ile reddedilir.
 */
function buildAgg(cfg, sp) {
  const pick = (name, allowed) => (sp.get(name) || '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((c) => { if (!allowed.includes(c)) throw new Error(`izin verilmeyen sütun: ${c}`); return c; });

  const groupBy = pick('groupBy', cfg.dims);
  const select = pick('select', cfg.dims);
  const sums = pick('sum', cfg.nums);
  const avgs = pick('avg', cfg.nums);
  const mins = pick('min', cfg.nums);
  const maxs = pick('max', cfg.nums);
  const distincts = pick('countDistinct', [...cfg.dims, ...cfg.nums]);

  const cols = [];
  for (const c of new Set([...groupBy, ...select])) cols.push(`${qi(c)} AS ${qi(c)}`);
  // MySQL'deki CAST(x AS DECIMAL(20,2)) yerine SQLite'ta REAL.
  for (const c of sums) cols.push(`SUM(CAST(${qi(c)} AS REAL)) AS ${qi('sum_' + c)}`);
  for (const c of avgs) cols.push(`AVG(CAST(${qi(c)} AS REAL)) AS ${qi('avg_' + c)}`);
  for (const c of mins) cols.push(`MIN(CAST(${qi(c)} AS REAL)) AS ${qi('min_' + c)}`);
  for (const c of maxs) cols.push(`MAX(CAST(${qi(c)} AS REAL)) AS ${qi('max_' + c)}`);
  for (const c of distincts) cols.push(`COUNT(DISTINCT ${qi(c)}) AS ${qi('cd_' + c)}`);
  if (sp.get('count') === '1') cols.push('COUNT(*) AS "cnt"');
  if (cols.length === 0) throw new Error('en az bir select/groupBy/toplama alanı gerekli');

  const where = [];
  const params = [];
  // Filtreler: f_<sütun>=değer (eşitlik), fn_<sütun>=değer (eşit değil),
  // fge_/fle_<sütun> (>= / <=). Değerler her zaman bind edilir.
  const allCols = [...cfg.dims, ...cfg.nums];
  const OPS = { f_: '=', fn_: '!=', fge_: '>=', fle_: '<=' };
  for (const [k, v] of sp.entries()) {
    if (v === '') continue;
    const prefix = Object.keys(OPS).find((p) => k.startsWith(p));
    if (!prefix) continue;
    const col = k.slice(prefix.length);
    if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
    where.push(`${qi(col)} ${OPS[prefix]} ?`); params.push(v);
  }
  // positive=<sütun>: MySQL sorgularındaki "CAST(x) > 0" koşulunun karşılığı.
  for (const c of pick('positive', cfg.nums)) where.push(`CAST(${qi(c)} AS REAL) > 0`);
  // exclude=<preset>:<sütun> — kıta/toplam satırlarını dışla.
  const ex = sp.get('exclude');
  if (ex) {
    const [preset, col] = ex.split(':');
    const list = EXCLUDE_PRESETS[preset];
    if (!list) throw new Error(`bilinmeyen exclude preset: ${preset}`);
    if (!cfg.dims.includes(col)) throw new Error(`izin verilmeyen exclude sütunu: ${col}`);
    where.push(`${qi(col)} NOT IN (${list.map(() => '?').join(',')})`);
    params.push(...list);
  }

  // orderBy, üretilen takma adlar (sum_x, cd_y…) veya boyut sütunları arasından.
  const aliases = [...groupBy, ...select, ...sums.map((c) => 'sum_' + c), ...avgs.map((c) => 'avg_' + c),
    ...mins.map((c) => 'min_' + c), ...maxs.map((c) => 'max_' + c), ...distincts.map((c) => 'cd_' + c), 'cnt'];
  let orderSql = '';
  const ob = sp.get('orderBy');
  if (ob) {
    if (!aliases.includes(ob)) throw new Error(`izin verilmeyen orderBy: ${ob}`);
    orderSql = `ORDER BY ${qi(ob)} ${sp.get('dir') === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (groupBy.length) {
    orderSql = `ORDER BY ${groupBy.map(qi).join(', ')} ASC`;
  }

  let limit = parseInt(sp.get('limit') || '', 10);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 20000) limit = 20000;

  const sql = `SELECT ${cols.join(', ')} FROM ${qi(cfg.table)}`
    + (where.length ? ` WHERE ${where.join(' AND ')}` : '')
    + (groupBy.length ? ` GROUP BY ${groupBy.map(qi).join(', ')}` : '')
    + (orderSql ? ` ${orderSql}` : '') + ` LIMIT ${limit}`;
  return { sql, params };
}

// Trade tables keyed by module prefix, used by the generic yillik-trend / urun-ozet
// aggregate endpoints below (dış ticaret ürün karşılaştırma bölümleri için).
const TRADE_TABLES = {
  hayvansal: 'tr_dis_ticaret_hayvansal',
  bitkisel: 'bitkisel_tr_dis_ticaret',
};

// Long-format Turkish crop production detail (ürün × unsur × yıl), used by per-sector
// pages that need to sum several botanical varieties into one series (e.g. Zeytin =
// Sofralık Zeytinler + Yağlık Zeytinler).
async function tradeMeta(env, table) {
  const { results: years } = await env.DB.prepare(`SELECT DISTINCT yil FROM ${table} ORDER BY yil DESC`).all();
  const { results: products } = await env.DB.prepare(`SELECT DISTINCT ana_urun FROM ${table} ORDER BY ana_urun ASC`).all();
  return { years: years.map((r) => r.yil), products: products.map((r) => r.ana_urun) };
}

// GFE alt gruplarının "Alt Gruplara Göre Tarım-GFE" bar grafiği için en güncel
// aya ait anlık görüntüsü — gfe_alt_grup_aylik uzun formatta olduğundan (bazı
// alt gruplarda ara ay boşlukları var), en güncel (yil, ay) çiftini bulup o aya
// ait tüm alt grup satırlarını döndürür.
async function gfeLatestSnapshot(env) {
  const { results: latest } = await env.DB.prepare(
    `SELECT yil, ay FROM gfe_alt_grup_aylik ORDER BY yil DESC, ay DESC LIMIT 1`
  ).all();
  if (latest.length === 0) return { yil: null, ay: null, data: [] };
  const { yil, ay } = latest[0];
  const { results } = await env.DB.prepare(
    `SELECT alt_grup, yillik_degisim FROM gfe_alt_grup_aylik WHERE yil = ? AND ay = ? ORDER BY yillik_degisim DESC`
  ).bind(yil, ay).all();
  return { yil, ay, data: results };
}

async function uretimDetayYillik(env, urunler, unsur) {
  const placeholders = urunler.map(() => '?').join(',');
  const sql = `SELECT yil, SUM(deger) deger FROM bitkisel_tr_uretim_detay
               WHERE unsur = ? AND urun IN (${placeholders}) GROUP BY yil ORDER BY yil ASC`;
  const { results } = await env.DB.prepare(sql).bind(unsur, ...urunler).all();
  return results;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Split a product-list query param on '|' ONLY. Many product names contain
// commas (e.g. "Buğday, Durum Buğdayı Hariç", "Fasulye, Kuru"), so comma can
// never be the delimiter — a single comma-name like "Fasulye, Kuru" would be
// torn into ["Fasulye","Kuru"] and match nothing. The frontend always joins
// with '|' (a char no product name contains), so a lone name simply has no
// delimiter and passes through intact.
function splitUrunler(raw) {
  return (raw || '').split('|').map((x) => x.trim()).filter(Boolean);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

// Product-list aggregates for sector "dış ticaret" sections. `urunler` values are
// always bound as prepared-statement parameters, never interpolated as SQL, so an
// arbitrary product list from the client cannot inject SQL — it can only ever
// widen/narrow the WHERE ana_urun IN (...) match.
//
// A sector's product list can mix units (e.g. "Kırmızı Et ve Canlı Hayvan Dış
// Ticareti" sums live-animal rows in ADET with meat rows in KG) — summing
// ihracat_miktar/ithalat_miktar across those would silently produce a
// meaningless number. Only report a `unit` (and thus only let the client show
// the quantity) when every matched product shares exactly one miktar_birim.
async function tradeUnit(env, table, urunler) {
  const placeholders = urunler.map(() => '?').join(',');
  const sql = `SELECT DISTINCT miktar_birim FROM ${table} WHERE ana_urun IN (${placeholders}) AND miktar_birim IS NOT NULL`;
  const { results } = await env.DB.prepare(sql).bind(...urunler).all();
  return results.length === 1 ? results[0].miktar_birim : null;
}

async function tradeYearlyTrend(env, table, urunler) {
  const placeholders = urunler.map(() => '?').join(',');
  const sql = `SELECT yil, SUM(ihracat_deger) ihracat_deger, SUM(ithalat_deger) ithalat_deger,
                      SUM(ihracat_miktar) ihracat_miktar, SUM(ithalat_miktar) ithalat_miktar
               FROM ${table} WHERE ana_urun IN (${placeholders})
               GROUP BY yil ORDER BY yil ASC`;
  const [{ results }, unit] = await Promise.all([
    env.DB.prepare(sql).bind(...urunler).all(),
    tradeUnit(env, table, urunler),
  ]);
  return { data: results, unit };
}

async function tradeProductBreakdown(env, table, urunler, yil) {
  const placeholders = urunler.map(() => '?').join(',');
  // Grouped by ana_urun, so each row is inherently single-product/single-unit —
  // miktar here is always safe to show regardless of the sector's overall mix.
  const sql = `SELECT ana_urun, SUM(ihracat_deger) ihracat_deger, SUM(ithalat_deger) ithalat_deger,
                      SUM(ihracat_miktar) ihracat_miktar, SUM(ithalat_miktar) ithalat_miktar,
                      MAX(miktar_birim) miktar_birim
               FROM ${table} WHERE yil = ? AND ana_urun IN (${placeholders})
               GROUP BY ana_urun ORDER BY ihracat_deger DESC`;
  const { results } = await env.DB.prepare(sql).bind(yil, ...urunler).all();
  return results;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

    if (slug === '' || slug === 'routes') {
      return json({ routes: Object.keys(ROUTES).map(k => `/api/${k}`) });
    }

    const tradeAggMatch = slug.match(/^(hayvansal|bitkisel)\/dis-ticaret\/(yillik-trend|urun-ozet)$/)
      ?? (slug === 'dis-ticaret/yillik-trend' || slug === 'dis-ticaret/urun-ozet' ? ['', 'hayvansal', slug.split('/')[1]] : null);
    if (tradeAggMatch) {
      const [, modul, kind] = tradeAggMatch;
      const table = TRADE_TABLES[modul];
      const urunler = splitUrunler(url.searchParams.get('urunler'));
      if (urunler.length === 0) return json({ error: 'urunler parametresi zorunlu' }, 400);
      try {
        if (kind === 'yillik-trend') {
          const { data, unit } = await tradeYearlyTrend(env, table, urunler);
          return json({ data, count: data.length, unit });
        }
        const yil = parseInt(url.searchParams.get('yil') || '', 10);
        if (!Number.isFinite(yil)) return json({ error: 'yil parametresi zorunlu' }, 400);
        const data = await tradeProductBreakdown(env, table, urunler, yil);
        return json({ data, count: data.length });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    const metaMatch = slug.match(/^(hayvansal|bitkisel)\/dis-ticaret\/meta$/);
    if (metaMatch) {
      try {
        const data = await tradeMeta(env, TRADE_TABLES[metaMatch[1]]);
        return json(data);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (slug === 'dis-ticaret/meta') {
      try {
        const data = await tradeMeta(env, TRADE_TABLES.hayvansal);
        return json(data);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (slug === 'makro/gfe-latest') {
      try {
        const data = await gfeLatestSnapshot(env);
        return json(data);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (slug === 'bitkisel/uretim-detay-yillik') {
      const urunler = splitUrunler(url.searchParams.get('urunler'));
      const unsur = url.searchParams.get('unsur') || '';
      if (urunler.length === 0 || !unsur) return json({ error: 'urunler ve unsur parametreleri zorunlu' }, 400);
      try {
        const data = await uretimDetayYillik(env, urunler, unsur);
        return json({ data, count: data.length });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // Kısıtlı toplama ucu: /api/agg/<rota>?groupBy=…&sum=…&f_<sütun>=…
    if (slug.startsWith('agg/')) {
      const key = slug.slice(4);
      const cfg = AGG[key];
      if (!cfg) return json({ error: 'Not found', available: Object.keys(AGG).map((k) => `/api/agg/${k}`) }, 404);
      try {
        const { sql, params } = buildAgg(cfg, url.searchParams);
        const { results } = await dbFor(env, cfg).prepare(sql).bind(...params).all();
        return json({ data: results, count: results.length });
      } catch (err) {
        // Doğrulama hataları istemci hatasıdır (izin verilmeyen sütun vb.).
        const msg = String(err.message || err);
        const bad = /izin verilmeyen|gerekli|bilinmeyen/.test(msg);
        return json({ error: msg }, bad ? 400 : 500);
      }
    }

    if (slug === 'agg') return json({ routes: Object.keys(AGG).map((k) => `/api/agg/${k}`) });

    const route = ROUTES[slug];
    if (!route) return json({ error: 'Not found', available: Object.keys(ROUTES) }, 404);

    const where = [];
    const params = [];
    for (const col of route.filters) {
      const val = url.searchParams.get(col);
      if (val !== null && val !== '') {
        where.push(`${col} = ?`);
        params.push(val);
      }
    }

    const maxLimit = route.maxLimit || 5000;
    let limit = parseInt(url.searchParams.get('limit') || '', 10);
    if (!Number.isFinite(limit) || limit <= 0 || limit > maxLimit) limit = maxLimit;
    let offset = parseInt(url.searchParams.get('offset') || '', 10);
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${route.table} ${whereSql} ORDER BY ${route.order} LIMIT ? OFFSET ?`;

    try {
      const stmt = dbFor(env, route).prepare(sql).bind(...params, limit, offset);
      const { results } = await stmt.all();
      return json({ data: results, count: results.length });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
