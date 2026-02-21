-- Yeterlilikler verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_yeterlilikler`;

CREATE TABLE `oner_yeterlilikler` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `1_sutun` VARCHAR(500),
  `sut_ton` DOUBLE,
  `kirmizi_et_ton` DOUBLE,
  `beyaz_et_ton` DOUBLE,
  `yumurta_milyon_adet` DOUBLE,
  `bal_ton` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 satır veri ekleniyor...

INSERT INTO `oner_yeterlilikler` (`1_sutun`, `sut_ton`, `kirmizi_et_ton`, `beyaz_et_ton`, `yumurta_milyon_adet`, `bal_ton`) VALUES
  ('Kendine Yeterlilik', 1.17, 0.94, 1.48, 1.4, 1.11);
