import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendComparisonProps {
  currentValue: number;
  previousValue: number;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function TrendComparison({
  currentValue,
  previousValue,
  label,
  showIcon = true,
  className = '',
}: TrendComparisonProps) {
  const percentChange = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : null;

  const isPositive = percentChange !== null && percentChange > 0;
  const isNegative = percentChange !== null && percentChange < 0;

  const getTrendColor = () => {
    if (isPositive) return 'var(--success)';
    if (isNegative) return 'var(--error)';
    return 'var(--text-muted)';
  };

  const getTrendIcon = () => {
    if (!showIcon) return null;
    if (isPositive) return <TrendingUp size={16} />;
    if (isNegative) return <TrendingDown size={16} />;
    return <Minus size={16} />;
  };

  const formatPercentage = () => {
    if (percentChange === null) return 'N/A';
    const sign = isPositive ? '+' : '';
    return `${sign}${percentChange.toFixed(1)}%`;
  };

  return (
    <div className={`trend-comparison ${className}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: isPositive 
        ? 'rgba(16, 185, 129, 0.1)' 
        : isNegative 
        ? 'rgba(239, 68, 68, 0.1)' 
        : 'var(--bg-primary)',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      color: getTrendColor(),
      border: `1px solid ${getTrendColor()}20`,
    }}>
      {getTrendIcon()}
      <span>{formatPercentage()}</span>
      {label && (
        <span style={{ 
          fontSize: '11px', 
          fontWeight: 400,
          color: 'var(--text-secondary)',
          marginLeft: '4px'
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

interface TrendCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  currentLabel?: string;
  previousLabel?: string;
  formatter?: (value: number) => string;
  icon?: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  color?: string;
}

export function TrendCard({
  title,
  currentValue,
  previousValue,
  currentLabel = 'Güncel',
  previousLabel = 'Önceki',
  formatter = (val) => val.toLocaleString(),
  icon: Icon,
  color = 'blue',
}: TrendCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h4>
        {Icon && (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `var(--${color})20`,
            color: `var(--${color})`
          }}>
            <Icon size={20} style={{}} />
          </div>
        )}
      </div>

      {/* Current Value */}
      <div style={{
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '4px',
          fontWeight: 500
        }}>
          {currentLabel}
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-primary)'
        }}>
          {formatter(currentValue)}
        </div>
      </div>

      {/* Comparison */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            {previousLabel}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            {formatter(previousValue)}
          </div>
        </div>

        <TrendComparison
          currentValue={currentValue}
          previousValue={previousValue}
        />
      </div>
    </div>
  );
}
