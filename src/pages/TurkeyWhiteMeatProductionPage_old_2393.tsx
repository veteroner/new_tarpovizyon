import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { fetchQuery } from '../services/api';
import { TurkeyHeatMap, type RegionTotal } from '../components/TurkeyHeatMap';

type YearPoint = {
  year: number;
  poultryTon: number;
};

type TuikTab = 'overview' | 'production' | 'hatch' | 'projection';

type PoultryEconomicData = {
  tarih: string;
  etlik_pilic_maliyet_tl_kg: number;
  uretici_fiyati_tl_kg: number;
  etlik_pilic_yemi_tl_kg: number;
  tuketici_fiyati_tl_kg: number;
  karlilik: number;
  uretici_fiyati_maliyet_farki_tl_kg: number;
  parite_etlik_pilic_yem_paritesi: number;
};

function formatTon(value: number): string {
  if (value >= 1e6) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1e6) + ' M ton';
  if (value >= 1e3) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + ' ton';
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

type TuikChickenData = {
  year: string;
  slaughtered: number; // Kesilen tavuk (bin adet)
  meatProduction: number; // Tavuk eti (ton)
  hatchedEggs: number; // Kuluçkaya basılan yumurta (bin adet)
  producedChicks: number; // Üretilen civiv (bin adet)
  hatchRate: number; // Kuluçka başarı oranı (%)
  yieldPerBird: number; // Tavuk başına verim (kg/baş)
};

type MonthlyData = {
  month: string;
  value: number;
};

type TuikTurkeyMeatData = {
  year: string;
  production: number; // ton
};

export default function TurkeyWhiteMeatProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<PoultryEconomicData[]>([]);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [worldRanking, setWorldRanking] = useState<{ world: number; eu: number } | null>(null);
  const [provincialPoultry, setProvincialPoultry] = useState<RegionTotal[]>([]);
  const [provincialBroilers, setProvincialBroilers] = useState<RegionTotal[]>([]);
  const [provincialLayers, setProvincialLayers] = useState<RegionTotal[]>([]);
  const [poultryMapType, setPoultryMapType] = useState<'total' | 'broiler' | 'layer'>('total');
  const [activeTuikTab, setActiveTuikTab] = useState<TuikTab>('overview');
  
  // TÜİK Kümes Hayvancılığı Verileri
  const [tuikData, setTuikData] = useState<TuikChickenData[]>([]);
  const [monthlySlaughter, setMonthlySlaughter] = useState<MonthlyData[]>([]);
  const [monthlyMeat, setMonthlyMeat] = useState<MonthlyData[]>([]);

  // Hindi Eti Verileri
  const [turkeyMeatData, setTurkeyMeatData] = useState<TuikTurkeyMeatData[]>([]);
  const [monthlyTurkeyMeat, setMonthlyTurkeyMeat] = useState<MonthlyData[]>([]);

  // Bıldırcın Eti Verileri
  const [quailMeatData, setQuailMeatData] = useState<TuikTurkeyMeatData[]>([]);
  const [monthlyQuailMeat, setMonthlyQuailMeat] = useState<MonthlyData[]>([]);
  const [quailSlaughterData, setQuailSlaughterData] = useState<TuikTurkeyMeatData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const productionQuery = `SELECT
        DATE_FORMAT(yillar, '%Y') as year,
        kanatli_eti_ton
      FROM oner_hayvansal_urun_uretimi
      ORDER BY yillar`;

      const res = await fetchQuery(productionQuery);
      const data = (res.data ?? []) as Array<Record<string, unknown>>;

      const points = data
        .map((row) => ({
          year: Number(row.year) || 0,
          poultryTon: Number(row.kanatli_eti_ton) || 0,
        }))
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          etlik_pilic_maliyet_tl_kg, uretici_fiyati_tl_kg,
          etlik_pilic_yemi_tl_kg, tuketici_fiyati_tl_kg,
          karlilik, uretici_fiyati_maliyet_farki_tl_kg,
          parite_etlik_pilic_yem_paritesi
          FROM oner_kanatli_eti_maliyeti_fiyati 
          ORDER BY tarih DESC LIMIT 60`;
        
        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            etlik_pilic_maliyet_tl_kg: Number(item['etlik_pilic_maliyet_tl_kg']) || 0,
            uretici_fiyati_tl_kg: Number(item['uretici_fiyati_tl_kg']) || 0,
            etlik_pilic_yemi_tl_kg: Number(item['etlik_pilic_yemi_tl_kg']) || 0,
            tuketici_fiyati_tl_kg: Number(item['tuketici_fiyati_tl_kg']) || 0,
            karlilik: Number(item['karlilik']) || 0,
            uretici_fiyati_maliyet_farki_tl_kg: Number(item['uretici_fiyati_maliyet_farki_tl_kg']) || 0,
            parite_etlik_pilic_yem_paritesi: Number(item['parite_etlik_pilic_yem_paritesi']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Kanatlı eti ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // Dünya Sıralaması - oner_dunya_hayvansal_uretim_miktarla tablosundan hesapla
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map(c => `'${c}'`).join(',');

        const chickenQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Tavuk eti' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Tavuk eti')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Tavuk eti' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Tavuk eti')) as eu_rank
        `;
        const chickenRes = await fetchQuery(chickenQuery);

        if (chickenRes.data && chickenRes.data.length > 0) {
          setWorldRanking({
            world: Number(chickenRes.data[0]?.world_rank) || 0,
            eu: Number(chickenRes.data[0]?.eu_rank) || 0
          });
        }
      } catch (err) {
        console.warn('Dünya sıralaması verileri yüklenemedi:', err);
      }

      // İl bazlı kanatlı hayvan varlığı
      try {
        const provincialQuery = `
          SELECT 
            il as province,
            CAST(et_tavugu_sayisi AS UNSIGNED) as broiler_count,
            CAST(yumurta_tavugu_sayisi AS UNSIGNED) as layer_count,
            (CAST(et_tavugu_sayisi AS UNSIGNED) + CAST(yumurta_tavugu_sayisi AS UNSIGNED)) as total_poultry
          FROM oner_i_llerin_hayvan_sayisi
          WHERE tarih = (SELECT MAX(tarih) FROM oner_i_llerin_hayvan_sayisi)
          ORDER BY il
        `;
        const provincialRes = await fetchQuery(provincialQuery);
        if (provincialRes.data && provincialRes.data.length > 0) {
          const totalMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.total_poultry) || 0,
            unit: 'baş'
          }));
          const broilerMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.broiler_count) || 0,
            unit: 'baş'
          }));
          const layerMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.layer_count) || 0,
            unit: 'baş'
          }));
          setProvincialPoultry(totalMapped);
          setProvincialBroilers(broilerMapped);
          setProvincialLayers(layerMapped);
          console.log('Provincial poultry data loaded:', totalMapped.length, 'provinces');
        }
      } catch (err) {
        console.error('İl bazlı kanatlı hayvan verileri yüklenemedi:', err);
      }

      // TÜİK Kümes Hayvancılığı Verileri
      try {
        const tuikQuery = `
          SELECT
            yil,
            CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as value,
            urun
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN ('Kesilen Tavuk', 'Tavuk Eti', 'Etlik Piliç (Broiler) civivi Üretimi İçin Kuluçkaya Basılan Yumurta', 'Üretilen Broiler civivi')
          ORDER BY yil DESC, urun
        `;
        const tuikRes = await fetchQuery(tuikQuery);
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const yearMap = new Map<string, Omit<TuikChickenData, 'year'> & { year: string }>();
          
          tuikRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            if (!yearMap.has(year)) {
              yearMap.set(year, {
                year,
                slaughtered: 0,
                meatProduction: 0,
                hatchedEggs: 0,
                producedChicks: 0,
                hatchRate: 0,
                yieldPerBird: 0
              });
            }
            
            const yearData = yearMap.get(year);
            if (yearData) {
              const urun = String(row.urun);
              const value = Number(row.value) || 0;
              
              if (urun === 'Kesilen Tavuk') {
                yearData.slaughtered = value; // bin adet
              } else if (urun === 'Tavuk Eti') {
                yearData.meatProduction = value; // ton
              } else if (urun.includes('Kuluçkaya Basılan')) {
                yearData.hatchedEggs = value; // bin adet
              } else if (urun.includes('Üretilen Broiler')) {
                yearData.producedChicks = value; // bin adet
              }
            }
          });
          
          const tuikDataArray: TuikChickenData[] = Array.from(yearMap.values())
            .map(d => ({
              ...d,
              hatchRate: d.hatchedEggs > 0 ? (d.producedChicks / d.hatchedEggs) * 100 : 0,
              yieldPerBird: d.slaughtered > 0 ? (d.meatProduction * 1000) / (d.slaughtered * 1000) : 0 // kg/baş
            }))
            .sort((a, b) => Number(b.year) - Number(a.year));
          
          setTuikData(tuikDataArray);
          console.log('TÜİK data loaded:', tuikDataArray.length, 'years');
        }

        // Aylık dağılım - En son yıl için
        const latestYearQuery = `SELECT MAX(yil) as max_year FROM tuik_hayvancilik_kumeshayvanciligi`;
        const latestYearRes = await fetchQuery(latestYearQuery);
        const latestYear = String(latestYearRes.data?.[0]?.max_year || '2025');
        
        const monthlyQuery = `
          SELECT urun, birim, Ocak, Şubat, Mart, Nisan, Mayıs, Haziran, Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE yil = '${latestYear}' AND urun IN ('Kesilen Tavuk', 'Tavuk Eti')
        `;
        const monthlyRes = await fetchQuery(monthlyQuery);
        
        if (monthlyRes.data && monthlyRes.data.length > 0) {
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          monthlyRes.data.forEach((row: Record<string, string | number>) => {
            const urun = String(row.urun);
            const monthlyValues = months.map(month => ({
              month,
              value: Number(String(row[month] || '0').replace(/\./g, '')) || 0
            }));
            
            if (urun === 'Kesilen Tavuk') {
              setMonthlySlaughter(monthlyValues);
            } else if (urun === 'Tavuk Eti') {
              setMonthlyMeat(monthlyValues);
            }
          });
        }
      } catch (tuikError) {
        console.warn('TÜİK kümes hayvancılığı verileri yüklenemedi:', tuikError);
      }

      // Hindi Eti Verileri
      try {
        const turkeyQuery = `
          SELECT
            yil,
            CAST(REPLACE(IFNULL(TOPLAM, '0'), '.', '') AS UNSIGNED) as total_production,
            Ocak, Şubat, Mart, Nisan, Mayıs, Haziran,
            Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun = 'Hindi Eti'
          ORDER BY yil DESC
        `;
        const turkeyRes = await fetchQuery(turkeyQuery);
        
        if (turkeyRes.data && turkeyRes.data.length > 0) {
          const turkeyYearData: TuikTurkeyMeatData[] = [];
          
          turkeyRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            let production = Number(row.total_production) || 0;
            
            // Eğer TOPLAM çok küçükse (< 1000), aylık verilerin toplamını kullan
            if (production < 1000) {
              const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                             'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
              let monthlySum = 0;
              months.forEach(month => {
                const val = Number(String(row[month] || '0').replace(/\./g, '')) || 0;
                monthlySum += val;
              });
              if (monthlySum > 0) {
                production = monthlySum;
              }
            }
            
            if (production > 0) {
              turkeyYearData.push({
                year,
                production
              });
            }
          });
          
          setTurkeyMeatData(turkeyYearData);
          
          // 2025 aylık verilerini al
          const latest2025 = turkeyRes.data.find((r: Record<string, string | number>) => String(r.yil) === '2025');
          if (latest2025) {
            const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const monthlyValues: number[] = [];
            let totalKnown = 0;
            let knownCount = 0;
            
            // Mevcut aylık verileri topla
            months.forEach(month => {
              const val = Number(String(latest2025[month] || '0').replace(/\./g, '')) || 0;
              monthlyValues.push(val);
              if (val > 0) {
                totalKnown += val;
                knownCount++;
              }
            });
            
            // Eğer bazı aylar null ise ve TOPLAM varsa, eksik ayları doldur
            const totalProduction = Number(latest2025.total_production) || 0;
            if (knownCount > 0 && knownCount < 12 && totalProduction > totalKnown) {
              const remaining = totalProduction - totalKnown;
              const missingCount = 12 - knownCount;
              const avgMissing = remaining / missingCount;
              
              // Null olan ayları ortalama ile doldur
              for (let i = 0; i < monthlyValues.length; i++) {
                if (monthlyValues[i] === 0) {
                  monthlyValues[i] = avgMissing;
                }
              }
            }
            
            // Monthly data array oluştur
            const monthlyTurkey = months.map((month, idx) => ({
              month,
              value: monthlyValues[idx]
            }));
            
            setMonthlyTurkeyMeat(monthlyTurkey);
          }
        }
      } catch (turkeyError) {
        console.warn('Hindi eti verileri yüklenemedi:', turkeyError);
      }

      // Bıldırcın Eti Verileri
      try {
        const quailQuery = `
          SELECT yil, urun,
            CAST(REPLACE(IFNULL(TOPLAM, '0'), '.', '') AS UNSIGNED) as total_val,
            Ocak, Şubat, Mart, Nisan, Mayıs, Haziran,
            Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN ('Bıldırcın Eti', 'Kesilen Bıldırcın')
          ORDER BY urun, yil DESC
        `;
        const quailRes = await fetchQuery(quailQuery);
        
        if (quailRes.data && quailRes.data.length > 0) {
          const quailMeat: TuikTurkeyMeatData[] = [];
          const quailSlaughter: TuikTurkeyMeatData[] = [];
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                         'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          quailRes.data.forEach((row: Record<string, string | number>) => {
            const urun = String(row.urun || '');
            const year = String(row.yil);
            let production = Number(row.total_val) || 0;
            
            if (production < 10) {
              let monthlySum = 0;
              months.forEach(month => {
                const val = Number(String(row[month] || '0').replace(/\./g, '')) || 0;
                monthlySum += val;
              });
              if (monthlySum > 0) production = monthlySum;
            }
            
            if (production > 0) {
              if (urun === 'Bıldırcın Eti') {
                quailMeat.push({ year, production });
              } else if (urun === 'Kesilen Bıldırcın') {
                quailSlaughter.push({ year, production });
              }
            }
          });
          
          setQuailMeatData(quailMeat);
          setQuailSlaughterData(quailSlaughter);
          
          // Son yıl aylık verileri
          const latestQuail = quailRes.data.find((r: Record<string, string | number>) => String(r.urun) === 'Bıldırcın Eti' && Number(r.total_val) > 0);
          if (latestQuail) {
            const monthlyValues = months.map(month => ({
              month,
              value: Number(String(latestQuail[month] || '0').replace(/\./g, '')) || 0
            }));
            setMonthlyQuailMeat(monthlyValues);
          }
        }
      } catch (quailError) {
        console.warn('Bıldırcın eti verileri yüklenemedi:', quailError);
      }
    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].poultryTon > 0) return series[i];
    }
    return series[series.length - 1];
  }, [series]);

  const prev = useMemo(() => {
    if (!latest) return undefined;
    const idx = series.findIndex((p) => p.year === latest.year);
    if (idx > 0) return series[idx - 1];
    return undefined;
  }, [latest, series]);

  const yoy = useMemo(() => {
    if (!latest || !prev || prev.poultryTon <= 0) return 0;
    return ((latest.poultryTon - prev.poultryTon) / prev.poultryTon) * 100;
  }, [latest, prev]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🍗 Türkiye Kanatlı Eti Üretimi (TÜİK)</h1>
        <p className="page-subtitle">Yıllık kanatlı eti üretimi (ton)</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">SON YIL</span>
              </div>
              <div className="kpi-value">{formatTon(latest?.poultryTon ?? 0)}</div>
              <div className="kpi-subtitle">({latest?.year ?? '-'})</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">YILLIK DEĞİŞİM</span>
                <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? '📈' : '📉'}</div>
              </div>
              <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
                %{yoy.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>

            {worldRanking && (
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">TAVUK ETİ</span>
                  <div className="kpi-icon orange">🐔</div>
                </div>
                <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRanking.world}</div>
                <div className="kpi-subtitle">AB #{worldRanking.eu}</div>
              </div>
            )}
          </div>

          {/* Intelligence Panel */}
          {tuikData.length > 0 && (() => {
            const lastYear = tuikData[0];
            const firstYear = tuikData[tuikData.length - 1];
            const years = tuikData.length - 1;
            
            const slaughterCAGR = years > 0 
              ? ((Math.pow(lastYear.slaughtered / firstYear.slaughtered, 1 / years) - 1) * 100) 
              : 0;
            
            const meatCAGR = years > 0
              ? ((Math.pow(lastYear.meatProduction / firstYear.meatProduction, 1 / years) - 1) * 100)
              : 0;
            
            const hatchSuccessChange = lastYear.hatchRate - firstYear.hatchRate;
            
            return (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                marginTop: '24px',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Beyaz Et İçgörü Özeti
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>KESİM CAGR</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{slaughterCAGR.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{years} Yıl Büyüme</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>ÜRETİM CAGR</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{meatCAGR.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Et Üretimi ({years}Y)</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>KULUÇKA BAŞARI</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{hatchSuccessChange > 0 ? '+' : ''}{hatchSuccessChange.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Verimlilik Artışı</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>TAVUK BAŞI VERİM</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{lastYear.yieldPerBird.toFixed(2)} kg</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Güncel Performans</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📈 Kanatlı Eti Üretimi Trendi</h3>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => formatShort(Number(v))}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatTon(value), 'Kanatlı Eti']}
                    labelFormatter={(label) => `Yıl: ${label}`}
                  />
                  <Area type="monotone" dataKey="poultryTon" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* İl Bazlı Kanatlı Hayvan Varlığı Haritası */}
          <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🗺️ İl Bazlı Kanatlı Hayvan Varlığı Dağılımı
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPoultryMapType('total')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: poultryMapType === 'total' ? 'var(--primary)' : 'var(--bg-card)',
                      color: poultryMapType === 'total' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    🐔 Toplam
                  </button>
                  <button
                    onClick={() => setPoultryMapType('broiler')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: poultryMapType === 'broiler' ? 'var(--primary)' : 'var(--bg-card)',
                      color: poultryMapType === 'broiler' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    🍗 Et Tavuğu
                  </button>
                  <button
                    onClick={() => setPoultryMapType('layer')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: poultryMapType === 'layer' ? 'var(--primary)' : 'var(--bg-card)',
                      color: poultryMapType === 'layer' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    🥚 Yumurta Tavuğu
                  </button>
                </div>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">
                  {poultryMapType === 'total' && 'Et Tavuğu + Yumurta Tavuğu (Toplam)'}
                  {poultryMapType === 'broiler' && 'Et Tavuğu (Etlik Piliç)'}
                  {poultryMapType === 'layer' && 'Yumurta Tavuğu (Yumurtacı Tavuk)'}
                </h3>
                {provincialPoultry.length === 0 && (
                  <div style={{ marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    İl bazlı veriler yükleniyor…
                  </div>
                )}
                <TurkeyHeatMap 
                  regionTotals={
                    poultryMapType === 'broiler' ? provincialBroilers :
                    poultryMapType === 'layer' ? provincialLayers :
                    provincialPoultry
                  } 
                  unitLabel="baş" 
                  height={420} 
                />
              </div>
            </div>

          {/* Kanatlı Eti Ekonomik Göstergeler */}
          {economicData.length > 0 && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🍗 Etlik Piliç Ekonomik Göstergeleri
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Başlangıç</label>
                    <input
                      type="month"
                      value={econStartDate}
                      onChange={(e) => setEconStartDate(e.target.value)}
                      max={econEndDate}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Bitiş</label>
                    <input
                      type="month"
                      value={econEndDate}
                      onChange={(e) => setEconEndDate(e.target.value)}
                      min={econStartDate}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>

              {(() => {
                const filteredData = economicData.filter(d => {
                  if (!econStartDate || !econEndDate) return true;
                  return d.tarih >= econStartDate && d.tarih <= econEndDate;
                });
                return (
                <>
                  {/* Ekonomik KPI Kartları */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>ÜRETİCİ FİYATI</span>
                        <div style={{ fontSize: '1.5rem' }}>💰</div>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>{filteredData[0]?.uretici_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>TÜKETİCİ FİYATI</span>
                        <div style={{ fontSize: '1.5rem' }}>🛒</div>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3b82f6' }}>{filteredData[0]?.tuketici_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>KARLILIK ORANI</span>
                        <div style={{ fontSize: '1.5rem' }}>📊</div>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: filteredData[0]?.karlilik >= 0 ? '#22c55e' : '#ef4444' }}>
                        {filteredData[0]?.karlilik.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>YEM PARİTESİ</span>
                        <div style={{ fontSize: '1.5rem' }}>🌾</div>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>{filteredData[0]?.parite_etlik_pilic_yem_paritesi.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
                    </div>
                  </div>

                  {/* Ekonomik Grafikler - Satır 1 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>💰 Fiyat Gelişimi</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="uretici_fiyati_tl_kg" 
                            name="Üretici Fiyatı" 
                            stroke="#059669" 
                            strokeWidth={3}
                            dot={{ fill: '#059669', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="tuketici_fiyati_tl_kg" 
                            name="Tüketici Fiyatı" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            dot={{ fill: '#2563eb', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="etlik_pilic_maliyet_tl_kg" 
                            name="Maliyet" 
                            stroke="#dc2626" 
                            strokeWidth={3}
                            dot={{ fill: '#dc2626', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>📊 Karlılık Trendi</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="karlilik" 
                            name="Karlılık (%)" 
                            stroke="#8b5cf6" 
                            fill="#8b5cf6" 
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ekonomik Grafikler - Satır 2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>🌾 Yem Fiyatı ve Paritesi</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="etlik_pilic_yemi_tl_kg" 
                            name="Yem Fiyatı (₺/kg)" 
                            stroke="#eab308" 
                            strokeWidth={2.5}
                            dot={{ fill: '#eab308', r: 3 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="parite_etlik_pilic_yem_paritesi" 
                            name="Yem Paritesi" 
                            stroke="#8b5cf6" 
                            strokeWidth={2.5}
                            dot={{ fill: '#8b5cf6', r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600' }}>💵 Üretici Fiyatı-Maliyet Farkı</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={filteredData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="tarih" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                            angle={-45} 
                            textAnchor="end" 
                            height={70}
                          />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                          />
                          <Bar 
                            dataKey="uretici_fiyati_maliyet_farki_tl_kg" 
                            name="Fark (Fiyat-Maliyet)" 
                            radius={[4, 4, 0, 0]}
                          >
                            {economicData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.uretici_fiyati_maliyet_farki_tl_kg >= 0 ? '#22c55e' : '#ef4444'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ekonomik Özet */}
                  <div style={{ 
                    marginTop: '30px', 
                    padding: '24px', 
                    background: 'var(--bg-card)', 
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
                      📝 Kanatlı Eti Ekonomik Göstergeleri Özeti
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                      gap: '16px' 
                    }}>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ortalama Karlılık
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: filteredData.reduce((sum, d) => sum + d.karlilik, 0) / filteredData.length >= 0 ? '#22c55e' : '#ef4444' }}>
                          {(filteredData.reduce((sum, d) => sum + d.karlilik, 0) / filteredData.length).toFixed(2)}%
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ortalama Üretici Fiyatı
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {(filteredData.reduce((sum, d) => sum + d.uretici_fiyati_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ortalama Yem Fiyatı
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {(filteredData.reduce((sum, d) => sum + d.etlik_pilic_yemi_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Veri Aralığı
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                          {filteredData[filteredData.length - 1]?.tarih} - {filteredData[0]?.tarih}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
                );
              })()}
            </>
          )}

          {/* TÜİK Kümes Hayvancılığı - Tab Sistemi */}
          {tuikData.length > 0 && (
            <>
              <div style={{ marginTop: '50px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🐔 TÜİK Kesilen Tavuk ve Et Üretimi Analizi (2010-2025)
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Yıllık kesim sayıları, et üretimi ve kuluçkadan üretime detaylı analizler
                </p>
              </div>

              {/* TÜİK Tab Navigation */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '30px',
                flexWrap: 'wrap',
                padding: '20px',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => setActiveTuikTab('overview')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: activeTuikTab === 'overview' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTuikTab === 'overview' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>📊</span>
                  <span>Genel Bakış</span>
                </button>
                <button
                  onClick={() => setActiveTuikTab('production')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: activeTuikTab === 'production' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTuikTab === 'production' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>📈</span>
                  <span>Üretim Trendi</span>
                </button>
                <button
                  onClick={() => setActiveTuikTab('hatch')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: activeTuikTab === 'hatch' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTuikTab === 'hatch' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>🥚</span>
                  <span>Kuluçka Analizi</span>
                </button>
                <button
                  onClick={() => setActiveTuikTab('projection')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: activeTuikTab === 'projection' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTuikTab === 'projection' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>🔮</span>
                  <span>Projeksiyon</span>
                </button>
              </div>

              {/* GENEL BAKIŞ TAB */}
              {activeTuikTab === 'overview' && (
                <>
                  {/* TÜİK KPI Kartları */}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">KESİLEN TAVUK (2025)</span>
                        <div className="kpi-icon orange">🐔</div>
                      </div>
                      <div className="kpi-value">{formatShort(tuikData[0]?.slaughtered * 1000)} adet</div>
                      <div className="kpi-subtitle">{tuikData[0]?.slaughtered.toLocaleString('tr-TR')} bin adet</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">TAVUK ETİ ÜRETİMİ</span>
                        <div className="kpi-icon red">🥩</div>
                      </div>
                      <div className="kpi-value">{formatTon(tuikData[0]?.meatProduction)}</div>
                      <div className="kpi-subtitle">2025 yılı</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">KULUÇKA BAŞARI ORANI</span>
                        <div className="kpi-icon green">🥚</div>
                      </div>
                      <div className="kpi-value" style={{ color: '#22c55e' }}>%{tuikData[0]?.hatchRate.toFixed(1)}</div>
                      <div className="kpi-subtitle">Civiv çıkma oranı</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">VERİM (KG/BAŞ)</span>
                        <div className="kpi-icon blue">📊</div>
                      </div>
                      <div className="kpi-value">{tuikData[0]?.yieldPerBird.toFixed(2)} kg</div>
                      <div className="kpi-subtitle">Tavuk başına et verimi</div>
                    </div>
                  </div>

                  {/* Kombine Üretim Grafiği */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">📊 Kesilen Tavuk vs Et Üretimi (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Kesilen Tavuk (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v)}
                            label={{ value: 'Et Üretimi (ton)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Bar 
                            yAxisId="left"
                            dataKey="slaughtered" 
                            name="Kesilen Tavuk (bin adet)" 
                            fill="#f97316"
                            opacity={0.7}
                            radius={[4, 4, 0, 0]}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="meatProduction" 
                            name="Et Üretimi (ton)" 
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ fill: '#ef4444', r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Üretim Akışı */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">🔄 Üretim Akışı: Kuluçkadan Kesime (2025)</h3>
                      <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🥚</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                            {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Kuluçkaya Basılan<br/>Yumurta (bin adet)
                          </div>
                        </div>
                        <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>→</div>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🐣</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>
                            {(tuikData[0]?.producedChicks || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Üretilen Civiv<br/>(bin adet)
                          </div>
                        </div>
                        <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>→</div>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🐔</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f97316' }}>
                            {(tuikData[0]?.slaughtered || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Kesilen Tavuk<br/>(bin adet)
                          </div>
                        </div>
                        <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>→</div>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🥩</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                            {(tuikData[0]?.meatProduction || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Et Üretimi<br/>(ton)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Özet İstatistikler */}
                  <div style={{ 
                    marginTop: '30px', 
                    padding: '24px', 
                    background: 'var(--bg-card)', 
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
                      📊 Özet İstatistikler (2010-2025)
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                      gap: '16px' 
                    }}>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Toplam Kesilen (16 yıl)
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                          {formatShort(tuikData.reduce((sum, d) => sum + d.slaughtered, 0) * 1000)} adet
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Toplam Et (16 yıl)
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                          {formatTon(tuikData.reduce((sum, d) => sum + d.meatProduction, 0))}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ort. Kuluçka Başarısı
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#22c55e' }}>
                          %{(tuikData.reduce((sum, d) => sum + d.hatchRate, 0) / tuikData.length).toFixed(1)}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ort. Et Verimi
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#3b82f6' }}>
                          {(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(3)} kg/baş
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Yıllık Ort. Büyüme
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981' }}>
                          %{(() => {
                            const first = tuikData[tuikData.length - 1]?.slaughtered || 1;
                            const last = tuikData[0]?.slaughtered || 1;
                            const years = tuikData.length - 1;
                            return (((Math.pow(last / first, 1 / years) - 1) * 100).toFixed(2));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ÜRETİM TRENDİ TAB */}
              {activeTuikTab === 'production' && (
                <>
                  {/* Ana Trend Grafikleri */}
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">📈 Kesilen Tavuk Sayısı (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${(value * 1000).toLocaleString('tr-TR')} adet`, 'Kesilen Tavuk']}
                            labelFormatter={(label) => `Yıl: ${label}`}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="slaughtered" 
                            stroke="#f97316" 
                            fill="#f97316" 
                            fillOpacity={0.3}
                            strokeWidth={2.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">🥩 Tavuk Eti Üretimi (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v)}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ton`, 'Et Üretimi']}
                            labelFormatter={(label) => `Yıl: ${label}`}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="meatProduction" 
                            stroke="#ef4444" 
                            fill="#ef4444" 
                            fillOpacity={0.3}
                            strokeWidth={2.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Aylık Dağılım Analizi */}
                  {monthlySlaughter.length > 0 && monthlyMeat.length > 0 && (
                    <>
                      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          📅 Aylık Üretim Dağılımı (2025)
                        </h2>
                      </div>

                      <div className="chart-grid">
                        <div className="chart-card">
                          <h3 className="chart-title">📊 Aylık Kesilen Tavuk</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlySlaughter}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                tickFormatter={(v) => formatShort(v)}
                              />
                              <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString('tr-TR')} adet`, 'Kesilen']}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                              />
                              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                          <h3 className="chart-title">🥩 Aylık Tavuk Eti Üretimi</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyMeat}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                tickFormatter={(v) => formatShort(v)}
                              />
                              <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ton`, 'Üretim']}
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                              />
                              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* KULUÇKA ANALİZİ TAB */}
              {activeTuikTab === 'hatch' && (
                <>
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">🐣 Kuluçka Başarı Oranı Trendi</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            domain={[60, 100]}
                          />
                          <Tooltip
                            formatter={(value: number) => [`%${value.toFixed(2)}`, 'Başarı Oranı']}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="hatchRate" 
                            name="Kuluçka Başarı Oranı (%)" 
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ fill: '#22c55e', r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">📊 Tavuk Başına Et Verimi (kg/baş)</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            domain={[0, 3]}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${value.toFixed(3)} kg/baş`, 'Verim']}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Bar 
                            dataKey="yieldPerBird" 
                            name="Et Verimi" 
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          >
                            {tuikData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill="#3b82f6" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Kuluçka Detay Akışı */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">🔄 Detaylı Kuluçka Akışı (2025)</h3>
                      <div style={{ padding: '40px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '30px' }}>
                          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🥚</div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                              {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>
                              Kuluçkaya Basılan Yumurta
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              (bin adet)
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '8px' }}>↓</div>
                            <div style={{ 
                              padding: '8px 16px', 
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                              borderRadius: '20px',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '0.9rem'
                            }}>
                              %{tuikData[0]?.hatchRate.toFixed(1)} Başarı
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🐣</div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>
                              {(tuikData[0]?.producedChicks || 0).toLocaleString('tr-TR')}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>
                              Üretilen Civiv
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              (bin adet)
                            </div>
                          </div>
                        </div>

                        <div style={{ 
                          borderTop: '2px dashed var(--border)', 
                          paddingTop: '40px',
                          display: 'flex',
                          justifyContent: 'space-around',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '30px'
                        }}>
                          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🐔</div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f97316' }}>
                              {(tuikData[0]?.slaughtered || 0).toLocaleString('tr-TR')}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>
                              Kesilen Tavuk
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              (bin adet)
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '8px' }}>↓</div>
                            <div style={{ 
                              padding: '8px 16px', 
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                              borderRadius: '20px',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '0.9rem'
                            }}>
                              {tuikData[0]?.yieldPerBird.toFixed(2)} kg/baş
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🥩</div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                              {(tuikData[0]?.meatProduction || 0).toLocaleString('tr-TR')}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>
                              Et Üretimi
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              (ton)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PROJEKSİYON TAB */}
              {activeTuikTab === 'projection' && (
                <>
                  {/* Projeksiyon Özet Kartları */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                  }}>
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                        📊 2026 Tahmini Kesilen Tavuk
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f97316', marginBottom: '8px' }}>
                        {(() => {
                          const lastYear = tuikData[0]?.slaughtered || 0;
                          const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                          const years = tuikData.length - 1;
                          const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                          const projection2026 = lastYear * (1 + growthRate);
                          return (projection2026 * 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
                        })()} adet
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        CAGR bazlı projeksiyon
                      </div>
                    </div>

                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                        🥩 2026 Tahmini Et Üretimi
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                        {(() => {
                          const lastYear = tuikData[0]?.meatProduction || 0;
                          const firstYear = tuikData[tuikData.length - 1]?.meatProduction || 1;
                          const years = tuikData.length - 1;
                          const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                          const projection2026 = lastYear * (1 + growthRate);
                          return projection2026.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
                        })()} ton
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        CAGR bazlı projeksiyon
                      </div>
                    </div>

                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                        📈 Yıllık Büyüme Oranı
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                        %{(() => {
                          const lastYear = tuikData[0]?.slaughtered || 0;
                          const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                          const years = tuikData.length - 1;
                          const growthRate = (Math.pow(lastYear / firstYear, 1 / years) - 1) * 100;
                          return growthRate.toFixed(2);
                        })()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {tuikData.length} yıllık CAGR
                      </div>
                    </div>

                    <div style={{ 
                      background: 'var(--bg-card)', 
                      padding: '24px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
                        🔮 Projeksiyon Metodu
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        CAGR Model
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Bileşik yıllık büyüme oranı
                      </div>
                    </div>
                  </div>

                  {/* Aylık Projeksiyon Grafikleri */}
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">📈 Kesilen Tavuk Projeksiyon (Aylık 2025-2026)</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart 
                          data={(() => {
                            if (!monthlySlaughter || monthlySlaughter.length === 0) return [];
                            
                            const lastYear = tuikData[0]?.slaughtered || 0;
                            const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                            const years = tuikData.length - 1;
                            const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                            
                            const monthlyGrowth = Math.pow(1 + growthRate, 1 / 12) - 1;
                            
                            const data2025 = monthlySlaughter.map((m) => ({
                              month: `2025-${m.month}`,
                              actual: m.value,
                              projected: null as number | null,
                            }));
                            
                            const avgMonthly = monthlySlaughter.reduce((sum, m) => sum + m.value, 0) / monthlySlaughter.length;
                            
                            const data2026 = monthlySlaughter.map((m, i) => {
                              const projectedValue = avgMonthly * Math.pow(1 + monthlyGrowth, i + 12);
                              return {
                                month: `2026-${m.month}`,
                                actual: null as number | null,
                                projected: projectedValue,
                              };
                            });
                            
                            return [...data2025, ...data2026];
                          })()}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                            angle={-45}
                            textAnchor="end"
                            height={90}
                          />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v)}
                          />
                          <Tooltip
                            formatter={(value) => {
                              if (value === null || value === undefined) return ['', ''];
                              return [`${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet`, ''];
                            }}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="actual" 
                            name="2025 Gerçek" 
                            fill="#f97316" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="projected" 
                            name="2026 Projeksiyon" 
                            fill="#fb923c" 
                            radius={[4, 4, 0, 0]}
                            opacity={0.7}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">🥩 Tavuk Eti Projeksiyon (Aylık 2025-2026)</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart 
                          data={(() => {
                            if (!monthlyMeat || monthlyMeat.length === 0) return [];
                            
                            const lastYear = tuikData[0]?.meatProduction || 0;
                            const firstYear = tuikData[tuikData.length - 1]?.meatProduction || 1;
                            const years = tuikData.length - 1;
                            const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                            
                            const monthlyGrowth = Math.pow(1 + growthRate, 1 / 12) - 1;
                            
                            const data2025 = monthlyMeat.map((m) => ({
                              month: `2025-${m.month}`,
                              actual: m.value,
                              projected: null as number | null,
                            }));
                            
                            const avgMonthly = monthlyMeat.reduce((sum, m) => sum + m.value, 0) / monthlyMeat.length;
                            
                            const data2026 = monthlyMeat.map((m, i) => {
                              const projectedValue = avgMonthly * Math.pow(1 + monthlyGrowth, i + 12);
                              return {
                                month: `2026-${m.month}`,
                                actual: null as number | null,
                                projected: projectedValue,
                              };
                            });
                            
                            return [...data2025, ...data2026];
                          })()}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                            angle={-45}
                            textAnchor="end"
                            height={90}
                          />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v)}
                          />
                          <Tooltip
                            formatter={(value) => {
                              if (value === null || value === undefined) return ['', ''];
                              return [`${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton`, ''];
                            }}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="actual" 
                            name="2025 Gerçek" 
                            fill="#ef4444" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="projected" 
                            name="2026 Projeksiyon" 
                            fill="#f87171" 
                            radius={[4, 4, 0, 0]}
                            opacity={0.7}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Metodoloji Açıklaması */}
                  <div style={{ 
                    background: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    marginTop: '20px'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                      📋 Projeksiyon Metodolojisi
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <p style={{ marginBottom: '12px' }}>
                        <strong>CAGR (Compound Annual Growth Rate):</strong> Bileşik yıllık büyüme oranı modeli kullanılarak 2026 yılı projeksiyonu hesaplanmaktadır.
                      </p>
                      <p style={{ marginBottom: '12px' }}>
                        <strong>Hesaplama:</strong> Son {tuikData.length} yıllık verinin geometrik ortalaması alınarak sabit bir büyüme oranı belirlenir ve gelecek dönem tahminleri yapılır.
                      </p>
                      <p style={{ marginBottom: '12px' }}>
                        <strong>Aylık Dağılım:</strong> 2025 yılının aylık ortalama değerleri baz alınarak, aylık büyüme katsayısı ile 2026 projeksiyonu oluşturulur.
                      </p>
                      <p style={{ marginBottom: '0' }}>
                        <strong>Not:</strong> Projeksiyonlar tarihsel trendlere dayalıdır ve dış faktörler (hastalık, politika değişiklikleri, pazar şokları vb.) dikkate alınmamıştır.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Hindi Eti Üretimi Bölümü */}
          {turkeyMeatData.length > 0 && (
            <>
              <div style={{ marginTop: '60px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🦃 Hindi Eti Üretimi (TÜİK)
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Türkiye'de yıllık hindi eti üretimi ve aylık dağılım verileri
                </p>
              </div>

              {/* Hindi Eti KPI Kartları */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">2025 ÜRETİM</span>
                    <div className="kpi-icon orange">🦃</div>
                  </div>
                  <div className="kpi-value">
                    {(turkeyMeatData[0]?.production || 0).toLocaleString('tr-TR')} ton
                  </div>
                  <div className="kpi-subtitle">Yıllık toplam</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">ORTALAMA (10 YIL)</span>
                    <div className="kpi-icon blue">📊</div>
                  </div>
                  <div className="kpi-value">
                    {(() => {
                      const recent10 = turkeyMeatData.slice(0, Math.min(10, turkeyMeatData.length));
                      const avg = recent10.reduce((sum, d) => sum + d.production, 0) / recent10.length;
                      return avg.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ton';
                    })()}
                  </div>
                  <div className="kpi-subtitle">Son 10 yıl ortalaması</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">BÜYÜME ORANI</span>
                    <div className="kpi-icon green">📈</div>
                  </div>
                  <div className="kpi-value">
                    {(() => {
                      if (turkeyMeatData.length < 2) return '0%';
                      const current = turkeyMeatData[0]?.production || 0;
                      const previous = turkeyMeatData[1]?.production || 1;
                      const growth = ((current - previous) / previous * 100);
                      return (growth > 0 ? '+' : '') + growth.toFixed(2) + '%';
                    })()}
                  </div>
                  <div className="kpi-subtitle">Yıllık değişim</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">TOPLAM ({turkeyMeatData.length} YIL)</span>
                    <div className="kpi-icon purple">🔢</div>
                  </div>
                  <div className="kpi-value">
                    {turkeyMeatData.reduce((sum, d) => sum + d.production, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                  </div>
                  <div className="kpi-subtitle">Toplam üretim</div>
                </div>
              </div>

              {/* Hindi Eti Yıllık Trend */}
              <div className="chart-grid" style={{ marginTop: '30px' }}>
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">📈 Hindi Eti Yıllık Üretim Trendi</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={turkeyMeatData.slice().reverse()}>
                      <defs>
                        <linearGradient id="colorTurkey" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        label={{ 
                          value: 'Üretim (ton)', 
                          angle: -90, 
                          position: 'insideLeft', 
                          fill: 'var(--text-secondary)', 
                          fontSize: 12 
                        }}
                      />
                      <Tooltip
                        contentStyle={{ 
                          background: 'var(--bg-card)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px' 
                        }}
                        formatter={(value: number) => [
                          Number(value).toLocaleString('tr-TR') + ' ton',
                          'Üretim'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="production" 
                        stroke="#ea580c" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTurkey)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="production" 
                        stroke="#dc2626" 
                        strokeWidth={2}
                        dot={{ fill: '#ea580c', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '16px', 
                    background: 'var(--bg-primary)', 
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong>Analiz:</strong> {turkeyMeatData.length} yıllık veriye göre hindi eti üretimi{' '}
                    {(() => {
                      const first = turkeyMeatData[turkeyMeatData.length - 1]?.production || 1;
                      const last = turkeyMeatData[0]?.production || 0;
                      const change = ((last - first) / first * 100).toFixed(1);
                      return Number(change) > 0 
                        ? `artış trendi göstermektedir (+${change}%).` 
                        : `düşüş trendi göstermektedir (${change}%).`;
                    })()}
                  </div>
                </div>
              </div>

              {/* 2025 Aylık Dağılım */}
              {monthlyTurkeyMeat.length > 0 && (
                <>
                  <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                      📅 2025 Aylık Hindi Eti Üretimi
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      * Bazı aylar TÜİK tarafından gizli tutulmuştur. Eksik aylar, mevcut ayların ortalaması ile tahmin edilmiştir.
                    </p>
                  </div>

                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">📊 Aylık Üretim Dağılımı</h3>
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={monthlyTurkeyMeat}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            label={{ 
                              value: 'Üretim (ton)', 
                              angle: -90, 
                              position: 'insideLeft', 
                              fill: 'var(--text-secondary)', 
                              fontSize: 12 
                            }}
                          />
                          <Tooltip
                            contentStyle={{ 
                              background: 'var(--bg-card)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px' 
                            }}
                            formatter={(value: number) => [
                              Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ton',
                              'Üretim'
                            ]}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {monthlyTurkeyMeat.map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`hsl(${20 + index * 10}, 75%, ${50 + (index % 2) * 10}%)`} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: 'var(--bg-primary)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div>
                          <strong>En yüksek ay:</strong>{' '}
                          {monthlyTurkeyMeat.reduce((max, m) => m.value > max.value ? m : max, monthlyTurkeyMeat[0]).month}
                          {' '}
                          ({monthlyTurkeyMeat.reduce((max, m) => m.value > max.value ? m : max, monthlyTurkeyMeat[0]).value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton)
                        </div>
                        <div>
                          <strong>Aylık ortalama:</strong>{' '}
                          {(monthlyTurkeyMeat.reduce((sum, m) => sum + m.value, 0) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                        </div>
                        <div>
                          <strong>2025 toplam:</strong>{' '}
                          {monthlyTurkeyMeat.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Hindi Eti Özet */}
              <div style={{ 
                marginTop: '30px', 
                padding: '24px', 
                background: 'var(--bg-card)', 
                borderRadius: '16px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>
                  📊 Hindi Eti Üretimi Özet
                </h3>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>🔍 Veri Kaynağı:</strong> TÜİK Kümes Hayvancılığı İstatistikleri
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>📅 Dönem:</strong> {turkeyMeatData[turkeyMeatData.length - 1]?.year} - {turkeyMeatData[0]?.year} ({turkeyMeatData.length} yıl)
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>⚠️ Not:</strong> Bazı yıllarda TÜİK tarafından aylık detay veriler gizli tutulmuştur. 
                    Bu durumlarda yıllık toplam kullanılmış veya mevcut ayların ortalaması ile tahmin yapılmıştır.
                  </p>
                  <p style={{ marginBottom: '0' }}>
                    <strong>💡 Bilgi:</strong> Hindi eti üretimi, Türkiye'de beyaz et sektörünün küçük ama önemli bir parçasıdır. 
                    Özellikle bayram dönemlerinde ve özel günlerde talep artışı görülmektedir.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Bıldırcın Eti Üretimi Bölümü */}
          {quailMeatData.length > 0 && (
            <>
              <div style={{ marginTop: '60px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🐦 Bıldırcın Eti Üretimi (TÜİK)
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Türkiye'de yıllık bıldırcın eti üretimi ve kesilen bıldırcın sayısı
                </p>
              </div>

              {/* Bıldırcın KPI Kartları */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">BILDIRCIN ETİ ({quailMeatData[0]?.year})</span>
                    <div className="kpi-icon orange">🐦</div>
                  </div>
                  <div className="kpi-value">
                    {(quailMeatData[0]?.production || 0).toLocaleString('tr-TR')} ton
                  </div>
                  <div className="kpi-subtitle">Yıllık toplam</div>
                </div>

                {quailSlaughterData.length > 0 && (
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <span className="kpi-title">KESİLEN ({quailSlaughterData[0]?.year})</span>
                      <div className="kpi-icon blue">🔪</div>
                    </div>
                    <div className="kpi-value">
                      {(quailSlaughterData[0]?.production || 0).toLocaleString('tr-TR')} bin adet
                    </div>
                    <div className="kpi-subtitle">Yıllık toplam</div>
                  </div>
                )}

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">BÜYÜME</span>
                    <div className="kpi-icon green">📈</div>
                  </div>
                  <div className="kpi-value">
                    {(() => {
                      if (quailMeatData.length < 2) return '0%';
                      const current = quailMeatData[0]?.production || 0;
                      const previous = quailMeatData[1]?.production || 1;
                      const growth = ((current - previous) / previous * 100);
                      return (growth > 0 ? '+' : '') + growth.toFixed(1) + '%';
                    })()}
                  </div>
                  <div className="kpi-subtitle">Yıllık değişim</div>
                </div>

                {quailMeatData.length > 0 && quailSlaughterData.length > 0 && (
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <span className="kpi-title">VERİM</span>
                      <div className="kpi-icon purple">📊</div>
                    </div>
                    <div className="kpi-value">
                      {(() => {
                        const meat = quailMeatData[0]?.production || 0;
                        const slaughter = quailSlaughterData[0]?.production || 1;
                        return ((meat * 1000) / (slaughter * 1000)).toFixed(3) + ' kg/baş';
                      })()}
                    </div>
                    <div className="kpi-subtitle">Bıldırcın başına</div>
                  </div>
                )}
              </div>

              {/* Bıldırcın Eti Yıllık Trend */}
              <div className="chart-grid" style={{ marginTop: '30px' }}>
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">📈 Bıldırcın Eti Yıllık Üretim Trendi</h3>
                  <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={quailMeatData.slice().reverse()}>
                      <defs>
                        <linearGradient id="colorQuail" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Üretim (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']} />
                      <Area type="monotone" dataKey="production" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorQuail)" />
                      <Line type="monotone" dataKey="production" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Kesilen Bıldırcın vs Et */}
                {quailSlaughterData.length > 0 && (
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">🔄 Kesilen Bıldırcın vs Et Üretimi</h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={(() => {
                        const merged = quailMeatData.slice().reverse().map(d => {
                          const slaughter = quailSlaughterData.find(s => s.year === d.year);
                          return { year: d.year, meat: d.production, slaughtered: slaughter?.production || 0 };
                        });
                        return merged;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Et (ton)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Kesilen (bin adet)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        <Legend />
                        <Bar yAxisId="right" dataKey="slaughtered" name="Kesilen (bin adet)" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line yAxisId="left" type="monotone" dataKey="meat" name="Et (ton)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bıldırcın Aylık Dağılım */}
              {monthlyQuailMeat.some(m => m.value > 0) && (
                <div className="chart-grid" style={{ marginTop: '20px' }}>
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">📅 Aylık Bıldırcın Eti Üretimi ({quailMeatData[0]?.year})</h3>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={monthlyQuailMeat}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']} />
                        <Bar dataKey="value" name="Aylık Üretim" radius={[8, 8, 0, 0]}>
                          {monthlyQuailMeat.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${260 + index * 8}, 65%, ${50 + (index % 2) * 10}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Toplam Beyaz Et Karşılaştırması */}
          {(tuikData.length > 0 || turkeyMeatData.length > 0 || quailMeatData.length > 0) && (
            <>
              <div style={{ marginTop: '60px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  📊 Toplam Beyaz Et Karşılaştırması
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Tavuk, Hindi ve Bıldırcın eti üretim trendlerinin karşılaştırmalı analizi
                </p>
              </div>

              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">📈 Beyaz Et Türlerinin Yıllık Karşılaştırması (ton)</h3>
                  <ResponsiveContainer width="100%" height={420}>
                    <ComposedChart data={(() => {
                      const allYears = new Set<string>();
                      tuikData.forEach(d => allYears.add(d.year));
                      turkeyMeatData.forEach(d => allYears.add(d.year));
                      quailMeatData.forEach(d => allYears.add(d.year));
                      
                      return Array.from(allYears).sort().map(year => ({
                        year,
                        tavuk: tuikData.find(d => d.year === year)?.meatProduction || 0,
                        hindi: turkeyMeatData.find(d => d.year === year)?.production || 0,
                        bildircin: quailMeatData.find(d => d.year === year)?.production || 0,
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number, name: string) => [Number(value).toLocaleString('tr-TR') + ' ton', name]} />
                      <Legend />
                      <Bar dataKey="tavuk" name="Tavuk Eti" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hindi" name="Hindi Eti" fill="#ea580c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bildircin" name="Bıldırcın Eti" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Son Yıl Pay Dağılımı */}
                <div className="chart-card">
                  <h3 className="chart-title">🥧 Son Yıl Beyaz Et Bileşimi</h3>
                  <div style={{ padding: '20px' }}>
                    {(() => {
                      const latestTavuk = tuikData[0]?.meatProduction || 0;
                      const latestHindi = turkeyMeatData[0]?.production || 0;
                      const latestBildircin = quailMeatData[0]?.production || 0;
                      const total = latestTavuk + latestHindi + latestBildircin;
                      
                      const items = [
                        { name: 'Tavuk Eti', value: latestTavuk, color: '#f97316', emoji: '🐔' },
                        { name: 'Hindi Eti', value: latestHindi, color: '#ea580c', emoji: '🦃' },
                        { name: 'Bıldırcın Eti', value: latestBildircin, color: '#8b5cf6', emoji: '🐦' },
                      ];
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {items.map(item => (
                            <div key={item.name}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{item.emoji} {item.name}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {item.value.toLocaleString('tr-TR')} ton ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                                </span>
                              </div>
                              <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TOPLAM BEYAZ ET</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                              {total.toLocaleString('tr-TR')} ton
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Toplam Beyaz Et Trendi */}
                <div className="chart-card">
                  <h3 className="chart-title">📈 Toplam Beyaz Et Trendi</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={(() => {
                      const allYears = new Set<string>();
                      tuikData.forEach(d => allYears.add(d.year));
                      turkeyMeatData.forEach(d => allYears.add(d.year));
                      quailMeatData.forEach(d => allYears.add(d.year));
                      
                      return Array.from(allYears).sort().map(year => {
                        const tavuk = tuikData.find(d => d.year === year)?.meatProduction || 0;
                        const hindi = turkeyMeatData.find(d => d.year === year)?.production || 0;
                        const bildircin = quailMeatData.find(d => d.year === year)?.production || 0;
                        return { year, toplam: tavuk + hindi + bildircin };
                      });
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Toplam']} />
                      <Area type="monotone" dataKey="toplam" name="Toplam Beyaz Et" fill="#10b981" stroke="#10b981" fillOpacity={0.3} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
