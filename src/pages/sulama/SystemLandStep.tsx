import React from 'react';
import {
  SOIL_TYPES, IRRIGATION_SYSTEMS, IKLIM_SENARYOLARI,
  ETO_METOD_LISTESI, AREA_PRESETS, clamp, clampArea,
  type WizardState, type CropWaterData, type EToMetodId,
} from './sulamaUtils';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  cropData: CropWaterData | null;
  goStep4: () => void;
}

export function SystemLandStep({ state, setState, cropData, goStep4 }: Props) {
  return (
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
                  onChange={e => {
                    const v = e.target.value as WizardState['sulamaSistemi'];
                    setState(s => ({
                      ...s,
                      sulamaSistemi: v,
                      sulamaKarsilamaPct: v === 'yok' ? 0 : s.sulamaKarsilamaPct,
                      fertigasyon: v === 'yok' ? false : s.fertigasyon,
                    }));
                  }} />
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

      {state.sulamaSistemi !== 'yok' && (
        <div className="sp-field">
          <label className="sp-label">⚡ Elektrik Birim Fiyatı (₺/m³)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number" step="0.01" min="0.01" max="5"
              value={state.elektrikBirimFiyat}
              onChange={e => setState(s => ({ ...s, elektrikBirimFiyat: Math.max(0.01, Math.min(5, parseFloat(e.target.value) || 0.15)) }))}
              style={{ width: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.95rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Varsayılan: 0.15 ₺/m³</span>
          </div>
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

      <hr style={{ margin: '18px 0', border: 0, borderTop: '1px solid #e5e7eb' }} />
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>⚙️ Gelişmiş Ayarlar</h3>
      <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#6b7280' }}>
        Bu bölümdeki seçenekler, eldeki veri seti (uzun yıl ETo/yağış tablosu + opsiyonel OpenWeather tahmini) nedeniyle
        <strong> yaklaşık / karar-destek</strong> amaçlı uygulanır.
      </p>

      <div className="sp-field">
        <label className="sp-label" htmlFor="eto-yontem">Referans ETo Yöntemi</label>
        <select
          id="eto-yontem"
          className="sp-select"
          value={state.etoYontemi}
          onChange={e => setState(s => ({ ...s, etoYontemi: e.target.value as EToMetodId }))}
        >
          {ETO_METOD_LISTESI.map(m => (
            <option key={m.id} value={m.id}>
              {m.gercekFormul ? '✅ ' : '📊 '}{m.label}
            </option>
          ))}
        </select>
        {(() => {
          const secilen = ETO_METOD_LISTESI.find(m => m.id === state.etoYontemi);
          return secilen ? (
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: secilen.gercekFormul ? '#065f46' : '#6b7280',
              background: secilen.gercekFormul ? 'rgba(6,95,70,0.06)' : 'transparent',
              padding: secilen.gercekFormul ? '6px 10px' : '0', borderRadius: 6 }}>
              {secilen.gercekFormul && <strong>Gerçek formül: </strong>}{secilen.aciklama}
            </div>
          ) : null;
        })()}
      </div>

      <div className="sp-field">
        <label className="sp-label">İklim Senaryosu</label>
        <div className="sp-toggle-row">
          {(['normal', 'kurak', 'yagisli'] as const).map(k => (
            <button
              key={k}
              className={`sp-toggle-btn ${state.iklimSenaryosu === k ? 'sp-toggle-btn--active' : ''}`}
              onClick={() => setState(s => ({ ...s, iklimSenaryosu: k }))}
              type="button"
            >
              {IKLIM_SENARYOLARI[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-field">
        <label className="sp-label">Kc Modeli</label>
        <div className="sp-toggle-row">
          {(['tek', 'cift'] as const).map(k => (
            <button
              key={k}
              className={`sp-toggle-btn ${state.kcModeli === k ? 'sp-toggle-btn--active' : ''}`}
              onClick={() => setState(s => ({ ...s, kcModeli: k }))}
              type="button"
            >
              {k === 'tek' ? 'Tek Kc' : 'Çift Kc (Kcb+Ke)'}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
          Çift Kc: yağış/buharlaşma bileşenini (Ke) yaklaşık olarak ayırır.
        </div>
      </div>

      <div className="sp-field">
        <label className="sp-label">Kök Derinliği (m)</label>
        <input
          type="number"
          min={0.2}
          max={2.0}
          step={0.05}
          value={state.kokDerinligiM}
          onChange={e => setState(s => ({ ...s, kokDerinligiM: clamp(0.2, Number(e.target.value) || 0.6, 2.0) }))}
          className="sp-select"
        />
        <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
          Toplam kullanılabilir su (TAW) ve kritik açığı (RAW) etkiler.
        </div>
      </div>

      <div className="sp-field">
        <label className="sp-label">Sulama Karşılama Oranı (%)</label>
        {state.sulamaSistemi === 'yok' ? (
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Sulama sistemi yok seçildiği için karşılama oranı 0% kabul edilir.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={state.sulamaKarsilamaPct}
                onChange={e => setState(s => ({ ...s, sulamaKarsilamaPct: clamp(0, Number(e.target.value) || 0, 100) }))}
                className="sp-range"
              />
              <strong style={{ width: 52, textAlign: 'right' }}>%{state.sulamaKarsilamaPct}</strong>
            </div>
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
              %100: tam sulama, %60-80: defisit sulama senaryosu.
            </div>
          </>
        )}
      </div>

      <div className="sp-field">
        <label className="sp-checkbox">
          <input
            type="checkbox"
            checked={state.akilliPlan}
            onChange={e => setState(s => ({ ...s, akilliPlan: e.target.checked }))}
          />
          <span>Akıllı günlük plan (tahmini yağışa göre erteleme)</span>
        </label>
      </div>

      <div className="sp-field">
        <label className="sp-checkbox">
          <input
            type="checkbox"
            checked={state.katmanAnalizi}
            onChange={e => setState(s => ({ ...s, katmanAnalizi: e.target.checked }))}
          />
          <span>Toprak katman profili (0-20 / 20-40 / alt)</span>
        </label>
      </div>

      <div className="sp-field">
        <label className="sp-checkbox">
          <input
            type="checkbox"
            checked={state.fertigasyon}
            onChange={e => setState(s => ({ ...s, fertigasyon: e.target.checked }))}
            disabled={state.sulamaSistemi === 'yok'}
          />
          <span>Fertigasyon planı (sulamaya böl)</span>
        </label>
        {state.sulamaSistemi === 'yok' && (
          <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
            Sulama yok iken fertigasyon uygulanamaz.
          </div>
        )}
      </div>

      {state.fertigasyon && state.sulamaSistemi !== 'yok' && (
        <div className="sp-field" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="sp-label">N (kg/da)</label>
              <input type="number" min={0} max={100} step={0.1} value={state.fertN_kgDa}
                onChange={e => setState(s => ({ ...s, fertN_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="sp-select" />
            </div>
            <div>
              <label className="sp-label">P₂O₅ (kg/da)</label>
              <input type="number" min={0} max={100} step={0.1} value={state.fertP2O5_kgDa}
                onChange={e => setState(s => ({ ...s, fertP2O5_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="sp-select" />
            </div>
            <div>
              <label className="sp-label">K₂O (kg/da)</label>
              <input type="number" min={0} max={100} step={0.1} value={state.fertK2O_kgDa}
                onChange={e => setState(s => ({ ...s, fertK2O_kgDa: Math.max(0, parseFloat(e.target.value) || 0) }))}
                className="sp-select" />
            </div>
            <div>
              <label className="sp-label">Bölüm Sayısı</label>
              <input type="number" min={1} max={12} step={1} value={state.fertBolum}
                onChange={e => setState(s => ({ ...s, fertBolum: clamp(1, parseInt(e.target.value, 10) || 6, 12) }))}
                className="sp-select" />
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#6b7280' }}>
            Günlük plan tablosunda sulama olan günlere eşit bölünmüş doz olarak yansır.
          </div>
        </div>
      )}

      <div className="sp-btn-row">
        <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Geri</button>
        <button className="sp-btn sp-btn--primary" onClick={goStep4}>📊 Sonuçları Hesapla →</button>
      </div>
    </div>
  );
}
