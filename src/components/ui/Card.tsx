import './card.css';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Tek kart katmanı.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Panoda iki paralel kart sistemi yaşıyordu: 311 `.chart-card` + 188
 * `.kpi-card` sınıfı, ama YANINDA ~650 kart satır içi stille elle yapılmıştı
 * (328 `background: var(--bg-card)`, 320 `borderRadius`). Yani kartların
 * yaklaşık yarısı sınıfsızdı ve her sayfa kendi kartını yeniden icat
 * ediyordu — "yamalı bohça" görüntüsünün ana kaynağı buydu.
 *
 * Ayrıca satır içi stiller CSS'i ezdiği için mobil düzen katmanı her kuralda
 * `!important` kullanmak zorunda kalmıştı. Kartlar buraya taşındıkça o
 * zorunluluk da ortadan kalkıyor.
 */

type Aralik = 'yok' | 'dar' | 'normal' | 'genis';

const PADDING: Record<Aralik, number> = { yok: 0, dar: 12, normal: 20, genis: 28 };

export type CardProps = {
  children: ReactNode;
  /** Izgarada kaç sütun kaplasın (mobilde katman zaten sıfırlıyor). */
  span?: number;
  aralik?: Aralik;
  className?: string;
  style?: CSSProperties;
};

export function Card({ children, span, aralik = 'normal', className = '', style }: CardProps) {
  return (
    <div
      className={`ui-card ${className}`.trim()}
      style={{
        padding: PADDING[aralik],
        ...(span ? { gridColumn: `span ${span}` } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type ChartCardProps = {
  /** Başlık. Emoji YAZMA — ikon için `icon` kullan (bkz. no-emoji-icons). */
  title: ReactNode;
  /** Başlığın solundaki ikon (lucide bileşeni). */
  icon?: ReactNode;
  /** Başlığın sağındaki eylem — genelde <ChartInsightButton />. */
  action?: ReactNode;
  /** Başlığın altındaki açıklama/kaynak notu. */
  note?: ReactNode;
  children: ReactNode;
  span?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Grafik kartı.
 *
 * Bu kalıp kod tabanında ~300 kez elle tekrarlanıyordu:
 *
 *   <div className="chart-card">
 *     <div style={{display:'flex',alignItems:'center',
 *                  justifyContent:'space-between',marginBottom:8}}>
 *       <h3 className="chart-title" style={{marginBottom:0}}>…</h3>
 *       <ChartInsightButton … />
 *     </div>
 *     …
 *   </div>
 *
 * Dört satırlık şablonun 300 kopyası, aralarında küçük farklarla (kimi 8px
 * kimi 12px boşluk, kimi `alignItems` yok) — tutarsızlığın tam olarak
 * üretildiği yer burasıydı.
 */
export function ChartCard({
  title, icon, action, note, children, span, className = '', style,
}: ChartCardProps) {
  return (
    <div
      className={`ui-card ui-chart-card ${className}`.trim()}
      style={{ ...(span ? { gridColumn: `span ${span}` } : null), ...style }}
    >
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          {icon && <span className="ui-card-icon" aria-hidden="true">{icon}</span>}
          {title}
        </h3>
        {action && <div className="ui-card-action">{action}</div>}
      </div>
      {note && <p className="ui-card-note">{note}</p>}
      {children}
    </div>
  );
}

/** İstatistik kartının vurgusu — ham hex yerine anlamsal ton. */
export type Ton = 'notr' | 'birincil' | 'olumlu' | 'olumsuz' | 'uyari' | 'bilgi';

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Değerin altındaki küçük açıklama (dönem, birim, kaynak). */
  sub?: ReactNode;
  /** Yüzde değişim. Pozitif/negatif rengi ve oku buradan gelir. */
  delta?: number;
  /** Artışın İYİ olmadığı ölçüler için (ör. maliyet, ithalat). */
  deltaTersi?: boolean;
  ton?: Ton;
  icon?: ReactNode;
  span?: number;
  className?: string;
};

/**
 * KPI kartı.
 *
 * `delta` verildiğinde yön oku + renk otomatik. `deltaTersi` maliyet/ithalat
 * gibi ARTIŞIN KÖTÜ olduğu ölçüler için: yeşil/kırmızı anlamı ters çevriliyor.
 * Renk tek başına anlam taşımasın diye ok işareti de basılıyor (color-not-only).
 */
export function StatCard({
  label, value, sub, delta, deltaTersi = false, ton = 'notr', icon, span, className = '',
}: StatCardProps) {
  const iyi = delta === undefined ? null : (deltaTersi ? delta < 0 : delta > 0);
  return (
    <div
      className={`ui-card ui-stat-card ui-ton-${ton} ${className}`.trim()}
      style={span ? { gridColumn: `span ${span}` } : undefined}
    >
      <div className="ui-stat-head">
        <span className="ui-stat-label">{label}</span>
        {icon && <span className="ui-stat-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="ui-stat-value">{value}</div>
      {(sub || delta !== undefined) && (
        <div className="ui-stat-foot">
          {delta !== undefined && (
            <span className={`ui-delta ${iyi ? 'is-iyi' : 'is-kotu'}`}>
              {/* Ok işareti: renk tek başına anlam taşımamalı. */}
              <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}</span>
              {' '}%{Math.abs(delta).toFixed(1)}
            </span>
          )}
          {sub && <span className="ui-stat-sub">{sub}</span>}
        </div>
      )}
    </div>
  );
}
