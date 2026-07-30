// Turkish period labels shared across templates so cards/badges read
// "Mayıs 2026" instead of the raw "2026-05-01 00:00:00" the API returns.
const MONTHS_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTH_ABBR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** "2026-05-01 00:00:00" | "2026-05" -> "Mayıs 2026"; a bare "2026" -> "2026". */
export function formatPeriod(raw: unknown): string {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const ay = Number(m[2]);
    return ay >= 1 && ay <= 12 ? `${MONTHS_FULL[ay - 1]} ${m[1]}` : m[1];
  }
  const y = s.match(/^\d{4}$/);
  return y ? s : s;
}
