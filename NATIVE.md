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
npm run dotclean     # dot_clean -m + kalanları find ile sil
```

`dot_clean` macOS'un yerleşik aracı; gölge dosyayı asıl dosyayla birleştirip
siliyor. Ardından `find` ile eşleşmeyen kalıntılar temizleniyor.

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
