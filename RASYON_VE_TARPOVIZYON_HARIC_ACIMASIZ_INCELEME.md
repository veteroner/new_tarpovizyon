# Rasyon ve Tarpovizyon Hariç — Acımasız İnceleme Raporu

Tarih: 2026-02-26  
Kapsam: Uygulamada **Tarpovizyon (`/tarpovizyon/*`)** ve **Rasyon (`/rasyon/*`)** rotaları hariç kalan “Çiftçi Araçları” modülleri:
- Hasat Tahmini (`/hasat-tahmini`)
- Sulama Planlayıcı (`/sulama-plan`)
- Gübre Hesaplayıcı (`/gubre-hesap`)
- Tarımsal Takvim (`/tarim-takvim`)

> Not: Bu rapor **kodu ve mevcut davranışı** inceler; tarımsal doğruluğu “saha doğrulaması / agronomist onayı” ile garanti etmez.

---

## 1) “Toy / MVP / Entertainment” Tanımı (Bu raporun sözlüğü)

- **Toy:** Demo seviyesinde. Yanlış yönlendirme riski yüksek. Basit senaryoda çalışır; edge-case ve doğruluk güvencesi yok. “Karar destek” diye kullanılamaz.
- **Entertainment:** UX cilalı, sunumluk. Kullanıcıyı “tatmin eder” ama çıktılar çoğunlukla **heuristic** (yaklaşım) veya **varsayım**. Güvenlik/denetlenebilirlik zayıf.
- **MVP:** Gerçek kullanıcıya *bir problemde* net fayda sağlar. Fakat üretim standardı değildir; bazı riskler/eksikler bilerek ertelenmiştir.

Bu sınıflama, kodun **güvenlik**, **veri doğruluğu**, **iş mantığı doğrulanabilirliği**, **bakım maliyeti** ve **kullanıcı zarar riski** bileşenleriyle verildi.

---

## 2) Genel Sonuç (Kısa ve acı)

Bu 4 modülün UX’i “güçlü demo / hızlı prototip” seviyesinden **MVP formuna** yaklaşmış; ancak iki ana konu yüzünden “üretime hazır” değil:

1) **Veri güvenliği & mimari:** İstemciden **API key** ile uzaktaki `api.php`’ye **ham SQL** gönderiliyor (query param). Bu, pratikte **anahtarı ifşa eden**, suistimale açık ve ölçeklenemez bir model.
2) **Karar destek sorumluluğu:** Sulama/gübre/hasat çıktıları “tavsiye” gibi görünüyor ama model varsayımları çok basit; **dikkat/uyarı/limitler** yeterince sert değil. Yanlış kullanım riski var.

**Toplu sınıflama:** “MVP görünümlü Entertainment”
- UI/akış/algı: MVP
- Güvenlik/doğruluk/denetim: Entertainment/Toy tarafına çekiyor

---

## 3) Skor Kartı (1 kötü — 5 iyi)

| Modül | Sınıf | Fayda | UX | Doğruluk/Model | Güvenlik | Bakım | Not |
|---|---|---:|---:|---:|---:|---:|---|
| Hasat Tahmini | MVP | 4 | 4 | 3 | 1 | 3 | Gerçek (TUİK) veriye dayanıyor ama SQL+key istemcide.
| Sulama Planlayıcı | MVP | 4 | 4 | 2–3 | 3 | 3 | İklim verisi katmanı iyi; varsayımlar sert/tekil.
| Gübre Hesaplayıcı | Toy (yüksek risk) | 3 | 4 | 2 | 3 | 3 | Hatalı/eksik model → “tavsiye” hissi tehlikeli.
| Tarımsal Takvim | Entertainment | 3 | 4 | 2 | 4 | 3 | Heuristik ajanda; kişiselleştirme sınırlı.

---

## 4) Çapraz (Modüller üstü) Kritik Bulgular

### 4.1 Kritik: İstemciden ham SQL çalıştırma
- İstemcide `api_key` bulunuyor ve SQL cümlesi query param ile taşınıyor.
- Sonuç: anahtar kopyalanır, SQL endpoint abuse edilir, veri sızdırma/DoS ihtimali artar.
- Bu, ürün olgunluğunu otomatik olarak düşürür: “MVP” gibi görünse bile **operasyonel olarak toy**.

**MVP için minimum düzeltme (mimari):**
- İstemci → kendi backend’in (Netlify function / server / edge) → DB/API.
- İstemciden SQL değil: `GET /yield?il=...&ilce=...&urun=...` gibi dar, whitelist edilmiş endpointler.
- API key yalnızca server-side.

### 4.2 İddia/etiket doğruluğu
- Sulama ekranında “Gerçek MGM verileriyle hesaplanmıştır.” ifadesi var.
- Kod tarafında veri, statik `climate-data` tablosu. Bu ifade, gerçekte MGM’den canlı çekmiyorsanız **yanıltıcı** algı yaratır.

### 4.3 Tasarım sistemi uyumu
- Bazı yerlerde renkler **hard-coded hex** (`#22c55e`, `#ef4444` vb.) ile veriliyor.
- Tasarım sistemi/Tailwind token’larıyla uyumu azaltır; tema değişiminde kırılır.

### 4.4 Kod tabanı ikizliği / drift riski
- Aynı sayfaların bir kopyası `netlify-dashboard/` altında da var.
- Bu, değişikliklerin bir yerde kalmasına ve deploy/build farklı davranmasına yol açabilir.

---

## 5) Modül Bazlı İnceleme

### 5.1 Hasat Tahmini — **MVP** (ama güvenlik borcu ağır)

**Neyi iyi yapıyor:**
- İl/ilçe/ürün seçimi + verim zaman serisi + trend/regresyon + belirsizlik bandı: “karar destek hissi” veriyor.
- GPS ile il/ilçe ön-doldurma: saha için pratik.
- Harita + sıralama: kullanıcıya “nerede iyiyim?” cevabı.
- History (localStorage) ile tekrar kullanım.

**Kırmızı bayraklar / riskler:**
- **SQL injection yüzeyi** azaltılmış (sqlEscape) ama bu, istemciden SQL taşıma problemini çözmez.
- Nominatim reverse geocode doğrudan tarayıcıdan çağrılıyor. Rate limit / kullanım politikaları / network hataları durumunda UX kırılgan.
- Risk etiketleri (CV tabanlı) basit ve “trafik ışığı” etkisi yaratıyor. Kullanıcı çıktıyı mutlak doğru sanabilir.
- Bazı stiller/renkler hard-coded.

**MVP’yi “ürüne” yaklaştıran minimum ekler:**
- Server-side veri servisi + rate limit + caching.
- “Bu bir tahmindir” uyarıları + model varsayımları (veri yılı aralığı, regresyon şartları, sulama/toprak çarpanları).
- Paylaşılabilir rapor (PDF/print) veya en azından “kopyala” özet.

**Sınıf kararı:** MVP (gerçek veriye dayalı fayda var) ama “prod-ready” değil.

---

### 5.2 Sulama Planlayıcı — **MVP** (model basit; birkaç davranış şüpheli)

**Neyi iyi yapıyor:**
- Aylık su dengesi (ETo, yağış, efektif yağış) + grafik + tablo: çok anlaşılır.
- Bölge tespiti ve iklim özetleri kullanıcıya güven veriyor.
- Adım adım wizard akışı temiz.

**Model/varsayım borcu:**
- `"Sulama Yok"` seçeneği varken hesaplama yine “brüt sulama” üretmeye devam ediyor (verimlilik fallback’ı var). Bu, kullanıcı açısından “sistem yok ama sulama planı var” çelişkisi.
- Elektrik maliyeti, sistem amortismanı, su tutma faktörü gibi parametreler tek sabit.
- Kc dönem seçimi var ama aylık denge, dönemleri aylara “eşit dağıtarak” bağlıyor → agronomik olarak kaba.

**MVP’yi güçlendiren minimum ekler:**
- “Sulama yok” modunda sonuçları farklı sun: “Bu kadar su açığı oluşur / verim riski” gibi.
- Parametreleri (elektrik ₺/m³, verimlilik, sezon ayları) ayarlanabilir yap.
- “Efektif yağış” hesabının metodu ve kaynak dokümantasyonu.

**Sınıf kararı:** MVP (hesap motoru + UX iyi) ama “karar destek” için uyarı şart.

---

### 5.3 Gübre Hesaplayıcı — **Toy** (riskli; yanlış öneri verebilir)

**Neyi iyi yapıyor:**
- NPK + mikro besin ihtiyaçları, pH uyarısı ve uygulama takvimi iyi bir “çerçeve”.
- Organik/kimyasal kıyas fikri değerli.
- Bölge toprak profili ile ön-doldurma yaklaşımı doğru yönde.

**Kritik sorunlar:**
- Ürün öneri algoritması (mix) “seç-en-ucuzu” heuristiği. Toprak analizi gerçek dünyada çok daha karmaşık.
- Mix içinde besinlerin kalanını güncelleme mantığı eksik/yarım: bazı adımlarda N/P/K düşümleri tutarlı izlenmiyor.
- Gübre fiyatları statik ve tarih/yer bağımsız. Kullanıcı bunu “güncel piyasa” sanabilir.

**MVP’ye geçmek için gerekenler (minimum):**
- Çıktıyı “tavsiye” değil “taslak plan” olarak etiketle ve agresif uyarılar ekle.
- Ürün önerisini “tek bir mix” yerine 2–3 senaryo (ucuz / dengeli / organik) olarak ver.
- Mix motorunu testlerle sabitle (NPK kalanları, DAP gibi çift etkili gübreler).

**Sınıf kararı:** Toy (özellikle yanlış kullanım riski yüzünden).

---

### 5.4 Tarımsal Takvim — **Entertainment** (ajanda gibi; kişiselleştirme sınırlı)

**Neyi iyi yapıyor:**
- Bölge offset’i ile “aynı ürün her yerde aynı tarihte olmaz” gerçekliğini yakalıyor.
- Bu hafta / gecikmiş görevler UX olarak iyi.
- Çok hızlı ve offline çalışır (yerel veri).

**Eksikler:**
- Takvim, “ürün profili” sabitlerine dayanıyor; ilçe, rakım, ekim tarihi, çeşit, toprak gibi parametrelerle kişiselleşmiyor.
- Sulama görevleri “ay başına 1–2 kayıt” gibi kaba bir şablon.
- Çıktılar eyleme dönük ama “doz/tarih” doğrulaması yok.

**MVP’ye çıkarmak için minimum:**
- Ekim tarihi (kullanıcı girsin) → tüm takvimi relative kaydır.
- Sulama görevini “iklim + ETo + yağış” ile bağla (Sulama modülüyle entegre).
- Çıktıyı PDF/ICS (takvim dosyası) export.

**Sınıf kararı:** Entertainment (yararlı ajanda; karar destek değil).

---

## 6) Somut Hata/Eksik Listesi (Öncelikli)

### P0 — Ürünü “oyuncaktan” çıkaran engeller
1) **API key ve SQL istemcide** → güvenlik/abuse riski (Hasat modülü özellikle)
2) **Yanıltıcı veri ifadesi** (“Gerçek MGM verileri”) → güven sorunu

### P1 — Yanlış yönlendirme / hesap tutarsızlığı riski
3) Sulama modülünde “Sulama yok” seçeneğiyle sonuç üretimi (anlam çakışması)
4) Gübre mix motorunda besin kalanlarının tutarsız takip edilmesi → öneri hatası ihtimali
5) Gübre fiyatlarının “güncel” sanılması riski (tarih/konum yok)

### P2 — Ürünleşme/kalite
6) Nominatim reverse geocode: rate-limit/network kırılganlığı, cache yok
7) Hard-coded renkler: tema/dizayn borcu
8) `netlify-dashboard/` altında sayfa kopyaları: drift / bakım maliyeti

---

## 7) Net “Bir sonraki sprint” önerisi (minimum, yüksek etki)

1) Hasat modülü için server-side proxy + whitelist endpointler
2) Sulama/Gübre modüllerinde “uyarılar + varsayımlar” paneli (tek bir ortak bileşen)
3) Gübre mix motoruna 10–15 test senaryosu (NPK kalanları, DAP etkisi, organik eşik)
4) `netlify-dashboard/` ile ana `src/` arasındaki ayrımı netleştir (ya kaldır ya da monorepo kuralı)

---

## 8) Kapanış

Bu dört modül, “kullanıcıyı ekranda tutan” bir UX’e ulaştı. Şu anki sınırlayıcı faktör UI değil; **mimari güvenlik** ve **model doğruluğu / sorumluluk metni**. Bunlar çözülmeden ürün, demo dışında kullanıma açıldığında risk üretir.
