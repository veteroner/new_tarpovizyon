# TarpoVizyon Pro — sayfa sayfa denetim

**Tarih:** 3 Eylül 2026 · **Kapsam:** 47 Pro sayfası, üretim derlemesi, 1440×900

Bu belge övgü içermiyor. Her madde ölçüldü; ölçülemeyen hiçbir iddia yok.

---

## Önce: kendi hatam

İlk taramada "sayfa başına 3–8 boş grafik" çıkmıştı. Yanlıştı. `recharts`
açıklama (legend) rozetlerini de `.recharts-surface` olarak çiziyor; sayacım
onları grafik sanıp "içi boş" diye işaretliyordu. Ölçütü grafiğin **kendi**
kutusuna bağladım (genişlik >150px, yükseklik >80px).

**Gerçek boş grafik sayısı: 47 sayfanın tamamında 0.**

Bu raporda o yanlış bulgu yok. Ama not düşüyorum, çünkü aynı tuzağa bir daha
düşmeyeyim: DOM'dan sayı çıkarırken sayılan şeyin ne olduğunu doğrulamadan
sonuç yazmak, denetimin kendisini çöpe atar.

### İkinci hatam — ve bu birinciden daha ağır

Grafik sayarken **yalnızca açılıştaki sekmeyi** saydım. Sayfaların çoğu içerik
sekmelerine bölünmüş (`SectionTabs`, sekme çubukları); ben her birinin
görünen dilimini "sayfanın tamamı" sandım. Sekme sekme ölçünce:

| sayfa | raporda yazan | gerçek |
|---|---|---|
| `world/cereals` | 2 | **19** (6 sekme) |
| `world/livestock` | 1 | **14** (6 sekme) |
| `turkey/red-meat` | 3 | **14** (5 bölüm, ikisi ölçülemedi) |
| `turkey/beekeeping` | 1 | **13** (5 bölüm) |
| `geographical-indication` | 2 | **4** (5 sekme, metin 1.334 değil 14.100) |

Üçüncü bir ölçüm hatası daha: sayacım **yalnızca recharts** çiziyor.
`BeekeepingHoneyTypesSection` gibi HTML çubuklarla çizen bölümler "0 grafik"
görünüyordu — boş değillerdi.

Sonuç: **aşağıdaki iki tablonun `G` sütunu ve ona dayanan "en zayıf sayfalar"
maddesi geçersiz.** Metin uzunluğu sütunu da öyle — o da tek sekmenin metni.

---

## En ağır altı kusur

### 1. ~~Dünya bölümü Pro değil, iskelet~~ — BU BULGU YANLIŞTI

**Düzeltme (4 Eylül 2026.)** Bu maddeyi geri alıyorum; ölçümüm hatalıydı.

Sayfa başına grafik sayarken Türkiye ile Dünya'yı aynı ölçüye vurdum. Ama
Türkiye sayfaları her şeyi tek kaydırmada gösteriyor, Dünya sayfaları
SEKMELERE bölüyor — ben yalnız açılıştaki etkin sekmeyi saymışım.

Sekme sekme ölçünce `world/cereals`:

| sekme | grafik |
|---|---|
| Genel Bakış | 4 |
| Birincil Üretim | 2 |
| İşlenmiş Üretim | 2 |
| Verim Analizi | 4 |
| Rekabet Analizi | 3 |
| Tahminler | 4 |
| **toplam** | **19** |

`turkey/cereals`'ta 12 var. Yani Dünya tarafı Türkiye'den **daha zengin**,
daha fakir değil. Raporun aşağıdaki Dünya tablosundaki grafik sayıları da aynı
hatayı taşıyor — hepsi "etkin sekmedeki" sayı, sayfanın tamamı değil.

Bu maddeye dayanarak yapılacak "Dünya'yı Türkiye ile eşitle" işi de iptal
edildi; olmayan bir sorunu çözecekti.

**Ama aynı yere bakarken GERÇEK bir hata çıktı** ve düzeltildi: üç ayrı menü
satırı — Şeker Bitkileri, İçecek Bitkileri, Lif Bitkileri — hepsi
`categoryFilter="INDUSTRIAL"` ile aynı veriyi gösteriyordu. Üç sayfa, tek veri
kümesi, üç farklı başlık. Kategori üçe bölündü (SUGAR / BEVERAGE / FIBER);
artık şeker pancarı, çay ve keten ayrı ayrı geliyor.

### 2. Emoji ikon yerine kullanılıyor

Kaynakta ~371 örnek. Sayfa başlıklarında ölçülen oran:

| sayfa | emoji'li başlık / toplam |
|---|---|
| `commodity-prices` | **13 / 13** |
| `world/red-meat`, `world/milk`, `world/eggs` | 7 / 8 |
| `turkey/beverages` | 8 / 11 |
| `turkey/fruits`, `legumes`, `oilseeds`, `fiber-crops` | 8 / 12–13 |
| `turkey/cereals` | 9 / 14 |
| `turkey/overview` | 10 / 23 |

`📅 Yıllık Trend`, `🥧 İl Payları`, `🧬 Üretim Artışı Kaynağı`,
`🎯 Top İller`, `🗺️ Üretim Yoğunlaşması`, `🇹🇷 TÜİK Bitkisel Üretim`.

Üç ayrı sorun:

- **Kabukla çelişiyor.** Üst çubuğu, kırıntıyı, komut paletini Apple diline
  taşıdık — `lucide` çizgi ikonlar, tek vurgu rengi. İçerik ise emoji ile
  dolu. Kullanıcı tek bir ürün görmüyor, iki farklı ürünün kesişimini görüyor.
- **Ekran okuyucuda gürültü.** `🧬` "DNA" diye okunuyor. Başlık "DNA Üretim
  Artışı Kaynağı" oluyor.
- **Platformdan platforma değişiyor.** Emoji glifleri işletim sistemine bağlı;
  aynı grafik iOS'ta ve Android'de farklı görünüyor.

`ui-ux-pro-max` bunu `no-emoji-icons` diye açıkça yasaklıyor — 4. öncelikli
kural. Kendi kurulu becerimiz ihlal ediliyor.

### 3. Renk paleti renk körlüğünde çöküyor

Kategorik palet 5 ayrı dosyada kopyalanmış ve **döngüsel** kullanılıyor
(`COLORS[index % COLORS.length]`). Deuteranopi simülasyonu + OKLab ΔE ile
ölçtüm (eşik: komşu çiftlerde ΔE ≥ 8):

| çift | normal | renk körü | durum |
|---|---|---|---|
| `#f59e0b` / `#ef4444` (3. ve 4. seri) | 19,8 | **5,5** | ✗ eşiğin altında |
| `#f59e0b` ↔ `#f97316` | 12,6 | **2,1** | pratikte aynı renk |
| `#3b82f6` ↔ `#6366f1` | 14,0 | **3,4** | ayırt edilemez |
| `#ef4444` ↔ `#f97316` | 16,9 | **4,1** | ayırt edilemez |

Bu üç çift **aynı pasta grafiğinde bir arada** — `plant-production`'daki
"İl Payları" 10 dilim çiziyor ve paletin tamamını kullanıyor. Kırmızı-yeşil
renk körü bir kullanıcı için o pastanın dört dilimi tek renk.

Ayrıca `#22c55e` yeşil hem **kategorik seri rengi** hem de "artış/olumlu"
anlamında kullanılıyor. Renk hem kimlik hem durum taşıyamaz; taşıdığında
ikisini de taşımaz.

### 4. Çift eksen — grafik tasarımının 1 numaralı hatası

13 dosyada iki farklı ölçekli Y ekseni, birinde **üç**:

```
PlantAnalysisCharts.tsx   yAxisId="alan" | "uretim" | "verim"   (3 ölçek)
WhiteMeatTuikSection.tsx  10 YAxis
EconomicIndicatorsSection.tsx  8 YAxis
CrossIntelligencePage.tsx  4 ölçek: left | prod | right | z
```

İki eksen, iki seriyi istediğin yerde kesiştirmene izin verir — yani
kesişimin **hiçbir anlamı yoktur**, eksen aralığını değiştirince kaybolur.
Okuyucu bunu bilmez, kesişimi olay sanır. Alan–üretim–verim üçlüsü zaten
çarpımsal ilişkili (`üretim ≈ alan × verim`); üçünü üç ölçekte üst üste
bindirmek ilişkiyi göstermiyor, gizliyor.

Doğrusu: ayrı grafikler, küçük çoklu, ya da ortak bir temel yıla endeksleme.

### 5. Sayı biçimi Türkçe değil ve kendi içinde çelişiyor

- `toFixed(` → **1.333** kullanım (nokta ondalık)
- `toLocaleString('tr')` → **128** kullanım (virgül ondalık, nokta binlik)

Sonuç aynı ekranda:

```
TÜRKİYE TOPLAMI   14.19 Milyon      ← nokta = ondalık
KANATLI          389.186.697        ← nokta = binlik
```

Türkçe okuyan biri için "14.19" ondört bin yüz doksan da olabilir, ondört
virgül on dokuz da. Yüzdeler de öyle: `%12.4`, `%-13.5`. Türkçede `%12,4`.

Bu bir üslup tercihi değil, **veri ürününde sayının yanlış okunması**.
Rakam satan bir üründe en ucuz ve en ağır hata.

### 6. Dokuz bitkisel sayfa birbirinin kopyası

`cereals`, `vegetables`, `fruits`, `legumes`, `oilseeds`, `sugar-crops`,
`nuts`, `beverages`, `fiber-crops` — hepsi aynı bileşen, aralarındaki tek fark
ürün filtresi.

Bu, dokuz sayfa değil bir sayfa ve bir açılır liste. Menüde dokuz satır yer
kaplıyor, kırılımda dokuz kart, palette dokuz sonuç — ama kullanıcı için dokuz
farklı yer yok. Buna karşılık ürün grubuna **özgü** hiçbir şey yok: tahılda
rekolte/stok yok, meyvede don riski yok, lif bitkisinde tekstil talebi yok,
fındıkta ihracat yok, yağlı tohumda ithalat bağımlılığı yok.

Bu madde ölçüm hatasından etkilenmiyor: dokuz sayfa aynı bileşeni çağırıyor,
bu kaynaktan doğrulandı.

### 7. ~~En zayıf altı sayfa~~ — BU DA YANLIŞTI

Raporun ilk hâlinde `red-meat`, `beekeeping`, `other-animal-products`,
`geographical-indication`, `world/livestock` ve `commodity-prices` "Pro
menüsünde yer kaplıyor ama içeriği yok" diye işaretlenmişti. Sekmeler sayılınca
altısından dördü düştü (yukarıdaki tabloya bakınız).

Ayakta kalan iki gerçek bulgu:

- **`other-animal-products`** — 2 grafik, 1.077 karakter, sekmesi YOK. Bal,
  yumurta, deri, yün, ipek hepsi tek sayfada ve yalnızca merinos yapağısı
  çiziliyor. Bu sayfa gerçekten zayıf.
- **`commodity-prices`** — 0 grafik ölçümü yerel önizlemeye özgü: sayfa
  `/api.php?action=commodity_prices&api_key=…` çağırıyor ve o uç önizleme
  sunucusunda yok (500). Ama iki gerçek sorun var: (a) emtia fiyatı zaman
  serisidir, sayfa tablo gösteriyor; (b) **API anahtarı URL sorgu dizesinde**
  gidiyor — istemci kodunda, herkese açık depoda.

## Sayfa sayfa — Türkiye (28 sayfa)

`G` = gerçek grafik sayısı · `E` = emoji'li başlık / toplam başlık ·
`Y` = sayfada geçen en son yıl

| sayfa | metin | G | E | Y | eleştiri |
|---|---|---|---|---|---|
| `turkey` (kök) | — | — | — | — | kırılım kartları çalışıyor; en sağlam ekran |
| `overview` | 2.389 | 12 | 10/23 | 2026 | **Üç farklı yıl aynı sayfada:** hayvan varlığı 2025, süt/et/yumurta 2024, arazi/istihdam 2023. Artık her biri etiketli ama kullanıcı yine de üç takvimi kafasında birleştirmek zorunda. "Kişi Başı Yıllık Tüketim Tahmini" — tahmin yöntemi hiçbir yerde yazmıyor, üretim ÷ nüfus mu, kayıp/fire düşülmüş mü belli değil. 12 grafiğin tamamı "ne var" gösteriyor, hiçbiri "ne değişti" demiyor. |
| `macro` | 3.035 | 7 | 0/9 | **2024** | Bölümün en tutarlı sayfası — emoji yok, çift eksen dışında düzgün. Ama TÜFE SDMX'te olmadığı için elle güncelleniyor; sayfa bunu kullanıcıya söylemiyor. |
| `plant-production` | 2.138 | **3** | 2/5 | 2025 | **Bölümün giriş sayfası, bölümün en zayıfı.** Kardeşi `cereals`ta 12 grafik var, burada 3. Pasta 10 dilim — okunmuyor ve renk körlüğünde çöküyor (bkz. kusur 3). Başlık `🇹🇷 TÜİK Bitkisel Üretim` — bayrak emoji'si başlıkta. |
| `plant-provincial` | 4.113 | **2** | 0/6 | **2024** | 4.100 karakter metne karşı 2 grafik — tablo ağırlıklı, görselleştirme yok. İl bazlı 2025 üretimi artık D1'de (7.548 satır) ama bu sayfa hâlâ 2024'te. |
| `cereals` | 3.276 | 12 | 9/14 | 2026 | En zengin bitkisel sayfa. 14 başlığın 9'u emoji. `🎯 Top İller — Çoklu Yıl Karşılaşması` ve `🧬 Üretim Artışı Kaynağı` iyi fikirler ama isimleri ne yaptıklarını söylemiyor. |
| `vegetables` | 3.249 | 10 | 7/13 | 2026 | `cereals` kopyası. Örtüaltı sebze üretimi TÜİK'te ayrı bir veri kümesi ve **hiç kullanılmıyor** — sebze sayfasında sera yok. |
| `fruits` | 3.210 | 10 | 8/12 | 2026 | Ağaç metrikleri var (meyve veren/vermeyen ağaç) ama don, ilaçlama, hasat penceresi yok. |
| `legumes` | 3.221 | 11 | 8/13 | 2026 | kopya |
| `oilseeds` | 3.219 | 11 | 8/13 | 2026 | kopya — yağlı tohumda ithalat bağımlılığı Türkiye'nin en kritik tarım konusu, sayfada dış ticaret bağlantısı yok |
| `sugar-crops` | 3.363 | 9 | 7/12 | 2026 | kopya — kota/pancar sözleşmesi yok |
| `nuts` | 3.309 | 10 | 8/12 | 2026 | kopya — fındık Türkiye'nin en büyük tarım ihracatı, ihracat verisi bu sayfada yok |
| `beverages` | 2.582 | 9 | 8/11 | 2026 | kopya |
| `fiber-crops` | 3.222 | 11 | 8/13 | 2026 | kopya |
| `basin-production` | 2.107 | **2** | 0/5 | **2024** | Havza tablosunda `y2025` sütunu **hiç yok** — sayfa doğru şekilde 2024'te ama bunu söylemiyor. 2 grafik; havza deseni harita işi, harita yok. |
| `geographical-indication` | 1.334 | **2** | 0/5 | **yıl yok** | Sayfada tek bir yıl geçmiyor. Coğrafi işaret tescilleri tarihli veriler — tescil yılı, ürün sayısı trendi yok. 1.334 karakter: neredeyse boş. |
| `animal-production` | 2.883 | 9 | 0/15 | 2026 | Alt başlık artık veriden (1961–2025). 15 başlık, 9 grafik — başlık/grafik oranı dengesiz, çok bölüm az görsel. |
| `red-meat` | **1.266** | **3** | 0/5 | 2025 | **Türkiye tarımının en tartışmalı konusu, Pro'nun en zayıf üçüncü sayfası.** Karkas fiyatı, ithalat kotası, besi maliyeti, canlı hayvan ithalatı — hiçbiri yok. Üç grafik. |
| `white-meat` | 1.899 | 6 | 1/10 | 2026 | Kanatlıda aylık veri var (`kanatli_uretimleri`, 2026-05'e kadar) ama sayfa yıllık gösteriyor. Aylık seriyi kullanmamak bu sayfanın en büyük kaybı. |
| `milk` | 2.047 | 9 | 0/13 | 2025 | Çiğ süt referans fiyatı, ulusal süt konseyi kararları yok. Sağılan hayvan sütunları D1'de 2020–2023 dolu, sonrası boş — sayfa bunu göstermiyor. |
| `eggs` | 2.838 | 8 | 4/15 | 2026 | 15 başlık / 8 grafik. |
| `other-animal-products` | **1.100** | **2** | 2/3 | **2024** | Pro'nun en kısa veri sayfası. Üç başlık, iki grafik. Bal, yumurta, deri, yün, ipek — hepsi tek sayfada, hiçbiri derinlemesine. |
| `beekeeping` | **1.182** | **1** | 0/4 | 2025 | **Tek grafik.** Kovan sayısı ve balmumu var, bal üretimi/verim/ithalat yok. Türkiye dünya bal üretiminde ikinci. |
| `provincial` | 3.234 | 2 | 0/7 | 2025 | 2025'e geçti, doğru çalışıyor. Ama 3.200 karakter metne 2 grafik — il karşılaştırması harita ister, harita yok. |
| `tuik-livestock` | 5.659 | 7 | 4/10 | 2025 | Pro'nun en uzun metinli sayfası. İyi veri, ama 5.600 karakter metin 7 grafikle dengelenmiyor — okunacak çok, bakılacak az. |
| `trade` | 2.002 | 6 | 3/10 | 2026 | **Ürün × ülke kırılımı yok** — o veri Qlik'te ve Node'dan çekilemiyor. Dış ticaret sayfası ülke detayı olmadan yarım. |
| `price-index` | 2.933 | 10 | 6/13 | 2026 | TÜFE elle güncelleniyor; gecikme uyarısı senkron betiğinde var ama **sayfada yok**. Kullanıcı verinin ne kadar taze olduğunu bilmiyor. |
| `product-balance` | 3.989 | **4** | 0/7 | **2024** | 4.000 karakter, 4 grafik. Denge tabloları doğal olarak Sankey ister (üretim → ithalat → tüketim → stok); yok. |
| `cross-intelligence` | 3.889 | 6 | 0/10 | **2024** | **Üç/dört ölçekli eksen burada** (`left`/`prod`/`right`/`z`). "Çapraz zekâ" adı iddialı; içerik iki seriyi üst üste bindirmekten ibaret. Korelasyon katsayısı, gecikmeli ilişki, anlamlılık — yok. |
| `commodity-prices` | 3.452 | **0** | **13/13** | 2026 | **Fiyat sayfasında hiç grafik yok.** 3.450 karakter sayı listesi. Emtia fiyatı zaman serisidir; tablo değil çizgi ister. Başlıkların **tamamı** emoji'li. |
| `ai-assistant` | 822 | 0 | — | — | Pro'nun "AI" vaadi: 822 karakterlik tek kutu. Kabuktaki Asistan panosu bundan iyi (bağlamı biliyor, kaynak gösteriyor). Bu sayfa artık gereksiz. |

## Sayfa sayfa — Dünya (19 sayfa)

> **UYARI — bu tablodaki `G` sütunu güvenilmez.** Dünya sayfaları sekmeli;
> aşağıdaki sayılar yalnızca AÇILIŞTAKİ sekmeyi sayıyor. `world/cereals` için
> gerçek toplam 19, tabloda 2 yazıyor. Bkz. düzeltilmiş 1. madde.

| sayfa | metin | G | E | Y | eleştiri |
|---|---|---|---|---|---|
| `world` (kök) | 1.148 | **0** | 0/13 | — | Sıfır grafik, yinelenen başlık. Türkiye kökünün karşılığı değil. |
| `production` | 2.374 | 4 | 4/8 | 2024 | Dünya bitkiselinin giriş sayfası, 4 grafik. |
| `cereals` | 2.097 | **2** | 3/6 | 2024 | Türkiye'de 12, burada 2. |
| `vegetables` | 2.092 | **2** | 3/6 | **2023** | Türkiye'de 10, burada 2. Veri bir yıl daha eski. |
| `fruits` | 1.986 | **2** | 3/6 | **2023** | aynı |
| `nuts` | 1.943 | **2** | 3/6 | 2024 | aynı |
| `legumes`, `oilseeds`, `sugar-crops`, `beverages`, `fiber-crops` | ~2.000 | 2 | 3/6 | 2023–24 | aynı kalıp; beş sayfa daha |
| `livestock` | 2.183 | **1** | 2/6 | 2024 | **Tek grafik.** Dünya hayvan stokları tek çubuk grafiğe indirgenmiş. |
| `red-meat` | 2.175 | 7 | **7/8** | 2024 | Dünya tarafının en iyilerinden — 7 grafik. Ama 8 başlığın 7'si emoji. |
| `milk` | 2.220 | 7 | 7/8 | 2024 | aynı |
| `eggs` | 2.173 | 7 | 7/8 | 2024 | aynı |
| `white-meat`, `other-animal` | ~2.100 | ~7 | 7/8 | 2024 | aynı kalıp |
| `food-balance` | 1.242 | 3 | 0/5 | **2023** | Gıda dengesi FAO'nun en zengin veri kümelerinden; 3 grafik. |
| `land-cover` | 2.174 | 6 | 5/7 | 2024 | Dünya tarafının daha dolu sayfalarından. |
| `fertilizer` | 1.342 | 3 | 0/5 | 2024 | Gübre fiyatı/ticareti yok, yalnız kullanım. |
| `pesticide` | 1.376 | 3 | 0/5 | 2024 | aynı |
| `resources` | 1.478 | 3 | 0/5 | **2023** | "Kaynaklar" başlığı çok geniş, içerik 3 grafik. |
| `population` | 1.170 | **2** | 0/4 | 2026 | 1.170 karakter. |
| `employment` | 1.227 | **2** | 0/4 | 2025 | 1.227 karakter. |
| `macro-economic` | 2.394 | 3 | 1/5 | 2024 | Dünya makro — 3 grafik. |
| `livestock-competition` | 1.940 | 7 | 4/12 | 2024 | Fikir iyi (rekabet), 12 başlığa 7 grafik. |

## Kabuk ve gezinme

Bu kısım iyi durumda ve ölçüldü:

- Komut paleti (⌘K), hızlı erişim, kardeş geçişi, kırıntı — hepsi çalışıyor
- `bolum/<id>` kırılımı doğru; geçersiz kimlikte "Bu bölüm bulunamadı" diyor
- Yatay taşma: **47 sayfanın hiçbirinde yok**
- `NaN` / `Infinity` / `undefined` ekranda: **hiçbir sayfada yok**
- Konsol hatası: gezilen sayfaların hiçbirinde yok

**Ama:** kabuk ile içerik iki ayrı üründen. Kabuk `--tv-*` jetonlarını, çizgi
ikonları, tek vurgu rengini kullanıyor; sayfalar 777 satır içi `style={{}}`,
5 kopya renk paleti ve 371 emoji kullanıyor. Kabuğu düzeltmek içeriği
düzeltmedi — sadece farkı görünür yaptı.

## Yinelenen rotalar

- `turkey/tuik-plant` → `turkey/plant-production` ile **aynı sayfa**
- `turkey/plant-provincial` ile `turkey/provincial` — ikisi de il bazlı, biri
  bitkisel biri hayvansal ama adlandırma bunu söylemiyor
- `tarpovizyon/overview` ile `tarpovizyon/turkey/overview` — ayrı rotalar

---

## Ne yapmalı — öncelik sırası

**1. Sayı biçimi.** Tek bir `sayi()` yardımcısı, `Intl.NumberFormat('tr-TR')`
üzerinden; 1.333 `toFixed` çağrısı ona bağlanır. Bir günlük iş, ürünün en ağır
okunabilirlik hatasını kapatır.

**2. Emoji temizliği.** 371 örnek → `lucide` ikonları. Kabuk zaten o dilde.

**3. Renk paleti.** 5 kopyayı tek dosyaya indir, döngüyü kaldır, sekizden
fazla seriyi "Diğer"e katla, ΔE ≥ 8 sağlayan bir ölçek seç. Semantik yeşili
kategorik yeşilden ayır.

**4. Dünya tarafı.** Ya Türkiye ile eşitle ya da vaadini küçült. Şu hâliyle
kapsam anahtarı kullanıcıyı boş odaya sokuyor. En ucuz düzeltme: dünya
bitkisel sayfalarını Türkiye bileşenine bağlamak (veri FAO'da var).

**5. Çift eksen.** 13 dosya. Ayrı grafik ya da endeksleme.

**6. En zayıf altı sayfa** — `red-meat` (1.266), `beekeeping` (1.182),
`other-animal-products` (1.100), `geographical-indication` (1.334),
`world/livestock` (1 grafik), `commodity-prices` (0 grafik). Bunlar Pro
menüsünde birinci sınıf satır kaplıyor ama Basic'teki bir pano kadar bile
içerik taşımıyor.

**7. Dokuz bitkisel kopyayı** ya gerçekten farklılaştır (ürün grubuna özgü
veri: rekolte, stok, ihracat, fiyat) ya da tek sayfa + ürün seçici yap.

**8. Tazelik göstergesi.** Her sayfa hangi tabloyu ne zaman okuduğunu
söylemeli. `veri_damga` tablosu D1'de var ama onu okuyan kod hâlâ birleşmemiş
`origin/claude/onbellek-damga` dalında.
