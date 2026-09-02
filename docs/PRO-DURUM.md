# TarpoVizyon Pro — Durum Tespiti ve Yol Haritası

**Tarih:** 2 Eylül 2026 · **Aşama 1 TAMAMLANDI** (aşağıda "Aşama 1 sonucu")
**Kapsam:** `/tarpovizyon/*` altındaki 61 rota (yayınlanmamış Pro sürümü)
**Yöntem:** Bu belgedeki her sayı ölçülmüştür — kod tarandı, canlı API çağrıldı,
D1'de `MAX(dönem)` doğrudan hesaplandı. Tahmin yok.

---

## 1. Özet

**Pro bozuk değil, yanlış tabloya bağlı.**

Beklenen sorun "Pro hâlâ eski MySQL'e gidiyor" idi. Ölçüm bunu **çürüttü**: Pro
sayfalarının 49'u zaten D1/Worker kullanıyor, yalnızca 11 dosya eski `api.php`
yolunda kalmış. Yani MySQL→D1 göçünün büyük kısmı bitmiş.

Bayatlığın gerçek sebebi başka: **D1'de aynı verinin iki kopyası var.**

- `oner_*` önekli tablolar → MySQL'den bir kez alınmış, **donmuş** kopya
- Öneksiz tablolar → günlük GitHub Actions işlerinin **yazdığı** taze kopya

Pro sayfaları `oner_*` ikizlerini okuyor. Basic öneksizleri okuyor. İkisi de
"D1'den geliyor" ama biri altı ay geride.

Hiçbir senkron betiği `oner_*` tablolarına yazmıyor — tarandı, sıfır eşleşme.
Yani bu tablolar **hiçbir zaman güncellenmeyecek**.

---

## 2. Pro'nun veri katmanı bugün nerede

| | Sayfa | Not |
|---|---|---|
| `services/d1.ts` (Worker → D1) | **49** | Doğru katman. 417 `fetchRows`/`fetchAgg` çağrısı. |
| `services/api.ts` (`/api.php` → MySQL) | **11** | Kalan iş. Aşağıda listeli. |

### Eski katmanda kalan 11 dosya

```
AIAssistantPage.tsx                    trade/AnimalTradeTab.tsx
CommodityPricesPage.tsx                trade/TradeIntelligenceTab.tsx
HasatTahminiPage.tsx                   trade/ProductIntelligenceTab.tsx
egg-production/useEggProductionData.ts trade/PlantTradeTab.tsx
gubre/FertilizerPricingPanel.tsx       trade/CountryIntelligenceTab.tsx
                                       trade/TradeOverviewTab.tsx
```

Altısı dış ticaret sekmesi — tek bir veri kaynağını paylaşıyorlar, birlikte
taşınmaları gerekiyor.

`AIAssistantPage` ve `CommodityPricesPage` için karşılıkları **zaten yazıldı**:
web vitrininde `/asistan` ve `/piyasa` çalışıyor ve Worker'ı kullanıyor. Pro
sürümleri bunlarla değiştirilebilir ya da aynı servislere bağlanabilir.

---

## 3. Asıl sorun: ikiz tablolar

### Ölçülen bayatlık

D1'de `MAX(dönem)` doğrudan hesaplandı (API üzerinden değil — API rota başına
`maxLimit` uyguluyor ve büyük tabloları kırpıp yanlış yıl gösteriyor).

| Gösterge | Pro okuyor (`oner_*`) | Taze karşılığı | Fark |
|---|---|---|---|
| Çiğ süt ekonomik göstergeler | **2026-02** (98 satır) | 2026-08 (104) | **6 ay** |
| Kırmızı et ekonomik göstergeler | **2026-02** (98) | 2026-08 (104) | **6 ay** |
| Kanatlı eti maliyet/fiyat | **2026-02** (134) | 2026-08 (140) | **6 ay** |
| Yumurta maliyet/fiyat | **2026-02** (134) | 2026-08 (140) | **6 ay** |
| Kanatlı üretimleri | **2026-04** (196) | 2026-06 (198) | **2 ay** |
| Kırmızı et üretim miktarı | **2024** (42) | 2025 (40) | **1 yıl** |
| İllerin hayvan sayısı | **2024-01** (162) | 2025-01 (243) | **1 yıl, 81 satır** |
| Hayvansal ürün üretimi | dönem alanı yok (65) | 2025 (65) | dönem kaybı |

Satır sayısı farkları da anlamlı: illerin hayvan sayısında **81 satır eksik** —
yani bir yıllık il verisinin tamamı.

### Eşleme: hangi sayfa hangi ikizi okuyor

Tazesi olan 19 rotanın hepsi doğrulandı (Worker'da mevcut).

| Pro dosyası | Eski rota | Taze karşılığı |
|---|---|---|
| `TurkeyRedMeatProductionPage.tsx` | `oner/kirmizi-et-uretim-miktari` | `kirmizi-et/uretim-miktari` |
| | `oner/kirmizi-et-uretimi` | `kirmizi-et/hayvan-sayilari-yillik` |
| | `oner/kirmizi-et-ekonomik-gostergeler` | `kirmizi-et/ekonomik-gostergeler` |
| | `oner/hayvansal-urun-uretimi` | `tr/hayvansal-urun-uretimi` |
| | `oner/karsilastirma-et-tuketimi` | `global/et-tuketimi-karsilastirma` |
| | `oner/kisi-basina-tuketimler` | `tr/kisi-basina-guncel-tuketim` |
| | `oner/dunya-karkas-agirligi` | `global/karkas-agirligi` |
| | `oner/dunya-karkas-fiyatlari` | **karşılığı yok** (1 satır) |
| `milk/useMilkData.ts` | `oner/cig-sut-ekonomik-gostergeler` | `cig-sut/ekonomik-gostergeler` |
| | `oner/sanayiye-giden-sut` | `cig-sut/urun-uretimi` |
| | `oner/verimlilikler` | `tr/verimlilikler` |
| | `oner/yeterlilikler` | `tr/yeterlilikler` |
| | `oner/dunya-hayvansal-uretim` | `global/uretim` |
| | `oner/dunya-sut-fiyatlari` | **karşılığı yok** (1 satır) |
| `white-meat/useWhiteMeatData.ts` | `oner/kanatli-eti-maliyeti-fiyati` | `kanatli/maliyet-fiyat` |
| | `oner/illerin-hayvan-sayisi` | `il/hayvan-sayilari` |
| | `oner/hayvansal-urun-uretimi` | `tr/hayvansal-urun-uretimi` |
| | `oner/dunya-hayvansal-uretim` | `global/uretim` |
| `turkeyAnimalProduction/useTurkeyAnimalProductionData.ts` | `oner/kanatli-uretimleri` | `kanatli/uretimleri` |
| | `oner/kirmizi-et-uretimi` | `kirmizi-et/hayvan-sayilari-yillik` |
| | `oner/hayvansal-urun-uretimi` | `tr/hayvansal-urun-uretimi` |
| | `oner/dunya-hayvansal-uretim` | `global/uretim` |
| `egg-production/useEggProductionData.ts` | `oner/yumurta-maliyeti-fiyati` | `yumurta/maliyet-fiyat` |
| `beekeeping/useBeekeepingData.ts` | `oner/illerin-bal-cesitleri` | `il/bal-cesitleri` |
| | `oner/illere-gore-arici-sayisi` | `il/arici-sayisi-yillik` |
| `livestock/LivestockOverviewSection.tsx` | `oner/illerin-hayvan-sayisi` | `il/hayvan-sayilari` |

**Yalnızca 7 dosya.** İş göründüğünden küçük — ama şema farkları var (bkz. §6).

**İki rotanın tazesi yok:** `oner/dunya-sut-fiyatlari` ve
`oner/dunya-karkas-fiyatlari`. İkisi de **tek satır** — muhtemelen elle
girilmiş bir gösterge. Karar gerekiyor: kaynak bulunup senkrona bağlanacak mı,
yoksa sayfadan kaldırılacak mı?

---

## 4. Basic'i besleyen sistem (Pro'ya bağlanacak boru)

Dört GitHub Actions işi:

| İş | Zaman | Ne yapıyor |
|---|---|---|
| `tuik-sync.yml` | Her gün 08:00 UTC | `scripts/tuik-sync/sync.mjs` + `fao-fpi-sync.mjs` |
| `tuik-disticaret.yml` | Her gün 08:30 UTC | TÜİK dış ticaret → D1 |
| `fao-yillik.yml` | Pazartesi 06:00 UTC | FAO yıllık veri setleri → D1 |
| `gh-pages-preview.yml` | Yalnız elle | GitHub Pages önizleme (kullanılmıyor) |

Elle çalışan bir de `scripts/tufe-guncelle.mjs` var (TÜFE SDMX'te olmadığı için
aylık elle).

**Bu işlerin dokunduğu tablo: 23.** D1'deki toplam tablo sayısı **104**.

### D1 tablo envanteri

| Sınıf | Adet | Anlamı |
|---|---|---|
| Bir işe bağlı | 23 | Otomatik tazeleniyor |
| **Öksüz** | **40** | Dönemi var ama hiçbir iş yazmıyor |
| Dönemsiz | 41 | Referans/katalog (havza listesi, coğrafi işaret vb.) |

Öksüz 40'ın içinde **21 `oner_*` tablosu** var — Pro'nun okuduğu tablolar.
Kalan öksüzler arasında dikkat çekenler:

- `makro_tarim_gsyh` (2024), `makro_tarim_disticaret` (2024) — vitrindeki
  "Tarımın GSYH'deki payı" kartını besliyor, 21 ay geride
- `bitkisel_global_uretim` (2024, 109.720 satır)
- `fao_balans` (2023, 252.350 satır)
- `tr_verimlilikler` / `tr_kisi_basi_uretim_tuketim` (2023) — **taze sanılan
  ama öksüz**; `oner_` ikiziyle aynı yılda

Son madde önemli: `oner_*`'dan çıkmak her sorunu çözmüyor. Bazı öneksiz
tablolar da güncellenmiyor.

---

## 5. Yapılacaklar

### Aşama 1 — İkizlerden çık ✅ TAMAMLANDI

**24 `oner/` çağrısından 21'i taşındı. Kalan 3'ü bilerek duruyor.**

Kazanç:

| Gösterge | Önce | Sonra |
|---|---|---|
| Yumurta / çiğ süt / kanatlı / kırmızı et ekonomik göstergeleri | 2026-02 | **2026-08** |
| Kırmızı et üretim miktarı | 2024 | **2025** |
| İl hayvan varlığı | 2024-01 | **2025-01** |
| Hayvansal ürün üretimi (Basic dahil) | dönemsiz/bozuk | **2025** |

Yol boyunca çıkan ve düzeltilen üç sessiz hata:

1. **`o_toplam_uretim_veri`'nin son satırı bozuktu** — 2025 yumurta 14,6 Mr
   (gerçeği 19,9 Mr), bal ve süt sütunları 0/boş. Yumurta sayfası bu yüzden
   uydurma bir "%-24,9 düşüş" gösteriyordu.
2. **`toplam_odenen_dolar` sütunu NULL** — taze ithalat tablosunda 2010-2024'ün
   tamamında boş. Hazır sütunu kullansaydım grafik 15 yıl sıfır gösterip
   yalnız 2025'te zıplardı. Parçalardan toplanıyor.
3. **`oner/hayvansal-urun-uretimi` BASIC tarafında da kullanılıyordu** —
   Pro taranırken çıktı. O da taşındı.

Bilerek bırakılan 3 çağrı:

| Rota | Neden |
|---|---|
| `oner/canli-hayvan-et-ithalati` | Taze tablo 2024'te bitiyor, bunda 2025 var. İkisi birleştiriliyor: taban taze (revize değerler, 2002'ye kadar), eksik yıllar bundan. **İkisi de öksüz.** |
| `oner/dunya-sut-fiyatlari` | Taze karşılığı yok. Silinmedi; ekranda **anlık görüntü tarihi** yazıyor. |
| `oner/dunya-karkas-fiyatlari` | Aynı gerekçe, aynı çözüm. |

Doğrulama: arıcılık geniş→uzun pivotu eski tabloyla **891/891 birebir**
tuttu; 16 eşlenen ekonomik alan 2026-08'de sıfır değil; kırmızı et sayfasının
üç sekmesi de dolu (Ekonomi 2026-08, İthalat 2025, Dünya 2024).

### Aşama 2 — Eski `api.php` katmanından çık

11 dosya. Altısı dış ticaret sekmesi (birlikte). `AIAssistantPage` ve
`CommodityPricesPage` için Basic'te çalışan karşılıklar hazır.

Bu bitince `services/api.ts` ve `netlify.toml`'daki `/api.php` proxy'si
silinebilir; `dashboard_secret_key_2024` de istemci paketinden çıkar.

### Aşama 3 — Öksüz tabloları senkrona bağla

40 öksüz tablonun hepsi gerekmiyor. Öncelik, ekranda görünenler:
`makro_tarim_gsyh`, `makro_tarim_disticaret`, `tr_verimlilikler`,
`bitkisel_global_uretim`.

Her biri için kaynak belirlenmeli: TÜİK SDMX'te var mı, FAO bulk'ta mı, yoksa
elle mi? (Hafızadaki not: TÜİK SDMX'te bitkisel üretim yok, FAO'da yalnız
`production/` bulk'u açık.)

### Aşama 4 — Temizlik

`oner_*` tabloları ve rotaları kaldırılabilir. **Aşama 1 doğrulanmadan
yapılmamalı** — geri dönüş yolu kalmaz.

### Aşama 5 — Yayın

Netlify branch deploy ile test, sonra `main`'e birleştir. GitHub Pages
kullanılmayacak: temel yol `/new_tarpovizyon/` farkı, SPA 404 sorunu ve
proxy/fonksiyon eksikliği yüzünden test edilen şey yayınlanan şey olmaz.

---

## 6. Tuzaklar

**Şema aynı değil.** Satır sayıları farklı (98 vs 104, 162 vs 243) — sütun
adları da farklı olabilir. Her rota değişiminde dönen ilk satırın alanları
karşılaştırılmalı; `undefined` alan sessizce boş grafik üretir.

**Dönem alanı kayabilir.** `oner_hayvansal_urun_uretimi` dönemsiz görünüyor,
tazesi `tr_hayvansal_urun_uretimi` 2025 veriyor. Yani ikizde yıl sütunu ya yok
ya farklı adta. Grafiklerin x ekseni buna bağlı.

**Önbellek damgası.** D1'e yazan her yol `veri_damga`'yı ilerletmeli; yoksa
Worker'ın 1 saatlik okuma önbelleği eski veriyi servis etmeye devam eder.

**Doğrulama üretim derlemesinde yapılmalı.** Dev sunucusunda StrictMode
animasyonları donduruyor, grafikler boş görünüyor — daha önce yaşandı.

**Depo herkese açık.** `veteroner/new_tarpovizyon` **PUBLIC**. Pro lisanslı
satılacaksa kaynak kodu şu an herkesçe okunabilir. Bu, veri işinden bağımsız
ama Pro yayına çıkmadan karara bağlanmalı.

---

## 7. Açık sorular

1. `oner/dunya-sut-fiyatlari` ve `oner/dunya-karkas-fiyatlari` (tek satırlık
   göstergeler) — kaynak bulunup beslenecek mi, kaldırılacak mı?
2. Depo özel yapılacak mı?
3. Pro'nun AI ve Piyasa sayfaları, Basic'te yazılan yeni sürümlerle
   değiştirilsin mi, yoksa Pro kendi sürümünü mü korusun?

---

## Ek: bu belgedeki ölçümler nasıl tekrarlanır

```bash
# D1 tazelik denetimi (tablo → son dönem → hangi işe bağlı)
node scripts/veri-tazeligi-denetimi.mjs

# Pro'nun hangi katmanı kullandığı
grep -rl "services/d1'"  src/pages/ | wc -l   # D1
grep -rl "services/api'" src/pages/ | wc -l   # eski api.php

# oner_ tablosuna yazan senkron var mı (olmamalı)
grep -rn "oner_" scripts/
```

---

## 8. Aşama 3 keşfi — TÜİK SDMX'te ne var, ne yok

2 Eylül 2026'da TÜİK SDMX kataloğu (421 dataflow) tarandı. Sonuç, Aşama 3'ün
kapsamını **daraltıyor**.

### SDMX'te OLMAYAN (öksüz tabloların çoğu buradan beslenemez)

| Aranan | Sonuç |
|---|---|
| Hayvan varlığı (`tr_hayvan_varliklari`) | ✗ hiç akış yok |
| Kırmızı et üretimi | ✗ yok |
| Bitkisel üretim | ✗ yok |
| Arıcılık / bal | ✗ yok |
| İl bazında tarım | ✗ yok |

Bunlar TÜİK'in **bülten API'sinden** ya da **Veri Portalı Excel**'inden
gelmek zorunda; SDMX yolu kapalı.

### SDMX'te OLAN ve henüz kullanılmayan

- `UH_BH_GSYH_CARI` — bölgesel GSYH, `FAALIYET_KOD` boyutunda
  **`A` = Tarım, ormancılık ve balıkçılık** ve **`B1GQ` = GSYH (toplam)**
  kodları var. 2000–2024, `UNIT_MEASURE=TUSD` (bin dolar), `KIRILIM_SEVIYE=A10`.
- `DF_SUT_URUNLERI_YILLIK_V2` — süt ürünleri yıllık detay (aylık sürümü zaten
  senkronda).

### `makro_tarim_gsyh` ne kadar geride — ölçüldü

| Yıl | D1 tarım | SDMX tarım | D1 pay | SDMX pay |
|---|---|---|---|---|
| 2021 | 44,71 | **47,2** | %5,53 | **%5,70** |
| 2022 | 58,67 | **61,9** | %6,48 | **%6,69** |
| 2023 | 68,5 | **73,7** | %6,06 | **%6,39** |
| 2024 | 74 | **79,1** | %5,60 | **%5,82** |

D1 sistematik olarak düşük: TÜİK GSYH'yi yukarı revize etmiş, D1 eski sürümü
tutuyor. Ana sayfadaki "Tarımın GSYH'deki payı" kartı bu yüzden hem yanlış
hem de 2025'i hiç görmeyecek.

### Bunu senkrona bağlamak için çerçevede iki eksik var

`datasets.mjs`'e bildirimsel kayıt eklemek YETMİYOR:

1. **Yıllık dönem desteği yok.** `sync.mjs` içindeki `isMonth()`
   `^\d{4}-\d{2}$` istiyor; GSYH dönemi `2024` biçiminde ve tüm satırlar
   sessizce eleniyor.
2. **Ölçek çarpanı yok.** SDMX bin dolar (`TUSD`) veriyor, tablo milyar dolar
   tutuyor. `toNumber` yalnız ondalık yuvarlıyor.

İkisi de küçük ve kapsamlı: `inRange`'e yıllık desen, `ds`'ye `bolen` alanı.

### Doğrulanmış eşleme (uygulanmaya hazır)

```
flow:        UH_BH_GSYH_CARI, version 1.0
filter:      REF_AREA=TR, UNIT_MEASURE=TUSD, KIRILIM_SEVIYE=A10
productDim:  FAALIYET_KOD
columns:     tarim_gsyh_milyar_usd  ← A
             toplam_gsyh_milyar_usd ← B1GQ
table:       makro_tarim_gsyh
periodColumn: yil        (YILLIK — çerçeve desteği gerekiyor)
bolen:       1e6         (bin $ → milyar $; çerçeve desteği gerekiyor)
```

### Erişim tuzağı (tekrar yaşandı)

`Accept-Language` başlığı olmadan veri ucu **HTTP 500** ve gövdede
`languageTag1` dönüyor. Hata mesajı sebebi hiç söylemiyor; başlık şart.
