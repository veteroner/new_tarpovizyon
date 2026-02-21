import { TrendingUp, TrendingDown, AlertTriangle, Award, Info } from 'lucide-react';

export interface Insight {
  id: string;
  type: 'growth' | 'decline' | 'warning' | 'achievement' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high';
  category?: string;
}

interface InsightCardProps {
  insights: Insight[];
  maxDisplay?: number;
}

const INSIGHT_ICONS = {
  growth: TrendingUp,
  decline: TrendingDown,
  warning: AlertTriangle,
  achievement: Award,
  info: Info
};

const INSIGHT_COLORS = {
  growth: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '#22c55e' },
  decline: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '#f59e0b' },
  achievement: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', icon: '#a855f7' },
  info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '#3b82f6' }
};

const INSIGHT_EMOJIS = {
  growth: '🚀',
  decline: '📉',
  warning: '⚠️',
  achievement: '🏆',
  info: '💡'
};

export function InsightCard({ insights, maxDisplay = 10 }: InsightCardProps) {
  const displayInsights = insights.slice(0, maxDisplay);

  if (insights.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">💡 Otomatik İçgörüler</h3>
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          <Info size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Analiz için yeterli veri yok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">💡 Otomatik İçgörüler</h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '8px 0'
      }}>
        {displayInsights.map((insight, index) => {
          const Icon = INSIGHT_ICONS[insight.type];
          const colors = INSIGHT_COLORS[insight.type];
          const emoji = INSIGHT_EMOJIS[insight.type];

          return (
            <div
              key={insight.id || index}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 16px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                alignItems: 'flex-start',
                transition: 'all 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.border}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '1.5rem',
                lineHeight: 1,
                flexShrink: 0
              }}>
                {emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <Icon size={16} style={{ color: colors.icon, flexShrink: 0 }} />
                  {insight.category && (
                    <span style={{
                      fontSize: '0.7rem',
                      color: colors.icon,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {insight.category}
                    </span>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)'
                }}>
                  {insight.message}
                </p>
              </div>
              {insight.severity === 'high' && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: colors.icon,
                  flexShrink: 0,
                  marginTop: '6px',
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </div>
          );
        })}
      </div>
      {insights.length > maxDisplay && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px'
        }}>
          +{insights.length - maxDisplay} daha fazla içgörü
        </div>
      )}
    </div>
  );
}
