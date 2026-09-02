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
    /*
     * Donmuş ikizden çıkıldı. Bu satır BASIC tarafındaydı — Pro taranırken
     * çıktı: `oner_hayvansal_urun_uretimi` hiçbir senkron işinin yazmadığı
     * kopya ve dönem sütunu bile yok. `tr_hayvansal_urun_uretimi` günlük
     * beslenen tablo ve 2025'te; yıl sütunu `yillar` değil `yil`.
     */
    queryFn: () => fetchRows('tr/hayvansal-urun-uretimi', { limit: '200' }),
  });

  return {
    yukleniyor: varlik.isLoading || uretim.isLoading,
    varlik: varlik.data ? seriyeCevir(varlik.data, 'tarih') : [],
    uretim: uretim.data ? seriyeCevir(uretim.data, 'yil') : [],
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

/**
 * FAO üretici fiyatı (USD/ton, yıllık) — ürün kodu başına.
 * Hem Türkiye'nin serisi hem son yılın ülke sıralaması buradan çıkıyor.
 */
export function useDunyaFiyat(kodlar: { kod: number; label: string }[] | undefined) {
  return useQuery({
    enabled: !!kodlar?.length,
    queryKey: ['tvb-fao-fiyat', kodlar?.map((k) => k.kod).join('|')],
    queryFn: async () => {
      const parcalar = await Promise.all(
        (kodlar ?? []).map(async (k) => ({
          ...k,
          satirlar: await fetchRows('fao/uretici-fiyat', { itemcode: String(k.kod), limit: '10000' }),
        })),
      );
      return parcalar;
    },
  });
}
