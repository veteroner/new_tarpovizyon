# TarpoVizyon — Grafik & İçerik Dağılımı İyileştirme Planı

**Tarih:** 17 Nisan 2026  
**Temel:** SAYFA_VE_GRAFIK_ENVANTERI_v2.md denetim bulguları  
**Mevcut Durum:** 2.5/10 — Klon sayfalar, monolitik dosyalar, eksik akış diyagramları, statik haritalar  
**Not:** Bu plan kod denetimi sonrası revize edilmiştir. Eski envanter değil, doğrulanmış v2 envanter + doğrudan kod analizi baz alınmıştır.  
**Hedef:** Her sayfanın amacına uygun, benzersiz ve analitik derinliği olan bir deneyim sunması

---

## Faz 0 — Temizlik (Önkoşul)

### 0.1 Zombi Dosya Temizliği
- [x] `TurkeyOtherAnimalProductsPage.tsx` rotaya bağlı (`/tarpovizyon/turkey/other-animal-products`)
- [x] Karar doğrulandı: Türkiye diğer hayvansal ürünler sayfası canlı veriyle kullanılıyor, silinmeyecek
- [x] `src/pages` ve `src/components` altındaki macOS artifact dosyaları (`._*`, `.!*`) temizlendi
- [x] `RasyonEmbedPage.tsx/.css` silindi (eski iframe wrapper, artık `RasyonApp` ile boğulmuştu) — ana app + netlify kopyası
- [x] `TrendComparison.tsx` silindi (KPICard duplikatı, hiç import edilmiyordu) — ana app + netlify kopyası

### 0.2 Duplikat Rota Temizliği
- [x] `/tarpovizyon/turkey/tuik-plant` → `/tarpovizyon/turkey/plant-production` redirect'i mevcut

### 0.3 OverviewPage Rotası
- [x] `OverviewPage.tsx` doğrudan rotaya bağlı (`/tarpovizyon/turkey/overview`)

### 0.5 Netlify–Ana Uygulama Route Senkronizasyonu
- [x] `netlify-dashboard/src/App.tsx` ana uygulamayla eşitlendi:
	- `/tarpovizyon/overview` artık `/tarpovizyon/turkey/overview` redirect
	- `/tarpovizyon/turkey/plant-production` artık `TuikPlantProductionPage` (`ProductionPage` yerine)
	- `/tarpovizyon/turkey/tuik-plant` artık redirect
	- `/tarpovizyon/turkey/other-animal-products` route'u eklendi (sayfa dosyası zaten vardı, bağlanmayı unutmuşuz)

### 0.4 Güvenli Yedek Temizlik Listesi
- [x] `src/pages` altında silinmeye aday `.old` / `_old_*` / `_BACKUP` / `pre_orchestrator` envanteri çıkarıldı
- [x] Referans/import taraması sonrası listedeki batch güvenli biçimde silindi
- Tekil `_old_*` adayları:
	`BasinProductionPage_old_2432.tsx`, `GeographicalIndicationsPage_old_1341.tsx`, `GubreHesapPage_old_1016.tsx`, `HasatTahminiPage_old_1561.tsx`, `LivestockStocksPage_old_3410.tsx`, `OverviewPage_old_1062.tsx`, `ProductionPage_old_1319.tsx`, `SulamaPlanPage_old_1459.tsx`, `TarimTakvimPage_old_931.tsx`, `TuikLivestockPage_old_1268.tsx`, `TuikPlantCategoryPage_old_885.tsx`, `TurkeyAnimalProductionPage_old_1205.tsx`, `TurkeyBeekeepingPage_old_1365.tsx`, `TurkeyEggProductionPage_old_1884.tsx`, `TurkeyMilkProductionPage_old_2503.tsx`, `TurkeyProvincialLivestockPage_old_2291.tsx`, `TurkeyProvincialPlantPage_old_2105.tsx`, `TurkeyRedMeatProductionPage_old_1844.tsx`, `TurkeyWhiteMeatProductionPage_old_2393.tsx`
- `pre_orchestrator` adayları:
	`BasinProductionPage_pre_orchestrator.tsx`, `LivestockStocksPage_pre_orchestrator.tsx`
- Klasor bazli FAO klon yedekleri:
	`_backup_fao_clones/RedMeatProductionPage.tsx`, `_backup_fao_clones/WhiteMeatProductionPage.tsx`, `_backup_fao_clones/MilkProductionPage.tsx`, `_backup_fao_clones/EggProductionPage.tsx`, `_backup_fao_clones/OtherAnimalProductsPage.tsx`, `_backup_fao_clones/LivestockStocksPage_original.tsx`

---

## Faz 1 — Klon Eliminasyonu (En Yüksek Öncelik)

> **Problem:** 5 FAO hayvansal üretim sayfası birebir klon (~2.236 satır copy-paste)  
> **Çözüm:** TuikPlantCategoryPage modeli gibi tek bir temel bileşen

### 1.1 `FaoAnimalProductionPage.tsx` Oluştur (Yeni Baz Bileşen)
- [x] `RedMeatProductionPage`, `WhiteMeatProductionPage`, `MilkProductionPage`, `EggProductionPage`, `OtherAnimalProductsPage` ortak tabana taşındı
- [x] Props: `categoryKey`, `products[]`, `defaultProducts[]`, `colorPalette`, `title` (kod: `FaoPageConfig` — colors, products, defaultSelected, pageTitle, pageSubtitle, primaryColor, unit, kpiIcon, productPlaceholder)
- [x] Ortak import'lar: BarChart, PieChart, Treemap, RadarChart, ComposedChart, AreaChart, ProductSelector (kod: `FaoAnimalProductionPage.tsx` zaten tümünü içeriyor)
- [x] Her kategori için sadece config/ürün listesi farklı olan ince wrapper dosyaları bırakıldı

### 1.2 Wrapper Dosyalarını Dönüştür
- [x] `RedMeatProductionPage.tsx` ince wrapper
- [x] `WhiteMeatProductionPage.tsx` ince wrapper
- [x] `MilkProductionPage.tsx` ince wrapper
- [x] `EggProductionPage.tsx` ince wrapper
- [x] `OtherAnimalProductsPage.tsx` ince wrapper

### 1.3 Sonuç
- **Silinen kod:** ~2.100 satır
- **Eklenen kod:** ~500 satır (baz bileşen) + 5×30 satır (wrapper)
- **Net kazanç:** ~1.450 satır azalma, tek bakım noktası

---

## Faz 2 — Sankey Dağıtımı (Eksik Akış Diyagramları)

> **Revize Durum:** Sankey artık birden fazla yüzeyde mevcut. Eksik olan şey ilk dilimi başlatmak değil, tekrarlı kart yapısını ortaklaştırıp kalan sayfalara aynı desenle yaymak.

### 2.1 FoodBalancePage'e Sankey Ekle
- [x] Arz → İç tüketim / ihracat akışı mevcut
- [x] Sankey veri yapısı sayfa içinde kuruluyor
- [x] Mevcut trade sekmesinde akış diyagramı gösteriliyor
- [ ] Yıl seçici ile doğrudan akış varyasyonu daha görünür hale getirilebilir

### 2.2 ProductBalancePage'e Sankey Ekle
- [x] Üretim → Doğrudan tüketim / işleme / yem / tohum / kayıp-stok / ihracat akışı
- [x] Ürün bazlı Sankey (seçilen ürünün arz-kullanım akışı) mevcut

### 2.3 LandUsePage'e Sankey Ekle
- [x] Net yeniden dağılımı gösteren ilk türetilmiş Sankey dilimi eklendi (`2000→güncel`, dönüşüm havuzu modeli)
- [x] Hook seviyesinde daha anlamlı dönüşüm sinyal yüzeyi tasarlandı; toplam tarım ve sulama overlay'i dışarıda bırakılıp kayıp→kazanç yönlü model kuruldu
- [x] Açık crosswalk kural seti tanımlandı; dönüşüm sinyali artık kural tabanlı source→target eşlemesiyle üretiliyor
- [x] CSV override pipeline kuruldu; `public/data/land-use-transition-matrix.csv` varsa inline crosswalk bununla eziliyor
- [x] Statik CSV üstüne local admin import akışı eklendi; override dosyası sayfa içinden yüklenip temizlenebiliyor
- [ ] Arazi dönüşüm akışı: Orman → Tarım, Tarım → Kentsel, vb.
- [ ] "Arazi Dönüşümü" sekmesine yerleştir (zaten 6 sekme var, uygun yer mevcut)

### 2.4 TradePage (TradeOverviewTab)'a Sankey Ekle
- [x] İhracat akışı: Türkiye → Hedef ülkeler (top 10)
- [x] İthalat akışı: Kaynak ülkeler → Türkiye
- [x] Ürün grubu bazlı filtre

### 2.5 Ortak Sankey Kartı
- [x] `FlowSankeyCard` ortak bileşeni çıkarıldı
- [x] `FoodBalancePage`, `TradeOverviewTab` ve `ProductBalancePage` aynı ortak Sankey kartını kullanıyor

---

## Faz 3 — Harita Yükseltme (Statik Heatmap → İnteraktif Drill-Down)

> **Mevcut Durum:** TurkeyHeatMap bileşeni 10 sayfada kullanılıyor (OverviewPage, BasinProductionPage, GeographicalIndicationsPage, TurkeyProvincialPlantPage, TurkeyProvincialLivestockPage, LivestockStocksPage, TuikLivestockPage, TurkeyAnimalProductionPage, TurkeyWhiteMeatProductionPage, HasatTahminiPage). Harita "yok" değil — ama mevcut TurkeyHeatMap statik ve tek katmanlı: drill-down, marker, zoom, overlay desteği yok.  
> **Çözüm:** Mevcut TurkeyHeatMap'i interaktif katmana yükselt veya yanına Leaflet/react-simple-maps tabanlı drill-down bileşeni ekle

### 3.1 Mevcut TurkeyHeatMap Analizi
- [ ] TurkeyHeatMap bileşeninin kaynak kodunu incele — SVG tabanlı mı, canvas mı?
- [ ] Mevcut 10 kullanım noktasında hangi veriler aktarılıyor, tıklama handler'ı var mı?
- [ ] Karar: TurkeyHeatMap'i genişletmek mi, yanına yeni bileşen mi?

### 3.2 İnteraktif Katman Ekle
- [ ] Seçenek A: TurkeyHeatMap'e zoom + pan + il tıklama popup ekle (mevcut bileşeni genişlet)
- [ ] Seçenek B: `react-leaflet` veya `react-simple-maps` ile yeni `InteractiveMap` bileşeni oluştur
- [ ] Karar ver ve uygula

### 3.3 Drill-Down Özelliği Eklenecek Sayfalar
- [ ] **BasinProductionPage** — Havza sınırı overlay + havza tıkla → detay panel (zaten heatmap var, interaktiflik ekle)
- [ ] **SulamaPlanPage** — Sulama havzaları + su kaynakları marker'ları
- [ ] **GeographicalIndicationsPage** — Coğrafi işaret noktaları marker + tıkla → ürün detay (zaten heatmap var)
- [ ] **TurkeyProvincialLivestockPage** — İl tıkla → hayvan stoku detay drawer (zaten heatmap var, drill-down ekle)
- [ ] **TurkeyProvincialPlantPage** — İl tıkla → ürün üretim detay drawer (zaten heatmap var, drill-down ekle)

---

## Faz 4 — Sayfa Farklılaştırma (9 Türkiye Bitkisel Sayfası)

> **Mevcut Durum:** TuikPlantCategoryPage zaten zengin bir grafik seti barındırıyor: ComposedChart, ScatterChart, RadarChart, Treemap, PieChart ve çoklu BarChart (toplam 10 grafik tipi). Bazı wrapper'lar `showTreeMetrics` prop'u geçiriyor (FruitProductionPage, NutProductionPage, BeverageCropPage). Sorun grafik eksikliği değil — sorun 9 wrapper'ın kategoriye özel ek içerik alanının olmaması; hepsi aynı genel dashboard'u gösteriyor.

### 4.1 TuikPlantCategoryPage'e Kategori-Spesifik Bölüm Slot'u Ekle
- [x] `extraSection?: React.ReactNode` prop'u eklendi (kod: `plant/plantTypes.ts` + `TuikPlantCategoryPage.tsx`)
- [x] Her wrapper'dan kategori-özel içerik geçilebiliyor (kod: Cereal, Fruit, Vegetable, Legume, Oilseed, Sugar, Nut, Beverage, Fiber wrapper'ları `extraSection` gönderiyor)

### 4.2 Kategori Özelleştirmeleri
- [ ] **CerealProductionPage** → Verim trendi vurgulu (LineChart ön plana), dünya karşılaştırması ek bölüm
- [ ] **VegetableProductionPage** → Mevsimsellik takvimi ek bölüm (hangi sebze hangi ayda?)
- [ ] **FruitProductionPage** → Ağaç yaşı analizi (showTreeMetrics zaten var → öne çıkar, ağaç başı verim)
- [ ] **LegumeProductionPage** → Protein kaynağı karşılaştırma bölümü (baklagiller vs hayvansal)
- [ ] **OilseedProductionPage** → Yağ verimi karşılaştırma (ton tohum → litre yağ)
- [ ] **SugarCropProductionPage** → Şeker pancarı kampanya takvimi
- [ ] **NutProductionPage** → Ağaç başı verim + dış ticaret bağlantısı
- [ ] **BeverageCropPage** → Çay hasat takvimi + baharat ihracat verileri
- [ ] **FiberCropPage** → Pamuk lif kalitesi göstergeleri

---

## Faz 5 — Trade Intelligence Sekmeleri Derinleştirme

> **Mevcut Durum:** 6 trade sekmesinin hepsi aynı değil. TradeOverviewTab zaten Treemap + KPI strip içeriyor, PlantTradeTab Treemap kullanıyor, AnimalTradeTab PieChart kullanıyor. ProductIntelligenceTab ileri katmanları aldı; CountryIntelligenceTab için gerçek boşluk etkileşimli detay okumasıydı.

### 5.1 ProductIntelligenceTab İyileştir (Öncelikli)
- [x] **ScatterChart** mevcut — Fırsat matrisi (X: ihracat payı, Y: denge, Z: hacim)
- [x] **Treemap** mevcut — Ülke ihracat dağılımı katmanı
- [x] **RadarChart** mevcut — Ürün rekabet profili (hacim, büyüme, çeşitlilik, denge)

### 5.2 CountryIntelligenceTab İyileştir (Öncelikli)
- [x] **RadarChart** mevcut — Ülke çok boyutlu ticaret profili
- [x] **ScatterChart** mevcut — Ürün bazlı ihracat payı vs denge matrisi
- [x] Tablodan / scatter'dan / treemap'ten açılan ürün detay drawer eklendi
- [x] Drawer içine seçili ürün için yıl bazlı mini trend sparkline eklendi
- [x] Drawer içine seçili ürünün ülke içi pay değişimini gösteren ikinci mini sparkline eklendi

### 5.3 TradeOverviewTab'a Sankey Ekle
- [x] Bkz. Faz 2.4

### 5.5 WorldTradeMap Entegrasyonu (Yeni — Gözden Kaçmış Kaliteli Bileşen)
- [x] `src/components/WorldTradeMap.tsx` mevcut: d3-geo tabanlı, hover tooltip, ülke seçim, ihracat/ithalat/denge metrikleri, diverging palette
- [x] TradeOverviewTab içine ülke düzeyinde ihracat/ithalat/denge harita katmanı olarak yerleştir (`TradeOverviewTab.tsx` Dünya Ticaret Haritası bölümü, top10 exp+imp ülkeleri normalize/merge edilmiş, metric switcher)
- [ ] CountryIntelligenceTab içinde seçili ülkeyi vurgulayan harita görünümü
- [x] `public/world.geojson` dosyasının her iki dist'te de mevcut olduğunu doğrula (netlify-dashboard/public/world.geojson kopyalandı)

### 5.4 Plant vs Animal Trade İnce Ayarlar (Düşük Öncelik)
- [x] PlantTradeTab — aylık ihracat/ithalat AreaChart (mevsimsellik) zaten var (`PlantTradeTab.tsx:185`)
- [ ] AnimalTradeTab — canlı hayvan vs işlenmiş ürün ayrımını ayrı bir kart/segment olarak vurgulayan görünüm henüz yok; mevcut PieChart ürün dağılımı ölçeğinde kalıyor
- [ ] Not: Bu iki sekme ProductIntelligence/CountryIntelligence kadar acil değil

---

## Faz 6 — Devasa Dosya Decomposition

> **Problem:** 7 dosya toplam 13.230 satır, hiçbirinde component decomposition yok

### 6.1 LivestockStocksPage (3.410 satır) → Parçala
- [ ] `LivestockOverviewSection.tsx` — Genel bakış sekmesi
- [ ] `LivestockStocksSection.tsx` — Stok verileri sekmesi
- [ ] `LivestockPrimarySection.tsx` — Birincil üretim
- [ ] `LivestockProcessedSection.tsx` — İşlenmiş ürünler
- [ ] `LivestockEfficiencySection.tsx` — Verimlilik
- [ ] `LivestockPredictionsSection.tsx` — Tahminler
- [ ] Ana dosya: sadece sekme yönetimi + veri çekme (~200 satır)

### 6.2 BasinProductionPage (2.432 satır) → Parçala
- [ ] `BasinMapSection.tsx` — Harita + havza seçimi
- [ ] `BasinAnalysisSection.tsx` — Analiz grafikleri
- [ ] `BasinExportSection.tsx` — XLSX export logic'i ayrı util'e taşı

### 6.3 TurkeyRedMeatProductionPage (1.844 satır) → Parçala
- [ ] Sekme/bölüm bazlı alt bileşenlere ayır
- [ ] Karkas paritesi hesaplama logic'ini util'e taşı

### 6.4 HasatTahminiPage (1.561 satır) → Parçala
- [ ] Tahmin modeli logic'i → ayrı hook (`useHarvestForecast`)
- [ ] Harita bölümü → ayrı bileşen
- [ ] Hava durumu bölümü → zaten WeatherWidget var, iyi

### 6.5 SulamaPlanPage (1.459 satır) → Parçala
- [ ] İklim hesaplama logic'i → `useIrrigationCalc` hook
- [ ] Plan oluşturma UI → ayrı bileşen

### 6.6 Hedef
- Her dosya **max 500 satır**
- Logic ve UI ayrımı (custom hooks + bileşenler)

---

## Faz 7 — Intelligence Sayfaları İkinci Seviye Analitik Derinlik

> **Mevcut Durum:** Bu sayfalar boş değil — belirli bir analitik omurga taşıyorlar:  
> - CrossIntelligencePage: ComposedChart (çapraz zaman serisi), RadarChart (gıda güvenliği radarı), ScatterChart (üretim vs yeterlilik bubble) + otomatik insight üretimi  
> - LivestockCompetitionPage: ScatterChart (BCG rekabet pozisyon matrisi), RadarChart (Türkiye vs top 2 karşılaştırma), LineChart (üretim trendi), stacked BarChart + HHI hesaplama  
> **Eksik olan:** İkinci katman analitik derinlik — korelasyon matrisi, drill-down, segment bazlı decomposition, anomaly layer gibi zenginleştirmeler

### 7.1 CrossIntelligencePage (533 satır → ikinci katman ekle)
- [ ] **Korelasyon matrisi heatmap** ekle (ürün×ürün veya ürün×gösterge — mevcut ComposedChart'ı tamamlayıcı)
- [ ] **Anomali tespiti** görselleştirmesi (z-score bazlı outlier işaretleme — mevcut ScatterChart üzerine layer)
- [ ] **Drill-down** — Mevcut grafiklerde tıkla → detay modal/drawer
- [ ] **Segment decomposition** — Seçili göstergeyi alt kategorilere ayırma

### 7.2 LivestockCompetitionPage (ikinci katman ekle)
- [x] **Treemap** mevcut — Ülke pazar payı hiyerarşisi (`LivestockCompetitionPage.tsx:327`)
- [x] **HHI zaman serisi** mevcut — `LineChart` olarak zaman boyutunda (`LivestockCompetitionPage.tsx:362-392`)
- [ ] **Drill-down** — BCG matrisinde ülke tıkla → ürün bazlı detay drawer

### 7.3 ProductionPage "Rekabet Analizi" Sekmesi
- [ ] Mevcut durumu kontrol et, ScatterChart var — yeterli mi?
- [ ] RCA (Revealed Comparative Advantage) göstergeleri ekle

---

## Faz 8 — AI Asistan Grafik Üretimi

> **Problem:** AIAssistantPage'de Recharts import'u yok, sadece metin tabanlı sohbet

### 8.1 Dinamik Grafik Render Bileşeni
- [x] `DynamicChart.tsx` oluşturuldu — JSON config'den grafik render eden bileşen (`src/components/DynamicChart.tsx`)
- [x] Desteklenen tipler: BarChart, LineChart, AreaChart, PieChart, ComposedChart
- [x] AI cevabında ` ```chart-json ... ``` ` bloğu gelince otomatik render (`AIAssistantPage.tsx`, `MobileAIPage.tsx`)

### 8.2 AI Cevabına Grafik Entegrasyonu
- [x] Frontend: Markdown parser'a chart-json code block handler eklendi
- [x] Fallback: JSON parse hatalıysa metin olarak gösterim
- [ ] Backend: AI cevabına structured data (chart config) üretimini standartlaştırma (prompt sözleşmesi)

---

## Faz 9 — Eksik Grafik Tipleri

> **Problem:** Bazı sayfalarda veri tipine uygun olmayan grafik kullanılmış

### 9.1 SulamaPlanPage → Zenginleştir
- [x] **Gauge / RadialBarChart** — Su seviyesi göstergesi (`ResultsView.tsx:261`)
- [x] **AreaChart** — Yağış zaman serisi (aylık) (`ResultsView.tsx:301`)
- [x] **ComposedChart** — Bitki su ihtiyacı vs gerçek sulama (`ResultsView.tsx:336`)

### 9.2 GubreHesapPage → Zenginleştir
- [x] **RadarChart** — N-P-K profili (toprak analizi vs ideal) (`GubreStep4.tsx:85`)
- [ ] **ComposedChart** — Gübre maliyeti vs verim artışı (calc shape genişletilmesi gerekli)
- [x] **PieChart** — Gübre bileşen dağılımı (`GubreStep4.tsx:114`)

### 9.3 PriceIndexPage → Makas Grafiği Güçlendir
- [x] **ComposedChart** — TÜFE-GFE makası (bar + line overlapping) (`PriceIndexPage.tsx` — makas bölümü, fark Bar (kırmızı/yeşil) + endeks Line, dual y-axis, ReferenceLine y=0)
- [x] Mevcut anomali heatmap tablosu zaten iyi → korundu

### 9.4 TurkeyBeekeepingPage
- [x] Mevcut Treemap iyi → korundu
- [x] **RadarChart** — İl arıcılık profili (arıcı, üretim, verim normalize 0–100) (`BeekeepingProvincialSection.tsx:188`)

---

## Faz 10 — Mobil Deneyim Denetimi

### 10.1 Mobil Sayfaları İncele
- [ ] `MobileHomePage`, `MobileExplorePage`, `MobileMarketPage`, `MobileAIPage`, `MobileSettingsPage` → Recharts kullanımı ve responsive davranış denetle
- [ ] Mobil sayfalarda grafik var mı? Varsa responsive mi?
- [ ] Mevcut web sayfaları `ResponsiveContainer` kullanıyor mu? (evet — ama test gerekli)

---

## Öncelik Sıralaması

| Öncelik | Faz | Etki | Efor |
|:-------:|:---:|:----:|:----:|
| 🔴 P0 | Faz 0 — Temizlik | Düşük | Düşük |
| 🔴 P0 | Faz 1 — Klon eliminasyonu | Yüksek | Orta |
| 🟠 P1 | Faz 6 — Devasa dosya decomposition | Yüksek | Yüksek |
| 🟠 P1 | Faz 2 — Sankey dağıtımı | Yüksek | Orta |
| 🟡 P2 | Faz 5 — Trade intelligence sekmeleri | Orta | Orta |
| 🟡 P2 | Faz 7 — Intelligence ikinci katman analitik | Orta | Orta |
| 🟡 P2 | Faz 9 — Eksik grafik tipleri | Orta | Orta |
| 🔵 P3 | Faz 3 — Harita yükseltme (statik → interaktif) | Yüksek | Yüksek |
| 🔵 P3 | Faz 4 — 9 bitkisel sayfa farklılaştırma | Orta | Orta |
| 🔵 P3 | Faz 8 — AI grafik üretimi | Düşük | Yüksek |
| ⚪ P4 | Faz 10 — Mobil denetim | Düşük | Düşük |

---

## Beklenen Sonuç

| Metrik | Şimdi | Hedef |
|--------|:-----:|:-----:|
| Benzersiz sayfa deneyimi | ~15 | 50+ |
| Klon/tekrar sayfa | 14 | 0 |
| Sankey kullanan sayfa | 1 | 5 |
| İnteraktif drill-down harita olan sayfa | 0 (10 sayfada statik heatmap var) | 5+ |
| Max dosya boyutu (satır) | 3.410 | 500 |
| Copy-paste kod (satır) | ~2.236 | 0 |
| AI grafik üretimi | yok | var |
| Genel puan | 2.5/10 | 7+/10 |
