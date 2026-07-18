import { HorizontalRankBar } from './HorizontalRankBar';
import { ProportionBar } from './ProportionBar';

const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#f59e0b', '#7c3aed', '#0ea5e9', '#65a30d', '#db2777', '#6b7280'];

export type RankingItem = { name: string; value: number };

export function RankingBlock({ items, topN = 10 }: { items: RankingItem[]; topN?: number }) {
  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);

  // A pie/donut here regularly turned into one giant "Diğer" wedge with 5
  // real categories squeezed into unreadable, untappable slivers (e.g. top
  // 5-of-83 provinces). A 100%-stacked bar keeps every segment legible even
  // when thin, and the legend always states the exact percentage — matching
  // the "avoid pie/donut for >5 categories" guidance instead of fighting it.
  const proportionData = (() => {
    const topFew = sorted.slice(0, 5);
    const otherSum = sorted.slice(5).reduce((s, i) => s + i.value, 0);
    const data = topFew.map((i, idx) => ({ name: i.name, value: i.value, color: COLORS[idx % COLORS.length] }));
    if (otherSum > 0) data.push({ name: 'Diğer', value: otherSum, color: '#94a3b8' });
    return data;
  })();

  return (
    <div className="tvb-ranking">
      <div className="tvb-ranking__chart">
        <h3>İlk {top.length}</h3>
        <HorizontalRankBar items={top} />
      </div>
      <div className="tvb-ranking__chart">
        <h3>Oran (%)</h3>
        <ProportionBar items={proportionData} />
      </div>
    </div>
  );
}
