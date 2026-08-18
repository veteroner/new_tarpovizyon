import { Link, useParams } from 'react-router-dom';
import { YearlyChart } from '../../charts/YearlyChart';
import { RankingBlock } from '../../charts/RankingBlock';
import { BITKISEL_KARTLAR, bitkiselKartBul } from './kartlar';
import { useBitkiselKartlar, useGrupParcalari, useAlanVerim, useBultenSerisi, type YilDeger } from './useBitkiselKartlar';

/**
 * Ürün grubu detayı — hayvancılık detayıyla aynı iskelet:
 * künye → yıllık seyir → kırılım → (gruba özgü bloklar) → yönlendirme.
 *
 * Bitkisele özgü iki blok var: EKİLEN ALAN ve VERİM. Hayvancılıkta karşılığı
 * yoktu; burada "üretim neden arttı/azaldı" sorusunun cevabı çoğu zaman bu
 * ikisinde (alan mı büyüdü, verim mi arttı).
 */

const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const ondalik = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function sonDolu(veri: YilDeger[]) {
  for (let i = veri.length - 1; i >= 0; i--) {
    if (Number.isFinite(veri[i].deger) && veri[i].deger > 0) return { son: veri[i], onceki: veri[i - 1] };
  }
  return { son: undefined, onceki: undefined };
}

export function BitkiselDetayPage() {
  const { kartId } = useParams();
  const kart = bitkiselKartBul(String(kartId));
  const { yukleniyor, seriler } = useBitkiselKartlar();
  const { parcalar } = useGrupParcalari(kart);
  const { alan, verim } = useAlanVerim(kart);
  const bulten = useBultenSerisi(kart?.bulten);

  if (!kart) {
    return (
      <div className="tvb-page">
        <div className="tvb-page__banner tvb-page__banner--orange">Bulunamadı</div>
        <p className="tvb-status">Böyle bir ürün grubu yok.</p>
      </div>
    );
  }

  const toplam = seriler.find((s) => s.kart.id === kart.id)?.veri ?? [];
  const { son, onceki } = sonDolu(toplam);
  const degisim = son && onceki && onceki.deger !== 0
    ? ((son.deger - onceki.deger) / onceki.deger) * 100 : null;

  /* Grup içi sıralama: son dolu yılın ürün bazında üretimi. */
  const siralama = parcalar
    .map((p) => ({ name: p.label, value: sonDolu(p.veri).son?.deger ?? 0 }))
    .filter((x) => x.value > 0);

  const sira = BITKISEL_KARTLAR.findIndex((k) => k.id === kart.id);
  const oncekiKart = BITKISEL_KARTLAR[sira - 1];
  const sonrakiKart = BITKISEL_KARTLAR[sira + 1];

  const seriGrafik = (veri: YilDeger[], label: string) =>
    veri.filter((d) => d.deger > 0).map((d) => ({ yil: d.yil, [label]: d.deger }));

  /* Üç seriyi yıl ekseninde birleştir; olmayan yıl boş kalıyor. */
  const bultenHepsi = bulten.data ?? [];
  const bultenGercek = bultenHepsi.filter((b) => !b.tahmin);
  const bultenTahmin = bultenHepsi.filter((b) => b.tahmin);
  const birlesikSeri = (() => {
    const yillar = new Map<number, Record<string, number | string>>();
    const koy = (yil: number, alan: string, deger: number) => {
      const k = yillar.get(yil) ?? { yil };
      k[alan] = deger;
      yillar.set(yil, k);
    };
    for (const d of toplam) if (d.deger > 0) koy(d.yil, 'Üretim', d.deger);
    for (const b of bultenGercek) koy(b.yil, 'Bülten', b.deger);
    /*
     * Tahmin çizgisi havada durmasın diye bir önceki yılın bülten değerinden
     * başlatılıyor; böylece kesikli çizgi gerçekleşmenin ucundan devam ediyor.
     */
    for (const b of bultenTahmin) {
      koy(b.yil, 'Tahmin', b.deger);
      const oncekiB = bultenGercek.find((x) => x.yil === b.yil - 1);
      if (oncekiB) koy(oncekiB.yil, 'Tahmin', oncekiB.deger);
    }
    return [...yillar.values()].sort((a, b) => Number(a.yil) - Number(b.yil));
  })();

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">{kart.label}</div>

      <p className="tvb-status">
        <Link to="/tarpovizyon-basic/bitkisel-genel/uretim-ozeti">← Bitkisel Üretim Özeti</Link>
      </p>

      {yukleniyor && <p className="tvb-status">Yükleniyor…</p>}

      {son && (
        <div className="tvb-detay__kunye">
          <span className="tvb-detay__deger">{sayi.format(son.deger)} <small>ton</small></span>
          {degisim !== null && (
            <span className={degisim >= 0 ? 'tvb-kart__degisim--artan' : 'tvb-kart__degisim--azalan'}>
              {degisim >= 0 ? '▲' : '▼'} {Math.abs(degisim).toFixed(1)}% geçen yıla göre
            </span>
          )}
          <span className="tvb-kart__donem">{son.yil}</span>
        </div>
      )}

      {toplam.length > 0 && (
        <div className="tvb-section">
          <h3>{kart.label} — Toplam Üretim (ton)</h3>
          {/*
            * Üç ayrı seri, bilerek ayrı: ürün toplamı (D1 detay tablosu),
            * bültenin gerçekleşme rakamı ve bültenin TAHMİNİ. Tahmin kesikli
            * çizgi ve kendi adıyla duruyor — gerçekleşmeyle karıştırılmasın.
            */}
          <YearlyChart
            data={birlesikSeri}
            xKey="yil"
            series={[
              { key: 'Üretim', label: 'Üretim (ürün toplamı)', type: 'line' },
              ...(bultenGercek.length ? [{ key: 'Bülten', label: 'TÜİK bülteni', type: 'line' as const }] : []),
              ...(bultenTahmin.length ? [{ key: 'Tahmin', label: 'TÜİK tahmini', type: 'line' as const, kesikli: true }] : []),
            ]}
            yDomain="auto"
          />
          {bultenTahmin.length > 0 && (
            <p className="tvb-status">
              Kesikli çizgi TÜİK'in {bultenTahmin[0].yil} 1. tahminidir —
              {' '}gerçekleşme değildir.
            </p>
          )}
        </div>
      )}

      {siralama.length > 0 && (
        <div className="tvb-section">
          <h3>Grup İçinde Ürünler ({son?.yil}, ton)</h3>
          <RankingBlock items={siralama} topN={20} />
        </div>
      )}

      {alan.filter((d) => d.deger > 0).length > 0 && (
        <div className="tvb-section">
          <h3>Ekilen Alan (dekar)</h3>
          <YearlyChart
            data={seriGrafik(alan, 'Alan')}
            xKey="yil"
            series={[{ key: 'Alan', label: 'Ekilen Alan', type: 'line' }]}
            yDomain="auto"
          />
        </div>
      )}

      {verim.filter((d) => d.deger > 0).length > 0 && (
        <div className="tvb-section">
          <h3>Verim</h3>
          <YearlyChart
            data={seriGrafik(verim, 'Verim')}
            xKey="yil"
            series={[{ key: 'Verim', label: 'Verim', type: 'line' }]}
            yDomain="auto"
          />
          <p className="tvb-status">
            Son değer: {ondalik.format(sonDolu(verim).son?.deger ?? 0)} ({sonDolu(verim).son?.yil})
          </p>
        </div>
      )}

      {(oncekiKart || sonrakiKart) && (
        <div className="tvb-detay__gezinme">
          {oncekiKart
            ? <Link to={`/tarpovizyon-basic/bitkisel-genel/uretim-ozeti/${oncekiKart.id}`}>← {oncekiKart.label}</Link>
            : <span />}
          {sonrakiKart
            && <Link to={`/tarpovizyon-basic/bitkisel-genel/uretim-ozeti/${sonrakiKart.id}`}>{sonrakiKart.label} →</Link>}
        </div>
      )}

      <div className="tvb-section">
        <h3>Devamı</h3>
        <Link to={`/tarpovizyon-basic/${kart.sektor.yol}`} className="tvb-kategoriler__kart">
          <span className="tvb-kategoriler__ad">{kart.sektor.label}</span>
          <span className="tvb-kategoriler__adet">Ürün ürün üretim, alan, verim ve dış ticaret →</span>
        </Link>
      </div>
    </div>
  );
}
