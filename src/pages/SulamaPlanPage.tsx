import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  STEPS, INITIAL, CROP_WATER_DB, getBolge, BOLGE_META,
  calculate,
  type WizardState,
} from './sulama/sulamaUtils';
import { LocationClimateStep } from './sulama/LocationClimateStep';
import { CropSelectStep } from './sulama/CropSelectStep';
import { SystemLandStep } from './sulama/SystemLandStep';
import { ResultsView } from './sulama/ResultsView';
import {
  fetchForecast, fetchWeather, isWeatherConfigured,
  type ForecastSummary, type WeatherData,
} from '../services/weather';
import './SulamaPlanPage.css';

export default function SulamaPlanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);
  const [error, setError] = useState('');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [wxStatus, setWxStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  const cropData = state.urun ? CROP_WATER_DB[state.urun] : null;
  const calc = useMemo(
    () => (state.step === 4 ? calculate(state, forecast, weather) : null),
    [state, forecast, weather],
  );
  const bolge = state.il ? getBolge(state.il) : null;

  /* ── Navigation helpers ─────────────────────────────────────────────── */
  const goStep2 = () => {
    if (!state.il) { setError('Lütfen il seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 2 }));
  };
  const goStep3 = () => {
    if (!state.urun) { setError('Lütfen ürün seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 3 }));
  };
  const goStep4 = () => {
    if (state.alan <= 0) { setError('Geçerli arazi büyüklüğü girin'); return; }
    setError(''); setState(s => ({ ...s, step: 4 }));
  };
  const reset = () => { setState(INITIAL); setError(''); };

  /* ── Weather fetch ──────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!state.il) {
        setWeather(null);
        setForecast(null);
        setWxStatus('idle');
        return;
      }

      if (!isWeatherConfigured()) {
        setWeather(null);
        setForecast(null);
        setWxStatus('unavailable');
        return;
      }

      setWxStatus('loading');
      const [w, f] = await Promise.all([fetchWeather(state.il), fetchForecast(state.il)]);
      if (cancelled) return;
      setWeather(w);
      setForecast(f);
      setWxStatus('ready');
    }

    run();
    return () => { cancelled = true; };
  }, [state.il]);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="sp-wizard">
      <div className="sp-topbar">
        <button className="sp-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="sp-topbar__title">
          <span>💧</span>
          <span>Sulama Planlayıcı</span>
        </div>
        {state.step > 1 && (
          <button className="sp-topbar__reset" onClick={reset}>Yeniden Başla</button>
        )}
      </div>

      <div className="sp-content">
        {/* Steps indicator */}
        <div className="sp-steps">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className={`sp-step ${state.step === s.n ? 'sp-step--active' : state.step > s.n ? 'sp-step--done' : ''}`}>
                <div className="sp-step__bubble">{state.step > s.n ? '✓' : s.icon}</div>
                <span className="sp-step__label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`sp-step__line ${state.step > s.n ? 'sp-step__line--done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="sp-error">{error}</div>}

        {state.step === 1 && (
          <LocationClimateStep state={state} setState={setState} bolge={bolge} goStep2={goStep2} />
        )}

        {state.step === 2 && (
          <CropSelectStep state={state} setState={setState} cropData={cropData} goStep3={goStep3} />
        )}

        {state.step === 3 && (
          <SystemLandStep state={state} setState={setState} cropData={cropData} goStep4={goStep4} />
        )}

        {state.step === 4 && calc && cropData && (
          <ResultsView
            state={state}
            setState={setState}
            calc={calc}
            cropData={cropData}
            bolge={bolge}
            forecast={forecast}
            wxStatus={wxStatus}
            reset={reset}
          />
        )}

        {state.step === 4 && !calc && (
          <div className="sp-card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#e74c3c', fontWeight: 700 }}>Hesaplama yapılamadı. Lütfen önceki adımları kontrol edin.</p>
            <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 1 }))}>
              ← Başa Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
