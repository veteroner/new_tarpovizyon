const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${numberFmt.format(value / 1e9)} Mr`;
  if (abs >= 1e6) return `${numberFmt.format(value / 1e6)} Mn`;
  if (abs >= 1e3) return `${numberFmt.format(value / 1e3)} B`;
  return numberFmt.format(value);
}

export function KpiCard({
  label,
  value,
  suffix,
  changePct,
  changeLabel = 'Önceki döneme göre',
}: {
  label: string;
  value: string;
  suffix?: string;
  changePct?: number | null;
  changeLabel?: string;
}) {
  const hasChange = changePct !== undefined && changePct !== null && Number.isFinite(changePct);
  const positive = hasChange && (changePct as number) >= 0;
  return (
    <div className="tvb-kpi">
      <div className="tvb-kpi__label">{label}</div>
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
