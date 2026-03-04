/**
 * useApi.ts — React Query hooks for TarpoVizyon Mobile
 *
 * Tüm API çağrıları için merkezi React Query hook'ları.
 * 5 dakika staleTime, 2 retry, offline desteği.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchProvinces,
  fetchDistricts,
  fetchCrops,
  fetchYieldData,
  fetchProvinceRanking,
  fetchEggPrices,
  fetchTopPlantExports,
  fetchTopAnimalExports,
  fetchTopPlantExportCountries,
  fetchTopPlantImportCountries,
  fetchPlantExportSummary,
  fetchAnimalExportSummary,
  fetchPlantExportYearlyTrend,
  fetchWorldProductionStats,
  fetchTopWorldProducts,
  fetchYearlyWorldProduction,
  type QueryResult,
} from '../services/api';
import { fetchWeather, type WeatherData } from '../services/weather';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  provinces: ['provinces'] as const,
  districts: (il: string) => ['districts', il] as const,
  crops: (il: string, ilce: string) => ['crops', il, ilce] as const,
  yieldData: (il: string, ilce: string, urun: string, level: string) =>
    ['yieldData', il, ilce, urun, level] as const,
  provinceRanking: (urun: string) => ['provinceRanking', urun] as const,
  eggPrices: ['eggPrices'] as const,
  topPlantExports: (year?: string) => ['topPlantExports', year] as const,
  topAnimalExports: (year?: string) => ['topAnimalExports', year] as const,
  topPlantExportCountries: (year?: string) => ['topPlantExportCountries', year] as const,
  topPlantImportCountries: (year?: string) => ['topPlantImportCountries', year] as const,
  plantExportSummary: (year?: string) => ['plantExportSummary', year] as const,
  animalExportSummary: (year?: string) => ['animalExportSummary', year] as const,
  plantExportYearlyTrend: ['plantExportYearlyTrend'] as const,
  worldProductionStats: ['worldProductionStats'] as const,
  topWorldProducts: ['topWorldProducts'] as const,
  yearlyWorldProduction: ['yearlyWorldProduction'] as const,
  weather: (il: string) => ['weather', il] as const,
};

// ─── Default Options ──────────────────────────────────────────────────────────

const defaultOptions = {
  staleTime: 5 * 60 * 1000,      // 5 dakika
  gcTime: 30 * 60 * 1000,        // 30 dakika garbage collection
  retry: 2,
  refetchOnWindowFocus: false,
};

// ─── Bitkisel Üretim Hooks ───────────────────────────────────────────────────

export function useProvinces() {
  return useQuery<QueryResult>({
    queryKey: queryKeys.provinces,
    queryFn: fetchProvinces,
    ...defaultOptions,
    staleTime: 60 * 60 * 1000, // İller 1 saat cache
  });
}

export function useDistricts(il: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.districts(il),
    queryFn: () => fetchDistricts(il),
    enabled: !!il,
    ...defaultOptions,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCrops(il: string, ilce: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.crops(il, ilce),
    queryFn: () => fetchCrops(il, ilce),
    enabled: !!il && !!ilce,
    ...defaultOptions,
  });
}

export function useYieldData(il: string, ilce: string, urun: string, level: 'ilce' | 'il' | 'turkey') {
  return useQuery<QueryResult>({
    queryKey: queryKeys.yieldData(il, ilce, urun, level),
    queryFn: () => fetchYieldData(il, ilce, urun, level),
    enabled: !!urun && (level === 'turkey' || !!il),
    ...defaultOptions,
  });
}

export function useProvinceRanking(urun: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.provinceRanking(urun),
    queryFn: () => fetchProvinceRanking(urun),
    enabled: !!urun,
    ...defaultOptions,
  });
}

// ─── Yumurta Fiyatı Hook ─────────────────────────────────────────────────────

export function useEggPrices() {
  return useQuery({
    queryKey: queryKeys.eggPrices,
    queryFn: fetchEggPrices,
    ...defaultOptions,
  });
}

// ─── Dış Ticaret Hooks ───────────────────────────────────────────────────────

export function useTopPlantExports(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.topPlantExports(year),
    queryFn: () => fetchTopPlantExports(year),
    ...defaultOptions,
  });
}

export function useTopAnimalExports(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.topAnimalExports(year),
    queryFn: () => fetchTopAnimalExports(year),
    ...defaultOptions,
  });
}

export function useTopPlantExportCountries(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.topPlantExportCountries(year),
    queryFn: () => fetchTopPlantExportCountries(year),
    ...defaultOptions,
  });
}

export function useTopPlantImportCountries(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.topPlantImportCountries(year),
    queryFn: () => fetchTopPlantImportCountries(year),
    ...defaultOptions,
  });
}

export function usePlantExportSummary(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.plantExportSummary(year),
    queryFn: () => fetchPlantExportSummary(year),
    ...defaultOptions,
  });
}

export function useAnimalExportSummary(year?: string) {
  return useQuery<QueryResult>({
    queryKey: queryKeys.animalExportSummary(year),
    queryFn: () => fetchAnimalExportSummary(year),
    ...defaultOptions,
  });
}

export function usePlantExportYearlyTrend() {
  return useQuery<QueryResult>({
    queryKey: queryKeys.plantExportYearlyTrend,
    queryFn: fetchPlantExportYearlyTrend,
    ...defaultOptions,
  });
}

// ─── Dünya Üretim Hooks ──────────────────────────────────────────────────────

export function useWorldProductionStats() {
  return useQuery<QueryResult>({
    queryKey: queryKeys.worldProductionStats,
    queryFn: fetchWorldProductionStats,
    ...defaultOptions,
  });
}

export function useTopWorldProducts() {
  return useQuery<QueryResult>({
    queryKey: queryKeys.topWorldProducts,
    queryFn: fetchTopWorldProducts,
    ...defaultOptions,
  });
}

export function useYearlyWorldProduction() {
  return useQuery<QueryResult>({
    queryKey: queryKeys.yearlyWorldProduction,
    queryFn: fetchYearlyWorldProduction,
    ...defaultOptions,
  });
}

// ─── Hava Durumu Hook ────────────────────────────────────────────────────────

export function useWeather(il: string) {
  return useQuery<WeatherData | null>({
    queryKey: queryKeys.weather(il),
    queryFn: () => fetchWeather(il),
    enabled: !!il,
    ...defaultOptions,
    staleTime: 10 * 60 * 1000, // 10 dakika
    retry: 1,
  });
}
