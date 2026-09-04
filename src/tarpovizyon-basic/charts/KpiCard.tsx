
const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });


export function KpiCard({
  label,
  value,
  suffix,
  period,
  changePct,
  changeLabel = 'Önceki döneme göre',
}: {
  label: string;
  value: string;
  suffix?: string;
  /** Reference period the value belongs to, e.g. "Mayıs 2026" — so the reader
   *  can tell which month the figure is and whether it's current. */
  period?: string;
  changePct?: number | null;
  changeLabel?: string;
}) {
  const hasChange = changePct !== undefined && changePct !== null && Number.isFinite(changePct);
  const positive = hasChange && (changePct as number) >= 0;
  return (
    <div className="tvb-kpi">
      <div className="tvb-kpi__label">{label}</div>
      {period && <div className="tvb-kpi__period">{period}</div>}
      <div className="tvb-kpi__value">
        {value}
        {suffix && <span className="tvb-kpi__suffix"> {suffix}</span>}
      </div>
      {hasChange && (
        <div className={`tvb-kpi__change ${positive ? 'tvb-kpi__change--up' : 'tvb-kpi__change--down'}`}>
          {positive ? '▲' : '▼'} {numberFmt.format(Math.abs(changePct as number))}% {changeLabel}
        </div>
      )}
    </div>
  );
}
