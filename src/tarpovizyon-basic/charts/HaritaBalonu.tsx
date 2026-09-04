import type { BalonBilgisi } from './balonBilgisi';
/**
 * Harita bilgi balonu — Türkiye ve dünya haritalarında ortak.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Önce yalnızca "Konya: 23" yazıyordu. Üç eksik vardı:
 *
 *   • BİRİM YOK. 23 ton mu, 23 bin baş mı, 23 dolar mı belli değildi.
 *   • SIRA YOK. Bir ilin 23'ünün iyi mi kötü mü olduğu, listenin neresinde
 *     durduğu görünmüyordu.
 *   • PAY YOK. Türkiye toplamının yüzde kaçı olduğu okunmuyordu — oysa
 *     haritanın asıl anlattığı şey bu.
 *
 * Artık üçü de var. Sıra ve pay balonun İÇİNDE hesaplanmıyor; hesap bir kez
 * haritada yapılıp buraya hazır geçiyor (her hover'da 81 ili yeniden
 * sıralamak gereksiz iş olurdu).
 */



const bicim = new Intl.NumberFormat('tr-TR');

/** Küçük payların "%0" görünmemesi için basamak sayısı paya göre değişiyor. */
function payYaz(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return '%0';
  if (p < 0.1) return '%0,1’den az';
  if (p < 10) return `%${p.toFixed(1).replace('.', ',')}`;
  return `%${Math.round(p)}`;
}

export function HaritaBalonu({ bilgi, birim }: { bilgi: BalonBilgisi; birim?: string }) {
  return (
    <div className="tvb-map__tooltip" style={{ left: bilgi.x + 14, top: bilgi.y + 14 }}>
      <div className="tvb-map__tooltip-ad">{bilgi.ad}</div>
      <div className="tvb-map__tooltip-deger">
        {bicim.format(bilgi.deger)}
        {birim && <span className="tvb-map__tooltip-birim">{birim}</span>}
      </div>
      <div className="tvb-map__tooltip-alt">
        <span>
          <strong>{bilgi.sira}.</strong> sıra
          <span className="tvb-map__tooltip-soluk"> / {bilgi.toplamOge}</span>
        </span>
        <span className="tvb-map__tooltip-ayrac" aria-hidden="true">·</span>
        <span>
          toplamın <strong>{payYaz(bilgi.pay)}</strong>
        </span>
      </div>
    </div>
  );
}

/**
 * Değer sözlüğünden sıra ve pay tablosu üretir.
 * Haritada bir kez (useMemo içinde) çağrılıp her hover'da yeniden
 * hesaplanmaması için ayrı tutuldu.
 */
