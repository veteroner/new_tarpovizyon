-- Maliyet modeli girdileri
--
-- ─── NEDEN ──────────────────────────────────────────────────────────────────
-- Çiğ süt ve dana karkas üretim maliyeti artık giriş ekranında ELLE yazılmıyor,
-- girdilerden HESAPLANIYOR (src/pages/admin/maliyetModeli.ts — kullanıcının
-- Google Sheet'indeki "Süt Maliyeti Hesaplama" ve "Karkas Maliyet Hesaplama"
-- sayfalarının birebir kopyası).
--
-- Modelin girdilerinin bir kısmının bu tablolarda sütunu yoktu; yalnız Sheet'te
-- duruyorlardı. Saklanmadan bir sonraki aya TAŞINAMAZLAR — giriş ekranı
-- girilmeyen fiyatı önceki aydan alıyor.
--
-- Kırmızı ette mısır silajı ve saman, çiğ süt tablosunda da var. Burada ayrıca
-- tutulması bilerek: her satır kendi girdileriyle yeniden hesaplanabilsin,
-- başka bir tablonun aynı ayına bakmak gerekmesin.
--
-- Eski satırlarda bu sütunlar NULL kalıyor (geçmiş değerleri bilinmiyor); model
-- onlarda null döner ve kârlılık kayıtlı maliyetle hesaplanmaya devam eder.

ALTER TABLE cig_sut_ekonomik_gostergeler ADD COLUMN buzagi_fiyati_tl_bas REAL;
ALTER TABLE cig_sut_ekonomik_gostergeler ADD COLUMN gubre_fiyati_tl_ton REAL;

ALTER TABLE kirmizi_et_ekonomik_gostergeler ADD COLUMN yemlik_arpa_tl_kg REAL;
ALTER TABLE kirmizi_et_ekonomik_gostergeler ADD COLUMN bugday_kepegi_tl_kg REAL;
ALTER TABLE kirmizi_et_ekonomik_gostergeler ADD COLUMN aycicegi_kuspesi_tl_kg REAL;
ALTER TABLE kirmizi_et_ekonomik_gostergeler ADD COLUMN misir_silaji_tl_kg REAL;
ALTER TABLE kirmizi_et_ekonomik_gostergeler ADD COLUMN saman_tl_kg REAL;

-- Eylül 2026: model girdileri. Arpa/kepek/küspe/buzağı/gübre Sheet'in
-- "Veri Giriş Ekranı"ndan (değişmedi); silaj ve saman kullanıcının verdiği
-- Eylül fiyatları. Bu değerlerle model, D1'deki Eylül maliyetini birebir üretiyor.
UPDATE cig_sut_ekonomik_gostergeler
   SET buzagi_fiyati_tl_bas = 38000, gubre_fiyati_tl_ton = 0
 WHERE tarih = '2026-09-01 00:00:00';

UPDATE kirmizi_et_ekonomik_gostergeler
   SET yemlik_arpa_tl_kg = 11.9, bugday_kepegi_tl_kg = 11, aycicegi_kuspesi_tl_kg = 9.9,
       misir_silaji_tl_kg = 5, saman_tl_kg = 4.54
 WHERE tarih = '2026-09-01 00:00:00';

INSERT INTO veri_damga (tablo, damga) VALUES ('cig_sut_ekonomik_gostergeler', strftime('%s','now')*1000)
  ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga;
INSERT INTO veri_damga (tablo, damga) VALUES ('kirmizi_et_ekonomik_gostergeler', strftime('%s','now')*1000)
  ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga;
