import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { ModelWarningBox } from '../../components/ModelWarningBox';
import { GUBRE_DATA_SOURCE, GUBRE_DATA_VERSION } from './gubreData';
import type { CalcResult, WizardState } from './gubreTypes';

interface Props {
  result: CalcResult;
  state: WizardState;
  onReset: () => void;
  confidenceScore: number;
}

export function GubreStep4({ result, state, onReset, confidenceScore }: Props) {
  return (
    <div className="gh-results">
      {/* Confidence Score + Model Warning */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <ConfidenceBadge score={confidenceScore} label="Reçete Güveni" />
          {confidenceScore < 60 && (
            <span style={{ fontSize: '0.8rem', color: '#b45309', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid #f59e0b' }}>
              ⚠️ Toprak analizini tam girerek güveni artırın
            </span>
          )}
        </div>
        <ModelWarningBox
          modelType="FAO besin ihtiyaç tabloları + greedy NPK optimizer"
          dataLevel={state.il ? `${state.il} ili — bölgesel toprak profili` : 'Genel değerler'}
          message="Bu çıktı bir ön reçete taslağıdır. Kesin gübreleme kararı için serbest toprak analizi yaptırınız ve yetkili ziraat mühendisiyle danışınız."
        />
      </div>

      {/* Scenario Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
          background: state.senaryo === 'tutucu' ? '#dbeafe' : state.senaryo === 'agresif' ? '#fef3c7' : '#d1fae5',
          color: state.senaryo === 'tutucu' ? '#1e40af' : state.senaryo === 'agresif' ? '#92400e' : '#065f46',
        }}>
          {state.senaryo === 'tutucu' ? '🛡️ Tutumlu Senaryo (-%20)' : state.senaryo === 'agresif' ? '🚀 Maksimum Senaryo (+%20)' : '⚖️ Standart Senaryo'}
        </span>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          Taslak gübre planı — profesyonel uygulama öncesi uzman görüşü alınız
        </span>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Veri: v{GUBRE_DATA_VERSION} · {GUBRE_DATA_SOURCE}
        </span>
      </div>

      {/* pH Warning */}
      {result.ph_uyari && <div className="gh-ph-warning">{result.ph_uyari}</div>}

      {/* NPK Chart */}
      <div className="gh-card">
        <h2 className="gh-card__title">📊 NPK Besin Dengesi</h2>
        <p className="gh-card__desc" style={{ marginBottom: '1rem' }}>
          {state.alan} dekar alan için — per-dekar değerler (kg/da)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'kg/da', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} kg/da`, name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ihtiyac" name="Toplam İhtiyaç"       fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="toprak"  name="Toprakta Mevcut"      fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="eksik"   name="Eksik (Gübrelenecek)" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* NPK Radar — Toprak Mevcut vs İhtiyaç Profili */}
      <div className="gh-card">
        <h2 className="gh-card__title">🕸️ N-P-K Besin Profili (Radar)</h2>
        <p className="gh-card__desc" style={{ marginBottom: '1rem', color: 'var(--gh-text-secondary, #6b7280)', fontSize: '0.9rem' }}>
          Bitkinin toplam ihtiyacı (mavi) ile toprakta mevcut besin düzeyi (yeşil) karşılaştırması — kg/da.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={result.chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--gh-text-primary, #111827)' }} />
            <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Radar name="Toplam İhtiyaç" dataKey="ihtiyac" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Radar name="Toprakta Mevcut" dataKey="toprak" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="Eksik (Gübrelenecek)" dataKey="eksik" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} kg/da`, name]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* PieChart — N/P/K Dağılımı */}
      {(() => {
        const pieData = [
          { name: 'Azot (N)', value: result.ihtiyac.n, color: '#3b82f6' },
          { name: 'Fosfor (P₂O₅)', value: result.ihtiyac.p2o5, color: '#10b981' },
          { name: 'Potasyum (K₂O)', value: result.ihtiyac.k2o, color: '#f59e0b' },
        ];
        const total = pieData.reduce((s, d) => s + d.value, 0);
        return (
          <div className="gh-card">
            <h2 className="gh-card__title">🥧 Makro Besin Dağılımı (N / P / K)</h2>
            <p className="gh-card__desc" style={{ marginBottom: '1rem', color: 'var(--gh-text-secondary, #6b7280)', fontSize: '0.9rem' }}>
              Toplam makro besin ihtiyacı içinde N, P₂O₅ ve K₂O'nun oransal dağılımı.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
              <ResponsiveContainer width={240} height={240}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={100}
                    label={({ name, value }) => `${name}: %${total > 0 ? ((value / total) * 100).toFixed(0) : 0}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)} kg/da`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--gh-text-primary, #111827)' }}>
                      <strong>{d.name}:</strong> {d.value.toFixed(1)} kg/da
                      {total > 0 && <span style={{ color: '#6b7280', marginLeft: 4 }}>(%{((d.value / total) * 100).toFixed(0)})</span>}
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
                  Toplam: {total.toFixed(1)} kg/da
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      <div className="gh-card">
        <h2 className="gh-card__title">🧪 Makro Besin İhtiyacı</h2>
        <div className="gh-summary-grid">
          <div className="gh-summary-item">
            <div className="gh-summary-label">Azot (N)</div>
            <div className="gh-summary-value">{result.eksik.n.toFixed(1)} <small>kg/da</small></div>
            <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.n * result.alan).toFixed(0)} kg</strong></div>
            <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.n.toFixed(1)} | Toprak: {(result.ihtiyac.n - result.eksik.n).toFixed(1)}</div>
          </div>
          <div className="gh-summary-item">
            <div className="gh-summary-label">Fosfor (P₂O₅)</div>
            <div className="gh-summary-value">{result.eksik.p2o5.toFixed(1)} <small>kg/da</small></div>
            <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.p2o5 * result.alan).toFixed(0)} kg</strong></div>
            <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.p2o5.toFixed(1)} | Toprak: {(result.ihtiyac.p2o5 - result.eksik.p2o5).toFixed(1)}</div>
          </div>
          <div className="gh-summary-item">
            <div className="gh-summary-label">Potasyum (K₂O)</div>
            <div className="gh-summary-value">{result.eksik.k2o.toFixed(1)} <small>kg/da</small></div>
            <div className="gh-summary-sub">Toplam: <strong>{(result.eksik.k2o * result.alan).toFixed(0)} kg</strong></div>
            <div className="gh-summary-hint">İhtiyaç: {result.ihtiyac.k2o.toFixed(1)} | Toprak: {(result.ihtiyac.k2o - result.eksik.k2o).toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Micro Nutrients */}
      <div className="gh-card">
        <h2 className="gh-card__title">🔬 Mikro Besin Elementleri (per dekar)</h2>
        <div className="gh-micro-result-grid">
          <div className="gh-micro-item">
            <span className="gh-micro-icon">🔩</span>
            <div>
              <div className="gh-micro-name">Demir (Fe)</div>
              <div className="gh-micro-val">{result.mikroIhtiyac.fe} kg/da</div>
              <div className="gh-micro-total">Toplam: {(result.mikroIhtiyac.fe * result.alan).toFixed(1)} kg</div>
            </div>
          </div>
          <div className="gh-micro-item">
            <span className="gh-micro-icon">⚡</span>
            <div>
              <div className="gh-micro-name">Çinko (Zn)</div>
              <div className="gh-micro-val">{result.mikroIhtiyac.zn} kg/da</div>
              <div className="gh-micro-total">Toplam: {(result.mikroIhtiyac.zn * result.alan).toFixed(1)} kg</div>
            </div>
          </div>
          <div className="gh-micro-item">
            <span className="gh-micro-icon">🔧</span>
            <div>
              <div className="gh-micro-name">Mangan (Mn)</div>
              <div className="gh-micro-val">{result.mikroIhtiyac.mn} kg/da</div>
              <div className="gh-micro-total">Toplam: {(result.mikroIhtiyac.mn * result.alan).toFixed(1)} kg</div>
            </div>
          </div>
          <div className="gh-micro-item">
            <span className="gh-micro-icon">💎</span>
            <div>
              <div className="gh-micro-name">Bor (B)</div>
              <div className="gh-micro-val">{result.mikroIhtiyac.b} kg/da</div>
              <div className="gh-micro-total">Toplam: {(result.mikroIhtiyac.b * result.alan).toFixed(1)} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kimyasal Fertilizer Table */}
      {(state.gubre_tipi === 'kimyasal' || state.gubre_tipi === 'her_ikisi') && (
        <div className="gh-card">
          <h2 className="gh-card__title">🧪 Kimyasal Gübre Önerisi ({state.alan} dekar)</h2>
          <div className="gh-fertilizer-table">
            <table>
              <thead>
                <tr><th>Gübre Adı</th><th>Per Dekar</th><th>Toplam ({state.alan} da)</th><th>Maliyet</th></tr>
              </thead>
              <tbody>
                {result.oneriler.kimyasal.map((item, i) => (
                  <tr key={i}>
                    <td>{item.urun}</td>
                    <td>{item.miktar} kg</td>
                    <td><strong>{(item.miktar * result.alan).toLocaleString()} kg</strong></td>
                    <td>₺{(item.fiyat * result.alan).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="gh-fertilizer-total">
                  <td><strong>TOPLAM</strong></td><td></td><td></td>
                  <td><strong>₺{result.toplam_maliyet_kimyasal.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organik Fertilizer Table */}
      {(state.gubre_tipi === 'organik' || state.gubre_tipi === 'her_ikisi') && (
        <div className="gh-card">
          <h2 className="gh-card__title">🌿 Organik Gübre Önerisi ({state.alan} dekar)</h2>
          <div className="gh-fertilizer-table">
            <table>
              <thead>
                <tr><th>Gübre Adı</th><th>Per Dekar</th><th>Toplam ({state.alan} da)</th><th>Maliyet</th></tr>
              </thead>
              <tbody>
                {result.oneriler.organik.map((item, i) => (
                  <tr key={i}>
                    <td>{item.urun}</td>
                    <td>{item.miktar} kg</td>
                    <td><strong>{(item.miktar * result.alan).toLocaleString()} kg</strong></td>
                    <td>₺{(item.fiyat * result.alan).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="gh-fertilizer-total">
                  <td><strong>TOPLAM</strong></td><td></td><td></td>
                  <td><strong>₺{result.toplam_maliyet_organik.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Comparison */}
      {state.gubre_tipi === 'her_ikisi' && (
        <div className="gh-card gh-comparison">
          <h3>⚖️ Maliyet Karşılaştırması ({state.alan} dekar)</h3>
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
        <h2 className="gh-card__title">📅 Uygulama Takvimi (kg/dekar)</h2>
        <div className="gh-schedule-table">
          <table>
            <thead>
              <tr><th>Dönem</th><th>Hafta</th><th>N (kg)</th><th>P₂O₅ (kg)</th><th>K₂O (kg)</th><th>Notlar</th></tr>
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

      {/* Price Disclaimer */}
      <div className="gh-card" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #f59e0b' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
          ⚠️ <strong>Fiyat Uyarısı (Ocak 2025 güncellemesi):</strong> Gübre fiyatları 2024 yılı ortalamalarına dayalı <strong>tahmini</strong> değerlerdir.
          Enflasyon, kur ve mevsimsel dalgalanmalar nedeniyle güncel piyasa fiyatları %20-40 farklılık gösterebilir.
          Satın alma kararı öncesi mutlaka yerel bayinizden güncel fiyat alınız.
          Bu hesaplama bir <strong>taslak plan</strong> niteliğindedir; profesyonel bir gübreleme tavsiyesi yerine geçmez.
        </p>
      </div>

      <div className="gh-btn-row gh-btn-row--center">
        <button className="gh-btn gh-btn--secondary" onClick={onReset}>🔄 Yeni Hesaplama</button>
        <button className="gh-btn gh-btn--primary" onClick={() => window.print()}>🖨️ Yazdır</button>
      </div>
    </div>
  );
}
