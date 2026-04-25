import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WizardState, CalcResult } from './gubre/gubreTypes';
import { calculate, calcConfidenceScore } from './gubre/gubreUtils';
import { GubreStep1 } from './gubre/GubreStep1';
import { GubreStep2 } from './gubre/GubreStep2';
import { GubreStep3 } from './gubre/GubreStep3';
import { GubreStep4 } from './gubre/GubreStep4';
import './GubreHesapPage.css';

export default function GubreHesapPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    il: '', alan: 50, urun: '', hedef_verim: 0,
    toprak: null, gubre_tipi: 'her_ikisi', senaryo: 'standart',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState('');

  const handleNext = () => {
    setError('');
    if (step === 1 && !state.urun) return setError('Lütfen ürün seçin');
    if (step === 1 && state.hedef_verim <= 0) return setError('Lütfen hedef verim girin');
    if (step === 2 && !state.toprak) return setError('Lütfen toprak analizi bilgilerini girin');
    if (step === 3) {
      try {
        setResult(calculate(state));
        setStep(4);
      } catch (_err) {
        setError('Hesaplama hatası');
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => { setStep(step - 1); setError(''); };
  const handleReset = () => {
    setStep(1);
    setState({ il: '', alan: 50, urun: '', hedef_verim: 0, toprak: null, gubre_tipi: 'her_ikisi', senaryo: 'standart' });
    setResult(null);
    setError('');
  };

  return (
    <div className="gh-wizard">
      {/* Topbar */}
      <div className="gh-topbar">
        <button className="gh-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="gh-topbar__title"><span>🧪</span><span>Gübre Hesaplayıcı</span></div>
        {step > 1 && <button className="gh-topbar__reset" onClick={handleReset}>Yeniden Başlat</button>}
        {step === 1 && <div style={{ width: '140px' }} />}
      </div>

      <div className="gh-content">
        {/* Step Indicator */}
        <div className="gh-steps">
          <div className={`gh-step ${step >= 1 ? 'gh-step--active' : ''} ${step > 1 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">1</div>
            <div className="gh-step__label">Ürün & Hedef</div>
          </div>
          <div className={`gh-step__line ${step > 1 ? 'gh-step__line--done' : ''}`} />
          <div className={`gh-step ${step >= 2 ? 'gh-step--active' : ''} ${step > 2 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">2</div>
            <div className="gh-step__label">Toprak Analizi</div>
          </div>
          <div className={`gh-step__line ${step > 2 ? 'gh-step__line--done' : ''}`} />
          <div className={`gh-step ${step >= 3 ? 'gh-step--active' : ''} ${step > 3 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">3</div>
            <div className="gh-step__label">Gübre Tipi</div>
          </div>
          <div className={`gh-step__line ${step > 3 ? 'gh-step__line--done' : ''}`} />
          <div className={`gh-step ${step >= 4 ? 'gh-step--active' : ''}`}>
            <div className="gh-step__bubble">4</div>
            <div className="gh-step__label">Sonuçlar</div>
          </div>
        </div>

        {error && <div className="gh-error">{error}</div>}

        {step === 1 && <GubreStep1 state={state} setState={setState} onNext={handleNext} />}
        {step === 2 && <GubreStep2 state={state} setState={setState} onNext={handleNext} onBack={handleBack} />}
        {step === 3 && <GubreStep3 state={state} setState={setState} onNext={handleNext} onBack={handleBack} />}
        {step === 4 && result && (
          <GubreStep4
            result={result}
            state={state}
            onReset={handleReset}
            confidenceScore={calcConfidenceScore(state.toprak)}
          />
        )}
      </div>
    </div>
  );
}
