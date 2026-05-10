import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchCommodityPrices, fetchCommodityChart, fetchGiewsSeries, fetchGiewsPricesBatch, fetchGiewsSeriesByCommodity, fetchGiewsInternationalSeries } from '../services/api';
import type { CommodityItem, ChartPoint, GiewsSerie, GiewsDatapoint, GiewsPriceResult } from '../services/api';
import { BackToHome } from '../components/BackToHome';
import { ChartInsightButton } from '../components/ChartInsightButton';

const CATEGORY_ICONS: Record<string, string> = {
  'Tahıllar': '🌾',
  'Yağlı Tohumlar': '🫘',
  'Endüstriyel': '🏭',
  'Tropikal': '☕',
  'Hayvancılık': '🐄',
  'Süt Ürünleri': '🥛',
  'Enerji': '⚡',
  'Orman Ürünleri': '🪵',
  'Gübre': '🧪',
  'Et & Gıda': '🥩',
  'Metaller': '🥇',
  'Döviz': '💱',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Tahıllar': 'from-amber-500 to-yellow-600',
  'Yağlı Tohumlar': 'from-green-500 to-emerald-600',
  'Endüstriyel': 'from-blue-500 to-indigo-600',
  'Tropikal': 'from-orange-500 to-red-500',
  'Hayvancılık': 'from-red-500 to-pink-600',
  'Süt Ürünleri': 'from-sky-400 to-blue-500',
  'Enerji': 'from-purple-500 to-violet-600',
  'Orman Ürünleri': 'from-stone-500 to-amber-700',
  'Gübre': 'from-lime-500 to-green-600',
  'Et & Gıda': 'from-red-600 to-orange-600',
  'Metaller': 'from-yellow-400 to-amber-500',
  'Döviz': 'from-teal-500 to-cyan-600',
};

const RANGE_OPTIONS = [
  { value: '1d', label: '1G' },
  { value: '5d', label: '5G' },
  { value: '1mo', label: '1A' },
  { value: '3mo', label: '3A' },
  { value: '6mo', label: '6A' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

const GIEWS_COUNTRIES = [
  { iso3: 'AFG', name: 'Afghanistan' },
  { iso3: 'DZA', name: 'Algeria' },
  { iso3: 'AGO', name: 'Angola' },
  { iso3: 'ARG', name: 'Argentina' },
  { iso3: 'ARM', name: 'Armenia' },
  { iso3: 'AUT', name: 'Austria' },
  { iso3: 'AZE', name: 'Azerbaijan' },
  { iso3: 'BGD', name: 'Bangladesh' },
  { iso3: 'BLR', name: 'Belarus' },
  { iso3: 'BEL', name: 'Belgium' },
  { iso3: 'BLZ', name: 'Belize' },
  { iso3: 'BEN', name: 'Benin' },
  { iso3: 'BTN', name: 'Bhutan' },
  { iso3: 'BOL', name: 'Bolivia' },
  { iso3: 'BWA', name: 'Botswana' },
  { iso3: 'BRA', name: 'Brazil' },
  { iso3: 'BGR', name: 'Bulgaria' },
  { iso3: 'BFA', name: 'Burkina Faso' },
  { iso3: 'BDI', name: 'Burundi' },
  { iso3: 'CPV', name: 'Cabo Verde' },
  { iso3: 'KHM', name: 'Cambodia' },
  { iso3: 'CMR', name: 'Cameroon' },
  { iso3: 'CAF', name: 'Central African Republic' },
  { iso3: 'TCD', name: 'Chad' },
  { iso3: 'CHL', name: 'Chile' },
  { iso3: 'CHN', name: 'China' },
  { iso3: 'COL', name: 'Colombia' },
  { iso3: 'CRI', name: 'Costa Rica' },
  { iso3: 'HRV', name: 'Croatia' },
  { iso3: 'CYP', name: 'Cyprus' },
  { iso3: 'CZE', name: 'Czech Republic' },
  { iso3: 'CIV', name: "Côte d'Ivoire" },
  { iso3: 'COD', name: 'DR Congo' },
  { iso3: 'DNK', name: 'Denmark' },
  { iso3: 'DJI', name: 'Djibouti' },
  { iso3: 'DOM', name: 'Dominican Republic' },
  { iso3: 'ECU', name: 'Ecuador' },
  { iso3: 'EGY', name: 'Egypt' },
  { iso3: 'SLV', name: 'El Salvador' },
  { iso3: 'EST', name: 'Estonia' },
  { iso3: 'SWZ', name: 'Eswatini' },
  { iso3: 'ETH', name: 'Ethiopia' },
  { iso3: 'FIN', name: 'Finland' },
  { iso3: 'FRA', name: 'France' },
  { iso3: 'GMB', name: 'Gambia' },
  { iso3: 'GEO', name: 'Georgia' },
  { iso3: 'DEU', name: 'Germany' },
  { iso3: 'GHA', name: 'Ghana' },
  { iso3: 'GRC', name: 'Greece' },
  { iso3: 'GTM', name: 'Guatemala' },
  { iso3: 'GIN', name: 'Guinea' },
  { iso3: 'GNB', name: 'Guinea-Bissau' },
  { iso3: 'HTI', name: 'Haiti' },
  { iso3: 'HND', name: 'Honduras' },
  { iso3: 'HUN', name: 'Hungary' },
  { iso3: 'IND', name: 'India' },
  { iso3: 'IDN', name: 'Indonesia' },
  { iso3: 'IRN', name: 'Iran' },
  { iso3: 'IRQ', name: 'Iraq' },
  { iso3: 'IRL', name: 'Ireland' },
  { iso3: 'ISR', name: 'Israel' },
  { iso3: 'ITA', name: 'Italy' },
  { iso3: 'JPN', name: 'Japan' },
  { iso3: 'JOR', name: 'Jordan' },
  { iso3: 'KAZ', name: 'Kazakhstan' },
  { iso3: 'KEN', name: 'Kenya' },
  { iso3: 'KGZ', name: 'Kyrgyzstan' },
  { iso3: 'LAO', name: 'Laos' },
  { iso3: 'LVA', name: 'Latvia' },
  { iso3: 'LBN', name: 'Lebanon' },
  { iso3: 'LSO', name: 'Lesotho' },
  { iso3: 'LBR', name: 'Liberia' },
  { iso3: 'LBY', name: 'Libya' },
  { iso3: 'LTU', name: 'Lithuania' },
  { iso3: 'LUX', name: 'Luxembourg' },
  { iso3: 'MDG', name: 'Madagascar' },
  { iso3: 'MWI', name: 'Malawi' },
  { iso3: 'MLI', name: 'Mali' },
  { iso3: 'MLT', name: 'Malta' },
  { iso3: 'MRT', name: 'Mauritania' },
  { iso3: 'MUS', name: 'Mauritius' },
  { iso3: 'MEX', name: 'Mexico' },
  { iso3: 'MNG', name: 'Mongolia' },
  { iso3: 'MOZ', name: 'Mozambique' },
  { iso3: 'MMR', name: 'Myanmar' },
  { iso3: 'NAM', name: 'Namibia' },
  { iso3: 'NPL', name: 'Nepal' },
  { iso3: 'NLD', name: 'Netherlands' },
  { iso3: 'NIC', name: 'Nicaragua' },
  { iso3: 'NER', name: 'Niger' },
  { iso3: 'NGA', name: 'Nigeria' },
  { iso3: 'PSE', name: 'Palestine' },
  { iso3: 'PAK', name: 'Pakistan' },
  { iso3: 'PAN', name: 'Panama' },
  { iso3: 'PRY', name: 'Paraguay' },
  { iso3: 'PER', name: 'Peru' },
  { iso3: 'PHL', name: 'Philippines' },
  { iso3: 'POL', name: 'Poland' },
  { iso3: 'PRT', name: 'Portugal' },
  { iso3: 'KOR', name: 'Republic of Korea' },
  { iso3: 'MDA', name: 'Moldova' },
  { iso3: 'ROU', name: 'Romania' },
  { iso3: 'RUS', name: 'Russia' },
  { iso3: 'RWA', name: 'Rwanda' },
  { iso3: 'SAU', name: 'Saudi Arabia' },
  { iso3: 'SEN', name: 'Senegal' },
  { iso3: 'SLE', name: 'Sierra Leone' },
  { iso3: 'SVK', name: 'Slovakia' },
  { iso3: 'SVN', name: 'Slovenia' },
  { iso3: 'SOM', name: 'Somalia' },
  { iso3: 'ZAF', name: 'South Africa' },
  { iso3: 'SSD', name: 'South Sudan' },
  { iso3: 'ESP', name: 'Spain' },
  { iso3: 'LKA', name: 'Sri Lanka' },
  { iso3: 'SDN', name: 'Sudan' },
  { iso3: 'SWE', name: 'Sweden' },
  { iso3: 'SYR', name: 'Syria' },
  { iso3: 'TJK', name: 'Tajikistan' },
  { iso3: 'THA', name: 'Thailand' },
  { iso3: 'TLS', name: 'Timor-Leste' },
  { iso3: 'TGO', name: 'Togo' },
  { iso3: 'TON', name: 'Tonga' },
  { iso3: 'TUN', name: 'Tunisia' },
  { iso3: 'TKM', name: 'Turkmenistan' },
  { iso3: 'TUR', name: 'Türkiye' },
  { iso3: 'UGA', name: 'Uganda' },
  { iso3: 'UKR', name: 'Ukraine' },
  { iso3: 'GBR', name: 'United Kingdom' },
  { iso3: 'TZA', name: 'Tanzania' },
  { iso3: 'USA', name: 'United States' },
  { iso3: 'URY', name: 'Uruguay' },
  { iso3: 'UZB', name: 'Uzbekistan' },
  { iso3: 'VNM', name: 'Viet Nam' },
  { iso3: 'YEM', name: 'Yemen' },
  { iso3: 'ZMB', name: 'Zambia' },
  { iso3: 'ZWE', name: 'Zimbabwe' },
].sort((a, b) => a.name.localeCompare(b.name));

const COMMODITY_EMOJI: Record<string, string> = {
  'Wheat': '🌾', 'Maize': '🌽', 'Rice': '🍚', 'Barley': '🌾', 'Sorghum': '🌾',
  'Millet': '🌾', 'Teff': '🌾', 'Cassava': '🥬', 'Potato': '🥔', 'Potatoes': '🥔',
  'Beans': '🫘', 'Lentils': '🫘', 'Chickpeas': '🫘', 'Cowpeas': '🫘', 'Soya': '🫘',
  'Groundnuts': '🥜', 'Sugar': '🍬', 'Milk': '🥛', 'Eggs': '🥚', 'Chicken': '🐔',
  'Beef': '🥩', 'Lamb': '🥩', 'Pork': '🥩', 'Goat': '🐐', 'Fish': '🐟',
  'Onions': '🧅', 'Tomatoes': '🍅', 'Bananas': '🍌',
  'Oranges': '🍊', 'Apples': '🍎', 'Mangoes': '🥭', 'Palm Oil': '🌴',
  'Sunflower': '🌻', 'Vegetable': '🫙', 'Bread': '🍞', 'Flour': '🌾',
  'Oil': '🫙', 'Soybean': '🫘',
};

const COMMODITY_TR: Record<string, string> = {
  'Wheat': 'Buğday',
  'Maize': 'Mısır',
  'Rice': 'Pirinç',
  'Barley': 'Arpa',
  'Sorghum': 'Sorgum',
  'Millet': 'Darı',
  'Teff': 'Teff',
  'Cassava': 'Manyok',
  'Potato': 'Patates',
  'Potatoes': 'Patates',
  'Sweet Potato': 'Tatlı Patates',
  'Yam': 'Yam',
  'Plantain': 'Plantain',
  'Beans': 'Fasulye',
  'Lentils': 'Mercimek',
  'Chickpeas': 'Nohut',
  'Cowpeas': 'Börülce',
  'Soya': 'Soya',
  'Soybean': 'Soya Fasulyesi',
  'Groundnuts': 'Yerfıstığı',
  'Sugar': 'Şeker',
  'Milk': 'Süt',
  'Eggs': 'Yumurta',
  'Chicken': 'Tavuk',
  'Beef': 'Sığır Eti',
  'Lamb': 'Kuzu Eti',
  'Mutton': 'Koyun Eti',
  'Pork': 'Domuz Eti',
  'Goat': 'Keçi',
  'Fish': 'Balık',
  'Onions': 'Soğan',
  'Tomatoes': 'Domates',
  'Tomato': 'Domates',
  'Bananas': 'Muz',
  'Banana': 'Muz',
  'Oranges': 'Portakal',
  'Orange': 'Portakal',
  'Apples': 'Elma',
  'Apple': 'Elma',
  'Mangoes': 'Mango',
  'Mango': 'Mango',
  'Palm Oil': 'Palmiye Yağı',
  'Sunflower': 'Ayçiçeği',
  'Vegetable Oil': 'Bitkisel Yağ',
  'Vegetable': 'Sebze',
  'Bread': 'Ekmek',
  'Flour': 'Un',
  'Oil': 'Yağ',
  'Salt': 'Tuz',
  'Pepper': 'Biber',
  'Chili': 'Acı Biber',
  'Garlic': 'Sarımsak',
  'Cabbage': 'Lahana',
  'Carrot': 'Havuç',
  'Lettuce': 'Marul',
  'Spinach': 'Ispanak',
  'Eggplant': 'Patlıcan',
  'Cucumber': 'Salatalık',
  'Watermelon': 'Karpuz',
  'Melon': 'Kavun',
  'Grape': 'Üzüm',
  'Grapes': 'Üzüm',
  'Pear': 'Armut',
  'Peach': 'Şeftali',
  'Plum': 'Erik',
  'Cherry': 'Kiraz',
  'Lemon': 'Limon',
  'Pineapple': 'Ananas',
  'Avocado': 'Avokado',
  'Cocoa': 'Kakao',
  'Coffee': 'Kahve',
  'Tea': 'Çay',
  'Tobacco': 'Tütün',
  'Cotton': 'Pamuk',
  'Jute': 'Jüt',
  'Sesame': 'Susam',
  'Linseed': 'Keten Tohumu',
  'Rapeseed': 'Kolza',
  'Sunflower Seed': 'Ayçiçeği Tohumu',
  'Safflower': 'Aspir',
  'Castor': 'Hint Yağı',
  'Butter': 'Tereyağı',
  'Cheese': 'Peynir',
  'Honey': 'Bal',
  'Wool': 'Yün',
  'Cattle': 'Sığır',
  'Buffalo': 'Manda',
  'Sheep': 'Koyun',
  'Pig': 'Domuz',
  'Poultry': 'Kümes Hayvanları',
  'Duck': 'Ördek',
  'Turkey': 'Hindi',
  'Rabbit': 'Tavşan',
  'Fodder': 'Yem',
  'Hay': 'Saman',
  'Straw': 'Sap',
  'Fertilizer': 'Gübre',
  'Urea': 'Üre',
};

const COUNTRY_TR: Record<string, string> = {
  'Afghanistan': 'Afganistan',
  'Algeria': 'Cezayir',
  'Angola': 'Angola',
  'Argentina': 'Arjantin',
  'Armenia': 'Ermenistan',
  'Austria': 'Avusturya',
  'Azerbaijan': 'Azerbaycan',
  'Bangladesh': 'Bangladeş',
  'Belarus': 'Belarus',
  'Belgium': 'Belçika',
  'Belize': 'Belize',
  'Benin': 'Benin',
  'Bhutan': 'Bhutan',
  'Bolivia': 'Bolivya',
  'Botswana': 'Botsvana',
  'Brazil': 'Brezilya',
  'Bulgaria': 'Bulgaristan',
  'Burkina Faso': 'Burkina Faso',
  'Burundi': 'Burundi',
  'Cabo Verde': 'Yeşil Burun Adaları',
  'Cambodia': 'Kamboçya',
  'Cameroon': 'Kamerun',
  'Central African Republic': 'Orta Afrika Cumhuriyeti',
  'Chad': 'Çad',
  'Chile': 'Şili',
  'China': 'Çin',
  'Colombia': 'Kolombiya',
  'Costa Rica': 'Kosta Rika',
  'Croatia': 'Hırvatistan',
  'Cyprus': 'Kıbrıs',
  'Czech Republic': 'Çek Cumhuriyeti',
  "Côte d'Ivoire": 'Fildişi Sahili',
  'DR Congo': 'Kongo Demokratik Cumhuriyeti',
  'Denmark': 'Danimarka',
  'Djibouti': 'Cibuti',
  'Dominican Republic': 'Dominik Cumhuriyeti',
  'Ecuador': 'Ekvador',
  'Egypt': 'Mısır',
  'El Salvador': 'El Salvador',
  'Estonia': 'Estonya',
  'Eswatini': 'Esvatini',
  'Ethiopia': 'Etiyopya',
  'Finland': 'Finlandiya',
  'France': 'Fransa',
  'Gambia': 'Gambiya',
  'Georgia': 'Gürcistan',
  'Germany': 'Almanya',
  'Ghana': 'Gana',
  'Greece': 'Yunanistan',
  'Guatemala': 'Guatemala',
  'Guinea': 'Gine',
  'Guinea-Bissau': 'Gine-Bissau',
  'Haiti': 'Haiti',
  'Honduras': 'Honduras',
  'Hungary': 'Macaristan',
  'India': 'Hindistan',
  'Indonesia': 'Endonezya',
  'Iran': 'İran',
  'Iraq': 'Irak',
  'Ireland': 'İrlanda',
  'Israel': 'İsrail',
  'Italy': 'İtalya',
  'Japan': 'Japonya',
  'Jordan': 'Ürdün',
  'Kazakhstan': 'Kazakistan',
  'Kenya': 'Kenya',
  'Kyrgyzstan': 'Kırgızistan',
  'Laos': 'Laos',
  'Latvia': 'Letonya',
  'Lebanon': 'Lübnan',
  'Lesotho': 'Lesoto',
  'Liberia': 'Liberya',
  'Libya': 'Libya',
  'Lithuania': 'Litvanya',
  'Luxembourg': 'Lüksemburg',
  'Madagascar': 'Madagaskar',
  'Malawi': 'Malavi',
  'Mali': 'Mali',
  'Malta': 'Malta',
  'Mauritania': 'Moritanya',
  'Mauritius': 'Mauritius',
  'Mexico': 'Meksika',
  'Mongolia': 'Moğolistan',
  'Mozambique': 'Mozambik',
  'Myanmar': 'Myanmar',
  'Namibia': 'Namibya',
  'Nepal': 'Nepal',
  'Netherlands': 'Hollanda',
  'Nicaragua': 'Nikaragua',
  'Niger': 'Nijer',
  'Nigeria': 'Nijerya',
  'Palestine': 'Filistin',
  'Pakistan': 'Pakistan',
  'Panama': 'Panama',
  'Paraguay': 'Paraguay',
  'Peru': 'Peru',
  'Philippines': 'Filipinler',
  'Poland': 'Polonya',
  'Portugal': 'Portekiz',
  'Republic of Korea': 'Güney Kore',
  'Moldova': 'Moldova',
  'Romania': 'Romanya',
  'Russia': 'Rusya',
  'Rwanda': 'Ruanda',
  'Saudi Arabia': 'Suudi Arabistan',
  'Senegal': 'Senegal',
  'Sierra Leone': 'Sierra Leone',
  'Slovakia': 'Slovakya',
  'Slovenia': 'Slovenya',
  'Somalia': 'Somali',
  'South Africa': 'Güney Afrika',
  'South Sudan': 'Güney Sudan',
  'Spain': 'İspanya',
  'Sri Lanka': 'Sri Lanka',
  'Sudan': 'Sudan',
  'Sweden': 'İsveç',
  'Syria': 'Suriye',
  'Tajikistan': 'Tacikistan',
  'Thailand': 'Tayland',
  'Timor-Leste': 'Doğu Timor',
  'Togo': 'Togo',
  'Tonga': 'Tonga',
  'Tunisia': 'Tunus',
  'Turkmenistan': 'Türkmenistan',
  'Türkiye': 'Türkiye',
  'Uganda': 'Uganda',
  'Ukraine': 'Ukrayna',
  'United Kingdom': 'Birleşik Krallık',
  'Tanzania': 'Tanzanya',
  'United States': 'Amerika Birleşik Devletleri',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Özbekistan',
  'Viet Nam': 'Vietnam',
  'Yemen': 'Yemen',
  'Zambia': 'Zambiya',
  'Zimbabwe': 'Zimbabve',
};

function getCommodityEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(COMMODITY_EMOJI)) {
    if (name.toLowerCase().startsWith(key.toLowerCase())) return emoji;
  }
  return '🌿';
}

function translateCommodity(name: string): string {
  // Exact match
  if (COMMODITY_TR[name]) return COMMODITY_TR[name];
  // Prefix match
  for (const [key, tr] of Object.entries(COMMODITY_TR)) {
    if (name.toLowerCase().startsWith(key.toLowerCase())) return tr;
  }
  return name;
}

const GIEWS_COUNTRY_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];
const MAX_GIEWS_COUNTRIES = 4;

type GiewsSelectedPrice = {
  serie: GiewsSerie;
  history: GiewsDatapoint[];
  countryIso: string;
  countryName: string;
  color: string;
};

type GiewsCountrySerie = GiewsSelectedPrice;

function getCountryByIso(iso3: string) {
  return GIEWS_COUNTRIES.find(country => country.iso3 === iso3) ?? GIEWS_COUNTRIES[0];
}

function getCountryLabel(iso3: string): string {
  const country = getCountryByIso(iso3);
  return COUNTRY_TR[country.name] ?? country.name;
}

function getLatestDateLabel(datapoints: GiewsDatapoint[]): string {
  const latest = datapoints[0];
  return latest ? new Date(latest.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }) : '-';
}

function getLatestPctChange(datapoints: GiewsDatapoint[]): number | null {
  const latest = datapoints[0];
  const prev = datapoints[1];
  if (!latest || !prev || !prev.price_value) return null;
  return ((latest.price_value - prev.price_value) / prev.price_value) * 100;
}

export default function CommodityPricesPage() {
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [source, setSource] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityItem | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartRange, setChartRange] = useState('1mo');
  const [chartLoading, setChartLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'yahoo' | 'fao' | 'intl'>('yahoo');

  // FAO GIEWS state
  const [faoCountry, setFaoCountry] = useState('TUR');
  const [faoSeries, setFaoSeries] = useState<GiewsSerie[]>([]);
  const [faoPriceMap, setFaoPriceMap] = useState<Map<string, GiewsDatapoint[]>>(new Map());
  const [faoLoading, setFaoLoading] = useState(false);
  const [faoError, setFaoError] = useState('');
  const [faoSearch, setFaoSearch] = useState('');
  const [faoSort, setFaoSort] = useState<'name' | 'price_asc' | 'price_desc' | 'change_desc' | 'change_asc'>('name');
  const [faoDetailComm, setFaoDetailComm] = useState('');
  const [faoDetailRange, setFaoDetailRange] = useState<'6mo' | '1y' | '2y' | 'max'>('1y');
  const [worldModalComm, setWorldModalComm] = useState('');
  const [worldSeries, setWorldSeries] = useState<GiewsSerie[]>([]);
  const [worldPriceMap, setWorldPriceMap] = useState<Map<string, GiewsDatapoint[]>>(new Map());
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState('');

  // International prices state
  const [intlSeries, setIntlSeries] = useState<GiewsSerie[]>([]);
  const [intlPriceMap, setIntlPriceMap] = useState<Map<string, GiewsDatapoint[]>>(new Map());
  const [intlLoading, setIntlLoading] = useState(false);
  const [intlError, setIntlError] = useState('');
  const [intlCategoryFilter, setIntlCategoryFilter] = useState<string>('all');
  const [intlSelected, setIntlSelected] = useState<GiewsSerie | null>(null);
  const [intlSelectedHistory, setIntlSelectedHistory] = useState<GiewsDatapoint[]>([]);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCommodityPrices();
      if (res.success && res.commodities) {
        setCommodities(res.commodities);
        setLastUpdate(res.updated || '');
        setSource(res.source || '');
      } else {
        setError(res.error || 'Veriler alınamadı');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  const loadChart = useCallback(async (symbol: string, range: string) => {
    setChartLoading(true);
    try {
      const res = await fetchCommodityChart(symbol, range);
      if (res.success && res.data) {
        setChartData(res.data);
      }
    } catch { /* ignore */ }
    setChartLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCommodity) {
      loadChart(selectedCommodity.symbol, chartRange);
    }
  }, [selectedCommodity, chartRange, loadChart]);

  // FAO GIEWS — load selected country data
  useEffect(() => {
    if (activeTab !== 'fao') return;
    let cancelled = false;
    setFaoLoading(true); setFaoError(''); setFaoSeries([]); setFaoPriceMap(new Map());
    (async () => {
      try {
        const series = await fetchGiewsSeries(faoCountry);
        const uuids = series.map(s => s.uuid);
        const priceResults: GiewsPriceResult[] = uuids.length ? await fetchGiewsPricesBatch(uuids) : [];
        const pm = new Map<string, GiewsDatapoint[]>();
        for (const r of priceResults) pm.set(r.uuid, r.datapoints);
        if (!cancelled) { setFaoSeries(series); setFaoPriceMap(pm); }
      } catch { if (!cancelled) setFaoError('FAO GIEWS verisi alınamadı'); }
      finally { if (!cancelled) setFaoLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, faoCountry]);

  // FAO GIEWS — load world comparison data when world modal opens
  useEffect(() => {
    if (!worldModalComm) return;
    let cancelled = false;
    setWorldLoading(true); setWorldError(''); setWorldSeries([]); setWorldPriceMap(new Map());
    (async () => {
      try {
        const series = await fetchGiewsSeriesByCommodity(worldModalComm);
        if (!cancelled) setWorldSeries(series);
        const uuids = series.map(s => s.uuid);
        const priceResults: GiewsPriceResult[] = uuids.length ? await fetchGiewsPricesBatch(uuids) : [];
        const pm = new Map<string, GiewsDatapoint[]>();
        for (const r of priceResults) pm.set(r.uuid, r.datapoints);
        if (!cancelled) setWorldPriceMap(pm);
      } catch { if (!cancelled) setWorldError('Dünya verileri alınamadı'); }
      finally { if (!cancelled) setWorldLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [worldModalComm]);

  // International prices — load on first visit to tab
  useEffect(() => {
    if (activeTab !== 'intl' || intlSeries.length > 0) return;
    let cancelled = false;
    setIntlLoading(true);
    setIntlError('');
    (async () => {
      try {
        const series = await fetchGiewsInternationalSeries();
        const uuids = series.map(s => s.uuid);
        const priceResults: GiewsPriceResult[] = uuids.length ? await fetchGiewsPricesBatch(uuids) : [];
        const pm = new Map<string, GiewsDatapoint[]>();
        for (const r of priceResults) pm.set(r.uuid, r.datapoints);
        if (!cancelled) { setIntlSeries(series); setIntlPriceMap(pm); }
      } catch { if (!cancelled) setIntlError('Uluslararası fiyat verisi alınamadı'); }
      finally { if (!cancelled) setIntlLoading(false); }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, intlSeries.length]);


  const categories = ['all', ...Array.from(new Set(commodities.map(c => c.category)))];
  const filtered = selectedCategory === 'all' 
    ? commodities 
    : commodities.filter(c => c.category === selectedCategory);

  // Grouped by category
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, CommodityItem[]>);

  // Summary KPIs
  const gainers = commodities.filter(c => c.changePct > 0).length;
  const losers = commodities.filter(c => c.changePct < 0).length;
  const avgChange = commodities.length > 0 
    ? commodities.reduce((s, c) => s + c.changePct, 0) / commodities.length 
    : 0;

  return (
    <div>
      <BackToHome />
      <div className="page-header">
        <h1 className="page-title">
          {activeTab === 'yahoo' ? '📊 Borsa Emtia Fiyatları' : activeTab === 'fao' ? '🌍 FAO İç Piyasa Fiyatları' : '🌐 Uluslararası Emtia Fiyatları'}
        </h1>
        <p className="page-subtitle">
          {activeTab === 'yahoo' ? 'Yahoo Finance canlı vadeli işlem ve spot piyasa göstergeleri' : activeTab === 'fao' ? 'FAO GIEWS ülke bazlı yerel market fiyatları ve çoklu ülke karşılaştırması' : 'FAO FPMA · 90 uluslararası emtia serisi · Gübre, Enerji, Tahıllar, Et, Süt ve daha fazlası'}
          {activeTab === 'yahoo' && lastUpdate && <span className="ml-2 text-xs opacity-70">• Son güncelleme: {lastUpdate}</span>}
          {activeTab === 'yahoo' && source && <span className="ml-2 text-xs opacity-70">• Kaynak: {source}</span>}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['yahoo', 'fao', 'intl'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '0.75rem',
              border: activeTab === tab ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab ? 700 : 500,
              background: activeTab === tab ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#ffffff',
              color: activeTab === tab ? '#fff' : '#475569',
              boxShadow: activeTab === tab ? '0 2px 10px rgba(59,130,246,0.35)' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'yahoo' ? '📊 Yahoo Finance' : tab === 'fao' ? '🌍 FAO İç Piyasa' : '🌐 Uluslararası Emtia'}
          </button>
        ))}
      </div>

      {/* ===== Yahoo Finance Tab ===== */}
      {activeTab === 'yahoo' && (
        loading && !commodities.length ? (
          <div className="loading"><div className="loading-spinner"></div><p>Emtia fiyatları yükleniyor...</p></div>
        ) : error && !commodities.length ? (
        <div className="text-center py-12 text-red-400">
          <p className="text-lg">❌ {error}</p>
          <button onClick={loadPrices} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Tekrar Dene</button>
        </div>
      ) : (
        <>
          {/* KPI Summary */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TOPLAM EMTİA</span></div>
              <div className="kpi-value">{commodities.length}</div>
              <div className="kpi-subtitle">Takip edilen ürün</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YÜKSELENLER</span><span className="kpi-icon green">📈</span></div>
              <div className="kpi-value text-green-400">{gainers}</div>
              <div className="kpi-subtitle">Bugün artış gösteren</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">DÜŞENLER</span><span className="kpi-icon red">📉</span></div>
              <div className="kpi-value text-red-400">{losers}</div>
              <div className="kpi-subtitle">Bugün düşüş gösteren</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ORT. DEĞİŞİM</span></div>
              <div className={`kpi-value ${avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
              </div>
              <div className="kpi-subtitle">Günlük ortalama</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="date-filter" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.75rem',
                    border: selectedCategory === cat ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    background: selectedCategory === cat ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#ffffff',
                    color: selectedCategory === cat ? '#fff' : '#475569',
                    transition: 'all 0.2s',
                    boxShadow: selectedCategory === cat ? '0 2px 8px rgba(59,130,246,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {cat === 'all' ? '🌐 Tümü' : `${CATEGORY_ICONS[cat] || '📦'} ${cat}`}
                </button>
              ))}
            </div>
          </div>

          {/* Commodity Cards by Category */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {CATEGORY_ICONS[category] || '📦'} {category}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {items.map(c => (
                  <div
                    key={c.symbol}
                    onClick={() => { setSelectedCommodity(c); setChartRange('1mo'); }}
                    style={{
                      background: '#ffffff',
                      border: selectedCommodity?.symbol === c.symbol ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '1rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    }}
                    className="hover:shadow-md"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.symbol} • {c.unit}</div>
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${CATEGORY_COLORS[category] || 'from-gray-500 to-gray-600'} text-white`}>
                        {CATEGORY_ICONS[category] || '📦'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                        ${c.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                        color: c.changePct >= 0 ? '#22c55e' : '#ef4444',
                        fontWeight: 600, fontSize: '0.85rem',
                      }}>
                        <span>{c.changePct >= 0 ? '▲' : '▼'} {Math.abs(c.changePct).toFixed(2)}%</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                          {c.change >= 0 ? '+' : ''}{c.change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Chart Modal */}
          {selectedCommodity && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }} onClick={() => setSelectedCommodity(null)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem',
                  width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {selectedCommodity.name} ({selectedCommodity.symbol})
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      {selectedCommodity.category} • {selectedCommodity.unit}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                      ${selectedCommodity.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ color: selectedCommodity.changePct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {selectedCommodity.changePct >= 0 ? '▲' : '▼'} {Math.abs(selectedCommodity.changePct).toFixed(2)}%
                    </div>
                  </div>
                  <ChartInsightButton title={`${selectedCommodity.name} Fiyat Grafiği`} description="Emtia fiyat grafiği" data={chartData.map(p => ({ date: new Date(p.t * 1000).toLocaleDateString('tr-TR'), price: p.c }))} context={{ section: 'Emtia Fiyatları' }} compact />
                  </div>
                </div>

                {/* Range selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {RANGE_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setChartRange(r.value)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: 'none',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        background: chartRange === r.value ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                        color: chartRange === r.value ? '#fff' : '#cbd5e1',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ width: '100%', height: 300 }}>
                  {chartLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                      Grafik yükleniyor...
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.map(p => ({ date: new Date(p.t * 1000).toLocaleDateString('tr-TR'), price: p.c }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f1f5f9' }}
                          formatter={(v: number) => [`$${v.toFixed(2)}`, 'Fiyat']}
                        />
                        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                      Grafik verisi bulunamadı
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedCommodity(null)}
                  style={{
                    marginTop: '1rem', width: '100%', padding: '0.75rem',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.9rem',
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              onClick={loadPrices}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem', borderRadius: '1rem', border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff',
                fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontSize: '0.9rem',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '⏳ Güncelleniyor...' : '🔄 Fiyatları Güncelle'}
            </button>
          </div>
        </>
      )
      )}

      {/* ===== FAO GIEWS İç Piyasa Tab ===== */}

      {/* ===== FAO GIEWS İç Piyasa Tab ===== */}
      {activeTab === 'fao' && (() => {
        // ─── helpers ──────────────────────────────────────────────────────────
        const getCardData = (commodity: string) => {
          const relevant = faoSeries.filter(s => s.commodity_name === commodity);
          let best: GiewsSerie | null = null;
          let bestPts: GiewsDatapoint[] = [];
          for (const s of relevant) {
            const pts = faoPriceMap.get(s.uuid) ?? [];
            if (pts.length > bestPts.length) { best = s; bestPts = pts; }
          }
          if (!best || bestPts.length === 0) return null;
          const latest = bestPts.find(p => p.price_value > 0);
          if (!latest) return null;
          const prev = bestPts.find(p => p.price_value > 0 && p.date < latest.date);
          const pct = prev ? ((latest.price_value - prev.price_value) / prev.price_value) * 100 : null;
          const sparkline = bestPts.slice(0, 12).reverse()
            .filter(p => p.price_value_dollar != null && p.price_value_dollar > 0)
            .map(p => ({ date: p.date.slice(0, 7), usd: p.price_value_dollar }));
          return { price: latest.price_value, usd: latest.price_value_dollar, currency: best.currency, unit: best.measure_unit_label, date: latest.date, pct, market: best.market_name, sparkline };
        };

        const buildDetailHistory = (commodity: string, range: string) => {
          const relevant = faoSeries.filter(s => s.commodity_name === commodity);
          const dateMap = new Map<string, { sum: number; cnt: number }>();
          for (const s of relevant) {
            for (const p of (faoPriceMap.get(s.uuid) ?? [])) {
              if (!p.price_value_dollar || p.price_value_dollar <= 0) continue;
              const d = p.date.slice(0, 7);
              const cur = dateMap.get(d) ?? { sum: 0, cnt: 0 };
              cur.sum += p.price_value_dollar; cur.cnt++;
              dateMap.set(d, cur);
            }
          }
          const all = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))
            .map(([d, { sum, cnt }]) => ({
              date: d,
              label: new Date(d + '-01').toLocaleDateString('tr-TR', { year: '2-digit', month: 'short' }),
              usd: sum / cnt,
            }));
          if (range === '6mo') return all.slice(-6);
          if (range === '1y') return all.slice(-12);
          if (range === '2y') return all.slice(-24);
          return all;
        };

        type WorldItem = { iso3: string; name: string; latestUsd: number; latestDate: string; marketCount: number };
        const computeWorldRankings = (): WorldItem[] => {
          const cm = new Map<string, WorldItem>();
          for (const s of worldSeries) {
            const pts = worldPriceMap.get(s.uuid) ?? [];
            const lp = pts.find(p => p.price_value_dollar != null && p.price_value_dollar > 0);
            if (!lp) continue;
            const ex = cm.get(s.iso3_country_code);
            if (!ex || lp.date > ex.latestDate) {
              cm.set(s.iso3_country_code, { iso3: s.iso3_country_code, name: s.country_name, latestUsd: lp.price_value_dollar, latestDate: lp.date, marketCount: (ex?.marketCount ?? 0) + 1 });
            } else { ex.marketCount++; }
          }
          return Array.from(cm.values()).sort((a, b) => b.latestUsd - a.latestUsd);
        };

        // ─── derived data ──────────────────────────────────────────────────────
        const allComms = Array.from(new Set(faoSeries.map(s => s.commodity_name)))
          .sort((a, b) => translateCommodity(a).localeCompare(translateCommodity(b), 'tr'));
        const faoFilteredComms = faoSearch
          ? allComms.filter(c =>
              translateCommodity(c).toLowerCase().includes(faoSearch.toLowerCase()) ||
              c.toLowerCase().includes(faoSearch.toLowerCase()))
          : allComms;

        type CardItem = NonNullable<ReturnType<typeof getCardData>> & { name: string };
        const cards: CardItem[] = faoFilteredComms
          .map(c => { const d = getCardData(c); return d ? { name: c, ...d } : null; })
          .filter((c): c is CardItem => c !== null);

        const sortedCards = [...cards].sort((a, b) => {
          if (faoSort === 'price_desc') return (b.usd ?? 0) - (a.usd ?? 0);
          if (faoSort === 'price_asc') return (a.usd ?? 0) - (b.usd ?? 0);
          if (faoSort === 'change_desc') return (b.pct ?? -Infinity) - (a.pct ?? -Infinity);
          if (faoSort === 'change_asc') return (a.pct ?? Infinity) - (b.pct ?? Infinity);
          return translateCommodity(a.name).localeCompare(translateCommodity(b.name), 'tr');
        });

        const faoGainers = cards.filter(c => c.pct != null && c.pct > 0).length;
        const faoLosers = cards.filter(c => c.pct != null && c.pct < 0).length;
        const latestFaoDate = cards.reduce<string>((l, c) => c.date > l ? c.date : l, '');
        const faoCountryLabel = COUNTRY_TR[GIEWS_COUNTRIES.find(c => c.iso3 === faoCountry)?.name ?? ''] ?? faoCountry;
        const detailCardData = faoDetailComm ? getCardData(faoDetailComm) : null;
        const detailHistory = faoDetailComm ? buildDetailHistory(faoDetailComm, faoDetailRange) : [];
        const worldRankings = worldSeries.length > 0 && !worldLoading ? computeWorldRankings() : [];
        const turkeyRank = worldRankings.findIndex(r => r.iso3 === 'TUR') + 1;
        const worldAvg = worldRankings.length > 0 ? worldRankings.reduce((s, r) => s + r.latestUsd, 0) / worldRankings.length : 0;
        const worldSpread = worldRankings.length >= 2 ? worldRankings[0].latestUsd / worldRankings[worldRankings.length - 1].latestUsd : 0;

        const selStyle = {
          padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: '1px solid #e2e8f0',
          fontSize: '0.87rem', fontWeight: 600 as const, color: '#1e293b',
          background: '#f8fafc', cursor: 'pointer' as const,
        };

        return (
          <div>
            {/* ── Country selector ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '0.85rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>📍 Ülke</span>
              <select
                value={faoCountry}
                onChange={e => { setFaoCountry(e.target.value); setFaoDetailComm(''); setWorldModalComm(''); }}
                style={{ ...selStyle, minWidth: 200 }}
              >
                {GIEWS_COUNTRIES.map(c => <option key={c.iso3} value={c.iso3}>{COUNTRY_TR[c.name] ?? c.name}</option>)}
              </select>
              {faoLoading && <span style={{ fontSize: '0.82rem', color: '#64748b' }}>⏳ Yükleniyor...</span>}
              {!faoLoading && !faoError && cards.length > 0 && (
                <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>{cards.length} ürün bulundu</span>
              )}
              <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>📡 FAO GIEWS · Aylık iç piyasa fiyatları</div>
            </div>

            {/* ── KPI row ── */}
            <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">ÜRÜN SAYISI</span></div>
                <div className="kpi-value">{allComms.length}</div>
                <div className="kpi-subtitle">{faoCountryLabel} iç piyasasında</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">YÜKSELENLER</span><span className="kpi-icon green">📈</span></div>
                <div className="kpi-value text-green-400">{faoGainers}</div>
                <div className="kpi-subtitle">Ay/ay artış gösteren</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">DÜŞENLER</span><span className="kpi-icon red">📉</span></div>
                <div className="kpi-value text-red-400">{faoLosers}</div>
                <div className="kpi-subtitle">Ay/ay düşüş gösteren</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">SON VERİ</span></div>
                <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
                  {latestFaoDate ? new Date(latestFaoDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }) : '-'}
                </div>
                <div className="kpi-subtitle">FAO GIEWS son güncelleme</div>
              </div>
            </div>

            {/* ── Search + sort bar ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Ürün ara... (buğday, mısır, pirinç...)"
                value={faoSearch}
                onChange={e => setFaoSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.87rem', background: '#fff', outline: 'none' }}
              />
              <select value={faoSort} onChange={e => setFaoSort(e.target.value as typeof faoSort)} style={selStyle}>
                <option value="name">A → Z</option>
                <option value="price_desc">USD Fiyat ↓</option>
                <option value="price_asc">USD Fiyat ↑</option>
                <option value="change_desc">Değişim ↓ (en çok yükselen)</option>
                <option value="change_asc">Değişim ↑ (en çok düşen)</option>
              </select>
            </div>

            {/* Error */}
            {faoError && !faoLoading && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', color: '#dc2626', marginBottom: '1rem' }}>
                ❌ {faoError}
              </div>
            )}

            {/* Skeleton loading */}
            {faoLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', border: '1px solid #e2e8f0', borderRadius: '1rem', height: 165, animation: 'shimmer 1.5s infinite' }} />
                ))}
              </div>
            )}

            {/* ── Commodity cards ── */}
            {!faoLoading && !faoError && sortedCards.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))', gap: '0.85rem' }}>
                {sortedCards.map(card => (
                  <div
                    key={card.name}
                    onClick={() => { setFaoDetailComm(card.name); setFaoDetailRange('1y'); }}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    className="hover:shadow-lg hover:border-blue-200"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.97rem', color: '#0f172a' }}>
                          {getCommodityEmoji(card.name)} {translateCommodity(card.name)}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: '0.12rem' }}>{card.market}</div>
                      </div>
                      {card.pct != null && (
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: card.pct >= 0 ? '#16a34a' : '#dc2626', background: card.pct >= 0 ? '#f0fdf4' : '#fef2f2', padding: '0.22rem 0.5rem', borderRadius: '0.45rem', whiteSpace: 'nowrap' }}>
                          {card.pct >= 0 ? '▲' : '▼'} {Math.abs(card.pct).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                      {card.price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      <span style={{ fontSize: '0.67rem', fontWeight: 500, color: '#64748b', marginLeft: '0.3rem' }}>{card.currency}/{card.unit}</span>
                    </div>
                    {card.usd != null && card.usd > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>≈ ${card.usd.toFixed(2)} USD</div>
                    )}
                    {card.sparkline.length > 2 && (
                      <div style={{ marginTop: '0.55rem' }}>
                        <ResponsiveContainer width="100%" height={52}>
                          <LineChart data={card.sparkline}>
                            <Line type="monotone" dataKey="usd" stroke="#3b82f6" strokeWidth={1.8} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                      {new Date(card.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })} · kart detayı için tıklayın
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!faoLoading && !faoError && sortedCards.length === 0 && allComms.length > 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.92rem' }}>
                🔍 &ldquo;{faoSearch}&rdquo; ile eşleşen ürün bulunamadı
              </div>
            )}

            {/* ── Detail Modal ── */}
            {faoDetailComm && detailCardData && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => setFaoDetailComm('')}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* Modal header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9' }}>
                        {getCommodityEmoji(faoDetailComm)} {translateCommodity(faoDetailComm)}
                      </h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                        {faoCountryLabel} · {detailCardData.market}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                        {detailCardData.price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '0.3rem' }}>
                          {detailCardData.currency}/{detailCardData.unit}
                        </span>
                      </div>
                      {detailCardData.usd != null && detailCardData.usd > 0 && (
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>≈ ${detailCardData.usd.toFixed(2)} USD</div>
                      )}
                      {detailCardData.pct != null && (
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: detailCardData.pct >= 0 ? '#4ade80' : '#f87171', marginTop: '0.25rem' }}>
                          {detailCardData.pct >= 0 ? '▲' : '▼'} {Math.abs(detailCardData.pct).toFixed(1)}% (ay/ay)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Range selector */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {(['6mo', '1y', '2y', 'max'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setFaoDetailRange(r)}
                        style={{ padding: '0.38rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: faoDetailRange === r ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: faoDetailRange === r ? '#fff' : '#cbd5e1', transition: 'all 0.15s' }}
                      >
                        {r === '6mo' ? '6A' : r === '1y' ? '1Y' : r === '2y' ? '2Y' : 'Tümü'}
                      </button>
                    ))}
                  </div>

                  {/* Chart */}
                  {detailHistory.length > 0 ? (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detailHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} tickFormatter={(v: number) => `$${Number(v).toFixed(0)}`} />
                          <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.6rem', color: '#f1f5f9', fontSize: '0.82rem' }}
                            formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'USD ort.']}
                          />
                          <Line type="monotone" dataKey="usd" stroke="#3b82f6" strokeWidth={2.5} dot={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                      Bu dönem için veri yok
                    </div>
                  )}

                  {/* Stats row */}
                  {detailHistory.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginTop: '1rem', marginBottom: '1rem' }}>
                      {[
                        { label: 'Min', value: `$${Math.min(...detailHistory.map(p => p.usd)).toFixed(2)}` },
                        { label: 'Max', value: `$${Math.max(...detailHistory.map(p => p.usd)).toFixed(2)}` },
                        { label: 'Ortalama', value: `$${(detailHistory.reduce((s, p) => s + p.usd, 0) / detailHistory.length).toFixed(2)}` },
                        { label: 'Veri', value: `${detailHistory.length} ay` },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '0.7rem', padding: '0.6rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.15rem' }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => setWorldModalComm(faoDetailComm)}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                    >
                      🌍 Dünya Fiyatları
                    </button>
                    <button
                      onClick={() => setFaoDetailComm('')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', background: 'rgba(255,255,255,0.07)', color: '#cbd5e1' }}
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── World Comparison Modal ── */}
            {worldModalComm && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => setWorldModalComm('')}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ background: '#fff', borderRadius: '1.5rem', padding: '1.5rem', width: '100%', maxWidth: '1060px', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                        🌍 {getCommodityEmoji(worldModalComm)} {translateCommodity(worldModalComm)} — Dünya Fiyatları
                      </h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Kaynak: FAO GIEWS · USD cinsinden normalize edilmiş son aylık iç piyasa fiyatları
                      </p>
                    </div>
                    <button
                      onClick={() => setWorldModalComm('')}
                      style={{ padding: '0.5rem 1.1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}
                    >
                      ✕ Kapat
                    </button>
                  </div>

                  {/* Loading */}
                  {worldLoading && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Dünya geneli veriler yükleniyor...</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {worldSeries.length > 0
                          ? `${worldSeries.length} market serisi bulundu, fiyatlar alınıyor...`
                          : 'Tüm ülkeler taranıyor...'}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {worldError && !worldLoading && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', color: '#dc2626' }}>
                      ❌ {worldError}
                    </div>
                  )}

                  {/* No data */}
                  {!worldLoading && !worldError && worldRankings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.92rem' }}>
                      Bu ürün için dünya genelinde karşılaştırılabilir veri bulunamadı
                    </div>
                  )}

                  {/* Content */}
                  {!worldLoading && worldRankings.length > 0 && (
                    <>
                      {/* World KPIs */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {[
                          { icon: '🌐', label: 'Dünya Ortalaması', value: `$${worldAvg.toFixed(2)}`, sub: `${worldRankings.length} ülke` },
                          { icon: '🇹🇷', label: 'Türkiye Sırası', value: turkeyRank > 0 ? `#${turkeyRank}` : 'Veri yok', sub: `/ ${worldRankings.length} ülke` },
                          { icon: '💸', label: 'En Pahalı', value: `$${worldRankings[0]?.latestUsd.toFixed(2)}`, sub: (COUNTRY_TR[worldRankings[0]?.name] ?? worldRankings[0]?.name ?? '').slice(0, 18) },
                          { icon: '💚', label: 'En Ucuz', value: `$${worldRankings[worldRankings.length - 1]?.latestUsd.toFixed(2)}`, sub: (COUNTRY_TR[worldRankings[worldRankings.length - 1]?.name] ?? worldRankings[worldRankings.length - 1]?.name ?? '').slice(0, 18) },
                          { icon: '📊', label: 'Fiyat Uçurumu', value: worldSpread > 0 ? `${worldSpread.toFixed(1)}x` : '-', sub: 'en pahalı / en ucuz' },
                        ].map(kpi => (
                          <div key={kpi.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '0.85rem 0.65rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem' }}>{kpi.icon}</div>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0.2rem 0 0.1rem' }}>{kpi.label}</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{kpi.value}</div>
                            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.12rem' }}>{kpi.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Bar charts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {/* Most expensive */}
                        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '1rem', padding: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 700, color: '#dc2626' }}>💸 En Pahalı 10 Ülke</h4>
                          <ResponsiveContainer width="100%" height={270}>
                            <BarChart
                              data={worldRankings.slice(0, 10).map(r => ({ name: (COUNTRY_TR[r.name] ?? r.name).slice(0, 16), usd: parseFloat(r.latestUsd.toFixed(2)), iso3: r.iso3 }))}
                              layout="vertical"
                              margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
                            >
                              <XAxis type="number" fontSize={9} tickFormatter={(v: number) => `$${Number(v).toFixed(0)}`} stroke="#94a3b8" />
                              <YAxis type="category" dataKey="name" fontSize={9} width={98} stroke="#94a3b8" />
                              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'USD']} contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                              <Bar dataKey="usd" radius={[0, 4, 4, 0]}>
                                {worldRankings.slice(0, 10).map((r, i) => (
                                  <Cell key={r.iso3} fill={r.iso3 === 'TUR' ? '#3b82f6' : i === 0 ? '#dc2626' : '#f87171'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Cheapest */}
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 700, color: '#16a34a' }}>💚 En Ucuz 10 Ülke</h4>
                          <ResponsiveContainer width="100%" height={270}>
                            <BarChart
                              data={[...worldRankings].reverse().slice(0, 10).map(r => ({ name: (COUNTRY_TR[r.name] ?? r.name).slice(0, 16), usd: parseFloat(r.latestUsd.toFixed(2)), iso3: r.iso3 }))}
                              layout="vertical"
                              margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
                            >
                              <XAxis type="number" fontSize={9} tickFormatter={(v: number) => `$${Number(v).toFixed(0)}`} stroke="#94a3b8" />
                              <YAxis type="category" dataKey="name" fontSize={9} width={98} stroke="#94a3b8" />
                              <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'USD']} contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                              <Bar dataKey="usd" radius={[0, 4, 4, 0]}>
                                {[...worldRankings].reverse().slice(0, 10).map(r => (
                                  <Cell key={r.iso3} fill={r.iso3 === 'TUR' ? '#3b82f6' : '#22c55e'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Full ranking table */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
                        <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>📋 Tam Sıralama</h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{worldRankings.length} ülke · USD fiyatına göre ↓</span>
                        </div>
                        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                              <tr>
                                {['#', 'Ülke', 'USD Fiyat', 'Son Güncelleme', 'Market Sayısı'].map(h => (
                                  <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {worldRankings.map((r, i) => (
                                <tr
                                  key={r.iso3}
                                  style={{ background: r.iso3 === 'TUR' ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9', fontWeight: r.iso3 === 'TUR' ? 700 : 400 }}
                                >
                                  <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600, fontSize: '0.82rem' }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem', color: '#0f172a' }}>
                                    {r.iso3 === 'TUR' ? '🇹🇷 ' : ''}{COUNTRY_TR[r.name] ?? r.name}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: i < 3 ? '#dc2626' : i >= worldRankings.length - 3 ? '#16a34a' : '#0f172a' }}>
                                    ${r.latestUsd.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.78rem' }}>
                                    {new Date(r.latestDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' })}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', textAlign: 'center' }}>{r.marketCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.75rem' }}>
                        Kaynak: FAO GIEWS · Her ülke için en güncel aylık iç piyasa fiyatı · Türkiye satırı mavi ile vurgulanmıştır
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* ===== Uluslararası Emtia Tab ===== */}
      {activeTab === 'intl' && (() => {
        const INTL_CAT_ICONS: Record<string, string> = {
          'Tahıllar': '🌾', 'Gübre': '🧪', 'Enerji': '⚡', 'Yağlı Tohumlar': '🫘',
          'Et': '🥩', 'Süt': '🥛', 'Şeker & Tropikal': '🍬', 'Diğer': '🔗',
        };
        const INTL_CAT_COLORS: Record<string, string> = {
          'Tahıllar': '#f59e0b', 'Gübre': '#84cc16', 'Enerji': '#8b5cf6',
          'Yağlı Tohumlar': '#22c55e', 'Et': '#ef4444', 'Süt': '#38bdf8',
          'Şeker & Tropikal': '#f97316', 'Diğer': '#6366f1',
        };
        const INTL_CAT_ORDER = ['Tahıllar', 'Gübre', 'Enerji', 'Yağlı Tohumlar', 'Et', 'Süt', 'Şeker & Tropikal', 'Diğer'];
        const getIntlCategory = (serie: GiewsSerie): string => {
          const code = serie.commodity_code ?? '';
          if (code.startsWith('OIL_')) return 'Enerji';
          if (code.startsWith('FERT_')) return 'Gübre';
          if (code.startsWith('CMM04')) return 'Süt';
          if (code.startsWith('CMM02')) return 'Et';
          if (code.startsWith('CMM10')) return 'Tahıllar';
          if (code.startsWith('CMM12') || code.startsWith('CMM15')) return 'Yağlı Tohumlar';
          if (code.startsWith('CMM17') || code.startsWith('CMM09') || code.startsWith('CMM08')) return 'Şeker & Tropikal';
          return 'Diğer';
        };
        const catGroups: Record<string, { serie: GiewsSerie; history: GiewsDatapoint[] }[]> = {};
        for (const serie of intlSeries) {
          const cat = getIntlCategory(serie);
          if (!catGroups[cat]) catGroups[cat] = [];
          const history = intlPriceMap.get(serie.uuid) ?? [];
          catGroups[cat].push({ serie, history });
        }
        const orderedCats = INTL_CAT_ORDER.filter(c => catGroups[c]);
        const visibleCats = intlCategoryFilter === 'all' ? orderedCats : orderedCats.filter(c => c === intlCategoryFilter);
        const totalSeries = intlSeries.length;
        const rising = Array.from(intlPriceMap.values()).filter(h => h[0] && h[1] && h[0].price_value > h[1].price_value).length;
        const latestDate = Array.from(intlPriceMap.values()).flatMap(h => h[0]?.date ? [h[0].date] : []).sort().at(-1);
        return (
          <div>
            {intlLoading && (
              <div className="loading"><div className="loading-spinner" /><p>Uluslararası emtia fiyatları yükleniyor... (90 seri)</p></div>
            )}
            {intlError && !intlLoading && (
              <div style={{ color: '#ef4444', padding: '1rem', textAlign: 'center' }}>❌ {intlError}</div>
            )}
            {!intlLoading && !intlError && intlSeries.length === 0 && (
              <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
                Uluslararası emtia verisi yüklenemedi. Sayfayı yenileyin.
              </div>
            )}
            {!intlLoading && !intlError && intlSeries.length > 0 && (
              <>
                {/* Info bar */}
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.75rem', padding: '0.6rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#0369a1' }}>
                  🌐 <strong>FAO FPMA</strong> — Food Price Monitoring &amp; Analysis · Dünya Bankası Pink Sheet · IGC · USDA · Tümü USD bazında, aylık
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">TOPLAM SERİ</span></div>
                    <div className="kpi-value">{totalSeries}</div>
                    <div className="kpi-subtitle">Uluslararası fiyat serisi</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">KATEGORİ</span></div>
                    <div className="kpi-value">{orderedCats.length}</div>
                    <div className="kpi-subtitle">Emtia grubu</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">YÜKSELENLER</span><span className="kpi-icon green">📈</span></div>
                    <div className="kpi-value text-green-400">{rising}</div>
                    <div className="kpi-subtitle">Aylık bazda artan</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">SON VERİ</span></div>
                    <div className="kpi-value" style={{ fontSize: '1.55rem' }}>
                      {latestDate ? new Date(latestDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }) : '-'}
                    </div>
                    <div className="kpi-subtitle">FAO FPMA aylık</div>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="date-filter" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['all', ...orderedCats].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setIntlCategoryFilter(cat)}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: '0.75rem',
                          border: intlCategoryFilter === cat ? 'none' : '1px solid #e2e8f0',
                          cursor: 'pointer', fontSize: '0.85rem',
                          fontWeight: intlCategoryFilter === cat ? 700 : 500,
                          background: intlCategoryFilter === cat ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : '#ffffff',
                          color: intlCategoryFilter === cat ? '#fff' : '#475569',
                          boxShadow: intlCategoryFilter === cat ? '0 2px 8px rgba(14,165,233,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {cat === 'all' ? '🌐 Tümü' : `${INTL_CAT_ICONS[cat] || '📦'} ${cat}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category sections */}
                {visibleCats.map(cat => (
                  <div key={cat} style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {INTL_CAT_ICONS[cat]} {cat}
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>({catGroups[cat].length} seri)</span>
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {catGroups[cat].map(({ serie, history }) => {
                        const latest = history[0];
                        const pct = (latest && history[1] && history[1].price_value)
                          ? ((latest.price_value - history[1].price_value) / history[1].price_value) * 100
                          : null;
                        const sparkData = history.slice(0, 12).reverse().map(p => ({ v: p.price_value }));
                        return (
                          <div
                            key={serie.uuid}
                            onClick={() => { setIntlSelected(serie); setIntlSelectedHistory(history); }}
                            style={{
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem',
                              padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                              borderTop: `4px solid ${INTL_CAT_COLORS[cat] || '#6366f1'}`,
                            }}
                            className="hover:shadow-md"
                          >
                            <div style={{ marginBottom: '0.5rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.3, marginBottom: '0.2rem' }}>
                                {serie.commodity_name.length > 48 ? serie.commodity_name.slice(0, 48) + '…' : serie.commodity_name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{serie.market_name}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                              <div>
                                {latest ? (
                                  <>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                                      ${latest.price_value < 100
                                        ? latest.price_value.toFixed(2)
                                        : Math.round(latest.price_value).toLocaleString('en-US')}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                      /{serie.measure_unit_label} · {new Date(latest.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' })}
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Veri yok</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                {pct != null && (
                                  <div style={{
                                    fontSize: '0.8rem', fontWeight: 700,
                                    color: pct >= 0 ? '#16a34a' : '#dc2626',
                                    background: pct >= 0 ? '#f0fdf4' : '#fef2f2',
                                    padding: '0.2rem 0.5rem', borderRadius: '0.4rem',
                                  }}>
                                    {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                                  </div>
                                )}
                                {sparkData.length > 2 && (
                                  <div style={{ width: 80, height: 32 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={sparkData}>
                                        <Line type="monotone" dataKey="v" stroke={pct == null || pct >= 0 ? '#22c55e' : '#ef4444'} strokeWidth={1.5} dot={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Detail Modal */}
            {intlSelected && (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 1000,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                }}
                onClick={() => setIntlSelected(null)}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem',
                    width: '100%', maxWidth: '820px', maxHeight: '90vh', overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                    {intlSelected.commodity_name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                    {intlSelected.market_name} · {intlSelected.price_type} · {intlSelected.source_name?.split(';')[0]}
                  </p>

                  {/* Stats */}
                  {(() => {
                    const h = intlSelectedHistory;
                    const latest = h[0];
                    const prev = h[1];
                    const prevYear = h.find(p => {
                      if (!latest?.date) return false;
                      const d1 = new Date(latest.date);
                      const d2 = new Date(p.date);
                      const diffMonths = (d1.getFullYear() - d2.getFullYear()) * 12 + d1.getMonth() - d2.getMonth();
                      return diffMonths >= 11 && diffMonths <= 13;
                    });
                    const avg12 = h.slice(0, 12).reduce((s, p) => s + p.price_value, 0) / Math.min(h.length, 12);
                    const momPct = latest && prev && prev.price_value ? ((latest.price_value - prev.price_value) / prev.price_value) * 100 : null;
                    const yoyPct = latest && prevYear && prevYear.price_value ? ((latest.price_value - prevYear.price_value) / prevYear.price_value) * 100 : null;
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                        {[
                          { label: 'Son Fiyat', val: latest ? `$${latest.price_value < 100 ? latest.price_value.toFixed(2) : Math.round(latest.price_value).toLocaleString('en-US')}` : '-', color: '#f8fafc' },
                          { label: 'Aylık Değ.', val: momPct != null ? `${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}%` : '-', color: momPct == null ? '#94a3b8' : momPct >= 0 ? '#22c55e' : '#ef4444' },
                          { label: 'Yıllık Değ.', val: yoyPct != null ? `${yoyPct >= 0 ? '+' : ''}${yoyPct.toFixed(1)}%` : '-', color: yoyPct == null ? '#94a3b8' : yoyPct >= 0 ? '#22c55e' : '#ef4444' },
                          { label: '12A Ort.', val: h.length ? `$${avg12 < 100 ? avg12.toFixed(2) : Math.round(avg12).toLocaleString('en-US')}` : '-', color: '#94a3b8' },
                        ].map(stat => (
                          <div key={stat.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.val}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Chart */}
                  {intlSelectedHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={[...intlSelectedHistory].reverse().map(p => ({
                        date: new Date(p.date).toLocaleDateString('tr-TR', { year: '2-digit', month: 'short' }),
                        price: p.price_value,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)" fontSize={10} domain={['auto', 'auto']}
                          tickFormatter={(v: number) => `$${Number(v) < 100 ? Number(v).toFixed(1) : Math.round(Number(v)).toLocaleString('en-US')}`}
                        />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#f1f5f9' }}
                          formatter={(v: number) => [`$${Number(v) < 100 ? Number(v).toFixed(2) : Math.round(Number(v)).toLocaleString('en-US')}`, `/${intlSelected.measure_unit_label}`]}
                        />
                        <Line type="monotone" dataKey="price" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Grafik için yeterli veri yok</div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '0.5rem' }}>
                    Kaynak: FAO FPMA · {intlSelected.source_name} · {intlSelected.price_type}
                  </div>
                  <button
                    onClick={() => setIntlSelected(null)}
                    style={{
                      marginTop: '1rem', width: '100%', padding: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '0.75rem', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.9rem',
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
