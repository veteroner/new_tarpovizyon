# TÜİK Hayvansal Dış Ticaret (Pro) - Kullanım Kılavuzu

## Erişim
- **Menü Konumu**: Header → Türkiye → Hayvansal Üretim → "TÜİK Hayvansal Dış Ticaret (Pro)"
- **URL**: `/turkey/tuik-animal-trade-pro`
- **Veri Kaynağı**: `tuik_ticarethayvansal` tablosu

## Özellikler

### 1. Filtreler
- **Ürün Seçimi**: Multi-select dropdown ile birden fazla ürün seçilebilir
- **Yıl Seçimi**: Çoklu yıl seçimi (örn: 2020, 2021, 2022)
- **Ay Seçimi**: Çoklu ay seçimi (tüm aylar veya belirli aylar)
- **Ülke Filtresi**: Haritadan tıklayarak tek ülke odaklı analiz

### 2. KPI Kartları (4 adet)
- **Toplam İhracat**: Seçilen filtrelere göre toplam ihracat değeri (USD)
- **Toplam İthalat**: Seçilen filtrelere göre toplam ithalat değeri (USD)
- **Denge**: İhracat - İthalat (yeşil = pozitif, kırmızı = negatif)
- **Yoğunlaşma**: 
  - Top-5 ülke payı (%)
  - HHI endeksi (Herfindahl-Hirschman Index: pazar yoğunlaşma göstergesi)

### 3. Dünya Haritası - İnteraktif Görselleştirme

#### Metrik Değiştirme
Harita üstündeki 3 buton ile görselleştirme metriği seçilir:
- **İhracat**: Mavi gradyan (koyu = yüksek ihracat)
- **İthalat**: Mavi gradyan (koyu = yüksek ithalat)
- **Denge**: Kırmızı/Yeşil diverging (yeşil = fazla, kırmızı = açık)

#### Hover (Fare Üzerine Gelme)
- Ülke üzerine gelindiğinde **tooltip** görünür
- Tooltip'te **3 metrik birden** gösterilir:
  - 🟢 İhracat: $XXX
  - 🔴 İthalat: $XXX
  - ⚖️ Denge: $XXX
- Alttaki **ülke tablosunda** ilgili satır highlight olur

#### Click (Tıklama)
- Ülkeye tıklanınca **filtreleme** yapılır
- Sayfa yalnızca o ülke verilerini gösterir (KPI, grafikler, tablo)
- **Tekrar tıklama**: Filtreyi kaldırır (tüm ülkeler)

### 4. Grafikler (5 adet)

#### a) Yıllık Trend (Composed Chart)
- Line: İhracat trendi (mavi)
- Line: İthalat trendi (turuncu)
- Bar: Net Denge (yeşil/kırmızı)
- X-ekseni: Yıllar

#### b) Ürün Bazlı Dağılım (Bar Chart)
- En çok ticaret yapılan 10 ürün
- Seçilen metrik (ihracat/ithalat/denge) bazında sıralama

#### c) Ülke Bazlı Dağılım (Bar Chart)
- En önemli 10 ticaret ortağı
- Seçilen metrik bazında sıralama

#### d) Ürün Kompozisyonu (Pie Chart)
- Top 8 ürün + "Diğer"
- % dağılım gösterir

#### e) Dünya Haritası
- Yukarıda detaylı anlatıldı

### 5. Ülke Detay Tablosu
- **Sütunlar**: Ülke Adı, İhracat, İthalat, Net Denge, Pay (%)
- **Sıralama**: İhracat değerine göre azalan (varsayılan)
- **Highlight**: Haritada hover edilen ülke sarı arka planla vurgulanır
- **Filtreleme**: Tablo üst kısmındaki arama kutusuyla ülke aranabilir

## Kullanım Senaryoları

### Senaryo 1: Belirli Bir Ülkenin Tüm Ürünlerdeki Ticareti
1. Haritadan ülkeye tıklayın (örn: Almanya)
2. Tüm KPI, grafik ve tablo yalnızca Almanya için güncellenir
3. Ürün grafiğinde Almanya ile en çok hangi ürünlerde ticaret yapıldığını görürsünüz
4. Tekrar tıklayarak filtreyi kaldırın

### Senaryo 2: Belirli Bir Ürünün Dünya Dağılımı
1. Ürün filtresinden tek bir ürün seçin (örn: "Sığır eti")
2. Harita o ürün için ihracat/ithalat dağılımını gösterir
3. Ülke tablosunda en önemli alıcı/satıcı ülkeler listelenir

### Senaryo 3: Yıllık Trend Analizi
1. Birden fazla yıl seçin (örn: 2018-2023)
2. "Yıllık Trend" grafiğinde ihracat/ithalat gelişimini görün
3. Hangi yılda ticaret fazlası/açığı olduğunu denge çizgisinden takip edin

### Senaryo 4: Pazar Yoğunlaşması Kontrolü
1. "Yoğunlaşma" KPI kartına bakın
2. **Top-5 > 70%**: Yüksek yoğunlaşma (az sayıda ülkeye bağımlılık)
3. **HHI > 2500**: Monopoli benzeri pazar yapısı
4. Düşük değerler: Diversifiye pazar

## Teknik Notlar

### Ülke Adı Eşleştirme
- Veritabanında Türkçe ülke adları var (örn: "Abd", "Almanya")
- Harita GeoJSON'unda İngilizce adlar var (örn: "United States of America")
- Sistem otomatik normalizasyon + alias mapping ile eşleştirme yapar
- Eksik eşleşmeler gri renkle gösterilir (veri yok)

### Performans
- **World GeoJSON**: 180 ülke, 64KB
- **d3-geo**: geoNaturalEarth1 projection (profesyonel görüntü)
- **Veri Agregasyonu**: SQL seviyesinde (hızlı)

### Metrik Tanımları
- **İhracat**: `deger` toplamı (`ticaret_yonu = 'İhracat'`)
- **İthalat**: `deger` toplamı (`ticaret_yonu = 'İthalat'`)
- **Denge**: İhracat - İthalat
- **HHI**: Σ(Ülke Payı²) × 10,000 (0-10,000 arası; 10,000 = tek ülke)

## Geliştirici Notları

### Bileşenler
- `src/pages/TuikAnimalTradeProPage.tsx`: Ana sayfa
- `src/components/WorldTradeMap.tsx`: Yeniden kullanılabilir harita bileşeni
- `public/world.geojson`: 180 ülke geometrisi

### Veri Akışı
```
DB (tuik_ticarethayvansal) 
  → fetchQuery (SQL agregasyonu)
  → Ülke adı normalizasyonu (toGeoEnglishName)
  → GeoJSON join
  → WorldTradeMap (choropleth)
  → DetailedTable (hover sync)
```

### Renk Skalası
- **İhracat/İthalat**: `scaleSequential(interpolateBlues)` (Viridis benzeri)
- **Denge**: `scaleLinear()` diverging (kırmızı → beyaz → yeşil)

---

**Son Güncelleme**: 17 Şubat 2026  
**Sürüm**: 1.0  
**Geliştirici**: GitHub Copilot (Claude Sonnet 4.5)
