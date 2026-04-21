import React from 'react';
import type { WizardState } from './hasatUtils';
import { AREA_PRESETS, AREA_MIN, AREA_MAX, clampArea } from './hasatUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  urunList: string[];
  showCost: boolean;
  setShowCost: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  goResults: () => void;
}

export default function LandStep({
  state, setState, urunList, showCost, setShowCost, loading, goResults,
}: Props) {
  return (
    <div className="hz-card">
      <h2 className="hz-card__title">📐 Arazi Bilgileri</h2>
      <p className="hz-card__desc">Seçilen ürün: <strong>{state.urun}</strong></p>

      <div className="hz-field">
        <label className="hz-label" htmlFor="alan-inp">Arazi Büyüklüğü</label>
        <div className="hz-area">
          <div className="hz-area__top">
            <div className="hz-area__value" aria-live="polite">
              {state.alan.toLocaleString('tr-TR')} <span>dekar</span>
            </div>
            <div className="hz-area__sub">
              ≈ {(state.alan / 10).toFixed(1)} hektar
            </div>
          </div>

          <div className="hz-area__stepper" role="group" aria-label="Arazi adım ayarı">
            <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan - 100) }))}>−100</button>
            <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan - 10) }))}>−10</button>
            <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan + 10) }))}>+10</button>
            <button type="button" className="hz-stepper-btn" onClick={() => setState(s => ({ ...s, alan: clampArea(s.alan + 100) }))}>+100</button>
          </div>

          <input
            id="alan-inp"
            className="hz-range"
            type="range"
            min={AREA_MIN}
            max={AREA_MAX}
            step={10}
            value={state.alan}
            onChange={e => setState(s => ({ ...s, alan: clampArea(Number(e.target.value)) }))}
          />

          <div className="hz-area__presets" role="group" aria-label="Hazır arazi değerleri">
            {AREA_PRESETS.map(v => (
              <button
                key={v}
                type="button"
                className={`hz-preset-btn ${state.alan === v ? 'hz-preset-btn--active' : ''}`}
                onClick={() => setState(s => ({ ...s, alan: v }))}
              >
                {v >= 1000 ? `${(v / 1000).toLocaleString('tr-TR')}k` : v}
              </button>
            ))}
          </div>

          <p className="hz-hint">Yazı yazmadan ayarlayabilirsiniz (slider + hazır değerler).</p>
        </div>
      </div>

      <div className="hz-field">
        <label className="hz-label">Sulama Durumu</label>
        <div className="hz-toggle-row">
          <button className={`hz-toggle-btn ${!state.sulama ? 'hz-toggle-btn--active' : ''}`} onClick={() => setState(s => ({ ...s, sulama: false }))}>
            💧 Sulamasız (Kuru)
          </button>
          <button className={`hz-toggle-btn ${state.sulama ? 'hz-toggle-btn--active' : ''}`} onClick={() => setState(s => ({ ...s, sulama: true }))}>
            🚿 Sulamalı (+%25)
          </button>
        </div>
      </div>

      <div className="hz-field">
        <label className="hz-label">Toprak Kalitesi</label>
        <div className="hz-toggle-row">
          {([['iyi', '🟢 İyi (+%15)'], ['orta', '🟡 Orta'], ['zayif', '🔴 Zayıf (-%15)']] as const).map(([val, lbl]) => (
            <button key={val}
              className={`hz-toggle-btn ${state.toprakKalite === val ? 'hz-toggle-btn--active' : ''}`}
              onClick={() => setState(s => ({ ...s, toprakKalite: val }))}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Ekonomik Analiz (Opsiyonel) */}
      <div className="hz-econ-section">
        <button
          type="button"
          className={`hz-econ-toggle ${showCost ? 'hz-econ-toggle--open' : ''}`}
          onClick={() => setShowCost(!showCost)}
        >
          <span>💰 Ekonomik Analiz (Opsiyonel)</span>
          <span className="hz-econ-toggle__arrow">{showCost ? '▲' : '▼'}</span>
        </button>
        {showCost && (
          <div className="hz-econ-fields">
            <p className="hz-hint">Fiyat ve maliyet bilgisi girerseniz, sonuç sayfasında gelir/kâr analizi gösterilir.</p>
            <div className="hz-form-row">
              <div className="hz-field">
                <label className="hz-label" htmlFor="fiyat-inp">Pazar Fiyatı (₺/kg)</label>
                <input
                  id="fiyat-inp"
                  className="hz-input"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Örn: 12.5"
                  value={state.cost.fiyatTL || ''}
                  onChange={e => setState(s => ({ ...s, cost: { ...s.cost, fiyatTL: Math.max(0, Number(e.target.value)) } }))}
                />
              </div>
              <div className="hz-field">
                <label className="hz-label" htmlFor="maliyet-inp">Toplam Maliyet (₺/dekar)</label>
                <input
                  id="maliyet-inp"
                  className="hz-input"
                  type="number"
                  min={0}
                  step={10}
                  placeholder="Örn: 850"
                  value={state.cost.maliyetDekar || ''}
                  onChange={e => setState(s => ({ ...s, cost: { ...s.cost, maliyetDekar: Math.max(0, Number(e.target.value)) } }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ürün Karşılaştırma (Opsiyonel) */}
      <div className="hz-compare-picker">
        <label className="hz-label">Karşılaştırma Ürünleri (max 5, opsiyonel)</label>
        <p className="hz-hint">Aynı ilçede farklı ürünlerin verimlerini kıyaslayın.</p>
        <div className="hz-compare-chips">
          {state.compareUrunler.map(cu => (
            <span key={cu} className="hz-chip hz-chip--selected">
              {cu}
              <button type="button" className="hz-chip__x"
                onClick={() => setState(s => ({ ...s, compareUrunler: s.compareUrunler.filter(x => x !== cu) }))}>×</button>
            </span>
          ))}
        </div>
        {state.compareUrunler.length < 5 && (
          <select
            className="hz-select hz-select--sm"
            value=""
            onChange={e => {
              const val = e.target.value;
              if (val && !state.compareUrunler.includes(val) && val !== state.urun) {
                setState(s => ({ ...s, compareUrunler: [...s.compareUrunler, val] }));
              }
            }}
          >
            <option value="">+ Ürün ekle…</option>
            {urunList.filter(u => u !== state.urun && !state.compareUrunler.includes(u)).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        )}
      </div>

      <div className="hz-btn-row">
        <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
        <button className="hz-btn hz-btn--primary" onClick={goResults} disabled={loading || state.alan <= 0}>
          {loading ? '⏳ Hesaplanıyor…' : '📊 Sonuçları Gör →'}
        </button>
      </div>
    </div>
  );
}
