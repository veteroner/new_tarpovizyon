import { yuzde } from '../../utils/sayi';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList,
} from 'recharts';
import { COLORS, formatNumber, formatShort } from './overviewTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { OverviewData } from './overviewTypes';
import { VALUE_HEADROOM, compactValue, truncTick } from '../../utils/chartTicks';
import { ChartCard } from '../../components/ui/Card';
import { BarChart3, Pin, Sprout, Users, Wallet, Wheat } from 'lucide-react';

interface Props {
  data: OverviewData;
  ruralPercent: string;
  urbanPercent: string;
  agriLandPercent: string;
}

export function GeneralStatsSection({ data, ruralPercent, urbanPercent, agriLandPercent }: Props) {
  // Etiketlerdeki yıllar veriden gelir — sabit yazınca veri ilerledikçe
  // "2024 rakamı, (2022) başlığı" gibi çelişkili ekranlar çıkıyordu.
  const y = data.years;
  const yl = (v: number | null) => (v == null ? '—' : String(v));
  return (
    <>
      <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>Genel Göstergeler</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">NÜFUS</span><div className="kpi-icon blue"><Users size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{formatNumber(data.population)}</div>
          <div className="kpi-subtitle">{yl(y.population)} Yılı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">GSYİH</span><div className="kpi-icon green"><Wallet size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{data.gdp ? `$${formatNumber(data.gdp)}` : '—'}</div>
          <div className="kpi-subtitle">USD ({yl(y.macro)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI GSYİH</span><div className="kpi-icon blue"><BarChart3 size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{data.gdpPerCapita ? `$${formatNumber(data.gdpPerCapita)}` : '—'}</div>
          <div className="kpi-subtitle">USD/kişi ({yl(y.macro)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM ARAZİSİ</span><div className="kpi-icon green"><Wheat size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{formatNumber(data.agriculturalLand)} ha</div>
          <div className="kpi-subtitle">Toplam alanın %{agriLandPercent}'i ({yl(y.land)})</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginTop: '1rem' }}>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIMSAL KATMA DEĞER</span><div className="kpi-icon green"><Sprout size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{data.agriculturalGDP ? `$${formatNumber(data.agriculturalGDP)}` : '—'}</div>
          <div className="kpi-subtitle">Tarım+Orman+Balıkçılık ({yl(y.macro)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM PAYI (GSYİH)</span><div className="kpi-icon blue"><Pin size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value">{data.agriculturalGDPShare ? yuzde(data.agriculturalGDPShare, 1) : '—'}</div>
          <div className="kpi-subtitle">GSYİH içindeki pay ({yl(y.macro)})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM İSTİHDAMI</span><div className="kpi-icon orange">👨‍🌾</div></div>
          <div className="kpi-value">{data.agriculturalEmployment ? formatNumber(data.agriculturalEmployment) : '—'}</div>
          <div className="kpi-subtitle">Kişi (15+), {yl(y.employment)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TARIM PAYI (İSTİHDAM)</span><div className="kpi-icon pink">%</div></div>
          <div className="kpi-value">{data.agriculturalEmploymentShare ? yuzde(data.agriculturalEmploymentShare, 1) : '—'}</div>
          <div className="kpi-subtitle">Toplam istihdam içindeki pay ({yl(y.employment)})</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard title={<>Nüfus Dağılımı ({yl(y.population)})</>} action={<ChartInsightButton title={`Nüfus Dağılımı (${yl(y.population)})`} description="Kentsel ve kırsal nüfus dağılımı" data={[{name:'Kentsel', value: data.urbanPopulation},{name:'Kırsal', value: data.ruralPopulation}]} context={{ nüfus: formatNumber(data.population), kentselOran: urbanPercent+'%', kırsalOran: ruralPercent+'%' }} />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Kentsel', value: data.urbanPopulation, fill: COLORS.economy[0] },
                  { name: 'Kırsal', value: data.ruralPopulation, fill: COLORS.economy[2] },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name }) => `${name} %${name === 'Kentsel' ? urbanPercent : ruralPercent}`}
              />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' kişi', '']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<>Arazi Kullanımı ({yl(y.land)})</>} action={<ChartInsightButton title={`Arazi Kullanımı (${yl(y.land)})`} description="Türkiye arazi kullanım kategorileri" data={data.landUseData} context={{ tarımArazisi: formatNumber(data.agriculturalLand)+' ha', tarımPayı: agriLandPercent+'%' }} />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.landUseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={110} tickFormatter={truncTick} interval={0} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' ha', '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.landUseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
