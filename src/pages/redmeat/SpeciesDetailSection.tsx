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

type Props = {
  filteredSeries: YearPoint[];
};

export default function SpeciesDetailSection({ filteredSeries }: Props) {
  const data2010 = filteredSeries.filter(p => p.year >= 2010);

  return (
    <div className="chart-grid" style={{ marginTop: '30px' }}>
      {/* Sığır Üretimi */}
      <div className="chart-card">
        <h3 className="chart-title">🐄 Sığır Eti Üretimi (2010-2024)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data2010} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="cattleTon" name="Sığır" fill={MEAT_COLORS['Sığır']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Koyun Üretimi */}
      <div className="chart-card">
        <h3 className="chart-title">🐑 Koyun Eti Üretimi (2010-2024)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data2010} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="sheepTon" name="Koyun" fill={MEAT_COLORS['Koyun']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keçi Üretimi */}
      <div className="chart-card">
        <h3 className="chart-title">🐐 Keçi Eti Üretimi (2010-2024)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data2010} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="goatTon" name="Keçi" fill={MEAT_COLORS['Keçi']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Manda Üretimi */}
      <div className="chart-card">
        <h3 className="chart-title">🦬 Manda Eti Üretimi (2010-2024)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data2010} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
            <Tooltip 
              formatter={(value: number) => [formatTon(Number(value))]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="buffaloTon" name="Manda" fill={MEAT_COLORS['Manda']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
