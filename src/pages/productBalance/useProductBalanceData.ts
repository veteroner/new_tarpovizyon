/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchQuery } from '../../services/api';

/* ─── Year columns ─── */
export const YEAR_KEYS = [
  'y2014/15','y2015/16','y2016/17','y2017/18','y2018/19',
  'y2019/20','y2020/21','y2021/22','y2022/23','y2023/24',
];
export const YEAR_COLS_SQL = YEAR_KEYS.map(k => `\`${k}\``).join(', ');
export const YEAR_LABELS = YEAR_KEYS.map(k => k.replace('y','').split('/')[0]);

/* ─── Helpers ─── */
export const fmt = (v: number | null | undefined, decimals = 0): string => {
  if (v == null || isNaN(v)) return '-';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + ' Mln';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + ' Bin';
  return v.toFixed(decimals);
};
export const pct = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? '-' : v.toFixed(1) + '%';
export const parseNum = (v: unknown): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
export const yearVal = (row: Record<string, unknown>, idx: number): number =>
  parseNum(row[YEAR_KEYS[idx]]);

/* ─── Colors ─── */
export const GREEN = '#16a34a';
export const GREEN_LIGHT = '#22c55e';
export const BLUE = '#2563eb';
export const RED = '#dc2626';
export const ORANGE = '#f59e0b';
export const PURPLE = '#7c3aed';
export const CYAN = '#06b6d4';
export const AREA_COLORS = ['#16a34a','#2563eb','#f59e0b','#dc2626','#7c3aed','#06b6d4','#ec4899','#84cc16'];

export const HEATMAP_COLORS = [
  { threshold: 50, color: '#dc2626', label: '< 50%' },
  { threshold: 70, color: '#f97316', label: '50-70%' },
  { threshold: 90, color: '#facc15', label: '70-90%' },
  { threshold: 110, color: '#22c55e', label: '90-110%' },
  { threshold: 150, color: '#16a34a', label: '110-150%' },
  { threshold: Infinity, color: '#166534', label: '> 150%' },
];
export const getHeatColor = (v: number): string =>
  HEATMAP_COLORS.find(c => v < c.threshold)?.color ?? '#166534';

/* ─── Product groups ─── */
export const PRODUCT_GROUPS: Record<string, string[]> = {
  'Tahıllar': ['Tahıl (toplam)', 'Buğday (toplam)', 'Buğday (durum)', 'Buğday (diğer)', 'Arpa', 'Mısır', 'Çavdar', 'Yulaf', 'Pirinç', 'Diğer tahıllar'],
  'Baklagiller': ['Kuru baklagil (toplam)', 'Kırmızı mercimek', 'Yeşil mercimek', 'Nohut', 'Kuru fasulye'],
  'Sebzeler': ['Sebze (toplam)', 'Domates', 'Biber', 'Hıyar', 'Patlıcan', 'Patates', 'Soğan (kuru)', 'Soğan (taze)', 'Sarımsak (kuru)', 'Lahana', 'Marul', 'Ispanak', 'Havuç', 'Turp', 'Pırasa', 'Semizotu', 'Kabak (sakız)', 'Bamya', 'Fasulye (taze)', 'Bezelye (taze)', 'Bakla (taze)'],
  'Meyveler': ['Elma', 'Armut', 'Kayısı ve zerdali', 'Kiraz', 'Vişne', 'Şeftali ve nektarin', 'Erik', 'Ayva', 'Dut', 'Üzüm', 'İncir', 'Nar', 'Çilek', 'Karpuz', 'Kavun', 'Muz', 'Diğer meyveler'],
  'Turunçgiller': ['Turunçgiller (toplam)', 'Portakal', 'Mandalina', 'Limon', 'Greyfurt'],
  'Sert Kabuklular': ['Sert kabuklular (toplam)', 'Fındık', 'Ceviz', 'Badem', 'Antep fıstığı', 'Kestane'],
  'Endüstriyel': ['Şeker pancarı', 'Şeker', 'Çay', 'Pamuk (çiğit)', 'Ayçiçeği', 'Kolza', 'Soya  (1)', 'Kenevir', 'Keten', 'Şarap'],
};

export function useProductBalanceData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState('Tahıllar');
  const [detail, setDetail] = useState<Record<string, { birim: string; values: number[] }>>({});
  const [heatmapData, setHeatmapData] = useState<{ urun: string; values: number[] }[]>([]);
  const [importRanking, setImportRanking] = useState<{ urun: string; ratio: number }[]>([]);
  const [perCapitaData, setPerCapitaData] = useState<{ urun: string; values: number[] }[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetchQuery(`SELECT DISTINCT TRIM(urun) as urun FROM tuik_urundenge ORDER BY urun`);
      const list = (res.data || []).map((r: Record<string, unknown>) => String(r.urun).trim());
      setProducts(list);
      if (list.length > 0) setSelectedProduct(list.find((p: string) => p.includes('Buğday (toplam)')) || list[0]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [yetRes, impDepRes, pcRes] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, ${YEAR_COLS_SQL} FROM tuik_urundenge WHERE fasıl='Yeterlilik derecesi' ORDER BY urun`),
        fetchQuery(`
          SELECT a.urun, a.imp, b.arz,
                 CASE WHEN b.arz > 0 THEN (a.imp / b.arz * 100) ELSE 0 END as ratio
          FROM (SELECT TRIM(urun) as urun, \`y2023/24\` as imp FROM tuik_urundenge WHERE fasıl='İthalat') a
          JOIN (SELECT TRIM(urun) as urun, \`y2023/24\` as arz FROM tuik_urundenge WHERE fasıl='Arz= Kullanım') b ON a.urun = b.urun
          WHERE a.imp > 0 ORDER BY ratio DESC LIMIT 20
        `),
        fetchQuery(`SELECT TRIM(urun) as urun, ${YEAR_COLS_SQL} FROM tuik_urundenge WHERE fasıl='Kişi başına tüketim' ORDER BY urun`),
      ]);
      setHeatmapData((yetRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(), values: YEAR_KEYS.map((_, i) => yearVal(r, i)),
      })));
      setImportRanking((impDepRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(), ratio: parseNum(r.ratio),
      })));
      setPerCapitaData((pcRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(), values: YEAR_KEYS.map((_, i) => yearVal(r, i)),
      })));
    })();
  }, []);

  const loadDetail = useCallback(async (product: string) => {
    if (!product) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchQuery(`
        SELECT fasıl, birim, ${YEAR_COLS_SQL}
        FROM tuik_urundenge WHERE TRIM(urun)='${product.replace(/'/g, "''")}'
        ORDER BY fasıl
      `);
      const map: Record<string, { birim: string; values: number[] }> = {};
      for (const r of (res.data || [])) {
        const f = String(r['fasıl']);
        map[f] = { birim: String(r.birim || ''), values: YEAR_KEYS.map((_, i) => yearVal(r as Record<string, unknown>, i)) };
      }
      setDetail(map);
    } catch (e) {
      console.error('ProductBalance error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProduct) loadDetail(selectedProduct);
  }, [selectedProduct, loadDetail]);

  const latestIdx = YEAR_KEYS.length - 1;
  const prevIdx = latestIdx - 1;
  const get = useCallback((fasil: string, idx = latestIdx) => detail[fasil]?.values[idx] ?? 0, [detail, latestIdx]);
  const getUnit = useCallback((fasil: string) => detail[fasil]?.birim ?? '', [detail]);

  const production = get('Üretim');
  const imports = get('İthalat');
  const exports = get('İhracat');
  const selfSufficiency = get('Yeterlilik derecesi');
  const perCapita = get('Kişi başına tüketim');
  const stockChange = get('Stok değişimi');
  const supplyUse = get('Arz= Kullanım');
  const importDep = supplyUse > 0 ? (imports / supplyUse) * 100 : 0;
  const exportRatio = production > 0 ? (exports / production) * 100 : 0;
  const prevProd = get('Üretim', prevIdx);
  const prodYoY = prevProd > 0 ? ((production - prevProd) / prevProd) * 100 : 0;
  const prevSS = get('Yeterlilik derecesi', prevIdx);
  const ssYoY = prevSS > 0 ? selfSufficiency - prevSS : 0;

  const waterfallData = useMemo(() => {
    if (!detail['Üretim']) return [];
    return [
      { name: 'Üretim', value: production, fill: GREEN },
      { name: 'Kayıplar', value: -get('Üretim kayıpları') - get('Kayıplar'), fill: '#ef4444' },
      { name: 'İthalat', value: imports, fill: BLUE },
      { name: 'İnsan Tüketimi', value: -get('İnsan tüketimi'), fill: ORANGE },
      { name: 'Yemlik', value: -get('Yemlik kullanım'), fill: PURPLE },
      { name: 'Endüstriyel', value: -get('Endüstriyel kullanım'), fill: CYAN },
      { name: 'Tohum', value: -get('Tohumluk kullanım'), fill: '#64748b' },
      { name: 'İhracat', value: -exports, fill: RED },
      { name: 'Stok', value: -stockChange, fill: '#a855f7' },
    ].filter(d => Math.abs(d.value) > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, production, imports, exports, stockChange]);

  const yearlyTrend = useMemo(() => {
    if (!detail['Üretim']) return [];
    return YEAR_LABELS.map((lbl, i) => ({
      year: lbl,
      Üretim: detail['Üretim']?.values[i] ?? 0,
      İthalat: detail['İthalat']?.values[i] ?? 0,
      İhracat: detail['İhracat']?.values[i] ?? 0,
      Tüketim: detail['İnsan tüketimi']?.values[i] ?? 0,
      Yeterlilik: detail['Yeterlilik derecesi']?.values[i] ?? 0,
    }));
  }, [detail]);

  const alerts = useMemo(() => {
    return heatmapData.map(h => {
      const latest = h.values[latestIdx];
      const prev = h.values[prevIdx];
      const trend = prev > 0 ? latest - prev : 0;
      let severity: 'critical' | 'warning' | 'watch' | 'ok' = 'ok';
      if (latest < 50) severity = 'critical';
      else if (latest < 70) severity = 'warning';
      else if (latest < 90 || trend < -10) severity = 'watch';
      return { urun: h.urun, value: latest, trend, severity };
    }).filter(a => a.severity !== 'ok').sort((a, b) => a.value - b.value);
  }, [heatmapData, latestIdx, prevIdx]);

  const foodSecurityScore = useMemo(() => {
    if (!selfSufficiency) return 0;
    const ssScore = Math.min(selfSufficiency, 150) / 150 * 40;
    const impScore = Math.max(0, 30 - importDep * 0.3);
    const stockScore = stockChange > 0 ? 15 : stockChange > -production * 0.1 ? 10 : 5;
    const trendScore = prodYoY > 0 ? 15 : prodYoY > -5 ? 10 : 5;
    return Math.round(ssScore + impScore + stockScore + trendScore);
  }, [selfSufficiency, importDep, stockChange, prodYoY, production]);

  const filteredProducts = products.filter(p =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const groupedProducts = PRODUCT_GROUPS[activeGroup]?.filter(p => products.includes(p)) ?? [];

  const perCapitaChartData = useMemo(() => {
    const topProducts = perCapitaData
      .filter(p => p.values[latestIdx] > 5)
      .sort((a, b) => b.values[latestIdx] - a.values[latestIdx])
      .slice(0, 8);
    return YEAR_LABELS.map((lbl, i) => {
      const entry: Record<string, string | number> = { year: lbl };
      topProducts.forEach(p => { entry[p.urun] = p.values[i]; });
      return entry;
    });
  }, [perCapitaData, latestIdx]);

  const perCapitaProducts = useMemo(() =>
    perCapitaData
      .filter(p => p.values[latestIdx] > 5)
      .sort((a, b) => b.values[latestIdx] - a.values[latestIdx])
      .slice(0, 8)
      .map(p => p.urun),
  [perCapitaData, latestIdx]);

  return {
    loading, error, products, selectedProduct, setSelectedProduct,
    searchTerm, setSearchTerm, activeGroup, setActiveGroup,
    detail, heatmapData, importRanking,
    latestIdx, prevIdx, get, getUnit,
    production, imports, exports, selfSufficiency, perCapita,
    stockChange, supplyUse, importDep, exportRatio, prodYoY, ssYoY,
    waterfallData, yearlyTrend, alerts, foodSecurityScore,
    filteredProducts, groupedProducts,
    perCapitaChartData, perCapitaProducts,
    loadDetail,
  };
}
