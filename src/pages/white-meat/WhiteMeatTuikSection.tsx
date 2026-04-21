import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikTab, TuikChickenData, MonthlyData } from './whiteMeatUtils';
import { formatTon, formatShort } from './whiteMeatUtils';

type Props = {
  tuikData: TuikChickenData[];
  activeTuikTab: TuikTab;
  setActiveTuikTab: (v: TuikTab) => void;
  monthlySlaughter: MonthlyData[];
  monthlyMeat: MonthlyData[];
};

export default function WhiteMeatTuikSection({ tuikData, activeTuikTab, setActiveTuikTab, monthlySlaughter, monthlyMeat }: Props) {
  if (tuikData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '60px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          🐔 TÜİK Kümes Hayvancılığı Verileri
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Yıllık kesim sayıları, et üretimi ve kuluçkadan üretime detaylı analizler
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap',
        padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
      }}>
        {([
          { key: 'overview' as const, icon: '📊', label: 'Genel Bakış' },
          { key: 'production' as const, icon: '📈', label: 'Üretim Trendi' },
          { key: 'hatch' as const, icon: '🥚', label: 'Kuluçka Analizi' },
          { key: 'projection' as const, icon: '🔮', label: 'Projeksiyon' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTuikTab(tab.key)}
            style={{
              padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)',
              background: activeTuikTab === tab.key ? 'var(--primary)' : 'var(--bg-primary)',
              color: activeTuikTab === tab.key ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* GENEL BAKIŞ */}
      {activeTuikTab === 'overview' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">KESİLEN TAVUK (2025)</span>
                <div className="kpi-icon orange">🐔</div>
              </div>
              <div className="kpi-value">{formatShort(tuikData[0]?.slaughtered * 1000)} adet</div>
              <div className="kpi-subtitle">{tuikData[0]?.slaughtered.toLocaleString('tr-TR')} bin adet</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">TAVUK ETİ ÜRETİMİ</span>
                <div className="kpi-icon red">🥩</div>
              </div>
              <div className="kpi-value">{formatTon(tuikData[0]?.meatProduction)}</div>
              <div className="kpi-subtitle">2025 yılı</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">KULUÇKA BAŞARI ORANI</span>
                <div className="kpi-icon green">🥚</div>
              </div>
              <div className="kpi-value" style={{ color: '#22c55e' }}>%{tuikData[0]?.hatchRate.toFixed(1)}</div>
              <div className="kpi-subtitle">Civiv çıkma oranı</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">VERİM (KG/BAŞ)</span>
                <div className="kpi-icon blue">📊</div>
              </div>
              <div className="kpi-value">{tuikData[0]?.yieldPerBird.toFixed(2)} kg</div>
              <div className="kpi-subtitle">Tavuk başına et verimi</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📊 Kesilen Tavuk vs Et Üretimi (2010-2025)</h3>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={tuikData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v * 1000)} label={{ value: 'Kesilen Tavuk (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} label={{ value: 'Et Üretimi (ton)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="slaughtered" name="Kesilen Tavuk (bin adet)" fill="#f97316" opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="meatProduction" name="Et Üretimi (ton)" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Üretim Akışı */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">🔄 Üretim Akışı: Kuluçkadan Kesime (2025)</h3>
              <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                {[
                  { icon: '🥚', value: tuikData[0]?.hatchedEggs || 0, label: 'Kuluçkaya Basılan\nYumurta (bin adet)', color: '#f59e0b' },
                  { icon: '🐣', value: tuikData[0]?.producedChicks || 0, label: 'Üretilen Civiv\n(bin adet)', color: '#22c55e' },
                  { icon: '🐔', value: tuikData[0]?.slaughtered || 0, label: 'Kesilen Tavuk\n(bin adet)', color: '#f97316' },
                  { icon: '🥩', value: tuikData[0]?.meatProduction || 0, label: 'Et Üretimi\n(ton)', color: '#ef4444' },
                ].map((item, idx, arr) => (
                  <div key={idx} style={{ display: 'contents' }}>
                    <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{item.icon}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: item.color }}>{item.value.toLocaleString('tr-TR')}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'pre-line' }}>{item.label}</div>
                    </div>
                    {idx < arr.length - 1 && <div style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>→</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Özet İstatistikler */}
          <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>📊 Özet İstatistikler (2010-2025)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Toplam Kesilen (16 yıl)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{formatShort(tuikData.reduce((sum, d) => sum + d.slaughtered, 0) * 1000)} adet</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Toplam Et (16 yıl)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{formatTon(tuikData.reduce((sum, d) => sum + d.meatProduction, 0))}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ort. Kuluçka Başarısı</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#22c55e' }}>%{(tuikData.reduce((sum, d) => sum + d.hatchRate, 0) / tuikData.length).toFixed(1)}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ort. Et Verimi</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#3b82f6' }}>{(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(3)} kg/baş</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Yıllık Ort. Büyüme</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981' }}>
                  %{(() => {
                    const first = tuikData[tuikData.length - 1]?.slaughtered || 1;
                    const last = tuikData[0]?.slaughtered || 1;
                    const years = tuikData.length - 1;
                    return ((Math.pow(last / first, 1 / years) - 1) * 100).toFixed(2);
                  })()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ÜRETİM TRENDİ */}
      {activeTuikTab === 'production' && (
        <>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📈 Kesilen Tavuk Sayısı (2010-2025)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={tuikData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v * 1000)} />
                  <Tooltip formatter={(value: number) => [`${(value * 1000).toLocaleString('tr-TR')} adet`, 'Kesilen Tavuk']} labelFormatter={(label) => `Yıl: ${label}`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="slaughtered" stroke="#f97316" fill="#f97316" fillOpacity={0.3} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">🥩 Tavuk Eti Üretimi (2010-2025)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={tuikData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ton`, 'Et Üretimi']} labelFormatter={(label) => `Yıl: ${label}`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="meatProduction" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {monthlySlaughter.length > 0 && monthlyMeat.length > 0 && (
            <>
              <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>📅 Aylık Üretim Dağılımı (2025)</h2>
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">📊 Aylık Kesilen Tavuk</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlySlaughter}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString('tr-TR')} adet`, 'Kesilen']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">🥩 Aylık Tavuk Eti Üretimi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyMeat}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString('tr-TR')} ton`, 'Üretim']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* KULUÇKA ANALİZİ */}
      {activeTuikTab === 'hatch' && (
        <>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🐣 Kuluçka Başarı Oranı Trendi</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={tuikData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={[60, 100]} />
                  <Tooltip formatter={(value: number) => [`%${value.toFixed(2)}`, 'Başarı Oranı']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="hatchRate" name="Kuluçka Başarı Oranı (%)" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">📊 Tavuk Başına Et Verimi (kg/baş)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={tuikData.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={[0, 3]} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(3)} kg/baş`, 'Verim']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="yieldPerBird" name="Et Verimi" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {tuikData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detaylı Kuluçka Akışı */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">🔄 Detaylı Kuluçka Akışı (2025)</h3>
              <div style={{ padding: '40px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '30px' }}>
                  <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🥚</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>Kuluçkaya Basılan Yumurta</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>(bin adet)</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '8px' }}>↓</div>
                    <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '20px', color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>
                      %{tuikData[0]?.hatchRate.toFixed(1)} Başarı
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🐣</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>{(tuikData[0]?.producedChicks || 0).toLocaleString('tr-TR')}</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>Üretilen Civiv</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>(bin adet)</div>
                  </div>
                </div>

                <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '40px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '30px' }}>
                  <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🐔</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f97316' }}>{(tuikData[0]?.slaughtered || 0).toLocaleString('tr-TR')}</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>Kesilen Tavuk</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>(bin adet)</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '8px' }}>↓</div>
                    <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '20px', color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>
                      {tuikData[0]?.yieldPerBird.toFixed(2)} kg/baş
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🥩</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{(tuikData[0]?.meatProduction || 0).toLocaleString('tr-TR')}</div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '600' }}>Et Üretimi</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>(ton)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PROJEKSİYON */}
      {activeTuikTab === 'projection' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>📊 2026 Tahmini Kesilen Tavuk</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f97316', marginBottom: '8px' }}>
                {(() => {
                  const lastYear = tuikData[0]?.slaughtered || 0;
                  const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                  const years = tuikData.length - 1;
                  const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                  return ((lastYear * (1 + growthRate)) * 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
                })()} adet
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CAGR bazlı projeksiyon</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>🥩 2026 Tahmini Et Üretimi</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                {(() => {
                  const lastYear = tuikData[0]?.meatProduction || 0;
                  const firstYear = tuikData[tuikData.length - 1]?.meatProduction || 1;
                  const years = tuikData.length - 1;
                  const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                  return (lastYear * (1 + growthRate)).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
                })()} ton
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CAGR bazlı projeksiyon</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>📈 Yıllık Büyüme Oranı</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                %{(() => {
                  const lastYear = tuikData[0]?.slaughtered || 0;
                  const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                  const years = tuikData.length - 1;
                  return ((Math.pow(lastYear / firstYear, 1 / years) - 1) * 100).toFixed(2);
                })()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tuikData.length} yıllık CAGR</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>🔮 Projeksiyon Metodu</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>CAGR Model</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bileşik yıllık büyüme oranı</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📈 Kesilen Tavuk Projeksiyon (Aylık 2025-2026)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={(() => {
                  if (!monthlySlaughter || monthlySlaughter.length === 0) return [];
                  const lastYear = tuikData[0]?.slaughtered || 0;
                  const firstYear = tuikData[tuikData.length - 1]?.slaughtered || 1;
                  const years = tuikData.length - 1;
                  const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                  const monthlyGrowth = Math.pow(1 + growthRate, 1 / 12) - 1;
                  const data2025 = monthlySlaughter.map((m) => ({ month: `2025-${m.month}`, actual: m.value, projected: null as number | null }));
                  const avgMonthly = monthlySlaughter.reduce((sum, m) => sum + m.value, 0) / monthlySlaughter.length;
                  const data2026 = monthlySlaughter.map((m, i) => ({ month: `2026-${m.month}`, actual: null as number | null, projected: avgMonthly * Math.pow(1 + monthlyGrowth, i + 12) }));
                  return [...data2025, ...data2026];
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={90} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <Tooltip formatter={(value) => { if (value === null || value === undefined) return ['', '']; return [`${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet`, '']; }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="actual" name="2025 Gerçek" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projected" name="2026 Projeksiyon" fill="#fb923c" radius={[4, 4, 0, 0]} opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">🥩 Tavuk Eti Projeksiyon (Aylık 2025-2026)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={(() => {
                  if (!monthlyMeat || monthlyMeat.length === 0) return [];
                  const lastYear = tuikData[0]?.meatProduction || 0;
                  const firstYear = tuikData[tuikData.length - 1]?.meatProduction || 1;
                  const years = tuikData.length - 1;
                  const growthRate = Math.pow(lastYear / firstYear, 1 / years) - 1;
                  const monthlyGrowth = Math.pow(1 + growthRate, 1 / 12) - 1;
                  const data2025 = monthlyMeat.map((m) => ({ month: `2025-${m.month}`, actual: m.value, projected: null as number | null }));
                  const avgMonthly = monthlyMeat.reduce((sum, m) => sum + m.value, 0) / monthlyMeat.length;
                  const data2026 = monthlyMeat.map((m, i) => ({ month: `2026-${m.month}`, actual: null as number | null, projected: avgMonthly * Math.pow(1 + monthlyGrowth, i + 12) }));
                  return [...data2025, ...data2026];
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" height={90} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(v)} />
                  <Tooltip formatter={(value) => { if (value === null || value === undefined) return ['', '']; return [`${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ton`, '']; }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="actual" name="2025 Gerçek" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projected" name="2026 Projeksiyon" fill="#f87171" radius={[4, 4, 0, 0]} opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>📋 Projeksiyon Metodolojisi</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}><strong>CAGR (Compound Annual Growth Rate):</strong> Bileşik yıllık büyüme oranı modeli kullanılarak 2026 yılı projeksiyonu hesaplanmaktadır.</p>
              <p style={{ marginBottom: '12px' }}><strong>Hesaplama:</strong> Son {tuikData.length} yıllık verinin geometrik ortalaması alınarak sabit bir büyüme oranı belirlenir ve gelecek dönem tahminleri yapılır.</p>
              <p style={{ marginBottom: '12px' }}><strong>Aylık Dağılım:</strong> 2025 yılının aylık ortalama değerleri baz alınarak, aylık büyüme katsayısı ile 2026 projeksiyonu oluşturulur.</p>
              <p style={{ marginBottom: '0' }}><strong>Not:</strong> Projeksiyonlar tarihsel trendlere dayalıdır ve dış faktörler (hastalık, politika değişiklikleri, pazar şokları vb.) dikkate alınmamıştır.</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
