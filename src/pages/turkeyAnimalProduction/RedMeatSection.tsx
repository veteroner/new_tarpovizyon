import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend,
  ComposedChart, Area
} from 'recharts';
import { COLORS } from './turkeyAnimalProductionTypes';
import { formatValue, formatShort } from './turkeyAnimalProductionTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface RedMeatSectionProps {
  redMeatBreakdown: { name: string; value: number; color: string }[];
  redMeatTrendData: Record<string, string | number>[];
  buyukbasKucukbasData: Record<string, string | number>[];
}

const RedMeatSection: React.FC<RedMeatSectionProps> = ({
  redMeatBreakdown, redMeatTrendData, buyukbasKucukbasData
}) => {
  if (redMeatBreakdown.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🥩 Kırmızı Et Üretim Analizi
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Türkiye kırmızı et üretimi detaylı dağılım ve trend analizi
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        {/* Breakdown Pie */}
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              📊 Kırmızı Et Türlerine Göre Dağılım
            </h3>
            <ChartInsightButton title="📊 Kırmızı Et Dağılımı" description="Et türlerine göre dağılım" data={redMeatBreakdown} context={{ section: 'Kırmızı Et' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={redMeatBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
              >
                {redMeatBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked Trend */}
        {redMeatTrendData.length > 0 && (
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                📈 Kırmızı Et Türleri (Son 5 Yıl)
              </h3>
              <ChartInsightButton title="📈 Kırmızı Et Trend" description="Kırmızı et türleri yıllık trendi" data={redMeatTrendData} context={{ section: 'Kırmızı Et' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={redMeatTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                <Legend />
                <Bar dataKey="Sığır" stackId="a" fill={COLORS['Sığır']} />
                <Bar dataKey="Koyun" stackId="a" fill={COLORS['Koyun']} />
                <Bar dataKey="Keçi" stackId="a" fill={COLORS['Keçi']} />
                <Bar dataKey="Manda" stackId="a" fill={COLORS['Manda']} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Büyükbaş vs Küçükbaş */}
        {buyukbasKucukbasData.length > 0 && (
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                🐂 Büyükkbaş vs Küçükkbaş Karşılaştırması
              </h3>
              <ChartInsightButton title="🐂 Büyükkbaş vs Küçükkbaş" description="Karşılaştırmalı trend" data={buyukbasKucukbasData} context={{ section: 'Kırmızı Et' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={buyukbasKucukbasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                <Legend />
                <Area type="monotone" dataKey="Büyükbaş" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
                <Area type="monotone" dataKey="Küçükbaş" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.4} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
};

export default RedMeatSection;
