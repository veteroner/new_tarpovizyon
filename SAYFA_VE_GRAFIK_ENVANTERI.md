# TarpoVizyon — Sayfa ve Görselleştirme Envanteri

**Hazırlanma Tarihi:** 16 Nisan 2026  
**Proje:** TarpoVizyon — Tarımsal Veri Analiz Platformu  
**Stack:** React + TypeScript + Recharts + TailwindCSS

---

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam sayfa | 61 |
| Ana sayfa | 55 |
| Ticaret alt sekmesi | 6 |
| Grafik kütüphanesi | Recharts |
| Harita bileşeni | TurkeyHeatMap, MapContainer |

---

## Grafik Türleri (Genel)

| Bileşen | Açıklama |
|---------|----------|
| `BarChart` | Dikey / yatay çubuk grafik |
| `LineChart` | Çizgi grafik (zaman serisi) |
| `AreaChart` | Dolu alan grafiği |
| `PieChart` | Pasta / daire grafik |
| `ComposedChart` | Çubuk + çizgi kombinasyonu |
| `ScatterChart` | Saçılım / bubble grafik |
| `RadarChart` | Radar / örümcek ağ grafik |
| `Treemap` | Hiyerarşik alan dağılımı |
| `Sankey` | Akış / dönüşüm diyagramı |
| `TurkeyHeatMap` | Türkiye il ısı haritası |
| `KPICard` | Anahtar performans kartı |
| `InsightCard` | Otomatik içgörü kartı |
| `DataTable` | Veri tablosu |
| `ProductSelector` | Ürün seçim bileşeni |

---

## Sayfa Envanteri

---

### 1. HomePage — Ana Sayfa
**Rota:** `/`
- Navigasyon kartları (kategori gridı)
- Grafik yok, tablo yok

---

### 2. SelectionPage — Seçim Sayfası
**Rota:** `/selection`
- Program ve modül seçim kartları
- Grafik yok, tablo yok

---

### 3. ProgramSelectionPage — Program Seçim
**Rota:** `/programs`
- Kullanıcı program seçimi
- Kart grid, navigasyon

---

### 4. OverviewPage — Genel Bakış
**Rota:** `/tarpovizyon/world/overview` veya `/tarpovizyon/turkey/overview`
#### Grafikler
- BarChart (yatay) — Ülke karşılaştırması
- AreaChart — Yıllık trend (zaman serisi)
- PieChart — Kategori dağılımları
- ComposedChart — Çubuk + çizgi kombinasyonu
- LineChart — Trend analizi
#### Tablolar
- DataTable — İl / ülke sıralaması
#### Diğer
- KPICard (10+) — Temel metrikler
- TurkeyHeatMap — İl bazında dağılım
- InsightCard — Otomatik içgörüler

---

### 5. ProductionPage — Dünya Bitkisel Üretim
**Rota:** `/tarpovizyon/world/production`  
**Sekmeler:** Genel Bakış · Birincil · İşlenmiş · Verim · Rekabet · Tahminler
#### Grafikler
- BarChart — Top ülkeler
- PieChart — Ürün kategorileri
- AreaChart — Yıllık trend
- LineChart — Trend gösterimi
- ScatterChart — Korelasyon analizi
- ComposedChart — Kombinasyon görünümü
- Treemap — Hiyerarşik dağılım
- RadarChart — Çok boyutlu karşılaştırma
#### Tablolar
- DataTable — Ürün / ülke sıralaması
#### Diğer
- KPICard — CAGR, HHI, Volatilite, Tahminler
- InsightCard — Anomali ve trendler
- ProductSelector (15+ ürün)

---

### 6. VegetableProductionPage — Sebze Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/vegetables`  
*(TuikPlantCategoryPage delegasyonu — varsayılan: Domates, Biber, Hıyar)*
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Yıllık trend
#### Tablolar
- DataTable — İl istatistikleri
#### Diğer
- TurkeyHeatMap — İl dağılımı
- KPICard — Toplam üretim, yıllık değişim

---

### 7. FruitProductionPage — Meyve Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/fruits`  
*(TuikPlantCategoryPage delegasyonu — 50+ meyve türü)*
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Yıllık trend
#### Tablolar
- DataTable — İl istatistikleri
#### Diğer
- TurkeyHeatMap — İl dağılımı
- KPICard — Toplam üretim, ağaç sayısı

---

### 8. CerealProductionPage — Tahıl Üretimi
**Rota:** `/tarpovizyon/cereals`  
**Ürünler:** Buğday, arpa, mısır, pirinç, çavdar, yulaf
#### Grafikler
- BarChart — Top ülkeler (dikey + yatay)
- PieChart — Ülke payları
- AreaChart — Yıllık üretim trendi
- LineChart — Verim trendi
- ScatterChart — Üretim-verim korelasyonu
- ComposedChart — Kombinasyon
- Treemap — Ülke hiyerarşisi
- RadarChart — Ülke profili
#### Tablolar
- DataTable — Ürün / ülke sıralaması
#### Diğer
- KPICard — CAGR, HHI, volatilite
- InsightCard — Anomali tespiti
- ProductSelector

---

### 9. OilseedProductionPage — Yağlı Tohum Üretimi
**Rota:** `/tarpovizyon/oilseeds`  
**Ürünler:** Ayçiçeği, soja, kanola, yer fıstığı, susam
#### Grafikler
- BarChart — Top ülkeler
- PieChart — Ürün dağılımı
- AreaChart — Yıllık trend
- LineChart — Verim değişimi
- ScatterChart — Korelasyon
- ComposedChart — Kombinasyon
- Treemap — Hiyerarşi
- RadarChart — Profil
#### Tablolar
- DataTable — Sıralama tablosu
#### Diğer
- KPICard, InsightCard, ProductSelector

---

### 10. LegumeProductionPage — Baklagil Üretimi
**Rota:** `/tarpovizyon/legumes`  
**Ürünler:** Nohut, mercimek, fasulye, bezelye
#### Grafikler
- BarChart — Top ülkeler
- PieChart — Ülke payları
- AreaChart — Yıllık üretim
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 11. NutProductionPage — Sert Kabuklu Meyveler
**Rota:** `/tarpovizyon/nuts`  
**Ürünler:** Fındık, badem, antep fıstığı, ceviz, kaju
#### Grafikler
- AreaChart — Yıllık üretim trendi
- BarChart — Ülke karşılaştırması
- PieChart — Ülke payları
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 12. FruitProductionPage — Meyve Üretimi (Dünya)
*(Bkz. #7 — Dünya versiyonu benzer yapı)*

---

### 13. BeverageCropPage — İçecek Bitkileri
**Rota:** `/tarpovizyon/beverage-crops`  
**Ürünler:** Kahve, çay, kakao, şarap üzümü
#### Grafikler
- BarChart — Üretim karşılaştırması
- AreaChart — Yıllık trend
- PieChart — Ülke dağılımı
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 14. FiberCropPage — Lif Bitkileri
**Rota:** `/tarpovizyon/fiber-crops`  
**Ürünler:** Pamuk, keten, kenevir, jüt
#### Grafikler
- BarChart — Üretim karşılaştırması
- AreaChart — Trend analizi
- PieChart — Ülke payları
#### Tablolar
- DataTable

---

### 15. SugarCropProductionPage — Şeker Bitkileri
**Rota:** `/tarpovizyon/sugar-crops`  
**Ürünler:** Şeker kamışı, şeker pancarı
#### Grafikler
- AreaChart — Yıllık üretim
- BarChart — Top ülkeler
- Treemap — Ülke hiyerarşisi
#### Tablolar
- DataTable

---

### 16. EggProductionPage — Yumurta Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/eggs`
#### Grafikler
- BarChart (yatay) — Ürün türleri
- PieChart — Ülke dağılımı
- Treemap — Ülke hiyerarşisi
- RadarChart — Ülke profili
- ComposedChart — Top 10 ülkeler (çubuk + çizgi)
- AreaChart — Yıllık trend
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 17. MilkProductionPage — Süt Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/milk`  
**Ürünler:** İnek, manda, keçi, koyun, deve sütü
#### Grafikler
- BarChart — Top ülkeler
- PieChart — Hayvan türü dağılımı
- Treemap — Ülke hiyerarşisi
- RadarChart — Ülke profili
- ComposedChart — Kombinasyon
- AreaChart — Yıllık trend
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 18. RedMeatProductionPage — Kırmızı Et Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/red-meat`  
**Ürünler:** Sığır, domuz, koyun, keçi eti
#### Grafikler
- BarChart — Üretim sıralaması
- PieChart — Ülke payları
- Treemap — Hiyerarşi
- ComposedChart — Top 10
- RadarChart — Ülke profili
- AreaChart — Yıllık trend
#### Tablolar
- DataTable

---

### 19. WhiteMeatProductionPage — Beyaz Et Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/white-meat`  
**Ürünler:** Tavuk, ördek, kaz, hindi
#### Grafikler
- BarChart — Ürün dağılımı
- PieChart — Ülke payları
- Treemap — Üretim hiyerarşisi
- ComposedChart — Top 10
- RadarChart — Ülke profili
- AreaChart — Yıllık üretim trendi
#### Tablolar
- DataTable istatistik

---

### 20. OtherAnimalProductsPage — Diğer Hayvansal Ürünler (Dünya)
**Rota:** `/tarpovizyon/world/other-animal`  
**Ürünler:** Deri, kürk, bal, bal mumu, ipek
#### Grafikler
- BarChart, PieChart, AreaChart
#### Tablolar
- DataTable

---

### 21. LivestockStocksPage — Hayvan Varlığı (Dünya)
**Rota:** `/tarpovizyon/world/livestock-stocks`
#### Grafikler
- BarChart — Hayvan türleri
- PieChart — Dağılım
- AreaChart — Yıllık trend
- LineChart — Değişim oranı
- ScatterChart — Korelasyon (bubble)
- Treemap — Ülke hiyerarşisi
- ComposedChart — Kombinasyon
- RadarChart — Ülke profili
#### Tablolar
- DataTable — İl / ülke hayvan sayısı
#### Diğer
- KPICard — CAGR, tahmin
- TurkeyHeatMap — İl dağılımı
- InsightCard

---

### 22. LivestockCompetitionPage — Hayvancılık Rekabeti
**Rota:** `/tarpovizyon/livestock-competition`
#### Grafikler
- ComposedChart — Pazar payı karşılaştırması
- RadarChart — Ülke rekabet profili
- Treemap — Hiyerarşik rekabet görünümü
#### Tablolar
- DataTable — HHI, CAGR sıralaması
#### Diğer
- KPICard — HHI, Herfindahl endeksi

---

### 23. TurkeyAnimalProductionPage — Türkiye Hayvansal Üretim
**Rota:** `/tarpovizyon/turkey/animal-production`
#### Grafikler
- BarChart — Dünya top ülkeler + Türkiye
- PieChart — Türkiye dünya payı
- AreaChart — Zaman serisi
- ComposedChart — Kombinasyon
- LineChart — Trend
- RadarChart — Ülke profili
#### Tablolar
- Karşılaştırma tablosu (Türkiye vs Dünya)
#### Diğer
- KPICard, InsightCard

---

### 24. TurkeyMilkProductionPage — Türkiye Süt Üretimi
**Rota:** `/tarpovizyon/turkey/milk`  
**Ürünler:** İnek, manda, keçi, koyun, deve
#### Grafikler
- BarChart, PieChart, AreaChart, ComposedChart, LineChart, RadarChart
#### Tablolar
- DataTable
#### Diğer
- KPICard, InsightCard

---

### 25. TurkeyEggProductionPage — Türkiye Yumurta Üretimi
**Rota:** `/tarpovizyon/turkey/eggs`
#### Grafikler
- BarChart, PieChart, AreaChart, ComposedChart
#### Tablolar
- DataTable

---

### 26. TurkeyRedMeatProductionPage — Türkiye Kırmızı Et
**Rota:** `/tarpovizyon/turkey/red-meat`
#### Grafikler
- BarChart — TÜİK kesim verileri
- AreaChart — Yıllık trend
- PieChart — Hayvan türü payları
- ComposedChart — Türkiye vs Dünya
#### Tablolar
- DataTable

---

### 27. TurkeyWhiteMeatProductionPage — Türkiye Beyaz Et
**Rota:** `/tarpovizyon/turkey/white-meat`  
**Ürünler:** Tavuk, ördek, hindi
#### Grafikler
- BarChart, PieChart, AreaChart, ComposedChart
#### Tablolar
- DataTable

---

### 28. TurkeyBeekeepingPage — Türkiye Arıcılık
**Rota:** `/tarpovizyon/turkey/beekeeping`
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Kovan ve bal üretimi trendi
#### Tablolar
- DataTable
#### Diğer
- TurkeyHeatMap — İl bazında bal üretimi
- KPICard — Kovan sayısı, üretim

---

### 29. TurkeyOtherAnimalProductsPage — Türkiye Diğer Hayvansal
**Rota:** `/tarpovizyon/turkey/other-animal-products`  
**Ürünler:** Su ürünleri, deri, yün, ipek
#### Grafikler
- BarChart, PieChart, AreaChart, ComposedChart
#### Tablolar
- DataTable

---

### 30. TurkeyProvincialLivestockPage — İl Bazında Hayvan
**Rota:** `/tarpovizyon/turkey/provincial-livestock`
#### Grafikler
- BarChart — İl sıralaması (yatay)
- PieChart — Bölge dağılımı
#### Tablolar
- DataTable — Top 20 il
#### Diğer
- TurkeyHeatMap — İl ısı haritası
- KPICard — Hayvan türü toplamları

---

### 31. TurkeyProvincialPlantPage — İl Bazında Bitki Üretimi
**Rota:** `/tarpovizyon/turkey/provincial-plant`
#### Grafikler
- BarChart — İl sıralaması
- AreaChart — Yıllık trend
#### Tablolar
- DataTable — İl üretim sıralaması
#### Diğer
- TurkeyHeatMap — İl üretim haritası
- KPICard — Toplam üretim

---

### 32. TuikLivestockPage — TÜİK Hayvancılık
**Rota:** `/tarpovizyon/turkey/tuik-livestock`  
**Kategoriler:** Sığır, Koyun, Keçi, Manda, At, Eşek, Katır
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Yıllık trend
#### Tablolar
- DataTable — İl ranking (ilk 20)
#### Diğer
- TurkeyHeatMap — İl ısı haritası
- KPICard — Toplam sayı, yıllık değişim

---

### 33. TuikPlantProductionPage — TÜİK Bitki Üretimi
**Rota:** `/tarpovizyon/turkey/tuik-production`
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Yıllık trend
#### Tablolar
- DataTable
#### Diğer
- TurkeyHeatMap — İl distribüsyonu
- KPICard — Toplam üretim

---

### 34. TuikPlantCategoryPage — TÜİK Bitki Kategorileri
**Rota:** Sebze, Meyve vb. için ortak bileşen
#### Grafikler
- BarChart — İl sıralaması
- PieChart — Bölge dağılımı
- AreaChart — Yıllık trend
#### Tablolar
- DataTable — Ürün / il istatistikleri
#### Diğer
- TurkeyHeatMap
- KPICard
- Dinamik kategori + ürün filtresi

---

### 35. TurkeyMacroPage — Türkiye Makro Ekonomi
**Rota:** `/tarpovizyon/turkey/macro`
#### Grafikler
- AreaChart — GSYH büyüme trendi
- BarChart — Sektörel dağılım
- LineChart — Tarım GSYH payı
#### Tablolar
- DataTable — Yıllık göstergeler
#### Diğer
- KPICard — GSYH, büyüme oranı

---

### 36. MacroEconomicPage — Dünya Makro Ekonomi
**Rota:** `/tarpovizyon/world/macro`
#### Grafikler
- BarChart — Top 20 ülke GSYH
- AreaChart — Yıllık büyüme trendi
- PieChart — Ülke payları
#### Tablolar
- DataTable
#### Diğer
- KPICard — Global toplam, trend

---

### 37. LandUsePage — Arazi Kullanımı (Dünya)
**Rota:** `/tarpovizyon/world/land`  
**Sekmeler:** 6 sekme
#### Grafikler
- BarChart — Arazi dağılımı
- PieChart — Kategori payları
- AreaChart — Zaman serisi değişim
- ComposedChart — Kombinasyon
- LineChart — Trend
- ScatterChart — Korelasyon
- RadarChart — Ülke profili
- Treemap — Hiyerarşi
- Sankey — Arazi dönüşüm akışı
#### Tablolar
- DataTable — İstatistik
#### Diğer
- KPICard — CAGR, transformation rate
- InsightCard

---

### 38. LandCoverPage — Arazi Örtüsü
**Rota:** `/tarpovizyon/land-cover`
#### Grafikler
- BarChart — Örtü tipi dağılımı
- PieChart — Kategori payları
- AreaChart — Zaman serisi
#### Tablolar
- DataTable
#### Diğer
- KPICard

---

### 39. FoodBalancePage — Gıda Dengesi
**Rota:** `/tarpovizyon/food-balance`
#### Grafikler
- Sankey — Arz-talep akış diyagramı
- AreaChart — Gıda arzı trendi
- BarChart — Ülke karşılaştırması
- PieChart — Kaynak dağılımı
#### Tablolar
- DataTable — Ülke gıda dengesi
#### Diğer
- KPICard — İthalat bağımlılığı, kalori/kişi

---

### 40. ProductBalancePage — Ürün Dengesi
**Rota:** `/tarpovizyon/product-balance`
#### Grafikler
- Sankey — Ürün akışı
- AreaChart — Arz/talep trendi
- BarChart — Üretim vs tüketim
#### Tablolar
- DataTable

---

### 41. PriceIndexPage — Fiyat Endeksleri
**Rota:** `/tarpovizyon/turkey/price-index`  
**Endeksler:** TÜFE, Tarım-ÜFE, GFE, FAO Gıda Fiyat Endeksi
#### Grafikler
- LineChart — Yıllık trend (4 endeks karşılaştırmalı)
- AreaChart — Trend alanı
- BarChart — Top 20 ürün fiyat değişimi
- ComposedChart — Makas analizi (TÜFE vs GFE farkı)
#### Tablolar
- Isı haritası tablosu (ay × ürün matris görünümü)
- DataTable
#### Diğer
- KPICard — CAGR, volatilite, z-score
- InsightCard — Anomali tespiti

---

### 42. CommodityPricesPage — Emtia Fiyatları
**Rota:** `/tarpovizyon/commodity-prices`  
**Kategoriler:** Tahıl, Yağlı Tohum, Enerji, Metal, Döviz
#### Grafikler
- LineChart — Fiyat trendi (1G / 1H / 1A / 1Y / 5Y zoomlama)
#### Diğer
- Kategori seçim kartları
- Fiyat seviyesi KPI
- Değişim yüzdesi göstergesi

---

### 43. CrossIntelligencePage — Çapraz Zeka
**Rota:** `/tarpovizyon/intelligence/cross`
#### Grafikler
- ScatterChart — Üretim-ticaret-fiyat korelasyonu
- Treemap — Çok boyutlu ürün dağılımı
- RadarChart — Ülke/ürün çok boyutlu profili
- ComposedChart — Kombinasyon analizi
#### Tablolar
- DataTable — Korelasyon matrisi
#### Diğer
- KPICard — Korelasyon katsayıları
- InsightCard — Otomatik içgörüler

---

### 44. AgriculturalEmploymentPage — Tarımsal İstihdam
**Rota:** `/tarpovizyon/employment`
#### Grafikler
- BarChart — Ülke istihdam karşılaştırması
- PieChart — Sektör dağılımı
- AreaChart — Yıllık istihdam trendi
#### Tablolar
- DataTable
#### Diğer
- KPICard — Toplam tarım istihdamı, oran

---

### 45. PopulationPage — Nüfus Analizi
**Rota:** `/tarpovizyon/population`
#### Grafikler
- AreaChart — Dünya nüfus trendi
- BarChart — Top 20 nüfuslu ülke
- PieChart — Kentsel / kırsal dağılım
- LineChart — Büyüme oranı
#### Tablolar
- DataTable
#### Diğer
- KPICard — Dünya nüfusu, kentsel oran

---

### 46. PesticidePage — Pestisit Kullanımı
**Rota:** `/tarpovizyon/pesticides`
#### Grafikler
- BarChart — Ülke bazında pestisit kullanımı
- AreaChart — Yıllık kullanım trendi
- PieChart — Pestisit tipi dağılımı
#### Tablolar
- DataTable
#### Diğer
- KPICard — Toplam kullanım, oran

---

### 47. FertilizerPage — Gübre Analizi
**Rota:** `/tarpovizyon/fertilizer`
#### Grafikler
- BarChart — Ülke gübre kullanımı
- AreaChart — Yıllık trend
- PieChart — Gübre tipi dağılımı (N, P, K)
#### Tablolar
- DataTable
#### Diğer
- KPICard

---

### 48. GubreHesapPage — Gübre Hesaplayıcı
**Rota:** `/tarpovizyon/fertilizer-calc`
- İnteraktif form tabanlı gübre hesaplama
- Grafik yok
- Sonuç özet kartları

---

### 49. HasatTahminiPage — Hasat Tahmini
**Rota:** `/tarpovizyon/harvest-forecast`
#### Grafikler
- LineChart — Tahmin vs aktüel karşılaştırması
- ScatterChart — Tahmin doğruluk dağılımı
- AreaChart — Güven aralıklı tahmin bandı
#### Tablolar
- DataTable — İl bazında tahmin tablosu
#### Diğer
- KPICard — Model doğruluğu (RMSE, MAE)
- Ürün ve il seçici

---

### 50. SulamaPlanPage — Sulama Planı
**Rota:** `/tarpovizyon/irrigation-plan`
#### Grafikler
- BarChart — Sulanabilir alan kapasitesi
- AreaChart — Sulama ihtiyacı trendi
#### Tablolar
- DataTable — Havza sulama verileri
#### Diğer
- MapContainer — Coğrafi sulama haritası
- KPICard

---

### 51. BasinProductionPage — Havza Üretimi
**Rota:** `/tarpovizyon/basin`
#### Grafikler
- AreaChart — Havza üretim trendi
- BarChart — Havza karşılaştırması
#### Tablolar
- DataTable
#### Diğer
- MapContainer — Su havzası haritası
- KPICard

---

### 52. TarimTakvimPage — Tarım Takvimi
**Rota:** `/tarpovizyon/farm-calendar`
- İnteraktif takvim bileşeni (ekim, hasat dönemleri)
- Aylık / mevsimlik görünüm
- Grafik yok (takvim UI)

---

### 53. GeographicalIndicationsPage — Coğrafi İşaretler
**Rota:** `/tarpovizyon/gi-products`
#### Grafikler
- BarChart — İl/bölge bazında ürün sayısı
- PieChart — Kategori dağılımı
#### Tablolar
- DataTable — Tüm coğrafi işaret ürünleri listesi
#### Diğer
- TurkeyHeatMap — Coğrafi işaret yoğunluğu
- KPICard — Toplam tescilli ürün sayısı

---

### 54. AIAssistantPage — AI Asistan
**Rota:** `/tarpovizyon/ai`
- Sorgu tabanlı yapay zeka analitik arayüzü
- ChatBox UI
- Dinamik grafik (sorgu sonucuna göre değişen recharts output)
- Grafik türü: sorguya bağlı

---

### 55. RasyonEmbedPage — Rasyon (Embed)
**Rota:** `/tarpovizyon/rasyon`
- Gömülü rasyon hesaplama modülü
- Grafik yok (başka projeden embed)

---

## TradePage — Ticaret (Ana Sayfa + 6 Sekme)
**Rota:** `/tarpovizyon/trade`

---

### 56. TradeOverviewTab — Ticaret Özeti
#### Grafikler
- BarChart — İhracatçı / ithalatçı ülkeler
- AreaChart — Yıllık ihracat/ithalat trendi
- LineChart — Aylık dalgalanma
- ComposedChart — Denge analizi
- Treemap — Ürün distribüsyonu
#### Tablolar
- DataTable — Top 10 ülke
#### Diğer
- KPICard — İhracat, ithalat, ticaret dengesi
- InsightCard

---

### 57. PlantTradeTab — Bitkisel Ürün Ticareti
#### Grafikler
- BarChart — Top ihracatçılar
- AreaChart — Yıllık trend
- PieChart — Ürün kategori payları
- ComposedChart — Kombinasyon
- Treemap — Hiyerarşi
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 58. AnimalTradeTab — Hayvansal Ürün Ticareti
#### Grafikler
- BarChart, AreaChart, PieChart, ComposedChart, Treemap
#### Tablolar
- DataTable
#### Diğer
- KPICard, ProductSelector

---

### 59. ProductIntelligenceTab — Ürün İstihbaratı
#### Grafikler
- ScatterChart — Fırsat matrisi
- Treemap — Ürün hacim dağılımı
- LineChart — Ürün trend analizi
- RadarChart — Ürün rekabet profili
#### Tablolar
- DataTable — Ürün sıralama tablosu
#### Diğer
- KPICard — Growth rate, market share
- InsightCard — Fırsat tespiti

---

### 60. CountryIntelligenceTab — Ülke İstihbaratı
#### Grafikler
- BarChart — Ülke ticaret hacmi
- RadarChart — Ülke çok boyutlu profili
- ScatterChart — Büyüme-hacim dağılımı
- ComposedChart — Kombinasyon
#### Tablolar
- DataTable — Ülke sıralama
#### Diğer
- KPICard — Pazar payı, büyüme
- InsightCard

---

### 61. TradeIntelligenceTab — Ticaret İstihbaratı
#### Grafikler
- ComposedChart — Stratejik analiz
- ScatterChart — Risk-fırsat matrisi
- Treemap — Pazar yapısı
- RadarChart — Sektör profili
#### Tablolar
- DataTable — Stratejik sıralama
#### Diğer
- KPICard — Öncelikli fırsatlar
- InsightCard — Risk uyarıları

---

## Bileşen Kullanım İstatistikleri

| Bileşen | Tahmini Kullanım |
|---------|-----------------|
| `BarChart` | 55+ sayfada |
| `PieChart` | 45+ sayfada |
| `AreaChart` | 50+ sayfada |
| `LineChart` | 30+ sayfada |
| `ComposedChart` | 25+ sayfada |
| `Treemap` | 20+ sayfada |
| `RadarChart` | 15+ sayfada |
| `ScatterChart` | 12+ sayfada |
| `Sankey` | 3 sayfada |
| `DataTable` | 50+ sayfada |
| `KPICard` | 45+ sayfada |
| `InsightCard` | 25+ sayfada |
| `TurkeyHeatMap` | 10+ sayfada |
| `ProductSelector` | 30+ sayfada |
| `MapContainer` | 2 sayfada |
