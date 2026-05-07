import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikEggData, MonthlyEggData } from './eggProductionTypes';
import { formatShort } from './eggProductionTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface EggTuikProjectionTabProps {
  tuikData: TuikEggData[];
  monthlyEgg: MonthlyEggData[];
  monthlyLayer: MonthlyEggData[];
}

export function EggTuikProjectionTab({ tuikData, monthlyEgg, monthlyLayer }: EggTuikProjectionTabProps) {
  const firstYear = tuikData[tuikData.length - 1];
  const lastYear = tuikData[0];
  const years = tuikData.length - 1;

  const eggGrowthRate = Math.pow(lastYear.eggProduction / firstYear.eggProduction, 1 / years) - 1;
  const eggMonthlyGrowth = Math.pow(1 + eggGrowthRate, 1 / 12) - 1;

  const layerGrowthRate = Math.pow(lastYear.layerCount / firstYear.layerCount, 1 / years) - 1;
  const layerMonthlyGrowth = Math.pow(1 + layerGrowthRate, 1 / 12) - 1;

  const baseEgg2026 = lastYear.eggProduction * (1 + eggGrowthRate);
  const baseLayer2026 = lastYear.layerCount * (1 + layerGrowthRate);

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const projection2026Egg = monthNames.map((month, idx) => ({
    month,
    actual2025: monthlyEgg[idx]?.value || 0,
    projected2026: (baseEgg2026 * 1000 / 12) * (1 + eggMonthlyGrowth * idx),
  }));

  const projection2026Layer = monthNames.map((month, idx) => ({
    month,
    actual2025: monthlyLayer[idx]?.value || 0,
    projected2026: (baseLayer2026 * 1000 / 12) * (1 + layerMonthlyGrowth * idx),
  }));

  const totalProjected2026Egg = projection2026Egg.reduce((sum, m) => sum + m.projected2026, 0);
  const totalProjected2026Layer = projection2026Layer.reduce((sum, m) => sum + m.projected2026, 0) / 12;

  return (
    <>
      {/* Projeksiyon Özeti */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">2026 YUMURTA TAHMİNİ</span>
            <div className="kpi-icon orange">🥚</div>
          </div>
          <div className="kpi-value">{formatShort(totalProjected2026Egg)} adet</div>
          <div className="kpi-subtitle">Yıllık toplam projeksiyon</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">2026 TAVUK TAHMİNİ</span>
            <div className="kpi-icon green">🐔</div>
          </div>
          <div className="kpi-value">{formatShort(totalProjected2026Layer)} adet</div>
          <div className="kpi-subtitle">Ortalama tavuk sayısı</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YILLIK BÜYÜME (CAGR)</span>
            <div className="kpi-icon blue">📈</div>
          </div>
          <div className="kpi-value">%{(eggGrowthRate * 100).toFixed(2)}</div>
          <div className="kpi-subtitle">16 yıllık ortalama büyüme</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">PROJEKSİYON MODELİ</span>
            <div className="kpi-icon purple">🔮</div>
          </div>
          <div className="kpi-value">CAGR</div>
          <div className="kpi-subtitle">Bileşik yıllık büyüme oranı</div>
        </div>
      </div>

      {/* 2026 Aylık Yumurta Projeksiyonu */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥚 2026 Aylık Yumurta Üretim Projeksiyonu</h3>
            <ChartInsightButton title="🥚 2026 Aylık Yumurta Üretim Projeksiyonu" description="2026 yılı aylık yumurta üretim projeksiyonu" data={projection2026Egg} context={{ year: 2026 }} compact />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={projection2026Egg}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v)}
                label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' adet',
                  name === 'actual2025' ? '2025 Gerçek' : '2026 Projeksiyon',
                ]}
              />
              <Legend />
              <Bar dataKey="actual2025" name="2025 Gerçek" fill="#94a3b8" opacity={0.6} radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected2026" name="2026 Projeksiyon" fill="#f59e0b" opacity={0.9} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="projected2026" stroke="#dc2626" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>2025 Toplam:</strong> {monthlyEgg.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR')} adet
            {' | '}
            <strong>2026 Tahmin:</strong> {totalProjected2026Egg.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
            {' | '}
            <strong>Artış:</strong> {((totalProjected2026Egg - monthlyEgg.reduce((sum, m) => sum + m.value, 0)) / monthlyEgg.reduce((sum, m) => sum + m.value, 0) * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 2026 Aylık Tavuk Projeksiyonu */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🐔 2026 Aylık Yumurtacı Tavuk Projeksiyonu</h3>
            <ChartInsightButton title="🐔 2026 Aylık Yumurtacı Tavuk Projeksiyonu" description="2026 yılı aylık yumurtacı tavuk sayısı projeksiyonu" data={projection2026Layer} context={{ year: 2026 }} compact />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={projection2026Layer}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v)}
                label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' adet',
                  name === 'actual2025' ? '2025 Gerçek' : '2026 Projeksiyon',
                ]}
              />
              <Legend />
              <Bar dataKey="actual2025" name="2025 Gerçek" fill="#94a3b8" opacity={0.6} radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected2026" name="2026 Projeksiyon" fill="#10b981" opacity={0.9} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="projected2026" stroke="#dc2626" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>2025 Ortalama:</strong> {(monthlyLayer.reduce((sum, m) => sum + m.value, 0) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
            {' | '}
            <strong>2026 Tahmin:</strong> {totalProjected2026Layer.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
            {' | '}
            <strong>Artış:</strong> %{(layerGrowthRate * 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Projeksiyon Metodolojisi */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '700' }}>
          📚 Projeksiyon Metodolojisi
        </h3>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>🔮 Model:</strong> 2026 tahminleri, <strong>CAGR (Compound Annual Growth Rate)</strong> yöntemi kullanılarak hesaplanmıştır.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>📊 Veri Kaynağı:</strong> 2010-2025 arası 16 yıllık TÜİK yumurta üretim verileri
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>📈 Hesaplama:</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li>Yıllık büyüme oranı: CAGR = (Son Yıl / İlk Yıl)^(1/yıl sayısı) - 1</li>
            <li>Aylık büyüme: (1 + CAGR)^(1/12) - 1</li>
            <li>2026 tahmini: 2025 × (1 + CAGR)</li>
          </ul>
          <p style={{ marginBottom: '12px' }}>
            <strong>⚠️ Önemli Notlar:</strong>
          </p>
          <ul style={{ marginLeft: '20px' }}>
            <li>Projeksiyonlar geçmiş trendlere dayalıdır ve garantili tahmin değildir</li>
            <li>Hastalık salgınları, yem fiyatları, pazar koşulları gibi faktörler sonuçları etkileyebilir</li>
            <li>Kısa vadeli (1 yıl) tahminler daha güvenilirdir</li>
            <li>Mevsimsel etkiler aylık dağılımda dikkate alınmamıştır</li>
          </ul>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
            <strong>📊 Model Performansı:</strong>
            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>• CAGR (Yumurta): <strong>%{(eggGrowthRate * 100).toFixed(2)}</strong></div>
              <div>• CAGR (Tavuk): <strong>%{(layerGrowthRate * 100).toFixed(2)}</strong></div>
              <div>• Veri aralığı: <strong>2010-2025 (16 yıl)</strong></div>
              <div>• Tahmin yılı: <strong>2026</strong></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
