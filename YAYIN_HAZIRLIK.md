# Mağaza yayını — hazırlık raporu (11 Ağustos 2026)

Soru: **iOS ve Android'de ilk sürümde hangi sayfalar yayınlanabilir?**

Yöntem: 37 Basic + 15 Pro sayfası 375×812'de tek tek gezildi. Her sayfada
konsol hatası, boş/hata metni, yatay taşma, sayfa boyu ve grafik sayısı
ölçüldü. Veri tazeliği ayrıca D1'den sorgulandı (tablo başına en son dönem).

---

## 1. Bildirim sistemi — **yok**

Kullanıcı "eklemiştim ama beğenmemiştim" dedi. Ölçüm sonucu: ortada
beğenilecek bir sistem yok, yalnızca kabuğu var.

| Bileşen | Durum |
|---|---|
| `@capacitor/push-notifications` | **Kurulu değil** (package.json'da yok) |
| Vite yapılandırması | Eklentiyi **no-op stub'a** yönlendiriyor (`src/rasyon/stubs/capacitor-push.ts`) |
| Android FCM (`google-services.json`) | **Yok** |
| iOS APNs (`GoogleService-Info.plist`) | **Yok** |
| iOS push entitlement | **Yok** |
| Bildirim gönderen sunucu tarafı | **Yok** |
| Ayarlar'daki 3 anahtar | Var ama **hiçbir şeyi kontrol etmiyor** — yalnızca `localStorage`'a yazıyor |

Push kodu yalnızca **Rasyon** modülünde duruyor (`src/rasyon/services/push/`)
ve stub'ı çağırdığı için hiçbir şey yapmıyor.

**Değerlendirme:** Ayarlar ekranındaki üç anahtar kullanıcıya var olmayan bir
özellik vaat ediyor. İlk sürümde iki seçenek var:

- **A (önerilen):** Anahtarları ilk sürümden çıkar. Olmayan özelliği
  göstermemek, açıp hiçbir şey olmamasından iyidir. Apple'ın inceleme
  kılavuzu da işlevsiz arayüzü ret sebebi sayıyor (2.1 — "app completeness").
- **B:** Gerçekten kur. En küçük anlamlı kapsam: `@capacitor/push-notifications`
  + FCM/APNs anahtarları + token'ları saklayacak bir uç + gönderim işi.
  Fiyat/üretim uyarısı için veri zaten var (günlük TÜİK senkronu), tetikleyici
  yazmak gerekiyor. Bu bir sonraki sürümün işi.

---

## 2. TarpoVizyon Basic — **37 sayfa, 36'sı yayına hazır**

Ölçüm: **konsol hatası 0**, **boş/hata durumu 0**, **yatay taşma 0**
(taşma bu turda düzeltildi — 9 sayfada tablolar kaydırılamıyordu).

Sayfa boyu 0,8–5,1 ekran arasında — mobil için uygun aralık.

### Yayınlanabilir (36)

| Bölüm | Sayfa | Boy (ekran) | Veri |
|---|---|---|---|
| Makro | Genel, Tarım ÜFE (+detay), Tarımsal GFE (+detay), TÜFE, FAO endeksi, Endeks karşılaştırma | 1,1–2,4 | günlük senkron |
| Küresel | Hayvansal ürünler, Hayvan varlıkları, Sığır karkas verimleri, Sığır eti üretimi, İnek sütü verimleri, Kişi başı et tüketimi, Karkas et fiyatları, Çiğ süt fiyatları | 0,8–2,2 | FAO |
| Genel | Türkiye hayvan varlığı, Hayvansal ürünlerde verim, Kişi başına tüketim | 0,8–3,6 | 2025 / **2023** |
| Dış ticaret | Hayvansal | 1,8 | 2026 |
| Çiğ süt | Üretim-yeterlilik, Süt ürünleri üretimi, Ekonomik göstergeler | 1,0–4,1 | **2026-02** |
| Kırmızı et | Üretim-yeterlilik, Ekonomik göstergeler, Fiyat-maliyet, Dana-kuzu | 0,8–3,1 | **2026-02** |
| Kanatlı | Piliç eti üretim, Yumurta üretim | 2,7–3,4 | **2026-05** ← en taze |
| Bitkisel genel | Küresel üretim, Dış ticaret, TR üretim miktarı | 2,4–3,6 | 2024 |
| İl düzeyinde | Bitkisel üretim, Havza ürün deseni, Hayvansal üretim, Arıcılık | 2,3–5,1 | **2025** |

### Yayınlanamaz (1)

| Sayfa | Sorun |
|---|---|
| İl düzeyinde → **Coğrafi İşaret** | **68 ekran** (103 000 karakter). Tüm kayıtlar tek listede dökülüyor. Kademeli açılım ya da arama gerekiyor. |

### Bir uyarı — veri tazeliği

- **Hayvansal ürünlerde verim** tablosu **2023**'te kalmış (iki yıl geride).
  Sayfa çalışıyor ama "güncel" demek doğru olmaz. Yayınlanacaksa üstünde
  dönem etiketi olmalı.
- Ana sayfadaki "TarpoVizyon Basic · **20 rapor**" yazısı yanlış: **37** sayfa var.

---

## 3. TarpoVizyon Pro — 15 sayfa incelendi

Konsol hatası ve taşma **yok**. Ayrım sayfa boyunda ve veri tazeliğinde.

### İlk sürüme uygun (boyu ≤ 6,5 ekran, verisi taze)

| Sayfa | Boy | Grafik | Veri |
|---|---|---|---|
| **Beyaz Et** | 6,2 | 6 | 2026-05 |
| **Süt** | 6,4 | 9 | 2026-02 |
| **Kırmızı Et** | 3,0 | 3 | 2026-02 |
| **Arıcılık** | 2,0 | 1 | 2025 |
| **Makroekonomik** | 5,7 | 7 | günlük |
| **İl Bazında · Hayvancılık** | 5,3 | 2 | **2025** (bu turda yüklendi) |
| **Bitkisel Üretim (genel)** | 4,3 | 3 | 2024 |

### İlk sürüme alınmamalı

| Sayfa | Boy | Sebep |
|---|---|---|
| TÜİK Canlı Hayvan | **12,4** | En uzun sayfa; katlanabilir bölüm gerekiyor |
| Panoya Genel Bakış | **11,9** | 12 grafik tek akışta |
| Yumurta | 8,7 | Uzun + "Fiyatlar yüklenemedi" kartı (dış API, CORS) |
| Tahıllar ve 5 kardeşi | 7,1–8,3 | Uzun |
| Fiyat Endeksleri | 8,3 | Uzun |
| Dış Ticaret | 7,2 | Uzun |
| Emtia Fiyatları | 0,8 | **Sayfa boş açılıyor** (128 karakter) — veri geç geliyor, ilk render boş |

---

## 4. Önerilen ilk sürüm

**Kapsam:** Basic'in 36 sayfası + Pro'dan 7 sayfa = **43 ekran**.

Gerekçe: Basic zaten mobil için doğru ölçekte (ortalama 2,1 ekran) ve veri
kaynakları en taze olanlar. Pro'nun uzun sayfaları katlanabilir bölümler
eklenene kadar beklesin — mağaza incelemesinde "sonsuz kaydırma" şikâyeti
değil, ölçülü bir uygulama görünsün.

**Yayın öncesi yapılacaklar:**

1. Coğrafi İşaret sayfasını kademelendir ya da ilk sürümden çıkar.
2. Ayarlar'daki 3 bildirim anahtarını çıkar (bkz. bölüm 1).
3. Ana sayfadaki "20 rapor" → "37 rapor".
4. Emtia Fiyatları'na yükleniyor durumu ekle (boş açılıyor).
5. Verim sayfasına "2023 verisi" etiketi.

**Sonraki sürümler:** Pro'nun uzun sayfaları katlanabilir bölümlerle
(MOBIL_DENETIM.md · S5) eklenerek genişletilir.
