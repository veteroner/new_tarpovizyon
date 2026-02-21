-- Piliç Eti Maliyeti verileri
-- Oluşturulma: 2026-02-04 23:34:09

DROP TABLE IF EXISTS `oner_pilic_eti_maliyeti`;

CREATE TABLE `oner_pilic_eti_maliyeti` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `column_0` VARCHAR(500),
  `column_1` VARCHAR(500),
  `birim_fiyat_miktar` DOUBLE,
  `tl_tutar` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20 satır veri ekleniyor...

INSERT INTO `oner_pilic_eti_maliyeti` (`column_0`, `column_1`, `birim_fiyat_miktar`, `tl_tutar`) VALUES
  ('Civciv Gideri (+%5 Fire) (TL/Adet)', NULL, 32.5, 34.45),
  ('Besleme Maliyeti', 'Yem fiyatı (TL/Kg)', 20.0, 85.8),
  (NULL, 'Yem FCR', 1.65, NULL),
  (NULL, 'Canlı Ağırlık (Kg)', 2.6, NULL),
  ('Toplam', NULL, NULL, 120.25),
  ('Üretim Gid. (İşçilik+Yakıt+Altlık+ilaç+Dez)', NULL, 0.17, 20.442500000000003),
  ('Teknik Hizmet (Aşı Dahil)', NULL, 0.01, 1.2025000000000001),
  ('Canlı Piliç Nakil (%1)', NULL, 0.01, 1.2025000000000001),
  ('Genel Gider', NULL, 0.02, 2.4050000000000002),
  ('Kesimhane İşletme Masrafı (%3)', NULL, 0.03, 3.6075),
  ('Bir Adet Canlı Piliç Kesimhane Maliyeti', NULL, NULL, 149.10999999999996),
  ('Bir Kg Canlı Piliç Kesimhane Maliyeti', NULL, NULL, 57.34999999999998),
  ('Karkas Et Maliyeti (%72 Randıman)', NULL, 0.72, 79.65277777777776),
  ('Piliç Eti Nakli (1 kg et için %2,5)', NULL, 0.025, 1.991319444444444),
  ('TOPLAM MALİYET', NULL, NULL, 81.6440972222222),
  ('Entegre Karı', NULL, 0.2, NULL),
  ('Entegre Şirketin Fiyatı', NULL, NULL, 97.97291666666663),
  ('Bayi Karı ve Dağıtım Giderleri', NULL, 0.1, 107.7702083333333),
  ('Market Karı', NULL, 0.2, 129.32424999999995),
  ('Tüketici Fiyatı(8%KDV)', NULL, 0.08, 139.67018999999993);
