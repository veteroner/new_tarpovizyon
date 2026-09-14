-- Dış ticaret endeksleri (2015=100), aylık
--
-- ─── NE ANLATIYOR ───────────────────────────────────────────────────────────
-- Bu tablo "kaç ton, kaç dolar" DEĞİL, "birim fiyat ve hacim nasıl değişti"
-- sorusunu cevaplıyor. `tr_dis_ticaret_hayvansal` / `bitkisel_tr_dis_ticaret`
-- ürün×ülke MİKTAR ve DEĞER tutuyor; bu tablo onların ayıramadığı şeyi
-- ayırıyor: ihracat geliri arttıysa daha çok mu sattık (miktar endeksi) yoksa
-- daha pahalıya mı sattık (birim değer endeksi).
--
-- ─── NEDEN İKİ KOLON AİLESİ ─────────────────────────────────────────────────
-- Önekisiz sütunlar Türkiye TOPLAMI, `gida_` önekliler SITC Rev.4'ün 0. bölümü
-- (Gıda ve canlı hayvanlar). Toplam tek başına bu platformda az şey anlatır;
-- kıyas çizgisi olarak duruyor — "gıdanın birim değeri ülke ortalamasından
-- hızlı mı artıyor" sorusu ancak ikisi birlikteyken sorulabiliyor.
--
-- ─── DIŞ TİCARET HADDİ ──────────────────────────────────────────────────────
-- haddi = ihracat birim değer endeksi / ithalat birim değer endeksi × 100.
-- 100'ün altı, aynı ithalatı karşılamak için daha çok ihracat gerektiğini
-- söyler. TÜİK'in kendi hesapladığı seri yazılıyor — bölme burada yapılmıyor,
-- çünkü TÜİK ağırlıklandırmayı kendi sepetiyle yapıyor ve iki endeksin ham
-- oranı ondan sapıyor.
--
-- Kaynak: TÜİK SDMX, beş ayrı akış (BASE_PER 2015), aylık, 1997-01'den beri.
-- Kodlar ÖLÇÜLEREK doğrulandı: `SITC_REV4_205=_Z` TEK BAŞINA toplam DEĞİL —
-- o kodda dönem başına dört satır var (DTE_SEKTOR_KODLARI 0_1/2_4/5_8/T).
-- Toplam satırı `SITC_REV4_205=_Z AND DTE_SEKTOR_KODLARI=T`.
CREATE TABLE IF NOT EXISTS dis_ticaret_endeks (
  tarih                  TEXT PRIMARY KEY,

  -- Türkiye toplamı
  ihracat_bde            REAL,  -- ihracat birim değer endeksi
  ithalat_bde            REAL,  -- ithalat birim değer endeksi
  ihracat_me             REAL,  -- ihracat miktar endeksi
  ithalat_me             REAL,  -- ithalat miktar endeksi
  dis_ticaret_haddi      REAL,

  -- SITC 0 — Gıda ve canlı hayvanlar
  gida_ihracat_bde       REAL,
  gida_ithalat_bde       REAL,
  gida_ihracat_me        REAL,
  gida_ithalat_me        REAL,
  gida_dis_ticaret_haddi REAL
);
