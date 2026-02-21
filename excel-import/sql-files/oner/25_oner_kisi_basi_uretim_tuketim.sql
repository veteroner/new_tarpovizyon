-- Kişi Başı Üretim Tüketim verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_kisi_basi_uretim_tuketim`;

CREATE TABLE `oner_kisi_basi_uretim_tuketim` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `yillar` BIGINT,
  `nufus_kisi` BIGINT,
  `toplam_sut_uretimi` BIGINT,
  `sut_uretimi_kg_kisi` DOUBLE,
  `sut_tuketimi_kg_kisi` DOUBLE,
  `yumurta_uretimi_adet_kisi` DOUBLE,
  `yumurta_tuketimi_adet_kisi` BIGINT,
  `tavuk_eti_uretim_kg_kisi` DOUBLE,
  `tavuk_eti_tuketim_kg_kisi` DOUBLE,
  `kisi_basina_bal_uretimi_kg_kisi` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13 satır veri ekleniyor...

INSERT INTO `oner_kisi_basi_uretim_tuketim` (`yillar`, `nufus_kisi`, `toplam_sut_uretimi`, `sut_uretimi_kg_kisi`, `sut_tuketimi_kg_kisi`, `yumurta_uretimi_adet_kisi`, `yumurta_tuketimi_adet_kisi`, `tavuk_eti_uretim_kg_kisi`, `tavuk_eti_tuketim_kg_kisi`, `kisi_basina_bal_uretimi_kg_kisi`) VALUES
  (2011.0, 74724269.0, 15056211.0, 201.5, 201.4, 173.0, 188.0, 21.59, 18.79, 1.26),
  (2012.0, 75627384.0, 17401262.0, 230.1, 230.0, 197.0, 207.0, 22.795, 18.94, 1.18),
  (2013.0, 76667864.0, 18223712.0, 237.7, 237.6, 215.0, 218.0, 22.935, 18.41, 1.23),
  (2014.0, 77695904.0, 18630859.0, 239.8, 238.0, 221.0, 226.0, 24.385, 19.54, 1.32),
  (2015.0, 78741053.0, 18654682.0, 236.9, 236.9, 212.0, 218.0, 24.247, 20.29, 1.37),
  (2016.0, 79814871.0, 18489161.0, 231.7, 231.8, 227.0, 233.0, 23.54, 20.01, 1.32),
  (2017.0, 80810525.0, 20699894.0, 256.2, 256.1, 239.0, 172.0, 26.44, 21.73, 1.42),
  (2018.0, 82003882.0, 22120716.0, 269.8, 270.0, 240.0, 174.0, 26.3, 20.89, 1.32),
  (2019.0, 83154997.0, 22960379.0, 276.1, 276.1, 239.0, 191.0, 25.71, 20.47, 1.31),
  (2020.0, 83614362.0, 23503790.0, 281.1, 276.0, 238.0, 200.0, 25.69, 20.5, 1.25),
  (2021.0, 84680273.0, 23200306.0, 274.0, 274.0, 228.0, 191.0, 26.5, 20.68, 1.14),
  (2022.0, 85229533.0, 21563492.0, 253.0, 252.8, 232.0, 189.0, 28.37, 21.95, 1.39),
  (2023.0, 85372377.0, 21438542.0, 251.11801677959605, 251.0, 241.74095562549465, 197.0, 27.835303215230844, 21.0, 1.3457397349964848);
