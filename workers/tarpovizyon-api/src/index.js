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
};

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

// Split a product-list query param. Prefer the '|' delimiter because many
// product names contain commas (e.g. "Buğday, Durum Buğdayı Hariç", "Fasulye,
// Kuru") — a comma split silently tore those in two and matched nothing. Falls
// back to comma only when no '|' is present, so older cached frontends that
// still send comma-joined single names keep working during a rollout.
function splitUrunler(raw) {
  const s = raw || '';
  const delimiter = s.includes('|') ? '|' : ',';
  return s.split(delimiter).map((x) => x.trim()).filter(Boolean);
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
      const stmt = env.DB.prepare(sql).bind(...params, limit, offset);
      const { results } = await stmt.all();
      return json({ data: results, count: results.length });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
