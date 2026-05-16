import React from 'react';
import { CROP_WATER_DB, type WizardState, type CropWaterData } from './sulamaUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  cropData: CropWaterData | null;
  goStep3: () => void;
}

function suIhtiyaciLabel(kc: number): { label: string; emoji: string; color: string } {
  if (kc < 0.75) return { label: 'Az sular', emoji: '💧', color: '#3b82f6' };
  if (kc < 1.05) return { label: 'Orta sular', emoji: '💧💧', color: '#0ea5e9' };
  return { label: 'Çok sular', emoji: '💧💧💧', color: '#1d4ed8' };
}

export function CropSelectStep({ state, setState, cropData, goStep3 }: Props) {
  return (
    <div className="sp-card sp-card--wide">
      <h2 className="sp-card__title">🌾 Ürün Seçimi</h2>
      <p className="sp-card__desc">Sulama planı yapılacak ürünü seçin</p>

      <div className="sp-crop-grid">
        {Object.values(CROP_WATER_DB).map(crop => {
          const su = suIhtiyaciLabel(crop.katsayi);
          return (
            <button key={crop.urun}
              className={`sp-crop-btn ${state.urun === crop.urun ? 'sp-crop-btn--selected' : ''}`}
              onClick={() => setState(s => ({ ...s, urun: crop.urun }))}>
              <span className="sp-crop-btn__name">{crop.urun}</span>
              <span className="sp-crop-btn__hint" style={{ color: su.color, fontSize: '0.7rem' }}>
                {su.emoji} {su.label}
              </span>
            </button>
          );
        })}
      </div>

      {state.urun && cropData && (
        <div className="sp-crop-info">
          <h3>ℹ️ {cropData.urun} Sulama Profili</h3>
          <p><strong>Kritik Dönem:</strong> {cropData.kritikDonem} — bu dönemde su stresi verimi en çok etkiler</p>
          <p><strong>Sulama Sıklığı:</strong> Yaklaşık her {cropData.sulamaSikligi} günde bir</p>
          <p><strong>Açıklama:</strong> {cropData.aciklama}</p>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 8 }}>
            Bitki su ihtiyacı katsayısı (Kc): <strong>{cropData.katsayi.toFixed(2)}</strong> — referans buharlaşmaya oranla ne kadar su tükettiğini gösterir
          </p>
        </div>
      )}

      <div className="sp-btn-row">
        <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 1 }))}>← Geri</button>
        <button className="sp-btn sp-btn--primary" onClick={goStep3} disabled={!state.urun}>Devam Et →</button>
      </div>
    </div>
  );
}
