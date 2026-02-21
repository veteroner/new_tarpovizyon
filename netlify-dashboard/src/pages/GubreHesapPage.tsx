import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GubreHesapPage.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   Gübre Hesaplayıcı - Fertilizer Calculator
   NPK + Organic/Chemical Comparison + Application Schedule
   ═══════════════════════════════════════════════════════════════════════════════ */

interface CropNutrientData {
  ad: string;
  emoji: string;
  // kg/dekar for 100 kg yield
  n: number;      // Nitrogen
  p2o5: number;   // Phosphorus (P₂O₅)
  k2o: number;    // Potassium (K₂O)
  // Optimal soil pH
  ph_min: number;
  ph_max: number;
  // Growth stage requirements (% of total)
  stage_early: number;   // ilk gelişim
  stage_mid: number;     // çiçeklenme/meyve bağlama
  stage_late: number;    // olgunlaşma
  notes: string;
}

interface SoilAnalysis {
  n: number;      // kg/dekar
  p2o5: number;
  k2o: number;
  ph: number;
  organik_madde: number; // %
}

interface FertilizerProduct {
  ad: string;
  tip: 'kimyasal' | 'organik';
  n: number;
  p: number;
  k: number;
  fiyat_kg: number; // TL/kg
  uygulama: string;
}

interface WizardState {
  urun: string;
  hedef_verim: number;        // ton/dekar
  toprak: SoilAnalysis | null;
  gubre_tipi: 'kimyasal' | 'organik' | 'her_ikisi';
}

interface CalcResult {
  ihtiyac: { n: number; p2o5: number; k2o: number };
  eksik: { n: number; p2o5: number; k2o: number };
  oneriler: {
    kimyasal: Array<{ urun: string; miktar: number; fiyat: number }>;
    organik: Array<{ urun: string; miktar: number; fiyat: number }>;
  };
  uygulama_takvimi: Array<{
    donem: string;
    hafta: string;
    n: number;
    p: number;
    k: number;
    notlar: string;
  }>;
  toplam_maliyet_kimyasal: number;
  toplam_maliyet_organik: number;
  ph_uyari?: string;
}

// ── Nutrient Database ─────────────────────────────────────────────────────────

const CROP_NUTRIENT_DB: Record<string, CropNutrientData> = {
  bugday: { ad: 'Buğday', emoji: '🌾', n: 2.5, p2o5: 1.0, k2o: 2.0, ph_min: 6.0, ph_max: 7.5, stage_early: 40, stage_mid: 40, stage_late: 20, notes: 'Sapa kalkma döneminde azot kritik' },
  arpa: { ad: 'Arpa', emoji: '🌾', n: 2.2, p2o5: 1.0, k2o: 1.8, ph_min: 6.0, ph_max: 7.0, stage_early: 45, stage_mid: 35, stage_late: 20, notes: 'Erken azot uygulaması önemli' },
  misir: { ad: 'Mısır', emoji: '🌽', n: 3.0, p2o5: 1.2, k2o: 2.5, ph_min: 5.8, ph_max: 7.0, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Koçan bağlama döneminde bol azot' },
  domates: { ad: 'Domates', emoji: '🍅', n: 3.5, p2o5: 1.5, k2o: 4.0, ph_min: 6.0, ph_max: 6.8, stage_early: 25, stage_mid: 40, stage_late: 35, notes: 'Meyve gelişiminde potasyum kritik' },
  biber: { ad: 'Biber', emoji: '🫑', n: 3.0, p2o5: 1.2, k2o: 3.5, ph_min: 6.0, ph_max: 7.0, stage_early: 30, stage_mid: 40, stage_late: 30, notes: 'Düzenli gübreleme gerekir' },
  patates: { ad: 'Patates', emoji: '🥔', n: 2.8, p2o5: 1.8, k2o: 4.5, ph_min: 5.0, ph_max: 6.5, stage_early: 35, stage_mid: 45, stage_late: 20, notes: 'Yumru gelişiminde potasyum önemli' },
  sogan: { ad: 'Soğan', emoji: '🧅', n: 2.5, p2o5: 1.0, k2o: 2.2, ph_min: 6.0, ph_max: 7.0, stage_early: 40, stage_mid: 40, stage_late: 20, notes: 'Baş bağlama döneminde azot azaltılmalı' },
  pamuk: { ad: 'Pamuk', emoji: '🌱', n: 3.2, p2o5: 1.5, k2o: 3.0, ph_min: 6.0, ph_max: 7.5, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Çiçeklenme döneminde potasyum' },
  aycicegi: { ad: 'Ayçiçeği', emoji: '🌻', n: 2.5, p2o5: 1.8, k2o: 3.5, ph_min: 6.0, ph_max: 7.5, stage_early: 35, stage_mid: 45, stage_late: 20, notes: 'Tabla oluşumunda fosfor önemli' },
  seker_pancari: { ad: 'Şeker Pancarı', emoji: '🥕', n: 3.5, p2o5: 2.0, k2o: 4.5, ph_min: 6.5, ph_max: 7.5, stage_early: 30, stage_mid: 50, stage_late: 20, notes: 'Kök gelişiminde dengeli NPK' },
  salatalik: { ad: 'Salatalık', emoji: '🥒', n: 2.8, p2o5: 1.2, k2o: 3.0, ph_min: 6.0, ph_max: 7.0, stage_early: 25, stage_mid: 45, stage_late: 30, notes: 'Meyve tutumu için potasyum' },
  kavun: { ad: 'Kavun', emoji: '🍈', n: 2.5, p2o5: 1.0, k2o: 3.5, ph_min: 6.0, ph_max: 7.0, stage_early: 30, stage_mid: 40, stage_late: 30, notes: 'Tatlılık için potasyum artırılmalı' },
  karpuz: { ad: 'Karpuz', emoji: '🍉', n: 2.8, p2o5: 1.2, k2o: 4.0, ph_min: 6.0, ph_max: 7.0, stage_early: 25, stage_mid: 45, stage_late: 30, notes: 'Meyve büyümesinde potasyum' },
  uzum: { ad: 'Üzüm', emoji: '🍇', n: 2.0, p2o5: 1.0, k2o: 2.5, ph_min: 6.0, ph_max: 7.0, stage_early: 40, stage_mid: 35, stage_late: 25, notes: 'Salkım gelişiminde dengeli' },
  elma: { ad: 'Elma', emoji: '🍎', n: 1.8, p2o5: 0.8, k2o: 2.0, ph_min: 6.0, ph_max: 7.0, stage_early: 35, stage_mid: 40, stage_late: 25, notes: 'Meyve renklenmesinde potasyum' },
  zeytin: { ad: 'Zeytin', emoji: '🫒', n: 1.5, p2o5: 0.6, k2o: 1.8, ph_min: 6.5, ph_max: 7.5, stage_early: 40, stage_mid: 35, stage_late: 25, notes: 'Yıllık bakım gübrelemesi yeterli' },
};

const FERTILIZER_PRODUCTS: FertilizerProduct[] = [
  // Kimyasal
  { ad: 'Üre (46-0-0)', tip: 'kimyasal', n: 46, p: 0, k: 0, fiyat_kg: 18, uygulama: 'Toprak' },
  { ad: 'Amonyum Sülfat (21-0-0)', tip: 'kimyasal', n: 21, p: 0, k: 0, fiyat_kg: 12, uygulama: 'Toprak' },
  { ad: 'Amonyum Nitrat (33-0-0)', tip: 'kimyasal', n: 33, p: 0, k: 0, fiyat_kg: 15, uygulama: 'Toprak' },
  { ad: 'Diamonyum Fosfat (18-46-0)', tip: 'kimyasal', n: 18, p: 46, k: 0, fiyat_kg: 22, uygulama: 'Toprak' },
  { ad: 'Triple Süper Fosfat (0-46-0)', tip: 'kimyasal', n: 0, p: 46, k: 0, fiyat_kg: 20, uygulama: 'Toprak' },
  { ad: 'Potasyum Sülfat (0-0-50)', tip: 'kimyasal', n: 0, p: 0, k: 50, fiyat_kg: 25, uygulama: 'Toprak' },
  { ad: 'Potasyum Klorür (0-0-60)', tip: 'kimyasal', n: 0, p: 0, k: 60, fiyat_kg: 22, uygulama: 'Toprak' },
  { ad: 'NPK 15-15-15', tip: 'kimyasal', n: 15, p: 15, k: 15, fiyat_kg: 24, uygulama: 'Toprak' },
  { ad: 'NPK 20-20-0', tip: 'kimyasal', n: 20, p: 20, k: 0, fiyat_kg: 22, uygulama: 'Toprak' },
  
  // Organik
  { ad: 'Ahır Gübresi', tip: 'organik', n: 0.5, p: 0.3, k: 0.5, fiyat_kg: 2, uygulama: 'Toprak altı' },
  { ad: 'Tavuk Gübresi', tip: 'organik', n: 1.5, p: 1.0, k: 0.8, fiyat_kg: 4, uygulama: 'Toprak altı' },
  { ad: 'Koyun Gübresi', tip: 'organik', n: 0.9, p: 0.5, k: 0.8, fiyat_kg: 3, uygulama: 'Toprak altı' },
  { ad: 'Kompost', tip: 'organik', n: 1.0, p: 0.5, k: 1.0, fiyat_kg: 3, uygulama: 'Toprak karıştırma' },
  { ad: 'Solucan Gübresi', tip: 'organik', n: 2.0, p: 1.0, k: 1.5, fiyat_kg: 8, uygulama: 'Toprak/Yaprak' },
  { ad: 'Organik NPK (4-2-3)', tip: 'organik', n: 4, p: 2, k: 3, fiyat_kg: 12, uygulama: 'Toprak' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function GubreHesapPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    urun: '',
    hedef_verim: 0,
    toprak: null,
    gubre_tipi: 'her_ikisi',
  });
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState('');

  // ── Calculations ────────────────────────────────────────────────────────────

  const calculate = (): CalcResult => {
    const crop = CROP_NUTRIENT_DB[state.urun];
    if (!crop || !state.toprak) throw new Error('Eksik veri');

    // Total nutrient requirement (based on target yield)
    const ihtiyac = {
      n: crop.n * (state.hedef_verim * 10),       // convert ton to 100kg units
      p2o5: crop.p2o5 * (state.hedef_verim * 10),
      k2o: crop.k2o * (state.hedef_verim * 10),
    };

    // Subtract existing soil nutrients
    const eksik = {
      n: Math.max(0, ihtiyac.n - state.toprak.n),
      p2o5: Math.max(0, ihtiyac.p2o5 - state.toprak.p2o5),
      k2o: Math.max(0, ihtiyac.k2o - state.toprak.k2o),
    };

    // Calculate optimal fertilizer combinations
    const oneriler = {
      kimyasal: calculateFertilizerMix(eksik, 'kimyasal'),
      organik: calculateFertilizerMix(eksik, 'organik'),
    };

    // Application schedule
    const uygulama_takvimi = [
      {
        donem: 'İlk Gelişim',
        hafta: '0-4',
        n: Math.round(eksik.n * crop.stage_early / 100),
        p: Math.round(eksik.p2o5 * 0.7), // Most P at planting
        k: Math.round(eksik.k2o * crop.stage_early / 100),
        notlar: 'Ekimle birlikte taban gübresi',
      },
      {
        donem: 'Gelişme/Çiçeklenme',
        hafta: '4-10',
        n: Math.round(eksik.n * crop.stage_mid / 100),
        p: Math.round(eksik.p2o5 * 0.3),
        k: Math.round(eksik.k2o * crop.stage_mid / 100),
        notlar: 'Üst gübreleme (2-3 parselde)',
      },
      {
        donem: 'Meyve/Olgunlaşma',
        hafta: '10-16',
        n: Math.round(eksik.n * crop.stage_late / 100),
        p: 0,
        k: Math.round(eksik.k2o * crop.stage_late / 100),
        notlar: 'Kalite için potasyum ağırlıklı',
      },
    ];

    // pH warning
    let ph_uyari: string | undefined;
    if (state.toprak.ph < crop.ph_min) {
      ph_uyari = `⚠️ Toprak pH değeri düşük (${state.toprak.ph}). Kireçleme önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
    } else if (state.toprak.ph > crop.ph_max) {
      ph_uyari = `⚠️ Toprak pH değeri yüksek (${state.toprak.ph}). Kükürt uygulaması önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
    }

    return {
      ihtiyac,
      eksik,
      oneriler,
      uygulama_takvimi,
      toplam_maliyet_kimyasal: oneriler.kimyasal.reduce((sum, x) => sum + x.fiyat, 0),
      toplam_maliyet_organik: oneriler.organik.reduce((sum, x) => sum + x.fiyat, 0),
      ph_uyari,
    };
  };

  const calculateFertilizerMix = (
    needed: { n: number; p2o5: number; k2o: number },
    tip: 'kimyasal' | 'organik'
  ): Array<{ urun: string; miktar: number; fiyat: number }> => {
    const products = FERTILIZER_PRODUCTS.filter((p) => p.tip === tip);
    const mix: Array<{ urun: string; miktar: number; fiyat: number }> = [];

    let remainingN = needed.n;
    let remainingP = needed.p2o5;
    let remainingK = needed.k2o;

    // Strategy: Use compound fertilizers first, then single-nutrient ones

    // 1. Find best compound fertilizer
    const compounds = products.filter((p) => p.n > 0 && p.p > 0 && p.k > 0);
    if (compounds.length > 0 && remainingN > 0 && remainingP > 0 && remainingK > 0) {
      const best = compounds.reduce((a, b) => (a.fiyat_kg < b.fiyat_kg ? a : b));
      // Calculate how much we can use (limited by the nutrient in shortest supply)
      const maxByN = remainingN / (best.n / 100);
      const maxByP = remainingP / (best.p / 100);
      const maxByK = remainingK / (best.k / 100);
      const amount = Math.min(maxByN, maxByP, maxByK);
      
      if (amount > 0) {
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
        remainingN -= amount * (best.n / 100);
        remainingP -= amount * (best.p / 100);
        remainingK -= amount * (best.k / 100);
      }
    }

    // 2. Add phosphorus if needed (apply early)
    if (remainingP > 5) {
      const pProducts = products.filter((p) => p.p > 30).sort((a, b) => b.p - a.p);
      if (pProducts.length > 0) {
        const best = pProducts[0];
        const amount = remainingP / (best.p / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
        remainingN += amount * (best.n / 100); // DAP adds N too
      }
    }

    // 3. Add nitrogen if needed
    if (remainingN > 5) {
      const nProducts = products.filter((p) => p.n > 20 && p.p === 0 && p.k === 0).sort((a, b) => b.n - a.n);
      if (nProducts.length > 0) {
        const best = nProducts[0];
        const amount = remainingN / (best.n / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      }
    }

    // 4. Add potassium if needed
    if (remainingK > 5) {
      const kProducts = products.filter((p) => p.k > 40).sort((a, b) => b.k - a.k);
      if (kProducts.length > 0) {
        const best = kProducts[0];
        const amount = remainingK / (best.k / 100);
        mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      }
    }

    return mix;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleNext = () => {
    setError('');
    if (step === 1 && !state.urun) return setError('Lütfen ürün seçin');
    if (step === 1 && state.hedef_verim <= 0) return setError('Lütfen hedef verim girin');
    if (step === 2 && !state.toprak) return setError('Lütfen toprak analizi bilgilerini girin');
    
    if (step === 3) {
      try {
        const res = calculate();
        setResult(res);
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
    setState({ urun: '', hedef_verim: 0, toprak: null, gubre_tipi: 'her_ikisi' });
    setResult(null);
    setError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const cropData = state.urun ? CROP_NUTRIENT_DB[state.urun] : null;

  return (
    <div className="gh-wizard">
      {/* Topbar */}
      <div className="gh-topbar">
        <button className="gh-topbar__back" onClick={() => navigate(-1)}>← Geri</button>
        <div className="gh-topbar__title">
          <span>🧪</span>
          <span>Gübre Hesaplayıcı</span>
        </div>
        {step > 1 && <button className="gh-topbar__reset" onClick={handleReset}>Yeniden Başlat</button>}
        {step === 1 && <div style={{ width: '140px' }} />}
      </div>

      <div className="gh-content">
        {/* Steps */}
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
          
          <div className={`gh-step ${step >= 4 ? 'gh-step--active' : ''} ${step > 4 ? 'gh-step--done' : ''}`}>
            <div className="gh-step__bubble">4</div>
            <div className="gh-step__label">Sonuçlar</div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="gh-error">{error}</div>}

        {/* STEP 1: Crop & Target Yield */}
        {step === 1 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Ürün ve Hedef Verim</h2>
            <p className="gh-card__desc">Yetiştireceğiniz ürünü ve hedeflediğiniz verimi seçin.</p>

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
                <h3>{cropData.emoji} {cropData.ad} - Besin İhtiyacı</h3>
                <p><strong>N (Azot):</strong> {cropData.n} kg/dekar (100 kg verim için)</p>
                <p><strong>P₂O₅ (Fosfor):</strong> {cropData.p2o5} kg/dekar (100 kg verim için)</p>
                <p><strong>K₂O (Potasyum):</strong> {cropData.k2o} kg/dekar (100 kg verim için)</p>
                <p><strong>Uygun pH:</strong> {cropData.ph_min} - {cropData.ph_max}</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>💡 {cropData.notes}</p>
              </div>
            )}

            <div className="gh-field">
              <label className="gh-label">Hedef Verim (ton/dekar)</label>
              <div className="gh-yield">
                <div className="gh-yield__value">{state.hedef_verim.toFixed(1)} <span>ton/dekar</span></div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={state.hedef_verim}
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
              <button className="gh-btn gh-btn--primary gh-btn--full" onClick={handleNext}>
                İleri →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Soil Analysis */}
        {step === 2 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Toprak Analizi</h2>
            <p className="gh-card__desc">
              Toprağınızın mevcut besin değerlerini girin. Toprak analizi yaptırmadıysanız ortalama değerleri kullanabilirsiniz.
            </p>

            <div className="gh-soil-grid">
              <div className="gh-field">
                <label className="gh-label">Azot (N) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 5"
                  value={state.toprak?.n ?? ''}
                  onChange={(e) => setState({ ...state, toprak: { ...state.toprak!, n: parseFloat(e.target.value) || 0 } })}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Fosfor (P₂O₅) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 3"
                  value={state.toprak?.p2o5 ?? ''}
                  onChange={(e) => setState({ ...state, toprak: { ...state.toprak!, p2o5: parseFloat(e.target.value) || 0 } })}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Potasyum (K₂O) - kg/dekar</label>
                <input
                  type="number"
                  className="gh-input"
                  placeholder="Örn: 8"
                  value={state.toprak?.k2o ?? ''}
                  onChange={(e) => setState({ ...state, toprak: { ...state.toprak!, k2o: parseFloat(e.target.value) || 0 } })}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">pH Değeri</label>
                <input
                  type="number"
                  step="0.1"
                  className="gh-input"
                  placeholder="Örn: 6.5"
                  value={state.toprak?.ph ?? ''}
                  onChange={(e) => setState({ ...state, toprak: { ...state.toprak!, ph: parseFloat(e.target.value) || 0 } })}
                />
              </div>

              <div className="gh-field">
                <label className="gh-label">Organik Madde (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="gh-input"
                  placeholder="Örn: 2.5"
                  value={state.toprak?.organik_madde ?? ''}
                  onChange={(e) => setState({ ...state, toprak: { ...state.toprak!, organik_madde: parseFloat(e.target.value) || 0 } })}
                />
              </div>
            </div>

            <div className="gh-preset-soil">
              <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Hızlı Seçenekler:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 3, p2o5: 2, k2o: 5, ph: 6.5, organik_madde: 1.5 } })}
                >
                  Fakir Toprak
                </button>
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 6, p2o5: 4, k2o: 10, ph: 6.8, organik_madde: 2.5 } })}
                >
                  Orta Verimli
                </button>
                <button
                  className="gh-preset-btn"
                  onClick={() => setState({ ...state, toprak: { n: 10, p2o5: 7, k2o: 15, ph: 7.0, organik_madde: 3.5 } })}
                >
                  Verimli Toprak
                </button>
              </div>
            </div>

            <div className="gh-btn-row">
              <button className="gh-btn gh-btn--secondary" onClick={handleBack}>← Geri</button>
              <button className="gh-btn gh-btn--primary" onClick={handleNext}>İleri →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Fertilizer Type */}
        {step === 3 && (
          <div className="gh-card">
            <h2 className="gh-card__title">Gübre Tipi Tercihi</h2>
            <p className="gh-card__desc">
              Kimyasal, organik veya her iki tip gübrenin karşılaştırmasını görmek istediğinizi seçin.
            </p>

            <div className="gh-radio-group">
              <label className={`gh-radio-btn ${state.gubre_tipi === 'kimyasal' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'kimyasal'}
                  onChange={() => setState({ ...state, gubre_tipi: 'kimyasal' })}
                />
                <span>🧪 Kimyasal Gübreler</span>
                <span className="gh-radio-hint">Hızlı etki, hassas doz kontrolü, düşük hacim</span>
              </label>

              <label className={`gh-radio-btn ${state.gubre_tipi === 'organik' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'organik'}
                  onChange={() => setState({ ...state, gubre_tipi: 'organik' })}
                />
                <span>🌿 Organik Gübreler</span>
                <span className="gh-radio-hint">Toprak yapısını iyileştirir, yavaş salınım, çevre dostu</span>
              </label>

              <label className={`gh-radio-btn ${state.gubre_tipi === 'her_ikisi' ? 'gh-radio-btn--active' : ''}`}>
                <input
                  type="radio"
                  name="gubre"
                  checked={state.gubre_tipi === 'her_ikisi'}
                  onChange={() => setState({ ...state, gubre_tipi: 'her_ikisi' })}
                />
                <span>⚖️ Her İkisini Karşılaştır</span>
                <span className="gh-radio-hint">Kimyasal ve organik seçenekleri yan yana gör</span>
              </label>
            </div>

            <div className="gh-btn-row">
              <button className="gh-btn gh-btn--secondary" onClick={handleBack}>← Geri</button>
              <button className="gh-btn gh-btn--primary" onClick={handleNext}>Hesapla 🧮</button>
            </div>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 4 && result && (
          <div className="gh-results">
            {/* pH Warning */}
            {result.ph_uyari && (
              <div className="gh-ph-warning">{result.ph_uyari}</div>
            )}

            {/* Summary */}
            <div className="gh-card">
              <h2 className="gh-card__title">📊 Besin İhtiyacı Özeti</h2>
              <div className="gh-summary-grid">
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Toplam Azot (N)</div>
                  <div className="gh-summary-value">{result.ihtiyac.n.toFixed(1)} kg</div>
                  <div className="gh-summary-sub">Eksik: {result.eksik.n.toFixed(1)} kg</div>
                </div>
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Toplam Fosfor (P₂O₅)</div>
                  <div className="gh-summary-value">{result.ihtiyac.p2o5.toFixed(1)} kg</div>
                  <div className="gh-summary-sub">Eksik: {result.eksik.p2o5.toFixed(1)} kg</div>
                </div>
                <div className="gh-summary-item">
                  <div className="gh-summary-label">Toplam Potasyum (K₂O)</div>
                  <div className="gh-summary-value">{result.ihtiyac.k2o.toFixed(1)} kg</div>
                  <div className="gh-summary-sub">Eksik: {result.eksik.k2o.toFixed(1)} kg</div>
                </div>
              </div>
            </div>

            {/* Fertilizer Recommendations */}
            {(state.gubre_tipi === 'kimyasal' || state.gubre_tipi === 'her_ikisi') && (
              <div className="gh-card">
                <h2 className="gh-card__title">🧪 Kimyasal Gübre Önerisi</h2>
                <div className="gh-fertilizer-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Gübre Adı</th>
                        <th>Miktar (kg)</th>
                        <th>Fiyat (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.oneriler.kimyasal.map((item, i) => (
                        <tr key={i}>
                          <td>{item.urun}</td>
                          <td>{item.miktar} kg</td>
                          <td>₺{item.fiyat.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="gh-fertilizer-total">
                        <td><strong>TOPLAM</strong></td>
                        <td></td>
                        <td><strong>₺{result.toplam_maliyet_kimyasal.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(state.gubre_tipi === 'organik' || state.gubre_tipi === 'her_ikisi') && (
              <div className="gh-card">
                <h2 className="gh-card__title">🌿 Organik Gübre Önerisi</h2>
                <div className="gh-fertilizer-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Gübre Adı</th>
                        <th>Miktar (kg)</th>
                        <th>Fiyat (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.oneriler.organik.map((item, i) => (
                        <tr key={i}>
                          <td>{item.urun}</td>
                          <td>{item.miktar} kg</td>
                          <td>₺{item.fiyat.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="gh-fertilizer-total">
                        <td><strong>TOPLAM</strong></td>
                        <td></td>
                        <td><strong>₺{result.toplam_maliyet_organik.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comparison */}
            {state.gubre_tipi === 'her_ikisi' && (
              <div className="gh-card gh-comparison">
                <h3>⚖️ Maliyet Karşılaştırması</h3>
                <div className="gh-comparison-row">
                  <div className="gh-comparison-item">
                    <span>Kimyasal Gübre</span>
                    <strong>₺{result.toplam_maliyet_kimyasal.toLocaleString()}</strong>
                  </div>
                  <div className="gh-comparison-vs">VS</div>
                  <div className="gh-comparison-item">
                    <span>Organik Gübre</span>
                    <strong>₺{result.toplam_maliyet_organik.toLocaleString()}</strong>
                  </div>
                </div>
                <p className="gh-comparison-note">
                  {result.toplam_maliyet_kimyasal < result.toplam_maliyet_organik
                    ? '💡 Kimyasal gübre daha ekonomik ancak organik gübre toprak sağlığını uzun vadede iyileştirir.'
                    : '💡 Organik gübre bu durumda daha ekonomik ve toprak için daha faydalıdır.'}
                </p>
              </div>
            )}

            {/* Application Schedule */}
            <div className="gh-card">
              <h2 className="gh-card__title">📅 Uygulama Takvimi</h2>
              <div className="gh-schedule-table">
                <table>
                  <thead>
                    <tr>
                      <th>Dönem</th>
                      <th>Hafta</th>
                      <th>N (kg)</th>
                      <th>P₂O₅ (kg)</th>
                      <th>K₂O (kg)</th>
                      <th>Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.uygulama_takvimi.map((item, i) => (
                      <tr key={i}>
                        <td><strong>{item.donem}</strong></td>
                        <td>{item.hafta}</td>
                        <td>{item.n}</td>
                        <td>{item.p}</td>
                        <td>{item.k}</td>
                        <td style={{ fontSize: '0.85rem' }}>{item.notlar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--gh-text-secondary)' }}>
                💡 Gübreleme zamanlaması hava koşullarına ve bitki gelişimine göre ayarlanmalıdır.
              </p>
            </div>

            <div className="gh-btn-row gh-btn-row--center">
              <button className="gh-btn gh-btn--secondary" onClick={handleReset}>🔄 Yeni Hesaplama</button>
              <button className="gh-btn gh-btn--primary" onClick={() => window.print()}>🖨️ Yazdır</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
