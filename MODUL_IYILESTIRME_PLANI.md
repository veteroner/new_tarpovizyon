# 🔧 Modül İyileştirme Planı — Acımasız Revizyon

> **Tarih:** 2025-01-XX  
> **Hedef:** 4 modülü (Takvim, Sulama, Gübre, Hasat) demo seviyesinden "gerçek kullanılabilir" seviyeye çıkarmak  
> **Kısıtlar:** Harici API key yok (weather API yok), Backend = MySQL → fetchQuery(sql), Harita = d3-geo SVG (TurkeyHeatMap)

---

## 📋 Öncelik Sırası

| # | Modül | Mevcut Skor | Hedef | Kritik Sorun |
|---|-------|-------------|-------|-------------|
| 1 | Tarımsal Takvim | 2.5/10 | 7/10 | Tüm aktiviteler "Hafta 2" — sıfır bölgesel fark |
| 2 | Sulama Planlayıcı | 4/10 | 7.5/10 | ETo = sabit 5mm/gün — Antalya=Erzurum |
| 3 | Gübre Hesaplayıcı | 5/10 | 7.5/10 | Mikro element yok, bölgesel profil yok |
| 4 | Hasat Tahmini | 7/10 | 9/10 | Map yok, iklim risk skoru yok |

---

## 🟥 1. TARIMSAL TAKVİM — Komple Yeniden Yapılanma

### Mevcut Durum
- 14 ürün profili, 5 aktivite tipi (ekim/sulama/gübre/ilaç/hasat)
- 3 görünüm (takvim/liste/timeline)
- **KRİTİK HATA:** Tüm `hafta` değerleri 2 veya 3 olarak hardcoded
- Bölge seçimi YOK — Ege çiftçisi ve Doğu Anadolu çiftçisi aynı takvimi görüyor
- Not/açıklamalar tamamen generic

### Yapılacaklar

#### 1.1 İklim Bölgesi Sistemi (Yeni)
```
7 iklim bölgesi tanımlanacak:
- Akdeniz (sıcak kışlar): offset = 0
- Ege (ılık): offset = +1 hafta
- Marmara (ılık-soğuk): offset = +2 hafta
- İç Anadolu (karasal): offset = +3 hafta
- Karadeniz (nemli): offset = +2 hafta
- Doğu Anadolu (soğuk): offset = +5 hafta
- Güneydoğu (sıcak-kurak): offset = -1 hafta
```

81 ili bölgelere eşleyen bir `IL_IKLIM_BOLGE` map oluşturulacak.

#### 1.2 Dinamik Hafta Hesaplama
- `hafta: 2` yerine `hesaplaHafta(baseAy, baseHafta, bolgeOffset)` fonksiyonu
- Her ürünün base ekiliş ayı ve haftası bölge offset'i ile kaydırılacak
- Ay sınırları kontrolü (12'den büyükse → sonraki yıla wrap)

#### 1.3 Bölge Seçimi UI
- Üst kısma il seçimi dropdown (81 il)
- İl seçince otomatik bölge tespiti
- Bölge ismi ve offsetin gösterilmesi
- Bölge seçilmezse "Türkiye Ortalaması" (default offset=0)

#### 1.4 Zenginleştirilmiş Aktivite Notları
- Her aktivite-ürün-bölge kombinasyonuna özelleştirilmiş not
- Sıcaklık eşik bilgisi: "Toprak sıcaklığı 12°C üstünde ekin" 
- Risk uyarıları: "Bu bölgede don riski Nisan sonuna kadar sürebilir"

#### 1.5 Bugünün Görevleri Kartı (Yeni)
- Mevcut aya ve haftaya göre "Bu hafta yapılması gerekenler" kartı
- Kritik görevler kırmızı vurgulu
- Gecikmiş görevler (geçmiş aylar) ikaz ile işaretli

#### 1.6 Ürün Profili Genişletme
- Kışlık/yazlık ürün ayrımı (buğday: kışlık ekim Ekim, yazlık ekim Mart)
- İlaçlama sayısını 1'den 2-3'e artır (zararlı tipi bazlı)
- Sulama frekanslarını CROP_WATER_DB ile senkronize et

#### 1.7 PDF/Yazdırma Desteği
- `window.print()` ile optimize CSS media query
- Seçili ürünler + bölge bilgisi header'da

### Dosya Değişiklikleri
- `TarimTakvimPage.tsx` → ~%80 yeniden yazılacak (554 → ~900 satır)
- `TarimTakvimPage.css` → Yeni bileşenler ekleme (~100 satır)

---

## 🟧 2. SULAMA PLANLAYICI — Hesaplama Motorunun Gerçekçileştirilmesi

### Mevcut Durum
- 16 ürün, FAO Kc katsayıları (doğru)
- 4 toprak tipi, 4 sulama sistemi
- **KRİTİK HATA:** `const eto = 5.0 * climateFactor` — Tüm iller aynı ETo
- **KRİTİK HATA:** Sezon süresi sabit 120 gün — Zeytin de 120, mısır da 120
- **KRİTİK HATA:** `effectiveRain = 1.0` mm/gün — Her yerde aynı yağış

### Yapılacaklar

#### 2.1 İl Bazlı Aylık ETo Tablosu (En Kritik)
```typescript
// MGM (Meteoroloji Genel Müdürlüğü) verilerinden derlenen
// 81 il × 12 ay referans evapotranspiration tablosu
const IL_AYLIK_ETO: Record<string, number[]> = {
  'Adana':    [2.0, 2.5, 3.5, 4.8, 6.2, 7.5, 8.0, 7.3, 5.8, 4.0, 2.8, 2.0],
  'Antalya':  [2.2, 2.8, 3.8, 5.0, 6.5, 7.8, 8.3, 7.5, 6.0, 4.2, 3.0, 2.2],
  'Erzurum':  [0.8, 1.0, 2.0, 3.5, 5.0, 6.5, 7.2, 6.8, 5.0, 3.0, 1.5, 0.8],
  // ... 81 il
};
```
Bu tablo Penman-Monteith değil ama Hargreaves yaklaşımı ile yayınlanmış MGM ortalamalarına dayalı olacak. Artık Antalya Temmuz'da 8.3 mm/gün, Erzurum'da 7.2 mm/gün gösterecek.

#### 2.2 İl Bazlı Aylık Yağış Tablosu
```typescript
const IL_AYLIK_YAGIS: Record<string, number[]> = {
  'Adana':    [111, 87, 67, 51, 48, 20, 6, 5, 17, 42, 72, 119],
  'Antalya':  [237, 150, 95, 51, 31, 10, 3, 2, 13, 64, 131, 262],
  'Erzurum':  [22, 26, 38, 56, 72, 47, 24, 16, 22, 43, 33, 24],
  // ... 81 il
};
```
Effective rainfall = min(0.8 × aylıkYağış/30, ETc) — FAO formülüyle hesaplanacak.

#### 2.3 Ürün Bazlı Sezon Süresi
```typescript
const URUN_SEZON: Record<string, { sure: number; baslangicAy: number }> = {
  'Buğday':         { sure: 230, baslangicAy: 10 },  // kışlık
  'Mısır':          { sure: 140, baslangicAy: 5 },
  'Domates':        { sure: 150, baslangicAy: 4 },
  'Zeytin':         { sure: 200, baslangicAy: 4 },
  // ...
};
```

#### 2.4 Hesaplama Motorunun Güncellenmesi
Mevcut:
```
eto = 5.0 * climateFactor    →  SABİT
effectiveRain = 1.0           →  SABİT  
sezonSure = 120               →  SABİT
```
Yeni:
```
eto = IL_AYLIK_ETO[il][ay]                     →  İl + Ay bazlı
effectiveRain = calcEffRain(il, ay, etc)        →  İl + Ay bazlı
sezonSure = URUN_SEZON[urun].sure              →  Ürün bazlı
```

#### 2.5 Aylık Su Dengesi Grafiği (Yeni)
- Recharts BarChart: 12 ay boyunca ETc vs Yağış çubuk grafiği
- Net sulama ihtiyacı çizgi olarak overlay
- Kritik dönem (Kc peak) vurgulanacak
- Kullanıcıya sezon boyunca ay-ay ne kadar su gerektiğini gösterir

#### 2.6 İklim Bölgesi → İl Bazlı Otomatik Geçiş
- Mevcut 3 iklim bölgesi radio button kaldırılacak
- İl seçilince otomatik iklim bilgisi gelecek (ETo tablosundan)
- Manual override opsiyonu kalacak

#### 2.7 Toprak Tipi Su Tutma Etkisi
- `SOIL_TYPES.su_tutma` değeri şu an kullanılmıyor → hesaplamaya dahil edilecek
- TAW (Total Available Water) = su_tutma × kök derinliği
- RAW (Readily Available Water) hesaplanacak → sulama sıklığını belirleyecek

### Dosya Değişiklikleri
- `SulamaPlanPage.tsx` → Hesaplama motoru %100 yeniden yazılacak, yeni veri tabloları, grafik ekleme (549 → ~1000 satır)
- `SulamaPlanPage.css` → Grafik ve yeni kartlar için ekleme (~150 satır)

---

## 🟨 3. GÜBRE HESAPLAYICI — Derinleştirme ve Bölgeselleştirme

### Mevcut Durum
- 16 ürün × NPK veritabanı (doğru)
- 12 gübre ürünü (kimyasal + organik)
- Compound gübre optimizasyon algoritması (çalışıyor)
- pH uyarısı (çalışıyor)
- **EKSİK:** Mikro elementler (Fe, Zn, Mn, B, Cu) yok
- **EKSİK:** Bölgesel farklılık yok — Trakya ile Çukurova aynı
- **EKSİK:** Arazi büyüklüğü (dekar) girişi yok → toplam miktar hesaplanamıyor
- **EKSİK:** Fiyatlar sabit hardcoded

### Yapılacaklar

#### 3.1 Arazi Büyüklüğü Ekleme (Kritik)
- Step 1'e veya Step 2'ye `alan: number` (dekar) input ekleme
- Tüm kg hesaplamalarını `* alan` ile çarpma
- Sonuçlarda hem kg/dekar hem toplam kg gösterme

#### 3.2 Mikro Element Desteği
```typescript
interface CropNutrientData {
  // ... mevcut NPK ...
  fe: number;   // Demir (mg/kg)
  zn: number;   // Çinko (mg/kg)  
  mn: number;   // Mangan (mg/kg)
  b: number;    // Bor (mg/kg)
}
```
- CROP_NUTRIENT_DB'ye mikro element değerleri ekleme
- Toprak analizi formuna mikro element inputları (opsiyonel)
- Sonuçlarda mikro element eksiklik tablosu
- Mikro element gübre önerileri (Demir sülfat, Çinko sülfat, Boraks)

#### 3.3 Bölgesel Toprak Profilleri
```typescript
const BOLGE_TOPRAK_PROFILLERI: Record<string, SoilAnalysis> = {
  'Trakya':        { n: 5, p2o5: 3, k2o: 12, ph: 6.5, organik_madde: 2.0 },
  'Çukurova':      { n: 8, p2o5: 5, k2o: 15, ph: 7.5, organik_madde: 1.8 },
  'İç Anadolu':    { n: 4, p2o5: 3, k2o: 8,  ph: 7.8, organik_madde: 1.2 },
  'Ege':           { n: 6, p2o5: 4, k2o: 10, ph: 7.0, organik_madde: 2.2 },
  'Karadeniz':     { n: 7, p2o5: 4, k2o: 9,  ph: 5.5, organik_madde: 3.5 },
  'GAP':           { n: 5, p2o5: 6, k2o: 14, ph: 7.8, organik_madde: 1.5 },
  'Doğu Anadolu':  { n: 3, p2o5: 2, k2o: 7,  ph: 7.2, organik_madde: 1.0 },
};
```
- Step 2'ye "Bölge seçerek otomatik doldur" butonu
- Mevcut "Fakir/Orta/Verimli" hızlı seçenekler + bölgesel profiller

#### 3.4 NPK Gauge Grafikleri (Yeni)
- Sonuç sayfasında 3 adet gauge/radar chart (Recharts RadarChart)
- N, P₂O₅, K₂O için: İhtiyaç vs Mevcut vs Önerilen
- Görsel olarak hangi elementin ne kadar eksik olduğu anında anlaşılacak

#### 3.5 Gübre Maliyet Grafiği (Yeni)
- Recharts BarChart: Kimyasal vs Organik maliyet kırılımı
- Her gübre ürününün maliyet payı (stacked bar)

#### 3.6 Uygulama Takvimini Geliştirme
- Mevcut 3 dönem → 4-5 dönem (ürüne göre dinamik)
- Her dönem için önerilen gübre isimlerini de göster (sadece NPK kg değil)
- Zaman çizelgesi görsel (mini timeline)

### Dosya Değişiklikleri
- `GubreHesapPage.tsx` → Yeni data tabloları, gauge chart, arazi input (721 → ~1100 satır)
- `GubreHesapPage.css` → Gauge ve yeni kartlar (~150 satır)

---

## 🟩 4. HASAT TAHMİNİ — Harita ve İstihbarat Katmanı

### Mevcut Durum
- 4 aşamalı wizard (lokasyon, ürün, alan, sonuçlar)
- GPS + Nominatim reverse geocode (çalışıyor)
- TÜİK verisiyle lineer regresyon (R², trend, projeksiyon)
- Maks 5 ürün karşılaştırma (çalışıyor)
- localStorage geçmiş (max 20)
- Maliyet/gelir analizi (çalışıyor)
- **EKSİK:** Harita görselleştirme yok — en büyük eksik
- **EKSİK:** İller arası karşılaştırma yok
- **EKSİK:** Verim risk haritası yok

### Yapılacaklar

#### 4.1 Türkiye Verim Haritası (En Büyük Ekleme)
- TurkeyHeatMap komponentini kullanarak seçilen ürünün il bazında verim yoğunluk haritası
- `fetchQuery` ile `tuik_bitkisel_uretim` tablosundan tüm illerin verim verisini çek
- Renk skalası: Koyu yeşil (yüksek verim) → Koyu kırmızı (düşük verim)
- Hover ile il adı + verim değeri tooltip
- Kullanıcının seçtiği il vurgulanacak (border highlight)

```typescript
// Harita verisi çekme SQL:
const sql = `SELECT ili, y2024 as verim FROM tuik_bitkisel_uretim 
  WHERE duzey='il' AND urun='${urun}' AND unsur='Verim' AND birim='Kg/Dekar'`;
```

#### 4.2 Mini Spark Chart Karttaki İllere
- Her ilin yanında son 7 yıl mini trend grafiği (sparkline)
- Recharts LineChart minimal boyut (50x20px)

#### 4.3 İl Sıralaması Tablosu (Yeni)
- Seçilen ürün için 81 il verim sıralaması
- Sütunlar: Sıra, İl, Verim (kg/da), Trend (↑↓), Değişim (%)
- Kullanıcının seçtiği il highlight
- Sıralama criteria: Verim, Üretim, Trend

#### 4.4 İklim Risk Skoru (Yeni)
- Verim variasyon katsayısı (CV) kullanarak il-ürün bazlı risk skoru
- 7 yıllık veriden stddev/mean hesaplaması
- Risk seviyeleri: 🟢 Düşük (CV<15%), 🟡 Orta (15-30%), 🔴 Yüksek (>30%)
- Sonuç kartına risk badge ekleme

#### 4.5 Sonuç Sayfası Haritayı Göstersin
- Step 4 (Sonuçlar) sayfasına harita kartı ekleme
- Haritanın altında ürün verim sıralaması (top 10 il)
- Seçilen ilin konumu haritada vurgulu

#### 4.6 Trend Grafiğini Güçlendirme
- Mevcut 7 yıl + 2 yıl projeksiyon → güven aralığı ekleme
- ±1 stddev band (alan grafiği) ile belirsizlik gösterme
- Recharts AreaChart ile güven bandı

### Dosya Değişiklikleri
- `HasatTahminiPage.tsx` → Harita bileşeni, sıralama tablosu, risk skoru (1253 → ~1600 satır)
- `HasatTahminiPage.css` → Harita ve tablo stilleri (~200 satır)

---

## 🔧 Teknik Detaylar

### Ortak Veri Tabloları (Paylaşılacak)
Sulama ve Takvim modülleri aynı bölge/iklim verisini kullanacak. Ortak bir utility dosyası oluşturulacak:

```
src/utils/climate-data.ts
```

Bu dosya şunları içerecek:
- `IL_IKLIM_BOLGE`: 81 il → iklim bölgesi eşlemesi
- `IL_AYLIK_ETO`: 81 il × 12 ay ETo tablosu
- `IL_AYLIK_YAGIS`: 81 il × 12 ay yağış tablosu
- `BOLGE_OFFSETS`: Bölge bazlı takvim kayma değerleri
- `BOLGE_TOPRAK_PROFILLERI`: Bölge bazlı ortalama toprak değerleri

### Mevcut Kullanılabilir Bileşenler
- `TurkeyHeatMap` → Hasat Tahmini haritası için hazır
- `Recharts` → Gauge, BarChart, sparkline için mevcut
- `fetchQuery(sql)` → tuik_bitkisel_uretim verisi için
- `localStorage` → Takvim tercihleri kaydetme için

### Build & Deploy
- Vite build → Netlify CI/CD
- Yeni bağımlılık YOK — tüm iyileştirmeler mevcut paketlerle yapılacak

---

## ⏱️ Uygulama Sırası

### Faz 1: Tarımsal Takvim (İlk — En düşük skor)
1. `climate-data.ts` oluştur (ortak veri)
2. TarimTakvimPage.tsx yeniden yaz (bölge seçimi + dinamik hafta)
3. CSS güncellemeleri
4. Test

### Faz 2: Sulama Planlayıcı
1. `climate-data.ts`'den ETo/yağış tablosu kullan
2. Hesaplama motorunu yeniden yaz
3. Aylık su dengesi grafiği ekle (Recharts)
4. Test

### Faz 3: Gübre Hesaplayıcı
1. Arazi büyüklüğü input ekle
2. Mikro element veritabanı ve UI
3. Bölgesel profiller
4. NPK gauge grafiği ekle
5. Test

### Faz 4: Hasat Tahmini
1. TurkeyHeatMap entegrasyonu
2. İl sıralaması tablosu
3. İklim risk skoru
4. Güven aralığı grafiği
5. Test

---

## ✅ Başarı Kriterleri
- [ ] Takvim: Adana ve Erzurum'da aynı ürün farklı tarihler gösteriyor
- [ ] Sulama: Antalya'da ETo=8.3, Erzurum'da ETo=7.2 (Temmuz) farklı sonuç
- [ ] Gübre: 100 dekar arazi için toplam gübre kg ve maliyet hesaplanıyor
- [ ] Hasat: Seçilen ürünün Türkiye haritasında verim dağılımı görünüyor
- [ ] Tüm modüller: Yazdır butonu çalışıyor
- [ ] Tüm modüller: Hata state handling mevcut
