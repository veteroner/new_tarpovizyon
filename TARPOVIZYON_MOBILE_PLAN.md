# TarpoVizyon Mobil Uygulama - Detaylı Geliştirme Planı

## 1. KARAR: Neden Sıfırdan Yazıyoruz?

Eski mobil uygulama (`tarpovizyon-capacitor/`) analiz edildi:
- Looker Studio iframe wrapper'larından ibaretti
- 1777 satır kaotik CSS, global fonksiyonlar, modül sistemi yok
- OneSignal hiç çalışmıyordu (placeholder ID'ler)
- 6 saniyelik çift splash screen (3s native + 3s web)
- **Karar: TAMAMEN YENİDEN YAZ**

### Eski Uygulamadan Alınacaklar
| Kaynak | Dosya Yolu | Durum |
|--------|-----------|-------|
| App Icon (PNG, tüm boyutlar) | `tarpovizyon-capacitor/assets/icon.png` | ✅ Kullanılacak |
| Splash Image | `tarpovizyon-capacitor/assets/splash.png` | ✅ Kullanılacak |
| Feature Graphic | `tarpovizyon-capacitor/assets/feature-graphic-1024x500.png` | ✅ Kullanılacak |
| Android Mipmap Set | `android/app/src/main/res/mipmap-*/` | ✅ Kopyalanacak |
| iOS AppIcon Set | `ios/App/Assets.xcassets/AppIcon.appiconset/` | ✅ Kopyalanacak |
| iOS Splash Set | `ios/App/Assets.xcassets/Splash.imageset/` | ✅ Kopyalanacak |
| OneSignal App ID | `f5ef3915-e366-425f-a467-029f350cb296` | ✅ Kullanılacak |
| App ID | `com.tarpovizyon.app` | ✅ Kullanılacak |

---

## 2. TEKNOLOJİ STACK

| Bileşen | Seçim | Neden |
|---------|-------|-------|
| **Framework** | React 19 + TypeScript + Vite | Dashboard ile aynı stack, kod paylaşımı |
| **Mobile Runtime** | Capacitor 7.x | Web → Native bridge, mevcut deneyim |
| **Navigation** | React Router + Bottom Tab Bar | ✅ Aşağıda detaylandırıldi |
| **UI** | Tailwind CSS + Custom Components | Dashboard ile tutarlılık |
| **State** | Zustand + React Query | Dashboard ile aynı |
| **Push** | OneSignal Capacitor SDK | Eski uygulamadan ID mevcut |
| **Charts** | Lightweight (recharts veya SVG) | Mobil performans |
| **Splash** | @capacitor/splash-screen | Sadece native, web splash YOK |
| **Status Bar** | @capacitor/status-bar | Renk ve stil kontrolü |
| **Network** | @capacitor/network | Offline detection |
| **App** | @capacitor/app | Back button, deep link |
| **Browser** | @capacitor/browser | Harici link açma |
| **Haptics** | @capacitor/haptics | Dokunsal geri bildirim |

---

## 3. KARAR: Bottom Tab Bar (Drawer Menu Değil)

### Neden Tab Bar?
1. **Tek elle kullanım** - Tarım sektöründe kullanıcılar sahada, tek elle telefon tutar
2. **Hızlı erişim** - Ana bölümler her zaman görünür, 1 dokunuş ile geçiş
3. **Keşfedilebilirlik** - Drawer gizli menü = kullanıcı keşfedemez
4. **Sektör standardı** - Bloomberg, TradingView, yatırım uygulamalarının hepsi tab bar kullanır
5. **Minimal bilişsel yük** - Çiftçiler ve tarım uzmanları için sade UI

### Tab Yapısı (5 Tab)
```
┌─────────┬───────────┬───────────┬──────────┬──────────┐
│  🏠 Ana  │ 🌾 Üretim │ 📊 Piyasa │ 🤖 AI    │ ⚙️ Ayar  │
│  Sayfa   │  Verileri │  & Ticaret │ Asistan  │  lar     │
└─────────┴───────────┴───────────┴──────────┴──────────┘
```

| Tab | İçerik | Açıklama |
|-----|--------|----------|
| **Ana Sayfa** | Dashboard özet | Günlük özet, hava durumu, son bildirimler, hızlı erişim kartları |
| **Üretim** | Bitkisel + Hayvansal | Kategori listesi → alt sayfa navigasyonu (Dünya/Türkiye toggle) |
| **Piyasa** | Ticaret + Fiyat | Dış ticaret, fiyat endeksleri, makro ekonomi |
| **AI Asistan** | TarpoVizyon AI | Chatbot WebView (tarpovizyonai.netlify.app) |
| **Ayarlar** | Bildirim + Profil | OneSignal tercihleri, tema, hakkında, versiyon |

---

## 4. PRoje YAPISI

```
tarpovizyon-mobile/
├── capacitor.config.ts              # Capacitor ayarları
├── package.json                     # Bağımlılıklar
├── tsconfig.json                    # TypeScript
├── vite.config.ts                   # Vite build
├── tailwind.config.js               # Tailwind
├── postcss.config.js                # PostCSS
├── index.html                       # Entry HTML
│
├── public/
│   └── assets/                      # Static dosyalar
│       ├── icon.png                 # Eski uygulamadan
│       ├── splash.png               # Eski uygulamadan
│       └── splash-logo.png          # Logo for splash
│
├── src/
│   ├── main.tsx                     # React entry
│   ├── App.tsx                      # Root + Router
│   ├── vite-env.d.ts                # Vite types
│   │
│   ├── capacitor/                   # Native bridge katmanı
│   │   ├── splash.ts               # Splash screen yönetimi
│   │   ├── push.ts                  # OneSignal servis
│   │   ├── statusbar.ts            # Status bar kontrolü
│   │   ├── network.ts              # Bağlantı durumu
│   │   └── app.ts                  # App lifecycle
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TabBar.tsx           # Alt tab navigasyonu
│   │   │   ├── PageHeader.tsx       # Sayfa başlığı
│   │   │   ├── SafeArea.tsx         # Notch/island koruması
│   │   │   └── PullToRefresh.tsx    # Çekip yenileme
│   │   ├── cards/
│   │   │   ├── QuickAccessCard.tsx  # Ana sayfa hızlı erişim
│   │   │   ├── DataCard.tsx         # Veri kartı
│   │   │   └── NotificationCard.tsx # Bildirim kartı
│   │   ├── charts/
│   │   │   ├── MiniChart.tsx        # Küçük spark chart
│   │   │   └── FullChart.tsx        # Tam ekran grafik
│   │   └── ui/
│   │       ├── Loading.tsx          # Yükleniyor
│   │       ├── EmptyState.tsx       # Boş durum
│   │       ├── ErrorState.tsx       # Hata durumu
│   │       └── CategoryList.tsx     # Kategori listesi
│   │
│   ├── pages/
│   │   ├── tabs/
│   │   │   ├── HomePage.tsx         # 🏠 Ana Sayfa tab
│   │   │   ├── ProductionPage.tsx   # 🌾 Üretim tab
│   │   │   ├── MarketPage.tsx       # 📊 Piyasa tab
│   │   │   ├── AIAssistantPage.tsx  # 🤖 AI tab
│   │   │   └── SettingsPage.tsx     # ⚙️ Ayarlar tab
│   │   │
│   │   ├── production/              # Üretim alt sayfaları
│   │   │   ├── WorldPlantPage.tsx
│   │   │   ├── WorldLivestockPage.tsx
│   │   │   ├── TurkeyPlantPage.tsx
│   │   │   ├── TurkeyLivestockPage.tsx
│   │   │   ├── ProvincialsPage.tsx  # İl bazlı
│   │   │   └── CategoryDetailPage.tsx
│   │   │
│   │   ├── market/                  # Piyasa alt sayfaları
│   │   │   ├── TradePage.tsx
│   │   │   ├── PriceIndexPage.tsx
│   │   │   └── MacroPage.tsx
│   │   │
│   │   └── tools/                   # Araãlar (Ana sayfadan erişim)
│   │       ├── RasyonPage.tsx       # WebView → /rasyon
│   │       ├── HasatPage.tsx        # WebView → /hasat-tahmini
│   │       ├── SulamaPage.tsx       # WebView → /sulama-plan
│   │       └── GubrePage.tsx        # WebView → /gubre-hesap
│   │
│   ├── services/
│   │   ├── api.ts                   # API client (axios + base URL)
│   │   ├── queries/                 # React Query hooks
│   │   │   ├── useProduction.ts
│   │   │   ├── useTrade.ts
│   │   │   └── useOverview.ts
│   │   └── types.ts                 # API tipleri
│   │
│   ├── hooks/
│   │   ├── useCapacitor.ts          # Platform algılama
│   │   ├── useNetwork.ts            # Online/offline
│   │   └── usePushNotification.ts   # Bildirim hook
│   │
│   ├── stores/
│   │   ├── appStore.ts              # Genel uygulama state
│   │   └── settingsStore.ts         # Kullanıcı tercihleri
│   │
│   ├── utils/
│   │   ├── formatters.ts            # Sayı, tarih format
│   │   ├── constants.ts             # Sabit değerler
│   │   └── platform.ts              # iOS/Android helper
│   │
│   └── styles/
│       ├── globals.css              # Global stiller
│       └── animations.css           # Geçiş animasyonları
│
├── android/                         # (Capacitor tarafından oluşturulacak)
└── ios/                             # (Capacitor tarafından oluşturulacak)
```

---

## 5. SPLASH SCREEN STRATEJİSİ

### Eski Sorun
- 3 saniye native splash + 3 saniye web splash = **6 saniye bekleme**
- Kullanıcı aldatması: Web splash gereksiz

### Yeni Yaklaşım: Sadece Native Splash
```
Uygulama açılır → Native Splash (max 1.5s) → React App hazır → Splash kapanır
```

```typescript
// src/capacitor/splash.ts
import { SplashScreen } from '@capacitor/splash-screen';

export async function initSplash() {
  // React mount olduktan sonra splash'ı kapat
  // autoHide: false olacak, biz kontrol edeceğiz
  await SplashScreen.hide({
    fadeOutDuration: 300 // Yumuşak geçiş
  });
}
```

**Capacitor Config:**
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 0,      // Auto-show devre dışı, biz kontrol edeceğiz
    launchAutoHide: false,       // Manuel hide
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,
    splashFullScreen: true,
    splashImmersive: true,
    backgroundColor: '#0A1628'   // Koyu arka plan (TarpoVizyon teması)
  }
}
```

---

## 6. ONESIGNAL ENTEGRASYONU

### Eski Sorun
- OneSignal SDK yüklüydü ama `YOUR_ONESIGNAL_APP_ID` placeholder'ı vardı
- `initializeOneSignal()` fonksiyonu asla çağrılmıyordu
- Hiçbir push notification gelmedi

### Yeni Yaklaşım: Tam Entegrasyon

**OneSignal App ID:** `f5ef3915-e366-425f-a467-029f350cb296`

```bash
# Kurulum
npm install onesignal-cordova-plugin
npx cap sync
```

```typescript
// src/capacitor/push.ts
import OneSignal from 'onesignal-cordova-plugin';

const ONESIGNAL_APP_ID = 'f5ef3915-e366-425f-a467-029f350cb296';

export function initOneSignal() {
  OneSignal.initialize(ONESIGNAL_APP_ID);

  // İzin iste (iOS)
  OneSignal.Notifications.requestPermission(true);

  // Bildirim geldiğinde
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    console.log('Bildirim geldi:', event.notification);
    // Notification banner göster
    event.preventDefault(); // Varsayılan davranışı engelle
    // Custom toast/banner göster
    event.getNotification().display(); // Sonra göster
  });

  // Bildirime tıklanınca
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('Bildirime tıklandı:', event.notification);
    const data = event.notification.additionalData;
    // Deep link yönlendirmesi
    if (data?.route) {
      window.location.hash = data.route;
    }
  });
}

export function setUserTag(key: string, value: string) {
  OneSignal.User.addTag(key, value);
}

export function setExternalUserId(userId: string) {
  OneSignal.login(userId);
}
```

### Bildirim Kategorileri (Tags)
```typescript
// Kullanıcı ayarlarından yönetilecek
const NOTIFICATION_TAGS = {
  market_alerts: true,      // Piyasa uyarıları
  price_changes: true,      // Fiyat değişimleri
  weather_alerts: true,     // Hava durumu
  production_updates: false, // Üretim güncellemeleri
  weekly_digest: true,      // Haftalık özet
};
```

### Android Ek Kurulum
```xml
<!-- AndroidManifest.xml'e eklenecek -->
<meta-data
  android:name="com.onesignal.NotificationOpened.DEFAULT"
  android:value="DISABLE" />
```

### iOS Ek Kurulum
- Apple Developer Console'da Push Notification capability
- `.p8` authentication key veya `.p12` certificate
- OneSignal dashboard'da iOS platform config

---

## 7. SAYFA DETAYLARI

### 7.1 Ana Sayfa (HomePage)
```
┌──────────────────────────────┐
│ 🌿 TarpoVizyon       ⚡ 🔔  │  Status bar
├──────────────────────────────┤
│                              │
│  ☀️ İstanbul 28°C  Açık     │  Hava durumu widget
│  💧 Nem: %45  🌬 Rüzgar: 12 │
│                              │
├──────────────────────────────┤
│  📊 GÜNLÜK ÖZET              │
│  ┌────────┐ ┌────────┐      │  KPI kartları
│  │Buğday  │ │Pamuk   │      │  (son fiyatlar)
│  │₺9,850  │ │₺42,300 │      │
│  │ ▲ 2.3% │ │ ▼ 1.1% │      │
│  └────────┘ └────────┘      │
│                              │
├──────────────────────────────┤
│  🚀 HIZLI ERİŞİM            │
│  ┌──────┐┌──────┐┌──────┐   │  Grid kartlar
│  │Rasyon││Hasat ││Sulama│   │
│  │Hesap ││Tahmin││Plan  │   │
│  └──────┘└──────┘└──────┘   │
│  ┌──────┐┌──────┐┌──────┐   │
│  │Gübre ││Takvim││TARPOL│   │
│  │Hesap ││      ││Web   │   │
│  └──────┘└──────┘└──────┘   │
│                              │
├──────────────────────────────┤
│  📢 SON BİLDİRİMLER          │
│  • Buğday fiyatı %2.3 arttı │
│  • Yeni hasat raporu yayında │
│  • Hava uyarısı: Don riski   │
│                              │
├──────────────────────────────┤
│ 🏠  🌾  📊  🤖  ⚙️          │  Tab bar
└──────────────────────────────┘
```

### 7.2 Üretim Sayfası (ProductionPage)
```
┌──────────────────────────────┐
│  ← Üretim Verileri          │
├──────────────────────────────┤
│  [🌍 Dünya]  [🇹🇷 Türkiye]   │  Toggle
├──────────────────────────────┤
│                              │
│  🌾 BİTKİSEL ÜRETİM         │
│  ├── Tahıllar           →   │
│  ├── Sebzeler           →   │
│  ├── Meyveler           →   │
│  ├── Bakliyat           →   │
│  ├── Yağlı Tohumlar     →   │
│  ├── Şeker Bitkileri    →   │
│  ├── Sert Kabuklu       →   │
│  ├── İçecek Bitkileri   →   │
│  └── Lif Bitkileri      →   │
│                              │
│  🐄 HAYVANSAL ÜRETİM         │
│  ├── Kırmızı Et         →   │
│  ├── Beyaz Et           →   │
│  ├── Süt                →   │
│  ├── Yumurta            →   │
│  ├── Arıcılık           →   │
│  └── Diğer              →   │
│                              │
│  📍 İL BAZLI VERİLER         │
│  ├── Hayvansal (İl)     →   │
│  ├── Bitkisel (İl)      →   │
│  ├── Havza Üretimi      →   │
│  └── Coğrafi İşaretler  →   │
│                              │
├──────────────────────────────┤
│ 🏠  🌾  📊  🤖  ⚙️          │
└──────────────────────────────┘
```

### 7.3 AI Asistan
- WebView ile `https://tarpovizyonai.netlify.app/tarpovizyon.html` yüklenecek
- Pull-to-refresh desteği
- Network offline durumunda fallback mesaj

### 7.4 Ayarlar Sayfası
```
┌──────────────────────────────┐
│  Ayarlar                     │
├──────────────────────────────┤
│                              │
│  🔔 BİLDİRİM TERCİHLERİ     │
│  ├── Piyasa Uyarıları   [✓] │
│  ├── Fiyat Değişimleri   [✓] │
│  ├── Hava Durumu         [✓] │
│  ├── Üretim Güncellemesi [○] │
│  └── Haftalık Özet       [✓] │
│                              │
│  🎨 GÖRÜNÜM                  │
│  ├── Tema         [Koyu ▾]  │
│  └── Dil          [TR   ▾]  │
│                              │
│  📱 UYGULAMA                  │
│  ├── Versiyon         2.0.0 │
│  ├── Build              1   │
│  ├── Önbellek Temizle    →  │
│  └── Hakkında            →  │
│                              │
│  🔗 BAĞLANTILAR               │
│  ├── TARPOL Web Sitesi    → │
│  ├── Destek               → │
│  └── Gizlilik Politikası  → │
│                              │
├──────────────────────────────┤
│ 🏠  🌾  📊  🤖  ⚙️          │
└──────────────────────────────┘
```

---

## 8. NATIVE PLATFORM AYARLARI

### Android
```
appId: com.tarpovizyon.app
appName: TarpoVizyon
versionCode: 7          # Eski: 6 (artırıyoruz)
versionName: 2.0.0      # Eski: 1.0.4 (major versiyon)
compileSdk: 35
targetSdk: 35
minSdk: 23
```

### iOS
```
bundleId: com.tarpovizyon.app
appName: TarpoVizyon
version: 2.0.0           # Eski: 1.0.3
build: 1
iosDeploymentTarget: 14.0
```

### Server Allow Navigation
```typescript
server: {
  allowNavigation: [
    'lookerstudio.google.com',
    'tarpovizyonai.netlify.app',
    'www.tarpol.org.tr',
    'dersbende.com'
  ]
}
```

---

## 9. PERFORMANS STRATEJİSİ

### Hedefler
- **İlk yükleme**: < 2 saniye (splash dahil)
- **Sayfa geçişi**: < 300ms
- **Bundle boyutu**: < 500KB (gzipped)

### Taktikler
1. **Lazy Loading** - Her tab ve alt sayfa dinamik import
2. **React Query Cache** - Veri 5 dakika cache'lenir
3. **Image Optimization** - WebP format, lazy load
4. **Code Splitting** - Route bazlı chunk'lar
5. **Virtualized Lists** - Uzun listelerde react-window

---

## 10. GELİŞTİRME PLANI

### Faz 1: Temel Altyapı (Bugün)
- [x] Proje oluştur (Vite + React + TS + Tailwind)
- [x] Capacitor entegrasyonu
- [x] capacitor.config.ts ayarları
- [x] Splash screen kurulumu
- [x] Tab bar navigasyonu
- [x] Temel sayfa iskeletleri (5 tab)

### Faz 2: Ana Sayfa + OneSignal
- [ ] Ana sayfa layout ve kartlar
- [ ] Hava durumu widget
- [ ] OneSignal kurulum ve test
- [ ] Bildirim tercihleri UI

### Faz 3: Üretim & Piyasa Sayfaları
- [ ] Üretim kategori listesi
- [ ] Dünya/Türkiye toggle
- [ ] API entegrasyonu (dashboard API'sinden)
- [ ] Piyasa/ticaret sayfaları
- [ ] Basit chart'lar

### Faz 4: Araçlar & AI
- [ ] WebView entegrasyonu (Rasyon, Hasat, vb.)
- [ ] AI Asistan WebView
- [ ] Deep link desteği

### Faz 5: Polish & Yayın
- [ ] Eski uygulamadan icon/splash kopyala
- [ ] Android build & test
- [ ] iOS build & test
- [ ] Play Store / App Store hazırlık
- [ ] TARPOL web sitesi bağlantısı

---

## 11. KOMUTLAR

```bash
# Proje oluştur
cd /Volumes/LaCie/dashboard-project
mkdir tarpovizyon-mobile && cd tarpovizyon-mobile
npm init -y
npm install react react-dom react-router-dom @tanstack/react-query zustand axios lucide-react
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss postcss autoprefixer

# Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init TarpoVizyon com.tarpovizyon.app --web-dir dist

# Capacitor plugins
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/network @capacitor/app @capacitor/browser @capacitor/haptics

# OneSignal
npm install onesignal-cordova-plugin

# Platform ekleme
npx cap add android
npx cap add ios

# Build ve sync
npm run build
npx cap sync

# Android Studio'da aç
npx cap open android

# Xcode'da aç
npx cap open ios
```

---

## 12. ÖNCELİK SIRASI

1. **Çalışan skeleton app** - Tab bar + boş sayfalar + splash
2. **OneSignal çalışsın** - Push notification alabilelim
3. **Ana sayfa içeriği** - Hava durumu + hızlı erişim
4. **Üretim sayfaları** - Kategori listesi + veri
5. **WebView araçlar** - Rasyon, Hasat, AI
6. **Ayarlar** - Bildirim tercihleri
7. **Polish** - Animasyonlar, loading states, error handling

> **Not:** Bu plan canlı bir dokümandır. Geliştirme sürecinde güncellenecektir.
