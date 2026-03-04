import { useQuery } from '@tanstack/react-query';
import { fetchWeather, type WeatherData } from '../services/weather';
import { fetchAnnouncements, type Announcement } from '../services/updates';

/**
 * React Query hooks for mobile data fetching
 */

export function useWeather(city: string) {
  return useQuery<WeatherData | null>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeather(city),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });
}

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });
}
