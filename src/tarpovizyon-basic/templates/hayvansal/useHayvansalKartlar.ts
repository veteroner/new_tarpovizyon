import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../../api';

/**
 * Kart ve detayların ortak veri kaynağı.
 *
 * İki uç yetiyor:
 *   `tr/hayvan-varliklari`   → hayvan SAYISI serisi (sığır/manda/koyun/keçi)
 *   `oner/hayvansal-urun-uretimi` → ÜRETİM serisi (kırmızı et, süt, yumurta,
 *                                    kanatlı, bal)
 *
 * İkisi de yıllık ve `tarih`/`yillar` alanında YYYY ile başlıyor; tek bir
 * `yil` alanına indirgenip birleştiriliyor ki kartlar tek biçimde çalışsın.
 */

export type YilSatiri = Record<string, number | string | null> & { yil: number };

const yilAl = (v: unknown) => Number(String(v ?? '').slice(0, 4));

function seriyeCevir(satirlar: Record<string, string | number | null>[], tarihAlani: string): YilSatiri[] {
  return satirlar
    .map((r) => ({ ...r, yil: yilAl(r[tarihAlani]) }))
    .filter((r) => Number.isFinite(r.yil) && r.yil > 1900)
    .sort((a, b) => a.yil - b.yil) as YilSatiri[];
}

export function useHayvansalKartlar() {
  const varlik = useQuery({
    queryKey: ['tvb-hayvan-varliklari'],
    queryFn: () => fetchRows('tr/hayvan-varliklari', { limit: '500' }),
  });

  const uretim = useQuery({
    queryKey: ['tvb-hayvansal-uretim'],
    queryFn: () => fetchRows('oner/hayvansal-urun-uretimi', { limit: '200' }),
  });

  return {
    yukleniyor: varlik.isLoading || uretim.isLoading,
    varlik: varlik.data ? seriyeCevir(varlik.data, 'tarih') : [],
    uretim: uretim.data ? seriyeCevir(uretim.data, 'yillar') : [],
  };
}

/** Bir kart için TÜİK fiyat serisi (aylık). */
export function useFiyatSerisi(urunler: string[] | undefined) {
  return useQuery({
    enabled: !!urunler?.length,
    queryKey: ['tvb-madde-fiyat', urunler?.join('|')],
    queryFn: async () => {
      const parcalar = await Promise.all(
        (urunler ?? []).map((u) => fetchRows('tuik/madde-fiyat', { urun: u, limit: '2000' })),
      );
      return parcalar.flat();
    },
  });
}
