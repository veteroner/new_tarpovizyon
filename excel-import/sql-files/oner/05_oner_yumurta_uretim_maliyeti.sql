-- Yumurta Üretim Maliyeti verileri
-- Oluşturulma: 2026-02-04 23:34:09

DROP TABLE IF EXISTS `oner_yumurta_uretim_maliyeti`;

CREATE TABLE `oner_yumurta_uretim_maliyeti` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `yumurta_maliyet_analizi` VARCHAR(500),
  `column_1` VARCHAR(500),
  `column_2` VARCHAR(500),
  `column_3` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10 satır veri ekleniyor...

INSERT INTO `oner_yumurta_uretim_maliyeti` (`yumurta_maliyet_analizi`, `column_1`, `column_2`, `column_3`) VALUES
  (NULL, 'Oran /Miktar ', 'Birim Fiyat', 'Toplam Tutar'),
  ('Civciv Gideri', '% 6 fire', 45, 47.7),
  ('Yumurtlama dönemi yem miktarı', 66, 18, 1188),
  ('TOPLAM', NULL, NULL, 1235.7),
  ('Bakıcı + Onarım Gideri (%)', 0.03, NULL, 37.071),
  ('Enerji+ yakıt+ su+Altlık Gideri (%)', 0.05, NULL, 61.785000000000004),
  ('Aşı+İlaç+Dez.Gideri (%)', 0.02, NULL, 24.714000000000002),
  ('Diğer Giderler (%)', 0.03, NULL, 37.071),
  ('TOPLAM MALİYET', NULL, NULL, 1396.341),
  ('1 Adet Yumurta Maliyeti (Adet)', 430, NULL, 3.2473046511627905);
