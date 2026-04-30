import { describe, expect, it } from 'vitest';
import { normalizeCountryKey, toWorldGeoCountryKey, translateCountry } from '../countryTranslations';

describe('countryTranslations world map keys', () => {
  it('normalizes Turkish trade country names to world.geojson keys', () => {
    expect(toWorldGeoCountryKey('Almanya')).toBe(normalizeCountryKey('Germany'));
    expect(toWorldGeoCountryKey('Irak')).toBe(normalizeCountryKey('Iraq'));
    expect(toWorldGeoCountryKey('Rusya')).toBe(normalizeCountryKey('Russia'));
    expect(toWorldGeoCountryKey('ABD')).toBe(normalizeCountryKey('United States of America'));
    expect(toWorldGeoCountryKey('İngiltere')).toBe(normalizeCountryKey('United Kingdom'));
    expect(toWorldGeoCountryKey('Güney Kore')).toBe(normalizeCountryKey('South Korea'));
  });

  it('keeps geojson labels displayable in Turkish', () => {
    expect(translateCountry('Germany')).toBe('Almanya');
    expect(translateCountry('United States of America')).toBe('Amerika Birleşik Devletleri');
  });
});
