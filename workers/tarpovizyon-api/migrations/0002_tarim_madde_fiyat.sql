-- Tarım Ürünleri ÜFE Madde Fiyatları (TL)
--
-- tuik_fiyatendex ENDEKS tutuyor (2020=100); bu tablo aynı maddelerin
-- GERÇEK TL fiyatını tutuyor. Endeks "ne kadar arttı"yı, bu tablo "kaç lira"yı
-- söylüyor — ikisi farklı soruların cevabı.
--
-- Kaynak: TÜİK SDMX DF_TARIM_URUNLERI_UFE_MADDE_FIYAT_V2, aylık, 2024-01'den
-- itibaren. Birim maddeye göre sabit (101 maddenin 93'ü TL/kg).
CREATE TABLE IF NOT EXISTS tarim_madde_fiyat (
  maddekod TEXT NOT NULL,
  urun     TEXT NOT NULL,
  birim    TEXT NOT NULL,
  yil      INTEGER NOT NULL,
  ay       INTEGER NOT NULL,
  fiyat    REAL,
  PRIMARY KEY (maddekod, yil, ay)
);

CREATE INDEX IF NOT EXISTS idx_tarim_madde_fiyat_donem
  ON tarim_madde_fiyat (yil, ay);
