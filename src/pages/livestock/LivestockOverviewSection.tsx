import { yuzde } from '../../utils/sayi';
import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, Legend
} from 'recharts';
import { fetchRows, fetchAgg, num } from '../../services/d1';

const R_CANLI = 'fao/uretim-hayvansal-canlihayvan';
const R_BIR = 'fao/uretim-hayvansal-birincil';
const R_ISL = 'fao/uretim-hayvansal-islenmis';
// Kıta/toplam satırları için TAM liste. Eskiden yalnızca 'World'/'Total'
// çıkarılıyordu; oysa tabloda Asya, Afrika, Southern Asia gibi bölge satırları
// da var ve dünya hayvan varlığı 3 katına çıkıyordu (103,9 Mr baş; FAO'nun
// kendi 'World' satırı 34,8 Mr).
const EX = { preset: 'v1' as const, col: 'ulkead' };

/**
 * Canlı hayvan sayısı iki birimde geliyor: '1000 An' (bin baş) ve 'An'/'No'.
 * Eski SQL bunu SUM içinde CASE WHEN ile ölçekliyordu; toplama ucunda böyle bir
 * ifade kurulamadığı için birime göre gruplanıp çarpan burada uygulanıyor.
 */
const basCarpani = (birim: unknown) => (String(birim ?? '') === '1000 An' ? 1000 : 1);
function basaCevir(satirlar: { miktar_birim?: unknown; sum_miktar_deger?: unknown }[]): number {
  return satirlar.reduce((acc, r) => acc + num(r.sum_miktar_deger) * basCarpani(r.miktar_birim), 0);
}
import { TurkeyHeatMap, type RegionTotal } from '../../components/TurkeyHeatMap';
import { InsightCard, type Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import { generateLivestockInsights } from '../../utils/livestockInsights';
import {
  calculateCAGR, calculateHHI, calculateYoY, calculateVolatility,
  type YearValue
} from '../../utils/livestockCalculations';
import { type Tab, type DataItem, formatNumber, formatShort } from './livestockUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { pctTick } from '../../utils/chartTicks';
import { ChartCard } from '../../components/ui/Card';
import { Beef, Egg, Milk, Rocket } from 'lucide-react';

interface Props {
  selectedYear: string;
  setActiveTab: (tab: Tab) => void;
  setLoading: (v: boolean) => void;
}

export default function LivestockOverviewSection({ selectedYear, setActiveTab, setLoading }: Props) {
  const [overviewKPIs, setOverviewKPIs] = useState<Record<string, number> | null>(null);
  const [overviewTrend, setOverviewTrend] = useState<DataItem[]>([]);
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
  const [execSummary, setExecSummary] = useState<{
    supplyChainRatio: number;
    primaryTotal: number; processedTotal: number;
    turkeyPrimaryRank: number; turkeyEffRank: string;
    topRisk: string; topOpportunity: string;
    crossInsights: Insight[];
  } | null>(null);
  const [provincialLivestock, setProvincialLivestock] = useState<RegionTotal[]>([]);
  /*
   * İl bazlı hayvan sayıları TÜİK'in SDMX API'sinde YOK (yalnızca MEDAS'ta),
   * yani otomatik tazelenemiyor ve şu an 2024'te duruyor. Kullanıcı grafiğe
   * bakıp güncel sanmasın diye veri yılı başlıkta yazıyor.
   */
  const [provincialYear, setProvincialYear] = useState<string>('');
  const [livestockMapType, setLivestockMapType] = useState<'cattle' | 'sheep' | 'goat' | 'total'>('total');

  // Load provincial livestock data for Turkey map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // WHERE tarih = (SELECT MAX(tarih) …) karşılığı istemcide.
        const ilHayvan = await fetchRows('il/hayvan-sayilari', { limit: 2000 });
        const sonTarih = ilHayvan.reduce((en, r) => {
          const t = String(r.tarih ?? '');
          return t > en ? t : en;
        }, '');
        const provincialRes = { data: ilHayvan
          .filter((r) => String(r.tarih ?? '') === sonTarih)
          .sort((a, b) => String(a.il).localeCompare(String(b.il), 'tr'))
          .map((r) => ({
            province: String(r.il ?? ''),
            cattle_count: num(r.sigir_varligi_bas) + num(r.manda_varligi_bas),
            sheep_count: num(r.koyun_varligi_bas),
            goat_count: num(r.keci_varligi_bas),
            total_livestock: num(r.sigir_varligi_bas) + num(r.manda_varligi_bas)
              + num(r.koyun_varligi_bas) + num(r.keci_varligi_bas),
          })) };
        if (!cancelled) setProvincialYear(sonTarih.slice(0, 4));
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

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const [stocksRows, meatRes, milkRes, eggsRes, trendRows] = await Promise.all([
        fetchAgg(R_CANLI, { groupBy: ['miktar_birim'], sum: ['miktar_deger'],
          where: { year: selectedYear }, exclude: EX }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'],
          where: { year: selectedYear, uretim_birim: 't' },
          likeAny: { urunad: ['%meat%', '%offal%', '%fat%'] }, exclude: EX }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'],
          where: { year: selectedYear, uretim_birim: 't' },
          likeAny: { urunad: ['%milk%', '%cheese%', '%butter%', '%cream%'] }, exclude: EX }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { year: selectedYear },
          likeAny: { urunad: ['%egg%'] }, exclude: EX }),
        // Grafikte yalnızca son 20 yıl gösteriliyor; tüm seriyi çekmek D1'i
        // gereksiz yere zorluyordu ("DB is overloaded").
        fetchAgg(R_CANLI, { groupBy: ['year', 'miktar_birim'], sum: ['miktar_deger'],
          whereGte: { year: parseInt(selectedYear) - 20 },
          exclude: EX, orderBy: 'year', dir: 'desc' }),
      ]);

      const stocksRes = { data: [{ total: basaCevir(stocksRows) }] };
      // Yıl bazında birim çevrimi sonrası tek satıra indir.
      const yilHaritasi = new Map<string, number>();
      trendRows.forEach((r) => {
        const y = String(r.year);
        yilHaritasi.set(y, (yilHaritasi.get(y) ?? 0)
          + num(r.sum_miktar_deger) * basCarpani(r.miktar_birim));
      });
      const trendRes = { data: [...yilHaritasi.entries()]
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .slice(0, 20)
        .map(([year, stocks]) => ({ year, stocks })) };

      setOverviewKPIs({
        totalStocks: Number(stocksRes.data?.[0]?.total || 0),
        totalMeat: num(meatRes[0]?.sum_uretim_deger),
        totalMilk: num(milkRes[0]?.sum_uretim_deger),
        totalEggs: num(eggsRes[0]?.sum_uretim_deger),
      });

      if (trendRes.data) {
        const trendData = trendRes.data.map((d: Record<string, string | number>) => ({
          year: String(d.year),
          value: Number(d.stocks) || 0
        })).reverse();
        setOverviewTrend(trendData);

        const yearValues: YearValue[] = trendData.map(d => ({
          year: d.year as string,
          value: d.value as number
        }));

        const recentYears = yearValues.slice(-5);
        const cagrResult = calculateCAGR(recentYears);
        
        let yoyGrowth = null;
        if (yearValues.length >= 2) {
          const current = yearValues[yearValues.length - 1].value;
          const previous = yearValues[yearValues.length - 2].value;
          yoyGrowth = calculateYoY(current, previous);
        }

        const volatility = calculateVolatility(yearValues);

        const ulkeSatirlari = await fetchAgg(R_CANLI, {
          groupBy: ['ulkead', 'year', 'miktar_birim'], sum: ['miktar_deger'],
          exclude: EX, whereGte: { year: parseInt(selectedYear) - 5 },
        });
        const ulkeYilHaritasi = new Map<string, Map<string, number>>();
        ulkeSatirlari.forEach((r) => {
          const ulke = String(r.ulkead ?? '');
          const yil = String(r.year);
          if (!ulkeYilHaritasi.has(ulke)) ulkeYilHaritasi.set(ulke, new Map());
          const ic = ulkeYilHaritasi.get(ulke)!;
          ic.set(yil, (ic.get(yil) ?? 0) + num(r.sum_miktar_deger) * basCarpani(r.miktar_birim));
        });
        const countryGrowthRes = { data: [...ulkeYilHaritasi.entries()]
          .flatMap(([ulkead, yillar]) => [...yillar.entries()]
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([year, total]) => ({ ulkead, year, total }))) };

        if (countryGrowthRes.data) {
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

          const topMover = countryCAGRs[0];
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

        const [primaryTotalRes, processedTotalRes, turkeyPrimaryRes] = await Promise.all([
          fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { year: yr, uretim_birim: 't' }, exclude: EX }),
          fetchAgg(R_ISL, { sum: ['uretim_deger'], where: { year: yr, uretim_birim: 't' }, exclude: EX }),
          fetchAgg(R_BIR, { groupBy: ['ulkead'], sum: ['uretim_deger'],
            where: { year: yr, uretim_birim: 't' }, exclude: EX,
            orderBy: 'sum_uretim_deger', dir: 'desc' }),
        ]);

        const pTotal = num(primaryTotalRes[0]?.sum_uretim_deger);
        const prTotal = num(processedTotalRes[0]?.sum_uretim_deger);
        const ratio = pTotal > 0 ? (prTotal / pTotal) * 100 : 0;

        const pRanks = turkeyPrimaryRes;
        const trPrimaryRank = pRanks.findIndex(r => String(r.ulkead) === 'Türkiye') + 1 || 0;

        const xIns: Insight[] = [];
        xIns.push({ id: 'x-1', type: 'info', message: `Tedarik Zinciri: Dünya birincil üretiminin ${yuzde(ratio, 1)}'i işlenmiş ürüne dönüştürülüyor`, severity: 'medium' });
        if (trPrimaryRank > 0 && trPrimaryRank <= 10) {
          xIns.push({ id: 'x-2', type: 'achievement', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada`, severity: 'medium' });
        } else if (trPrimaryRank > 10) {
          xIns.push({ id: 'x-2', type: 'warning', message: `Türkiye birincil hayvansal üretimde dünya ${trPrimaryRank}. sırada — ilk 10'a girme potansiyeli mevcut`, severity: 'medium' });
        }
        if (ratio < 20) {
          xIns.push({ id: 'x-3', type: 'decline', message: `İşleme oranı düşük (${yuzde(ratio, 1)}) — katma değerli üretim potansiyeli büyük`, severity: 'high' });
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
  }, [selectedYear, setLoading]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  return (
    <>
      {/* ─── KPI Row 1: Main Stats ─── */}
      {overviewKPIs && (
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
          <div className="kpi-card large">
            <div className="kpi-header"><span className="kpi-title">KÜRESEL HAYVAN STOKU</span></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalStocks)}</div>
            <div className="kpi-subtitle">Canlı hayvan varlığı ({selectedYear})</div>
          </div>
          {intelligenceMetrics && (
            <>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">5Y CAGR</span><div className="kpi-icon" style={{background: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? '#22c55e' : '#ef4444'}}></div></div>
                <div className="kpi-value" style={{color: (intelligenceMetrics.cagr5Year ?? 0) >= 0 ? '#22c55e' : '#ef4444'}}>{yuzde((intelligenceMetrics.cagr5Year ?? 0), 2)}</div>
                <div className="kpi-subtitle">Yıllık bileşik büyüme</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">KONSANTRASYON</span></div>
                <div className="kpi-value">{(intelligenceMetrics.marketHHI ?? 0).toFixed(0)}</div>
                <div className="kpi-subtitle">HHI · {(intelligenceMetrics.marketHHI ?? 0) < 500 ? 'Dağınık' : (intelligenceMetrics.marketHHI ?? 0) < 1500 ? 'Orta' : 'Yoğun'}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header"><span className="kpi-title">VOLATİLİTE</span></div>
                <div className="kpi-value">{yuzde((intelligenceMetrics.volatility ?? 0), 1)}</div>
                <div className="kpi-subtitle">{(intelligenceMetrics.volatility ?? 0) < 5 ? 'Düşük' : (intelligenceMetrics.volatility ?? 0) < 15 ? 'Orta' : 'Yüksek'}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Row 2: Highlights */}
      {overviewKPIs && intelligenceMetrics && (
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '12px'}}>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">EN HIZLI BÜYÜYEN</span><div className="kpi-icon green"><Rocket size={18} aria-hidden="true" /></div></div>
            <div className="kpi-value" style={{fontSize: '1rem'}}>{intelligenceMetrics.topMoverCountry || '-'}</div>
            <div className="kpi-subtitle">CAGR {yuzde((intelligenceMetrics.topMoverGrowth ?? 0), 1)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">ET ÜRETİMİ</span><div className="kpi-icon red"><Beef size={18} aria-hidden="true" /></div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalMeat)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">SÜT ÜRETİMİ</span><div className="kpi-icon blue"><Milk size={18} aria-hidden="true" /></div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalMilk)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-title">YUMURTA</span><div className="kpi-icon orange"><Egg size={18} aria-hidden="true" /></div></div>
            <div className="kpi-value">{formatNumber(overviewKPIs.totalEggs)}</div>
            <div className="kpi-subtitle">ton ({selectedYear})</div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{marginTop: '16px'}}>
          <InsightCard insights={[...insights, ...(execSummary?.crossInsights || [])]} />
        </div>
      )}

      {/* Executive Summary Card */}
      {execSummary && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">Executive Summary — Tedarik Zinciri</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px'}}>
            <div style={{background: 'rgba(59,130,246,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Birincil Üretim</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6'}}>{formatShort(execSummary.primaryTotal)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>ton</div>
            </div>
            <div style={{background: 'rgba(168,85,247,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>İşleme Oranı</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#a855f7'}}>{yuzde(execSummary.supplyChainRatio, 1)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>dönüşüm</div>
            </div>
            <div style={{background: 'rgba(139,92,246,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>İşlenmiş Üretim</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6'}}>{formatShort(execSummary.processedTotal)}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>ton</div>
            </div>
            <div style={{background: 'rgba(239,68,68,.08)', borderRadius: '12px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Birincil Sıra</div>
              <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#ef4444'}}>#{execSummary.turkeyPrimaryRank || '—'}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>dünya</div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Tab Navigation */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px'}}>
        {[
          {tab: 'stocks' as Tab, icon: '', label: 'Canlı Hayvan', desc: 'Stok ve tür analizi'},
          {tab: 'primary' as Tab, icon: '', label: 'Birincil Üretim', desc: 'Et, süt, yumurta'},
          {tab: 'processed' as Tab, icon: '', label: 'İşlenmiş Ürünler', desc: 'Katma değerli'},
          {tab: 'efficiency' as Tab, icon: '', label: 'Verimlilik', desc: 'Ülke karşılaştırma'},
          {tab: 'predictions' as Tab, icon: '', label: 'Tahminler', desc: 'AI projeksiyon'},
        ].map(item => (
          <button key={item.tab} onClick={() => setActiveTab(item.tab)}
            style={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'}}>
            <div style={{fontSize: '1.5rem', marginBottom: '8px'}}>{item.icon}</div>
            <div style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem'}}>{item.label}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>{item.desc}</div>
          </button>
        ))}
      </div>

      {/* Row 3: 20-Year Trend */}
      {overviewTrend.length > 0 && (
        <div className="chart-grid" style={{marginTop: '24px'}}>
          <ChartCard title="Küresel Hayvan Stoku Trendi (20 Yıl)" span={2} action={<ChartInsightButton title="Küresel Hayvan Stoku Trendi (20 Yıl)" description="Uzun vadeli küresel hayvan stok trendi" data={overviewTrend} context={{}} />}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={overviewTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                <Tooltip formatter={(value: number) => [formatNumber(value), 'Hayvan Stoku']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Row 4: Growth Quadrant */}
      {countryGrowthData.length > 0 && (
        <div className="chart-grid" style={{marginTop: '20px'}}>
          <ChartCard title="Ülke Growth Quadrant (CAGR × Pazar Payı)" span={2} action={<ChartInsightButton title="Ülke Growth Quadrant (CAGR × Pazar Payı)" description="Ülkelerin CAGR ve pazar payı dağılımı" data={countryGrowthData.slice(0, 30)} context={{}} />}>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="marketShare" name="Pazar Payı" tickFormatter={(v: number) => formatShort(v)}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="number" dataKey="cagr" name="CAGR" unit="%" tickFormatter={pctTick}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                <ZAxis range={[40, 400]} />
                <Tooltip formatter={(value: number, name: string) => [name === 'CAGR' ? `${yuzde(value, 2)}` : formatNumber(value), name]}
                  labelFormatter={(_, payload) => { if (payload && payload.length > 0) { const d = payload[0].payload as {country: string}; return d.country; } return ''; }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
                <Scatter name="Ülkeler" data={countryGrowthData.slice(0, 30)} fill="#3b82f6">
                  {countryGrowthData.slice(0, 30).map((c, idx) => (
                    <Cell key={`gq-${idx}`} fill={c.country === 'Türkiye' ? '#ef4444' : c.cagr > 3 ? '#22c55e' : c.cagr > 0 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Row 5: Turkey Provincial Heat Map */}
      {provincialLivestock.length > 0 && (
        <div className="chart-card" style={{marginTop: '20px'}}>
          <h3 className="chart-title">
            🇹🇷 İl Bazlı Hayvan Varlığı Haritası{provincialYear && ` (${provincialYear})`}
          </h3>
          <div style={{display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap'}}>
            {(['total', 'cattle', 'sheep', 'goat'] as const).map(type => (
              <button key={type} onClick={() => setLivestockMapType(type)}
                style={{padding: '6px 14px', borderRadius: '8px',
                  border: `1px solid ${livestockMapType === type ? 'var(--primary)' : 'var(--border)'}`,
                  background: livestockMapType === type ? 'var(--primary)' : 'var(--bg-primary)',
                  color: livestockMapType === type ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600}}>
                {type === 'total' ? 'Toplam' : type === 'cattle' ? 'Sığır+Manda' : type === 'sheep' ? 'Koyun' : 'Keçi'}
              </button>
            ))}
          </div>
          <TurkeyHeatMap
            regionTotals={provincialLivestock.map(p => ({
              ...p,
              value: livestockMapType === 'total' ? p.value
                : livestockMapType === 'cattle' ? ((p as any).cattle || 0)
                : livestockMapType === 'sheep' ? ((p as any).sheep || 0)
                : ((p as any).goat || 0)
            }))}
            unitLabel="baş"
          />
        </div>
      )}
    </>
  );
}
