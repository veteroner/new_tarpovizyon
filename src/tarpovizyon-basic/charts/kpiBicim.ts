const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

/* Sayı biçimi — bileşen dosyasından ayrıldı ki hızlı yenileme çalışsın. */
export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${numberFmt.format(value / 1e9)} Mr`;
  if (abs >= 1e6) return `${numberFmt.format(value / 1e6)} Mn`;
  if (abs >= 1e3) return `${numberFmt.format(value / 1e3)} B`;
  return numberFmt.format(value);
}
