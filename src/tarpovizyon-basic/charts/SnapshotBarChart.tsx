import { HorizontalRankBar } from './HorizontalRankBar';

export type SnapshotBarItem = { name: string; value: number };

/** Horizontal bar chart used for "Alt Gruplara Göre ... Değişim Oranı" snapshots —
 *  one bar per category, sorted descending (largest at top), with the overall/
 *  reference category (e.g. "Tarım-ÜFE", "TÜFE (Genel Endeks)") highlighted. */
export function SnapshotBarChart({
  items,
  referenceName,
}: {
  items: SnapshotBarItem[];
  referenceName?: string;
}) {
  return <HorizontalRankBar items={items} highlightName={referenceName} />;
}
