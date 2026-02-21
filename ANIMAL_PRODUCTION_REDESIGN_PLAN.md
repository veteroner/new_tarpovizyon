# 🐄 Hayvansal Üretim Dashboard - Yeniden Tasarım Planı

## 📋 Genel Bakış
"Hayvansal Üretim Dashboard (2023)" sayfasını modern ve profesyonel bir dashboard'a dönüştürme planı. Mevcut harita korunacak, ancak yeni veri kaynaklarıyla güncellenecek.

---

## 🗄️ Veri Kaynakları

### 1. **oner_hayvansal_urun_uretimi** (Tarihsel Trendler)
- **Dönem**: 1961-2024 (65 yıllık veri)
- **Kolonlar**:
  - `yillar`: Yıl bilgisi
  - `bal_uretimi`: Bal üretimi (ton)
  - `cig_sut_uretimi`: Çiğ süt üretimi (ton)
  - `kirmizi_et_uretimi`: Kırmızı et üretimi (ton)
  - `yumurta_milyon_adet`: Yumurta üretimi (milyon adet)
  - `kanatli_eti_ton`: Kanatlı eti üretimi (ton)

### 2. **oner_dunya_hayvansal_uretim_miktarla** (Dünya Karşılaştırması)
- **Veri**: 1324 satır, 100+ ülke
- **Kolonlar**:
  - `ulke`: Ülke adı
  - `urun`: Ürün adı (Sığır Eti, Tavuk eti, Keçi eti, Koyun eti, vb.)
  - `uretim_miktari_ton`: Üretim miktarı (ton)
- **Türkiye'nin dünya sıralaması için kullanılacak**

### 3. **oner_kirmizi_et_uretimi** (Detaylı Kırmızı Et)
- **Dönem**: 2010-2024 (15 yıl)
- **Kolonlar**:
  - `yil`: Yıl
  - `sigir`: Sığır eti (ton)
  - `manda`: Manda eti (ton)
  - `buyukbas_toplam`: Büyükbaş toplam (ton)
  - `koyun`: Koyun eti (ton)
  - `keci`: Keçi eti (ton)
  - `kucukbas_toplam`: Küçükbaş toplam (ton)
  - `toplam`: Toplam kırmızı et (ton)

### 4. **oner_kanatli_uretimleri** (Aylık Kanatlı Üretimi)
- **Dönem**: 2010-2026 (196 aylık veri)
- **Kolonlar**:
  - `tarih`: Ay-yıl
  - `tavuk_yumurtasi_bin_adet`: Tavuk yumurtası (bin adet)
  - `tavuk_eti_ton`: Tavuk eti (ton)

### 5. **o_illeregore_toplam_hayvan_sayisi** (Mevcut İl Bazlı Veri - HARİTA İÇİN)
- **Kullanım**: İl bazlı harita görselleştirmesi için korunacak
- **Güncelleme**: Veri kaynağı sorgusu güncellenecek

---

## 🎨 Sayfa Yapısı (8 Ana Bölüm)

### **1. Hero Section - KPI Kartları**
**4 Adet Gradient KPI Card**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 🥩 Toplam    │ 🥛 Toplam    │ 🍳 Toplam    │ 🐝 Toplam    │
│ Kırmızı Et   │ Süt Üretimi  │ Yumurta      │ Bal Üretimi  │
│ 1.89M ton    │ 25.1M ton    │ 22.4B adet   │ 125K ton     │
│ ↑ +4.2% YoY  │ ↑ +2.8% YoY  │ ↑ +3.1% YoY  │ ↑ +5.6% YoY  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Renkler**: 
  - Kırmızı Et: `#ef4444` → `#dc2626` (red gradient)
  - Süt: `#3b82f6` → `#2563eb` (blue gradient)
  - Yumurta: `#fbbf24` → `#f59e0b` (yellow gradient)
  - Bal: `#f59e0b` → `#d97706` (orange gradient)
- **Veri**: `oner_hayvansal_urun_uretimi` (son 2 yıl karşılaştırması)

---

### **2. Tarihsel Üretim Trendi (1961-2024)**
**Çok Dönemli Alan Grafiği (Multi-line Area Chart)**

```
📈 Hayvansal Ürün Üretim Trendleri (1961-2024)
┌────────────────────────────────────────────────────────┐
│                                                        │
│  🥛 Çiğ Süt (en üstte, mavi)                         │
│  🍳 Yumurta (sarı)                                     │
│  🥩 Kırmızı Et (kırmızı)                              │
│  🍗 Kanatlı Eti (yeşil)                               │
│  🍯 Bal (turuncu, en altta)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- **Grafik Tipi**: ComposedChart (Area + Line)
- **Yükseklik**: 400px
- **Grid**: 2 kolon (span 2)
- **Filtre**: Son 10 yıl / Son 20 yıl / Tüm Veri (1961-2024)
- **Tooltip**: Detaylı bilgi (ton, adet, yıllık değişim)

---

### **3. Kırmızı Et Analizi (2010-2024)**
**3 Alt Grafik**

#### 3A. **Kırmızı Et Türlerine Göre Dağılım (Stacked Bar)**
```
📊 Kırmızı Et Türleri (Son 5 Yıl)
┌──────────────────────────────────────┐
│ 2024 ████████████████ (1.89M ton)   │
│ 2023 ████████████████                │
│ 2022 ███████████████                 │
│ 2021 ██████████████                  │
│ 2020 █████████████                   │
└──────────────────────────────────────┘
```
- **Stack Katmanları**: Sığır (en büyük), Koyun, Keçi, Manda
- **Renkler**: Sığır (#8b4513), Koyun (#a0522d), Keçi (#d2691e), Manda (#654321)

#### 3B. **Büyükbaş vs Küçükbaş Trend (Area Chart)**
```
🐂 Büyükbaş vs Küçükbaş Karşılaştırması
┌──────────────────────────────────────┐
│   Büyükbaş (1.5M ton) - Mavi alan   │
│   Küçükbaş (389K ton) - Turuncu     │
└──────────────────────────────────────┘
```

#### 3C. **Yıllık Büyüme Oranı (Bar Chart)**
```
📈 Yıllık Büyüme Oranları (%)
┌──────────────────────────────────────┐
│ 2024: +5.2% ████                     │
│ 2023: +4.1% ███                      │
│ 2022: +3.8% ███                      │
└──────────────────────────────────────┘
```

---

### **4. Kanatlı Ürün Üretimi**
**2 Alt Grafik (Aylık Detay)**

#### 4A. **Tavuk Eti Üretimi - Son 24 Ay (Area Chart)**
```
🍗 Tavuk Eti Üretimi (Aylık Trend)
┌──────────────────────────────────────┐
│  Mevsimsel dalgalanmalar görünür     │
│  Ortalama: 220K ton/ay               │
└──────────────────────────────────────┘
```
- **Veri**: `oner_kanatli_uretimleri` (son 24 ay)
- **Renk**: `#10b981` (yeşil)

#### 4B. **Yumurta Üretimi - Son 24 Ay (Composed Chart)**
```
🥚 Yumurta Üretimi (Aylık Trend)
┌──────────────────────────────────────┐
│  Alan grafiği + Ortalama çizgisi     │
│  Ortalama: 1.9B adet/ay              │
└──────────────────────────────────────┘
```
- **Renk**: `#fbbf24` (sarı)
- **Ortalama çizgisi**: `#f59e0b` (koyu sarı)

---

### **5. Ürün Dağılımı & Karşılaştırma**
**2 Pie Chart + 1 Radar Chart**

#### 5A. **Ürün Kategorisi Dağılımı (Pie Chart)**
```
🥧 2024 Toplam Hayvansal Üretim Dağılımı
┌──────────────────────────────────────┐
│  🥛 Süt: 54.2%                       │
│  🥩 Kırmızı Et: 4.1%                 │
│  🍗 Kanatlı Et: 5.7%                 │
│  🥚 Yumurta: 35.8%                   │
│  🍯 Bal: 0.3%                        │
└──────────────────────────────────────┘
```
- **Inner Radius**: 60px, **Outer Radius**: 110px
- **Label**: Yüzde + emoji

#### 5B. **Kırmızı Et Alt Dağılımı (Donut Chart)**
```
🥩 Kırmızı Et Türleri (2024)
┌──────────────────────────────────────┐
│  Sığır: 75.2%                        │
│  Koyun: 14.1%                        │
│  Keçi: 8.9%                          │
│  Manda: 1.8%                         │
└──────────────────────────────────────┘
```

#### 5C. **Besin Değeri Radar (Radar Chart)**
```
🎯 Hayvansal Protein Kaynaklarının Besin Profili
┌──────────────────────────────────────┐
│      Protein                         │
│    /        \                        │
│ Kalsiyum -- Demir                    │
│    \        /                        │
│      Yağ                             │
└──────────────────────────────────────┘
```
- **Eksenler**: Protein, Yağ, Kalsiyum, Demir, Vitamin
- **Kategoriler**: Süt, Et, Yumurta, Tavuk

---

### **6. Dünya Sıralaması & Karşılaştırma**
**3 Horizontal Bar Chart**

#### 6A. **Sığır Eti - Dünya Top 10**
```
🌍 Dünya Sığır Eti Üreticileri (Top 10)
┌──────────────────────────────────────┐
│ 1. ABD         ██████████ (12.5M t) │
│ 2. Brezilya    ████████ (10.2M t)   │
│ 3. Çin         ███████ (7.1M t)     │
│ ...                                  │
│ 8. Türkiye     ████ (1.42M t) 🇹🇷   │
└──────────────────────────────────────┘
```
- **Veri**: `oner_dunya_hayvansal_uretim_miktarla`
- **Türkiye vurgusu**: Bayrak emoji + renkli bar

#### 6B. **Süt Üretimi - Dünya Top 10**
```
🌍 Dünya Süt Üreticileri (Top 10)
┌──────────────────────────────────────┐
│ 1. Hindistan   ██████████           │
│ 2. ABD         █████████            │
│ 3. Pakistan    ██████               │
│ ...                                  │
│ 6. Türkiye     █████ (25.1M t) 🇹🇷  │
└──────────────────────────────────────┘
```

#### 6C. **Tavuk Eti - Dünya Top 10**
```
🌍 Dünya Tavuk Eti Üreticileri (Top 10)
┌──────────────────────────────────────┐
│ 1. ABD         ██████████           │
│ 2. Çin         █████████            │
│ 3. Brezilya    ████████             │
│ ...                                  │
│ 5. Türkiye     ████ (2.6M t) 🇹🇷    │
└──────────────────────────────────────┘
```

---

### **7. İl Bazlı Harita (KORUNACAK - Veri Kaynağı Güncellenecek)**
**Turkey HeatMap Component**

```
🗺️ İl Bazlı Toplam Hayvan Sayısı Dağılımı
┌────────────────────────────────────────────────────────┐
│                                                        │
│    [Mevcut TurkeyHeatMap komponenti]                  │
│    - Veri kaynağı güncellenecek                       │
│    - Görsel tasarım aynı kalacak                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Güncelleme Detayları**:
- **Mevcut Query**: `SELECT * FROM ist.o_illeregore_toplam_hayvan_sayisi`
- **Yeni Query**: Aynı tablo, ama daha optimize edilmiş sorgu
- **MapData Hesaplaması**: Bölge bazında toplam hayvan sayısı (Sığır + Manda + Koyun + Keçi)
- **Renklendirme**: Gradient scale (açık → koyu)
- **Tooltip**: İl adı, toplam hayvan sayısı, bölge bilgisi

---

### **8. Veri Tablosu & İnteraktif Filtreler**
**Detaylı Tablo + CSV Export**

```
📊 Detaylı Üretim Verileri
┌─────┬──────────┬───────┬──────┬─────────┬────────┐
│ Yıl │ Kırmızı  │ Süt   │ Yum. │ Kanatlı │ Bal    │
│     │ Et (ton) │ (ton) │ (M)  │ (ton)   │ (ton)  │
├─────┼──────────┼───────┼──────┼─────────┼────────┤
│2024 │ 1,890K   │ 25.1M │ 22.4 │ 2,640K  │ 125K   │
│2023 │ 1,810K   │ 24.4M │ 21.7 │ 2,560K  │ 118K   │
│2022 │ 1,740K   │ 23.8M │ 21.1 │ 2,480K  │ 112K   │
└─────┴──────────┴───────┴──────┴─────────┴────────┘

[📥 CSV İndir] [📊 Excel] [🖨️ PDF]
```

**Filtreler**:
- **Yıl Aralığı**: Slider (1961-2024)
- **Ürün Seçimi**: Multi-select dropdown
- **Görünüm**: Tablo / Grafik Toggle

---

## 🎨 Tasarım Özellikleri

### **Renk Paleti**
```
Kırmızı Et:   #ef4444, #dc2626, #b91c1c
Süt Ürünleri: #3b82f6, #2563eb, #1d4ed8
Yumurta:      #fbbf24, #f59e0b, #d97706
Kanatlı:      #10b981, #059669, #047857
Bal:          #f59e0b, #d97706, #b45309
Neutral:      #6b7280, #4b5563, #374151
```

### **Tipografi**
- **Başlıklar**: Font-weight 800, 1.75rem - 2.5rem
- **KPI Değerleri**: Font-weight 900, 2.2rem - 2.8rem
- **Açıklamalar**: Font-weight 400, 0.95rem
- **Font Family**: System fonts (inherit)

### **Bileşenler**
- **KPI Cards**: Gradient background, shadow, emoji icons
- **Charts**: Recharts library (Area, Bar, Pie, Radar, Composed)
- **Grid**: `display: grid`, responsive (auto-fit, minmax)
- **Border Radius**: 12px - 16px (modern, yumuşak köşeler)
- **Animations**: Smooth transitions (0.3s ease-in)

---

## 📊 Veri İşleme Mantığı

### **1. Tarihsel Trend Hesaplaması**
```typescript
// Son yıl vs bir önceki yıl karşılaştırması
const latestYear = data[data.length - 1];
const previousYear = data[data.length - 2];
const yoyChange = ((latest - previous) / previous) * 100;
```

### **2. Dünya Sıralaması**
```typescript
// Türkiye'nin dünya sıralamasını bul
const worldData = fetchQuery("oner_dunya_hayvansal_uretim_miktarla");
const sortedCountries = worldData
  .filter(d => d.urun === "Sığır Eti (Manda Hariç)")
  .sort((a, b) => b.uretim_miktari_ton - a.uretim_miktari_ton);
const turkeyRank = sortedCountries.findIndex(c => c.ulke === "Türkiye") + 1;
```

### **3. Aylık Ortalama Hesaplaması**
```typescript
// Kanatlı üretimi - son 12 ay ortalaması
const last12Months = data.slice(-12);
const avgMonthlyProduction = last12Months.reduce((sum, d) => sum + d.tavuk_eti_ton, 0) / 12;
```

### **4. Harita Veri Agregasyonu**
```typescript
// Bölge bazında toplama (mevcut mantık korunacak)
const regionMap = new Map<string, number>();
filteredData.forEach(item => {
  const region = getRegionByProvince(item.il);
  const itemTotal = item.sigir + item.manda + item.koyun + item.keci;
  regionMap.set(region, (regionMap.get(region) || 0) + itemTotal);
});
```

---

## 🔧 Teknik Uygulama

### **1. State Yönetimi**
```typescript
const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
const [worldData, setWorldData] = useState<WorldData[]>([]);
const [redMeatData, setRedMeatData] = useState<RedMeatData[]>([]);
const [poultryData, setPoultryData] = useState<PoultryData[]>([]);
const [mapData, setMapData] = useState<CityData[]>([]);
const [selectedYear, setSelectedYear] = useState<string>('all');
const [loading, setLoading] = useState(false);
```

### **2. Data Fetching**
```typescript
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const [historical, world, redMeat, poultry, cityData] = await Promise.all([
      fetchQuery("SELECT * FROM oner_hayvansal_urun_uretimi ORDER BY yillar"),
      fetchQuery("SELECT * FROM oner_dunya_hayvansal_uretim_miktarla"),
      fetchQuery("SELECT * FROM oner_kirmizi_et_uretimi ORDER BY yil"),
      fetchQuery("SELECT * FROM oner_kanatli_uretimleri WHERE tarih >= DATE_SUB(NOW(), INTERVAL 24 MONTH)"),
      fetchQuery("SELECT * FROM o_illeregore_toplam_hayvan_sayisi")
    ]);
    
    setHistoricalData(historical.data);
    setWorldData(world.data);
    setRedMeatData(redMeat.data);
    setPoultryData(poultry.data);
    setMapData(processMapData(cityData.data));
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
  } finally {
    setLoading(false);
  }
}, []);
```

### **3. Memoization (Performance)**
```typescript
const totalRedMeat = useMemo(() => 
  historicalData[historicalData.length - 1]?.kirmizi_et_uretimi || 0,
  [historicalData]
);

const turkeyRank = useMemo(() => {
  const filtered = worldData.filter(d => d.urun === "Sığır Eti (Manda Hariç)");
  return filtered.findIndex(d => d.ulke === "Türkiye") + 1;
}, [worldData]);
```

---

## 📦 Bileşen Yapısı

```
TurkeyAnimalProductionPage.tsx (800-1000 satır)
├── Imports (React, Recharts, Lucide Icons, Utils)
├── Interfaces (TypeScript type definitions)
├── Component
│   ├── State Management
│   ├── Data Fetching (useCallback)
│   ├── Memoized Calculations (useMemo)
│   │   ├── KPI calculations
│   │   ├── Chart data preparation
│   │   ├── World rankings
│   │   └── Map data aggregation
│   ├── Helper Functions
│   │   ├── formatValue (number formatter)
│   │   ├── formatShort (K, M abbreviations)
│   │   └── exportCSV
│   └── JSX Return
│       ├── Header (title + export button)
│       ├── Hero KPI Cards (4 gradient cards)
│       ├── Historical Trends (multi-line area chart)
│       ├── Red Meat Analysis (3 charts)
│       ├── Poultry Production (2 charts)
│       ├── Product Distribution (2 pie + 1 radar)
│       ├── World Rankings (3 horizontal bars)
│       ├── Map Visualization (TurkeyHeatMap)
│       ├── Data Table (interactive table + export)
│       └── Custom Styles
└── Export default
```

---

## ✅ Kontrol Listesi

### Veri Katmanı
- [ ] `oner_hayvansal_urun_uretimi` tablosu sorgusu yazıldı
- [ ] `oner_dunya_hayvansal_uretim_miktarla` sorgusu yazıldı
- [ ] `oner_kirmizi_et_uretimi` sorgusu yazıldı
- [ ] `oner_kanatli_uretimleri` sorgusu yazıldı
- [ ] Harita verisi sorgusu güncellendi

### Hesaplamalar
- [ ] YoY (Year-over-Year) büyüme hesaplandı
- [ ] Dünya sıralaması hesaplandı
- [ ] Aylık ortalamalar hesaplandı
- [ ] Bölge agregasyonu yapıldı

### Görselleştirme
- [ ] 4 Hero KPI kartı eklendi
- [ ] Tarihsel trend grafiği (5 ürün)
- [ ] Kırmızı et analizi (3 grafik)
- [ ] Kanatlı üretim grafikleri (2 grafik)
- [ ] Ürün dağılımı (3 grafik)
- [ ] Dünya karşılaştırması (3 grafik)
- [ ] Harita korundu ve güncellendi
- [ ] İnteraktif tablo eklendi

### Tasarım
- [ ] Gradient KPI kartları tasarlandı
- [ ] Renk paleti uygulandı
- [ ] Responsive grid sistemi çalışıyor
- [ ] Animasyonlar eklendi
- [ ] Export fonksiyonları çalışıyor

### Test
- [ ] Tüm veriler doğru yükleniyor
- [ ] Grafikler düzgün render ediliyor
- [ ] Tooltip'ler çalışıyor
- [ ] Export (CSV) çalışıyor
- [ ] Responsive tasarım test edildi

---

## 🚀 Uygulama Sırası

1. **TypeScript Interfaces**: Veri tipleri tanımla
2. **Data Fetching**: 5 paralel sorgu yaz
3. **Memoized Calculations**: KPI ve grafik verileri hesapla
4. **Hero KPI Section**: 4 gradient kart oluştur
5. **Historical Trends**: Multi-line area chart
6. **Red Meat Analysis**: 3 grafik grubu
7. **Poultry Production**: 2 aylık trend grafiği
8. **Product Distribution**: Pie + Radar charts
9. **World Rankings**: 3 horizontal bar chart
10. **Map Update**: Veri kaynağını güncelle (görsel aynı)
11. **Data Table**: İnteraktif tablo + export
12. **Styling**: CSS-in-JS, gradient effects
13. **Testing**: Tüm bileşenleri test et

---

## 📝 Notlar

- **Performans**: `useMemo` ve `useCallback` kullanarak gereksiz re-render'ları önle
- **Responsive**: Tüm grafikler `ResponsiveContainer` ile wrap edilecek
- **Loading**: Veri yüklenirken `<Loading />` komponenti göster
- **Error Handling**: Try-catch blokları ile hataları yakala
- **Tooltip Formatting**: Büyük sayılar için "K", "M" kısaltmaları kullan (1.2M, 850K)
- **Map Compatibility**: Mevcut `TurkeyHeatMap` komponenti ile tam uyumlu olacak

---

## 🎯 Hedef Sonuç

Profesyonel, modern, veri odaklı bir dashboard:
- ✅ Tarihsel perspektif (63 yıllık veri)
- ✅ Uluslararası karşılaştırma (Türkiye'nin dünya sıralaması)
- ✅ Detaylı ürün analizi (kırmızı et, kanatlı, süt, yumurta, bal)
- ✅ Coğrafi dağılım (il bazlı harita)
- ✅ İnteraktif keşif (filtreler, tooltip'ler, export)
- ✅ Görsel mükemmellik (gradient cards, modern grafikler)

**Sayfa Uzunluğu**: ~900-1000 satır TypeScript
**Render Süresi**: <2 saniye
**Grafik Sayısı**: 15+ interaktif görselleştirme
