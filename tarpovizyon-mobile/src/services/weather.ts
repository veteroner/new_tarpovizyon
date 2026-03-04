/**
 * weather.ts — TarpoVizyon Mobile Hava Durumu Servisi
 *
 * OpenWeather Current Weather API kullanarak il bazlı canlı hava durumu.
 * API anahtarı yoksa null döner.
 */

// ─── 81 İl Koordinatları ──────────────────────────────────────────────────────

export const IL_KOORDINAT: Record<string, { lat: number; lon: number }> = {
  'Adana': { lat: 37.00, lon: 35.32 },
  'Adıyaman': { lat: 37.76, lon: 38.27 },
  'Afyon': { lat: 38.74, lon: 30.54 },
  'Ağrı': { lat: 39.72, lon: 43.05 },
  'Aksaray': { lat: 38.37, lon: 34.02 },
  'Amasya': { lat: 40.65, lon: 35.83 },
  'Ankara': { lat: 39.93, lon: 32.86 },
  'Antalya': { lat: 36.88, lon: 30.70 },
  'Ardahan': { lat: 41.11, lon: 42.70 },
  'Artvin': { lat: 41.18, lon: 41.82 },
  'Aydın': { lat: 37.85, lon: 27.85 },
  'Balıkesir': { lat: 39.65, lon: 27.88 },
  'Bartın': { lat: 41.63, lon: 32.33 },
  'Batman': { lat: 37.88, lon: 41.12 },
  'Bayburt': { lat: 40.26, lon: 40.22 },
  'Bilecik': { lat: 40.05, lon: 30.00 },
  'Bingöl': { lat: 38.88, lon: 40.50 },
  'Bitlis': { lat: 38.39, lon: 42.12 },
  'Bolu': { lat: 40.73, lon: 31.61 },
  'Burdur': { lat: 37.72, lon: 30.29 },
  'Bursa': { lat: 40.19, lon: 29.06 },
  'Çanakkale': { lat: 40.16, lon: 26.40 },
  'Çankırı': { lat: 40.60, lon: 33.62 },
  'Çorum': { lat: 40.55, lon: 34.96 },
  'Denizli': { lat: 37.77, lon: 29.09 },
  'Diyarbakır': { lat: 37.91, lon: 40.24 },
  'Düzce': { lat: 40.84, lon: 31.16 },
  'Edirne': { lat: 41.67, lon: 26.56 },
  'Elazığ': { lat: 38.67, lon: 39.22 },
  'Erzincan': { lat: 39.75, lon: 39.50 },
  'Erzurum': { lat: 39.90, lon: 41.27 },
  'Eskişehir': { lat: 39.78, lon: 30.52 },
  'Gaziantep': { lat: 37.07, lon: 37.38 },
  'Giresun': { lat: 40.91, lon: 38.39 },
  'Gümüşhane': { lat: 40.46, lon: 39.48 },
  'Hakkari': { lat: 37.58, lon: 43.74 },
  'Hatay': { lat: 36.20, lon: 36.16 },
  'Iğdır': { lat: 39.92, lon: 44.04 },
  'Isparta': { lat: 37.76, lon: 30.56 },
  'İstanbul': { lat: 41.01, lon: 28.98 },
  'İzmir': { lat: 38.42, lon: 27.13 },
  'Kahramanmaraş': { lat: 37.58, lon: 36.94 },
  'Karabük': { lat: 41.21, lon: 32.62 },
  'Karaman': { lat: 37.18, lon: 33.23 },
  'Kars': { lat: 40.60, lon: 43.10 },
  'Kastamonu': { lat: 41.39, lon: 33.78 },
  'Kayseri': { lat: 38.73, lon: 35.48 },
  'Kilis': { lat: 36.72, lon: 37.12 },
  'Kırıkkale': { lat: 39.85, lon: 33.53 },
  'Kırklareli': { lat: 41.73, lon: 27.22 },
  'Kırşehir': { lat: 39.15, lon: 34.17 },
  'Kocaeli': { lat: 40.77, lon: 29.92 },
  'Konya': { lat: 37.87, lon: 32.48 },
  'Kütahya': { lat: 39.42, lon: 29.98 },
  'Malatya': { lat: 38.35, lon: 38.31 },
  'Manisa': { lat: 38.62, lon: 27.43 },
  'Mardin': { lat: 37.31, lon: 40.73 },
  'Mersin': { lat: 36.80, lon: 34.63 },
  'Muğla': { lat: 37.22, lon: 28.36 },
  'Muş': { lat: 38.75, lon: 41.49 },
  'Nevşehir': { lat: 38.62, lon: 34.71 },
  'Niğde': { lat: 37.97, lon: 34.68 },
  'Ordu': { lat: 40.98, lon: 37.88 },
  'Osmaniye': { lat: 37.07, lon: 36.25 },
  'Rize': { lat: 41.02, lon: 40.52 },
  'Sakarya': { lat: 40.69, lon: 30.40 },
  'Samsun': { lat: 41.29, lon: 36.33 },
  'Şanlıurfa': { lat: 37.17, lon: 38.79 },
  'Siirt': { lat: 37.93, lon: 41.94 },
  'Sinop': { lat: 42.03, lon: 35.15 },
  'Sivas': { lat: 39.75, lon: 37.02 },
  'Şırnak': { lat: 37.41, lon: 42.46 },
  'Tekirdağ': { lat: 41.00, lon: 27.52 },
  'Tokat': { lat: 40.31, lon: 36.55 },
  'Trabzon': { lat: 41.00, lon: 39.72 },
  'Tunceli': { lat: 39.11, lon: 39.55 },
  'Uşak': { lat: 38.68, lon: 29.41 },
  'Van': { lat: 38.49, lon: 43.38 },
  'Yalova': { lat: 40.66, lon: 29.27 },
  'Yozgat': { lat: 39.82, lon: 34.80 },
  'Zonguldak': { lat: 41.45, lon: 31.79 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure: number;
  clouds: number;
  description: string;
  icon: string;
  timestamp: number;
  city: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000; // 10 dakika
const cache = new Map<string, { data: WeatherData; ts: number }>();

// ─── API ──────────────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * İl adıyla OpenWeather API'den güncel hava durumu çeker.
 * API anahtarı yoksa null döner. 10dk cache.
 */
export async function fetchWeather(il: string): Promise<WeatherData | null> {
  if (!API_KEY) return null;

  const coord = IL_KOORDINAT[il];
  if (!coord) return null;

  const cached = cache.get(il);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${BASE_URL}?lat=${coord.lat}&lon=${coord.lon}&appid=${API_KEY}&units=metric&lang=tr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const json = await res.json();
    const data: WeatherData = {
      temp: Math.round(json.main.temp * 10) / 10,
      feelsLike: Math.round(json.main.feels_like * 10) / 10,
      humidity: json.main.humidity,
      windSpeed: Math.round(json.wind.speed * 10) / 10,
      windDeg: json.wind.deg ?? 0,
      pressure: json.main.pressure,
      clouds: json.clouds?.all ?? 0,
      description: json.weather?.[0]?.description ?? '',
      icon: json.weather?.[0]?.icon ?? '01d',
      timestamp: json.dt * 1000,
      city: il,
    };

    cache.set(il, { data, ts: Date.now() });
    return data;
  } catch {
    return null;
  }
}

export function isWeatherConfigured(): boolean {
  return !!API_KEY && API_KEY.length > 10;
}

/** OpenWeather icon URL */
export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
