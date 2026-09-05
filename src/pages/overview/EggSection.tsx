import { yuzde } from '../../utils/sayi';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatShort } from './overviewTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { OverviewData } from './overviewTypes';
import { ChartCard } from '../../components/ui/Card';
import { Egg } from 'lucide-react';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';

interface Props {
  data: OverviewData;
}

export function EggSection({ data }: Props) {
  /* Yıl VERİDEN: '2023' elle yazılıydı, kaynak tablo ilerleyince etiket
     yalan söylüyordu. `years.livestock` o tablonun en güncel dolu yılı. */
  const yil = data.years.livestock ?? '';

  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>Yumurta Üretimi</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card large" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="kpi-header"><span className="kpi-title">TOPLAM YUMURTA</span><div className="kpi-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><Egg size={18} aria-hidden="true" /></div></div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>{formatNumber(data.eggProduction.total)} adet</div>
          <div className="kpi-subtitle">{yil} Yılı Toplam</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">TAVUK YUMURTASI</span></div>
          <div className="kpi-value">{formatNumber(data.eggProduction.chicken)} adet</div>
          <div className="kpi-subtitle">Toplam üretimin {yuzde(((data.eggProduction.chicken) / (data.eggProduction.total || 1) * 100), 0)}'i</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI</span></div>
          <div className="kpi-value">{Math.round((data.eggProduction.total) / (data.population || 1))}</div>
          <div className="kpi-subtitle">Adet/yıl</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">DİĞER YUMURTA</span></div>
          <div className="kpi-value">{formatNumber(data.eggProduction.other)} adet</div>
          <div className="kpi-subtitle">Diğer kuş yumurtaları</div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard title={`Yumurta Türleri (${yil})`} action={<ChartInsightButton title={`Yumurta Türleri (${yil})`} description="Tavuk ve diğer yumurta türleri dağılımı" data={data.eggProduction.breakdown} context={{ toplamYumurta: formatNumber(data.eggProduction.total)+' adet', tavukYumurtası: formatNumber(data.eggProduction.chicken)+' adet' }} />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.eggProduction.breakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${yuzde(((percent ?? 0) * 100), 1)}`}
              >
                {data.eggProduction.breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' adet', '']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Yumurta Üretim Trendi (2010-${yil})`} action={<ChartInsightButton title={`Yumurta Üretim Trendi (2010-${yil})`} description="Yıllık yumurta üretimi değişimi" data={data.eggProduction.yearly} context={{ toplamYumurta: formatNumber(data.eggProduction.total)+' adet' }} />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.eggProduction.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} domain={LINE_Y_DOMAIN} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' adet', 'Üretim']} />
              <Area type="monotone" dataKey="egg" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
