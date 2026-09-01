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
