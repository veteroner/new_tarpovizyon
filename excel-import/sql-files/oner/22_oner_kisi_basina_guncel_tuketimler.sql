-- Kişi Başına Güncel Tüketimler verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_kisi_basina_guncel_tuketimler`;

CREATE TABLE `oner_kisi_basina_guncel_tuketimler` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tereyagi_kg` DOUBLE,
  `yogurt_kg` DOUBLE,
  `icme_sutu_tuketimi_litre` BIGINT,
  `peynir_tuketimi_kg` DOUBLE,
  `toplam_sut_tuketimi_litre` BIGINT,
  `kirmizi_et_tuketimi_kg` DOUBLE,
  `yumurta_tuketimi_adet` BIGINT,
  `pilic_eti_kg` BIGINT,
  `bal_tuketimi_kg` DOUBLE,
  `balik_ve_deniz_urunleri` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 satır veri ekleniyor...

INSERT INTO `oner_kisi_basina_guncel_tuketimler` (`tereyagi_kg`, `yogurt_kg`, `icme_sutu_tuketimi_litre`, `peynir_tuketimi_kg`, `toplam_sut_tuketimi_litre`, `kirmizi_et_tuketimi_kg`, `yumurta_tuketimi_adet`, `pilic_eti_kg`, `bal_tuketimi_kg`, `balik_ve_deniz_urunleri`) VALUES
  (1.8, 30.6, 36.0, 18.4, 251.0, 24.3, 200.0, 21.0, 1.3457397349964848, 7.2);
