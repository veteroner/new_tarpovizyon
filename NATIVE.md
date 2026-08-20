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

`cap:sync` betiği kopyalamadan önce bunları siliyor.

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
