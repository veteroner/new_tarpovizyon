-- TarpoVizyon Basic — Bitkisel (crop/plant production) module schema.

CREATE TABLE bitkisel_global_uretim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ulke TEXT NOT NULL,
  urun TEXT NOT NULL,
  yil INTEGER NOT NULL,
  ekilen_alan_ha REAL,
  uretim_ton REAL,
  verim_kg_ha REAL
);
CREATE INDEX idx_bitkisel_global_urun ON bitkisel_global_uretim(urun);
CREATE INDEX idx_bitkisel_global_yil ON bitkisel_global_uretim(yil);

-- Long format: one row per (ürün, unsur, yıl). "unsur" is one of
-- Ekilen Alan / Hasat Edilen Alan / Üretim / Verim (source: TÜİK, duzey='ülke').
CREATE TABLE bitkisel_tr_uretim_detay (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urun TEXT NOT NULL,
  unsur TEXT NOT NULL,
  yil INTEGER NOT NULL,
  deger REAL
);
CREATE INDEX idx_bitkisel_tr_urun ON bitkisel_tr_uretim_detay(urun);

CREATE TABLE bitkisel_tr_dis_ticaret (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  yil INTEGER NOT NULL,
  ay INTEGER,
  ana_urun TEXT,
  ulke_kod TEXT,
  ulke TEXT,
  miktar_birim TEXT,
  ihracat_miktar REAL,
  ithalat_miktar REAL,
  deger_birim TEXT,
  ihracat_deger REAL,
  ithalat_deger REAL
);
CREATE INDEX idx_bitkisel_ticaret_yil ON bitkisel_tr_dis_ticaret(yil);
CREATE INDEX idx_bitkisel_ticaret_urun ON bitkisel_tr_dis_ticaret(ana_urun);
CREATE INDEX idx_bitkisel_ticaret_ulke ON bitkisel_tr_dis_ticaret(ulke);
