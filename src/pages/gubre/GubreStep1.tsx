import { ILLER, getBolge, BOLGE_META, BOLGE_TOPRAK_PROFILLERI } from '../../utils/climate-data';
import { CROP_NUTRIENT_DB, GUBRE_DATA_ASSUMPTION, GUBRE_DATA_SOURCE, GUBRE_DATA_VERSION } from './gubreData';
import type { WizardState } from './gubreTypes';

interface Props {
  state: WizardState;
  setState: (s: WizardState) => void;
  onNext: () => void;
}

export function GubreStep1({ state, setState, onNext }: Props) {
  const bolge = state.il ? getBolge(state.il) : null;
  const bolgeMeta = bolge ? BOLGE_META[bolge] : null;
  const bolgeAd = bolgeMeta?.ad ?? '';
  const bolgeProfil = bolgeAd ? BOLGE_TOPRAK_PROFILLERI[bolgeAd] : null;
  const cropData = state.urun ? CROP_NUTRIENT_DB[state.urun] : null;

  return (
    <div className="gh-card">
      <h2 className="gh-card__title">Konum, Ürün ve Hedef</h2>
      <p className="gh-card__desc">İl, ürün, alan ve hedef verim bilgilerinizi girin.</p>
      <div className="gh-data-meta">Veri sürümü: v{GUBRE_DATA_VERSION} · {GUBRE_DATA_SOURCE}</div>

      {/* İl Seçimi */}
      <div className="gh-field">
        <label className="gh-label" htmlFor="gh-il">İl</label>
        <select id="gh-il" className="gh-select" value={state.il}
          onChange={e => setState({ ...state, il: e.target.value })}>
          <option value="">— İl seçin (opsiyonel) —</option>
          {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
        </select>
        {bolgeMeta && bolgeProfil && (
          <div className="gh-bolge-hint">
            {bolgeMeta.emoji} <strong>{bolgeMeta.ad}</strong> — {bolgeProfil.aciklama}
          </div>
        )}
      </div>

      {/* Alan (dekar) */}
      <div className="gh-field">
        <label className="gh-label">Arazi Alanı (dekar)</label>
        <div className="gh-yield">
          <div className="gh-yield__value">{state.alan.toLocaleString('tr-TR')} <span>dekar</span></div>
          <input
            type="range" min="1" max="2000" step="1" value={state.alan}
            onChange={(e) => setState({ ...state, alan: parseInt(e.target.value) })}
            className="gh-range"
          />
          <div className="gh-yield__presets">
            {[10, 25, 50, 100, 250, 500].map((v) => (
              <button
                key={v}
                className={`gh-preset-btn ${state.alan === v ? 'gh-preset-btn--active' : ''}`}
                onClick={() => setState({ ...state, alan: v })}
              >
                {v} da
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ürün Seçimi */}
      <div className="gh-field">
        <label className="gh-label">Ürün Seçimi</label>
        <div className="gh-crop-grid">
          {Object.keys(CROP_NUTRIENT_DB).map((key) => {
            const crop = CROP_NUTRIENT_DB[key];
            return (
              <div
                key={key}
                className={`gh-crop-btn ${state.urun === key ? 'gh-crop-btn--selected' : ''}`}
                onClick={() => setState({ ...state, urun: key })}
              >
                <div className="gh-crop-btn__emoji">{crop.emoji}</div>
                <div className="gh-crop-btn__name">{crop.ad}</div>
              </div>
            );
          })}
        </div>
      </div>

      {cropData && (
        <div className="gh-crop-info">
          <h3>{cropData.emoji} {cropData.ad} — Besin İhtiyacı (100 kg verim için)</h3>
          <div className="gh-nutrient-bars">
            <div className="gh-nutrient-row">
              <span className="gh-nutrient-label">N (Azot)</span>
              <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.n / 4 * 100)}%`, background: '#3b82f6' }} /></div>
              <span className="gh-nutrient-val">{cropData.n} kg/da</span>
            </div>
            <div className="gh-nutrient-row">
              <span className="gh-nutrient-label">P₂O₅ (Fosfor)</span>
              <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.p2o5 / 2.5 * 100)}%`, background: '#f59e0b' }} /></div>
              <span className="gh-nutrient-val">{cropData.p2o5} kg/da</span>
            </div>
            <div className="gh-nutrient-row">
              <span className="gh-nutrient-label">K₂O (Potasyum)</span>
              <div className="gh-nutrient-bar"><div style={{ width: `${Math.min(100, cropData.k2o / 5 * 100)}%`, background: '#10b981' }} /></div>
              <span className="gh-nutrient-val">{cropData.k2o} kg/da</span>
            </div>
          </div>
          <div className="gh-micro-grid">
            <span title="Demir">🔩 Fe: {cropData.fe} kg</span>
            <span title="Çinko">⚡ Zn: {cropData.zn} kg</span>
            <span title="Mangan">🔧 Mn: {cropData.mn} kg</span>
            <span title="Bor">💎 B: {cropData.b} kg</span>
          </div>
          <p><strong>Uygun pH:</strong> {cropData.ph_min} — {cropData.ph_max}</p>
          <p><strong>Kaynak:</strong> {cropData.kaynak}</p>
          <p><strong>Varsayım:</strong> {cropData.varsayim}</p>
          <p><strong>Revizyon:</strong> {cropData.revizyonTarihi}</p>
          <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>💡 {cropData.notes}</p>
        </div>
      )}

      <div className="gh-data-meta">{GUBRE_DATA_ASSUMPTION}</div>

      {/* Hedef Verim */}
      <div className="gh-field">
        <label className="gh-label">Hedef Verim (ton/dekar)</label>
        <div className="gh-yield">
          <div className="gh-yield__value">{state.hedef_verim.toFixed(1)} <span>ton/dekar</span></div>
          <input
            type="range" min="0.1" max="10" step="0.1" value={state.hedef_verim}
            onChange={(e) => setState({ ...state, hedef_verim: parseFloat(e.target.value) })}
            className="gh-range"
          />
          <div className="gh-yield__presets">
            {[0.5, 1, 2, 3, 5].map((v) => (
              <button
                key={v}
                className={`gh-preset-btn ${state.hedef_verim === v ? 'gh-preset-btn--active' : ''}`}
                onClick={() => setState({ ...state, hedef_verim: v })}
              >
                {v} ton
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gh-btn-row">
        <button className="gh-btn gh-btn--primary gh-btn--full" onClick={onNext}>
          İleri →
        </button>
      </div>
    </div>
  );
}
