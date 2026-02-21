-- Veri Giriş Ekranı verileri
-- Oluşturulma: 2026-02-04 23:34:09

DROP TABLE IF EXISTS `oner_veri_giris_ekrani`;

CREATE TABLE `oner_veri_giris_ekrani` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `girdi_adi` VARCHAR(500),
  `fiyati` DOUBLE,
  `column_2` TEXT,
  `column_3` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29 satır veri ekleniyor...

INSERT INTO `oner_veri_giris_ekrani` (`girdi_adi`, `fiyati`, `column_2`, `column_3`) VALUES
  ('Süt Yemi (19 HP)', 15.36, NULL, NULL),
  ('Besi Yemi', 14.28, NULL, NULL),
  ('Mısır Silajı', 4.45, NULL, NULL),
  ('Yonca', 14.0, NULL, NULL),
  ('Saman', 6.22, NULL, NULL),
  ('YEMLİK ARPA', 11.9, NULL, NULL),
  ('BUĞDAY KEPEĞİ', 11.0, NULL, NULL),
  ('AYÇİÇEĞİ TOHUMU KÜSPESİ', 9.9, NULL, NULL),
  ('Pancar Posası', 3.5, NULL, NULL),
  ('Kuzu Besi Yemi', 15.0, NULL, NULL),
  ('Etlik Piliç Yemi', 20.0, NULL, NULL),
  ('Yumurtacı Tavuk Yemi', 18.0, NULL, NULL),
  ('Yerli Besi Materyali', 450.0, NULL, NULL),
  ('Güney Amerika Besi Materyali (Kg/$)', 6.5, NULL, NULL),
  ('Avrupa Menşei Besi Materyali (Kg/Euro)', 5.0, NULL, NULL),
  ('Dolar Kuru', 43.5271058999999, NULL, NULL),
  ('Euro Kuru', 51.43186, NULL, NULL),
  ('Buzağı Fiyatı (TL/Baş)', 30000.0, NULL, NULL),
  ('Gübre Fiyatı', 0.0, NULL, NULL),
  ('Başmakçı toptan yumurta fiyatı', 4.0, NULL, NULL),
  ('Piliç Eti Entegre Kesim Fiyatı ', 46.0, NULL, NULL),
  ('Yumurtacı civciv', 45.0, NULL, NULL),
  ('Etçi civciv', 32.5, NULL, NULL),
  ('Ukon Sığır Karkas Kesim Fiyatı', 579.64, NULL, NULL),
  ('Ukon Kuzu Karkas Kesim Fiyatı', 566.87, NULL, NULL),
  ('Süt Tozu Fiyatı', NULL, NULL, NULL),
  ('Yumurta market fiyatı', 5.65, NULL, NULL),
  ('Bütün Piliç Fiyatı', 107.9, NULL, NULL),
  (NULL, NULL, NULL, 5.733333333333333);
