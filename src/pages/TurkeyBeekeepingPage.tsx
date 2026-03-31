import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchQuery } from '../services/api';

type BeekeeperYearData = {
  il: string;
  '2013': number;
  '2014': number;
  '2015': number;
  '2016': number;
  '2017': number;
  '2018': number;
  '2019': number;
  '2020': number;
  '2021': number;
  '2022': number;
  '2023': number;
};

type ProvinceData = {
  il: string;
  balin_cesiti: string;
  aricilik_yapan_isletme_sayisi_adet: number;
  yeni_kovan_sayisi_adet: number;
  eski_kovan_sayisi_adet: number | string;
  toplam_kovan_adet: number;
  bal_uretimi_ton: number;
  balmumu_uretimi_ton: number;
  bal_verimi_kg: number;
};

type YearTrendData = {
  year: string;
  beekeepers: number;
  totalHives: number;
  newHives: number;
  oldHives: number;
};

type TuikKovanYearData = {
  year: string;
  eskiTip: number;
  yeniTip: number;
  toplam: number;
  balmumu: number;
};

type TuikProvinceKovan = {
  il: string;
  eskiTip: number;
  yeniTip: number;
  toplam: number;
  balmumu: number;
};

const COLORS = {
  primary: '#f59e0b',
  secondary: '#fbbf24',
  accent: '#d97706',
  success: '#10b981',
  danger: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
  cyan: '#06b6d4',
  emerald: '#10b981',
};

const HONEY_COLORS = [
  '#f59e0b', '#fbbf24', '#d97706', '#fb923c', '#fdba74',
  '#fed7aa', '#ea580c', '#c2410c', '#92400e', '#78350f'
];

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const str = String(value || '').trim().replace(/[^\d.,-]/g, '');
  if (!str || str === '-') return 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

function formatTon(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
}

export default function TurkeyBeekeepingPage() {
  const [loading, setLoading] = useState(true);
  const [beekeeperYearData, setBeekeeperYearData] = useState<BeekeeperYearData[]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  
  // TÜİK Kovan & Balmumu Verileri
  const [tuikKovanYear, setTuikKovanYear] = useState<TuikKovanYearData[]>([]);
  const [tuikProvinceKovan, setTuikProvinceKovan] = useState<TuikProvinceKovan[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load beekeeper trend data (2013-2023)
      const res1 = await fetchQuery('SELECT * FROM oner_i_llere_gore_arici_sayisi');
      const yearData = (res1.data ?? []) as Record<string, unknown>[];
      
      const parsedYearData = yearData.map(row => ({
        il: String(row['il'] || ''),
        '2013': parseNumber(row['2013_01_01_00_00_00']),
        '2014': parseNumber(row['2014_01_01_00_00_00']),
        '2015': parseNumber(row['2015_01_01_00_00_00']),
        '2016': parseNumber(row['2016_01_01_00_00_00']),
        '2017': parseNumber(row['2017_01_01_00_00_00']),
        '2018': parseNumber(row['2018_01_01_00_00_00']),
        '2019': parseNumber(row['2019_01_01_00_00_00']),
        '2020': parseNumber(row['2020_01_01_00_00_00']),
        '2021': parseNumber(row['2021_01_01_00_00_00']),
        '2022': parseNumber(row['2022_01_01_00_00_00']),
        '2023': parseNumber(row['2023_01_01_00_00_00']),
      }));
      setBeekeeperYearData(parsedYearData);

      // Load province detailed data
      const res2 = await fetchQuery('SELECT * FROM oner_i_llerin_bal_cesitleri');
      const provData = (res2.data ?? []) as Record<string, unknown>[];
      
      const parsedProvData = provData.map(row => ({
        il: String(row['il'] || ''),
        balin_cesiti: String(row['balin_cesiti'] || ''),
        aricilik_yapan_isletme_sayisi_adet: parseNumber(row['aricilik_yapan_isletme_sayisi_adet']),
        yeni_kovan_sayisi_adet: parseNumber(row['yeni_kovan_sayisi_adet']),
        eski_kovan_sayisi_adet: parseNumber(row['eski_kovan_sayisi_adet']),
        toplam_kovan_adet: parseNumber(row['toplam_kovan_adet']),
        bal_uretimi_ton: parseNumber(row['bal_uretimi_ton']),
        balmumu_uretimi_ton: parseNumber(row['balmumu_uretimi_ton']),
        bal_verimi_kg: parseNumber(row['bal_verimi_kg']),
      }));
      setProvinceData(parsedProvData);

      // TÜİK Kovan & Balmumu Verileri - Ülke Düzeyi (2004-2025)
      try {
        const tuikYears = ['2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'];
        const yearCols = tuikYears.map(y => '`' + y + '`').join(', ');
        const tuikQuery = `SELECT urun, tur, birim, ${yearCols} FROM tuik_hayvancilik_hayvansaluretim WHERE urun IN ('Balmumu', 'Kovan') AND duzeykod = 1`;
        const tuikRes = await fetchQuery(tuikQuery);
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const findRow = (urun: string, tur: string) => 
            tuikRes.data!.find((r: Record<string, string | number>) => r.urun === urun && r.tur === tur);
          
          const eskiRow = findRow('Kovan', 'Eski Tip');
          const yeniRow = findRow('Kovan', 'Yeni Tip');
          const balmumuRow = findRow('Balmumu', '');
          
          const yearData: TuikKovanYearData[] = tuikYears
            .map(year => {
              const eski = Number(String(eskiRow?.[year] || '0').replace(/\./g, '')) || 0;
              const yeni = Number(String(yeniRow?.[year] || '0').replace(/\./g, '')) || 0;
              const balmumu = parseFloat(String(balmumuRow?.[year] || '0')) || 0;
              return {
                year,
                eskiTip: eski,
                yeniTip: yeni,
                toplam: eski + yeni,
                balmumu,
              };
            })
            .filter(d => d.toplam > 0 || d.balmumu > 0);
          
          setTuikKovanYear(yearData);
        }

        // İl bazlı kovan & balmumu (en güncel yıl)
        const provQuery = `SELECT yer, 
          SUM(CASE WHEN urun='Kovan' AND tur='Eski Tip' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END) as eskiTip,
          SUM(CASE WHEN urun='Kovan' AND tur='Yeni Tip' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END) as yeniTip,
          SUM(CASE WHEN urun='Balmumu' THEN CAST(\`2024\` AS DECIMAL(10,3)) ELSE 0 END) as balmumu
          FROM tuik_hayvancilik_hayvansaluretim 
          WHERE urun IN ('Balmumu', 'Kovan') AND duzeykod = 3
          GROUP BY yer
          ORDER BY (SUM(CASE WHEN urun='Kovan' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END)) DESC`;
        const provRes = await fetchQuery(provQuery);
        
        if (provRes.data && provRes.data.length > 0) {
          const provKovan: TuikProvinceKovan[] = provRes.data.map((row: Record<string, string | number>) => ({
            il: String(row.yer || ''),
            eskiTip: Number(row.eskiTip) || 0,
            yeniTip: Number(row.yeniTip) || 0,
            toplam: (Number(row.eskiTip) || 0) + (Number(row.yeniTip) || 0),
            balmumu: parseFloat(String(row.balmumu)) || 0,
          }));
          setTuikProvinceKovan(provKovan);
        }
      } catch (tuikError) {
        console.warn('TÜİK kovan/balmumu verileri yüklenemedi:', tuikError);
      }

    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate year trend data
  const yearTrendData = useMemo<YearTrendData[]>(() => {
    const years = ['2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
    return years.map(year => {
      const totalBeekeepers = beekeeperYearData.reduce((sum, row) => sum + (row[year as keyof BeekeeperYearData] as number || 0), 0);
      return {
        year,
        beekeepers: totalBeekeepers,
        totalHives: 0, // Will be calculated if we have historical hive data
        newHives: 0,
        oldHives: 0,
      };
    });
  }, [beekeeperYearData]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalBeekeepers2023 = beekeeperYearData.reduce((sum, row) => sum + (row['2023'] || 0), 0);
    const totalBeekeepers2022 = beekeeperYearData.reduce((sum, row) => sum + (row['2022'] || 0), 0);
    const beekeeperGrowth = totalBeekeepers2022 > 0 
      ? ((totalBeekeepers2023 - totalBeekeepers2022) / totalBeekeepers2022 * 100) 
      : 0;

    const totalHives = provinceData.reduce((sum, row) => sum + row.toplam_kovan_adet, 0);
    const totalHoneyProduction = provinceData.reduce((sum, row) => sum + row.bal_uretimi_ton, 0);
    const totalBeeswaxProduction = provinceData.reduce((sum, row) => sum + row.balmumu_uretimi_ton, 0);
    const avgYield = provinceData.length > 0 
      ? provinceData.reduce((sum, row) => sum + row.bal_verimi_kg, 0) / provinceData.length 
      : 0;

    return {
      totalBeekeepers: totalBeekeepers2023,
      beekeeperGrowth,
      totalHives,
      totalHoneyProduction,
      totalBeeswaxProduction,
      avgYield,
    };
  }, [beekeeperYearData, provinceData]);

  // Top provinces by beekeepers
  const topBeekeepers = useMemo(() => {
    return beekeeperYearData
      .map(row => ({ il: row.il, count: row['2023'] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [beekeeperYearData]);

  // Top provinces by honey production
  const topProducers = useMemo(() => {
    return provinceData
      .map(row => ({ il: row.il, production: row.bal_uretimi_ton }))
      .sort((a, b) => b.production - a.production)
      .slice(0, 10);
  }, [provinceData]);

  // Top provinces by yield
  const topYield = useMemo(() => {
    return provinceData
      .filter(row => row.bal_verimi_kg > 0)
      .map(row => ({ il: row.il, yield: row.bal_verimi_kg }))
      .sort((a, b) => b.yield - a.yield)
      .slice(0, 10);
  }, [provinceData]);

  // Honey types distribution
  const honeyTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    provinceData.forEach(row => {
      const types = row.balin_cesiti.split(',').map(t => t.trim());
      types.forEach(type => {
        if (type && type !== '-') {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      });
    });

    return Array.from(typeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [provinceData]);

  // Treemap data for productivity analysis
  const treemapData = useMemo(() => {
    const data = provinceData
      .filter(row => row.bal_uretimi_ton > 0)
      .map(row => ({
        name: row.il,
        size: row.bal_uretimi_ton,
        yield: row.bal_verimi_kg,
        hives: row.toplam_kovan_adet,
        beekeepers: row.aricilik_yapan_isletme_sayisi_adet,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 30); // Top 30 provinces
    
    return [{ name: 'Türkiye', children: data }];
  }, [provinceData]);

  // TÜİK Kovan KPI'ları
  const tuikKovanKpi = useMemo(() => {
    if (tuikKovanYear.length === 0) return null;
    const latest = tuikKovanYear[tuikKovanYear.length - 1];
    const prev = tuikKovanYear.length >= 2 ? tuikKovanYear[tuikKovanYear.length - 2] : null;
    const first = tuikKovanYear[0];
    const yoy = prev && prev.toplam > 0 ? ((latest.toplam - prev.toplam) / prev.toplam * 100) : 0;
    const balmumuYoy = prev && prev.balmumu > 0 ? ((latest.balmumu - prev.balmumu) / prev.balmumu * 100) : 0;
    const years = tuikKovanYear.length - 1;
    const cagr = years > 0 && first.toplam > 0 ? (Math.pow(latest.toplam / first.toplam, 1 / years) - 1) * 100 : 0;
    const peak = tuikKovanYear.reduce((best, cur) => cur.toplam > best.toplam ? cur : best, tuikKovanYear[0]);
    const eskiPay = latest.toplam > 0 ? (latest.eskiTip / latest.toplam * 100) : 0;
    return { latest, prev, yoy, balmumuYoy, cagr, peak, eskiPay };
  }, [tuikKovanYear]);

  // Top 10 provinces by total kovan
  const tuikTopKovan = useMemo(() => {
    return tuikProvinceKovan.slice(0, 10);
  }, [tuikProvinceKovan]);

  // Top 10 provinces by balmumu
  const tuikTopBalmumu = useMemo(() => {
    return [...tuikProvinceKovan]
      .sort((a, b) => b.balmumu - a.balmumu)
      .slice(0, 10);
  }, [tuikProvinceKovan]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🐝 Türkiye Arıcılık Analizi</h1>
        <p className="page-subtitle">
          Kapsamlı arıcılık istatistikleri, bal üretimi ve verimlilik analizi
        </p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Arıcılık verileri yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Hero KPI Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
            gap: '20px', 
            marginBottom: '32px' 
          }}>
            {/* Total Beekeepers */}
            <div style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`, 
              padding: '24px', 
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🐝</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  TOPLAM ARICI SAYISI
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {formatNumber(kpiMetrics.totalBeekeepers)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  {kpiMetrics.beekeeperGrowth >= 0 ? '+' : ''}{kpiMetrics.beekeeperGrowth.toFixed(1)}% (2023 vs 2022)
                </div>
              </div>
            </div>

            {/* Total Hives */}
            <div style={{ 
              background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.primary} 100%)`, 
              padding: '24px', 
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(251, 191, 36, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🪔</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  TOPLAM KOVAN SAYISI
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {formatNumber(kpiMetrics.totalHives)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  Aktif Kovan (2023)
                </div>
              </div>
            </div>

            {/* Honey Production */}
            <div style={{ 
              background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.emerald} 100%)`, 
              padding: '24px', 
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🍯</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  BAL ÜRETİMİ
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {formatTon(kpiMetrics.totalHoneyProduction)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  Yıllık Toplam (2023)
                </div>
              </div>
            </div>

            {/* Beeswax Production */}
            <div style={{ 
              background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.cyan} 100%)`, 
              padding: '24px', 
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🕯️</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                  BALMUMU ÜRETİMİ
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                  {formatTon(kpiMetrics.totalBeeswaxProduction)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                  Yıllık Toplam (2023)
                </div>
              </div>
            </div>
          </div>

          {/* ─── 🧠 Intelligence Panel ─── */}
          {tuikKovanKpi && (
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '48px',
              marginBottom: '48px',
              color: 'white'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 Arıcılık Intelligence Özeti
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>KOVAN CAGR</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.cagr >= 0 ? '+' : ''}{tuikKovanKpi.cagr.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>SON YIL DEĞİŞİM</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.yoy >= 0 ? '+' : ''}{tuikKovanKpi.yoy.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Kovan sayısı artışı</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>ESKİ TİP KOVAN PAYI</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>%{tuikKovanKpi.eskiPay.toFixed(1)}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Modernizasyon seviyesi</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BALMUMU DEĞİŞİM</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.balmumuYoy >= 0 ? '+' : ''}{tuikKovanKpi.balmumuYoy.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son yıl balmumu</div>
                </div>
              </div>
            </div>
          )}

          {/* Beekeeping Development Section */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              📈 Arıcılık Gelişimi (2013-2023)
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye geneli arıcı sayısı ve kovan gelişimi tarihsel trend analizi
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Beekeeper Trend */}
            <div style={{ 
              gridColumn: 'span 2',
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐝 Arıcı Sayısı Gelişimi
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={yearTrendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBeekeepers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value) + ' arıcı', 'Toplam Arıcı']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="beekeepers" 
                    stroke={COLORS.primary} 
                    fill="url(#colorBeekeepers)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Provincial Leadership Analysis */}
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🏆 İl Bazlı Liderlik Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              En çok arıcı, en fazla üretim ve en yüksek verimli iller
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Top Beekeepers */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🐝 En Çok Arıcı Olan İller (2023)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={topBeekeepers} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
                  <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value) + ' arıcı']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]}>
                    {topBeekeepers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? COLORS.accent : COLORS.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Producers */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🍯 En Fazla Bal Üreten İller
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={topProducers} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
                  <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value) + ' ton']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="production" fill={COLORS.success} radius={[0, 6, 6, 0]}>
                    {topProducers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#059669' : COLORS.success} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Yield */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 En Yüksek Verimli İller (kg/kovan)
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={topYield} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(1) + ' kg/kovan']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="yield" fill={COLORS.blue} radius={[0, 6, 6, 0]}>
                    {topYield.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#2563eb' : COLORS.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Honey Types Distribution */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌸 Bal Çeşitleri Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={honeyTypesData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {honeyTypesData.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={HONEY_COLORS[index % HONEY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} il`]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productivity Analysis */}
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              ⚡ Verimlilik Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Kovan sayısı, bal verimi ve toplam üretim ilişkisi
            </p>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📍 İl Bazlı Bal Üretim Haritası
            </h3>
            <ResponsiveContainer width="100%" height={500}>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="#fff"
                fill={COLORS.primary}
                content={(props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; yield?: number; beekeepers?: number }) => {
                  const { x = 0, y = 0, width = 0, height = 0, name, size, yield: yieldVal, beekeepers } = props;
                  if (!name || name === 'Türkiye') return <g />;
                  
                  // Color based on yield
                  const getColor = (yieldValue: number) => {
                    if (yieldValue >= 20) return '#059669'; // Very high yield - dark green
                    if (yieldValue >= 15) return '#10b981'; // High yield - green
                    if (yieldValue >= 10) return '#fbbf24'; // Medium yield - yellow
                    if (yieldValue >= 7) return '#f59e0b'; // Low-medium yield - orange
                    return '#f97316'; // Low yield - dark orange
                  };

                  const fontSize = width > 80 ? 12 : width > 60 ? 10 : 0;
                  const showDetails = width > 100 && height > 60;
                  const yieldNumber = Number(yieldVal) || 0;
                  const sizeNumber = Number(size) || 0;
                  const beekeepersNumber = Number(beekeepers) || 0;
                  
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                          fill: getColor(yieldNumber),
                          stroke: '#fff',
                          strokeWidth: 2,
                          cursor: 'pointer',
                        }}
                      />
                      {fontSize > 0 && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - (showDetails ? 15 : 0)}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={fontSize}
                            fontWeight="700"
                          >
                            {name}
                          </text>
                          {showDetails && (
                            <>
                              <text
                                x={x + width / 2}
                                y={y + height / 2 + 5}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize={fontSize - 2}
                                fontWeight="600"
                              >
                                {formatNumber(sizeNumber)} ton
                              </text>
                              <text
                                x={x + width / 2}
                                y={y + height / 2 + 20}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.9)"
                                fontSize={fontSize - 3}
                              >
                                🐝 {formatNumber(beekeepersNumber)} | {yieldNumber.toFixed(1)} kg/kovan
                              </text>
                            </>
                          )}
                        </>
                      )}
                    </g>
                  );
                }}
              >
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    if (data.name === 'Türkiye') return null;
                    
                    return (
                      <div style={{
                        background: 'var(--bg-card)',
                        border: '2px solid var(--border)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                          📍 {data.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div>🍯 <strong>Bal Üretimi:</strong> {formatNumber(data.size)} ton</div>
                          <div>📊 <strong>Verim:</strong> {(data.yield || 0).toFixed(1)} kg/kovan</div>
                          <div>🪔 <strong>Kovan:</strong> {formatNumber(data.hives)}</div>
                          <div>🐝 <strong>Arıcı:</strong> {formatNumber(data.beekeepers)}</div>
                        </div>
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, background: '#059669', borderRadius: '4px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Çok Yüksek Verim (≥20 kg)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, background: '#10b981', borderRadius: '4px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Yüksek Verim (15-20 kg)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, background: '#fbbf24', borderRadius: '4px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Orta Verim (10-15 kg)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, background: '#f59e0b', borderRadius: '4px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Düşük-Orta (7-10 kg)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, background: '#f97316', borderRadius: '4px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Düşük Verim (&lt;7 kg)</span>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
              ℹ️ Alan büyüklüğü bal üretim miktarını, renk ise kovan başına verimi göstermektedir
            </div>
          </div>

          {/* Top Honey Types List */}
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🌺 Türkiye Bal Çeşitleri
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              En yaygın bal çeşitleri ve üretim yapılan il sayıları
            </p>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '32px'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              {honeyTypesData.slice(0, 12).map((type, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '16px',
                    background: `linear-gradient(135deg, ${HONEY_COLORS[index % HONEY_COLORS.length]}15 0%, ${HONEY_COLORS[index % HONEY_COLORS.length]}05 100%)`,
                    borderRadius: '12px',
                    border: `2px solid ${HONEY_COLORS[index % HONEY_COLORS.length]}30`,
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🍯</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {type.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {type.count} ilde üretiliyor
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TÜİK Kovan & Balmumu Analizi */}
          {tuikKovanYear.length > 0 && tuikKovanKpi && (
            <>
              <div style={{ marginTop: '50px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  📊 TÜİK Kovan & Balmumu Analizi (2004-2024)
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  TÜİK resmi verilerine göre kovan sayıları (eski/yeni tip) ve balmumu üretimi il bazlı trend analizi
                </p>
              </div>

              {/* TÜİK KPI Kartları */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '20px', 
                marginBottom: '32px' 
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                  padding: '24px', 
                  borderRadius: '14px',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🪔</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                      TOPLAM KOVAN ({tuikKovanKpi.latest.year})
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                      {formatNumber(tuikKovanKpi.latest.toplam)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                      {tuikKovanKpi.latest.toplam.toLocaleString('tr-TR')} adet
                    </div>
                  </div>
                </div>

                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '14px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    YILLIK DEĞİŞİM
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: tuikKovanKpi.yoy >= 0 ? '#22c55e' : '#ef4444', lineHeight: 1 }}>
                    {tuikKovanKpi.yoy >= 0 ? '+' : ''}{tuikKovanKpi.yoy.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Toplam kovan ({tuikKovanKpi.prev?.year} → {tuikKovanKpi.latest.year})
                  </div>
                </div>

                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '14px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    ESKİ / YENİ TİP ORANI
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                    %{(100 - tuikKovanKpi.eskiPay).toFixed(1)} Yeni
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Eski Tip: %{tuikKovanKpi.eskiPay.toFixed(1)} | CAGR: %{tuikKovanKpi.cagr.toFixed(2)}
                  </div>
                </div>

                <div style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                  padding: '24px', 
                  borderRadius: '14px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.1 }}>🕯️</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                      BALMUMU ÜRETİMİ ({tuikKovanKpi.latest.year})
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                      {tuikKovanKpi.latest.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                      Yıllık: {tuikKovanKpi.balmumuYoy >= 0 ? '+' : ''}{tuikKovanKpi.balmumuYoy.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Kovan Trendi - Stacked Bar */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  gridColumn: 'span 2',
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🪔 Kovan Sayısı Gelişimi (Eski Tip + Yeni Tip)
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={tuikKovanYear} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                        tickFormatter={formatNumber}
                        label={{ value: 'Kovan (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString('tr-TR') + ' adet',
                          name
                        ]}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="eskiTip" 
                        name="Eski Tip Kovan" 
                        stackId="a"
                        fill="#fbbf24"
                        opacity={0.8}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="yeniTip" 
                        name="Yeni Tip Kovan" 
                        stackId="a"
                        fill="#f59e0b"
                        opacity={0.9}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="toplam" 
                        name="Toplam Kovan" 
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    background: 'var(--bg-primary)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div><strong>Eski Tip:</strong> {tuikKovanKpi.latest.eskiTip.toLocaleString('tr-TR')} adet</div>
                    <div><strong>Yeni Tip:</strong> {tuikKovanKpi.latest.yeniTip.toLocaleString('tr-TR')} adet</div>
                    <div><strong>Toplam:</strong> {tuikKovanKpi.latest.toplam.toLocaleString('tr-TR')} adet</div>
                    <div><strong>Zirve:</strong> {tuikKovanKpi.peak.year} ({tuikKovanKpi.peak.toplam.toLocaleString('tr-TR')})</div>
                  </div>
                </div>
              </div>

              {/* Balmumu Trendi */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  gridColumn: 'span 2',
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🕯️ Balmumu Üretimi Trendi (Ton)
                  </h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={tuikKovanYear} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalmumu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        tickFormatter={(v) => v.toLocaleString('tr-TR')}
                        label={{ value: 'Balmumu (Ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' ton', 'Balmumu']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balmumu" 
                        stroke="#3b82f6" 
                        fill="url(#colorBalmumu)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    background: 'var(--bg-primary)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div><strong>Son Yıl ({tuikKovanKpi.latest.year}):</strong> {tuikKovanKpi.latest.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton</div>
                    <div><strong>Ortalama:</strong> {(tuikKovanYear.reduce((s, d) => s + d.balmumu, 0) / tuikKovanYear.length).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton</div>
                    <div><strong>Zirve:</strong> {tuikKovanYear.reduce((best, d) => d.balmumu > best.balmumu ? d : best, tuikKovanYear[0]).year} ({tuikKovanYear.reduce((best, d) => d.balmumu > best.balmumu ? d : best, tuikKovanYear[0]).balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ton)</div>
                  </div>
                </div>
              </div>

              {/* Kovan başına Balmumu Verimi */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Kovan Başına Balmumu Verimi (kg/kovan)
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart 
                      data={tuikKovanYear.map(d => ({
                        year: d.year,
                        verim: d.toplam > 0 ? (d.balmumu * 1000 / d.toplam) : 0
                      }))}
                      margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        tickFormatter={(v) => v.toFixed(2)}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [value.toFixed(3) + ' kg/kovan', 'Balmumu Verimi']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="verim" 
                        stroke="#a855f7" 
                        strokeWidth={3}
                        dot={{ fill: '#a855f7', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Eski vs Yeni Tip Kovan Oranı */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔄 Yeni Tip Kovan Oranı Gelişimi (%)
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart 
                      data={tuikKovanYear.map(d => ({
                        year: d.year,
                        yeniOran: d.toplam > 0 ? (d.yeniTip / d.toplam * 100) : 0,
                        eskiOran: d.toplam > 0 ? (d.eskiTip / d.toplam * 100) : 0,
                      }))}
                      margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => v + '%'}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [
                          '%' + value.toFixed(1),
                          name === 'yeniOran' ? 'Yeni Tip' : 'Eski Tip'
                        ]}
                      />
                      <Legend formatter={(value) => value === 'yeniOran' ? 'Yeni Tip %' : 'Eski Tip %'} />
                      <Area type="monotone" dataKey="yeniOran" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="eskiOran" stackId="1" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* İl Bazlı Kovan & Balmumu Sıralama */}
              {tuikTopKovan.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '20px',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    background: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🪔 En Fazla Kovan Olan İller (2024 - TÜİK)
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={tuikTopKovan} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
                        <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          formatter={(value: number, name: string) => [
                            value.toLocaleString('tr-TR') + ' adet',
                            name === 'yeniTip' ? 'Yeni Tip' : name === 'eskiTip' ? 'Eski Tip' : name
                          ]}
                        />
                        <Legend formatter={(value) => value === 'yeniTip' ? 'Yeni Tip' : value === 'eskiTip' ? 'Eski Tip' : value} />
                        <Bar dataKey="yeniTip" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="eskiTip" stackId="a" fill="#fbbf24" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ 
                    background: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🕯️ En Fazla Balmumu Üreten İller (2024 - TÜİK)
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={tuikTopBalmumu} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          formatter={(value: number) => [value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' ton', 'Balmumu']}
                        />
                        <Bar dataKey="balmumu" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                          {tuikTopBalmumu.map((_, index) => (
                            <Cell key={`cell-bm-${index}`} fill={index < 3 ? '#2563eb' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TÜİK Özet Tablo */}
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '24px',
                overflowX: 'auto'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700' }}>
                  📋 TÜİK Kovan & Balmumu Yıllık Veri Tablosu
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Yıl</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Eski Tip</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Yeni Tip</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Toplam Kovan</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Balmumu (ton)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Verim (kg/kovan)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tuikKovanYear.slice().reverse().map((row, idx) => (
                      <tr key={row.year} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent' }}>
                        <td style={{ padding: '8px', fontWeight: '600' }}>{row.year}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{row.eskiTip.toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{row.yeniTip.toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>{row.toplam.toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{row.balmumu.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{row.toplam > 0 ? (row.balmumu * 1000 / row.toplam).toFixed(3) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer Note */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #fbbf24',
            marginTop: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.95rem', color: '#92400e', fontWeight: '600' }}>
              📊 Veriler TÜİK (Türkiye İstatistik Kurumu) resmi kaynaklarından derlenmiştir - 2023/2024 Yılı
            </div>
          </div>
        </>
      )}
    </div>
  );
}
