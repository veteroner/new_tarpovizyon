import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
  large?: boolean;
}

export function KPICard({ title, value, subtitle, icon: Icon, color = 'blue', large = false }: KPICardProps) {
  return (
    <div className={`kpi-card ${large ? 'large' : ''}`}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {!large && (
          <div className={`kpi-icon ${color}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
}
