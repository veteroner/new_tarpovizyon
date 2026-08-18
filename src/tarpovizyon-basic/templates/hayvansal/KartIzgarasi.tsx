import { Link } from 'react-router-dom';
import { KARTLAR, type KartTanimi } from './kartlar';
import type { YilSatiri } from './useHayvansalKartlar';

/**
 * Tıklanabilir künye kartları.
 *
 * Her kartta son değer, geçen yıla göre değişim ve son 8 yılın MİNİ ÇİZGİSİ
 * var. Mini çizgi iki işi birden yapıyor: yönü tıklamadan gösteriyor ve kartın
 * tıklanabilir olduğunu sezdiriyor — düz bir rakam kutusu tıklanabilir
 * durmuyor.
 */

const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** Kartın kaynağından (yıl, değer) çiftleri. */
function seri(kart: KartTanimi, varlik: YilSatiri[], uretim: YilSatiri[]) {
  const kaynak = kart.kaynak === 'varlik' ? varlik : uretim;
  return kaynak
    .map((r) => ({ yil: r.yil, deger: Number(r[kart.alan]) }))
    .filter((d) => Number.isFinite(d.deger) && d.deger > 0);
}

/** Basit sparkline — kütüphane çağırmadan, kart boyutunda okunur kalsın diye. */
function MiniCizgi({ degerler }: { degerler: number[] }) {
  if (degerler.length < 2) return null;
  const enAz = Math.min(...degerler);
  const enCok = Math.max(...degerler);
  const aralik = enCok - enAz || 1;
  const G = 100; const Y = 28;
  const noktalar = degerler
    .map((v, i) => `${(i / (degerler.length - 1)) * G},${Y - ((v - enAz) / aralik) * Y}`)
    .join(' ');
  const artiyor = degerler[degerler.length - 1] >= degerler[0];
  return (
    <svg viewBox={`0 0 ${G} ${Y}`} className="tvb-kart__mini" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={noktalar}
        fill="none"
        stroke={artiyor ? '#16a34a' : '#ef4444'}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
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
      <MiniCizgi degerler={veri.slice(-8).map((d) => d.deger)} />
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
