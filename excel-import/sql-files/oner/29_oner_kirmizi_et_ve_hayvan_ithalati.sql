-- kırmızı et ve hayvan ithalatı verileri
-- Oluşturulma: 2026-02-04 23:34:10

DROP TABLE IF EXISTS `oner_kirmizi_et_ve_hayvan_ithalati`;

CREATE TABLE `oner_kirmizi_et_ve_hayvan_ithalati` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `yil` DATETIME,
  `besilik_kesimlik_kucukbas_sayisi_bas` BIGINT,
  `besilik_kesimlik_kucukbas_tutar` BIGINT,
  `damizlik_kucukbas_bas` BIGINT,
  `damizlik_kucukbas_tutar` BIGINT,
  `besilik_sigir_bas` BIGINT,
  `besilik_sigir_tutar` BIGINT,
  `kasaplik_sigir_bas` BIGINT,
  `kasaplik_sigir_tutar` BIGINT,
  `damizlik_sigir_bas` BIGINT,
  `damizlik_sigir_tutar` BIGINT,
  `karkas_et_ithalati_ton` DOUBLE,
  `karkas_et_ithalati` BIGINT,
  `toplam_ithalata_odenen_dolar` DOUBLE,
  `dolar_kuru` DOUBLE,
  `toplam_ithalata_odenen_tutar_guncel_kur_uzerinden_turk_liras` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23 satır veri ekleniyor...

INSERT INTO `oner_kirmizi_et_ve_hayvan_ithalati` (`yil`, `besilik_kesimlik_kucukbas_sayisi_bas`, `besilik_kesimlik_kucukbas_tutar`, `damizlik_kucukbas_bas`, `damizlik_kucukbas_tutar`, `besilik_sigir_bas`, `besilik_sigir_tutar`, `kasaplik_sigir_bas`, `kasaplik_sigir_tutar`, `damizlik_sigir_bas`, `damizlik_sigir_tutar`, `karkas_et_ithalati_ton`, `karkas_et_ithalati`, `toplam_ithalata_odenen_dolar`, `dolar_kuru`, `toplam_ithalata_odenen_tutar_guncel_kur_uzerinden_turk_liras`) VALUES
  ('2002-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4.1, 8608, 11607816384.0, 43.5271058999999, 505254653014.12195),
  ('2003-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 2128, 3279260, 0.0, 0, NULL, NULL, NULL),
  ('2004-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9.5, 73961, NULL, NULL, NULL),
  ('2005-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 1922, 3854469, 0.0, 0, NULL, NULL, NULL),
  ('2006-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 483, 1165806, 0.0, 0, NULL, NULL, NULL),
  ('2007-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 3854, 6625418, 0.0, 0, NULL, NULL, NULL),
  ('2008-01-01 00:00:00', 0, 0, 0, 0, 0, 0, 0, 0, 5393, 16417761, 0.0, 0, NULL, NULL, NULL),
  ('2009-01-01 00:00:00', 0, 0, 55, 122702, 0, 0, 0, 0, 4010, 13306818, 0.0, 0, NULL, NULL, NULL),
  ('2010-01-01 00:00:00', 234699, 26741817, 275, 178115, 1443, 1861257, 118578, 206349057, 19928, 65544857, 50658.0, 249256831, NULL, NULL, NULL),
  ('2011-01-01 00:00:00', 1446573, 147475001, 1191, 541116, 227871, 252581275, 164360, 303201883, 78565, 292952534, 110731.0, 511868440, NULL, NULL, NULL),
  ('2012-01-01 00:00:00', 394963, 39189986, 10663, 3414792, 228421, 252629159, 194448, 358959795, 48702, 163824429, 25437.0, 95992271, NULL, NULL, NULL),
  ('2013-01-01 00:00:00', 65720, 6650530, 30050, 9036794, 130897, 151262835, 28869, 44364473, 31873, 102182831, 6141.0, 24271868, NULL, NULL, NULL),
  ('2014-01-01 00:00:00', 2496, 233784, 13155, 3511014, 23604, 32763121, 2434, 4073396, 24034, 73496212, 640.0, 5257707, NULL, NULL, NULL),
  ('2015-01-01 00:00:00', 0, 0, 3077, 958541, 154194, 164433862, 0, 0, 48883, 134363597, 17574.0, 104916095, NULL, NULL, NULL),
  ('2016-01-01 00:00:00', 33, 4508, 5266, 971063, 407887, 388382859, 22181, 29879976, 64126, 169120707, 5720.0, 41635649, NULL, NULL, NULL),
  ('2017-01-01 00:00:00', 239210, 32043505, 41459, 5269748, 666949, 723568966, 115316, 181549632, 113545, 254756498, 18879.0, 85281639, NULL, NULL, NULL),
  ('2018-01-01 00:00:00', 239897, 34033700, 185610, 28504822, 1211718, 1234703469, 132904, 231460978, 116169, 226181485, 55752.0, 260107686, NULL, NULL, NULL),
  ('2019-01-01 00:00:00', 0, 0, 83154, 13686193, 664612, 629236285, 6863, 12719999, 17594, 30384934, 5049.0, 26675406, NULL, NULL, NULL),
  ('2020-01-01 00:00:00', 0, 0, 71811, 14038273, 384476, 376030498, 0, 0, 16775, 34676620, 4580.0, 26716942, NULL, NULL, NULL),
  ('2021-01-01 00:00:00', 0, 0, 35384, 9602340, 237825, 232011323, 0, 0, 23863, 53781553, 1205.0, 7210169, NULL, NULL, NULL),
  ('2022-01-01 00:00:00', 180, 19324, 11454, 3617391, 49960, 57430944, 0, 0, 20660, 41557107, 0.4, 3068406, NULL, NULL, NULL),
  ('2023-01-01 00:00:00', 48033, 3900449, 5359, 1484175, 650481, 771793835, 74773, 135395959, 92763, 256177547, 34419.0, 214157331, NULL, NULL, NULL),
  ('2024-01-01 00:00:00', 45673, 4416511, 4083, 1258405, 200313, 284208729, 49675, 94260077, 123141, 326144878, 75036.0, 478451496, NULL, NULL, NULL);
