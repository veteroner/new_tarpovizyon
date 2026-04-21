import React from 'react';
import { CROP_WATER_DB, type WizardState, type CropWaterData } from './sulamaUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  cropData: CropWaterData | null;
  goStep3: () => void;
}

export function CropSelectStep({ state, setState, cropData, goStep3 }: Props) {
  return (
    <div className="sp-card sp-card--wide">
      <h2 className="sp-card__title">🌾 Ürün Seçimi</h2>
      <p className="sp-card__desc">Sulama planı yapılacak ürünü seçin</p>

      <div className="sp-crop-grid">
        {Object.values(CROP_WATER_DB).map(crop => (
          <button key={crop.urun}
            className={`sp-crop-btn ${state.urun === crop.urun ? 'sp-crop-btn--selected' : ''}`}
            onClick={() => setState(s => ({ ...s, urun: crop.urun }))}>
            <span className="sp-crop-btn__name">{crop.urun}</span>
            <span className="sp-crop-btn__hint">Kc: {crop.katsayi.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {state.urun && cropData && (
        <div className="sp-crop-info">
          <h3>ℹ️ {cropData.urun} Sulama Profili</h3>
          <p><strong>Kritik Dönem:</strong> {cropData.kritikDonem}</p>
          <p><strong>Sulama Sıklığı:</strong> {cropData.sulamaSikligi} günde bir</p>
          <p><strong>Açıklama:</strong> {cropData.aciklama}</p>
        </div>
      )}

      <div className="sp-btn-row">
        <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 1 }))}>← Geri</button>
        <button className="sp-btn sp-btn--primary" onClick={goStep3} disabled={!state.urun}>Devam Et →</button>
      </div>
    </div>
  );
}
