import { Link } from 'react-router-dom';
import { BolumKategorileri } from '../../charts/BolumKategorileri';
import { useBitkiselKartlar, useTumBultenler, type YilDeger } from './useBitkiselKartlar';
import type { BitkiselKart } from './kartlar';

/**
 * Bitkisel üretimin iniş sayfası — yalnızca kartlar.
 *
 * Hayvancılıktaki mantığın aynısı: giren kişi önce "durum ne" sorusunun
 * cevabını görüyor, kartlara basınca detaya iniyor, en altta da "başka ne var"
 * cevaplanıyor. Fark, kartların ÜRÜN değil ÜRÜN GRUBU olması — gerekçesi
 * `kartlar.ts` başında.
 */

const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** Sıfır olmayan son yıl — TÜİK cari yılı boş satırla açabiliyor. */
function sonDolu(veri: YilDeger[]) {
  for (let i = veri.length - 1; i >= 0; i--) {
    if (Number.isFinite(veri[i].deger) && veri[i].deger > 0) return { son: veri[i], onceki: veri[i - 1] };
  }
  return { son: undefined, onceki: undefined };
}

function Kart({ kart, veri, tahmin }: {
  kart: BitkiselKart;
  veri: YilDeger[];
  /** TÜİK'in gelecek yıl tahmini — varsa kartın altında ayrı satırda. */
  tahmin?: { yil: number; deger: number; oncekiDeger?: number };
}) {
  const { son, onceki } = sonDolu(veri);
  const degisim = son && onceki && onceki.deger !== 0
    ? ((son.deger - onceki.deger) / onceki.deger) * 100 : null;
  const artan = degisim !== null && degisim >= 0;

  return (
    <Link to={`/tarpovizyon-basic/bitkisel-genel/uretim-ozeti/${kart.id}`} className="tvb-kart">
      <span className="tvb-kart__ad">{kart.label}</span>
      <span className="tvb-kart__deger">
        {son ? sayi.format(son.deger) : '—'}<small> ton</small>
      </span>
      {degisim !== null && (
        <span className={`tvb-kart__degisim ${artan ? 'tvb-kart__degisim--artan' : 'tvb-kart__degisim--azalan'}`}>
          {artan ? '▲' : '▼'} {Math.abs(degisim).toFixed(1)}% <small>geçen yıla göre</small>
        </span>
      )}
      {son && <span className="tvb-kart__donem">{son.yil}</span>}
      {/*
        * TAHMİN AYRI SATIRDA ve ayrı renkte. Ana rakam gerçekleşme olarak
        * kalıyor; tahmini künye yerine koymak, olmamış bir üretimi olmuş gibi
        * gösterirdi.
        */}
      {tahmin && (
        <span className="tvb-kart__tahmin">
          {tahmin.yil} tahmini: {sayi.format(tahmin.deger)} ton
          {Number.isFinite(tahmin.oncekiDeger) && (tahmin.oncekiDeger as number) > 0 && (
            <> ({tahmin.deger >= (tahmin.oncekiDeger as number) ? '▲' : '▼'}
              {' '}{Math.abs(((tahmin.deger - (tahmin.oncekiDeger as number)) / (tahmin.oncekiDeger as number)) * 100).toFixed(1)}%)</>
          )}
        </span>
      )}
      <span className="tvb-kart__donem">{kart.parcalar.length} ürün</span>
    </Link>
  );
}

export function BitkiselOzetPage() {
  const { yukleniyor, seriler } = useBitkiselKartlar();
  const bultenler = useTumBultenler();

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">Bitkisel Üretim — Türkiye</div>
      {yukleniyor
        ? <p className="tvb-status">Yükleniyor…</p>
        : (
          <div className="tvb-section">
            <h3>Ürün Grupları</h3>
            <div className="tvb-kartlar">
              {seriler.map(({ kart, veri }) => (
                <Kart key={kart.id} kart={kart} veri={veri} tahmin={bultenler[kart.id]} />
              ))}
            </div>
          </div>
        )}
      <BolumKategorileri bolumYolu="bitkisel-genel" />
    </div>
  );
}
