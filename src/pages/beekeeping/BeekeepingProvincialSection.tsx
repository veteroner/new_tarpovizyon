import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { COLORS, HONEY_COLORS, formatNumber } from './beekeepingTypes';

type Props = {
  topBeekeepers: { il: string; count: number }[];
  topProducers: { il: string; production: number }[];
  topYield: { il: string; yield: number }[];
  honeyTypesData: { name: string; count: number }[];
};

export function BeekeepingProvincialSection({ topBeekeepers, topProducers, topYield, honeyTypesData }: Props) {
  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🏆 İl Bazlı Liderlik Analizi
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          En çok arıcı, en fazla üretim ve en yüksek verimli iller
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Top Beekeepers */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐝 En Çok Arıcı Olan İller (2023)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topBeekeepers} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
              <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value) + ' arıcı']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]}>
                {topBeekeepers.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index < 3 ? COLORS.accent : COLORS.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Producers */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🍯 En Fazla Bal Üreten İller
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topProducers} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
              <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value) + ' ton']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Bar dataKey="production" fill={COLORS.success} radius={[0, 6, 6, 0]}>
                {topProducers.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index < 3 ? '#059669' : COLORS.success} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Yield */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 En Yüksek Verimli İller (kg/kovan)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topYield} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis dataKey="il" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={75} />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(1) + ' kg/kovan']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Bar dataKey="yield" fill={COLORS.blue} radius={[0, 6, 6, 0]}>
                {topYield.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index < 3 ? '#2563eb' : COLORS.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Honey Types Distribution */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🌸 Bal Çeşitleri Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={honeyTypesData.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {honeyTypesData.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={HONEY_COLORS[index % HONEY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} il`]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── İl Arıcılık Profili Radar ─────────────────────────────────── */}
      {(() => {
        // Build combined top-5 provinces by normalizing beekeepers, production, yield
        const allIls = Array.from(new Set([
          ...topBeekeepers.map(d => d.il),
          ...topProducers.map(d => d.il),
          ...topYield.map(d => d.il),
        ]));
        const maxBee = Math.max(...topBeekeepers.map(d => d.count), 1);
        const maxProd = Math.max(...topProducers.map(d => d.production), 1);
        const maxYield = Math.max(...topYield.map(d => d.yield), 1);
        const radarData = allIls.slice(0, 6).map(il => ({
          subject: il,
          Arıcı: Math.round(((topBeekeepers.find(d => d.il === il)?.count ?? 0) / maxBee) * 100),
          Üretim: Math.round(((topProducers.find(d => d.il === il)?.production ?? 0) / maxProd) * 100),
          Verim: Math.round(((topYield.find(d => d.il === il)?.yield ?? 0) / maxYield) * 100),
        }));
        if (radarData.length < 3) return null;
        return (
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🕸️ İl Arıcılık Profili — Çok Boyutlu Radar
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Arıcı sayısı, bal üretimi ve kovan verimi boyutlarında il endeks karşılaştırması (0–100 normalize).
            </p>
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border, #e5e7eb)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--text-secondary, #6b7280)' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={5} />
                  <Radar name="Arıcı Sayısı" dataKey="Arıcı" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.25} />
                  <Radar name="Bal Üretimi" dataKey="Üretim" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.2} />
                  <Radar name="Kovan Verimi" dataKey="Verim" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number, name: string) => [`${value} endeks`, name]} />
                </RadarChart>
              </ResponsiveContainer>
              <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', textAlign: 'center' }}>
                Her boyut kendi maksimumuna göre 0–100 normalize edilmiştir. 100 = o boyuttaki en iyi il.
              </p>
            </div>
          </div>
        );
      })()}
    </>
  );
}
