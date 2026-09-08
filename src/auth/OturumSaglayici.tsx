import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { benKimim, cikisYap, kodDogrula, type Durum } from './oturum';
import { OturumBaglami, type OturumBaglamiTipi } from './baglam';

/**
 * Oturum bağlamı — uygulamanın tamamı için tek kimlik kaynağı.
 *
 * ─── NEDEN ÜÇ DURUM ─────────────────────────────────────────────────────────
 * `yukleniyor` ayrı bir durum, çünkü açılışta jetonun geçerli olup olmadığı
 * ancak sunucuya sorulunca biliniyor. Bu aşamayı "girişsiz" saymak, girişli
 * kullanıcıya her açılışta bir anlığına giriş ekranını göstermek demekti —
 * yanıp sönen bir arayüz, en kötü türden hata.
 *
 * ─── HATA DURUMU YOK ────────────────────────────────────────────────────────
 * Sunucuya ulaşılamazsa `girissiz` olunuyor, ayrı bir "hata" durumu
 * tutulmuyor. Gerekçe: bu bağlamın tek görevi Pro'ya erişim kararı vermek ve
 * karar verilemiyorsa güvenli taraf zaten erişimi vermemek. Ağ hatasını
 * ayrıca göstermek, kullanıcının yapabileceği bir şey olmadığı için gürültü.
 */

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [durum, setDurum] = useState<OturumBaglamiTipi['durum']>('yukleniyor');
  const [veri, setVeri] = useState<Durum | null>(null);

  const yukle = useCallback(async () => {
    const s = await benKimim();
    setVeri(s);
    setDurum(s ? 'girisli' : 'girissiz');
  }, []);

  /*
   * Açılışta jeton doğrulaması.
   *
   * `iptal` bayrağı iki işi birden yapıyor: React'in "effect içinde senkron
   * setState" uyarısını gideriyor ve asıl kusuru kapatıyor — istek dönmeden
   * bileşen sökülürse (hızlı yönlendirmede olur) sökülmüş bileşene durum
   * yazılmıyor.
   */
  useEffect(() => {
    let iptal = false;
    void (async () => {
      const s = await benKimim();
      if (iptal) return;
      setVeri(s);
      setDurum(s ? 'girisli' : 'girissiz');
    })();
    return () => { iptal = true; };
  }, []);

  const girisYap = useCallback(async (eposta: string, kod: string) => {
    const s = await kodDogrula(eposta, kod);
    setVeri({ kullanici: s.kullanici, abonelik: s.abonelik });
    setDurum('girisli');
    return { yeniKullanici: s.yeniKullanici };
  }, []);

  const cikis = useCallback(async () => {
    await cikisYap();
    setVeri(null);
    setDurum('girissiz');
  }, []);

  const deger = useMemo<OturumBaglamiTipi>(() => ({
    durum,
    kullanici: veri?.kullanici ?? null,
    abonelik: veri?.abonelik ?? null,
    proErisimi: Boolean(veri?.abonelik?.aktif),
    girisYap,
    cikis,
    tazele: yukle,
  }), [durum, veri, girisYap, cikis, yukle]);

  return <OturumBaglami.Provider value={deger}>{children}</OturumBaglami.Provider>;
}
