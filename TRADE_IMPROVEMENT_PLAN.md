# 📊 Ticaret Sayfaları İyileştirme Planı

## 🎯 Genel Bakış
İhracat ve ithalat sayfalarını bitkisel ve hayvancılık kategorilerine ayırarak detaylı analiz ve görselleştirmeler eklenecek.

---

## 🔍 Tespit Edilen Sorunlar

### 1. **Renk Kontrastı Problemleri**
- Mavi arkaplan üzerinde mavi yazı (görünmüyor)
- Grafiklerde koyu arkaplan üzerinde koyu renkli yazılar
- Tablo başlıklarında düşük kontrast

### 2. **Eksik Veriler ve Hesaplamalar**
- Birim fiyat hesaplamaları eksik (değer/miktar)
- Yıllık trendler gösterilmiyor
- Ülke bazlı detaylar yetersiz
- Ürün bazlı dökümler yok

### 3. **Veri Kategorilendirme**
- Bitkisel ve hayvansal ürünler ayrıştırılmamış
- Ürün grupları detaylandırılmamış

---

## 📋 Yapılacaklar

### **FAZA 1: Renk ve Görünürlük Düzeltmeleri**

#### 1.1 CSS Renk Sistemi İyileştirmesi
- [ ] Tablo başlıkları için yüksek kontrastlı renkler
- [ ] Grafik yazıları için otomatik kontrast ayarı
- [ ] Mavi arkaplan üzerindeki tüm yazıları beyaz/açık renge çevirme
- [ ] Hover efektlerinde görünürlük kontrolü

**Dosyalar:**
- `src/styles/globals.css` - Renk değişkenleri ve kontrast iyileştirmeleri

---

### **FAZA 2: Veri Hesaplamaları ve Yardımcı Fonksiyonlar**

#### 2.1 API Servisi Geliştirmeleri
- [ ] Birim fiyat hesaplama fonksiyonu ekle
- [ ] Yıllık trend karşılaştırma fonksiyonu
- [ ] Ürün kategori filtreleme queries
- [ ] Bitkisel/Hayvansal ayrıştırma queries

**Yeni Queries:**
```sql
-- Bitkisel ihracat detay
SELECT 
  ana_urun, 
  ulke, 
  yil,
  SUM(ihracat_miktar) as miktar,
  SUM(ihracat_deger) as deger,
  (SUM(ihracat_deger) / NULLIF(SUM(ihracat_miktar), 0)) as birim_fiyat
FROM tuik_ticaret
WHERE ihracat_deger > 0
GROUP BY ana_urun, ulke, yil

-- Hayvansal ihracat detay
SELECT 
  ana_urun, 
  ulke, 
  yil,
  SUM(ihracat_miktar) as miktar,
  SUM(ihracat_deger) as deger,
  (SUM(ihracat_deger) / NULLIF(SUM(ihracat_miktar), 0)) as birim_fiyat
FROM tuik_ticarethayvansal
WHERE ihracat_deger > 0
GROUP BY ana_urun, ulke, yil
```

**Dosyalar:**
- `src/services/api.ts` - Yeni query'ler ve hesaplama fonksiyonları

---

### **FAZA 3: Yeni Detaylı Sayfalar Oluşturma**

#### 3.1 Bitkisel İhracat Sayfası
**Dosya:** `src/pages/PlantExportDetailPage.tsx`

**Özellikler:**
- [ ] **KPI Kartları:**
  - Toplam ihracat değeri
  - İhraç edilen ürün sayısı
  - İhracat yapılan ülke sayısı
  - Ortalama birim fiyat
  - En değerli ürün
  - En çok ihracat yapılan ülke

- [ ] **Grafikler:**
  - Ürün bazlı ihracat dağılımı (Pie Chart)
  - Ülke bazlı ihracat dağılımı (Bar Chart)
  - Yıllık ihracat trendi (Line Chart)
  - Birim fiyat trendi (Line Chart)
  - Ürün-Ülke matrix (Heatmap)
  - Top 10 ürün-ülke kombinasyonu (Stacked Bar)

- [ ] **Detaylı Tablolar:**
  - Ürün bazlı detay (ürün, toplam değer, miktar, birim fiyat, ülke sayısı)
  - Ülke bazlı detay (ülke, toplam değer, ürün sayısı, ortalama birim fiyat)
  - Yıl bazlı karşılaştırma (yıl, toplam değer, değişim %, miktar değişimi)
  - Ürün-Ülke detayı (ürün, ülke, yıl, miktar, değer, birim fiyat, yıllık değişim %)

#### 3.2 Hayvansal İhracat Sayfası
**Dosya:** `src/pages/AnimalExportDetailPage.tsx`

**Özellikler:** (Bitkisel ile aynı yapı, farklı veri kaynağı)
- [ ] Aynı KPI kartları
- [ ] Aynı grafik türleri
- [ ] Aynı tablo yapıları

#### 3.3 Bitkisel İthalat Sayfası
**Dosya:** `src/pages/PlantImportDetailPage.tsx`

**Özellikler:**
- [ ] İthalat odaklı KPI kartları
- [ ] İthal edilen ürünler analizi
- [ ] Kaynak ülkeler analizi
- [ ] İthalat birim fiyat trendi

#### 3.4 Hayvansal İthalat Sayfası
**Dosya:** `src/pages/AnimalImportDetailPage.tsx`

**Özellikler:** (Bitkisel ithalat ile aynı)
- [ ] Aynı yapı, farklı veri kaynağı

---

### **FAZA 4: Mevcut Sayfaları Güncelleme**

#### 4.1 ExportPage.tsx İyileştirmeleri
- [ ] Bitkisel/Hayvansal tab sistemi ekle
- [ ] Birim fiyat hesaplamaları ekle
- [ ] Yıllık karşılaştırma kartları
- [ ] "Detaylı Analiz" butonları (yeni sayfalara yönlendirme)
- [ ] Renk kontrastı düzeltmeleri

#### 4.2 ImportPage.tsx İyileştirmeleri
- [ ] Export ile aynı iyileştirmeler

#### 4.3 TransportPage.tsx İyileştirmeleri
- [ ] Mevcut renk problemlerini düzelt
- [ ] Tablo görünürlüğünü artır

---

### **FAZA 5: Ortak Bileşenler**

#### 5.1 Yeni Bileşenler Oluştur

**DetailedTable Bileşeni**
- Sıralama özellikleri
- Export (CSV/Excel) özelliği
- Arama/filtreleme
- Sayfalama

**Dosya:** `src/components/DetailedTable.tsx`

**ProductFilter Bileşeni**
- Ürün seçimi için dropdown
- Multi-select özelliği
- Arama kutusu

**Dosya:** `src/components/ProductFilter.tsx`

**CountryFilter Bileşeni**
- Ülke seçimi için dropdown
- Multi-select özelliği
- Arama kutusu

**Dosya:** `src/components/CountryFilter.tsx`

**TrendComparison Bileşeni**
- Yıllık karşılaştırma gösterimi
- Yüzde değişim hesaplaması
- Artış/azalış ikonları

**Dosya:** `src/components/TrendComparison.tsx`

---

### **FAZA 6: Navigasyon ve Routing**

#### 6.1 Sidebar Güncellemesi
- [ ] "Detaylı İhracat Analizi" menü grubu
  - Bitkisel İhracat
  - Hayvansal İhracat
- [ ] "Detaylı İthalat Analizi" menü grubu
  - Bitkisel İthalat
  - Hayvansal İthalat

#### 6.2 Router Güncellemesi
- [ ] Yeni route'lar ekle
- [ ] Lazy loading optimize et

**Dosyalar:**
- `src/components/Sidebar.tsx`
- `src/App.tsx`

---

## 🎨 Renk Düzeltme Detayları

### Kritik Kontrast Sorunları

```css
/* ÖNCESİ - Görünmeyen */
.chart-title {
  color: #3b82f6; /* Mavi arkaplan üzerinde mavi */
}

/* SONRASI - Görünür */
.chart-title {
  color: var(--text-primary); /* Koyu metin */
}

/* Tablo başlıkları */
.table-header {
  background: var(--bg-card);
  color: var(--text-secondary); /* Yeterli kontrast */
  font-weight: 600;
}

/* Grafik eksenleri */
.recharts-cartesian-axis-tick-value {
  fill: var(--text-secondary) !important; /* Görünür gri */
}

/* Hover durumları */
.table-row:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

---

## 📊 Örnek Veri Yapıları

### İhracat Detay Verisi
```typescript
interface ExportDetail {
  ana_urun: string;           // Ürün adı
  ulke: string;               // Ülke adı
  yil: string;                // Yıl
  ihracat_miktar: number;     // Miktar (ton/kg)
  ihracat_deger: number;      // Değer (USD)
  birim_fiyat: number;        // Değer / Miktar
  birim: string;              // Birim (ton, kg, adet)
  yillik_degisim: number;     // Önceki yıla göre % değişim
}

interface ExportSummary {
  toplam_deger: number;
  toplam_miktar: number;
  urun_sayisi: number;
  ulke_sayisi: number;
  ort_birim_fiyat: number;
  en_degerli_urun: string;
  en_cok_ihracat_ulke: string;
}
```

---

## 🔄 Öncelik Sırası

1. **Yüksek Öncelik** ⚠️
   - Renk kontrastı düzeltmeleri (FAZA 1)
   - API'ye yeni query'ler (FAZA 2)
   - Bitkisel İhracat Detay Sayfası (FAZA 3.1)

2. **Orta Öncelik** 📌
   - Hayvansal İhracat Detay Sayfası (FAZA 3.2)
   - Bitkisel İthalat Detay Sayfası (FAZA 3.3)
   - Ortak bileşenler (FAZA 5)

3. **Düşük Öncelik** 📋
   - Hayvansal İthalat Detay Sayfası (FAZA 3.4)
   - Mevcut sayfaları güncelleme (FAZA 4)
   - Navigasyon güncellemeleri (FAZA 6)

---

## 📈 Beklenen Sonuçlar

### Kullanıcı Deneyimi
- ✅ Tüm yazılar net ve okunabilir
- ✅ Renk körü kullanıcılar için erişilebilir
- ✅ Profesyonel görünüm

### Veri Analizi
- ✅ Hangi ürünün hangi ülkeye ne kadar satıldığı
- ✅ Yıllık trendler ve karşılaştırmalar
- ✅ Birim fiyat analizleri
- ✅ Kategori bazlı ayrıştırmalar

### Teknik İyileştirmeler
- ✅ Daha temiz kod yapısı
- ✅ Yeniden kullanılabilir bileşenler
- ✅ Optimize edilmiş SQL query'leri
- ✅ Daha iyi performans

---

## 🛠️ Geliştirme Notları

### Veritabanı Tabloları
```
tuik_ticaret (Bitkisel)
├── ana_urun
├── ulke
├── yil
├── ihracat_miktar
├── ihracat_deger
├── ithalat_miktar
├── ithalat_deger
└── birim

tuik_ticarethayvansal (Hayvansal)
├── ana_urun
├── ulke
├── yil
├── ihracat_miktar
├── ihracat_deger
├── ithalat_miktar
├── ithalat_deger
└── birim
```

### Birim Fiyat Hesaplama
```sql
-- NULL ve 0 değerleri için kontrol
CASE 
  WHEN miktar > 0 THEN deger / miktar
  ELSE NULL
END as birim_fiyat
```

### Yıllık Değişim Hesaplama
```sql
-- LAG fonksiyonu ile önceki yıl değeri
(deger_bu_yil - deger_onceki_yil) / deger_onceki_yil * 100
```

---

## ✅ Test Kriterleri

- [ ] Tüm yazılar en az 4.5:1 kontrast oranına sahip
- [ ] Mobil cihazlarda düzgün görünüm
- [ ] Tüm grafikler verilerle dolduruluyor
- [ ] Hesaplamalar doğru sonuç veriyor
- [ ] Filtreleme ve sıralama çalışıyor
- [ ] Loading ve error durumları handle ediliyor

---

## 📅 Tahmini Süre

- **FAZA 1:** 1-2 saat (CSS düzeltmeleri)
- **FAZA 2:** 2-3 saat (API ve query'ler)
- **FAZA 3:** 6-8 saat (4 yeni sayfa)
- **FAZA 4:** 2-3 saat (Mevcut sayfalar)
- **FAZA 5:** 3-4 saat (Ortak bileşenler)
- **FAZA 6:** 1-2 saat (Navigasyon)

**TOPLAM:** 15-22 saat

---

## 🚀 Başlangıç Komutu

Plan onaylandıktan sonra:
```bash
# FAZA 1'den başlayacağız
# Önce renk düzeltmeleri
# Sonra API geliştirmeleri
# En son yeni sayfalar
```

---

**Not:** Bu plan esnek bir yapıdadır. Geliştirme sırasında ortaya çıkabilecek ihtiyaçlara göre güncellenebilir.
