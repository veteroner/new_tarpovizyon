import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ScatterChart, Scatter, ZAxis, Legend, LineChart, Line
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';

interface Props {
  selectedYear: string;
  setLoading: (v: boolean) => void;
}

export default function LivestockEfficiencySection({ selectedYear, setLoading }: Props) {
  const [, setEfficiencyData] = useState<Array<{
    country: string; meatEfficiency: number | null; milkEfficiency: number | null; eggEfficiency: number | null;
  }>>([]);
  const [efficiencyTrends, setEfficiencyTrends] = useState<Array<{
    year: number; avgMeatEfficiency: number; avgMilkEfficiency: number; avgEggEfficiency: number;
    trMeatEfficiency?: number; trMilkEfficiency?: number; trEggEfficiency?: number;
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

  const loadEfficiencyData = useCallback(async () => {
    setLoading(true);
    try {
      const excludedAreas = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";
      const yr = parseInt(selectedYear);

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

      const q3 = `
        SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_prod
        FROM fao_uretim_hayvansal_birincil
        WHERE year='${yr}' AND ulkead NOT IN ${excludedAreas} AND uretim_birim='t'
        GROUP BY ulkead ORDER BY total_prod DESC`;

      const [r1, r2, r3] = await Promise.all([fetchQuery(q1), fetchQuery(q2), fetchQuery(q3)]);

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

      const turkey = allCountries.find(d => d.raw === 'Türkiye') || { country: 'Türkiye', raw: 'Türkiye', meatEff: 0, milkEff: 0, eggEff: 0 };

      const meatSorted = [...allCountries].filter(d => d.meatEff > 0).sort((a, b) => b.meatEff - a.meatEff);
      const milkSorted = [...allCountries].filter(d => d.milkEff > 0).sort((a, b) => b.milkEff - a.milkEff);
      const eggSorted = [...allCountries].filter(d => d.eggEff > 0).sort((a, b) => b.eggEff - a.eggEff);

      const trMeatRank = meatSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;
      const trMilkRank = milkSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;
      const trEggRank = eggSorted.findIndex(d => d.raw === 'Türkiye') + 1 || allCountries.length;

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

      // Turkey trend CAGR
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
        return Math.ceil(Math.log(leaderVal / trVal) / Math.log(1 + trCAGR / 100));
      };

      const gap = [
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

      // Scatter data
      const prodMap: Record<string, number> = {};
      (r3.data || []).forEach((row: R) => {
        prodMap[String(row.ulkead)] = Number(row.total_prod) || 0;
      });
      const scatter = allCountries.map(d => ({
        country: d.country, meatEff: d.meatEff, milkEff: d.milkEff, eggEff: d.eggEff,
        totalProd: prodMap[d.raw] || 0, isTurkey: d.raw === 'Türkiye',
      })).filter(d => d.totalProd > 0).sort((a, b) => b.totalProd - a.totalProd).slice(0, 50);
      setEffScatterData(scatter);

      // Best practices
      const developed = ['United States of America','Germany','France','Netherlands','Denmark','United Kingdom of Great Britain and Northern Ireland','Japan','Australia','Canada','New Zealand','Israel','Switzerland','Austria','Belgium','Sweden','Norway','Finland','Ireland','Italy','Spain'];
      const best = allCountries.map(d => {
        const avg = ((d.meatEff > 0 ? d.meatEff : 0) + (d.milkEff > 0 ? d.milkEff : 0) + (d.eggEff > 0 ? d.eggEff / 100 : 0)) / 3;
        const seg = developed.includes(d.raw) ? 'Gelişmiş' : d.raw === 'Türkiye' ? 'Türkiye' : 'Gelişmekte';
        return { country: d.country, meatEff: d.meatEff, milkEff: d.milkEff, eggEff: d.eggEff, avgEff: avg, segment: seg };
      }).sort((a, b) => b.avgEff - a.avgEff);
      setEffBestPractices(best);

      // Trends
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

      // Insights
      const ins: Insight[] = [];
      if (turkey.meatEff > avgMeat) ins.push({ id: 'eff-1', type: 'achievement', message: `Türkiye et verimi (${turkey.meatEff.toFixed(0)} kg/hayvan) dünya ortalamasının (${avgMeat.toFixed(0)}) %${((turkey.meatEff - avgMeat) / avgMeat * 100).toFixed(0)} üzerinde`, severity: 'medium' });
      else ins.push({ id: 'eff-1', type: 'warning', message: `Türkiye et verimi (${turkey.meatEff.toFixed(0)} kg/hayvan) dünya ortalamasının (${avgMeat.toFixed(0)}) %${Math.abs((turkey.meatEff - avgMeat) / avgMeat * 100).toFixed(0)} altında`, severity: 'high' });

      if (turkey.milkEff > avgMilk) ins.push({ id: 'eff-2', type: 'achievement', message: `Türkiye süt verimi (${turkey.milkEff.toFixed(0)} kg/inek) dünya ortalamasını (${avgMilk.toFixed(0)}) geçiyor`, severity: 'medium' });
      else ins.push({ id: 'eff-2', type: 'decline', message: `Türkiye süt verimi (${turkey.milkEff.toFixed(0)} kg/inek) dünya ortalamasının (${avgMilk.toFixed(0)}) altında`, severity: 'high' });

      if (turkey.eggEff > avgEgg) ins.push({ id: 'eff-3', type: 'achievement', message: `Türkiye yumurta verimi (${turkey.eggEff.toFixed(0)} adet/tavuk) dünya ortalamasının üzerinde`, severity: 'low' });
      else ins.push({ id: 'eff-3', type: 'warning', message: `Türkiye yumurta verimi (${turkey.eggEff.toFixed(0)} adet/tavuk) dünya ortalamasının (${avgEgg.toFixed(0)}) altında`, severity: 'medium' });

      if (trMeatCAGR > 3) ins.push({ id: 'eff-4', type: 'growth', message: `Türkiye et verimi yıllık %${trMeatCAGR.toFixed(1)} büyüyor — hızlı iyileşme trendi`, severity: 'low' });
      if (trMilkCAGR > 3) ins.push({ id: 'eff-5', type: 'growth', message: `Türkiye süt verimi yıllık %${trMilkCAGR.toFixed(1)} büyüyor — modern hayvancılık etkisi`, severity: 'low' });

      gap.forEach((g, i) => {
        if (g.catchUpYears && g.catchUpYears < 15) {
          ins.push({ id: `eff-gap-${i}`, type: 'info', message: `${g.category}: Mevcut büyüme hızıyla ${g.leaderCountry}'yi ${g.catchUpYears} yılda yakalama potansiyeli`, severity: 'medium' });
        } else if (g.catchUpYears && g.catchUpYears > 50) {
          ins.push({ id: `eff-gap-${i}`, type: 'decline', message: `${g.category}: ${g.leaderCountry} ile arayı kapatmak mevcut hızla ${g.catchUpYears}+ yıl sürer — yapısal reform gerekli`, severity: 'high' });
        }
      });

      if (best.length > 0) {
        ins.push({ id: 'eff-best', type: 'info', message: `En verimli ülke: ${best[0].country} — ortalama verimlilik skoru ${best[0].avgEff.toFixed(0)}`, severity: 'low' });
      }

      setEffInsights(ins);
    } catch (error) {
      console.error('Efficiency data error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, setLoading]);

  useEffect(() => {
    loadEfficiencyData();
  }, [loadEfficiencyData]);

  if (!effKPIs) return null;

  return (
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
      {effInsights.length > 0 && <InsightCard insights={effInsights} />}

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
        {/* Efficiency Scatter */}
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

        {/* Segmented Analysis */}
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

        {/* Efficiency Trends */}
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

        {/* Best Practices Table */}
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

      {/* Methodology */}
      <div style={{ margin: '16px 0', padding: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          💡 <strong>Verimlilik Metodolojisi:</strong> Et Verimi = Et Üretimi (ton) × 1000 / Sığır Stoku (baş). Süt Verimi = Süt Üretimi (ton) × 1000 / Sığır Stoku. Yumurta Verimi = Yumurta Üretimi (ton) × 1M / Tavuk Stoku (tahmini dönüşüm). <br/>
          Catch-Up Calculator = CAGR bazlı logaritmik projeksiyon. Segmentasyon: G7 + OECD gelişmiş, diğerleri gelişmekte. Veriler FAO {selectedYear}.
        </div>
      </div>
    </>
  );
}
