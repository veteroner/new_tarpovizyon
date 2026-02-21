# 🔴 ACMASIZ ANALİZ: Veri Görselleştirme Sitesi → Tarım Intelligence Tool

## Mevcut Durum: ACMASIZ DEĞERLENDİRME

### 🔴 KRİTİK BUGLAR (Sayfalar ÇALIŞMIYOR)

#### 1. Fiyat Endeksi Sayfası — %100 BOZUK
- **Sorun:** "Veriler yükleniyor..." sonsuz döngüde
- **Kök Neden:** `excel_tufe`, `excel_ufe`, `excel_gfe`, `excel_fao_gida_endeksi` tabloları **veritabanında YOK**
- **Kod:** PriceIndexPage.tsx bu tabloları sorguluyor → hata → loading state asla false olmuyor
- **Veritabanında OLAN:** `tuik_fiyatendex` (8,769 satır - TÜFE, T-ÜFE, T-GFE, FAO), `fao_endex_TFE` (15,896), `fao_endex_UFE` (353,869)
- **Etki:** TÜFE/ÜFE/GFE endeks verileri hiç görüntülenemiyor

#### 2. Dış Ticaret Sayfası — BİTKİSEL VERİ %0
- **Sorun:** Toplam İhracat $0, Toplam İthalat $0, grafikler boş
- **Kök Neden:** `tuik_ticaret_bitkisel` sadece 3,867 satır ve sadece `duzey_1='ülke'` verileri var
  - Tabloda `duzey_1='tüm'` satırları **YOK**
  - Tabloda `duzey_3='yil'` satırları **YOK**
  - Tüm sorgular `WHERE duzey_1='tüm' AND duzey_3='yil'` filtreliyor → 0 sonuç
- **Hayvansal tablo:** 136,218 satır, tüm düzeyler mevcut — doğru çalışıyor
- **Etki:** Bitkisel ticaret verisi ($0), toplam KPI'lar yanlış

---

### 🟡 MİMARİ ZAYIFLIKLAR

| # | Sorun | Sonuç |
|---|-------|-------|
| 1 | **Frontend'den RAW SQL gönderiliyor** | SQL injection riski, API key client-side'da açık |
| 2 | **Tablo yapısı tutarsız** | Bitkisel vs hayvansal farklı duzey yapıları |
| 3 | **Hata yönetimi yok** | API hatası → sonsuz loading (catch bloğu setLoading(false) çağırmıyor) |
| 4 | **Cache yok** | Her sayfa her seferinde 8-12 SQL sorgusu atıyor |
| 5 | **Aynı kodu tekrar tekrar yazma** | MONTHS_TR, TreemapContent, query building her dosyada ayrı |
| 6 | **Hardcoded yıllar** | `yearForMonthly='2024'` gibi hardcoded değerler |
| 7 | **PriceIndexPage var olmayan tabloları sorguluyor** | 4/5 dataset modu çalışmıyor |

---

### 🟠 "VERİ GÖRSELLEŞTİRME SİTESİ" SEVİYESİ — Neyi Yapıp Neyi Yapmıyor

#### ✅ Şu An Yapabildiği:
- Hayvansal ticaret verilerini bar/treemap/area chart ile gösterir
- Yıl bazlı filtreleme
- Top ürün/ülke sıralaması
- YoY büyüme hesaplama (basit)
- En hızlı büyüyen ürün tespiti (tek metrik)

#### ❌ "Intelligence" Olmak İçin Eksikler:
1. **Anomali tespiti yok** — Anormal fiyat/miktar değişimleri algılanmıyor
2. **Korelasyon analizi yok** — Üretim ↔ fiyat ↔ ithalat ilişkisi kurulmuyor
3. **Tahmin/projeksiyon yok** — Trend nereye gidiyor? Bilinmiyor
4. **Ürün dengesi yok** — `tuik_urundenge` tablosu (arz=kullanım, yeterlilik derecesi, kişi başı tüketim) hiç kullanılmıyor
5. **GSYH-tarım ilişkisi yok** — `tuik_gsyh_a21` tablosu (tarımsal GSYH) hiç kullanılmıyor
6. **Fiyat-üretim çapraz analizi yok** — Endeks verileri üretim verileriyle ilişkilendirilmiyor
7. **Ülke risk profili yok** — Bağımlılık oranları hesaplanmıyor
8. **Alert/uyarı sistemi yok** — Eşik değerleri aşılınca bildirim yok
9. **Karşılaştırmalı benchmarking yok** — Türkiye vs dünya ortalaması
10. **Yapay zeka tabanlı insight yok** — Otomatik analiz ve sonuç çıkarma

---

## VERİTABANI ENVANTERİ — KULLANILMAYAN HAZİNE

### 🔴 KRİTİK: Hiç Kullanılmayan Tablolar
| Tablo | Satır | İçerik | Potansiyel |
|-------|-------|--------|------------|
| `tuik_fiyatendex` | 8,769 | TÜFE/ÜFE/GFE aylık endeks | Fiyat sayfası bundan beslenMELİ |
| `tuik_urundenge` | 1,406 | Arz-talep dengesi, 76 ürün (üretim, ithalat, ihracat, tüketim, yeterlilik) | GİDA GÜVENLİĞİ ANALİZİ |
| `tuik_gsyh_a21` | 22,550 | Sektörel GSYH (tarım, sanayi, hizmet) | Makroekonomik dashboard |
| `tuik_kisibasigelir` | 2,900 | İl bazlı kişi başı gelir | Satın alma gücü analizi |
| `tuik_hayvansal2uretim` | 443 | Hayvansal ikincil üretim | Süt → peynir, et → sucuk |
| `fao_endex_TFE` | 15,896 | FAO tüketici fiyat endeksi | Küresel fiyat karşılaştırma |
| `fao_endex_UFE` | 353,869 | FAO üretici fiyat endeksi | Küresel üretici fiyat analizi |

### 🟢 Kullanılan ama Yetersiz Kullanılan Tablolar
| Tablo | Satır | Mevcut Kullanım | Eksik Kullanım |
|-------|-------|----------------|----------------|
| `tuik_ticaret_hayvansal` | 136,218 | Toplam/ülke bazlı | Mevsimsellik, ülke bağımlılığı, birim fiyat trendi yok |
| `tuik_ticaret_bitkisel` | 3,867 | BOZUK (duzey_1='tüm' yok) | Ülke verisinden aggregate yapılmalı |
| `tuik_bitkisel_uretim` | 275,099 | Hasat tahmini sayfasında | Üretim-ticaret korelasyonu yok |
| `fao_uretim_son` | 1,439,392 | Dünya üretim sayfalarında | Türkiye vs dünya rankingleri eksik |
| `tuik_hayvancilik_canlihayvan` | 71,610 | İl bazlı sayfa | Trend analizi, yoğunluk haritası eksik |

---

## IMPLEMENTATION PLANI

### FAZA 1: KRİTİK BUG FİX (Öncelik: ACİL)
> Çalışmayan sayfaları düzelt

#### 1.1 PriceIndexPage.tsx → `tuik_fiyatendex` tablosuna bağla
- [ ] `excel_tufe/ufe/gfe` referanslarını kaldır
- [ ] `tuik_fiyatendex` tablosundan TÜFE/T-ÜFE/T-GFE/FAO verilerini çek
- [ ] Aylık kolonlar (Ocak-Aralık) → aylık grafik
- [ ] Yıl bazlı filtreleme
- [ ] Ürün bazlı filtreleme (maddekod hiyerarşisi: d1-d2-d3-d4)
- [ ] `fao_endex_TFE` ve `fao_endex_UFE` ile dünya karşılaştırma
- [ ] Error boundary + loading state düzeltmesi

#### 1.2 TradePage bitkisel veri düzeltmesi
- [ ] `tuik_ticaret_bitkisel` için ülke verisinden aggregate sorgusu yaz
  - Mevcut: sadece `duzey_1='ülke'` verisi var
  - Çözüm: `SUM(ihracat_deger)` ile ülke verisinden toplam hesapla
- [ ] `duzey_1='tüm'` yerine agregation sorgusu kullan
- [ ] TradeOverviewTab, PlantTradeTab güncelle
- [ ] Tüm child component'larda tutarlı hale getir

### FAZA 2: INTELLIGENCE KATMANI (Yeni Özellikler)

#### 2.1 Ürün Dengesi Dashboard (YENİ SAYFA: `/tarpovizyon/turkey/product-balance`)
> `tuik_urundenge` tablosu — 76 ürün, arz-talep dengesi
- [ ] **Gıda Güvenliği Skoru**: Yeterlilik derecesi → renk kodlu harita
- [ ] **Arz-Talep Akış Diagramı**: Üretim → (İhracat + Tüketim + Kayıp + Stok)
- [ ] **Kişi Başı Tüketim Trendi**: Yıllık değişim analizi
- [ ] **İthalata Bağımlılık Oranı**: İthalat / (Üretim + İthalat) × 100
- [ ] **Tarımsal Verimlilik**: Üretim / Ekilen Alan trend
- [ ] **Ürün Karşılaştırma**: Multi-select ile 3-5 ürün aynı grafikte
- [ ] **Alarm Sistemi**: Yeterlilik < %100, bağımlılık > %30 ikaz

#### 2.2 Fiyat Intelligence (PriceIndexPage upgrade)
> `tuik_fiyatendex` + `fao_endex_TFE/UFE` tabloları
- [ ] **Enflasyon Heatmap**: Ürün grubu × Ay enflasyon haritası
- [ ] **Gıda vs Genel TÜFE**: Gıda sepeti endeksi vs genel endeks karşılaştırma
- [ ] **ÜFE → TÜFE Etkisi**: Üretici fiyatının tüketiciye yansıma süresi
- [ ] **Anomali Tespiti**: Standart sapmadan 2σ kaçan aylar otomatik işaretle
- [ ] **Fiyat Makası**: GFE vs TÜFE arasındaki fark (çiftçi kar marjı göstergesi)
- [ ] **CAGR Hesaplaması**: 5 yıllık bileşik büyüme oranı
- [ ] **Dünya Karşılaştırma**: FAO endeksi ile Türkiye konumu

#### 2.3 Ticaret Intelligence (Trade upgrade)
> `tuik_ticaret_bitkisel/hayvansal` tabloları
- [ ] **Mevsimsellik Analizi**: Hangi ürün hangi ayda peak yapıyor?
- [ ] **Ülke Bağımlılık Riski**: Top 3 ülke payı > %60 ise "yüksek risk"
- [ ] **HHI (Herfindahl–Hirschman) Endeksi**: Pazar yoğunlaşma skoru
- [ ] **Birim Fiyat Trendi**: $/ton değişimi yıllar bazında
- [ ] **Ticaret Dengesizi Ürünler**: İthalat > İhracat × 3 olan ürünler
- [ ] **Alternatif Pazar Önerisi**: "X ürünü için Y ülkesi potansiyel"
- [ ] **Sezonsal Fırsat Takvimi**: En iyi ihracat ayları ürün bazında

#### 2.4 Makroekonomik Dashboard (YENİ veya Mevcut upgrade)
> `tuik_gsyh_a21` + `tuik_kisibasigelir` tabloları
- [ ] **Tarım GSYH Payı Trendi**: 2000-2024 tarımın ekonomideki ağırlığı
- [ ] **Sektörel Karşılaştırma**: Tarım vs Sanayi vs Hizmet
- [ ] **İl Bazlı Refah**: Kişi başı gelir haritası + tarımsal gösterge korelasyonu
- [ ] **Zincir Endeks Analizi**: Reel büyüme vs nominal büyüme

### FAZA 3: ÇAPRAZ ANALİZ (Cross-Intelligence)

#### 3.1 Üretim ↔ Fiyat ↔ Ticaret Bağlantısı
- [ ] X ürünü üretimi düştüğünde → ithalatı artıyor mu? Fiyat yükseliyor mu?
- [ ] Scatter plot: Üretim miktarı vs TÜFE endeksi
- [ ] Otomatik insight: "Buğday üretimi %15 düştü → ithalat %23 arttı → TÜFE gıda %8 yükseldi"

#### 3.2 Gıda Güvenliği Radar
- [ ] 5 boyutlu radar chart:
  1. Üretim yeterliliği (tuik_urundenge.yeterlilik_derecesi)
  2. İthalat bağımlılığı
  3. Fiyat stabilitesi (TÜFE volatilite)
  4. Ticaret dengesi
  5. Verimlilik trendi
- [ ] Ürün bazlı kıyaslama (buğday vs mısır vs ayçiçeği)

#### 3.3 Zaman Serisi Anomali Paneli
- [ ] Tüm metriklerde Z-score bazlı anomali algılama
- [ ] "Son 3 ayda normalde dışı 12 metrik bulundu" gibi dashboard bildirimi
- [ ] Kendi kendine yorumlayan insight kutuları

---

## TEKNİK DÜZELTMELER (Refactoring)

### R1. Ortak Yardımcılar
```
src/utils/tradeUtils.ts     — MONTHS_TR, TreemapContent, aggregation helpers
src/utils/priceUtils.ts     — endeks hesaplama, CAGR, anomali hesaplama
src/utils/intelligenceUtils.ts — HHI, risk skoru, korelasyon hesaplama
```

### R2. Error Handling
- Her `loadData` fonksiyonunda `finally { setLoading(false) }` garantisi
- API hata durumlarında kullanıcıya açıklayıcı mesaj
- Tablo bulunamazsa fallback gösterimi

### R3. Query Optimization
- Bitkisel tablo için aggregation query'sini client yerine tek SQL'de yap
- Sık kullanılan sorguları React Query ile cache'le
- `useCallback` dependency array'lerini düzelt (infinite loop riski)

---

## ÖNCELİK SIRASI

| Aşama | İş | Süre | Risk |
|-------|-----|------|------|
| **F1.1** | PriceIndexPage bug fix (tuik_fiyatendex'e bağla) | 1 saat | Düşük |
| **F1.2** | Trade bitkisel veri fix (aggregation sorgusu) | 30 dk | Düşük |
| **F2.1** | Ürün Dengesi Dashboard (tuik_urundenge) | 2 saat | Orta |
| **F2.2** | Fiyat Intelligence (anomali, heatmap, makas) | 2 saat | Orta |
| **F2.3** | Ticaret Intelligence (mevsimsellik, HHI, risk) | 2 saat | Orta |
| **F2.4** | Makroekonomik Dashboard (GSYH, kişi başı gelir) | 1.5 saat | Düşük |
| **F3.1** | Çapraz analiz (üretim↔fiyat↔ticaret) | 2 saat | Yüksek |
| **F3.2** | Gıda Güvenliği Radar | 1.5 saat | Orta |
| **R1-R3** | Refactoring + Error handling | 1 saat | Düşük |

---

## SONUÇ

**Mevcut Seviye:** 📊 Veri Görselleştirme (%30)
- Bar chart, pie chart, treemap gösteriyor
- 2/3 ana sayfa BOZUK
- Veritabanının %40'ı kullanılmıyor

**Hedef Seviye:** 🧠 Tarım Intelligence Tool (%100)
- Anomali tespiti, korelasyon, projeksiyon
- Gıda güvenliği risk analizi
- Otomatik insight üretimi
- Çapraz veri analizi
- Uyarı/alarm sistemi

**Fark:** 70 puanlık bir sıçrama gerekiyor. Önce bug fix, sonra intelligence katmanı.
