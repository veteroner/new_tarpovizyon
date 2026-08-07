/**
 * Elle veri yükleme ucu.
 *
 * TÜİK'in bazı serileri (il bazlı hayvan sayıları, verimlilikler, arıcı
 * sayısı, TÜFE…) SDMX API'sinde YAYIMLANMIYOR; yalnızca MEDAS/portal
 * üzerinden elle indirilebiliyor. Bu uç, indirilen dosyanın panelden
 * yüklenebilmesi için var.
 *
 * ─── GÜVENLİK ───────────────────────────────────────────────────────────────
 * Bu, üretim veritabanına YAZAN tek uç. Üç katman:
 *
 *  1. Ayrı anahtar. Okuma anahtarı (x-api-key) İŞE YARAMAZ; `x-admin-key`
 *     başlığı `env.ADMIN_KEY` secret'ıyla birebir eşleşmeli. Secret depoda
 *     değil, `wrangler secret put ADMIN_KEY` ile tutuluyor.
 *  2. Beyaz liste. Yalnızca aşağıdaki TABLOLAR ve yalnızca burada YAZILI
 *     sütunlar yazılabilir. Listede olmayan tablo/sütun 400 döner —
 *     istemcinin gönderdiği hiçbir isim doğrudan SQL'e girmiyor.
 *  3. Bağlı parametre. Bütün değerler `?` ile bağlanıyor; SQL'e string
 *     birleştirmesiyle hiçbir veri girmiyor.
 *
 * Ayrıca: DELETE/DROP yok, rastgele SQL yok, istek başına satır sınırı var.
 * En kötü durumda beyaz listedeki bir tablonun beyaz listedeki bir sütunu
 * yanlış değer alır — geri alınabilir, yıkıcı değil.
 */

/** İstek başına en fazla satır. Ön yüz bundan büyük dosyaları parçalayarak yollar. */
export const MAX_ROWS = 500;

/**
 * Yüklenebilir tablolar.
 *
 *   keys : satırı tekilleştiren İŞ anahtarı (id değil — id otomatik artan
 *          vekil anahtar, dosyada karşılığı yok).
 *   cols : yazılabilir sütunlar. Buraya eklenmemiş sütun yazılamaz.
 *   nums : sayıya çevrilecek sütunlar (dosyadan metin gelebiliyor).
 */
export const UPLOAD_TABLES = {
  'il-hayvan-sayilari': {
    table: 'oner_i_llerin_hayvan_sayisi',
    label: 'İl Bazında Hayvan Sayıları',
    keys: ['il', 'tarih'],
    cols: ['il', 'tarih', 'sigir_varligi_bas', 'manda_varligi_bas', 'koyun_varligi_bas',
      'keci_varligi_bas', 'arici_sayisi', 'bal_uretimi_ton', 'aricilik_yapan_isletme_sayisi_adet',
      'yeni_kovan_sayisi_adet', 'eski_kovan_sayisi_adet', 'kovan_varligi_adet',
      'balmumu_uretimi_ton', 'bal_verimi_kg', 'et_tavugu_sayisi', 'yumurta_tavugu_sayisi',
      'toplam_hayvan_varligi'],
    nums: ['sigir_varligi_bas', 'manda_varligi_bas', 'koyun_varligi_bas', 'keci_varligi_bas',
      'arici_sayisi', 'bal_uretimi_ton', 'aricilik_yapan_isletme_sayisi_adet',
      'yeni_kovan_sayisi_adet', 'eski_kovan_sayisi_adet', 'kovan_varligi_adet',
      'balmumu_uretimi_ton', 'bal_verimi_kg', 'et_tavugu_sayisi', 'yumurta_tavugu_sayisi',
      'toplam_hayvan_varligi'],
  },
  'verimlilikler': {
    table: 'oner_verimlilikler',
    label: 'Verimlilikler',
    keys: ['yil'],
    cols: ['yil', 'cig_sut_verimi_lt', 'buyukbas_karkas_et_verimi_kg',
      'kucukbas_karkas_et_verimi_kg', 'bal_verimi_kg'],
    nums: ['cig_sut_verimi_lt', 'buyukbas_karkas_et_verimi_kg',
      'kucukbas_karkas_et_verimi_kg', 'bal_verimi_kg'],
  },
  'arici-sayisi': {
    table: 'il_arici_sayisi_yillik',
    label: 'İllere Göre Arıcı Sayısı',
    keys: ['il', 'yil'],
    cols: ['il', 'yil', 'arici_sayisi'],
    nums: ['yil', 'arici_sayisi'],
  },
  'kisi-basi-uretim-tuketim': {
    table: 'tr_kisi_basi_uretim_tuketim',
    label: 'Kişi Başı Üretim / Tüketim',
    keys: ['yil'],
    cols: ['yil', 'nufus_kisi', 'toplam_sut_uretimi', 'sut_uretimi_kg_kisi',
      'sut_tuketimi_kg_kisi', 'yumurta_uretimi_adet_kisi', 'yumurta_tuketimi_adet_kisi',
      'tavuk_eti_uretim_kg_kisi', 'tavuk_eti_tuketim_kg_kisi', 'kisi_basina_bal_uretimi_kg_kisi'],
    nums: ['nufus_kisi', 'toplam_sut_uretimi', 'sut_uretimi_kg_kisi', 'sut_tuketimi_kg_kisi',
      'yumurta_uretimi_adet_kisi', 'yumurta_tuketimi_adet_kisi', 'tavuk_eti_uretim_kg_kisi',
      'tavuk_eti_tuketim_kg_kisi', 'kisi_basina_bal_uretimi_kg_kisi'],
  },
  'fiyat-endeks': {
    table: 'tuik_fiyatendex',
    label: 'Fiyat Endeksleri (TÜFE / T-ÜFE / T-GFE / FAO)',
    keys: ['endeks', 'maddekod', 'urun', 'yil'],
    cols: ['alan', 'endeks', 'maddekod', 'urun', 'yil', 'd1', 'd2', 'd3', 'd4', 'bazyil',
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    nums: ['yil', 'd1', 'd2', 'd3', 'd4', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs',
      'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  },
};

const q = (isim) => `"${isim.replace(/"/g, '""')}"`;

/** Dosyadan gelen değeri sütun türüne göre normalize eder. */
function deger(cfg, sutun, ham) {
  if (ham === undefined || ham === null || ham === '') return null;
  if (!cfg.nums.includes(sutun)) return String(ham);
  const n = Number(String(ham).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {{status:number, body:object}}
 */
export async function handleUpload(request, env) {
  if (request.method !== 'POST') {
    return { status: 405, body: { error: 'Yalnızca POST' } };
  }

  const gelenAnahtar = request.headers.get('x-admin-key') ?? '';
  const beklenen = env.ADMIN_KEY ?? '';
  // Secret tanımlı değilse uç tamamen kapalı — varsayılan olarak açık kalmasın.
  if (!beklenen || gelenAnahtar !== beklenen) {
    return { status: 401, body: { error: 'Yetkisiz' } };
  }

  let govde;
  try {
    govde = await request.json();
  } catch {
    return { status: 400, body: { error: 'Geçersiz JSON' } };
  }

  const cfg = UPLOAD_TABLES[govde?.hedef];
  if (!cfg) {
    return { status: 400, body: { error: 'Bilinmeyen hedef', gecerli: Object.keys(UPLOAD_TABLES) } };
  }

  const rows = Array.isArray(govde.rows) ? govde.rows : null;
  if (!rows || rows.length === 0) return { status: 400, body: { error: 'rows boş' } };
  if (rows.length > MAX_ROWS) {
    return { status: 400, body: { error: `İstek başına en fazla ${MAX_ROWS} satır` } };
  }

  // Gönderilen sütunlar beyaz listede mi?
  const gelenSutunlar = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const izinsiz = gelenSutunlar.filter((c) => !cfg.cols.includes(c));
  if (izinsiz.length) {
    return { status: 400, body: { error: 'İzin verilmeyen sütun', sutunlar: izinsiz } };
  }
  const eksikAnahtar = cfg.keys.filter((k) => !gelenSutunlar.includes(k));
  if (eksikAnahtar.length) {
    return { status: 400, body: { error: 'Anahtar sütun eksik', sutunlar: eksikAnahtar } };
  }

  const yazilacak = gelenSutunlar.filter((c) => cfg.cols.includes(c));

  // Hangi satırlar zaten var? Anahtarlarla tek seferde sorulup ayrılıyor.
  const anahtarKosul = cfg.keys.map((k) => `${q(k)} = ?`).join(' AND ');
  const mevcut = new Set();
  const sorgular = rows.map((r) =>
    env.DB.prepare(`SELECT ${cfg.keys.map(q).join(',')} FROM ${q(cfg.table)} WHERE ${anahtarKosul} LIMIT 1`)
      .bind(...cfg.keys.map((k) => deger(cfg, k, r[k]))));
  const bulunanlar = await env.DB.batch(sorgular);
  bulunanlar.forEach((sonuc, i) => {
    if (sonuc.results?.length) mevcut.add(i);
  });

  const ifadeler = [];
  let eklenen = 0;
  let guncellenen = 0;

  rows.forEach((r, i) => {
    const degerler = yazilacak.map((c) => deger(cfg, c, r[c]));
    if (mevcut.has(i)) {
      const setSutun = yazilacak.filter((c) => !cfg.keys.includes(c));
      if (!setSutun.length) return; // yalnızca anahtar gönderilmiş, yazacak bir şey yok
      guncellenen++;
      ifadeler.push(env.DB
        .prepare(`UPDATE ${q(cfg.table)} SET ${setSutun.map((c) => `${q(c)} = ?`).join(', ')} WHERE ${anahtarKosul}`)
        .bind(
          ...setSutun.map((c) => deger(cfg, c, r[c])),
          ...cfg.keys.map((k) => deger(cfg, k, r[k])),
        ));
    } else {
      eklenen++;
      ifadeler.push(env.DB
        .prepare(`INSERT INTO ${q(cfg.table)} (${yazilacak.map(q).join(',')}) VALUES (${yazilacak.map(() => '?').join(',')})`)
        .bind(...degerler));
    }
  });

  if (!ifadeler.length) return { status: 200, body: { eklenen: 0, guncellenen: 0 } };
  await env.DB.batch(ifadeler);
  return { status: 200, body: { tablo: cfg.table, eklenen, guncellenen } };
}
