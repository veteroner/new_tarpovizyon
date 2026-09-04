-- Önbellek damgaları — tablo başına "en son ne zaman yazıldı".
--
-- ─── NEDEN ──────────────────────────────────────────────────────────────────
-- Okuma uçları `caches.default`te 1 saat tutuluyordu ama hiçbir yazma yolu bu
-- önbelleği temizlemiyordu: D1'e yeni veri yazıldıktan sonra site bir saate
-- kadar eski veriyi göstermeye devam ediyordu. 2026-08-30'da somut olarak
-- yaşandı — Mart–Ağustos 2026 sektör verileri yazıldı, `?_=<zaman>` ile taze
-- yanıt geliyordu ama önbelleksiz URL 98 satırlık eski yanıtta kaldı.
--
-- ─── NEDEN SİLME DEĞİL DAMGA ────────────────────────────────────────────────
-- `caches.default.delete(request)` tek bir URL'yi siler, bir tabloyu değil.
-- tuik_bitkisel_uretim gibi bir tablo onlarca farklı parametre kombinasyonuyla
-- önbellekte duruyor; hepsini sayıp silmek mümkün değil. Üstelik günlük TÜİK
-- senkronu D1'e HTTP API'den yazıyor, Worker'a hiç uğramıyor — oradan silmek
-- zaten imkânsızdı.
--
-- Bunun yerine damga önbellek ANAHTARINA giriyor (`__v=<damga>`): tek bir
-- yazma, o tablonun bütün eski anahtarlarını bir kerede erişilemez kılıyor.
-- Eski girdiler silinmiyor, sadece bir daha aranmıyor; kendi TTL'leriyle
-- düşüyorlar.
--
-- ─── HER İKİ VERİTABANINDA DA VAR ───────────────────────────────────────────
-- Aynı şema hem `tarpovizyon-basic` hem `tarpovizyon-dunya` üzerinde kuruluyor.
-- Her veritabanı kendi damgasını tutuyor; aksi hâlde DUNYA'ya yazan FAO
-- senkronunun ikinci bir veritabanı kimliği taşıması gerekirdi. Worker ikisini
-- birden okuyup tek haritada birleştiriyor (tablo adları zaten çakışmıyor).
CREATE TABLE IF NOT EXISTS veri_damga (
  tablo TEXT PRIMARY KEY,
  damga INTEGER NOT NULL
);
