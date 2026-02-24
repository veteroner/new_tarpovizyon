# 🧠 TARIM INTELLIGENCE TOOL — Acımasız Analiz & Dönüşüm Planı

## 📊 MEVCUT DURUM ANALİZİ (Acımasız)

### Şu An Ne Var: "Veri Görselleştirme Sitesi"
Mevcut sayfalar birer **veri görüntüleyici**. SQL sorgusu at → grafik çiz → bitti.  
**Intelligence YOK.** Karşılaştırma, korelasyon, skor, alarm, tahmin, strateji — hiçbiri yok.

### Sayfa Bazlı Acımasız Analiz

| Sayfa | Satır | Durum | Sorun |
|-------|-------|-------|-------|
| **LandUsePage** | 327 | ❌ Basit viewer | Yıl seç → bar chart. Trend yok, karşılaştırma yok, verimlilik analizi yok |
| **LandCoverPage** | 310 | ❌ Basit viewer | Aynı pattern. Ülke seç → pie chart. Değişim oranı yok |
| **FertilizerPage** | 320 | ❌ Basit viewer | İthalat/kullanım gösteriyor ama: Türkiye bağımlılık skoru yok, birim maliyet yok |
| **PesticidePage** | 329 | ❌ Basit viewer | Kullanım miktarı var ama: Verim korelasyonu yok, çevre etkisi yok |
| **AgriculturalEmployment** | 289 | ❌ Basit viewer | İstihdam var ama: Üretkenlik/kişi yok, sektör payı trendi yok |
| **FoodBalancePage** | 373 | ❌ Basit viewer | Gıda dengesi var ama: Kendine yeterlilik skoru yok, ithalat bağımlılığı yok |
| **PopulationPage** | 313 | ❌ Basit viewer | Nüfus → tarım nüfusu değişimi yok, kırsal göç etkisi yok |
| **ProductionPage** | 1313 | ⚠️ En İyi | Tab yapısı iyi (6 tab), CAGR/HHI/forecast var. AMA sadece bitkisel üretim |

### 🔴 Kritik Eksiklikler (Intelligence Yok)
1. **Cross-Data Korelasyon YOK** — Gübre kullanımı ↔ Verim ilişkisi gösterilmiyor
2. **Skor/Rating Sistemi YOK** — Ülkelere tarımsal performans skoru verilmiyor
3. **Alarm/Alert YOK** — "Türkiye'nin gübre ithalat bağımlılığı %87" gibi uyarılar yok
4. **Strateji Önerisi YOK** — "Bu ülke X ürününde avantajlı" gibi çıkarımlar yok
5. **Benchmark YOK** — Türkiye vs. Dünya ortalaması vs. En iyi ülke karşılaştırması yok
6. **Zaman Serisi Intelligence YOK** — Trend kırılmaları, anomali tespiti yok
7. **Kaynak Verimliliği YOK** — Arazi başına üretim, sulama verimi, girdi etkinliği yok
8. **Gıda Güvenliği Skoru YOK** — Kendine yeterlilik, ithalat bağımlılığı, stok durumu yok

---

## 🗄️ VERİTABANI KAYNAKLARI

### Mevcut FAO Tabloları
| Tablo | Kayıt | İçerik | Sütunlar |
|-------|-------|--------|----------|
| `fao_uretim_bitkisel_birincil` | 311K | Birincil bitkisel üretim | ulkead, urunad, urunkod, year, miktar_deger, miktar_birim, uretim_deger, uretim_birim, verim_deger, verim_birim |
| `fao_uretim_bitkisel_islenmis` | 55K | İşlenmiş bitkisel ürünler | ulkead, urunad, urunkod, year, miktar_deger, uretim_deger (miktar=NULL olabiliyor) |
| `fao_uretim_hayvansal_birincil` | — | Hayvansal üretim birincil | ulkead, urunad, year, uretim_deger, verim_deger |
| `fao_uretim_hayvansal_islenmis` | — | İşlenmiş hayvansal ürün | ulkead, urunad, year, uretim_deger |
| `fao_uretim_hayvansal_canlihayvan` | — | Canlı hayvan stokları | ulkead, urunad, year, deger |
| `fao_land_use` | — | Arazi kullanımı | area, item_tr, year, value, unit |
| `fao_land_cover` | — | Arazi örtüsü | area, item_tr, year, value |
| `fao_input_gubre_ticari` | — | Gübre ticareti/kullanımı | area, item_tr, element_tr, year, value |
| `fao_input_pestisit_use` | — | Pestisit kullanımı | area, item_tr, element_tr, year, value |
| `fao_nufus` | — | Dünya nüfusu | area, year, value |
| `fao_nufus_tarim_istihdam` | — | Tarım istihdamı | area, year, value |
| `fao_tarim_istihdam` | — | Tarımsal istihdam | area, item_tr, year, value |
| `fao_balans` | — | Gıda dengesi | area, item, element, year, value |
| `fao_livestock_primary` | — | Hayvancılık birincil | area, item, element, year, value |
| `fao_makro_*` | — | Makroekonomik veriler | area, year, value |

---

## 🎯 DÖNÜŞÜM PLANI: Veri Sitesi → Intelligence Tool

### FAZE 1: Kaynak & Çevre Intelligence (Mevcut Sayfaları Dönüştür)

#### 1.1 — `LandUsePage` → **Arazi Intelligence Dashboard**
**Mevcut:** Yıl seç, bar chart gör.  
**Hedef:** Akıllı arazi analiz motoru.

**Yeni Sekmeler:**
| Sekme | İçerik | SQL Kaynağı |
|-------|--------|-------------|
| 🌍 Genel Bakış | KPI kartları: Dünya tarım arazisi, değişim trendi, Türkiye payı, sıralama | `fao_land_use` |
| 📊 Arazi Dönüşüm | Yıllar arası arazi tipi değişimi (tarım→kentsel, orman→tarım) | `fao_land_use` yıllık diff hesaplama |
| 🏆 Ülke Sıralaması | Tarım arazisi/kişi, verimlilik/ha skoru, sürdürülebilirlik indeksi | `fao_land_use` + `fao_nufus` + `fao_uretim_bitkisel_birincil` |
| 🇹🇷 Türkiye Karşılaştırma | Türkiye vs. Top 10 + Dünya ort. Radar chart | Multi-table JOIN |
| 🔮 Trend & Tahmin | CAGR, lineer regresyon tahmin, anomali tespiti | `fao_land_use` zaman serisi |
| ⚠️ Intelligence Alerts | "Türkiye tarım arazisi son 20 yılda %X azaldı" | Hesaplamalı |

**Yeni KPI'lar:**
- Tarım arazisi/kişi (ha/kişi) — `fao_land_use` / `fao_nufus`
- Arazi verimliliği (ton/ha) — `fao_uretim_bitkisel_birincil` / `fao_land_use`
- Sulama oranı (%) — Sulama altyapılı / Tarım arazisi
- Nadas oranı (%) — Nadas / İşlenebilir arazi
- Arazi dönüşüm hızı — Yıllık tarım arazisi kaybı (1000 ha/yıl)

**Intelligence Insights (Otomatik):**
```
🔴 KRİTİK: Türkiye tarım arazisi 2000-2023 arası X milyon ha azaldı (-Y%)
⚠️ UYARI: Kentsel alan dönüşümü son 5 yılda Z% hızlandı  
🟢 POZİTİF: Sulama altyapısı oranı %A'dan %B'ye yükseldi
📊 BENCHMARK: Türkiye arazi verimliliği dünya ortalamasının %C üstünde/altında
```

#### 1.2 — `FertilizerPage` → **Gübre Intelligence Dashboard**
**Mevcut:** İthalat miktarı bar chart.  
**Hedef:** Girdi bağımlılık ve verimlilik analiz motoru.

**Yeni Sekmeler:**
| Sekme | İçerik |
|-------|--------|
| 🌍 Genel Bakış | Dünya gübre kullanımı, Türkiye payı, bağımlılık skoru |
| 💊 Bağımlılık Analizi | İthalat/kullanım oranı, tedarik zinciri riski, alternatif kaynaklar |
| 📈 Verim Korelasyonu | Gübre kullanımı ↔ Verim ilişkisi (scatter + regresyon) |
| 🏆 Etkinlik Sıralaması | Birim gübre başına üretim artışı — ülke sıralaması |
| 🇹🇷 Türkiye Profili | Gübre tüketim profili, ithalat kaynakları, stratejik analiz |
| ⚠️ Alerts | Fiyat riskleri, tedarik kesintisi uyarıları |

**Cross-Intelligence:**
- `fao_input_gubre_ticari` (gübre kullanım) × `fao_uretim_bitkisel_birincil` (verim) → **Gübre Etkinlik Skoru**
- `fao_input_gubre_ticari` İthalat / Kullanım → **Bağımlılık İndeksi**
- Gübre/ha × Verim/ha → **Girdi Verimliliği Matrisi**

#### 1.3 — `PesticidePage` → **Pestisit Intelligence Dashboard**
**Aynı pattern:** Cross-data korelasyon + bağımlılık + verimlilik.

**Ek Intelligence:**
- Pestisit kullanımı/ha vs. Verim/ha (azalan getiri noktası analizi)
- Organik tarım potansiyeli skoru
- Çevre yükü endeksi (kg/ha pestisit)

#### 1.4 — `FoodBalancePage` → **Gıda Güvenliği Intelligence**
**Mevcut:** Basit gıda dengesi tablosu.  
**Hedef:** Gıda güvenliği erken uyarı sistemi.

**Yeni Intelligence:**
- **Kendine Yeterlilik Skoru** — Üretim / (Üretim + İthalat - İhracat) × 100
- **İthalat Bağımlılığı Haritası** — Ürün bazlı bağımlılık renk skalası
- **Gıda Stok Günü** — Mevcut stok / Günlük tüketim
- **Kalori Güvenliği** — Kişi başı kalori arzı vs. WHO standardı
- **Fiyat Hassasiyeti** — İthalata bağımlı ürünlerde döviz kuru etkisi

#### 1.5 — `AgriculturalEmploymentPage` → **Tarım İşgücü Intelligence**
**Yeni Intelligence:**
- **İşgücü Verimliliği** — Tarımsal GDP / Tarım istihdamı
- **Mekanizasyon Endeksi** — İşgücü azalması vs. Üretim artışı korelasyonu
- **Kırsal Göç Etkisi** — Tarım istihdamı düşüşü ↔ Kentsel nüfus artışı
- **Karşılaştırmalı Verimlilik** — Türkiye vs. AB vs. ABD tarım işçisi başına üretim

#### 1.6 — `PopulationPage` → **Nüfus & Gıda Talebi Intelligence**
**Yeni Intelligence:**
- **Gıda Talep Projeksiyonu** — Nüfus artışı × Kişi başı tüketim trendi
- **Tarımsal Nüfus Payı** — Azalma hızı ve mekanizasyon ihtiyacı
- **Kişi Başı Arazi** — Nüfus artışı vs. Tarım arazisi kaybı

---

### FAZE 2: Cross-Intelligence Motoru (Yeni Sayfa)

#### 2.1 — `ResourceIntelligencePage` (YENİ)
Tüm "Kaynak ve Çevre" verilerini birleştiren ana intelligence sayfası.

**Cross-Korelasyon Matrisi:**
```
Gübre Kullanımı  ←→  Verim
Pestisit         ←→  Verim
Sulama Oranı     ←→  Verim
Arazi/Kişi       ←→  Kendine Yeterlilik
İstihdam Payı    ←→  Mekanizasyon
Nüfus Büyümesi   ←→  Arazi Baskısı
```

**Ülke Profil Kartı:**
Her ülke için tek bakışta:
- 🏗️ Arazi Skoru (0-100)
- 🧪 Girdi Etkinliği (0-100)
- 🌾 Üretim Performansı (0-100)
- 🛡️ Gıda Güvenliği (0-100)
- 👷 İşgücü Verimliliği (0-100)
- **Toplam Tarım Intelligence Skoru** — Ağırlıklı ortalama

**Türkiye Derinlemesine:**
- SWOT Analizi (otomatik oluşturulmuş)
- Kritik bağımlılıklar radar chart
- Stratejik öneriler (veri bazlı)

---

### FAZE 3: Hayvansal Intelligence Entegrasyonu

Mevcut hayvansal üretim sayfaları da aynı intelligence pattern'ine dönüştürülecek:
- Hayvancılık Girdi Analizi (Yem maliyeti vs. Üretim)
- Hayvansal Gıda Güvenliği (Et/süt kendine yeterlilik)
- Karbon Ayak İzi Intelligence (Hayvancılık çevre etkisi)

---

## 🔧 TEKNİK UYGULAMA PLANI

### Adım 1: Intelligence Utility Fonksiyonları (`src/utils/intelligenceCalculations.ts`)
```typescript
// Cross-data intelligence hesaplamaları
calculateCorrelation(xValues, yValues) → { r, rSquared, pValue, equation }
calculateSelfSufficiency(production, imports, exports) → score
calculateDependencyIndex(imports, consumption) → { index, risk_level }
calculateLandProductivity(production, land_area) → ton_per_ha
calculateInputEfficiency(input_amount, yield_value) → efficiency_score
calculateFoodSecurity(supply, demand, stock) → { score, days_of_stock }
generateInsights(data, thresholds) → Insight[]
generateSWOT(countryData) → { strengths, weaknesses, opportunities, threats }
benchmarkCountry(country, worldData) → { percentile, rank, gap }
```

### Adım 2: Intelligence KPI Bileşeni (`src/components/IntelligenceKPI.tsx`)
- Skor göstergesi (0-100 gauge)
- Risk seviyesi badge (Kritik/Yüksek/Orta/Düşük)
- Trend ok (↑↓→) + yüzde
- Benchmark bar (Türkiye pozisyonu dünya dağılımında)

### Adım 3: Intelligence Alert Bileşeni (`src/components/IntelligenceAlert.tsx`)
- Otomatik insight oluşturma (veri bazlı)
- Severity bazlı renklendirme
- İlişkili veri referansları

### Adım 4: Sayfa Dönüşümleri (Sırasıyla)
1. `LandUsePage` → Arazi Intelligence (en basit, en az bağımlılık)
2. `FertilizerPage` → Gübre Intelligence (cross-data ile)
3. `PesticidePage` → Pestisit Intelligence
4. `FoodBalancePage` → Gıda Güvenliği Intelligence
5. `AgriculturalEmploymentPage` → İşgücü Intelligence
6. `PopulationPage` → Nüfus & Talep Intelligence
7. **YENİ:** `ResourceIntelligencePage` → Birleşik Intelligence Dashboard

### Adım 5: Navigation Güncelleme
```
Kaynak ve Çevre → Kaynak Intelligence
  ├── 🧠 Kaynak Intelligence (YENİ — birleşik dashboard)
  ├── 🌍 Arazi Intelligence
  ├── 💊 Gübre Intelligence  
  ├── 🧪 Pestisit Intelligence
  ├── 🛡️ Gıda Güvenliği
  ├── 👷 İşgücü Intelligence
  └── 📈 Nüfus & Talep
```

---

## ⏱️ UYGULAMA ÖNCELİK SIRASI

| Sıra | İş | Tahmini | Etki |
|------|----|---------|------|
| 1 | `intelligenceCalculations.ts` utility | Temel | 🔥🔥🔥🔥🔥 (Tüm sayfalar kullanacak) |
| 2 | `IntelligenceKPI` + `IntelligenceAlert` bileşenleri | Temel | 🔥🔥🔥🔥 |
| 3 | `LandUsePage` dönüşümü (6 tab + intelligence) | Büyük | 🔥🔥🔥🔥🔥 |
| 4 | `FertilizerPage` dönüşümü (cross-data korelasyon) | Büyük | 🔥🔥🔥🔥 |
| 5 | `PesticidePage` dönüşümü | Orta | 🔥🔥🔥 |
| 6 | `FoodBalancePage` dönüşümü | Büyük | 🔥🔥🔥🔥🔥 |
| 7 | `AgriculturalEmploymentPage` dönüşümü | Orta | 🔥🔥🔥 |
| 8 | `PopulationPage` dönüşümü | Orta | 🔥🔥🔥 |
| 9 | `ResourceIntelligencePage` (YENİ birleşik) | Çok büyük | 🔥🔥🔥🔥🔥 |

---

## 📐 HER SAYFA İÇİN STANDART INTELLIGENCE PATTERN

Her intelligence sayfası şu yapıyı takip edecek:

```
┌─────────────────────────────────────────────┐
│ 🧠 [ALAN] Intelligence Dashboard           │
│ Otomatik analiz motoru — son güncelleme: X  │
├─────────────────────────────────────────────┤
│ [Tab1] [Tab2] [Tab3] [Tab4] [Tab5] [Tab6]  │
├─────────────────────────────────────────────┤
│ ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐   │
│ │Score  │ │Trend  │ │Rank   │ │Alert  │   │
│ │  87   │ │ +3.2% │ │ #12   │ │ ⚠️ 3  │   │
│ └───────┘ └───────┘ └───────┘ └───────┘   │
├─────────────────────────────────────────────┤
│ ┌─Intelligence Alerts─────────────────────┐ │
│ │ 🔴 Kritik: Arazi kaybı hızlanıyor      │ │
│ │ ⚠️ Uyarı: Gübre bağımlılığı %87        │ │
│ │ 🟢 Pozitif: Verim artışı %5.2          │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ ┌─Main Charts──────┐ ┌─Cross Analysis────┐ │
│ │                   │ │                   │ │
│ │  Ana Görselleştirme│ │ Korelasyon/Scatter│ │
│ │  (Line/Bar/Area)  │ │ veya Radar        │ │
│ └───────────────────┘ └───────────────────┘ │
├─────────────────────────────────────────────┤
│ ┌─Benchmark Table───────────────────────────┐│
│ │ Ülke | Skor | Trend | Rank | vs Türkiye  ││
│ │ ...  | ...  | ...   | ...  | ...         ││
│ └───────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 🚀 BAŞLANGIÇ: Adım 1'den başla

İlk yapılacak: `intelligenceCalculations.ts` → ardından `LandUsePage` dönüşümü.
