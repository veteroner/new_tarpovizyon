import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMobileViewport } from '../../mobile/hooks/useMobileViewport';

/**
 * Uzun listeyi mobilde kısaltıp "tümünü göster" ile açan sarmalayıcı.
 *
 * ─── ÇÖZDÜĞÜ SORUN ──────────────────────────────────────────────────────────
 * Sıralama listeleri ("Top 20 il") mobilde tek blokta 1 575 px yer kaplıyordu
 * — iki ekrandan fazla, üstelik altı bitkisel sayfada aynısı. Kullanıcı ilk
 * üç sırayı görmek isterken 20 satır kaydırmak zorunda kalıyordu.
 *
 * ─── NEDEN GİZLEMEK DEĞİL KISALTMAK ─────────────────────────────────────────
 * Veriyi kırpıp yok saymak yanlış olurdu: 20. sıra da veri. Kademeli açılım
 * hem ilk bakışta sayfayı kısaltıyor hem de tamamına tek dokunuşla erişim
 * bırakıyor.
 *
 * Geniş ekranda hiçbir şey değişmiyor — orada 20 satır zaten sorun değil.
 */
export function KademeliListe({
  children, ilk = 5, birim = 'satır',
}: {
  children: ReactNode[];
  /** Kapalıyken gösterilecek satır sayısı. */
  ilk?: number;
  /** Düğme metnindeki isim ("20 il", "20 satır"). */
  birim?: string;
}) {
  const mobil = useMobileViewport();
  const [acik, setAcik] = useState(false);

  const hepsi = children.filter(Boolean);
  const kisalt = mobil && !acik && hepsi.length > ilk + 2;

  return (
    <>
      {kisalt ? hepsi.slice(0, ilk) : hepsi}

      {mobil && hepsi.length > ilk + 2 && (
        <button
          type="button"
          className="kademeli-dugme"
          onClick={() => setAcik((a) => !a)}
          /* Kapalıyken kaç satırın gizlendiğini söylüyor: "biraz daha var"
             belirsizliği kullanıcıyı listeyi açmaya zorluyordu. */
          aria-expanded={acik}
        >
          {acik ? 'Daha az göster' : `Tümünü göster (${hepsi.length} ${birim})`}
          <ChevronDown
            size={15}
            aria-hidden="true"
            style={{ transform: acik ? 'rotate(180deg)' : undefined }}
          />
        </button>
      )}
    </>
  );
}
