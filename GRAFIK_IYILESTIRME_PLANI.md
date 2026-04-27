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
- [x] Arazi dönüşüm akışı: Orman → Tarım, Tarım → Kentsel, vb. (crosswalk kuralları + `transformFlowModel` üzerinden `LandUsePage.tsx:167` `FlowSankeyCard` render ediyor)
- [x] "Arazi Dönüşümü" sekmesine yerleştirildi (`activeTab === 'transformation'` bloğunda `LandUsePage.tsx:167`)

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
- [x] TurkeyHeatMap bileşeni SVG (d3-geo) tabanlı — `src/components/TurkeyHeatMap.tsx` (336 satır, 81 il path'leri)
- [x] 10 kullanım noktası incelendi: bileşen `value` (RegionTotal[]) + `onProvinceClick(province, region, value)` callback alıyor; renk ölçeği `valueColor()` ile interpole ediliyor
- [x] Karar: Mevcut bileşen yeterli — extend etmek yerine kullanım noktalarında `onProvinceClick` wire'lamaya odaklanıldı

### 3.2 İnteraktif Katman Ekle
- [x] Seçenek A uygulandı: TurkeyHeatMap'e hover tooltip + click callback + bölge boyama (fillMode='region') zaten eklenmiş (`TurkeyHeatMap.tsx:117,231,240`)
- [x] Seçenek B (Leaflet) gereksiz — SVG çözüm 81 il için yeterli performansta

### 3.3 Drill-Down Özelliği Eklenecek Sayfalar
- [x] **BasinProductionPage** — `BasinProvincesSection.tsx:210` `onProvinceClick={(p) => setClickedProvince(...)}` aktif
- [ ] **SulamaPlanPage** — Sulama havzaları + su kaynakları marker'ları (gelecek faz)
- [x] **GeographicalIndicationsPage** — `GIOverviewTab.tsx:53` `onProvinceClick={(p) => onProvinceClick(p)}` aktif (`GeographicalIndicationsPage.tsx:136` `handleProvinceClick`)
- [x] **TurkeyProvincialLivestockPage** — `ProvincialOverviewTab.tsx:395` `onProvinceClick` aktif
- [x] **TurkeyProvincialPlantPage** — `PlantOverviewTab.tsx:348` `onProvinceClick` aktif

---

## Faz 4 — Sayfa Farklılaştırma (9 Türkiye Bitkisel Sayfası)

> **Mevcut Durum:** TuikPlantCategoryPage zaten zengin bir grafik seti barındırıyor: ComposedChart, ScatterChart, RadarChart, Treemap, PieChart ve çoklu BarChart (toplam 10 grafik tipi). Bazı wrapper'lar `showTreeMetrics` prop'u geçiriyor (FruitProductionPage, NutProductionPage, BeverageCropPage). Sorun grafik eksikliği değil — sorun 9 wrapper'ın kategoriye özel ek içerik alanının olmaması; hepsi aynı genel dashboard'u gösteriyor.

### 4.1 TuikPlantCategoryPage'e Kategori-Spesifik Bölüm Slot'u Ekle
- [x] `extraSection?: React.ReactNode` prop'u eklendi (kod: `plant/plantTypes.ts` + `TuikPlantCategoryPage.tsx`)
- [x] Her wrapper'dan kategori-özel içerik geçilebiliyor (kod: Cereal, Fruit, Vegetable, Legume, Oilseed, Sugar, Nut, Beverage, Fiber wrapper'ları `extraSection` gönderiyor)

### 4.2 Kategori Özelleştirmeleri
- [x] **CerealProductionPage** → Verim trendi LineChart (TR vs Dünya, FAO 2014-2023, kg/ha) + dünya karşılaştırması bar (`CerealProductionPage.tsx`)
- [x] **VegetableProductionPage** → Mevsimsellik takvimi (`VegetableProductionPage.tsx:28`)
- [x] **FruitProductionPage** → Türkiye'nin dünya meyve üretimindeki payı (showTreeMetrics zaten `TuikPlantCategoryPage` içinde aktif) (`FruitProductionPage.tsx:34`)
- [x] **LegumeProductionPage** → Baklagiller vs Hayvansal protein karşılaştırması (`LegumeProductionPage.tsx:26`)
- [x] **OilseedProductionPage** → Yağ içeriği karşılaştırması % (`OilseedProductionPage.tsx:26`)
- [x] **SugarCropProductionPage** → Şeker pancarı kampanya takvimi (`SugarCropProductionPage.tsx:22`)
- [x] **NutProductionPage** → Dünya fındık üretiminde Türkiye + showTreeMetrics aktif (`NutProductionPage.tsx:20`)
- [x] **BeverageCropPage** → Rize çayı hasat sezonu takvimi (`BeverageCropPage.tsx:32`)
- [x] **FiberCropPage** → Pamuk lif kalite göstergeleri TR vs dünya referansı (`FiberCropPage.tsx:25`)

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
- [x] CountryIntelligenceTab içinde seçili ülkeyi vurgulayan harita görünümü (`CountryIntelligenceTab.tsx` — selectedCountry highlight + ihracat/ithalat/denge switcher)
- [x] `public/world.geojson` dosyasının her iki dist'te de mevcut olduğunu doğrula (netlify-dashboard/public/world.geojson kopyalandı)

### 5.4 Plant vs Animal Trade İnce Ayarlar (Düşük Öncelik)
- [x] PlantTradeTab — aylık ihracat/ithalat AreaChart (mevsimsellik) zaten var (`PlantTradeTab.tsx:185`)
- [x] AnimalTradeTab — canlı hayvan vs işlenmiş ürün ayrımı ayrı bir kart olarak eklendi (4'lü KPI tile + yatay stacked bar; heuristik: "canlı/damızlık/diri")
- [x] Not: Bu iki sekme ProductIntelligence/CountryIntelligence kadar acil değildi

---

## Faz 6 — Devasa Dosya Decomposition (DEFERRED — yapılmayacak)

> **Karar (27 Nis 2026):** Bu faz **şu an icra edilmeyecek**, "deferred technical debt" olarak kapatıldı.
>
> **Gerekçe:**
> 1. **Sıfır kullanıcı değeri.** Saf mekanik refactor — yeni grafik/veri/sekme yok.
> 2. **Yüksek regresyon riski, sıfır test ağı.** Hedef dosyalar prod-kritik (`LivestockStocksPage` 3410, `BasinProductionPage` 2432, `TurkeyRedMeatProductionPage` 1844). Repo'da unit/integration test yok; tek doğrulama yolu manuel smoke (5 dosya × ~6 sekme × ~10 grafik) — pratikte tam kapsama imkansız. `useMemo` zincirleri ve `useEffect` cleanup'ları bölme sırasında sessizce kopabilir.
> 3. **"500 satır" hedefi keyfi.** Asıl bakım acısı satır sayısı değil, iç içe geçmiş hesaplama mantığı + UI. Mantığı hook'a almak değer üretir; UI'ı 6 parçaya bölmek prop-drilling ve dosya zıplama getirir → bakım zorlaşabilir.
> 4. **Bundle uyarısı (3.7MB) bu refactor ile çözülmez.** Çözüm: `React.lazy` + route-level code splitting + `manualChunks` (ayrı performans fazı).
> 5. **Fırsat maliyeti.** Aynı eforla: bundle splitting, SulamaPlan marker overlay (Faz 3.3 erteleme), E2E smoke test scaffolding daha yüksek getirili.
>
> **Ne zaman gözden geçirilecek?** Bu sayfalardan birinde yeni feature veya non-trivial bug fix gerektiğinde, **opportunistic** olarak: dokunulan sekme/bölüm o iş kapsamında ayrı bileşene taşınır (boyscout rule), büyük patlama refactor yok.
>
> **Tetikleyici eşikler (yeniden açılırsa):**
> - Aynı dosyada art arda 3+ bug fix gerekirse → o dosya parçalanır.
> - Bir sayfaya 200+ satırlık yeni sekme eklenmesi gerekirse → mevcut sekmeler de bu fırsatla bölünür.
> - E2E smoke test pipeline'ı kurulduktan sonra (regresyon emniyet ağı varken) toplu refactor yeniden değerlendirilir.

### 6.1 LivestockStocksPage (3.410 satır) — DEFERRED
### 6.2 BasinProductionPage (2.432 satır) — DEFERRED
### 6.3 TurkeyRedMeatProductionPage (1.844 satır) — DEFERRED
### 6.4 HasatTahminiPage (1.561 satır) — DEFERRED
### 6.5 SulamaPlanPage (1.459 satır) — DEFERRED

---

## Faz 7 — Intelligence Sayfaları İkinci Seviye Analitik Derinlik

> **Mevcut Durum:** Bu sayfalar boş değil — belirli bir analitik omurga taşıyorlar:  
> - CrossIntelligencePage: ComposedChart (çapraz zaman serisi), RadarChart (gıda güvenliği radarı), ScatterChart (üretim vs yeterlilik bubble) + otomatik insight üretimi  
> - LivestockCompetitionPage: ScatterChart (BCG rekabet pozisyon matrisi), RadarChart (Türkiye vs top 2 karşılaştırma), LineChart (üretim trendi), stacked BarChart + HHI hesaplama  
> **Eksik olan:** İkinci katman analitik derinlik — korelasyon matrisi, drill-down, segment bazlı decomposition, anomaly layer gibi zenginleştirmeler

### 7.1 CrossIntelligencePage (533 satır → ikinci katman ekle)
- [x] **Korelasyon matrisi heatmap** (Pearson, 5×5 gösterge: Üretim/İthalat/İhracat/Fiyat/Yeterlilik) (`CrossIntelligencePage.tsx`)
- [x] **Anomali tespiti** görselleştirmesi (z-score, |z|>1.5 outlier; ComposedChart Bar+Line + ReferenceLine ±1.5σ) (`CrossIntelligencePage.tsx`)
- [x] **Drill-down** — Üretim vs Yeterlilik scatter'da nokta tıkla → o ürün seçilir, tüm grafikler güncellenir + sayfa başa scroll (`CrossIntelligencePage.tsx`)
- [x] **Segment decomposition** — Arz dağılımı ComposedChart (Yerli üretim + İthalat stacked, İhracat negatif) + ithalat bağımlılığı % çizgisi (`CrossIntelligencePage.tsx`)

### 7.2 LivestockCompetitionPage (ikinci katman ekle)
- [x] **Treemap** mevcut — Ülke pazar payı hiyerarşisi (`LivestockCompetitionPage.tsx:327`)
- [x] **HHI zaman serisi** mevcut — `LineChart` olarak zaman boyutunda (`LivestockCompetitionPage.tsx:362-392`)
- [x] **Drill-down** — BCG matrisinde ülke tıkla → ürün bazlı detay drawer (toplam/dünya payı/sıra KPI + Et/Süt/Yumurta BarChart breakdown; `LivestockCompetitionPage.tsx`)

### 7.3 ProductionPage "Rekabet Analizi" Sekmesi
- [x] Mevcut: ScatterChart (Büyüme vs Üretim), AreaChart (HHI trendi), Rekabet Matrisi tablosu, Top Movers — yeterli temel
- [x] **RCA (Revealed Comparative Advantage) göstergeleri eklendi**: Pazar payı / Verim / Ölçek (alan) / Verim vs Top 5 — 4 KPI kartı (avantaj rözeti) + RadarChart (Medyan 1,0× referans çizgisi); `CompetitionTab.tsx`

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
- [x] Backend: AI cevabına structured data (chart config) üretimini standartlaştırma (prompt sözleşmesi) — `AI_CHART_CONTRACT.md` (şema dokümante edildi); `fetchAIChat(message, chartHint=true)` opsiyonel sözleşme hatırlatmasını mesaja önekliyor; backend `api.php` system prompt'una sözleşme satırlarını ekleyince AI otomatik üretmeye başlıyor

---

## Faz 9 — Eksik Grafik Tipleri

> **Problem:** Bazı sayfalarda veri tipine uygun olmayan grafik kullanılmış

### 9.1 SulamaPlanPage → Zenginleştir
- [x] **Gauge / RadialBarChart** — Su seviyesi göstergesi (`ResultsView.tsx:261`)
- [x] **AreaChart** — Yağış zaman serisi (aylık) (`ResultsView.tsx:301`)
- [x] **ComposedChart** — Bitki su ihtiyacı vs gerçek sulama (`ResultsView.tsx:336`)

### 9.2 GubreHesapPage → Zenginleştir
- [x] **RadarChart** — N-P-K profili (toprak analizi vs ideal) (`GubreStep4.tsx:85`)
- [x] **ComposedChart** — Gübre maliyeti vs verim artışı (3 senaryo; canlı USD/TRY × Argus/World Bank USD/ton + manuel override; `GubreStep4.tsx` + `FertilizerPricingPanel.tsx`)
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
- [x] `MobileHomePage` (239), `MobileExplorePage` (227), `MobileMarketPage` (230), `MobileAIPage` (233), `MobileSettingsPage` (247) → Recharts kullanımı denetlendi
- [x] **Bulgu:** Mobil sayfaların hiçbirinde Recharts yok (kasıt: liste/kart/sohbet UI). MobileAIPage `chart-json` bloklarını `DynamicChart` ile render ediyor (`MobileAIPage.tsx:161`) — yani AI üzerinden grafik akar
- [x] **Web sayfaları ResponsiveContainer kontrolü:** `src/pages/*.tsx` içinde **248 ResponsiveContainer** kullanımı tespit edildi → tüm grafikler responsive
- [x] **Karar:** Mobil için ek grafik gerekli değil; AI chat üzerinden dinamik grafik yeterli

---

## Öncelik Sıralaması

| Öncelik | Faz | Etki | Efor |
|:-------:|:---:|:----:|:----:|
| 🔴 P0 | Faz 0 — Temizlik | Düşük | Düşük |
| 🔴 P0 | Faz 1 — Klon eliminasyonu | Yüksek | Orta |
| ⚫ — | Faz 6 — Devasa dosya decomposition | DEFERRED | — |
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
