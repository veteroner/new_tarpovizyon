/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

interface SeriesConfig {
  dataKey: string;
  name?: string;
  color?: string;
  type?: 'bar' | 'line' | 'area'; // for 'composed' type only
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'composed';
  title?: string;
  subtitle?: string;
  data: Record<string, any>[];
  xKey?: string;
  series?: SeriesConfig[];
  height?: number;
  unit?: string;
  stacked?: boolean;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-card, #ffffff)',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: 8,
    fontSize: '0.82rem',
  },
};

function useActiveSeries(data: Record<string, any>[], xKey: string, series?: SeriesConfig[]): SeriesConfig[] {
  if (series && series.length) return series;
  return Object.keys(data[0] ?? {})
    .filter(k => k !== xKey && k !== 'color' && typeof data[0][k] === 'number')
    .map((k, i) => ({ dataKey: k, name: k, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }));
}

export default function DynamicChart({ config }: { config: ChartConfig }) {
  const {
    type = 'bar',
    title,
    subtitle,
    data,
    xKey = 'name',
    series,
    height = 280,
    unit = '',
    stacked = false,
  } = config;

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
        Grafik verisi bulunamadı.
      </div>
    );
  }

  const activeSeries = useActiveSeries(data, xKey, series);
  const fmt = (v: any) => [
    typeof v === 'number' ? v.toLocaleString('tr-TR') + (unit ? ' ' + unit : '') : String(v),
  ];

  // ─── PIE ───────────────────────────────────────────────────────
  if (type === 'pie') {
    const valueKey = activeSeries[0]?.dataKey ?? 'value';
    return (
      <div className="chart-card" style={{ marginTop: 12 }}>
        {title && <h3 className="chart-title">{title}</h3>}
        {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{subtitle}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={xKey}
              cx="50%" cy="50%"
              outerRadius={height * 0.32}
              label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(1)}%`}
              labelLine
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={(entry.color as string) ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={fmt} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ─── COMPOSED ──────────────────────────────────────────────────
  if (type === 'composed') {
    return (
      <div className="chart-card" style={{ marginTop: 12 }}>
        {title && <h3 className="chart-title">{title}</h3>}
        {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{subtitle}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v.toLocaleString('tr-TR')} />
            <Tooltip {...TOOLTIP_STYLE} formatter={fmt} />
            <Legend />
            {activeSeries.map((s, i) => {
              const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              if (s.type === 'bar')
                return <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={color} radius={[3, 3, 0, 0]} stackId={stacked ? 'stack' : undefined} />;
              if (s.type === 'area')
                return <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey} stroke={color} fill={color} fillOpacity={0.18} />;
              return <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey} stroke={color} strokeWidth={2.5} dot={false} />;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ─── BAR ───────────────────────────────────────────────────────
  if (type === 'bar') {
    return (
      <div className="chart-card" style={{ marginTop: 12 }}>
        {title && <h3 className="chart-title">{title}</h3>}
        {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{subtitle}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v.toLocaleString('tr-TR')} />
            <Tooltip {...TOOLTIP_STYLE} formatter={fmt} />
            {activeSeries.length > 1 && <Legend />}
            {activeSeries.map((s, i) => (
              <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name ?? s.dataKey}
                fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ─── LINE ──────────────────────────────────────────────────────
  if (type === 'line') {
    return (
      <div className="chart-card" style={{ marginTop: 12 }}>
        {title && <h3 className="chart-title">{title}</h3>}
        {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{subtitle}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v.toLocaleString('tr-TR')} />
            <Tooltip {...TOOLTIP_STYLE} formatter={fmt} />
            {activeSeries.length > 1 && <Legend />}
            {activeSeries.map((s, i) => (
              <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey}
                stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ─── AREA (default / fallback) ─────────────────────────────────
  return (
    <div className="chart-card" style={{ marginTop: 12 }}>
      {title && <h3 className="chart-title">{title}</h3>}
      {subtitle && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{subtitle}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            {activeSeries.map((s, i) => {
              const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <linearGradient key={s.dataKey} id={`dynGrad_${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
          <XAxis dataKey={xKey} stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-secondary, #64748b)" tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('tr-TR')} />
          <Tooltip {...TOOLTIP_STYLE} formatter={fmt} />
          {activeSeries.length > 1 && <Legend />}
          {activeSeries.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey}
                stroke={color} strokeWidth={2.5}
                fill={`url(#dynGrad_${s.dataKey})`}
                stackId={stacked ? 'stack' : undefined}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
