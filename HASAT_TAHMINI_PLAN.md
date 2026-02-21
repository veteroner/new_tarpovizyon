# 🌾 Hasat Tahmini Sihirbazı — Kapsamlı Uygulama Planı

**Oluşturulma:** 20 Şubat 2026  
**Hedef:** Çiftçi dostu, 4 adımlı, veri odaklı rekolte tahmin sihirbazı  
**Süre hedefi:** Tek geliştirme seansı (hızlı)

---

## 1. Kapsam Kararları

### ✅ Yapılacak
- İl/ilçe seçimi (dropdown + GPS konum)
- Ürün seçimi (kategorili, arama destekli)
- Arazi bilgisi girişi (dekar, sulama, toprak)
- TÜİK verim ortalaması hesaplama (5 yıl: 2020–2024)
- Güven aralığı (±1 standart sapma)
- Trend analizi (artış/azalış yönü)
- İl ve Türkiye ortalaması karşılaştırması
- Risk skoru (değişim katsayısı CV = σ/μ)
- Hasat takvimi (hardcoded lookup — bölge + ay bazlı)
- PDF/ekran görüntüsü notu

### ❌ V1'de Yapılmayacak (Neden?)
- **Canlı hava durumu API'si** — Gereksiz ve riskli. Nedenler:
  1. TÜİK 2020–2024 verisi zaten 5 yılın kuru/yağışlı yıllarını kapsıyor; standart sapma *zaten hava riskini* fiyatlıyor.
  2. API maliyeti ve güvenilirlik sorunu.
  3. Hava tahminleri 7 günden uzunda güvenilmez; hasat tahmini 6 ay öne bakar.
  4. **V2'de eklenebilir:** İklim endeksleri (SPEI, SPI kuraklık indeksi) yeterli.
- **Makine öğrenmesi modeli** — V2. Şimdi istatistiksel yeterli.
- **Fiyat tahmini** — Ayrı modül.

---

## 2. Veri Kaynağı

### Tablo: `tuik_bitkisel_uretim`
```
Kolonlar: id, ili, yer, duzey, urun, unsur, birim, y2018, y2019, y2020, y2021, y2022, y2023, y2024
```

| duzey | unsur | birim | Açıklama |
|-------|-------|-------|----------|
| ilçe | Üretim | Ton | İlçe bazlı toplam üretim |
| ilçe | Verim | Kg/da | İlçe bazlı verimlilik |
| ilçe | Alan | da | Ekilen alan |
| il | Verim | Kg/da | İl ortalaması |
| Turkey | Verim | Kg/da | Ulusal ortalama |

### Kritik SQL Sorguları

**1. İl listesi:**
```sql
SELECT DISTINCT ili FROM tuik_bitkisel_uretim 
WHERE duzey='ilçe' ORDER BY ili
```

**2. İlçe listesi (ile göre):**
```sql
SELECT DISTINCT yer FROM tuik_bitkisel_uretim 
WHERE duzey='ilçe' AND ili='{il}' ORDER BY yer
```

**3. İlçede yetiştirilen ürünler:**
```sql
SELECT DISTINCT urun FROM tuik_bitkisel_uretim 
WHERE duzey='ilçe' AND ili='{il}' AND yer='{ilce}' 
  AND unsur='Verim' AND birim='Kg/da'
  AND (y2022+y2023+y2024) > 0
ORDER BY urun
```

**4. İlçe verim verisi (5 yıl):**
```sql
SELECT y2020, y2021, y2022, y2023, y2024
FROM tuik_bitkisel_uretim 
WHERE duzey='ilçe' AND ili='{il}' AND yer='{ilce}'
  AND urun='{urun}' AND unsur='Verim' AND birim='Kg/da'
```

**5. İl ortalaması:**
```sql
SELECT y2020,y2021,y2022,y2023,y2024
FROM tuik_bitkisel_uretim
WHERE duzey='il' AND ili='{il}' AND urun='{urun}'
  AND unsur='Verim' AND birim='Kg/da'
```

**6. Türkiye ortalaması:**
```sql
SELECT y2020,y2021,y2022,y2023,y2024
FROM tuik_bitkisel_uretim
WHERE duzey='Turkey' AND urun='{urun}'
  AND unsur='Verim' AND birim='Kg/da'
```

---

## 3. Hesaplama Algoritması

### 3.1 Temel Verim Tahmini
```
geçerliYıllar = [y2020, y2021, y2022, y2023, y2024].filter(v => v > 0)
ortalama = mean(geçerliYıllar)          // Kg/da
std = stddev(geçerliYıllar)
minTahmin = (ortalama - std)            // Kg/da kötümser
maxTahmin = (ortalama + std)            // Kg/da iyimser
```

### 3.2 Sulama & Toprak Düzeltici
```
sulamaDüz = { evet: 1.25, hayır: 1.0 }
toprakDüz = { iyi: 1.15, orta: 1.0, zayıf: 0.85 }

tahminiVerim = ortalama × sulamaDüz × toprakDüz   (Kg/da)
tahminiUretim = tahminiVerim × alan / 1000         (Ton)
```

### 3.3 Risk Skoru (Değişim Katsayısı)
```
CV = std / ortalama

CV < 0.10  → 🟢 Düşük Risk (stabil ürün, güvenilir tahmin)
CV 0.10–0.20 → 🟡 Orta Risk (normal tarımsal değişkenlik)
CV > 0.20  → 🔴 Yüksek Risk (iklim/hastalık risk faktörü var)
```

### 3.4 Trend Skoru
```
trend = (y2024 - y2020) / y2020 × 100   (%)
trend > +5%  → ↗ Yükselen
trend < -5%  → ↘ Düşen
else         → → Stabil
```

### 3.5 Karşılaştırma Puanı
```
ilPerformans = (ilçeVerim / ilVerim - 1) × 100     (%)
ulusalPerformans = (ilçeVerim / turkiyeVerim - 1) × 100 (%)
```

---

## 4. Hasat Takvimi (Hardcoded Lookup)

Hava durumu API'si gerekmez. Bölge × Ürün → Ekim/Çıkış/Hasat ayları:

| Ürün Grubu | Ekim | Hasat | Not |
|-----------|------|-------|-----|
| Buğday (Kışlık) | Ekim–Kasım | Haziran–Temmuz | Güney'de May |
| Arpa (Kışlık) | Ekim–Kasım | Mayıs–Haziran | |
| Mısır | Nisan–Mayıs | Eylül–Ekim | Sulamalı |
| Ayçiçeği | Nisan–Mayıs | Ağustos–Eylül | |
| Şekerpancarı | Mart–Nisan | Eylül–Kasım | |
| Pamuk | Nisan–Mayıs | Eylül–Kasım | |
| Patates | Mart–Nisan | Temmuz–Ağustos | |
| Domates | Mayıs | Temmuz–Eylül | |
| Elma | — | Ağustos–Ekim | Çok Yıllık |
| Fındık | — | Ağustos–Eylül | Çok Yıllık |
| Zeytin | — | Ekim–Aralık | Çok Yıllık |
| Kiraz | — | Mayıs–Haziran | Çok Yıllık |

Güneydoğu/Akdeniz bölgelerinde takvim 2-3 hafta öne kayar.

---

## 5. UI/UX — Sihirbaz Akışı

```
[Ana Menü] → [HasatTahmini]
                    │
            ┌───────┴────────┐
            │  ADIM GÖSTERGESİ (1/4)  │
            └───────┬────────┘
                    │
          ┌─────────▼──────────┐
          │  Adım 1: 📍 KONUM   │
          │  • GPS Butonu       │
          │  • İl Dropdown      │
          │  • İlçe Dropdown    │
          └─────────┬──────────┘
                    ▼
          ┌─────────▼──────────┐
          │  Adım 2: 🌾 ÜRÜN   │
          │  • Kategori filtresi│
          │  • Arama kutusu    │
          │  • Ürün grid (chip)│
          └─────────┬──────────┘
                    ▼
          ┌─────────▼──────────┐
          │  Adım 3: 📐 ARAZİ  │
          │  • Alan (da) input  │
          │  • Sulama: E/H     │
          │  • Toprak kalitesi │
          └─────────┬──────────┘
                    ▼
          ┌─────────▼──────────────────────────┐
          │  Adım 4: 📊 TAHMİN SONUÇLARI       │
          │                                     │
          │  [KPI Kartları]                     │
          │  Tahmini Verim | Tahmini Üretim    │
          │  Risk Skoru    | Trend              │
          │                                     │
          │  [Karşılaştırma Barı]               │
          │  İlçe vs İl vs Türkiye              │
          │                                     │
          │  [5 Yıl Verim Grafiği]              │
          │  LineChart — ilçe + il + TR         │
          │                                     │
          │  [Üretim Aralığı]                   │
          │  Kötümser | Tahmin | İyimser        │
          │                                     │
          │  [Hasat Takvimi]                    │
          │  12 ay çubuğu, renkli dönemler      │
          │                                     │
          │  [Tekrar Hesapla] [PDF]             │
          └─────────────────────────────────────┘
```

---

## 6. Teknik Mimari

```
src/pages/
  HasatTahminiPage.tsx          ← Ana sihirbaz (tek dosya)
  HasatTahminiPage.css          ← Mevcut CSS

src/pages/hasat/  (opsiyonel bölme — karmaşıklaşırsa)
  Step1Location.tsx
  Step2Crop.tsx
  Step3Field.tsx
  Step4Results.tsx
```

**State yapısı:**
```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4;
  // Adım 1
  il: string;
  ilce: string;
  locationMethod: 'manual' | 'gps';
  // Adım 2
  urun: string;
  urunKategori: string;
  // Adım 3
  alan: number;        // dekar
  sulama: boolean;
  toprakKalite: 'iyi' | 'orta' | 'zayif';
  // Veriler
  ilceData: YearData | null;
  ilData: YearData | null;
  turkiyeData: YearData | null;
}
```

---

## 7. GPS Konum

```typescript
navigator.geolocation.getCurrentPosition(async (pos) => {
  const { latitude, longitude } = pos.coords;
  // ÜCRETSİZ reverse geocode: nominatim.openstreetmap.org
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`
  );
  const data = await res.json();
  // data.address.province → il
  // data.address.county → ilçe
});
```

Nominatim: Ücretsiz, kayıt gerektirmez, rate limit: 1 req/sn (yeterli).

---

## 8. Veri Yoksa Fallback

İlçede veri yoksa (yeni ürün, küçük ilçe):
1. İl ortalamasını kullan > uyarı göster
2. İl de yoksa Türkiye ortalamasını kullan > uyarı göster
3. Hiçbirinde veri yoksa "Bu ürün bu bölge için veri bulunamadı" yerine
   → En yakın benzer ürün öner (tahıl grubunda arama)

---

## 9. Uygulama Aşamaları

| Faz | İçerik | Süre |
|-----|--------|------|
| 1 | HasatTahminiPage.tsx sihirbaz iskelet (4 adım state) | 30 dk |
| 2 | Adım 1: Konum — GPS + il/ilçe dropdownları | 20 dk |
| 3 | Adım 2: Ürün seçimi — API ile ilçeye özel ürünler | 20 dk |
| 4 | Adım 3: Arazi formu | 15 dk |
| 5 | Adım 4: Sonuç hesaplama + KPI + grafik + takvim | 45 dk |
| 6 | CSS polish + responsive | 15 dk |

**Toplam: ~2.5 saat**

---

## 10. Gelecek Özellikler (V2)

- **Kuraklık indeksi** (SPEI/SPI) bölgesel geçmiş verilerden
- **Rakip ürün karşılaştırması** - Aynı araziye hangi ürün daha iyi verir?
- **Çoklu parsel** - Birden fazla tarla + toplam rekolte
- **Gelir tahmini** - Güncel TÜİK meslek fiyatlarıyla
- **Mobil kamera** - Ocak tarama ile tarla alanı hesaplama
- **Sulama tavsiyesi** - Ürün × bölge × mevsim bazlı
- **İhracat fırsatı** - İlçe ürünü dış ticarette hangi ülkelere gidiyor?
