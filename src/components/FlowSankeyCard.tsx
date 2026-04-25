import { SankeyDiagram } from './SankeyDiagram';

interface SankeyNode {
  name: string;
  color?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface FlowSankeyCardProps {
  title: string;
  subtitle?: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
  formatValue: (value: number) => string;
}

export function FlowSankeyCard({
  title,
  subtitle,
  nodes,
  links,
  height = 360,
  formatValue,
}: FlowSankeyCardProps) {
  return (
    <div className="chart-grid">
      <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="chart-title">{title}</h3>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {subtitle}
          </p>
        )}
        <SankeyDiagram
          nodes={nodes}
          links={links}
          height={height}
          formatValue={formatValue}
        />
      </div>
    </div>
  );
}