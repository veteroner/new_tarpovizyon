import { useEffect, useState, useCallback, useMemo } from 'react';
import { translateCountry } from '../utils/countryTranslations';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';
import { InsightCard } from '../components/InsightCard';
import type { Insight } from '../components/InsightCard';
import { calculateHHI } from '../utils/livestockCalculations';

/* ── Color constants ───────────────────────────────────────── */
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
const TURKEY_COLOR = '#ef4444';
const POS = '#22c55e';
const NEG = '#ef4444';
const NEUT = '#f59e0b';

/* ── Types ─────────────────────────────────────────────────── */
interface CountryProduction {
  country: string;
  countryRaw: string;
  meat: number;
  milk: number;
  eggs: number;
  total: number;
}

/* ── Helpers ───────────────────────────────────────────────── */
function fmtVal(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

const isTR = (name: string) =>
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

/* ══════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function LivestockCompetitionPage() {
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
      setAvailableYears((yrsRes.data || []).map(d => String(d.year)));
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
          .filter(d => d.total > 0)
          .sort((a, b) => b.total - a.total);

      const cur = parse(curRes.data || []);
      const past = parse(pastRes.data || []);

      const trend = (trendRes.data || []).map(d => ({
        year: String(d.year),
        meat: parseFloat(String(d.meat || 0)),
        milk: parseFloat(String(d.milk || 0)),
        eggs: parseFloat(String(d.eggs || 0)),
      }));

      const evo: Record<string, Record<string, number>> = {};
      (evoRes.data || []).forEach(d => {
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

  /* ── derived data (useMemo) ──────────────────────────────── */
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

  /* market share evolution chart */
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

  /* BCG matrix */
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

  /* nearest rivals */
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

  /* catch-up analysis */
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

  /* radar */
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

  /* ── render helpers ──────────────────────────────────────── */
  const rankBadge = (chg: number) =>
    chg > 0 ? <span style={{ color: POS }}>▲{chg}</span>
    : chg < 0 ? <span style={{ color: NEG }}>▼{Math.abs(chg)}</span>
    : <span style={{ color: NEUT }}>━</span>;

  const cagrBadge = (v: number) => (
    <span style={{
      padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
      background: v > 0 ? 'rgba(34,197,94,.2)' : v < 0 ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)',
      color: v > 0 ? POS : v < 0 ? NEG : NEUT,
    }}>
      {v > 0 ? '↑' : v < 0 ? '↓' : '→'} {Math.abs(v).toFixed(1)}% BBO
    </span>
  );

  /* ── loading ─────────────────────────────────────────────── */
  if (loading) return <Loading />;

  const top2 = currentRankings.slice(0, 2);

  /* ══════════  JSX  ══════════ */
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">🏆 Rekabet Analizi</h1>
        <p className="page-subtitle">
          Türkiye'nin dünya hayvansal üretimindeki stratejik konumu · FAO verileri · {selectedYear}
        </p>
      </div>

      {/* ── Year Selector ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {availableYears.slice(0, 15).map(y => (
          <button key={y} onClick={() => setSelectedYear(y)} style={{
            padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
            border: selectedYear === y ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: selectedYear === y ? 'rgba(99,102,241,.2)' : 'var(--bg-card)',
            color: selectedYear === y ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: selectedYear === y ? 700 : 400,
          }}>{y}</button>
        ))}
      </div>

      {/* ── KPI Row 1 – Turkey basics ──────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE TOPLAM ÜRETİM</span></div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: TURKEY_COLOR }}>
            {turkeyData ? fmtVal(turkeyData.total) : 'N/A'}
          </div>
          <div className="kpi-subtitle">
            Et + Süt + Yumurta · Dünya #{rnk.total} {rankBadge(pRnk.total - rnk.total)}
          </div>
          <div style={{ marginTop: 8 }}>{cagrBadge(trCagr.total)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥩 ET SIRALAMASI</span><div className="kpi-icon red">#{rnk.meat}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.meat) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.meat - rnk.meat)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.meat)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥛 SÜT SIRALAMASI</span><div className="kpi-icon blue">#{rnk.milk}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.milk) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.milk - rnk.milk)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.milk)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥚 YUMURTA SIRALAMASI</span><div className="kpi-icon orange">#{rnk.eggs}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.eggs) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.eggs - rnk.eggs)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.eggs)}</div>
        </div>
      </div>

      {/* ── KPI Row 2 – Intelligence metrics ───────────────── */}
      <div className="kpi-grid" style={{ marginTop: 15 }}>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">📊 PAZAR PAYI</span></div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            %{turkeyData && world.total > 0 ? ((turkeyData.total / world.total) * 100).toFixed(2) : '0'}
          </div>
          <div className="kpi-subtitle">Dünya toplam hayvansal üretim payı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🎯 HHI KONSANTRASYON</span></div>
          <div className="kpi-value" style={{
            color: hhi.concentration === 'VERY_HIGH' ? NEG : hhi.concentration === 'HIGH' ? NEUT : POS
          }}>{hhi.hhi.toFixed(0)}</div>
          <div className="kpi-subtitle">
            {hhi.concentration === 'LOW' ? '✅ Rekabetçi' : hhi.concentration === 'MODERATE' ? '⚠️ Orta' : hhi.concentration === 'HIGH' ? '🟡 Yüksek' : '🔴 Çok yüksek'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">📈 TOP 3 PAY</span></div>
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>%{hhi.top3Share.toFixed(1)}</div>
          <div className="kpi-subtitle">En büyük 3 üreticinin payı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🌍 ETKİN RAKİP</span></div>
          <div className="kpi-value" style={{ color: '#06b6d4' }}>{hhi.effectiveCompetitors.toFixed(1)}</div>
          <div className="kpi-subtitle">{currentRankings.length} ülke arasında</div>
        </div>
      </div>

      {/* ── Turkey Share ───────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🇹🇷 Türkiye'nin Dünya Payı ({selectedYear})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, padding: 15 }}>
          {([
            { label: 'Et Üretimi', val: turkeyData?.meat || 0, w: world.meat, color: '#ef4444', emoji: '🥩' },
            { label: 'Süt Üretimi', val: turkeyData?.milk || 0, w: world.milk, color: '#3b82f6', emoji: '🥛' },
            { label: 'Yumurta Üretimi', val: turkeyData?.eggs || 0, w: world.eggs, color: '#f59e0b', emoji: '🥚' },
          ]).map((it, i) => {
            const pct = it.w > 0 ? (it.val / it.w) * 100 : 0;
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 20, textAlign: 'center',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 5 }}>{it.emoji}</div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: '0.85rem' }}>{it.label}</h4>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: it.color }}>%{pct.toFixed(2)}</div>
                <div style={{ marginTop: 10, background: 'rgba(255,255,255,.05)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct * 5, 100)}%`, background: it.color, borderRadius: 8, transition: 'width .5s' }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  {fmtVal(it.val)} / {fmtVal(it.w)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Insights ───────────────────────────────────────── */}
      {insights.length > 0 && <div style={{ marginTop: 20 }}><InsightCard insights={insights} /></div>}

      {/* ── Charts Row 1: Market Share + BCG ────────────────── */}
      <div className="chart-grid" style={{ marginTop: 20 }}>
        {/* Market Share Evolution */}
        <div className="chart-card">
          <h3 className="chart-title">📈 Pazar Payı Evrimi (2010–{selectedYear})</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={mktShareChart} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number, n: string) => [`%${(v as number).toFixed(2)}`, n]} />
              <Legend />
              {currentRankings.slice(0, 8).map((c, i) => (
                <Area key={c.country} type="monotone" dataKey={c.country} stackId="1"
                  stroke={isTR(c.country) ? TURKEY_COLOR : COLORS[i % COLORS.length]}
                  fill={isTR(c.country) ? TURKEY_COLOR : COLORS[i % COLORS.length]}
                  fillOpacity={isTR(c.country) ? 0.8 : 0.4} />
              ))}
              <Area type="monotone" dataKey="Diğer" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* BCG Matrix */}
        <div className="chart-card">
          <h3 className="chart-title">🎯 Rekabet Pozisyon Matrisi (Büyüme × Pay)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="share" stroke="var(--text-secondary)"
                label={{ value: 'Pazar Payı (%)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="number" dataKey="cagr" stroke="var(--text-secondary)"
                label={{ value: 'BBO (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip content={({ payload }) => {
                const d = payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{d.fullName}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Pay: %{d.share.toFixed(2)} · BBO: %{d.cagr.toFixed(1)}
                    </div>
                  </div>
                );
              }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              <ReferenceLine x={2} stroke="var(--border)" strokeDasharray="3 3" />
              <Scatter data={bcgData.filter(d => !d.isTurkey)} fill="#6366f1" fillOpacity={0.6} />
              <Scatter data={bcgData.filter(d => d.isTurkey)} fill={TURKEY_COLOR} fillOpacity={1} shape="star" />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: '0.75rem', padding: 10, color: 'var(--text-secondary)' }}>
            <span>↗️ Sağ üst: Yıldızlar</span>
            <span>↘️ Sağ alt: Nakit İnekleri</span>
            <span>↖️ Sol üst: Soru İşaretleri</span>
            <span>↙️ Sol alt: Köpekler</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Top Producers + Radar ─────────────── */}
      <div className="chart-grid">
        {/* Top 15 */}
        <div className="chart-card">
          <h3 className="chart-title">🏆 Top 15 Hayvansal Üretici ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={currentRankings.slice(0, 15).map(c => ({
                name: c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country,
                fullName: c.country,
                meat: c.meat / 1e6, milk: c.milk / 1e6, eggs: c.eggs / 1e6,
                isTurkey: isTR(c.country),
              }))}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${v.toFixed(0)}M`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={95}
                tick={({ x, y, payload }: Record<string, unknown>) => {
                  const px = Number(x || 0);
                  const py = Number(y || 0);
                  const val = String((payload as Record<string, unknown>)?.value || '');
                  const d = currentRankings.slice(0, 15).find(c =>
                    (c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country) === val);
                  const t = d ? isTR(d.country) : false;
                  return <text x={px} y={py} dy={4} textAnchor="end" fill={t ? TURKEY_COLOR : 'var(--text-secondary)'} fontWeight={t ? 700 : 400} fontSize={11}>
                    {t ? '🇹🇷 ' : ''}{val}
                  </text>;
                }}
              />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number, n: string) => [`${(v as number).toFixed(2)}M ton`, n === 'meat' ? 'Et' : n === 'milk' ? 'Süt' : 'Yumurta']} />
              <Legend formatter={v => v === 'meat' ? '🥩 Et' : v === 'milk' ? '🥛 Süt' : '🥚 Yumurta'} />
              <Bar dataKey="meat" stackId="a" fill="#ef4444" />
              <Bar dataKey="milk" stackId="a" fill="#3b82f6" />
              <Bar dataKey="eggs" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="chart-card">
          <h3 className="chart-title">📊 Türkiye vs Top 2 – Kategori Karşılaştırması</h3>
          {top2.length >= 2 && radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" />
                <PolarRadiusAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                <Radar name="Türkiye" dataKey="Türkiye" stroke={TURKEY_COLOR} fill={TURKEY_COLOR} fillOpacity={0.4} strokeWidth={2} />
                <Radar name={top2[0].country} dataKey={top2[0].country} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Radar name={top2[1].country} dataKey={top2[1].country} stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                <Legend />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <div style={{ padding: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            💡 Her kategoride en yüksek üretici = 100 baz puan. Diğerleri oransal.
          </div>
        </div>
      </div>

      {/* ── Turkey Trend ───────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">📈 Türkiye Üretim Trendi (Tüm Yıllar)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={turkeyTrend} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              formatter={(v: number, n: string) => [fmtVal(v) + ' ton', n === 'meat' ? '🥩 Et' : n === 'milk' ? '🥛 Süt' : '🥚 Yumurta']} />
            <Legend formatter={v => v === 'meat' ? '🥩 Et' : v === 'milk' ? '🥛 Süt' : '🥚 Yumurta'} />
            <Line type="monotone" dataKey="meat" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            <Line type="monotone" dataKey="milk" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            <Line type="monotone" dataKey="eggs" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Catch-Up Analysis ──────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🎯 Yakalama Analizi – Türkiye vs Dünya Liderleri</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                {['Kategori', 'Lider', 'Lider Üretim', 'Türkiye', 'TR Sıra', 'Fark', 'TR BBO', 'Lider BBO', 'Yakalama'].map(h => (
                  <th key={h} style={{ padding: 12, textAlign: h === 'Yakalama' ? 'center' : h === 'Kategori' || h === 'Lider' ? 'left' : 'right',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catchUp.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.emoji} {c.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-primary)' }}>{c.leader}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtVal(c.leaderVal)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: TURKEY_COLOR, fontWeight: 600 }}>{fmtVal(c.trVal)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>#{c.trRank}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: NEG }}>{fmtVal(c.gap)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{ color: c.tCagr > 0 ? POS : NEG }}>%{c.tCagr.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{ color: c.lCagr > 0 ? POS : NEG }}>%{c.lCagr.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {c.yrs !== null ? (
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                        background: c.yrs < 20 ? 'rgba(34,197,94,.2)' : c.yrs < 50 ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)',
                        color: c.yrs < 20 ? POS : c.yrs < 50 ? NEUT : NEG,
                      }}>~{c.yrs} yıl</span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(239,68,68,.2)', color: NEG }}>∞</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          marginTop: 15, padding: 15, background: 'rgba(59,130,246,.1)', borderRadius: 8,
          border: '1px solid rgba(59,130,246,.3)'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            💡 <strong>Yakalama formülü:</strong> Türkiye BBO &gt; Lider BBO ise mevcut büyüme hızıyla liderliğe ulaşma süresi hesaplanır.
            Lider daha hızlı büyüyorsa yakalama imkansız (∞).
          </div>
        </div>
      </div>

      {/* ── Nearest Rivals ─────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">⚔️ Türkiye'nin En Yakın Rakipleri (±5 sıra)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                {['#', 'Ülke', 'Toplam', 'Et', 'Süt', 'Yumurta', 'BBO', 'Sıra Δ', 'Fark'].map((h, i) => (
                  <th key={h} style={{ padding: 12, textAlign: i === 0 ? 'center' : i === 1 ? 'left' : i >= 6 ? 'center' : 'right',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rivals.map((r, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border)',
                  background: r.isTurkey ? 'rgba(239,68,68,.08)' : 'transparent',
                }}>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: 700,
                    color: r.rank <= 3 ? '#f59e0b' : 'var(--text-primary)' }}>{r.rank}</td>
                  <td style={{ padding: 12, fontWeight: r.isTurkey ? 700 : 500,
                    color: r.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>
                    {r.isTurkey ? '🇹🇷 ' : ''}{r.country}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>{fmtVal(r.total)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.meat)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.milk)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.eggs)}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{cagrBadge(r.cagr)}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{rankBadge(r.rankChg)}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.85rem',
                    color: r.gap > 0 ? 'var(--text-secondary)' : r.gap < 0 ? NEG : NEUT }}>
                    {r.isTurkey ? '—' : (r.gap > 0 ? '+' : '') + fmtVal(r.gap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
