# PRODUCTION READY PLANI

> 4 Çiftçi Modülü (Hasat Tahmini, Sulama Planlayıcı, Gübre Hesaplayıcı, Tarımsal Takvim) Production-Ready Hale Getirme
> Tarih: 26 Şubat 2026
> **Durum: ✅ TAMAMLANDI**

---

## YAPILACAKLAR

### P0 — KRİTİK (Güvenlik & Stabilite)

#### 1. ✅ App.tsx — ErrorBoundary Entegrasyonu
- [x] 4 modül rotasını (`/hasat-tahmini`, `/sulama-plan`, `/gubre-hesap`, `/tarim-takvim`) `<ErrorBoundary>` ile sar
- **Sonuç:** App.tsx'e import + 4 route `<ErrorBoundary>` ile sarıldı

#### 2. ✅ HasatTahmini SQL Güvenliği — API Proxy Refactor
- [x] `fetchQuery(sql)` yerine parametre bazlı endpoint fonksiyonları oluştur
- [x] `api.ts`'de 5 yeni güvenli API fonksiyonu yazıldı (`fetchProvinces`, `fetchDistricts`, `fetchCrops`, `fetchYieldData`, `fetchProvinceRanking`)
- [x] Dahili `_sqlEsc()` fonksiyonu ile SQL temizliği tek dosyada izole edildi
- [x] HasatTahminiPage.tsx'den tüm doğrudan SQL kaldırıldı, ölü `sqlEscape` fonksiyonu silindi

### P1 — YÜKSEK (UX & Doğruluk)

#### 3. ✅ Hava Durumu Widget Disclaimer
- [x] SulamaPlanPage — WeatherWidget altına "Canlı hava verisi referans amaçlıdır; sulama hesaplamaları uzun yıl iklim ortalamalarına dayanır" eklendi
- [x] HasatTahminiPage — WeatherWidget altına benzer disclaimer eklendi
- [x] HasatTahminiPage model disclaimer'da iklim notu güncellendi

#### 4. ✅ Gübre Fiyat Disclaimer Güçlendirmesi
- [x] Fiyat uyarısına "Ocak 2025 güncellemesi" tarih bilgisi eklendi
- [x] "%20-40 farklılık gösterebilir" enflasyon/kur uyarısı eklendi
- [x] "profesyonel gübreleme tavsiyesi yerine geçmez" vurgusu korundu

#### 5. ✅ Sulama Verim Artışı — Ürüne Göre Differansiye Et
- [x] 16 ürün için `cropVerimEtkisi` tablosu oluşturuldu (Buğday %20, Domates %40, Zeytin %15 vb.)
- [x] `verimArtisi` hesabı sabit %40'dan ürün-bazlı değerlere güncellendi

#### 6. ✅ Console.log Temizliği
- [x] `api.ts` — tüm console çıktıları `IS_DEV` guard ile korundu (fetchQuery + egg prices)
- [x] `weather.ts` — tüm console.warn `IS_DEV` guard ile korundu
- [x] Production'da sıfır console çıktısı

### P2 — İYİLEŞTİRME

#### 7. ⏭️ Gübre Hesap — Fiyat Düzenlenebilirlik (ERTELENDİ)
- [ ] Kullanıcının gübre birim fiyatlarını override edebileceği input alanı
- **Not:** Hesaplama fonksiyonunu önemli ölçüde refactor gerektirir; kişisel kullanım için mevcut disclaimer yeterli

#### 8. ✅ Sulama — İklim Verisi Kaynağı Notu Standardizasyonu
- [x] SulamaPlanPage fiyat/iklim disclaimer güncellendi
- [x] HasatTahminiPage iklim disclaimer güncellendi
- [x] Tüm sayfalarda tutarlı mesaj: "uzun yıl iklim ortalamaları kullanılmaktadır"

#### 9. ✅ netlify-dashboard Senkronizasyonu
- [x] App.tsx, api.ts, weather.ts, 4 page TSX, 4 page CSS, ErrorBoundary, WeatherWidget, climate-data.ts, .env senkronize edildi

#### 10. ✅ Build Doğrulama
- [x] `tsc --noEmit` — 0 hata (her iki proje)
- [x] `npm run build` — başarılı (dist oluşturuldu)

---

## DOKUNULMAYACAKLAR (Kapsam Dışı)

- `api.php` sunucu tarafı refactoring (erişim yok)
- Test altyapısı kurulumu (ayrı bir iş)
- `netlify-dashboard/` duplikasyon mimarisi (büyük refactor gerektirir)
- Recharts renk erişilebilirliği (düşük öncelik)
- `package.json` server-only dependency temizliği (build'i kırabilir)

---

## TAKİP

Her madde tamamlandığında `[ ]` → `[x]` olarak işaretlenecektir.
