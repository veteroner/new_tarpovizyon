# 🐝 Türkiye Arıcılık Sayfası - Profesyonel Tasarım Planı

## 📊 Veri Kaynakları

### 1. oner_i_llere_gore_arici_sayisi
- **81 il** için arıcı sayıları
- **2013-2023** yıllık trend verileri
- Türkiye geneli arıcılık gelişimi analizi

### 2. oner_i_llerin_bal_cesitleri
- **81 il** detaylı arıcılık verileri
- Kolonlar:
  - `balin_cesiti`: Bal çeşitleri (Kestane, Çam, Çiçek, Geven, vb.)
  - `aricilik_yapan_isletme_sayisi_adet`: İşletme sayısı
  - `yeni_kovan_sayisi_adet`: Yeni kovan sayısı
  - `eski_kovan_sayisi_adet`: Eski kovan sayısı
  - `toplam_kovan_adet`: Toplam kovan sayısı
  - `bal_uretimi_ton`: Bal üretimi (ton)
  - `balmumu_uretimi_ton`: Balmumu üretimi (ton)
  - `bal_verimi_kg`: Kovan başına bal verimi (kg)

## 🎨 Sayfa Yapısı

### 1. Hero Section - KPI Kartları (4 Ana Kart)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 🐝 TOPLAM   │ 🪔 TOPLAM   │ 🍯 BAL      │ 🕯️ BALMUMU  │
│ ARICI       │ KOVAN       │ ÜRETİMİ     │ ÜRETİMİ     │
│ 89,234      │ 9.2M        │ 109,330 ton │ 5,234 ton   │
│ +12.4% ↑    │ +8.7% ↑     │ +5.3% ↑     │ +4.1% ↑     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```
- Gradient renkler: Sarı/Turuncu tonları (balık teması)
- Yıllık değişim yüzdesi gösterimi
- Emoji ikonlar ile görsel zenginlik

### 2. Arıcılık Gelişimi Bölümü (2013-2023)
**Grafikler:**
- **Line Chart**: 11 yıllık arıcı sayısı trendi (tüm Türkiye)
- **Area Chart**: Yıllara göre toplam kovan sayısı gelişimi
- **Stacked Bar**: Yeni vs Eski kovan dağılımı (yıllık)

### 3. İl Bazlı Liderlik Analizi
**Top 10 Sıralamaları:**

a) **En Çok Arıcı Olan İller** (Bar Chart - Yatay)
```
Erzurum    ████████████ 12,451
Sivas      ██████████   26,724
Sakarya    █████████    47,119
...
```

b) **En Fazla Bal Üreten İller** (Bar Chart)
```
Ordu       ████████████ 19,007 ton
Şanlıurfa  ██████████   13,547 ton
Mersin     █████████    15,401 ton
...
```

c) **En Yüksek Verimli İller** (kg/kovan)
```
Kocaeli    ████████████ 59.9 kg
Ordu       ██████████   31.1 kg
Kars       █████████    18.5 kg
...
```

### 4. Bal Çeşitleri Analizi
**Pie Chart / Treemap:**
- Kestane Balı
- Çam Balı
- Çiçek Balı
- Geven Balı
- Ihlamur Balı
- Kekik Balı
- Yayla Balı
- Narenciye Balı
- Püren Balı
- Lavanta Balı
- Özel Ballar (Anzer, Defne, vb.)

**Word Cloud görünümü:**
- İl bazında hangi bal çeşitleri üretiliyor
- Bölgesel özellik haritası

### 5. Kovan İstatistikleri
**Composed Chart:**
- Toplam Kovan: Area fill (mavi gradient)
- Yeni Kovan: Line (yeşil)
- Eski Kovan: Line (turuncu)
- Kovan başına verim overlay (sağ eksen)

### 6. Verimlilik Göstergeleri
**Scatter Plot:**
- X ekseni: Toplam kovan sayısı
- Y ekseni: Bal verimi (kg/kovan)
- Bubble size: Toplam üretim (ton)
- Her il bir nokta
- Tooltip: İl adı, detaylı veriler

### 7. Bölgesel Karşılaştırma
**Grouped Bar Chart:**
- 7 Coğrafi Bölge
- Her bölge için:
  - Toplam arıcı sayısı
  - Toplam bal üretimi
  - Ortalama verim
  - Kovan sayısı

### 8. İnteraktif Veri Tablosu
**DataGrid:**
- Tüm 81 il detaylı analiz
- Sıralama: Arıcı, Kovan, Üretim, Verim
- Arama/Filtreleme
- Export to CSV/Excel

## 🎯 Teknik Özellikler

### Renkler (Bal Temalı Palette)
```css
Primary: #f59e0b (Amber 500) - Bal rengi
Secondary: #fbbf24 (Amber 400)
Accent: #d97706 (Amber 600)
Success: #10b981 (Emerald 500) - Verim artışı
Danger: #ef4444 (Red 500) - Düşüş
Background: #fef3c7 (Amber 50) - Çok hafif bal tonu
```

### Grafikler
- **Recharts** kütüphanesi
- Responsive tasarım
- Tooltip'ler: Detaylı tooltip'ler
- Legend: Açıklayıcı efsaneler
- Custom colors matching theme

### Filtreleme
- **Yıl Seçici**: Slider (2013-2023)
- **İl Seçici**: Multi-select dropdown
- **Bal Çeşidi Filtresi**: Checkboxes
- **Verim Aralığı**: Range slider

### İstatistikler
- Toplam değerler
- Yıllık değişim (YoY %)
- 5 yıllık ortalama
- Min/Max değerler
- Trend indicators (↑↓)

## 📱 Responsive Tasarım
- **Desktop**: 4 kolonlu grid
- **Tablet**: 2 kolonlu grid
- **Mobile**: 1 kolon, swipeable charts

## 🚀 Performans
- Lazy loading charts
- Memoization (useMemo)
- Debounced filters
- SQL query optimization (JOIN yerine 2 ayrı query)

## 📈 Öne Çıkan İstatistikler (Sayfada Vurgulanacak)

1. **Türkiye Arıcılık Lideri**: Erzurum (12,451 arıcı - 2023)
2. **En Yüksek Üretim**: Ordu (19,007 ton bal)
3. **En Verimli İl**: Kocaeli (59.9 kg/kovan)
4. **En Çeşitli Bal**: Muğla (4 farklı bal çeşidi)
5. **En Büyük Kovan Kapasitesi**: Muğla (814,873 kovan)

## 🎬 Animasyonlar
- Sayfa yüklenince KPI kartları fade-in (staggered)
- Chart render animasyonları
- Hover effects (subtle scale)
- Smooth scroll to sections

---

**Not**: Bu plan Türkiye arıcılık sektörünün en kapsamlı ve profesyonel dashboard'u olacak!
