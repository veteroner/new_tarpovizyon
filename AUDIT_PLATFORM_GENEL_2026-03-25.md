# Platform Genel Denetim

Tarih: 2026-03-25
Kapsam: dashboard-project genel platform incelemesi

## Nihai Hüküm

Proje oyuncak değil. İçinde ciddi domain bilgisi, veri modelleme emeği ve bazı güçlü ürün çekirdekleri var.

Ama genel sistem üretim olgunluğunda değil.

- Sınıfı: güçlü prototip
- Ürün hissi: yüksek
- Operasyonel güvenilirlik: düşük
- Açık kullanıcı yayınına uygunluk: hayır

## Kritik Bulgular

### 1. Frontend'den ham SQL taşıyan veri erişim modeli

Frontend tarafı API anahtarı ile birlikte SQL query string üretiyor ve backend'e gönderiyor.
Bu yaklaşım güvenlik, bakım, test ve sürümleme açısından kabul edilemez.

Etkiler:
- Veri erişim katmanı fiilen istemcide
- Endpoint sınırları belirsiz
- Yetkisiz veri okuma riski
- Şema değişikliklerinde yaygın kırılma

İlgili dosyalar:
- netlify-dashboard/src/services/api.ts
- server-files/api.php

### 2. Backend içinde düz metin gizli anahtarlar

Backend dosyasında API anahtarları doğrudan kod içinde tutuluyor.

Etkiler:
- Hesap suistimali
- Maliyet patlaması
- Credential sızıntısı
- Secret rotasyonu zorluğu

İlgili dosya:
- server-files/api.php

### 3. Production build güvenilir değil

Build hattı deterministik biçimde yeşil değil.
Vite/PostCSS/Tailwind çözümleme zincirinde hata görüldü.

Sonuç:
- Deploy güvenilir değil
- CI kurulduysa kırmızıya düşmesi gerekir

İlgili dosyalar:
- netlify-dashboard/package.json
- netlify-dashboard/src/styles/globals.css

### 4. TypeScript typecheck ciddi biçimde kırık

Tip denetiminde yüzlerce hata var. Özellikle rasyon entegrasyonunda alias çözümleme ve tip eksikleri yoğun.

Sonuç:
- Refactor güveni düşük
- Runtime hata riski yüksek
- Kod zekice büyümüş, disiplinli sertleştirilmemiş

İlgili dosyalar:
- netlify-dashboard/src/rasyon/RasyonApp.tsx
- netlify-dashboard/tsconfig.app.json
- netlify-dashboard/vite.config.ts

### 5. Lint hattı kırık

Lint konfigürasyonu güvenilir kalite kapısı olarak çalışmıyor.

İlgili dosya:
- netlify-dashboard/eslint.config.js

### 6. Repo hijyeni kötü

Pages klasörü içinde çok sayıda artifact ve backup dosyası bulunuyor.

Sonuç:
- IDE aramaları kirleniyor
- Yanlış refactor riski artıyor
- Bakım maliyeti gereksiz yükseliyor

Örnekler:
- netlify-dashboard/src/pages/TurkeyAnimalProductionPage_OLD_BACKUP.tsx
- netlify-dashboard/src/pages/OverviewPage.old.tsx
- netlify-dashboard/src/pages/.!17212!._SugarCropProductionPage.tsx

## Mimari Hüküm

### Güçlü taraflar

- Ciddi alan bilgisi mevcut
- Veri yoğun analitik ekranlar gerçek değer üretiyor
- Çok modüllü ürün vizyonu açık
- Rasyon tarafında test kültürü izleri var

### Zayıf taraflar

- Ürün mühendisliği, modül geliştirme hızının gerisinde kalmış
- Sayfa dosyaları aşırı büyümüş
- Domain mantığı, veri erişimi ve sunum aynı yerde toplanmış
- Hata gözlemlenebilirliği zayıf
- Güvenlik modeli yanlış kurulmuş

## Yayın Kararı

Şu haliyle:

- Açık internet yayını: hayır
- Ücretli kullanıcıya sunum: hayır
- Kapalı demo: evet
- İç kullanım: evet
- Güvenlik yüzeyi kapatılmış kapalı beta: şartlı evet

## Zorunlu Öncelikler

1. Frontend'den SQL gönderme modelini kaldır
2. Tüm anahtarları environment secret yönetimine taşı
3. Genel amaçlı execute/query yüzeylerini kapat
4. Build, lint, typecheck üçlüsünü yeşile çek
5. Artifact ve backup dosyalarını repo dışına al
6. API katmanını whitelist edilmiş domain endpoint'lerine dönüştür
7. Kritik akışlar için smoke test ekle
8. Loglama ve hata gözlemlenebilirliği kur