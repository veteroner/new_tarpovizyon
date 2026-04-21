import { useEffect, useState, useCallback, useMemo } from 'react';
import { translateCountry } from '../../utils/countryTranslations';
import { fetchQuery } from '../../services/api';
import type { Insight } from '../../components/InsightCard';
import { calculateHHI } from '../../utils/livestockCalculations';

/* ── Types ─────────────────────────────────────────────────── */
export interface CountryProduction {
  country: string;
  countryRaw: string;
  meat: number;
  milk: number;
  eggs: number;
  total: number;
}

/* ── Helpers ───────────────────────────────────────────────── */
export const isTR = (name: string) =>
  name.includes('Türkiye') || name.toLowerCase().includes('turkey');

const cagr5 = (cur: number, past: number) =>
  past > 0 ? (Math.pow(cur / past, 1 / 5) - 1) * 100 : 0;

/* ── SQL fragments ─────────────────────────────────────────── */
const MEAT_COND = "(urunad LIKE '%Meat%' OR urunad LIKE '%meat%')";
const MILK_COND = "(urunad LIKE '%milk%' OR urunad LIKE '%Milk%')";
const EGG_COND  = "(urunad LIKE '%egg%' OR urunad LIKE '%Egg%')";

function rankingSQL(year: string) {
  return `
    SELECT ulkead,
      SUM(CASE WHEN ${MEAT_COND} THEN uretim_deger ELSE 0 END) as meat,
      SUM(CASE WHEN ${MILK_COND} THEN uretim_deger ELSE 0 END) as milk,
      SUM(CASE WHEN ${EGG_COND}  THEN uretim_deger ELSE 0 END) as eggs,
      SUM(uretim_deger) as total
    FROM fao_uretim_hayvansal_birincil
    WHERE uretim_birim='t' AND year='${year}'
    GROUP BY ulkead ORDER BY total DESC`;
}

/* ── Hook ──────────────────────────────────────────────────── */
export function useLivestockCompetitionData() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentRankings, setCurrentRankings] = useState<CountryProduction[]>([]);
  const [pastRankings, setPastRankings] = useState<CountryProduction[]>([]);
  const [turkeyTrend, setTurkeyTrend] = useState<{ year: string; meat: number; milk: number; eggs: number }[]>([]);
  const [marketEvolution, setMarketEvolution] = useState<Record<string, Record<string, number>>>({});
  const [insights, setInsights] = useState<Insight[]>([]);

  /* ── year detect ─────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const [maxRes, yrsRes] = await Promise.all([
        fetchQuery("SELECT MAX(year) as mx FROM fao_uretim_hayvansal_birincil"),
        fetchQuery("SELECT DISTINCT year FROM fao_uretim_hayvansal_birincil ORDER BY year DESC LIMIT 25"),
      ]);
      const mx = String(maxRes.data?.[0]?.mx || '2022');
      setAvailableYears((yrsRes.data || []).map((d: Record<string, unknown>) => String(d.year)));
      setSelectedYear(mx);
    })();
  }, []);

  /* ── data loader ─────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const pastYear = String(parseInt(selectedYear) - 5);
      const [curRes, pastRes, trendRes, evoRes] = await Promise.all([
        fetchQuery(rankingSQL(selectedYear)),
        fetchQuery(rankingSQL(pastYear)),
        fetchQuery(`
          SELECT year,
            SUM(CASE WHEN ${MEAT_COND} THEN uretim_deger ELSE 0 END) as meat,
            SUM(CASE WHEN ${MILK_COND} THEN uretim_deger ELSE 0 END) as milk,
            SUM(CASE WHEN ${EGG_COND}  THEN uretim_deger ELSE 0 END) as eggs
          FROM fao_uretim_hayvansal_birincil
          WHERE ulkead='Türkiye' AND uretim_birim='t'
          GROUP BY year ORDER BY year`),
        fetchQuery(`
          SELECT year, ulkead, SUM(uretim_deger) as toplam
          FROM fao_uretim_hayvansal_birincil
          WHERE uretim_birim='t' AND year >= '2010'
          GROUP BY year, ulkead ORDER BY year`),
      ]);

      const parse = (rows: Record<string, string | number>[]): CountryProduction[] =>
        (rows || [])
          .map(d => ({
            countryRaw: String(d.ulkead || ''),
            country: translateCountry(String(d.ulkead || '')),
            meat: parseFloat(String(d.meat || 0)),
            milk: parseFloat(String(d.milk || 0)),
            eggs: parseFloat(String(d.eggs || 0)),
            total: parseFloat(String(d.total || 0)),
          }))
          .filter(c => c.total > 0);

      const cur = parse(curRes.data || []);
      const past = parse(pastRes.data || []);
      const trend = (trendRes.data || []).map((d: Record<string, unknown>) => ({
        year: String(d.year),
        meat: parseFloat(String(d.meat || 0)),
        milk: parseFloat(String(d.milk || 0)),
        eggs: parseFloat(String(d.eggs || 0)),
      }));

      const evo: Record<string, Record<string, number>> = {};
      (evoRes.data || []).forEach((d: Record<string, unknown>) => {
        const y = String(d.year);
        const c = translateCountry(String(d.ulkead || ''));
        if (!evo[y]) evo[y] = {};
        evo[y][c] = parseFloat(String(d.toplam || 0));
      });

      setCurrentRankings(cur);
      setPastRankings(past);
      setTurkeyTrend(trend);
      setMarketEvolution(evo);
      buildInsights(cur, past);
    } catch (e) {
      console.error('Competition data load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { if (selectedYear) loadData(); }, [loadData, selectedYear]);

  /* ── insight builder ─────────────────────────────────────── */
  const buildInsights = (cur: CountryProduction[], past: CountryProduction[]) => {
    const out: Insight[] = [];
    let id = 0;
    const tr = cur.find(c => isTR(c.country));
    const trPast = past.find(c => isTR(c.country));
    const trRank = tr ? cur.indexOf(tr) + 1 : 0;
    const trPastRank = trPast ? past.indexOf(trPast) + 1 : 0;

    if (trRank && trPastRank) {
      const chg = trPastRank - trRank;
      if (chg > 0) out.push({ id: `ci${id++}`, type: 'achievement', severity: 'high',
        message: `Türkiye toplam hayvansal üretim sıralamasında ${chg} basamak yükseldi (#${trPastRank} → #${trRank})`, category: 'SIRALAMA' });
      else if (chg < 0) out.push({ id: `ci${id++}`, type: 'decline', severity: 'high',
        message: `Türkiye sıralamada ${Math.abs(chg)} basamak geriledi (#${trPastRank} → #${trRank})`, category: 'SIRALAMA' });
    }

    if (tr && trPast && trPast.total > 0) {
      const g = cagr5(tr.total, trPast.total);
      if (g > 3) out.push({ id: `ci${id++}`, type: 'growth', severity: 'medium',
        message: `Türkiye toplam hayvansal üretimde %${g.toFixed(1)} BBO ile güçlü büyüyor`, category: 'BÜYÜME' });
      else if (g < -1) out.push({ id: `ci${id++}`, type: 'decline', severity: 'medium',
        message: `Türkiye toplam üretimde %${Math.abs(g).toFixed(1)} yıllık daralma yaşıyor`, category: 'DÜŞÜŞ' });
    }

    if (cur.length > 0) {
      const wt = cur.reduce((s, c) => s + c.total, 0);
      const t1 = (cur[0].total / wt) * 100;
      if (t1 > 20) out.push({ id: `ci${id++}`, type: 'warning', severity: 'medium',
        message: `${cur[0].country} dünya hayvansal üretiminin %${t1.toFixed(1)}'ini kontrol ediyor – konsantrasyon riski`, category: 'PAZAR' });
    }

    if (tr) {
      const cats: [string, (c: CountryProduction) => number][] = [
        ['Süt', c => c.milk], ['Et', c => c.meat], ['Yumurta', c => c.eggs]];
      const best = cats.map(([n, fn]) => {
        const sorted = [...cur].sort((a, b) => fn(b) - fn(a));
        return { name: n, rank: sorted.findIndex(c => c.country === tr.country) + 1 };
      }).sort((a, b) => a.rank - b.rank);
      if (best[0].rank <= 15)
        out.push({ id: `ci${id++}`, type: 'achievement', severity: 'medium',
          message: `Türkiye ${best[0].name} üretiminde dünya #${best[0].rank} – en güçlü kategori`, category: 'REKABET' });
    }

    const growths = cur.slice(0, 30).map(c => {
      const p = past.find(pp => pp.country === c.country);
      if (!p || p.total === 0) return null;
      return { country: c.country, cagr: cagr5(c.total, p.total), total: c.total };
    }).filter((g): g is NonNullable<typeof g> => g != null && g.total > 1e6)
      .sort((a, b) => b.cagr - a.cagr);

    if (growths[0]?.cagr > 5)
      out.push({ id: `ci${id++}`, type: 'info', severity: 'medium',
        message: `En hızlı büyüyen: ${growths[0].country} (%${growths[0].cagr.toFixed(1)} BBO) – yükselen pazar`, category: 'TREND' });

    if (tr && cur[0] && !isTR(cur[0].country)) {
      const lp = past.find(p => p.country === cur[0].country);
      if (trPast && trPast.total > 0 && lp && lp.total > 0) {
        const tg = Math.pow(tr.total / trPast.total, 1 / 5) - 1;
        const lg = Math.pow(cur[0].total / lp.total, 1 / 5) - 1;
        if (tg > lg && tg > 0) {
          const yrs = Math.log(cur[0].total / tr.total) / Math.log((1 + tg) / (1 + lg));
          if (yrs > 0 && yrs < 200)
            out.push({ id: `ci${id}`, type: 'info', severity: 'low',
              message: `Mevcut büyüme hızıyla Türkiye ${cur[0].country}'yı ~${Math.ceil(yrs)} yılda yakalayabilir`, category: 'TAHMİN' });
        }
      }
    }

    setInsights(out);
  };

  /* ── derived data ────────────────────────────────────────── */
  const turkeyData = useMemo(() => currentRankings.find(c => isTR(c.country)), [currentRankings]);
  const turkeyPast = useMemo(() => pastRankings.find(c => isTR(c.country)), [pastRankings]);

  const rnk = useMemo(() => {
    if (!turkeyData) return { total: 0, meat: 0, milk: 0, eggs: 0 };
    const r = (key: 'meat' | 'milk' | 'eggs') => {
      const sorted = [...currentRankings].sort((a, b) => b[key] - a[key]);
      return sorted.findIndex(c => c.country === turkeyData.country) + 1;
    };
    return { total: currentRankings.indexOf(turkeyData) + 1, meat: r('meat'), milk: r('milk'), eggs: r('eggs') };
  }, [currentRankings, turkeyData]);

  const pRnk = useMemo(() => {
    if (!turkeyPast) return { total: 0, meat: 0, milk: 0, eggs: 0 };
    const r = (key: 'meat' | 'milk' | 'eggs') => {
      const sorted = [...pastRankings].sort((a, b) => b[key] - a[key]);
      return sorted.findIndex(c => c.country === turkeyPast.country) + 1;
    };
    return { total: pastRankings.indexOf(turkeyPast) + 1, meat: r('meat'), milk: r('milk'), eggs: r('eggs') };
  }, [pastRankings, turkeyPast]);

  const trCagr = useMemo(() => {
    if (!turkeyData || !turkeyPast) return { meat: 0, milk: 0, eggs: 0, total: 0 };
    return {
      meat: cagr5(turkeyData.meat, turkeyPast.meat),
      milk: cagr5(turkeyData.milk, turkeyPast.milk),
      eggs: cagr5(turkeyData.eggs, turkeyPast.eggs),
      total: cagr5(turkeyData.total, turkeyPast.total),
    };
  }, [turkeyData, turkeyPast]);

  const world = useMemo(() => ({
    meat: currentRankings.reduce((s, c) => s + c.meat, 0),
    milk: currentRankings.reduce((s, c) => s + c.milk, 0),
    eggs: currentRankings.reduce((s, c) => s + c.eggs, 0),
    total: currentRankings.reduce((s, c) => s + c.total, 0),
  }), [currentRankings]);

  const hhi = useMemo(() =>
    currentRankings.length > 0
      ? calculateHHI(currentRankings.map(c => c.total))
      : { hhi: 0, concentration: 'LOW' as const, top1Share: 0, top3Share: 0, top5Share: 0, effectiveCompetitors: 0 },
  [currentRankings]);

  const mktShareChart = useMemo(() => {
    const top8 = currentRankings.slice(0, 8).map(c => c.country);
    const trName = turkeyData?.country || 'Türkiye';
    if (!top8.includes(trName)) top8.push(trName);
    const years = Object.keys(marketEvolution).sort();
    return years.map(yr => {
      const ct = marketEvolution[yr] || {};
      const wt = Object.values(ct).reduce((s, v) => s + v, 0);
      const row: Record<string, number | string> = { year: yr };
      top8.forEach(c => { row[c] = wt > 0 ? ((ct[c] || 0) / wt) * 100 : 0; });
      const s8 = top8.reduce((s, c) => s + (ct[c] || 0), 0);
      row['Diğer'] = wt > 0 ? ((wt - s8) / wt) * 100 : 0;
      return row;
    });
  }, [currentRankings, marketEvolution, turkeyData]);

  const bcgData = useMemo(() => {
    if (!currentRankings.length || !pastRankings.length) return [];
    const wt = world.total;
    return currentRankings.slice(0, 30).map(c => {
      const p = pastRankings.find(pp => pp.country === c.country);
      const share = wt > 0 ? (c.total / wt) * 100 : 0;
      const growth = p && p.total > 0 ? cagr5(c.total, p.total) : 0;
      return {
        country: c.country.length > 14 ? c.country.substring(0, 14) + '..' : c.country,
        fullName: c.country, share, cagr: growth,
        size: Math.max(Math.sqrt(c.total / 1e6) * 2, 5),
        isTurkey: isTR(c.country),
      };
    }).filter(d => d.share > 0.1);
  }, [currentRankings, pastRankings, world]);

  const rivals = useMemo(() => {
    if (!turkeyData) return [];
    const idx = currentRankings.indexOf(turkeyData);
    if (idx < 0) return [];
    const s = Math.max(0, idx - 5), e = Math.min(currentRankings.length, idx + 6);
    return currentRankings.slice(s, e).map((c, i) => {
      const rk = s + i + 1;
      const p = pastRankings.find(pp => pp.country === c.country);
      const prk = p ? pastRankings.indexOf(p) + 1 : 0;
      return { ...c, rank: rk, pastRank: prk, rankChg: prk > 0 ? prk - rk : 0,
        cagr: p && p.total > 0 ? cagr5(c.total, p.total) : 0,
        gap: c.total - (turkeyData.total), isTurkey: isTR(c.country) };
    });
  }, [currentRankings, pastRankings, turkeyData]);

  const catchUp = useMemo(() => {
    if (!turkeyData || !turkeyPast) return [];
    const cats: { name: string; emoji: string; key: 'meat' | 'milk' | 'eggs' }[] = [
      { name: 'Et', emoji: '🥩', key: 'meat' },
      { name: 'Süt', emoji: '🥛', key: 'milk' },
      { name: 'Yumurta', emoji: '🥚', key: 'eggs' },
    ];
    return cats.map(cat => {
      const ranked = [...currentRankings].sort((a, b) => b[cat.key] - a[cat.key]);
      const leader = ranked[0];
      if (!leader) return null;
      const lp = pastRankings.find(p => p.country === leader.country);
      const tCagr = turkeyPast[cat.key] > 0 ? Math.pow(turkeyData[cat.key] / turkeyPast[cat.key], 1 / 5) - 1 : 0;
      const lCagr = lp && lp[cat.key] > 0 ? Math.pow(leader[cat.key] / lp[cat.key], 1 / 5) - 1 : 0;
      let yrs: number | null = null;
      if (tCagr > lCagr && tCagr > 0 && leader[cat.key] > turkeyData[cat.key]) {
        const v = Math.log(leader[cat.key] / turkeyData[cat.key]) / Math.log((1 + tCagr) / (1 + lCagr));
        if (v > 0 && v < 200) yrs = Math.ceil(v);
      }
      const trRank = ranked.findIndex(c => isTR(c.country)) + 1;
      return { ...cat, leader: leader.country, leaderVal: leader[cat.key], trVal: turkeyData[cat.key],
        gap: leader[cat.key] - turkeyData[cat.key], tCagr: tCagr * 100, lCagr: lCagr * 100, yrs, trRank };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [currentRankings, pastRankings, turkeyData, turkeyPast]);

  const radarData = useMemo(() => {
    if (!turkeyData || currentRankings.length < 2) return [];
    const top2 = currentRankings.slice(0, 2);
    const mx = (key: 'meat' | 'milk' | 'eggs') =>
      Math.max(...top2.map(c => c[key]), turkeyData[key]) || 1;
    const norm = (v: number, m: number) => (v / m) * 100;
    return [
      { subject: 'Et', Türkiye: norm(turkeyData.meat, mx('meat')), [top2[0].country]: norm(top2[0].meat, mx('meat')), [top2[1].country]: norm(top2[1].meat, mx('meat')) },
      { subject: 'Süt', Türkiye: norm(turkeyData.milk, mx('milk')), [top2[0].country]: norm(top2[0].milk, mx('milk')), [top2[1].country]: norm(top2[1].milk, mx('milk')) },
      { subject: 'Yumurta', Türkiye: norm(turkeyData.eggs, mx('eggs')), [top2[0].country]: norm(top2[0].eggs, mx('eggs')), [top2[1].country]: norm(top2[1].eggs, mx('eggs')) },
    ];
  }, [currentRankings, turkeyData]);

  const top2 = useMemo(() => currentRankings.slice(0, 2), [currentRankings]);

  return {
    loading,
    selectedYear, setSelectedYear, availableYears,
    currentRankings, pastRankings, turkeyTrend, insights,
    turkeyData, rnk, pRnk, trCagr, world, hhi,
    mktShareChart, bcgData, rivals, catchUp, radarData, top2,
  };
}
