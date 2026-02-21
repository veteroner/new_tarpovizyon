# 🔍 DIŞ TİCARET İSTİHBARAT DÖNÜŞÜM PLANI

## 📋 MEVCUT DURUM ANALİZİ

### Veritabanı Gerçekleri
| Tablo | Satır Sayısı | Yıl Aralığı | Ürün Sayısı | Ülke Sayısı |
|-------|-------------|-------------|-------------|-------------|
| `tuik_ticaret_bitkisel` | 636,058 | 2000-2025 | 49 ürün | 240 ülke |
| `tuik_ticaret_hayvansal` | 136,218 | 2000-2025 | 26 ürün | 202 ülke |

### Kolonlar
```
id, duzey_1 (tüm/ülke), duzey_2 (ürün/alt ürün), duzey_3 (ay/yil),
ana_urun, yil, ay, alt_urunkod, alt_urun, ulkekod, ulke,
miktar_birim (KG/BAŞ/ADET/1000ADET), ihracat_mik, ithalat_mik,
deger_birim ($), ihracat_deger, ithalat_deger
```

### Kritik Filtre: `duzey` Boyutları
| duzey_1 | duzey_2 | duzey_3 | Kayıt Sayısı | Açıklama |
|---------|---------|---------|-------------|----------|
| tüm | ürün | yil | 1,256 | Yıllık toplam (ülke kırılımsız) |
| tüm | ürün | ay | 13,113 | Aylık toplam (ülke kırılımsız) |
| tüm | alt ürün | yil | 3,238 | Yıllık alt ürün detay |
| tüm | alt ürün | ay | 31,528 | Aylık alt ürün detay |
| ülke | alt ürün | yil | 103,314 | Ülke bazlı yıllık (EN BÜYÜK) |
| ülke | alt ürün | ay | 480,371 | Ülke bazlı aylık (EN BÜYÜK) |
| ülke | ürün | yil | 3,238 | Ülke bazlı yıllık ürün özet |

### 2024 Değerleri ($)
| Kategori | İhracat | İthalat | Denge |
|----------|---------|---------|-------|
| Bitkisel | $62.6B | $41.6B | +$21.0B |
| Hayvansal | $8.4B | $8.0B | +$0.4B |
| **TOPLAM** | **$71.0B** | **$49.6B** | **+$21.4B** |

---

## 🚨 KRİTİK BUGLAR (11 Sayfa, 7,960 Satır)

### BUG 1: YANLIŞ TABLO ADLARI (SAYFALAR VERİ GÖSTEREMİYOR)
```
❌ tuik_ticaret → MEVCUT DEĞİL (ist.tuik_ticaret doesn't exist)
❌ tuik_ticarethayvansal → MEVCUT DEĞİL (ist.tuik_ticarethayvansal doesn't exist)
✅ tuik_ticaret_bitkisel → 636,058 satır
✅ tuik_ticaret_hayvansal → 136,218 satır
```

**Etkilenen sayfalar:**
- `TradePage.tsx` → `tuik_ticaret` + `tuik_ticarethayvansal` kullanıyor → **$0 gösteriyor**
- `ExportPage.tsx` → Aynı yanlış tablolar → **$0 gösteriyor**
- `ImportPage.tsx` → Aynı yanlış tablolar → **$0 gösteriyor**
- `TuikPlantTradePage.tsx` → `tuik_ticaret` → **VERİ YOK**
- `TuikAnimalTradePage.tsx` → `tuik_ticarethayvansal` → **VERİ YOK**
- `api.ts` → `queries.plantExportDetail` → `tuik_ticaret` → **VERİ YOK**

**Doğru tablo kullanan sayfalar:**
- `TuikAnimalTradeProPage.tsx` → `tuik_ticaret_hayvansal` ✅
- `AnimalExportDetailPage.tsx` → `tuik_ticaret_hayvansal` (api.ts queries) ✅
- `AnimalImportDetailPage.tsx` → `tuik_ticaret_hayvansal` (api.ts queries) ✅

### BUG 2: BROKEN NAVİGASYON (4 Link)
```javascript
// ExportPage.tsx
navigate('/plant-export-detail')     → '/tarpovizyon/turkey/plant-export-detail'
navigate('/animal-export-detail')    → '/tarpovizyon/turkey/animal-export-detail'

// ImportPage.tsx  
navigate('/plant-import-detail')     → '/tarpovizyon/turkey/plant-import-detail'
navigate('/animal-import-detail')    → '/tarpovizyon/turkey/animal-import-detail'
```

### BUG 3: COPY-PASTE ETİKET HATALARI (12+ Hata)
| Sayfa | Yanlış | Doğru |
|-------|--------|-------|
| AnimalImportDetailPage | "Toplam İhracat Değeri" | "Toplam İthalat Değeri" |
| AnimalImportDetailPage | "İhracat yapılan" | "İthalat yapılan" |
| AnimalImportDetailPage | "İhracat başına" | "İthalat başına" |
| AnimalImportDetailPage | "İhraç Edilen" | "İthal Edilen" |
| AnimalImportDetailPage | "İhracat Yapılan Ülkeler" | "İthalat Yapılan Ülkeler" |
| AnimalImportDetailPage | "İhracat Değeri" (bar) | "İthalat Değeri" |
| AnimalImportDetailPage | "İhracat Trendi" | "İthalat Trendi" |
| AnimalImportDetailPage | "İhracat Değeri (B$)" | "İthalat Değeri (B$)" |
| AnimalImportDetailPage | Interface `ExportDetail` | `ImportDetail` |
| PlantImportDetailPage | "İhracat yapılan" | "İthalat yapılan" |
| PlantImportDetailPage | "İhracat Değeri" (bar legend) | "İthalat Değeri" |
| PlantImportDetailPage | "İhracat Değeri (B$)" | "İthalat Değeri (B$)" |

### BUG 4: `duzey` FİLTRELERİ EKSİK
Mevcut sayfalar `duzey_1`, `duzey_2`, `duzey_3` filtrelerini kullanmıyor → veri çoklanıyor (aynı veri hem 'tüm' hem 'ülke' satırlarından toplanıyor = YANLIŞ TOPLAMLAR)

### BUG 5: Dark Mode Bozuk
TuikPlantTradePage + TuikAnimalTradePage → `rgba(255,255,255,0.95)` hardcoded dropdown arka plan

---

## 📊 MEVCUT SAYFA KALİTE PUANLARI

| Sayfa | Satır | Puan | Durum |
|-------|-------|------|-------|
| TradePage.tsx | 355 | 2/10 | ❌ Yanlış tablo, $0 gösteriyor |
| ExportPage.tsx | 346 | 3/10 | ❌ Yanlış tablo + kırık linkler |
| ImportPage.tsx | 346 | 3/10 | ❌ Yanlış tablo + kırık linkler |
| TransportPage.tsx | 493 | 7/10 | ⚠️ Farklı kaynak (yct_20), iyi yapılmış |
| TuikPlantTradePage.tsx | 708 | 2/10 | ❌ Yanlış tablo adı |
| TuikAnimalTradePage.tsx | 817 | 2/10 | ❌ Yanlış tablo adı |
| TuikAnimalTradeProPage.tsx | 1,701 | 7/10 | ✅ Doğru tablo, en gelişmiş |
| PlantExportDetailPage.tsx | 723 | 2/10 | ❌ Yanlış tablo (api.ts) |
| PlantImportDetailPage.tsx | 682 | 2/10 | ❌ Yanlış tablo + etiket hataları |
| AnimalExportDetailPage.tsx | 720 | 6/10 | ✅ Doğru tablo |
| AnimalImportDetailPage.tsx | 720 | 1/10 | ❌ 12 hatalı etiket |
| **TOPLAM** | **7,611** | **3.4/10** | **FACIA** |

---

## 🎯 YENİ MİMARİ: TARIM İSTİHBARAT ARACI

### Yeni Tab Yapısı (TradePage.tsx — Ana Sayfa)

Mevcut 10 tab → **6 Akıllı Tab**:

| # | Tab | İçerik | Kaynak |
|---|-----|--------|--------|
| 1 | 🏠 **Genel Bakış** | KPI + Toplam Trend + Denge Analizi | bitkisel + hayvansal UNION |
| 2 | 🌿 **Bitkisel Ticaret** | Pro seviye bitkisel analiz | tuik_ticaret_bitkisel |
| 3 | 🐄 **Hayvansal Ticaret** | Pro seviye hayvansal analiz | tuik_ticaret_hayvansal |
| 4 | 🔍 **Ürün İstihbaratı** | Tek ürün derinlemesine analiz | Her iki tablo |
| 5 | 🌍 **Ülke İstihbaratı** | Tek ülke derinlemesine analiz | Her iki tablo |
| 6 | 🚛 **Ulaşım Modları** | Taşıma şekli analizi | yct_20 |

### Kaldırılacak Sayfalar
- ~~ExportPage.tsx~~ → Genel Bakış'a entegre
- ~~ImportPage.tsx~~ → Genel Bakış'a entegre
- ~~TuikPlantTradePage.tsx~~ → Bitkisel Ticaret tab'ına dönüşüyor
- ~~TuikAnimalTradePage.tsx~~ → Hayvansal Ticaret tab'ına dönüşüyor
- ~~PlantExportDetailPage.tsx~~ → Ürün İstihbaratı'na entegre
- ~~PlantImportDetailPage.tsx~~ → Ürün İstihbaratı'na entegre
- ~~AnimalExportDetailPage.tsx~~ → Ürün İstihbaratı'na entegre
- ~~AnimalImportDetailPage.tsx~~ → Ürün İstihbaratı'na entegre
- ~~TuikAnimalTradeProPage.tsx~~ → Hayvansal Ticaret tab'ına entegre (en iyi özellikleri alınacak)

### Korunacak sayfa
- **TransportPage.tsx** → Tab 6 olarak (zaten iyi çalışıyor)

---

## 🏗️ TAB DETAYLARI

### TAB 1: 🏠 Genel Bakış (TradeOverviewTab)
**KPI Kartları (6 adet)**
1. Toplam İhracat ($) — bitkisel + hayvansal
2. Toplam İthalat ($) — bitkisel + hayvansal
3. Dış Ticaret Dengesi = İhracat - İthalat
4. İhracat/İthalat Oranı (%)
5. Bitkisel/Hayvansal İhracat Payı
6. Yıllık Büyüme (YoY %)

**Grafikler**
- Aylık ihracat/ithalat trend (AreaChart, dual axis)
- Yıllık trend + denge çizgisi (ComposedChart: Bar + Line)
- Bitkisel vs Hayvansal dağılım (Treemap - 2 kategori altında ürünler)
- Top 10 ihracat ürünü (BarChart horizontal)
- Top 10 ithalat ürünü (BarChart horizontal)
- Top 10 ihracat ülkesi (BarChart)

**İstihbarat Paneli**
- Ticaret dengesi sinyali (fazla/açık + trend yönü)
- En hızlı büyüyen ihracat ürünü (YoY en yüksek)
- En çok artan ithalat kalemi (alarm)
- Ülke yoğunlaşma (HHI) — ilk 5 ülke payı

**Filtreler**
- Yıl dropdown (DB'den dinamik: 2000-2025)
- Aylık/Yıllık toggle

### TAB 2: 🌿 Bitkisel Ticaret (PlantTradeTab)
**KPI Kartları (4 adet)**
1. Bitkisel İhracat Toplam ($)
2. Bitkisel İthalat Toplam ($)
3. Bitkisel Ticaret Dengesi
4. Ürün Çeşitliliği (DISTINCT ana_urun)

**Grafikler**
- Yıllık ihracat/ithalat trend (ComposedChart)
- İhracat ürün dağılımı Treemap (tüm ürünler, büyüklük = deger)
- İthalat ürün dağılımı Treemap
- Top 10 ülke - ihracat (BarChart horizontal)
- Top 10 ülke - ithalat (BarChart horizontal)
- Ürün bazlı denge grafiği (ihracat vs ithalat yan yana, BarChart)

**İstihbarat Paneli**
- Net ihracatçı ürünler (ihracat > ithalat)
- Net ithalatçı ürünler (ithalat > ihracat) — alarm
- En yüksek birim fiyat ihracat ürünü
- En düşük birim fiyat ithalat ürünü
- Yoğunlaşma analizi: ilk ürünün payı vs geri kalan

**Filtreler**
- Yıl dropdown
- Ürün multi-select
- İhracat/İthalat/Her İkisi toggle

### TAB 3: 🐄 Hayvansal Ticaret (AnimalTradeTab)
**Aynı yapı (Tab 2 ile), farklı tablo**
- `tuik_ticaret_hayvansal` kaynaklı
- Birim dönüşüm desteği (BAŞ, ADET, 1000ADET, KG)
- TuikAnimalTradeProPage'den alınacak özellikler:
  - **Dünya Haritası** (World Choropleth Map)
  - **HHI Yoğunlaşma İndeksi**
  - **Akıllı Etiketler** (Kritik Partner, Stratejik Ortak)
  - **Risk Seviyeleri**

### TAB 4: 🔍 Ürün İstihbaratı (ProductIntelligenceTab)
**Akıllı ürün seçici** — 75 ürün (49 bitkisel + 26 hayvansal)
- Arama yapılabilir dropdown
- Kategori etiketleri (🌿 / 🐄)

**Seçilen ürün için:**

**KPI Kartları (6 adet)**
1. Toplam İhracat Değeri ($)
2. Toplam İthalat Değeri ($)
3. Ticaret Dengesi
4. İhracat yapılan ülke sayısı
5. Birim Fiyat ($/unit)
6. YoY Büyüme (%)

**Grafikler**
- Yıllık trend (2000-2025) — ihracat + ithalat (ComposedChart)
- Aylık seasonality grafiği (seçili yıl, AreaChart)
- Top ihracat ülkeleri (BarChart)
- Top ithalat ülkeleri (BarChart)
- Ülke bazlı birim fiyat karşılaştırma (BarChart)
- Yıllık miktar vs değer karşılaştırma (dual axis)

**İstihbarat**
- Partner çeşitliliği (kaç ülkeye ihracat?)
- Bağımlılık oranı (en büyük ülke payı)
- Birim fiyat trendi (artıyor mu azalıyor mu?)
- Ticaret dengesi trendi (kötüleşiyor mu?)
- Mevsimsellik analizi (en güçlü aylar)

### TAB 5: 🌍 Ülke İstihbaratı (CountryIntelligenceTab)
**Akıllı ülke seçici** — 240+ ülke
- Arama yapılabilir
- Son seçilenler pinned

**Seçilen ülke için:**

**KPI Kartları (6 adet)**
1. Toplam İhracat Bu Ülkeye ($)
2. Toplam İthalat Bu Ülkeden ($)
3. İkili Ticaret Dengesi
4. İhracat Ürün Çeşitliliği
5. İthalat Ürün Çeşitliliği
6. YoY Büyüme

**Grafikler**
- Yıllık trend (ComposedChart)
- Aylık detay (seçili yıl)
- İhracat ürün dağılımı Treemap
- İthalat ürün dağılımı Treemap
- Birim fiyat karşılaştırma (BarChart)
- Ürün sepeti değişimi (yıllar arası)

**İstihbarat**
- Bu ülkede güçlü olduğumuz ürünler
- Bu ülkeden çok ithal ettiğimiz ürünler
- Ticaret dengesi trendi
- İhracat potansiyeli: ihraç etmediğimiz ama edebileceğimiz ürünler

### TAB 6: 🚛 Ulaşım Modları (TransportTab)
- Mevcut TransportPage.tsx korunacak (iyi çalışıyor)
- Küçük iyileştirmeler yapılabilir

---

## 🏗️ TEKNİK MİMARİ

### Dosya Yapısı
```
src/pages/
  TradePage.tsx                    ← Ana sayfa (tab container + routing)
  trade/
    TradeOverviewTab.tsx           ← Tab 1
    PlantTradeTab.tsx              ← Tab 2
    AnimalTradeTab.tsx             ← Tab 3
    ProductIntelligenceTab.tsx     ← Tab 4
    CountryIntelligenceTab.tsx     ← Tab 5
    TransportTab.tsx               ← Tab 6 (TransportPage'den adapt)
    components/
      TradeKPICard.tsx             ← Özelleştirilmiş KPI kartı
      IntelligencePanel.tsx        ← İstihbarat paneli
      TradeTreemap.tsx             ← Ürün dağılımı treemap
      TradeTrendChart.tsx          ← Trend grafikleri
      SmartProductSelector.tsx     ← Akıllı ürün seçici
      SmartCountrySelector.tsx     ← Akıllı ülke seçici
      TradeBalanceIndicator.tsx    ← Denge göstergesi
      WorldTradeMap.tsx            ← TuikAnimalTradeProPage'den alınacak
```

### SQL Sorgu Stratejisi
**KURAL: Her sorgu `duzey_1` ve `duzey_3` filtresi İÇERMELİ**

```sql
-- Genel toplam (ülke kırılımsız, yıllık)
WHERE duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil'

-- Ülke bazlı (yıllık)
WHERE duzey_1 = 'ülke' AND duzey_3 = 'yil'

-- Aylık detay (ülke kırılımsız)
WHERE duzey_1 = 'tüm' AND duzey_3 = 'ay'

-- Ülke bazlı aylık (en detaylı)
WHERE duzey_1 = 'ülke' AND duzey_3 = 'ay'
```

### API Helpers (api.ts'ye eklenecek)
```typescript
// Doğru tablo adları sabitleri
export const TRADE_TABLES = {
  PLANT: 'tuik_ticaret_bitkisel',
  ANIMAL: 'tuik_ticaret_hayvansal',
} as const;

// Duzey filtre yardımcıları
export function duzeyFilter(level1: 'tüm' | 'ülke', level3: 'ay' | 'yil'): string {
  return `duzey_1 = '${level1}' AND duzey_3 = '${level3}'`;
}

// Kombinasyon sorgusu (bitkisel + hayvansal)
export function combinedTradeQuery(selectFields: string, whereExtra?: string): string {
  const where = whereExtra ? `AND ${whereExtra}` : '';
  return `
    SELECT ${selectFields} FROM (
      SELECT *, 'bitkisel' as kategori FROM tuik_ticaret_bitkisel 
      WHERE duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil' ${where}
      UNION ALL
      SELECT *, 'hayvansal' as kategori FROM tuik_ticaret_hayvansal 
      WHERE duzey_1 = 'tüm' AND duzey_2 = 'ürün' AND duzey_3 = 'yil' ${where}
    ) as combined
  `;
}
```

---

## 📋 UYGULAMA ADIMLARI

### Faz 1: Temel Düzeltmeler (Öncelik: ACİL)
- [ ] `api.ts`: `tuik_ticaret` → `tuik_ticaret_bitkisel` düzelt (tüm query'ler)
- [ ] `api.ts`: `tuik_ticarethayvansal` → `tuik_ticaret_hayvansal` düzelt
- [ ] `api.ts`: Tüm query'lere `duzey` filtresi ekle
- [ ] `api.ts`: TRADE_TABLES sabitleri ekle
- [ ] `api.ts`: duzeyFilter() helper ekle

### Faz 2: Ana Sayfa (TradePage.tsx) Yeniden Yazımı
- [ ] Yeni tab yapısını oluştur (6 tab)
- [ ] trade/ klasörü oluştur
- [ ] TradeOverviewTab.tsx yaz
- [ ] KPI kartları + trend grafikleri
- [ ] İstihbarat paneli

### Faz 3: Bitkisel & Hayvansal Tab'ları
- [ ] PlantTradeTab.tsx yaz
- [ ] AnimalTradeTab.tsx yaz (WorldTradeMap dahil)
- [ ] Treemap visualizations
- [ ] Smart filters (year, product, export/import toggle)

### Faz 4: İstihbarat Tab'ları
- [ ] ProductIntelligenceTab.tsx yaz
- [ ] CountryIntelligenceTab.tsx yaz
- [ ] SmartProductSelector bileşeni
- [ ] SmartCountrySelector bileşeni

### Faz 5: Temizlik
- [ ] TransportTab.tsx → TransportPage'den adapt
- [ ] Eski sayfaları kaldır (8 sayfa)
- [ ] App.tsx routing güncelle (tek /turkey/trade route)
- [ ] Sidebar.tsx güncelle
- [ ] Tüm copy-paste etiket hatalarını düzelt

---

## 🎨 UI/UX PRENSİPLERİ

1. **Intelligence-first**: Her tab'da üstte istihbarat paneli
2. **Treemap > PieChart**: Dağılım görselleştirmede treemap kullan
3. **ComposedChart**: Trend + denge birlikte göster
4. **Smart defaults**: Sayfa açılınca en güncel yıl seçili
5. **Cross-reference**: Ürün/ülke tıklandığında ilgili istihbarat tab'ına git
6. **Color coding**: 
   - Yeşil: ihracat fazlası / büyüme
   - Kırmızı: ithalat açığı / düşüş
   - Turuncu: uyarı / dikkat
7. **Loading states**: Skeleton loading yerine gerçek loading spinner
8. **Error states**: Sessiz hata yerine kullanıcıya bildirim

---

## ⏱️ TAHMİNİ SÜRE

| Faz | Süre |
|-----|------|
| Faz 1: Temel Düzeltmeler | İlk adım |
| Faz 2: Genel Bakış Tab | Ana yapı |
| Faz 3: Bitkisel & Hayvansal | Detay tabları |
| Faz 4: İstihbarat Tabları | Akıllı analiz |
| Faz 5: Temizlik | Son adım |

---

## 🏆 HEDEF

**Öncesi**: 11 sayfa, 7,960 satır, 6 tane farklı yanlış tablo adı, $0 gösteriyor
**Sonrası**: 1 tek akıllı sayfa, 6 tab, tüm veriler doğru, istihbarat panelleri, dünya haritası, treemap'ler, ülke/ürün derinlemesine analiz

**"Veri Görselleştirme Sitesi"** → **"Tarım İstihbarat Aracı"** 🎯
