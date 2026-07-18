export function GaugeChart({
  label,
  percent,
  displayText,
  scaleLabels,
  neutral,
}: {
  label: string;
  percent: number;
  displayText?: string;
  scaleLabels?: [string, string];
  /** Red/orange/green only makes sense for a target ratio (e.g. "Yeterlilik
   *  Oranı" — 100%+ self-sufficiency is genuinely good). Plain magnitude
   *  gauges (consumption amounts, share-of-total %) have no "bad" reading —
   *  a 24kg meat-consumption gauge landing under the 70% mark of its 0–50
   *  display scale isn't a problem, so judgment coloring there is just
   *  misleading. Pass `neutral` to use one consistent brand color instead. */
  neutral?: boolean;
}) {
  const clamped = Math.max(0, Math.min(150, percent));
  const angle = Math.min(180, (clamped / 100) * 180);
  const r = 80;
  const cx = 100;
  const cy = 90;
  const rad = (Math.PI * angle) / 180;
  const x = cx - r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);
  const color = neutral ? '#2563eb' : percent >= 100 ? '#16a34a' : percent >= 70 ? '#f59e0b' : '#dc2626';
  const [minLabel, maxLabel] = scaleLabels ?? ['%0', '%100+'];

  return (
    <div className="tvb-gauge">
      <div className="tvb-gauge__label">{label}</div>
      <svg viewBox="0 0 200 110" width="100%" height="140">
        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#e5e7eb" strokeWidth={16} strokeLinecap="round" />
        <path
          d={`M 20 90 A 80 80 0 0 1 ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
        />
        <text x="100" y="80" textAnchor="middle" fontSize="28" fontWeight={700} fill="#1a1a2e">
          {displayText ?? `%${Math.round(percent)}`}
        </text>
        <text x="20" y="105" fontSize="11" fill="#6b7280">{minLabel}</text>
        <text x="180" y="105" fontSize="11" fill="#6b7280" textAnchor="end">{maxLabel}</text>
      </svg>
    </div>
  );
}
