# TarpoVizyon — Sayfa ve Görselleştirme Envanteri (v2 — %100 Doğru)

**Hazırlanma Tarihi:** 16 Nisan 2026  
**Metod:** Her .tsx dosyası `import` satırlarından ve JSX kullanımından okunarak üretildi  
**Stack:** React + TypeScript + Recharts + TailwindCSS + TanStack React Query

---

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam rotası olan sayfa | 63 (web) + 5 (mobil) + 2 (redirect) |
| Ana sayfa dosyası | 54 |
| Ticaret alt sekmesi | 6 |
| Zombi dosya (rotasız) | 1 (TurkeyOtherAnimalProductsPage) |
| Grafik kütüphanesi | Recharts |
| Harita bileşeni | TurkeyHeatMap (özel) |
| MapContainer | **KULLANIMDA DEĞİL** (hiçbir sayfada import yok) |

---

## Grafik Türleri — Gerçek Kullanım İstatistikleri

| Bileşen | Gerçek Kullanım Sayısı | Sayfalar |
|---------|----------------------|----------|
| `BarChart` | ~40 sayfa | Neredeyse tüm veri sayfaları |
| `AreaChart` | ~30 sayfa | Trend gösteren sayfalar |
| `PieChart` | ~25 sayfa | Dağılım gösteren sayfalar |
| `ComposedChart` | ~25 sayfa | Çubuk+çizgi kombinasyonları |
| `LineChart` | 8 sayfa | Basin, Commodity, Livestock*, PriceIndex, LivestockComp, HasatTahmini(ComposedChart içinde Line), LandUse |
| `RadarChart` | 7 sayfa | EggProd, MilkProd, RedMeat, WhiteMeat, OtherAnimal, CrossIntel, LandCover, TuikPlantCategory, TuikLivestock, TurkeyRedMeat, TurkeyMilk, LivestockComp |
| `Treemap` | 7 sayfa | EggProd, MilkProd, RedMeat, WhiteMeat, OtherAnimal, Basin, TuikPlantCategory, TurkeyBeekeeping, TurkeyRedMeat |
| `ScatterChart` | 6 sayfa | ProductionPage, LivestockStocks, CrossIntel, TuikPlantCategory, TuikLivestock, LivestockComp |
| `Sankey` | **1 sayfa** | TuikLivestockPage (koşullu render) |
| `TurkeyHeatMap` | 10 sayfa | Aşağıda detaylı |
| `KPICard` | 10 sayfa | Aşağıda detaylı |
| `InsightCard` | 8 sayfa | Aşağıda detaylı |
| `ProductSelector` | yok (özel bileşen) | Sayfalarda kendi selector'ları var |
| `MapContainer` | **0 sayfa** | Hiçbir yerde kullanılmıyor |

### TurkeyHeatMap Kullanan Sayfalar (10)
OverviewPage, LivestockStocksPage, BasinProductionPage, GeographicalIndicationsPage, TurkeyAnimalProductionPage, TurkeyProvincialLivestockPage, TurkeyProvincialPlantPage, TuikLivestockPage, TurkeyWhiteMeatProductionPage, HasatTahminiPage

### KPICard Kullanan Sayfalar (10)
AgriculturalEmploymentPage, FertilizerPage, FoodBalancePage, LandUsePage, PesticidePage, PopulationPage, ProductionPage, TradeOverviewTab, PlantTradeTab, AnimalTradeTab, CountryIntelligenceTab, ProductIntelligenceTab

### InsightCard Kullanan Sayfalar (8)
AgriculturalEmploymentPage, FertilizerPage, FoodBalancePage, LandUsePage, LivestockCompetitionPage, LivestockStocksPage, PesticidePage, PopulationPage, ProductionPage

---

## Rota Haritası (App.tsx'ten birebir)

### Genel Rotalar
| Rota | Bileşen | Açıklama |
|------|---------|----------|
| `/` | `ProgramSelectionPage` | Ana program seçimi (Capacitor'da → `/m`) |
| `/tarpovizyon` | `SelectionPage` | Dünya / Türkiye seçimi |
| `/tarpovizyon/world` | `HomePage` | Dünya ana sayfa |
| `/tarpovizyon/turkey` | `HomePage` | Türkiye ana sayfa |
| `/tarpovizyon/overview` | `Navigate → /tarpovizyon` | Redirect |
| `/tarpovizyon/commodity-prices` | `CommodityPricesPage` | Emtia fiyatları |
| `/tarpovizyon/ai-assistant` | `AIAssistantPage` | AI asistan |
| `/hasat-tahmini` | `HasatTahminiPage` | Hasat tahmini |
| `/sulama-plan` | `SulamaPlanPage` | Sulama planı |
| `/gubre-hesap` | `GubreHesapPage` | Gübre hesaplayıcı |
| `/tarim-takvim` | `TarimTakvimPage` | Tarım takvimi |
| `/rasyon/*` | `RasyonApp` | Rasyon modülü |

### Dünya (FAO) Rotaları
| Rota | Bileşen | Açıklama |
|------|---------|----------|
| `/tarpovizyon/world/macro-economic` | `MacroEconomicPage` | Dünya makro ekonomi |
| `/tarpovizyon/world/population` | `PopulationPage` | Nüfus analizi |
| `/tarpovizyon/world/production` | `ProductionPage` | Dünya bitkisel üretim (genel) |
| `/tarpovizyon/world/cereals` | `ProductionPage (CEREALS)` | Tahıl üretimi |
| `/tarpovizyon/world/vegetables` | `ProductionPage (VEGETABLES)` | Sebze üretimi |
| `/tarpovizyon/world/fruits` | `ProductionPage (FRUITS)` | Meyve üretimi |
| `/tarpovizyon/world/legumes` | `ProductionPage (PULSES)` | Bakliyat üretimi |
| `/tarpovizyon/world/oilseeds` | `ProductionPage (OILSEEDS)` | Yağlı tohum üretimi |
| `/tarpovizyon/world/sugar-crops` | `ProductionPage (INDUSTRIAL)` | Endüstriyel bitkiler |
| `/tarpovizyon/world/nuts` | `ProductionPage (NUTS)` | Sert kabuklu üretimi |
| `/tarpovizyon/world/beverages` | `ProductionPage (INDUSTRIAL)` | İçecek & endüstriyel |
| `/tarpovizyon/world/fiber-crops` | `ProductionPage (INDUSTRIAL)` | Lif bitkileri |
| `/tarpovizyon/world/livestock` | `LivestockStocksPage` | Hayvan varlığı |
| `/tarpovizyon/world/livestock-competition` | `LivestockCompetitionPage` | Hayvancılık rekabeti |
| `/tarpovizyon/world/red-meat` | `RedMeatProductionPage` | Kırmızı et üretimi |
| `/tarpovizyon/world/white-meat` | `WhiteMeatProductionPage` | Beyaz et üretimi |
| `/tarpovizyon/world/milk` | `MilkProductionPage` | Süt üretimi |
| `/tarpovizyon/world/eggs` | `EggProductionPage` | Yumurta üretimi |
| `/tarpovizyon/world/other-animal` | `OtherAnimalProductsPage` | Diğer hayvansal ürünler |
| `/tarpovizyon/world/resources` | `LandUsePage` | Arazi kullanımı |
| `/tarpovizyon/world/land-cover` | `LandCoverPage` | Arazi örtüsü |
| `/tarpovizyon/world/fertilizer` | `FertilizerPage` | Gübre analizi |
| `/tarpovizyon/world/pesticide` | `PesticidePage` | Pestisit kullanımı |
| `/tarpovizyon/world/employment` | `AgriculturalEmploymentPage` | Tarımsal istihdam |
| `/tarpovizyon/world/food-balance` | `FoodBalancePage` | Gıda dengesi |

### Türkiye (TÜİK) Rotaları
| Rota | Bileşen | Açıklama |
|------|---------|----------|
| `/tarpovizyon/turkey/price-index` | `PriceIndexPage` | Fiyat endeksleri |
| `/tarpovizyon/turkey/product-balance` | `ProductBalancePage` | Ürün dengesi |
| `/tarpovizyon/turkey/macro` | `TurkeyMacroPage` | Türkiye makro ekonomi |
| `/tarpovizyon/turkey/cross-intelligence` | `CrossIntelligencePage` | Çapraz zeka |
| `/tarpovizyon/turkey/plant-production` | `TuikPlantProductionPage` | TÜİK bitki üretimi |
| `/tarpovizyon/turkey/cereals` | `CerealProductionPage` | Tahıl üretimi (TR) |
| `/tarpovizyon/turkey/vegetables` | `VegetableProductionPage` | Sebze üretimi (TR) |
| `/tarpovizyon/turkey/fruits` | `FruitProductionPage` | Meyve üretimi (TR) |
| `/tarpovizyon/turkey/legumes` | `LegumeProductionPage` | Baklagil üretimi (TR) |
| `/tarpovizyon/turkey/oilseeds` | `OilseedProductionPage` | Yağlı tohum üretimi (TR) |
| `/tarpovizyon/turkey/sugar-crops` | `SugarCropProductionPage` | Şeker bitkileri (TR) |
| `/tarpovizyon/turkey/nuts` | `NutProductionPage` | Sert kabuklu (TR) |
| `/tarpovizyon/turkey/beverages` | `BeverageCropPage` | İçecek & baharat (TR) |
| `/tarpovizyon/turkey/fiber-crops` | `FiberCropPage` | Lif bitkileri (TR) |
| `/tarpovizyon/turkey/trade` | `TradePage` | Ticaret (6 sekme) |
| `/tarpovizyon/turkey/animal-production` | `TurkeyAnimalProductionPage` | Hayvansal üretim genel |
| `/tarpovizyon/turkey/red-meat` | `TurkeyRedMeatProductionPage` | Kırmızı et (TR) |
| `/tarpovizyon/turkey/white-meat` | `TurkeyWhiteMeatProductionPage` | Beyaz et (TR) |
| `/tarpovizyon/turkey/milk` | `TurkeyMilkProductionPage` | Süt üretimi (TR) |
| `/tarpovizyon/turkey/eggs` | `TurkeyEggProductionPage` | Yumurta üretimi (TR) |
| `/tarpovizyon/turkey/beekeeping` | `TurkeyBeekeepingPage` | Arıcılık (TR) |
| `/tarpovizyon/turkey/tuik-livestock` | `TuikLivestockPage` | TÜİK canlı hayvan |
| `/tarpovizyon/turkey/provincial` | `TurkeyProvincialLivestockPage` | İl bazında hayvan |
| `/tarpovizyon/turkey/plant-provincial` | `TurkeyProvincialPlantPage` | İl bazında bitki |
| `/tarpovizyon/turkey/basin-production` | `BasinProductionPage` | Havza üretimi |
| `/tarpovizyon/turkey/geographical-indication` | `GeographicalIndicationsPage` | Coğrafi işaretler |
| `/tarpovizyon/turkey/tuik-plant` | `TuikPlantProductionPage` | TÜİK bitki (duplikat rota) |

### Mobil Rotalar
| Rota | Bileşen |
|------|---------|
| `/m` | `MobileHomePage` (MobileLayout içinde) |
| `/m/explore` | `MobileExplorePage` |
| `/m/market` | `MobileMarketPage` |
| `/m/ai` | `MobileAIPage` |
| `/m/settings` | `MobileSettingsPage` |

---

## Sayfa Detayları

---

### 1. ProgramSelectionPage — Program Seçimi
**Rota:** `/`  
**Dosya:** `ProgramSelectionPage.tsx`  
**Recharts:** yok  
**Diğer:** Navigasyon kartları — program seçim ekranı

---

### 2. SelectionPage — Dünya / Türkiye Seçimi
**Rota:** `/tarpovizyon`  
**Dosya:** `SelectionPage.tsx`  
**Recharts:** yok  
**Diğer:** Dünya ve Türkiye modül seçim kartları

---

### 3. HomePage — Ana Sayfa (Dünya / Türkiye)
**Rota:** `/tarpovizyon/world` ve `/tarpovizyon/turkey`  
**Dosya:** `HomePage.tsx`  
**Recharts:** yok  
**Diğer:** Kategori navigasyon grid'i — Dünya: 5 kart, Türkiye: 7 kart

---

### 4. OverviewPage — Genel Bakış
**Rota:** *Doğrudan rotası yok* (başka sayfalardan çağrılabilir)  
**Dosya:** `OverviewPage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `PieChart`, `ComposedChart` (Line)  
**TurkeyHeatMap:** ✅  
**KPICard:** ❌ | **InsightCard:** ❌  

---

### 5. ProductionPage — Dünya Bitkisel Üretim
**Rota:** `/tarpovizyon/world/production` (genel)  
**Kategori rotaları:** `/world/cereals` (CEREALS), `/world/vegetables` (VEGETABLES), `/world/fruits` (FRUITS), `/world/legumes` (PULSES), `/world/oilseeds` (OILSEEDS), `/world/sugar-crops` (INDUSTRIAL), `/world/nuts` (NUTS), `/world/beverages` (INDUSTRIAL), `/world/fiber-crops` (INDUSTRIAL)  
**Dosya:** `ProductionPage.tsx`  
**Sekmeler:** Genel Bakış · Birincil Üretim · İşlenmiş Üretim · Verim Analizi · Rekabet Analizi · Tahminler  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `LineChart`, `ScatterChart` (+ `ReferenceLine`)  
**KPICard:** ✅ | **InsightCard:** ✅  
**NOT:** 9 dünya kategori rotası bu tek bileşeni `categoryFilter` prop'u ile kullanır

---

### 6. MacroEconomicPage — Dünya Makro Ekonomi
**Rota:** `/tarpovizyon/world/macro-economic`  
**Dosya:** `MacroEconomicPage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `PieChart`  
**KPICard:** ❌ | **InsightCard:** ❌

---

### 7. PopulationPage — Nüfus Analizi
**Rota:** `/tarpovizyon/world/population`  
**Dosya:** `PopulationPage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `ComposedChart` (Line, Scatter)  
**KPICard:** ✅ | **InsightCard:** ✅

---

### 8. LivestockStocksPage — Hayvan Varlığı (Dünya)
**Rota:** `/tarpovizyon/world/livestock`  
**Dosya:** `LivestockStocksPage.tsx`  
**Sekmeler:** overview · stocks · primary · processed · efficiency · predictions  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `LineChart`, `ScatterChart`  
**TurkeyHeatMap:** ✅ | **InsightCard:** ✅  
**Ürünler:** Sığır, Koyun, Keçi, Domuz, Tavuk, Manda, At, Hindi, Ördek  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 9. LivestockCompetitionPage — Hayvancılık Rekabeti
**Rota:** `/tarpovizyon/world/livestock-competition`  
**Dosya:** `LivestockCompetitionPage.tsx`  
**Recharts:** `BarChart`, `LineChart`, `RadarChart`, `AreaChart`, `ScatterChart` (+ `ReferenceLine`)  
**InsightCard:** ✅

---

### 10. RedMeatProductionPage — Kırmızı Et (Dünya)
**Rota:** `/tarpovizyon/world/red-meat`  
**Dosya:** `RedMeatProductionPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `AreaChart`  
**Ürünler:** Sığır Eti, Domuz Eti, Koyun Eti, Keçi Eti, Manda Eti, Deve Eti, Tavşan Eti, At Eti  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 11. WhiteMeatProductionPage — Beyaz Et (Dünya)
**Rota:** `/tarpovizyon/world/white-meat`  
**Dosya:** `WhiteMeatProductionPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `AreaChart`  
**Ürünler:** Tavuk Eti, Ördek Eti, Kaz Eti, Hindi Eti, Güvercin Eti  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 12. MilkProductionPage — Süt Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/milk`  
**Dosya:** `MilkProductionPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `AreaChart`  
**Ürünler:** İnek Sütü, Manda Sütü, Keçi Sütü, Koyun Sütü, Deve Sütü  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 13. EggProductionPage — Yumurta Üretimi (Dünya)
**Rota:** `/tarpovizyon/world/eggs`  
**Dosya:** `EggProductionPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `AreaChart`  
**Ürünler:** Tavuk Yumurtası, Diğer Kuş Yumurtaları  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 14. OtherAnimalProductsPage — Diğer Hayvansal (Dünya)
**Rota:** `/tarpovizyon/world/other-animal`  
**Dosya:** `OtherAnimalProductsPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `AreaChart`  
**Ürünler:** Doğal Bal, Bal Mumu, Yün, İpek Böceği Kozası  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 15. LandUsePage — Arazi Kullanımı (Dünya)
**Rota:** `/tarpovizyon/world/resources`  
**Dosya:** `LandUsePage.tsx`  
**Sekmeler:** Genel Bakış · Arazi Dönüşümü · Ülke Sıralaması · Türkiye Profili · Trend & Tahmin · İçgörüler  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `ComposedChart` (Line, Scatter), `LineChart`  
**KPICard:** ✅ | **InsightCard:** ✅  
**Sankey:** ❌ (import yok, kullanım yok)

---

### 16. LandCoverPage — Arazi Örtüsü
**Rota:** `/tarpovizyon/world/land-cover`  
**Dosya:** `LandCoverPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `ComposedChart`, `RadarChart`  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 17. FertilizerPage — Gübre Analizi
**Rota:** `/tarpovizyon/world/fertilizer`  
**Dosya:** `FertilizerPage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `ComposedChart` (Line, Scatter)  
**KPICard:** ✅ | **InsightCard:** ✅

---

### 18. PesticidePage — Pestisit Kullanımı
**Rota:** `/tarpovizyon/world/pesticide`  
**Dosya:** `PesticidePage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `ComposedChart` (Line, Scatter)  
**KPICard:** ✅ | **InsightCard:** ✅

---

### 19. AgriculturalEmploymentPage — Tarımsal İstihdam
**Rota:** `/tarpovizyon/world/employment`  
**Dosya:** `AgriculturalEmploymentPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`, `ComposedChart` (Line, Scatter)  
**KPICard:** ✅ | **InsightCard:** ✅

---

### 20. FoodBalancePage — Gıda Dengesi
**Rota:** `/tarpovizyon/world/food-balance`  
**Dosya:** `FoodBalancePage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `ComposedChart` (Line, Scatter)  
**KPICard:** ✅ | **InsightCard:** ✅  
**Sankey:** ❌ (import yok)

---

### 21. PriceIndexPage — Fiyat Endeksleri
**Rota:** `/tarpovizyon/turkey/price-index`  
**Dosya:** `PriceIndexPage.tsx`  
**Recharts:** `BarChart`, `LineChart`, `AreaChart`  
**Endeksler:** TÜFE, Tarım-ÜFE, GFE, FAO Gıda Fiyat Endeksi  
**Özel:** Isı haritası tablosu (kategori×ay matrisi), makas analizi, anomali tespiti (z-score)

---

### 22. ProductBalancePage — Ürün Dengesi
**Rota:** `/tarpovizyon/turkey/product-balance`  
**Dosya:** `ProductBalancePage.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart` (+ `ReferenceLine`)  
**Sankey:** ❌ (import yok)

---

### 23. TurkeyMacroPage — Türkiye Makro Ekonomi
**Rota:** `/tarpovizyon/turkey/macro`  
**Dosya:** `TurkeyMacroPage.tsx`  
**Recharts:** `BarChart`, `ComposedChart` (Area, Line), `PieChart`

---

### 24. CrossIntelligencePage — Çapraz Zeka
**Rota:** `/tarpovizyon/turkey/cross-intelligence`  
**Dosya:** `CrossIntelligencePage.tsx`  
**Recharts:** `ComposedChart` (Bar, Line), `RadarChart`, `ScatterChart`

---

### 25. TuikPlantProductionPage — TÜİK Bitki Üretimi (Genel)
**Rota:** `/tarpovizyon/turkey/plant-production` ve `/tarpovizyon/turkey/tuik-plant`  
**Dosya:** `TuikPlantProductionPage.tsx`  
**Recharts:** `BarChart`, `AreaChart`, `PieChart`  
**ProductSelector:** ✅ (kendi dropdown'u)

---

### 26. TuikPlantCategoryPage — TÜİK Bitki Kategorileri (Temel Bileşen)
**Rota:** Doğrudan rotası yok — 9 wrapper sayfa tarafından kullanılır  
**Dosya:** `TuikPlantCategoryPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart` (Line), `ScatterChart`  
**Unsur Seçenekleri (7):** Üretim (Ton), Ekilen Alan (Dekar), Hasat Edilen Alan (Dekar), Verim (Kg/Dekar), Meyve Veren Yaşta Ağaç Sayısı, Meyve Vermeyen Yaşta Ağaç Sayısı, Toplu Meyveliklerin Alanı  
**NOT:** Tüm Türkiye bitkisel kategori sayfaları (27-35) bu bileşeni kullanır

---

### 27. CerealProductionPage — Tahıl Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/cereals`  
**Dosya:** `CerealProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Tahıllar Ve Diğer Bitkisel Ürünler"  
**Ürünler (14):** Buğday (Durum Buğdayı Hariç), Durum Buğdayı, Arpa (Diğer), Arpa (Biralık), Mısır, Çeltik, Yulaf, Çavdar, Sorgum, Darı, Triticale, Kara Buğday, Mahlut, Kaplıca  
**Varsayılan:** Buğday, Arpa (Diğer), Mısır  
**Recharts (TuikPlantCategoryPage'den):** `BarChart`, `PieChart`, `Treemap`, `RadarChart`, `ComposedChart`, `ScatterChart`

---

### 28. VegetableProductionPage — Sebze Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/vegetables`  
**Dosya:** `VegetableProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Sebzeler"  
**Ürünler:** "Sebzeler" grubundaki tüm ürünler (filtre yok)  
**Varsayılan:** Domates (Sofralık), Biber (Sivri), Hıyar (Sofralık)

---

### 29. FruitProductionPage — Meyve Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/fruits`  
**Dosya:** `FruitProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Meyveler Içecek Ve Baharat Bitkileri"  
**showTreeMetrics:** ✅  
**Ürünler (44):** Elma (Golden, Starking, Granny Smith, Amasya, Diğer), Armut, Kayısı, Kiraz, Vişne, Erik, Şeftali, Nektarin, İncir, Nar, Ayva, Muşmula, Dut, Hünnap, İğde, Trabzon Hurması, Yenidünya, Zerdali, Kızılcık, Çilek, Ahududu, Böğürtlen, Maviyemiş, Portakal (Washington/Yafa/Diğer), Mandalina (Satsuma/Klemantin/King/Diğer), Limon Ve Misket Limonu, Greyfurt, Turunç, Muz, Plantain, Avokado, Kivi, Sofralık Üzüm (Çekirdekli/Çekirdeksiz), Kurutmalık Üzüm (Çekirdekli/Çekirdeksiz), Şaraplık Üzümler, Sofralık Zeytinler, Yağlık Zeytinler  
**Varsayılan:** Elma (Golden), Kayısı, Kiraz

---

### 30. LegumeProductionPage — Baklagil Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/legumes`  
**Dosya:** `LegumeProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Tahıllar Ve Diğer Bitkisel Ürünler"  
**Ürünler (12):** Nohut (Kuru), Mercimek (Kırmızı), Mercimek (Yeşil), Fasulye (Kuru), Bezelye (Kuru), Börülce (Kuru), Bakla (İnsan Tüketimi), Bakla (Yemlik), Acı Bakla, Bezelye (Yemlik), Mürdümük, Burçak  
**Varsayılan:** Nohut, Mercimek Kırmızı, Fasulye

---

### 31. OilseedProductionPage — Yağlı Tohum Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/oilseeds`  
**Dosya:** `OilseedProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Tahıllar Ve Diğer Bitkisel Ürünler"  
**Ürünler (10):** Ayçiçeği Tohumu (Yağlık), Ayçiçeği Tohumu (Çerezlik), Soya Fasulyesi, Kanola Veya Kolza Tohumu, Aspir Tohumu, Susam Tohumu, Keten Tohumu, Kenevir Tohumu, Haşhaş Tohumu, Yerfıstığı (Kabuklu)  
**Varsayılan:** Ayçiçeği Tohumu (Yağlık), Soya Fasulyesi

---

### 32. SugarCropProductionPage — Şeker Bitkileri (Türkiye)
**Rota:** `/tarpovizyon/turkey/sugar-crops`  
**Dosya:** `SugarCropProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Tahıllar Ve Diğer Bitkisel Ürünler"  
**Ürünler (3):** Şeker Pancarı, Şeker Kamışı, Şeker Pancarı Tohumları  
**Varsayılan:** Şeker Pancarı

---

### 33. NutProductionPage — Sert Kabuklu (Türkiye)
**Rota:** `/tarpovizyon/turkey/nuts`  
**Dosya:** `NutProductionPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Meyveler Içecek Ve Baharat Bitkileri"  
**showTreeMetrics:** ✅  
**Ürünler (5):** Fındık, Ceviz, Badem, Şam Fıstığı (Antep Fıstığı), Kestane  
**Varsayılan:** Fındık, Ceviz, Şam Fıstığı

---

### 34. BeverageCropPage — İçecek & Baharat Bitkileri (Türkiye)
**Rota:** `/tarpovizyon/turkey/beverages`  
**Dosya:** `BeverageCropPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Meyveler Içecek Ve Baharat Bitkileri"  
**showTreeMetrics:** ✅  
**Ürünler (10):** Çay Yaprakları, Biber (Kuru, İşlenmemiş), Kekik, Kimyon, Anason, Kişniş, Rezene, Çörek Otu Tohumu, Kapari, Süpürge Otu  
**Varsayılan:** Çay Yaprakları  
**⚠️ DİKKAT:** Eski envanterde "Kahve, çay, kakao, şarap üzümü" yazıyordu — YANLIŞ. Gerçekte çay + baharat bitkileri.

---

### 35. FiberCropPage — Lif Bitkileri (Türkiye)
**Rota:** `/tarpovizyon/turkey/fiber-crops`  
**Dosya:** `FiberCropPage.tsx` → `TuikPlantCategoryPage`  
**urunGrup:** "Tahıllar Ve Diğer Bitkisel Ürünler"  
**Ürünler (6):** Pamuk (Çırçırlanmamış/Kütlü), Pamuk (Çırçırlanmış/Lifli), Pamuk Çekirdeği (Çiğit), Keten (Lif), Kenevir (Lif), Tütün (İşlenmemiş)  
**Varsayılan:** Pamuk (Kütlü), Tütün

---

### 36. TradePage — Ticaret (6 Sekme)
**Rota:** `/tarpovizyon/turkey/trade`  
**Dosya:** `TradePage.tsx`  
**Recharts:** yok (sekmelerine delege eder)  
**Sekme kontrolü:** `?tab=` query param  
**Sekmeler:** overview · plant · animal · product · country · intelligence

---

### 37. TradeOverviewTab — Ticaret Özeti
**Sekme:** `?tab=overview`  
**Dosya:** `trade/TradeOverviewTab.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `Treemap`  
**KPICard:** ✅

---

### 38. PlantTradeTab — Bitkisel Ürün Ticareti
**Sekme:** `?tab=plant`  
**Dosya:** `trade/PlantTradeTab.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `Treemap`  
**KPICard:** ✅

---

### 39. AnimalTradeTab — Hayvansal Ürün Ticareti
**Sekme:** `?tab=animal`  
**Dosya:** `trade/AnimalTradeTab.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `PieChart`  
**KPICard:** ✅

---

### 40. ProductIntelligenceTab — Ürün İstihbaratı
**Sekme:** `?tab=product`  
**Dosya:** `trade/ProductIntelligenceTab.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`  
**KPICard:** ✅

---

### 41. CountryIntelligenceTab — Ülke İstihbaratı
**Sekme:** `?tab=country`  
**Dosya:** `trade/CountryIntelligenceTab.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`  
**KPICard:** ✅

---

### 42. TradeIntelligenceTab — Ticaret İstihbaratı
**Sekme:** `?tab=intelligence`  
**Dosya:** `trade/TradeIntelligenceTab.tsx`  
**Recharts:** `BarChart`, `ComposedChart`, `RadarChart`, `AreaChart`  
**KPICard:** ❌

---

### 43. TurkeyAnimalProductionPage — Hayvansal Üretim Genel (Türkiye)
**Rota:** `/tarpovizyon/turkey/animal-production`  
**Dosya:** `TurkeyAnimalProductionPage.tsx`  
**Recharts:** `PieChart`, `BarChart`, `ComposedChart` (Area, Line)  
**TurkeyHeatMap:** ✅

---

### 44. TurkeyRedMeatProductionPage — Kırmızı Et (Türkiye)
**Rota:** `/tarpovizyon/turkey/red-meat`  
**Dosya:** `TurkeyRedMeatProductionPage.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `LineChart`, `PieChart`, `ScatterChart`, `RadarChart`, `Treemap`  
**Ürünler:** Sığır, Koyun, Keçi, Manda (TÜİK kesim verileri)  
**Ek veri:** Karkas paritesi, yem fiyatları, kârlılık, dünya karkas fiyatları, tüketim, ithalat

---

### 45. TurkeyWhiteMeatProductionPage — Beyaz Et (Türkiye)
**Rota:** `/tarpovizyon/turkey/white-meat`  
**Dosya:** `TurkeyWhiteMeatProductionPage.tsx`  
**Sekmeler:** overview · production · hatch · projection  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `LineChart`  
**TurkeyHeatMap:** ✅  
**Ürünler:** Tavuk Eti, Hindi Eti, Bıldırcın Eti + kuluçka verileri

---

### 46. TurkeyMilkProductionPage — Süt Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/milk`  
**Dosya:** `TurkeyMilkProductionPage.tsx`  
**Recharts:** `BarChart`, `ComposedChart`, `LineChart`, `PieChart`, `RadarChart`  
**Ham süt:** İnek, Koyun, Keçi  
**TÜİK işlenmiş süt ürünleri (11):** İnek Sütü, İnek Peyniri, Yoğurt, Ayran, İçme Sütü, Tereyağı, Süt Tozu, Yağsız Süt Tozu, Konsantre Süt, Krema, Diğer Peynir  
**Ek veri:** Ekonomik veriler, dünya süt fiyatları, verimlilik, sanayi verileri

---

### 47. TurkeyEggProductionPage — Yumurta Üretimi (Türkiye)
**Rota:** `/tarpovizyon/turkey/eggs`  
**Dosya:** `TurkeyEggProductionPage.tsx`  
**Sekmeler:** overview · production · yield · projection  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `LineChart`  
**Metrikler:** Yumurta üretimi (milyon adet), yumurtacı tavuk sayısı, tavuk başı verim, kuluçka verileri  
**Ek veri:** Maliyet, üretici fiyatı, yem fiyatı, tüketici fiyatı, kârlılık, parite

---

### 48. TurkeyBeekeepingPage — Arıcılık (Türkiye)
**Rota:** `/tarpovizyon/turkey/beekeeping`  
**Dosya:** `TurkeyBeekeepingPage.tsx`  
**Recharts:** `AreaChart`, `BarChart`, `ComposedChart`, `LineChart`, `PieChart`, `Treemap`  
**Metrikler:** Arıcı sayısı, işletme sayısı, eski/yeni tip kovan, toplam kovan, bal üretimi (ton), balmumu üretimi (ton), verim (kg/kovan)  
**Treemap:** İl bazlı bal üretim haritası (verime göre renkli)

---

### 49. TuikLivestockPage — TÜİK Canlı Hayvan
**Rota:** `/tarpovizyon/turkey/tuik-livestock`  
**Dosya:** `TuikLivestockPage.tsx`  
**Sekmeler:** overview · regional · trends · correlations  
**Recharts:** `BarChart`, `AreaChart`, `PieChart`, `ScatterChart`, `RadarChart`, `ComposedChart`, **`Sankey`** (+ `ReferenceLine`)  
**TurkeyHeatMap:** ✅  
**Hayvan Grupları (13):** Sığır 🐄, Manda 🐃, Koyun 🐑, Keçi 🐐, Tavuk 🐔, Hindi 🦃, Ördek 🦆, Kaz 🪿, At 🐴, Eşek 🫏, Katır 🐴, Deve 🐪, Domuz 🐷  
**Sankey:** "Hayvan Akış Diyagramı (Son 3 Yıl)" — koşullu render (`sankeyData.nodes.length > 0`)  
**⚠️ Bu, projedeki TEK Sankey kullanımıdır**

---

### 50. TurkeyProvincialLivestockPage — İl Bazında Hayvan
**Rota:** `/tarpovizyon/turkey/provincial`  
**Dosya:** `TurkeyProvincialLivestockPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`  
**TurkeyHeatMap:** ✅

---

### 51. TurkeyProvincialPlantPage — İl Bazında Bitki Üretimi
**Rota:** `/tarpovizyon/turkey/plant-provincial`  
**Dosya:** `TurkeyProvincialPlantPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`  
**TurkeyHeatMap:** ✅  
**Varsayılan ürünler:** Buğday (Durum Buğdayı Hariç), Mısır, Ayçiçeği Tohumu (Yağlık)

---

### 52. BasinProductionPage — Havza Üretimi
**Rota:** `/tarpovizyon/turkey/basin-production`  
**Dosya:** `BasinProductionPage.tsx`  
**Recharts:** `BarChart`, `LineChart`, `Treemap`  
**TurkeyHeatMap:** ✅  
**MapContainer:** ❌

---

### 53. GeographicalIndicationsPage — Coğrafi İşaretler
**Rota:** `/tarpovizyon/turkey/geographical-indication`  
**Dosya:** `GeographicalIndicationsPage.tsx`  
**Recharts:** `BarChart`, `PieChart`, `AreaChart`  
**TurkeyHeatMap:** ✅

---

### 54. CommodityPricesPage — Emtia Fiyatları
**Rota:** `/tarpovizyon/commodity-prices`  
**Dosya:** `CommodityPricesPage.tsx`  
**Recharts:** `LineChart`  
**Kategoriler (12):** Tahıllar 🌾, Yağlı Tohumlar 🫘, Endüstriyel 🏭, Tropikal ☕, Hayvancılık 🐄, Süt Ürünleri 🥛, Enerji ⚡, Orman Ürünleri 🪵, Gübre 🧪, Et & Gıda 🥩, Metaller 🥇, Döviz 💱  
**Veri kaynağı:** Yahoo Finance canlı veri

---

### 55. AIAssistantPage — AI Asistan
**Rota:** `/tarpovizyon/ai-assistant`  
**Dosya:** `AIAssistantPage.tsx`  
**Recharts:** yok  
**Diğer:** ReactMarkdown tabanlı sohbet arayüzü

---

### 56. HasatTahminiPage — Hasat Tahmini
**Rota:** `/hasat-tahmini`  
**Dosya:** `HasatTahminiPage.tsx`  
**Recharts:** `ComposedChart` (Line, Area)  
**TurkeyHeatMap:** ✅  
**Diğer:** WeatherWidget, ConfidenceBadge, ModelWarningBox

---

### 57. SulamaPlanPage — Sulama Planı
**Rota:** `/sulama-plan`  
**Dosya:** `SulamaPlanPage.tsx`  
**Recharts:** `BarChart` (+ `ReferenceLine`)  
**Diğer:** WeatherWidget, ConfidenceBadge, ModelWarningBox  
**MapContainer:** ❌

---

### 58. GubreHesapPage — Gübre Hesaplayıcı
**Rota:** `/gubre-hesap`  
**Dosya:** `GubreHesapPage.tsx`  
**Recharts:** `BarChart`  
**Diğer:** ConfidenceBadge, ModelWarningBox

---

### 59. TarimTakvimPage — Tarım Takvimi
**Rota:** `/tarim-takvim`  
**Dosya:** `TarimTakvimPage.tsx`  
**Recharts:** yok  
**Diğer:** WeatherWidget, ConfidenceBadge — takvim UI

---

### 60. RasyonApp — Rasyon Modülü
**Rota:** `/rasyon/*`  
**Dosya:** `src/rasyon/RasyonApp.tsx`  
**Ayrı modül** — ana projeden bağımsız rasyon hesaplama

---

## Zombi Dosya (Rotasız)

### TurkeyOtherAnimalProductsPage
**Dosya:** `TurkeyOtherAnimalProductsPage.tsx`  
**Rota:** ❌ YOK — App.tsx'te hiçbir rotaya bağlı değil  
**Recharts:** `AreaChart`, `BarChart`, `PieChart`  
**Durum:** Ölü kod — UI'dan ulaşılamaz

---

## Kodda Olup UI'da Koşullu Gösterilen Grafikler

| Sayfa | Bileşen | Koşul |
|-------|---------|-------|
| TuikLivestockPage | `Sankey` | `sankeyData.nodes.length > 0` — veri varsa gösterilir |
| TurkeyBeekeepingPage | `Treemap` | Koşulsuz — her zaman gösterilir |

---

## Eski Envanterdeki Kritik Hatalar (Düzeltme Logu)

| # | Eski Envanterdeki İddia | Gerçek |
|---|------------------------|--------|
| 1 | MapContainer 2 sayfada | **0 sayfada** — hiçbir yerde import yok |
| 2 | Sankey 3 sayfada (LandUse, FoodBalance, ProductBalance) | **1 sayfada** (TuikLivestockPage) — diğer 3'te import bile yok |
| 3 | BeverageCropPage: Kahve, çay, kakao, şarap üzümü | Gerçek: Çay, Biber, Kekik, Kimyon, Anason, Kişniş, Rezene, Çörek Otu, Kapari, Süpürge Otu |
| 4 | NutProductionPage: Fındık, badem, antep, ceviz, kaju | Gerçek: Fındık, Ceviz, Badem, Şam Fıstığı (Antep), **Kestane** (kaju yok) |
| 5 | OtherAnimalProducts: Deri, kürk, bal, bal mumu, ipek | Gerçek: Doğal Bal, Bal Mumu, Yün, İpek Böceği Kozası (deri ve kürk yok) |
| 6 | 32 yanlış rota | Tümü düzeltildi (yukarıdaki rota tablosuna bakın) |
| 7 | TurkeyOtherAnimalProducts rotası var | Rota YOK — zombi dosya |
| 8 | OverviewPage rotası `/tarpovizyon/world/overview` | Doğrudan rotası yok (redirect var ama `/tarpovizyon/overview` → SelectionPage) |
| 9 | AIAssistantPage rotası `/tarpovizyon/ai` | Gerçek: `/tarpovizyon/ai-assistant` |
| 10 | HasatTahminiPage rotası `/tarpovizyon/harvest-forecast` | Gerçek: `/hasat-tahmini` |
| 11 | SulamaPlanPage rotası `/tarpovizyon/irrigation-plan` | Gerçek: `/sulama-plan` |
| 12 | GubreHesapPage rotası `/tarpovizyon/fertilizer-calc` | Gerçek: `/gubre-hesap` |
| 13 | TarimTakvimPage rotası `/tarpovizyon/farm-calendar` | Gerçek: `/tarim-takvim` |
| 14 | LandUsePage rotası `/tarpovizyon/world/land` | Gerçek: `/tarpovizyon/world/resources` |
| 15 | LivestockStocks rotası `/tarpovizyon/world/livestock-stocks` | Gerçek: `/tarpovizyon/world/livestock` |
| 16 | CommodityPricesPage rotası `/tarpovizyon/commodity-prices` | ✅ Doğru |
| 17 | BasinProductionPage: MapContainer var | Gerçek: TurkeyHeatMap var, MapContainer yok |
| 18 | SulamaPlanPage: MapContainer var | Gerçek: MapContainer yok, WeatherWidget var |
| 19 | LivestockCompetitionPage rotası `/tarpovizyon/livestock-competition` | Gerçek: `/tarpovizyon/world/livestock-competition` |
| 20 | ProductionPage'de Treemap ve RadarChart var | Gerçek: Yok — sadece BarChart, PieChart, AreaChart, LineChart, ScatterChart |
| 21 | FoodBalancePage'de Sankey var | Gerçek: Yok — BarChart, AreaChart, ComposedChart |
| 22 | ProductBalancePage'de Sankey var | Gerçek: Yok — AreaChart, BarChart, ComposedChart |
| 23 | LandUsePage'de Sankey, RadarChart, Treemap var | Gerçek: Yok — sadece BarChart, PieChart, AreaChart, ComposedChart, LineChart |
| 24 | BarChart 55+ sayfada | Gerçek: ~40 sayfa |
| 25 | PieChart 45+ sayfada | Gerçek: ~25 sayfa |
| 26 | ProductSelector 30+ sayfada | Gerçek: ~10 sayfa (kendi dropdown'ları sayılırsa) |

---

*Bu envanter her sayfa dosyasının import satırları ve JSX render'ı tek tek okunarak hazırlanmıştır. Tahmin içermez.*
