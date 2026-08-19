import { useQuery, useQueries } from '@tanstack/react-query';
import { BITKISEL_KARTLAR, type BitkiselKart } from './kartlar';

/**
 * Bitkisel kartların veri kaynağı: `bitkisel/uretim-detay-yillik`.
 *
 * Uç ürün adı listesi alıyor ve YILLIK TOPLAMI döndürüyor; ayırıcı '|' çünkü
 * bazı ürün adlarında virgül var ("Buğday, Durum Buğdayı Hariç") ve virgülle
 * birleştirilen bir liste sunucuda ad ortasından bölünüp sessizce hiçbir şey
 * eşleştirmiyor.
 */

const API_BASE = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

export type YilDeger = { yil: number; deger: number; urun_sayisi?: number };

/**
 * KISMİ YIL AYIKLAMA — bu olmadan ekran yanlış okunuyordu.
 *
 * TÜİK grubun ürünlerini farklı zamanlarda yayımlıyor: 2025'te tahıl
 * grubundan yalnızca çeltik girilmişti ve grup toplamı 38 milyon tondan
 * 998 bine düşüp "▼%97" gibi görünüyordu. Uç artık o yıl kaç ürünün veri
 * verdiğini de döndürüyor; serinin en çok ürün gördüğü sayı "tam yıl"ın
 * ölçüsü, ondan az ürünlü yıllar kırpılıyor.
 */
export function tamYillar(veri: YilDeger[]): YilDeger[] {
  const enCok = Math.max(0, ...veri.map((d) => Number(d.urun_sayisi) || 0));
  if (!enCok) return veri;
  return veri.filter((d) => (Number(d.urun_sayisi) || 0) >= enCok);
}

export async function uretimYillik(urunler: string[], unsur: string): Promise<YilDeger[]> {
  const url = new URL(`${API_BASE}/api/bitkisel/uretim-detay-yillik`);
  url.searchParams.set('urunler', urunler.join('|'));
  url.searchParams.set('unsur', unsur);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`bitkisel üretim ucu hata: ${r.status}`);
  return tamYillar((await r.json()).data ?? []);
}

/** Altı kartın grup toplamı — iniş sayfası için. */
export function useBitkiselKartlar() {
  const sorgular = useQueries({
    queries: BITKISEL_KARTLAR.map((k) => ({
      queryKey: ['tvb-bitkisel-kart', k.id],
      queryFn: () => uretimYillik(k.urunler, 'Üretim'),
      staleTime: 5 * 60 * 1000,
    })),
  });
  return {
    yukleniyor: sorgular.some((s) => s.isLoading),
    seriler: BITKISEL_KARTLAR.map((k, i) => ({ kart: k, veri: sorgular[i].data ?? [] })),
  };
}

/** Bir kartın grup içi ürün kırılımı — detay sayfası için. */
export function useGrupParcalari(kart: BitkiselKart | undefined) {
  const sorgular = useQueries({
    queries: (kart?.parcalar ?? []).map((p) => ({
      queryKey: ['tvb-bitkisel-parca', kart?.id, p.label],
      queryFn: () => uretimYillik(p.urunler, 'Üretim'),
      staleTime: 5 * 60 * 1000,
    })),
  });
  return {
    yukleniyor: sorgular.some((s) => s.isLoading),
    parcalar: (kart?.parcalar ?? []).map((p, i) => ({ label: p.label, veri: sorgular[i]?.data ?? [] })),
  };
}

/** Grup toplamı için ekilen alan ve verim — bitkisele özgü bloklar. */
export function useAlanVerim(kart: BitkiselKart | undefined) {
  const alan = useQuery({
    enabled: !!kart,
    queryKey: ['tvb-bitkisel-alan', kart?.id],
    queryFn: () => uretimYillik(kart!.urunler, 'Ekilen Alan'),
  });
  const verim = useQuery({
    enabled: !!kart,
    queryKey: ['tvb-bitkisel-verim', kart?.id],
    queryFn: () => uretimYillik(kart!.urunler, 'Verim'),
  });
  return { alan: alan.data ?? [], verim: verim.data ?? [] };
}

/** Bülten grup serisi: gerçekleşme + tahmin (ayrı işaretli). */
export function useBultenSerisi(bulten: { dosya: string; grup: string } | undefined) {
  return useQuery({
    enabled: !!bulten,
    queryKey: ['tvb-bitkisel-bulten', bulten?.dosya, bulten?.grup],
    queryFn: async (): Promise<{ yil: number; deger: number; tahmin: number }[]> => {
      const url = new URL(`${API_BASE}/api/bitkisel/bulten-grup`);
      url.searchParams.set('dosya', bulten!.dosya);
      url.searchParams.set('grup', bulten!.grup);
      url.searchParams.set('limit', '200');
      const r = await fetch(url.toString());
      if (!r.ok) return [];
      return ((await r.json()).data ?? []).map((x: Record<string, unknown>) => ({
        yil: Number(x.yil), deger: Number(x.deger), tahmin: Number(x.tahmin),
      }));
    },
  });
}

export type BultenSatiri = { yil: number; deger: number; tahmin: number };

/**
 * Tüm kartların bülten TAHMİNİ — iniş sayfası için.
 * Bülten eşlemesi olmayan kartlar (baklagiller, endüstriyel) listede yok;
 * kartlarında tahmin satırı da görünmüyor.
 */
export function useTumBultenler(): Record<string, { yil: number; deger: number; oncekiDeger?: number }> {
  const kartlar = BITKISEL_KARTLAR.filter((k) => k.bulten);
  const sorgular = useQueries({
    queries: kartlar.map((k) => ({
      queryKey: ['tvb-bitkisel-bulten', k.bulten!.dosya, k.bulten!.grup],
      queryFn: async (): Promise<BultenSatiri[]> => {
        const url = new URL(`${API_BASE}/api/bitkisel/bulten-grup`);
        url.searchParams.set('dosya', k.bulten!.dosya);
        url.searchParams.set('grup', k.bulten!.grup);
        url.searchParams.set('limit', '200');
        const r = await fetch(url.toString());
        if (!r.ok) return [];
        return ((await r.json()).data ?? []).map((x: Record<string, unknown>) => ({
          yil: Number(x.yil), deger: Number(x.deger), tahmin: Number(x.tahmin),
        }));
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const cikti: Record<string, { yil: number; deger: number; oncekiDeger?: number }> = {};
  kartlar.forEach((k, i) => {
    const satir: BultenSatiri[] = sorgular[i].data ?? [];
    const t = satir.filter((x) => x.tahmin).sort((a, b) => b.yil - a.yil)[0];
    if (!t) return;
    const onceki = satir.find((x) => !x.tahmin && x.yil === t.yil - 1);
    cikti[k.id] = { yil: t.yil, deger: t.deger, oncekiDeger: onceki?.deger };
  });
  return cikti;
}
