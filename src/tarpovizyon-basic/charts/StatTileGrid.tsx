const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export type StatTile = { label: string; value: number | null; unit?: string; changePct?: number | null };

export function StatTileGrid({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="tvb-tiles">
      {tiles.map((t) => {
        const hasChange = t.changePct !== undefined && t.changePct !== null && Number.isFinite(t.changePct);
        const positive = hasChange && (t.changePct as number) >= 0;
        return (
          <div key={t.label} className="tvb-tile">
            <div className="tvb-tile__label">{t.label}</div>
            <div className="tvb-tile__value">
              {t.value === null || t.value === undefined ? '—' : numberFmt.format(t.value)}
              {t.unit && <span className="tvb-tile__unit"> {t.unit}</span>}
            </div>
            {hasChange && (
              <div className={`tvb-tile__change ${positive ? 'tvb-tile__change--up' : 'tvb-tile__change--down'}`}>
                {positive ? '▲' : '▼'} {numberFmt.format(Math.abs(t.changePct as number))}% geçen aya göre
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
