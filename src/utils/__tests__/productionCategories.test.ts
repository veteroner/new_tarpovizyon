import { describe, expect, it } from 'vitest';
import { getCanonicalProvinceName, getRegionByProvince, normalizeProvinceKey } from '../productionCategories';

describe('productionCategories province normalization', () => {
  it('matches geojson province aliases to official province names', () => {
    expect(normalizeProvinceKey('Afyon')).toBe(normalizeProvinceKey('Afyonkarahisar'));
    expect(getCanonicalProvinceName('Afyon')).toBe('Afyonkarahisar');
    expect(getRegionByProvince('Afyon')).toBe('Ege');
  });

  it('handles common misspellings and ASCII variants', () => {
    expect(getCanonicalProvinceName('Zinguldak')).toBe('Zonguldak');
    expect(getRegionByProvince('K.Maraş')).toBe('Akdeniz');
    expect(getRegionByProvince('Agri')).toBe('Doğu Anadolu');
    expect(getRegionByProvince('Adiyaman')).toBe('Güneydoğu Anadolu');
  });
});
