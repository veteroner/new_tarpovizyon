import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { fetchQuery } from '../services/api';
import ProductSelector from '../components/ProductSelector';
import { translateCountry } from '../utils/countryTranslations';
import { translateProduct } from '../utils/productTranslations';
import { TurkeyHeatMap, type RegionTotal } from '../components/TurkeyHeatMap';
import { InsightCard, type Insight } from '../components/InsightCard';
import { generateLivestockInsights } from '../utils/livestockInsights';
import { 
  calculateCAGR, 
  calculateHHI, 
  calculateYoY, 
  calculateVolatility,
  forecastLinear,
  detectAnomalies,
  type YearValue
} from '../utils/livestockCalculations';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

type Tab = 'overview' | 'stocks' | 'primary' | 'processed' | 'efficiency' | 'predictions';
type PrimaryTab = 'meat' | 'milk' | 'eggs' | 'other';

interface DataItem {
  [key: string]: string | number;
}

const ANIMAL_ITEMS = [
  { id: 'Sığır', name: 'Cattle', nameTR: 'Sığır' },
  { id: 'Koyun', name: 'Sheep', nameTR: 'Koyun' },
  { id: 'Keçi', name: 'Goats', nameTR: 'Keçi' },
  { id: 'Domuz', name: 'Swine / pigs', nameTR: 'Domuz' },
  { id: 'Tavuk', name: 'Chickens', nameTR: 'Tavuk' },
  { id: 'Manda', name: 'Buffalo', nameTR: 'Manda' },
  { id: 'At', name: 'Horses', nameTR: 'At' },
  { id: 'Hindi', name: 'Turkeys', nameTR: 'Hindi' },
  { id: 'Ördek', name: 'Ducks', nameTR: 'Ördek' },
];

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

export default function LivestockStocksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activePrimaryTab, setActivePrimaryTab] = useState<PrimaryTab>('meat');
  const [selectedYear, setSelectedYear] = useState('2022');
  const [availableYears, setAvailableYears] = useState<string[]>(['2024', '2023', '2022', '2021', '2020', '2019', '2018']);
  const [selectedItems, setSelectedItems] = useState<string[]>(['Sığır', 'Koyun', 'Keçi', 'Tavuk']);
  const [loading, setLoading] = useState(true);
  
  // Overview data
  const [overviewKPIs, setOverviewKPIs] = useState<Record<string, number> | null>(null);
  const [overviewTrend, setOverviewTrend] = useState<DataItem[]>([]);
  
  // Stocks data
  const [stocksData, setStocksData] = useState<DataItem[]>([]);
  const [stocksCountryData, setStocksCountryData] = useState<DataItem[]>([]);
  const [, setStocksYearlyData] = useState<DataItem[]>([]);

  // Stocks Intelligence (Sprint 3)
  const [stocksKPIs, setStocksKPIs] = useState<{
    totalStock: number; countryCount: number; speciesCount: number;
    turkeyRankGlobal: number; turkeyTotal: number;
    globalCAGR5: number; globalCAGR10: number;
    turkeyCAGR5: number; topGrower: string; topGrowerCAGR: number;
    hhi: number;
  } | null>(null);
  const [stocksAnimalCAGR, setStocksAnimalCAGR] = useState<Array<{
    animal: string; cagr5: number; cagr10: number; current: number;
    trend: 'surge' | 'growth' | 'stable' | 'decline' | 'collapse';
  }>>([]);
  const [stocksCountryCAGR, setStocksCountryCAGR] = useState<Array<{
    country: string; total: number; cagr5: number; share: number;
  }>>([]);
  const [stocksDeepTrend, setStocksDeepTrend] = useState<Array<{
    year: string; total: number; [key: string]: string | number;
  }>>([]);
  const [stocksRiskAlerts, setStocksRiskAlerts] = useState<Array<{
    animal: string; country: string; decline10: number; type: 'collapse' | 'sharp_decline' | 'anomaly_surge';
  }>>([]);
  const [stocksTurkeyProfile, setStocksTurkeyProfile] = useState<Array<{
    animal: string; count: number; rank: number; share: number; cagr5: number;
  }>>([]);
  const [stocksInsights, setStocksInsights] = useState<Insight[]>([]);
  
  // Primary products data
  const [, setPrimaryData] = useState<DataItem[]>([]);
  const [primaryCountryData, setPrimaryCountryData] = useState<DataItem[]>([]);
  const [primaryYearlyData, setPrimaryYearlyData] = useState<DataItem[]>([]);

  // Primary Intelligence (Sprint 4)
  const [primaryKPIs, setPrimaryKPIs] = useState<{
    totalProduction: number; productCount: number; countryCount: number;
    turkeyRank: number; turkeyTotal: number; turkeyShare: number;
    globalCAGR5: number; turkeyCAGR5: number; leader: string; leaderShare: number;
  } | null>(null);
  const [primaryProductCAGR, setPrimaryProductCAGR] = useState<Array<{
    product: string; current: number; cagr5: number; share: number;
    lifecycle: 'emerging' | 'growth' | 'mature' | 'declining';
  }>>([]);
  const [primaryCountryCAGR, setPrimaryCountryCAGR] = useState<Array<{
    country: string; total: number; cagr5: number; share: number;
  }>>([]);
  const [primaryTurkeyProducts, setPrimaryTurkeyProducts] = useState<Array<{
    product: string; production: number; rank: number; cagr5: number;
  }>>([]);
  const [primaryInsights, setPrimaryInsights] = useState<Insight[]>([]);

  // Intelligence metrics (F1.1)
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<{
    cagr5Year: number | null;
    yoyGrowth: number | null;
    marketHHI: number | null;
    volatility: number | null;
    topMoverCountry: string | null;
    topMoverGrowth: number | null;
  } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [countryGrowthData, setCountryGrowthData] = useState<Array<{country: string; cagr: number; marketShare: number}>>([]);

  // Sprint 7: Cross-Tab Executive Summary
  const [execSummary, setExecSummary] = useState<{
    supplyChainRatio: number; // processed/primary ratio
    primaryTotal: number; processedTotal: number;
    turkeyPrimaryRank: number; turkeyEffRank: string;
    topRisk: string; topOpportunity: string;
    crossInsights: Insight[];
  } | null>(null);

  // Efficiency data (F1.3) - Sprint 6 Intelligence
  const [, setEfficiencyData] = useState<Array<{
    country: string;
    meatEfficiency: number | null;
    milkEfficiency: number | null;
    eggEfficiency: number | null;
  }>>([]);
  const [efficiencyTrends, setEfficiencyTrends] = useState<Array<{
    year: number;
    avgMeatEfficiency: number;
    avgMilkEfficiency: number;
    avgEggEfficiency: number;
    trMeatEfficiency?: number;
    trMilkEfficiency?: number;
    trEggEfficiency?: number;
  }>>([]);
  const [effKPIs, setEffKPIs] = useState<{
    countryCount: number;
    trMeatEff: number; trMilkEff: number; trEggEff: number;
    trMeatRank: number; trMilkRank: number; trEggRank: number;
    worldAvgMeat: number; worldAvgMilk: number; worldAvgEgg: number;
    leaderMeat: string; leaderMilk: string; leaderEgg: string;
    leaderMeatVal: number; leaderMilkVal: number; leaderEggVal: number;
  } | null>(null);
  const [effGapAnalysis, setEffGapAnalysis] = useState<Array<{
    category: string; icon: string; unit: string;
    turkeyVal: number; leaderVal: number; leaderCountry: string;
    worldAvg: number; gapToLeader: number; gapToAvg: number;
    catchUpYears: number | null; trend: string;
  }>>([]);
  const [effScatterData, setEffScatterData] = useState<Array<{
    country: string; meatEff: number; milkEff: number; eggEff: number;
    totalProd: number; isTurkey: boolean;
  }>>([]);
  const [effBestPractices, setEffBestPractices] = useState<Array<{
    country: string; meatEff: number; milkEff: number; eggEff: number;
    avgEff: number; segment: string;
  }>>([]);
  const [effInsights, setEffInsights] = useState<Insight[]>([]);

  // Predictions data (F1.2)
  const [predictionsData, setPredictionsData] = useState<Array<{
    country: string;
    product: string;
    forecast: Array<{year: number; value: number}>;
    trend: string;
    r2: number;
  }>>([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState<Array<{
    country: string;
    product: string;
    year: string;
    type: string;
    zScore: number;
  }>>([]);
  const [riskAlerts, setRiskAlerts] = useState<Array<{
    country: string;
    product: string;
    decline: number;
  }>>([]);

  // Predictions Intelligence (Sprint 5)
  const [predKPIs, setPredKPIs] = useState<{
    totalForecasts: number; highConfidence: number; anomalyCount: number; riskCount: number;
    avgR2: number; upTrend: number; downTrend: number; turkeyForecasts: number;
  } | null>(null);
  const [predForecastChart, setPredForecastChart] = useState<Array<{
    year: string; actual?: number; forecast?: number; upper?: number; lower?: number;
  }>>([]);
  const [predTurkeyForecasts, setPredTurkeyForecasts] = useState<Array<{
    product: string; current: number; forecast2027: number; changePercent: number; r2: number; trend: string;
  }>>([]);
  const [predR2GrowthScatter, setPredR2GrowthScatter] = useState<Array<{
    country: string; product: string; r2: number; growth: number; volume: number;
  }>>([]);
  const [predAnomalyTimeline, setPredAnomalyTimeline] = useState<Array<{
    year: string; spikes: number; drops: number; total: number;
  }>>([]);
  const [predInsights, setPredInsights] = useState<Insight[]>([]);
  const [predSelectedCountry, setPredSelectedCountry] = useState<string>('Türkiye');

  // Provincial livestock data for map
  const [provincialLivestock, setProvincialLivestock] = useState<RegionTotal[]>([]);
  const [livestockMapType, setLivestockMapType] = useState<'cattle' | 'sheep' | 'goat' | 'total'>('total');

  // Processed products data (Sprint 2)
  const [processedKPIs, setProcessedKPIs] = useState<{
    totalProduction: number; countryCount: number; productCount: number;
    turkeyRank: number; turkeyTotal: number; processingRate: number;
  } | null>(null);
  const [processedCountryData, setProcessedCountryData] = useState<Array<{
    country: string; total: number; dairy: number; fats: number; other: number;
  }>>([]);
  const [processedProductData, setProcessedProductData] = useState<Array<{
    product: string; total: number; turkeyVal: number; turkeyRank: number; topCountry: string;
  }>>([]);
  const [processedTurkeyTrend, setProcessedTurkeyTrend] = useState<Array<{
    year: string; dairy: number; fats: number; other: number;
  }>>([]);
  const [processedGrowthData, setProcessedGrowthData] = useState<Array<{
    product: string; cagr: number; current: number; lifecycle: string;
  }>>([]);
  const [processedInsights, setProcessedInsights] = useState<Insight[]>([]);

  // Auto-detect latest year
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [maxRes, yearsRes] = await Promise.all([
        fetchQuery("SELECT MAX(year) as max_year FROM fao_uretim_hayvansal_canlihayvan"),
        fetchQuery("SELECT DISTINCT year FROM fao_uretim_hayvansal_canlihayvan ORDER BY year DESC LIMIT 25"),
      ]);
      const maxYear = String(maxRes.data?.[0]?.max_year ?? '').trim();
      const years = (yearsRes.data ?? [])
        .map((r: Record<string, string | number>) => String(r.year ?? '').trim())
        .filter(Boolean);

      if (!cancelled && years.length) setAvailableYears(years);
      if (!cancelled && maxYear) setSelectedYear(maxYear);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load provincial livestock data for Turkey map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const provincialQuery = `
          SELECT 
            il as province,
            (CAST(sigir_varligi_bas AS UNSIGNED) + CAST(manda_varligi_bas AS UNSIGNED)) as cattle_count,
            CAST(koyun_varligi_bas AS UNSIGNED) as sheep_count,
            CAST(keci_varligi_bas AS UNSIGNED) as goat_count,
            (CAST(sigir_varligi_bas AS UNSIGNED) + CAST(manda_varligi_bas AS UNSIGNED) + 
             CAST(koyun_varligi_bas AS UNSIGNED) + CAST(keci_varligi_bas AS UNSIGNED)) as total_livestock
          FROM oner_i_llerin_hayvan_sayisi
          WHERE tarih = (SELECT MAX(tarih) FROM oner_i_llerin_hayvan_sayisi)
          ORDER BY il
        `;
        const provincialRes = await fetchQuery(provincialQuery);
        if (!cancelled && provincialRes.data && provincialRes.data.length > 0) {
          const mapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.total_livestock) || 0,
            unit: 'baş',
            cattle: Number(row.cattle_count) || 0,
            sheep: Number(row.sheep_count) || 0,
            goat: Number(row.goat_count) || 0
          }));
          setProvincialLivestock(mapped);
        }
      } catch (err) {
        console.error('İl bazlı hayvancılık verileri yüklenemedi:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load overview data
  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";
      const stockValueExpr = "CASE WHEN miktar_birim='1000 An' THEN CAST(miktar_deger AS DECIMAL(20,2)) * 1000 ELSE CAST(miktar_deger AS DECIMAL(20,2)) END";
      
      const stocksQuery = `SELECT SUM(${stockValueExpr}) as total 
        FROM fao_uretim_hayvansal_canlihayvan 
        WHERE year='${selectedYear}' AND ulkead NOT IN ${excludedAreas}`;
      
      const meatQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND uretim_birim='t'
          AND (
            urunad LIKE '%Meat%' OR urunad LIKE '%meat%' OR
            urunad LIKE '%offal%' OR urunad LIKE '%Offal%' OR
            urunad LIKE '%fat%' OR urunad LIKE '%Fat%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const milkQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}' AND uretim_birim='t'
          AND (
            urunad LIKE '%Milk%' OR urunad LIKE '%milk%' OR
            urunad LIKE '%Cheese%' OR urunad LIKE '%cheese%' OR
            urunad LIKE '%Butter%' OR urunad LIKE '%butter%' OR
            urunad LIKE '%Cream%' OR urunad LIKE '%cream%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const eggsQuery = `SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total 
        FROM fao_uretim_hayvansal_birincil 
        WHERE year='${selectedYear}'
          AND (
            urunad LIKE '%Egg%' OR urunad LIKE '%egg%'
          )
          AND ulkead NOT IN ${excludedAreas}`;
      
      const trendQuery = `SELECT year, 
        SUM(${stockValueExpr}) as stocks
        FROM fao_uretim_hayvansal_canlihayvan 
        WHERE ulkead NOT IN ${excludedAreas}
        GROUP BY year ORDER BY year DESC LIMIT 20`;

      const [stocksRes, meatRes, milkRes, eggsRes, trendRes] = await Promise.all([
        fetchQuery(stocksQuery),
        fetchQuery(meatQuery),
        fetchQuery(milkQuery),
        fetchQuery(eggsQuery),
        fetchQuery(trendQuery)
      ]);

      setOverviewKPIs({
        totalStocks: Number(stocksRes.data?.[0]?.total || 0),
        totalMeat: Number(meatRes.data?.[0]?.total || 0),
        totalMilk: Number(milkRes.data?.[0]?.total || 0),
        totalEggs: Number(eggsRes.data?.[0]?.total || 0),
      });

      if (trendRes.data) {
        const trendData = trendRes.data.map((d: Record<string, string | number>) => ({
          year: String(d.year),
          value: Number(d.stocks) || 0
        })).reverse();
        setOverviewTrend(trendData);

        // Calculate intelligence metrics (F1.1)
        const yearValues: YearValue[] = trendData.map(d => ({
          year: d.year as string,
          value: d.value as number
        }));

        // CAGR (5-year)
        const recentYears = yearValues.slice(-5);
        const cagrResult = calculateCAGR(recentYears);
        
        // YoY Growth
        let yoyGrowth = null;
        if (yearValues.length >= 2) {
          const current = yearValues[yearValues.length - 1].value;
          const previous = yearValues[yearValues.length - 2].value;
          yoyGrowth = calculateYoY(current, previous);
        }

        // Volatility
        const volatility = calculateVolatility(yearValues);

        // Get country-level data for HHI and top movers
        const countryGrowthQuery = `
          SELECT ulkead, year, SUM(${stockValueExpr}) as total
          FROM fao_uretim_hayvansal_canlihayvan
          WHERE ulkead NOT IN ${excludedAreas} AND year >= ${parseInt(selectedYear) - 5}
          GROUP BY ulkead, year
          ORDER BY ulkead, year
        `;
        const countryGrowthRes = await fetchQuery(countryGrowthQuery);

        if (countryGrowthRes.data) {
          // Group by country
          const countryMap = new Map<string, YearValue[]>();
          countryGrowthRes.data.forEach((row: Record<string, string | number>) => {
            const country = String(row.ulkead);
            if (!countryMap.has(country)) {
              countryMap.set(country, []);
            }
            countryMap.get(country)!.push({
              year: String(row.year),
              value: Number(row.total) || 0
            });
          });

          // Calculate CAGR for each country
          const countryCAGRs = Array.from(countryMap.entries())
            .map(([country, values]) => {
              const cagr = calculateCAGR(values);
              const latestShare = values[values.length - 1]?.value || 0;
              return {
                country: translateCountry(country),
                cagr: cagr?.cagr || 0,
                marketShare: latestShare
              };
            })
            .filter(c => c.marketShare > 0)
            .sort((a, b) => b.cagr - a.cagr);

          setCountryGrowthData(countryCAGRs);

          // Find top mover
          const topMover = countryCAGRs[0];

          // Calculate HHI
          const marketShares = countryCAGRs.map(c => c.marketShare);
          const hhiResult = calculateHHI(marketShares);

          setIntelligenceMetrics({
            cagr5Year: cagrResult?.cagr || null,
            yoyGrowth,
            marketHHI: hhiResult.hhi,
            volatility,
            topMoverCountry: topMover?.country || null,
            topMoverGrowth: topMover?.cagr || null
          });

          // Generate insights
          const generatedInsights = generateLivestockInsights({
            cagrData: countryCAGRs.slice(0, 10).map(c => ({ country: c.country, cagr: c.cagr })),
            hhiData: {
              hhi: hhiResult.hhi,
              top1Share: hhiResult.top1Share,
              top1Country: countryCAGRs[0]?.country
            },
            volatilityData: countryCAGRs.filter(c => {
              const countryData = countryMap.get(c.country);
              if (!countryData) return false;
              const vol = calculateVolatility(countryData);
              return vol > 20;
            }).map(c => {
              const countryData = countryMap.get(c.country)!;
              return {
                country: c.country,
                volatility: calculateVolatility(countryData)
              };
            }).slice(0, 5)
          });
          setInsights(generatedInsights);
        }
      }

      // Sprint 7: Supply Chain Intelligence + Executive Summary
      try {
        const yr = parseInt(selectedYear);
        const EXCLUDED_FULL = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";

        const [primaryTotalRes, processedTotalRes, turkeyPrimaryRes] = await Promise.all([
          fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL}`),
          fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_islenmis WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL}`),
          fetchQuery(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year='${yr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_FULL} GROUP BY ulkead ORDER BY total DESC`),
        ]);

        const pTotal = Number(primaryTotalRes.data?.[0]?.total || 0);
        const prTotal = Number(processedTotalRes.data?.[0]?.total || 0);
        const ratio = pTotal > 0 ? (prTotal / pTotal) * 100 : 0;

        // Turkey rank in primary production
        const pRanks = (turkeyPrimaryRes.data || []) as Array<Record<string, string | number>>;
        const trPrimaryRank = pRanks.findIndex(r => String(r.ulkead) === 'Türkiye') + 1 || 0;

        // Cross-tab insights
        const xIns: Insight[] = [];
        xIns.push({ id: 'x-1', type: 'info', message: `Tedarik Zinciri: Dünya birincil üretiminin %${ratio.toFixed(1)}'i işlenmiş ürüne dönüştürülüyor`, severity: 'medium' });
        if (trPrimaryRank > 0 && trPrimaryRank <= 10) {
          xIns.push({ id: 'x-2', type: 'achievement', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada`, severity: 'medium' });
        } else if (trPrimaryRank > 10) {
          xIns.push({ id: 'x-2', type: 'warning', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada — ilk 10'a girme potansiyeli mevcut`, severity: 'medium' });
        }
        if (ratio < 20) {
          xIns.push({ id: 'x-3', type: 'decline', message: `İşleme oranı düşük (%${ratio.toFixed(1)}) — katma değerli üretim potansiyeli büyük`, severity: 'high' });
        }

        setExecSummary({
          supplyChainRatio: ratio,
          primaryTotal: pTotal,
          processedTotal: prTotal,
          turkeyPrimaryRank: trPrimaryRank,
          turkeyEffRank: '—',
          topRisk: 'Verimlilik açığı',
          topOpportunity: 'İşleme kapasitesi',
          crossInsights: xIns,
        });
      } catch (e) {
        console.error('Executive summary error:', e);
      }

    } catch (error) {
      console.error('Overview data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Load stocks data - Sprint 3 Intelligence
  const loadStocksData = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    try {
      const EXCLUDED = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
      const SV = "CASE WHEN miktar_birim='1000 An' THEN CAST(miktar_deger AS DECIMAL(20,2))*1000 ELSE CAST(miktar_deger AS DECIMAL(20,2)) END";
      const selNames = selectedItems.map(id => ANIMAL_ITEMS.find(a => a.id === id)?.name).filter((v): v is string => Boolean(v));
      const itemList = selNames.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
      if (!itemList) { setStocksData([]); setStocksCountryData([]); setStocksYearlyData([]); return; }
      const yr = parseInt(selectedYear);

      // --- 8 parallel queries ---
      const [animalRes, countryAllRes, yearlyRes, turkeyRes, animalYearRes, countryCAGRRes, deepTrendRes, riskRes] = await Promise.all([
        // Q1: animal type totals current year
        fetchQuery(`SELECT urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${selectedYear}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad ORDER BY toplam DESC`),
        // Q2: ALL countries (not just 20) for HHI + turkey rank
        fetchQuery(`SELECT ulkead, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${selectedYear}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead ORDER BY toplam DESC`),
        // Q3: global yearly totals (all years for deep trend)
        fetchQuery(`SELECT year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY year ORDER BY year`),
        // Q4: Turkey by animal type (current + 5y ago + 10y ago)
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE ulkead='Türkiye' AND urunad IN (${itemList}) AND year IN ('${yr}','${yr-5}','${yr-10}') GROUP BY urunad, year`),
        // Q5: animal CAGR data - per animal totals for 5y+10y spans
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}','${yr-10}') GROUP BY urunad, year`),
        // Q6: Country CAGR (top 30 countries, 5y comparison)
        fetchQuery(`SELECT ulkead, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY ulkead, year ORDER BY ulkead`),
        // Q7: Deep trend per animal (all years) for stacked area chart
        fetchQuery(`SELECT urunad, year, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad, year ORDER BY year, urunad`),
        // Q8: Risk alerts - countries with major decline
        fetchQuery(`SELECT a.ulkead, a.urunad, a.toplam as current_val, b.toplam as old_val FROM (SELECT ulkead, urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${yr}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead, urunad HAVING toplam > 100000) a JOIN (SELECT ulkead, urunad, SUM(${SV}) as toplam FROM fao_uretim_hayvansal_canlihayvan WHERE year='${yr-10}' AND urunad IN (${itemList}) AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead, urunad HAVING toplam > 100000) b ON a.ulkead=b.ulkead AND a.urunad=b.urunad WHERE (a.toplam - b.toplam)/b.toplam < -0.2 OR (a.toplam - b.toplam)/b.toplam > 1.0 ORDER BY (a.toplam - b.toplam)/b.toplam ASC LIMIT 30`)
      ]);

      // --- Process Q1: animal types ---
      if (animalRes.data) {
        setStocksData(animalRes.data.map((item: Record<string, string | number>, index: number) => ({
          name: String(item.urunad || ''), value: Number(item.toplam) || 0, fill: COLORS[index % COLORS.length]
        })));
      }

      // --- Process Q2: ALL countries → top20 display + HHI + Turkey rank ---
      const allCountries = (countryAllRes.data || []).map((item: Record<string, string | number>) => ({
        area: String(item.ulkead || ''), name: translateCountry(String(item.ulkead || '')),
        value: Number(item.toplam) || 0
      }));
      const globalTotal = allCountries.reduce((s: number, c: {value: number}) => s + c.value, 0);
      const top20Display = allCountries.slice(0, 20).map((c: {area: string; name: string; value: number}, i: number) => ({
        ...c, share: ((c.value / globalTotal) * 100).toFixed(1), fill: COLORS[i % COLORS.length]
      }));
      setStocksCountryData(top20Display);

      const trIdx = allCountries.findIndex((c: {area: string}) => c.area === 'Türkiye');
      const trTotal = trIdx >= 0 ? allCountries[trIdx].value : 0;
      const shares = allCountries.map((c: {value: number}) => c.value);
      const hhiResult = calculateHHI(shares);

      // --- Process Q3: yearly ---
      const yearlyArr = (yearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year || ''), value: Number(d.toplam) || 0
      }));
      setStocksYearlyData(yearlyArr.slice(-20));

      // Global 5y and 10y CAGR
      const latestYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr));
      const fiveAgoVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 5));
      const tenAgoVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 10));
      const globalCAGR5 = latestYearVal && fiveAgoVal && fiveAgoVal.value > 0
        ? (Math.pow(latestYearVal.value / fiveAgoVal.value, 1 / 5) - 1) * 100 : 0;
      const globalCAGR10 = latestYearVal && tenAgoVal && tenAgoVal.value > 0
        ? (Math.pow(latestYearVal.value / tenAgoVal.value, 1 / 10) - 1) * 100 : 0;

      // --- Process Q5: animal CAGR ---
      const animalYearMap = new Map<string, Map<string, number>>();
      (animalYearRes.data || []).forEach((d: Record<string, string | number>) => {
        const name = String(d.urunad);
        if (!animalYearMap.has(name)) animalYearMap.set(name, new Map());
        animalYearMap.get(name)!.set(String(d.year), Number(d.toplam) || 0);
      });
      const animalCAGRArr = Array.from(animalYearMap.entries()).map(([animal, yrs]) => {
        const cur = yrs.get(String(yr)) || 0;
        const y5 = yrs.get(String(yr - 5)) || 0;
        const y10 = yrs.get(String(yr - 10)) || 0;
        const cagr5 = y5 > 0 ? (Math.pow(cur / y5, 1 / 5) - 1) * 100 : 0;
        const cagr10 = y10 > 0 ? (Math.pow(cur / y10, 1 / 10) - 1) * 100 : 0;
        const trend: 'surge' | 'growth' | 'stable' | 'decline' | 'collapse' =
          cagr5 > 5 ? 'surge' : cagr5 > 1 ? 'growth' : cagr5 > -1 ? 'stable' : cagr5 > -5 ? 'decline' : 'collapse';
        return { animal, cagr5, cagr10, current: cur, trend };
      }).sort((a, b) => b.current - a.current);
      setStocksAnimalCAGR(animalCAGRArr);

      // --- Process Q4: Turkey profile ---
      const trAnimalMap = new Map<string, Map<string, number>>();
      (turkeyRes.data || []).forEach((d: Record<string, string | number>) => {
        const name = String(d.urunad);
        if (!trAnimalMap.has(name)) trAnimalMap.set(name, new Map());
        trAnimalMap.get(name)!.set(String(d.year), Number(d.toplam) || 0);
      });
      // compute Turkey share per animal from global animal totals
      const trProfile = selNames.map(animal => {
        const trYrs = trAnimalMap.get(animal);
        const trCur = trYrs?.get(String(yr)) || 0;
        const trY5 = trYrs?.get(String(yr - 5)) || 0;
        const trCagr5 = trY5 > 0 ? (Math.pow(trCur / trY5, 1 / 5) - 1) * 100 : 0;
        const animalTotal = animalYearMap.get(animal)?.get(String(yr)) || 1;
        const share = (trCur / animalTotal) * 100;
        return { animal, count: trCur, rank: 0, share, cagr5: trCagr5 };
      }).filter(p => p.count > 0).sort((a, b) => b.count - a.count);
      setStocksTurkeyProfile(trProfile);

      // --- Process Q6: Country CAGR top 30 ---
      const countryCAGRMap = new Map<string, {cur: number; old: number}>();
      (countryCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const c = String(d.ulkead);
        const y = String(d.year);
        if (!countryCAGRMap.has(c)) countryCAGRMap.set(c, { cur: 0, old: 0 });
        const entry = countryCAGRMap.get(c)!;
        if (y === String(yr)) entry.cur = Number(d.toplam) || 0;
        else entry.old = Number(d.toplam) || 0;
      });
      const countryCAGRArr = Array.from(countryCAGRMap.entries())
        .filter(([, v]) => v.cur > 0 && v.old > 0)
        .map(([country, v]) => ({
          country: translateCountry(country),
          total: v.cur,
          cagr5: (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100,
          share: (v.cur / globalTotal) * 100
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 30);
      setStocksCountryCAGR(countryCAGRArr);

      // Top grower among significant countries (>0.5% share)
      const significantGrowers = countryCAGRArr.filter(c => c.share > 0.5).sort((a, b) => b.cagr5 - a.cagr5);
      const topGrower = significantGrowers[0];

      // Turkey CAGR
      const trCAGREntry = countryCAGRMap.get('Türkiye');
      const turkeyCAGR5 = trCAGREntry && trCAGREntry.old > 0
        ? (Math.pow(trCAGREntry.cur / trCAGREntry.old, 1 / 5) - 1) * 100 : 0;

      // --- KPIs ---
      setStocksKPIs({
        totalStock: globalTotal,
        countryCount: allCountries.length,
        speciesCount: (animalRes.data || []).length,
        turkeyRankGlobal: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: trTotal,
        globalCAGR5,
        globalCAGR10,
        turkeyCAGR5,
        topGrower: topGrower?.country || '-',
        topGrowerCAGR: topGrower?.cagr5 || 0,
        hhi: hhiResult.hhi
      });

      // --- Process Q7: Deep trend per animal (stacked area) ---
      const deepMap = new Map<string, Map<string, number>>();
      (deepTrendRes.data || []).forEach((d: Record<string, string | number>) => {
        const y = String(d.year);
        const a = String(d.urunad);
        if (!deepMap.has(y)) deepMap.set(y, new Map());
        deepMap.get(y)!.set(a, Number(d.toplam) || 0);
      });
      const deepArr = Array.from(deepMap.entries()).map(([year, animals]) => {
        const row: Record<string, string | number> = { year, total: 0 };
        let tot = 0;
        animals.forEach((v, k) => { row[k] = v; tot += v; });
        row.total = tot;
        return row as { year: string; total: number; [key: string]: string | number };
      }).sort((a, b) => String(a.year).localeCompare(String(b.year)));
      setStocksDeepTrend(deepArr);

      // --- Process Q8: Risk alerts ---
      const risks = (riskRes.data || []).map((d: Record<string, string | number>) => {
        const cur = Number(d.current_val) || 0;
        const old = Number(d.old_val) || 0;
        const change = old > 0 ? ((cur - old) / old) * 100 : 0;
        let type: 'collapse' | 'sharp_decline' | 'anomaly_surge' = 'sharp_decline';
        if (change < -50) type = 'collapse';
        else if (change > 100) type = 'anomaly_surge';
        return {
          animal: String(d.urunad),
          country: translateCountry(String(d.ulkead)),
          decline10: change,
          type
        };
      });
      setStocksRiskAlerts(risks);

      // --- Auto-generate insights ---
      const insArr: Insight[] = [];
      let iid = 1;
      // Global trend insight
      if (globalCAGR5 > 1) {
        insArr.push({ id: `si${iid++}`, type: 'growth', message: `Küresel hayvan stoku 5 yılda yıllık %${globalCAGR5.toFixed(1)} büyüyor. Toplam ${formatNumber(globalTotal)} baş hayvan mevcut.`, severity: 'medium', category: 'TREND' });
      } else if (globalCAGR5 < -1) {
        insArr.push({ id: `si${iid++}`, type: 'decline', message: `Küresel stok 5 yılda yıllık %${Math.abs(globalCAGR5).toFixed(1)} azalıyor! ${formatNumber(globalTotal)} baş seviyesine geriledi.`, severity: 'high', category: 'TREND' });
      }
      // Turkey insight
      if (trIdx >= 0) {
        insArr.push({ id: `si${iid++}`, type: turkeyCAGR5 > 0 ? 'achievement' : 'warning',
          message: `Türkiye dünya ${trIdx + 1}. sırada (${formatNumber(trTotal)} baş, pay %${((trTotal / globalTotal) * 100).toFixed(1)}). 5Y BBO: %${turkeyCAGR5.toFixed(1)}`,
          severity: turkeyCAGR5 < 0 ? 'high' : 'medium', category: 'TÜRKİYE' });
      }
      // Most growing animal
      const topGrowAnimal = [...animalCAGRArr].sort((a, b) => b.cagr5 - a.cagr5)[0];
      if (topGrowAnimal && topGrowAnimal.cagr5 > 1) {
        insArr.push({ id: `si${iid++}`, type: 'growth', message: `En hızlı büyüyen tür: ${topGrowAnimal.animal} (5Y BBO %${topGrowAnimal.cagr5.toFixed(1)}). Mevcut stok: ${formatNumber(topGrowAnimal.current)}`, severity: 'medium', category: 'TÜR ANALİZİ' });
      }
      // Declining animal
      const decAnimal = [...animalCAGRArr].sort((a, b) => a.cagr5 - b.cagr5)[0];
      if (decAnimal && decAnimal.cagr5 < -1) {
        insArr.push({ id: `si${iid++}`, type: 'decline', message: `⚠️ ${decAnimal.animal} populasyonu eriyor! 5Y BBO %${decAnimal.cagr5.toFixed(1)}, acil dikkat gerekiyor.`, severity: 'high', category: 'RİSK' });
      }
      // HHI insight
      if (hhiResult.hhi < 500) {
        insArr.push({ id: `si${iid++}`, type: 'info', message: `Pazar çok dağınık (HHI: ${hhiResult.hhi.toFixed(0)}). İlk 3 ülke payı: %${hhiResult.top3Share.toFixed(1)}`, severity: 'low', category: 'PAZAR YAPISI' });
      } else if (hhiResult.hhi > 1500) {
        insArr.push({ id: `si${iid++}`, type: 'warning', message: `Yüksek konsantrasyon (HHI: ${hhiResult.hhi.toFixed(0)}). Lider ülke tek başına %${hhiResult.top1Share.toFixed(1)} paza kontrol ediyor.`, severity: 'high', category: 'PAZAR YAPISI' });
      }
      // Risk count
      const collapseCount = risks.filter(r => r.type === 'collapse').length;
      if (collapseCount > 0) {
        insArr.push({ id: `si${iid}`, type: 'warning', message: `🚨 ${collapseCount} ülke-tür kombinasyonunda populasyon çöküşü tespit edildi (10 yılda >%50 düşüş).`, severity: 'high', category: 'RİSK' });
      }
      setStocksInsights(insArr);
    } catch (error) {
      console.error('Stocks data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedItems, selectedYear]);

  // Load primary products data
  // Load primary data - Sprint 4 Intelligence
  const loadPrimaryData = useCallback(async () => {
    setLoading(true);
    try {
      const EXCLUDED = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
      const yr = parseInt(selectedYear);
      let itemFilter = '';
      if (activePrimaryTab === 'meat') {
        itemFilter = "(urunad LIKE '%Meat%' OR urunad LIKE '%meat%' OR urunad LIKE '%offal%' OR urunad LIKE '%Offal%' OR urunad LIKE '%fat%' OR urunad LIKE '%Fat%')";
      } else if (activePrimaryTab === 'milk') {
        itemFilter = "(urunad LIKE '%Milk%' OR urunad LIKE '%milk%')";
      } else if (activePrimaryTab === 'eggs') {
        itemFilter = "(urunad LIKE '%Egg%' OR urunad LIKE '%egg%')";
      } else {
        itemFilter = "(urunad NOT LIKE '%Meat%' AND urunad NOT LIKE '%meat%' AND urunad NOT LIKE '%Milk%' AND urunad NOT LIKE '%milk%' AND urunad NOT LIKE '%Egg%' AND urunad NOT LIKE '%egg%' AND urunad NOT LIKE '%Cheese%' AND urunad NOT LIKE '%Butter%')";
      }
      const W = `AND ${itemFilter}`;

      const [productRes, countryAllRes, yearlyRes, productCAGRRes, countryCAGRRes, turkeyProdRes] = await Promise.all([
        // Q1: products current year
        fetchQuery(`SELECT urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE year='${selectedYear}' AND uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY urunad ORDER BY toplam DESC LIMIT 15`),
        // Q2: ALL countries (for HHI + rank)
        fetchQuery(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE year='${selectedYear}' AND uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY ulkead ORDER BY toplam DESC`),
        // Q3: yearly totals
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} GROUP BY year ORDER BY year`),
        // Q4: product CAGR (current + 5y ago)
        fetchQuery(`SELECT urunad, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY urunad, year`),
        // Q5: country CAGR (current + 5y ago)
        fetchQuery(`SELECT ulkead, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead NOT IN ${EXCLUDED} AND year IN ('${yr}','${yr-5}') GROUP BY ulkead, year`),
        // Q6: Turkey per product + rank
        fetchQuery(`SELECT urunad, year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as toplam FROM fao_uretim_hayvansal_birincil WHERE uretim_birim='t' ${W} AND ulkead='Türkiye' AND year IN ('${yr}','${yr-5}') GROUP BY urunad, year`)
      ]);

      // --- Q1 products ---
      if (productRes.data) {
        setPrimaryData(productRes.data.map((item: Record<string, string | number>, index: number) => ({
          name: String(item.urunad || ''), value: Number(item.toplam) || 0, fill: COLORS[index % COLORS.length]
        })));
      }

      // --- Q2 countries --- 
      const allCountries = (countryAllRes.data || []).map((item: Record<string, string | number>) => ({
        area: String(item.ulkead || ''), name: translateCountry(String(item.ulkead || '')), value: Number(item.toplam) || 0
      }));
      const globalTotal = allCountries.reduce((s: number, c: {value: number}) => s + c.value, 0);
      const top20 = allCountries.slice(0, 20).map((c: {area: string; name: string; value: number}, i: number) => ({
        ...c, share: ((c.value / globalTotal) * 100).toFixed(1), fill: COLORS[i % COLORS.length]
      }));
      setPrimaryCountryData(top20);

      // --- Q3 yearly ---
      const yearlyArr = (yearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year || ''), value: Number(d.toplam) || 0
      }));
      setPrimaryYearlyData(yearlyArr.slice(-20));

      // Global CAGR
      const curYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr));
      const pastYearVal = yearlyArr.find((d: {year: string}) => d.year === String(yr - 5));
      const globalCAGR5 = curYearVal && pastYearVal && pastYearVal.value > 0
        ? (Math.pow(curYearVal.value / pastYearVal.value, 1 / 5) - 1) * 100 : 0;

      // --- Q4 product CAGR + lifecycle ---
      const prodMap = new Map<string, {cur: number; old: number}>();
      (productCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const p = String(d.urunad);
        if (!prodMap.has(p)) prodMap.set(p, {cur: 0, old: 0});
        const e = prodMap.get(p)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const prodCAGRArr = Array.from(prodMap.entries())
        .filter(([, v]) => v.cur > 0)
        .map(([product, v]) => {
          const cagr5 = v.old > 0 ? (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100 : 0;
          const share = (v.cur / globalTotal) * 100;
          const lifecycle: 'emerging' | 'growth' | 'mature' | 'declining' =
            cagr5 > 5 && share < 5 ? 'emerging' : cagr5 > 2 ? 'growth' : cagr5 >= -1 ? 'mature' : 'declining';
          return { product, current: v.cur, cagr5, share, lifecycle };
        })
        .sort((a, b) => b.current - a.current);
      setPrimaryProductCAGR(prodCAGRArr);

      // --- Q5 country CAGR ---
      const cntMap = new Map<string, {cur: number; old: number}>();
      (countryCAGRRes.data || []).forEach((d: Record<string, string | number>) => {
        const c = String(d.ulkead);
        if (!cntMap.has(c)) cntMap.set(c, {cur: 0, old: 0});
        const e = cntMap.get(c)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const cntCAGRArr = Array.from(cntMap.entries())
        .filter(([, v]) => v.cur > 0 && v.old > 0)
        .map(([country, v]) => ({
          country: translateCountry(country),
          total: v.cur,
          cagr5: (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100,
          share: (v.cur / globalTotal) * 100
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 30);
      setPrimaryCountryCAGR(cntCAGRArr);

      // Turkey rank + CAGR
      const trIdx = allCountries.findIndex((c: {area: string}) => c.area === 'Türkiye');
      const trTotal = trIdx >= 0 ? allCountries[trIdx].value : 0;
      const trCAGREntry = cntMap.get('Türkiye');
      const turkeyCAGR5 = trCAGREntry && trCAGREntry.old > 0
        ? (Math.pow(trCAGREntry.cur / trCAGREntry.old, 1 / 5) - 1) * 100 : 0;

      // --- Q6 Turkey products ---
      const trProdMap = new Map<string, {cur: number; old: number}>();
      (turkeyProdRes.data || []).forEach((d: Record<string, string | number>) => {
        const p = String(d.urunad);
        if (!trProdMap.has(p)) trProdMap.set(p, {cur: 0, old: 0});
        const e = trProdMap.get(p)!;
        if (String(d.year) === String(yr)) e.cur = Number(d.toplam) || 0; else e.old = Number(d.toplam) || 0;
      });
      const trProducts = Array.from(trProdMap.entries())
        .filter(([, v]) => v.cur > 0)
        .map(([product, v]) => {
          const cagr5 = v.old > 0 ? (Math.pow(v.cur / v.old, 1 / 5) - 1) * 100 : 0;
          return { product, production: v.cur, rank: 0, cagr5 };
        })
        .sort((a, b) => b.production - a.production);
      setPrimaryTurkeyProducts(trProducts);

      // --- KPIs ---
      setPrimaryKPIs({
        totalProduction: globalTotal,
        productCount: (productRes.data || []).length,
        countryCount: allCountries.length,
        turkeyRank: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: trTotal,
        turkeyShare: globalTotal > 0 ? (trTotal / globalTotal) * 100 : 0,
        globalCAGR5,
        turkeyCAGR5,
        leader: allCountries[0]?.name || '-',
        leaderShare: globalTotal > 0 ? (allCountries[0]?.value / globalTotal) * 100 : 0
      });

      // --- Insights ---
      const ins: Insight[] = [];
      let iid = 1;
      // Global trend
      ins.push({ id: `pi${iid++}`, type: globalCAGR5 > 0 ? 'growth' : 'decline',
        message: `Küresel ${activePrimaryTab === 'meat' ? 'et' : activePrimaryTab === 'milk' ? 'süt' : activePrimaryTab === 'eggs' ? 'yumurta' : ''} üretimi ${globalCAGR5 > 0 ? 'büyüyor' : 'azalıyor'}: 5Y BBO %${globalCAGR5.toFixed(1)}. Toplam: ${formatNumber(globalTotal)} ton.`,
        severity: 'medium', category: 'TREND' });
      // Turkey
      if (trIdx >= 0) {
        ins.push({ id: `pi${iid++}`, type: turkeyCAGR5 > globalCAGR5 ? 'achievement' : 'warning',
          message: `Türkiye dünya #${trIdx + 1} (${formatNumber(trTotal)} ton, pay %${((trTotal / globalTotal) * 100).toFixed(1)}). 5Y BBO %${turkeyCAGR5.toFixed(1)} ${turkeyCAGR5 > globalCAGR5 ? '- küreselden hızlı!' : '- küreselden yavaş.'}`,
          severity: turkeyCAGR5 < 0 ? 'high' : 'medium', category: 'TÜRKİYE' });
      }
      // Emerging products
      const emerging = prodCAGRArr.filter(p => p.lifecycle === 'emerging');
      if (emerging.length > 0) {
        ins.push({ id: `pi${iid++}`, type: 'growth', message: `🌱 ${emerging.length} yükselen ürün tespit edildi: ${emerging.slice(0, 3).map(e => `${translateProduct(e.product)} (BBO %${e.cagr5.toFixed(1)})`).join(', ')}`, severity: 'medium', category: 'FIRSAT' });
      }
      // Declining products
      const declining = prodCAGRArr.filter(p => p.lifecycle === 'declining');
      if (declining.length > 0) {
        ins.push({ id: `pi${iid++}`, type: 'decline', message: `📉 ${declining.length} üründ düşüş trendi: ${declining.slice(0, 3).map(d => `${translateProduct(d.product)} (BBO %${d.cagr5.toFixed(1)})`).join(', ')}`, severity: 'high', category: 'RİSK' });
      }
      // Leader
      ins.push({ id: `pi${iid}`, type: 'info', message: `Pazar lideri: ${allCountries[0]?.name || '-'} (%${(allCountries[0]?.value / globalTotal * 100).toFixed(1)} pay). Top 3 ülke toplam %${(allCountries.slice(0, 3).reduce((s: number, c: {value: number}) => s + c.value, 0) / globalTotal * 100).toFixed(1)} kontrol ediyor.`, severity: 'low', category: 'PAZAR' });
      setPrimaryInsights(ins);

    } catch (error) {
      console.error('Primary data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, activePrimaryTab]);

  // Load efficiency data (F1.3) - Sprint 6 Intelligence
  const loadEfficiencyData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
      const yr = parseInt(selectedYear);

      // Q1: Country-level efficiency for current year
      const q1 = `
        SELECT stocks.ulkead,
          SUM(CASE WHEN stocks.urunad IN ('Cattle','Sığır') THEN stocks.miktar_deger ELSE 0 END) as cattle_stock,
          SUM(CASE WHEN stocks.urunad IN ('Chickens','Tavuk') THEN stocks.miktar_deger ELSE 0 END) as chicken_stock,
          SUM(CASE WHEN prod.urunad LIKE '%Meat%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as meat_prod,
          SUM(CASE WHEN prod.urunad LIKE '%Milk%' AND prod.urunad NOT LIKE '%powder%' AND prod.urunad NOT LIKE '%Powder%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as milk_prod,
          SUM(CASE WHEN prod.urunad LIKE '%Egg%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as egg_prod
        FROM fao_uretim_hayvansal_canlihayvan stocks
        LEFT JOIN fao_uretim_hayvansal_birincil prod ON stocks.ulkead=prod.ulkead AND stocks.year=prod.year
        WHERE stocks.year='${yr}' AND stocks.ulkead NOT IN ${excludedAreas} AND prod.uretim_birim='t'
        GROUP BY stocks.ulkead HAVING cattle_stock>0 OR chicken_stock>0`;

      // Q2: 15-year trends (per-country per-year for Turkey line + world avg)
      const q2 = `
        SELECT stocks.ulkead, stocks.year,
          SUM(CASE WHEN stocks.urunad IN ('Cattle','Sığır') THEN stocks.miktar_deger ELSE 0 END) as cattle_stock,
          SUM(CASE WHEN stocks.urunad IN ('Chickens','Tavuk') THEN stocks.miktar_deger ELSE 0 END) as chicken_stock,
          SUM(CASE WHEN prod.urunad LIKE '%Meat%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as meat_prod,
          SUM(CASE WHEN prod.urunad LIKE '%Milk%' AND prod.urunad NOT LIKE '%powder%' AND prod.urunad NOT LIKE '%Powder%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as milk_prod,
          SUM(CASE WHEN prod.urunad LIKE '%Egg%' THEN CAST(prod.uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as egg_prod
        FROM fao_uretim_hayvansal_canlihayvan stocks
        LEFT JOIN fao_uretim_hayvansal_birincil prod ON stocks.ulkead=prod.ulkead AND stocks.year=prod.year
        WHERE stocks.year>=${yr - 14} AND stocks.ulkead NOT IN ${excludedAreas} AND prod.uretim_birim='t'
        GROUP BY stocks.ulkead, stocks.year ORDER BY stocks.year`;

      // Q3: Total production volume per country (for scatter bubble size)
      const q3 = `
        SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_prod
        FROM fao_uretim_hayvansal_birincil
        WHERE year='${yr}' AND ulkead NOT IN ${excludedAreas} AND uretim_birim='t'
        GROUP BY ulkead ORDER BY total_prod DESC`;

      const [r1, r2, r3] = await Promise.all([fetchQuery(q1), fetchQuery(q2), fetchQuery(q3)]);

      // --- Process country efficiency data ---
      type R = Record<string, string | number>;
      const calcEff = (row: R) => {
        const cs = Number(row.cattle_stock) || 0;
        const chs = Number(row.chicken_stock) || 0;
        const mp = Number(row.meat_prod) || 0;
        const mlp = Number(row.milk_prod) || 0;
        const ep = Number(row.egg_prod) || 0;
        return {
          meatEff: cs > 0 ? (mp * 1000) / cs : 0,
          milkEff: cs > 0 ? (mlp * 1000) / cs : 0,
          eggEff: chs > 0 ? (ep * 1000000) / chs : 0,
        };
      };

      const allCountries = (r1.data || []).map((row: R) => {
        const name = translateCountry(String(row.ulkead || ''));
        const eff = calcEff(row);
        return { country: name, raw: String(row.ulkead || ''), ...eff };
      }).filter(d => d.meatEff > 0 || d.milkEff > 0 || d.eggEff > 0);

      setEfficiencyData(allCountries.map(d => ({
        country: d.country,
        meatEfficiency: d.meatEff || null,
        milkEfficiency: d.milkEff || null,
        eggEfficiency: d.eggEff || null,
      })));

      // --- Turkey data ---
      const turkey = allCountries.find(d => d.raw === 'Türkiye') || { country: 'Türkiye', meatEff: 0, milkEff: 0, eggEff: 0 };

      // Rankings
      const meatSorted = [...allCountries].filter(d => d.meatEff > 0).sort((a, b) => b.meatEff - a.meatEff);
      const milkSorted = [...allCountries].filter(d => d.milkEff > 0).sort((a, b) => b.milkEff - a.milkEff);
      const eggSorted = [...allCountries].filter(d => d.eggEff > 0).sort((a, b) => b.eggEff - a.eggEff);

      const trMeatRank = meatSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;
      const trMilkRank = milkSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;
      const trEggRank = eggSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;

      // World averages
      const avgMeat = allCountries.reduce((s, d) => s + d.meatEff, 0) / (allCountries.filter(d => d.meatEff > 0).length || 1);
      const avgMilk = allCountries.reduce((s, d) => s + d.milkEff, 0) / (allCountries.filter(d => d.milkEff > 0).length || 1);
      const avgEgg = allCountries.reduce((s, d) => s + d.eggEff, 0) / (allCountries.filter(d => d.eggEff > 0).length || 1);

      const leaderMeat = meatSorted[0] || { country: 'N/A', meatEff: 0 };
      const leaderMilk = milkSorted[0] || { country: 'N/A', milkEff: 0 };
      const leaderEgg = eggSorted[0] || { country: 'N/A', eggEff: 0 };

      setEffKPIs({
        countryCount: allCountries.length,
        trMeatEff: turkey.meatEff, trMilkEff: turkey.milkEff, trEggEff: turkey.eggEff,
        trMeatRank, trMilkRank, trEggRank,
        worldAvgMeat: avgMeat, worldAvgMilk: avgMilk, worldAvgEgg: avgEgg,
        leaderMeat: leaderMeat.country, leaderMilk: leaderMilk.country, leaderEgg: leaderEgg.country,
        leaderMeatVal: leaderMeat.meatEff, leaderMilkVal: leaderMilk.milkEff, leaderEggVal: leaderEgg.eggEff,
      });

      // --- Gap Analysis + Catch-Up Calculator ---
      // We need Turkey's efficiency CAGR to calculate catch-up
      const trendRows = (r2.data || []) as R[];
      const trTrendRows = trendRows.filter(r => String(r.ulkead) === 'Türkiye');
      const trByYear: Record<number, { meatEff: number; milkEff: number; eggEff: number }> = {};
      trTrendRows.forEach(row => {
        const y = Number(row.year);
        const e = calcEff(row);
        trByYear[y] = e;
      });
      const yearsArr = Object.keys(trByYear).map(Number).sort((a, b) => a - b);
      const firstY = yearsArr[0] || yr - 10;
      const lastY = yearsArr[yearsArr.length - 1] || yr;
      const nYrs = lastY - firstY || 1;
      const trFirst = trByYear[firstY] || { meatEff: 1, milkEff: 1, eggEff: 1 };
      const trLast = trByYear[lastY] || turkey;

      const cagr = (start: number, end: number, n: number) => {
        if (start <= 0 || end <= 0 || n <= 0) return 0;
        return (Math.pow(end / start, 1 / n) - 1) * 100;
      };

      const trMeatCAGR = cagr(trFirst.meatEff, trLast.meatEff, nYrs);
      const trMilkCAGR = cagr(trFirst.milkEff, trLast.milkEff, nYrs);
      const trEggCAGR = cagr(trFirst.eggEff, trLast.eggEff, nYrs);

      const catchUp = (trVal: number, leaderVal: number, trCAGR: number) => {
        if (trVal >= leaderVal || trCAGR <= 0) return null;
        // years = ln(leader/tr) / ln(1 + cagr/100)
        return Math.ceil(Math.log(leaderVal / trVal) / Math.log(1 + trCAGR / 100));
      };

      const gap: typeof effGapAnalysis = [
        {
          category: 'Et Verimi', icon: '🥩', unit: 'kg/hayvan',
          turkeyVal: turkey.meatEff, leaderVal: leaderMeat.meatEff, leaderCountry: leaderMeat.country,
          worldAvg: avgMeat, gapToLeader: leaderMeat.meatEff > 0 ? ((leaderMeat.meatEff - turkey.meatEff) / leaderMeat.meatEff * 100) : 0,
          gapToAvg: avgMeat > 0 ? ((turkey.meatEff - avgMeat) / avgMeat * 100) : 0,
          catchUpYears: catchUp(turkey.meatEff, leaderMeat.meatEff, trMeatCAGR),
          trend: trMeatCAGR > 2 ? 'improving' : trMeatCAGR > 0 ? 'stable' : 'declining',
        },
        {
          category: 'Süt Verimi', icon: '🥛', unit: 'kg/inek',
          turkeyVal: turkey.milkEff, leaderVal: leaderMilk.milkEff, leaderCountry: leaderMilk.country,
          worldAvg: avgMilk, gapToLeader: leaderMilk.milkEff > 0 ? ((leaderMilk.milkEff - turkey.milkEff) / leaderMilk.milkEff * 100) : 0,
          gapToAvg: avgMilk > 0 ? ((turkey.milkEff - avgMilk) / avgMilk * 100) : 0,
          catchUpYears: catchUp(turkey.milkEff, leaderMilk.milkEff, trMilkCAGR),
          trend: trMilkCAGR > 2 ? 'improving' : trMilkCAGR > 0 ? 'stable' : 'declining',
        },
        {
          category: 'Yumurta Verimi', icon: '🥚', unit: 'adet/tavuk',
          turkeyVal: turkey.eggEff, leaderVal: leaderEgg.eggEff, leaderCountry: leaderEgg.country,
          worldAvg: avgEgg, gapToLeader: leaderEgg.eggEff > 0 ? ((leaderEgg.eggEff - turkey.eggEff) / leaderEgg.eggEff * 100) : 0,
          gapToAvg: avgEgg > 0 ? ((turkey.eggEff - avgEgg) / avgEgg * 100) : 0,
          catchUpYears: catchUp(turkey.eggEff, leaderEgg.eggEff, trEggCAGR),
          trend: trEggCAGR > 2 ? 'improving' : trEggCAGR > 0 ? 'stable' : 'declining',
        },
      ];
      setEffGapAnalysis(gap);

      // --- Scatter data (efficiency vs production volume) ---
      const prodMap: Record<string, number> = {};
      (r3.data || []).forEach((row: R) => {
        prodMap[String(row.ulkead)] = Number(row.total_prod) || 0;
      });
      const scatter = allCountries.map(d => ({
        country: d.country, meatEff: d.meatEff, milkEff: d.milkEff, eggEff: d.eggEff,
        totalProd: prodMap[d.raw] || 0, isTurkey: d.raw === 'Türkiye',
      })).filter(d => d.totalProd > 0).sort((a, b) => b.totalProd - a.totalProd).slice(0, 50);
      setEffScatterData(scatter);

      // --- Best Practices (top 5 avg efficiency countries) ---
      const developed = ['United States of America','Germany','France','Netherlands','Denmark','United Kingdom of Great Britain and Northern Ireland','Japan','Australia','Canada','New Zealand','Israel','Switzerland','Austria','Belgium','Sweden','Norway','Finland','Ireland','Italy','Spain'];
      const best = allCountries.map(d => {
        const avg = ((d.meatEff > 0 ? d.meatEff : 0) + (d.milkEff > 0 ? d.milkEff : 0) + (d.eggEff > 0 ? d.eggEff / 100 : 0)) / 3;
        const seg = developed.includes(d.raw) ? 'Gelişmiş' : d.raw === 'Türkiye' ? 'Türkiye' : 'Gelişmekte';
        return { country: d.country, meatEff: d.meatEff, milkEff: d.milkEff, eggEff: d.eggEff, avgEff: avg, segment: seg };
      }).sort((a, b) => b.avgEff - a.avgEff);
      setEffBestPractices(best);

      // --- Trends with Turkey line ---
      // World yearly aggregation
      const worldByYear: Record<number, { cattle: number; chicken: number; meat: number; milk: number; egg: number }> = {};
      trendRows.forEach(row => {
        const y = Number(row.year);
        if (!worldByYear[y]) worldByYear[y] = { cattle: 0, chicken: 0, meat: 0, milk: 0, egg: 0 };
        worldByYear[y].cattle += Number(row.cattle_stock) || 0;
        worldByYear[y].chicken += Number(row.chicken_stock) || 0;
        worldByYear[y].meat += Number(row.meat_prod) || 0;
        worldByYear[y].milk += Number(row.milk_prod) || 0;
        worldByYear[y].egg += Number(row.egg_prod) || 0;
      });
      const trends = Object.entries(worldByYear).map(([y, d]) => {
        const trY = trByYear[Number(y)];
        return {
          year: Number(y),
          avgMeatEfficiency: d.cattle > 0 ? (d.meat * 1000) / d.cattle : 0,
          avgMilkEfficiency: d.cattle > 0 ? (d.milk * 1000) / d.cattle : 0,
          avgEggEfficiency: d.chicken > 0 ? (d.egg * 1000000) / d.chicken : 0,
          trMeatEfficiency: trY ? trY.meatEff : undefined,
          trMilkEfficiency: trY ? trY.milkEff : undefined,
          trEggEfficiency: trY ? trY.eggEff : undefined,
        };
      }).sort((a, b) => a.year - b.year);
      setEfficiencyTrends(trends);

      // --- Auto Insights ---
      const ins: Insight[] = [];
      // Turkey vs world avg
      if (turkey.meatEff > avgMeat) ins.push({ id: 'eff-1', type: 'achievement', message: `Türkiye et verimi (${turkey.meatEff.toFixed(0)} kg/hayvan) dünya ortalamasının (${avgMeat.toFixed(0)}) %${((turkey.meatEff - avgMeat) / avgMeat * 100).toFixed(0)} üzerinde`, severity: 'medium' });
      else ins.push({ id: 'eff-1', type: 'warning', message: `Türkiye et verimi (${turkey.meatEff.toFixed(0)} kg/hayvan) dünya ortalamasının (${avgMeat.toFixed(0)}) %${Math.abs((turkey.meatEff - avgMeat) / avgMeat * 100).toFixed(0)} altında`, severity: 'high' });

      if (turkey.milkEff > avgMilk) ins.push({ id: 'eff-2', type: 'achievement', message: `Türkiye süt verimi (${turkey.milkEff.toFixed(0)} kg/inek) dünya ortalamasını (${avgMilk.toFixed(0)}) geçiyor`, severity: 'medium' });
      else ins.push({ id: 'eff-2', type: 'decline', message: `Türkiye süt verimi (${turkey.milkEff.toFixed(0)} kg/inek) dünya ortalamasının (${avgMilk.toFixed(0)}) altında`, severity: 'high' });

      if (turkey.eggEff > avgEgg) ins.push({ id: 'eff-3', type: 'achievement', message: `Türkiye yumurta verimi (${turkey.eggEff.toFixed(0)} adet/tavuk) dünya ortalamasının üzerinde`, severity: 'low' });
      else ins.push({ id: 'eff-3', type: 'warning', message: `Türkiye yumurta verimi (${turkey.eggEff.toFixed(0)} adet/tavuk) dünya ortalamasının (${avgEgg.toFixed(0)}) altında`, severity: 'medium' });

      // CAGR insights
      if (trMeatCAGR > 3) ins.push({ id: 'eff-4', type: 'growth', message: `Türkiye et verimi yıllık %${trMeatCAGR.toFixed(1)} büyüyor — hızlı iyileşme trendi`, severity: 'low' });
      if (trMilkCAGR > 3) ins.push({ id: 'eff-5', type: 'growth', message: `Türkiye süt verimi yıllık %${trMilkCAGR.toFixed(1)} büyüyor — modern hayvancılık etkisi`, severity: 'low' });

      // Gap insights
      gap.forEach((g, i) => {
        if (g.catchUpYears && g.catchUpYears < 15) {
          ins.push({ id: `eff-gap-${i}`, type: 'info', message: `${g.category}: Mevcut büyüme hızıyla ${g.leaderCountry}'yi ${g.catchUpYears} yılda yakalama potansiyeli`, severity: 'medium' });
        } else if (g.catchUpYears && g.catchUpYears > 50) {
          ins.push({ id: `eff-gap-${i}`, type: 'decline', message: `${g.category}: ${g.leaderCountry} ile arayı kapatmak mevcut hızla ${g.catchUpYears}+ yıl sürer — yapısal reform gerekli`, severity: 'high' });
        }
      });

      // Best practice country insight
      if (best.length > 0) {
        ins.push({ id: 'eff-best', type: 'info', message: `En verimli ülke: ${best[0].country} — ortalama verimlilik skoru ${best[0].avgEff.toFixed(0)}`, severity: 'low' });
      }

      setEffInsights(ins);

    } catch (error) {
      console.error('Efficiency data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Load predictions data (F1.2) - Prophet-Based Intelligence
  const loadPredictionsData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
      const currentYear = parseInt(selectedYear);

      // Fetch Prophet results + historical data in parallel
      const [prophetRes, histRes, globalYearlyRes] = await Promise.all([
        fetchQuery(`SELECT urunad, ulkead, tahmin_yil, tahmin_deger, alt_sinir, ust_sinir, trend, r2_cv, mae_cv, mape_cv FROM fao_tahmin_sonuclari WHERE veri_tipi = 'birincil' ORDER BY ulkead, urunad, tahmin_yil`),
        fetchQuery(`SELECT year, ulkead, urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year >= ${currentYear - 14} AND year <= ${currentYear} AND uretim_birim='t' AND ulkead NOT IN ${excludedAreas} AND (urunad LIKE '%Meat%' OR urunad LIKE '%Milk%' OR urunad LIKE '%Egg%') GROUP BY year, ulkead, urunad HAVING total > 10000 ORDER BY year, total DESC`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total FROM fao_uretim_hayvansal_birincil WHERE year >= ${currentYear - 14} AND year <= ${currentYear} AND uretim_birim='t' AND ulkead NOT IN ${excludedAreas} AND (urunad LIKE '%Meat%' OR urunad LIKE '%Milk%' OR urunad LIKE '%Egg%') GROUP BY year ORDER BY year`)
      ]);

      const prophetData = prophetRes.data || [];
      const hasProphet = prophetData.length > 0;

      // Build historical grouped data (needed for anomaly detection + CAGR)
      const grouped = new Map<string, YearValue[]>();
      (histRes.data || []).forEach((item: Record<string, string | number>) => {
        const country = String(item.ulkead || '');
        const product = String(item.urunad || '');
        const key = `${country}|||${product}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push({ year: String(item.year), value: Number(item.total) || 0 });
      });

      // Anomaly detection + CAGR risk alerts (always client-side on historical)
      const anomalies: Array<{ country: string; product: string; year: string; type: string; zScore: number }> = [];
      const risks: Array<{ country: string; product: string; decline: number }> = [];
      grouped.forEach((values, key) => {
        const [country, product] = key.split('|||');
        if (values.length < 10) return;
        values.sort((a, b) => parseInt(a.year) - parseInt(b.year));

        const detected = detectAnomalies(values, 2.5);
        detected.forEach(a => {
          if (a.isAnomaly) anomalies.push({ country: translateCountry(country), product, year: a.year, type: a.type, zScore: a.zScore });
        });

        const cagrResult = calculateCAGR(values);
        if (cagrResult && cagrResult.cagr < -5) {
          risks.push({ country: translateCountry(country), product, decline: cagrResult.cagr });
        }
      });

      let forecasts: Array<{ country: string; rawCountry: string; product: string; forecast: Array<{year: number; value: number}>; trend: string; r2: number; historical: YearValue[]; upperBounds: number[]; lowerBounds: number[] }> = [];

      if (hasProphet) {
        // ═══ Prophet-based forecasts ═══
        const prophetGrouped = new Map<string, { forecasts: Array<{year: number; value: number; lower: number; upper: number}>; trend: string; r2: number }>();
        prophetData.forEach((row: Record<string, string | number>) => {
          const key = `${row.ulkead}|||${row.urunad}`;
          if (!prophetGrouped.has(key)) {
            prophetGrouped.set(key, {
              forecasts: [],
              trend: String(row.trend || 'STABLE'),
              r2: Number(row.r2_cv) || 0,
            });
          }
          prophetGrouped.get(key)!.forecasts.push({
            year: Number(row.tahmin_yil),
            value: Number(row.tahmin_deger),
            lower: Number(row.alt_sinir),
            upper: Number(row.ust_sinir),
          });
        });

        prophetGrouped.forEach((data, key) => {
          const [country, product] = key.split('|||');
          const historical = grouped.get(key) || [];
          forecasts.push({
            country: translateCountry(country), rawCountry: country, product,
            forecast: data.forecasts.map(f => ({ year: f.year, value: f.value })),
            trend: data.trend, r2: data.r2,
            historical, upperBounds: data.forecasts.map(f => f.upper), lowerBounds: data.forecasts.map(f => f.lower),
          });
        });
      } else {
        // ═══ Fallback: linear regression (Prophet henüz çalıştırılmadıysa) ═══
        grouped.forEach((values, key) => {
          const [country, product] = key.split('|||');
          if (values.length < 10) return;
          values.sort((a, b) => parseInt(a.year) - parseInt(b.year));

          const forecastResult = forecastLinear(values, 3);
          const vals = values.map(v => v.value);
          const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
          const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);

          forecasts.push({
            country: translateCountry(country), rawCountry: country, product,
            forecast: forecastResult.forecast.map(f => ({ year: parseInt(f.year), value: f.value })),
            trend: forecastResult.trend, r2: forecastResult.r2,
            historical: values,
            upperBounds: forecastResult.forecast.map(f => f.value + stdDev),
            lowerBounds: forecastResult.forecast.map(f => Math.max(0, f.value - stdDev)),
          });
        });
      }

      forecasts.sort((a, b) => b.r2 - a.r2);
      setPredictionsData(forecasts.slice(0, 50));
      setAnomalyAlerts(anomalies.slice(0, 20));
      setRiskAlerts(risks.sort((a, b) => a.decline - b.decline).slice(0, 15));

      // --- Global forecast chart with confidence bands ---
      const globalYearly = (globalYearlyRes.data || []).map((d: Record<string, string | number>) => ({
        year: String(d.year), value: Number(d.total) || 0
      }));
      const chartData: Array<{year: string; actual?: number; forecast?: number; upper?: number; lower?: number}> = [];
      globalYearly.forEach((d: {year: string; value: number}) => {
        chartData.push({ year: d.year, actual: d.value });
      });

      if (hasProphet && forecasts.length > 0) {
        // Aggregate Prophet forecasts per year for global chart
        const yearTotals = new Map<number, {sum: number; lower: number; upper: number}>();
        forecasts.forEach(f => {
          f.forecast.forEach((fc, idx) => {
            if (!yearTotals.has(fc.year)) yearTotals.set(fc.year, {sum: 0, lower: 0, upper: 0});
            const yt = yearTotals.get(fc.year)!;
            yt.sum += fc.value;
            yt.lower += f.lowerBounds[idx] ?? fc.value;
            yt.upper += f.upperBounds[idx] ?? fc.value;
          });
        });
        Array.from(yearTotals.entries()).sort((a, b) => a[0] - b[0]).forEach(([year, v]) => {
          chartData.push({ year: String(year), forecast: v.sum, upper: v.upper, lower: Math.max(0, v.lower) });
        });
      } else {
        // Fallback: linear on global aggregates
        const globalForecast = forecastLinear(globalYearly, 3);
        const gVals = globalYearly.map((d: {value: number}) => d.value);
        const gMean = gVals.reduce((s: number, v: number) => s + v, 0) / (gVals.length || 1);
        const gStd = Math.sqrt(gVals.reduce((s: number, v: number) => s + (v - gMean) ** 2, 0) / (gVals.length || 1));
        globalForecast.forecast.forEach((f) => {
          chartData.push({ year: f.year, forecast: f.value, upper: f.value + gStd, lower: Math.max(0, f.value - gStd) });
        });
      }
      setPredForecastChart(chartData);

      // --- Turkey-specific forecasts ---
      const turkeyForecasts = forecasts
        .filter(f => f.rawCountry === 'Türkiye')
        .map(f => {
          const lastVal = f.historical[f.historical.length - 1]?.value || 0;
          const fc2027 = f.forecast[f.forecast.length - 1]?.value || 0;
          return {
            product: f.product,
            current: lastVal,
            forecast2027: fc2027,
            changePercent: lastVal > 0 ? ((fc2027 - lastVal) / lastVal) * 100 : 0,
            r2: f.r2,
            trend: f.trend
          };
        })
        .sort((a, b) => b.current - a.current);
      setPredTurkeyForecasts(turkeyForecasts);

      // --- R² vs Growth Scatter ---
      const r2GrowthData = forecasts.slice(0, 40).map(f => {
        const lastVal = f.historical[f.historical.length - 1]?.value || 0;
        const firstVal = f.historical[0]?.value || 0;
        const growth = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
        return { country: f.country, product: f.product, r2: f.r2, growth, volume: lastVal };
      });
      setPredR2GrowthScatter(r2GrowthData);

      // --- Anomaly Timeline ---
      const tlMap = new Map<string, {spikes: number; drops: number}>();
      anomalies.forEach(a => {
        if (!tlMap.has(a.year)) tlMap.set(a.year, {spikes: 0, drops: 0});
        const e = tlMap.get(a.year)!;
        if (a.type === 'SPIKE') e.spikes++; else e.drops++;
      });
      const timeline = Array.from(tlMap.entries())
        .map(([year, v]) => ({year, spikes: v.spikes, drops: v.drops, total: v.spikes + v.drops}))
        .sort((a, b) => a.year.localeCompare(b.year));
      setPredAnomalyTimeline(timeline);

      // --- KPIs ---
      const highConf = forecasts.filter(f => f.r2 > 0.8).length;
      const upTrend = forecasts.filter(f => f.trend.includes('UP') || f.trend === 'ACCELERATING').length;
      const downTrend = forecasts.filter(f => f.trend === 'DOWN' || f.trend === 'DECLINING').length;
      const avgR2 = forecasts.length > 0 ? forecasts.reduce((s, f) => s + f.r2, 0) / forecasts.length : 0;
      setPredKPIs({
        totalForecasts: forecasts.length,
        highConfidence: highConf,
        anomalyCount: anomalies.length,
        riskCount: risks.length,
        avgR2,
        upTrend,
        downTrend,
        turkeyForecasts: turkeyForecasts.length
      });

      // --- Insights ---
      const modelType = hasProphet ? 'Prophet' : 'Lineer Regresyon';
      const cvLabel = hasProphet ? 'Çapraz-doğrulama R²' : 'R²';
      const ins: Insight[] = [];
      let iid = 1;
      ins.push({ id: `pr${iid++}`, type: avgR2 > 0.7 ? 'achievement' : 'info',
        message: `${forecasts.length} ${modelType} tahmin modeli. Ortalama ${cvLabel}: ${avgR2.toFixed(3)}. ${highConf} model yüksek güvenilirlikte (>${hasProphet ? 'CV ' : ''}R²>0.8).`,
        severity: 'medium', category: 'MODEL' });
      ins.push({ id: `pr${iid++}`, type: upTrend > downTrend ? 'growth' : 'decline',
        message: `Trend dağılımı: ${upTrend} yükselen, ${downTrend} düşen, ${forecasts.length - upTrend - downTrend} stabil. ${upTrend > downTrend ? 'Genel görünüm pozitif.' : 'Dikkat: düşüş trendi baskın!'}`,
        severity: downTrend > upTrend ? 'high' : 'medium', category: 'TREND' });
      if (hasProphet) {
        ins.push({ id: `pr${iid++}`, type: 'achievement',
          message: `🧠 Prophet modeli aktif: Güven bantları %%80 CI, trend kırılma noktaları otomatik tespit, çapraz-doğrulama ile gerçek performans ölçümü.`,
          severity: 'low', category: 'MODEL' });
      }
      if (turkeyForecasts.length > 0) {
        const trGrowing = turkeyForecasts.filter(t => t.changePercent > 0);
        ins.push({ id: `pr${iid++}`, type: trGrowing.length > turkeyForecasts.length / 2 ? 'growth' : 'warning',
          message: `🇹🇷 Türkiye: ${turkeyForecasts.length} üründe tahmin. ${trGrowing.length} üründe büyüme bekleniyor.${trGrowing[0] ? ` En hızlı: ${translateProduct(trGrowing[0].product)} (+%${trGrowing[0].changePercent.toFixed(1)})` : ''}`,
          severity: 'medium', category: 'TÜRKİYE' });
      }
      if (risks.length > 0) {
        ins.push({ id: `pr${iid++}`, type: 'warning',
          message: `⚠️ ${risks.length} ülke-ürün kombinasyonunda kritik düşüş (CAGR<-5%). En şiddetli: ${risks[0].country} - ${translateProduct(risks[0].product)} (%${risks[0].decline.toFixed(1)})`,
          severity: 'high', category: 'RİSK' });
      }
      if (anomalies.length > 0) {
        ins.push({ id: `pr${iid}`, type: 'info',
          message: `🔍 ${anomalies.length} anomali tespit edildi (Z>2.5). ${anomalies.filter(a => a.type === 'SPIKE').length} ani artış, ${anomalies.filter(a => a.type === 'DROP').length} ani düşüş.`,
          severity: 'medium', category: 'ANOMALİ' });
      }
      setPredInsights(ins);
    } catch (error) {
      console.error('Predictions data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Load processed products data (Sprint 2)
  const EXCLUDED_AREAS = "('World','WORLD','Europe','Americas','Asia','Africa','Northern America','Southern America','Eastern Europe','Western Europe','Northern Europe','Southern Europe','Southern Asia','Eastern Asia','South-eastern Asia','Central Asia','Western Asia','Northern Africa','Eastern Africa','Western Africa','Middle Africa','Southern Africa','Caribbean','Central America','South America','Oceania','European Union (27)','European Union','Melanesia','Polynesia','Micronesia','Aggregate','Least Developed Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','Land Locked Developing Countries','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";

  const DAIRY_COND = "(urunad LIKE '%Cheese%' OR urunad LIKE '%Butter%' OR urunad LIKE '%milk%' OR urunad LIKE '%Milk%' OR urunad LIKE '%Yoghurt%' OR urunad LIKE '%Cream%' OR urunad LIKE '%Whey%' OR urunad LIKE '%Buttermilk%' OR urunad LIKE '%Ghee%')";
  const FATS_COND = "(urunad LIKE '%Tallow%' OR urunad LIKE '%fat%' OR urunad LIKE '%Fat%' OR urunad LIKE '%Lard%')";

  const loadProcessedData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      const pastYr = String(Math.min(parseInt(yr), 2023) - 5);
      const safeYear = String(Math.min(parseInt(yr), 2023));

      const [countryRes, turkeyTrendRes, productRes, pastProductRes, rawMilkRes] = await Promise.all([
        fetchQuery(`
          SELECT ulkead,
            SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total,
            SUM(CASE WHEN ${DAIRY_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as dairy,
            SUM(CASE WHEN ${FATS_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as fats,
            SUM(CASE WHEN NOT ${DAIRY_COND} AND NOT ${FATS_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as other
          FROM fao_uretim_hayvansal_islenmis
          WHERE year='${safeYear}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_AREAS}
          GROUP BY ulkead ORDER BY total DESC
        `),
        fetchQuery(`
          SELECT year,
            SUM(CASE WHEN ${DAIRY_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as dairy,
            SUM(CASE WHEN ${FATS_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as fats,
            SUM(CASE WHEN NOT ${DAIRY_COND} AND NOT ${FATS_COND} THEN CAST(uretim_deger AS DECIMAL(20,2)) ELSE 0 END) as other
          FROM fao_uretim_hayvansal_islenmis
          WHERE ulkead='Türkiye' AND uretim_birim='t'
          GROUP BY year ORDER BY year
        `),
        fetchQuery(`
          SELECT urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total
          FROM fao_uretim_hayvansal_islenmis
          WHERE year='${safeYear}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_AREAS}
          GROUP BY urunad ORDER BY total DESC
        `),
        fetchQuery(`
          SELECT urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total
          FROM fao_uretim_hayvansal_islenmis
          WHERE year='${pastYr}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_AREAS}
          GROUP BY urunad ORDER BY total DESC
        `),
        fetchQuery(`
          SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total
          FROM fao_uretim_hayvansal_birincil
          WHERE ulkead='Türkiye' AND year='${safeYear}' AND uretim_birim='t'
            AND (urunad LIKE '%milk%' OR urunad LIKE '%Milk%')
        `),
      ]);

      // Country rankings
      const countries = (countryRes.data || []).map(d => ({
        country: translateCountry(String(d.ulkead || '')),
        total: parseFloat(String(d.total || 0)),
        dairy: parseFloat(String(d.dairy || 0)),
        fats: parseFloat(String(d.fats || 0)),
        other: parseFloat(String(d.other || 0)),
      })).filter(c => c.total > 0);
      setProcessedCountryData(countries);

      // Turkey KPIs
      const trIdx = countries.findIndex(c =>
        c.country.includes('Türkiye') || c.country.toLowerCase().includes('turkey'));
      const tr = trIdx >= 0 ? countries[trIdx] : null;
      const worldTotal = countries.reduce((s, c) => s + c.total, 0);
      const rawMilk = parseFloat(String(rawMilkRes.data?.[0]?.total || 0));
      const processingRate = rawMilk > 0 && tr ? (tr.total / rawMilk) * 100 : 0;

      setProcessedKPIs({
        totalProduction: worldTotal,
        countryCount: countries.length,
        productCount: (productRes.data || []).length,
        turkeyRank: trIdx >= 0 ? trIdx + 1 : 0,
        turkeyTotal: tr?.total || 0,
        processingRate,
      });

      // Turkey trend
      const trend = (turkeyTrendRes.data || []).map(d => ({
        year: String(d.year),
        dairy: parseFloat(String(d.dairy || 0)),
        fats: parseFloat(String(d.fats || 0)),
        other: parseFloat(String(d.other || 0)),
      }));
      setProcessedTurkeyTrend(trend);

      // Product rankings with Turkey data
      const turkeyProducts = await fetchQuery(`
        SELECT urunad, CAST(uretim_deger AS DECIMAL(20,2)) as val
        FROM fao_uretim_hayvansal_islenmis
        WHERE ulkead='Türkiye' AND year='${safeYear}' AND uretim_birim='t'
      `);
      const trProdMap: Record<string, number> = {};
      (turkeyProducts.data || []).forEach(d => {
        trProdMap[String(d.urunad)] = parseFloat(String(d.val || 0));
      });

      // Top producer per product
      const topPerProduct = await fetchQuery(`
        SELECT urunad, ulkead, CAST(uretim_deger AS DECIMAL(20,2)) as val
        FROM fao_uretim_hayvansal_islenmis
        WHERE year='${safeYear}' AND uretim_birim='t' AND ulkead NOT IN ${EXCLUDED_AREAS}
        ORDER BY urunad, val DESC
      `);
      const topMap: Record<string, string> = {};
      (topPerProduct.data || []).forEach(d => {
        const pn = String(d.urunad);
        if (!topMap[pn]) topMap[pn] = translateCountry(String(d.ulkead || ''));
      });

      // Turkey ranks per product
      const trRankMap: Record<string, number> = {};
      const allByProduct: Record<string, Array<{ country: string; val: number }>> = {};
      (topPerProduct.data || []).forEach(d => {
        const pn = String(d.urunad);
        if (!allByProduct[pn]) allByProduct[pn] = [];
        allByProduct[pn].push({ country: String(d.ulkead), val: parseFloat(String(d.val || 0)) });
      });
      Object.entries(allByProduct).forEach(([pn, arr]) => {
        arr.sort((a, b) => b.val - a.val);
        const idx = arr.findIndex(a => a.country === 'Türkiye');
        trRankMap[pn] = idx >= 0 ? idx + 1 : 999;
      });

      const products = (productRes.data || []).map(d => ({
        product: String(d.urunad),
        total: parseFloat(String(d.total || 0)),
        turkeyVal: trProdMap[String(d.urunad)] || 0,
        turkeyRank: trRankMap[String(d.urunad)] || 0,
        topCountry: topMap[String(d.urunad)] || '',
      }));
      setProcessedProductData(products);

      // CAGR analysis
      const pastMap: Record<string, number> = {};
      (pastProductRes.data || []).forEach(d => {
        pastMap[String(d.urunad)] = parseFloat(String(d.total || 0));
      });
      const growths = products.map(p => {
        const past = pastMap[p.product] || 0;
        const cagr = past > 0 ? (Math.pow(p.total / past, 1 / 5) - 1) * 100 : 0;
        const lifecycle = cagr > 5 ? '🌱 Emerging' : cagr > 3 ? '🚀 Growth' : cagr > 0 ? '💎 Mature' : '📉 Declining';
        return { product: p.product, cagr, current: p.total, lifecycle };
      }).sort((a, b) => b.cagr - a.cagr);
      setProcessedGrowthData(growths);

      // Auto insights
      const pInsights: Insight[] = [];
      let iid = 0;
      if (tr && trIdx >= 0 && trIdx < 20) {
        pInsights.push({ id: `pi${iid++}`, type: 'achievement', severity: 'medium',
          message: `Türkiye işlenmiş hayvansal üretimde dünya #${trIdx + 1} – toplam ${formatNumber(tr.total)} ton`, category: 'SIRALAMA' });
      }
      if (processingRate > 0) {
        pInsights.push({ id: `pi${iid++}`, type: processingRate > 20 ? 'achievement' : 'warning', severity: 'medium',
          message: `Türkiye süt işleme oranı: %${processingRate.toFixed(1)} (ham süt → işlenmiş ürün dönüşümü)`, category: 'VERİMLİLİK' });
      }
      const trBestProd = products
        .filter(p => p.turkeyRank > 0 && p.turkeyRank <= 10)
        .sort((a, b) => a.turkeyRank - b.turkeyRank);
      if (trBestProd.length > 0) {
        pInsights.push({ id: `pi${iid++}`, type: 'achievement', severity: 'high',
          message: `Türkiye'nin en güçlü işlenmiş ürünü: ${translateProduct(trBestProd[0].product)} (Dünya #${trBestProd[0].turkeyRank})`, category: 'REKABET' });
      }
      const fastGrowing = growths.filter(g => g.cagr > 3 && g.current > 1e6);
      if (fastGrowing.length > 0) {
        pInsights.push({ id: `pi${iid++}`, type: 'growth', severity: 'medium',
          message: `En hızlı büyüyen: ${translateProduct(fastGrowing[0].product)} (%${fastGrowing[0].cagr.toFixed(1)} CAGR)`, category: 'BÜYÜME' });
      }
      const declining = growths.filter(g => g.cagr < -2 && g.current > 1e5);
      if (declining.length > 0) {
        pInsights.push({ id: `pi${iid}`, type: 'decline', severity: 'medium',
          message: `Dikkat: ${translateProduct(declining[0].product)} küresel olarak daralıyor (%${Math.abs(declining[0].cagr).toFixed(1)} yıllık)`, category: 'RİSK' });
      }
      setProcessedInsights(pInsights);

    } catch (error) {
      console.error('Processed data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'stocks') {
      loadStocksData();
    } else if (activeTab === 'primary') {
      loadPrimaryData();
    } else if (activeTab === 'efficiency') {
      loadEfficiencyData();
    } else if (activeTab === 'predictions') {
      loadPredictionsData();
    } else if (activeTab === 'processed') {
      loadProcessedData();
    }
  }, [activeTab, loadOverviewData, loadStocksData, loadPrimaryData, loadEfficiencyData, loadPredictionsData, loadProcessedData]);


  const renderTabButton = (tab: Tab, icon: string, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: activeTab === tab ? 'var(--primary)' : 'var(--bg-primary)',
        color: activeTab === tab ? 'white' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const renderPrimaryTabButton = (tab: PrimaryTab, icon: string, label: string) => (
    <button
      onClick={() => setActivePrimaryTab(tab)}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: activePrimaryTab === tab ? '#22c55e' : 'var(--bg-primary)',
        color: activePrimaryTab === tab ? 'white' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌍 Dünya Hayvansal Üretim</h1>
        <p className="page-subtitle">
          Canlı hayvan stokları, birincil ve işlenmiş ürün analizleri - FAO Veritabanı ({selectedYear})
        </p>
      </div>

      {/* Tab Navigation */}
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
        {renderTabButton('overview', '📊', 'Genel Bakış')}
        {renderTabButton('predictions', '🔮', 'Tahminler & Trendler')}
        {renderTabButton('efficiency', '⚡', 'Verimlilik Analizi')}
        {renderTabButton('stocks', '🐄', 'Canlı Hayvan Stokları')}
        {renderTabButton('primary', '🥩', 'Birincil Ürünler')}
        {renderTabButton('processed', '🏭', 'İşlenmiş Ürünler')}
      </div>

      {/* Year Filter */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              {/* Advanced Intelligence KPI Grid (F1.1) */}
              <div className="kpi-grid">
                <div className="kpi-card large">
                  <div className="kpi-header"><span className="kpi-title">TOPLAM CANLI HAYVAN STOKU</span></div>
                  <div className="kpi-value">{formatNumber(overviewKPIs.totalStocks)}</div>
                  <div className="kpi-subtitle">
                    {intelligenceMetrics && intelligenceMetrics.yoyGrowth !== null && (
                      <span style={{ 
                        color: intelligenceMetrics.yoyGrowth > 0 ? '#22c55e' : '#ef4444',
                        fontWeight: '600'
                      }}>
                        {intelligenceMetrics.yoyGrowth > 0 ? '▲' : '▼'} {Math.abs(intelligenceMetrics.yoyGrowth).toFixed(1)}% Yıllık Değişim
                      </span>
                    )}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">5-YIL BBO</span><div className="kpi-icon green">📊</div></div>
                  <div className="kpi-value" style={{ 
                    color: (intelligenceMetrics?.cagr5Year || 0) > 0 ? '#22c55e' : '#ef4444',
                    fontSize: '1.8rem'
                  }}>
                    {(intelligenceMetrics && intelligenceMetrics.cagr5Year !== null) ? `${intelligenceMetrics.cagr5Year.toFixed(2)}%` : 'N/A'}
                  </div>
                  <div className="kpi-subtitle">Yıllık Bileşik Büyüme</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">PAZAR KONSANTRASYONU</span><div className="kpi-icon orange">🎯</div></div>
                  <div className="kpi-value" style={{ 
                    color: (intelligenceMetrics?.marketHHI || 0) > 2500 ? '#ef4444' : (intelligenceMetrics?.marketHHI || 0) > 1500 ? '#f59e0b' : '#22c55e',
                    fontSize: '1.6rem'
                  }}>
                    {(intelligenceMetrics && intelligenceMetrics.marketHHI !== null) ? intelligenceMetrics.marketHHI.toFixed(0) : 'N/A'}
                  </div>
                  <div className="kpi-subtitle">
                    HHI {(intelligenceMetrics?.marketHHI || 0) > 2500 ? '(Yüksek)' : (intelligenceMetrics?.marketHHI || 0) > 1500 ? '(Orta)' : '(Düşük)'}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">VOLATİLİTE</span><div className="kpi-icon purple">📉</div></div>
                  <div className="kpi-value" style={{ 
                    color: (intelligenceMetrics?.volatility || 0) > 15 ? '#ef4444' : '#3b82f6',
                    fontSize: '1.8rem'
                  }}>
                    {(intelligenceMetrics && intelligenceMetrics.volatility !== null) ? `${intelligenceMetrics.volatility.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="kpi-subtitle">Üretim Dalgalanması (CV)</div>
                </div>
              </div>

              {/* Second row: Top Mover + Market Intelligence */}
              <div className="kpi-grid" style={{ marginTop: '20px' }}>
                <div className="kpi-card large">
                  <div className="kpi-header"><span className="kpi-title">EN HIZLI BÜYÜYEN ÜLKE</span><div className="kpi-icon green">🚀</div></div>
                  <div className="kpi-value" style={{ fontSize: '1.4rem', color: '#22c55e' }}>
                    {intelligenceMetrics?.topMoverCountry || '-'}
                  </div>
                  <div className="kpi-subtitle">
                    {(intelligenceMetrics && intelligenceMetrics.topMoverGrowth !== null) && `%${intelligenceMetrics.topMoverGrowth.toFixed(1)} CAGR`}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">ET ÜRETİMİ</span><div className="kpi-icon red">🥩</div></div>
                  <div className="kpi-value">{formatNumber(overviewKPIs.totalMeat)}</div>
                  <div className="kpi-subtitle">Ton</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">SÜT ÜRETİMİ</span><div className="kpi-icon blue">🥛</div></div>
                  <div className="kpi-value">{formatNumber(overviewKPIs.totalMilk)}</div>
                  <div className="kpi-subtitle">Ton</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">YUMURTA ÜRETİMİ</span><div className="kpi-icon yellow">🥚</div></div>
                  <div className="kpi-value">{formatNumber(overviewKPIs.totalEggs)}</div>
                  <div className="kpi-subtitle">Adet</div>
                </div>
              </div>

              {/* Auto-generated Insights (F4.2) */}
              {insights.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <InsightCard insights={[...insights, ...(execSummary?.crossInsights || [])]} maxDisplay={10} />
                </div>
              )}

              {/* Sprint 7: Executive Summary + Supply Chain + Cross-Tab Navigation */}
              {execSummary && (
                <div style={{ marginTop: 24 }}>
                  {/* Supply Chain Flow */}
                  <div className="chart-card" style={{ marginBottom: 24 }}>
                    <h3 className="chart-title">🔗 Tedarik Zinciri İstihbaratı — Birincil → İşlenmiş Akış</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 0' }}>
                      <div style={{ textAlign: 'center', padding: 20, background: 'rgba(34,197,94,0.08)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>🌾 Birincil Üretim</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{(execSummary.primaryTotal / 1e6).toFixed(0)}M</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ton</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 32 }}>→</div>
                          <div style={{
                            padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 18,
                            background: execSummary.supplyChainRatio < 20 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                            color: execSummary.supplyChainRatio < 20 ? '#ef4444' : '#22c55e',
                          }}>
                            %{execSummary.supplyChainRatio.toFixed(1)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>İşleme Oranı</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 20, background: 'rgba(139,92,246,0.08)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>🏭 İşlenmiş Üretim</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6' }}>{(execSummary.processedTotal / 1e6).toFixed(0)}M</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ton</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: 20, background: 'rgba(239,68,68,0.08)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>🇹🇷 TR Birincil Sırası</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>#{execSummary.turkeyPrimaryRank}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>dünyada</div>
                      </div>
                    </div>
                  </div>

                  {/* Cross-Tab Navigation */}
                  <div className="chart-card" style={{ marginBottom: 24 }}>
                    <h3 className="chart-title">🧭 Derin Analiz Sekmeleri — Intelligence Hub</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                      {[
                        { tab: 'stocks' as Tab, icon: '🐄', title: 'Canlı Hayvan Stokları', desc: '9 hayvan türü CAGR, risk analizi, Türkiye profili', color: '#ef4444' },
                        { tab: 'primary' as Tab, icon: '🥩', title: 'Birincil Üretim', desc: 'Ürün yaşam döngüsü, büyüme matrisi, ülke karşılaştırma', color: '#22c55e' },
                        { tab: 'efficiency' as Tab, icon: '⚡', title: 'Verimlilik Analizi', desc: 'TR gap analizi, catch-up hesabı, segmentasyon', color: '#3b82f6' },
                        { tab: 'predictions' as Tab, icon: '🔮', title: 'Tahmin & Öngörü', desc: 'Prophet modeli, %80 güven bantları, anomali tespiti', color: '#f59e0b' },
                        { tab: 'processed' as Tab, icon: '🏭', title: 'İşlenmiş Ürünler', desc: '25 işlenmiş ürün, Türkiye trendi, büyüme fırsatları', color: '#8b5cf6' },
                      ].map(item => (
                        <button key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                          padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)',
                          background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = item.color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>{item.icon}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</span>
                          <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>Analizi Aç →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="chart-grid" style={{ marginTop: '30px' }}>
                <div className="chart-card" style={{gridColumn: 'span 2'}}>
                  <h3 className="chart-title">📈 Dünya Toplam Canlı Hayvan Stoku Trendi (20 Yıl)</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']} 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Growth Quadrant Chart (F1.1) - CAGR vs Market Share */}
              {countryGrowthData.length > 0 && (
                <div className="chart-grid" style={{ marginTop: '20px' }}>
                  <div className="chart-card" style={{gridColumn: 'span 2'}}>
                    <h3 className="chart-title">🎯 Ülke Performansı: Büyüme vs Pazar Payı (Growth Quadrant)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          type="number" 
                          dataKey="marketShare" 
                          name="Pazar Payı" 
                          tickFormatter={(v) => formatShort(v)}
                          label={{ value: 'Pazar Payı (Absolute)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)' }}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="cagr" 
                          name="CAGR" 
                          tickFormatter={(v) => `${v.toFixed(1)}%`}
                          label={{ value: '5-Year CAGR (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        />
                        <ZAxis range={[60, 400]} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'CAGR') return [`${value.toFixed(2)}%`, name];
                            if (name === 'Pazar Payı') return [formatNumber(value), name];
                            return [value, name];
                          }}
                          labelFormatter={(label) => countryGrowthData.find((_c, i) => i === label)?.country || ''}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Scatter 
                          name="Ülkeler" 
                          data={countryGrowthData.slice(0, 30).map((c) => ({
                            country: c.country,
                            cagr: c.cagr,
                            marketShare: c.marketShare,
                            fill: c.cagr > 3 ? '#22c55e' : c.cagr > 0 ? '#3b82f6' : c.cagr > -3 ? '#f59e0b' : '#ef4444'
                          }))} 
                          fill="#8884d8"
                        >
                          {countryGrowthData.slice(0, 30).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cagr > 3 ? '#22c55e' : entry.cagr > 0 ? '#3b82f6' : entry.cagr > -3 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      justifyContent: 'center', 
                      marginTop: '12px',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                        Yüksek Büyüme (&gt;3%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                        Büyüme (0-3%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                        Düşük Düşüş (0 to -3%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                        Ciddi Düşüş (&lt;-3%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Türkiye İl Yoğunluk Haritası */}
              {provincialLivestock.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      🗺️ Türkiye İl Yoğunluk Haritası
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setLivestockMapType('total')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: livestockMapType === 'total' ? 'var(--primary)' : 'var(--bg-card)',
                          color: livestockMapType === 'total' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🐄 Toplam
                      </button>
                      <button
                        onClick={() => setLivestockMapType('cattle')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: livestockMapType === 'cattle' ? 'var(--primary)' : 'var(--bg-card)',
                          color: livestockMapType === 'cattle' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🐄 Sığır-Manda
                      </button>
                      <button
                        onClick={() => setLivestockMapType('sheep')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: livestockMapType === 'sheep' ? 'var(--primary)' : 'var(--bg-card)',
                          color: livestockMapType === 'sheep' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🐑 Koyun
                      </button>
                      <button
                        onClick={() => setLivestockMapType('goat')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: livestockMapType === 'goat' ? 'var(--primary)' : 'var(--bg-card)',
                          color: livestockMapType === 'goat' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🐐 Keçi
                      </button>
                    </div>
                  </div>
                  <div className="chart-card">
                    <h3 className="chart-title">
                      {livestockMapType === 'total' && 'Sığır + Manda + Koyun + Keçi (Toplam)'}
                      {livestockMapType === 'cattle' && 'Sığır ve Manda Sayısı'}
                      {livestockMapType === 'sheep' && 'Koyun Sayısı'}
                      {livestockMapType === 'goat' && 'Keçi Sayısı'}
                    </h3>
                    <TurkeyHeatMap 
                      regionTotals={provincialLivestock.map(d => ({
                        name: d.name,
                        value: livestockMapType === 'cattle' ? (d as unknown as Record<string, number>).cattle :
                               livestockMapType === 'sheep' ? (d as unknown as Record<string, number>).sheep :
                               livestockMapType === 'goat' ? (d as unknown as Record<string, number>).goat :
                               d.value,
                        unit: 'baş'
                      }))}
                      unitLabel="baş" 
                      height={420} 
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* STOCKS TAB - Sprint 3 Intelligence */}
          {activeTab === 'stocks' && (
            <>
              {/* Filter */}
              <div className="date-filter" style={{marginTop: '20px'}}>
                <div className="filter-group">
                  <label className="filter-label">Hayvan Türü</label>
                  <ProductSelector
                    products={ANIMAL_ITEMS}
                    selectedProducts={selectedItems}
                    onSelectionChange={setSelectedItems}
                    placeholder="Hayvan seçin..."
                  />
                </div>
              </div>

              {/* KPI Grid - 8 intelligence KPIs */}
              {stocksKPIs && (
                <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
                  <div className="kpi-card large">
                    <div className="kpi-header"><span className="kpi-title">KÜRESEL STOK</span></div>
                    <div className="kpi-value">{formatNumber(stocksKPIs.totalStock)}</div>
                    <div className="kpi-subtitle">{stocksKPIs.countryCount} ülke · {stocksKPIs.speciesCount} tür</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: stocksKPIs.globalCAGR5 > 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: stocksKPIs.globalCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>📈</div></div>
                    <div className="kpi-value" style={{color: stocksKPIs.globalCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>%{stocksKPIs.globalCAGR5.toFixed(2)}</div>
                    <div className="kpi-subtitle">10Y: %{stocksKPIs.globalCAGR10.toFixed(2)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">TÜRKİYE</span><div className="kpi-icon purple">🇹🇷</div></div>
                    <div className="kpi-value">#{stocksKPIs.turkeyRankGlobal}</div>
                    <div className="kpi-subtitle">{formatNumber(stocksKPIs.turkeyTotal)} baş · %{((stocksKPIs.turkeyTotal / stocksKPIs.totalStock) * 100).toFixed(1)} pay</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">🇹🇷 5Y CAGR</span></div>
                    <div className="kpi-value" style={{color: stocksKPIs.turkeyCAGR5 > 0 ? '#22c55e' : '#ef4444'}}>%{stocksKPIs.turkeyCAGR5.toFixed(2)}</div>
                    <div className="kpi-subtitle">{stocksKPIs.turkeyCAGR5 > stocksKPIs.globalCAGR5 ? '✅ Küresel ortalamanın üstünde' : '⚠️ Küresel ortalamanın altında'}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">EN HIZLI BÜYÜYEN</span><div className="kpi-icon green">🚀</div></div>
                    <div className="kpi-value" style={{fontSize: '1rem'}}>{stocksKPIs.topGrower}</div>
                    <div className="kpi-subtitle">CAGR %{stocksKPIs.topGrowerCAGR.toFixed(1)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">LİDER ÜLKE</span><div className="kpi-icon orange">🏆</div></div>
                    <div className="kpi-value" style={{fontSize: '1rem'}}>{stocksCountryData[0]?.name || '-'}</div>
                    <div className="kpi-subtitle">Pay: %{stocksCountryData[0]?.share || '0'}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">KONSANTRASYON</span></div>
                    <div className="kpi-value">{stocksKPIs.hhi.toFixed(0)}</div>
                    <div className="kpi-subtitle">HHI · {stocksKPIs.hhi < 500 ? '🟢 Dağınık' : stocksKPIs.hhi < 1500 ? '🟡 Orta' : '🔴 Yoğun'}</div>
                  </div>
                </div>
              )}

              {/* Insights */}
              {stocksInsights.length > 0 && (
                <div style={{marginTop: '16px'}}>
                  <InsightCard insights={stocksInsights} />
                </div>
              )}

              {/* Row 1: Animal CAGR cards + Trend Strength */}
              {stocksAnimalCAGR.length > 0 && (
                <div style={{marginTop: '24px'}}>
                  <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🐾 Tür Populasyon Trendleri</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px'}}>
                    {stocksAnimalCAGR.map((a, i) => {
                      const trendIcon = a.trend === 'surge' ? '🚀' : a.trend === 'growth' ? '📈' : a.trend === 'stable' ? '➡️' : a.trend === 'decline' ? '📉' : '💀';
                      const trendColor = a.trend === 'surge' ? '#22c55e' : a.trend === 'growth' ? '#3b82f6' : a.trend === 'stable' ? '#f59e0b' : a.trend === 'decline' ? '#f97316' : '#ef4444';
                      const trendLabel = a.trend === 'surge' ? 'PATLAMA' : a.trend === 'growth' ? 'BÜYÜME' : a.trend === 'stable' ? 'STABİL' : a.trend === 'decline' ? 'DÜŞÜŞ' : 'ÇÖKÜŞ';
                      return (
                        <div key={i} style={{background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: `1px solid ${trendColor}33`, position: 'relative', overflow: 'hidden'}}>
                          <div style={{position: 'absolute', top: '8px', right: '8px', fontSize: '1.5rem'}}>{trendIcon}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>{ANIMAL_ITEMS.find(ai => ai.name === a.animal)?.nameTR || a.animal}</div>
                          <div style={{fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)'}}>{formatNumber(a.current)}</div>
                          <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                            <span style={{fontSize: '0.8rem', color: trendColor, fontWeight: '600'}}>5Y: {a.cagr5 > 0 ? '+' : ''}{a.cagr5.toFixed(1)}%</span>
                            <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>10Y: {a.cagr10 > 0 ? '+' : ''}{a.cagr10.toFixed(1)}%</span>
                          </div>
                          <div style={{marginTop: '6px', fontSize: '0.7rem', fontWeight: '700', color: trendColor, background: `${trendColor}15`, display: 'inline-block', padding: '2px 8px', borderRadius: '4px'}}>{trendLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 2: Deep Trend Stacked Area + Animal Pie */}
              <div className="chart-grid" style={{marginTop: '24px'}}>
                <div className="chart-card" style={{gridColumn: 'span 2'}}>
                  <h3 className="chart-title">📈 Uzun Vadeli Populasyon Trendi (Stacked)</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={stocksDeepTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(stocksDeepTrend.length / 15))} />
                      <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [formatNumber(value), '']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      {selectedItems.map((id, idx) => {
                        const animal = ANIMAL_ITEMS.find(a => a.id === id);
                        if (!animal) return null;
                        return <Area key={animal.name} type="monotone" dataKey={animal.name} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} />;
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 3: Animal CAGR Bar + Animal Share Pie */}
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">📊 Tür CAGR Karşılaştırması</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={stocksAnimalCAGR.map(a => ({
                      name: ANIMAL_ITEMS.find(ai => ai.name === a.animal)?.nameTR || a.animal,
                      cagr5: parseFloat(a.cagr5.toFixed(2)),
                      cagr10: parseFloat(a.cagr10.toFixed(2))
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={(v: number) => `${v}%`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
                      <Tooltip formatter={(value: number, name: string) => [`%${value.toFixed(2)}`, name === 'cagr5' ? '5Y CAGR' : '10Y CAGR']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend formatter={(v: string) => v === 'cagr5' ? '5 Yıl CAGR' : '10 Yıl CAGR'} />
                      <Bar dataKey="cagr5" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="cagr10" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">🥧 Küresel Tür Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={stocksData.map((d, i) => ({...d, fill: COLORS[i % COLORS.length]}))} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                        label={(props) => { const p = props as unknown as Record<string, unknown>; const name = String(p.name ?? ''); const pct = Number(p.percent ?? 0); return `${ANIMAL_ITEMS.find(ai => ai.name === name)?.nameTR || name} ${(pct * 100).toFixed(0)}%`; }} labelLine={false}>
                        {stocksData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Baş']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 4: Country Growth Quadrant (Scatter) */}
              {stocksCountryCAGR.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{gridColumn: 'span 2'}}>
                    <h3 className="chart-title">🎯 Ülke Growth Quadrant (Büyüme × Stok)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="total" name="Stok" tickFormatter={(v: number) => formatShort(v)}
                          label={{ value: 'Toplam Stok (Baş)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)' }}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis type="number" dataKey="cagr5" name="CAGR"
                          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                          label={{ value: '5Y CAGR (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <ZAxis range={[60, 400]} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'CAGR') return [`%${value.toFixed(2)}`, '5Y CAGR'];
                            if (name === 'Stok') return [formatNumber(value), 'Toplam Stok'];
                            return [value, name];
                          }}
                          labelFormatter={(label: number) => stocksCountryCAGR[label]?.country || ''}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Scatter name="Ülkeler" data={stocksCountryCAGR} fill="#8884d8">
                          {stocksCountryCAGR.map((c, idx) => (
                            <Cell key={`sc-${idx}`} fill={c.country === 'Türkiye' ? '#ef4444' : c.cagr5 > 3 ? '#22c55e' : c.cagr5 > 0 ? '#3b82f6' : c.cagr5 > -3 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />Yüksek Büyüme (&gt;3%)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />Büyüme (0-3%)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />Düşüş (0 to -3%)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />Ciddi Düşüş / 🇹🇷 Türkiye</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 5: Top 20 Country Ranking (stacked bar per animal) */}
              <div className="chart-grid">
                <div className="chart-card" style={{gridColumn: 'span 2'}}>
                  <h3 className="chart-title">🌍 Top 20 Ülke Sıralaması ({selectedYear})</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={stocksCountryData.slice(0, 20)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Stok']}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {stocksCountryData.slice(0, 20).map((item, idx) => (
                          <Cell key={`cc-${idx}`} fill={String(item.name).includes('Türkiye') ? '#ef4444' : COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 6: Turkey Profile Cards */}
              {stocksTurkeyProfile.length > 0 && (
                <div style={{marginTop: '24px'}}>
                  <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🇹🇷 Türkiye Hayvan Profili</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px'}}>
                    {stocksTurkeyProfile.map((p, i) => (
                      <div key={i} style={{background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)'}}>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{ANIMAL_ITEMS.find(ai => ai.name === p.animal)?.nameTR || p.animal}</div>
                        <div style={{fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px'}}>{formatNumber(p.count)}</div>
                        <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
                          <span style={{fontSize: '0.75rem', background: 'rgba(59,130,246,.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px'}}>Pay %{p.share.toFixed(1)}</span>
                          <span style={{fontSize: '0.75rem', background: p.cagr5 >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: p.cagr5 >= 0 ? '#22c55e' : '#ef4444', padding: '2px 6px', borderRadius: '4px'}}>5Y {p.cagr5 > 0 ? '+' : ''}{p.cagr5.toFixed(1)}%</span>
                        </div>
                        {/* mini progress bar for global share */}
                        <div style={{marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '4px', height: '6px', overflow: 'hidden'}}>
                          <div style={{width: `${Math.min(p.share * 5, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '4px'}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 7: Risk Alerts Table */}
              {stocksRiskAlerts.length > 0 && (
                <div style={{marginTop: '24px'}}>
                  <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>🚨 Populasyon Risk Uyarıları (10 Yıllık Değişim)</h3>
                  <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                      <thead>
                        <tr style={{borderBottom: '2px solid var(--border)'}}>
                          <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Durum</th>
                          <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Ülke</th>
                          <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Hayvan</th>
                          <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>10Y Değişim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stocksRiskAlerts.slice(0, 20).map((r, i) => (
                          <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                            <td style={{padding: '10px 16px'}}>
                              <span style={{
                                fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px',
                                background: r.type === 'collapse' ? 'rgba(239,68,68,.15)' : r.type === 'sharp_decline' ? 'rgba(249,115,22,.15)' : 'rgba(34,197,94,.15)',
                                color: r.type === 'collapse' ? '#ef4444' : r.type === 'sharp_decline' ? '#f97316' : '#22c55e'
                              }}>
                                {r.type === 'collapse' ? '💀 ÇÖKÜŞ' : r.type === 'sharp_decline' ? '📉 DÜŞÜŞ' : '🚀 PATLAMA'}
                              </span>
                            </td>
                            <td style={{padding: '10px 16px', color: 'var(--text-primary)', fontWeight: '500'}}>{r.country}</td>
                            <td style={{padding: '10px 16px', color: 'var(--text-secondary)'}}>{ANIMAL_ITEMS.find(ai => ai.name === r.animal)?.nameTR || r.animal}</td>
                            <td style={{padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: r.decline10 < 0 ? '#ef4444' : '#22c55e'}}>
                              {r.decline10 > 0 ? '+' : ''}{r.decline10.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Row 8: Country CAGR Rankings Table */}
              {stocksCountryCAGR.length > 0 && (
                <div style={{marginTop: '24px'}}>
                  <h3 style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px'}}>📋 Ülke Stok Sıralaması & Büyüme</h3>
                  <div style={{background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                      <thead>
                        <tr style={{borderBottom: '2px solid var(--border)'}}>
                          <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>#</th>
                          <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Ülke</th>
                          <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Toplam Stok</th>
                          <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Küresel Pay</th>
                          <th style={{textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>5Y CAGR</th>
                          <th style={{textAlign: 'center', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stocksCountryCAGR.map((c, i) => {
                          const isTurkey = c.country === 'Türkiye';
                          return (
                            <tr key={i} style={{borderBottom: '1px solid var(--border)', background: isTurkey ? 'rgba(239,68,68,.06)' : 'transparent'}}>
                              <td style={{padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: '500'}}>{i + 1}</td>
                              <td style={{padding: '10px 16px', color: 'var(--text-primary)', fontWeight: isTurkey ? '700' : '500'}}>
                                {isTurkey ? '🇹🇷 ' : ''}{c.country}
                              </td>
                              <td style={{padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)'}}>{formatNumber(c.total)}</td>
                              <td style={{padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)'}}>%{c.share.toFixed(2)}</td>
                              <td style={{padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: c.cagr5 > 1 ? '#22c55e' : c.cagr5 > -1 ? '#f59e0b' : '#ef4444'}}>
                                {c.cagr5 > 0 ? '+' : ''}{c.cagr5.toFixed(2)}%
                              </td>
                              <td style={{padding: '10px 16px', textAlign: 'center'}}>
                                {c.cagr5 > 3 ? '🚀' : c.cagr5 > 1 ? '📈' : c.cagr5 > -1 ? '➡️' : c.cagr5 > -3 ? '📉' : '💀'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PRIMARY PRODUCTS TAB */}
          {activeTab === 'primary' && (
            <>
              {/* Sub-tab buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {renderPrimaryTabButton('meat', '🥩', 'Et Ürünleri')}
                {renderPrimaryTabButton('milk', '🥛', 'Süt Ürünleri')}
                {renderPrimaryTabButton('eggs', '🥚', 'Yumurta')}
                {renderPrimaryTabButton('other', '🍯', 'Diğer Ürünler')}
              </div>

              {/* ─── Intelligence KPIs ─── */}
              {primaryKPIs && (
                <div className="kpi-grid">
                  <div className="kpi-card large">
                    <div className="kpi-header"><span className="kpi-title">KÜRESEL ÜRETİM</span></div>
                    <div className="kpi-value">{formatNumber(primaryKPIs.totalProduction)}</div>
                    <div className="kpi-subtitle">ton · {primaryKPIs.productCount} ürün · {primaryKPIs.countryCount} ülke</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: primaryKPIs.globalCAGR5 >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: primaryKPIs.globalCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>{primaryKPIs.globalCAGR5 >= 0 ? '📈' : '📉'}</div></div>
                    <div className="kpi-value" style={{color: primaryKPIs.globalCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>%{primaryKPIs.globalCAGR5.toFixed(1)}</div>
                    <div className="kpi-subtitle">Küresel yıllık büyüme</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">LİDER</span><div className="kpi-icon orange">🏆</div></div>
                    <div className="kpi-value" style={{fontSize: '1rem'}}>{primaryKPIs.leader}</div>
                    <div className="kpi-subtitle">%{primaryKPIs.leaderShare.toFixed(1)} pazar payı</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE SIRA</span></div>
                    <div className="kpi-value" style={{color: '#a855f7'}}>#{primaryKPIs.turkeyRank || '-'}</div>
                    <div className="kpi-subtitle">{formatNumber(primaryKPIs.turkeyTotal)} ton</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE PAY</span></div>
                    <div className="kpi-value" style={{color: '#3b82f6'}}>%{primaryKPIs.turkeyShare.toFixed(2)}</div>
                    <div className="kpi-subtitle">Küresel üretimdeki pay</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE CAGR</span></div>
                    <div className="kpi-value" style={{color: primaryKPIs.turkeyCAGR5 >= 0 ? '#22c55e' : '#ef4444'}}>%{primaryKPIs.turkeyCAGR5.toFixed(1)}</div>
                    <div className="kpi-subtitle">{primaryKPIs.turkeyCAGR5 > primaryKPIs.globalCAGR5 ? '✅ Küreselden hızlı' : '⚠️ Küreselden yavaş'}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">YÜKSELEN</span><div className="kpi-icon green">🌱</div></div>
                    <div className="kpi-value" style={{color: '#22c55e'}}>{primaryProductCAGR.filter(p => p.lifecycle === 'emerging').length}</div>
                    <div className="kpi-subtitle">Emerging ürün</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">DÜŞEN</span><div className="kpi-icon" style={{background:'rgba(239,68,68,.15)', color:'#ef4444'}}>⚠️</div></div>
                    <div className="kpi-value" style={{color: '#ef4444'}}>{primaryProductCAGR.filter(p => p.lifecycle === 'declining').length}</div>
                    <div className="kpi-subtitle">Declining ürün</div>
                  </div>
                </div>
              )}

              {/* Auto-Insights */}
              {primaryInsights.length > 0 && <InsightCard insights={primaryInsights} />}

              {/* ─── Product Lifecycle Cards ─── */}
              <div className="chart-card" style={{marginTop: '20px'}}>
                <h3 className="chart-title">🧬 Ürün Yaşam Döngüsü Matrisi</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px'}}>
                  {primaryProductCAGR.slice(0, 12).map((p, i) => {
                    const lcStyle = p.lifecycle === 'emerging' ? {bg: 'rgba(34,197,94,.1)', border: '#22c55e', badge: '🌱 Emerging', color: '#22c55e'}
                      : p.lifecycle === 'growth' ? {bg: 'rgba(59,130,246,.1)', border: '#3b82f6', badge: '📈 Growth', color: '#3b82f6'}
                      : p.lifecycle === 'mature' ? {bg: 'rgba(168,85,247,.1)', border: '#a855f7', badge: '⚖️ Mature', color: '#a855f7'}
                      : {bg: 'rgba(239,68,68,.1)', border: '#ef4444', badge: '📉 Declining', color: '#ef4444'};
                    return (
                      <div key={i} style={{background: lcStyle.bg, border: `1px solid ${lcStyle.border}`, borderRadius: '12px', padding: '14px', position: 'relative'}}>
                        <span style={{position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, color: lcStyle.color, background: 'var(--bg-card)', borderRadius: '6px', padding: '2px 8px', border: `1px solid ${lcStyle.border}`}}>{lcStyle.badge}</span>
                        <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', maxWidth: '70%', lineHeight: 1.3}}>{translateProduct(p.product)}</div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px'}}>
                          <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Üretim</div><div style={{fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)'}}>{formatShort(p.current)}</div></div>
                          <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>CAGR</div><div style={{fontWeight: 700, fontSize: '13px', color: p.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>%{p.cagr5.toFixed(1)}</div></div>
                          <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Pay</div><div style={{fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)'}}>%{p.share.toFixed(1)}</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Product CAGR Chart ─── */}
              <div className="chart-grid" style={{marginTop: '20px'}}>
                <div className="chart-card">
                  <h3 className="chart-title">📊 Ürün CAGR Karşılaştırması (5Y)</h3>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={primaryProductCAGR.slice(0, 12).map(p => ({...p, product: translateProduct(p.product)}))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={(v: number) => `%${v.toFixed(0)}`} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis type="category" dataKey="product" tick={{fill: 'var(--text-secondary)', fontSize: 9}} width={140} />
                      <Tooltip formatter={(value: number) => [`%${value.toFixed(2)}`, '5Y CAGR']}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Bar dataKey="cagr5" radius={[0, 4, 4, 0]}>
                        {primaryProductCAGR.slice(0, 12).map((p, idx) => (
                          <Cell key={`pcagr-${idx}`} fill={
                            p.lifecycle === 'emerging' ? '#22c55e' : p.lifecycle === 'growth' ? '#3b82f6'
                            : p.lifecycle === 'mature' ? '#a855f7' : '#ef4444'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Country Growth Quadrant */}
                <div className="chart-card">
                  <h3 className="chart-title">🌐 Ülke Büyüme Kadranı</h3>
                  <ResponsiveContainer width="100%" height={380}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" dataKey="share" name="Pazar Payı" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis type="number" dataKey="cagr5" name="5Y CAGR" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <ZAxis type="number" dataKey="total" range={[40, 400]} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                        labelFormatter={(_, payload) => {
                          if (payload && payload.length > 0) {
                            const d = payload[0].payload as {country: string};
                            return d.country;
                          }
                          return '';
                        }}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}}
                      />
                      <Scatter name="Ülkeler" data={primaryCountryCAGR.slice(0, 25)} fill="#3b82f6">
                        {primaryCountryCAGR.slice(0, 25).map((c, idx) => (
                          <Cell key={`psc-${idx}`} fill={c.country.includes('Türkiye') || c.country.includes('Turkey') ? '#ef4444' : COLORS[idx % COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ─── Top 20 Country Ranking ─── */}
              <div className="chart-grid" style={{marginTop: '20px'}}>
                <div className="chart-card" style={{gridColumn: 'span 2'}}>
                  <h3 className="chart-title">🌍 Top 20 Ülke Üretim Sıralaması</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={primaryCountryData.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 9}} angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Üretim (ton)']}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {primaryCountryData.slice(0, 20).map((item) => (
                          <Cell key={`pc20-${item.area || item.name}`} fill={
                            (item.area === 'Türkiye' || item.name === 'Türkiye' || item.name === 'Turkey') ? '#ef4444' : String(item.fill)
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ─── Turkey Product Profile ─── */}
              {primaryTurkeyProducts.length > 0 && (
                <div className="chart-card" style={{marginTop: '20px'}}>
                  <h3 className="chart-title">🇹🇷 Türkiye Ürün Profili</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px'}}>
                    {primaryTurkeyProducts.slice(0, 8).map((tp, i) => {
                      const maxProd = primaryTurkeyProducts[0]?.production || 1;
                      const pct = (tp.production / maxProd) * 100;
                      return (
                        <div key={i} style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px'}}>
                          <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px'}}>{translateProduct(tp.product)}</div>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                            <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{formatNumber(tp.production)} ton</span>
                            <span style={{fontSize: '12px', fontWeight: 700, color: tp.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>CAGR %{tp.cagr5.toFixed(1)}</span>
                          </div>
                          <div style={{width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                            <div style={{width: `${pct}%`, height: '100%', background: tp.cagr5 >= 0 ? 'linear-gradient(90deg, #22c55e, #3b82f6)' : 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: '3px', transition: 'width 0.5s ease'}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Yearly Trend + Country CAGR Table ─── */}
              <div className="chart-grid" style={{marginTop: '20px'}}>
                <div className="chart-card">
                  <h3 className="chart-title">📅 Küresel Üretim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={primaryYearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Üretim (ton)']}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Country CAGR Rankings Table */}
                <div className="chart-card">
                  <h3 className="chart-title">📋 Ülke CAGR Sıralaması (5Y)</h3>
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
                      <thead>
                        <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                          <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>#</th>
                          <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ülke</th>
                          <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Üretim</th>
                          <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Pay</th>
                          <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>CAGR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {primaryCountryCAGR.slice(0, 20).map((c, i) => {
                          const isTurkey = c.country.includes('Türkiye') || c.country.includes('Turkey');
                          return (
                            <tr key={i} style={{borderBottom: '1px solid var(--border)', background: isTurkey ? 'rgba(239,68,68,.08)' : 'transparent'}}>
                              <td style={{padding: '6px', fontWeight: isTurkey ? 700 : 400}}>{i + 1}</td>
                              <td style={{padding: '6px', fontWeight: isTurkey ? 700 : 400, color: isTurkey ? '#ef4444' : 'var(--text-primary)'}}>{isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                              <td style={{padding: '6px', textAlign: 'right'}}>{formatShort(c.total)}</td>
                              <td style={{padding: '6px', textAlign: 'right'}}>%{c.share.toFixed(1)}</td>
                              <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: c.cagr5 >= 0 ? '#22c55e' : '#ef4444'}}>
                                {c.cagr5 > 3 ? '🚀' : c.cagr5 > 0 ? '📈' : c.cagr5 > -2 ? '📉' : '⚠️'} %{c.cagr5.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PREDICTIONS TAB (F1.2) - Sprint 5 Intelligence */}
          {activeTab === 'predictions' && (
            <>
              {/* ─── Intelligence KPIs ─── */}
              {predKPIs && (
                <div className="kpi-grid">
                  <div className="kpi-card large">
                    <div className="kpi-header"><span className="kpi-title">🔮 TAHMİN MODELLERİ</span></div>
                    <div className="kpi-value" style={{fontSize: '1.4rem', color: 'var(--accent)'}}>{predKPIs.totalForecasts}</div>
                    <div className="kpi-subtitle">Prophet / 3Y projeksiyon ({parseInt(selectedYear) + 1}-{parseInt(selectedYear) + 3})</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">ORTALAMA R²</span><div className="kpi-icon" style={{background: predKPIs.avgR2 > 0.7 ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)', color: predKPIs.avgR2 > 0.7 ? '#22c55e' : '#f59e0b'}}>📐</div></div>
                    <div className="kpi-value" style={{color: predKPIs.avgR2 > 0.7 ? '#22c55e' : '#f59e0b'}}>{predKPIs.avgR2.toFixed(3)}</div>
                    <div className="kpi-subtitle">{predKPIs.highConfidence} yüksek güvenilir (R²&gt;0.8)</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">📈 YÜKSELEN</span><div className="kpi-icon green">🚀</div></div>
                    <div className="kpi-value" style={{color: '#22c55e'}}>{predKPIs.upTrend}</div>
                    <div className="kpi-subtitle">Büyüme trendi</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">📉 DÜŞEN</span><div className="kpi-icon" style={{background:'rgba(239,68,68,.15)', color:'#ef4444'}}>⚠️</div></div>
                    <div className="kpi-value" style={{color: '#ef4444'}}>{predKPIs.downTrend}</div>
                    <div className="kpi-subtitle">Düşüş trendi</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">ANOMALİ</span><div className="kpi-icon red">⚡</div></div>
                    <div className="kpi-value">{predKPIs.anomalyCount}</div>
                    <div className="kpi-subtitle">Z-score &gt; 2.5</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">KRİTİK RİSK</span><div className="kpi-icon orange">🔥</div></div>
                    <div className="kpi-value" style={{color: '#ef4444'}}>{predKPIs.riskCount}</div>
                    <div className="kpi-subtitle">CAGR &lt; -5%</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE</span></div>
                    <div className="kpi-value" style={{color: '#a855f7'}}>{predKPIs.turkeyForecasts}</div>
                    <div className="kpi-subtitle">Ürün tahmini</div>
                  </div>
                </div>
              )}

              {/* Auto-Insights */}
              {predInsights.length > 0 && <InsightCard insights={predInsights} />}

              {/* ─── Global Forecast Chart with Confidence Bands ─── */}
              <div className="chart-grid" style={{marginTop: '20px'}}>
                <div className="chart-card" style={{gridColumn: 'span 2'}}>
                  <h3 className="chart-title">🔮 Küresel Üretim Tahmini — Prophet (Tarihçe + 3Y Projeksiyon)</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={predForecastChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name === 'actual' ? 'Gerçek' : name === 'forecast' ? 'Tahmin' : name === 'upper' ? 'İyimser' : 'Kötümser']}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="#22c55e" fillOpacity={0.1} name="upper" />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="#ef4444" fillOpacity={0.1} name="lower" />
                      <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2.5} name="actual" />
                      <Area type="monotone" dataKey="forecast" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2.5} strokeDasharray="8 4" name="forecast" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)'}}>
                    <span><span style={{display: 'inline-block', width: '12px', height: '3px', background: '#3b82f6', marginRight: '4px', verticalAlign: 'middle'}} /> Tarihçe</span>
                    <span><span style={{display: 'inline-block', width: '12px', height: '3px', background: '#f59e0b', borderBottom: '2px dashed #f59e0b', marginRight: '4px', verticalAlign: 'middle'}} /> Tahmin</span>
                    <span><span style={{display: 'inline-block', width: '12px', height: '8px', background: 'rgba(34,197,94,.2)', marginRight: '4px', verticalAlign: 'middle'}} /> %80 Güven Bandı</span>
                  </div>
                </div>
              </div>

              {/* ─── R² vs Growth Scatter + Anomaly Timeline ─── */}
              <div className="chart-grid" style={{marginTop: '20px'}}>
                <div className="chart-card">
                  <h3 className="chart-title">📐 Çapraz-Doğrulama R² × Büyüme Oranı</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" dataKey="r2" name="R²" domain={[0, 1]} tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis type="number" dataKey="growth" name="Büyüme" unit="%" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <ZAxis type="number" dataKey="volume" range={[30, 300]} />
                      <Tooltip
                        formatter={(value: number, name: string) => [name === 'R²' ? value.toFixed(3) : `${value.toFixed(1)}%`, name]}
                        labelFormatter={(_, payload) => {
                          if (payload && payload.length > 0) {
                            const d = payload[0].payload as {country: string; product: string};
                            return `${d.country} - ${translateProduct(d.product)}`;
                          }
                          return '';
                        }}
                        contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}}
                      />
                      <Scatter name="Tahminler" data={predR2GrowthScatter} fill="#3b82f6">
                        {predR2GrowthScatter.map((d, idx) => (
                          <Cell key={`r2g-${idx}`} fill={d.r2 > 0.8 ? (d.growth > 0 ? '#22c55e' : '#ef4444') : '#94a3b8'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div style={{fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px'}}>
                    🟢 Güvenilir+Büyüme &nbsp; 🔴 Güvenilir+Düşüş &nbsp; ⚪ Düşük Güven
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">⚡ Anomali Zaman Çizelgesi</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={predAnomalyTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} />
                      <Tooltip contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'}} />
                      <Bar dataKey="spikes" stackId="a" fill="#22c55e" name="Ani Artış" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="drops" stackId="a" fill="#ef4444" name="Ani Düşüş" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ─── Turkey Forecast Cards ─── */}
              {predTurkeyForecasts.length > 0 && (
                <div className="chart-card" style={{marginTop: '20px'}}>
                  <h3 className="chart-title">🇹🇷 Türkiye Ürün Tahminleri ({parseInt(selectedYear) + 3})</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginTop: '12px'}}>
                    {predTurkeyForecasts.slice(0, 8).map((tf, i) => {
                      const isUp = tf.changePercent >= 0;
                      return (
                        <div key={i} style={{background: isUp ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.06)', border: `1px solid ${isUp ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`, borderRadius: '12px', padding: '14px'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                            <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', maxWidth: '70%', lineHeight: 1.3}}>{translateProduct(tf.product)}</div>
                            <span style={{fontSize: '10px', fontWeight: 700, color: isUp ? '#22c55e' : '#ef4444', background: isUp ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', borderRadius: '6px', padding: '2px 8px'}}>{isUp ? '📈' : '📉'} {tf.changePercent > 0 ? '+' : ''}{tf.changePercent.toFixed(1)}%</span>
                          </div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px'}}>
                            <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>Mevcut</div><div style={{fontWeight: 700, fontSize: '13px'}}>{formatShort(tf.current)}</div></div>
                            <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 3}</div><div style={{fontWeight: 700, fontSize: '13px', color: isUp ? '#22c55e' : '#ef4444'}}>{formatShort(tf.forecast2027)}</div></div>
                            <div><div style={{fontSize: '10px', color: 'var(--text-secondary)'}}>R²</div><div style={{fontWeight: 700, fontSize: '13px', color: tf.r2 > 0.8 ? '#22c55e' : tf.r2 > 0.6 ? '#f59e0b' : '#94a3b8'}}>{tf.r2.toFixed(2)}</div></div>
                          </div>
                          <div style={{marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)'}}>
                            Trend: <span style={{fontWeight: 600, color: tf.trend === 'ACCELERATING' || tf.trend.includes('UP') || tf.trend === 'EXPONENTIAL' ? '#22c55e' : tf.trend === 'DOWN' || tf.trend === 'DECLINING' ? '#ef4444' : '#f59e0b'}}>
                            {tf.trend === 'ACCELERATING' || tf.trend === 'EXPONENTIAL' ? '🚀 Hızlanan Artış' : tf.trend.includes('UP') ? '📈 Yükselen' : tf.trend === 'DOWN' || tf.trend === 'DECLINING' ? '📉 Düşüş' : '➡️ Stabil'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Country Selector for Comparative View ─── */}
              <div className="chart-card" style={{marginTop: '20px'}}>
                <h3 className="chart-title">🌐 Ülke Bazlı Tahmin Karşılaştırması</h3>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
                  {['Türkiye', 'Brezilya', 'ABD', 'Hindistan', 'Çin', 'Almanya', 'Fransa', 'Rusya'].map(c => (
                    <button key={c} onClick={() => setPredSelectedCountry(c)}
                      style={{padding: '6px 14px', borderRadius: '8px', border: `1px solid ${predSelectedCountry === c ? 'var(--primary)' : 'var(--border)'}`, background: predSelectedCountry === c ? 'var(--primary)' : 'var(--bg-primary)', color: predSelectedCountry === c ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600}}>{c}</button>
                  ))}
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
                    <thead>
                      <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                        <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ürün</th>
                        <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Trend</th>
                        <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>R²</th>
                        <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 1}</th>
                        <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>{parseInt(selectedYear) + 3}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionsData.filter(p => p.country === predSelectedCountry).slice(0, 15).map((pred, idx) => (
                        <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                          <td style={{padding: '6px', fontWeight: 500}}>{translateProduct(pred.product)}</td>
                          <td style={{padding: '6px', textAlign: 'right'}}>
                            <span style={{fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                              background: pred.trend === 'ACCELERATING' || pred.trend.includes('UP') || pred.trend === 'EXPONENTIAL' ? 'rgba(34,197,94,.15)' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)',
                              color: pred.trend === 'ACCELERATING' || pred.trend.includes('UP') || pred.trend === 'EXPONENTIAL' ? '#22c55e' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? '#ef4444' : '#f59e0b'}}>
                              {pred.trend === 'ACCELERATING' || pred.trend === 'EXPONENTIAL' ? '🚀 Hızlanan' : pred.trend.includes('UP') ? '📈 Yükselen' : pred.trend === 'DOWN' || pred.trend === 'DECLINING' ? '📉 Düşüş' : '➡️ Stabil'}
                            </span>
                          </td>
                          <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: pred.r2 > 0.8 ? '#22c55e' : pred.r2 > 0.6 ? '#f59e0b' : '#94a3b8'}}>{pred.r2.toFixed(3)}</td>
                          <td style={{padding: '6px', textAlign: 'right'}}>{pred.forecast[0] ? formatShort(pred.forecast[0].value) : '-'}</td>
                          <td style={{padding: '6px', textAlign: 'right'}}>{pred.forecast[2] ? formatShort(pred.forecast[2].value) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {predictionsData.filter(p => p.country === predSelectedCountry).length === 0 && (
                    <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px'}}>Bu ülke için tahmin verisi bulunamadı.</div>
                  )}
                </div>
              </div>

              {/* ─── Risk Matrix Cards ─── */}
              {riskAlerts.length > 0 && (
                <div className="chart-card" style={{marginTop: '20px', background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.2)'}}>
                  <h3 className="chart-title">🚨 Kritik Risk Matrisi (CAGR &lt; -5%)</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px'}}>
                    {riskAlerts.slice(0, 9).map((risk, idx) => {
                      const severity = risk.decline < -15 ? 'critical' : risk.decline < -10 ? 'high' : 'medium';
                      const sColor = severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ef4444' : '#f97316';
                      return (
                        <div key={idx} style={{background: 'var(--bg-card)', border: `1px solid ${sColor}40`, borderRadius: '12px', padding: '14px', position: 'relative'}}>
                          <span style={{position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, color: sColor, background: `${sColor}15`, borderRadius: '6px', padding: '2px 8px'}}>
                            {severity === 'critical' ? '🔴 KRİTİK' : severity === 'high' ? '🟠 YÜKSEK' : '🟡 ORTA'}
                          </span>
                          <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px'}}>{risk.country}</div>
                          <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', maxWidth: '70%'}}>{translateProduct(risk.product)}</div>
                          <div style={{fontSize: '1.2rem', fontWeight: 700, color: sColor}}>%{risk.decline.toFixed(1)} CAGR</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Anomaly Table ─── */}
              {anomalyAlerts.length > 0 && (
                <div className="chart-card" style={{marginTop: '20px'}}>
                  <h3 className="chart-title">⚡ Anomali Tespitleri (Z-score &gt; 2.5)</h3>
                  <div style={{maxHeight: '320px', overflowY: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
                      <thead>
                        <tr style={{borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)'}}>
                          <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ülke</th>
                          <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Ürün</th>
                          <th style={{textAlign: 'left', padding: '8px 6px', color: 'var(--text-secondary)'}}>Yıl</th>
                          <th style={{textAlign: 'center', padding: '8px 6px', color: 'var(--text-secondary)'}}>Tip</th>
                          <th style={{textAlign: 'right', padding: '8px 6px', color: 'var(--text-secondary)'}}>Z-Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalyAlerts.slice(0, 15).map((a, idx) => (
                          <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                            <td style={{padding: '6px'}}>{a.country}</td>
                            <td style={{padding: '6px', color: 'var(--text-secondary)'}}>{translateProduct(a.product)}</td>
                            <td style={{padding: '6px'}}>{a.year}</td>
                            <td style={{padding: '6px', textAlign: 'center'}}>
                              <span style={{fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                background: a.type === 'SPIKE' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
                                color: a.type === 'SPIKE' ? '#22c55e' : '#ef4444'}}>
                                {a.type === 'SPIKE' ? '📈 ARTIŞ' : '📉 DÜŞÜŞ'}
                              </span>
                            </td>
                            <td style={{padding: '6px', textAlign: 'right', fontWeight: 600, color: Math.abs(a.zScore) > 3 ? '#ef4444' : '#f59e0b'}}>{a.zScore.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* R² Explanation */}
              <div style={{marginTop: '20px', padding: '15px', background: 'rgba(59,130,246,.08)', borderRadius: '12px', border: '1px solid rgba(59,130,246,.2)'}}>
                <div style={{fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6}}>
                  💡 <strong>Tahmin Metodolojisi:</strong> Lineer regresyon modeli 15 yıllık tarihçe üzerinden çalışır. R² değeri modelin açıklayıcılığını ölçer (0-1). <br/>
                  <span style={{color: '#22c55e'}}>■</span> R²&gt;0.8 = Mükemmel &nbsp; <span style={{color: '#f59e0b'}}>■</span> 0.6-0.8 = İyi &nbsp; <span style={{color: '#94a3b8'}}>■</span> &lt;0.6 = Düşük güven. Anomali: Z-score&gt;2.5 olan olağandışı değişimler.
                </div>
              </div>
            </>
          )}

          {/* EFFICIENCY TAB (F1.3) - Sprint 6 Intelligence */}
          {activeTab === 'efficiency' && effKPIs && (
            <>
              {/* 8 KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card large">
                  <div className="kpi-header"><span className="kpi-title">⚡ VERİMLİLİK İSTİHBARATI</span></div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--accent)' }}>
                    {effKPIs.countryCount} Ülke
                  </div>
                  <div className="kpi-subtitle">Et/Süt/Yumurta Verimlilik Analizi ({selectedYear})</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">🇹🇷 ET VERİMİ</span><div className="kpi-icon red">🥩</div></div>
                  <div className="kpi-value" style={{ color: effKPIs.trMeatEff > effKPIs.worldAvgMeat ? '#22c55e' : '#ef4444' }}>
                    {effKPIs.trMeatEff.toFixed(0)}
                  </div>
                  <div className="kpi-subtitle">kg/hayvan • Sıra: #{effKPIs.trMeatRank}/{effKPIs.countryCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">🇹🇷 SÜT VERİMİ</span><div className="kpi-icon blue">🥛</div></div>
                  <div className="kpi-value" style={{ color: effKPIs.trMilkEff > effKPIs.worldAvgMilk ? '#22c55e' : '#ef4444' }}>
                    {effKPIs.trMilkEff.toFixed(0)}
                  </div>
                  <div className="kpi-subtitle">kg/inek • Sıra: #{effKPIs.trMilkRank}/{effKPIs.countryCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">🇹🇷 YUMURTA VERİMİ</span><div className="kpi-icon orange">🥚</div></div>
                  <div className="kpi-value" style={{ color: effKPIs.trEggEff > effKPIs.worldAvgEgg ? '#22c55e' : '#ef4444' }}>
                    {effKPIs.trEggEff.toFixed(0)}
                  </div>
                  <div className="kpi-subtitle">adet/tavuk • Sıra: #{effKPIs.trEggRank}/{effKPIs.countryCount}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">LİDER ET</span></div>
                  <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{effKPIs.leaderMeat}</div>
                  <div className="kpi-subtitle">{effKPIs.leaderMeatVal.toFixed(0)} kg/hayvan</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">LİDER SÜT</span></div>
                  <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{effKPIs.leaderMilk}</div>
                  <div className="kpi-subtitle">{effKPIs.leaderMilkVal.toFixed(0)} kg/inek</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">LİDER YUMURTA</span></div>
                  <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{effKPIs.leaderEgg}</div>
                  <div className="kpi-subtitle">{effKPIs.leaderEggVal.toFixed(0)} adet/tavuk</div>
                </div>
              </div>

              {/* Insight Cards */}
              {effInsights.length > 0 && (
                <InsightCard insights={effInsights} />
              )}

              {/* Gap Analysis Cards */}
              <div className="chart-card" style={{ marginBottom: 24 }}>
                <h3 className="chart-title">🎯 Türkiye Verimlilik Açığı Analizi — Catch-Up Calculator</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {effGapAnalysis.map(g => (
                    <div key={g.category} style={{
                      background: 'var(--bg-card)', borderRadius: 12, padding: 20,
                      border: `2px solid ${g.gapToAvg >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{g.icon} {g.category}</span>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: g.trend === 'improving' ? 'rgba(34,197,94,0.15)' : g.trend === 'stable' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: g.trend === 'improving' ? '#22c55e' : g.trend === 'stable' ? '#f59e0b' : '#ef4444',
                        }}>
                          {g.trend === 'improving' ? '📈 İyileşiyor' : g.trend === 'stable' ? '➡️ Stabil' : '📉 Düşüşte'}
                        </span>
                      </div>
                      {/* Turkey vs Leader Bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span>🇹🇷 Türkiye: {g.turkeyVal.toFixed(0)} {g.unit}</span>
                          <span>🏆 {g.leaderCountry}: {g.leaderVal.toFixed(0)} {g.unit}</span>
                        </div>
                        <div style={{ position: 'relative', height: 24, background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 12,
                            width: `${Math.min(100, g.leaderVal > 0 ? (g.turkeyVal / g.leaderVal) * 100 : 0)}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                          }} />
                          {/* World avg marker */}
                          <div style={{
                            position: 'absolute', top: 0, height: '100%', width: 3, background: '#f59e0b',
                            left: `${Math.min(100, g.leaderVal > 0 ? (g.worldAvg / g.leaderVal) * 100 : 0)}%`,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2, color: 'var(--text-secondary)' }}>
                          <span>Lidere fark: %{g.gapToLeader.toFixed(0)}</span>
                          <span style={{ color: '#f59e0b' }}>▎Dünya Ort.</span>
                          <span style={{ color: g.gapToAvg >= 0 ? '#22c55e' : '#ef4444' }}>
                            Ort.{g.gapToAvg >= 0 ? '+' : ''}{g.gapToAvg.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {/* Catch-up */}
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        background: g.catchUpYears === null ? 'rgba(34,197,94,0.1)' : g.catchUpYears > 30 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        fontSize: 13, fontWeight: 600,
                        color: g.catchUpYears === null ? '#22c55e' : g.catchUpYears > 30 ? '#ef4444' : '#f59e0b',
                      }}>
                        {g.catchUpYears === null
                          ? '✅ Lideri zaten yakaladı veya trend yetersiz'
                          : g.catchUpYears > 50
                            ? `⚠️ Mevcut hızla yakalama ${g.catchUpYears}+ yıl — yapısal reform şart`
                            : `⏱️ Tahmini yakalama süresi: ${g.catchUpYears} yıl`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-grid">
                {/* Efficiency Scatter: Meat Eff vs Total Production */}
                <div className="chart-card">
                  <h3 className="chart-title">📊 Et Verimi vs Üretim Hacmi (Top 50)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" dataKey="totalProd" name="Toplam Üretim" stroke="var(--text-secondary)"
                        tickFormatter={(v: number) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : `${v}`} />
                      <YAxis type="number" dataKey="meatEff" name="Et Verimi" stroke="var(--text-secondary)" unit=" kg" />
                      <ZAxis type="number" dataKey="totalProd" range={[40, 400]} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        formatter={(value: number, name: string) => [name === 'meatEff' ? `${value.toFixed(0)} kg/hayvan` : `${(value / 1000).toFixed(0)}K ton`, name === 'meatEff' ? 'Et Verimi' : 'Üretim']}
                        labelFormatter={(l) => `${l}`}
                      />
                      <Scatter data={effScatterData.filter(d => !d.isTurkey && d.meatEff > 0)} fill="#94a3b8" opacity={0.6} />
                      <Scatter data={effScatterData.filter(d => d.isTurkey)} fill="#ef4444" opacity={1}>
                        {effScatterData.filter(d => d.isTurkey).map((_, i) => (
                          <Cell key={i} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                    🔴 Türkiye vurgulanmıştır • Büyük nokta = yüksek üretim hacmi
                  </div>
                </div>

                {/* Segmented Analysis: Developed vs Developing vs Turkey */}
                <div className="chart-card">
                  <h3 className="chart-title">🌍 Segmentasyon: Gelişmiş / Gelişmekte / Türkiye</h3>
                  {(() => {
                    const devAvg = effBestPractices.filter(d => d.segment === 'Gelişmiş');
                    const devingAvg = effBestPractices.filter(d => d.segment === 'Gelişmekte');
                    const trRow = effBestPractices.find(d => d.segment === 'Türkiye');
                    const segData = [
                      {
                        segment: 'Gelişmiş',
                        meatEff: devAvg.reduce((s, d) => s + d.meatEff, 0) / (devAvg.length || 1),
                        milkEff: devAvg.reduce((s, d) => s + d.milkEff, 0) / (devAvg.length || 1),
                        eggEff: devAvg.reduce((s, d) => s + d.eggEff, 0) / (devAvg.length || 1),
                      },
                      {
                        segment: 'Gelişmekte',
                        meatEff: devingAvg.reduce((s, d) => s + d.meatEff, 0) / (devingAvg.length || 1),
                        milkEff: devingAvg.reduce((s, d) => s + d.milkEff, 0) / (devingAvg.length || 1),
                        eggEff: devingAvg.reduce((s, d) => s + d.eggEff, 0) / (devingAvg.length || 1),
                      },
                      {
                        segment: '🇹🇷 Türkiye',
                        meatEff: trRow?.meatEff || 0,
                        milkEff: trRow?.milkEff || 0,
                        eggEff: trRow?.eggEff || 0,
                      },
                    ];
                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={segData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="segment" stroke="var(--text-secondary)" />
                          <YAxis stroke="var(--text-secondary)" />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                          <Legend />
                          <Bar dataKey="meatEff" name="Et (kg/hayvan)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="milkEff" name="Süt (kg/inek)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="eggEff" name="Yumurta (÷100)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                    Yumurta değerleri görselleştirme için ÷100 ölçeklendirildi
                  </div>
                </div>

                {/* Efficiency Trends (World + Turkey lines) */}
                <div className="chart-card">
                  <h3 className="chart-title">📈 Verimlilik Trendleri: Türkiye vs Dünya (15 Yıl)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={efficiencyTrends} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="avgMeatEfficiency" stroke="#ef4444" strokeWidth={2} name="Dünya Et" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="avgMilkEfficiency" stroke="#3b82f6" strokeWidth={2} name="Dünya Süt" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="trMeatEfficiency" stroke="#ef4444" strokeWidth={3} strokeDasharray="6 3" name="🇹🇷 Et" dot={{ r: 4, fill: '#ef4444' }} />
                      <Line type="monotone" dataKey="trMilkEfficiency" stroke="#3b82f6" strokeWidth={3} strokeDasharray="6 3" name="🇹🇷 Süt" dot={{ r: 4, fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ padding: '12px 16px', marginTop: 12, background: 'rgba(59,130,246,0.1)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Düz çizgi = Dünya ortalaması • Kesikli çizgi = 🇹🇷 Türkiye
                  </div>
                </div>

                {/* Best Practices Panel: Top 10 Most Efficient */}
                <div className="chart-card">
                  <h3 className="chart-title">🏆 En Verimli 10 Ülke — Best Practices</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>#</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Ülke</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Segment</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#ef4444' }}>Et</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6' }}>Süt</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b' }}>Yumurta</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ort. Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effBestPractices.slice(0, 10).map((bp, i) => {
                          const isTR = bp.segment === 'Türkiye';
                          return (
                            <tr key={bp.country} style={{
                              borderBottom: '1px solid var(--border)',
                              background: isTR ? 'rgba(239,68,68,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                              fontWeight: isTR ? 700 : 400,
                            }}>
                              <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                              <td style={{ padding: '8px 12px' }}>{isTR ? '🇹🇷 ' : ''}{bp.country}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 12, fontSize: 11,
                                  background: bp.segment === 'Gelişmiş' ? 'rgba(59,130,246,0.15)' : bp.segment === 'Türkiye' ? 'rgba(239,68,68,0.15)' : 'rgba(156,163,175,0.15)',
                                  color: bp.segment === 'Gelişmiş' ? '#3b82f6' : bp.segment === 'Türkiye' ? '#ef4444' : '#9ca3af',
                                }}>{bp.segment}</span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{bp.meatEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{bp.milkEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{bp.eggEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{bp.avgEff.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                        {/* If Turkey not in top 10, add it */}
                        {!effBestPractices.slice(0, 10).some(bp => bp.segment === 'Türkiye') && (() => {
                          const trIdx = effBestPractices.findIndex(bp => bp.segment === 'Türkiye');
                          const tr = effBestPractices[trIdx];
                          if (!tr) return null;
                          return (
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239,68,68,0.08)', fontWeight: 700 }}>
                              <td style={{ padding: '8px 12px' }}>{trIdx + 1}</td>
                              <td style={{ padding: '8px 12px' }}>🇹🇷 {tr.country}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Türkiye</span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{tr.meatEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{tr.milkEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{tr.eggEff.toFixed(0)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{tr.avgEff.toFixed(0)}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Methodology Note */}
              <div style={{ margin: '16px 0', padding: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  💡 <strong>Verimlilik Metodolojisi:</strong> Et Verimi = Et Üretimi (ton) × 1000 / Sığır Stoku (baş). Süt Verimi = Süt Üretimi (ton) × 1000 / Sığır Stoku. Yumurta Verimi = Yumurta Üretimi (ton) × 1M / Tavuk Stoku (tahmini dönüşüm). <br/>
                  Catch-Up Calculator = CAGR bazlı logaritmik projeksiyon. Segmentasyon: G7 + OECD gelişmiş, diğerleri gelişmekte. Veriler FAO {selectedYear}.
                </div>
              </div>
            </>
          )}

          {/* PROCESSED PRODUCTS TAB */}
          {activeTab === 'processed' && processedKPIs && (
            <>
              {/* KPI Row */}
              <div className="kpi-grid">
                <div className="kpi-card large">
                  <div className="kpi-header"><span className="kpi-title">🏭 İŞLENMİŞ ÜRETİM</span></div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem', color: '#8b5cf6' }}>
                    {formatShort(processedKPIs.totalProduction)}
                  </div>
                  <div className="kpi-subtitle">
                    {processedKPIs.countryCount} ülke · {processedKPIs.productCount} ürün tipi
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE SIRASI</span>
                    <div className="kpi-icon red">#{processedKPIs.turkeyRank}</div>
                  </div>
                  <div className="kpi-value">{formatShort(processedKPIs.turkeyTotal)}</div>
                  <div className="kpi-subtitle">
                    Pay: %{processedKPIs.totalProduction > 0
                      ? ((processedKPIs.turkeyTotal / processedKPIs.totalProduction) * 100).toFixed(2) : '0'}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">🔄 İŞLEME ORANI</span></div>
                  <div className="kpi-value" style={{ color: processedKPIs.processingRate > 20 ? '#22c55e' : '#f59e0b' }}>
                    %{processedKPIs.processingRate.toFixed(1)}
                  </div>
                  <div className="kpi-subtitle">Ham süt → İşlenmiş ürün dönüşümü</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-header"><span className="kpi-title">📊 ÜRÜN ÇESİTLİLİĞİ</span></div>
                  <div className="kpi-value" style={{ color: '#06b6d4' }}>
                    {processedProductData.filter(p => p.turkeyVal > 0).length}
                  </div>
                  <div className="kpi-subtitle">Türkiye üretim yaptığı ürün sayısı / {processedKPIs.productCount}</div>
                </div>
              </div>

              {/* Insights */}
              {processedInsights.length > 0 && (
                <div style={{ marginTop: 15 }}>
                  <InsightCard insights={processedInsights} />
                </div>
              )}

              {/* Turkey Best Products */}
              <div className="chart-card" style={{ marginTop: 20 }}>
                <h3 className="chart-title">🇹🇷 Türkiye'nin Güçlü Olduğu İşlenmiş Ürünler</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15, padding: 15 }}>
                  {processedProductData.filter(p => p.turkeyRank > 0 && p.turkeyRank <= 20).sort((a, b) => a.turkeyRank - b.turkeyRank).slice(0, 8).map((p, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16,
                      border: `1px solid ${p.turkeyRank <= 5 ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: '1.5rem', fontWeight: 700,
                        color: p.turkeyRank <= 3 ? '#f59e0b' : p.turkeyRank <= 10 ? '#22c55e' : 'var(--text-primary)',
                        marginBottom: 5,
                      }}>#{p.turkeyRank}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, minHeight: 32 }}>
                        {translateProduct(p.product).length > 40 ? translateProduct(p.product).substring(0, 40) + '...' : translateProduct(p.product)}
                      </div>
                      <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '1.1rem' }}>{formatShort(p.turkeyVal)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Lider: {p.topCountry}
                      </div>
                      {p.total > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 8, transition: 'width .5s',
                              width: `${Math.min((p.turkeyVal / p.total) * 100 * 5, 100)}%`,
                              background: p.turkeyRank <= 5 ? '#22c55e' : '#3b82f6',
                            }} />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                            %{((p.turkeyVal / p.total) * 100).toFixed(1)} pay
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Row 1: Top 15 + Category Breakdown */}
              <div className="chart-grid" style={{ marginTop: 20 }}>
                <div className="chart-card">
                  <h3 className="chart-title">🏆 Top 15 İşlenmiş Ürün Üreticileri ({selectedYear})</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart
                      data={processedCountryData.slice(0, 15).map(c => ({
                        name: c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country,
                        dairy: c.dairy / 1e6, fats: c.fats / 1e6, other: c.other / 1e6,
                        isTR: c.country.includes('Türkiye') || c.country.toLowerCase().includes('turkey'),
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${Number(v).toFixed(0)}M`} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={95} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        formatter={(v: number, n: string) => [`${(v as number).toFixed(2)}M ton`, n === 'dairy' ? '🧀 Süt Ürünleri' : n === 'fats' ? '🫒 Yağlar' : '📦 Diğer']} />
                      <Legend formatter={(v: string) => v === 'dairy' ? '🧀 Süt Ürünleri' : v === 'fats' ? '🫒 Yağlar' : '📦 Diğer'} />
                      <Bar dataKey="dairy" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="fats" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="other" stackId="a" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">📊 Ürün CAGR & Yaşam Döngüsü (5 Yıllık)</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart
                      data={processedGrowthData.slice(0, 15).map(g => ({
                        name: translateProduct(g.product).length > 25 ? translateProduct(g.product).substring(0, 25) + '..' : translateProduct(g.product),
                        cagr: g.cagr,
                        fill: g.cagr > 5 ? '#22c55e' : g.cagr > 0 ? '#3b82f6' : g.cagr > -3 ? '#f59e0b' : '#ef4444',
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${Number(v).toFixed(1)}%`} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={155} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        formatter={(v: number) => [`%${(v as number).toFixed(2)} CAGR`, 'Büyüme']} />
                      {processedGrowthData.slice(0, 15).map((g, i) => (
                        <Bar key={i} dataKey="cagr" fill={g.cagr > 5 ? '#22c55e' : g.cagr > 0 ? '#3b82f6' : g.cagr > -3 ? '#f59e0b' : '#ef4444'} />
                      ))}
                      <Bar dataKey="cagr" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Turkey Trend */}
              <div className="chart-card" style={{ marginTop: 20 }}>
                <h3 className="chart-title">📈 Türkiye İşlenmiş Ürün Trendi (Tüm Yıllar)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={processedTurkeyTrend} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${(Number(v) / 1e6).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      formatter={(v: number, n: string) => [formatNumber(v) + ' ton', n === 'dairy' ? '🧀 Süt Ürünleri' : n === 'fats' ? '🫒 Yağlar' : '📦 Diğer']} />
                    <Legend formatter={(v: string) => v === 'dairy' ? '🧀 Süt Ürünleri' : v === 'fats' ? '🫒 Yağlar' : '📦 Diğer'} />
                    <Area type="monotone" dataKey="dairy" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                    <Area type="monotone" dataKey="fats" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="other" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Product Rankings Table */}
              <div className="chart-card" style={{ marginTop: 20 }}>
                <h3 className="chart-title">🏭 Tüm İşlenmiş Ürünler – Dünya & Türkiye ({selectedYear})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                        {['Ürün', 'Dünya Toplam', 'Lider Ülke', 'TR Üretim', 'TR Sıra', 'TR Pay', 'Yaşam Döngüsü'].map(h => (
                          <th key={h} style={{
                            padding: 12,
                            textAlign: h === 'Ürün' || h === 'Lider Ülke' ? 'left' : h === 'Yaşam Döngüsü' ? 'center' : 'right',
                            borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedProductData.map((p, i) => {
                        const growth = processedGrowthData.find(g => g.product === p.product);
                        return (
                          <tr key={i} style={{
                            borderBottom: '1px solid var(--border)',
                            background: p.turkeyRank > 0 && p.turkeyRank <= 5 ? 'rgba(34,197,94,.05)' : 'transparent',
                          }}>
                            <td style={{ padding: 12, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {translateProduct(p.product)}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatShort(p.total)}</td>
                            <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{p.topCountry}</td>
                            <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: p.turkeyVal > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                              {p.turkeyVal > 0 ? formatShort(p.turkeyVal) : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              {p.turkeyRank > 0 && p.turkeyRank < 999 ? (
                                <span style={{
                                  padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                                  background: p.turkeyRank <= 5 ? 'rgba(34,197,94,.2)' : p.turkeyRank <= 15 ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.05)',
                                  color: p.turkeyRank <= 5 ? '#22c55e' : p.turkeyRank <= 15 ? '#3b82f6' : 'var(--text-secondary)',
                                }}>#{p.turkeyRank}</span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {p.turkeyVal > 0 && p.total > 0 ? `%${((p.turkeyVal / p.total) * 100).toFixed(2)}` : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'center', fontSize: '0.85rem' }}>
                              {growth ? (
                                <span style={{
                                  padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem',
                                  background: growth.cagr > 3 ? 'rgba(34,197,94,.15)' : growth.cagr > 0 ? 'rgba(59,130,246,.15)' : growth.cagr > -3 ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)',
                                  color: growth.cagr > 3 ? '#22c55e' : growth.cagr > 0 ? '#3b82f6' : growth.cagr > -3 ? '#f59e0b' : '#ef4444',
                                }}>
                                  {growth.lifecycle} {growth.cagr > 0 ? '+' : ''}{growth.cagr.toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  marginTop: 15, padding: 15, background: 'rgba(139,92,246,.1)', borderRadius: 8,
                  border: '1px solid rgba(139,92,246,.3)'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    💡 <strong>Not:</strong> İşlenmiş ürünler peynir, tereyağı, yoğurt, süt tozu, hayvansal yağlar ve ipek gibi katma değerli ürünleri kapsar.
                    Veri kaynağı: FAO · fao_uretim_hayvansal_islenmis ({processedProductData.length} ürün, 2000-2023)
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
