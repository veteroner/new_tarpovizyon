import { VERI_SURUM } from '../services/d1';
const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

export type Row = Record<string, string | number | null>;

export async function fetchRows(endpoint: string, params: Record<string, string> = {}): Promise<Row[]> {
  const url = new URL(`${API_BASE}/api/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  /* Veri sürümü — Pro tarafıyla aynı gerekçe: Worker yanıtları bir saat
     önbellekleniyor, yeni veri yazıldığında tarayıcı eski gövdeyi sunmaya
     devam ediyor. Sürüm URL'de olunca yeni kaynak sayılıyor.
     Bkz. services/d1.ts → VERI_SURUM. */
  url.searchParams.set('_v', String(VERI_SURUM));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TarpoVizyon Basic API hata: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}
