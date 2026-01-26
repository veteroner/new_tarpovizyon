# 🎯 TarpoVizyon Dashboard İyileştirme Planı

## 📋 Genel Vizyon
Türkiye tarım ve hayvancılık sektörünü kategorik, anlamlı ve zengin görselleştirmelerle sunan mükemmel bir dashboard.

---

## 🏗️ Dashboard Yapısı

### 1️⃣ **GENEL BAKIŞ SEKSİYONU**

#### 1.1 Ana KPI Kartları (Üst Satır)
- **Nüfus** (2023)
  - Toplam nüfus
  - Kırsal/Kentsel dağılım göstergesi
  
- **Ekonomi**
  - GSYİH (USD)
  - Kişi başı GSYİH
  - Tarımsal GSYİH payı (%)
  
- **Arazi**
  - Toplam tarım arazisi (ha)
  - Ülke alanına oranı (%)
  
- **İstihdam**
  - Tarımsal istihdam (bin kişi)
  - Toplam istihdama oranı (%)

#### 1.2 Nüfus ve İstihdam Analizi
- **Grafik 1:** Kırsal vs Kentsel Nüfus (Donut Chart)
- **Grafik 2:** Tarımsal İstihdam Trendi (2010-2023) (Area Chart)
- **Grafik 3:** Bölgesel İstihdam Dağılımı (Bar Chart)

#### 1.3 Arazi Kullanımı
- **Grafik 1:** Arazi Kullanım Dağılımı (Stacked Bar Chart)
  - Tarım arazisi
  - Orman arazisi
  - Çayır-mera
  - Ekilebilir arazi
  
- **Grafik 2:** Arazi Kullanımı Yıllık Değişim (Line Chart)

---

### 2️⃣ **HAYVANSAL ÜRETIM SEKSİYONU**

#### 2.1 Kategori KPI'ları
- **Süt Ürünleri Toplamı** (ton)
- **Et Ürünleri Toplamı** (ton)
- **Yumurta Üretimi** (milyon adet)
- **Diğer Ürünler** (ton)

#### 2.2 Süt Ürünleri (Alt Seksiyon)
**KPI'lar:**
- İnek sütü üretimi (ton)
- Koyun sütü üretimi (ton)
- Keçi sütü üretimi (ton)
- Toplam süt üretimi (ton)

**Grafikler:**
- Süt türlerine göre dağılım (Pie Chart)
- Yıllık süt üretim trendi (Area Chart)
- Dünya sütü üretiminde Türkiye'nin yeri (Top 10 ülkeler - Bar Chart)
- Süt verimlilik analizi (Line + Bar Combo)

#### 2.3 Et Ürünleri (Alt Seksiyon)
**KPI'lar:**
- Kırmızı et toplamı (sığır, koyun, keçi)
- Beyaz et toplamı (tavuk, hindi)
- Kişi başı et tüketimi (kg/yıl)

**Grafikler:**
- Et türlerine göre dağılım (Stacked Bar)
- Kırmızı vs Beyaz et trendi (Area Chart)
- Et üretimi ülke karşılaştırması (Top 15)
- Et üretim artış oranları (% değişim - Bar Chart)

#### 2.4 Yumurta Üretimi (Alt Seksiyon)
**KPI'lar:**
- Toplam yumurta (milyon adet)
- Tavuk yumurtası
- Diğer kuş yumurtaları
- Kişi başı yıllık tüketim (adet)

**Grafikler:**
- Yumurta türleri dağılımı (Donut)
- Yıllık üretim trendi (Area)
- Dünya üretiminde Türkiye (Top 10)
- Aylık üretim dağılımı (varsa) (Bar)

#### 2.5 Hayvan Varlığı
**KPI'lar:**
- Sığır sayısı
- Koyun sayısı
- Keçi sayısı
- Kanatlı sayısı

**Grafikler:**
- Hayvan türlerine göre dağılım (Treemap)
- Yıllık hayvan varlığı değişimi (Multi-line)
- Bölgesel hayvan dağılımı (Stacked Bar)

---

### 3️⃣ **BİTKİSEL ÜRETIM SEKSİYONU**

#### 3.1 Kategori KPI'ları
- **Tahıl Üretimi** (ton)
- **Meyve Üretimi** (ton)
- **Sebze Üretimi** (ton)
- **Yağlı Tohum Üretimi** (ton)

#### 3.2 Tahıllar (Alt Seksiyon)
**Ürünler:** Buğday, Arpa, Mısır, Çeltik
**Grafikler:**
- Tahıl türlerine göre üretim (Pie + Bar)
- Yıllık üretim trendi (Area)
- Verimlilik analizi (kg/ha) (Line)
- Dünya karşılaştırması (Top 10)

#### 3.3 Meyveler (Alt Seksiyon)
**Kategoriler:** Turunçgiller, Sert Kabuklu, Yumuşak Çekirdekli
**Grafikler:**
- Meyve kategorilerine göre dağılım (Stacked Bar)
- Top 10 meyve üretimi (Bar)
- İhracat potansiyeli (Scatter)
- Yıllık trend (Multi-line)

#### 3.4 Sebzeler (Alt Seksiyon)
**Kategoriler:** Yaprağı Yenen, Meyvesi Yenen, Kökü Yenen
**Grafikler:**
- Sebze kategorilerine göre dağılım (Pie)
- Top 15 sebze üretimi (Bar)
- Yıllık değişim (Area)

#### 3.5 Endüstri Bitkileri
**Ürünler:** Pamuk, Tütün, Şeker Pancarı, Ayçiçeği
**Grafikler:**
- Üretim dağılımı (Bar)
- Yıllık trend (Line)
- Ekonomik değer (Value by product)

---

### 4️⃣ **DIŞ TİCARET SEKSİYONU**

#### 4.1 KPI'lar
- **Toplam İhracat** (USD)
- **Toplam İthalat** (USD)
- **Dış Ticaret Dengesi** (USD)
- **İhracat/İthalat Oranı** (%)

#### 4.2 Grafikler
- İhracat vs İthalat Trendi (Dual Axis Area)
- En çok ihraç edilen ürünler (Top 20 - Bar)
- En çok ithal edilen ürünler (Top 20 - Bar)
- Ülkelere göre ihracat (Pie)
- Aylık ihracat/ithalat akışı (Combo Chart)
- Ürün kategorilerine göre dış ticaret (Stacked Bar)

---

### 5️⃣ **FİYAT ve ENFLASYON SEKSİYONU**

#### 5.1 KPI'lar
- **TÜFE (Gıda)** - Yıllık değişim (%)
- **ÜFE (Tarım)** - Yıllık değişim (%)
- **FAO Gıda Fiyat Endeksi**

#### 5.2 Grafikler
- Fiyat endeksleri trendi (Multi-line)
- Ürün bazında fiyat değişimleri (Heatmap)
- TÜFE vs ÜFE karşılaştırması (Dual Axis)
- Uluslararası fiyat karşılaştırması (Bar)

---

### 6️⃣ **SÜRDÜRÜLEBİLİRLİK ve ÇEVRE SEKSİYONU**

#### 6.1 KPI'lar
- **Gübre Kullanımı** (ton)
- **İlaç Kullanımı** (ton)
- **Organik Tarım Alanı** (ha)
- **Sulanan Alan** (ha)

#### 6.2 Grafikler
- Gübre türlerine göre kullanım (Stacked Bar)
- Pestisit kullanım trendi (Area)
- Organik tarım gelişimi (Line)
- Su kullanımı verimliliği (Combo)

---

### 7️⃣ **KARŞILAŞTIRMALI ANALİZ SEKSİYONU**

#### 7.1 Türkiye vs Dünya
- Üretim payları (Multiple products)
- Verimlilik karşılaştırması
- Büyüme oranları

#### 7.2 Bölgesel Analiz (Türkiye içi)
- İllere göre üretim haritası
- Bölgelere göre üretim dağılımı
- Bölgesel verimlilik

---

## 📊 Veri Kaynağından Eklenebilecek Ek Bilgiler

### Veri Kaynağı Haritası (DB keşfi sonucuna göre)

#### ✅ Zaten kullanılıyor / doğrulandı
1. ✅ **fao_livestock_primary** - Hayvansal üretim (süt/et/yumurta) + yıllık trend
2. ✅ **fao_nufus** - Nüfus (toplam/kırsal/kentsel)
3. ✅ **fao_land_use** - Arazi kullanımı (Tarım/Orman/Kara alanı vb.)
4. ✅ **fao_makro_1** - Makroekonomi (GSYİH ve kişi başı GSYİH)
  - Not: Bu tabloda doğru filtreleme `item + elementcode + unit` ile yapılmalı.
5. ✅ **tuik_hayvansayisi** - Hayvan varlığı (ülke/bölge/il/ilçe düzeyi, yıllara göre sütunlar: `y2004..y2024`)

#### 🧩 Eklenmeye hazır (DB’de mevcut)
6. **fao_trade_YYYY** - FAO dış ticaret tabloları (yıla göre ayrı tablolar)
7. **tuik_trade_YYYY** - TÜİK dış ticaret tabloları (son yıllar)
8. **tuik_bitkisel_uretim** - Bitkisel üretim (detaylı ürün kırılımları)
9. **tuik_hayvansal_uretim** - Hayvansal üretim (TÜİK alternatif/karşılaştırma)
10. **excel_tufe / excel_ufe / excel_gfe** - Enflasyon endeksleri (import edilen seriler)
11. **excel_fao_gida_endeksi** - FAO gıda fiyat endeksi (import edilen seri)
12. (Opsiyonel) **fao_makro_2**, **tr_makro** - Makro göstergelerde alternatif kaynak / fallback

### Eklenecek / Geliştirilecek Yeni Metrikler (Net hedefler)
- ✅ Hayvan varlığı (TÜİK ülke düzeyi, 2023)
- ✅ Et üretimi detay kırılım (kırmızı: sığır/koyun/keçi/manda; beyaz: tavuk/hindi)
- ✅ Arazi kullanımında “Diğer” (tarım + orman dışı)
- ✅ Yıllık büyüme oranları (temel üretim metrikleri)
- ⏳ Tarımsal istihdam (FAO/TÜİK tablo eşlemesi + trend)
- ⏳ Dış ticaret dengesi (FAO/TÜİK trade tabloları ile)
- ⏳ Fiyat endeksleri (TÜFE/ÜFE/GFE) + FAO endeksi
- ⏳ Bölgesel hayvan varlığı/üretim haritaları (bölge/il)
- ⏳ Verimlilik metrikleri (kg/ha, litre/hayvan) — veri uygunluğuna göre

### Sağlamlık / Fallback Stratejisi
- Makro: Önce **fao_makro_1** (doğru `elementcode/unit` ile), boş gelirse **tr_makro** fallback.
- Hayvan varlığı: **tuik_hayvansayisi** (FAO’da stok tablosu yok/eksikse TÜİK kullan).
- “0 gösterme” koruması: sorgu boşsa kartlarda `—` veya “Veri yok” yaklaşımı.

---

## 🎨 Görsel Tasarım İlkeleri

### Renk Paleti
- **Süt Ürünleri:** Mavi tonları (#3b82f6, #60a5fa, #93c5fd)
- **Et Ürünleri:** Kırmızı tonları (#ef4444, #f87171, #fca5a5)
- **Yumurta:** Turuncu/Sarı (#f59e0b, #fbbf24, #fcd34d)
- **Tahıllar:** Altın tonları (#eab308, #fde047, #fef08a)
- **Meyveler:** Yeşil tonları (#22c55e, #4ade80, #86efac)
- **Ekonomi:** Mor tonları (#8b5cf6, #a78bfa, #c4b5fd)

### Grafik Seçimleri
- **Karşılaştırma:** Bar Chart, Stacked Bar
- **Dağılım:** Pie Chart, Donut Chart, Treemap
- **Trend:** Area Chart, Line Chart
- **İlişki:** Scatter Plot, Bubble Chart
- **Kompozisyon:** Stacked Area, 100% Stacked Bar

---

## 🚀 Uygulama Aşamaları

### Faz 1: Temel Yapı ✅ TAMAMLANDI
- [x] Kategorik bölüm yapısı oluştur
- [x] Hayvansal üretim kategorilerini ayır (Süt, Et, Yumurta)
- [x] Her kategori için KPI kartları
- [x] Temel grafikler

### Faz 2: Veri Zenginleştirme ✅ TAMAMLANDI
- [x] Hayvan varlığı verileri ekle
- [x] Karşılaştırmalı analizler ekle
- [x] Kombinasyon grafikleri (multi-axis)
- [x] Kişi başı tüketim metrikleri
- [x] Yıllık büyüme oranları
- [ ] İstihdam verileri ekle (TODO)
- [ ] Dış ticaret verileri ekle (TODO)
- [ ] Fiyat endeksleri ekle (TODO)

### Faz 3: Görsel İyileştirme (ŞUANKİ FAZ)
- [ ] Kategori bazlı renk paletleri - optimize et
- [ ] İnteraktif filtreler
- [ ] Responsive tasarım optimizasyonu
- [ ] Animasyonlar ve geçişler

### Faz 3.1: Veri Kaynağı Sağlamlaştırma (Kritik)
- [ ] Makro (GSYİH) fallback + tutarlı etiketleme (nominal / reel)
- [ ] Hayvan varlığı bölgesel kırılımlar (bölge/il) + seçici filtre
- [ ] “Veri yok” durumlarını UI’da standartlaştır (placeholder)

### Faz 4: İleri Seviye Analizler
- [ ] Karşılaştırmalı analizler - genişlet
- [ ] Verimlilik metrikleri
- [ ] Bölgesel analizler
- [ ] Tahmin modelleri (varsa)

---

## 📝 Notlar

1. **Kategorizasyon Prensibi:** Aynı birim ve anlamlı karşılaştırma
2. **Veri Tutarlılığı:** Her kategoride aynı yıl/dönem verileri
3. **Kullanıcı Deneyimi:** Kolay navigasyon, hızlı yükleme
4. **Mobil Uyumluluk:** Responsive tasarım
5. **Erişilebilirlik:** Renk körlüğü uyumlu palet, kontrast oranları

---

**Hedef:** Türkiye tarım ve hayvancılık sektörünü en iyi şekilde analiz edebilen, kategorik, zengin ve profesyonel bir dashboard.
