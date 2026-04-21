/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState, useMemo } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

export interface SankeyNodeInput {
  name: string;
  color?: string;
}

export interface SankeyLinkInput {
  source: number;
  target: number;
  value: number;
}

interface Props {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  height?: number;
  formatValue?: (v: number) => string;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
  '#14b8a6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa',
];

function defaultFmt(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

export function SankeyDiagram({ nodes, links, height = 380, formatValue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { computedNodes, computedLinks } = useMemo(() => {
    if (!nodes || !links || !nodes.length || !links.length || width < 100) {
      return { computedNodes: [], computedLinks: [] };
    }
    try {
      const positiveLinks = links.filter(l => l.value > 0);
      if (!positiveLinks.length) return { computedNodes: [], computedLinks: [] };

      const gen = (sankey as any)()
        .nodeId((d: any) => d._idx)
        .nodeWidth(20)
        .nodePadding(16)
        .extent([[1, 5], [width - 1, height - 5]]);

      const graph = gen({
        nodes: nodes.map((n, i) => ({ ...n, _idx: i })),
        links: positiveLinks.map(l => ({ ...l })),
      });
      return { computedNodes: graph.nodes as any[], computedLinks: graph.links as any[] };
    } catch {
      return { computedNodes: [], computedLinks: [] };
    }
  }, [nodes, links, width, height]);

  const pathGen = sankeyLinkHorizontal();
  const fmt = formatValue ?? defaultFmt;

  if (width < 10) return <div ref={containerRef} style={{ width: '100%', height }} />;
  if (!computedNodes.length) return (
    <div ref={containerRef} style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
      Yükleniyor...
    </div>
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          {computedLinks.map((link: any, i: number) => {
            const srcIdx = typeof link.source === 'object' ? link.source._idx : link.source;
            const nodeColor = nodes[srcIdx]?.color || COLORS[srcIdx % COLORS.length];
            return (
              <linearGradient key={i} id={`sk-g-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={nodeColor} stopOpacity={0.65} />
                <stop offset="100%" stopColor={nodeColor} stopOpacity={0.25} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Links */}
        {computedLinks.map((link: any, i: number) => (
          <path
            key={i}
            d={(pathGen as any)(link) || ''}
            fill="none"
            stroke={`url(#sk-g-${i})`}
            strokeWidth={Math.max(1, link.width || 1)}
          />
        ))}

        {/* Nodes */}
        {computedNodes.map((node: any, i: number) => {
          const nodeColor = node.color || COLORS[i % COLORS.length];
          const nodeH = Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0));
          const midY = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;
          const isLeft = ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2 < width / 2;
          const labelX = isLeft ? (node.x1 ?? 0) + 8 : (node.x0 ?? 0) - 8;
          const anchor = isLeft ? 'start' : 'end';
          const showValue = nodeH > 22;

          return (
            <g key={i}>
              <rect
                x={node.x0 ?? 0}
                y={node.y0 ?? 0}
                width={Math.max(1, (node.x1 ?? 0) - (node.x0 ?? 0))}
                height={nodeH}
                fill={nodeColor}
                rx={3}
                opacity={0.9}
              />
              <text
                x={labelX}
                y={showValue ? midY - 7 : midY}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--text-primary)"
              >
                {node.name.length > 20 ? node.name.slice(0, 19) + '…' : node.name}
              </text>
              {showValue && (
                <text
                  x={labelX}
                  y={midY + 8}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--text-secondary)"
                >
                  {fmt(node.value ?? 0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
