import { Link } from 'react-router-dom';
import { KARTLAR, type KartTanimi } from './kartlar';
import type { YilSatiri } from './useHayvansalKartlar';

/**
 * Tıklanabilir künye kartları: son değer, dönem ve geçen yıla göre değişim.
 *
 * Önce kartlarda son 8 yılın mini çizgisi de vardı; kaldırıldı. Ölçeksiz ve
 * birkaç noktalı bir çizgi küçük dalgalanmayı dramatik gösteriyor, üstelik
 * zaten yazan değişim yüzdesinin üstüne bir bilgi katmıyordu.
 */

const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** Kartın kaynağından (yıl, değer) çiftleri. */
function seri(kart: KartTanimi, varlik: YilSatiri[], uretim: YilSatiri[]) {
  const kaynak = kart.kaynak === 'varlik' ? varlik : uretim;
  return kaynak
    .map((r) => ({ yil: r.yil, deger: Number(r[kart.alan]) }))
    .filter((d) => Number.isFinite(d.deger) && d.deger > 0);
}

function Kart({ kart, veri }: { kart: KartTanimi; veri: { yil: number; deger: number }[] }) {
  const son = veri[veri.length - 1];
  const onceki = veri[veri.length - 2];
  const degisim = son && onceki && onceki.deger !== 0
    ? ((son.deger - onceki.deger) / onceki.deger) * 100
    : null;
  const artan = degisim !== null && degisim >= 0;

  return (
    <Link to={`/tarpovizyon-basic/genel/hayvansal-uretim/${kart.id}`} className="tvb-kart">
      <span className="tvb-kart__ad">{kart.label}</span>
      <span className="tvb-kart__deger">
        {son ? sayi.format(son.deger) : '—'}
        <small> {kart.birim}</small>
      </span>
      {degisim !== null && (
        <span className={`tvb-kart__degisim ${artan ? 'tvb-kart__degisim--artan' : 'tvb-kart__degisim--azalan'}`}>
          {artan ? '▲' : '▼'} {Math.abs(degisim).toFixed(1)}% <small>geçen yıla göre</small>
        </span>
      )}
      {son && <span className="tvb-kart__donem">{son.yil}</span>}
    </Link>
  );
}

export function KartIzgarasi({ varlik, uretim }: { varlik: YilSatiri[]; uretim: YilSatiri[] }) {
  const gruplar: { baslik: string; grup: 'varlik' | 'uretim' }[] = [
    { baslik: 'Hayvan Varlığı', grup: 'varlik' },
    { baslik: 'Üretim', grup: 'uretim' },
  ];

  return (
    <>
      {gruplar.map((g) => (
        <div className="tvb-section" key={g.grup}>
          <h3>{g.baslik}</h3>
          <div className="tvb-kartlar">
            {KARTLAR.filter((k) => k.grup === g.grup).map((k) => (
              <Kart key={k.id} kart={k} veri={seri(k, varlik, uretim)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
