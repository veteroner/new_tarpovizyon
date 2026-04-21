import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Treemap
} from 'recharts';
import { fetchQuery } from '../services/api';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';
import * as XLSX from 'xlsx';

// Helper function to normalize Turkish characters for matching
const normalizeTurkish = (str: string) => {
  if (!str) return '';
  return str
    .replace(/\u0130/g, 'i')   // U+0130 Latin Capital Letter I With Dot Above (İ)
    .replace(/I/g, 'i')         // ASCII uppercase I
    .toLowerCase()
    .replace(/\u0307/g, '')    // Remove combining dot above (artifact of İ.toLowerCase())
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/ê/g, 'e')
    .replace(/î/g, 'i')
    .replace(/ô/g, 'o')
    .replace(/û/g, 'u')
    .replace(/\s+/g, ' ')  // Normalize spaces
    .trim();
};

// District Map Component
interface DistrictMapProps {
  basinData: BasinData[];
  basinColors: Record<string, string>;
  filterBasin?: string;
  filterProvince?: string;
  filterDistrict?: string;
  selectedDistrict?: string | null;
  onDistrictClick?: (district: string, province: string, basin: string) => void;
}

function DistrictMap({ basinData, basinColors, filterBasin, filterProvince, filterDistrict, selectedDistrict, onDistrictClick }: DistrictMapProps) {
  const [geoData, setGeoData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ district: string; basin: string; province: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const shouldExcludeDistrictFeature = (feature: Record<string, unknown>) => {
    const properties = feature?.properties as Record<string, string> | undefined;
    const districtName = properties?.name || properties?.NAME || '';
    const provinceName = properties?.province || '';
    const normalizedProvince = normalizeTurkish(provinceName);
    const normalizedDistrict = normalizeTurkish(districtName);

    if (normalizedProvince !== 'mugla') return false;

    if (normalizedDistrict === 'kara ada') return true;

    const hasGreekChars = /[\u0370-\u03FF]/.test(districtName);
    return hasGreekChars;
  };

  useEffect(() => {
    fetch('/turkey_districts.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('District GeoJSON load error:', err);
        setLoading(false);
      });
  }, []);

  // Create district-to-basin mapping
  const districtBasinMap = useMemo(() => {
    const map = new Map<string, { basin: string; color: string; province: string }>();
    
    // Specific district name overrides: GeoJSON name → DB name (after normalization)
    // These are renamed/reorganized districts
    const districtOverrides: Record<string, string> = {
      'eyupsultan': 'eyup',           // İstanbul: Eyüpsultan renamed from Eyüp
      'kahramankazan': 'kazan',       // Ankara: Kahramankazan renamed from Kazan
      'yesilyu rt': 'yesilyurt',      // cleanup
      'elazig merkez': 'elazig',      // Elazığ Merkez → Elazığ
    };
    
    // Hardcoded overrides for new districts formed after 2012 (not in DB yet)
    // Each maps to its parent district's basin
    const newDistrictBasins: Record<string, string> = {
      'aksaray-sultanhani':   'ORTA ANADOLU HAVZASI',   // split from Aksaray Merkez
      'artvin-kemalpasa':     'CORUH HAVZASI',           // split from Artvin Merkez (normalized)
      'elazig-aricak':        'FIRAT HAVZASI',           // split from Elazığ Merkez
      'hakkari-derecik':      'ZAP HAVZASI',             // split from Şemdinli
      'hatay-defne':          'DOGU AKDENIZ HAVZASI',    // split from Antakya (normalized)
      'hatay-arsuz':          'KIYI AKDENIZ HAVZASI',    // split from İskenderun (normalized)
      'hatay-payas':          'KIYI AKDENIZ HAVZASI',    // split from İskenderun (normalized)
      'mardin-artuklu':       'KARACADAG HAVZASI',       // split from Mardin center (normalized)
      'sanliurfa-haliliye':   'GAP HAVZASI',             // split from Şanlıurfa Merkez
      'sanliurfa-eyyubiye':   'GAP HAVZASI',             // split from Şanlıurfa Merkez
      'sanliurfa-karakopru':  'GAP HAVZASI',             // split from Şanlıurfa Merkez
      'siirt-tillo':          'KARACADAG HAVZASI',       // split from Siirt Merkez (normalized)
      'yozgat-akdagmadeni':   'ORTA KIZILIRMAK HAVZASI', // split from Yozgat Merkez
      'yozgat-cayiralan':     'ORTA KIZILIRMAK HAVZASI', // split from Yozgat Merkez
      'zonguldak-kozlu':      'BATI KARADENIZ HAVZASI',  // split from Zonguldak Merkez (normalized)
      'zonguldak-kilimli':    'BATI KARADENIZ HAVZASI',  // split from Zonguldak Merkez (normalized)
    };

    Object.entries(newDistrictBasins).forEach(([key, basinNameNormalized]) => {
      // Find the real basin name from basinColors keys (they use Turkish chars)
      // Compare case-insensitively since our lookup values are uppercase ASCII
      const normalizedLookup = basinNameNormalized.toLowerCase();
      const realBasinName = Object.keys(basinColors).find(
        bn => normalizeTurkish(bn) === normalizedLookup
      ) || basinNameNormalized;
      const [provKey] = key.split('-');
      map.set(key, {
        basin: realBasinName,
        color: basinColors[realBasinName] || '#95a5a6',
        province: provKey
      });
    });

    basinData.forEach(item => {
      const normalizedProvince = normalizeTurkish(item.provinceName);
      
      // Strip " / Province" suffix from district names (DB format: "Gönen / Balıkesir")
      const rawDistrict = item.districtName.replace(/\s*\/\s*[^/]+$/, '').trim();
      const normalizedDistrict = normalizeTurkish(rawDistrict);
      
      const value = {
        basin: item.basinName,
        color: basinColors[item.basinName] || '#95a5a6',
        province: item.provinceName
      };
      
      // Add main mapping
      map.set(`${normalizedProvince}-${normalizedDistrict}`, value);
      
      // Also add with original (un-stripped) name as fallback
      const fullNormalized = normalizeTurkish(item.districtName);
      if (fullNormalized !== normalizedDistrict) {
        map.set(`${normalizedProvince}-${fullNormalized}`, value);
      }
      
      // Add override mappings (GeoJSON key → same value)
      Object.entries(districtOverrides).forEach(([geoKey, dbKey]) => {
        if (dbKey === normalizedDistrict) {
          map.set(`${normalizedProvince}-${geoKey}`, value);
        }
      });
    });
    
    return map;
  }, [basinData, basinColors]);

  const filteredFeatures = useMemo(() => {
    if (!geoData?.features) return [];
    const features = geoData.features as Record<string, unknown>[];
    return features.filter((feature: Record<string, unknown>) => !shouldExcludeDistrictFeature(feature));
  }, [geoData, shouldExcludeDistrictFeature]);

  if (loading) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        🗺️ İlçe haritası yükleniyor...
      </div>
    );
  }

  if (!geoData) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--error)'
      }}>
        ❌ İlçe haritası yüklenemedi
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg 
        viewBox="0 0 1200 700" 
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          aspectRatio: '1200 / 700',
          background: 'var(--bg-secondary)',
          borderRadius: '12px'
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {/* Pass 1: fat same-color stroke to fill coordinate gaps between adjacent districts */}
        {filteredFeatures.map((feature: Record<string, unknown>, idx: number) => {
          const properties = feature.properties as Record<string, string> | undefined;
          const districtName = properties?.name || properties?.NAME || '';
          const provinceName = properties?.province || '';
          const key = `${normalizeTurkish(provinceName)}-${normalizeTurkish(districtName)}`;
          const basinInfo = districtBasinMap.get(key);
          const color = basinInfo?.color || 'transparent';
          if (!basinInfo) return null;

          const geometry = feature.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates;
          if (!coords) return null;
          const geomType = geometry?.type;
          const polygons = geomType === 'Polygon' ? [coords] : coords;
          const pathData = (polygons as unknown[][]).map((polygon: unknown[]) =>
            (polygon as unknown[][]).map((ring: unknown[]) =>
              (ring as number[][]).map((point: number[], i: number) => {
                const x = (point[0] - 25) * 50 + 50;
                const y = (43 - point[1]) * 80 + 50;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')
            ).join(' Z ') + ' Z'
          ).join(' ');

          return (
            <path
              key={`gap-${idx}`}
              d={pathData}
              fill={color}
              stroke={color}
              strokeWidth={14}
              strokeLinejoin="round"
              strokeLinecap="round"
              paintOrder="stroke"
            />
          );
        })}

        {/* Pass 2: thin white borders + hover + click interaction */}
        {filteredFeatures.map((feature: Record<string, unknown>, idx: number) => {
          const properties = feature.properties as Record<string, string> | undefined;
          const districtName = properties?.name || properties?.NAME || '';
          const provinceName = properties?.province || '';
          const key = `${normalizeTurkish(provinceName)}-${normalizeTurkish(districtName)}`;
          const basinInfo = districtBasinMap.get(key);
          if (!basinInfo) return null;

          // Filter: dim non-matching features
          const matchesBasin = !filterBasin || filterBasin === 'Tümü' || basinInfo.basin === filterBasin;
          const matchesProvince = !filterProvince || filterProvince === 'Tümü' || basinInfo.province === provinceName;
          const matchesDistrict = !filterDistrict || filterDistrict === 'Tümü' || districtName === filterDistrict;
          const isFiltered = !matchesBasin || !matchesProvince || !matchesDistrict;
          const isSelected = selectedDistrict === `${provinceName}||${districtName}`;

          const color = basinInfo.color;

          const geometry = feature.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates;
          if (!coords) return null;
          const geomType = geometry?.type;
          const polygons = geomType === 'Polygon' ? [coords] : coords;
          const pathData = (polygons as unknown[][]).map((polygon: unknown[]) =>
            (polygon as unknown[][]).map((ring: unknown[]) =>
              (ring as number[][]).map((point: number[], i: number) => {
                const x = (point[0] - 25) * 50 + 50;
                const y = (43 - point[1]) * 80 + 50;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')
            ).join(' Z ') + ' Z'
          ).join(' ');

          return (
            <path
              key={`border-${idx}`}
              d={pathData}
              fill={color}
              stroke={isSelected ? 'white' : 'rgba(255,255,255,0.7)'}
              strokeWidth={isSelected ? 2.5 : 0.6}
              strokeLinejoin="round"
              opacity={isFiltered ? 0.12 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => {
                if (!isFiltered) {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                  e.currentTarget.style.stroke = 'white';
                  e.currentTarget.style.strokeWidth = '1.5';
                  setTooltip({ district: districtName, basin: basinInfo.basin, province: basinInfo.province });
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = '';
                e.currentTarget.style.stroke = isSelected ? 'white' : 'rgba(255,255,255,0.7)';
                e.currentTarget.style.strokeWidth = isSelected ? '2.5' : '0.6';
                setTooltip(null);
              }}
              onClick={() => {
                if (!isFiltered && onDistrictClick) {
                  onDistrictClick(districtName, provinceName, basinInfo.basin);
                }
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: mousePos.x + 15,
          top: mousePos.y + 15,
          background: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{tooltip.district}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>📍 {tooltip.province}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>🌊 {tooltip.basin}</div>
        </div>
      )}
    </div>
  );
}

// Havza renkleri - tarpo_bitkisel_harita/data/havza_renkleri.json'dan
const BASIN_COLORS: Record<string, string> = {
  'BATI GAP HAVZASI': '#e74c3c',
  'BATI KARADENİZ HAVZASI': '#3498db',
  'BÜYÜK AĞRI HAVZASI': '#9b59b6',
  'DOĞU AKDENİZ HAVZASI': '#e67e22',
  'DOĞU KARADENİZ HAVZASI': '#1abc9c',
  'EGE YAYLA HAVZASI': '#f1c40f',
  'ERCİYES HAVZASI': '#e91e63',
  'FIRAT HAVZASI': '#795548',
  'GAP HAVZASI': '#ff5722',
  'GEDİZ HAVZASI': '#8bc34a',
  'GÖLLER HAVZASI': '#00bcd4',
  'GÜNEY MARMARA HAVZASI': '#673ab7',
  'İÇ EGE HAVZASI': '#cddc39',
  'KARACADAĞ HAVZASI': '#ff9800',
  'KARASU – ARAS HAVZASI': '#f44336',
  'KAZ DAĞLARI HAVZASI': '#4caf50',
  'KIYI AKDENİZ HAVZASI': '#2196f3',
  'KIYI EGE HAVZASI': '#9c27b0',
  'KUZEY MARMARA HAVZASI': '#607d8b',
  'KUZEYBATI ANADOLU HAVZASI': '#009688',
  'MERİÇ HAVZASI': '#3f51b5',
  'ORTA ANADOLU HAVZASI': '#ffc107',
  'ORTA KARADENİZ HAVZASI': '#03a9f4',
  'ORTA KIZILIRMAK HAVZASI': '#ff4081',
  'SÖĞÜT HAVZASI': '#8d6e63',
  'VAN GÖLÜ HAVZASI': '#7c4dff',
  'YEŞİLIRMAK HAVZASI': '#00e676',
  'YUKARI FIRAT HAVZASI': '#d500f9',
  'ZAP HAVZASI': '#ff6e40',
  'ÇORUH HAVZASI': '#40c4ff'
};

// Types
interface BasinData {
  id: string;
  basinId: string;
  basinName: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
}

interface BasinSummary {
  basinName: string;
  provinceCount: number;
  districtCount: number;
  color: string;
}

interface ProvinceBasinData {
  province: string;
  dominantBasin: string;
  basinCount: number;
  districtCount: number;
  color: string;
}

interface DistrictProduct {
  urun: string;
}

interface DistrictProductionItem {
  urun: string;
  urun_grup: string;
  y2024: string;
}

interface TopProduct {
  urun: string;
  toplam_ton: string;
}

interface ProvinceDiversity {
  ili: string;
  cesit_sayisi: string;
}

interface BasinProduct {
  urun: string;
  toplam_ton: string;
}

interface ProductLeader {
  ili?: string;
  yer?: string;
  toplam_ton: string;
}

interface TrendDataPoint {
  year: string;
  [productName: string]: string | number;
}

interface ProvinceProductDistribution {
  ili: string;
  toplam_ton: string;
}

interface BasinProductionStats {
  basinName: string;
  toplam_uretim: number;
  urun_cesit: number;
  color: string;
}

export default function BasinProductionPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'basins' | 'provinces' | 'districts'>('overview');
  const [selectedBasin, _setSelectedBasin] = useState<string>('Tümü');
  const [selectedProvince, setSelectedProvince] = useState<string>('Tümü');
  const [searchTerm, _setSearchTerm] = useState('');
  // District tab filters
  const [mapFilterBasin, setMapFilterBasin] = useState<string>('Tümü');
  const [mapFilterProvince, setMapFilterProvince] = useState<string>('Tümü');
  const [mapFilterDistrict, setMapFilterDistrict] = useState<string>('Tümü');
  // Selected district for product cards
  const [selectedMapDistrict, setSelectedMapDistrict] = useState<{ key: string; name: string; province: string; basin: string } | null>(null);
  const [districtProducts, setDistrictProducts] = useState<DistrictProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [districtProduction, setDistrictProduction] = useState<DistrictProductionItem[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingTopProducts, setLoadingTopProducts] = useState(false);
  const [provinceDiversity, setProvinceDiversity] = useState<ProvinceDiversity[]>([]);
  const [loadingDiversity, setLoadingDiversity] = useState(false);
  const [selectedBasinForAnalysis, setSelectedBasinForAnalysis] = useState<string | null>(null);
  const [basinProducts, setBasinProducts] = useState<BasinProduct[]>([]);
  const [loadingBasinProducts, setLoadingBasinProducts] = useState(false);
  // Product Leaders analytics
  const [selectedProductForLeaders, setSelectedProductForLeaders] = useState<string>('');
  const [provinceLeaders, setProvinceLeaders] = useState<ProductLeader[]>([]);
  const [districtLeaders, setDistrictLeaders] = useState<ProductLeader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  // Trend Analysis analytics
  const [selectedProductsForTrend, setSelectedProductsForTrend] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  // Geographic Distribution analytics
  const [selectedProductForMap, setSelectedProductForMap] = useState<string>('');
  const [productDistribution, setProductDistribution] = useState<ProvinceProductDistribution[]>([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  // Basin Production Statistics
  const [basinProductionStats, setBasinProductionStats] = useState<BasinProductionStats[]>([]);
  const [loadingBasinStats, setLoadingBasinStats] = useState(false);

  const [allBasinData, setAllBasinData] = useState<BasinData[]>([]);
  const [basinSummary, setBasinSummary] = useState<BasinSummary[]>([]);
  const [provinceBasinData, setProvinceBasinData] = useState<ProvinceBasinData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all basin data
  const loadBasinData = useCallback(async () => {
    try {
      setLoading(true);
      const query = `
        SELECT 
          id,
          havid as basinId,
          havad as basinName,
          ilid as provinceId,
          ilad as provinceName,
          ilceid as districtId,
          ilcead as districtName
        FROM havza
        ORDER BY havad, ilad, ilcead
      `;
      
      const response = await fetchQuery(query);
      const data: BasinData[] = (response.data || []).map((row: Record<string, string | number>) => ({
        id: String(row.id),
        basinId: String(row.basinId),
        basinName: String(row.basinName || '').trim(),
        provinceId: String(row.provinceId),
        provinceName: String(row.provinceName || ''),
        districtId: String(row.districtId),
        districtName: String(row.districtName || '')
      }));
      
      setAllBasinData(data);
    } catch (error) {
      console.error('Error loading basin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load top products by tonnage (Turkey-wide)
  const loadTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    try {
      const query = `SELECT urun, SUM(y2024+0) as toplam_ton FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND birim='Ton' AND (y2024+0) > 0 GROUP BY urun ORDER BY toplam_ton DESC LIMIT 12`;
      const response = await fetchQuery(query);
      setTopProducts((response.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (error) {
      console.error('Error loading top products:', error);
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  // Load province diversity (unique product count per province)
  const loadProvinceDiversity = useCallback(async () => {
    setLoadingDiversity(true);
    try {
      const query = `SELECT ili, COUNT(DISTINCT urun) as cesit_sayisi FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND (y2024+0) > 0 GROUP BY ili ORDER BY cesit_sayisi DESC`;
      const response = await fetchQuery(query);
      setProvinceDiversity((response.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        cesit_sayisi: String(r.cesit_sayisi || '0')
      })));
    } catch (error) {
      console.error('Error loading province diversity:', error);
    } finally {
      setLoadingDiversity(false);
    }
  }, []);

  // Load basin products (top products by selected basin)
  const loadBasinProducts = useCallback(async (basinName: string) => {
    setLoadingBasinProducts(true);
    setBasinProducts([]);
    try {
      // Get districts in this basin
      const basinDistricts = allBasinData.filter(d => d.basinName === basinName);
      
      // Group by province
      const byProvince = new Map<string, Set<string>>();
      basinDistricts.forEach(d => {
        if (!byProvince.has(d.provinceName)) {
          byProvince.set(d.provinceName, new Set());
        }
        byProvince.get(d.provinceName)!.add(d.districtName);
      });

      // Build WHERE clause
      const conditions: string[] = [];
      byProvince.forEach((districts, province) => {
        conditions.push(`(UPPER(ili)=UPPER('${province.replace(/'/g, "''")}') AND UPPER(yer) IN (${Array.from(districts).map(d => `UPPER('${d.replace(/'/g, "''")}')`).join(',')}))`);
      });

      if (conditions.length === 0) {
        setLoadingBasinProducts(false);
        return;
      }

      const whereClause = conditions.join(' OR ');
      const query = `SELECT urun, SUM(y2024+0) as toplam_ton FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND birim='Ton' AND (y2024+0) > 0 AND (${whereClause}) GROUP BY urun ORDER BY toplam_ton DESC LIMIT 15`;
      
      const response = await fetchQuery(query);
      setBasinProducts((response.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (error) {
      console.error('Error loading basin products:', error);
    } finally {
      setLoadingBasinProducts(false);
    }
  }, [allBasinData]);

  useEffect(() => {
    loadBasinData();
    loadTopProducts();
    loadProvinceDiversity();
  }, [loadBasinData, loadTopProducts, loadProvinceDiversity]);

  // Load district desen (crop pattern) from havzalist
  const loadDistrictProducts = useCallback(async (districtName: string, provinceName: string) => {
    setLoadingProducts(true);
    setDistrictProducts([]);
    try {
      const query = `SELECT desen FROM havzalist WHERE UPPER(ilad) = UPPER('${provinceName}') AND UPPER(ilcead) = UPPER('${districtName}') LIMIT 1`;
      const response = await fetchQuery(query);
      const row = (response.data || [])[0];
      if (row?.desen) {
        const urunler = String(row.desen)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .map((urun: string) => ({ urun }));
        setDistrictProducts(urunler);
      }
    } catch (e) {
      console.error('District desen load error:', e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadDistrictProduction = useCallback(async (districtName: string, provinceName: string) => {
    setLoadingProduction(true);
    setDistrictProduction([]);
    try {
      const q = `SELECT urun, urun_grup, y2024 FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND UPPER(ili)=UPPER('${provinceName}') AND UPPER(yer)=UPPER('${districtName}') AND unsur='Üretim' AND (y2024+0) > 0 ORDER BY (y2024+0) DESC LIMIT 20`;
      const resp = await fetchQuery(q);
      setDistrictProduction((resp.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        urun_grup: String(r.urun_grup || ''),
        y2024: String(r.y2024 || '0')
      })));
    } catch (e) {
      console.error('District production load error:', e);
    } finally {
      setLoadingProduction(false);
    }
  }, []);

  const handleDistrictClick = useCallback((districtName: string, provinceName: string, basinName: string) => {
    const key = `${provinceName}||${districtName}`;
    setSelectedMapDistrict({ key, name: districtName, province: provinceName, basin: basinName });
    setMapFilterProvince(provinceName);
    setMapFilterDistrict(districtName);
    loadDistrictProducts(districtName, provinceName);
    loadDistrictProduction(districtName, provinceName);
  }, [loadDistrictProducts, loadDistrictProduction]);

  // Product Leaders: Top provinces and districts for a specific product
  const loadProductLeaders = useCallback(async (productName: string) => {
    if (!productName) return;
    setLoadingLeaders(true);
    try {
      // Top 10 provinces
      const provinceQuery = `
        SELECT ili, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili
        ORDER BY toplam_ton DESC
        LIMIT 10
      `;
      const provinceResp = await fetchQuery(provinceQuery);
      setProvinceLeaders((provinceResp.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));

      // Top 10 districts
      const districtQuery = `
        SELECT ili, yer, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili, yer
        ORDER BY toplam_ton DESC
        LIMIT 10
      `;
      const districtResp = await fetchQuery(districtQuery);
      setDistrictLeaders((districtResp.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        yer: String(r.yer || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (e) {
      console.error('Product leaders load error:', e);
    } finally {
      setLoadingLeaders(false);
    }
  }, []);

  // Trend Analysis: Multi-year production data for selected products
  const loadTrendData = useCallback(async (productNames: string[]) => {
    if (productNames.length === 0) return;
    setLoadingTrend(true);
    try {
      // Build WHERE clause for multiple products
      const productConditions = productNames
        .map(p => `UPPER(urun) = UPPER('${p.replace(/'/g, "''")}')`)
        .join(' OR ');

      const query = `
        SELECT 
          urun,
          SUM(y2004+0) as y2004, SUM(y2005+0) as y2005, SUM(y2006+0) as y2006, SUM(y2007+0) as y2007,
          SUM(y2008+0) as y2008, SUM(y2009+0) as y2009, SUM(y2010+0) as y2010, SUM(y2011+0) as y2011,
          SUM(y2012+0) as y2012, SUM(y2013+0) as y2013, SUM(y2014+0) as y2014, SUM(y2015+0) as y2015,
          SUM(y2016+0) as y2016, SUM(y2017+0) as y2017, SUM(y2018+0) as y2018, SUM(y2019+0) as y2019,
          SUM(y2020+0) as y2020, SUM(y2021+0) as y2021, SUM(y2022+0) as y2022, SUM(y2023+0) as y2023,
          SUM(y2024+0) as y2024
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND (${productConditions})
        GROUP BY urun
      `;
      
      const response = await fetchQuery(query);
      const rawData = response.data || [];
      
      // Transform data from product-rows to year-rows
      const years = Array.from({ length: 21 }, (_, i) => 2004 + i);
      const transformed: TrendDataPoint[] = years.map(year => {
        const dataPoint: TrendDataPoint = { year: String(year) };
        rawData.forEach((row: Record<string, string | number>) => {
          const productName = String(row.urun || '');
          dataPoint[productName] = Number(row[`y${year}`] || 0);
        });
        return dataPoint;
      });
      
      setTrendData(transformed);
    } catch (e) {
      console.error('Trend data load error:', e);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  // Geographic Distribution: Province-level production for a specific product
  const loadProductDistribution = useCallback(async (productName: string) => {
    if (!productName) return;
    setLoadingDistribution(true);
    try {
      const query = `
        SELECT ili, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili
        ORDER BY toplam_ton DESC
      `;
      const response = await fetchQuery(query);
      setProductDistribution((response.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (e) {
      console.error('Product distribution load error:', e);
    } finally {
      setLoadingDistribution(false);
    }
  }, []);

  // Load basin production statistics
  const loadBasinProductionStats = useCallback(async () => {
    setLoadingBasinStats(true);
    try {
      const stats: BasinProductionStats[] = [];
      
      for (const basin of basinSummary) {
        // Get districts for this basin
        const basinDistricts = allBasinData.filter(d => d.basinName === basin.basinName);
        
        // Group by province
        const byProvince = new Map<string, Set<string>>();
        basinDistricts.forEach(d => {
          const cleanDistrict = d.districtName.replace(/\s*\/\s*[^/]+$/, '').trim();
          if (!byProvince.has(d.provinceName)) {
            byProvince.set(d.provinceName, new Set());
          }
          byProvince.get(d.provinceName)!.add(cleanDistrict);
        });

        // Build WHERE clause
        const conditions: string[] = [];
        byProvince.forEach((districts, province) => {
          const districtList = Array.from(districts)
            .map(d => `UPPER('${d.replace(/'/g, "''")}')`)
            .join(', ');
          conditions.push(`(UPPER(ili)=UPPER('${province.replace(/'/g, "''")}') AND UPPER(yer) IN (${districtList}))`);
        });

        if (conditions.length === 0) continue;

        const whereClause = conditions.join(' OR ');
        
        // Query total production and product count
        const query = `
          SELECT 
            SUM(y2024+0) as toplam_uretim,
            COUNT(DISTINCT urun) as urun_cesit
          FROM tuik_bitkisel_uretim
          WHERE duzey='ilçe' 
            AND unsur='Üretim' 
            AND birim='Ton'
            AND (y2024+0) > 0
            AND (${whereClause})
        `;
        
        const response = await fetchQuery(query);
        const row = (response.data || [])[0];
        
        if (row) {
          stats.push({
            basinName: basin.basinName,
            toplam_uretim: Number(row.toplam_uretim || 0),
            urun_cesit: Number(row.urun_cesit || 0),
            color: basin.color
          });
        }
      }
      
      // Sort by production
      stats.sort((a, b) => b.toplam_uretim - a.toplam_uretim);
      setBasinProductionStats(stats);
    } catch (e) {
      console.error('Basin production stats load error:', e);
    } finally {
      setLoadingBasinStats(false);
    }
  }, [allBasinData, basinSummary]);

  // Load basin production stats when basin data is ready
  useEffect(() => {
    if (basinSummary.length > 0 && allBasinData.length > 0) {
      loadBasinProductionStats();
    }
  }, [basinSummary, allBasinData, loadBasinProductionStats]);

  // District filter options derived from allBasinData
  const mapProvinces = useMemo(() => {
    const prov = new Set<string>();
    allBasinData.forEach(d => prov.add(d.provinceName));
    return Array.from(prov).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allBasinData]);

  const mapDistricts = useMemo(() => {
    return allBasinData
      .filter(d => mapFilterProvince === 'Tümü' || d.provinceName === mapFilterProvince)
      .map(d => d.districtName.replace(/\s*\/\s*[^/]+$/, '').trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allBasinData, mapFilterProvince]);

  // Calculate basin summary statistics
  useEffect(() => {
    if (allBasinData.length === 0) return;

    const basinMap = new Map<string, { provinces: Set<string>; districts: Set<string> }>();
    
    allBasinData.forEach(item => {
      if (!item.basinName) return;
      
      if (!basinMap.has(item.basinName)) {
        basinMap.set(item.basinName, {
          provinces: new Set(),
          districts: new Set()
        });
      }
      
      const basin = basinMap.get(item.basinName)!;
      basin.provinces.add(item.provinceName);
      basin.districts.add(`${item.provinceName}-${item.districtName}`);
    });

    const summary: BasinSummary[] = Array.from(basinMap.entries())
      .map(([basinName, data]) => ({
        basinName,
        provinceCount: data.provinces.size,
        districtCount: data.districts.size,
        color: BASIN_COLORS[basinName] || '#95a5a6'
      }))
      .sort((a, b) => b.districtCount - a.districtCount);

    setBasinSummary(summary);
  }, [allBasinData]);

  // Calculate province-basin mapping for map
  useEffect(() => {
    if (allBasinData.length === 0) return;

    const provinceMap = new Map<string, Map<string, number>>();
    
    allBasinData.forEach(item => {
      if (!provinceMap.has(item.provinceName)) {
        provinceMap.set(item.provinceName, new Map());
      }
      
      const basinCounts = provinceMap.get(item.provinceName)!;
      basinCounts.set(item.basinName, (basinCounts.get(item.basinName) || 0) + 1);
    });

    const provinceData: ProvinceBasinData[] = Array.from(provinceMap.entries()).map(([province, basins]) => {
      // Find dominant basin (most districts)
      let maxCount = 0;
      let dominantBasin = '';
      
      basins.forEach((count, basin) => {
        if (count > maxCount) {
          maxCount = count;
          dominantBasin = basin;
        }
      });

      const totalDistricts = Array.from(basins.values()).reduce((sum, count) => sum + count, 0);

      return {
        province,
        dominantBasin,
        basinCount: basins.size,
        districtCount: totalDistricts,
        color: BASIN_COLORS[dominantBasin] || '#95a5a6'
      };
    }).sort((a, b) => a.province.localeCompare(b.province, 'tr'));

    setProvinceBasinData(provinceData);
  }, [allBasinData]);

  // Filtered data based on selections
  const filteredData = useMemo(() => {
    return allBasinData.filter(item => {
      if (selectedBasin !== 'Tümü' && item.basinName !== selectedBasin) return false;
      if (selectedProvince !== 'Tümü' && item.provinceName !== selectedProvince) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.districtName.toLowerCase().includes(term) ||
          item.provinceName.toLowerCase().includes(term) ||
          item.basinName.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allBasinData, selectedBasin, selectedProvince, searchTerm]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const uniqueBasins = new Set(allBasinData.map(d => d.basinName)).size;
    const uniqueProvinces = new Set(allBasinData.map(d => d.provinceName)).size;
    const uniqueDistricts = new Set(allBasinData.map(d => `${d.provinceName}-${d.districtName}`)).size;
    
    const largestBasin = basinSummary.length > 0 ? basinSummary[0] : null;

    return {
      totalBasins: uniqueBasins,
      totalProvinces: uniqueProvinces,
      totalDistricts: uniqueDistricts,
      largestBasin: largestBasin?.basinName || '-',
      largestBasinDistricts: largestBasin?.districtCount || 0
    };
  }, [allBasinData, basinSummary]);

  // Export fonksiyonu — henüz UI'a bağlanmadı
  // @ts-expect-error prepared for future UI integration
  const _exportToExcel = () => {
    const exportData = filteredData.map((item, idx) => ({
      '#': idx + 1,
      'Havza': item.basinName,
      'İl': item.provinceName,
      'İlçe': item.districtName
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Havza Verileri');
    XLSX.writeFile(wb, `havza-verileri-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Format number with Turkish locale
  const formatNumber = (num: number): string => {
    return num.toLocaleString('tr-TR');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</div>
          <div style={{ fontSize: '18px', opacity: 0.9, color: 'var(--text-secondary)' }}>Havza Verileri Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'white' }}>
          🌊 Türkiye Hidrografik Havza Haritası
        </h1>
        <p style={{ fontSize: '16px', margin: '8px 0 0 0', color: 'rgba(255,255,255,0.95)' }}>
          30 Havza • 81 İl • {formatNumber(metrics.totalDistricts)} İlçe - Ürün Deseni Analiz Platformu
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: '📊 Genel Bakış', icon: '📊' },
          { id: 'basins', label: '🌊 Havza Analizi', icon: '🌊' },
          { id: 'provinces', label: '🗺️ İl Dağılımı', icon: '🗺️' },
          { id: 'districts', label: '📍 İlçe Haritası', icon: '📍' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'basins' | 'provinces' | 'districts')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: activeTab === tab.id ? '2px solid var(--success)' : '1px solid var(--border)',
              background: activeTab === tab.id 
                ? 'var(--success)'
                : 'var(--bg-card)',
              color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'var(--shadow-sm)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            {[
              { label: 'Toplam Havza', value: metrics.totalBasins, icon: '🌊', color: '#3b82f6' },
              { label: 'İl Sayısı', value: metrics.totalProvinces, icon: '🏙️', color: '#10b981' },
              { label: 'İlçe Sayısı', value: metrics.totalDistricts, icon: '📍', color: '#f59e0b' },
              { label: 'En Büyük Havza', value: metrics.largestBasin, icon: '🏆', color: '#8b5cf6', isText: true },
              { label: 'En Büyük Havza İlçe', value: metrics.largestBasinDistricts, icon: '📊', color: '#ec4899' }
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${kpi.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{kpi.icon}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: kpi.isText ? '18px' : '28px', fontWeight: 700, color: kpi.color }}>
                  {kpi.isText ? kpi.value : formatNumber(kpi.value as number)}
                </div>
              </div>
            ))}
          </div>

          {/* Top 10 Basins */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🏆 En Büyük 10 Havza (İlçe Sayısına Göre)
            </h3>
            <ResponsiveContainer width="100%" height={500}>
              <Treemap
                data={basinSummary.slice(0, 10).map(basin => ({
                  name: basin.basinName,
                  size: basin.districtCount,
                  fill: basin.color
                }))}
                dataKey="size"
                stroke="rgba(255,255,255,0.2)"
                fill="#8884d8"
                content={((props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; fill?: string }) => {
                  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '' } = props;
                  if (width < 40 || height < 40) return (<g />);
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                          fill: fill,
                          stroke: 'rgba(255,255,255,0.3)',
                          strokeWidth: 2,
                          cursor: 'pointer'
                        }}
                      />
                      <text
                        x={x + width / 2}
                        y={y + height / 2 - 10}
                        textAnchor="middle"
                        fill="white"
                        fontSize={width > 100 ? 16 : 12}
                        fontWeight="bold"
                      >
                        {name}
                      </text>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.9)"
                        fontSize={width > 100 ? 14 : 11}
                      >
                        {size} ilçe
                      </text>
                    </g>
                  );
                }) as unknown as import('recharts').TreemapProps['content']}
              />
            </ResponsiveContainer>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              💡 Kare boyutları ilçe sayısına göre orantılıdır
            </div>
          </div>

          {/* Top Products (Turkey-wide) */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            marginTop: '24px'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🌾 Türkiye Geneli En Çok Üretilen Ürünler (Ton - 2024)
            </h3>
            {loadingTopProducts ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Veriler yükleniyor...</div>
            ) : topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Veri bulunamadı.</div>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="urun" 
                    width={200}
                    tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                  />
                  <Bar dataKey="toplam_ton" name="Toplam Üretim (ton)" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              💡 2024 yılı ilçe bazlı bitkisel üretim verileri (TUIK)
            </div>
          </div>

          {/* Product Leaders - Top Producers by Province and District */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            marginTop: '24px'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🏅 Ürün Bazlı Üretim Liderleri
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                🌾 Ürün Seçin:
              </label>
              <select
                value={selectedProductForLeaders}
                onChange={(e) => {
                  const product = e.target.value;
                  setSelectedProductForLeaders(product);
                  if (product) {
                    loadProductLeaders(product);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Ürün seçin --</option>
                {topProducts.slice(0, 50).map((product) => (
                  <option key={product.urun} value={product.urun}>
                    {product.urun} ({(Number(product.toplam_ton) / 1000000).toFixed(1)}M ton)
                  </option>
                ))}
              </select>
            </div>

            {loadingLeaders ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                ⏳ Üretim liderleri yükleniyor...
              </div>
            ) : (provinceLeaders.length > 0 || districtLeaders.length > 0) ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Top Provinces */}
                {provinceLeaders.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                      🏙️ En Çok Üreten İller (2024)
                    </h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={provinceLeaders} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                        <YAxis 
                          type="category" 
                          dataKey="ili" 
                          width={120}
                          tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(30, 41, 59, 0.95)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                          }}
                          formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                        />
                        <Bar dataKey="toplam_ton" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top Districts */}
                {districtLeaders.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                      📍 En Çok Üreten İlçeler (2024)
                    </h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={districtLeaders} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                        <YAxis 
                          type="category" 
                          dataKey="yer" 
                          width={120}
                          tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(30, 41, 59, 0.95)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                          }}
                          formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload as ProductLeader;
                              return `${data.yer} (${data.ili})`;
                            }
                            return label;
                          }}
                        />
                        <Bar dataKey="toplam_ton" fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Trend Analysis - Multi-year Production Trends */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            marginTop: '24px'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              📈 Yıllık Üretim Trend Analizi (2004-2024)
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                🌾 Ürün Seçin (Çoklu seçim için Ctrl/Cmd tuşu ile tıklayın):
              </label>
              <select
                multiple
                value={selectedProductsForTrend}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(option => option.value);
                  setSelectedProductsForTrend(selected);
                }}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {topProducts.slice(0, 30).map((product) => (
                  <option key={product.urun} value={product.urun} style={{ padding: '8px' }}>
                    {product.urun} ({(Number(product.toplam_ton) / 1000000).toFixed(1)}M ton)
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedProductsForTrend.length > 0 && loadTrendData(selectedProductsForTrend)}
                disabled={selectedProductsForTrend.length === 0}
                style={{
                  marginTop: '12px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedProductsForTrend.length > 0 ? '#8b5cf6' : '#4b5563',
                  color: 'white',
                  cursor: selectedProductsForTrend.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600,
                  width: '100%'
                }}
              >
                📊 {selectedProductsForTrend.length > 0 ? `${selectedProductsForTrend.length} Ürün için Trend Göster` : 'Ürün Seçin'}
              </button>
              {selectedProductsForTrend.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ✓ Seçili: {selectedProductsForTrend.join(', ')}
                </div>
              )}
            </div>

            {loadingTrend ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                ⏳ Trend verileri yükleniyor...
              </div>
            ) : trendData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', '']}
                    />
                    <Legend />
                    {selectedProductsForTrend.map((product, idx) => (
                      <Line 
                        key={product}
                        type="monotone" 
                        dataKey={product} 
                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'][idx % 6]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  💡 Türkiye geneli 2004-2024 yılları arası bitkisel üretim trendleri
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'basins' && (
        <div>
          {/* Basin Statistics KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {loadingBasinStats ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                ⏳ İstatistikler yükleniyor...
              </div>
            ) : [
              { 
                label: 'Toplam Havza Sayısı', 
                value: basinSummary.length, 
                icon: '🌊', 
                color: '#3b82f6',
                desc: 'Türkiye geneli'
              },
              { 
                label: 'En Çok Üreten Havza', 
                value: basinProductionStats[0]?.basinName.split(' ').slice(0, 2).join(' ') || '-', 
                icon: '🏆', 
                color: '#10b981',
                desc: `${(basinProductionStats[0]?.toplam_uretim || 0).toLocaleString('tr-TR')} ton`,
                isText: true
              },
              { 
                label: 'Toplam Üretim', 
                value: Math.round(basinProductionStats.reduce((sum, b) => sum + b.toplam_uretim, 0)), 
                icon: '🌾', 
                color: '#f59e0b',
                desc: 'Ton (2024)',
                suffix: ' M'
              },
              { 
                label: 'Ortalama Ürün Çeşitliliği', 
                value: Math.round(basinProductionStats.reduce((sum, b) => sum + b.urun_cesit, 0) / (basinProductionStats.length || 1)), 
                icon: '🎯', 
                color: '#8b5cf6',
                desc: 'Çeşit/Havza'
              }
            ].map((stat, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: stat.isText ? '16px' : '28px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>
                  {stat.isText ? stat.value : stat.suffix ? (Number(stat.value) / 1000000).toFixed(1) + stat.suffix : formatNumber(Number(stat.value))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Basin Comparison Chart */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🌾 Havza Üretim Karşılaştırması (2024 - Ton)
            </h3>
            {loadingBasinStats ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                ⏳ Havza üretim verileri yükleniyor...
              </div>
            ) : basinProductionStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                📭 Veri bulunamadı.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={500}>
                  <Treemap
                    data={basinProductionStats.slice(0, 15).map(basin => ({
                      name: basin.basinName,
                      size: basin.toplam_uretim,
                      fill: basin.color
                    }))}
                    dataKey="size"
                    stroke="rgba(255,255,255,0.2)"
                    fill="#8884d8"
                    content={((props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; fill?: string }) => {
                      const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '' } = props;
                      if (width < 40 || height < 40) return (<g />);
                      const tonValue = (size / 1000000).toFixed(1);
                      return (
                        <g>
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            style={{
                              fill: fill,
                              stroke: 'rgba(255,255,255,0.3)',
                              strokeWidth: 2,
                              cursor: 'pointer'
                            }}
                          />
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - 10}
                            textAnchor="middle"
                            fill="white"
                            fontSize={width > 100 ? 16 : 12}
                            fontWeight="bold"
                          >
                            {name}
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 10}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.9)"
                            fontSize={width > 100 ? 14 : 11}
                          >
                            {tonValue}M ton
                          </text>
                        </g>
                      );
                    }) as unknown as import('recharts').TreemapProps['content']}
                  />
                </ResponsiveContainer>
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  💡 En çok üretim yapan 15 havzanın 2024 yılı toplam bitkisel üretimi (Kare boyutları üretim miktarına göre orantılıdır)
                </div>
              </>
            )}
          </div>

          {/* Top 10 Producing Basins List */}
          <div style={{
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                🎯 En Çok Üreten 10 Havza
              </h3>
              {loadingBasinStats ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  ⏳ Yükleniyor...
                </div>
              ) : basinProductionStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  📭 Veri bulunamadı.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                  {basinProductionStats.slice(0, 10).map((basin, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `2px solid ${idx < 3 ? basin.color : 'var(--border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: idx < 3 ? `0 4px 12px ${basin.color}40` : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${basin.color}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = idx < 3 ? `0 4px 12px ${basin.color}40` : 'none';
                    }}
                    onClick={() => {
                      setSelectedBasinForAnalysis(basin.basinName);
                      loadBasinProducts(basin.basinName);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: basin.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'white',
                        boxShadow: `0 2px 8px ${basin.color}60`
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {basin.basinName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {basin.toplam_uretim.toLocaleString('tr-TR')} ton | {basin.urun_cesit} çeşit ürün
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '20px' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Interactive Basin Cards Grid */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🗂️ Tüm Havzalar - Üretim Verileri
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {basinProductionStats.map((basin, idx) => (
                <div
                  key={idx}
                  style={{
                    background: `linear-gradient(135deg, ${basin.color}15 0%, var(--bg-secondary) 100%)`,
                    borderRadius: '12px',
                    padding: '20px',
                    border: `2px solid ${basin.color}40`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = basin.color;
                    e.currentTarget.style.boxShadow = `0 8px 24px ${basin.color}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = `${basin.color}40`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    setSelectedBasinForAnalysis(basin.basinName);
                    loadBasinProducts(basin.basinName);
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `${basin.color}20`,
                    filter: 'blur(20px)'
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: basin.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        🌊
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {basin.basinName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          #{idx + 1} Üretim Sıralaması
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          ⚖️ Toplam Üretim
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: basin.color }}>
                          {(basin.toplam_uretim / 1000000).toFixed(2)}M
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          ton
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          🌾 Ürün Çeşidi
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: basin.color }}>
                          {basin.urun_cesit}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          farklı ürün
                        </div>
                      </div>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: `${basin.color}20`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: basin.color,
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      🌾 Üretim Verilerini Gör
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Basin Products Analysis */}
          {selectedBasinForAnalysis && (
            <div style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px',
              border: `2px solid ${BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'}`,
              boxShadow: `0 8px 32px ${BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'}40`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '6px', 
                    background: BASIN_COLORS[selectedBasinForAnalysis] || '#10b981',
                    marginRight: '12px',
                    verticalAlign: 'middle'
                  }} />
                  {selectedBasinForAnalysis} — En Çok Üretilen Ürünler (2024)
                </h3>
                <button
                  onClick={() => setSelectedBasinForAnalysis(null)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  ✕ Kapat
                </button>
              </div>

              {loadingBasinProducts ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  ⏳ Havza üretim verileri yükleniyor...
                </div>
              ) : basinProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  📭 Bu havza için üretim verisi bulunamadı.
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={basinProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                      <YAxis 
                        type="category" 
                        dataKey="urun" 
                        width={180}
                        tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(30, 41, 59, 0.95)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                      />
                      <Bar 
                        dataKey="toplam_ton" 
                        name="Toplam Üretim" 
                        fill={BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'} 
                        radius={[0, 8, 8, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    💡 {selectedBasinForAnalysis} havzasındaki tüm ilçelerin 2024 yılı bitkisel üretim toplamları
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'provinces' && (
        <div style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            🗺️ İl Bazında Havza Dağılımı
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>#</th>
                  <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>İl</th>
                  <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>Dominant Havza</th>
                  <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>Havza Sayısı</th>
                  <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>İlçe Sayısı</th>
                  <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>🌾 Ürün Çeşitliliği</th>
                </tr>
              </thead>
              <tbody>
                {provinceBasinData.map((province, idx) => {
                  const diversityData = provinceDiversity.find(d => d.ili.toUpperCase() === province.province.toUpperCase());
                  const cesitSayisi = diversityData ? parseInt(diversityData.cesit_sayisi) : 0;
                  const maxCesit = provinceDiversity.length > 0 ? parseInt(provinceDiversity[0].cesit_sayisi) : 1;
                  const diversityPct = maxCesit > 0 ? (cesitSayisi / maxCesit) * 100 : 0;
                  return (
                  <tr 
                    key={idx}
                    style={{ 
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() => {
                      setSelectedProvince(province.province);
                    }}
                  >
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {province.province}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          background: province.color,
                          boxShadow: `0 0 6px ${province.color}80`
                        }} />
                        {province.dominantBasin}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'center' }}>
                      {formatNumber(province.basinCount)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'center' }}>
                      {formatNumber(province.districtCount)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {loadingDiversity ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>...</span>
                      ) : cesitSayisi > 0 ? (
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                            {cesitSayisi} çeşit
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '4px', width: '100%', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${Math.min(100, diversityPct)}%`, 
                              height: '100%', 
                              background: 'linear-gradient(90deg, #10b981, #059669)', 
                              borderRadius: '4px',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Geographic Distribution - Product-based Province Heatmap */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            marginTop: '24px'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              🗺️ Ürün Bazlı Coğrafi Üretim Dağılımı
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Ürün adı girin (örn: Buğday, Mısır, Domates)..."
                value={selectedProductForMap}
                onChange={(e) => setSelectedProductForMap(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedProductForMap.trim()) {
                    loadProductDistribution(selectedProductForMap.trim());
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => selectedProductForMap.trim() && loadProductDistribution(selectedProductForMap.trim())}
                style={{
                  marginTop: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                🌍 Harita Göster
              </button>
            </div>

            {loadingDistribution ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                ⏳ Coğrafi dağılım hesaplanıyor...
              </div>
            ) : productDistribution.length > 0 ? (
              <>
                <TurkeyHeatMap
                  regionTotals={productDistribution.map(p => ({
                    name: p.ili,
                    value: Number(p.toplam_ton),
                    unit: 'ton'
                  }))}
                  unitLabel="ton"
                  height={500}
                  fillMode="heat"
                />
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                    📊 İl Bazlı Üretim Sıralaması - {selectedProductForMap} (2024)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                    {productDistribution.slice(0, 20).map((item, idx) => (
                      <div 
                        key={item.ili}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            color: idx < 3 ? '#f59e0b' : 'var(--text-secondary)',
                            minWidth: '24px'
                          }}>
                            {idx + 1}.
                          </span>
                          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {item.ili}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                          {Number(item.toplam_ton).toLocaleString('tr-TR')} ton
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  💡 2024 yılı {selectedProductForMap} üretiminin il bazlı dağılımı
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'districts' && (
        <div>
          {/* Filters */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
              {/* Basin filter */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🌊 HAVZA</label>
                <select
                  value={mapFilterBasin}
                  onChange={(e) => { setMapFilterBasin(e.target.value); setSelectedMapDistrict(null); setDistrictProducts([]); }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="Tümü">Tüm Havzalar</option>
                  {basinSummary.map(b => <option key={b.basinName} value={b.basinName}>{b.basinName}</option>)}
                </select>
              </div>
              {/* Province filter */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🏙️ İL</label>
                <select
                  value={mapFilterProvince}
                  onChange={(e) => { setMapFilterProvince(e.target.value); setMapFilterDistrict('Tümü'); setSelectedMapDistrict(null); setDistrictProducts([]); }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="Tümü">Tüm İller</option>
                  {mapProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* District filter */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>📍 İLÇE</label>
                <select
                  value={mapFilterDistrict}
                  onChange={(e) => {
                    const d = e.target.value;
                    setMapFilterDistrict(d);
                    if (d !== 'Tümü' && mapFilterProvince !== 'Tümü') {
                      const basinItem = allBasinData.find(x => x.provinceName === mapFilterProvince && x.districtName.startsWith(d));
                      handleDistrictClick(d, mapFilterProvince, basinItem?.basinName || '');
                    } else {
                      setSelectedMapDistrict(null);
                      setDistrictProducts([]);
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="Tümü">Tüm İlçeler</option>
                  {mapDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Reset */}
              {(mapFilterBasin !== 'Tümü' || mapFilterProvince !== 'Tümü' || mapFilterDistrict !== 'Tümü') && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => { setMapFilterBasin('Tümü'); setMapFilterProvince('Tümü'); setMapFilterDistrict('Tümü'); setSelectedMapDistrict(null); setDistrictProducts([]); setDistrictProduction([]); }}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                  >
                    ✕ Sıfırla
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map card */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              📍 İlçe Bazında Havza Haritası
              {selectedMapDistrict && (
                <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                  — Seçili: <strong style={{ color: 'var(--text-primary)' }}>{selectedMapDistrict.name}</strong> / {selectedMapDistrict.province}
                </span>
              )}
            </h3>
            <DistrictMap
              basinData={allBasinData}
              basinColors={BASIN_COLORS}
              filterBasin={mapFilterBasin}
              filterProvince={mapFilterProvince}
              filterDistrict={mapFilterDistrict}
              selectedDistrict={selectedMapDistrict?.key}
              onDistrictClick={handleDistrictClick}
            />
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              💡 İlçeye tıklayarak bitkisel üretim ürünlerini görüntüleyin
            </div>
          </div>

          {/* Product cards for selected district */}
          {selectedMapDistrict && (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
                🌾 {selectedMapDistrict.name} / {selectedMapDistrict.province} — Ürün Deseni
              </h3>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Havza: <span style={{ color: BASIN_COLORS[selectedMapDistrict.basin] || 'var(--text-primary)', fontWeight: 600 }}>{selectedMapDistrict.basin}</span>
              </div>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Ürünler yükleniyor...</div>
              ) : districtProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Bu ilçe için ürün deseni verisi bulunamadı.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {districtProducts.map((p, i) => {
                    const basinColor = BASIN_COLORS[selectedMapDistrict.basin] || '#10b981';
                    return (
                      <div key={i} style={{
                        background: `${basinColor}18`,
                        border: `1px solid ${basinColor}55`,
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        cursor: 'default'
                      }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 10px ${basinColor}40`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.transform = '';
                          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                        }}
                      >
                        🌾 {p.urun}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Production data for selected district */}
          {selectedMapDistrict && (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
                📊 {selectedMapDistrict.name} / {selectedMapDistrict.province} — Üretim Miktarı (2024)
              </h3>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Kayıtlı bitkisel üretim verileri (ton)
              </div>
              {loadingProduction ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Üretim verileri yükleniyor...</div>
              ) : districtProduction.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Bu ilçe için 2024 üretim miktarı verisi bulunamadı.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {districtProduction.map((p, i) => {
                    const val = parseFloat(p.y2024.replace(/[^0-9.]/g, '')) || 0;
                    const maxVal = parseFloat(districtProduction[0].y2024.replace(/[^0-9.]/g, '')) || 1;
                    const pct = Math.max(6, (val / maxVal) * 100);
                    const basinColor = BASIN_COLORS[selectedMapDistrict.basin] || '#10b981';
                    return (
                      <div key={i} style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--border)',
                        transition: 'transform 0.2s'
                      }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: '1.3' }}>{p.urun}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{p.urun_grup}</div>
                        <div style={{ background: 'var(--border)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: basinColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: basinColor }}>
                          {Number(val).toLocaleString('tr-TR')} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>ton</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* District Statistics */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              📊 Havza Bazında İlçe Dağılımı
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {basinSummary.slice(0, 12).map((basin, idx) => (
                <div
                  key={idx}
                  style={{
                    background: `${basin.color}10`,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `2px solid ${basin.color}40`,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${basin.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: basin.color,
                      boxShadow: `0 0 12px ${basin.color}80`
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {basin.basinName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {basin.provinceCount} il • {basin.districtCount} ilçe
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
