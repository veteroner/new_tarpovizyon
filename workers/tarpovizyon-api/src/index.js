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
  /*
   * TÜİK bülteninin GRUP toplamları (bitkisel üretim tahmini). Ürün tablosuna
   * karışmasın diye ayrı; `tahmin=1` satırları GERÇEKLEŞME DEĞİL.
   */
  'bitkisel/bulten-grup': { table: 'bitkisel_bulten_grup', filters: ['dosya', 'grup', 'yil', 'tahmin'], order: 'yil ASC' },
  'makro/fao-urunler-aylik': { table: 'fao_urunler_aylik', filters: [], order: 'yil ASC, ay ASC' },

  'il-duzeyinde/bitkisel-uretim': { table: 'il_bitkisel_uretim', filters: ['il', 'urun', 'urun_grup'], order: 'uretim_ton DESC', maxLimit: 10000 },
  'il-duzeyinde/havza-ilce': { table: 'havza_ilce', filters: ['havza', 'il'], order: 'havza ASC, il ASC, ilce ASC', maxLimit: 1500 },
  'il-duzeyinde/havza-urun-deseni': { table: 'havza_urun_deseni', filters: ['havza', 'il', 'ilce'], order: 'havza ASC, il ASC, ilce ASC', maxLimit: 6000 },
  'il-duzeyinde/cografi-isaret': { table: 'il_cografi_isaret', filters: ['il'], order: 'il ASC, cografi_isaret_adi ASC', maxLimit: 2000 },

  // ─── TarpoVizyon ana modülü: MySQL'den taşınan TÜİK tabloları ──────────────
  // Bunlar `tuik_*` adlarını koruyor; MySQL şemasının birebir kopyası olduğu
  // için sayfa sorguları yeniden yazılırken alan adları değişmiyor.
  'tuik/bitkisel-uretim': { table: 'tuik_bitkisel_uretim', filters: ['duzeykod', 'yerkod', 'yer', 'ili', 'urun', 'urunkod', 'urun_grup', 'ugkod', 'unsur', 'birim', 'duzey'], order: 'urun ASC', maxLimit: 10000 },
  'tuik/urundenge': { table: 'tuik_urundenge', filters: ['urun'], order: 'urun ASC', maxLimit: 2000 },
  /*
   * ENDEKS değil, GERÇEK TL FİYAT. tuik_fiyatendex 2020=100 endeksini
   * tutuyor ("ne kadar arttı"); bu uç maddenin kaç lira olduğunu veriyor.
   */
  'tuik/madde-fiyat': { table: 'tarim_madde_fiyat', filters: ['maddekod', 'urun', 'yil', 'ay'], order: 'yil ASC, ay ASC', maxLimit: 5000 },
  'tuik/fiyatendex': { table: 'tuik_fiyatendex', filters: ['endeks', 'maddekod', 'urun', 'yil', 'alan', 'd1', 'd2', 'd3', 'd4'], order: 'yil ASC', maxLimit: 10000 },
  'tuik/gsyh-a21': { table: 'tuik_gsyh_a21', filters: ['yerkod', 'yer', 'sektorkod', 'sektor', 'yil'], order: 'yil ASC', maxLimit: 10000 },
  'tuik/kisibasigelir': { table: 'tuik_kisibasigelir', filters: ['yil', 'yer', 'yerkod', 'duzey'], order: 'yil ASC', maxLimit: 5000 },
  'tuik/hayvancilik-canlihayvan': { table: 'tuik_hayvancilik_canlihayvan', filters: ['duzeykod', 'yerkod', 'il', 'ilkod', 'hayvankod', 'grup', 'kategori', 'tip'], order: 'id ASC', maxLimit: 10000 },
  'tuik/hayvancilik-hayvansaluretim': { table: 'tuik_hayvancilik_hayvansaluretim', filters: ['duzeykod', 'duzey', 'yerkod', 'yer', 'ilkod', 'il', 'hayvankod', 'hayvan', 'urun', 'tur', 'birim'], order: 'id ASC', maxLimit: 10000 },
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
  /*
   * FAO üretici fiyatları — USD/ton, yıllık. Ülkeler arası karşılaştırma için
   * (LCU değil USD yüklendi). Ürün ve ülke süzgeçli.
   */
  'fao/uretici-fiyat': { db: 'DUNYA', table: 'fao_uretici_fiyat', filters: ['areacode', 'area', 'itemcode', 'item', 'year'], order: 'year ASC', maxLimit: 10000 },
  'fao/nufus': { db: 'DUNYA', table: 'fao_nufus', filters: [], order: 'rowid ASC', maxLimit: 10000 },
  'fao/nufus-istihdam-tarim': { db: 'DUNYA', table: 'fao_nufus_istihdam_tarim', filters: [], order: 'rowid ASC', maxLimit: 10000 },

  // ─── Türkiye "oner_*" / "o_*" tabloları ───────────────────────────────
  // Küçük, önceden özetlenmiş tablolar; sayfalar bunları SELECT * ile okuyor.
  // Sütun adlarında Türkçe karakter ve boşluk olabildiği için ORDER BY
  // ifadeleri çift tırnaklı.
  'oner/hayvansal-urun-uretimi': { table: 'oner_hayvansal_urun_uretimi', filters: ['yillar'], order: '"yillar" ASC' },
  'oner/kirmizi-et-uretim-miktari': { table: 'oner_kirmizi_et_uretim_miktari', filters: ['yil'], order: '"yil" ASC' },
  'oner/kirmizi-et-uretimi': { table: 'oner_kirmizi_et_uretimi', filters: ['yil'], order: '"yil" ASC' },
  'oner/kirmizi-et-ekonomik-gostergeler': { table: 'oner_kirmizi_et_ekonomik_gostergeler', filters: ['tarih'], order: '"tarih" ASC' },
  'oner/cig-sut-ekonomik-gostergeler': { table: 'oner_cig_sut_ekonomik_gostergeler', filters: ['tarih'], order: '"tarih" ASC' },
  'oner/kanatli-eti-maliyeti-fiyati': { table: 'oner_kanatli_eti_maliyeti_fiyati', filters: ['tarih'], order: '"tarih" ASC' },
  'oner/kanatli-uretimleri': { table: 'oner_kanatli_uretimleri', filters: ['tarih'], order: '"tarih" ASC' },
  'oner/yumurta-maliyeti-fiyati': { table: 'oner_yumurta_maliyeti_fiyati', filters: ['tarih'], order: '"tarih" ASC' },
  'oner/sanayiye-giden-sut': { table: 'oner_sanayiye_giden_sut_ve_sut_urunu', filters: ['yil'], order: '"yil" ASC' },
  'oner/verimlilikler': { table: 'oner_verimlilikler', filters: ['yil'], order: '"yil" ASC' },
  'oner/yeterlilikler': { table: 'oner_yeterlilikler', filters: [], order: '"id" ASC' },
  'oner/canli-hayvan-et-ithalati': { table: 'oner_canli_hayvan_ve_et_ithalati', filters: [], order: '"id" ASC' },
  'oner/dunya-hayvansal-uretim': { table: 'oner_dunya_hayvansal_uretim_miktarla', filters: ['ulke', 'urun'], order: '"uretim_miktari_ton" DESC' },
  'oner/dunya-karkas-agirligi': { table: 'oner_dunya_karkas_agirligi_verileri', filters: ['ulke'], order: '"karkas_verimi_kg" DESC' },
  'oner/dunya-karkas-fiyatlari': { table: 'oner_dunya_karkas_fiyatlari', filters: [], order: '"id" ASC' },
  'oner/dunya-sut-fiyatlari': { table: 'oner_dunya_sut_fiyatlari', filters: [], order: '"id" ASC' },
  'oner/karsilastirma-et-tuketimi': { table: 'oner_karsilastirma_et_tuketimi', filters: ['ulke'], order: '"id" ASC' },
  'oner/kisi-basina-tuketimler': { table: 'oner_kisi_basina_guncel_tuketimler', filters: [], order: '"id" ASC' },
  'oner/illerin-hayvan-sayisi': { table: 'oner_i_llerin_hayvan_sayisi', filters: ['il'], order: '"il" ASC' },
  'oner/illerin-bal-cesitleri': { table: 'oner_i_llerin_bal_cesitleri', filters: ['il'], order: '"il" ASC' },
  'oner/illere-gore-arici-sayisi': { table: 'oner_i_llere_gore_arici_sayisi', filters: ['il'], order: '"il" ASC' },
  'oner/dunya-karkas-veri': { table: 'o_dunya_kaarkas_veri', filters: [], order: '"Karkas Verimi (Kg)" DESC' },
  'oner/sut-uretimi-veri': { table: 'o_sur_uretimi_veri', filters: [], order: '"Yıl" ASC' },
  'oner/toplam-uretim-veri': { table: 'o_toplam_uretim_veri', filters: [], order: '"Yıllar" ASC' },
  'tr/havza': { table: 'havza', filters: ['havid', 'ilid', 'ilceid'], order: '"havid" ASC', maxLimit: 10000 },
  'tr/havzalist': { table: 'havzalist', filters: ['havid', 'ilid', 'ilceid'], order: '"havid" ASC', maxLimit: 10000 },
  'tr/havza-ilce': { table: 'havza_ilce', filters: ['havza_kod', 'il_kod', 'ilce_kod'], order: '"havza_kod" ASC', maxLimit: 10000 },
  'tr/havza-urun-deseni': { table: 'havza_urun_deseni', filters: ['havza', 'il', 'ilce', 'urun'], order: '"havza" ASC', maxLimit: 10000 },
  'tr/cografi-isaret': { table: 'TPE_cografiisaret', filters: ['İl', 'Türü', 'Ürün grubu'], order: '"id" ASC', maxLimit: 10000 },
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
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year',
      'miktar_birim', 'uretim_birim', 'verim_birim'],
    nums: ['miktar_deger', 'uretim_deger', 'verim_deger', 'uretim2_deger', 'verim2_deger'] },
  'fao/uretim-bitkisel-islenmis': { db: 'DUNYA', table: 'fao_uretim_bitkisel_islenmis',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year',
      'miktar_birim', 'uretim_birim', 'verim_birim'],
    nums: ['miktar_deger', 'uretim_deger', 'verim_deger', 'uretim2_deger', 'verim2_deger'] },
  'fao/uretim-hayvansal-birincil': { db: 'DUNYA', table: 'fao_uretim_hayvansal_birincil',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year',
      'miktar_birim', 'uretim_birim', 'verim_birim'],
    nums: ['miktar_deger', 'uretim_deger', 'verim_deger', 'uretim2_deger', 'verim2_deger'] },
  'fao/uretim-hayvansal-islenmis': { db: 'DUNYA', table: 'fao_uretim_hayvansal_islenmis',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year',
      'miktar_birim', 'uretim_birim', 'verim_birim'],
    nums: ['miktar_deger', 'uretim_deger', 'verim_deger', 'uretim2_deger', 'verim2_deger'] },
  'fao/uretim-hayvansal-canlihayvan': { db: 'DUNYA', table: 'fao_uretim_hayvansal_canlihayvan',
    dims: ['ulkekod', 'ulkead', 'urunkod', 'urunad', 'year',
      'miktar_birim', 'uretim_birim', 'verim_birim'],
    nums: ['miktar_deger', 'uretim_deger', 'verim_deger', 'uretim2_deger', 'verim2_deger'] },
  // Geniş format: yıllar y2004…y2024 sütunlarında.
  'tuik/bitkisel-uretim': { table: 'tuik_bitkisel_uretim',
    dims: ['duzeykod', 'duzey', 'yerkod', 'yer', 'ili', 'ugkod', 'urun_grup', 'urunkod', 'urun', 'unsur', 'birim'],
    nums: ['y2004', 'y2005', 'y2006', 'y2007', 'y2008', 'y2009', 'y2010', 'y2011', 'y2012', 'y2013', 'y2014', 'y2015', 'y2016', 'y2017', 'y2018', 'y2019', 'y2020', 'y2021', 'y2022', 'y2023', 'y2024'] },
  'tuik/ticaret-bitkisel': { table: 'tuik_ticaret_bitkisel',
    dims: ['yil', 'ay', 'ana_urun', 'alt_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'miktar_birim'],
    nums: ['ihracat_mik', 'ithalat_mik', 'ihracat_deger', 'ithalat_deger'] },
  'tuik/ticaret-hayvansal': { table: 'tuik_ticaret_hayvansal',
    dims: ['yil', 'ay', 'ana_urun', 'alt_urun', 'ulke', 'ulkekod', 'duzey_1', 'duzey_2', 'duzey_3', 'miktar_birim'],
    nums: ['ihracat_mik', 'ithalat_mik', 'ihracat_deger', 'ithalat_deger'] },
  'tuik/gsyh-a21': { table: 'tuik_gsyh_a21',
    dims: ['yerkod', 'yer', 'sektorkod', 'sektor', 'yil'], nums: ['zincir_endeks', 'zincir', 'zincir_degisim', 'cari'] },
  'tuik/kisibasigelir': { table: 'tuik_kisibasigelir', dims: ['yil', 'yer', 'yerkod', 'duzey'], nums: ['USD', 'TR'] },
  // Geniş format: yıllar y2004…y2025 sütunlarında.
  // Geniş format: yıl sütunları çıplak sayı adlarıyla ('2004'…'2025').
  'tuik/hayvancilik-hayvansaluretim': { table: 'tuik_hayvancilik_hayvansaluretim',
    dims: ['duzeykod', 'duzey', 'yerkod', 'yer', 'ilkod', 'il', 'hayvankod', 'hayvan', 'urun', 'tur', 'birim'],
    nums: ['2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'] },
  'tuik/hayvancilik-canlihayvan': { table: 'tuik_hayvancilik_canlihayvan',
    dims: ['duzeykod', 'duzey', 'yerkod', 'yer', 'ilkod', 'il', 'hayvankod', 'grup', 'kategori', 'tip', 'yas', 'durum', 'cinsiyet'],
    nums: ['y2004', 'y2005', 'y2006', 'y2007', 'y2008', 'y2009', 'y2010', 'y2011', 'y2012', 'y2013', 'y2014', 'y2015', 'y2016', 'y2017', 'y2018', 'y2019', 'y2020', 'y2021', 'y2022', 'y2023', 'y2024', 'y2025'] },

  // Kimlik benzeri sayısal alanlar (year, *code) gruplanabilsin diye dims'te;
  // nums yalnızca gerçek ölçüleri içerir.
  'fao/balans': { db: 'DUNYA', table: 'fao_balans',
    dims: ['domain', 'ulke', 'ulkead', 'urun', 'urunad', 'yil'],
    nums: ['nuf_v', 'uretim_v', 'imp_v', 'stok_v', 'exp_v', 'arz_v', 'yem_v', 'tohum_v', 'kayip_v', 'islem_v', 'diger_v', 'turist_v', 'kalinti_v', 'gida_v', 'kbyt_v', 'kbgtcal_v', 'arzkcal_v', 'kbgpro_v', 'arzpro_v', 'kbgyag_v', 'arzyag_v', 'yeterlilik'] },
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
    nums: ['value'], commaDecimal: ['value'] },
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
// ÇİN NOTU: listeler eskiden 'China, mainland' ve 'China, Taiwan Province of'
// dışlıyordu. Ama üretim tablolarında ('fao_uretim_*') düz 'China' satırı YOK —
// yalnızca mainland/Taiwan/Hong Kong/Macao var. Sonuç: dünyanın en büyük
// üreticisi (1,89 milyar ton bitkisel üretim) tüm sıralamalardan siliniyordu.
// land_use / balans / pestisit tablolarında ise HEM 'China' toplamı HEM
// bileşenleri duruyor, yani Çin mükerrer sayılıyordu. Doğrusu bileşenleri
// tutup TOPLAMI dışlamak: 'China' her iki durumda da güvenle çıkarılabiliyor
// (toplamı olan her tabloda mainland de var). 'China, mainland' zaten
// countryTranslations'ta 'Çin' olarak gösteriliyor.
const EXCLUDE_PRESETS = {
  v1: ['World', 'WORLD', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Northern Africa', 'Eastern Africa',
    'Middle Africa', 'Southern Africa', 'Western Africa', 'Northern America', 'Central America', 'Caribbean',
    'South America', 'Central Asia', 'Eastern Asia', 'South-eastern Asia', 'Southern Asia', 'Western Asia',
    'Eastern Europe', 'Northern Europe', 'Southern Europe', 'Western Europe', 'Australia and New Zealand',
    'Melanesia', 'Micronesia', 'Polynesia', 'Least Developed Countries', 'Land Locked Developing Countries',
    'Small Island Developing States', 'Low Income Food Deficit Countries', 'Net Food Importing Developing Countries',
    'European Union (27)', 'Sub-Saharan Africa', 'Latin America and the Caribbean', 'China'],
  v2: ['World', 'WORLD', 'Europe', 'Americas', 'Asia', 'Africa', 'Northern America', 'Southern America',
    'Eastern Europe', 'Western Europe', 'Northern Europe', 'Southern Europe', 'Southern Asia', 'Eastern Asia',
    'South-eastern Asia', 'Central Asia', 'Western Asia', 'Northern Africa', 'Eastern Africa', 'Western Africa',
    'Middle Africa', 'Southern Africa', 'Caribbean', 'Central America', 'South America', 'Oceania',
    'European Union (27)', 'European Union', 'Melanesia', 'Polynesia', 'Micronesia', 'Aggregate',
    'Least Developed Countries', 'Small Island Developing States', 'Low Income Food Deficit Countries',
    'Net Food Importing Developing Countries', 'Land Locked Developing Countries', 'Dünya', 'DÜNYA', 'Dunya',
    'Total', 'TOTAL', 'Toplam', 'TOPLAM', 'Sub-Saharan Africa', 'Latin America and the Caribbean', 'China'],
};

const qi = (n) => `"${n}"`;

// MySQL'in varsayılan collation'ı (utf8_general_ci) büyük/küçük harf DUYARSIZ,
// SQLite ise duyarlı. Kaynak veride aynı etiket iki yazımla bulunabiliyor
// (ör. fao_input_gubre_ticari'de 'İthalat Miktarı' 66.171 satır ve
// 'İthalat miktarı' 3.126 satır — 2023 verisinin tamamı küçük harfli).
// Eski sorgular ikisini de yakalıyordu; aynı davranışı korumak için metin
// karşılaştırmalarına COLLATE NOCASE ekleniyor. Sayısal değerlerde eklenmiyor,
// çünkü orada karşılaştırmayı metne çevirip sonucu bozardı.
const isNumericValue = (v) => v !== '' && Number.isFinite(Number(v));

// Bazı tablolarda sayılar METİN ve ondalık ayırıcı VİRGÜL ('2173,8' gibi;
// fao_livestock_primary bütünüyle böyle). Düz CAST(... AS REAL) virgülde
// kesip ondalığı kaybediyor — eski SQL'deki REPLACE(value,',','.')*1'in
// karşılığı olarak bu sütunlarda önce nokta'ya çeviriyoruz.
const numExpr = (cfg, col) =>
  (cfg.commaDecimal || []).includes(col)
    ? `CAST(REPLACE(${qi(col)}, ',', '.') AS REAL)`
    : `CAST(${qi(col)} AS REAL)`;
const coll = (v) => (isNumericValue(v) ? '' : ' COLLATE NOCASE');

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
  // Metin sütunları için MAX — MySQL'de MAX(miktar_birim) gibi kullanımların
  // karşılığı. Sayısal max CAST uyguladığı için metinde çalışmıyordu.
  const textMaxs = pick('maxText', cfg.dims);
  const distincts = pick('countDistinct', [...cfg.dims, ...cfg.nums]);

  const cols = [];
  for (const c of new Set([...groupBy, ...select])) cols.push(`${qi(c)} AS ${qi(c)}`);
  // MySQL'deki CAST(x AS DECIMAL(20,2)) yerine SQLite'ta REAL.
  for (const c of sums) cols.push(`SUM(${numExpr(cfg, c)}) AS ${qi('sum_' + c)}`);
  for (const c of avgs) cols.push(`AVG(${numExpr(cfg, c)}) AS ${qi('avg_' + c)}`);
  for (const c of mins) cols.push(`MIN(${numExpr(cfg, c)}) AS ${qi('min_' + c)}`);
  for (const c of maxs) cols.push(`MAX(${numExpr(cfg, c)}) AS ${qi('max_' + c)}`);
  for (const c of textMaxs) cols.push(`MAX(${qi(c)}) AS ${qi('maxt_' + c)}`);
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
    // in_<sütun>=a|b|c — '|' ayırıcı, çünkü değerlerin içinde virgül olabiliyor
    // ("Buğday, Durum Buğdayı Hariç" gibi). Değerlerin tamamı bind edilir.
    // like_<sütun>=%desen% — eski sorgulardaki LIKE koşullarının karşılığı.
    // likeAny_<sütun>=p1|p2 — birden çok LIKE deseni OR'lanır. Eski sorgulardaki
    // "urunad LIKE '%Meat%' OR urunad LIKE '%offal%' OR …" zincirlerinin
    // karşılığı. COLLATE NOCASE olduğu için büyük/küçük varyantlar gereksiz.
    if (k.startsWith('likeAny_')) {
      const col = k.slice(8);
      if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
      const list = v.split('|').map((x) => x.trim()).filter(Boolean);
      if (!list.length) continue;
      where.push(`(${list.map(() => `${qi(col)} LIKE ? COLLATE NOCASE`).join(' OR ')})`);
      params.push(...list);
      continue;
    }
    // notLikeAll_<sütun>=p1|p2 — hepsi AND'lenen NOT LIKE. Eski sorgulardaki
    // "urunad NOT LIKE '%Meat%' AND urunad NOT LIKE '%Milk%' AND …" karşılığı.
    if (k.startsWith('notLikeAll_')) {
      const col = k.slice(11);
      if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
      const list = v.split('|').map((x) => x.trim()).filter(Boolean);
      if (!list.length) continue;
      where.push(`(${list.map(() => `${qi(col)} NOT LIKE ? COLLATE NOCASE`).join(' AND ')})`);
      params.push(...list);
      continue;
    }
    if (k.startsWith('like_')) {
      const col = k.slice(5);
      if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
      where.push(`${qi(col)} LIKE ? COLLATE NOCASE`); params.push(v);
      continue;
    }
    if (k.startsWith('in_')) {
      const col = k.slice(3);
      if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
      const list = v.split('|').map((x) => x.trim()).filter(Boolean);
      if (!list.length) continue;
      // Liste tamamen sayısalsa NOCASE gereksiz; değilse MySQL davranışı için eklenir.
      const nocase = list.every(isNumericValue) ? '' : ' COLLATE NOCASE';
      where.push(`${qi(col)}${nocase} IN (${list.map(() => '?').join(',')})`);
      params.push(...list);
      continue;
    }
    const prefix = Object.keys(OPS).find((p) => k.startsWith(p));
    if (!prefix) continue;
    const col = k.slice(prefix.length);
    if (!allCols.includes(col)) throw new Error(`izin verilmeyen filtre: ${col}`);
    // Sayısal sütunlar TEXT olarak saklanıyor; düz karşılaştırma metin
    // sıralaması yapar ('9' > '1000'). Onları CAST üzerinden karşılaştır.
    if (cfg.nums.includes(col)) {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`sayısal filtre değeri geçersiz: ${col}=${v}`);
      where.push(`${numExpr(cfg, col)} ${OPS[prefix]} ?`); params.push(n);
      continue;
    }
    where.push(`${qi(col)}${coll(v)} ${OPS[prefix]} ?`); params.push(v);
  }
  // positive=<sütun>: MySQL sorgularındaki "CAST(x) > 0" koşulunun karşılığı.
  for (const c of pick('positive', cfg.nums)) where.push(`${numExpr(cfg, c)} > 0`);
  // exclude=<preset>:<sütun> — kıta/toplam satırlarını dışla.
  const ex = sp.get('exclude');
  if (ex) {
    const [preset, col] = ex.split(':');
    const list = EXCLUDE_PRESETS[preset];
    if (!list) throw new Error(`bilinmeyen exclude preset: ${preset}`);
    if (!cfg.dims.includes(col)) throw new Error(`izin verilmeyen exclude sütunu: ${col}`);
    where.push(`${qi(col)} COLLATE NOCASE NOT IN (${list.map(() => '?').join(',')})`);
    params.push(...list);
  }

  // orderBy, üretilen takma adlar (sum_x, cd_y…) veya boyut sütunları arasından.
  const aliases = [...groupBy, ...select, ...sums.map((c) => 'sum_' + c), ...avgs.map((c) => 'avg_' + c),
    ...mins.map((c) => 'min_' + c), ...maxs.map((c) => 'max_' + c),
    ...textMaxs.map((c) => 'maxt_' + c), ...distincts.map((c) => 'cd_' + c), 'cnt'];
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
  const sql = `SELECT yil, SUM(deger) deger, COUNT(DISTINCT urun) urun_sayisi
                 FROM bitkisel_tr_uretim_detay
               WHERE unsur = ? AND urun IN (${placeholders}) GROUP BY yil ORDER BY yil ASC`;
  const { results } = await env.DB.prepare(sql).bind(unsur, ...urunler).all();
  return results;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/*
 * YAZMA ucu için ayrı ve DAR CORS.
 *
 * Okuma herkese açık olabilir (kamuya açık istatistik), ama yazma ucunu
 * `Access-Control-Allow-Origin: *` ile açık bırakmak, herhangi bir sitenin
 * ziyaretçinin tarayıcısı üzerinden bu uca istek denemesine izin verir.
 * Anahtarı olmadan başaramaz ama gereksiz bir yüzey; yalnızca panelin
 * çalıştığı adresler kabul ediliyor.
 */
const YAZMA_ORIGIN = new Set([
  // Uygulamanın yayın adresi. `pro.` de listede kalıyor: Pro sayfalarına
  // oradan giriliyor ve iki adres AYNI Netlify sitesini, yani aynı yapıyı
  // sunuyor — birini düşürmek yönetim ekranını diğerinde de bozardı.
  'https://panel.tarpovizyon.com',
  'https://pro.tarpovizyon.com',
  'https://tarpovizyon.com',
  'http://localhost:5177',
  'http://localhost:5173',
]);

function yazmaCors(request) {
  const origin = request.headers.get('Origin') ?? '';
  if (!YAZMA_ORIGIN.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, x-admin-otp',
    'Vary': 'Origin',
  };
}

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

import { handleCatalog, handleSchema, handleRows } from './upload.js';
import { TABLO_SAYFALARI } from './tabloSayfalari.js';
import { handleAi } from './ai.js';
import { handleSayfaBul } from './sayfaBul.js';
import { damgaHaritasi, slugTablosu, damgaSec } from './damga.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

    /*
     * ── AI ucu ────────────────────────────────────────────────────────────
     * Aşağıdaki genel OPTIONS/ROUTES işleyişinden ÖNCE: kendi CORS'u
     * (POST'a izin veren) ve kendi yöntem denetimi var. Genel `CORS_HEADERS`
     * yalnızca GET'e izin verdiği için buraya düşerse tarayıcı ön kontrolü
     * (preflight) başarısız olur.
     */
    if (slug === 'ai') return handleAi(request, env);
    // Arama kutusu ve AI cevabı için sayfa bulucu — aynı CORS gerekçesi.
    if (slug === 'sayfa-bul') return handleSayfaBul(request, env);

    // ── Yönetim uçları ──────────────────────────────────────────────────
    // Yazma ucu dar CORS ile korunuyor; okuma/şema uçları katalog bilgisi
    // verdiği için normal CORS'ta kalabilir (veri değil, sütun adı).
    if (slug === 'admin/rows') {
      const cors = yazmaCors(request);
      if (!cors) return new Response(null, { status: 403 });
      if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
      const { status, body } = await handleRows(request, env, ROUTES);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
      });
    }
    if (slug === 'admin/catalog') {
      return json(await handleCatalog(env, ROUTES, TABLO_SAYFALARI));
    }
    if (slug.startsWith('admin/schema/')) {
      const { status, body } = await handleSchema(env, ROUTES, slug.slice('admin/schema/'.length));
      return json(body, status);
    }

    /*
     * ─── BURADAN SONRASI OKUMA: ÖNBELLEK + HIZ SINIRI ─────────────────────
     *
     * Okuma uçlarında ne önbellek ne hız sınırı vardı; her istek doğrudan
     * D1'e gidiyordu. Tek istekte 10.000 satıra kadar dönebildiği için
     * günlük satır okuma kotası birkaç yüz kaba istekle tükenebilirdi —
     * "bizi patlatmasınlar" endişesinin gerçek yeri burasıydı, ana sayfa
     * değil. Ana sayfa Worker'ı korumaz: adres doğrudan çağrılabilir.
     *
     * ÖNBELLEK ÖNCE, SINIR SONRA: önbellekten dönen yanıt D1'e hiç
     * dokunmuyor ve bize maliyeti yok; onu sınırlamak, sıradan kullanıcıyı
     * bedeli olmayan bir şey için cezalandırmak olurdu.
     */
    if (request.method === 'GET') {
      const onbellek = caches.default;

      /*
       * Anahtara tablonun DAMGASI giriyor. Damga, o tabloya en son ne zaman
       * yazıldığını söylüyor; yazma anında değiştiği için tablonun bütün eski
       * önbellek anahtarları — kaç farklı parametre kombinasyonu olursa olsun —
       * tek hamlede erişilemez oluyor. Tek tek silmek mümkün değildi: bir tablo
       * onlarca farklı URL'yle önbellekte duruyor ve günlük senkron D1'e HTTP
       * API'den yazıp Worker'a hiç uğramıyor.
       *
       * Ayrı hostname değil, aynı URL'ye eklenen parametre: `caches.default`
       * özel hostname'li anahtarlarda güvenilir değil. `__v` sorguya sızmıyor —
       * yanıt her zaman özgün `url`den üretiliyor, ayrıca `buildAgg` tanımadığı
       * parametreleri atlıyor ve ROUTES yolu yalnızca adı geçen filtreleri
       * okuyor.
       */
      const harita = await damgaHaritasi(env, ctx, url.origin);
      const damga = damgaSec(harita, slugTablosu(slug, { ROUTES, AGG, TRADE_TABLES }));
      const anahtarUrl = new URL(request.url);
      anahtarUrl.searchParams.set('__v', String(damga));
      const anahtar = new Request(anahtarUrl.toString(), request);

      const hazir = await onbellek.match(anahtar);
      if (hazir) return istemciyeGore(hazir);

      if (await okumaSiniriAsildi(request, env)) {
        return json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, 429);
      }

      const yanit = await okumaCevabi(request, env, url, slug);
      /*
       * Yalnızca BAŞARILI yanıt saklanıyor. Hatayı önbelleğe almak, geçici
       * bir D1 arızasını saatlerce kalıcı hâle getirirdi.
       */
      if (yanit.ok) {
        // Gövde zaten JSON.stringify ile bellekte; iki kopya çıkarmak için
        // tamponlamak akış klonlamasından hem basit hem güvenli.
        const govde = await yanit.arrayBuffer();
        const baslik = new Headers(yanit.headers);

        const saklanacak = new Response(govde, { status: yanit.status, headers: new Headers(baslik) });
        saklanacak.headers.set('Cache-Control', `public, max-age=${ONBELLEK_SN}`);
        ctx?.waitUntil?.(onbellek.put(anahtar, saklanacak));

        return istemciyeGore(new Response(govde, { status: yanit.status, headers: baslik }));
      }
      return yanit;
    }

    return okumaCevabi(request, env, url, slug);
  },
};

/**
 * Yanıtın KENAR önbelleğinde kalma süresi.
 *
 * Veri günde en fazla bir kez tazeleniyor (senkron işleri günlük), yani
 * bir saatlik önbellek hiçbir tazeliği kaçırmıyor ama aynı sorgunun
 * tekrarını D1'e hiç indirmiyor. Anahtar damgalı olduğu için bu sürenin uzun
 * olması artık bayatlık üretmiyor: yazma anında anahtarın kendisi değişiyor.
 */
const ONBELLEK_SN = 3600;

/**
 * Yanıtın TARAYICI önbelleğinde kalma süresi — kenardan AYRI ve çok daha kısa.
 *
 * Eskiden saklanan ve döndürülen yanıt aynı nesneydi, yani tarayıcı da
 * `max-age=3600` alıyordu. Sonuç: kenar önbelleği kusursuz tazelense bile,
 * sayfayı son bir saat içinde açmış bir ziyaretçi kendi tarayıcısından eski
 * veriyi görmeye devam ediyordu — damga bunu tek başına çözmez. Frontend
 * Worker'ı doğrudan çağırıyor (arada Netlify yok), yani bu başlık gerçekten
 * son kullanıcının tarayıcısına gidiyor.
 *
 * Kısa tutmanın bedeli fazladan D1 okuması DEĞİL: yenilenen istek kenar
 * önbelleğinden karşılanıyor, yalnızca bir Worker isteği kadar maliyeti var.
 */
const ISTEMCI_SN = 60;

/** Kenar için saklanan yanıtı istemciye gidecek hâle çevirir (kısa TTL). */
function istemciyeGore(yanit) {
  const doner = new Response(yanit.body, yanit);
  doner.headers.set('Cache-Control', `public, max-age=${ISTEMCI_SN}`);
  return doner;
}

/**
 * Okuma uçları için hız sınırı — AI'dan AYRI ve daha yüksek eşikli.
 *
 * AI çağrısı para demek, okuma çağrısı D1 satırı demek; ikisi aynı sayacı
 * paylaşsaydı sayfa gezen sıradan kullanıcı asistanın hakkını yerdi.
 * Binding tanımlı değilse istek engellenmiyor: eksik bir koruma yüzünden
 * çalışan bir uygulamayı kapatmak daha kötü olurdu.
 */
async function okumaSiniriAsildi(request, env) {
  if (!env.OKUMA_LIMIT) return false;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'bilinmeyen';
  const { success } = await env.OKUMA_LIMIT.limit({ key: `okuma:${ip}` });
  return !success;
}

/** Okuma uçlarının asıl işi; önbellek ve sınır bunun etrafında. */
async function okumaCevabi(request, env, url, slug) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

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
  }
