# 🐄 İl ve İlçe Bazlı Hayvancılık Analiz Platformu - Detaylı Planlama Dokümanı

## 📋 Proje Özeti

**Hedef**: `/turkey/provincial` sayfası için il ve ilçe bazında derin hayvancılık analiz platformu oluşturmak

**Veri Kaynağı**: `tuik_hayvancilik_canlihayvan` tablosu
- **Dönem**: 2004-2025 (22 yıllık veri)
- **Kapsamadaki Hayvanlar**: Sığır, Manda, Koyun, Keçi, Tavuk, Hindi, Ördek, Kaz, At, Eşek, Katır, Deve, Domuz
- **Bölgesel Detay**: İl + İlçe seviyesi
- **Kategoriler**: Grup bazlı (örn: Sığır > Alt kategoriler)

---

## 🎯 Ana Hedefler

### 1. Multi-Level Geographical Analysis (İl + İlçe)
- **İl Seviyesi**: 81 il için toplu analiz
- **İlçe Seviyesi**: Seçilen il için tüm ilçelerin detay analizi
- **Karşılaştırma**: İl-İlçe benchmark analizi
- **Harita Entegrasyonu**: Türkiye haritasında interaktif il gösterimi

### 2. Deep Time-Series Analytics
- 22 yıllık trend analizi (2004-2025)
- Yıllık büyüme oranları (CAGR)
- Döngüsel pattern tespiti (seasonal patterns)
- Anomali dedektörü (olağandışı dalgalanmalar)
- Tahmin modeli (projection for next 3-5 years)

### 3. Cross-Animal Intelligence
- Hayvan türleri arası korelasyon analizi
- Portfolio diversification scoring (il bazlı)
- Baskınlık indeksleri (hangi hayvan hangi ilde dominant)
- Çakışma matrisleri (geographic overlap analysis)

### 4. Economic & Production Metrics
- İl başına verimlilik skorları
- Büyüme momentum analizi
- Rekabet pozisyonu belirleme (leader vs follower)
- Pazar payı hesaplamaları

### 5. Advanced Filtering & Segmentation
- Çoklu hayvan seçimi
- Yıl aralığı filtreleme
- İl/Bölge filtreleme
- Kategori bazlı derinlemesine inceleme

---

## 🏗️ Sayfa Yapısı (Component Hierarchy)

### **TuikProvincialLivestockPage** (Ana Component)

```
TuikProvincialLivestockPage/
├─ 📊 Header & KPI Dashboard
│  ├─ Toplam Hayvan Popülasyonu (Türkiye)
│  ├─ Lider İl (En yüksek popülasyon)
│  ├─ En Hızlı Büyüyen İl (CAGR bazlı)
│  ├─ Yıllık Büyüme Oranı (%)
│  └─ Aktif İl/İlçe Sayısı
│
├─ 🎛️ Advanced Filter Panel
│  ├─ Hayvan Türü Seçici (Multi-select)
│  ├─ Yıl/Yıl Aralığı Seçici
│  ├─ İl Seçici (Dropdown + Search)
│  ├─ İlçe Seçici (Seçilen ile bağlı)
│  ├─ Bölge Filtresi
│  └─ Kategori Filtresi
│
├─ 📑 Tab Navigation
│  ├─ Tab 1: İl Genel Bakış (Provincial Overview)
│  ├─ Tab 2: İlçe Detay Analizi (District Deep Dive)
│  ├─ Tab 3: Zaman Serisi & Trendler (Time Series)
│  ├─ Tab 4: İller Arası Karşılaştırma (Comparative Analysis)
│  ├─ Tab 5: Hayvan Türleri Korelasyon (Cross-Animal Intelligence)
│  └─ Tab 6: Tahmin & Projeksiyon (Forecasting)
│
└─ 📤 Export Options
   ├─ Excel Export (Raw Data)
   ├─ PDF Report Generator
   └─ Share Dashboard Link
```

---

## 📑 TAB 1: İl Genel Bakış (Provincial Overview)

### Bileşenler:

#### 1.1 **Türkiye Isı Haritası** (Turkey Heat Map)
```typescript
<TurkeyHeatMap
  data={provinceData}
  metric="total_population"
  colorScheme="sequential"
  tooltip={(province) => `${province.name}: ${formatNumber(province.value)}`}
  onClick={(province) => setSelectedProvince(province)}
/>
```
- **Renk Skalası**: Popülasyon yoğunluğuna göre gradient
- **Hover Tooltip**: İl adı, toplam popülasyon, yıllık büyüme %
- **Click Action**: İl seçimi ve detay açma

#### 1.2 **Top 10 İller - Sıralama Tablosu** (Intelligence Format)
```
Sıra | İl Adı | Toplam Pop. | Y/Y Büyüme | Baskın Hayvan | Skor
-----|---------|-------------|------------|---------------|------
  1  | Konya   | 2.5M        | +5.2%      | 🐄 Sığır     | ★★★★★
  2  | Ankara  | 1.8M        | +3.1%      | 🐑 Koyun     | ★★★★☆
```
- **Columns**: Rank, Province Name, Total Count, Growth Rate, Dominant Animal, Score
- **Formatters**: Badge-style displays, color-coded growth indicators
- **Sorting**: Multi-column sort capability

#### 1.3 **İl Dağılım Grafiği** (Provincial Distribution)
- **Chart Type**: Horizontal Bar Chart (Top 20 İl)
- **X-Axis**: Hayvan sayısı
- **Y-Axis**: İl adları
- **Color**: Baskın hayvana göre renklendirme
- **Interaktive**: Click to drill-down

#### 1.4 **Bölgesel Aggregation** (Regional Summary)
```typescript
interface RegionalSummary {
  region: string; // "Marmara", "Ege", etc.
  totalPopulation: number;
  provinceCount: number;
  averagePerProvince: number;
  topAnimal: string;
  growthRate: number;
}
```
- **Pie Chart**: Bölge bazlı dağılım
- **Trend Line**: Bölgesel büyüme trendi

---

## 📑 TAB 2: İlçe Detay Analizi (District Deep Dive)

### Prerequisite: Bir il seçilmiş olmalı

#### 2.1 **İlçe Seçim Panel**
- Dropdown: Seçilen ilin tüm ilçeleri
- Multi-select: Birden fazla ilçe karşılaştırması
- "Tümünü Seç" butonu

#### 2.2 **İlçe Karşılaştırma Tablosu** (Intelligence Format)
```
İlçe Adı | Toplam Pop. | İl İçi Pay % | Baskın Hayvan | 5 Yıl CAGR | Trend
---------|-------------|--------------|---------------|-------------|-------
Merkez   | 150K        | 35%          | 🐄 Sığır     | +4.5%       | 📈
Karapınar| 80K         | 18%          | 🐑 Koyun     | -1.2%       | 📉
```

#### 2.3 **İlçe-İl Benchmark**
- Stacked Bar Chart: Her ilçe + İl toplamı gösterimi
- Percentage Share: İlçelerin il içindeki yüzde payı
- Growth Comparison: İlçe büyümesi vs İl ortalaması

#### 2.4 **İlçe Trend Karşılaştırması**
- Multi-Line Chart: Seçilen ilçelerin 22 yıllık trendi
- Area Chart: İlçe katkıları stack view

---

## 📑 TAB 3: Zaman Serisi & Trendler (Time Series)

#### 3.1 **Master Timeline Chart** (2004-2025)
```typescript
<ComposedChart>
  <Line dataKey="totalPopulation" stroke="#22c55e" name="Toplam Popülasyon" />
  <Bar dataKey="annualGrowth" fill="#3b82f6" name="Yıllık Artış" />
  <Area dataKey="projectedGrowth" fill="#f59e0b" opacity={0.3} name="Tahmin" />
</ComposedChart>
```
- **Dual Y-Axis**: Sol (popülasyon), Sağ (büyüme %)
- **Reference Lines**: Önemli olaylar (e.g., 2013 Tarım Reformu)
- **Zoom & Pan**: Belirli döneme odaklanma

#### 3.2 **CAGR Analizi**
```typescript
interface CAGRMetrics {
  period: string; // "2004-2025", "2015-2025", "Son 5 Yıl"
  cagr: number;
  startValue: number;
  endValue: number;
  volatility: number; // Standart sapma
}
```
- **Period Selector**: 5 yıl, 10 yıl, 22 yıl
- **CAGR Cards**: Her dönem için ayrı KPI kartı
- **Volatility Indicator**: Risk skoru

#### 3.3 **Anomali Dedektörü**
```typescript
interface Anomaly {
  year: number;
  value: number;
  deviation: number; // Sigma cinsinden
  type: 'spike' | 'drop';
  suspectedReason?: string;
}
```
- **Scatter Plot**: Anormal noktaları highlight
- **Alert Badges**: Büyük sapmalar için uyarı
- **Historical Notes**: Olası sebepler (salgın, politika değişimi)

#### 3.4 **Seasonal Pattern Analysis**
- **Heatmap**: Yıl x Çeyrek bazında pattern
- **Cycle Detection**: Döngüsel hareketler (eğer mevsimsel veri varsa)

---

## 📑 TAB 4: İller Arası Karşılaştırma (Comparative Analysis)

#### 4.1 **Multi-Province Selector**
- Checkbox list: En fazla 10 il seçilebilir
- Quick Select: "Top 5", "Marmara Bölgesi", "Doğu İller"

#### 4.2 **Radar Chart - Multi-Dimensional Comparison**
```typescript
<RadarChart>
  <PolarAngleAxis dataKey="metric" />
  <PolarRadiusAxis />
  <Radar dataKey="Konya" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
  <Radar dataKey="Ankara" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
</RadarChart>
```
**Boyutlar**: Toplam Pop., Büyüme Hızı, Çeşitlilik Skoru, Verimlilik, Trend Stabilitesi

#### 4.3 **Side-by-Side Comparison Table**
```
Metrik              | Konya    | Ankara   | İzmir    | Fark (vs Leader)
--------------------|----------|----------|----------|------------------
Toplam Popülasyon   | 2.5M     | 1.8M     | 1.2M     | -52% (İzmir)
Yıllık Büyüme %     | +5.2%    | +3.1%    | +2.8%    | -46% (İzmir)
...
```

#### 4.4 **Sankey Diagram - İl Sıralaması Değişimi**
- 2004 vs 2025 sıralamalarındaki değişimi göster
- Hangi iller yükseldi/düştü?

---

## 📑 TAB 5: Hayvan Türleri Korelasyon (Cross-Animal Intelligence)

#### 5.1 **Correlation Matrix**
```
          Sığır  Koyun  Keçi  Tavuk  Hindi
Sığır      1.0   0.65   0.42   0.12  -0.05
Koyun     0.65   1.0    0.78   0.20   0.10
Keçi      0.42   0.78   1.0    0.15   0.08
Tavuk     0.12   0.20   0.15   1.0    0.82
Hindi    -0.05   0.10   0.08   0.82   1.0
```
- **Heatmap View**: Renk kodlu korelasyon matrisi
- **Interpretation**: Pozitif/Negatif korelasyon açıklaması

#### 5.2 **Portfolio Diversification Score**
```typescript
interface DiversificationScore {
  province: string;
  animalTypes: number; // Kaç farklı hayvan türü var
  herfindahlIndex: number; // Yoğunlaşma indeksi (0-1)
  diversificationScore: number; // 0-100
  dominantAnimal: string;
  dominancePercentage: number;
}
```
- **Score Card**: Her il için diversification skoru
- **Ranking**: En çeşitlendirilmiş iller
- **Risk Indicator**: Tek hayvana bağımlılık riski

#### 5.3 **Geographic Overlap Analysis**
- **Scatter Plot**: X: Sığır Pop, Y: Koyun Pop
- **Cluster Identification**: İl grupları (e.g., "Büyükbaş Yoğun", "Küçükbaş Yoğun")

#### 5.4 **Baskınlık Haritası** (Dominance Map)
- **Choropleth Map**: Her il için baskın hayvan türünü renk ile göster
- **Legend**: Hayvan türü = Renk eşleştirmesi

---

## 📑 TAB 6: Tahmin & Projeksiyon (Forecasting)

#### 6.1 **Projeksiyon Modeli**
```typescript
interface ForecastModel {
  method: 'linear_regression' | 'exponential_smoothing' | 'arima';
  historicalPeriod: string; // "2015-2025"
  forecastPeriod: string; // "2026-2030"
  confidence: number; // 0.95 (95% confidence interval)
  predictions: { year: number; value: number; lowerBound: number; upperBound: number }[];
}
```

#### 6.2 **Forecast Chart**
- **Line Chart**: Geçmiş + Tahmin trendi
- **Confidence Bands**: Üst/alt sınır gösterimi (shaded area)
- **Toggle Methods**: Farklı tahmin modellerini karşılaştır

#### 6.3 **Scenario Analysis**
```typescript
interface Scenario {
  name: string; // "Optimist", "Pesimist", "Normal"
  growthRate: number; // Yıllık %
  projected2030: number;
  assumptions: string[];
}
```
- **Scenario Cards**: 3 senaryo için ayrı projektlar
- **Comparison**: Senaryoların side-by-side gösterimi

#### 6.4 **Investment Hotspots**
- **Scoring Algorithm**: Büyüme potansiyeli + Pazar boşluğu + Trend momentum
- **Recommended Provinces**: Yatırım için öneri listesi
- **Risk-Reward Matrix**: 2D plot (Risk vs Return)

---

## 🎨 UI/UX Özellikleri (Intelligence Format Standards)

### Color Scheme
```typescript
const ANIMAL_COLORS = {
  'Sığır': '#22c55e',    // Green
  'Manda': '#14b8a6',    // Teal
  'Koyun': '#3b82f6',    // Blue
  'Keçi': '#8b5cf6',     // Purple
  'Tavuk': '#f59e0b',    // Amber
  'Hindi': '#ef4444',    // Red
  'Ördek': '#06b6d4',    // Cyan
  'Kaz': '#84cc16',      // Lime
  'At': '#f97316',       // Orange
  'Eşek': '#6366f1',     // Indigo
  'Katır': '#a3e635',    // Light Green
  'Deve': '#d946ef',     // Fuchsia
  'Domuz': '#ec4899',    // Pink
};

const REGION_COLORS = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};
```

### Intelligence Table Column Format
```typescript
interface IntelligenceColumn {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  width: string; // e.g., 'minmax(200px, 1fr)'
  formatter: (val: unknown, row?: any, index?: number) => JSX.Element;
}
```

### Badge Styles
```typescript
const getBadgeStyle = (type: 'positive' | 'negative' | 'neutral') => ({
  positive: {
    color: '#22c55e',
    background: 'rgba(34, 197, 94, 0.08)',
    icon: '📈'
  },
  negative: {
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.08)',
    icon: '📉'
  },
  neutral: {
    color: '#64748b',
    background: 'rgba(100, 116, 139, 0.08)',
    icon: '➖'
  }
}[type]);
```

### KPI Card Template
```typescript
<KPICard
  title="Toplam Hayvan Popülasyonu"
  value={formatNumber(totalPopulation)}
  subtitle="2025 Yılı"
  trend={`+${growthRate.toFixed(1)}%`}
  trendType="positive"
  icon="🐄"
  color="#22c55e"
/>
```

---

## 📊 Veri Modelleri (Data Structures)

### ProvincialLivestockData
```typescript
interface ProvincialLivestockData {
  province: string;           // İl adı
  district?: string;          // İlçe adı (optional)
  region: string;             // Bölge adı
  animalType: string;         // Hayvan türü
  category?: string;          // Alt kategori
  yearlyData: {
    [year: string]: number;   // y2004: 1000, y2005: 1100, ...
  };
  totalPopulation: number;    // Toplam (en son yıl)
  growthRate: number;         // Yıllık büyüme %
  cagr5Year: number;          // Son 5 yıl CAGR
  cagr10Year: number;         // Son 10 yıl CAGR
  marketShare: number;        // Türkiye içindeki pay %
  rank: number;               // Sıralama (türü bazlı)
  trend: 'increasing' | 'decreasing' | 'stable';
}
```

### AggregatedMetrics
```typescript
interface AggregatedMetrics {
  totalPopulation: number;
  provinceCount: number;
  districtCount: number;
  animalTypeCount: number;
  avgGrowthRate: number;
  topProvince: string;
  fastestGrowingProvince: string;
  diversityScore: number;
}
```

### ComparisonMetrics
```typescript
interface ComparisonMetrics {
  province: string;
  totalPopulation: number;
  growthRate: number;
  diversityScore: number;
  productivityScore: number;
  trendStability: number;
  overallScore: number;
}
```

---

## 🔧 Teknik Implementasyon Detayları

### 1. Data Fetching Strategy
```typescript
const loadProvincialData = async (filters: FilterOptions) => {
  const { animalTypes, yearRange, provinces, districts } = filters;
  
  // Multi-query parallel execution
  const queries = [
    // 1. İl bazlı toplam
    `SELECT il, grup, ${yearColumns.join(', ')} 
     FROM tuik_hayvancilik_canlihayvan 
     WHERE duzey='il' AND grup IN (${animalTypes})`,
    
    // 2. İlçe bazlı detay
    `SELECT il, ilce, grup, ${yearColumns.join(', ')} 
     FROM tuik_hayvancilik_canlihayvan 
     WHERE duzey='ilce' AND il IN (${provinces})`,
    
    // 3. Türkiye toplamı
    `SELECT grup, ${yearColumns.join(', ')} 
     FROM tuik_hayvancilik_canlihayvan 
     WHERE duzey='ulke' AND yer='TÜRKİYE'`
  ];
  
  const results = await Promise.all(queries.map(q => fetchQuery(q)));
  return transformData(results);
};
```

### 2. Performance Optimization
- **Lazy Loading**: Tab değiştirmede sadece aktif tab'ın verisini yükle
- **Memoization**: useMemo ile ağır hesaplamaları cache'le
- **Virtual Scrolling**: Büyük tablolar için (react-window)
- **Debounced Filters**: Filtre değişiminde 300ms debounce

### 3. Export Functionality
```typescript
const exportToExcel = (data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Livestock Data');
  XLSX.writeFile(wb, `livestock_provincial_${Date.now()}.xlsx`);
};

const exportToPDF = async (elementRef: React.RefObject<HTMLDivElement>) => {
  const canvas = await html2canvas(elementRef.current!);
  const pdf = new jsPDF('landscape');
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 10, 10, 280, 180);
  pdf.save(`livestock_report_${Date.now()}.pdf`);
};
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Hafta 1)
- [ ] Sayfa temel yapısı ve routing
- [ ] Veri fetching service fonksiyonları
- [ ] Filter panel component'leri
- [ ] KPI Dashboard layout

### Phase 2: Core Features (Hafta 2)
- [ ] Tab 1: İl Genel Bakış + Harita entegrasyonu
- [ ] Tab 2: İlçe Detay Analizi
- [ ] Intelligence format tablolar
- [ ] Temel data transformations

### Phase 3: Advanced Analytics (Hafta 3)
- [ ] Tab 3: Time Series & Trendler
- [ ] CAGR & anomali hesaplamaları
- [ ] Tab 4: İller arası karşılaştırma
- [ ] Radar & Sankey charts

### Phase 4: Intelligence Layer (Hafta 4)
- [ ] Tab 5: Korelasyon analizi
- [ ] Diversification scoring
- [ ] Tab 6: Forecasting & Projection
- [ ] Scenario analysis

### Phase 5: Polish & Optimization (Hafta 5)
- [ ] Performance optimization
- [ ] Export functionality (Excel, PDF)
- [ ] Responsive design refinement
- [ ] User testing & bug fixes

---

## 📈 Başarı Metrikleri (Success Criteria)

1. **Veri Kapsamı**: 81 il + ilçelerin %100'ü kapsanmalı
2. **Performance**: İlk yükleme < 3 saniye, tab geçişleri < 500ms
3. **Accuracy**: Hesaplama doğruluğu %99.9+
4. **Usability**: Kullanıcı testi ile 4.5/5+ memnuniyet
5. **Intelligence**: En az 5 farklı analitik insight sunmalı

---

## 🎓 Kullanıcı Senaryoları

### Senaryo 1: Tarım Bakanlığı Analisti
> "Konya ilinde son 10 yıldaki sığır popülasyonu trendini görmek ve ilçe bazında detaylandırmak istiyorum."

**Çözüm Akışı**:
1. Ana sayfada "Konya" ilini seç
2. "Sığır" hayvan türünü filtrele
3. Tab 3'e geç (Time Series)
4. CAGR ve trend grafiklerini incele
5. Tab 2'ye geç (District Deep Dive)
6. İlçe karşılaştırma tablosunu görüntüle

### Senaryo 2: Yatırımcı
> "Kümes hayvancılığında (Tavuk, Hindi) en hızlı büyüyen illeri bulmak ve projeksiyon görmek istiyorum."

**Çözüm Akışı**:
1. Filter'da "Tavuk" ve "Hindi" seç
2. Tab 1'de Top 10 iller tablosunu "Y/Y Büyüme" kolonuna göre sırala
3. Tab 6'ya geç (Forecasting)
4. 2026-2030 projeksiyonlarını incele
5. Investment Hotspots listesini kontrol et

### Senaryo 3: Araştırmacı
> "Koyun ve keçi popülasyonları arasındaki korelasyonu bölgesel olarak analiz etmek istiyorum."

**Çözüm Akışı**:
1. Filter'da "Koyun" ve "Keçi" seç
2. Tab 5'e geç (Cross-Animal Intelligence)
3. Correlation Matrix'i incele
4. Geographic Overlap scatter plot'u görüntüle
5. Bölge filtresi ile Doğu Anadolu'ya odaklan

---

## 🔐 Veri Güvenliği & Privacy

- **API Rate Limiting**: Aşırı yüklenmeyi önlemek için
- **Data Caching**: Browser cache ile tekrar yüklemeyi azalt
- **Error Handling**: Graceful degradation ile hata yönetimi
- **Accessibility**: WCAG 2.1 AA standartları

---

## 📝 Notlar & Özel Durumlar

1. **İlçe Verisi Eksikliği**: Bazı eski yıllarda ilçe verisi olmayabilir → Fallback: İl toplamını göster
2. **Hayvan Türü Çeşitliliği**: 13 farklı hayvan türü → Multi-select limit koy (max 5)
3. **Yıl Aralığı**: 22 yıl → Performance için lazy load kullan
4. **Bölge Mapping**: İl→Bölge mapping için `getRegionByProvince()` utility kullan

---

## ✅ Onay Bekleyen Kararlar

1. **Sayfa İsmi**: `TuikProvincialLivestockPage.tsx` mi yoksa `TurkeyProvincialLivestockPage.tsx` mi?
2. **Default Filters**: İlk yüklemede hangi il/hayvan seçili gelsin?
3. **Tab Sırası**: Yukarıdaki 6 tab sırası uygun mu?
4. **Export Format**: Excel + PDF yeterli mi yoksa CSV de eklensin mi?
5. **Forecasting Method**: Lineer regresyon yeterli mi yoksa daha gelişmiş model?

---

## 🎬 Sonraki Adımlar

**ŞİMDİ**: Bu planın onaylanmasını bekle
**SONRA**: Onay alındıktan sonra Phase 1'e başla

> 💡 **Not**: Bu doküman bir "yaşayan doküman"dır ve implementasyon sırasında güncellenecektir.

---

**Versiyon**: 1.0  
**Tarih**: 18 Şubat 2026  
**Hazırlayan**: AI Assistant  
**Durum**: ✋ ONAY BEKLİYOR
