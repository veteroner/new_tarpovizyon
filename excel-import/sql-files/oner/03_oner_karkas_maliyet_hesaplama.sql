-- Karkas Maliyet Hesaplama verileri
-- Oluşturulma: 2026-02-04 23:34:09

DROP TABLE IF EXISTS `oner_karkas_maliyet_hesaplama`;

CREATE TABLE `oner_karkas_maliyet_hesaplama` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hayvan_alim_bedelleri` VARCHAR(500),
  `column_1` VARCHAR(500),
  `column_2` VARCHAR(500),
  `column_3` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24 satır veri ekleniyor...

INSERT INTO `oner_karkas_maliyet_hesaplama` (`hayvan_alim_bedelleri`, `column_1`, `column_2`, `column_3`) VALUES
  ('Yerli Ortalama (TL/Kg)', 450, NULL, NULL),
  ('Güney Amerika (TL/Kg)', 282.9261883499994, NULL, NULL),
  ('Avrupa (TL/Kg)', 257.15930000000003, NULL, NULL),
  ('RASYON', NULL, NULL, NULL),
  ('YEMİN ADI', 'YEM MİKTARI (kg/gün)', 'BİRİM FİYAT (TL/kg)', 'YEM MALİYETİ (TL/gün)'),
  ('KARMA YEM', 2.5, 14.28, 35.699999999999996),
  ('YEMLİK ARPA', 4.9, 11.9, 58.31000000000001),
  ('BUĞDAY KEPEĞİ', 0.5, 11, 5.5),
  ('AYÇİÇEĞİ TOHUMU KÜSPESİ', 0.7, 9.9, 6.93),
  ('MISIR SİLAJI', 3, 4.45, 13.350000000000001),
  ('SAMANI', 1, 6.22, 6.22),
  ('TOPLAM', NULL, NULL, 126.00999999999999),
  ('MALİYETLER', 'Yerli', 'Güney Amerika', 'Avrupa'),
  ('Hayvan alım bedeli', 112500, 84877.85650499981, 77147.79000000001),
  ('Besleme Maliyeti', 37803, 30242.399999999998, 37803),
  ('Diğer Maliyetler', 12024.24, 9209.620520399985, 9196.0632),
  ('Toplam Maliyet', 162327.24, 124329.8770253998, 124146.85320000001),
  ('Besi Başlangıç kg', 250, 300, 300),
  ('Günlük Canlı Ağırlık Artışı', 1.3, 1.35, 1.5),
  ('Besi Süresi (Gün)', 300, 240, 300),
  ('Besi Sonu Ağırlığı', 640, 624, 750),
  ('Karkas Randımanı', 0.55, 0.58, 0.6),
  ('Üretilen Karkas (Kg)', 334.4, 343.82399999999996, 427.5),
  ('Karkas Maliyeti', 485.42834928229667, 361.60907041218707, 290.4019957894737);
