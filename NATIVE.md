# Native derleme notları

`npx cap sync` bu projede **doğrudan çalışmıyor**; iki tuzak var ve ikisi de
ortamdan kaynaklanıyor, koddan değil.

Onun yerine:

```bash
npm run build && npm run cap:sync
```

## 1. Proje ExFAT diskte — `._*` gölge dosyaları

macOS, HFS olmayan diskte (bu proje `/Volumes/LaCie`, ExFAT) genişletilmiş
öznitelikleri `._dosyaadi` şeklinde ayrı dosyalara yazıyor. Bir derlemede
`dist/` içinde **216 tane** oluşuyor.

Capacitor bunları kopyalayıp `chmod` çağırınca dosya çoktan kaybolmuş
oluyor ve kopyalama düşüyor:

```
✖ Copying web assets from dist to ios/App/App/public - failed!
[error] ENOENT: chmod '.../public/rasyon/assets/._index-*.css'
```

`cap:sync` betiği kopyalamadan önce bunları siliyor — **ama tek başına yetmiyordu.**

### Temizlik SONRADAN da gerekiyor

`cap sync`'in kendisi kopyalarken yenilerini üretiyor. 2026-08-31'de ölçüldü:
sync bittiğinde **1726** gölge dosya kalmıştı (ios 1473 · android 253). İçlerinde
`ios/App/Pods/._Pods.xcodeproj` vardı — CocoaPods'un "iki `.xcodeproj`" görmesinin
sebebi bu. Gradle tarafında ise `android/app/src/main/._AndroidManifest.xml` her
derlemede çoğalıp `._drawable` gibi girdiler üretiyor ve derleme şu hatayla düşüyor:

```
'.../packaged_res/debug/packageDebugResources/._drawable' is not a directory
```

Bu yüzden `cap:sync` artık temizliği **hem önce hem sonra** yapıyor ve iş
`dotclean` betiğine ayrıldı:

```
npm run dotclean
```

### Kapsam neden `node_modules`'ı da içeriyor

Gradle, Capacitor eklentilerini `node_modules` içindeki kendi `android/`
projelerinden derliyor. Oradaki gölge dosyalar şu hatayı veriyordu:

```
'.../node_modules/@capacitor/splash-screen/android/build/intermediates/
 packaged_res/debug/packageDebugResources/._values' is not a directory
```

Bu yüzden temizlik altı yolu kapsıyor: `dist`, `ios`, `android` ve
`node_modules` altındaki `@capacitor`, `@capacitor-community`,
`onesignal-cordova-plugin`.

### `dot_clean` neden kullanılmıyor

Denendi: `dot_clean -m` gölgeyi asıl dosyayla birleştiriyor ama **sahibi olmayan
yetim sidecar'ları bırakıyor** (138 dosya kaldı) ve 114 sn sürüyor. Düz
`find -delete` aynı işi **1 sn**'de ve eksiksiz yapıyor. Ölçüldü, o seçildi.

Tüm `node_modules` taranmıyor: orada 43.518 gölge dosya var ve taraması 69 sn
sürüyor. Yalnızca native eklenti kökleri taranıyor — Gradle ve CocoaPods
zaten sadece onları derliyor.

Sync sonrası doğrulama — üçü aynı özeti vermeli:

```
for p in dist ios/App/App/public android/app/src/main/assets/public; do
  shasum "$p/index.html"; done
```

## 2. CocoaPods yerel ayar hatası

`pod install`, `LANG` UTF-8 değilse şununla düşüyor:

```
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

`cap:sync` betiği `LANG`/`LC_ALL` değerlerini kendisi veriyor. Kalıcı çözüm
istersen `~/.zprofile` dosyasına ekle:

```bash
export LANG=en_US.UTF-8
```

## Doğru worktree

Konuşma özellikleri `.claude/worktrees/tarpo-mobil` içinde. Başka bir
worktree'de `cap sync` çalıştırmak "Could not find the web assets directory"
hatası verir — orada derleme de kod da yok.

## Bekleyen uyarı (bu işle ilgisiz)

Sync şunu yazıyor:

```
[warn] Configuration might be missing for onesignal-cordova-plugin.
       Add the following to the existing UIBackgroundModes entry of Info.plist:
       <string>remote-notification</string>
```

Push bildirimlerinin arka planda çalışması için gereken bir ayar; sesli
sohbetle ilgisi yok ve bu turda dokunulmadı.

## 3. iOS push: paket kimliği tuzağı ve App Group

**Belirti:** OneSignal panelinde gönderim `DeviceTokenNotForTopic` ile
başarısız. APNs'te *topic = paket kimliği*; bu hata tek bir şey demek —
token'ı basan uygulamanın kimliği, gönderimde kullanılan kimlikten farklı.

**Sebep (2026-08-14 → 2026-09-01 penceresi):** `capacitor.config.ts`'teki
`appId` `com.tarpovizyon.app` (Android'in kimliği) ve `cap add ios` bu değeri
Xcode projesine yazıyor. OneSignal'in eklendiği 14 Ağustos ile kimliğin
düzeltildiği 1 Eylül (`4ef185d`) arasında üretilen her iOS yapısı
`com.tarpovizyon.app` ile imzalandı. OneSignal paneli ise `com.tarpovizyon.mobile`
diyor → o pencerede oluşan iOS abonelikleri **kalıcı olarak ölü**. Panelde
düzeltilecek bir şey yok; cihazın doğru kimlikli yapıyı kurup yeni abonelik
oluşturması gerekiyor.

iOS'ta paket kimliği değişince **ayrı bir uygulama** olur: eski yapı telefonda
kendi ikonuyla durmaya, OneSignal'e yoklama göndermeye ve her gönderimde bu
hatayı üretmeye devam eder. Test cihazlarından eski `.app` yapısını silin.

`cap sync` kimliği bozmuyor; **`cap add ios` bozuyor.** Platform yeniden
eklenirse `PRODUCT_BUNDLE_IDENTIFIER` (Debug + Release, iki yer)
`com.tarpovizyon.mobile` olarak elle geri konmalı.

### App Group

`App/App.entitlements` içinde:

```
com.apple.security.application-groups → group.com.tarpovizyon.mobile.onesignal
```

OneSignal SDK'sı kullanıcı/abonelik durumunu bu paylaşılan alanda tutuyor ve
adı `group.<paket-kimliği>.onesignal` kalıbından kendisi üretiyor. Yetki yokken
her açılışta `CFPrefsPlistSource ... Couldn't read values` basıyordu. Teslimatı
engellemiyor ama onaylı teslim (Confirmed receipt) ve rozet sayacı çalışmıyor,
Notification Service Extension de eklenemiyor. **Paket kimliği değişirse bu
değer de değişmeli.**

### Teşhis: röntgen logu

`src/mobile/capacitor/push.ts` her açılışta şunu basıyor:

```
[OneSignal] RÖNTGEN {"izin":true,"optedIn":true,"abonelikId":"…","token":"… (64 hane)"}
```

Xcode konsolu Cordova köprüsünün yalnızca gidiş yönünü gösterdiği için
("To Native Cordova -> OneSignalPush getPushSubscriptionToken"), init'in
çalıştığını görmek token üretildiğini göstermez. Okunuşu:

- `token` VAR + `abonelikId` VAR → yapı sağlam.
- `abonelikId` yok ama token var → kayıt turu henüz bitmemiş olabilir;
  `ABONELİK DEĞİŞTİ` / `KULLANICI DEĞİŞTİ` satırlarını bekleyin. Hiç gelmiyorsa
  kayıt bloke.
- `token` yok, `izin` false → yeni paket kimliği iOS için yeni uygulama,
  bildirim izni sıfırdan isteniyor ve verilmemiş.

`optedIn: true` tek başına bir şey kanıtlamaz; eklentinin kendi tip dosyası
"abonelik kimliği ve token'ın varlığını hesaba katmaz" diye yazıyor.

## 4. Bu klonda `build` değil `build:netlify`

`tarpol rasyon mobil/` kaynak klasörü bu klonda yok; `public/rasyon` ise git'te
kayıtlı ve Vite onu `dist/`e kopyalıyor. `build:rasyon:embed` artık klasör
yoksa sessizce atlıyor, yani `npm run cap:build` çalışıyor. Doğrudan
`npm run build:netlify` de aynı çıktıyı verir.
