# TarpoVizyon — UI Birleştirme Planı

**Tarih:** 2026-08-07
**Durum:** Aşama 1–3 kısmen tamam, bu belge kalan işi tanımlıyor.

Bu belge "UI'yi güzelleştirme" listesi değil. Ölçülmüş kusurları, her birinin
neden kusur olduğunu ve sırayla nasıl kapatılacağını yazıyor. Ölçüler bu
depodan alındı; tahmin yok.

---

## 1. Teşhis — neden "yamalı bohça" hissettiriyor

### 1.1 Uygulama iki farklı tasarım dilini yan yana taşıyor

Kullanıcının girişten panoya yolculuğu iki ayrı ürün gibi:

| | giriş akışı + Basic | pano (Pro) |
|---|---|---|
| marka rengi | **yeşil** (`#16a34a`, `#10b981`) | **mavi** (`--primary: #3b82f6`) |
| yüzey | koyu yeşil gradyan | açık gri (`#f8fafc`) |
| kart | büyük, yuvarlak, dairesel ikon | yoğun, küçük, dikdörtgen |
| tipografi | ferah, ortalanmış | sıkışık, sola dayalı |
| başlık | `.tvb-header` yeşil şerit | `.tarpo-topbar` koyu şerit |

**Bu en büyük kırılma.** Kullanıcı yeşil bir markadan giriyor, mavi bir panoya
düşüyor. Marka kimliği ortadan ikiye bölünmüş durumda.

### 1.2 Altı ayrı token sistemi

| dosya | token | benzersiz hex |
|---|---|---|
| `styles/globals.css` | 38 | 36 |
| `styles/dataviz-tokens.css` | 30 | 29 |
| `pages/HasatTahminiPage.css` | 25 | 39 |
| `pages/GubreHesapPage.css` | 10 | 32 |
| `pages/SulamaPlanPage.css` | 10 | 29 |
| `pages/TarimTakvimPage.css` | 10 | 27 |
| `tarpovizyon-basic/*.css` | **0** | 22 |
| `styles/SelectionPage.css` | **0** | 13 |

Toplam **26 CSS dosyası / 9.807 satır**. Araç sayfaları (Hasat, Gübre, Sulama,
Takvim) kendi mini tasarım sistemlerini kurmuş. Basic ve giriş akışında hiç
token yok — sadece ham hex.

Ayrıca `.tsx` içinde **294 sabit hex** (design-system doğrulayıcısı).

### 1.3 Dört farklı yeşil

`#16a34a` · `#22c55e` · `#10b981` · `#15803d` · `#0f766e`

Hangisi "marka yeşili" belli değil; her dosya kendi tonunu seçmiş.

### 1.4 Beş kabuk, üç başlık

`tarpo-shell` (pano) · `tvb-shell` (Basic) · `MobileLayout` (Capacitor) ·
giriş akışı sayfaları · araç sayfaları — her biri kendi düzenini kuruyor.
Başlık üç ayrı uygulamada: `.tarpo-topbar`, `.tvb-header`, `<Header />`.

---

## 2. Karar: hangi dil kazanacak

**Basic'in dili taban alınacak, panonun yoğunluğu korunacak.**

Gerekçe:
- Basic'in dili zaten tutarlı ve kullanıcı onu daha iyi buluyor.
- Giriş akışı da aynı dili konuşuyor — yani uygulamanın **çoğunluğu** zaten
  yeşil/ferah dilde; mavi/yoğun olan yalnızca pano.
- Marka rengini yeşile çekmek, mavi kalan tarafı değiştirmekten daha az yer
  etkiliyor: mavi çoğunlukla `--primary` üzerinden geliyor, tek noktadan
  değişebilir.

**Ama pano yoğunluğu korunacak.** Basic'in ferah kart düzeni 61 sayfalık,
grafik yoğun bir panoda çalışmaz — `ui-ux-pro-max` bu ürün tipi için
"Data-Dense Dashboard" öneriyor. Yani: **Basic'in RENK ve TİPOGRAFİ dili +
panonun YOĞUNLUK düzeni.**

---

## 3. Token mimarisi (üç katman)

`design-system` skill'inin yapısı uygulanacak:

```
Primitive (ham değer)      →  --green-600: #16a34a
        ↓
Semantic (amaç)            →  --color-primary: var(--green-600)
        ↓
Component (bileşene özel)  →  --header-bg: var(--color-primary)
```

**Neden üç katman:** şu an `--primary` doğrudan bir hex. Tema değiştirmek ya da
marka rengini kaydırmak için 26 dosyaya dokunmak gerekiyor. Semantik katman
bunu tek satıra indiriyor.

**Tek dosya:** `src/styles/tokens.css`. Diğer CSS dosyalarındaki `:root`
blokları buraya taşınıp silinecek.

Kapsam:
- **Primitive:** yeşil/gri/durum rampaları, boşluk ölçeği (4/8), tipografi
  ölçeği, yarıçap, gölge
- **Semantic:** `--color-primary/surface/border/text-*`, `--space-*`,
  `--radius-*`, `--shadow-*`
- **Component:** `--header-*`, `--card-*`, `--nav-*`, `--btn-*`
- **Veri görselleştirme:** `dataviz-tokens.css` zaten doğrulanmış paletle
  hazır — olduğu gibi kalıyor, primitive katmanına bağlanacak

---

## 4. Aşamalar

Sıra önemli: her aşama bir öncekinin üstüne kuruluyor.

### Aşama A — Token temeli
`tokens.css` oluştur; `globals.css`, araç sayfaları ve Basic'teki `:root`
bloklarını buraya taşı. Marka yeşilini **tek** değere sabitle. Mavi
`--primary`'yi yeşile çevir.
*Çıktı:* tek token dosyası, 4 yeşil → 1.
*Doğrulama:* `validate-tokens.cjs` ihlal sayısı düşmeli.

### Aşama B — Tek kabuk ve başlık
`tarpo-shell` ile `tvb-shell` tek kabuğa iner. Başlık tek bileşen olur
(`<AppHeader>`), Basic ve pano aynı başlığı farklı `variant` ile kullanır.
Mobil alt menü tek uygulama.
*Çıktı:* 5 kabuk → 2 (pano + mobil), 3 başlık → 1.
*Not:* Aşama 1'de birleştirilen menü (`nav/menu.ts`) burada Basic'i de
kapsayacak şekilde genişletilecek.

### Aşama C — Giriş akışı panoyla aynı dili konuşsun
`ProgramSelectionPage`, `SelectionPage`, `HomePage` token'lara taşınır.
Gradyan korunur ama token'dan gelir. Kartlar Aşama 2'deki `<Card>`
bileşenine geçer.
*Çıktı:* giriş akışı ile pano aynı renk/tipografi ölçeğinde.

### Aşama D — Karanlık tema
Şu an yok. Semantic katman hazır olduğu için tek `[data-theme="dark"]`
bloğuyla açılır. `dataviz-tokens.css`'te koyu adımlar **zaten hazır ve
doğrulanmış** — yüzeylerle birlikte devreye alınacak.
*Uyarı:* Bu oturumda bir kez hata yapıldı — grafik token'ları
`prefers-color-scheme` ile otomatik koyu adımlara geçmiş ama yüzeyler açık
kalmıştı. Karanlık tema **yüzey + metin + grafik birlikte** açılmalı.

### Aşama E — Araç sayfaları
Hasat/Gübre/Sulama/Takvim kendi mini sistemlerini bırakıp ortak token'lara
geçer. En büyük dört CSS dosyası (4.663 satır) buradan küçülecek.

### Aşama F — Emoji → SVG ikon
Başlıklarda 209 emoji ikon var (`no-emoji-icons` ihlali). Lucide zaten
kurulu; `<ChartCard icon={...}>` yuvası hazır.

---

## 5. Bu oturumda tamamlananlar

| aşama | durum |
|---|---|
| Navigasyon birleştirme (tek menü, kapsam koruma, breadcrumb) | ✅ |
| Kart katmanı (`Card`/`ChartCard`/`StatCard`, 252 kullanım) | ✅ |
| Doğrulanmış veri paleti (renk körlüğü testi geçti) | ✅ |
| Çift eksenli grafikler | 29 → 12 (kalan 12 vaka bazında) |
| Mobil uyum katmanı | ✅ |

---

## 6. Ölçülebilir hedefler

| ölçü | şimdi | hedef |
|---|---|---|
| token sistemi | 6 | 1 |
| marka yeşili | 4 farklı | 1 |
| CSS dosyası | 26 (9.807 satır) | ~12 |
| `.tsx` içinde sabit hex | 294 | < 40 (yalnızca veri paleti) |
| kabuk | 5 | 2 |
| başlık uygulaması | 3 | 1 |
| çift eksenli grafik | 12 | 0 |
| emoji ikon | 209 | 0 |
| karanlık tema | yok | var |

---

## 7. Riskler

- **Basic canlıda ayrı bir ürün.** Kabuk birleştirmesi Basic'in görünümünü
  değiştirir; kullanıcı onu beğendiği için değişim *ona doğru* olmalı, ondan
  uzağa değil.
- **Araç sayfaları (Hasat/Sulama/Gübre/Takvim) ayrı ekipler gibi yazılmış.**
  Token geçişi görsel regresyon riski taşıyor; sayfa sayfa ekran görüntüsüyle
  doğrulanmalı.
- **294 sabit hex'in hepsi token'a çevrilemez.** Bir kısmı durum/vurgu rengi,
  körlemesine değiştirilirse anlam kaybolur (bu oturumda Türkiye vurgusunun
  kırmızısı böyle bir örnek).
- **Deploy tek seferlik planlanıyor.** Aşamalar bittikçe değil, bütün
  tamamlandığında çıkılacak.

---

## 8. Kullanılan rehberler

- `ui-ux-pro-max` — ürün tipi için "Data-Dense Dashboard" stili, navigasyon ve
  erişilebilirlik kuralları
- `dataviz` — kategorik palet doğrulaması (renk körlüğü ΔE), çift eksen
  yasağı, mark özellikleri
- `design-system` — üç katmanlı token mimarisi, token doğrulayıcı
- `graphify` — kod tabanı grafiği (2.608 düğüm), hangi tablonun hangi sayfada
  kullanıldığının çıkarımı
