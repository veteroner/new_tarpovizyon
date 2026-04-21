import React from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Area, Line
} from 'recharts';
import { formatValue, formatShort } from './turkeyAnimalProductionTypes';

interface PoultrySectionProps {
  poultryMonthlyData: Record<string, string | number>[];
}

const PoultrySection: React.FC<PoultrySectionProps> = ({ poultryMonthlyData }) => {
  if (poultryMonthlyData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🍗 Kanatlı Ürün Üretimi
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Tavuk eti ve yumurta üretimi - Son 24 ay detaylı analiz
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        {/* Chicken Meat */}
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🍗 Tavuk Eti Üretimi (Aylık Trend)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={poultryMonthlyData} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
              <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
              <Area type="monotone" dataKey="Tavuk Eti (ton)" fill="#10b981" stroke="#10b981" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="Tavuk Eti (ton)" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Egg Production */}
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🥚 Yumurta Üretimi (Aylık Trend)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={poultryMonthlyData} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `${v} M adet`} />
              <Area type="monotone" dataKey="Yumurta (M adet)" fill="#fbbf24" stroke="#fbbf24" fillOpacity={0.4} strokeWidth={2} />
              <Line type="monotone" dataKey="Yumurta (M adet)" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default PoultrySection;
