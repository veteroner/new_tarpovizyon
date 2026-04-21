import React from 'react';
import type { WizardState } from './hasatUtils';
import { KATEGORILER } from './hasatUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  kategori: string;
  setKategori: React.Dispatch<React.SetStateAction<string>>;
  filteredCrops: string[];
  categoryCounts: Record<string, number>;
  loading: boolean;
  goStep3: () => void;
}

export default function CropStep({
  state, setState, kategori, setKategori,
  filteredCrops, categoryCounts, loading, goStep3,
}: Props) {
  return (
    <div className="hz-card hz-card--wide">
      <h2 className="hz-card__title">🌾 Ürün Seçin</h2>
      <p className="hz-card__desc"><strong>{state.ilce}, {state.il}</strong> ilçesinde kayıtlı ürünler</p>

      <div className="hz-cat-row" role="group" aria-label="Ürün Kategorisi">
        <button
          type="button"
          className={`hz-cat-btn ${kategori === '' ? 'hz-cat-btn--active' : ''}`}
          onClick={() => { setKategori(''); setState(s => ({ ...s, urun: '' })); }}
        >
          Tümü
        </button>
        {Object.keys(KATEGORILER).map(k => {
          const cnt = categoryCounts[k] ?? 0;
          return (
            <button
              key={k}
              type="button"
              className={`hz-cat-btn ${kategori === k ? 'hz-cat-btn--active' : ''} ${cnt === 0 ? 'hz-cat-btn--empty' : ''}`}
              onClick={() => { setKategori(prev => prev === k ? '' : k); setState(s => ({ ...s, urun: '' })); }}
            >
              {k} {cnt > 0 && <span className="hz-cat-badge">{cnt}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="hz-loading">⏳ Ürün listesi yükleniyor…</div>
      ) : (
        <>
          <p className="hz-count">{filteredCrops.length} ürün</p>
          <div className="hz-crop-grid">
            {filteredCrops.map(urun => (
              <button key={urun}
                className={`hz-crop-btn ${state.urun === urun ? 'hz-crop-btn--selected' : ''}`}
                onClick={() => setState(s => ({ ...s, urun }))}>
                {urun}
              </button>
            ))}
            {filteredCrops.length === 0 && <p className="hz-empty">Bu ilçe ve kategoride ürün bulunamadı.</p>}
          </div>
        </>
      )}

      <div className="hz-btn-row">
        <button className="hz-btn hz-btn--secondary" onClick={() => { setKategori(''); setState(s => ({ ...s, step: 1, urun: '' })); }}>← Geri</button>
        <button className="hz-btn hz-btn--primary" onClick={goStep3} disabled={!state.urun}>Devam Et →</button>
      </div>
    </div>
  );
}
