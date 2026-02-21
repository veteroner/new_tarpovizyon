-- Verimlilik Karşılaştırma verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_verimlilik_karsilastirma`;

CREATE TABLE `oner_verimlilik_karsilastirma` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ulke` VARCHAR(500),
  `karkas_verimi` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11 satır veri ekleniyor...

INSERT INTO `oner_verimlilik_karsilastirma` (`ulke`, `karkas_verimi`) VALUES
  ('ABD', 370.3),
  ('Kanada', 369.9),
  ('Lüksemburg', 366.6),
  ('İsrail', 334.3),
  ('Almanya', 329.2),
  ('Avusturya', 328.8),
  ('Birleşik Krallık', 328.4),
  ('Finlandiya', 325.8),
  ('İrlanda', 325.1),
  ('Güney Kore', 325.1),
  ('Türkiye', 287.0);
