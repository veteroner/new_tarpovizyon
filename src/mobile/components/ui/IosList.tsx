import { yuzde } from '../../../utils/sayi';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * iOS gruplu liste bileşenleri.
 *
 * Mobilde kenar çubuğu yok — gezinme "gruplu liste görünümü" ile yapılıyor:
 * her satırda ad, güncel değer ve chevron. Kullanıcı sayfayı AÇMADAN önce
 * değeri görüyor; masaüstündeki menüde bu bilgi yoktu.
 *
 * Dokunma hedefi satırın tamamı (min 44 pt). İkon 28 px ama tıklanabilir alan
 * satır boyunca uzanıyor — HIG'in "pixel-perfect tap gerekmesin" kuralı.
 */

export function NavBar({
  title, subtitle, onBack, backLabel,
}: {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="ios-nav">
      {onBack && (
        <button type="button" className="ios-back" onClick={onBack}>
          <ChevronLeft size={19} strokeWidth={2.4} aria-hidden="true" />
          {backLabel ?? 'Geri'}
        </button>
      )}
      <h1 className="ios-title">{title}</h1>
      {subtitle && <p className="ios-subtitle">{subtitle}</p>}
    </div>
  );
}

export function ListGroup({ header, children }: { header?: string; children: ReactNode }) {
  return (
    <>
      {header && <div className="ios-group-header">{header}</div>}
      <div className="ios-group">{children}</div>
    </>
  );
}

export function ListRow({
  icon, iconColor, title, subtitle, value, onClick, showChevron = true,
}: {
  icon?: ReactNode;
  /** Kategori KİMLİĞİ rengi — vurgu rengi değil. */
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  const Etiket = onClick ? 'button' : 'div';
  return (
    <Etiket
      className={`ios-row${icon ? ' has-icon' : ''}`}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {icon && (
        <span className="ios-row-icon" style={{ background: iconColor ?? 'var(--ios-tint)' }}
          aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ios-row-text">
        {title}
        {subtitle && <span className="ios-row-sub">{subtitle}</span>}
      </span>
      {value !== undefined && <span className="ios-row-value">{value}</span>}
      {onClick && showChevron && (
        <ChevronRight className="ios-chev" size={13} strokeWidth={2.6} aria-hidden="true" />
      )}
    </Etiket>
  );
}

/**
 * Sayı kartı.
 *
 * `delta` verildiğinde yön oku + renk otomatik. Ok işareti renkten bağımsız
 * anlam taşıyor (renk körlüğü). `deltaTersi` maliyet/ithalat gibi ARTIŞIN
 * KÖTÜ olduğu ölçüler için.
 */
export function StatTile({
  label, value, delta, deltaTersi = false, sub,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  deltaTersi?: boolean;
  sub?: ReactNode;
}) {
  const iyi = delta === undefined ? null : (deltaTersi ? delta < 0 : delta > 0);
  return (
    <div className="ios-tile">
      <div className="ios-tile-label">{label}</div>
      <div className="ios-tile-value">{value}</div>
      {delta !== undefined && (
        <div className={`ios-tile-delta ${iyi ? 'ios-up' : 'ios-down'}`}>
          <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}</span>
          {' '}{yuzde(Math.abs(delta), 1)}
        </div>
      )}
      {sub && <div className="ios-tile-delta" style={{ color: 'var(--ios-label-3)', fontWeight: 400 }}>{sub}</div>}
    </div>
  );
}

export function TileRow({ children }: { children: ReactNode }) {
  return <div className="ios-tiles">{children}</div>;
}

/** Segment kontrolü — iOS'un kendi zaman aralığı seçicisi. */
export function Segmented<T extends string>({
  options, value, onChange, label,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="ios-segment" role="tablist" aria-label={label ?? 'Aralık'}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChartTile({
  title, action, children, stripLabel, strip,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Türetilmiş seri şeridinin başlığı. */
  stripLabel?: string;
  strip?: ReactNode;
}) {
  return (
    <div className="ios-chart-card">
      <div className="ios-chart-head">
        <span className="ios-chart-title">{title}</span>
        {action}
      </div>
      {children}
      {/*
        * Türetilmiş seri (değişim %, denge, oran) ANA GRAFİĞİN ALTINDA ayrı
        * şeritte. İkinci bir y ekseni kullanmak iki ölçeğin keyfi hizası
        * yüzünden veride olmayan bir kesişme uyduruyor.
        */}
      {strip && (
        <>
          {stripLabel && <div className="ios-strip-label">{stripLabel}</div>}
          {strip}
        </>
      )}
    </div>
  );
}
