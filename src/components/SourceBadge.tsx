
interface SourceBadgeProps {
  source: string;
  revision?: string;
  size?: 'sm' | 'md';
}

/**
 * Veri kaynağı ve revizyon tarihini gösteren rozet.
 */
export function SourceBadge({ source, revision, size = 'md' }: SourceBadgeProps) {
  const pad   = size === 'sm' ? '2px 8px'   : '4px 12px';
  const fsize = size === 'sm' ? '0.70rem'   : '0.80rem';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: pad, borderRadius: '999px',
      background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6',
      color: '#1d4ed8', fontSize: fsize, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      📚 {source}{revision ? ` · ${revision}` : ''}
    </span>
  );
}

export default SourceBadge;
