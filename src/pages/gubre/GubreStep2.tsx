import { getBolge, BOLGE_META, BOLGE_TOPRAK_PROFILLERI } from '../../utils/climate-data';
import { WizardState } from './gubreTypes';

interface Props {
  state: WizardState;
  setState: (s: WizardState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GubreStep2({ state, setState, onNext, onBack }: Props) {
  const bolge = state.il ? getBolge(state.il) : null;
  const bolgeMeta = bolge ? BOLGE_META[bolge] : null;
  const bolgeAd = bolgeMeta?.ad ?? '';
  const bolgeProfil = bolgeAd ? BOLGE_TOPRAK_PROFILLERI[bolgeAd] : null;

  return (
    <div className="gh-card">
      <h2 className="gh-card__title">Toprak Analizi</h2>
      <p className="gh-card__desc">
        Toprağınızın mevcut besin değerlerini girin. Toprak analizi yaptırmadıysanız ortalama değerleri kullanabilirsiniz.
      </p>

      <div className="gh-soil-grid">
        <div className="gh-field">
          <label className="gh-label">Azot (N) - kg/dekar</label>
          <input
            type="number" className="gh-input" placeholder="Örn: 5"
            value={state.toprak?.n ?? ''}
            onChange={(e) => {
              const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
              setState({ ...state, toprak: { ...base, n: parseFloat(e.target.value) || 0 } });
            }}
          />
        </div>

        <div className="gh-field">
          <label className="gh-label">Fosfor (P₂O₅) - kg/dekar</label>
          <input
            type="number" className="gh-input" placeholder="Örn: 3"
            value={state.toprak?.p2o5 ?? ''}
            onChange={(e) => {
              const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
              setState({ ...state, toprak: { ...base, p2o5: parseFloat(e.target.value) || 0 } });
            }}
          />
        </div>

        <div className="gh-field">
          <label className="gh-label">Potasyum (K₂O) - kg/dekar</label>
          <input
            type="number" className="gh-input" placeholder="Örn: 8"
            value={state.toprak?.k2o ?? ''}
            onChange={(e) => {
              const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
              setState({ ...state, toprak: { ...base, k2o: parseFloat(e.target.value) || 0 } });
            }}
          />
        </div>

        <div className="gh-field">
          <label className="gh-label">pH Değeri</label>
          <input
            type="number" step="0.1" className="gh-input" placeholder="Örn: 6.5"
            value={state.toprak?.ph ?? ''}
            onChange={(e) => {
              const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
              setState({ ...state, toprak: { ...base, ph: parseFloat(e.target.value) || 0 } });
            }}
          />
        </div>

        <div className="gh-field">
          <label className="gh-label">Organik Madde (%)</label>
          <input
            type="number" step="0.1" className="gh-input" placeholder="Örn: 2.5"
            value={state.toprak?.organik_madde ?? ''}
            onChange={(e) => {
              const base = state.toprak ?? { n: 0, p2o5: 0, k2o: 0, ph: 7.0, organik_madde: 1.5 };
              setState({ ...state, toprak: { ...base, organik_madde: parseFloat(e.target.value) || 0 } });
            }}
          />
        </div>
      </div>

      <div className="gh-preset-soil">
        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Hızlı Seçenekler:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {bolgeProfil && (
            <button
              className="gh-preset-btn gh-preset-btn--bolge"
              onClick={() => setState({ ...state, toprak: { n: bolgeProfil.n, p2o5: bolgeProfil.p2o5, k2o: bolgeProfil.k2o, ph: bolgeProfil.ph, organik_madde: bolgeProfil.organik_madde } })}
            >
              {bolgeMeta?.emoji} {bolgeAd} Profili
            </button>
          )}
          <button className="gh-preset-btn"
            onClick={() => setState({ ...state, toprak: { n: 3, p2o5: 2, k2o: 5, ph: 6.5, organik_madde: 1.5 } })}>
            Fakir Toprak
          </button>
          <button className="gh-preset-btn"
            onClick={() => setState({ ...state, toprak: { n: 6, p2o5: 4, k2o: 10, ph: 6.8, organik_madde: 2.5 } })}>
            Orta Verimli
          </button>
          <button className="gh-preset-btn"
            onClick={() => setState({ ...state, toprak: { n: 10, p2o5: 7, k2o: 15, ph: 7.0, organik_madde: 3.5 } })}>
            Verimli Toprak
          </button>
        </div>
      </div>

      <div className="gh-btn-row">
        <button className="gh-btn gh-btn--secondary" onClick={onBack}>← Geri</button>
        <button className="gh-btn gh-btn--primary" onClick={onNext}>İleri →</button>
      </div>
    </div>
  );
}
