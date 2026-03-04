/**
 * WeatherWidget.tsx — Canlı Hava Durumu Bileşeni
 *
 * OpenWeather API üzerinden il bazlı güncel hava verisi gösterir.
 * API anahtarı yoksa veya veri alınamazsa sessizce gizlenir.
 */
import { useEffect, useState, useCallback } from 'react';
import { fetchWeather, isWeatherConfigured, type WeatherData } from '../services/weather';
import './WeatherWidget.css';

interface WeatherWidgetProps {
  /** Seçili il adı (climate-data.ts'deki anahtarla eşleşmeli) */
  il: string;
  /** Kompakt mod (küçük satır içi gösterim) */
  compact?: boolean;
}

/** Rüzgâr derecesini yön metnine çevir */
function windDir(deg: number): string {
  const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Zaman damgasını "HH:mm" formatına çevir */
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function WeatherWidget({ il, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!il || !isWeatherConfigured()) return;
    setLoading(true);
    setError(false);
    const data = await fetchWeather(il);
    setWeather(data);
    setError(!data);
    setLoading(false);
  }, [il]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!il || !isWeatherConfigured()) return;
      setLoading(true);
      setError(false);
      const data = await fetchWeather(il);
      if (!cancelled) {
        setWeather(data);
        setError(!data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [il]);

  // API anahtarı yoksa hiçbir şey gösterme
  if (!isWeatherConfigured()) return null;
  // Yükleniyor
  if (loading && !weather) {
    return (
      <div className={`ww ${compact ? 'ww--compact' : ''}`}>
        <div className="ww__loading">
          <span className="ww__spinner" /> Hava durumu alınıyor…
        </div>
      </div>
    );
  }
  // Hata — sessizce gizle
  if (error && !weather) return null;
  if (!weather) return null;

  // ─── Kompakt görünüm ────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="ww ww--compact" title={`${weather.city} — ${weather.description}`}>
        <img
          className="ww__icon-sm"
          src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
          alt={weather.description}
        />
        <span className="ww__temp-sm">{weather.temp}°C</span>
        <span className="ww__sep">|</span>
        <span className="ww__detail-sm">💧 {weather.humidity}%</span>
        <span className="ww__detail-sm">💨 {weather.windSpeed} m/s</span>
        <button className="ww__refresh-sm" onClick={load} title="Yenile">↻</button>
      </div>
    );
  }

  // ─── Tam kart görünümü ──────────────────────────────────────────────
  return (
    <div className="ww">
      <div className="ww__header">
        <img
          className="ww__icon"
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt={weather.description}
        />
        <div className="ww__headline">
          <h3 className="ww__city">🌤️ {weather.city} — Canlı Hava</h3>
          <p className="ww__desc">{weather.description}</p>
        </div>
        <div className="ww__temp-big">{weather.temp}°<small>C</small></div>
      </div>

      <div className="ww__grid">
        <div className="ww__stat">
          <span className="ww__stat-label">Hissedilen</span>
          <span className="ww__stat-value">{weather.feelsLike}°C</span>
        </div>
        <div className="ww__stat">
          <span className="ww__stat-label">Nem</span>
          <span className="ww__stat-value">{weather.humidity}%</span>
        </div>
        <div className="ww__stat">
          <span className="ww__stat-label">Rüzgâr</span>
          <span className="ww__stat-value">{weather.windSpeed} m/s {windDir(weather.windDeg)}</span>
        </div>
        <div className="ww__stat">
          <span className="ww__stat-label">Basınç</span>
          <span className="ww__stat-value">{weather.pressure} hPa</span>
        </div>
        <div className="ww__stat">
          <span className="ww__stat-label">Bulutluluk</span>
          <span className="ww__stat-value">{weather.clouds}%</span>
        </div>
      </div>

      <div className="ww__footer">
        <span className="ww__source">OpenWeather API · {fmtTime(weather.timestamp)}</span>
        <button className="ww__refresh" onClick={load} title="Yenile">↻ Güncelle</button>
      </div>
    </div>
  );
}
