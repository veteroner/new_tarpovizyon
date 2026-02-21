# 🌾 BİTKİSEL ÜRETİM INTELLIGENCE BRUTAL TRANSFORMATION PLAN

## Mevcut Durum Analizi

### Sayfa: `src/pages/ProductionPage.tsx` (595 satır)
- **Route:** `/tarpovizyon/world/production`
- **Veri Kaynağı:** TÜİK `tuik_bitkisel_uretim` (yurtiçi il bazlı)
- **Durum:** ❌ Temel veri görselleştirme sitesi — 0 intelligence

### Mevcut Sorunlar
1. **TÜİK domestic data only** — dünya karşılaştırması yok
2. **4 KPI kartı** basit tekrar (Toplam üretim 2x gösteriliyor!)  
3. **4 basit chart** — PieChart, BarChart, AreaChart, BarChart
4. **0 CAGR, 0 HHI, 0 volatilite, 0 anomali, 0 tahmin**
5. **0 verim analizi** — FAO'da verim datası (kg/ha) var ama kullanılmıyor
6. **0 rekabet analizi** — Türkiye'nin dünya sıralaması yok
7. **0 insight** — otomatik içgörü sistemi yok

---

## FAO Veri Tabanı

### `fao_uretim_bitkisel_birincil` — 311,105 satır
| Kolon | İçerik | Birim |
|-------|--------|-------|
| ulkekod/ulkead | 232 ülke | - |
| urunkod/urunad | 161 ürün | - |
| year | 2000-2024 | - |
| miktar_deger | Ekim alanı | ha (hektar) |
| uretim_deger | Üretim miktarı | t (ton) |
| verim_deger | Verim | kg/ha |

**Türkiye: 98 ürün** — Sugar beet (25M ton), Wheat (22M), Tomatoes (13.3M), Barley (9.2M), Maize (9M), Potatoes (5.7M), Apples (4.6M), Grapes (3.4M)...

### `fao_uretim_bitkisel_islenmis` — 55,643 satır
| Kolon | İçerik | Birim |
|-------|--------|-------|
| ulkekod/ulkead | 227 ülke | - |
| urunkod/urunad | 24 ürün | - |
| year | 2000-2023 | - |
| uretim_deger | Üretim miktarı | t (ton) |
| miktar/verim | NULL | - |

**İşlenmiş ürünler:** Beer, Coconut oil, Cotton lint/seed/oil, Tea, Groundnut oil, Margarine, Molasses, Linseed oil, Maize oil, Palm oil/kernels, Rapeseed oil, Sugar, Safflower oil, Soya bean oil, Sunflower oil, Wine, Olive oil, Sesame oil

---

## EXCLUDED_AREAS (FAO sorgu filtresi)
```sql
NOT IN ('World','Africa','Americas','Asia','Europe','Oceania',
'Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa',
'Northern America','Central America','Caribbean','South America',
'Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia',
'Eastern Europe','Northern Europe','Southern Europe','Western Europe',
'Australia and New Zealand','Melanesia','Micronesia','Polynesia',
'Least Developed Countries','Land Locked Developing Countries',
'Small Island Developing States','Low Income Food Deficit Countries',
'Net Food Importing Developing Countries','European Union (27)',
'China, mainland','China, Taiwan Province of')
```

---

## Hedef Mimari: 6 Intelligence Tab

### Tab 1: 🌍 Genel Bakış (Overview)
**Veri:** birincil + islenmis cross-summary
- **8 KPI Kartı:**
  - Dünya toplam birincil üretim (ton) + YoY
  - Dünya toplam ekim alanı (ha) + YoY  
  - Dünya ortalama verim (kg/ha) + YoY
  - Türkiye toplam üretim + dünya sıralaması
  - Türkiye ekim alanı + dünya sıralaması
  - Türkiye ortalama verim + dünya sıralaması
  - İşlenmiş toplam (ton) + işlenme oranı
  - Birincil→İşlenmiş dönüşüm oranı
- **InsightCard:** Otomatik 8-12 cross-tab insight
- **Supply Chain Flow:** Birincil → İşleme → İşlenmiş akış grafiği
- **Cross-Tab Navigation Hub:** 5 tıklanabilir kart (her tab'a link)
- **Mini World Map:** Top 10 üretici ülke highlight

### Tab 2: 🌾 Birincil Üretim (Primary)
**Veri:** `fao_uretim_bitkisel_birincil`
- **Ürün Seçici:** Dropdown — wheat, maize, barley, tomatoes, grapes...
- **KPI Kartları:** Dünya üretimi, Türkiye üretimi, Türkiye sırası, CAGR, Volatilite
- **InsightCard:** Ürün-bazlı 5-8 insight
- **Top 15 Üretici Tablo:** Ülke | Üretim | Pay% | CAGR | Trend sparkline | Türkiye highlight
- **Trend Chart:** 2000-2024 LineChart — dünya top 5 + Türkiye (dashed)
- **Pazar Konsantrasyonu:** HHI gauge + top3/top5 pay donut
- **Anomali Tespit:** Spike/drop banner year bazında
- **Forecast:** 3 yıl lineer tahmin

### Tab 3: 🏭 İşlenmiş Üretim (Processed)
**Veri:** `fao_uretim_bitkisel_islenmis`
- **Ürün Seçici:** 24 processed product dropdown
- **KPI Kartları:** Dünya üretimi, Türkiye üretimi, Türkiye sırası, CAGR  
- **Top 15 Üretici Tablo:** Same layout as birincil
- **Trend Chart:** 2000-2023 LineChart
- **Katma Değer Analizi:** Birincil→İşlenmiş dönüşüm oranı (cotton->cotton lint, sugar beet->sugar)
- **InsightCard:** İşleme kapasitesi, dönüşüm oranı insights

### Tab 4: 📊 Verim Analizi (Yield Intelligence)
**Veri:** `fao_uretim_bitkisel_birincil` (verim_deger, kg/ha)
- **Ürün Seçici:** Dropdown
- **KPI Kartları:** Dünya ort verim, Türkiye verimi, Global rank, verim açığı (gap)
- **Gap Analizi:** Türkiye vs Lider ülke vs Dünya ortalaması — bar chart
- **Verim Scatter Plot:** X=Ekim alanı, Y=Verim — Türkiye nokta highlight
- **Segmented Chart:** Gelişmiş vs Gelişmekte vs Türkiye verim karşılaştırma
- **Trend Chart:** 15+ yıl verim trendi — dünya avg + Türkiye
- **Best Practices Tablosu:** Top 10 verimli ülke + Türkiye satırı
- **Catch-up Calculator:** Türkiye mevcut CAGR ile lidere kaç yılda yetişir?

### Tab 5: ⚔️ Rekabet Analizi (Competition)
**Veri:** birincil cross-country
- **Ürün Seçici:** Dropdown
- **Top Movers:** Son 5 yılda en çok büyüyen/gerileyen ülkeler
- **Market Share Treemap:** Ülke bazlı pazar payı
- **CAGR Bubble Chart:** X=CAGR, Y=Üretim, Size=Ekim alanı — Türkiye highlight
- **Rekabet Matrisi:** Türkiye'nin 5 ana rakibi — üretim, verim, alan karşılaştırma
- **HHI Timeline:** 2000-2024 konsantrasyon değişimi
- **InsightCard:** Rekabet bazlı insights

### Tab 6: 🔮 Tahminler & Projeksiyonlar (Predictions)
**Veri:** birincil time series
- **Ürün Seçici:** Dropdown  
- **Türkiye Üretim Tahmini:** 3 yıl lineer forecast + confidence bands
- **Dünya Üretim Tahmini:** 3 yıl forecast
- **Verim Tahmini:** verim trend extrapolation
- **Ekim Alanı Tahmini:** ha trend
- **Senaryo Analizi:** Mevcut trend vs optimistik vs kötümser
- **InsightCard:** Tahmin bazlı insights

---

## Sprint Plan

### Sprint 1: Altyapı + Overview Tab (~800 satır)
1. Tüm importları ekle (recharts genişlet, InsightCard, calculations)
2. Tab sistemi ekle (type Tab = 'overview' | 'primary' | 'processed' | 'yield' | 'competition' | 'predictions')
3. State değişkenleri (her tab için ayrı data state'leri)
4. EXCLUDED_AREAS constant
5. `loadOverviewData()` — 4-5 paralel SQL sorgusu
6. Overview JSX — 8 KPI + InsightCard + Supply Chain + Navigation Hub

### Sprint 2: Birincil Üretim Tab (~600 satır)
1. `loadPrimaryData()` — 4-5 SQL (top countries, trends, Turkey rank, HHI)
2. Ürün dropdown state + handler
3. Top 15 üretici tablosu + Türkiye highlight
4. Trend LineChart (top 5 + Turkey)
5. HHI gauge + market concentration
6. InsightCard + anomali banner

### Sprint 3: İşlenmiş Üretim Tab (~500 satır)
1. `loadProcessedData()` — 3-4 SQL
2. Ürün dropdown state
3. Top 15 tablosu
4. Trend chart
5. Katma değer analizi (dönüşüm oranı)
6. InsightCard

### Sprint 4: Verim Intelligence Tab (~600 satır)
1. `loadYieldData()` — 4-5 SQL (verim, alan, gap analysis)
2. KPI kartları (verim rank, gap)
3. Gap analizi bar chart
4. Verim scatter plot
5. Segmented chart
6. Best practices tablosu + catch-up calculator
7. InsightCard

### Sprint 5: Rekabet Analizi Tab (~500 satır)
1. `loadCompetitionData()` — 4-5 SQL
2. Top movers
3. CAGR bubble chart / treemap
4. Rekabet matrisi
5. HHI timeline
6. InsightCard

### Sprint 6: Tahminler Tab + Final (~500 satır)
1. `loadPredictionsData()` — 3-4 SQL
2. Forecast charts (üretim, verim, alan)
3. Senaryo analizi
4. InsightCard
5. Final error check + netlify-dashboard sync

---

## Utility Functions (livestockCalculations.ts'den hazır)
- `calculateCAGR()` ✅
- `calculateHHI()` ✅
- `calculateVolatility()` ✅
- `detectAnomalies()` ✅
- `forecastLinear()` ✅
- `findTopMovers()` ✅
- `calculatePercentile()` ✅
- `formatMetric()` ✅
- `calculateYoY()` ✅

## Crop Category Classification (yeni utility)
```typescript
const CROP_CATEGORIES = {
  CEREALS: ['Wheat', 'Barley', 'Maize (corn)', 'Rice', 'Oats', 'Rye', 'Sorghum', 'Millet'],
  FRUITS: ['Apples', 'Grapes', 'Oranges', 'Bananas', 'Watermelons', 'Tangerines', 'Lemons', 'Figs', 'Apricots', 'Cherries', 'Peaches'],
  VEGETABLES: ['Tomatoes', 'Potatoes', 'Onions', 'Cucumbers', 'Cabbages', 'Eggplants', 'Chillies and peppers'],
  OILSEEDS: ['Sunflower seed', 'Soybeans', 'Rapeseed', 'Groundnuts', 'Sesame seed', 'Linseed'],
  INDUSTRIAL: ['Sugar beet', 'Cotton', 'Tea', 'Tobacco', 'Cotton lint'],
  PULSES: ['Chick peas', 'Lentils', 'Beans', 'Broad beans'],
  NUTS: ['Hazelnuts', 'Almonds', 'Walnuts', 'Pistachios', 'Chestnuts']
};
```

## Tahmini Final Boyut
- **Mevcut:** 595 satır
- **Hedef:** ~3,500-4,000 satır (6 intelligence tab)
- **Gidişat:** Veri Görselleştirme → Tarım Intelligence Tool

## Renk Paleti
```
Primary Green: #10b981 / #059669
Wheat Gold: #f59e0b / #d97706
Earth Brown: #92400e / #78350f
Water Blue: #3b82f6 / #2563eb
Berry Red: #ef4444 / #dc2626
Purple: #a855f7 / #7c3aed
Turkey Highlight: #ff6b35 (turuncu)
```
