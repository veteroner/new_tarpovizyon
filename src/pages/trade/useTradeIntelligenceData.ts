/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchAgg, latestYear, num } from '../../services/d1';

const R_BIT = 'tuik/ticaret-bitkisel';
const R_HAY = 'tuik/ticaret-hayvansal';
// Her tablonun kendi kırılım düzeyi: bitkiselde ülke×ürün AYLIK, hayvansalda
// YILLIK satırlarda tutuluyor. Eski SQL'deki filtreler birebir korundu.
const BIT_ULKE_AY = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const HAY_TUM_AY = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'ay' };
const HAY_TUM_YIL = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' };
const HAY_ULKE_YIL = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'yil' };

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

export interface SeasonalRow { product: string; months: number[]; peakMonth: number; amplitude: number }
export interface ImbalanceRow { product: string; exp: number; imp: number; ratio: number; direction: string }
export interface UnitPriceRow { yil: string; exp_usd_ton: number; imp_usd_ton: number }
export interface HHIResult { type: string; hhi: number; top3share: number; riskLevel: string; topCountries: { name: string; share: number }[] }
export interface OpportunityRow { product: string; bestMonths: string[]; avgExp: number; peakExp: number; seasonalIndex: number }
export interface RadarRow { dimension: string; value: number; fullMark: number }

export function useTradeIntelligenceData() {
  const [loading, setLoading] = useState(true);
  // Yıl kodda sabitti; son TAM yıl veriden seçiliyor (içinde bulunulan yıl
  // yarım olduğu için minShare 0.9 ile eleniyor).
  const [year, setYear] = useState('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [seasonalData, setSeasonalData] = useState<SeasonalRow[]>([]);
  const [hhiExport, setHhiExport] = useState<HHIResult | null>(null);
  const [hhiImport, setHhiImport] = useState<HHIResult | null>(null);
  const [imbalanced, setImbalanced] = useState<ImbalanceRow[]>([]);
  const [unitPrices, setUnitPrices] = useState<{ product: string; data: UnitPriceRow[] }[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [radarData, setRadarData] = useState<RadarRow[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    (async () => {
      const [rows, tamYil] = await Promise.all([
        fetchAgg(R_HAY, { groupBy: ['yil'], orderBy: 'yil', dir: 'desc' }),
        latestYear(R_HAY, 'yil', { minShare: 0.9 }),
      ]);
      const yrs = rows.map((r) => String(r.yil));
      setYearOptions(yrs);
      if (yrs.length) setYear(tamYil ? String(tamYil) : yrs[0]);
    })();
  }, []);

  const loadIntelligence = useCallback(async (yr: string) => {
    setLoading(true);
    try {
      const [sPlant, sAnimal] = await Promise.all([
        fetchAgg(R_BIT, { groupBy: ['ana_urun', 'ay'], sum: ['ihracat_deger'], where: { ...BIT_ULKE_AY, yil: yr } })
          .then((rows) => ({ data: rows.map((r) => ({ ana_urun: r.ana_urun, ay: r.ay, exp: num(r.sum_ihracat_deger) })) })),
        fetchAgg(R_HAY, { groupBy: ['ana_urun', 'ay'], sum: ['ihracat_deger'], where: { ...HAY_TUM_AY, yil: yr } })
          .then((rows) => ({ data: rows.map((r) => ({ ana_urun: r.ana_urun, ay: r.ay, exp: num(r.sum_ihracat_deger) })) })),
      ]);

      const productMonths: Record<string, number[]> = {};
      const allRows = [...(sPlant.data || []), ...(sAnimal.data || [])];
      for (const r of allRows) {
        const name = String(r.ana_urun);
        if (!name) continue;
        if (!productMonths[name]) productMonths[name] = Array(12).fill(0);
        const m = Number(r.ay) - 1;
        if (m >= 0 && m < 12) productMonths[name][m] += Number(r.exp) || 0;
      }

      const seasonal: SeasonalRow[] = Object.entries(productMonths)
        .filter(([, ms]) => ms.some(v => v > 0))
        .map(([product, months]) => {
          const avg = months.reduce((a, b) => a + b, 0) / 12;
          const peak = Math.max(...months);
          const peakMonth = months.indexOf(peak);
          const amplitude = avg > 0 ? ((peak - avg) / avg) * 100 : 0;
          return { product, months, peakMonth, amplitude };
        })
        .sort((a, b) => b.amplitude - a.amplitude)
        .slice(0, 15);
      setSeasonalData(seasonal);

      const [hExp, hImp, hExpP, hImpP] = await Promise.all([
        fetchAgg(R_HAY, { groupBy: ['ulke'], sum: ['ihracat_deger'], where: { ...HAY_ULKE_YIL, yil: yr }, positive: ['ihracat_deger'], orderBy: 'sum_ihracat_deger', dir: 'desc' })
          .then((rows) => ({ data: rows.filter((r) => String(r.ulke ?? '') !== '')
            .map((r) => ({ ulke: r.ulke, val: num(r.sum_ihracat_deger) })) })),
        fetchAgg(R_HAY, { groupBy: ['ulke'], sum: ['ithalat_deger'], where: { ...HAY_ULKE_YIL, yil: yr }, positive: ['ithalat_deger'], orderBy: 'sum_ithalat_deger', dir: 'desc' })
          .then((rows) => ({ data: rows.filter((r) => String(r.ulke ?? '') !== '')
            .map((r) => ({ ulke: r.ulke, val: num(r.sum_ithalat_deger) })) })),
        fetchAgg(R_BIT, { groupBy: ['ulke'], sum: ['ihracat_deger'], where: { ...BIT_ULKE_AY, yil: yr }, positive: ['ihracat_deger'], orderBy: 'sum_ihracat_deger', dir: 'desc' })
          .then((rows) => ({ data: rows.filter((r) => String(r.ulke ?? '') !== '')
            .map((r) => ({ ulke: r.ulke, val: num(r.sum_ihracat_deger) })) })),
        fetchAgg(R_BIT, { groupBy: ['ulke'], sum: ['ithalat_deger'], where: { ...BIT_ULKE_AY, yil: yr }, positive: ['ithalat_deger'], orderBy: 'sum_ithalat_deger', dir: 'desc' })
          .then((rows) => ({ data: rows.filter((r) => String(r.ulke ?? '') !== '')
            .map((r) => ({ ulke: r.ulke, val: num(r.sum_ithalat_deger) })) })),
      ]);

      const calcHHI = (rows1: any[], rows2: any[]): HHIResult => {
        const countryMap: Record<string, number> = {};
        for (const r of [...(rows1 || []), ...(rows2 || [])]) {
          const c = String(r.ulke || r.name || '');
          if (!c) continue;
          countryMap[c] = (countryMap[c] || 0) + (Number(r.val) || 0);
        }
        const total = Object.values(countryMap).reduce((a, b) => a + b, 0);
        if (total === 0) return { type: '', hhi: 0, top3share: 0, riskLevel: 'low', topCountries: [] };
        const shares = Object.entries(countryMap).map(([name, val]) => ({ name, share: val / total })).sort((a, b) => b.share - a.share);
        const hhi = shares.reduce((sum, s) => sum + (s.share * 100) ** 2, 0);
        const top3 = shares.slice(0, 3).reduce((s, c) => s + c.share, 0) * 100;
        const riskLevel = hhi > 2500 ? 'critical' : hhi > 1500 ? 'high' : hhi > 1000 ? 'medium' : 'low';
        return { type: '', hhi: Math.round(hhi), top3share: top3, riskLevel, topCountries: shares.slice(0, 5).map(s => ({ name: s.name, share: s.share * 100 })) };
      };

      setHhiExport({ ...calcHHI(hExp.data ?? [], hExpP.data ?? []), type: 'İhracat' });
      setHhiImport({ ...calcHHI(hImp.data ?? [], hImpP.data ?? []), type: 'İthalat' });

      const [imb1, imb2] = await Promise.all([
        fetchAgg(R_HAY, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_YIL, yil: yr } })
          .then((rows) => ({ data: rows.map((r) => ({ ana_urun: r.ana_urun, exp: num(r.sum_ihracat_deger), imp: num(r.sum_ithalat_deger) })) })),
        fetchAgg(R_BIT, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE_AY, yil: yr } })
          .then((rows) => ({ data: rows.map((r) => ({ ana_urun: r.ana_urun, exp: num(r.sum_ihracat_deger), imp: num(r.sum_ithalat_deger) })) })),
      ]);

      const imbRows: ImbalanceRow[] = [];
      for (const r of [...(imb1.data || []), ...(imb2.data || [])]) {
        const exp = Number(r.exp) || 0;
        const imp = Number(r.imp) || 0;
        if (exp === 0 && imp === 0) continue;
        const product = String(r.ana_urun);
        if (imp > exp * 3 && imp > 1e6) {
          imbRows.push({ product, exp, imp, ratio: exp > 0 ? imp / exp : Infinity, direction: 'İthalat Ağırlıklı' });
        } else if (exp > imp * 3 && exp > 1e6) {
          imbRows.push({ product, exp, imp, ratio: imp > 0 ? exp / imp : Infinity, direction: 'İhracat Ağırlıklı' });
        }
      }
      imbRows.sort((a, b) => b.ratio - a.ratio);
      setImbalanced(imbRows.slice(0, 20));

      const topProdsRows = await fetchAgg(R_HAY, {
        groupBy: ['ana_urun'], sum: ['ihracat_mik'], where: HAY_TUM_YIL,
        positive: ['ihracat_mik'], orderBy: 'sum_ihracat_mik', dir: 'desc', limit: 5,
      });
      const topProds = topProdsRows.map((r) => String(r.ana_urun));
      const upData: { product: string; data: UnitPriceRow[] }[] = [];
      for (const p of topProds) {
        // Birim fiyat = değer / miktar; CASE WHEN sıfır koruması istemcide.
        const rows = await fetchAgg(R_HAY, {
          groupBy: ['yil'], sum: ['ihracat_deger', 'ithalat_deger', 'ihracat_mik', 'ithalat_mik'],
          where: { ...HAY_TUM_YIL, ana_urun: p }, orderBy: 'yil', dir: 'asc',
        });
        upData.push({ product: p, data: rows.map((r) => ({
          yil: String(r.yil),
          exp_usd_ton: num(r.sum_ihracat_mik) > 0 ? num(r.sum_ihracat_deger) / num(r.sum_ihracat_mik) : 0,
          imp_usd_ton: num(r.sum_ithalat_mik) > 0 ? num(r.sum_ithalat_deger) / num(r.sum_ithalat_mik) : 0,
        })) });
      }
      setUnitPrices(upData);

      const oppRows: OpportunityRow[] = Object.entries(productMonths)
        .filter(([, ms]) => ms.some(v => v > 0))
        .map(([product, months]) => {
          const total = months.reduce((a, b) => a + b, 0);
          const avg = total / 12;
          const peak = Math.max(...months);
          const seasonalIndex = avg > 0 ? peak / avg : 0;
          const indexed = months.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
          const bestMonths = indexed.slice(0, 3).map(m => MONTHS_TR[String(m.i + 1)]);
          return { product, bestMonths, avgExp: avg, peakExp: peak, seasonalIndex };
        })
        .filter(o => o.seasonalIndex > 1.3 && o.peakExp > 5e5)
        .sort((a, b) => b.seasonalIndex - a.seasonalIndex)
        .slice(0, 15);
      setOpportunities(oppRows);

      const tradeBal = (Number((imb1.data || []).reduce((s: number, r: any) => s + (Number(r.exp) || 0), 0)) +
        Number((imb2.data || []).reduce((s: number, r: any) => s + (Number(r.exp) || 0), 0))) /
        Math.max(1, (Number((imb1.data || []).reduce((s: number, r: any) => s + (Number(r.imp) || 0), 0)) +
          Number((imb2.data || []).reduce((s: number, r: any) => s + (Number(r.imp) || 0), 0))));

      const hhiEResult = { ...calcHHI(hExp.data ?? [], hExpP.data ?? []), type: 'İhracat' };
      const diversificationScore = Math.min(100, Math.max(0, 100 - (hhiEResult.hhi / 50)));
      const concentrationRisk = Math.min(100, hhiEResult.top3share);
      const imbalanceRisk = Math.min(100, imbRows.length * 5);
      const balanceScore = Math.min(100, tradeBal * 100);
      const seasonalScore = Math.min(100, oppRows.length * 7);

      setRadarData([
        { dimension: 'Çeşitlilik', value: diversificationScore, fullMark: 100 },
        { dimension: 'Denge', value: balanceScore, fullMark: 100 },
        { dimension: 'Mevsimsel Fırsat', value: seasonalScore, fullMark: 100 },
        { dimension: 'Yoğunlaşma Riski', value: 100 - concentrationRisk, fullMark: 100 },
        { dimension: 'Dengesizlik', value: 100 - imbalanceRisk, fullMark: 100 },
      ]);

      setTotalAlerts(imbRows.filter(r => r.direction === 'İthalat Ağırlıklı').length);
      setRiskScore(Math.round((diversificationScore + balanceScore + (100 - concentrationRisk) + (100 - imbalanceRisk) + seasonalScore) / 5));
    } catch (e) {
      console.error('TradeIntelligence error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (year) loadIntelligence(year); }, [year, loadIntelligence]);

  return {
    loading, year, setYear, yearOptions,
    seasonalData, hhiExport, hhiImport, imbalanced, unitPrices, opportunities, radarData,
    totalAlerts, riskScore,
  };
}

export { MONTHS_TR };
