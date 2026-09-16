# Abonelik kurulumu — iyzico

Ödeme kodu yazıldı ve duruyor; eksik olan **yapılandırma**. Bu dosya o adımları
ve her birinin neden o sırada olduğunu anlatıyor.

## Model: kart önce, tahsilat deneme sonunda

Kullanıcı e-posta koduyla giriyor, abonelik sayfasında planı seçiyor ve
**kart bilgisini deneme başlarken** iyzico'nun formuna giriyor. iyzico kartı
1 TL çekip iade ederek doğruluyor, deneme boyunca tahsilat yapmıyor, süre
bitince ilk ödemeyi alıyor. iyzico dokümanı, abonelik başlatma bölümü:

> Durum PENDING ise ya da ACTIVE olup ödeme planında bir deneme süresi
> tanımlıysa, iyzico abonelik isteğinde yalnızca kartı doğrular. Kart
> doğrulaması 1 TL çekilip iade edilerek yapılır. Bunun dışında hiçbir işlem
> veya ödeme gerçekleşmez.

Bu yüzden deneme süresi **uygulamada değil, iyzico ödeme planında** tanımlı.
Uygulama ilk girişte artık deneme AÇMIYOR (eskiden kartsız 7 gün açıyordu);
ikisi bir arada olsaydı kullanıcı 7 + 7 gün bedava alırdı.

## Sıra

Bu sıra tersine çevrilemez.

### 1. `RESEND_KEY`

```bash
cd workers/tarpovizyon-api && npx wrangler secret put RESEND_KEY
```

Bu olmadan `/auth/kod-iste` **503** dönüyor ve kod üretilmiyor. Kimse giriş
yapamaz, dolayısıyla kimse abone olamaz. Gerçek bir adrese kod isteyip girişin
çalıştığını **doğrulamadan** sonraki adımlara geçme.

### 2. iyzico kimlik bilgileri

```bash
npx wrangler secret put IYZICO_API_KEY
npx wrangler secret put IYZICO_SECRET_KEY
npx wrangler secret put IYZICO_MERCHANT_ID     # webhook imzası için ŞART
```

`IYZICO_TABAN` **tanımlanmazsa sandbox** kullanılıyor (`iyzico.js`). Bu bilerek
böyle: yanlış yapılandırılmış bir ortamda varsayılanın canlı olması, gerçek
kart çekmek demek olurdu. Canlıya geçerken açıkça:

```bash
npx wrangler secret put IYZICO_TABAN    # https://api.iyzipay.com
```

### 3. Ürün ve denemeli ödeme planları

iyzico panelinden ya da API'den bir abonelik ürünü, sonra iki ödeme planı
oluştur. **`trialPeriodDays` planın üstünde tanımlanıyor** — çağrı başına
değil. Deneme buradan geliyor:

| plan | aralık | tutar | trialPeriodDays |
|---|---|---|---|
| aylık | MONTHLY | `fiyat_aylik` | 7 |
| yıllık | YEARLY | `fiyat_yillik` | 7 |

Tutarlar paneldeki (`admin/ayar`) fiyatlarla aynı olmalı: paneldeki fiyat
yalnızca **gösterim**, tahsil edilen tutar plandaki.

### 4. Plan referans kodlarını `ayar` tablosuna yaz

Bunların uygulama içinden yazılacağı bir ekran **yok ve olmamalı**: plan
referans kodları iyzico hesabına ait iç bilgi, `admin/ayar` beyaz listesinde
değiller ve dışarı da verilmiyorlar (`yonetim.js` yalnız türetilmiş
`odeme_hazir` bayrağını döndürüyor). Elle:

```bash
npx wrangler d1 execute tarpovizyon-basic --remote --command \
  "INSERT INTO ayar (anahtar, deger) VALUES
     ('iyzico_plan_aylik','<AYLIK_PLAN_REFERANS_KODU>'),
     ('iyzico_plan_yillik','<YILLIK_PLAN_REFERANS_KODU>')
   ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger"
```

Bu satırlar girildiği an `odeme_hazir` kendiliğinden `1` oluyor ve abonelik
sayfasındaki form açılıyor.

### 5. Webhook

iyzico panelinde bildirim adresi:

```
https://tarpovizyon-api.veteroner.workers.dev/api/odeme/webhook
```

İmza doğrulanmadan hiçbir şey yapılmıyor ve yanıt her durumda 200 (2xx
almayan iyzico saatlerce tekrar dener). `IYZICO_MERCHANT_ID` eksikse imza
doğrulaması **her zaman başarısız** olur, yani yenilemeler işlenmez.

### 6. Para duvarı — en son

```bash
npx wrangler secret put PARA_DUVARI       # 1
```

sonra istemcide `src/auth/kapiAyari.ts` → `PARA_DUVARI_AKTIF = true` ve yeni
derleme. **Sunucu önce**: tersi sırada, istemci derlemesi yayınlanana kadar
sayfalar boş kalır.

## Deneme süresi: tek doğruluk kaynağı

Üç yerde bir "deneme günü" görünüyor, ama yalnız biri gerçek:

| yer | ne işe yarar |
|---|---|
| iyzico planı `trialPeriodDays` | **GERÇEK süre** — tahsilatı iyzico buna göre erteliyor |
| `ayar.deneme_gun` (panel) | yalnız vitrinde gösterim |
| `ayar.iyzico_deneme_gun` | ilk denemeli ödemede iyzico'dan GÖRÜLEN değer |

Arayüz `iyzico_deneme_gun` doluysa onu tercih ediyor, yani ilk gerçek
abonelikten sonra ekrandaki sayı ölçülmüş gerçeğe dönüyor. `deneme_gun`'u
panelden değiştirmek tahsilat tarihini **değiştirmez**; planı da güncellemek
gerekir.

## Mağaza kısıtı

App Store 3.1.1 nedeniyle uygulamada fiyat, satın alma düğmesi ve dışa
yönlendirme yok; abonelik webde alınıyor. `/tarpovizyon/abonelik` Capacitor'da
`/m/settings`'e yönleniyor ve `YukseltmeEkrani`'ndeki CTA uygulamada gizli.
Duvarı açarken bu ikisi bozulmamalı.
