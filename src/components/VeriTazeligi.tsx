import { useEffect, useState, useSyncExternalStore } from 'react';
import { Clock } from 'lucide-react';
import { damgaAbone, damgalariAl, damgaSurumuAl } from '../services/d1';
import '../styles/VeriTazeligi.css';

/**
 * "Bu sayfadaki veri en son ne zaman tazelendi" göstergesi.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Sayfalar üç ayrı takvimden besleniyor: TÜİK bitkiseli hasat sonrası, FAO bir
 * yıl gecikmeli, TÜFE elle giriliyor. Kullanıcı ekrandaki rakamın ne kadar
 * taze olduğunu HİÇBİR yerde göremiyordu — bir sayı 2025 diyor, yanındaki 2023,
 * ikisi de aynı güvenle duruyordu.
 *
 * ─── EN ESKİSİ GÖSTERİLİYOR ─────────────────────────────────────────────────
 * Bir sayfa onlarca uç çağırıyor. Gösterge bunların EN ESKİSİNİ söylüyor,
 * ortalamasını değil: sayfa en bayat verisi kadar tazedir. Ortalama almak,
 * bir tablo altı ay geride kalmışken sayfayı taze göstermek olurdu.
 *
 * ─── EK İSTEK YOK ───────────────────────────────────────────────────────────
 * Damga zaten her yanıtın `X-Veri-Damga` başlığında geliyor (Worker onu
 * önbellek anahtarı için okuyor). Burada yalnızca birikeni okuyoruz.
 */

const DK = 60_000;
const SAAT = 60 * DK;
const GUN = 24 * SAAT;

/** "3 saat önce", "dün", "5 gün önce" — mutlak tarih ipucunda kalıyor. */
function goreliZaman(ms: number): string {
  const fark = Date.now() - ms;
  if (fark < 2 * DK) return 'az önce';
  if (fark < SAAT) return `${Math.round(fark / DK)} dakika önce`;
  if (fark < GUN) return `${Math.round(fark / SAAT)} saat önce`;
  const gun = Math.round(fark / GUN);
  if (gun === 1) return 'dün';
  if (gun < 30) return `${gun} gün önce`;
  const ay = Math.round(gun / 30);
  return ay < 12 ? `${ay} ay önce` : `${Math.round(ay / 12)} yıl önce`;
}

const tamTarih = (ms: number) =>
  new Date(ms).toLocaleString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export function VeriTazeligi() {
  /*
   * `useSyncExternalStore` ile modül dışı depoya abone: damga haritası React
   * ağacının dışında dolduruluyor (fetch sırasında).
   *
   * Anlık görüntü olarak SAYAÇ okunuyor, Map değil — Map'in referansı hiç
   * değişmediği için React onu "değişmedi" sayıyor ve yeniden çizmiyordu.
   */
  useSyncExternalStore(damgaAbone, damgaSurumuAl, damgaSurumuAl);
  const damgalar = damgalariAl();

  /* Göreli zaman kendiliğinden eskiyor; dakikada bir yeniden çiziyoruz. */
  const [, tikla] = useState(0);
  useEffect(() => {
    const z = setInterval(() => tikla((n) => n + 1), DK);
    return () => clearInterval(z);
  }, []);

  const kayitlar = [...damgalar.entries()];
  if (!kayitlar.length) return null;

  /* Sayfa en bayat verisi kadar tazedir. */
  const [enEskiTablo, enEski] = kayitlar.reduce((a, b) => (b[1] < a[1] ? b : a));
  const gun = (Date.now() - enEski) / GUN;
  const durum = gun > 90 ? 'eski' : gun > 30 ? 'orta' : 'taze';

  return (
    <p
      className={`vt vt-${durum}`}
      title={`En eski kaynak: ${enEskiTablo} · ${tamTarih(enEski)}\n`
        + `Bu sayfadaki ${kayitlar.length} tablonun tamamı:\n`
        + kayitlar
          .sort((a, b) => a[1] - b[1])
          .map(([t, d]) => `  ${t} — ${tamTarih(d)}`)
          .join('\n')}
    >
      <Clock size={13} aria-hidden="true" />
      <span>
        Veri güncelliği: <b>{goreliZaman(enEski)}</b>
        {kayitlar.length > 1 && (
          <span className="vt-ek"> · {kayitlar.length} kaynağın en eskisi</span>
        )}
      </span>
    </p>
  );
}
