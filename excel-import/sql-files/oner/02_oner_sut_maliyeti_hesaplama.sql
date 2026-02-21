-- Süt Maliyeti Hesaplama verileri
-- Oluşturulma: 2026-02-04 23:34:09

DROP TABLE IF EXISTS `oner_sut_maliyeti_hesaplama`;

CREATE TABLE `oner_sut_maliyeti_hesaplama` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teknik_kabuller` VARCHAR(500),
  `column_1` VARCHAR(500),
  `column_2` VARCHAR(500),
  `column_3` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25 satır veri ekleniyor...

INSERT INTO `oner_sut_maliyeti_hesaplama` (`teknik_kabuller`, `column_1`, `column_2`, `column_3`) VALUES
  ('CANLI AĞIRLIK', 650, NULL, NULL),
  ('SÜT VERİMİ/GÜN/LT', 20, NULL, NULL),
  ('BUZAĞI FİYATI(TL/BAŞ)', 30000, NULL, NULL),
  ('GÜBRE FİYATI(TL/TON)', 0, NULL, NULL),
  ('RASYON', NULL, NULL, NULL),
  ('YEMİN ADI', 'YEM MİKTARI (kg/gün)', 'BİRİM FİYAT (TL/kg)', 'YEM MALİYETİ (TL/gün)'),
  ('KARMA YEM', 9, 15.36, 138.24),
  ('MISIR SİLAJI', 18, 4.45, 80.10000000000001),
  ('YONCA', 4, 14, 56),
  ('SAMAN', 4, 6.22, 24.88),
  ('TOPLAM', NULL, NULL, 299.22),
  ('GİDERLER', NULL, NULL, NULL),
  (NULL, NULL, '% Oran', 'Tutar (TL)'),
  ('1- YEM GİDERİ +%3 FİRE', NULL, 63, 308.19660000000005),
  ('2-DİĞER GİDERLER (İŞÇİLİK,SU,ELEKTRİK,SAĞLIK,SİGORTA,FAİZ VB.)', NULL, 37, 181.0043523809524),
  ('TOPLAM', NULL, 100, 489.20095238095246),
  ('GELİRLER', NULL, NULL, NULL),
  ('GÜNLÜK BUZAĞI GELİRİ (450 günde %90 oranla bir buzağı doğumu)', NULL, NULL, 60),
  ('GÜNLÜK GÜBRE GELİRİ (14 TON*FİYAT/365)', NULL, NULL, 0),
  ('GELİR TOPLAM', NULL, NULL, 60),
  ('MALİYET TABLOSU', NULL, NULL, NULL),
  ('GİDERLER', NULL, NULL, 489.20095238095246),
  ('GELİRLER', NULL, NULL, 60),
  ('20 LT SÜT MALİYETİ', NULL, NULL, 429.20095238095246),
  ('1 LT SÜT MALİYETİ', NULL, NULL, 21.46004761904762);
