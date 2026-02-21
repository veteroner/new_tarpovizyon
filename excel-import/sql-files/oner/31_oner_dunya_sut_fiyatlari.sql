-- Dünya Süt Fiyatları verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_dunya_sut_fiyatlari`;

CREATE TABLE `oner_dunya_sut_fiyatlari` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `abd_class_3` DOUBLE,
  `ab_27` DOUBLE,
  `yeni_zelanda` DOUBLE,
  `almanya` DOUBLE,
  `italya` DOUBLE,
  `turkiye` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 satır veri ekleniyor...

INSERT INTO `oner_dunya_sut_fiyatlari` (`abd_class_3`, `ab_27`, `yeni_zelanda`, `almanya`, `italya`, `turkiye`) VALUES
  (0.491, 0.5354, 0.413, 0.546, 0.5496, 0.37050099987742136);
