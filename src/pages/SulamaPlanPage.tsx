import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SulamaPlanPage.css';

// ═══════════════════════════════════════════════════════════════════════════════
//  Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

interface CropWaterData {
  urun: string;
  katsayi: number;        // Kc - crop coefficient (0.4 - 1.2)
  donem: string[];        // Gelişme dönemleri
  donemKc: number[];      // Dönemlere göre Kc değerleri
  kritikDonem: string;    // En kritik sulama dönemi
  sulamaSikligi: number;  // Ortalama gün
  aciklama: string;
}

interface SoilData {
  tip: string;
  su_tutma: number;       // mm/m derinlik
  sizma: number;          // 1-10 arası (1=çok hızlı, 10=çok yavaş)
  verimlilik: number;     // 1-10 arası
}

interface IrrigationSystem {
  tip: string;
  verimlilik: number;     // % (damla: 90-95, yağmurlama: 75-85, salma: 50-70)
  maliyet_kurulum: number; // ₺/dekar
  maliyet_isletme: number; // ₺/dekar/sezon
  emoji: string;
}

interface WizardState {
  step: 1 | 2 | 3 | 4;
  il: string;
  ilce: string;
  urun: string;
  alan: number;              // dekar
  toprakTipi: 'kumlu' | 'tınlı' | 'killi' | 'organik';
  sulamaSistemi: 'damla' | 'yagmurlama' | 'salma' | 'yok';
  mevcutSistem: boolean;     // Kurulu sistem var mı?
  iklim: 'sicak_kurak' | 'ilik' | 'soguk_nemli';
  gelismeDonemi: number;     // 0-3 arası indeks
}

interface CalcResult {
  gunlukSu: number;          // mm/gün
  haftalikSu: number;        // m³/hafta (tüm arazi)
  sezonlukSu: number;        // m³/sezon
  sulamaSayisi: number;      // Sezon boyunca kaç kez
  sulamaMiktar: number;      // Her sulamada m³
  elektrikMaliyet: number;   // ₺/sezon (pompa)
  sistemMaliyet: number;     // ₺/sezon kurulum+işletme
  toplamMaliyet: number;     // ₺/sezon
  suTasarrufu: number;       // Mevcut vs optimal fark (%)
  verimArtisi: number;       // Optimal sulama ile tahmini % artış
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Data
// ═══════════════════════════════════════════════════════════════════════════════

const CROP_WATER_DB: Record<string, CropWaterData> = {
  'Buğday': { urun: 'Buğday', katsayi: 1.05, donem: ['Çıkış', 'Kardeşlenme', 'Sapa Kalkma', 'Başaklanma', 'Olgunlaşma'], donemKc: [0.4, 0.75, 1.15, 1.10, 0.4], kritikDonem: 'Başaklanma', sulamaSikligi: 12, aciklama: 'Sapa kalkma ve başaklanma kritik' },
  'Arpa': { urun: 'Arpa', katsayi: 1.0, donem: ['Çıkış', 'Kardeşlenme', 'Sapa Kalkma', 'Başaklanma', 'Olgunlaşma'], donemKc: [0.35, 0.70, 1.10, 1.05, 0.35], kritikDonem: 'Başaklanma', sulamaSikligi: 14, aciklama: 'Buğdaydan az su ister' },
  'Mısır': { urun: 'Mısır', katsayi: 1.20, donem: ['Çıkış', 'Gelişme', 'Tepe atma', 'Koçan dolum', 'Olgunlaşma'], donemKc: [0.40, 0.80, 1.15, 1.20, 0.60], kritikDonem: 'Koçan dolum', sulamaSikligi: 7, aciklama: 'Çok su seven, tepe atma kritik' },
  'Domates': { urun: 'Domates', katsayi: 1.15, donem: ['Fide', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.45, 0.75, 1.15, 1.10, 0.80], kritikDonem: 'Meyve tutum', sulamaSikligi: 5, aciklama: 'Düzenli sulama gerekli, çatlama riski' },
  'Biber': { urun: 'Biber', katsayi: 1.05, donem: ['Fide', 'Çiçeklenme', 'Meyve tutum', 'Büyüme', 'Hasat'], donemKc: [0.40, 0.70, 1.05, 1.00, 0.85], kritikDonem: 'Çiçeklenme', sulamaSikligi: 6, aciklama: 'Kök çürüklüğüne hassas, aşırı sulama zararlı' },
  'Patates': { urun: 'Patates', katsayi: 1.15, donem: ['Çıkış', 'Gelişme', 'Yumru tutum', 'Yumru büyüme', 'Olgunlaşma'], donemKc: [0.50, 0.80, 1.15, 1.10, 0.75], kritikDonem: 'Yumru büyüme', sulamaSikligi: 6, aciklama: 'Yumru döneminde bol su' },
  'Soğan': { urun: 'Soğan', katsayi: 1.05, donem: ['Çıkış', 'Gelişme', 'Baş oluşum', 'Büyüme', 'Olgunlaşma'], donemKc: [0.50, 0.75, 1.05, 1.00, 0.75], kritikDonem: 'Baş oluşum', sulamaSikligi: 8, aciklama: 'Olgunlaşma öncesi sulamayı kes' },
  'Pamuk': { urun: 'Pamuk', katsayi: 1.15, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Koza oluşum', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.15, 1.10, 0.70], kritikDonem: 'Çiçeklenme', sulamaSikligi: 10, aciklama: 'Çiçeklenmede su stresi zararlı' },
  'Ayçiçeği': { urun: 'Ayçiçeği', katsayi: 1.10, donem: ['Çıkış', 'Gelişme', 'Tabla oluşum', 'Çiçeklenme', 'Olgunlaşma'], donemKc: [0.35, 0.75, 1.10, 1.05, 0.35], kritikDonem: 'Tabla oluşum', sulamaSikligi: 12, aciklama: 'Derin köklü, kurağa dayanıklı' },
  'Şeker Pancarı': { urun: 'Şeker Pancarı', katsayi: 1.20, donem: ['Çıkış', 'Yaprak gelişim', 'Kök gelişim', 'Kök büyüme', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.05, 1.20, 0.90], kritikDonem: 'Kök büyüme', sulamaSikligi: 10, aciklama: 'Uzun sezon, düzenli su' },
  'Salatalık': { urun: 'Salatalık', katsayi: 1.00, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve', 'Hasat'], donemKc: [0.50, 0.70, 1.00, 0.90, 0.75], kritikDonem: 'Çiçeklenme', sulamaSikligi: 3, aciklama: 'Sık sulama, küçük dozlar' },
  'Kavun': { urun: 'Kavun', katsayi: 1.05, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve büyüme', 'Olgunlaşma'], donemKc: [0.45, 0.75, 1.05, 0.85, 0.65], kritikDonem: 'Çiçeklenme', sulamaSikligi: 7, aciklama: 'Olgunlaşmada suyu azalt, şeker artar' },
  'Karpuz': { urun: 'Karpuz', katsayi: 1.00, donem: ['Çıkış', 'Gelişme', 'Çiçeklenme', 'Meyve büyüme', 'Olgunlaşma'], donemKc: [0.40, 0.70, 1.00, 0.80, 0.65], kritikDonem: 'Meyve büyüme', sulamaSikligi: 7, aciklama: 'Hasat öncesi suyu kes' },
  'Üzüm (Sofralık)': { urun: 'Üzüm (Sofralık)', katsayi: 0.85, donem: ['Tomurcuk', 'Çiçeklenme', 'Tane tutum', 'Olgunlaşma', 'Hasat'], donemKc: [0.30, 0.70, 0.85, 0.70, 0.45], kritikDonem: 'Tane tutum', sulamaSikligi: 14, aciklama: 'Az su ister, kuraklığa dayanıklı' },
  'Elma': { urun: 'Elma', katsayi: 0.95, donem: ['Tomurcuk', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.45, 0.60, 0.95, 0.95, 0.75], kritikDonem: 'Meyve büyüme', sulamaSikligi: 10, aciklama: 'Düzenli ama az sulama' },
  'Zeytin': { urun: 'Zeytin', katsayi: 0.65, donem: ['Tomurcuk', 'Çiçeklenme', 'Meyve tutum', 'Meyve büyüme', 'Hasat'], donemKc: [0.50, 0.65, 0.65, 0.60, 0.50], kritikDonem: 'Çiçeklenme', sulamaSikligi: 21, aciklama: 'Kuraklığa en dayanıklı meyve' },
};

const SOIL_TYPES: Record<string, SoilData> = {
  kumlu:    { tip: 'Kumlu',    su_tutma: 70,  sizma: 8, verimlilik: 4 },
  tınlı:    { tip: 'Tınlı',    su_tutma: 150, sizma: 5, verimlilik: 8 },
  killi:    { tip: 'Killi',    su_tutma: 200, sizma: 2, verimlilik: 7 },
  organik:  { tip: 'Organik',  su_tutma: 180, sizma: 6, verimlilik: 9 },
};

const IRRIGATION_SYSTEMS: Record<string, IrrigationSystem> = {
  damla:       { tip: 'Damla Sulama',       verimlilik: 92, maliyet_kurulum: 1800, maliyet_isletme: 200, emoji: '💧' },
  yagmurlama:  { tip: 'Yağmurlama',         verimlilik: 80, maliyet_kurulum: 1200, maliyet_isletme: 180, emoji: '🌧️' },
  salma:       { tip: 'Salma/Karık Sulama', verimlilik: 60, maliyet_kurulum: 300,  maliyet_isletme: 80,  emoji: '🌊' },
  yok:         { tip: 'Sulama Yok',         verimlilik: 0,  maliyet_kurulum: 0,    maliyet_isletme: 0,   emoji: '🚫' },
};

const CLIMATE_FACTOR: Record<string, number> = {
  sicak_kurak:   1.25,  // Akdeniz, GAP
  ilik:          1.00,  // Marmara, Ege
  soguk_nemli:   0.80,  // Karadeniz
};

const ILLER = [
  'Adana', 'Adıyaman', 'Afyon', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop',
  'Sivas', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
];

const STEPS = [
  { n: 1, icon: '📍', label: 'Konum & İklim' },
  { n: 2, icon: '🌾', label: 'Ürün' },
  { n: 3, icon: '💧', label: 'Sistem & Arazi' },
  { n: 4, icon: '📊', label: 'Sonuçlar' },
] as const;

const INITIAL: WizardState = {
  step: 1,
  il: '',
  ilce: '',
  urun: '',
  alan: 100,
  toprakTipi: 'tınlı',
  sulamaSistemi: 'damla',
  mevcutSistem: false,
  iklim: 'ilik',
  gelismeDonemi: 2,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Calculation Engine
// ═══════════════════════════════════════════════════════════════════════════════

function calculate(state: WizardState): CalcResult | null {
  const cropData = CROP_WATER_DB[state.urun];
  if (!cropData) return null;

  const system = IRRIGATION_SYSTEMS[state.sulamaSistemi];
  const climateFactor = CLIMATE_FACTOR[state.iklim];

  // ETo (reference evapotranspiration) - ortalama 5mm/gün varsayımı
  const eto = 5.0 * climateFactor;

  // ETc (crop evapotranspiration) = ETo × Kc
  const kc = cropData.donemKc[state.gelismeDonemi] ?? cropData.katsayi;
  const etc = eto * kc;

  // Effective rainfall (tahmini) - sezon ortalaması 1mm/gün
  const effectiveRain = 1.0;

  // Net sulama ihtiyacı
  const netDaily = Math.max(0, etc - effectiveRain);

  // Sistem verimliliği ile brüt su ihtiyacı
  const effi = system.verimlilik / 100;
  const gunlukSu = effi > 0 ? netDaily / effi : netDaily;

  // Haftalık toplam (m³)
  const haftalikSu = (gunlukSu * 7 * state.alan * 100) / 1000; // mm → m³

  // Sezonluk (120 gün varsayımı)
  const sezonSure = 120;
  const sezonlukSu = (gunlukSu * sezonSure * state.alan * 100) / 1000;

  // Sulama sayısı
  const sulamaSayisi = Math.ceil(sezonSure / cropData.sulamaSikligi);
  const sulamaMiktar = sezonlukSu / sulamaSayisi;

  // Maliyet
  const pompaMaliyet = sezonlukSu * 0.15; // 0.15 ₺/m³ elektrik
  const sistemKurulum = state.mevcutSistem ? 0 : system.maliyet_kurulum * state.alan;
  const sistemIsletme = system.maliyet_isletme * state.alan;
  const toplamMaliyet = pompaMaliyet + sistemIsletme + (sistemKurulum / 5); // Kurulum 5 yıla yayıldı

  // Tasarruf & Verim artışı
  const optimalSystem = IRRIGATION_SYSTEMS['damla'];
  const currentEffi = system.verimlilik;
  const optimalEffi = optimalSystem.verimlilik;
  const suTasarrufu = ((optimalEffi - currentEffi) / optimalEffi) * 100;
  
  const verimArtisi = state.sulamaSistemi === 'yok' ? 40 : suTasarrufu > 0 ? suTasarrufu * 0.5 : 0;

  return {
    gunlukSu,
    haftalikSu,
    sezonlukSu,
    sulamaSayisi,
    sulamaMiktar,
    elektrikMaliyet: pompaMaliyet,
    sistemMaliyet: sistemIsletme + (sistemKurulum / 5),
    toplamMaliyet,
    suTasarrufu: Math.max(0, suTasarrufu),
    verimArtisi,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SulamaPlanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>(INITIAL);
  const [error, setError] = useState('');

  const cropData = state.urun ? CROP_WATER_DB[state.urun] : null;
  const calc = state.step === 4 ? calculate(state) : null;

  const clampArea = (v: number) => Math.max(1, Math.min(20000, v));
  const AREA_PRESETS = [10, 25, 50, 100, 200, 500, 1000];

  const goStep2 = () => {
    if (!state.il) { setError('Lütfen il seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 2 }));
  };
  const goStep3 = () => {
    if (!state.urun) { setError('Lütfen ürün seçin'); return; }
    setError(''); setState(s => ({ ...s, step: 3 }));
  };
  const goStep4 = () => {
    if (state.alan <= 0) { setError('Geçerli arazi büyüklüğü girin'); return; }
    setError(''); setState(s => ({ ...s, step: 4 }));
  };
  const reset = () => { setState(INITIAL); setError(''); };

  return (
    <div className="sp-wizard">
      <div className="sp-topbar">
        <button className="sp-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="sp-topbar__title">
          <span>💧</span>
          <span>Sulama Planlayıcı</span>
        </div>
        {state.step > 1 && (
          <button className="sp-topbar__reset" onClick={reset}>Yeniden Başla</button>
        )}
      </div>

      <div className="sp-content">
        {/* Steps */}
        <div className="sp-steps">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className={`sp-step ${state.step === s.n ? 'sp-step--active' : state.step > s.n ? 'sp-step--done' : ''}`}>
                <div className="sp-step__bubble">{state.step > s.n ? '✓' : s.icon}</div>
                <span className="sp-step__label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`sp-step__line ${state.step > s.n ? 'sp-step__line--done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="sp-error">{error}</div>}

        {/* ── STEP 1: Konum & İklim ─────────────────────────────────────── */}
        {state.step === 1 && (
          <div className="sp-card">
            <h2 className="sp-card__title">📍 Konum ve İklim Bilgileri</h2>
            <p className="sp-card__desc">Sulama planı yapmak için konum ve iklim verilerinizi girin.</p>

            <div className="sp-field">
              <label className="sp-label" htmlFor="il-sel">İl</label>
              <select id="il-sel" className="sp-select" value={state.il}
                onChange={e => setState(s => ({ ...s, il: e.target.value }))}>
                <option value="">— İl seçin —</option>
                {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
              </select>
            </div>

            <div className="sp-field">
              <label className="sp-label">İklim Bölgesi</label>
              <div className="sp-radio-group">
                <label className={`sp-radio-btn ${state.iklim === 'sicak_kurak' ? 'sp-radio-btn--active' : ''}`}>
                  <input type="radio" name="iklim" value="sicak_kurak" checked={state.iklim === 'sicak_kurak'}
                    onChange={e => setState(s => ({ ...s, iklim: e.target.value as WizardState['iklim'] }))} />
                  <span>🌞 Sıcak & Kurak</span>
                  <span className="sp-radio-hint">Akdeniz, GAP, İç Anadolu</span>
                </label>
                <label className={`sp-radio-btn ${state.iklim === 'ilik' ? 'sp-radio-btn--active' : ''}`}>
                  <input type="radio" name="iklim" value="ilik" checked={state.iklim === 'ilik'}
                    onChange={e => setState(s => ({ ...s, iklim: e.target.value as WizardState['iklim'] }))} />
                  <span>🌤️ Ilık</span>
                  <span className="sp-radio-hint">Marmara, Ege kıyısı</span>
                </label>
                <label className={`sp-radio-btn ${state.iklim === 'soguk_nemli' ? 'sp-radio-btn--active' : ''}`}>
                  <input type="radio" name="iklim" value="soguk_nemli" checked={state.iklim === 'soguk_nemli'}
                    onChange={e => setState(s => ({ ...s, iklim: e.target.value as WizardState['iklim'] }))} />
                  <span>🌧️ Soğuk & Nemli</span>
                  <span className="sp-radio-hint">Karadeniz, Doğu Anadolu</span>
                </label>
              </div>
            </div>

            <button className="sp-btn sp-btn--primary sp-btn--full" onClick={goStep2}>
              Devam Et →
            </button>
          </div>
        )}

        {/* ── STEP 2: Ürün ──────────────────────────────────────────────── */}
        {state.step === 2 && (
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
        )}

        {/* ── STEP 3: Sistem & Arazi ────────────────────────────────────── */}
        {state.step === 3 && (
          <div className="sp-card">
            <h2 className="sp-card__title">💧 Sulama Sistemi ve Arazi Bilgileri</h2>
            <p className="sp-card__desc">Seçilen ürün: <strong>{state.urun}</strong></p>

            <div className="sp-field">
              <label className="sp-label">Arazi Büyüklüğü</label>
              <div className="sp-area">
                <div className="sp-area__value">{state.alan.toLocaleString('tr-TR')} <span>dekar</span></div>
                <input className="sp-range" type="range" min={1} max={5000} step={10} value={state.alan}
                  onChange={e => setState(s => ({ ...s, alan: clampArea(Number(e.target.value)) }))} />
                <div className="sp-area__presets">
                  {AREA_PRESETS.map(v => (
                    <button key={v} type="button"
                      className={`sp-preset-btn ${state.alan === v ? 'sp-preset-btn--active' : ''}`}
                      onClick={() => setState(s => ({ ...s, alan: v }))}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Toprak Tipi</label>
              <div className="sp-toggle-row">
                {(['kumlu', 'tınlı', 'killi', 'organik'] as const).map(tip => (
                  <button key={tip}
                    className={`sp-toggle-btn ${state.toprakTipi === tip ? 'sp-toggle-btn--active' : ''}`}
                    onClick={() => setState(s => ({ ...s, toprakTipi: tip }))}>
                    {SOIL_TYPES[tip].tip}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Sulama Sistemi</label>
              <div className="sp-system-grid">
                {(['damla', 'yagmurlama', 'salma', 'yok'] as const).map(sys => {
                  const sysData = IRRIGATION_SYSTEMS[sys];
                  return (
                    <label key={sys} className={`sp-system-card ${state.sulamaSistemi === sys ? 'sp-system-card--active' : ''}`}>
                      <input type="radio" name="sistem" value={sys} checked={state.sulamaSistemi === sys}
                        onChange={e => setState(s => ({ ...s, sulamaSistemi: e.target.value as WizardState['sulamaSistemi'] }))} />
                      <div className="sp-system-card__emoji">{sysData.emoji}</div>
                      <div className="sp-system-card__name">{sysData.tip}</div>
                      <div className="sp-system-card__stats">
                        <span>Verim: %{sysData.verimlilik}</span>
                        {sysData.maliyet_kurulum > 0 && (
                          <span>{sysData.maliyet_kurulum.toLocaleString('tr-TR')} ₺/da</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {state.sulamaSistemi !== 'yok' && (
              <div className="sp-field">
                <label className="sp-checkbox">
                  <input type="checkbox" checked={state.mevcutSistem}
                    onChange={e => setState(s => ({ ...s, mevcutSistem: e.target.checked }))} />
                  <span>Sistemim mevcut (kurulum maliyeti yok)</span>
                </label>
              </div>
            )}

            {cropData && (
              <div className="sp-field">
                <label className="sp-label">Gelişme Dönemi</label>
                <div className="sp-donem-select">
                  {cropData.donem.map((donem, idx) => (
                    <label key={idx} className={`sp-donem-btn ${state.gelismeDonemi === idx ? 'sp-donem-btn--active' : ''}`}>
                      <input type="radio" name="donem" value={idx} checked={state.gelismeDonemi === idx}
                        onChange={() => setState(s => ({ ...s, gelismeDonemi: idx }))} />
                      <span>{donem}</span>
                      <span className="sp-donem-kc">Kc: {cropData.donemKc[idx].toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="sp-btn-row">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
              <button className="sp-btn sp-btn--primary" onClick={goStep4}>📊 Sonuçları Hesapla →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Sonuçlar ──────────────────────────────────────────── */}
        {state.step === 4 && calc && cropData && (
          <div className="sp-results">
            <div className="sp-kpi-grid">
              <div className="sp-kpi sp-kpi--main">
                <div className="sp-kpi__label">Günlük Su İhtiyacı</div>
                <div className="sp-kpi__value">{calc.gunlukSu.toFixed(1)}</div>
                <div className="sp-kpi__unit">mm/gün</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Haftalık Toplam</div>
                <div className="sp-kpi__value">{calc.haftalikSu.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³/hafta</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Sezonluk Toplam</div>
                <div className="sp-kpi__value">{calc.sezonlukSu.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Sulama Sayısı</div>
                <div className="sp-kpi__value">{calc.sulamaSayisi}</div>
                <div className="sp-kpi__unit">kez/sezon</div>
              </div>
              <div className="sp-kpi">
                <div className="sp-kpi__label">Her Sulamada</div>
                <div className="sp-kpi__value">{calc.sulamaMiktar.toFixed(0)}</div>
                <div className="sp-kpi__unit">m³</div>
              </div>
            </div>

            <div className="sp-cost-card">
              <h3>💰 Maliyet Analizi (Sezonluk)</h3>
              <div className="sp-cost-row">
                <span>Elektrik (Pompa)</span>
                <span>{calc.elektrikMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-row">
                <span>Sistem (Kurulum + İşletme)</span>
                <span>{calc.sistemMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-row sp-cost-row--total">
                <span>Toplam</span>
                <span>{calc.toplamMaliyet.toFixed(0)} ₺</span>
              </div>
              <div className="sp-cost-perda">
                <span>≈ {(calc.toplamMaliyet / state.alan).toFixed(0)} ₺/dekar</span>
              </div>
            </div>

            {calc.verimArtisi > 0 && (
              <div className="sp-benefit-card">
                <h3>🌱 Potansiyel Faydalar</h3>
                <div className="sp-benefit-item">
                  <span className="sp-benefit-icon">📈</span>
                  <div>
                    <div className="sp-benefit-title">Verim Artışı</div>
                    <div className="sp-benefit-value">+%{calc.verimArtisi.toFixed(0)}</div>
                    <div className="sp-benefit-hint">Optimal sulama ile tahmini</div>
                  </div>
                </div>
                {calc.suTasarrufu > 0 && (
                  <div className="sp-benefit-item">
                    <span className="sp-benefit-icon">💧</span>
                    <div>
                      <div className="sp-benefit-title">Su Tasarrufu</div>
                      <div className="sp-benefit-value">%{calc.suTasarrufu.toFixed(0)}</div>
                      <div className="sp-benefit-hint">Damla sulama sistemine geçişle</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="sp-schedule-card">
              <h3>📅 Sulama Takvimi — {cropData.urun}</h3>
              <div className="sp-schedule-grid">
                {cropData.donem.map((donem, idx) => (
                  <div key={idx} className={`sp-schedule-item ${state.gelismeDonemi === idx ? 'sp-schedule-item--current' : ''}`}>
                    <div className="sp-schedule-donem">{donem}</div>
                    <div className="sp-schedule-kc">Kc: {cropData.donemKc[idx].toFixed(2)}</div>
                    <div className="sp-schedule-freq">Her {Math.ceil(cropData.sulamaSikligi * (1 - cropData.donemKc[idx] * 0.2))} gün</div>
                  </div>
                ))}
              </div>
              <p className="sp-schedule-note">⚠️ <strong>Kritik dönem:</strong> {cropData.kritikDonem} — su stresinden kaçının!</p>
            </div>

            <div className="sp-params-card">
              <h3>Hesaplama Parametreleri</h3>
              <div className="sp-params">
                <span>📍 {state.il}</span>
                <span>🌾 {state.urun}</span>
                <span>📐 {state.alan.toLocaleString('tr-TR')} da</span>
                <span>🪨 Toprak: {SOIL_TYPES[state.toprakTipi].tip}</span>
                <span>💧 Sistem: {IRRIGATION_SYSTEMS[state.sulamaSistemi].tip}</span>
                <span>🌡️ İklim: {state.iklim === 'sicak_kurak' ? 'Sıcak & Kurak' : state.iklim === 'ilik' ? 'Ilık' : 'Soğuk & Nemli'}</span>
                <span>📊 Dönem: {cropData.donem[state.gelismeDonemi]}</span>
              </div>
            </div>

            <div className="sp-btn-row sp-btn-row--center">
              <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 3 }))}>← Sistem Bilgileri</button>
              <button className="sp-btn sp-btn--secondary" onClick={() => window.print()}>🖨️ Yazdır</button>
              <button className="sp-btn sp-btn--primary" onClick={reset}>🔄 Yeni Plan</button>
            </div>
          </div>
        )}

        {state.step === 4 && !calc && (
          <div className="sp-card">
            <p className="sp-empty">Hesaplama yapılamadı. Lütfen bilgileri kontrol edin.</p>
            <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Ürün Seçimine Dön</button>
          </div>
        )}
      </div>
    </div>
  );
}
