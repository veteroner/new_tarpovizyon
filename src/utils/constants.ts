/**
 * Shared constants for the Tarpovizyon dashboard
 */

/* ── Turkish Month Names ── */
export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;
export const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;

/* ── SQL-safe backtick-escaped Turkish month columns ── */
export const MONTH_COLS_SQL = MONTHS_TR.map(m => `\`${m}\``);
export const MONTH_COLS_SQL_STR = MONTH_COLS_SQL.join(', ');

/* ── AVG-12 expression for price index queries ── */
export const AVG12_SQL = `(${MONTH_COLS_SQL.join(' + ')}) / 12`;

/* ── urundenge year columns ── */
export const URUNDENGE_YEAR_COLS = [
  'y2000/01', 'y2001/02', 'y2002/03', 'y2003/04', 'y2004/05',
  'y2005/06', 'y2006/07', 'y2007/08', 'y2008/09', 'y2009/10',
  'y2010/11', 'y2011/12', 'y2012/13', 'y2013/14', 'y2014/15',
  'y2015/16', 'y2016/17', 'y2017/18', 'y2018/19', 'y2019/20',
  'y2020/21', 'y2021/22', 'y2022/23', 'y2023/24',
] as const;

/* ── Color palettes ── */
export const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9',
] as const;

export const HEATMAP_COLORS = {
  low: '#dcfce7',
  mid: '#fef9c3',
  high: '#fee2e2',
  veryHigh: '#fca5a5',
} as const;

/* ── Risk thresholds ── */
export const SUFFICIENCY_THRESHOLDS = { critical: 80, warning: 100 } as const;
export const IMPORT_DEP_THRESHOLD = 30; // percent
export const HHI_THRESHOLDS = { moderate: 1500, concentrated: 2500 } as const;
