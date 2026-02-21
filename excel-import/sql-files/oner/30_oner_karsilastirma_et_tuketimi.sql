-- Karşılaştırma Et Tüketimi verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_karsilastirma_et_tuketimi`;

CREATE TABLE `oner_karsilastirma_et_tuketimi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ulke` VARCHAR(500),
  `kanatli_eti` DOUBLE,
  `sigir_eti` DOUBLE,
  `koyun_keci_eti` DOUBLE,
  `domuz_eti` DOUBLE,
  `balik_ve_deniz_urunleri` DOUBLE,
  `diger_etler` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7 satır veri ekleniyor...

INSERT INTO `oner_karsilastirma_et_tuketimi` (`ulke`, `kanatli_eti`, `sigir_eti`, `koyun_keci_eti`, `domuz_eti`, `balik_ve_deniz_urunleri`, `diger_etler`) VALUES
  ('ABD', 57.67, 37.81, 0.7, 29.73, 22.36, 0.92),
  ('AB-27', 22.92, 14.08, 1.36, 40.86, 23.44, 0.94),
  ('Türkiye', 20.05, 18.3, 6.0, 0.0, 7.3, 0.0),
  ('Japonya', 25.47, 9.54, 0.12, 21.94, 45.12, 0.1),
  ('Çin', 17.86, 7.69, 3.81, 33.8, 39.87, 0.48),
  ('Almanya', 17.63, 14.04, 0.71, 43.26, 13.15, 0.95),
  ('Yunanistan', 26.09, 14.51, 7.58, 26.6, 21.67, 2.01);
