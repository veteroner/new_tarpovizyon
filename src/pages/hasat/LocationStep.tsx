import React from 'react';
import WeatherWidget from '../../components/WeatherWidget';
import type { WizardState } from './hasatUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  ilList: string[];
  ilceList: string[];
  ilceLoad: boolean;
  gpsLoad: boolean;
  handleGPS: () => void;
  goStep2: () => void;
  setIlceList: React.Dispatch<React.SetStateAction<string[]>>;
  setIlceLoad: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function LocationStep({
  state, setState, ilList, ilceList, ilceLoad, gpsLoad,
  handleGPS, goStep2, setIlceList, setIlceLoad,
}: Props) {
  return (
    <div className="hz-card">
      <h2 className="hz-card__title">📍 Konum Seçin</h2>
      <p className="hz-card__desc">Arazi konumunuzu girin veya GPS ile otomatik tespit edin.</p>

      <button className={`hz-gps-btn ${gpsLoad ? 'hz-gps-btn--loading' : ''}`} onClick={handleGPS} disabled={gpsLoad}>
        <span role="img" aria-label="gps">📡</span>
        {gpsLoad ? ' Konum alınıyor…' : ' GPS ile Konumu Tespit Et'}
      </button>

      <div className="hz-divider"><span>veya manuel seçin</span></div>

      <div className="hz-form-row">
        <div className="hz-field">
          <label className="hz-label" htmlFor="il-sel">İl</label>
          <select id="il-sel" className="hz-select" value={state.il}
            onChange={e => { setIlceList([]); setIlceLoad(true); setState(s => ({ ...s, il: e.target.value, ilce: '', urun: '' })); }}>
            <option value="">— İl seçin —</option>
            {ilList.map(il => <option key={il} value={il}>{il}</option>)}
          </select>
        </div>
        <div className="hz-field">
          <label className="hz-label" htmlFor="ilce-sel">İlçe</label>
          <select id="ilce-sel" className="hz-select" value={state.ilce}
            disabled={!state.il || ilceLoad}
            onChange={e => setState(s => ({ ...s, ilce: e.target.value, urun: '' }))}>
            <option value="">{ilceLoad ? '⏳ Yükleniyor…' : '— İlçe seçin —'}</option>
            {ilceList.map(ilce => <option key={ilce} value={ilce}>{ilce}</option>)}
          </select>
        </div>
      </div>

      {state.il && (
        <>
          <WeatherWidget il={state.il} />
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#718096', textAlign: 'center' }}>
            Canlı hava verisi referans amaçlıdır; hesaplamalar uzun yıl iklim ortalamalarına dayanır.
          </p>
        </>
      )}

      {state.il && state.ilce && (
        <div className="hz-location-badge">
          <span role="img" aria-label="pin">📍</span>
          <span>{state.ilce}, {state.il}</span>
          {state.locationMethod === 'gps' && <span className="hz-gps-tag">GPS</span>}
        </div>
      )}

      <button className="hz-btn hz-btn--primary hz-btn--full" onClick={goStep2} disabled={!state.il || !state.ilce}>
        Devam Et →
      </button>
    </div>
  );
}
