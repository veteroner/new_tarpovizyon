-- Dünya Karkas Fiyatları verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_dunya_karkas_fiyatlari`;

CREATE TABLE `oner_dunya_karkas_fiyatlari` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ingiltere` DOUBLE,
  `abd` DOUBLE,
  `ab_27` DOUBLE,
  `yeni_zelanda` DOUBLE,
  `avustralya` DOUBLE,
  `arjantin` DOUBLE,
  `uruguay` DOUBLE,
  `brezilya` DOUBLE,
  `turkiye` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 satır veri ekleniyor...

INSERT INTO `oner_dunya_karkas_fiyatlari` (`ingiltere`, `abd`, `ab_27`, `yeni_zelanda`, `avustralya`, `arjantin`, `uruguay`, `brezilya`, `turkiye`) VALUES
  (7.88, 6.35, 6.12, 4.19, 3.69, 4.51, 4.09, 3.04, 11.270057120236366);
