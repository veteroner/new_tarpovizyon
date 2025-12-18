# 📱 IST Trade Dashboard - Mobil Uygulama Projesi

## 🎯 Proje Özeti
Mevcut web dashboard'un mobil versiyonu. dersbende.com API'sinden veri çekerek iOS ve Android'de çalışan native uygulama.

---

## 🛠 Teknoloji Stack

### Ana Framework: **Expo (React Native)**
- **Runtime**: Expo SDK 50+
- **Language**: TypeScript
- **State Management**: Zustand veya React Context
- **Charts**: react-native-chart-kit + react-native-svg
- **Navigation**: Expo Router (file-based routing)
- **UI Kit**: React Native Paper veya NativeWind (Tailwind)
- **API**: Axios veya fetch + React Query

---

## 📁 Proje Yapısı

```
ist-mobile-dashboard/
├── app/                          # Expo Router sayfaları
│   ├── (tabs)/                   # Tab navigation
│   │   ├── _layout.tsx           # Tab layout
│   │   ├── index.tsx             # Genel Bakış
│   │   ├── export.tsx            # İhracat
│   │   ├── import.tsx            # İthalat
│   │   ├── transport.tsx         # Taşıma
│   │   └── production.tsx        # Üretim
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 sayfası
├── components/                   # Yeniden kullanılabilir bileşenler
│   ├── charts/
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   ├── PieChart.tsx
│   │   └── index.ts
│   ├── cards/
│   │   ├── KPICard.tsx
│   │   ├── ModeCard.tsx
│   │   └── ProductCard.tsx
│   ├── tables/
│   │   └── DataTable.tsx
│   └── ui/
│       ├── LoadingSpinner.tsx
│       ├── ErrorMessage.tsx
│       └── RefreshControl.tsx
├── services/                     # API ve veri servisleri
│   ├── api.ts                    # API client
│   ├── queries/
│   │   ├── useOverviewData.ts
│   │   ├── useExportData.ts
│   │   ├── useImportData.ts
│   │   ├── useTransportData.ts
│   │   └── useProductionData.ts
│   └── types.ts                  # TypeScript tipleri
├── constants/
│   ├── colors.ts                 # Renk paleti
│   ├── api.ts                    # API config
│   └── charts.ts                 # Chart ayarları
├── hooks/
│   ├── useRefresh.ts
│   └── useNetworkStatus.ts
├── utils/
│   ├── formatters.ts             # Para, sayı formatları
│   └── helpers.ts
├── assets/
│   ├── fonts/
│   └── images/
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📅 Geliştirme Takvimi (3-4 Hafta)

### 📌 Hafta 1: Temel Kurulum
| Gün | Görev | Süre |
|-----|-------|------|
| 1 | Expo projesi kurulumu, TypeScript config | 2 saat |
| 2 | Navigation yapısı (Expo Router tabs) | 3 saat |
| 3 | API service ve types oluşturma | 3 saat |
| 4 | Temel UI bileşenleri (KPICard, LoadingSpinner) | 4 saat |
| 5 | Renk teması ve stil sistemi | 2 saat |

### 📌 Hafta 2: Ana Sayfalar
| Gün | Görev | Süre |
|-----|-------|------|
| 1-2 | Genel Bakış sayfası + chartlar | 6 saat |
| 3 | İhracat sayfası | 4 saat |
| 4 | İthalat sayfası | 4 saat |
| 5 | Taşıma Modları sayfası | 4 saat |

### 📌 Hafta 3: Detaylar ve Optimizasyon
| Gün | Görev | Süre |
|-----|-------|------|
| 1 | Üretim sayfası | 4 saat |
| 2 | Pull-to-refresh, offline desteği | 3 saat |
| 3 | Animasyonlar ve geçişler | 3 saat |
| 4 | Dark/Light mode | 2 saat |
| 5 | Performans optimizasyonu | 3 saat |

### 📌 Hafta 4: Yayınlama
| Gün | Görev | Süre |
|-----|-------|------|
| 1-2 | iOS için test ve hata düzeltme | 4 saat |
| 3-4 | Android için test ve hata düzeltme | 4 saat |
| 5 | App Store / Play Store yayınlama | 4 saat |

---

## 🎨 UI/UX Tasarım Kararları

### Renk Paleti
```typescript
const colors = {
  // Ana renkler
  primary: '#3b82f6',      // Mavi
  success: '#10b981',      // Yeşil (İhracat)
  warning: '#f59e0b',      // Turuncu (İthalat)
  purple: '#8b5cf6',       // Mor (Taşıma)
  
  // Arka plan
  background: '#0f172a',
  card: '#1e293b',
  cardHover: '#334155',
  
  // Metin
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  
  // Border
  border: 'rgba(255,255,255,0.1)',
};
```

### Tab Icons
- 🏠 Genel Bakış → `home`
- 🚢 İhracat → `ship` veya `trending-up`
- 📦 İthalat → `package` veya `trending-down`
- 🚛 Taşıma → `truck`
- 🌾 Üretim → `leaf` veya `sprout`

### Mobil-Specific Özellikler
1. **Pull-to-refresh**: Her sayfada yukarı çekerek yenileme
2. **Skeleton loading**: Veri yüklenirken iskelet animasyonu
3. **Haptic feedback**: Butonlara dokunma titreşimi
4. **Swipe gestures**: Sayfalar arası kaydırma
5. **Offline mode**: Son verileri cache'leme

---

## 🔌 API Entegrasyonu

### Mevcut API
```
Base URL: https://dersbende.com/api.php
API Key: dashboard_secret_key_2024
```

### Örnek Query
```typescript
// services/api.ts
const API_BASE = 'https://dersbende.com';
const API_KEY = 'dashboard_secret_key_2024';

export async function fetchQuery(sql: string) {
  const url = `${API_BASE}/api.php?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`;
  const response = await fetch(url);
  return response.json();
}
```

### React Query ile Kullanım
```typescript
// services/queries/useOverviewData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchQuery } from '../api';

export function useOverviewData() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const [total, exports, imports] = await Promise.all([
        fetchQuery("SELECT COUNT(*) as cnt, SUM(...) as toplam FROM yct_20"),
        fetchQuery("SELECT SUM(...) FROM yct_20 WHERE flowCode IN ('X','DX')"),
        fetchQuery("SELECT SUM(...) FROM yct_20 WHERE flowCode IN ('M','FM')"),
      ]);
      return { total, exports, imports };
    },
    staleTime: 5 * 60 * 1000, // 5 dakika cache
  });
}
```

---

## 📱 Ekran Tasarımları

### 1. Genel Bakış Ekranı
```
┌─────────────────────────────────────┐
│  IST Dashboard          [Refresh]  │
├─────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐        │
│ │ 💰 Toplam │ │ 🚢 İhracat│        │
│ │  $961B   │ │   $485B   │        │
│ └───────────┘ └───────────┘        │
│ ┌───────────┐ ┌───────────┐        │
│ │ 📦 İthalat│ │ ⚖️ Denge  │        │
│ │   $476B   │ │   +$9B   │        │
│ └───────────┘ └───────────┘        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │     📊 İhracat vs İthalat       │ │
│ │     [Bar Chart]                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │     📈 Aylık Trend              │ │
│ │     [Line Chart]                │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 🏠    🚢    📦    🚛    🌾         │
└─────────────────────────────────────┘
```

---

## 📦 Gerekli Paketler

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react-native": "0.73.x",
    
    // Charts
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^14.1.0",
    "victory-native": "^40.0.0",
    
    // UI
    "react-native-paper": "^5.12.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-reanimated": "~3.6.0",
    
    // Data fetching
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.0",
    
    // Storage
    "@react-native-async-storage/async-storage": "^1.21.0",
    
    // Utils
    "date-fns": "^3.0.0"
  }
}
```

---

## 🚀 Başlangıç Komutları

```bash
# 1. Expo projesi oluştur
npx create-expo-app@latest ist-mobile-dashboard --template tabs

# 2. Klasöre git
cd ist-mobile-dashboard

# 3. Gerekli paketleri yükle
npx expo install react-native-chart-kit react-native-svg
npx expo install @tanstack/react-query
npx expo install react-native-paper
npx expo install @react-native-async-storage/async-storage

# 4. Geliştirmeye başla
npx expo start
```

---

## 🎯 MVP (Minimum Viable Product) Özellikleri

### Mutlaka Olmalı ✅
- [ ] 5 ana sayfa (Overview, Export, Import, Transport, Production)
- [ ] KPI kartları
- [ ] Temel grafikler (Bar, Line, Pie)
- [ ] Pull-to-refresh
- [ ] Tab navigation
- [ ] Loading states

### Sonraki Versiyon 📌
- [ ] Dark/Light mode toggle
- [ ] Favorilere ülke ekleme
- [ ] Push notifications (veri değişimlerinde)
- [ ] PDF/Image olarak export
- [ ] Filtre ve tarih aralığı seçimi
- [ ] Widget desteği (iOS/Android home screen)

### İleri Seviye 🚀
- [ ] Offline mode + sync
- [ ] Biometric login (Face ID / Fingerprint)
- [ ] Apple Watch / Wear OS companion app
- [ ] Siri / Google Assistant entegrasyonu

---

## 💰 Maliyet Tahmini

| Kalem | Maliyet |
|-------|---------|
| Apple Developer Account | $99/yıl |
| Google Play Developer | $25 (tek seferlik) |
| Expo EAS Build (opsiyonel) | $0-29/ay |
| **Toplam Başlangıç** | **~$125** |

---

## 🤔 Alternatif: Next.js PWA

Eğer native uygulama yerine PWA tercih edersen:

### Avantajları
- Mevcut web koduyla çok benzer
- App Store onayı gerektirmez
- Anında güncelleme
- Tek codebase (web + mobil)

### Dezavantajları
- iOS'ta sınırlı özellikler
- Push notification zorluğu
- Native his eksikliği

---

## 📝 Sonuç ve Öneri

**Önerim: Expo ile React Native**

Çünkü:
1. JavaScript bilgin var (web dashboard'dan)
2. Chart.js benzeri kütüphaneler mevcut
3. Tek kodla iOS + Android
4. Expo Go ile hızlı geliştirme
5. Kolay deployment

Hazırsan projeyi başlatabilirim! 🚀
