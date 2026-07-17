-- TarpoVizyon Basic — D1 schema
-- Mirrors the "TarpoVizyon Hayvansal Üretim" Looker Studio report structure.
-- Source: MySQL `ist` DB (oner_*/o_* curated tables) + tuik_ticaret_hayvansal.

-- 1) KÜRESEL HAYVANCILIK VERİLERİ ------------------------------------------------

CREATE TABLE global_uretim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  urun TEXT NOT NULL,
  uretim_miktari_ton REAL
);
CREATE INDEX idx_global_uretim_urun ON global_uretim(urun);

CREATE TABLE global_hayvan_sayilari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  ari_kovan REAL,
  sigir REAL,
  tavuk REAL,
  ordek REAL,
  kaz REAL,
  keci REAL,
  koyun REAL,
  hindi REAL
);

CREATE TABLE global_hayvan_sayilari_detay (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  hayvan_turu TEXT NOT NULL,
  deger REAL
);
CREATE INDEX idx_global_hayvan_detay_ulke ON global_hayvan_sayilari_detay(ulke);

CREATE TABLE global_karkas_agirligi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  karkas_verimi_kg REAL
);

CREATE TABLE global_et_tuketimi_karsilastirma (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  kanatli_eti REAL,
  sigir_eti REAL,
  koyun_keci_eti REAL,
  domuz_eti REAL,
  balik_deniz_urunleri REAL,
  diger_etler REAL
);

-- 2) GENEL HAYVANCILIK VERİLERİ (Türkiye) ----------------------------------------

CREATE TABLE tr_hayvan_varliklari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  sigir_bas REAL,
  manda_bas REAL,
  buyukbas_toplam_bas REAL,
  koyun_bas REAL,
  keci_bas REAL,
  kucukbas_toplam_bas REAL
);

CREATE TABLE tr_hayvansal_urun_uretimi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  bal_uretimi REAL,
  cig_sut_uretimi REAL,
  kirmizi_et_uretimi REAL,
  yumurta_milyon_adet REAL,
  kanatli_eti_ton REAL
);

CREATE TABLE tr_kisi_basi_uretim_tuketim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  nufus_kisi REAL,
  toplam_sut_uretimi REAL,
  sut_uretimi_kg_kisi REAL,
  sut_tuketimi_kg_kisi REAL,
  yumurta_uretimi_adet_kisi REAL,
  yumurta_tuketimi_adet_kisi REAL,
  tavuk_eti_uretim_kg_kisi REAL,
  tavuk_eti_tuketim_kg_kisi REAL,
  kisi_basina_bal_uretimi_kg_kisi REAL
);

CREATE TABLE tr_kisi_basina_guncel_tuketim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tereyagi_kg REAL,
  yogurt_kg REAL,
  icme_sutu_litre REAL,
  peynir_kg REAL,
  toplam_sut_litre REAL,
  kirmizi_et_kg REAL,
  yumurta_adet REAL,
  pilic_eti_kg REAL,
  bal_kg REAL,
  balik_deniz_urunleri REAL
);

CREATE TABLE tr_verimlilikler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  cig_sut_verimi_lt REAL,
  buyukbas_karkas_et_verimi_kg REAL,
  kucukbas_karkas_et_verimi_kg REAL,
  bal_verimi_kg REAL
);

CREATE TABLE tr_yeterlilikler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sira INTEGER,
  sut_ton REAL,
  kirmizi_et_ton REAL,
  beyaz_et_ton REAL,
  yumurta_milyon_adet REAL,
  bal_ton REAL
);

-- İl (province) bazlı veriler
CREATE TABLE il_hayvan_sayilari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT NOT NULL,
  tarih TEXT,
  sigir_varligi_bas REAL,
  manda_varligi_bas REAL,
  koyun_varligi_bas REAL,
  keci_varligi_bas REAL,
  arici_sayisi REAL,
  bal_uretimi_ton REAL,
  aricilik_yapan_isletme_sayisi REAL,
  yeni_kovan_sayisi REAL,
  eski_kovan_sayisi REAL,
  kovan_varligi REAL,
  balmumu_uretimi_ton REAL,
  bal_verimi_kg REAL,
  bal_cesidi TEXT,
  peynir_cesidi TEXT,
  et_tavugu_sayisi REAL,
  yumurta_tavugu_sayisi REAL,
  toplam_hayvan_varligi REAL
);
CREATE INDEX idx_il_hayvan_sayilari_il ON il_hayvan_sayilari(il);

CREATE TABLE il_bal_cesitleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT NOT NULL,
  balin_cesiti TEXT,
  aricilik_yapan_isletme_sayisi REAL,
  yeni_kovan_sayisi REAL,
  eski_kovan_sayisi REAL,
  toplam_kovan REAL,
  bal_uretimi_ton REAL,
  balmumu_uretimi_ton REAL,
  bal_verimi_kg REAL
);

CREATE TABLE il_arici_sayisi_yillik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT NOT NULL,
  yil INTEGER NOT NULL,
  arici_sayisi REAL
);
CREATE INDEX idx_il_arici_il_yil ON il_arici_sayisi_yillik(il, yil);

-- 3) TÜRKİYE DIŞ TİCARET VERİLERİ -------------------------------------------------

CREATE TABLE tr_dis_ticaret_hayvansal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ay INTEGER,
  ana_urun TEXT,
  alt_urun_kod TEXT,
  alt_urun TEXT,
  ulke_kod TEXT,
  ulke TEXT,
  miktar_birim TEXT,
  ihracat_miktar REAL,
  ithalat_miktar REAL,
  deger_birim TEXT,
  ihracat_deger REAL,
  ithalat_deger REAL
);
CREATE INDEX idx_dis_ticaret_yil ON tr_dis_ticaret_hayvansal(yil);
CREATE INDEX idx_dis_ticaret_urun ON tr_dis_ticaret_hayvansal(ana_urun);
CREATE INDEX idx_dis_ticaret_ulke ON tr_dis_ticaret_hayvansal(ulke);

CREATE TABLE kirmizi_et_hayvan_ithalati (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  kasaplik_kucukbas_bas REAL,
  kasaplik_kucukbas_deger REAL,
  damizlik_kucukbas_bas REAL,
  damizlik_kucukbas_deger REAL,
  besilik_sigir_bas REAL,
  besilik_sigir_deger REAL,
  kasaplik_sigir_bas REAL,
  kasaplik_sigir_deger REAL,
  damizlik_sigir_bas REAL,
  damizlik_sigir_deger REAL,
  karkas_et_ithalati_ton REAL,
  karkas_et_ithalati_deger REAL,
  toplam_odenen_dolar REAL,
  dolar_kuru REAL,
  toplam_odenen_tl REAL
);

CREATE TABLE ihracat_onaylari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  onay_numarasi TEXT,
  firma_unvani TEXT,
  urun_kategorisi TEXT,
  ihracat_ulkesi TEXT,
  onay_durumu TEXT,
  gosterim_degeri REAL
);

-- 4) ÇİĞ SÜT SEKTÖRÜ ---------------------------------------------------------------

CREATE TABLE cig_sut_uretim_miktari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  buyukbas_sut_uretimi_ton REAL,
  sagilan_buyukbas_hayvan_sayisi REAL,
  koyun_sutu_uretimi_ton REAL,
  keci_sutu_uretimi_ton REAL,
  kucukbas_sutu_uretimi_ton REAL,
  sagilan_keci_sayisi REAL,
  sagilan_koyun_sayisi REAL,
  toplam_sut_uretimi_ton REAL
);

CREATE TABLE cig_sut_ekonomik_gostergeler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  misir_silaji REAL,
  yonca REAL,
  saman REAL,
  sut_yemi_19hp REAL,
  uretim_maliyeti_tl_lt REAL,
  usk_tavsiye_fiyat_tl_lt REAL,
  sut_yem_paritesi REAL,
  litre_basina_destek_tl REAL,
  sut_yem_paritesi_destek_dahil REAL,
  fiyat_maliyet_farki_tl_lt REAL,
  fiyat_maliyet_farki_destek_dahil_tl_lt REAL,
  karlilik REAL
);

CREATE TABLE sut_ciftlikleri_onayli (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT,
  ilce TEXT,
  isletme_sayisi REAL,
  adi_ve_adresi TEXT
);

-- 5) KIRMIZI ET SEKTÖRÜ -------------------------------------------------------------

CREATE TABLE kirmizi_et_uretim_miktari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  buyukbas_et_uretimi_ton REAL,
  buyukbas_hayvan_sayisi_bas REAL,
  kucukbas_hayvan_sayisi_bas REAL,
  toplam_hayvan_varligi_bas REAL,
  kesilen_buyukbas_hayvan_sayisi_bas REAL,
  buyukbas_kasaplik_guc_orani REAL,
  buyukbas_karkas_verimi_kg REAL,
  keci_et_uretimi_ton REAL,
  koyun_et_uretimi_ton REAL,
  kucukbas_et_uretimi_ton REAL,
  koyun_kesilen_bas REAL,
  keci_kesilen_bas REAL,
  kesilen_toplam_kucukbas_sayisi_bas REAL,
  kucukbas_kasaplik_guc_orani REAL,
  kucukbas_karkas_verimi_kg REAL,
  toplam_kirmizi_et_uretimi_ton REAL
);

CREATE TABLE kirmizi_et_hayvan_sayilari_yillik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  sigir REAL,
  manda REAL,
  buyukbas_toplam REAL,
  koyun REAL,
  keci REAL,
  kucukbas_toplam REAL,
  toplam REAL
);

CREATE TABLE kirmizi_et_ekonomik_gostergeler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  karkas_paritesi REAL,
  besi_yemi_fiyati_tl_kg REAL,
  dolar_kuru_tl REAL,
  besilik_dana_fiyati_tl_kg REAL,
  dana_karkas_maliyet_tl_kg REAL,
  dana_karkas_fiyati_tl_kg REAL,
  karlilik REAL,
  kuzu_karkas_fiyati_tl_kg REAL,
  besilik_kucukbas_fiyati_tl_kg REAL,
  dana_karkas_fiyat_maliyet_farki_tl_kg REAL
);

-- 6) PİLİÇ ETİ SEKTÖRÜ ---------------------------------------------------------------

CREATE TABLE kanatli_uretimleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  tavuk_yumurtasi_bin_adet REAL,
  tavuk_eti_ton REAL
);

CREATE TABLE kanatli_eti_maliyet_fiyat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  maliyet_tl_kg REAL,
  uretici_fiyati_tl_kg REAL,
  yem_fiyati_tl_kg REAL,
  tuketici_fiyati_tl_kg REAL,
  karlilik REAL,
  fiyat_maliyet_farki_tl_kg REAL,
  yem_paritesi REAL
);

-- 7) SOFRALIK YUMURTA SEKTÖRÜ ---------------------------------------------------------

CREATE TABLE yumurta_maliyet_fiyat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tarih TEXT NOT NULL,
  maliyet_tl_kg REAL,
  uretici_fiyati_tl_kg REAL,
  yem_fiyati_tl_kg REAL,
  tuketici_fiyati_tl REAL,
  karlilik REAL,
  uretici_fiyati_maliyet_farki_tl_kg REAL,
  yem_paritesi REAL,
  kuluckalik_ihracat_miktari_bin_adet REAL,
  kuluckalik_ihracat_dolar REAL,
  sofralik_ihracat_miktari_bin_adet REAL,
  sofralik_ihracat_dolar REAL,
  toplam_ihracat_miktari_bin_adet REAL,
  toplam_ihracat_dolar REAL,
  sofralik_birim_fiyat_dolar REAL,
  kuluckalik_birim_fiyat_dolar REAL
);
