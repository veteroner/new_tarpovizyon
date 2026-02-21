# TÜİK Hayvansal Dış Ticaret (Canlı Hayvan Envanteri Sonrası Sekme) — Tasarım Dokümanı

Tarih: 16 Şubat 2026

## 1) Amaç ve Beklenen Sonuç
Bu çalışma; **TÜİK Canlı Hayvan Envanteri** menü öğesinden hemen sonra, **hayvansal dış ticaret** odağında (ihracat/ithalat) “profesyonel ve derinlemesine” analizler sunan yeni bir sekme/sayfa eklemeyi hedefler.

Beklenen kullanıcı çıktıları:
- Hayvansal dış ticaretin **büyüklüğü, yönü (ihracat/ithalat), denge (net)** ve **zaman içindeki değişimi**
- **Ürün kırılımı** (ana ürün/alt ürün) ve **partner ülke kırılımı**
- **Dünya haritası** üzerinde partner ülkelere göre değer/miktar dağılımı (interaktif)
- “Bölge/ülke/ürün/yıl/ay” filtreleri ile interaktif metrikler ve grafikler

## 2) Menü / Navigasyon Kararı (Onay Gerektirir)
Mevcut durumda “TÜİK Hayvan Ticareti” sayfası zaten var: `/turkey/tuik-animal-trade`.
Kullanıcı isteği: **“TÜİK Canlı Hayvan Envanteri sekmesinden sonra bir dış ticaret sekmesi ekle.”**

Bu nedenle 2 seçenek öneriyorum:

**Seçenek A (Önerilen):**
- `Türkiye > Hayvansal Üretim` menüsünde
  - `TÜİK Canlı Hayvan Envanteri` ardından
  - yeni öğe: **`TÜİK Hayvansal Dış Ticaret`**
- Bu yeni öğe **mevcut** `/turkey/tuik-animal-trade` sayfasına gider ve sayfa kapsamı genişletilir (dünya haritası + derin analizler).

**Seçenek B:**
- Yeni route açılır: `/turkey/tuik-animal-trade-plus` (veya benzeri)
- Eski `/turkey/tuik-animal-trade` korunur; yeni sekme yeni sayfaya gider.

> Onay sorusu: A mı B mi? (Ben A’yı öneriyorum: tek sayfa, tek gerçek kaynak.)

## 3) Veri Kaynağı
- Tablo: `tuik_ticarethayvansal`
- Erişim: Uygulama içinden `fetchQuery(sql)` ile (API: `api.php?action=query...`)
- Kullanıcı sağladı: phpMyAdmin bağlantısı (şema doğrulama için uygulama üzerinden sorgu ile ilerleyeceğiz).

### 3.1 Şema Keşfi (İlk Adım)
Uygulamada çalışacak şekilde aşağıdaki sorgularla kesin kolon setini çıkaracağız:
- `SHOW COLUMNS FROM tuik_ticarethayvansal;`
- `SELECT * FROM tuik_ticarethayvansal LIMIT 5;`
- `SELECT DISTINCT yil FROM tuik_ticarethayvansal ORDER BY yil DESC;`
- `SELECT DISTINCT ay FROM tuik_ticarethayvansal ORDER BY ay;`
- `SELECT DISTINCT ana_urun FROM tuik_ticarethayvansal ORDER BY ana_urun;`

> Not: Şu an kodda bu tablo için beklenen alanlar zaten görünüyor: `ana_urun, alt_urun, ulke, yil, ay, ihracat_mik, ithalat_mik, ihracat_deger, ithalat_deger`.

## 4) Sayfa Bilgi Mimarisi (Tek Sayfa, Bölümlü)
Sayfa tek route altında, aşağıdaki **bölümler** halinde tasarlanır (ek sayfa/ek modal olmadan).

### 4.1 Filtre Çubuğu (üstte)
Filtreler (hepsi opsiyonel; varsayılanlar mantıklı seçilir):
- **Yıl**: çoklu seçim (default: en güncel yıl)
- **Ay**: çoklu seçim (default: boş = tüm aylar)
- **Akış modu**: `İhracat / İthalat / İkisi` (default: İkisi)
- **Ürün(ler)**: çoklu seçim (default: 2 popüler ürün veya en çok değer üreten 2 ürün)
- **Partner ülke(ler)**: (harita tıklaması veya listeden) (default: tümü)

Etkileşim kuralları:
- Filtre değişince tüm KPI/grafikler güncellenir.
- Haritada bir ülkeye tıklamak, **partner ülke filtresini** o ülkeye set eder (tekrar tıklama = temizle).

### 4.2 KPI Kartları (üst özet)
Seçili filtrelere göre:
- Toplam İhracat Değeri ($)
- Toplam İthalat Değeri ($)
- Dış Ticaret Dengesi ($) = ihracat − ithalat
- Toplam Miktar (ürün tipine bağlı birim)
- Ortalama Birim Fiyat ($/birim) (uygun olduğunda)

### 4.3 Zaman Serisi (interaktif)
Grafikler (Recharts ile):
- Yıllara göre: `ihracat_deger`, `ithalat_deger`, `denge`
- Opsiyonel: aylık trend (ay verisi uygunsa)

### 4.4 Ürün Analizi (derin)
- Ürün bazında (ana ürün):
  - İhracat/İthalat değerleri (bar)
  - Denge (pozitif/negatif bar)
- Ürün payları (pie veya stacked)
- “Birim değer” analizi:
  - `birim_fiyat = değer / miktar` (miktar 0 ise gösterme)
  - Ürün bazında birim fiyat dağılımı ve yıllara göre değişim

### 4.5 Partner Ülke Analizi
- Top N partner ülke (değer bazlı) bar chart
- Konsantrasyon metrikleri:
  - **Top-5 payı** (Top 5 ülke / toplam)
  - **HHI** (Herfindahl-Hirschman Index) — ülkelerin değer payları üzerinden

### 4.6 Dünya Haritası (interaktif, choropleth)
Harita hedefi:
- Dünya ülkeleri üzerinde seçili metrik ile renklendirme:
  - Mod seçimi: `İhracat Değeri / İthalat Değeri / Denge / Miktar`
- Hover tooltip:
  - Ülke adı
  - seçili metrik(ler)
  - Toplam ihracat/ithalat + denge
- Click:
  - ülke seçer ve tüm grafikleri o ülkeye filtreler

#### Harita teknik yaklaşımı
Repo içinde hazır dünya geojson/topojson yok. 2 yaklaşım:

**Yaklaşım 1 (Önerilen):**
- `d3-geo` ile SVG choropleth (projeksiyon: NaturalEarth/Mercator)
- Dünya topojson/geojson dosyası `public/` altına eklenir (offline güvenilir)
- Ülke join problemi: `ulke` (TÜİK ülke adı) → ülke geometrisi (ISO3 veya standart isim)

**Yaklaşım 2:**
- Harita için ek kütüphane (`react-simple-maps` vb.)
- Daha hızlı geliştirme; ama ek bağımlılık ve join yine gerekli.

> Onay sorusu: Harita için “ek paket ekleyelim mi?”
> - İstemiyorsan: sadece `d3-geo` + statik geojson ile ilerleriz.

## 5) Birim ve “Canlı Hayvan” Özel Durumu
Mevcut hayvansal ticaret sayfasında iki farklı miktar mantığı var:
- Canlı hayvan kalemleri: miktar `baş` (dönüşüm yok)
- Diğer ürünler: miktar KG ise `Ton = KG/1000`

Bu davranış korunacak ve genelleştirilecek:
- Ürün tipi tespiti: `ana_urun` belirli bir liste içinde ise `baş`, değilse `ton`.
- Sayfada her grafikte aynı anda karışık birim oluşursa:
  - kartlarda birim “Ton/Baş”
  - ürün bazlı grafiklerde tooltip’te ürünün birimi ayrı gösterilir

## 6) SQL Sorgu Tasarımı (Performans Odaklı)
Amaç: her filtre değişiminde tablonun tamamını çekmek yerine **agregasyon** sorguları ile hafif yanıt.

Örnek sorgular (şema doğrulanınca netleştirilecek):
- Ürün listesi: `SELECT DISTINCT ana_urun FROM tuik_ticarethayvansal ORDER BY ana_urun;`
- Yıl listesi: `SELECT DISTINCT yil FROM tuik_ticarethayvansal ORDER BY yil DESC;`
- Ülke listesi: `SELECT DISTINCT ulke FROM tuik_ticarethayvansal ORDER BY ulke;`

- KPI agregasyon:
  - `SELECT SUM(ihracat_deger) exp_val, SUM(ithalat_deger) imp_val, SUM(ihracat_mik) exp_qty, SUM(ithalat_mik) imp_qty FROM ... WHERE ...;`

- Harita için ülke agregasyon (değer):
  - `SELECT ulke, SUM(ihracat_deger) exp_val, SUM(ithalat_deger) imp_val FROM ... WHERE ... GROUP BY ulke;`

- Yıllık trend:
  - `SELECT yil, SUM(ihracat_deger) exp_val, SUM(ithalat_deger) imp_val FROM ... WHERE ... GROUP BY yil ORDER BY yil;`

- Ürün kırılımı:
  - `SELECT ana_urun, SUM(ihracat_deger) exp_val, SUM(ithalat_deger) imp_val, SUM(ihracat_mik) exp_qty, SUM(ithalat_mik) imp_qty FROM ... WHERE ... GROUP BY ana_urun ORDER BY (exp_val+imp_val) DESC LIMIT 20;`

## 7) Ülke Adı Eşleştirme (Harita Join) — Kritik Risk
TÜİK tablosundaki `ulke` değerleri harita geometrisindeki ülke adı/ISO kodlarıyla birebir aynı olmayabilir.

Plan:
1) Mevcut `src/utils/countryTranslations.ts` ile normalize/çeviri
2) Eğer yetmezse: küçük bir “ülke alias” sözlüğü
3) En sağlam yaklaşım: ülkeyi ISO3’e maplemek (gerekirse küçük bir mapping JSON)

> Onay sorusu: Haritada **%100 eşleşme** istiyorsan ISO3 mapping dosyası eklememiz gerekebilir.

## 8) Kabul Kriterleri (Done Tanımı)
- Menüde `TÜİK Canlı Hayvan Envanteri` sonrasında **yeni dış ticaret sekmesi** görünür.
- Sayfa `tuik_ticarethayvansal` verisi ile çalışır.
- Filtreler (yıl/ay/ürün/akış/ülke) KPI + grafikler + haritayı etkiler.
- Dünya haritası:
  - hover tooltip
  - tıklayınca ülke filtresi
  - metrik seçimi (en azından değer bazlı)
- En az 3 derin analiz bloğu:
  1) Zaman trendi (değer bazlı)
  2) Ürün kırılımı
  3) Partner ülke + konsantrasyon (Top-5 payı, HHI)

## 9) Uygulama Planı (Onay Sonrası)
1) Menü güncellemesi (Header)
2) Şema keşfi sorguları ile kolon doğrulama
3) Mevcut `TuikAnimalTradePage`’i yeniden yapılandırma (filtre çubuğu + KPI + trend + ürün/ülke blokları)
4) Dünya haritası bileşeni ekleme (`WorldTradeMap`)
5) Ülke eşleştirme iyileştirmeleri
6) Build (`npm run build`) doğrulama

## 10) Açık Sorular (Senden Net Onay İstiyorum)
1) Menüdeki yeni sekme **nereye** eklensin?
   - A) `Türkiye > Hayvansal Üretim` altında, `TÜİK Canlı Hayvan Envanteri` sonrasında (önerilen)
   - B) Mevcut `Dış Ticaret` kategorisinde kalsın

2) Yeni sekme hangi sayfaya gitsin?
   - A) Mevcut `/turkey/tuik-animal-trade` sayfası geliştirilsin (önerilen)
   - B) Yeni route açılsın

3) Dünya haritasında varsayılan metrik ne olsun?
   - A) İhracat değeri
   - B) İthalat değeri
   - C) Denge

4) Harita için ek paket eklemeye onay var mı?
   - A) Hayır, sadece `d3-geo` + statik geojson
   - B) Evet, uygun bir harita paketi ekleyelim
