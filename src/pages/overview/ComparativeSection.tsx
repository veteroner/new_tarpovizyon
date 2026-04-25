import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Area, Line,
} from 'recharts';
import { COLORS, formatNumber, formatShort } from './overviewTypes';
import type { OverviewData } from './overviewTypes';

interface Props {
  data: OverviewData;
}

export function ComparativeSection({ data }: Props) {
  const combinedData = data.milkProduction.yearly.map((item, idx) => ({
    year: item.year,
    süt: Number(item.milk) || 0,
    et: Number(data.meatProduction.yearly[idx]?.meat) || 0,
    yumurta: Math.round((Number(data.eggProduction.yearly[idx]?.egg) || 0) / 1000000),
  }));

  const milkLast = data.milkProduction.yearly;
  const meatLast = data.meatProduction.yearly;
  const eggLast = data.eggProduction.yearly;

  const milkChange = milkLast.length >= 2
    ? (((Number(milkLast[milkLast.length - 1]?.milk) || 0) - (Number(milkLast[milkLast.length - 2]?.milk) || 0)) /
      (Number(milkLast[milkLast.length - 2]?.milk) || 1) * 100).toFixed(1) + '%'
    : 'N/A';

  const meatChange = meatLast.length >= 2
    ? (((Number(meatLast[meatLast.length - 1]?.meat) || 0) - (Number(meatLast[meatLast.length - 2]?.meat) || 0)) /
      (Number(meatLast[meatLast.length - 2]?.meat) || 1) * 100).toFixed(1) + '%'
    : 'N/A';

  const eggChange = eggLast.length >= 2
    ? (((Number(eggLast[eggLast.length - 1]?.egg) || 0) - (Number(eggLast[eggLast.length - 2]?.egg) || 0)) /
      (Number(eggLast[eggLast.length - 2]?.egg) || 1) * 100).toFixed(1) + '%'
    : 'N/A';

  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6' }}>📊 Karşılaştırmalı Analizler</h2>
      </div>

      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📈 Hayvansal Üretim Kategorileri Karşılaştırması (2010-2023)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatShort(v) + 'M'} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'yumurta') return [formatNumber(value) + ' Milyon adet', 'Yumurta'];
                  return [formatNumber(value) + ' ton', name === 'süt' ? 'Süt' : 'Et'];
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="süt" fill={COLORS.milk[0]} fillOpacity={0.3} stroke={COLORS.milk[0]} name="Süt (ton)" />
              <Area yAxisId="left" type="monotone" dataKey="et" fill={COLORS.meat[0]} fillOpacity={0.3} stroke={COLORS.meat[0]} name="Et (ton)" />
              <Line yAxisId="right" type="monotone" dataKey="yumurta" stroke={COLORS.egg[0]} strokeWidth={3} name="Yumurta (M adet)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🥧 Toplam Hayvansal Üretim Dağılımı (2023)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Süt Üretimi', value: data.milkProduction.total, fill: COLORS.milk[0] },
                  { name: 'Et Üretimi', value: data.meatProduction.total, fill: COLORS.meat[0] },
                  { name: 'Diğer Ürünler', value: (data.milkProduction.total + data.meatProduction.total) * 0.15, fill: COLORS.general[2] },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
              />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <p>* Yumurta farklı birimde olduğu için dahil edilmemiştir</p>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📊 Kişi Başı Yıllık Tüketim Tahmini</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Süt', value: Math.round((data.milkProduction.total * 1000) / (data.population || 1)), fill: COLORS.milk[0], unit: 'kg' },
                { name: 'Et', value: Math.round((data.meatProduction.total * 1000) / (data.population || 1)), fill: COLORS.meat[0], unit: 'kg' },
                { name: 'Yumurta', value: Math.round(data.eggProduction.total / (data.population || 1)), fill: COLORS.egg[0], unit: 'adet' },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: number, _name: string, props: { payload?: { unit?: string } }) => [value + ' ' + (props.payload?.unit ?? ''), '']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {[COLORS.milk[0], COLORS.meat[0], COLORS.egg[0]].map((fill, index) => (
                  <Cell key={`cell-${index}`} fill={fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="data-table" style={{ marginTop: '2rem' }}>
        <h3 className="data-table-title">📋 Kategori Özet Karşılaştırması (2023)</h3>
        <div className="table-row" style={{ background: 'var(--bg-card)', fontWeight: '600', borderBottom: '2px solid var(--border)' }}>
          <div className="table-rank" style={{ width: '200px' }}>Kategori</div>
          <div className="table-info" style={{ flex: 1 }}>Toplam Üretim</div>
          <div className="table-value" style={{ width: '150px' }}>Kişi Başı</div>
          <div className="table-value" style={{ width: '150px' }}>Yıllık Değişim</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.milk[0] }}></span>
            Süt Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.milkProduction.total)} ton</div>
          <div className="table-value" style={{ width: '150px' }}>{Math.round((data.milkProduction.total * 1000) / (data.population || 1))} kg</div>
          <div className="table-value green" style={{ width: '150px' }}>{milkChange}</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.meat[0] }}></span>
            Et Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.meatProduction.total)} ton</div>
          <div className="table-value" style={{ width: '150px' }}>{Math.round((data.meatProduction.total * 1000) / (data.population || 1))} kg</div>
          <div className="table-value green" style={{ width: '150px' }}>{meatChange}</div>
        </div>
        <div className="table-row">
          <div className="table-name" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS.egg[0] }}></span>
            Yumurta Üretimi
          </div>
          <div className="table-info" style={{ flex: 1 }}>{formatNumber(data.eggProduction.total)} adet</div>
          <div className="table-value" style={{ width: '150px' }}>{Math.round(data.eggProduction.total / (data.population || 1))} adet</div>
          <div className="table-value green" style={{ width: '150px' }}>{eggChange}</div>
        </div>
      </div>
    </>
  );
}
