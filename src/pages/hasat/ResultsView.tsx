import React from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { ModelWarningBox } from '../../components/ModelWarningBox';
import type { WizardState, CalcResult, ClimateRisk, SavedForecast } from './hasatUtils';
import { clearHistory } from './hasatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface ChartRow {
  yil: string | number;
  ilce?: number;
  il?: number;
  turkiye?: number;
  band?: [number, number];
}

interface CompareRow {
  urun: string;
  quick: { verim: number; uretim: number; trend: number; risk: string } | null;
}

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  loading: boolean;
  calc: CalcResult | null;
  chartData: ChartRow[];
  climateRisk: ClimateRisk | null;
  userIlRank: number;
  compareResults: CompareRow[];
  harvest: { baslangic: string; bitis: string; aciklama: string } | null;
  sowing: { ekimAy: string; ekimBitis: string; aciklama: string } | null;
  history: SavedForecast[];
  showHistory: boolean;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setHistory: React.Dispatch<React.SetStateAction<SavedForecast[]>>;
  reset: () => void;
}

export default function ResultsView({
  state, setState, loading, calc, chartData, climateRisk,
  userIlRank, compareResults, harvest, sowing,
  history, showHistory, setShowHistory, setHistory, reset,
}: Props) {
  /* Loading */
  if (loading) {
    return <div className="hz-loading hz-loading--page">⏳ Veriler yükleniyor…</div>;
  }

  /* No data */
  if (!calc) {
    return (
      <div className="hz-card">
        <p className="hz-empty">Seçilen ürün için verim verisi bulunamadı. Farklı bir ürün deneyin.</p>
        <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 2 }))}>← Ürün Seçimine Dön</button>
      </div>
    );
  }

  return (
    <div className="hz-results">

      {/* ── Model Şeffaflık Kutusu ────────────────────────────────── */}
      {(() => {
        const dataYears = state.ilceData
          ? Object.values(state.ilceData).filter(v => v > 0).length
          : state.ilData
          ? Object.values(state.ilData).filter(v => v > 0).length
          : 0;
        let conf = 10;
        if (calc.regR2 >= 0.5) conf += 40;
        else if (calc.regR2 >= 0.3) conf += 20;
        if (calc.dataLevel === 'ilce') conf += 30;
        else if (calc.dataLevel === 'il') conf += 15;
        if (dataYears >= 5) conf += 20;
        else if (dataYears >= 3) conf += 10;
        conf = Math.min(100, conf);

        const levelLabel =
          calc.dataLevel === 'ilce' ? `${state.ilce} ilçesi (ilçe verisi)` :
          calc.dataLevel === 'il'   ? `${state.il} ili ortalaması` :
                                      'Türkiye ulusal ortalaması';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ConfidenceBadge score={conf} label="Tahmin Güveni" />
              {calc.dataLevel !== 'ilce' && (
                <span style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid #f59e0b' }}>
                  ⚠️ İlçe verisi yok — veri kaydırıldı
                </span>
              )}
            </div>
            <ModelWarningBox
              modelType={`Lineer Regresyon (trend bazlı) — R² = ${calc.regR2.toFixed(2)}`}
              dataLevel={levelLabel}
              message="Bu sonuç tarihsel ilçe/il verilerine dayalı istatistiksel bir tahmindir. Hava koşulları, hastalık ve fiyat dalgalanmalarını yansıtmaz. Kesin üretim kararları için uzman görüşü alınız."
            />
          </div>
        );
      })()}

      {calc.dataLevel !== 'ilce' && (
        <div className="hz-warning">
          ⚠️ {state.ilce} ilçesi için verim verisi bulunamadı —{' '}
          {calc.dataLevel === 'il' ? `${state.il} ili` : 'Türkiye'} ortalaması kullanıldı.
        </div>
      )}

      {/* KPI cards */}
      <div className="hz-kpi-grid">
        <div className="hz-kpi hz-kpi--main">
          <div className="hz-kpi__label">Tahmini Üretim</div>
          <div className="hz-kpi__value">{calc.tahminiUretim.toFixed(1)}</div>
          <div className="hz-kpi__unit">Ton</div>
          <div className="hz-kpi__range">{calc.minUretim.toFixed(1)} – {calc.maxUretim.toFixed(1)} ton arası</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">Projeksiyon Verim (2025)</div>
          <div className="hz-kpi__value">{calc.projVerim.toFixed(0)}</div>
          <div className="hz-kpi__unit">Kg/da</div>
          <div className="hz-kpi__range">R² = {calc.regR2.toFixed(2)}</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">Düzeltilmiş Verim</div>
          <div className="hz-kpi__value">{calc.adjVerim.toFixed(0)}</div>
          <div className="hz-kpi__unit">Kg/da</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">Ort. Verim (7 yıl)</div>
          <div className="hz-kpi__value">{calc.avgVerim.toFixed(0)}</div>
          <div className="hz-kpi__unit">Kg/da</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">Arazi</div>
          <div className="hz-kpi__value">{state.alan.toLocaleString('tr-TR')}</div>
          <div className="hz-kpi__unit">Dekar</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">7 Yıl Trendi</div>
          <div className={`hz-kpi__value ${calc.trend >= 0 ? 'hz-kpi__value--green' : 'hz-kpi__value--red'}`}>
            {calc.trend >= 0 ? '+' : ''}{calc.trend.toFixed(1)}%
          </div>
          <div className="hz-kpi__unit">değişim</div>
        </div>
        <div className="hz-kpi">
          <div className="hz-kpi__label">Risk Seviyesi</div>
          <div className="hz-kpi__value" style={{ color: calc.risk.color }}>{calc.risk.emoji}</div>
          <div className="hz-kpi__unit">{calc.risk.label}</div>
          <div className="hz-kpi__range">Değişkenlik: %{(calc.cv * 100).toFixed(1)}</div>
        </div>
      </div>

      {/* ── Ekonomik Analiz (if data entered) ── */}
      {(calc.brutGelir !== null || calc.toplamMaliyet !== null) && (
        <div className="hz-econ-card">
          <h3>💰 Ekonomik Analiz</h3>
          <div className="hz-econ-grid">
            {calc.brutGelir !== null && (
              <div className="hz-econ-item">
                <div className="hz-econ-item__label">Brüt Gelir</div>
                <div className="hz-econ-item__value hz-econ-item__value--green">₺{calc.brutGelir.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                <div className="hz-econ-item__sub">{calc.tahminiUretim.toFixed(1)} ton × {state.cost.fiyatTL} ₺/kg</div>
              </div>
            )}
            {calc.toplamMaliyet !== null && (
              <div className="hz-econ-item">
                <div className="hz-econ-item__label">Toplam Maliyet</div>
                <div className="hz-econ-item__value hz-econ-item__value--red">₺{calc.toplamMaliyet.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                <div className="hz-econ-item__sub">{state.cost.maliyetDekar} ₺/da × {state.alan.toLocaleString('tr-TR')} da</div>
              </div>
            )}
            {calc.netKar !== null && (
              <div className={`hz-econ-item hz-econ-item--highlight ${calc.netKar >= 0 ? 'hz-econ-item--profit' : 'hz-econ-item--loss'}`}>
                <div className="hz-econ-item__label">Net {calc.netKar >= 0 ? 'Kâr' : 'Zarar'}</div>
                <div className="hz-econ-item__value">₺{Math.abs(calc.netKar).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                {calc.karMarji !== null && (
                  <div className="hz-econ-item__sub">Kâr Marjı: %{calc.karMarji.toFixed(1)}</div>
                )}
              </div>
            )}
          </div>
          <p className="hz-econ-disclaimer">⚠️ Bu analiz girdiğiniz fiyat/maliyet bilgisine dayanır. Gerçek sonuçlar farklılık gösterebilir.</p>
        </div>
      )}

      {/* Performance scores */}
      {(calc.perfVsIl !== null || calc.perfVsTR !== null) && (
        <div className="hz-perf-card">
          <h3>📈 Performans Karşılaştırması</h3>
          <div className="hz-perf-row">
            {calc.perfVsIl !== null && (
              <div className={`hz-perf-item ${calc.perfVsIl >= 0 ? 'hz-perf-item--positive' : 'hz-perf-item--negative'}`}>
                <span className="hz-perf-label">İl Ortalamasına Göre</span>
                <span className="hz-perf-value">{calc.perfVsIl >= 0 ? '+' : ''}{calc.perfVsIl.toFixed(1)}%</span>
                <span className="hz-perf-desc">{calc.perfVsIl >= 0 ? '↗ İl ortalamasının üzerinde' : '↘ İl ortalamasının altında'}</span>
              </div>
            )}
            {calc.perfVsTR !== null && (
              <div className={`hz-perf-item ${calc.perfVsTR >= 0 ? 'hz-perf-item--positive' : 'hz-perf-item--negative'}`}>
                <span className="hz-perf-label">Türkiye Ortalamasına Göre</span>
                <span className="hz-perf-value">{calc.perfVsTR >= 0 ? '+' : ''}{calc.perfVsTR.toFixed(1)}%</span>
                <span className="hz-perf-desc">{calc.perfVsTR >= 0 ? '↗ Ulusal ortalamanın üzerinde' : '↘ Ulusal ortalamanın altında'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Params summary */}
      <div className="hz-params-card">
        <h3>Hesaplama Parametreleri</h3>
        <div className="hz-params">
          <span className="hz-param">📍 {state.ilce}, {state.il}</span>
          <span className="hz-param">🌾 {state.urun}</span>
          <span className="hz-param">📐 {state.alan.toLocaleString('tr-TR')} da</span>
          <span className="hz-param">{state.sulama ? '🚿 Sulamalı (+%25)' : '💧 Sulamasız'}</span>
          <span className="hz-param">🪨 Toprak: {state.toprakKalite === 'iyi' ? 'İyi (+%15)' : state.toprakKalite === 'zayif' ? 'Zayıf (-%15)' : 'Orta'}</span>
          <span className="hz-param">📊 Veri: {calc.dataLevel === 'ilce' ? 'İlçe' : calc.dataLevel === 'il' ? 'İl Ort.' : 'Türkiye Ort.'}</span>
          <span className="hz-param">📈 Model: Linear Regresyon (R² = {calc.regR2.toFixed(2)})</span>
        </div>
      </div>

      {/* Trend chart — 7 yıl + projeksiyon + güven aralığı */}
      <div className="hz-chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>Verim Trendi, Projeksiyon ve Güven Aralığı (Kg/da)</h3>
          <ChartInsightButton title="Verim Trendi" description="Verim trendi ve projeksiyon" data={chartData} context={{ section: 'Hasat Tahmin' }} compact />
        </div>
        <p className="hz-chart-note">* 2025-2026 değerleri lineer regresyon projeksiyonudur. Renkli bant ±1σ güven aralığını gösterir.</p>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="yil" />
            <YAxis tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip formatter={(v: number | number[]) => {
              if (Array.isArray(v)) return [`${v[0].toFixed(0)} – ${v[1].toFixed(0)} Kg/da`, 'Güven Aralığı'];
              return [`${v.toFixed(0)} Kg/da`];
            }} />
            <Legend />
            <Area type="monotone" dataKey="band" name="±1σ Güven Aralığı"
              fill="#f59e0b" fillOpacity={0.15} stroke="none" connectNulls />
            {state.ilceData && (
              <Line type="monotone" dataKey="ilce" name={state.ilce}
                stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            )}
            {state.ilData && (
              <Line type="monotone" dataKey="il" name={`${state.il} Ort.`}
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls />
            )}
            {state.turkiyeData && (
              <Line type="monotone" dataKey="turkiye" name="Türkiye Ort."
                stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison bars */}
      {(state.ilceData || state.ilData) && (() => {
        const rows = [
          { label: state.ilce,              value: state.ilceData?.y2024 ?? 0,    color: '#f59e0b' },
          { label: `${state.il} İl Ort.`,   value: state.ilData?.y2024 ?? 0,      color: '#3b82f6' },
          { label: 'Türkiye Ort.',           value: state.turkiyeData?.y2024 ?? 0, color: '#9ca3af' },
        ].filter(r => r.value > 0);
        const maxV = Math.max(...rows.map(r => r.value));
        return (
          <div className="hz-compare-card">
            <h3>2024 Yılı Verim Karşılaştırması (Kg/da)</h3>
            {rows.map(row => (
              <div key={row.label} className="hz-bar-row">
                <span className="hz-bar-label">{row.label}</span>
                <div className="hz-bar-track">
                  <div className="hz-bar-fill" style={{ width: `${maxV ? (row.value / maxV) * 100 : 0}%`, background: row.color }} />
                </div>
                <span className="hz-bar-val">{row.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Turkey Yield HeatMap ── */}
      {state.ilVerimler.length > 0 && (
        <div className="hz-map-card">
          <h3>🗺️ Türkiye Verim Haritası — {state.urun} (2024)</h3>
          <p className="hz-chart-note">İller üzerinde gezinerek verim değerini görebilirsiniz. Koyu renk = yüksek verim.</p>
          <TurkeyHeatMap
            regionTotals={state.ilVerimler}
            unitLabel="Kg/da"
            height={420}
            fillMode="heat"
          />
          {userIlRank > 0 && (
            <div className="hz-map-rank-badge">
              📍 <strong>{state.il}</strong> — Türkiye genelinde <strong>{userIlRank}.</strong> sırada
              ({state.ilRanking.length} il arasında)
            </div>
          )}
        </div>
      )}

      {/* ── İl Sıralaması Tablosu ── */}
      {state.ilRanking.length > 0 && (
        <div className="hz-ranking-card">
          <h3>🏆 İl Verim Sıralaması — {state.urun} (2024, Kg/da)</h3>
          <div className="hz-ranking-table-wrap">
            <table className="hz-ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>İl</th>
                  <th>Verim</th>
                  <th>Grafik</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const topN = 10;
                  const maxV = state.ilRanking[0]?.verim ?? 1;
                  const userIdx = state.ilRanking.findIndex(r => r.il === state.il);
                  const showRows = state.ilRanking.slice(0, topN);
                  const userOutside = userIdx >= topN;
                  return (
                    <>
                      {showRows.map((r, i) => (
                        <tr key={r.il} className={r.il === state.il ? 'hz-ranking-row--highlight' : ''}>
                          <td className="hz-ranking-rank">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </td>
                          <td>{r.il} {r.il === state.il && '📍'}</td>
                          <td className="hz-ranking-verim">{r.verim.toFixed(0)}</td>
                          <td>
                            <div className="hz-ranking-bar">
                              <div style={{ width: `${(r.verim / maxV) * 100}%`, background: r.il === state.il ? '#f59e0b' : '#3b82f6' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {userOutside && (
                        <>
                          <tr className="hz-ranking-row--sep">
                            <td colSpan={4}>···</td>
                          </tr>
                          <tr className="hz-ranking-row--highlight">
                            <td className="hz-ranking-rank">{userIdx + 1}</td>
                            <td>{state.il} 📍</td>
                            <td className="hz-ranking-verim">{state.ilRanking[userIdx].verim.toFixed(0)}</td>
                            <td>
                              <div className="hz-ranking-bar">
                                <div style={{ width: `${(state.ilRanking[userIdx].verim / maxV) * 100}%`, background: '#f59e0b' }} />
                              </div>
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
          <p className="hz-chart-note">Toplam {state.ilRanking.length} il arasında {state.urun} verimi karşılaştırması</p>
        </div>
      )}

      {/* ── İklim Risk Skoru ── */}
      {climateRisk && (
        <div className="hz-climate-card">
          <h3>🌡️ İklim Risk Analizi — {state.il}</h3>
          <div className="hz-climate-header">
            <div className="hz-climate-score" style={{ borderColor: climateRisk.color }}>
              <span className="hz-climate-score__val">{climateRisk.skor}</span>
              <span className="hz-climate-score__max">/100</span>
            </div>
            <div className="hz-climate-label" style={{ color: climateRisk.color }}>
              {climateRisk.emoji} {climateRisk.label}
            </div>
          </div>
          <div className="hz-climate-factors">
            {climateRisk.faktorler.filter(f => f.puan > 0).map(f => (
              <div key={f.ad} className="hz-climate-factor">
                <div className="hz-climate-factor__head">
                  <span className="hz-climate-factor__name">{f.ad}</span>
                  <span className="hz-climate-factor__puan" style={{
                    color: f.puan >= 20 ? '#ef4444' : f.puan >= 12 ? '#f59e0b' : '#22c55e'
                  }}>
                    {f.puan}/25
                  </span>
                </div>
                <div className="hz-climate-factor__bar">
                  <div style={{
                    width: `${(f.puan / 25) * 100}%`,
                    background: f.puan >= 20 ? '#ef4444' : f.puan >= 12 ? '#f59e0b' : '#22c55e',
                  }} />
                </div>
                <span className="hz-climate-factor__desc">{f.aciklama}</span>
              </div>
            ))}
            {climateRisk.faktorler.filter(f => f.puan === 0).map(f => (
              <div key={f.ad} className="hz-climate-factor hz-climate-factor--info">
                <span>{f.aciklama}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Multi-crop Comparison Matrix ── */}
      {compareResults.length > 0 && (
        <div className="hz-multicrop-card">
          <h3>🔄 Ürün Karşılaştırma Matrisi</h3>
          <div className="hz-multicrop-table-wrap">
            <table className="hz-multicrop-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Verim (Kg/da)</th>
                  <th>Üretim (Ton)</th>
                  <th>Trend</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {/* Current crop first */}
                <tr className="hz-multicrop-table__current">
                  <td><strong>{state.urun}</strong> ⭐</td>
                  <td>{calc.adjVerim.toFixed(0)}</td>
                  <td>{calc.tahminiUretim.toFixed(1)}</td>
                  <td className={calc.trend >= 0 ? 'hz-trend--up' : 'hz-trend--down'}>
                    {calc.trend >= 0 ? '+' : ''}{calc.trend.toFixed(1)}%
                  </td>
                  <td>{calc.risk.emoji}</td>
                </tr>
                {compareResults.map(cr => cr.quick && (
                  <tr key={cr.urun}>
                    <td>{cr.urun}</td>
                    <td>{cr.quick.verim.toFixed(0)}</td>
                    <td>{cr.quick.uretim.toFixed(1)}</td>
                    <td className={cr.quick.trend >= 0 ? 'hz-trend--up' : 'hz-trend--down'}>
                      {cr.quick.trend >= 0 ? '+' : ''}{cr.quick.trend.toFixed(1)}%
                    </td>
                    <td>{cr.quick.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sowing + Harvest Calendar ── */}
      <div className="hz-calendar-card">
        <h3>📅 Tarım Takvimi — {state.urun}</h3>
        <div className="hz-cal-dual">
          {sowing && (
            <div className="hz-cal-section">
              <h4>🌱 Ekim Dönemi</h4>
              <div className="hz-cal-timeline">
                <div className="hz-cal-item">
                  <span className="hz-cal-label">Başlangıç</span>
                  <span className="hz-cal-value">{sowing.ekimAy}</span>
                </div>
                <div className="hz-cal-arrow">→</div>
                <div className="hz-cal-item">
                  <span className="hz-cal-label">Bitiş</span>
                  <span className="hz-cal-value">{sowing.ekimBitis}</span>
                </div>
              </div>
              <p className="hz-cal-note">🌱 {sowing.aciklama}</p>
            </div>
          )}
          {harvest && (
            <div className="hz-cal-section">
              <h4>🌾 Hasat Dönemi</h4>
              <div className="hz-cal-timeline">
                <div className="hz-cal-item">
                  <span className="hz-cal-label">Başlangıç</span>
                  <span className="hz-cal-value">{harvest.baslangic}</span>
                </div>
                <div className="hz-cal-arrow">→</div>
                <div className="hz-cal-item">
                  <span className="hz-cal-label">Bitiş</span>
                  <span className="hz-cal-value">{harvest.bitis}</span>
                </div>
              </div>
              <p className="hz-cal-note">ℹ️ {harvest.aciklama}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Forecast History ── */}
      {history.length > 0 && (
        <div className="hz-history-card">
          <div className="hz-history-header">
            <h3>📋 Geçmiş Tahminler</h3>
            <div className="hz-history-actions">
              <button type="button" className="hz-btn hz-btn--xs hz-btn--ghost"
                onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Gizle ▲' : `Göster (${history.length}) ▼`}
              </button>
              <button type="button" className="hz-btn hz-btn--xs hz-btn--ghost hz-btn--danger"
                onClick={() => { clearHistory(); setHistory([]); }}>
                🗑️ Temizle
              </button>
            </div>
          </div>
          {showHistory && (
            <div className="hz-history-list">
              {history.slice(0, 10).map(h => (
                <div key={h.id} className="hz-history-item">
                  <div className="hz-history-item__main">
                    <span className="hz-history-item__urun">{h.urun}</span>
                    <span className="hz-history-item__loc">{h.ilce}, {h.il}</span>
                  </div>
                  <div className="hz-history-item__stats">
                    <span>{h.tahminiUretim.toFixed(1)} ton</span>
                    <span>{h.projVerim.toFixed(0)} Kg/da</span>
                    <span>{h.alan} da</span>
                  </div>
                  <div className="hz-history-item__date">
                    {new Date(h.ts).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Model Disclaimer ──────────────────────────────────────── */}
      <div className="hz-card" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '2px solid #f59e0b' }}>
        <h3 style={{ color: '#92400e', margin: '0 0 8px 0', fontSize: '1rem' }}>⚠️ Tahmin Uyarısı</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <li>Bu sonuçlar <strong>istatistiksel bir tahmin modeline</strong> dayanmaktadır ve kesin verim garantisi değildir.</li>
          <li>Model, TÜİK il bazlı yıllık üretim istatistiklerinden lineer regresyon ile hesaplanmıştır.</li>
          <li>İklim düzeltmeleri il bazlı uzun yıl ortalamaları kullanılmıştır; canlı hava verileri yalnızca bilgi amaçlıdır.</li>
          <li>Gerçek verim; hava koşulları, hastalık, sulama, gübreleme, tohum kalitesi gibi faktörlere bağlıdır.</li>
          <li>Profesyonel tarımsal danışmanlık yerine geçmez — karar vermeden önce uzman görüşü alınız.</li>
        </ul>
      </div>

      <div className="hz-btn-row hz-btn-row--center">
        <button className="hz-btn hz-btn--secondary" onClick={() => setState(s => ({ ...s, step: 3 }))}>
          ← Arazi Bilgileri
        </button>
        <button className="hz-btn hz-btn--secondary" onClick={() => window.print()}>
          🖨️ Yazdır
        </button>
        <button className="hz-btn hz-btn--primary" onClick={reset}>🔄 Yeni Tahmin</button>
      </div>
    </div>
  );
}
