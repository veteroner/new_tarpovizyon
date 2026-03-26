# Tarpovizyon ve TarpoRasyon Dışı Modüller Denetimi

Tarih: 2026-03-25
Kapsam:
- Hasat Tahmini
- Sulama Planlayıcı
- Gübre Hesaplayıcı
- Tarımsal Takvim

Hariç tutulanlar:
- Tarpovizyon
- TarpoRasyon

## Kısa Sonuç

Bu modüller eğlence ürünü gibi görünmüyor; ama çoğu profesyonel karar destek sistemi de değil.

Doğru sınıflandırma:

- Hasat Tahmini: heuristik karar destek prototipi
- Sulama Planlayıcı: gelişmiş görünümlü yaklaşık hesap aracı
- Gübre Hesaplayıcı: kurallı hesap makinesi
- Tarımsal Takvim: içerik tabanlı yardımcı araç / yarı-toy

## 1. Hasat Tahmini

### Hüküm

- Toy: hayır
- Entertainment: kısmen vitrin etkisi var
- Ürün olgunluğu: orta-düşük
- Gerçek sınıf: heuristik tahmin prototipi

### Neden

Güçlü yanları:
- İl, ilçe, ürün ve verim geçmişi ile çalışıyor
- SQL tarafında tarihsel veri çekiyor
- Türkiye ve il karşılaştırmaları eklenmiş
- Sonuç ekranı zengin, kullanıcıya anlatı kuruyor

Zayıf yanları:
- Tahmin motoru esasen lineer regresyon + sabit çarpanlar
- Sulama ve toprak etkisi sabit katsayılarla uygulanıyor
- "AI destekli" söylemi abartılı; gerçek model tabanlı tahmin yok
- Sonuçlar lokal geçmişe localStorage ile kaydediliyor; kurumsal iz bırakmıyor
- GPS ters geocode dahil ama doğrulama/güven skoru zayıf

Teknik gerçek:
- Tahmin çekirdeği lineer regresyon ve standart sapma bantlarından oluşuyor
- İklim riski statik iklim tabloları üzerinden hesaplanıyor

Dosyalar:
- netlify-dashboard/src/pages/HasatTahminiPage.tsx
- netlify-dashboard/src/services/api.ts
- netlify-dashboard/src/utils/climate-data.ts

### Acımasız yorum

Bu modül güzel anlatılmış bir Excel+grafik hibriti gibi.
Faydasız değil, oyuncak da değil.
Ama bunu "AI destekli hasat tahmini" diye satmak teknik olarak fazla iddialı.

## 2. Sulama Planlayıcı

### Hüküm

- Toy: hayır
- Entertainment: hayır
- Ürün olgunluğu: orta-düşük
- Gerçek sınıf: yaklaşık sulama karar destek aracı

### Neden

Güçlü yanları:
- Kapsamı geniş
- Toprak tipi, sulama sistemi, ETo, Kc, senaryo, fertigasyon gibi parametreler var
- Kullanıcıya profesyonel araç hissi veriyor
- Canlı hava verisini opsiyonel kullanabiliyor

Zayıf yanları:
- İleri yöntemlerin çoğu gerçek hesap değil, tablo üstüne çarpan yaklaşımı
- Kod içinde bunu zaten "yaklaşık" ve "karar-destek" diye itiraf ediyorsunuz
- Toprak katmanları ve Ky etkileri de yaklaşık model
- Mühendislik olarak fazla iddialı görünen ama bilimsel doğrulama hattı belirsiz bir araç
- Bu modülün güvenilirliğini destekleyen test görünmüyor

Teknik gerçek:
- Resmi MGM verisi kullanılmıyor
- ETo yöntemlerinin önemli bölümü yaklaşık çarpan mantığıyla temsil ediliyor
- OpenWeather varsa destek, yoksa statik tablo fallback

Dosyalar:
- netlify-dashboard/src/pages/SulamaPlanPage.tsx
- netlify-dashboard/src/services/weather.ts
- netlify-dashboard/src/utils/climate-data.ts

### Acımasız yorum

Bu modül aptalca değil. Hatta en iyi paketlenmiş yan modül olabilir.
Ama derinliği olduğundan fazla gösteriyor.
Zira arayüz profesyonel, hesap modeli ise önemli ölçüde yaklaşık.

Bu bir sulama mühendisi yazılımı değil; iyi tasarlanmış bir planlama yardımcısı.

## 3. Gübre Hesaplayıcı

### Hüküm

- Toy: sınırda değil, faydalı
- Entertainment: hayır
- Ürün olgunluğu: düşük-orta
- Gerçek sınıf: kural tabanlı gübre hesap makinesi

### Neden

Güçlü yanları:
- Kullanıcıya net çıktı veriyor
- NPK ve mikro besin tarafı düşünülmüş
- Senaryo, ürün, toprak girdileri mantıklı
- Bölgesel toprak profilleri ile hızlı başlangıç sunuyor

Zayıf yanları:
- Tümü statik veri tabloları ve basit kural setleri üstünde çalışıyor
- Gübre karışımı optimizasyonu basit greedy mantıkla yapılıyor
- Gerçek piyasa, toprak laboratuvar entegrasyonu, ürün çeşidi, sulama, önceki münavebe gibi kritik değişkenler yok
- Sonuç ekranı profesyonel duruyor ama model derinliği sınırlı
- Zaten ekranda "taslak gübre planı" diyerek güven sınırı kabul edilmiş

Dosyalar:
- netlify-dashboard/src/pages/GubreHesapPage.tsx
- netlify-dashboard/src/utils/climate-data.ts

### Acımasız yorum

Bu modül kötü değil; ama aslında iyi giydirilmiş uzman sistem taslağı.
Bir agronomist yazılımı değil.
Çiftçiye ilk yön gösterici olabilir, nihai reçete aracı olamaz.

## 4. Tarımsal Takvim

### Hüküm

- Toy: evet, kısmen
- Entertainment: hayır ama vitrin ağırlıklı
- Ürün olgunluğu: düşük
- Gerçek sınıf: statik içerik tabanlı planlama aracı

### Neden

Güçlü yanları:
- Kullanımı kolay
- Görsel olarak anlaşılır
- Bölgesel hafta offset mantığı kullanıcıya hızlı değer veriyor

Zayıf yanları:
- Takvim verisi büyük ölçüde sabit profillerden üretiliyor
- İl bazlı gerçek modelleme yok, bölgesel offset var
- Çok yıllık ve yıllık ürünlerde mantık aynı altyapıya sıkıştırılmış
- Persist edilen tek şey localStorage tercihleri
- Zengin görünmesine rağmen iç motoru içerik şablonu seviyesinde

Dosyalar:
- netlify-dashboard/src/pages/TarimTakvimPage.tsx
- netlify-dashboard/src/utils/climate-data.ts

### Acımasız yorum

Bu modül üretim yazılımından çok akıllı poster gibi.
Faydasız değil, ama karar destek derinliği yok.
Ben buna ürün değil yardımcı vitrin modülü derim.

## Test ve Güvence Durumu

Bu dört modül için görünür test dosyası bulunmadı.

Sonuç:
- Davranış değişiklikleri güvenle refactor edilemez
- Hesapların doğruluğu otomatik korunmuyor
- En kritik risk: kullanıcıya güven veren arayüz, doğruluğu kurumsal olarak doğrulanmamış hesaplar

## Yayın Kararı

### Hasat Tahmini
- Yayına çıkar mı: şartlı ve dikkatli
- Nasıl konumlanmalı: "yaklaşık tahmin / karar destek"
- Nasıl konumlanmamalı: "AI destekli kesin verim tahmini"

### Sulama Planlayıcı
- Yayına çıkar mı: şartlı evet
- Nasıl konumlanmalı: "planlama ve ön hesap"
- Nasıl konumlanmamalı: "mühendis onaylı kesin sulama reçetesi"

### Gübre Hesaplayıcı
- Yayına çıkar mı: şartlı evet
- Nasıl konumlanmalı: "taslak gübre planı / ön hesap"
- Nasıl konumlanmamalı: "nihai gübre reçetesi"

### Tarımsal Takvim
- Yayına çıkar mı: evet, ama yardımcı araç olarak
- Nasıl konumlanmalı: "bölgesel tarımsal hatırlatıcı"
- Nasıl konumlanmamalı: "dinamik agronomik planlama sistemi"

## Toplu Karar

Bu modüller genel olarak toy değil; ama çoğu "ürün kadar iddialı anlatılan prototip" sınıfında.

En dürüst sıralama:

1. Sulama Planlayıcı — en güçlü yan modül
2. Hasat Tahmini — anlatısı güçlü ama iddiası modelinden büyük
3. Gübre Hesaplayıcı — faydalı ama hesap makinesi sınıfında
4. Tarımsal Takvim — güzel yardımcı araç, derin ürün değil