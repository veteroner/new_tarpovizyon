# TarpoVizyon — Grafik & İçerik Dağılımı İyileştirme Planı

**Tarih:** 17 Nisan 2026  
**Temel:** SAYFA_VE_GRAFIK_ENVANTERI_v2.md denetim bulguları  
**Mevcut Durum:** 2.5/10 — Klon sayfalar, monolitik dosyalar, eksik akış diyagramları, statik haritalar  
**Not:** Bu plan kod denetimi sonrası revize edilmiştir. Eski envanter değil, doğrulanmış v2 envanter + doğrudan kod analizi baz alınmıştır.  
**Hedef:** Her sayfanın amacına uygun, benzersiz ve analitik derinliği olan bir deneyim sunması

---

## Faz 0 — Temizlik (Önkoşul)

### 0.1 Zombi Dosya Temizliği
- [ ] `TurkeyOtherAnimalProductsPage.tsx` → ya rotaya bağla (`/tarpovizyon/turkey/other-animal-products`) ya da sil
- [ ] Karar: Türkiye diğer hayvansal ürünler (su ürünleri, deri, yün, ipek) verisi TÜİK'te var mı? Varsa rota ver, yoksa sil

### 0.2 Duplikat Rota Temizliği
- [ ] `/tarpovizyon/turkey/tuik-plant` ve `/tarpovizyon/turkey/plant-production` aynı bileşene gidiyor → birini kaldır, diğerinden redirect yap

### 0.3 OverviewPage Rotası
- [ ] `OverviewPage.tsx` var ama doğrudan rotası yok → ya rota ver ya başka sayfaya entegre et ya sil

---

## Faz 1 — Klon Eliminasyonu (En Yüksek Öncelik)

> **Problem:** 5 FAO hayvansal üretim sayfası birebir klon (~2.236 satır copy-paste)  
> **Çözüm:** TuikPlantCategoryPage modeli gibi tek bir temel bileşen

### 1.1 `FaoAnimalProductionPage.tsx` Oluştur (Yeni Baz Bileşen)
- [ ] `RedMeatProductionPage`, `WhiteMeatProductionPage`, `MilkProductionPage`, `EggProductionPage`, `OtherAnimalProductsPage` → ortak yapıyı çıkar
- [ ] Props: `categoryKey`, `products[]`, `defaultProducts[]`, `colorPalette`, `title`
- [ ] Ortak import'lar: BarChart, PieChart, Treemap, RadarChart, ComposedChart, AreaChart, ProductSelector
- [ ] Her kategori için sadece config/ürün listesi farklı olan ince wrapper dosyaları bırak

### 1.2 Wrapper Dosyalarını Dönüştür
- [ ] `RedMeatProductionPage.tsx` → ~30 satırlık wrapper (ürün listesi + renk paleti)
- [ ] `WhiteMeatProductionPage.tsx` → ~30 satırlık wrapper
- [ ] `MilkProductionPage.tsx` → ~30 satırlık wrapper
- [ ] `EggProductionPage.tsx` → ~30 satırlık wrapper
- [ ] `OtherAnimalProductsPage.tsx` → ~30 satırlık wrapper

### 1.3 Sonuç
- **Silinen kod:** ~2.100 satır
- **Eklenen kod:** ~500 satır (baz bileşen) + 5×30 satır (wrapper)
- **Net kazanç:** ~1.450 satır azalma, tek bakım noktası

---

## Faz 2 — Sankey Dağıtımı (Eksik Akış Diyagramları)

> **Problem:** Sankey sadece 1 sayfada (TuikLivestockPage), akış gösterilmesi gereken 4+ sayfada yok

### 2.1 FoodBalancePage'e Sankey Ekle
- [ ] Arz → İç tüketim / İhracat / Stok akışı
- [ ] Veri yapısı: `{ nodes: [Üretim, İthalat, İç Tüketim, İhracat, Stok Değişimi, Kayıp], links: [...] }`
- [ ] Mevcut BarChart + AreaChart + ComposedChart'ın yanına 4. görselleştirme olarak ekle
- [ ] Yıl seçici ile dinamik akış

### 2.2 ProductBalancePage'e Sankey Ekle
- [ ] Üretim → İşleme / Doğrudan Tüketim / İhracat akışı
- [ ] Ürün bazlı Sankey (seçilen ürünün arz-kullanım akışı)

### 2.3 LandUsePage'e Sankey Ekle
- [ ] Arazi dönüşüm akışı: Orman → Tarım, Tarım → Kentsel, vb.
- [ ] "Arazi Dönüşümü" sekmesine yerleştir (zaten 6 sekme var, uygun yer mevcut)

### 2.4 TradePage (TradeOverviewTab)'a Sankey Ekle
- [ ] İhracat akışı: Türkiye → Hedef ülkeler (top 10)
- [ ] İthalat akışı: Kaynak ülkeler → Türkiye
- [ ] Ürün grubu bazlı filtre

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
- [ ] `extraSection?: React.ReactNode` prop'u ekle
- [ ] Her wrapper'dan kategori-özel içerik geçilebilsin

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

> **Mevcut Durum:** 6 trade sekmesinin hepsi aynı değil. TradeOverviewTab zaten Treemap + KPI strip içeriyor, PlantTradeTab Treemap kullanıyor, AnimalTradeTab PieChart kullanıyor. Asıl zayıf halka **ProductIntelligenceTab** ve **CountryIntelligenceTab**: bu ikisi sadece AreaChart + BarChart + ComposedChart ile sınırlı, Scatter/Radar/Treemap yok. Odak bu iki sekmeye verilmeli.

### 5.1 ProductIntelligenceTab İyileştir (Öncelikli)
- [ ] **ScatterChart** ekle — Fırsat matrisi (X: büyüme, Y: pazar payı, Z: hacim)
- [ ] **Treemap** ekle — Ürün hacim dağılımı
- [ ] **RadarChart** ekle — Ürün rekabet profili (fiyat, hacim, büyüme, çeşitlilik)

### 5.2 CountryIntelligenceTab İyileştir (Öncelikli)
- [ ] **RadarChart** ekle — Ülke çok boyutlu profili
- [ ] **ScatterChart** ekle — Büyüme-hacim dağılımı
- [ ] Ülke tıklanınca detay drawer (ticaret dengesi, ürün dağılımı)

### 5.3 TradeOverviewTab'a Sankey Ekle
- [ ] Bkz. Faz 2.4

### 5.4 Plant vs Animal Trade İnce Ayarlar (Düşük Öncelik)
- [ ] PlantTradeTab → zaten Treemap var; mevsimsellik grafiği ekle (aylık ihracat/ithalat dalgalanması)
- [ ] AnimalTradeTab → zaten PieChart var; canlı hayvan vs işlenmiş ürün ayrımını vurgula
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
- [ ] **Treemap** ekle — Ülke pazar payı hiyerarşisi (mevcut BCG ScatterChart'ı tamamlayıcı)
- [ ] **HHI zaman serisi** — Mevcut HHI hesaplama var, bunu LineChart olarak zaman boyutunda göster
- [ ] **Drill-down** — BCG matrisinde ülke tıkla → ürün bazlı detay drawer

### 7.3 ProductionPage "Rekabet Analizi" Sekmesi
- [ ] Mevcut durumu kontrol et, ScatterChart var — yeterli mi?
- [ ] RCA (Revealed Comparative Advantage) göstergeleri ekle

---

## Faz 8 — AI Asistan Grafik Üretimi

> **Problem:** AIAssistantPage'de Recharts import'u yok, sadece metin tabanlı sohbet

### 8.1 Dinamik Grafik Render Bileşeni
- [ ] `DynamicChart.tsx` oluştur — JSON config'den grafik render eden bileşen
- [ ] Desteklenen tipler: BarChart, LineChart, AreaChart, PieChart, ComposedChart
- [ ] AI cevabında ````chart-json ... ``` ` bloğu gelince otomatik render

### 8.2 AI Cevabına Grafik Entegrasyonu
- [ ] Backend: AI cevabına structured data (chart config) ekleme
- [ ] Frontend: Markdown parser'a chart-json code block handler ekle
- [ ] Fallback: JSON parse hatalıysa metin olarak göster

---

## Faz 9 — Eksik Grafik Tipleri

> **Problem:** Bazı sayfalarda veri tipine uygun olmayan grafik kullanılmış

### 9.1 SulamaPlanPage → Zenginleştir
- [ ] **Gauge / RadialBarChart** — Su seviyesi göstergesi
- [ ] **AreaChart** — Yağış zaman serisi (aylık)
- [ ] **ComposedChart** — Bitki su ihtiyacı vs gerçek sulama
- [ ] Mevcut tek BarChart → zengin dashboard'a dönüştür

### 9.2 GubreHesapPage → Zenginleştir
- [ ] **RadarChart** — N-P-K profili (toprak analizi vs ideal)
- [ ] **ComposedChart** — Gübre maliyeti vs verim artışı
- [ ] **PieChart** — Gübre bileşen dağılımı

### 9.3 PriceIndexPage → Makas Grafiği Güçlendir
- [ ] **ComposedChart** — TÜFE-GFE makası (bar + line overlapping)
- [ ] Mevcut anomali heatmap tablosu zaten iyi → koru

### 9.4 TurkeyBeekeepingPage
- [ ] Mevcut Treemap iyi → koru
- [ ] **RadarChart** ekle — İl arıcılık profili (kovan, verim, arıcı sayısı)

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
