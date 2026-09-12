import { useQuery } from '@tanstack/react-query';
import { fetchWeather, type WeatherData } from '../services/weather';

/**
 * React Query hooks for mobile data fetching
 *
 * ─── DUYURU KANCASI KALDIRILDI ──────────────────────────────────────────────
 * `useAnnouncements` burada tanımlıydı ama HİÇBİR sayfa onu çağırmıyordu —
 * ölçüldü, sıfır kullanım. Beslediği `services/updates.ts` ise `api.php`
 * anahtarını koda gömülü taşıyordu ve o anahtar kaynak sistemde serbest SQL
 * açıyor. Yani kullanılmayan bir özellik, gerçek bir kimlik bilgisini herkese
 * açık pakete sokuyordu.
 *
 * Kanca ve servis dosyası silindi. Duyurular ileride gerekirse D1'e bir tablo
 * olarak eklenir; eski yol geri getirilmemeli.
 */

export function useWeather(city: string) {
  return useQuery<WeatherData | null>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeather(city),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });
}

