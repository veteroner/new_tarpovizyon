import React from 'react';
import { WeatherWidget } from '../../components/WeatherWidget';
import {
  ILLER, getBolge, BOLGE_META, getETo, getYagis,
  type WizardState,
} from './sulamaUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  bolge: string | null;
  goStep2: () => void;
}

export function LocationClimateStep({ state, setState, bolge, goStep2 }: Props) {
  const bolgeMeta = bolge ? BOLGE_META[bolge] : null;

  return (
    <div className="sp-card">
      <h2 className="sp-card__title">📍 Konum Bilgileri</h2>
      <p className="sp-card__desc">İl seçerek iklim bölgesi otomatik belirlensin. Gerçek ETo ve yağış verileri hesaplanacak.</p>

      <div className="sp-field">
        <label className="sp-label" htmlFor="il-sel">İl</label>
        <select id="il-sel" className="sp-select" value={state.il}
          onChange={e => setState(s => ({ ...s, il: e.target.value }))}>
          <option value="">— İl seçin —</option>
          {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
        </select>
      </div>

      {state.il && (
        <>
          <WeatherWidget il={state.il} compact />
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#718096', textAlign: 'center' }}>
            Canlı hava verisi referans amaçlıdır; sulama hesaplamaları uzun yıl iklim ortalamalarına dayanır.
          </p>
        </>
      )}

      {bolge && bolgeMeta && (
        <div className="sp-bolge-card">
          <div className="sp-bolge-card__header">
            <span style={{ fontSize: '1.5rem' }}>{bolgeMeta.emoji}</span>
            <span style={{ fontWeight: 800 }}>{bolgeMeta.ad}</span>
          </div>
          <p className="sp-bolge-card__desc">{bolgeMeta.aciklama}</p>
          <div className="sp-bolge-card__stats">
            <span>📊 Yıllık Ort. ETo: {(Array.from({ length: 12 }, (_, i) => getETo(state.il, i + 1)).reduce((s, v) => s + v, 0) / 12).toFixed(1)} mm/gün</span>
            <span>🌧️ Yıllık Toplam Yağış: {Array.from({ length: 12 }, (_, i) => getYagis(state.il, i + 1)).reduce((s, v) => s + v, 0).toFixed(0)} mm</span>
          </div>
        </div>
      )}

      <button className="sp-btn sp-btn--primary sp-btn--full" onClick={goStep2}>
        Devam Et →
      </button>
    </div>
  );
}
