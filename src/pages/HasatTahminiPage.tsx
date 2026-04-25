import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProvinces, fetchDistricts, fetchCrops, fetchYieldData, fetchProvinceRanking } from '../services/api';
import type { RegionTotal } from '../components/TurkeyHeatMap';

import {
  type WizardState, type SavedForecast, type YearData,
  INITIAL, KATEGORILER, calculate, getHarvestCalendar, getSowingCalendar,
  linearRegression, getYearsAll, calcClimateRisk, calcQuick,
  toYD, CHART_YEARS, PROJ_YEARS,
  loadHistory, saveToHistory,
  findBestMatch, reverseGeocode,
} from './hasat/hasatUtils';

import LocationStep from './hasat/LocationStep';
import CropStep     from './hasat/CropStep';
import LandStep     from './hasat/LandStep';
import ResultsView  from './hasat/ResultsView';
import './HasatTahminiPage.css';

const STEPS = [
  { n: 1, icon: '📍', label: 'Konum' },
  { n: 2, icon: '🌾', label: 'Ürün' },
  { n: 3, icon: '📐', label: 'Arazi' },
  { n: 4, icon: '📊', label: 'Sonuçlar' },
];

export function HasatTahminiPage(): React.ReactElement {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);

  const pendingGpsIlceRef = useRef('');

  const [ilList,    setIlList]    = useState<string[]>([]);
  const [ilceList,  setIlceList]  = useState<string[]>([]);
  const [urunList,  setUrunList]  = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [gpsLoad,   setGpsLoad]   = useState(false);
  const [ilceLoad,  setIlceLoad]  = useState(false);
  const [error,     setError]     = useState('');
  const [kategori,  setKategori]  = useState('');
  const [showCost,   setShowCost]   = useState(false);
  const [history,     setHistory]    = useState<SavedForecast[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  // ── Load il list on mount ──
  useEffect(() => {
    fetchProvinces()
      .then(r => {
        if (r.error) setError(r.error);
        if (r.data) setIlList(r.data.map(row => String(row.ili)));
      });
  }, []);

  // ── Load ilçe list when il changes ──
  useEffect(() => {
    if (!state.il) return;
    let stale = false;
    fetchDistricts(state.il)
      .then(r => {
        if (stale) return;
        setIlceLoad(false);
        if (r.error) setError(r.error);
        if (!r.data) return;
        const list = r.data.map(row => String(row.yer));
        setIlceList(list);

        if (pendingGpsIlceRef.current) {
          const matchIlce = findBestMatch(list, pendingGpsIlceRef.current);
          pendingGpsIlceRef.current = '';
          if (matchIlce) {
            setState(s => (s.ilce ? s : { ...s, ilce: matchIlce }));
          } else {
            setError('GPS ilçe eşleşmedi. Lütfen ilçeyi listeden seçin.');
          }
        }
      });
    return () => { stale = true; };
  }, [state.il]);

  const loadCrops = useCallback(async (il: string, ilce: string) => {
    setLoading(true);
    const r = await fetchCrops(il, ilce);
    if (r.error) setError(r.error);
    if (r.data) setUrunList(r.data.map(row => String(row.urun)));
    setLoading(false);
  }, []);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setError('Tarayıcınız konum özelliğini desteklemiyor.'); return; }
    setGpsLoad(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsLoad(false);
        if (!result?.il) { setError('Konum çözümlenemedi, lütfen manuel seçin.'); return; }

        const matchIl = findBestMatch(ilList, result.il);
        if (!matchIl) {
          setError(`GPS ile bulunan il (${result.il}) sistemde eşleşmedi. Lütfen manuel seçin.`);
          return;
        }

        pendingGpsIlceRef.current = result.ilce;
        setIlceList([]);
        setIlceLoad(true);
        setState(s => ({ ...s, il: matchIl, ilce: '', locationMethod: 'gps' }));
      },
      () => { setGpsLoad(false); setError('Konum izni reddedildi.'); },
    );
  }, [ilList]);

  const fetchAndGoResults = useCallback(async () => {
    setError('');
    setLoading(true);
    const [ilceRes, ilRes, trRes] = await Promise.all([
      fetchYieldData(state.il, state.ilce, state.urun, 'ilçe'),
      fetchYieldData(state.il, state.ilce, state.urun, 'il'),
      fetchYieldData(state.il, state.ilce, state.urun, 'Turkey'),
    ]);
    if (ilceRes.error || ilRes.error || trRes.error) {
      setError(ilceRes.error ?? ilRes.error ?? trRes.error ?? 'Veri alınamadı');
      setLoading(false);
      return;
    }
    setState(s => ({ ...s, ilceData: toYD(ilceRes), ilData: toYD(ilRes), turkiyeData: toYD(trRes), step: 4 }));
    setLoading(false);

    fetchProvinceRanking(state.urun).then(mapRes => {
      if (mapRes.data) {
        const ranking = mapRes.data.map(r => ({ il: String(r.ili), verim: Number(r.y2024) || 0 }))
          .filter(r => r.verim > 0)
          .sort((a, b) => b.verim - a.verim);
        const regionTotals: RegionTotal[] = ranking.map(r => ({ name: r.il, value: r.verim, unit: 'Kg/da' }));
        setState(s => ({ ...s, ilVerimler: regionTotals, ilRanking: ranking }));
      }
    });

    if (state.compareUrunler.length > 0) {
      const cmpPromises = state.compareUrunler.map(async (cu) => {
        const [cI, cIl, cTr] = await Promise.all([
          fetchYieldData(state.il, state.ilce, cu, 'ilçe'),
          fetchYieldData(state.il, state.ilce, cu, 'il'),
          fetchYieldData(state.il, state.ilce, cu, 'Turkey'),
        ]);
        return { urun: cu, ilceData: toYD(cI), ilData: toYD(cIl), turkiyeData: toYD(cTr) };
      });
      const cmpResults = await Promise.all(cmpPromises);
      setState(s => ({ ...s, compareData: cmpResults }));
    }
  }, [state.il, state.ilce, state.urun, state.compareUrunler]);

  // ── Navigation guards ──
  const goStep2 = () => {
    if (!state.il || !state.ilce) { setError('Lütfen il ve ilçe seçin.'); return; }
    setError(''); setKategori('');
    loadCrops(state.il, state.ilce);
    setState(s => ({ ...s, step: 2 }));
  };
  const goStep3 = () => {
    if (!state.urun) { setError('Lütfen bir ürün seçin.'); return; }
    setError(''); setState(s => ({ ...s, step: 3 }));
  };
  const goResults = () => {
    if (state.alan <= 0) { setError('Lütfen geçerli bir arazi büyüklüğü girin.'); return; }
    setError(''); fetchAndGoResults();
  };
  const reset = () => { setState(INITIAL); setError(''); setKategori(''); pendingGpsIlceRef.current = ''; };

  // ── Filtered crops ──
  const cropMatchesCategory = useCallback((urun: string, cat: string): boolean => {
    if (!cat) return true;
    const lu = urun.toLocaleLowerCase('tr-TR');
    const keys = KATEGORILER[cat] ?? [];
    return keys.some(k => lu.includes(k));
  }, []);

  const filteredCrops = urunList.filter(u => cropMatchesCategory(u, kategori));

  const categoryCounts = Object.fromEntries(
    Object.keys(KATEGORILER).map(k => [k, urunList.filter(u => cropMatchesCategory(u, k)).length]),
  );

  // ── Step-4 computed values ──
  const calc    = state.step === 4 ? calculate(state) : null;
  const harvest = state.urun ? getHarvestCalendar(state.urun) : null;
  const sowing  = state.urun ? getSowingCalendar(state.urun) : null;

  useEffect(() => {
    if (calc && state.step === 4) {
      saveToHistory(state, calc);
      setHistory(loadHistory());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, calc]);

  const ydVal = (yd: YearData | null | undefined, yr: string): number | undefined => {
    if (!yd) return undefined;
    const k = `y${yr}` as keyof YearData;
    return yd[k] || undefined;
  };

  const regIlce = state.ilceData ? linearRegression(getYearsAll(state.ilceData)) : null;
  const regIl   = state.ilData   ? linearRegression(getYearsAll(state.ilData)) : null;
  const regTR   = state.turkiyeData ? linearRegression(getYearsAll(state.turkiyeData)) : null;

  const sdBand = calc?.stdDev ?? 0;
  const sf = state.sulama ? 1.25 : 1.0;
  const tf = state.toprakKalite === 'iyi' ? 1.15 : state.toprakKalite === 'zayif' ? 0.85 : 1.0;
  const combinedFactor = sf * tf;

  const chartData = [
    ...CHART_YEARS.map(yr => ({
      yil: yr,
      ilce:    ydVal(state.ilceData, yr),
      il:      ydVal(state.ilData, yr),
      turkiye: ydVal(state.turkiyeData, yr),
      band: undefined as [number, number] | undefined,
    })),
    ...PROJ_YEARS.map(yr => {
      const projVal = regIlce && regIlce.r2 >= 0.3 ? Math.max(0, regIlce.a + regIlce.b * Number(yr))
        : regIl && regIl.r2 >= 0.3 ? Math.max(0, regIl.a + regIl.b * Number(yr))
        : undefined;
      return {
        yil: `${yr}*`,
        ilce:    regIlce && regIlce.r2 >= 0.3 ? Math.max(0, regIlce.a + regIlce.b * Number(yr)) : undefined,
        il:      regIl   && regIl.r2   >= 0.3 ? Math.max(0, regIl.a   + regIl.b   * Number(yr)) : undefined,
        turkiye: regTR   && regTR.r2   >= 0.3 ? Math.max(0, regTR.a   + regTR.b   * Number(yr)) : undefined,
        band: projVal !== undefined
          ? [Math.max(0, (projVal - sdBand) * combinedFactor), (projVal + sdBand) * combinedFactor] as [number, number]
          : undefined,
      };
    }),
  ];

  const climateRisk = state.il ? calcClimateRisk(state.il, state.urun) : null;
  const userIlRank = state.ilRanking.findIndex(r => r.il === state.il) + 1;

  const compareResults = state.compareData.map(cd => ({
    urun: cd.urun,
    quick: calcQuick(cd.ilceData ?? cd.ilData ?? cd.turkiyeData, state.alan, state.sulama, state.toprakKalite),
  }));

  // ── Render ──
  return (
    <div className="hz-wizard">
      <div className="hz-topbar">
        <button className="hz-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="hz-topbar__title">
          <span role="img" aria-label="hasat">🌾</span>
          <span>Hasat Tahmincisi</span>
        </div>
        {state.step > 1 && (
          <button className="hz-topbar__reset" onClick={reset}>Yeniden Başla</button>
        )}
      </div>

      <div className="hz-content">
        <div className="hz-steps">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className={`hz-step ${state.step === s.n ? 'hz-step--active' : state.step > s.n ? 'hz-step--done' : ''}`}>
                <div className="hz-step__bubble">{state.step > s.n ? '✓' : s.icon}</div>
                <span className="hz-step__label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`hz-step__line ${state.step > s.n ? 'hz-step__line--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="hz-error" role="alert">{error}</div>}

        {state.step === 1 && (
          <LocationStep
            state={state} setState={setState}
            ilList={ilList} ilceList={ilceList}
            ilceLoad={ilceLoad} gpsLoad={gpsLoad}
            handleGPS={handleGPS} goStep2={goStep2}
            setIlceList={setIlceList} setIlceLoad={setIlceLoad}
          />
        )}

        {state.step === 2 && (
          <CropStep
            state={state} setState={setState}
            kategori={kategori} setKategori={setKategori}
            filteredCrops={filteredCrops} categoryCounts={categoryCounts}
            loading={loading} goStep3={goStep3}
          />
        )}

        {state.step === 3 && (
          <LandStep
            state={state} setState={setState}
            urunList={urunList} showCost={showCost}
            setShowCost={setShowCost} loading={loading}
            goResults={goResults}
          />
        )}

        {state.step === 4 && (
          <ResultsView
            state={state} setState={setState}
            loading={loading} calc={calc}
            chartData={chartData} climateRisk={climateRisk}
            userIlRank={userIlRank} compareResults={compareResults}
            harvest={harvest} sowing={sowing}
            history={history} showHistory={showHistory}
            setShowHistory={setShowHistory} setHistory={setHistory}
            reset={reset}
          />
        )}
      </div>
    </div>
  );
}
