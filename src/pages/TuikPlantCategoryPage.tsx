import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';

/* ─── renk paleti ─── */
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#22d3ee', '#a3e635',
  '#fbbf24', '#fb923c', '#f472b6', '#818cf8', '#2dd4bf'
];

/* ─── TÜİK 12 istatistiki bölge ─── */
const TURKEY_REGIONS: Record<string, string[]> = {
  'Akdeniz': ['ADANA', 'ANTALYA', 'BURDUR', 'HATAY', 'ISPARTA', 'K.MARAŞ', 'KARAMAN', 'MERSİN', 'OSMANİYE'],
  'Batı Anadolu': ['AFYON', 'ANKARA', 'ESKİŞEHİR', 'KARAMAN', 'KONYA', 'KÜTAHYA', 'UŞAK'],
  'Batı Karadeniz': ['AMASYA', 'BARTIN', 'ÇANKIRI', 'ÇORUM', 'KARABÜK', 'KASTAMONU', 'SAMSUN', 'SİNOP', 'TOKAT', 'ZONGULDAK'],
  'Batı Marmara': ['BALIKESİR', 'ÇANAKKALE', 'EDİRNE', 'KIRKLARELİ', 'TEKİRDAĞ'],
  'Doğu Karadeniz': ['ARTVİN', 'GİRESUN', 'GÜMÜŞHANE', 'ORDU', 'RİZE', 'TRABZON'],
  'Doğu Marmara': ['BİLECİK', 'BOLU', 'BURSA', 'DÜZCE', 'ESKİŞEHİR', 'KOCAELİ', 'SAKARYA', 'YALOVA'],
  'Ege': ['AYDIN', 'DENİZLİ', 'İZMİR', 'MANISA', 'MUĞLA'],
  'Güneydoğu Anadolu': ['ADIYAMAN', 'BATMAN', 'DİYARBAKIR', 'GAZİANTEP', 'KİLİS', 'MARDİN', 'SİİRT', 'ŞANLIURFA', 'ŞIRNAK'],
  'İstanbul': ['İSTANBUL'],
  'Kuzeydoğu Anadolu': ['AĞRI', 'ARDAHAN', 'BAYBURT', 'ERZURUM', 'ERZURUM', 'IĞDIR', 'KARS'],
  'Orta Anadolu': ['AKSARAY', 'KAYSERİ', 'KIRIKKALE', 'KIRŞEHİR', 'NEVŞEHİR', 'NİĞDE', 'SİVAS', 'YOZGAT'],
  'Ortadoğu Anadolu': ['BİNGÖL', 'BİTLİS', 'ELAZIĞ', 'HAKKARİ', 'MALATYA', 'MUŞ', 'TUNCELİ', 'VAN'],
};

const YEARS = Array.from({ length: 21 }, (_, i) => 2024 - i);

const UNSUR_OPTIONS = [
  { id: 'Üretim', label: 'Üretim (Ton)', birim: 'ton' },
  { id: 'Ekilen Alan', label: 'Ekilen Alan (Dekar)', birim: 'dekar' },
  { id: 'Hasat Edilen Alan', label: 'Hasat Edilen Alan (Dekar)', birim: 'dekar' },
  { id: 'Verim', label: 'Verim (Kg/Dekar)', birim: 'kg/dek' },
  { id: 'Meyve Veren Yaşta Ağaç Sayısı', label: 'Meyve Veren Ağaç (Adet)', birim: 'adet' },
  { id: 'Meyve Vermeyen Yaşta Ağaç Sayısı', label: 'Meyve Vermeyen Ağaç (Adet)', birim: 'adet' },
  { id: 'Toplu Meyveliklerin Alanı', label: 'Meyvelik Alanı (Dekar)', birim: 'dekar' },
];

/* ─── yardımcı fonksiyonlar ─── */
function fmt(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toLocaleString('tr-TR');
}
function fmtShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}
function pct(a: number, b: number): number {
  return b !== 0 ? ((a - b) / b) * 100 : 0;
}

const buildSumCols = () => YEARS.map(y => `SUM(CAST(y${y} AS DECIMAL(20,2))) as v${y}`).join(',');

/* ─── types ─── */
interface CityRow { name: string; value: number; share: string; fill: string; [key: string]: string | number }
interface YearRow { year: string; value: number; change?: number }
interface RegionRow { name: string; value: number }
interface ProductRow { name: string; value: number; fill: string }
interface ScatterRow { name: string; area: number; production: number; verim: number }
interface DistrictRow { name: string; value: number; fill: string }

/* ─── Props ─── */
export interface TuikPlantCategoryPageProps {
  title: string;
  subtitle: string;
  icon: string;
  urunGrup: string;
  urunFilter?: string[];         // boşsa urunGrup'taki tüm ürünler
  defaultProducts?: string[];    // varsayılan seçili ürünler
  showTreeMetrics?: boolean;     // ağaç sayısı/meyvelik alanı göster
}

export default function TuikPlantCategoryPage({
  title, subtitle, icon,
  urunGrup, urunFilter,
  defaultProducts,
  showTreeMetrics = false
}: TuikPlantCategoryPageProps) {

  /* ─── state ─── */
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(defaultProducts || []);
  const [productList, setProductList] = useState<{ id: string; name: string; nameTR: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // veri
  const [cityData, setCityData] = useState<CityRow[]>([]);
  const [yearlyData, setYearlyData] = useState<YearRow[]>([]);
  const [regionData, setRegionData] = useState<RegionRow[]>([]);
  const [productCompareData, setProductCompareData] = useState<ProductRow[]>([]);
  const [scatterData, setScatterData] = useState<ScatterRow[]>([]);
  const [districtData, setDistrictData] = useState<DistrictRow[]>([]);
  const [yieldTrendData, setYieldTrendData] = useState<{ year: string; uretim: number; alan: number; verim: number; alanEtkisi?: number; verimEtkisi?: number; etkilesim?: number; uretimDegisimi?: number }[]>([]);
  const [radarData, setRadarData] = useState<{ il: string; [key: string]: string | number }[]>([]);

  const filteredUnsurOptions = useMemo(() =>
    showTreeMetrics ? UNSUR_OPTIONS : UNSUR_OPTIONS.filter(o =>
      !['Meyve Veren Yaşta Ağaç Sayısı', 'Meyve Vermeyen Yaşta Ağaç Sayısı', 'Toplu Meyveliklerin Alanı'].includes(o.id)
    ), [showTreeMetrics]);

  const currentBirim = filteredUnsurOptions.find(o => o.id === selectedUnsur)?.birim || 'ton';

  /* il listesi (bölgeye göre) */
  const provinceList = useMemo(() => {
    if (!selectedRegion) {
      return Object.values(TURKEY_REGIONS).flat().filter((v, i, a) => a.indexOf(v) === i).sort();
    }
    return TURKEY_REGIONS[selectedRegion] || [];
  }, [selectedRegion]);

  /* ─── ürün listesi yükle ─── */
  useEffect(() => {
    (async () => {
      try {
        const filter = urunFilter
          ? `urun IN (${urunFilter.map(u => `'${u}'`).join(',')})`
          : `urun_grup = '${urunGrup}'`;
        const sql = `SELECT DISTINCT urun FROM tuik_bitkisel_uretim WHERE ${filter} ORDER BY urun`;
        const res = await fetchQuery(sql);
        if (res.data) {
          const list = res.data.map(r => ({ id: String(r.urun), name: String(r.urun), nameTR: String(r.urun) }));
          setProductList(list);
          if (defaultProducts && defaultProducts.length > 0) {
            setSelectedProducts(defaultProducts.filter(p => list.some(l => l.id === p)));
          } else if (list.length > 0) {
            setSelectedProducts(list.slice(0, Math.min(3, list.length)).map(l => l.id));
          }
        }
      } catch (e) { console.error('Ürün listesi yüklenirken hata:', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urunGrup, JSON.stringify(urunFilter)]);

  /* ─── ana veri yükleme ─── */
  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setCityData([]); setYearlyData([]); setRegionData([]);
      setProductCompareData([]); setScatterData([]); setDistrictData([]);
      setYieldTrendData([]); setRadarData([]);
      return;
    }
    setLoading(true);
    try {
      const prods = selectedProducts.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
      const yCol = `y${selectedYear}`;

      // ek coğrafi filtre
      let geoFilter = '';
      let geoFilterIl = '';
      if (selectedProvince) {
        geoFilter = ` AND yer='${selectedProvince}'`;
        geoFilterIl = ` AND ili='${selectedProvince}'`;
      } else if (selectedRegion && TURKEY_REGIONS[selectedRegion]) {
        const iller = TURKEY_REGIONS[selectedRegion].map(i => `'${i}'`).join(',');
        geoFilter = ` AND yer IN (${iller})`;
        geoFilterIl = ` AND ili IN (${iller})`;
      }

      /* Q1: İl bazlı (Top 20) */
      const q1 = `SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY yer HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`;

      /* Q2: Yıllık trend (ülke toplamı veya bölge toplamı) */
      const q2 = `SELECT ${buildSumCols()}
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}`;

      /* Q3: Bölge karşılaştırması */
      const regionCases = Object.entries(TURKEY_REGIONS)
        .map(([name, iller]) => {
          const inList = iller.map(i => `'${i}'`).join(',');
          return `SUM(CASE WHEN ili IN (${inList}) THEN CAST(${yCol} AS DECIMAL(20,2)) ELSE 0 END) as '${name}'`;
        }).join(',');
      const q3 = `SELECT ${regionCases}
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'`;

      /* Q4: Ürünler arası karşılaştırma */
      const q4 = `SELECT urun, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY urun HAVING toplam > 0 ORDER BY toplam DESC`;

      /* Q5: Scatter — alan vs üretim vs verim (il bazlı) */
      const q5 = `SELECT a.yer,
        SUM(CAST(a.${yCol} AS DECIMAL(20,2))) as uretim,
        IFNULL(b.alan, 0) as alan,
        IFNULL(c.verim, 0) as verim
        FROM tuik_bitkisel_uretim a
        LEFT JOIN (SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as alan FROM tuik_bitkisel_uretim WHERE unsur='Ekilen Alan' AND urun IN (${prods}) AND duzeykod='3'${geoFilter} GROUP BY yer) b ON a.yer=b.yer
        LEFT JOIN (SELECT yer, AVG(CAST(${yCol} AS DECIMAL(20,2))) as verim FROM tuik_bitkisel_uretim WHERE unsur='Verim' AND urun IN (${prods}) AND duzeykod='3'${geoFilter} GROUP BY yer) c ON a.yer=c.yer
        WHERE a.unsur='Üretim' AND a.urun IN (${prods}) AND a.duzeykod='3'${geoFilter}
        GROUP BY a.yer HAVING uretim > 0
        ORDER BY uretim DESC LIMIT 30`;

      /* Q6: İlçe verisi (sadece il seçiliyse) */
      const q6Promise = selectedProvince
        ? fetchQuery(`SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
            FROM tuik_bitkisel_uretim
            WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='4'${geoFilterIl}
            GROUP BY yer HAVING toplam > 0 ORDER BY toplam DESC LIMIT 15`)
        : Promise.resolve({ data: [] });

      /* Q7: Üretim-Alan-Verim trendi */
      const uretimCols = YEARS.map(y => `SUM(CASE WHEN unsur='Üretim' THEN CAST(y${y} AS DECIMAL(20,2)) END) as uretim${y}`).join(',');
      const ekilenCols = YEARS.map(y => `SUM(CASE WHEN unsur='Ekilen Alan' THEN CAST(y${y} AS DECIMAL(20,2)) END) as ekilen${y}`).join(',');
      const verimCols = YEARS.map(y => `AVG(CASE WHEN unsur='Verim' THEN CAST(y${y} AS DECIMAL(20,2)) END) as verim${y}`).join(',');
      const q7 = `SELECT ${uretimCols}, ${ekilenCols}, ${verimCols}
        FROM tuik_bitkisel_uretim
        WHERE urun IN (${prods}) AND duzeykod='3'${geoFilter}`;

      /* Q8: Radar — top 6 ilin 3 yıl karşılaştırması */
      const radarYears = [selectedYear, Math.max(selectedYear - 5, 2004), Math.max(selectedYear - 10, 2004)];
      const radarCols = radarYears.map(y => `SUM(CAST(y${y} AS DECIMAL(20,2))) as v${y}`).join(',');
      const q8 = `SELECT yer, ${radarCols}
        FROM tuik_bitkisel_uretim
        WHERE unsur='Üretim' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY yer ORDER BY SUM(CAST(${yCol} AS DECIMAL(20,2))) DESC LIMIT 6`;

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        fetchQuery(q1), fetchQuery(q2), fetchQuery(q3), fetchQuery(q4),
        fetchQuery(q5), q6Promise, fetchQuery(q7), fetchQuery(q8)
      ]);

      /* parse Q1: İl bazlı */
      if (r1.data) {
        const total = r1.data.reduce((s, r) => s + (Number(r.toplam) || 0), 0);
        setCityData(r1.data.map((r, i) => ({
          name: String(r.yer), value: Number(r.toplam) || 0,
          share: total > 0 ? ((Number(r.toplam) || 0) / total * 100).toFixed(1) : '0',
          fill: COLORS[i % COLORS.length]
        })));
      }

      /* parse Q2: Yıllık trend */
      if (r2.data?.[0]) {
        const row = r2.data[0];
        const arr: YearRow[] = [];
        for (const y of YEARS.slice().reverse()) {
          const val = Number(row[`v${y}`]) || 0;
          const prev = y > 2004 ? (Number(row[`v${y - 1}`]) || 0) : val;
          arr.push({ year: String(y), value: val, change: pct(val, prev) });
        }
        setYearlyData(arr);
      }

      /* parse Q3: Bölge */
      if (r3.data?.[0]) {
        const row = r3.data[0];
        const regions = Object.keys(TURKEY_REGIONS).map(name => ({
          name, value: Number(row[name]) || 0
        })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
        setRegionData(regions);
      }

      /* parse Q4: Ürün karşılaştırma */
      if (r4.data) {
        setProductCompareData(r4.data.map((r, i) => ({
          name: String(r.urun), value: Number(r.toplam) || 0, fill: COLORS[i % COLORS.length]
        })));
      }

      /* parse Q5: Scatter */
      if (r5.data) {
        setScatterData(r5.data.map(r => ({
          name: String(r.yer),
          area: Number(r.alan) || 0,
          production: Number(r.uretim) || 0,
          verim: Number(r.verim) || 0
        })).filter(r => r.area > 0 && r.production > 0));
      }

      /* parse Q6: İlçe */
      if (r6.data) {
        setDistrictData(r6.data.map((r, i) => ({
          name: String(r.yer), value: Number(r.toplam) || 0, fill: COLORS[i % COLORS.length]
        })));
      } else {
        setDistrictData([]);
      }

      /* parse Q7: Üretim-Alan-Verim trendi + Decomposition */
      if (r7.data?.[0]) {
        const row = r7.data[0];
        const rawData = YEARS.slice().reverse().map(y => ({
          year: String(y),
          uretim: Number(row[`uretim${y}`]) || 0,
          alan: Number(row[`ekilen${y}`]) || 0,
          verim: Number(row[`verim${y}`]) || 0
        }));
        
        // Decomposition: Alan ve verim verisi varsa ayrıştır
        const arr = rawData.map((d, i) => {
          if (i === 0) return { ...d, alanEtkisi: 0, verimEtkisi: 0, etkilesim: 0, uretimDegisimi: 0 };
          const prev = rawData[i - 1];
          
          // Üretim değişimi (her durumda)
          const uretimDegisimi = d.uretim - prev.uretim;
          
          // Alan ve verim varsa decomposition
          if (d.alan > 0 && d.verim > 0 && prev.alan > 0 && prev.verim > 0) {
            const alanDiff = d.alan - prev.alan;
            const verimDiff = d.verim - prev.verim;
            
            // Alan Etkisi = ΔAlan × Verim(t-1)
            const alanEtkisi = alanDiff * prev.verim;
            // Verim Etkisi = ΔVerim × Alan(t-1)
            const verimEtkisi = verimDiff * prev.alan;
            // Etkileşim = ΔAlan × ΔVerim
            const etkilesim = alanDiff * verimDiff;
            
            return { ...d, alanEtkisi, verimEtkisi, etkilesim, uretimDegisimi };
          } else {
            // Alan/verim yoksa sadece üretim değişimi
            return { ...d, alanEtkisi: 0, verimEtkisi: 0, etkilesim: uretimDegisimi, uretimDegisimi };
          }
        });
        setYieldTrendData(arr);
      }

      /* parse Q8: Radar */
      if (r8.data) {
        setRadarData(r8.data.map(r => {
          const obj: { il: string; [key: string]: string | number } = { il: String(r.yer) };
          radarYears.forEach(y => { obj[String(y)] = Number(r[`v${y}`]) || 0; });
          return obj;
        }));
      }

    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear, selectedUnsur, selectedRegion, selectedProvince]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── türetilmiş KPI'lar ─── */
  const totalValue = cityData.reduce((s, c) => s + c.value, 0);
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const productCount = productCompareData.length;

  const currentYearData = yearlyData.find(y => y.year === String(selectedYear));
  const prevYearData = yearlyData.find(y => y.year === String(selectedYear - 1));
  const yoyChange = currentYearData && prevYearData
    ? pct(currentYearData.value, prevYearData.value) : 0;

  /* ─── 🧠 Intelligence Metrics ─── */
  // 5-yıl CAGR (Compound Annual Growth Rate)
  const cagr5Year = useMemo(() => {
    const year5ago = yearlyData.find(y => y.year === String(selectedYear - 5));
    if (!currentYearData || !year5ago || year5ago.value === 0) return 0;
    return (Math.pow(currentYearData.value / year5ago.value, 1/5) - 1) * 100;
  }, [yearlyData, selectedYear, currentYearData]);

  // Tahmin: Linear regression ile gelecek yıl tahmini
  const forecast = useMemo(() => {
    if (yearlyData.length < 5) return 0;
    const recent = yearlyData.slice(-5);
    const n = recent.length;
    const sumX = recent.reduce((s, _, i) => s + i, 0);
    const sumY = recent.reduce((s, d) => s + d.value, 0);
    const sumXY = recent.reduce((s, d, i) => s + i * d.value, 0);
    const sumX2 = recent.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return slope * n + intercept;
  }, [yearlyData]);

  // Verimlilik Trendi: Son 3 yılda verim artışı/düşüşü
  const yieldTrend = useMemo(() => {
    const recent = yieldTrendData.slice(-3);
    if (recent.length < 2) return 0;
    const first = recent[0].verim;
    const last = recent[recent.length - 1].verim;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [yieldTrendData]);

  // Üretim artışının dominant kaynağı
  const growthDriver = useMemo(() => {
    const recent = yieldTrendData.filter(d => d.alanEtkisi !== undefined).slice(-5);
    if (recent.length === 0) return 'Veri yetersiz';
    const totalAreaEffect = recent.reduce((s, d) => s + Math.abs(d.alanEtkisi || 0), 0);
    const totalYieldEffect = recent.reduce((s, d) => s + Math.abs(d.verimEtkisi || 0), 0);
    
    // Eğer decomposition verisi yoksa (her ikisi de ~0), üretim trendine bak
    if (totalAreaEffect < 0.01 && totalYieldEffect < 0.01) {
      const recentProduction = yieldTrendData.slice(-5);
      if (recentProduction.length < 2) return '📊 Analiz için veri yetersiz';
      const firstYear = recentProduction[0].uretim;
      const lastYear = recentProduction[recentProduction.length - 1].uretim;
      const change = lastYear - firstYear;
      if (Math.abs(change) < 0.01) return '⚪ Stabil üretim';
      return change > 0 ? '🟢 Üretim artışı (Kaynak belirlenemedi)' : '🔴 Üretim düşüşü';
    }
    
    if (totalAreaEffect > totalYieldEffect * 1.5) return '🟢 Alan genişlemesi odaklı';
    if (totalYieldEffect > totalAreaEffect * 1.5) return '🟡 Verim artışı odaklı';
    return '🔵 Dengeli büyüme';
  }, [yieldTrendData]);

  /* ─── radar yılları ─── */
  const radarYears = useMemo(() => [
    selectedYear, Math.max(selectedYear - 5, 2004), Math.max(selectedYear - 10, 2004)
  ], [selectedYear]);

  /* ─── render ─── */
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{icon} {title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      {/* Filtreler */}
      <div className="date-filter" style={{ flexWrap: 'wrap' }}>
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Ürün Seçimi
          </label>
          <ProductSelector
            products={productList}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder="Ürün seçin..."
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Gösterge</label>
          <select className="filter-select" value={selectedUnsur}
            onChange={e => setSelectedUnsur(e.target.value)}>
            {filteredUnsurOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Bölge</label>
          <select className="filter-select" value={selectedRegion}
            onChange={e => { setSelectedRegion(e.target.value); setSelectedProvince(''); }}>
            <option value="">Tüm Türkiye</option>
            {Object.keys(TURKEY_REGIONS).sort().map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">İl</label>
          <select className="filter-select" value={selectedProvince}
            onChange={e => setSelectedProvince(e.target.value)}>
            <option value="">Tüm İller</option>
            {provinceList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner" /><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* ─── KPI Kartları ─── */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">TOPLAM</span></div>
              <div className="kpi-value">{fmt(totalValue)}</div>
              <div className="kpi-subtitle">{currentBirim} ({selectedYear})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">YILLIK DEĞİŞİM</span>
                <div className={`kpi-icon ${yoyChange >= 0 ? 'green' : 'red'}`}>{yoyChange >= 0 ? '📈' : '📉'}</div>
              </div>
              <div className="kpi-value" style={{ color: yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
                %{yoyChange.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
              <div className="kpi-subtitle">{fmt(topCityValue)} {currentBirim}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">ÜRÜN SAYISI</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">{productCount}</div>
              <div className="kpi-subtitle">Seçili ürün</div>
            </div>
          </div>

          {/* ─── 🧠 Intelligence Panel ─── */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧠 Tarım Intelligence Özeti
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>5 YILLIK CAGR</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr5Year >= 0 ? '+' : ''}{cagr5Year.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>VERİMLİLİK TRENDİ</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yieldTrend >= 0 ? '+' : ''}{yieldTrend.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl verim değişimi</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>TAHMİN {selectedYear + 1}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{forecast > 0 ? fmt(forecast) : '-'}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Linear trend tahmini</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜME STRATEJİSİ</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{growthDriver}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 5 yıl analizi</div>
              </div>
            </div>
          </div>

          {/* ─── Grafik 1: Yıllık Trend (ComposedChart) ─── */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık Trend (2004–2024)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={[-50, 50]} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'value' ? `${fmt(value)} ${currentBirim}` : `${(value as number).toFixed(1)}%`,
                      name === 'value' ? selectedUnsur : 'Yıllık Değişim'
                    ]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name={selectedUnsur} fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line yAxisId="right" type="monotone" dataKey="change" name="Yıllık Değişim %" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── Grafik 2 & 3: İl Sıralaması + Pie ─── */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🏙️ İl Sıralaması — Top 20 ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                    {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 İl Payları</h3>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie data={cityData.slice(0, 10)} cx="50%" cy="50%" outerRadius={150}
                    dataKey="value"
                    label={({ name, percent }) => `${(name || '').substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {cityData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── Grafik 4: Bölge Karşılaştırması ─── */}
          {regionData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">🗺️ Bölge Karşılaştırması ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="value" name={selectedUnsur} radius={[4, 4, 0, 0]}>
                      {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ─── Grafik 5: Ürünler Arası Karşılaştırma ─── */}
          {productCompareData.length > 1 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">📊 Ürün Karşılaştırması ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={Math.max(250, productCompareData.length * 32)}>
                  <BarChart data={productCompareData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={200} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                      {productCompareData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ─── Grafik 6: Scatter — Alan vs Üretim vs Verim ─── */}
          {scatterData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">🔵 Alan – Üretim – Verim İlişkisi ({selectedYear})</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 8px 0' }}>
                  X: Ekilen Alan (Dekar) — Y: Üretim (Ton) — Nokta Boyutu: Verim (Kg/Dekar)
                </p>
                <ResponsiveContainer width="100%" height={360}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="area" name="Ekilen Alan" unit=" dek"
                      tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="number" dataKey="production" name="Üretim" unit=" ton"
                      tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="verim" range={[60, 600]} name="Verim" unit=" kg/dek" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as ScatterRow;
                        return (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                            <div>Ekilen Alan: {fmt(d.area)} dekar</div>
                            <div>Üretim: {fmt(d.production)} ton</div>
                            <div>Verim: {fmt(d.verim)} kg/dek</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatterData} fill="#8b5cf6">
                      {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ─── Grafik 7: İlçe Detayı ─── */}
          {selectedProvince && districtData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">🏘️ {selectedProvince} İlçe Detayı ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={Math.max(250, districtData.length * 30)}>
                  <BarChart data={districtData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                      {districtData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ─── Grafik 8: Treemap — İl Yoğunlaşma ─── */}
          {cityData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card">
                <h3 className="chart-title">🗺️ Üretim Yoğunlaşması</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <Treemap
                    data={cityData.slice(0, 15)}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="var(--bg-card)"
                    content={({ x, y, width, height, name }: { x: number; y: number; width: number; height: number; name: string }) => {
                      const idx = cityData.findIndex(c => c.name === name);
                      return (
                        <g>
                          <rect x={x} y={y} width={width} height={height}
                            style={{ fill: COLORS[idx % COLORS.length], stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                          {width > 50 && height > 25 && (
                            <text x={x + width / 2} y={y + height / 2} textAnchor="middle"
                              fill="#fff" fontSize={11} fontWeight="bold">
                              {(name || '').substring(0, 10)}
                            </text>
                          )}
                        </g>
                      );
                    }}
                  />
                </ResponsiveContainer>
              </div>

              {/* ─── Grafik 9: Radar Çoklu Yıl ─── */}
              {radarData.length > 0 && (
                <div className="chart-card">
                  <h3 className="chart-title">🎯 Top İller — Çoklu Yıl Karşılaştırması</h3>
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="il" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        tickFormatter={v => fmtShort(Number(v))} />
                      {radarYears.map((y, i) => (
                        <Radar key={y} name={String(y)} dataKey={String(y)}
                          stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15 + i * 0.1} />
                      ))}
                      <Legend />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Ton']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ─── Grafik 10 & 11: Üretim-Alan-Verim + Decomposition ─── */}
          {yieldTrendData.length > 0 && (
            <div className="chart-grid">
              {/* Sol: Gerçek Değerler (3 Eksen) */}
              <div className="chart-card">
                <h3 className="chart-title">📊 Üretim-Alan-Verim Trendi</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
                  🔵 Üretim (ton) | 🟢 Alan (dekar) | 🟠 Verim (kg/dek)
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={yieldTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                    <YAxis yAxisId="uretim" tick={{ fill: '#3b82f6', fontSize: 9 }}
                      tickFormatter={v => fmtShort(v)} />
                    <YAxis yAxisId="alan" orientation="right" tick={{ fill: '#22c55e', fontSize: 9 }}
                      tickFormatter={v => fmtShort(v)} />
                    <YAxis yAxisId="verim" orientation="right" tick={{ fill: '#f59e0b', fontSize: 9 }}
                      tickFormatter={v => fmtShort(v)} dx={40} />
                    <Tooltip formatter={(v: number, name: string) => [
                      name === 'uretim' ? `${fmt(v)} ton` : name === 'alan' ? `${fmt(v)} dekar` : `${v.toFixed(1)} kg/dek`,
                      name === 'uretim' ? 'Üretim' : name === 'alan' ? 'Ekilen Alan' : 'Verim'
                    ]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Line yAxisId="uretim" type="monotone" dataKey="uretim" name="Üretim" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line yAxisId="alan" type="monotone" dataKey="alan" name="Alan" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line yAxisId="verim" type="monotone" dataKey="verim" name="Verim" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Sağ: Üretim Artışı Decomposition */}
              <div className="chart-card">
                <h3 className="chart-title">🧬 Üretim Artışı Kaynağı</h3>
                {(() => {
                  const hasDecomposition = yieldTrendData.some(d => 
                    (d.alanEtkisi && Math.abs(d.alanEtkisi) > 0.01) || 
                    (d.verimEtkisi && Math.abs(d.verimEtkisi) > 0.01)
                  );
                  return hasDecomposition ? (
                    <>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '2px', lineHeight: '1.4' }}>
                        <strong>🟩 Alan Genişlemesi:</strong> Verim sabit, alan arttı • <strong>🟨 Verim Artışı:</strong> Alan sabit, verim arttı<br/>
                        <strong>🟦 Sinerjik Etki:</strong> Hem alan hem verim birlikte değiştiğinde oluşan ekstra etki (ΔAlan × ΔVerim)
                      </p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={yieldTrendData.slice(1)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                            tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                          <Tooltip formatter={(v: number, name: string) => [
                            `${v >= 0 ? '+' : ''}${fmt(v)} ton`,
                            name === 'alanEtkisi' ? '🟩 Alan Etkisi' : name === 'verimEtkisi' ? '🟨 Verim Etkisi' : '🟦 Sinerjik Etki'
                          ]}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="alanEtkisi" name="Alan Etkisi" stackId="a" fill="#22c55e" />
                          <Bar dataKey="verimEtkisi" name="Verim Etkisi" stackId="a" fill="#f59e0b" />
                          <Bar dataKey="etkilesim" name="Sinerjik Etki" stackId="a" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
                        📊 Yıllık üretim değişimi (Alan/verim verisi mevcut değil)
                      </p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={yieldTrendData.slice(1)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                            tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                          <Tooltip formatter={(v: number) => [
                            `${v >= 0 ? '+' : ''}${fmt(v)} ton`,
                            'Üretim Değişimi'
                          ]}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                          <Bar dataKey="uretimDegisimi" name="Üretim Değişimi" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── Detay Tablosu ─── */}
          <div className="data-table">
            <h3 className="data-table-title">📋 İl Sıralaması — {selectedUnsur} ({selectedYear})</h3>
            {cityData.map((city, i) => (
              <div className="table-row" key={city.name}
                style={{ cursor: 'pointer', background: selectedProvince === city.name ? 'var(--bg-hover)' : undefined }}
                onClick={() => setSelectedProvince(selectedProvince === city.name ? '' : city.name)}>
                <div className={`table-rank ${i < 3 ? 'green' : ''}`}>{i + 1}</div>
                <div className="table-info">
                  <div className="table-name">{city.name}</div>
                  <div className="table-subtext">Pay: %{city.share}</div>
                </div>
                <div className="table-value green">{fmt(city.value)} {currentBirim}</div>
              </div>
            ))}
            {cityData.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>Veri bulunamadı</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
