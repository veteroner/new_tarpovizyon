import React from 'react';
import { Award } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { WorldRankingItem } from './useTurkeyAnimalProductionData';
import { formatValue, formatShort } from './turkeyAnimalProductionTypes';

interface WorldRankingsSectionProps {
  worldBeefRanking: WorldRankingItem[];
  worldMilkRanking: WorldRankingItem[];
  worldChickenRanking: WorldRankingItem[];
}

const WorldRankingsSection: React.FC<WorldRankingsSectionProps> = ({
  worldBeefRanking, worldMilkRanking, worldChickenRanking
}) => {
  if (worldBeefRanking.length === 0 && worldMilkRanking.length === 0 && worldChickenRanking.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🌍 Dünya Sıralaması
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Türkiye'nin dünya hayvansal üretim sıralamasındaki yeri
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        {worldBeefRanking.length > 0 && (
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="#ef4444" /> Sığır Eti - Dünya Top 10
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={worldBeefRanking.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                  {worldBeefRanking.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#ef4444' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {worldMilkRanking.length > 0 && (
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="#3b82f6" /> Süt Üretimi - Dünya Top 10
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={worldMilkRanking.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                  {worldMilkRanking.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#3b82f6' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {worldChickenRanking.length > 0 && (
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="#10b981" /> Tavuk Eti - Dünya Top 10
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={worldChickenRanking.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                  {worldChickenRanking.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#10b981' : '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
};

export default WorldRankingsSection;
