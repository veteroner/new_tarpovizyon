// TarpoVizyon veri erişimi — Cloudflare D1 (Worker) istemcisi.
//
// Eskiden sayfalar `fetchQuery(sql)` ile tarayıcıdan ham SQL gönderiyordu
// (dersbende.com/api.php → MySQL). Artık veri D1'de ve Worker yalnızca
// izin verilen rota/sütunları kabul ediyor; SQL tarayıcıda kurulmuyor.
//
// İki tür uç var:
//   fetchRows  — tablo okuma  : /api/<rota>?<filtre>=<değer>&limit=
//   fetchAgg   — toplama      : /api/agg/<rota>?groupBy=…&sum=…&f_<sütun>=…

const API_BASE = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

export type Row = Record<string, string | number | null>;

type ParamValue = string | number | undefined | null;

function buildUrl(path: string, params: Record<string, ParamValue> = {}): string {
  const url = new URL(`${API_BASE}/api/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function getJson(url: string): Promise<{ data?: Row[]; error?: string; count?: number }> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.error) {
    throw new Error(body?.error ? String(body.error) : `D1 API hatası: ${res.status}`);
  }
  return body;
}

/** Tablo okuma ucu. Filtreler rotanın izin verdiği sütunlarla sınırlıdır. */
export async function fetchRows(path: string, params: Record<string, ParamValue> = {}): Promise<Row[]> {
  const body = await getJson(buildUrl(path, params));
  return body.data ?? [];
}

export type AggQuery = {
  /** Sonuçta yer alacak boyut sütunları (gruplamaya da eklenir). */
  select?: string[];
  groupBy?: string[];
  sum?: string[];
  avg?: string[];
  min?: string[];
  max?: string[];
  countDistinct?: string[];
  /** COUNT(*) sütunu ("cnt") ekler. */
  count?: boolean;
  /** Eşitlik filtreleri: { year: 2023, ulkead: 'Türkiye' }. */
  where?: Record<string, ParamValue>;
  /** Eşit-değil filtreleri: { sektorkod: 'C' } → sektorkod != 'C'. */
  whereNot?: Record<string, ParamValue>;
  /** Büyük-eşit / küçük-eşit filtreleri: { yil: 2010 }. */
  whereGte?: Record<string, ParamValue>;
  whereLte?: Record<string, ParamValue>;
  /** Bu sütunlar için "> 0" koşulu — MySQL'deki CAST(x)>0 karşılığı. */
  positive?: string[];
  /**
   * Kıta/gelir grubu gibi toplam satırlarını dışla. Frontend'de iki ayrı
   * EXCLUDED_AREAS listesi vardı; sunucuda v1/v2 olarak duruyorlar, sayfa
   * hangisini kullanıyorsa onu geçirmeli (davranış birebir korunuyor).
   */
  exclude?: { preset: 'v1' | 'v2'; col: string };
  /** Üretilen takma adlardan biri: 'sum_uretim_deger', 'cd_ulkead', 'cnt'… */
  orderBy?: string;
  dir?: 'asc' | 'desc';
  limit?: number;
};

/** Toplama ucu. Sonuç alanları: sum_/avg_/min_/max_/cd_ önekli + boyut sütunları. */
export async function fetchAgg(route: string, q: AggQuery): Promise<Row[]> {
  const params: Record<string, ParamValue> = {
    select: q.select?.join(','),
    groupBy: q.groupBy?.join(','),
    sum: q.sum?.join(','),
    avg: q.avg?.join(','),
    min: q.min?.join(','),
    max: q.max?.join(','),
    countDistinct: q.countDistinct?.join(','),
    count: q.count ? '1' : undefined,
    positive: q.positive?.join(','),
    exclude: q.exclude ? `${q.exclude.preset}:${q.exclude.col}` : undefined,
    orderBy: q.orderBy,
    dir: q.dir,
    limit: q.limit,
  };
  for (const [k, v] of Object.entries(q.where ?? {})) params[`f_${k}`] = v;
  for (const [k, v] of Object.entries(q.whereNot ?? {})) params[`fn_${k}`] = v;
  for (const [k, v] of Object.entries(q.whereGte ?? {})) params[`fge_${k}`] = v;
  for (const [k, v] of Object.entries(q.whereLte ?? {})) params[`fle_${k}`] = v;
  const body = await getJson(buildUrl(`agg/${route}`, params));
  return body.data ?? [];
}

/** Sayısal alanları güvenle okumak için — API string de dönebilir. */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}
