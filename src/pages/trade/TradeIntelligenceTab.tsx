import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart,
} from 'recharts';
import {
  AlertTriangle, BarChart3, Calendar, Globe, Shield, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { Loading } from '../../components/Loading';
import { fetchQuery, formatMoney, TRADE_TABLES } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  SABITLER                                                          */
/* ------------------------------------------------------------------ */
const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};
const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#991b1b' };

/* ------------------------------------------------------------------ */
/*  TIPLER                                                            */
/* ------------------------------------------------------------------ */
interface SeasonalRow { product: string; months: number[]; peakMonth: number; amplitude: number }
interface ImbalanceRow { product: string; exp: number; imp: number; ratio: number; direction: string }
interface UnitPriceRow { yil: string; exp_usd_ton: number; imp_usd_ton: number }
interface HHIResult { type: string; hhi: number; top3share: number; riskLevel: string; topCountries: { name: string; share: number }[] }
interface OpportunityRow { product: string; bestMonths: string[]; avgExp: number; peakExp: number; seasonalIndex: number }
interface RadarRow { dimension: string; value: number; fullMark: number }

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */
export default function TradeIntelligenceTab() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2024');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  // Data
  const [seasonalData, setSeasonalData] = useState<SeasonalRow[]>([]);
  const [hhiExport, setHhiExport] = useState<HHIResult | null>(null);
  const [hhiImport, setHhiImport] = useState<HHIResult | null>(null);
  const [imbalanced, setImbalanced] = useState<ImbalanceRow[]>([]);
  const [unitPrices, setUnitPrices] = useState<{ product: string; data: UnitPriceRow[] }[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [radarData, setRadarData] = useState<RadarRow[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [riskScore, setRiskScore] = useState(0);

  /* ----- Years ----- */
  useEffect(() => {
    (async () => {
      const res = await fetchQuery(`SELECT DISTINCT yil FROM ${TRADE_TABLES.ANIMAL} ORDER BY yil DESC`);
      const yrs = (res.data || []).map(r => String(r.yil));
      setYearOptions(yrs);
      if (yrs.length) setYear(yrs[0]);
    })();
  }, []);

  /* ----- LOAD ALL ----- */
  const loadIntelligence = useCallback(async (yr: string) => {
    setLoading(true);
    try {
      /* ===== 1. MEVSİMSELLİK — Her ürünün aylık profili ===== */
      const [sPlant, sAnimal] = await Promise.all([
        fetchQuery(`
          SELECT ana_urun, ay, SUM(ihracat_deger) as exp
          FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          GROUP BY ana_urun, ay
        `),
        fetchQuery(`
          SELECT ana_urun, ay, SUM(ihracat_deger) as exp
          FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          GROUP BY ana_urun, ay
        `),
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

      /* ===== 2. HHI — Pazar Yoğunlaşma ===== */
      const [hExp, hImp] = await Promise.all([
        fetchQuery(`
          SELECT ulke, SUM(ihracat_deger) as val
          FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          AND ihracat_deger > 0 AND ulke != '' GROUP BY ulke ORDER BY val DESC
        `),
        fetchQuery(`
          SELECT ulke, SUM(ithalat_deger) as val
          FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          AND ithalat_deger > 0 AND ulke != '' GROUP BY ulke ORDER BY val DESC
        `),
      ]);
      // Also plant (use 'ay' data aggregated)
      const [hExpP, hImpP] = await Promise.all([
        fetchQuery(`
          SELECT ulke, SUM(ihracat_deger) as val
          FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          AND ihracat_deger > 0 AND ulke != '' GROUP BY ulke ORDER BY val DESC
        `),
        fetchQuery(`
          SELECT ulke, SUM(ithalat_deger) as val
          FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          AND ithalat_deger > 0 AND ulke != '' GROUP BY ulke ORDER BY val DESC
        `),
      ]);

      const calcHHI = (rows1: typeof hExp.data, rows2: typeof hExpP.data): HHIResult => {
        // Merge country values from animal + plant
        const countryMap: Record<string, number> = {};
        for (const r of [...(rows1 || []), ...(rows2 || [])]) {
          const c = String(r.ulke || r.name || '');
          if (!c) continue;
          countryMap[c] = (countryMap[c] || 0) + (Number(r.val) || 0);
        }
        const total = Object.values(countryMap).reduce((a, b) => a + b, 0);
        if (total === 0) return { type: '', hhi: 0, top3share: 0, riskLevel: 'low', topCountries: [] };

        const shares = Object.entries(countryMap)
          .map(([name, val]) => ({ name, share: val / total }))
          .sort((a, b) => b.share - a.share);

        const hhi = shares.reduce((sum, s) => sum + (s.share * 100) ** 2, 0);
        const top3 = shares.slice(0, 3).reduce((s, c) => s + c.share, 0) * 100;
        const riskLevel = hhi > 2500 ? 'critical' : hhi > 1500 ? 'high' : hhi > 1000 ? 'medium' : 'low';
        return { type: '', hhi: Math.round(hhi), top3share: top3, riskLevel, topCountries: shares.slice(0, 5).map(s => ({ name: s.name, share: s.share * 100 })) };
      };

      const hhiE = { ...calcHHI(hExp.data, hExpP.data), type: 'İhracat' };
      const hhiI = { ...calcHHI(hImp.data, hImpP.data), type: 'İthalat' };
      setHhiExport(hhiE);
      setHhiImport(hhiI);

      /* ===== 3. TİCARET DENGESİZLİĞİ — İthalat >>> İhracat ===== */
      const [imb1, imb2] = await Promise.all([
        fetchQuery(`
          SELECT ana_urun, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
          FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          GROUP BY ana_urun
        `),
        fetchQuery(`
          SELECT ana_urun, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
          FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          GROUP BY ana_urun
        `),
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

      /* ===== 4. BİRİM FİYAT TRENDİ (top 5 products) ===== */
      // Use animal data (has yearly granularity) — top products by volume
      const topProdsRes = await fetchQuery(`
        SELECT ana_urun, SUM(ihracat_mik) as vol
        FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND ihracat_mik > 0
        GROUP BY ana_urun ORDER BY vol DESC LIMIT 5
      `);
      const topProds = (topProdsRes.data || []).map(r => String(r.ana_urun));

      const upData: { product: string; data: UnitPriceRow[] }[] = [];
      for (const p of topProds) {
        const res = await fetchQuery(`
          SELECT yil, 
            CASE WHEN SUM(ihracat_mik) > 0 THEN SUM(ihracat_deger) / SUM(ihracat_mik) ELSE 0 END as exp_up,
            CASE WHEN SUM(ithalat_mik) > 0 THEN SUM(ithalat_deger) / SUM(ithalat_mik) ELSE 0 END as imp_up
          FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND ana_urun='${p}'
          GROUP BY yil ORDER BY yil
        `);
        upData.push({
          product: p,
          data: (res.data || []).map(r => ({
            yil: String(r.yil),
            exp_usd_ton: Number(r.exp_up) || 0,
            imp_usd_ton: Number(r.imp_up) || 0,
          })),
        });
      }
      setUnitPrices(upData);

      /* ===== 5. SEZONSAL FIRSAT TAKVİMİ ===== */
      const oppRows: OpportunityRow[] = Object.entries(productMonths)
        .filter(([, ms]) => ms.some(v => v > 0))
        .map(([product, months]) => {
          const total = months.reduce((a, b) => a + b, 0);
          const avg = total / 12;
          const peak = Math.max(...months);
          const seasonalIndex = avg > 0 ? peak / avg : 0;

          // Best 3 months
          const indexed = months.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
          const bestMonths = indexed.slice(0, 3).map(m => MONTHS_TR[String(m.i + 1)]);

          return { product, bestMonths, avgExp: avg, peakExp: peak, seasonalIndex };
        })
        .filter(o => o.seasonalIndex > 1.3 && o.peakExp > 5e5)
        .sort((a, b) => b.seasonalIndex - a.seasonalIndex)
        .slice(0, 15);
      setOpportunities(oppRows);

      /* ===== 6. RADAR — Genel Değerlendirme ===== */
      const tradeBal = (Number((imb1.data || []).reduce((s, r) => s + (Number(r.exp) || 0), 0)) +
        Number((imb2.data || []).reduce((s, r) => s + (Number(r.exp) || 0), 0))) /
        Math.max(1, (Number((imb1.data || []).reduce((s, r) => s + (Number(r.imp) || 0), 0)) +
          Number((imb2.data || []).reduce((s, r) => s + (Number(r.imp) || 0), 0))));

      const diversificationScore = Math.min(100, Math.max(0, 100 - (hhiE.hhi / 50)));
      const concentrationRisk = Math.min(100, hhiE.top3share);
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

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Zap className="w-6 h-6 text-amber-500" />
            Ticaret İçgörüleri
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Mevsimsellik, pazar yoğunlaşma, birim fiyat trendi, dengesizlik &amp; fırsat analizi
          </p>
        </div>
        <select
          className="px-3 py-2 border rounded-lg text-sm"
          value={year}
          onChange={e => setYear(e.target.value)}
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 border-2 ${riskScore >= 60 ? 'border-green-200 bg-green-50' : riskScore >= 40 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Genel Sağlık Skoru</span>
          </div>
          <div className={`text-3xl font-bold ${riskScore >= 60 ? 'text-green-700' : riskScore >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
            {riskScore}/100
          </div>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Dengesizlik Uyarıları</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{totalAlerts}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ürün (ithalat&gt;3x ihracat)</p>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>İhracat HHI</span>
          </div>
          <div className={`text-3xl font-bold ${hhiExport && hhiExport.hhi > 1500 ? 'text-red-600' : 'text-green-600'}`}>
            {hhiExport?.hhi?.toLocaleString() || 0}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {hhiExport?.hhi && hhiExport.hhi > 2500 ? 'Çok yoğun' : hhiExport?.hhi && hhiExport.hhi > 1500 ? 'Yoğun' : hhiExport?.hhi && hhiExport.hhi > 1000 ? 'Orta' : 'Rekabetçi'}
          </p>
        </div>

        <div className="rounded-xl p-4 border shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Sezonsal Fırsatlar</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{opportunities.length}</div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ürün (mevsimsel avantaj)</p>
        </div>
      </div>

      {/* Radar + HHI Detay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-4 h-4 text-green-600" />
            Ticaret Sağlık Profili
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Skor" dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <strong>Yorum:</strong> {riskScore >= 70
              ? 'Ticaret profili sağlıklı. Çeşitlilik ve denge iyi seviyede.'
              : riskScore >= 45
                ? 'Orta risk. Bazı ürünlerde yoğunlaşma ve dengesizlik tespit edildi.'
                : 'Yüksek risk! Pazar yoğunlaşması aşırı, ithalat bağımlılığı yüksek.'
            }
          </div>
        </div>

        {/* HHI Detay */}
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-4 h-4 text-blue-600" />
            HHI Pazar Yoğunlaşma Endeksi
          </h3>
          <div className="space-y-6">
            {[hhiExport, hhiImport].filter(Boolean).map((hhi) => (
              <div key={hhi!.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{hhi!.type}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${hhi!.riskLevel === 'critical' ? 'bg-red-100 text-red-700' : hhi!.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' : hhi!.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    HHI: {hhi!.hhi.toLocaleString()}
                  </span>
                </div>
                {/* HHI bar visual */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, hhi!.hhi / 40)}%`,
                      backgroundColor: RISK_COLORS[hhi!.riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.low,
                    }}
                  />
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Top 3 ülke payı: %{hhi!.top3share.toFixed(1)}</div>
                <div className="flex flex-wrap gap-1">
                  {hhi!.topCountries.map(c => (
                    <span key={c.name} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {c.name} <strong>%{c.share.toFixed(1)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-xs bg-blue-50 text-blue-700">
            <strong>HHI Ölçeği:</strong> &lt;1000 Rekabetçi | 1000-1500 Orta | 1500-2500 Yoğun | &gt;2500 Çok Yoğun
          </div>
        </div>
      </div>

      {/* Mevsimsellik Heatmap */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4 text-purple-600" />
          Mevsimsellik Heatmap — Ürün × Ay İhracat Yoğunluğu ({year})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-primary)' }}>
                <th className="text-left px-2 py-2 sticky left-0 z-10" style={{ background: 'var(--bg-primary)' }}>Ürün</th>
                {Object.values(MONTHS_TR).map(m => (
                  <th key={m} className="px-2 py-2 text-center min-w-[50px]">{m}</th>
                ))}
                <th className="px-2 py-2 text-center">Amp.</th>
              </tr>
            </thead>
            <tbody>
              {seasonalData.map((s, idx) => {
                const max = Math.max(...s.months);
                return (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1.5 sticky left-0 z-10 font-medium whitespace-nowrap" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {s.product.length > 22 ? s.product.substring(0, 22) + '..' : s.product}
                    </td>
                    {s.months.map((v, i) => {
                      const intensity = max > 0 ? v / max : 0;
                      const bg = intensity > 0.8 ? 'bg-green-600 text-white' :
                        intensity > 0.5 ? 'bg-green-300 text-green-900' :
                          intensity > 0.2 ? 'bg-green-100 text-green-800' :
                            v > 0 ? 'bg-green-50 text-green-700' : 'text-gray-300';
                      return (
                        <td key={i} className={`px-1 py-1.5 text-center ${bg} font-mono`}>
                          {v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : v > 0 ? '·' : '-'}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-bold ${s.amplitude > 100 ? 'text-red-600' : s.amplitude > 50 ? 'text-amber-600' : 'text-green-600'}`}>
                        %{s.amplitude.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Amplitüd = (Peak - Ortalama) / Ortalama × 100. Yüksek amplitüd = güçlü mevsimsellik
        </p>
      </div>

      {/* Ticaret Dengesizliği */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Ticaret Dengesizliği Uyarıları — {year}
        </h3>
        {imbalanced.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Ciddi dengesizlik tespit edilmedi ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  <th className="text-left px-3 py-2">Ürün</th>
                  <th className="text-right px-3 py-2">İhracat</th>
                  <th className="text-right px-3 py-2">İthalat</th>
                  <th className="text-right px-3 py-2">Oran</th>
                  <th className="text-center px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {imbalanced.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-green-50">
                    <td className="px-3 py-2 font-medium">{r.product}</td>
                    <td className="px-3 py-2 text-right text-green-600">{formatMoney(r.exp)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatMoney(r.imp)}</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {r.ratio === Infinity ? '∞' : `${r.ratio.toFixed(1)}x`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.direction === 'İthalat Ağırlıklı' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-0.5 rounded-full">
                          <TrendingDown className="w-3 h-3" /> İthalat Bağımlı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                          <TrendingUp className="w-3 h-3" /> İhracat Gücü
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Birim Fiyat Trendi */}
      {unitPrices.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Birim Fiyat Trendi ($/birim) — Top 5 Ürün
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unitPrices.map((up, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'var(--text-primary)' }}>{up.product}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={up.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="yil" fontSize={9} />
                    <YAxis fontSize={9} tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
                    <Bar dataKey="exp_usd_ton" fill="#10b981" name="İhracat $/birim" opacity={0.6} />
                    <Line dataKey="imp_usd_ton" stroke="#f59e0b" name="İthalat $/birim" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sezonsal Fırsat Takvimi */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4 text-indigo-600" />
          Sezonsal İhracat Fırsat Takvimi — {year}
        </h3>
        {opportunities.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Belirgin mevsimsel fırsat bulunamadı</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={opportunities.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={10} tickFormatter={v => `${v.toFixed(1)}x`} />
                <YAxis type="category" dataKey="product" fontSize={10} width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}x`, 'Mevsimsel Endeks']} />
                <Bar dataKey="seasonalIndex" name="Mevsimsel Endeks" radius={[0, 4, 4, 0]}>
                  {opportunities.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={i < 3 ? '#7c3aed' : i < 6 ? '#a78bfa' : '#c4b5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {opportunities.slice(0, 9).map((o, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium truncate mr-2" style={{ color: 'var(--text-primary)' }}>{o.product}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-purple-600 font-bold">{o.bestMonths.join(', ')}</span>
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>|</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatMoney(o.peakExp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mevsimsellik Trend — En Yüksek Amplitüdlü 3 Ürün */}
      {seasonalData.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-4 h-4 text-teal-600" />
            En Yüksek Mevsimsel Amplitüd — Top 3 Ürün Aylık Profil
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={Object.entries(MONTHS_TR).map(([k, v]) => ({
              ax: v,
              ...(seasonalData.slice(0, 3).reduce((acc, s, i) => {
                acc[`p${i}`] = s.months[Number(k) - 1] || 0;
                return acc;
              }, {} as Record<string, number>)),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ax" fontSize={10} />
              <YAxis fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
              <Legend />
              {seasonalData.slice(0, 3).map((s, i) => (
                <Area
                  key={i}
                  type="monotone"
                  dataKey={`p${i}`}
                  name={s.product.substring(0, 20)}
                  stroke={['#10b981', '#f59e0b', '#6366f1'][i]}
                  fill={['#10b981', '#f59e0b', '#6366f1'][i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
