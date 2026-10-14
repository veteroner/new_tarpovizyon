-- tuik_hayavancilik_sutvesuturunleri — tek seferlik onarım (2026-10-14)
--
-- Tablo günlük senkrona bağlanmadan ÖNCE çalıştırılmalı. İki kusur var ve
-- ikisi de senkronun doğru çalışmasını engelliyor.
--
-- ─── 1) YİNELENEN SATIR ─────────────────────────────────────────────────────
-- 2025 "Yağsız Süt Tozu" (urunkod 10) ÜÇ satır: id 32 (TOPLAM 83.036),
-- id 186 (tamamı 0), id 197 (TOPLAM 83.038). Tablonun geri kalanında (kod, yıl)
-- tekil — 197 satır, 195 tekil anahtar; fark tam olarak bu iki satır.
-- Sayfa üçünü de çiziyordu. id 32 kalıyor (en eski, diğer yılların düzeniyle
-- aynı); TOPLAM'ı NULL'a çekiliyor ki senkron 12 ayın toplamını kaynaktan
-- yeniden yazsın — hangi kopyanın toplamı doğruydu sorusu kaynağa soruluyor.
--
-- Silinen satırların yedeği PR açıklamasında ve oturum çıktısında.
DELETE FROM tuik_hayavancilik_sutvesuturunleri
 WHERE id IN (186, 197) AND urunkod = 10 AND yil = 2025;
UPDATE tuik_hayavancilik_sutvesuturunleri SET TOPLAM = NULL
 WHERE id = 32 AND urunkod = 10 AND yil = 2025;

-- ─── 2) 2026 YER TUTUCU SIFIRLAR ────────────────────────────────────────────
-- 2026'da yalnız Ocak dolu; Şubat–Aralık ve TOPLAM NULL değil 0. İki zararı var:
--   · Sayfa "o ay üretim yok" diye 0 çiziyor (mevsimsellik ısı haritası).
--   · Senkronun toplam kuralı yalnız BOŞ toplamı yazıyor; 0 dolu sayıldığı için
--     yıl bittiğinde 2026 toplamı hiç yazılmazdı ve sayfa 2025'te kalırdı.
-- Ulusal süt ürünü üretiminin bir ayda gerçekten 0 olması mümkün değil; 0 burada
-- yalnızca "henüz yayımlanmadı" anlamında. Yalnız 2026'ya dokunuluyor —
-- 2010 krema ve 2017 konsantre süt satırlarındaki sıfırlar TÜİK'in o yıl
-- yayımlamadığı ürünler, tarihî kayıt olarak kalıyor.
UPDATE tuik_hayavancilik_sutvesuturunleri SET
  "Ocak" = NULLIF("Ocak", 0), "Şubat" = NULLIF("Şubat", 0), "Mart" = NULLIF("Mart", 0),
  "Nisan" = NULLIF("Nisan", 0), "Mayıs" = NULLIF("Mayıs", 0), "Haziran" = NULLIF("Haziran", 0),
  "Temmuz" = NULLIF("Temmuz", 0), "Ağustos" = NULLIF("Ağustos", 0), "Eylül" = NULLIF("Eylül", 0),
  "Ekim" = NULLIF("Ekim", 0), "Kasım" = NULLIF("Kasım", 0), "Aralık" = NULLIF("Aralık", 0),
  TOPLAM = NULLIF(TOPLAM, 0)
 WHERE yil = 2026;
