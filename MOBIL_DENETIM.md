# Mobil uygulama denetimi — 10 Ağustos 2026

Bütün sayfalar 375×812'de (iPhone referans boyutu) gezilip **ölçülerek**
çıkarıldı. Tahmin yok; her bulgunun altında sayı var.

Ölçüm yöntemi: her sayfa mobil kabukta açıldı, DOM'dan şunlar okundu —
kaydırma yüksekliği, kaptan/ekrandan taşan öğeler, tıklanabilir kart
gruplarının sayısı ve kapladıkları piksel, 200 px'ten geniş SVG göstergeler,
grafik sayısı ve toplam grafik yüksekliği.

---

## Özet — asıl mesele

Kullanıcının cümlesi: *"çok fazla içerik var her sayfada"*. Ölçüm bunu
doğruluyor ve nedenini de gösteriyor:

| | Ortalama sayfa boyu | En uzun |
|---|---|---|
| **TarpoVizyon Pro** sayfaları | **6,4 ekran** | 12,5 ekran (TÜİK Canlı Hayvan) |
| **TarpoVizyon Basic** sayfaları | **2,1 ekran** | 3,1 ekran |

Basic üç kat kısa ve kullanıcı Basic'i beğeniyor. Fark tesadüf değil: Basic'te
sayfa başına **1–2 grafik**, Pro'da **7–12** var. Pro sayfaları bir masaüstü
panosunun içeriğini olduğu gibi telefona indiriyor.

Uzunluğun üç kaynağı, ağırlık sırasıyla:

1. **Seçim kartları** — bölüm sekmeleri ve liste öğeleri büyük kutular hâlinde
   alt alta diziliyor. Tek bir sayfada 1 507 px (≈2 ekran) yalnızca seçim
   kartlarına gidiyor.
2. **Grafik yığını** — Genel Bakış'ta 12 grafik = 3 600 px.
3. **Dev göstergeler** — 450 px yüksekliğinde tek bir SVG.

---

## S1 — Basic'in içinde gezinme YOK  🔴 en kritik

**Kanıt:** `/tarpovizyon-basic/...` herhangi bir sayfada başka bir Basic
sayfasına giden bağlantı sayısı: **0**. `.tvb-nav` (Basic'in kendi menüsü)
mobilde hiç çizilmiyor.

**Sebep:** Basic'i mobil kabuğa alırken `BasicShell` yerine `MobileDataShell`
koydum. Basic'in menüsü `BasicShell`'in içindeydi; yerine bir şey koymadım.
Kullanıcının yaşadığı tam olarak bu: *"basice giriyorum sadece makro veriler
sayfasına erişiyorum"* — `/tarpovizyon-basic` girişi ilk sayfaya yönlendiriyor
ve orada kilitleniyor.

**Düzeltme:** Basic sayfalarının gezinme çubuğuna, o bölümün sayfaları
arasında geçiş veren bir **açılır seçici** eklenecek. Kaynağı `BASIC_MENU`
(zaten türetilmiş durumda). Kabuk, yol `/tarpovizyon-basic` ile başlıyorsa
başlığın altına bu seçiciyi koyacak.

---

## S2 — Bölüm sekmeleri büyük kutular hâlinde alt alta  🔴

**Kanıt (kart sayısı × kapladığı piksel):**

| Sayfa | Sekme | Piksel |
|---|---|---|
| Dünya · Genel Üretim | 5 | **835** |
| İl Bazında · Bitkisel | 6 + 6 | 705 + 702 |
| İl Bazında · Hayvancılık | 6 + 6 | 507 + 504 |
| TÜİK Canlı Hayvan | 4 | 382 |
| Arz-Talep Dengesi | 7 | 308 |
| Dünya · Hayvan Stokları | 6 | 282 |
| Kaynaklar / Gıda Dengesi / Nüfus | 6 | 264 |
| Coğrafi İşaretli | 5 | 240 |
| Havza Ürün Deseni | 4 | 198 |
| Yumurta | 4 | 188 |

Toplam ~13 sayfa. Kalıp iki türlü yazılmış:

```
// A) sarmalanan sekme satırı
display: flex; gap: 12px; flex-wrap: wrap; padding: 20px; background: var(--bg-card)
  └── padding: 12px 24px; border-radius: 8px; border: 1px solid var(--border)

// B) kart ızgarası
display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))
  └── border-radius: 12px; padding: 16px; cursor: pointer
```

375 px'te ikisi de 2–3 satıra sarmalanıp ekranın üçte birini yiyor.

**Düzeltme:** Ortak bir `<BolumSecici>` bileşeni. Geniş ekranda bugünkü sekme
satırı; dar ekranda **tek satırlık açılır menü** (`<select>`). Native `select`
iOS'ta tekerlek olarak açılıyor — hem tanıdık hem 44 px'lik tek satır.
835 px → 44 px.

---

## S3 — Veri listeleri 20 karta yayılıyor  🔴

**Kanıt:**

| Sayfa | Öğe | Piksel |
|---|---|---|
| Tahıllar / Sebzeler / Meyveler / Bakliyat / Yağlı Tohum / Kuruyemiş | 20 | **1 507** (her biri) |
| İl Bazında · Bitkisel | 10 | 1 171 |
| İl Bazında · Hayvancılık | 10 | 852 |
| Dünya · Hayvan Rekabeti | 15 | 660 |
| Coğrafi İşaretli | 10 | 536 |
| Arz-Talep Dengesi | 10 | 440 |

Bunlar seçici değil, **sıralama listesi** ("Top 20 il"). Altı bitkisel sayfada
aynı 1 507 px'lik blok tekrar ediyor.

**Düzeltme:** Kademeli açılım — mobilde ilk **5** satır, altında
"Tümünü göster (20)" düğmesi. 1 507 px → ~400 px. Masaüstü değişmiyor.

---

## S4 — Aşırı büyük göstergeler  🟠

**Kanıt (genişlik × yükseklik):**

| Sayfa | Gösterge |
|---|---|
| İl Bazında · Hayvancılık | 245 × **450** |
| İl Bazında · Bitkisel | 229 × **450** |
| Beyaz Et | 313 × **420** |
| Coğrafi İşaretli | 229 × **420** |
| Dış Ticaret | 311 × 420 (×2) |
| Genel Bakış | 311 × 380 |
| Arz-Talep Dengesi | 279 × 320 |
| **Basic · Makro Veriler** | 255 × 140 (×3) |

Kullanıcının "hız göstergeleri büyük" dediği Basic'teki üç yarım daire: her
biri 140 px + başlık, üçü arka arkaya ~500 px.

**Düzeltme:** Mobilde SVG göstergelere üst sınır — dairesel/yarım daire
göstergeler 200 px, Basic'in gauge'ları 110 px. Üçlü gauge grubu tek satırda
üç sütun (255 px genişliğe 3 tane sığar, her biri ~85 px).

---

## S5 — Grafik yığını  🟠

**Kanıt:** Genel Bakış 12 grafik / 3 600 px · Tahıllar 12 / 3 224 ·
TÜİK Canlı Hayvan 7 / 2 050 · Hayvansal Üretim 9 / 2 700.

Her grafik mobilde 300 px'e sabitlenmiş durumda (daha önce yapıldı), yani
sorun grafik boyu değil **sayısı**.

**Düzeltme:** Bölüm sekmesi olan sayfalarda zaten bölümleme var — sorun,
sekmesi olmayan sayfaların hepsini tek akışta göstermesi. Genel Bakış ve
Hayvansal Üretim gibi uzun sayfalarda grafikler **katlanabilir bölümlere**
alınacak: ilk bölüm açık, gerisi başlığına dokununca açılıyor.

---

## S6 — Uzun `<select>` listeleri  🟢 sorun değil

Ölçümde 81, 82, 63, 55, 50 seçenekli `select`'ler çıktı. **Bunlara
dokunulmayacak:** native `select` iOS'ta ekranın altından tekerlek olarak
açılıyor, sayfada yalnızca 44 px yer kaplıyor. Kullanıcının şikâyet ettiği
"uzun liste" bunlar değil, S2/S3'teki kartlar.

Not: bunu belirtmek önemli çünkü "10'dan fazla içerikli listeleri açılır menü
yap" talimatı birebir uygulanırsa zaten açılır menü olanlar da elden geçmiş
gibi görünür.

---

## S7 — Taşma  🟢 kalmadı

Bütün sayfalarda kaptan/ekrandan taşan öğe: **0**. (Filtre seçicileri bir
önceki turda düzeltildi.)

---

## Uygulama sırası

Etki/risk oranına göre:

1. **S1** — Basic gezinme seçicisi. Erişilemeyen 39 sayfayı açıyor.
2. **S2** — `<BolumSecici>`: ~13 sayfada 200–835 px kazanç.
3. **S3** — kademeli liste: 6 bitkisel sayfada ~1 100 px kazanç.
4. **S4** — gösterge sınırları (yalnızca CSS).
5. **S5** — katlanabilir bölümler; en uzun 4 sayfada.

---

## Bu belge nasıl doğrulanacak

Her madde bitince aynı ölçüm tekrar çalıştırılacak ve tablodaki piksel
değerleri güncellenecek. Hedef: hiçbir Pro sayfası **6 ekranı** geçmesin
(bugün 9 sayfa geçiyor).
