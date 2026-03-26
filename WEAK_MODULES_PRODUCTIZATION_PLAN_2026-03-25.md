# Zayıf Modülleri Ürünleştirme Planı

Tarih: 2026-03-25
Kapsam:
- Tarımsal Takvim
- Gübre Hesaplayıcı
- Hasat Tahmini

Hariç:
- Tarpovizyon
- TarpoRasyon
- Sulama Planlayıcı ana odak değil; yalnızca bağımlılık etkisi kadar ele alınır

## Yönetici Özeti

En zayıf modüller doğrudan çöpe atılacak seviyede değil. Ama mevcut halleriyle ya fazla iddialı anlatılıyor ya da ürün değil yardımcı araç sınıfında kalıyor.

Ürünleşme önceliği:

1. Tarımsal Takvim
2. Gübre Hesaplayıcı
3. Hasat Tahmini

Bu sıra neden doğru:

- Takvim modülü en düşük riskle hızla ürünleşebilir
- Gübre modülü ticari değer üretir ama doğrulama ister
- Hasat Tahmini en fazla iddia taşıyan modül olduğu için en son sertleştirilmelidir

## Hedef Ürün Seviyesi

### Tarımsal Takvim
Hedef sınıf:
- Bölgesel tarımsal operasyon planlayıcısı

Olmaması gereken:
- Akıllı tarım motoru gibi pazarlanması

### Gübre Hesaplayıcı
Hedef sınıf:
- Ön reçete ve gübre planlama aracı

Olmaması gereken:
- Nihai agronomik reçete sistemi gibi sunulması

### Hasat Tahmini
Hedef sınıf:
- Güven skorlu verim ve hasat karar destek modülü

Olmaması gereken:
- AI destekli hassas tahmin sistemi gibi konumlanması

## Ortak Sorunlar

1. Hesap motoru ile pazarlama dili uyumsuz
2. Statik veri ve heuristik kurallar fazla baskın
3. Test yok veya görünür güvence zayıf
4. Sonuçlarda güven skoru ve model sınırı yeterince görünür değil
5. Domain veri katmanı sürümlü ve izlenebilir değil

## Faz 0: Konumlandırma Düzeltmesi

Süre:
- 2 gün

Amaç:
- Ürünün iddiasını teknik gerçeklikle hizalamak

İş kalemleri:
- Kart başlık ve açıklamalarını yeniden yaz
- Sonuç ekranlarına "bu bir ön karar destek aracıdır" açıklaması ekle
- Her modülde veri kaynağı ve model tipi kısa özet olarak göster
- "AI destekli" gibi iddiaları yalnızca gerçek model varsa bırak

Teslim çıktısı:
- Yeni ürün metinleri
- Uyarı ve güven metinleri

Kabul kriteri:
- Hiçbir modül teknik olarak yapmadığı şeyi iddia etmeyecek

## Faz 1: Tarımsal Takvim Ürünleştirme

Süre:
- 1 hafta

### Mevcut durum

- Statik ürün profilleri var
- Bölgesel hafta offset mantığı çalışıyor
- Kullanıcıya görsel fayda sağlıyor
- Ama gerçek veriyle dinamikleşmiyor

### Hedef

Takvim modülünü "güzel statik liste" olmaktan çıkarıp sezon, bölge ve hava etkisine duyarlı yardımcı operasyon aracına çevirmek.

### İş paketleri

#### 1. Veri modeli ayrıştırma
- Ürün profillerini sayfa dosyasından çıkar
- Sürümlü JSON veya TS data modülüne taşı
- Her ürün için kaynak notu alanı ekle
- Her aktiviteye güven düzeyi ekle: düşük, orta, yüksek

#### 2. Dinamik tarih motoru
- Sabit hafta offset yerine iklim bölgesi + rakım + ürün kategorisi bazlı kurallar tanımla
- Sezon başlangıç tarihini seçilen ile göre hesapla
- Çok yıllık ürünler için bakım, budama, çiçeklenme, hasat olaylarını ayrı kurallarla üret

#### 3. Hava ve sezon duyarlılığı
- Seçili il için canlı hava ve 5 günlük tahmini sadece widget değil, aktivite uyarılarına bağla
- Örnek: yağış varsa ilaçlama önerisini ertele
- Örnek: don riski varsa fide dikimini uyarı durumuna al

#### 4. Kullanıcı çıktıları
- PDF/print dostu sezon planı
- Haftalık yapılacaklar özeti
- Kritik gecikmeler için rozet ve alarm mantığı

#### 5. Test
- Aktivite üretimi için snapshot değil kural testi yaz
- Bölgesel offset ve çok yıllık ürün senaryoları için unit test ekle

### Ürün kabul kriteri

- Aynı ürün farklı iki bölgede farklı ama tutarlı takvim üretmeli
- Hava koşulu kritik aktiviteleri etkileyebilmeli
- Kullanıcı haftalık yapılacaklar listesini dışa aktarabilmeli
- Temel aktivite üretim fonksiyonları test altında olmalı

### KPI

- Haftalık geri dönüş oranı
- Kullanıcı başına seçilen ürün sayısı
- Dışa aktarılan plan sayısı

## Faz 2: Gübre Hesaplayıcı Ürünleştirme

Süre:
- 2 hafta

### Mevcut durum

- Statik ürün besin ihtiyaç verisi var
- Manuel toprak analizi girişi var
- Basit öneri ve maliyet tablosu var
- Ama model derinliği düşük ve reçete güveni sınırlı

### Hedef

Gübre hesaplayıcıyı "tek ekranlı hesap makinesi" olmaktan çıkarıp kontrollü, şeffaf, doğrulanabilir bir ön reçete sistemine çevirmek.

### İş paketleri

#### 1. Veri katmanı sertleştirme
- Ürün besin tablolarını ayrı veri kaynağına taşı
- Her ürün için kaynak, revizyon tarihi ve varsayım alanı ekle
- Gübre ürün verisini manuel listeden yönetilebilir kataloga taşı

#### 2. Reçete mantığını iyileştirme
- Greedy mantık yerine hedef fonksiyonlu basit optimizer kur
- Amaçlar:
  - maliyet minimizasyonu
  - besin hedefini karşılama
  - aşırı N/P/K yükünü sınırlama
- Organik ve kimyasal karışık senaryo üret

#### 3. Girdi modelini güçlendirme
- Toprak analizinde EC, kireç, tekstür, önceki ürün, sulama tipi, organik madde sınıfı gibi alanlar ekle
- Ürün çeşidi veya kategori seçimi ekle
- Hedef verim için gerçekçi aralık kontrolü koy

#### 4. Sonuç güven katmanı
- Çıktıya güven puanı ekle
- Kritik eksik veri varsa reçete yerine uyarı ver
- Sonucu "ön reçete" ve "uzman kontrolü gerekli" statülerine ayır

#### 5. Ekonomi ve operasyon
- Toplam alan bazlı maliyet
- uygulama takvimi
- dekara maliyet
- alternatif reçete karşılaştırması

#### 6. Test ve doğrulama
- Besin hesabı testleri
- optimizer testleri
- tipik ürün/toprak örnekleri için regresyon testleri

### Ürün kabul kriteri

- Her hesap sonucu güven skoru üretmeli
- Sistem en az 3 alternatif reçete sunabilmeli
- Aynı girdilerde deterministik sonuç vermeli
- NPK hedefleri tolerans dahilinde karşılanmalı
- Aşırı doz uyarıları görünür olmalı

### KPI

- Hesap tamamlama oranı
- reçete dışa aktarma oranı
- öneri karşılaştırma kullanımı

## Faz 3: Hasat Tahmini Ürünleştirme

Süre:
- 3 hafta

### Mevcut durum

- Tarihsel verim verisi çekiliyor
- Lineer regresyon ve sabit çarpanlarla tahmin üretiliyor
- Görsel anlatısı güçlü
- Ama modelin güven seviyesi ve veri sınırı zayıf

### Hedef

Hasat Tahmini modülünü pazarlama diliyle değil veri güveniyle çalışan, sınırlı ama dürüst bir tahmin modülüne çevirmek.

### İş paketleri

#### 1. Tahmin motorunu katmanlandırma
- Tahmin motorunu sayfadan ayır
- Model tiplerini açıklaştır:
  - trend tabanlı tahmin
  - iklim düzeltilmiş tahmin
  - kullanıcı girdisi etkili senaryo tahmini
- Her bir sonuç için hangi modelin kullanıldığını belirt

#### 2. Güven skoru ve açıklanabilirlik
- Tahmine confidence score ekle
- confidence girdileri:
  - veri yılı sayısı
  - veri sürekliliği
  - regresyon uyumu
  - bölgesel iklim uygunluğu
- kullanıcıya "neden bu tahmin çıktı" paneli ver

#### 3. Veri zenginleştirme
- Statik iklim verisini tek kaynak olmaktan çıkar
- mümkünse MGM veya daha güvenilir meteorolojik veri entegrasyon planla
- ürün bazlı fenoloji ve büyüme evresi katsayılarını dış veriyle yönet

#### 4. Senaryo yönetimi
- baz senaryo
- iyimser senaryo
- stres senaryosu
- sulama var/yok
- toprak kalite etkisi

#### 5. Sonuç ekranı sadeleştirme
- en kritik 3 sayı: beklenen verim, güven aralığı, risk seviyesi
- geri kalan detayları açılır bölümlere taşı
- kullanıcıyı sahte kesinlik hissinden uzaklaştır

#### 6. Test ve izleme
- tahmin motoru için unit test
- örnek veri setleri ile regression test
- kullanıcıların tahmin ile gerçekleşen sonuç farkını girebildiği feedback mekanizması planla

### Ürün kabul kriteri

- Her tahmin confidence score ile gelmeli
- Sonuçlar model türü etiketi taşımalı
- Veri yetersizse tahmin yerine uyarı verilmeli
- Tahmin bandı tek değer yerine aralık göstermeli

### KPI

- tahmin oluşturma oranı
- kullanıcı geri bildirim oranı
- gerçekleşen sonuç ile tahmin sapması

## Teknik Borç Paketi

Bu üç modül ürünleşmeden önce ortak teknik borç temizliği gerekir.

### Zorunlu işler

1. Sayfa içi büyük veri sabitlerini ayrı modüllere taşı
2. Hesap motorlarını pure function katmanına çıkar
3. Sonuç DTO tiplerini netleştir
4. Her modül için en az smoke test ekle
5. localStorage bağımlılıklarını küçük bir persistence helper içine al
6. ortak bileşenler üret:
   - confidence badge
   - source badge
   - model warning box
   - export panel

## UI ve Konumlandırma Güncellemesi

### Yeni kart dili önerisi

#### Hasat Tahmini
Eski:
- AI destekli hasat zamanı ve verim tahminleri

Yeni:
- Tarihsel veriye dayalı verim ve hasat karar desteği

#### Gübre Hesaplayıcı
Eski:
- NPK ve Besin Dengesi Yönetimi

Yeni:
- Ön reçete ve besin ihtiyacı planlama aracı

#### Tarımsal Takvim
Eski:
- Entegre Tarımsal Aktivite Planlayıcı

Yeni:
- Bölgesel tarımsal görev ve sezon planlayıcı

## Yayın Sırası

### 1. İlk yayına uygun aday
- Tarımsal Takvim

Şartlar:
- metin düzeltmesi
- veri modülü ayrıştırması
- hava uyarı entegrasyonu

### 2. İkinci aday
- Gübre Hesaplayıcı

Şartlar:
- optimizer
- güven skoru
- uyarı sistemi

### 3. Son aday
- Hasat Tahmini

Şartlar:
- confidence score
- model etiketi
- veri kalitesi uyarısı
- pazarlama dilinin düzeltilmesi

## 30 Günlük Yol Haritası

### Hafta 1
- Faz 0 tamamla
- Tarımsal Takvim veri modelini sayfadan çıkar
- ortak warning ve confidence componentlerini oluştur

### Hafta 2
- Tarımsal Takvim hava duyarlılığı ve export özelliklerini ekle
- Gübre Hesaplayıcı veri katmanı ayrıştırmasını tamamla

### Hafta 3
- Gübre optimizer ve güven skoru ekle
- Hasat tahmin motorunu ayrı servis katmanına çıkar

### Hafta 4
- Hasat confidence ve senaryo sistemini ekle
- üç modülde smoke test ve temel unit testleri tamamla
- metin ve konumlandırma revizyonunu yayına hazırla

## Net Sonuç

En zayıf modülleri ürünleştirmek için yapılacak şey yeni animasyon eklemek değil.

Yapılması gereken:
- iddiayı küçültmek
- veri ve model şeffaflığını artırmak
- statik heuristikleri sürümlü kurallara dönüştürmek
- güven skoru ve test eklemek

En hızlı ürünleşecek modül:
- Tarımsal Takvim

En fazla ticari değer üretecek modül:
- Gübre Hesaplayıcı

En fazla itibar riski taşıyan modül:
- Hasat Tahmini