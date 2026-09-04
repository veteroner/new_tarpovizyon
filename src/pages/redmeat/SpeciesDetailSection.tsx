import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type YearPoint, MEAT_COLORS, formatTon, formatShort } from './redMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { ChartCard } from '../../components/ui/Card';

type Props = {
  filteredSeries: YearPoint[];
};

export default function SpeciesDetailSection({ filteredSeries }: Props) {
  const rangeLabel = filteredSeries.length
    ? `${filteredSeries[0].year}–${filteredSeries[filteredSeries.length - 1].year}`
    : '';

  return (
    <div className="chart-grid" style={{ marginTop: '30px' }}>
      {/* Sığır Üretimi */}
      <ChartCard title={<>Sığır Eti Üretimi {rangeLabel && `(${rangeLabel})`}</>} action={<ChartInsightButton title={`Sığır Eti Üretimi (${rangeLabel})`} description="Yıllık sığır eti üretim verisi" data={filteredSeries} context={{ tur: 'sigir' }} compact />}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filteredSeries} margin={{ top: 20, right: 8, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="cattleTon" name="Sığır" fill={MEAT_COLORS['Sığır']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Koyun Üretimi */}
      <ChartCard title={<>Koyun Eti Üretimi {rangeLabel && `(${rangeLabel})`}</>} action={<ChartInsightButton title={`Koyun Eti Üretimi (${rangeLabel})`} description="Yıllık koyun eti üretim verisi" data={filteredSeries} context={{ tur: 'koyun' }} compact />}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filteredSeries} margin={{ top: 20, right: 8, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="sheepTon" name="Koyun" fill={MEAT_COLORS['Koyun']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Keçi Üretimi */}
      <ChartCard title={<>Keçi Eti Üretimi {rangeLabel && `(${rangeLabel})`}</>} action={<ChartInsightButton title={`Keçi Eti Üretimi (${rangeLabel})`} description="Yıllık keçi eti üretim verisi" data={filteredSeries} context={{ tur: 'keci' }} compact />}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filteredSeries} margin={{ top: 20, right: 8, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="goatTon" name="Keçi" fill={MEAT_COLORS['Keçi']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Manda Üretimi */}
      <ChartCard title={<>Manda Eti Üretimi {rangeLabel && `(${rangeLabel})`}</>} action={<ChartInsightButton title={`Manda Eti Üretimi (${rangeLabel})`} description="Yıllık manda eti üretim verisi" data={filteredSeries} context={{ tur: 'manda' }} compact />}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filteredSeries} margin={{ top: 20, right: 8, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} width={46} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="buffaloTon" name="Manda" fill={MEAT_COLORS['Manda']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
