/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchQuery } from '../../services/api';

export const YEAR_COLS = [
  'y2015/16', 'y2016/17', 'y2017/18', 'y2018/19', 'y2019/20',
  'y2020/21', 'y2021/22', 'y2022/23', 'y2023/24',
];
export const YEAR_LABELS = YEAR_COLS.map(c => c.replace('y', '').split('/')[0]);
const YEAR_SQL = YEAR_COLS.map(c => `\`${c}\``).join(', ');

const MONTH_COLS = [
  '`Ocak`', '`Şubat`', '`Mart`', '`Nisan`', '`Mayıs`', '`Haziran`',
  '`Temmuz`', '`Ağustos`', '`Eylül`', '`Ekim`', '`Kasım`', '`Aralık`',
];

export const CROSS_PRODUCTS = [
  { label: 'Buğday', urundenge: 'Buğday (toplam)', trade: 'Buğday', priceKey: 'Buğday' },
  { label: 'Arpa', urundenge: 'Arpa', trade: 'Arpa', priceKey: 'Arpa' },
  { label: 'Mısır', urundenge: 'Mısır', trade: 'Mısır', priceKey: 'Mısır' },
  { label: 'Pirinç', urundenge: 'Pirinç', trade: 'Pirinç', priceKey: 'Pirinç' },
  { label: 'Ayçiçeği', urundenge: 'Ayçiçeği', trade: 'Ayçiçeği', priceKey: 'Ayçiçeği' },
  { label: 'Şekerpancarı', urundenge: 'Şeker pancarı', trade: '', priceKey: 'Şeker' },
  { label: 'Patates', urundenge: 'Patates', trade: '', priceKey: 'Patates' },
  { label: 'Mercimek', urundenge: 'Kırmızı mercimek', trade: 'Mercimek', priceKey: 'Mercimek' },
  { label: 'Nohut', urundenge: 'Nohut', trade: 'Nohut', priceKey: 'Nohut' },
  { label: 'Çay', urundenge: 'Çay', trade: 'Çay', priceKey: 'Çay' },
];

export interface CrossRow {
  year: string;
  production: number;
  exports: number;
  imports: number;
  sufficiency: number;
  priceIndex: number;
}
export interface InsightMsg { type: 'warning' | 'info' | 'danger' | 'success'; text: string }
export interface RadarDim { dimension: string; value: number; fullMark: number }
export interface ScatterPoint { x: number; y: number; name: string; size: number }

export function useCrossIntelligenceData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(0);

  const [crossData, setCrossData] = useState<CrossRow[]>([]);
  const [insights, setInsights] = useState<InsightMsg[]>([]);
  const [radar, setRadar] = useState<RadarDim[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [foodSecurityTable, setFoodSecurityTable] = useState<{
    product: string; sufficiency: number; importDep: number; consumption: number; trend: string;
  }[]>([]);

  const loadCross = useCallback(async (pIdx: number) => {
    setLoading(true);
    setError(false);
    const p = CROSS_PRODUCTS[pIdx];
    try {
      const [prodRes, impRes, expRes, suffRes] = await Promise.all([
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='Üretim'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='İthalat'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='İhracat'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='Yeterlilik derecesi'`),
      ]);

      const getYearVals = (res: typeof prodRes) => {
        if (!res.data?.[0]) return YEAR_COLS.map(() => 0);
        return YEAR_COLS.map(c => Number(res.data![0][c]) || 0);
      };

      const productions = getYearVals(prodRes);
      const imports = getYearVals(impRes);
      const exports = getYearVals(expRes);
      const sufficiencies = getYearVals(suffRes);

      let priceIndices = YEAR_LABELS.map(() => 100);
      if (p.priceKey) {
        const priceRes = await fetchQuery(`
          SELECT yil, AVG((${MONTH_COLS.join('+')}) / 12) as avg_idx
          FROM tuik_fiyatendex
          WHERE endeks='T-GFE' AND (d2 LIKE '%${p.priceKey}%' OR d3 LIKE '%${p.priceKey}%')
          AND yil >= 2015 AND yil <= 2024
          GROUP BY yil ORDER BY yil
        `);
        if (priceRes.data?.length) {
          const priceMap: Record<string, number> = {};
          for (const r of priceRes.data) priceMap[String(r.yil)] = Number(r.avg_idx) || 100;
          priceIndices = YEAR_LABELS.map(y => priceMap[y] || 100);
        }
      }

      const rows: CrossRow[] = YEAR_LABELS.map((y, i) => ({
        year: y,
        production: productions[i],
        exports: exports[i],
        imports: imports[i],
        sufficiency: sufficiencies[i],
        priceIndex: priceIndices[i],
      }));
      setCrossData(rows);

      const msgs: InsightMsg[] = [];
      const latest = rows[rows.length - 1];
      const prev = rows[rows.length - 2];
      if (latest && prev) {
        const prodChange = prev.production > 0 ? ((latest.production - prev.production) / prev.production) * 100 : 0;
        if (prodChange < -10) {
          msgs.push({ type: 'danger', text: `${p.label} üretimi %${Math.abs(prodChange).toFixed(1)} düştü → İthalat baskısı artabilir` });
        } else if (prodChange > 15) {
          msgs.push({ type: 'success', text: `${p.label} üretimi %${prodChange.toFixed(1)} arttı → İhracat potansiyeli yükseliyor` });
        }

        const impDep = latest.imports > 0 && (latest.production + latest.imports) > 0
          ? (latest.imports / (latest.production + latest.imports)) * 100 : 0;
        if (impDep > 30) {
          msgs.push({ type: 'warning', text: `İthalat bağımlılığı %${impDep.toFixed(1)} → Kritik eşik (%30) aşıldı! Dış fiyat şoklarına açık` });
        }

        if (latest.sufficiency > 0 && latest.sufficiency < 80) {
          msgs.push({ type: 'danger', text: `Yeterlilik derecesi %${latest.sufficiency.toFixed(0)} → Gıda güvenliği riski! Üretim artışı veya ithalat çeşitlendirmesi gerekli` });
        } else if (latest.sufficiency > 120) {
          msgs.push({ type: 'success', text: `Yeterlilik derecesi %${latest.sufficiency.toFixed(0)} → Fazla üretim, ihracat ile değerlendirme fırsatı` });
        }

        const prodDelta = prodChange;
        const priceDelta = prev.priceIndex > 0 ? ((latest.priceIndex - prev.priceIndex) / prev.priceIndex) * 100 : 0;
        if (prodDelta < -5 && priceDelta > 10) {
          msgs.push({ type: 'warning', text: `Üretim ↓%${Math.abs(prodDelta).toFixed(0)} iken fiyat ↑%${priceDelta.toFixed(0)} → Arz daralması fiyatı yukarı itiyor` });
        } else if (prodDelta > 10 && priceDelta < -5) {
          msgs.push({ type: 'info', text: `Üretim ↑%${prodDelta.toFixed(0)} iken fiyat ↓%${Math.abs(priceDelta).toFixed(0)} → Arz bolluğu fiyatı baskılıyor` });
        }

        if (latest.imports > latest.exports * 5 && latest.imports > 1e4) {
          msgs.push({ type: 'danger', text: `İthalat, ihracatın ${(latest.imports / Math.max(1, latest.exports)).toFixed(0)} katı → Ticaret açığı derinleşiyor` });
        }
      }
      if (msgs.length === 0) {
        msgs.push({ type: 'info', text: `${p.label} için şu an kritik bir sinyal tespit edilmedi. Veriler stabil.` });
      }
      setInsights(msgs);

      const latestR = rows[rows.length - 1];
      if (latestR) {
        const impDep = latestR.imports > 0 ? (latestR.imports / (latestR.production + latestR.imports)) * 100 : 0;
        const meanProd = productions.reduce((a, b) => a + b, 0) / productions.length;
        const stdProd = Math.sqrt(productions.reduce((s, v) => s + (v - meanProd) ** 2, 0) / productions.length);
        const volatility = meanProd > 0 ? (stdProd / meanProd) * 100 : 0;

        const priceChanges = priceIndices.slice(1).map((v, i) => priceIndices[i] > 0 ? ((v - priceIndices[i]) / priceIndices[i]) * 100 : 0);
        const meanPC = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        const stdPC = Math.sqrt(priceChanges.reduce((s, v) => s + (v - meanPC) ** 2, 0) / priceChanges.length);
        const priceStab = Math.max(0, Math.min(100, 100 - stdPC * 2));

        const tradeBalance = latestR.exports > 0 ? Math.min(100, (latestR.exports / Math.max(1, latestR.imports)) * 50) : 5;

        setRadar([
          { dimension: 'Yeterlilik', value: Math.min(100, latestR.sufficiency), fullMark: 100 },
          { dimension: 'İthalat Bağımsızlığı', value: Math.max(0, 100 - impDep), fullMark: 100 },
          { dimension: 'Fiyat Stabilitesi', value: priceStab, fullMark: 100 },
          { dimension: 'Ticaret Dengesi', value: tradeBalance, fullMark: 100 },
          { dimension: 'Üretim Stabilitesi', value: Math.max(0, 100 - volatility * 3), fullMark: 100 },
        ]);
      }

      const [allSuff, allProd2] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Yeterlilik derecesi' AND \`y2023/24\` > 0`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Üretim' AND \`y2023/24\` > 0`),
      ]);

      const suffMap: Record<string, number> = {};
      for (const r of (allSuff.data || [])) suffMap[String(r.urun).trim()] = Number(r.val) || 0;
      const scatter: ScatterPoint[] = [];
      for (const r of (allProd2.data || [])) {
        const name = String(r.urun).trim();
        const prod = Number(r.val) || 0;
        const suff = suffMap[name];
        if (suff && suff > 0) scatter.push({ x: prod, y: suff, name, size: prod });
      }
      setScatterData(scatter.sort((a, b) => b.x - a.x).slice(0, 30));

      const [fsTable, fsCons, fsImp, fsProd] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Yeterlilik derecesi' ORDER BY CAST(\`y2023/24\` AS DECIMAL) ASC`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Kişi başına tüketim' ORDER BY urun`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as imp, \`y2022/23\` as imp_prev FROM tuik_urundenge WHERE \`fasıl\`='İthalat'`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as prod FROM tuik_urundenge WHERE \`fasıl\`='Üretim'`),
      ]);

      const consMap: Record<string, number> = {};
      for (const r of (fsCons.data || [])) consMap[String(r.urun).trim()] = Number(r.val) || 0;
      const impMap: Record<string, { imp: number; prev: number }> = {};
      for (const r of (fsImp.data || [])) impMap[String(r.urun).trim()] = { imp: Number(r.imp) || 0, prev: Number(r.imp_prev) || 0 };
      const prodMap2: Record<string, number> = {};
      for (const r of (fsProd.data || [])) prodMap2[String(r.urun).trim()] = Number(r.prod) || 0;

      const fsRows = (fsTable.data || [])
        .filter((r: any) => Number(r.val) > 0)
        .map((r: any) => {
          const name = String(r.urun).trim();
          const suff = Number(r.val) || 0;
          const imp = impMap[name]?.imp || 0;
          const prod = prodMap2[name] || 0;
          const impDep = (prod + imp) > 0 ? (imp / (prod + imp)) * 100 : 0;
          const impPrev = impMap[name]?.prev || 0;
          const trend = impPrev > 0 ? ((imp - impPrev) / impPrev) * 100 : 0;
          return {
            product: name,
            sufficiency: suff,
            importDep: impDep,
            consumption: consMap[name] || 0,
            trend: trend > 5 ? '↑ İthalat artıyor' : trend < -5 ? '↓ İthalat azalıyor' : '→ Stabil',
          };
        });
      setFoodSecurityTable(fsRows);

    } catch (e) {
      console.error('CrossIntelligence error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCross(selected); }, [selected, loadCross]);

  return {
    loading, error,
    selected, setSelected,
    crossData, insights, radar, scatterData, foodSecurityTable,
    product: CROSS_PRODUCTS[selected],
    retry: () => loadCross(selected),
  };
}
