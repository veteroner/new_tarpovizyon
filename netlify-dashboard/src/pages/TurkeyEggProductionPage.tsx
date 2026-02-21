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
import { fetchEggPrices, fetchQuery } from '../services/api';

type YearPoint = {
  year: number;
  eggsMillion: number;
};

type TuikTab = 'overview' | 'production' | 'yield' | 'projection';

type TuikEggData = {
  year: string;
  eggProduction: number; // Yumurta üretimi (bin adet veya ton)
  layerCount: number; // Yumurtacı tavuk sayısı (bin adet)
  yieldPerBird: number; // Tavuk başına verim (adet/yıl)
  nativeLayer: number; // Yerli yumurtacı (bin adet)
  hybridLayer: number; // Hibrit yumurtacı (bin adet)
  hatchedEggs: number; // Kuluçkaya basılan yumurta (bin adet)
};

type MonthlyEggData = {
  month: string;
  value: number;
};

type EggEconomicData = {
  tarih: string;
  yumurta_maliyet_tl_kg: number;
  yumurta_uretici_fiyati_tl_kg: number;
  yumurtaci_tavuk_yemi_tl_kg: number;
  tuketici_fiyati_tl: number;
  karlilik: number;
  uretici_fiyati_maliyet_farki_tl_kg: number;
  parite_yumurta_yem_paritesi: number;
};

function parseTrNumber(input: unknown): number {
  const raw = String(input ?? '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(/\s+/g, '');
  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 0) {
    const n = Number.parseFloat(normalized.replace(/\./g, '').replace(/,/g, '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount > 1) {
    const n = Number.parseFloat(normalized.replace(/\./g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (dotCount === 1) {
    const [intPart, fracOrGroup] = normalized.split('.');
    if (fracOrGroup?.length === 3) {
      const n = Number.parseFloat(intPart + fracOrGroup);
      return Number.isFinite(n) ? n : 0;
    }
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function extractYear(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  // Examples seen: "01.01.1961"
  const m = raw.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  return Number.parseInt(raw, 10) || 0;
}

function formatMillion(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
}

function formatTL(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function TurkeyEggProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<EggEconomicData[]>([]);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [worldRanking, setWorldRanking] = useState<{ world: number; eu: number } | null>(null);
  const [eggPrices, setEggPrices] = useState<Partial<Record<string, number>>>({});
  const [eggPriceDate, setEggPriceDate] = useState<string | null>(null);
  const [eggPriceError, setEggPriceError] = useState<string | null>(null);
  
  // TÜİK Yumurta Verileri
  const [activeTuikTab, setActiveTuikTab] = useState<TuikTab>('overview');
  const [tuikData, setTuikData] = useState<TuikEggData[]>([]);
  const [monthlyEgg, setMonthlyEgg] = useState<MonthlyEggData[]>([]);
  const [monthlyLayer, setMonthlyLayer] = useState<MonthlyEggData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchQuery('SELECT * FROM o_toplam_uretim_veri');
      const data = (res.data ?? []) as Record<string, unknown>[];

      const points = data
        .map((row) => {
          const year = extractYear(row['Yıllar']);
          const eggsMillion = parseTrNumber(row['Yumurta (Milyon Adet)']);
          return { year, eggsMillion };
        })
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          yumurta_maliyet_tl_kg, yumurta_uretici_fiyati_tl_kg,
          yumurtaci_tavuk_yemi_tl_kg, tuketici_fiyati_tl,
          karlilik, uretici_fiyati_maliyet_farki_tl_kg,
          parite_yumurta_yem_paritesi
          FROM oner_yumurta_maliyeti_fiyati 
          ORDER BY tarih DESC LIMIT 60`;
        
        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            yumurta_maliyet_tl_kg: Number(item['yumurta_maliyet_tl_kg']) || 0,
            yumurta_uretici_fiyati_tl_kg: Number(item['yumurta_uretici_fiyati_tl_kg']) || 0,
            yumurtaci_tavuk_yemi_tl_kg: Number(item['yumurtaci_tavuk_yemi_tl_kg']) || 0,
            tuketici_fiyati_tl: Number(item['tuketici_fiyati_tl']) || 0,
            karlilik: Number(item['karlilik']) || 0,
            uretici_fiyati_maliyet_farki_tl_kg: Number(item['uretici_fiyati_maliyet_farki_tl_kg']) || 0,
            parite_yumurta_yem_paritesi: Number(item['parite_yumurta_yem_paritesi']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Yumurta ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // TÜİK Yumurta Üretim Verileri
      try {
        const tuikQuery = `
          SELECT
            yil,
            CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as value,
            urun
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN (
            'Tavuk Yumurtası', 
            'Yumurtacı Tavuk Sayısı',
            'Yerli Yumurtacı Tavuk',
            'Hibrit Yumurtacı Tavuk',
            'Yumurtacı Tavuk (Layer) civivi Üretimi için Kuluçkaya Basılan Yumurta'
          )
          ORDER BY yil DESC, urun
        `;
        const tuikRes = await fetchQuery(tuikQuery);
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const yearMap = new Map<string, Omit<TuikEggData, 'year'> & { year: string }>();
          
          tuikRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            if (!yearMap.has(year)) {
              yearMap.set(year, {
                year,
                eggProduction: 0,
                layerCount: 0,
                yieldPerBird: 0,
                nativeLayer: 0,
                hybridLayer: 0,
                hatchedEggs: 0
              });
            }
            
            const yearData = yearMap.get(year);
            if (yearData) {
              const urun = String(row.urun);
              const value = Number(row.value) || 0;
              
              if (urun === 'Tavuk Yumurtası') {
                yearData.eggProduction = value; // bin adet veya ton
              } else if (urun === 'Yumurtacı Tavuk Sayısı') {
                yearData.layerCount = value; // bin adet
              } else if (urun === 'Yerli Yumurtacı Tavuk') {
                yearData.nativeLayer = value; // bin adet
              } else if (urun === 'Hibrit Yumurtacı Tavuk') {
                yearData.hybridLayer = value; // bin adet
              } else if (urun.includes('Kuluçkaya Basılan')) {
                yearData.hatchedEggs = value; // bin adet
              }
            }
          });
          
          const tuikDataArray: TuikEggData[] = Array.from(yearMap.values())
            .map(d => ({
              ...d,
              yieldPerBird: d.layerCount > 0 ? (d.eggProduction * 1000) / (d.layerCount * 1000) : 0 // adet/baş/yıl
            }))
            .sort((a, b) => Number(b.year) - Number(a.year));
          
          setTuikData(tuikDataArray);
          console.log('TÜİK Yumurta data loaded:', tuikDataArray.length, 'years');
        }

        // Aylık dağılım - En son yıl için
        const latestYearQuery = `SELECT MAX(yil) as max_year FROM tuik_hayvancilik_kumeshayvanciligi`;
        const latestYearRes = await fetchQuery(latestYearQuery);
        const latestYear = String(latestYearRes.data?.[0]?.max_year || '2025');
        
        const monthlyQuery = `
          SELECT urun, birim, Ocak, Şubat, Mart, Nisan, Mayıs, Haziran, Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE yil = '${latestYear}' AND urun IN ('Tavuk Yumurtası', 'Yumurtacı Tavuk Sayısı')
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
            
            if (urun === 'Tavuk Yumurtası') {
              setMonthlyEgg(monthlyValues);
            } else if (urun === 'Yumurtacı Tavuk Sayısı') {
              setMonthlyLayer(monthlyValues);
            }
          });
        }
      } catch (tuikError) {
        console.warn('TÜİK yumurta verileri yüklenemedi:', tuikError);
      }

      // Dünya Sıralaması - şimdilik yumurta için veri yok
      // Gelecekte oner_dunya_hayvansal_uretim_miktarla tablosuna eklenirse burada yapı hazır
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map(c => `'${c}'`).join(',');

        // Yumurta için sorgu (tabloda 'Yumurta' ürünü olduğunda)
        const eggQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun LIKE '%umurta%' OR urun LIKE 'Egg%'
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND (urun LIKE '%umurta%' OR urun LIKE 'Egg%') LIMIT 1)) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE (urun LIKE '%umurta%' OR urun LIKE 'Egg%') 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND (urun LIKE '%umurta%' OR urun LIKE 'Egg%') LIMIT 1)) as eu_rank
        `;
        const eggRes = await fetchQuery(eggQuery);

        if (eggRes.data && eggRes.data.length > 0 && eggRes.data[0]?.world_rank) {
          setWorldRanking({
            world: Number(eggRes.data[0]?.world_rank) || 0,
            eu: Number(eggRes.data[0]?.eu_rank) || 0
          });
        }
      } catch {
        // Yumurta verisi henüz tabloda yok, sessizce geç
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

  useEffect(() => {
    let cancelled = false;
    const loadEggPrices = async () => {
      try {
        console.log('🥚 Fetching egg prices...');
        const res = await fetchEggPrices();
        console.log('🥚 Egg prices response:', res);
        
        if (!cancelled) {
          if (res.prices && Object.keys(res.prices).length > 0) {
            setEggPrices(res.prices);
            setEggPriceError(null);
          } else {
            console.warn('⚠️ No prices returned from API');
            setEggPriceError('Fiyatlar yüklenemedi');
          }
          if (res.date) setEggPriceDate(res.date);
        }
      } catch (error) {
        console.error('❌ Egg prices fetch error:', error);
        if (!cancelled) setEggPriceError('API hatası');
      }
    };

    loadEggPrices();
    const intervalId = window.setInterval(loadEggPrices, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].eggsMillion > 0) return series[i];
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
    if (!latest || !prev || prev.eggsMillion <= 0) return 0;
    return ((latest.eggsMillion - prev.eggsMillion) / prev.eggsMillion) * 100;
  }, [latest, prev]);

  const peak = useMemo(() => {
    return series.reduce<YearPoint | undefined>((best, cur) => {
      if (!best) return cur;
      return cur.eggsMillion > best.eggsMillion ? cur : best;
    }, undefined);
  }, [series]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥚 Türkiye Yumurta Üretimi (TÜİK)</h1>
        <p className="page-subtitle">Yıllık yumurta üretimi (milyon adet)</p>
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
              <div className="kpi-value">{formatMillion(latest?.eggsMillion ?? 0)}</div>
              <div className="kpi-subtitle">milyon adet ({latest?.year ?? '-'})</div>
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

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ZİRVE</span>
                <div className="kpi-icon orange">🏆</div>
              </div>
              <div className="kpi-value">{formatMillion(peak?.eggsMillion ?? 0)}</div>
              <div className="kpi-subtitle">milyon adet ({peak?.year ?? '-'})</div>
            </div>

            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
              <div className="kpi-header">
                <span className="kpi-title" style={{ color: 'white' }}>GÜNCEL YUMURTA FİYATLARI 🥚</span>
                <div className="kpi-icon orange">💰</div>
              </div>
              {eggPriceError ? (
                <div style={{ fontSize: '0.9rem', color: 'white', padding: '10px 0' }}>{eggPriceError}</div>
              ) : Object.keys(eggPrices).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '10px 0' }}>
                  {eggPrices.double && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Double</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.double)} TL</div>
                    </div>
                  )}
                  {eggPrices.eski_ana && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Eski Ana</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.eski_ana)} TL</div>
                    </div>
                  )}
                  {eggPrices.yeni_ana && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Yeni Ana</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.yeni_ana)} TL</div>
                    </div>
                  )}
                  {eggPrices.yarka && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Yarka</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.yarka)} TL</div>
                    </div>
                  )}
                  {eggPrices.pilic && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Piliç</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.pilic)} TL</div>
                    </div>
                  )}
                  {eggPrices.kilavuz && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2px' }}>Kılavuz</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>{formatTL(eggPrices.kilavuz)} TL</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', padding: '10px 0' }}>Fiyatlar yükleniyor...</div>
              )}
              <div className="kpi-subtitle" style={{ marginTop: '4px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem' }}>
                {eggPriceDate ? `${eggPriceDate}` : 'Basmakçı Tavukçuluk'}
              </div>
            </div>

            {worldRanking && (
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">YUMURTA</span>
                  <div className="kpi-icon yellow">🥚</div>
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
            
            const eggCAGR = years > 0 
              ? ((Math.pow(lastYear.eggProduction / firstYear.eggProduction, 1 / years) - 1) * 100) 
              : 0;
            
            const layerCAGR = years > 0
              ? ((Math.pow(lastYear.layerCount / firstYear.layerCount, 1 / years) - 1) * 100)
              : 0;
            
            const yieldChange = lastYear.yieldPerBird - firstYear.yieldPerBird;
            const hybridShare = (lastYear.hybridLayer / lastYear.layerCount) * 100;
            
            return (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                marginTop: '24px',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Yumurta Intelligence Özeti
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>YUMURTA CAGR</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{eggCAGR.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{years} Yıl Büyüme</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>TAVUK CAGR</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{layerCAGR.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Popülasyon ({years}Y)</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>VERİM ARTIŞI</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{yieldChange > 0 ? '+' : ''}{yieldChange.toFixed(0)}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Adet/Tavuk/Yıl</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>HİBRİT PAYI</div>
                    <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{hybridShare.toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Modernizasyon</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📈 Yumurta Üretimi Trendi</h3>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => formatMillion(Number(v))}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${formatMillion(value)} milyon`, 'Yumurta']}
                    labelFormatter={(label) => `Yıl: ${label}`}
                  />
                  <Area type="monotone" dataKey="eggsMillion" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yumurta Ekonomik Göstergeler */}
          {economicData.length > 0 && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🥚 Yumurta Ekonomik Göstergeleri
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>(
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
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>{filteredData[0]?.yumurta_uretici_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{filteredData[0]?.tarih}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>TÜKETİCİ FİYATI</span>
                        <div style={{ fontSize: '1.5rem' }}>🛒</div>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2563eb' }}>{filteredData[0]?.tuketici_fiyati_tl.toFixed(2)} ₺/adet</div>
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
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>{filteredData[0]?.parite_yumurta_yem_paritesi.toFixed(2)}</div>
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
                            dataKey="yumurta_uretici_fiyati_tl_kg" 
                            name="Üretici Fiyatı" 
                            stroke="#10b981" 
                            strokeWidth={4}
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="yumurta_maliyet_tl_kg" 
                            name="Maliyet" 
                            stroke="#dc2626" 
                            strokeWidth={4}
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
                            stroke="#a855f7" 
                            fill="#a855f7" 
                            fillOpacity={0.4}
                            strokeWidth={3.5}
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
                            dataKey="yumurtaci_tavuk_yemi_tl_kg" 
                            name="Yem Fiyatı (₺/kg)" 
                            stroke="#f59e0b" 
                            strokeWidth={4}
                            dot={{ fill: '#f59e0b', r: 4 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="parite_yumurta_yem_paritesi" 
                            name="Yem Paritesi" 
                            stroke="#6366f1" 
                            strokeWidth={4}
                            dot={{ fill: '#6366f1', r: 4 }}
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
                            {filteredData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.uretici_fiyati_maliyet_farki_tl_kg >= 0 ? '#16a34a' : '#dc2626'} 
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
                      📝 Yumurta Ekonomik Göstergeleri Özeti
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
                          {(filteredData.reduce((sum, d) => sum + d.yumurta_uretici_fiyati_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ortalama Yem Fiyatı
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                          {(filteredData.reduce((sum, d) => sum + d.yumurtaci_tavuk_yemi_tl_kg, 0) / filteredData.length).toFixed(2)} ₺/kg
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

          {/* TÜİK Yumurta Üretim Analizi - Tab Sistemi */}
          {tuikData.length > 0 && (
            <>
              <div style={{ marginTop: '50px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🥚 TÜİK Yumurta Üretim Analizi (2010-2025)
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Yıllık yumurta üretimi, yumurtacı tavuk sayısı, verim analizi ve kuluçka verileri
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
                  onClick={() => setActiveTuikTab('yield')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: activeTuikTab === 'yield' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTuikTab === 'yield' ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>🐔</span>
                  <span>Verim Analizi</span>
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
                        <span className="kpi-title">YUMURTA ÜRETİMİ (2025)</span>
                        <div className="kpi-icon orange">🥚</div>
                      </div>
                      <div className="kpi-value">{formatShort(tuikData[0]?.eggProduction * 1000)} adet</div>
                      <div className="kpi-subtitle">{tuikData[0]?.eggProduction.toLocaleString('tr-TR')} bin adet</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">YUMURTACI TAVUK</span>
                        <div className="kpi-icon green">🐔</div>
                      </div>
                      <div className="kpi-value">{formatShort(tuikData[0]?.layerCount * 1000)} adet</div>
                      <div className="kpi-subtitle">{tuikData[0]?.layerCount.toLocaleString('tr-TR')} bin adet</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">TAVUK BAŞINA VERİM</span>
                        <div className="kpi-icon blue">📊</div>
                      </div>
                      <div className="kpi-value">{tuikData[0]?.yieldPerBird.toFixed(0)} adet/yıl</div>
                      <div className="kpi-subtitle">Yıllık ortalama</div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">KULUÇKA YUMURTAs</span>
                        <div className="kpi-icon yellow">🥚</div>
                      </div>
                      <div className="kpi-value">{formatShort(tuikData[0]?.hatchedEggs * 1000)} adet</div>
                      <div className="kpi-subtitle">{tuikData[0]?.hatchedEggs.toLocaleString('tr-TR')} bin adet</div>
                    </div>
                  </div>

                  {/* Kombine Üretim Grafiği */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">📊 Yumurta Üretimi vs Yumurtacı Tavuk (Dual Axis)</h3>
                      <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Tavuk Sayısı (adet)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Bar 
                            yAxisId="left"
                            dataKey="eggProduction" 
                            name="Yumurta Üretimi (bin adet)" 
                            fill="#f59e0b"
                            opacity={0.7}
                            radius={[4, 4, 0, 0]}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="layerCount" 
                            name="Yumurtacı Tavuk (bin adet)" 
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Üretim Akışı */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">🔄 Üretim Akışı: Tavuk → Yumurta (2025)</h3>
                      <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🐔</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
                            {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Yumurtacı Tavuk<br/>(bin adet)
                          </div>
                        </div>
                        <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🥚</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
                            {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Yumurta Üretimi<br/>(bin adet)
                          </div>
                        </div>
                        <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
                        <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3b82f6' }}>
                            {tuikData[0]?.yieldPerBird.toFixed(0)}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Tavuk Başına Verim<br/>(adet/yıl)
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
                      📊 TÜİK Yumurta Üretimi Özet İstatistikler (2010-2025)
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                      gap: '16px' 
                    }}>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Toplam Yumurta Üretimi (16 yıl)
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                          {formatShort(tuikData.reduce((sum, d) => sum + d.eggProduction, 0) * 1000)} adet
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Ortalama Tavuk Başına Verim
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#3b82f6' }}>
                          {(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(0)} adet/yıl
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Toplam Kuluçka Yumurtası (16 yıl)
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f59e0b' }}>
                          {formatShort(tuikData.reduce((sum, d) => sum + d.hatchedEggs, 0) * 1000)} adet
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Yıllık Ortalama Büyüme
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981' }}>
                          %{(() => {
                            const first = tuikData[tuikData.length - 1]?.eggProduction || 1;
                            const last = tuikData[0]?.eggProduction || 1;
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
                  {/* Üretim Trendleri */}
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">🥚 Yıllık Yumurta Üretimi (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={tuikData.slice().reverse()}>
                          <defs>
                            <linearGradient id="colorEgg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Üretim']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="eggProduction" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorEgg)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: 'var(--bg-primary)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <strong>2025 Üretim:</strong> {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')} bin adet
                        <br/>
                        <strong>16 yıl büyüme:</strong> %{(() => {
                          const first = tuikData[tuikData.length - 1]?.eggProduction || 1;
                          const last = tuikData[0]?.eggProduction || 1;
                          return (((last - first) / first * 100).toFixed(2));
                        })()}
                      </div>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">🐔 Yıllık Yumurtacı Tavuk Sayısı (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={tuikData.slice().reverse()}>
                          <defs>
                            <linearGradient id="colorLayer" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Tavuk']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="layerCount" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorLayer)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: 'var(--bg-primary)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <strong>2025 Sayı:</strong> {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')} bin adet
                        <br/>
                        <strong>16 yıl büyüme:</strong> %{(() => {
                          const first = tuikData[tuikData.length - 1]?.layerCount || 1;
                          const last = tuikData[0]?.layerCount || 1;
                          return (((last - first) / first * 100).toFixed(2));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 2025 Aylık Dağılım */}
                  {monthlyEgg.length > 0 && (
                    <>
                      <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                          📅 2025 Aylık Dağılım
                        </h3>
                      </div>

                      <div className="chart-grid">
                        <div className="chart-card">
                          <h3 className="chart-title">🥚 Aylık Yumurta Üretimi (2025)</h3>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={monthlyEgg}>
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
                                tickFormatter={(v) => formatShort(v)}
                                label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                              />
                              <Tooltip
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                formatter={(value: number) => [value.toLocaleString('tr-TR') + ' adet', 'Üretim']}
                              />
                              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {monthlyEgg.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={`hsl(${index * 30}, 70%, 60%)`} />
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
                            color: 'var(--text-secondary)'
                          }}>
                            <strong>En yüksek üretim:</strong> {monthlyEgg.reduce((max, m) => m.value > max.value ? m : max, monthlyEgg[0]).month}
                            <br/>
                            <strong>Toplam (2025):</strong> {monthlyEgg.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR')} adet
                          </div>
                        </div>

                        {monthlyLayer.length > 0 && (
                          <div className="chart-card">
                            <h3 className="chart-title">🐔 Aylık Yumurtacı Tavuk Sayısı (2025)</h3>
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={monthlyLayer}>
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
                                  tickFormatter={(v) => formatShort(v)}
                                  label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                  formatter={(value: number) => [value.toLocaleString('tr-TR') + ' adet', 'Tavuk']}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                            <div style={{ 
                              marginTop: '16px', 
                              padding: '12px', 
                              background: 'var(--bg-primary)', 
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: 'var(--text-secondary)'
                            }}>
                              <strong>Ortalama:</strong> {(monthlyLayer.reduce((sum, m) => sum + m.value, 0) / monthlyLayer.length).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* VERİM ANALİZİ TAB */}
              {activeTuikTab === 'yield' && (
                <>
                  {/* Verim Trendi */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">📊 Tavuk Başına Yumurta Verimi Trendi (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            label={{ value: 'Verim (adet/baş/yıl)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [value.toFixed(1) + ' adet/baş/yıl', 'Verim']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="yieldPerBird" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
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
                          <strong>2025 Verim:</strong> {tuikData[0]?.yieldPerBird.toFixed(1)} adet/baş/yıl
                        </div>
                        <div>
                          <strong>16 yıl ortalama:</strong> {(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(1)} adet/baş/yıl
                        </div>
                        <div>
                          <strong>Verim artışı:</strong> %{(() => {
                            const first = tuikData[tuikData.length - 1]?.yieldPerBird || 1;
                            const last = tuikData[0]?.yieldPerBird || 1;
                            return (((last - first) / first * 100).toFixed(2));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yerli vs Hibrit Karşılaştırması */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">🐔 Yerli vs Hibrit Yumurtacı Tavuk (2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet']}
                          />
                          <Legend />
                          <Bar 
                            dataKey="nativeLayer" 
                            name="Yerli Yumurtacı" 
                            stackId="a"
                            fill="#fbbf24"
                            opacity={0.8}
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar 
                            dataKey="hybridLayer" 
                            name="Hibrit Yumurtacı" 
                            stackId="a"
                            fill="#10b981"
                            opacity={0.8}
                            radius={[4, 4, 0, 0]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="layerCount" 
                            name="Toplam" 
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: '#ef4444', r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: 'var(--bg-primary)', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div>
                          <strong>Yerli (2025):</strong> {(tuikData[0]?.nativeLayer || 0).toLocaleString('tr-TR')} bin adet
                          <br/>
                          <small>Toplam: {((tuikData[0]?.nativeLayer / tuikData[0]?.layerCount * 100) || 0).toFixed(1)}%</small>
                        </div>
                        <div>
                          <strong>Hibrit (2025):</strong> {(tuikData[0]?.hybridLayer || 0).toLocaleString('tr-TR')} bin adet
                          <br/>
                          <small>Toplam: {((tuikData[0]?.hybridLayer / tuikData[0]?.layerCount * 100) || 0).toFixed(1)}%</small>
                        </div>
                        <div>
                          <strong>Toplam (2025):</strong> {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')} bin adet
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kuluçka Yumurtası Trendi */}
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">🥚 Kuluçkaya Basılan Yumurta (Layer Civciv Üretimi - 2010-2025)</h3>
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={tuikData.slice().reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => formatShort(v * 1000)}
                            label={{ value: 'Kuluçka Yumurtası (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                            formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Kuluçka']}
                          />
                          <Bar dataKey="hatchedEggs" radius={[8, 8, 0, 0]}>
                            {tuikData.slice().reverse().map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === tuikData.length - 1 ? '#f59e0b' : '#fbbf24'} 
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
                        color: 'var(--text-secondary)'
                      }}>
                        <strong>2025 Kuluçka:</strong> {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')} bin adet
                        <br/>
                        <strong>16 yıl toplam:</strong> {tuikData.reduce((sum, d) => sum + d.hatchedEggs, 0).toLocaleString('tr-TR')} bin adet
                        <br/>
                        <strong>16 yıl büyüme:</strong> %{(() => {
                          const first = tuikData[tuikData.length - 1]?.hatchedEggs || 1;
                          const last = tuikData[0]?.hatchedEggs || 1;
                          return (((last - first) / first * 100).toFixed(2));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Kuluçka → Yumurtacı Tavuk Akışı */}
                  <div style={{ 
                    marginTop: '30px', 
                    padding: '24px', 
                    background: 'var(--bg-card)', 
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
                      🔄 Üretim Döngüsü: Kuluçka → Yumurtacı Tavuk → Yumurta (2025)
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-around', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '30px',
                      padding: '20px 0'
                    }}>
                      <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🥚</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
                          {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Kuluçkaya Basılan<br/>(bin adet)
                        </div>
                      </div>
                      <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
                      <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🐔</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
                          {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Yumurtacı Tavuk<br/>(bin adet)
                        </div>
                      </div>
                      <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
                      <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🥚</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3b82f6' }}>
                          {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Yumurta Üretimi<br/>(bin adet)
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      marginTop: '24px', 
                      padding: '16px', 
                      background: 'var(--bg-primary)', 
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>📊 2025 Verimlilik Göstergeleri:</strong>
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                        <div>
                          • <strong>Tavuk başına verim:</strong> {tuikData[0]?.yieldPerBird.toFixed(1)} adet/yıl
                        </div>
                        <div>
                          • <strong>Kuluçka/Tavuk oranı:</strong> {((tuikData[0]?.hatchedEggs / tuikData[0]?.layerCount) || 0).toFixed(2)}
                        </div>
                        <div>
                          • <strong>Üretim/Tavuk oranı:</strong> {((tuikData[0]?.eggProduction / tuikData[0]?.layerCount) || 0).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PROJEKSİYON TAB */}
              {activeTuikTab === 'projection' && (
                <>
                  {(() => {
                    // CAGR hesaplama (16 yıl verisi kullanılarak)
                    const firstYear = tuikData[tuikData.length - 1];
                    const lastYear = tuikData[0];
                    const years = tuikData.length - 1;

                    // Yumurta üretimi CAGR
                    const eggGrowthRate = Math.pow(lastYear.eggProduction / firstYear.eggProduction, 1 / years) - 1;
                    const eggMonthlyGrowth = Math.pow(1 + eggGrowthRate, 1 / 12) - 1;

                    // Tavuk sayısı CAGR
                    const layerGrowthRate = Math.pow(lastYear.layerCount / firstYear.layerCount, 1 / years) - 1;
                    const layerMonthlyGrowth = Math.pow(1 + layerGrowthRate, 1 / 12) - 1;

                    // 2026 aylık projeksiyonlar
                    const baseEgg2026 = lastYear.eggProduction * (1 + eggGrowthRate);
                    const baseLayer2026 = lastYear.layerCount * (1 + layerGrowthRate);

                    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

                    const projection2026Egg = monthNames.map((month, idx) => ({
                      month,
                      actual2025: monthlyEgg[idx]?.value || 0,
                      projected2026: (baseEgg2026 * 1000 / 12) * (1 + eggMonthlyGrowth * idx)
                    }));

                    const projection2026Layer = monthNames.map((month, idx) => ({
                      month,
                      actual2025: monthlyLayer[idx]?.value || 0,
                      projected2026: (baseLayer2026 * 1000 / 12) * (1 + layerMonthlyGrowth * idx)
                    }));

                    const totalProjected2026Egg = projection2026Egg.reduce((sum, m) => sum + m.projected2026, 0);
                    const totalProjected2026Layer = projection2026Layer.reduce((sum, m) => sum + m.projected2026, 0) / 12;

                    return (
                      <>
                        {/* Projeksiyon Özeti */}
                        <div className="kpi-grid">
                          <div className="kpi-card">
                            <div className="kpi-header">
                              <span className="kpi-title">2026 YUMURTA TAHMİNİ</span>
                              <div className="kpi-icon orange">🥚</div>
                            </div>
                            <div className="kpi-value">{formatShort(totalProjected2026Egg)} adet</div>
                            <div className="kpi-subtitle">
                              Yıllık toplam projeksiyon
                            </div>
                          </div>

                          <div className="kpi-card">
                            <div className="kpi-header">
                              <span className="kpi-title">2026 TAVUK TAHMİNİ</span>
                              <div className="kpi-icon green">🐔</div>
                            </div>
                            <div className="kpi-value">{formatShort(totalProjected2026Layer)} adet</div>
                            <div className="kpi-subtitle">
                              Ortalama tavuk sayısı
                            </div>
                          </div>

                          <div className="kpi-card">
                            <div className="kpi-header">
                              <span className="kpi-title">YILLIK BÜYÜME (CAGR)</span>
                              <div className="kpi-icon blue">📈</div>
                            </div>
                            <div className="kpi-value">%{(eggGrowthRate * 100).toFixed(2)}</div>
                            <div className="kpi-subtitle">
                              16 yıllık ortalama büyüme
                            </div>
                          </div>

                          <div className="kpi-card">
                            <div className="kpi-header">
                              <span className="kpi-title">PROJEKSİYON MODELİ</span>
                              <div className="kpi-icon purple">🔮</div>
                            </div>
                            <div className="kpi-value">CAGR</div>
                            <div className="kpi-subtitle">
                              Bileşik yıllık büyüme oranı
                            </div>
                          </div>
                        </div>

                        {/* 2026 Aylık Yumurta Projeksiyonu */}
                        <div className="chart-grid">
                          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                            <h3 className="chart-title">🥚 2026 Aylık Yumurta Üretim Projeksiyonu</h3>
                            <ResponsiveContainer width="100%" height={400}>
                              <ComposedChart data={projection2026Egg}>
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
                                  tickFormatter={(v) => formatShort(v)}
                                  label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                  formatter={(value: number, name: string) => [
                                    value.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' adet',
                                    name === 'actual2025' ? '2025 Gerçek' : '2026 Projeksiyon'
                                  ]}
                                />
                                <Legend />
                                <Bar 
                                  dataKey="actual2025" 
                                  name="2025 Gerçek" 
                                  fill="#94a3b8"
                                  opacity={0.6}
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                  dataKey="projected2026" 
                                  name="2026 Projeksiyon" 
                                  fill="#f59e0b"
                                  opacity={0.9}
                                  radius={[4, 4, 0, 0]}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="projected2026" 
                                  stroke="#dc2626" 
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                            <div style={{ 
                              marginTop: '16px', 
                              padding: '12px', 
                              background: 'var(--bg-primary)', 
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: 'var(--text-secondary)'
                            }}>
                              <strong>2025 Toplam:</strong> {monthlyEgg.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR')} adet
                              {' | '}
                              <strong>2026 Tahmin:</strong> {totalProjected2026Egg.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
                              {' | '}
                              <strong>Artış:</strong> {((totalProjected2026Egg - monthlyEgg.reduce((sum, m) => sum + m.value, 0)) / monthlyEgg.reduce((sum, m) => sum + m.value, 0) * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* 2026 Aylık Tavuk Projeksiyonu */}
                        <div className="chart-grid">
                          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                            <h3 className="chart-title">🐔 2026 Aylık Yumurtacı Tavuk Projeksiyonu</h3>
                            <ResponsiveContainer width="100%" height={400}>
                              <ComposedChart data={projection2026Layer}>
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
                                  tickFormatter={(v) => formatShort(v)}
                                  label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                  formatter={(value: number, name: string) => [
                                    value.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' adet',
                                    name === 'actual2025' ? '2025 Gerçek' : '2026 Projeksiyon'
                                  ]}
                                />
                                <Legend />
                                <Bar 
                                  dataKey="actual2025" 
                                  name="2025 Gerçek" 
                                  fill="#94a3b8"
                                  opacity={0.6}
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                  dataKey="projected2026" 
                                  name="2026 Projeksiyon" 
                                  fill="#10b981"
                                  opacity={0.9}
                                  radius={[4, 4, 0, 0]}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="projected2026" 
                                  stroke="#dc2626" 
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                            <div style={{ 
                              marginTop: '16px', 
                              padding: '12px', 
                              background: 'var(--bg-primary)', 
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: 'var(--text-secondary)'
                            }}>
                              <strong>2025 Ortalama:</strong> {(monthlyLayer.reduce((sum, m) => sum + m.value, 0) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
                              {' | '}
                              <strong>2026 Tahmin:</strong> {totalProjected2026Layer.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
                              {' | '}
                              <strong>Artış:</strong> %{(layerGrowthRate * 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Projeksiyon Metodolojisi */}
                        <div style={{ 
                          marginTop: '30px', 
                          padding: '24px', 
                          background: 'var(--bg-card)', 
                          borderRadius: '16px',
                          border: '1px solid var(--border)'
                        }}>
                          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>
                            📚 Projeksiyon Metodolojisi
                          </h3>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                            <p style={{ marginBottom: '12px' }}>
                              <strong>🔮 Model:</strong> 2026 tahminleri, <strong>CAGR (Compound Annual Growth Rate)</strong> yöntemi kullanılarak hesaplanmıştır.
                            </p>
                            <p style={{ marginBottom: '12px' }}>
                              <strong>📊 Veri Kaynağı:</strong> 2010-2025 arası 16 yıllık TÜİK yumurta üretim verileri
                            </p>
                            <p style={{ marginBottom: '12px' }}>
                              <strong>📈 Hesaplama:</strong>
                            </p>
                            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                              <li>Yıllık büyüme oranı: CAGR = (Son Yıl / İlk Yıl)^(1/yıl sayısı) - 1</li>
                              <li>Aylık büyüme: (1 + CAGR)^(1/12) - 1</li>
                              <li>2026 tahmini: 2025 × (1 + CAGR)</li>
                            </ul>
                            <p style={{ marginBottom: '12px' }}>
                              <strong>⚠️ Önemli Notlar:</strong>
                            </p>
                            <ul style={{ marginLeft: '20px' }}>
                              <li>Projeksiyonlar geçmiş trendlere dayalıdır ve garantili tahmin değildir</li>
                              <li>Hastalık salgınları, yem fiyatları, pazar koşulları gibi faktörler sonuçları etkileyebilir</li>
                              <li>Kısa vadeli (1 yıl) tahminler daha güvenilirdir</li>
                              <li>Mevsimsel etkiler aylık dağılımda dikkate alınmamıştır</li>
                            </ul>
                            <div style={{ 
                              marginTop: '16px', 
                              padding: '12px', 
                              background: 'var(--bg-primary)', 
                              borderRadius: '8px'
                            }}>
                              <strong>📊 Model Performansı:</strong>
                              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                <div>• CAGR (Yumurta): <strong>%{(eggGrowthRate * 100).toFixed(2)}</strong></div>
                                <div>• CAGR (Tavuk): <strong>%{(layerGrowthRate * 100).toFixed(2)}</strong></div>
                                <div>• Veri aralığı: <strong>2010-2025 (16 yıl)</strong></div>
                                <div>• Tahmin yılı: <strong>2026</strong></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
