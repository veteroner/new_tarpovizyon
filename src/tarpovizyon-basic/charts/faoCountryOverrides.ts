import { normalizeCountryKey } from '../../utils/countryTranslations';

// FAO's official Turkish country names (used throughout the migrated D1 data) often
// differ from the shorter common names in ../../utils/countryTranslations.ts (e.g.
// "Rusya Federasyonu" vs "Rusya", "Kore Cumhuriyeti" vs "Güney Kore"), so the shared
// dictionary's fuzzy match misses ~30% of countries. This is a supplementary,
// module-local override rather than editing the shared file, to avoid changing
// behavior for other parts of the app that already rely on it.
const FAO_TURKISH_TO_GEO_ENGLISH: Record<string, string> = {
  'Beyaz Rusya': 'Belarus',
  'Birleşik Tanzanya Cumhuriyeti': 'United Republic of Tanzania',
  'Bolivya (Çokuluslu Devlet)': 'Bolivia',
  'Brunei Sultanlığı': 'Brunei',
  'Büyük Britanya ve Kuzey İrlanda Birleşik Krallığı': 'United Kingdom',
  'Doğu Timor': 'East Timor',
  'Esvatini': 'Swaziland',
  'Filistin': 'West Bank',
  'Gröndland': 'Greenland',
  'Güney Afrika': 'South Africa',
  'Hollanda (Krallığı)': 'Netherlands',
  'Kongo Demokratik Cumhuriyeti': 'Democratic Republic of the Congo',
  'Kore Cumhuriyeti': 'South Korea',
  'Kore Demokratik Halk Cumhuriyeti': 'North Korea',
  'Kuzey Kore': 'North Korea',
  'Kuzey Makedonya': 'Macedonia',
  'Lao Demokratik Halk Cumhuriyeti': 'Laos',
  'Lesoto': 'Lesotho',
  'Moldova Cumhuriyeti': 'Moldova',
  'Porto Riko': 'Puerto Rico',
  'Rusya': 'Russia',
  'Rusya Federasyonu': 'Russia',
  'Suriye': 'Syria',
  'Suriye Arap Cumhuriyeti': 'Syria',
  'Sırbistan': 'Republic of Serbia',
  'Tanzanya': 'United Republic of Tanzania',
  'Tayvan': 'Taiwan',
  'Venezuela (Bolivarcı Cumhuriyeti)': 'Venezuela',
  'Yeni Kaledonya': 'New Caledonia',
  'Çin, Tayvan Eyaleti': 'Taiwan',
  'İran (İslam Cumhuriyeti)': 'Iran',
  'Kıbrıs': 'Cyprus',
  'Çekya': 'Czech Republic',
  'Fildişi Sahili': 'Ivory Coast',
  'Gine-Bissau': 'Guinea Bissau',
};

const OVERRIDE_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(FAO_TURKISH_TO_GEO_ENGLISH).map(([tr, en]) => [normalizeCountryKey(tr), normalizeCountryKey(en)])
);

export function resolveFaoCountryKey(turkishName: string): string {
  const key = normalizeCountryKey(turkishName);
  return OVERRIDE_KEYS[key] ?? key;
}
