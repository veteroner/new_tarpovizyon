/**
 * weather.ts — OpenWeather API İstemcisi
 *
 * Ücretsiz OpenWeather Current Weather API kullanarak il bazlı canlı hava durumu verisi sağlar.
 * API anahtarı: https://openweathermap.org/appid adresinden ücretsiz alınabilir.
 *
 * NOT: API anahtarı yoksa veya istek başarısız olursa null döner;
 * çağıran modül statik iklim tablosuna (climate-data.ts) fallback yapmalıdır.
 */

// ─── 81 İl Koordinatları ──────────────────────────────────────────────────────

export const IL_KOORDINAT: Record<string, { lat: number; lon: number }> = {
  'Adana':          { lat: 37.00, lon: 35.32 },
  'Adıyaman':       { lat: 37.76, lon: 38.27 },
  'Afyon':           { lat: 38.74, lon: 30.54 },
  'Ağrı':            { lat: 39.72, lon: 43.05 },
  'Aksaray':         { lat: 38.37, lon: 34.02 },
  'Amasya':          { lat: 40.65, lon: 35.83 },
  'Ankara':          { lat: 39.93, lon: 32.86 },
  'Antalya':         { lat: 36.88, lon: 30.70 },
  'Ardahan':         { lat: 41.11, lon: 42.70 },
  'Artvin':          { lat: 41.18, lon: 41.82 },
  'Aydın':           { lat: 37.85, lon: 27.85 },
  'Balıkesir':       { lat: 39.65, lon: 27.88 },
  'Bartın':          { lat: 41.63, lon: 32.33 },
  'Batman':          { lat: 37.88, lon: 41.12 },
  'Bayburt':         { lat: 40.26, lon: 40.22 },
  'Bilecik':         { lat: 40.05, lon: 30.00 },
  'Bingöl':          { lat: 38.88, lon: 40.50 },
  'Bitlis':           { lat: 38.39, lon: 42.12 },
  'Bolu':            { lat: 40.73, lon: 31.61 },
  'Burdur':          { lat: 37.72, lon: 30.29 },
  'Bursa':           { lat: 40.19, lon: 29.06 },
  'Çanakkale':       { lat: 40.16, lon: 26.40 },
  'Çankırı':         { lat: 40.60, lon: 33.62 },
  'Çorum':           { lat: 40.55, lon: 34.96 },
  'Denizli':         { lat: 37.77, lon: 29.09 },
  'Diyarbakır':      { lat: 37.91, lon: 40.24 },
  'Düzce':           { lat: 40.84, lon: 31.16 },
  'Edirne':          { lat: 41.67, lon: 26.56 },
  'Elazığ':          { lat: 38.67, lon: 39.22 },
  'Erzincan':        { lat: 39.75, lon: 39.50 },
  'Erzurum':         { lat: 39.90, lon: 41.27 },
  'Eskişehir':       { lat: 39.78, lon: 30.52 },
  'Gaziantep':       { lat: 37.07, lon: 37.38 },
  'Giresun':         { lat: 40.91, lon: 38.39 },
  'Gümüşhane':       { lat: 40.46, lon: 39.48 },
  'Hakkari':         { lat: 37.58, lon: 43.74 },
  'Hatay':           { lat: 36.20, lon: 36.16 },
  'Iğdır':           { lat: 39.92, lon: 44.04 },
  'Isparta':         { lat: 37.76, lon: 30.56 },
  'İstanbul':        { lat: 41.01, lon: 28.98 },
  'İzmir':           { lat: 38.42, lon: 27.13 },
  'Kahramanmaraş':   { lat: 37.58, lon: 36.94 },
  'Karabük':         { lat: 41.21, lon: 32.62 },
  'Karaman':         { lat: 37.18, lon: 33.23 },
  'Kars':            { lat: 40.60, lon: 43.10 },
  'Kastamonu':       { lat: 41.39, lon: 33.78 },
  'Kayseri':         { lat: 38.73, lon: 35.48 },
  'Kilis':           { lat: 36.72, lon: 37.12 },
  'Kırıkkale':       { lat: 39.85, lon: 33.53 },
  'Kırklareli':      { lat: 41.73, lon: 27.22 },
  'Kırşehir':        { lat: 39.15, lon: 34.17 },
  'Kocaeli':         { lat: 40.77, lon: 29.92 },
  'Konya':           { lat: 37.87, lon: 32.48 },
  'Kütahya':         { lat: 39.42, lon: 29.98 },
  'Malatya':         { lat: 38.35, lon: 38.31 },
  'Manisa':          { lat: 38.62, lon: 27.43 },
  'Mardin':          { lat: 37.31, lon: 40.73 },
  'Mersin':          { lat: 36.80, lon: 34.63 },
  'Muğla':           { lat: 37.22, lon: 28.36 },
  'Muş':             { lat: 38.75, lon: 41.49 },
  'Nevşehir':        { lat: 38.62, lon: 34.71 },
  'Niğde':           { lat: 37.97, lon: 34.68 },
  'Ordu':            { lat: 40.98, lon: 37.88 },
  'Osmaniye':        { lat: 37.07, lon: 36.25 },
  'Rize':            { lat: 41.02, lon: 40.52 },
  'Sakarya':         { lat: 40.69, lon: 30.40 },
  'Samsun':          { lat: 41.29, lon: 36.33 },
  'Şanlıurfa':       { lat: 37.17, lon: 38.79 },
  'Siirt':           { lat: 37.93, lon: 41.94 },
  'Sinop':           { lat: 42.03, lon: 35.15 },
  'Sivas':           { lat: 39.75, lon: 37.02 },
  'Şırnak':          { lat: 37.41, lon: 42.46 },
  'Tekirdağ':        { lat: 41.00, lon: 27.52 },
  'Tokat':           { lat: 40.31, lon: 36.55 },
  'Trabzon':         { lat: 41.00, lon: 39.72 },
  'Tunceli':         { lat: 39.11, lon: 39.55 },
  'Uşak':            { lat: 38.68, lon: 29.41 },
  'Van':             { lat: 38.49, lon: 43.38 },
  'Yalova':          { lat: 40.66, lon: 29.27 },
  'Yozgat':          { lat: 39.82, lon: 34.80 },
  'Zonguldak':       { lat: 41.45, lon: 31.79 },
};

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface WeatherData {
  /** Anlık sıcaklık (°C) */
  temp: number;
  /** Hissedilen sıcaklık (°C) */
  feelsLike: number;
  /** Nem oranı (%) */
  humidity: number;
  /** Rüzgâr hızı (m/s) */
  windSpeed: number;
  /** Rüzgâr yönü (derece) */
  windDeg: number;
  /** Basınç (hPa) */
  pressure: number;
  /** Bulutluluk (%) */
  clouds: number;
  /** Hava durumu açıklaması */
  description: string;
  /** Hava durumu ikonu (OpenWeather icon id) */
  icon: string;
  /** Son güncelleme (Unix timestamp * 1000 → ms) */
  timestamp: number;
  /** İl adı */
  city: string;
}

export interface ForecastDay {
  /** YYYY-MM-DD (yerel saat dilimine göre) */
  date: string;
  /** Günlük toplam yağış (mm) */
  rainMm: number;
  /** Günlük min sıcaklık (°C) */
  tempMin: number;
  /** Günlük max sıcaklık (°C) */
  tempMax: number;
}

export interface ForecastSummary {
  city: string;
  /** Yaklaşık (OpenWeather 3 saatlik tahminlerden) */
  next24hRainMm: number;
  /** Yaklaşık (OpenWeather 3 saatlik tahminlerden) */
  next48hRainMm: number;
  /** 5 günlük toplam yağış (mm) */
  next5dRainMm: number;
  /** Günlük kırılım */
  daily: ForecastDay[];
  /** ms */
  fetchedAt: number;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000; // 10 dakika
const cache = new Map<string, { data: WeatherData; ts: number }>();

const forecastCache = new Map<string, { data: ForecastSummary; ts: number }>();

// ─── API ──────────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function yyyyMmDdLocal(tsMs: number): string {
  const d = new Date(tsMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * İl adıyla OpenWeather API'den güncel hava durumu verisi çeker.
 * API anahtarı yoksa veya istek başarısız olursa null döner.
 * 10 dakikalık in-memory cache kullanır.
 */
export async function fetchWeather(il: string): Promise<WeatherData | null> {
  if (!API_KEY) return null;

  const coord = IL_KOORDINAT[il];
  if (!coord) return null;

  // Cache kontrolü
  const cached = cache.get(il);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${BASE_URL}?lat=${coord.lat}&lon=${coord.lon}&appid=${API_KEY}&units=metric&lang=tr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      if (IS_DEV) console.warn(`[weather] ${il} isteği başarısız: ${res.status}`);
      return null;
    }

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
  } catch (err) {
    if (IS_DEV) console.warn(`[weather] ${il} verisi alınamadı:`, err);
    return null;
  }
}

/**
 * İl adıyla OpenWeather 5 günlük / 3 saatlik tahmin verisini özetler.
 * Ücretsiz planda çalışır. 10 dakikalık in-memory cache kullanır.
 */
export async function fetchForecast(il: string): Promise<ForecastSummary | null> {
  if (!API_KEY) return null;

  const coord = IL_KOORDINAT[il];
  if (!coord) return null;

  const cached = forecastCache.get(il);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${FORECAST_URL}?lat=${coord.lat}&lon=${coord.lon}&appid=${API_KEY}&units=metric&lang=tr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });

    if (!res.ok) {
      if (IS_DEV) console.warn(`[forecast] ${il} isteği başarısız: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const list: any[] = Array.isArray(json.list) ? json.list : [];

    const now = Date.now();
    let next24hRainMm = 0;
    let next48hRainMm = 0;

    const dailyMap = new Map<string, ForecastDay>();

    for (const it of list) {
      const ts = typeof it?.dt === 'number' ? it.dt * 1000 : null;
      if (!ts) continue;

      const rain3h = Number(it?.rain?.['3h'] ?? 0) || 0;

      if (ts <= now + 24 * 3600 * 1000) next24hRainMm += rain3h;
      if (ts <= now + 48 * 3600 * 1000) next48hRainMm += rain3h;

      const date = yyyyMmDdLocal(ts);
      const tempMin = Number(it?.main?.temp_min);
      const tempMax = Number(it?.main?.temp_max);

      const prev = dailyMap.get(date);
      if (!prev) {
        dailyMap.set(date, {
          date,
          rainMm: rain3h,
          tempMin: Number.isFinite(tempMin) ? tempMin : NaN,
          tempMax: Number.isFinite(tempMax) ? tempMax : NaN,
        });
      } else {
        prev.rainMm += rain3h;
        if (Number.isFinite(tempMin)) prev.tempMin = Number.isFinite(prev.tempMin) ? Math.min(prev.tempMin, tempMin) : tempMin;
        if (Number.isFinite(tempMax)) prev.tempMax = Number.isFinite(prev.tempMax) ? Math.max(prev.tempMax, tempMax) : tempMax;
      }
    }

    const daily = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        rainMm: Math.round(d.rainMm * 10) / 10,
        tempMin: Number.isFinite(d.tempMin) ? Math.round(d.tempMin * 10) / 10 : NaN,
        tempMax: Number.isFinite(d.tempMax) ? Math.round(d.tempMax * 10) / 10 : NaN,
      }));

    const next5dRainMm = daily.reduce((s, d) => s + d.rainMm, 0);

    const data: ForecastSummary = {
      city: il,
      next24hRainMm: Math.round(next24hRainMm * 10) / 10,
      next48hRainMm: Math.round(next48hRainMm * 10) / 10,
      next5dRainMm: Math.round(next5dRainMm * 10) / 10,
      daily,
      fetchedAt: Date.now(),
    };

    forecastCache.set(il, { data, ts: Date.now() });
    return data;
  } catch (err) {
    if (IS_DEV) console.warn(`[forecast] ${il} verisi alınamadı:`, err);
    return null;
  }
}

/**
 * API anahtarının yapılandırılıp yapılandırılmadığını döner.
 */
export function isWeatherConfigured(): boolean {
  return !!API_KEY && API_KEY.length > 10;
}
