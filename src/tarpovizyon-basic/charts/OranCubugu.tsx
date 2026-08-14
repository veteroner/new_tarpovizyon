/**
 * Oran çubuğu — yarım daire "hız göstergesi"nin yerine geçen biçim.
 *
 * ─── ESKİ GÖSTERGE NEDEN YANLIŞTI ───────────────────────────────────────────
 * `GaugeChart` açıyı `min(180, oran/100*180)` ile hesaplıyordu: %100'ü aşan HER
 * değer aynı tam yarım daireye oturuyordu. Yeterlilik oranlarının beşte dördü
 * %100 üstünde (süt %117, beyaz et %148, yumurta %140, bal %111) — yani
 * gösterge bunların hiçbirini birbirinden ayırmıyordu; üçü de "dolu" idi.
 * Skala da "%100+" yazıp bu kaybı üstü kapalı kabul ediyordu.
 *
 * Çubuk, ölçeği %100'ün ötesine taşıyabiliyor: %117 ile %148 gözle ayrılıyor.
 * %100 eşiği ray üzerinde ayrı bir çizgi olarak duruyor, böylece "kendine
 * yeterlilik sınırı" değerin kendisinden bağımsız okunabiliyor.
 *
 * Dikey yer kazancı da büyük: mobilde üç yarım daire 506 px yer kaplıyordu
 * (ölçüldü), üç çubuk ~150 px.
 */

/*
 * Ondalık, yalnızca gerektiğinde.
 *
 * Tam sayıya yuvarlamak küçük paylarda bilgi yiyordu: tarımın GSYH'deki payı
 * %5,6 iken ekranda "%6" yazıyordu. Buna karşılık yeterlilikte "%117,0"
 * gereksiz gürültü. Bu yüzden ondalık ancak değeri değiştiriyorsa gösteriliyor.
 */
const yuzde = (n: number) =>
  `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;

export function OranCubugu({
  label,
  deger,
  max = 100,
  esik,
  gosterim,
  olcekEtiketleri,
  donem,
  neutral,
}: {
  label: string;
  /** Çubuğun değeri — `max` ile aynı birimde. */
  deger: number;
  /** Ölçeğin sonu. Yeterlilik için 150, pay yüzdeleri için 100. */
  max?: number;
  /**
   * Ray üzerinde işaretlenecek eşik (yeterlilikte 100). Verilirse renk de
   * buna göre seçiliyor: altı kırmızı/turuncu, üstü yeşil. Verilmezse renk
   * yargısız — pay/miktar çubuklarında "kötü" bir değer yoktur.
   */
  esik?: number;
  /** Değerin yazıyla gösterimi; verilmezse yüzde olarak biçimlenir. */
  gosterim?: string;
  /** Ölçek uçlarının etiketi; verilmezse "0" ve `max`. */
  olcekEtiketleri?: [string, string];
  /** Sayının ait olduğu dönem — altta küçük not olarak. */
  donem?: string;
  neutral?: boolean;
}) {
  const gecerli = Number.isFinite(deger);
  // Ölçek dışına taşan değer rayı taşırmasın; yazıyla gerçek değer duruyor.
  const oran = gecerli ? Math.max(0, Math.min(1, deger / max)) : 0;

  const renk = neutral || esik === undefined
    ? 'var(--tvb-oran-notr, #2563eb)'
    : deger >= esik
      ? '#16a34a'
      : deger >= esik * 0.7
        ? '#f59e0b'
        : '#dc2626';

  const [minEtiket, maxEtiket] = olcekEtiketleri
    ?? ['0', String(max)];

  return (
    <div className="tvb-oran">
      <div className="tvb-oran__ust">
        <span className="tvb-oran__etiket">{label}</span>
        <span className="tvb-oran__deger" style={{ color: renk }}>
          {gecerli ? (gosterim ?? yuzde(deger)) : '—'}
        </span>
      </div>

      <div
        className="tvb-oran__ray"
        role="img"
        aria-label={`${label}: ${gecerli ? (gosterim ?? yuzde(deger)) : 'veri yok'}${
          esik !== undefined ? `, ${esik} eşiğine göre` : ''
        }`}
      >
        <div
          className="tvb-oran__dolgu"
          style={{ width: `${oran * 100}%`, background: renk }}
        />
        {esik !== undefined && esik < max && (
          <div className="tvb-oran__esik" style={{ left: `${(esik / max) * 100}%` }} />
        )}
      </div>

      <div className="tvb-oran__olcek">
        <span>{minEtiket}</span>
        {/*
          * Eşik etiketi rayın altında, çizgiyle aynı hizada: "%100" sayısını
          * ölçek uçlarından ayrı göstermek, çubuğun neye göre okunduğunu
          * açıklayan tek işaret.
          */}
        {esik !== undefined && esik < max && (
          <span
            className="tvb-oran__esik-etiket"
            style={{ left: `${(esik / max) * 100}%` }}
          >
            %{esik}
          </span>
        )}
        <span>{maxEtiket}</span>
      </div>

      {donem && <div className="tvb-oran__donem">{donem}</div>}
    </div>
  );
}
