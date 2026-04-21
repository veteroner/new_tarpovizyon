import { WizardState } from './gubreTypes';

interface Props {
  state: WizardState;
  setState: (s: WizardState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GubreStep3({ state, setState, onNext, onBack }: Props) {
  return (
    <div className="gh-card">
      <h2 className="gh-card__title">Gübre Tipi & Senaryo</h2>
      <p className="gh-card__desc">
        Kimyasal, organik veya her iki tip gübrenin karşılaştırmasını görmek istediğinizi seçin.
      </p>

      <div className="gh-radio-group">
        <label className={`gh-radio-btn ${state.gubre_tipi === 'kimyasal' ? 'gh-radio-btn--active' : ''}`}>
          <input type="radio" name="gubre" checked={state.gubre_tipi === 'kimyasal'}
            onChange={() => setState({ ...state, gubre_tipi: 'kimyasal' })} />
          <span>🧪 Kimyasal Gübreler</span>
          <span className="gh-radio-hint">Hızlı etki, hassas doz kontrolü, düşük hacim</span>
        </label>

        <label className={`gh-radio-btn ${state.gubre_tipi === 'organik' ? 'gh-radio-btn--active' : ''}`}>
          <input type="radio" name="gubre" checked={state.gubre_tipi === 'organik'}
            onChange={() => setState({ ...state, gubre_tipi: 'organik' })} />
          <span>🌿 Organik Gübreler</span>
          <span className="gh-radio-hint">Toprak yapısını iyileştirir, yavaş salınım, çevre dostu</span>
        </label>

        <label className={`gh-radio-btn ${state.gubre_tipi === 'her_ikisi' ? 'gh-radio-btn--active' : ''}`}>
          <input type="radio" name="gubre" checked={state.gubre_tipi === 'her_ikisi'}
            onChange={() => setState({ ...state, gubre_tipi: 'her_ikisi' })} />
          <span>⚖️ Her İkisini Karşılaştır</span>
          <span className="gh-radio-hint">Kimyasal ve organik seçenekleri yan yana gör</span>
        </label>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--gh-text-primary, #1a1a2e)' }}>
          📊 Gübreleme Senaryosu
        </h3>
        <div className="gh-radio-group">
          {([
            { key: 'tutucu' as const,   label: '🛡️ Tutumlu (-%20)',    hint: "Maliyet odaklı — temel ihtiyaçların %80'ini karşılar" },
            { key: 'standart' as const, label: '⚖️ Standart',          hint: 'Kitap değerleri — referans ihtiyaçların tamamı' },
            { key: 'agresif' as const,  label: '🚀 Maksimum (+%20)',   hint: 'Verim odaklı — yüksek verim hedefi için %20 fazla' },
          ] as const).map(s => (
            <label key={s.key} className={`gh-radio-btn ${state.senaryo === s.key ? 'gh-radio-btn--active' : ''}`}>
              <input type="radio" name="senaryo" checked={state.senaryo === s.key}
                onChange={() => setState({ ...state, senaryo: s.key })} />
              <span>{s.label}</span>
              <span className="gh-radio-hint">{s.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="gh-btn-row">
        <button className="gh-btn gh-btn--secondary" onClick={onBack}>← Geri</button>
        <button className="gh-btn gh-btn--primary" onClick={onNext}>Hesapla 🧮</button>
      </div>
    </div>
  );
}
