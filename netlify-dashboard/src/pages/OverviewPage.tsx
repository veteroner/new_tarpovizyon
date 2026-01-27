import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Line
} from 'recharts';
import { fetchQuery } from '../services/api';

// Kategori bazlı renk paletleri
const COLORS = {
  milk: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  meat: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  egg: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  grain: ['#eab308', '#fde047', '#fef08a', '#fef9c3'],
  fruit: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  economy: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  land: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'],
  general: ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb']
};

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

interface DataItem {
  name: string;
  value: number;
  fill: string;
  unit?: string;
  [key: string]: string | number | undefined;
}

interface YearlyData {
  year: string;
  [key: string]: string | number;
}

interface OverviewData {
  // Genel Bilgiler
  population: number;
  ruralPopulation: number;
  urbanPopulation: number;
  gdp: number;
  gdpPerCapita: number;
  agriculturalGDP: number;
  agriculturalGDPShare: number;
  agriculturalEmployment: number;
  agriculturalEmploymentShare: number;
  totalEmployment: number;
  
  // Arazi
  agriculturalLand: number;
  totalLand: number;
  landUseData: DataItem[];
  
  // Hayvansal Üretim - Kategorik
  milkProduction: {
    total: number;
    cattle: number;
    sheep: number;
    goat: number;
    buffalo: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  
  meatProduction: {
    total: number;
    redMeat: number;
    whiteMeat: number;
    cattle: number;
    sheep: number;
    goat: number;
    buffalo: number;
    chicken: number;
    turkey: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  
  eggProduction: {
    total: number;
    chicken: number;
    other: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  
  // Hayvan Varlığı
  livestockStocks: {
    cattle: number;
    sheep: number;
    goat: number;
    poultry: number;
    breakdown: DataItem[];
    regional: {
      cattle: DataItem[];
      sheep: DataItem[];
      goat: DataItem[];
      poultry: DataItem[];
    };
  };
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regionalGroup, setRegionalGroup] = useState<'cattle' | 'sheep' | 'goat' | 'poultry'>('cattle');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        populationRes,
        gdpRes,
        gdpPerCapitaRes,
        landRes,
        
        // Süt ürünleri
        milkTotalRes,
        milkBreakdownRes,
        milkYearlyRes,
        
        // Et ürünleri
        redMeatBreakdownRes,
        whiteMeatBreakdownRes,
        meatYearlyRes,
        
        // Yumurta
        eggTotalRes,
        eggBreakdownRes,
        eggYearlyRes,
          agriGdpRes,
          agriGdpShareRes,
          agriEmpRes,
          agriEmpShareRes,
        
        // Hayvan varlığı
        livestockStocksRes,
        regionalCattleRes,
        regionalSheepRes,
        regionalGoatRes,
        regionalPoultryRes
      ] = await Promise.all([
        // Genel veriler
        fetchQuery(`SELECT total_v, kirsal_v, sehir_v FROM fao_nufus WHERE year=2023 AND area='Türkiye' LIMIT 1`),
        fetchQuery(`SELECT value FROM fao_makro_1 WHERE year='2023' AND area='Türkiye' AND item='Gross Domestic Product' AND elementcode=6225 AND unit='million' LIMIT 1`),
        fetchQuery(`SELECT value FROM fao_makro_1 WHERE year='2023' AND area='Türkiye' AND item='Gross Domestic Product' AND elementcode=6185 AND unit='USD' LIMIT 1`),
        fetchQuery(`SELECT item_tr, value FROM fao_land_use WHERE year=2022 AND area='Türkiye'`), 
        
        // SÜT ÜRÜNLERİ
        fetchQuery(`SELECT SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%'`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%' GROUP BY item ORDER BY total DESC`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%' AND year >= 2010 GROUP BY year ORDER BY year`),
        
          // Tarımsal katma değer (Tarım+Orman+Balıkçılık)
          fetchQuery(`SELECT value FROM fao_makro_1 WHERE year='2023' AND area='Türkiye' AND item='Value Added (Agriculture, Forestry and Fishing)' AND element='Value' AND elementcode=6225 AND unit='million' LIMIT 1`),
          fetchQuery(`SELECT value FROM fao_makro_1 WHERE year='2023' AND area='Türkiye' AND item='Value Added (Agriculture, Forestry and Fishing)' AND element='Share' AND unit='%' LIMIT 1`),
          // Tarım istihdamı (Toplam 15+)
          fetchQuery(`SELECT Value as value FROM fao_nufus_tarim_istihdam WHERE Area='Türkiye' AND Year='2023' AND Indicator='Employment in agriculture by age, total (15+)' AND Sex='Total' LIMIT 1`),
          fetchQuery(`SELECT Value as value FROM fao_nufus_tarim_istihdam WHERE Area='Türkiye' AND Year='2023' AND Indicator='Share of employment in agriculture in total employment' AND Sex='Total' LIMIT 1`),
        // ET ÜRÜNLERİ - Kırmızı Et Detaylı
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item IN ('Meat of cattle with the bone, fresh or chilled', 'Meat of sheep, fresh or chilled', 'Meat of goat, fresh or chilled', 'Meat of buffalo, fresh or chilled') GROUP BY item`),
        // ET ÜRÜNLERİ - Beyaz Et Detaylı
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item IN ('Meat of chickens, fresh or chilled', 'Meat of turkeys, fresh or chilled') GROUP BY item`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%meat%' AND year >= 2010 GROUP BY year ORDER BY year`),
        
        // YUMURTA
        fetchQuery(`SELECT SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%'`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%' GROUP BY item`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%' AND year >= 2010 GROUP BY year ORDER BY year`),
        
        // HAYVAN VARLIĞI (TÜİK - ülke düzeyi)
        fetchQuery(`SELECT grup, SUM(COALESCE(y2023,0)) as total FROM tuik_hayvansayisi WHERE duzey='ülke' AND yer='TÜRKİYE' AND grup IN ('Sığır','Koyun','Keçi','Tavuk','Hindi') GROUP BY grup`),
        // HAYVAN VARLIĞI (TÜİK - bölge düzeyi) - Top 12
        fetchQuery(`SELECT yer, SUM(COALESCE(y2023,0)) as total FROM tuik_hayvansayisi WHERE duzey IN ('bölge','bolge') AND grup='Sığır' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(COALESCE(y2023,0)) as total FROM tuik_hayvansayisi WHERE duzey IN ('bölge','bolge') AND grup='Koyun' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(COALESCE(y2023,0)) as total FROM tuik_hayvansayisi WHERE duzey IN ('bölge','bolge') AND grup='Keçi' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(CASE WHEN grup='Tavuk' THEN COALESCE(y2023,0) WHEN grup='Hindi' THEN COALESCE(y2023,0) ELSE 0 END) as total FROM tuik_hayvansayisi WHERE duzey IN ('bölge','bolge') AND grup IN ('Tavuk','Hindi') GROUP BY yer ORDER BY total DESC LIMIT 12`)
      ]);

      // Nüfus
      const popData = populationRes.data?.[0];
      const population = Number(popData?.total_v) * 1000 || 0;
      const ruralPopulation = Number(popData?.kirsal_v) * 1000 || 0;
      const urbanPopulation = Number(popData?.sehir_v) * 1000 || 0;

      // GSYİH
      // fao_makro_1: GDP = elementcode 6225, unit=million (milyon USD)
      // kişi başı = elementcode 6185, unit=USD
      const gdp = (Number(gdpRes.data?.[0]?.value) || 0) * 1e6;
      const gdpPerCapita = Number(gdpPerCapitaRes.data?.[0]?.value) || 0;

      // Tarımsal katma değer
      const agriculturalGDP = (Number(agriGdpRes.data?.[0]?.value) || 0) * 1e6;
      const agriculturalGDPShare = Number(agriGdpShareRes.data?.[0]?.value) || 0;

      // Tarım istihdamı
      const agriculturalEmployment = (Number(agriEmpRes.data?.[0]?.value) || 0) * 1000;
      const agriculturalEmploymentShare = Number(agriEmpShareRes.data?.[0]?.value) || 0;
      const totalEmployment = agriculturalEmploymentShare > 0
        ? agriculturalEmployment / (agriculturalEmploymentShare / 100)
        : 0;

      // Arazi
      const landMap: Record<string, number> = {};
      landRes.data?.forEach(item => {
        landMap[String(item.item_tr)] = Number(item.value) * 1000 || 0;
      });

      const agriculturalLand = landMap['Tarım'] || 0;
      const totalLand = landMap['Kara alanı'] || landMap['Ülke yüzölçümü'] || 0;
      const forestLand = landMap['Orman arazisi'] || 0;
      const otherLand = totalLand - agriculturalLand - forestLand;

      const landUseData: DataItem[] = [
        { name: 'Tarım Arazisi', value: agriculturalLand, fill: COLORS.land[0] },
        { name: 'Orman', value: forestLand, fill: COLORS.land[1] },
        { name: 'Diğer (Yerleşim, Çorak)', value: otherLand > 0 ? otherLand : 0, fill: COLORS.general[2] },
      ].filter(item => item.value > 0);

      // SÜT ÜRETİMİ
      const milkTotal = Number(milkTotalRes.data?.[0]?.total) || 0;
      const milkBreakdown: DataItem[] = (milkBreakdownRes.data || []).map((item, idx) => ({
        name: translateMilkItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.milk[idx % COLORS.milk.length],
        unit: 'ton'
      }));
      const milkYearly: YearlyData[] = (milkYearlyRes.data || []).map(item => ({
        year: String(item.year),
        milk: Number(item.total) || 0
      }));

      // ET ÜRETİMİ - Detaylı
      function translateMeatItem(item: string): string {
        const translations: Record<string, string> = {
          'Meat of cattle with the bone, fresh or chilled': 'Sığır Eti',
          'Meat of sheep, fresh or chilled': 'Koyun Eti',
          'Meat of goat, fresh or chilled': 'Keçi Eti',
          'Meat of buffalo, fresh or chilled': 'Manda Eti',
          'Meat of chickens, fresh or chilled': 'Piliç Eti',
          'Meat of turkeys, fresh or chilled': 'Hindi Eti'
        };
        return translations[item] || item;
      }

      const redMeatBreakdown: DataItem[] = (redMeatBreakdownRes.data || []).map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.meat[idx % COLORS.meat.length],
        unit: 'ton'
      }));

      const whiteMeatBreakdown: DataItem[] = (whiteMeatBreakdownRes.data || []).map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.meat[idx + 2 % COLORS.meat.length],
        unit: 'ton'
      }));

      const cattle = redMeatBreakdown.find(m => m.name.includes('Sığır'))?.value || 0;
      const sheep = redMeatBreakdown.find(m => m.name.includes('Koyun'))?.value || 0;
      const goat = redMeatBreakdown.find(m => m.name.includes('Keçi'))?.value || 0;
      const buffalo = redMeatBreakdown.find(m => m.name.includes('Manda'))?.value || 0;
      const chicken = whiteMeatBreakdown.find(m => m.name.includes('Piliç'))?.value || 0;
      const turkey = whiteMeatBreakdown.find(m => m.name.includes('Hindi'))?.value || 0;

      const redMeat = cattle + sheep + goat + buffalo;
      const whiteMeat = chicken + turkey;
      const meatTotal = redMeat + whiteMeat;

      const meatBreakdown: DataItem[] = [...redMeatBreakdown, ...whiteMeatBreakdown];
      const meatYearly: YearlyData[] = (meatYearlyRes.data || []).map(item => ({
        year: String(item.year),
        meat: Number(item.total) || 0
      }));

      // YUMURTA
      const eggTotal = Number(eggTotalRes.data?.[0]?.total) || 0;
      const eggBreakdown: DataItem[] = (eggBreakdownRes.data || []).map((item, idx) => ({
        name: translateEggItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.egg[idx % COLORS.egg.length],
        unit: 'adet'
      }));
      const eggYearly: YearlyData[] = (eggYearlyRes.data || []).map(item => ({
        year: String(item.year),
        egg: Number(item.total) || 0
      }));

      // HAYVAN VARLIĞI (TÜİK)
      const livestockStocksBreakdown: DataItem[] = (livestockStocksRes.data || []).map((row, idx) => ({
        name: translateLivestockStock(String((row as any).grup ?? '')),
        value: Number((row as any).total) || 0,
        fill: COLORS.general[idx % COLORS.general.length],
        unit: 'baş'
      }));

      const livestockCattle = livestockStocksBreakdown.find(l => l.name.includes('Sığır'))?.value || 0;
      const livestockSheep = livestockStocksBreakdown.find(l => l.name.includes('Koyun'))?.value || 0;
      const livestockGoat = livestockStocksBreakdown.find(l => l.name.includes('Keçi'))?.value || 0;
      const livestockPoultry = (livestockStocksBreakdown.find(l => l.name.includes('Tavuk'))?.value || 0)
        + (livestockStocksBreakdown.find(l => l.name.includes('Hindi'))?.value || 0);

      const mapRegional = (res: any, palette: string[]): DataItem[] =>
        (res?.data || []).map((row: Record<string, string | number>, idx: number) => ({
          name: String(row.yer || ''),
          value: Number(row.total) || 0,
          fill: palette[idx % palette.length],
          unit: 'baş'
        }));

      const livestockRegional = {
        cattle: mapRegional(regionalCattleRes, COLORS.milk),
        sheep: mapRegional(regionalSheepRes, COLORS.grain),
        goat: mapRegional(regionalGoatRes, COLORS.fruit),
        poultry: mapRegional(regionalPoultryRes, COLORS.egg),
      };

      setData({
        population,
        ruralPopulation,
        urbanPopulation,
        gdp,
        gdpPerCapita,
        agriculturalGDP,
        agriculturalGDPShare,
        agriculturalEmployment,
        agriculturalEmploymentShare,
        totalEmployment,
        agriculturalLand,
        totalLand,
        landUseData,
        
        milkProduction: {
          total: milkTotal,
          cattle: milkBreakdown.find(m => m.name.includes('İnek'))?.value || 0,
          sheep: milkBreakdown.find(m => m.name.includes('Koyun'))?.value || 0,
          goat: milkBreakdown.find(m => m.name.includes('Keçi'))?.value || 0,
          buffalo: milkBreakdown.find(m => m.name.includes('Manda'))?.value || 0,
          breakdown: milkBreakdown,
          yearly: milkYearly
        },
        
        meatProduction: {
          total: meatTotal,
          redMeat,
          whiteMeat,
          cattle,
          sheep,
          goat,
          buffalo,
          chicken,
          turkey,
          breakdown: meatBreakdown,
          yearly: meatYearly
        },
        
        eggProduction: {
          total: eggTotal,
          chicken: eggBreakdown[0]?.value || 0,
          other: eggBreakdown[1]?.value || 0,
          breakdown: eggBreakdown,
          yearly: eggYearly
        },
        
        livestockStocks: {
          cattle: livestockCattle,
          sheep: livestockSheep,
          goat: livestockGoat,
          poultry: livestockPoultry,
          breakdown: livestockStocksBreakdown,
          regional: livestockRegional
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Çeviri fonksiyonları
  function translateMilkItem(item: string): string {
    const translations: Record<string, string> = {
      'Raw milk of cattle': 'İnek Sütü',
      'Raw milk of buffalo': 'Manda Sütü',
      'Raw milk of goats': 'Keçi Sütü',
      'Raw milk of sheep': 'Koyun Sütü',
      'Raw milk of camel': 'Deve Sütü'
    };
    return translations[item] || item.split(',')[0];
  }

  function translateEggItem(item: string): string {
    const translations: Record<string, string> = {
      'Hen eggs in shell, fresh': 'Tavuk Yumurtası',
      'Eggs from other birds in shell, fresh, n.e.c.': 'Diğer Kuş Yumurtaları'
    };
    return translations[item] || item;
  }

  function translateLivestockStock(item: string): string {
    const translations: Record<string, string> = {
      'Cattle': 'Sığır',
      'Sheep': 'Koyun',
      'Goats': 'Keçi',
      'Chickens': 'Tavuk',
      'Turkeys': 'Hindi',
      'Horses': 'At',
      'Asses': 'Eşek',
      'Mules': 'Katır',
      'Buffaloes': 'Manda',
      'Camels': 'Deve'
    };
    return translations[item] || item;
  }

  const ruralPercent = data ? ((data.ruralPopulation / data.population) * 100).toFixed(1) : '0';
  const urbanPercent = data ? ((data.urbanPopulation / data.population) * 100).toFixed(1) : '0';
  const agriLandPercent = data && data.totalLand > 0 ? ((data.agriculturalLand / data.totalLand) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🇹🇷 Türkiye Tarım Paneli</h1>
        <p className="page-subtitle">Türkiye Tarım, Hayvancılık ve Ekonomik Göstergeler - 2023</p>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* ==================== GENEL BAKIŞ ==================== */}
          <div className="section-header" style={{marginTop: '2rem', marginBottom: '1rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)'}}>📊 Genel Göstergeler</h2>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">NÜFUS</span><div className="kpi-icon blue">👥</div></div>
              <div className="kpi-value">{formatNumber(data?.population || 0)}</div>
              <div className="kpi-subtitle">2023 Yılı</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">GSYİH</span><div className="kpi-icon green">💰</div></div>
              <div className="kpi-value">{data?.gdp ? `$${formatNumber(data.gdp)}` : '—'}</div>
              <div className="kpi-subtitle">USD (2023)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI GSYİH</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">{data?.gdpPerCapita ? `$${formatNumber(data.gdpPerCapita)}` : '—'}</div>
              <div className="kpi-subtitle">USD/kişi</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIM ARAZİSİ</span><div className="kpi-icon green">🌾</div></div>
              <div className="kpi-value">{formatNumber(data?.agriculturalLand || 0)} ha</div>
              <div className="kpi-subtitle">Toplam alanın %{agriLandPercent}'i</div>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginTop: '1rem' }}>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIMSAL KATMA DEĞER</span><div className="kpi-icon green">🌱</div></div>
              <div className="kpi-value">{data?.agriculturalGDP ? `$${formatNumber(data.agriculturalGDP)}` : '—'}</div>
              <div className="kpi-subtitle">Tarım+Orman+Balıkçılık (2023)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIM PAYI (GSYİH)</span><div className="kpi-icon blue">📌</div></div>
              <div className="kpi-value">{data?.agriculturalGDPShare ? `%${data.agriculturalGDPShare.toFixed(1)}` : '—'}</div>
              <div className="kpi-subtitle">GSYİH içindeki pay</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIM İSTİHDAMI</span><div className="kpi-icon orange">👨‍🌾</div></div>
              <div className="kpi-value">{data?.agriculturalEmployment ? formatNumber(data.agriculturalEmployment) : '—'}</div>
              <div className="kpi-subtitle">Kişi (15+), 2023</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIM PAYI (İSTİHDAM)</span><div className="kpi-icon pink">%</div></div>
              <div className="kpi-value">{data?.agriculturalEmploymentShare ? `%${data.agriculturalEmploymentShare.toFixed(1)}` : '—'}</div>
              <div className="kpi-subtitle">Toplam istihdam içindeki pay</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">👥 Nüfus Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: `Kentsel`, value: data?.urbanPopulation || 0, fill: COLORS.economy[0], label: `%${urbanPercent}` },
                      { name: `Kırsal`, value: data?.ruralPopulation || 0, fill: COLORS.economy[2], label: `%${ruralPercent}` }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name }) => `${name} %${name === 'Kentsel' ? urbanPercent : ruralPercent}`}
                  />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' kişi', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🌍 Arazi Kullanımı (2022)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.landUseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ha', '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data?.landUseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== SÜT ÜRETİMİ ==================== */}
          <div className="section-header" style={{marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6'}}>🥛 Süt Üretimi</h2>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card large" style={{borderLeft: '4px solid #3b82f6'}}>
              <div className="kpi-header"><span className="kpi-title">TOPLAM SÜT</span><div className="kpi-icon" style={{background: '#dbeafe', color: '#3b82f6'}}>🥛</div></div>
              <div className="kpi-value" style={{color: '#3b82f6'}}>{formatNumber(data?.milkProduction.total || 0)} ton</div>
              <div className="kpi-subtitle">2023 Yılı Toplam</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İNEK SÜTÜ</span></div>
              <div className="kpi-value">{formatNumber(data?.milkProduction.cattle || 0)} ton</div>
              <div className="kpi-subtitle">Toplam süt üretiminin %{((data?.milkProduction.cattle || 0) / (data?.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KOYUN SÜTÜ</span></div>
              <div className="kpi-value">{formatNumber(data?.milkProduction.sheep || 0)} ton</div>
              <div className="kpi-subtitle">Toplam süt üretiminin %{((data?.milkProduction.sheep || 0) / (data?.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KEÇİ SÜTÜ</span></div>
              <div className="kpi-value">{formatNumber(data?.milkProduction.goat || 0)} ton</div>
              <div className="kpi-subtitle">Toplam süt üretiminin %{((data?.milkProduction.goat || 0) / (data?.milkProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥧 Süt Türlerine Göre Dağılım (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.milkProduction.breakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data?.milkProduction.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Süt Üretim Trendi (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.milkProduction.yearly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', 'Üretim']} />
                  <Area type="monotone" dataKey="milk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== ET ÜRETİMİ ==================== */}
          <div className="section-header" style={{marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#ef4444'}}>🥩 Et Üretimi</h2>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card large" style={{borderLeft: '4px solid #ef4444'}}>
              <div className="kpi-header"><span className="kpi-title">TOPLAM ET</span><div className="kpi-icon" style={{background: '#fee2e2', color: '#ef4444'}}>🥩</div></div>
              <div className="kpi-value" style={{color: '#ef4444'}}>{formatNumber(data?.meatProduction.total || 0)} ton</div>
              <div className="kpi-subtitle">2023 Yılı Toplam</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KIRMIZI ET</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.redMeat || 0)} ton</div>
              <div className="kpi-subtitle">Toplam etin %{((data?.meatProduction.redMeat || 0) / (data?.meatProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">BEYAZ ET</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.whiteMeat || 0)} ton</div>
              <div className="kpi-subtitle">Toplam etin %{((data?.meatProduction.whiteMeat || 0) / (data?.meatProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">BEYAZ/KIRMIZI</span></div>
              <div className="kpi-value">{((data?.meatProduction.whiteMeat || 0) / (data?.meatProduction.redMeat || 1)).toFixed(2)}</div>
              <div className="kpi-subtitle">Oran</div>
            </div>
          </div>

          {/* KIRMIZI ET DETAY */}
          <div className="section-header" style={{marginTop: '2rem', marginBottom: '1rem'}}>
            <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: '#dc2626'}}>🐄 Kırmızı Et Detayı</h3>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">SIĞIR ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.cattle || 0)} ton</div>
              <div className="kpi-subtitle">Kırmızı etin %{((data?.meatProduction.cattle || 0) / (data?.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KOYUN ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.sheep || 0)} ton</div>
              <div className="kpi-subtitle">Kırmızı etin %{((data?.meatProduction.sheep || 0) / (data?.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KEÇİ ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.goat || 0)} ton</div>
              <div className="kpi-subtitle">Kırmızı etin %{((data?.meatProduction.goat || 0) / (data?.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">MANDA ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.buffalo || 0)} ton</div>
              <div className="kpi-subtitle">Kırmızı etin %{((data?.meatProduction.buffalo || 0) / (data?.meatProduction.redMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
          </div>

          {/* BEYAZ ET DETAY */}
          <div className="section-header" style={{marginTop: '2rem', marginBottom: '1rem'}}>
            <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: '#fb923c'}}>🐔 Beyaz Et Detayı</h3>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">PİLİÇ ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.chicken || 0)} ton</div>
              <div className="kpi-subtitle">Beyaz etin %{((data?.meatProduction.chicken || 0) / (data?.meatProduction.whiteMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">HİNDİ ETİ</span></div>
              <div className="kpi-value">{formatNumber(data?.meatProduction.turkey || 0)} ton</div>
              <div className="kpi-subtitle">Beyaz etin %{((data?.meatProduction.turkey || 0) / (data?.meatProduction.whiteMeat || 1) * 100).toFixed(0)}'i</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥩 Et Türleri Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.meatProduction.breakdown} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data?.meatProduction.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Et Üretim Trendi (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.meatProduction.yearly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', 'Üretim']} />
                  <Area type="monotone" dataKey="meat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== YUMURTA ÜRETİMİ ==================== */}
          <div className="section-header" style={{marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b'}}>🥚 Yumurta Üretimi</h2>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card large" style={{borderLeft: '4px solid #f59e0b'}}>
              <div className="kpi-header"><span className="kpi-title">TOPLAM YUMURTA</span><div className="kpi-icon" style={{background: '#fef3c7', color: '#f59e0b'}}>🥚</div></div>
              <div className="kpi-value" style={{color: '#f59e0b'}}>{formatNumber(data?.eggProduction.total || 0)} adet</div>
              <div className="kpi-subtitle">2023 Yılı Toplam</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TAVUK YUMURTASI</span></div>
              <div className="kpi-value">{formatNumber(data?.eggProduction.chicken || 0)} adet</div>
              <div className="kpi-subtitle">Toplam üretimin %{((data?.eggProduction.chicken || 0) / (data?.eggProduction.total || 1) * 100).toFixed(0)}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI</span></div>
              <div className="kpi-value">{Math.round((data?.eggProduction.total || 0) / (data?.population || 1))}</div>
              <div className="kpi-subtitle">Adet/yıl</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">DİĞER YUMURTA</span></div>
              <div className="kpi-value">{formatNumber(data?.eggProduction.other || 0)} adet</div>
              <div className="kpi-subtitle">Diğer kuş yumurtaları</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥧 Yumurta Türleri (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.eggProduction.breakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                  >
                    {data?.eggProduction.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' adet', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Yumurta Üretim Trendi (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.eggProduction.yearly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' adet', 'Üretim']} />
                  <Area type="monotone" dataKey="egg" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== HAYVAN VARLIĞI ==================== */}
          <div className="section-header" style={{marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#6b7280'}}>🐄 Hayvan Varlığı (2023)</h2>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">SIĞIR</span><div className="kpi-icon">🐄</div></div>
              <div className="kpi-value">{formatNumber(data?.livestockStocks.cattle || 0)}</div>
              <div className="kpi-subtitle">Baş</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KOYUN</span><div className="kpi-icon">🐑</div></div>
              <div className="kpi-value">{formatNumber(data?.livestockStocks.sheep || 0)}</div>
              <div className="kpi-subtitle">Baş</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KEÇİ</span><div className="kpi-icon">🐐</div></div>
              <div className="kpi-value">{formatNumber(data?.livestockStocks.goat || 0)}</div>
              <div className="kpi-subtitle">Baş</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KANATLI</span><div className="kpi-icon">🐔</div></div>
              <div className="kpi-value">{formatNumber(data?.livestockStocks.poultry || 0)}</div>
              <div className="kpi-subtitle">Baş</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📊 Hayvan Varlığı Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data?.livestockStocks.breakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' baş', '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data?.livestockStocks.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem'}}>
                <h3 className="chart-title" style={{marginBottom: 0}}>🗺️ Bölgesel Dağılım (Top 12)</h3>
                <select
                  value={regionalGroup}
                  onChange={(e) => setRegionalGroup(e.target.value as any)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    background: 'white',
                    color: 'var(--text)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="cattle">Sığır</option>
                  <option value="sheep">Koyun</option>
                  <option value="goat">Keçi</option>
                  <option value="poultry">Kanatlı</option>
                </select>
              </div>

              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data?.livestockStocks.regional[regionalGroup]} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' baş', '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data?.livestockStocks.regional[regionalGroup].map((entry, index) => (
                      <Cell key={`cell-reg-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== KARŞILAŞTIRMALI ANALİZLER ==================== */}
          <div className="section-header" style={{marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6'}}>📊 Karşılaştırmalı Analizler</h2>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{gridColumn: 'span 2'}}>
              <h3 className="chart-title">📈 Hayvansal Üretim Kategorileri Karşılaştırması (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={
                  data?.milkProduction.yearly.map((item, idx) => ({
                    year: item.year,
                    süt: Number(item.milk) || 0,
                    et: Number(data?.meatProduction.yearly[idx]?.meat) || 0,
                    yumurta: Math.round((Number(data?.eggProduction.yearly[idx]?.egg) || 0) / 1000000) // Milyon adete çevir
                  }))
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatShort(v) + 'M'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'yumurta') return [formatNumber(value) + ' Milyon adet', 'Yumurta'];
                      return [formatNumber(value) + ' ton', name === 'süt' ? 'Süt' : 'Et'];
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="süt" fill={COLORS.milk[0]} fillOpacity={0.3} stroke={COLORS.milk[0]} name="Süt (ton)" />
                  <Area yAxisId="left" type="monotone" dataKey="et" fill={COLORS.meat[0]} fillOpacity={0.3} stroke={COLORS.meat[0]} name="Et (ton)" />
                  <Line yAxisId="right" type="monotone" dataKey="yumurta" stroke={COLORS.egg[0]} strokeWidth={3} name="Yumurta (M adet)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥧 Toplam Hayvansal Üretim Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Süt Üretimi', value: data?.milkProduction.total || 0, fill: COLORS.milk[0] },
                      { name: 'Et Üretimi', value: data?.meatProduction.total || 0, fill: COLORS.meat[0] },
                      { name: 'Diğer Ürünler', value: ((data?.milkProduction.total || 0) + (data?.meatProduction.total || 0)) * 0.15, fill: COLORS.general[2] }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                  >
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                <p>* Yumurta farklı birimde olduğu için dahil edilmemiştir</p>
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📊 Kişi Başı Yıllık Tüketim Tahmini</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={[
                    { name: 'Süt', value: Math.round((data?.milkProduction.total || 0) / (data?.population || 1)), fill: COLORS.milk[0], unit: 'kg' },
                    { name: 'Et', value: Math.round((data?.meatProduction.total || 0) / (data?.population || 1)), fill: COLORS.meat[0], unit: 'kg' },
                    { name: 'Yumurta', value: Math.round((data?.eggProduction.total || 0) / (data?.population || 1)), fill: COLORS.egg[0], unit: 'adet' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, _name: string, props: any) => [value + ' ' + props.payload.unit, '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: COLORS.milk[0] },
                      { fill: COLORS.meat[0] },
                      { fill: COLORS.egg[0] }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KATEGORİ ÖZET KARŞILAŞTIRMA */}
          <div className="data-table" style={{marginTop: '2rem'}}>
            <h3 className="data-table-title">📋 Kategori Özet Karşılaştırması (2023)</h3>
            <div className="table-row" style={{background: 'var(--bg-card)', fontWeight: '600', borderBottom: '2px solid var(--border)'}}>
              <div className="table-rank" style={{width: '200px'}}>Kategori</div>
              <div className="table-info" style={{flex: 1}}>Toplam Üretim</div>
              <div className="table-value" style={{width: '150px'}}>Kişi Başı</div>
              <div className="table-value" style={{width: '150px'}}>Yıllık Değişim</div>
            </div>
            <div className="table-row">
              <div className="table-name" style={{width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{width: '12px', height: '12px', borderRadius: '50%', background: COLORS.milk[0]}}></span>
                Süt Üretimi
              </div>
              <div className="table-info" style={{flex: 1}}>{formatNumber(data?.milkProduction.total || 0)} ton</div>
              <div className="table-value" style={{width: '150px'}}>{Math.round((data?.milkProduction.total || 0) / (data?.population || 1))} kg</div>
              <div className="table-value green" style={{width: '150px'}}>
                {(data?.milkProduction.yearly?.length || 0) >= 2 ? 
                  ((((Number(data?.milkProduction.yearly[data.milkProduction.yearly.length - 1]?.milk) || 0) - 
                     (Number(data?.milkProduction.yearly[data.milkProduction.yearly.length - 2]?.milk) || 0)) / 
                    (Number(data?.milkProduction.yearly[data.milkProduction.yearly.length - 2]?.milk) || 1)) * 100).toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>
            <div className="table-row">
              <div className="table-name" style={{width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{width: '12px', height: '12px', borderRadius: '50%', background: COLORS.meat[0]}}></span>
                Et Üretimi
              </div>
              <div className="table-info" style={{flex: 1}}>{formatNumber(data?.meatProduction.total || 0)} ton</div>
              <div className="table-value" style={{width: '150px'}}>{Math.round((data?.meatProduction.total || 0) / (data?.population || 1))} kg</div>
              <div className="table-value green" style={{width: '150px'}}>
                {(data?.meatProduction.yearly?.length || 0) >= 2 ?
                  ((((Number(data?.meatProduction.yearly[data.meatProduction.yearly.length - 1]?.meat) || 0) -
                     (Number(data?.meatProduction.yearly[data.meatProduction.yearly.length - 2]?.meat) || 0)) /
                    (Number(data?.meatProduction.yearly[data.meatProduction.yearly.length - 2]?.meat) || 1)) * 100).toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>
            <div className="table-row">
              <div className="table-name" style={{width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span style={{width: '12px', height: '12px', borderRadius: '50%', background: COLORS.egg[0]}}></span>
                Yumurta Üretimi
              </div>
              <div className="table-info" style={{flex: 1}}>{formatNumber(data?.eggProduction.total || 0)} adet</div>
              <div className="table-value" style={{width: '150px'}}>{Math.round((data?.eggProduction.total || 0) / (data?.population || 1))} adet</div>
              <div className="table-value green" style={{width: '150px'}}>
                {(data?.eggProduction.yearly?.length || 0) >= 2 ?
                  ((((Number(data?.eggProduction.yearly[data.eggProduction.yearly.length - 1]?.egg) || 0) -
                     (Number(data?.eggProduction.yearly[data.eggProduction.yearly.length - 2]?.egg) || 0)) /
                    (Number(data?.eggProduction.yearly[data.eggProduction.yearly.length - 2]?.egg) || 1)) * 100).toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
