import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  RadialBarChart, RadialBar,
  AreaChart, Area,
  ComposedChart, Line,
} from 'recharts';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { ModelWarningBox } from '../../components/ModelWarningBox';
import {
  SOIL_TYPES, IRRIGATION_SYSTEMS,
  ETO_METOD_LISTESI, BOLGE_META, donRiskiVar,
  type WizardState, type CalcResult, type CropWaterData,
} from './sulamaUtils';
import type { ForecastSummary } from '../../services/weather';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  calc: CalcResult;
  cropData: CropWaterData;
  bolge: string | null;
  forecast: ForecastSummary | null;
  wxStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
  reset: () => void;
}

export function ResultsView({ state, setState, calc, cropData, bolge, forecast, wxStatus, reset }: Props) {
  const bolgeMeta = bolge ? BOLGE_META[bolge as keyof typeof BOLGE_META] : null;

  return (
    <div className="sp-results">

      {/* ── Model Şeffaflık ve Güven Skoru ─────────────────────────── */}
      {(() => {
        const etoMetod = ETO_METOD_LISTESI.find(m => m.id === state.etoYontemi);
        let conf = 30;
        if (etoMetod?.gercekFormul) conf += 30;
        if (wxStatus === 'ready' && forecast) conf += 15;
        const donRisk = donRiskiVar((bolge ?? 'ic_anadolu') as keyof typeof BOLGE_META, new Date().getMonth() + 1);
        const bolgeLabel = BOLGE_META[(bolge ?? 'ic_anadolu') as keyof typeof BOLGE_META]?.ad ?? '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ConfidenceBadge score={Math.min(100, conf)} label="Hesap Güveni" />
              {donRisk && (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '3px 10px', borderRadius: 999, border: '1px solid #fca5a5' }}>
                  ❄️ Bu ay bölgede don riski var
                </span>
              )}
              {wxStatus !== 'ready' && (
                <span style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid #f59e0b' }}>
                  ⚠️ Hava tahmini yok — günlük plan statik
                </span>
              )}
            </div>
            <ModelWarningBox
              modelType={`Su dengesi modeli — ETo: ${etoMetod?.label ?? state.etoYontemi}`}
              dataLevel={`${state.il}, ${bolgeLabel} bölgesi — uzun yıl iklim ortalaması`}
              message="Hesaplamalar uzun yıl iklim tablosu ve seçilen ETo yöntemine dayanır. Gerçek toprak nem sensörü veya istasyon verisi kullanılmamaktadır. Kesin sulama kararları için tarla ölçümü alınız."
            />
          </div>
        );
      })()}

      <div className="sp-card">
        <h3 style={{ margin: '0 0 10px 0' }}>⚙️ Gelişmiş Özet</h3>
        <div className="sp-params">
          <span>🧮 ETo: {calc.etoYontemiLabel}</span>
          <span>🌤️ Senaryo: {calc.iklimSenaryosuLabel}</span>
          <span>🌿 Kc: {calc.kcModeliLabel}</span>
          <span>🎯 Karşılama: %{state.sulamaKarsilamaPct}</span>
          <span>🌱 Kök: {state.kokDerinligiM.toFixed(2)} m</span>
          <span>🌧️ Tahmin: {wxStatus === 'ready' && forecast ? 'Var' : wxStatus === 'unavailable' ? 'API anahtarı yok' : 'Yok'}</span>
          {calc.parMol != null && <span>☀️ PAR: {calc.parMol.toFixed(1)} mol/m²/gün</span>}
        </div>
        {calc.ilkSulama && !calc.sulamaYok && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <strong>İlk sulama önerisi:</strong> {calc.ilkSulama.date} — Net {calc.ilkSulama.netMm.toFixed(1)} mm (Brüt {calc.ilkSulama.brutMm.toFixed(1)} mm)
            <span style={{ color: '#6b7280' }}> — {calc.ilkSulama.reason}</span>
          </div>
        )}
      </div>

      <div className="sp-card">
        <h3 style={{ margin: '0 0 10px 0' }}>🌾 Stres & Verim</h3>
        <div className="sp-kpi-grid">
          <div className="sp-kpi" style={{ borderColor: '#f59e0b' }}>
            <div className="sp-kpi__label">Sezon Stres Oranı</div>
            <div className="sp-kpi__value" style={{ color: '#f59e0b' }}>%{(calc.sezonStresOrani * 100).toFixed(0)}</div>
            <div className="sp-kpi__unit">(defisit / talep)</div>
          </div>
          <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
            <div className="sp-kpi__label">Tahmini Verim Kaybı</div>
            <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>-%{calc.verimKaybiPct.toFixed(0)}</div>
            <div className="sp-kpi__unit">Ky (yaklaşık)</div>
          </div>
          <div className="sp-kpi">
            <div className="sp-kpi__label">Su Açığı (mm)</div>
            <div className="sp-kpi__value">{calc.waterDeficit.toFixed(0)}</div>
            <div className="sp-kpi__unit">mm/sezon</div>
          </div>
        </div>
        <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
          Verim kaybı, dönem bazlı Ky çarpanları ile su stresi oranının ağırlıklı toplamından hesaplanır (resmî kalibrasyon değildir).
        </p>
      </div>

      {forecast && (
        <div className="sp-card">
          <h3 style={{ margin: '0 0 10px 0' }}>🌧️ Yağış Tahmini (OpenWeather)</h3>
          <div className="sp-kpi-grid">
            <div className="sp-kpi">
              <div className="sp-kpi__label">24 saat</div>
              <div className="sp-kpi__value">{forecast.next24hRainMm.toFixed(1)}</div>
              <div className="sp-kpi__unit">mm</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi__label">48 saat</div>
              <div className="sp-kpi__value">{forecast.next48hRainMm.toFixed(1)}</div>
              <div className="sp-kpi__unit">mm</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi__label">5 gün</div>
              <div className="sp-kpi__value">{forecast.next5dRainMm.toFixed(1)}</div>
              <div className="sp-kpi__unit">mm</div>
            </div>
          </div>
          <div className="sp-table-wrap" style={{ marginTop: 12 }}>
            <table className="sp-detail-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Yağış (mm)</th>
                  <th>Min/Max (°C)</th>
                </tr>
              </thead>
              <tbody>
                {forecast.daily.map(d => (
                  <tr key={d.date}>
                    <td><strong>{d.date}</strong></td>
                    <td>{d.rainMm.toFixed(1)}</td>
                    <td>{d.tempMin.toFixed(0)} / {d.tempMax.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
            Tahmin verisi, günlük plan ekranında yağışa göre sulama ertelemesi için kullanılır.
          </p>
        </div>
      )}

      {/* Water Deficit Warning for "Sulama Yok" */}
      {calc.sulamaYok && (
        <div className="sp-card" style={{ border: '2px solid #e74c3c', background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)' }}>
          <h3 style={{ color: '#c53030', margin: '0 0 12px 0' }}>🚫 Su Açığı Analizi — Sulama Sistemsiz</h3>
          <p style={{ color: '#742a2a', marginBottom: 16 }}>
            Sulama sistemi seçilmediği için aşağıda bitkinin <strong>karşılanamayan su ihtiyacı</strong> gösterilmektedir.
            Bu, yalnızca yağış ile karşılanamayan miktardır.
          </p>
          <div className="sp-kpi-grid">
            <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
              <div className="sp-kpi__label">Sezonluk Su Açığı</div>
              <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>{(calc.waterDeficit * state.alan).toFixed(0)}</div>
              <div className="sp-kpi__unit">m³ (toplam)</div>
            </div>
            <div className="sp-kpi" style={{ borderColor: '#e74c3c' }}>
              <div className="sp-kpi__label">Açık (mm/sezon)</div>
              <div className="sp-kpi__value" style={{ color: '#e74c3c' }}>{calc.waterDeficit.toFixed(0)}</div>
              <div className="sp-kpi__unit">mm</div>
            </div>
            <div className="sp-kpi" style={{ borderColor: '#f59e0b' }}>
              <div className="sp-kpi__label">Tahmini Verim Kaybı</div>
              <div className="sp-kpi__value" style={{ color: '#f59e0b' }}>-%{calc.verimKaybiPct.toFixed(0)}</div>
              <div className="sp-kpi__unit">sulamasız</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #f59e0b' }}>
            <strong>💡 Öneri:</strong> Bu ürün için en az <strong>damla sulama</strong> sistemi kurulması önerilir.
            Damla sulama ile su kullanımı azalır ve verim artışı mümkün olabilir (ürün ve yönetim koşullarına bağlı).
            Tahmini kurulum maliyeti: {(IRRIGATION_SYSTEMS['damla'].maliyet_kurulum * state.alan).toLocaleString('tr-TR')} ₺
          </div>
        </div>
      )}

      {/* KPI Grid — only when irrigation system is selected */}
      {!calc.sulamaYok && (
      <div className="sp-kpi-grid">
        <div className="sp-kpi sp-kpi--main">
          <div className="sp-kpi__label">Sezonluk Su İhtiyacı</div>
          <div className="sp-kpi__value">{calc.sezonlukSu >= 1000 ? (calc.sezonlukSu / 1000).toFixed(1) + 'k' : calc.sezonlukSu.toFixed(0)}</div>
          <div className="sp-kpi__unit">m³/sezon</div>
        </div>
        <div className="sp-kpi">
          <div className="sp-kpi__label">Ort. Günlük</div>
          <div className="sp-kpi__value">{calc.gunlukSu.toFixed(1)}</div>
          <div className="sp-kpi__unit">mm/gün</div>
        </div>
        <div className="sp-kpi">
          <div className="sp-kpi__label">Haftalık</div>
          <div className="sp-kpi__value">{calc.haftalikSu.toFixed(0)}</div>
          <div className="sp-kpi__unit">m³/hafta</div>
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
      )}

      {/* Monthly Water Balance Chart */}
      <div className="sp-chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>📊 Aylık Su Dengesi — {state.il}</h3>
          <ChartInsightButton title="📊 Aylık Su Dengesi" description="Aylık su dengesi analizi" data={calc.aylikDenge} context={{ section: 'Sulama Hesap' }} compact />
        </div>
        <p className="sp-chart-desc">
          {bolgeMeta && <span style={{ marginRight: 8 }}>{bolgeMeta.emoji} {bolgeMeta.ad}</span>}
          İl bazlı uzun yıl iklim istatistikleriyle hesaplanmıştır (statik veri tablosu, canlı MGM verisi değildir). ETo: <strong>{calc.etoYontemiLabel}</strong>, Senaryo: <strong>{calc.iklimSenaryosuLabel}</strong>, Kc: <strong>{calc.kcModeliLabel}</strong>.
          {calc.sulamaYok && <span style={{ color: '#e74c3c', fontWeight: 600, marginLeft: 8 }}>
            (Sulama sistemi yok — Brüt Sulama kolonu karşılanamayan su açığını gösterir)
          </span>}
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={calc.aylikDenge} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => `${v}`} tick={{ fontSize: 11 }} label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip
              formatter={(value: number, name: string) => [`${value.toFixed(1)} mm`, name]}
              labelFormatter={(label: string) => `📅 ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="etc" name="ETc (Bitki Su Tük.)" fill="#e67e22" radius={[3, 3, 0, 0]} />
            <Bar dataKey="efektifYagis" name="Efektif Yağış" fill="#3498db" radius={[3, 3, 0, 0]} />
            <Bar dataKey="brutSulama" name="Brüt Sulama" fill="#e74c3c" radius={[3, 3, 0, 0]} />
            <ReferenceLine y={0} stroke="#666" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Su Karşılama Oranı Göstergesi ──────────────────────────────────── */}
      {(() => {
        const karsilama = Math.round(Math.max(0, Math.min(100, (1 - calc.sezonStresOrani) * 100)));
        const color = karsilama > 75 ? '#10b981' : karsilama > 50 ? '#f59e0b' : '#ef4444';
        const gaugeData = [{ name: 'Su Karşılama', value: karsilama, fill: color }];
        return (
          <div className="sp-chart-card">
            <h3>💧 Su Karşılama Oranı Göstergesi</h3>
            <p className="sp-chart-desc">
              Sezonluk efektif sulama ve yağışın bitki ETc talebini karşılama yüzdesi.
              {karsilama > 75 ? ' ✅ İyi düzey' : karsilama > 50 ? ' ⚠️ Orta düzey' : ' 🚨 Düşük düzey'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', flexWrap: 'wrap', padding: '8px 0' }}>
              <div style={{ position: 'relative', width: 220, height: 140 }}>
                <RadialBarChart
                  width={220} height={140}
                  cx="50%" cy="100%"
                  innerRadius="65%" outerRadius="100%"
                  startAngle={180} endAngle={0}
                  data={gaugeData}
                >
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
                </RadialBarChart>
                <div style={{
                  position: 'absolute', bottom: 4, left: 0, width: '100%',
                  textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, color,
                }}>
                  %{karsilama}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <strong>Sezon Stres Oranı:</strong> %{(calc.sezonStresOrani * 100).toFixed(0)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <strong>Su Açığı:</strong> {calc.waterDeficit.toFixed(0)} mm/sezon
                </div>
                <div style={{ fontSize: '0.9rem', color }}>
                  <strong>{karsilama > 75 ? 'Yeterli sulama' : karsilama > 50 ? 'Kısmi stres riski' : 'Yüksek stres riski'}</strong>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Aylık Yağış & ETo Alan Grafiği ──────────────────────────────────── */}
      <div className="sp-chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>🌧️ Aylık Yağış &amp; ETo — Alan Grafiği</h3>
          <ChartInsightButton title="🌧️ Yağış &amp; ETo" description="Aylık yağış ve ETo alan grafiği" data={calc.aylikDenge} context={{ section: 'Sulama Hesap' }} compact />
        </div>
        <p className="sp-chart-desc">
          Toplam yağış (mavi) ve efektif yağış (açık mavi) ile referans evapotranspirasyon (ETo) trendleri.
          Alan farkı sulama ihtiyacının yoğunluğunu gösterir.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={calc.aylikDenge} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradYagis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradEfektif" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gradEto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} mm`, name]} labelFormatter={(l: string) => `📅 ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="yagis" name="Toplam Yağış" stroke="#3b82f6" fill="url(#gradYagis)" strokeWidth={2} />
            <Area type="monotone" dataKey="efektifYagis" name="Efektif Yağış" stroke="#0ea5e9" fill="url(#gradEfektif)" strokeWidth={2} />
            <Area type="monotone" dataKey="eto" name="ETo (Ref. Evapotrans.)" stroke="#f59e0b" fill="url(#gradEto)" strokeWidth={2} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── ETc vs Sulama Bileşik Grafik ─────────────────────────────────────── */}
      <div className="sp-chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ marginBottom: 0 }}>🌿 Bitki Su İhtiyacı (ETc) vs Sulama — Bileşik Grafik</h3>
          <ChartInsightButton title="🌿 ETc vs Sulama" description="Bitki su ihtiyacı ve sulama karşılaşması" data={calc.aylikDenge} context={{ section: 'Sulama Hesap' }} compact />
        </div>
        <p className="sp-chart-desc">
          Aylık ETc (bar) ile brüt sulama miktarı (bar) ve ETo trendi (çizgi) karşılaştırması.
          İki barın farkı, yağışla karşılanan su miktarını yansıtır.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={calc.aylikDenge} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} mm`, name]} labelFormatter={(l: string) => `📅 ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="etc" name="ETc (Bitki Su Tüketimi)" fill="#e67e22" radius={[3, 3, 0, 0]} />
            <Bar dataKey="brutSulama" name="Brüt Sulama" fill="#e74c3c" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="eto" name="ETo Trend" stroke="#6366f1" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="sp-table-card">
        <h3>📋 Aylık Detay Tablosu</h3>
        <div className="sp-table-wrap">
          <table className="sp-detail-table">
            <thead>
              <tr>
                <th>Ay</th>
                <th>ETo (mm)</th>
                <th>ETc (mm)</th>
                <th>Yağış (mm)</th>
                <th>Ef. Yağış (mm)</th>
                <th>Net Sul. (mm)</th>
                <th>Brüt Sul. (mm)</th>
              </tr>
            </thead>
            <tbody>
              {calc.aylikDenge.map(m => (
                <tr key={m.ayNo} className={m.brutSulama > 50 ? 'sp-row--critical' : ''}>
                  <td><strong>{m.ay}</strong></td>
                  <td>{m.eto}</td>
                  <td>{m.etc}</td>
                  <td>{m.yagis}</td>
                  <td>{m.efektifYagis}</td>
                  <td>{m.netSulama}</td>
                  <td style={{ fontWeight: m.brutSulama > 0 ? 700 : 400, color: m.brutSulama > 50 ? 'var(--sp-danger, #e74c3c)' : 'inherit' }}>
                    {m.brutSulama}
                  </td>
                </tr>
              ))}
              <tr className="sp-row--total">
                <td><strong>TOPLAM</strong></td>
                <td>{calc.aylikDenge.reduce((s, m) => s + m.eto, 0).toFixed(0)}</td>
                <td>{calc.aylikDenge.reduce((s, m) => s + m.etc, 0).toFixed(0)}</td>
                <td>{calc.aylikDenge.reduce((s, m) => s + m.yagis, 0).toFixed(0)}</td>
                <td>{calc.aylikDenge.reduce((s, m) => s + m.efektifYagis, 0).toFixed(0)}</td>
                <td>{calc.aylikDenge.reduce((s, m) => s + m.netSulama, 0).toFixed(0)}</td>
                <td><strong>{calc.aylikDenge.reduce((s, m) => s + m.brutSulama, 0).toFixed(0)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Analysis */}
      {!calc.sulamaYok && (
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
        <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#92400e', background: '#fffbeb', padding: '8px 12px', borderRadius: 6, border: '1px solid #f59e0b' }}>
          ⚠️ <strong>Hesaplama Uyarısı:</strong> Fiyatlar 2024 ortalamasıdır; gerçek maliyetler bölge ve tarifeye göre değişir. Su ihtiyacı hesaplamaları il bazlı uzun yıl iklim ortalamalarına dayanır; canlı hava verileri kullanılmamaktadır.
        </p>
      </div>
      )}

      {/* Benefits */}
      {!calc.sulamaYok && calc.verimArtisi > 0 && (
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

      <div className="sp-table-card">
        <h3>📅 Günlük Plan (14 gün)</h3>
        <div className="sp-table-wrap">
          <table className="sp-detail-table">
            <thead>
              <tr>
                <th>Gün</th>
                <th>ETo</th>
                <th>ETc</th>
                <th>Yağış</th>
                <th>Net</th>
                <th>Brüt</th>
                <th>Açık</th>
                {state.fertigasyon && <th>N/P/K</th>}
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {calc.gunlukPlan.map(d => (
                <tr key={d.date}>
                  <td><strong>{d.label}</strong></td>
                  <td>{d.eto.toFixed(1)}</td>
                  <td>{d.etc.toFixed(1)}</td>
                  <td>{d.yagisTahmin.toFixed(1)}</td>
                  <td>{d.sulamaNet.toFixed(1)}</td>
                  <td>{d.sulamaBrut.toFixed(1)}</td>
                  <td style={{ fontWeight: d.toprakAcigi >= 50 ? 700 : 400 }}>{d.toprakAcigi.toFixed(1)}</td>
                  {state.fertigasyon && (
                    <td>
                      {d.fertN_kgDa != null ? `${d.fertN_kgDa.toFixed(1)}/${(d.fertP2O5_kgDa ?? 0).toFixed(1)}/${(d.fertK2O_kgDa ?? 0).toFixed(1)}` : '—'}
                    </td>
                  )}
                  <td style={{ color: '#6b7280' }}>{d.not || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#6b7280' }}>
          Açık (mm), kök derinliği ve toprak tipine göre hesaplanan RAW eşiğine yaklaştıkça sulama önerilir.
        </p>
      </div>

      {calc.toprakKatmanlari && (
        <div className="sp-table-card">
          <h3>🪨 Toprak Katman Profili (Yaklaşık)</h3>
          <div className="sp-table-wrap">
            <table className="sp-detail-table">
              <thead>
                <tr>
                  <th>Katman</th>
                  <th>Derinlik</th>
                  <th>Su Tutma</th>
                </tr>
              </thead>
              <tbody>
                {calc.toprakKatmanlari.map(k => (
                  <tr key={k.katman}>
                    <td><strong>{k.katman}</strong></td>
                    <td>{k.derinlikCm} cm</td>
                    <td>{k.suTutmaMm} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Irrigation Schedule */}
      {!calc.sulamaYok && (
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
      )}

      {/* Parameters */}
      <div className="sp-params-card">
        <h3>Hesaplama Parametreleri</h3>
        <div className="sp-params">
          <span>📍 {state.il}{bolgeMeta ? ` (${bolgeMeta.emoji} ${bolgeMeta.ad})` : ''}</span>
          <span>🌾 {state.urun}</span>
          <span>📐 {state.alan.toLocaleString('tr-TR')} da</span>
          <span>🪨 Toprak: {SOIL_TYPES[state.toprakTipi].tip}</span>
          <span>💧 Sistem: {IRRIGATION_SYSTEMS[state.sulamaSistemi].tip}</span>
          <span>📊 Dönem: {cropData.donem[state.gelismeDonemi]}</span>
          <span>🧮 ETo: {calc.etoYontemiLabel}</span>
          <span>🌤️ Senaryo: {calc.iklimSenaryosuLabel}</span>
          <span>🌿 Kc: {calc.kcModeliLabel}</span>
          <span>🎯 Karşılama: %{state.sulamaKarsilamaPct}</span>
        </div>
      </div>

      <div className="sp-btn-row sp-btn-row--center">
        <button className="sp-btn sp-btn--secondary" onClick={() => setState(s => ({ ...s, step: 3 }))}>← Sistem Bilgileri</button>
        <button className="sp-btn sp-btn--secondary" onClick={() => window.print()}>🖨️ Yazdır</button>
        <button className="sp-btn sp-btn--primary" onClick={reset}>🔄 Yeni Plan</button>
      </div>
    </div>
  );
}
