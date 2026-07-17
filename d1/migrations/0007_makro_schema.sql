-- TarpoVizyon Basic — Makro Veriler (GDP, trade share, price indices) module schema.

CREATE TABLE makro_veriler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  istihdam_pay REAL,
  gsyh_pay REAL,
  ihracat_pay REAL
);

CREATE TABLE makro_tarim_gsyh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  toplam_gsyh_milyar_usd REAL,
  tarim_gsyh_milyar_usd REAL
);
CREATE INDEX idx_makro_gsyh_yil ON makro_tarim_gsyh(yil);

CREATE TABLE makro_tarim_disticaret (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ihracat_milyar_usd REAL,
  ithalat_milyar_usd REAL
);
CREATE INDEX idx_makro_disticaret_yil ON makro_tarim_disticaret(yil);

-- Tarım Üretici Fiyat Endeksi (Tarım-ÜFE), yıllık değişim oranı (%), aylık zaman serisi.
CREATE TABLE ufe_aylik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ay INTEGER NOT NULL,
  tarim_ufe REAL
);
CREATE INDEX idx_ufe_aylik_yil ON ufe_aylik(yil, ay);

-- Tarım-ÜFE alt gruplarına göre en güncel dönem anlık görüntüsü (7 ana kategori).
CREATE TABLE ufe_alt_grup_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tur TEXT NOT NULL,
  endeks REAL,
  aylik_degisim REAL,
  aralik_gore_degisim REAL,
  yillik_degisim REAL,
  oniki_aylik_ort_degisim REAL
);

-- Tarım-ÜFE daha ayrıntılı ürün grubu anlık görüntüsü (13 alt grup).
CREATE TABLE ufe_detay_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alt_grup TEXT NOT NULL,
  yillik_degisim REAL
);

-- Tarımsal Girdi Fiyat Endeksi (GFE) alt gruplarına göre aylık zaman serisi (yıllık değişim %).
-- Uzun format: (alt_grup, yil, ay, yillik_degisim). "Tarımsal Girdi Fiyat Endeksi" satırı genel endeksi temsil eder.
CREATE TABLE gfe_alt_grup_aylik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alt_grup TEXT NOT NULL,
  yil INTEGER NOT NULL,
  ay INTEGER NOT NULL,
  yillik_degisim REAL
);
CREATE INDEX idx_gfe_alt_grup ON gfe_alt_grup_aylik(alt_grup);
CREATE INDEX idx_gfe_aylik_yil ON gfe_alt_grup_aylik(yil, ay);

-- TÜFE (Tüketici Fiyat Endeksi) genel + gıda alt grubu, yıllık değişim oranı (%), aylık zaman serisi.
CREATE TABLE tufe_aylik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ay INTEGER NOT NULL,
  tufe REAL,
  gida_alkolsuz REAL
);
CREATE INDEX idx_tufe_aylik_yil ON tufe_aylik(yil, ay);

CREATE TABLE tufe_yillik_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  harcama_grubu TEXT NOT NULL,
  yillik_degisim REAL
);

CREATE TABLE tufe_aylik_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  harcama_grubu TEXT NOT NULL,
  aylik_degisim REAL
);

-- FAO Gıda ve Emtia Endeksleri, ham endeks seviyesi (2014-2016=100 baz), aylık zaman serisi (1990'dan itibaren).
CREATE TABLE fao_urunler_aylik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ay INTEGER NOT NULL,
  gida REAL,
  et REAL,
  sut REAL,
  hububat REAL,
  bitkisel_yag REAL,
  seker REAL
);
CREATE INDEX idx_fao_urunler_yil ON fao_urunler_aylik(yil, ay);
