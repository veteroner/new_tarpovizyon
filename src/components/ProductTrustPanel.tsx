import './ProductTrustPanel.css';

type TrustTone = 'high' | 'medium' | 'low';

interface ProductTrustPanelProps {
  title: string;
  summary: string;
  score: number;
  tone: TrustTone;
  badges?: string[];
  bullets?: string[];
  sources?: string[];
}

const toneLabels: Record<TrustTone, string> = {
  high: 'Yuksek guven',
  medium: 'Orta guven',
  low: 'Dusuk guven',
};

export default function ProductTrustPanel({
  title,
  summary,
  score,
  tone,
  badges = [],
  bullets = [],
  sources = [],
}: ProductTrustPanelProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <section className={`trust-panel trust-panel--${tone}`} aria-label={title}>
      <div className="trust-panel__header">
        <div>
          <p className="trust-panel__eyebrow">Karar Destegi Seviyesi</p>
          <h3 className="trust-panel__title">{title}</h3>
        </div>
        <div className="trust-panel__scorebox">
          <strong>{safeScore}/100</strong>
          <span>{toneLabels[tone]}</span>
        </div>
      </div>

      <div className="trust-panel__meter" aria-hidden="true">
        <div className="trust-panel__meter-fill" style={{ width: `${safeScore}%` }} />
      </div>

      <p className="trust-panel__summary">{summary}</p>

      {badges.length > 0 && (
        <div className="trust-panel__badges">
          {badges.map((badge) => (
            <span key={badge} className="trust-panel__badge">{badge}</span>
          ))}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className="trust-panel__list">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}

      {sources.length > 0 && (
        <div className="trust-panel__sources">
          <strong>Veri ve yontem</strong>
          <div className="trust-panel__badges">
            {sources.map((source) => (
              <span key={source} className="trust-panel__badge trust-panel__badge--source">{source}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}