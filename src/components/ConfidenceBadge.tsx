
interface ConfidenceBadgeProps {
  /** 0-100 aralığında güven skoru */
  score: number;
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * Güven skoru rozet bileşeni.
 * ≥70 → yeşil, ≥40 → sarı, <40 → kırmızı
 */
export function ConfidenceBadge({ score, label, size = 'md' }: ConfidenceBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const color =
    clamped >= 70 ? { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', text: '#166534', emoji: '🟢' } :
    clamped >= 40 ? { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#92400e', emoji: '🟡' } :
                   { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', text: '#991b1b', emoji: '🔴' };

  const pad   = size === 'sm' ? '2px 8px'   : '4px 12px';
  const fsize = size === 'sm' ? '0.72rem'   : '0.82rem';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: pad, borderRadius: '999px',
      background: color.bg, border: `1px solid ${color.border}`,
      color: color.text, fontSize: fsize, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {color.emoji} {label ?? 'Güven'}: %{clamped}
    </span>
  );
}

export default ConfidenceBadge;
