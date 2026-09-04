import { yuzde } from '../../utils/sayi';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { YearPoint, TuikChickenData } from './whiteMeatUtils';
import { formatTon, formatShort } from './whiteMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { Card, ChartCard } from '../../components/ui/Card';
import { Bird, TrendingUp, TrendingDown } from 'lucide-react';

type Props = {
  series: YearPoint[];
  latest: YearPoint | undefined;
  yoy: number;
  worldRanking: { world: number; eu: number } | null;
  tuikData: TuikChickenData[];
};

export default function WhiteMeatHeroSection({ series, latest, yoy, worldRanking, tuikData }: Props) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header">
            <span className="kpi-title">SON YIL</span>
          </div>
          <div className="kpi-value">{formatTon(latest?.poultryTon ?? 0)}</div>
          <div className="kpi-subtitle">({latest?.year ?? '-'})</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YILLIK DEĞİŞİM</span>
            <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}</div>
          </div>
          <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
            {yuzde(yoy, 1)}
          </div>
          <div className="kpi-subtitle">Önceki yıla göre</div>
        </div>

        {worldRanking && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">TAVUK ETİ</span>
              <div className="kpi-icon orange"><Bird size={18} aria-hidden="true" /></div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRanking.world}</div>
            <div className="kpi-subtitle">AB #{worldRanking.eu}</div>
          </div>
        )}
      </div>

      {/* Intelligence Panel */}
      {tuikData.length > 0 && (() => {
        const lastYear = tuikData[0];
        const firstYear = tuikData[tuikData.length - 1];
        const years = tuikData.length - 1;
        
        const slaughterCAGR = years > 0 
          ? ((Math.pow(lastYear.slaughtered / firstYear.slaughtered, 1 / years) - 1) * 100) 
          : 0;
        
        const meatCAGR = years > 0
          ? ((Math.pow(lastYear.meatProduction / firstYear.meatProduction, 1 / years) - 1) * 100)
          : 0;
        
        const hatchSuccessChange = lastYear.hatchRate - firstYear.hatchRate;
        
        return (
          /* Degrade zemin + cam karolar kaldırıldı; ortak `.hero-ozet` düzeni. */
          <Card className="hero-ozet" aralik="normal">
            <h3 className="ui-card-title hero-ozet-baslik">Beyaz et içgörü özeti</h3>
            <div className="hero-ozet-izgara">
              {[
                { etiket: 'Kesim BBO', deger: yuzde(slaughterCAGR, 1, true), alt: `${years} yıl büyüme` },
                { etiket: 'Üretim BBO', deger: yuzde(meatCAGR, 1, true), alt: `Et üretimi (${years} yıl)` },
                { etiket: 'Kuluçka başarısı', deger: yuzde(hatchSuccessChange, 1, true), alt: 'Verimlilik değişimi' },
                { etiket: 'Tavuk başı verim', deger: `${lastYear.yieldPerBird.toFixed(2)} kg`, alt: 'Güncel performans' },
              ].map((o) => (
                <div className="hero-ozet-oge" key={o.etiket}>
                  <div className="hero-ozet-etiket">{o.etiket}</div>
                  <div className="hero-ozet-deger">{o.deger}</div>
                  <div className="hero-ozet-alt">{o.alt}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      <div className="chart-grid">
        <ChartCard title="Kanatlı Eti Üretimi Trendi" span={2} action={<ChartInsightButton title="Kanatlı Eti Üretimi Trendi" description="Kanatlı eti uzun dönem üretim trendi" data={series} context={{ section: 'Trend' }} />}>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(Number(v))} width={46} />
              <Tooltip
                formatter={(value: number) => [formatTon(value), 'Kanatlı Eti']}
                labelFormatter={(label) => `Yıl: ${label}`}
              />
              <Area type="monotone" dataKey="poultryTon" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
