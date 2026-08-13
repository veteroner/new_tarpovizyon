import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TabBar from './TabBar';
import { klavyeyiIzle } from '../utils/klavye';
import { NavBar } from './ui/IosList';
import { locate, itemPath, KAPSAM_ADI } from '../../components/nav/menu';
import '../styles/ios.css';
// Pano dilindeki kartları iOS yüzeylerine çeviriyor; ios.css'ten SONRA.
import '../styles/ios-data.css';

/**
 * Veri sayfalarının MOBİL kabuğu.
 *
 * ─── ÇÖZDÜĞÜ SORUN ──────────────────────────────────────────────────────────
 * Keşfet'te bir satıra dokunulduğunda uygulama masaüstü panosuna atlıyordu:
 * sekme çubuğu yok oluyor, yan menü ve pano başlığı beliriyor, geri dönüş yolu
 * kalmıyordu. Kullanıcı bir uygulamanın içinden bir web sitesine düşüyordu —
 * "kopuk kopuk" hissinin mobildeki en sert hâli buydu.
 *
 * Bu kabuk sayfanın İÇERİĞİNİ olduğu gibi bırakıp çevresini uygulamaya
 * çeviriyor: üstte sayfanın kendi adıyla gezinme çubuğu ve geri düğmesi,
 * altta sekme çubuğu duruyor.
 *
 * Başlık menüden okunuyor (components/nav/menu.ts) — sayfaya ayrıca başlık
 * yazmak gerekmiyor, menüye eklenen her sayfa doğru başlığı kendiliğinden
 * alıyor.
 */
export default function MobileDataShell() {
  useEffect(klavyeyiIzle, []);

  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const yer = locate(pathname, search);
  const baslik = yer?.item.label ?? 'Veri';
  const altBaslik = yer
    ? [yer.kategori.title, yer.kapsam ? KAPSAM_ADI[yer.kapsam] : null].filter(Boolean).join(' · ')
    : undefined;

  /*
   * Aynı kategorideki diğer sayfalar — başlığın altındaki açılır seçici.
   *
   * ─── NEDEN GEREKLİ ────────────────────────────────────────────────────────
   * Bu kabuk, sayfanın kendi menüsünün yerine geçiyor. TarpoVizyon Basic'te
   * bunun bedeli ağırdı: Basic'in gezinme çubuğu `BasicShell` içindeydi ve
   * kabuk onun yerini alınca Basic'in İÇİNDEN başka bir Basic sayfasına
   * giden HİÇBİR bağlantı kalmamıştı (ölçüldü: 0). Kullanıcı Basic'e girip
   * tek bir sayfada kilitleniyordu.
   *
   * Seçici yalnızca o sorunu değil, genel bir eksiği de kapatıyor: komşu
   * sayfaya geçmek için Keşfet'e dönüp listeyi baştan taramak gerekiyordu.
   *
   * `select` bilinçli tercih: iOS'ta ekranın altından tekerlek olarak açılıyor,
   * sayfada tek satır (44 pt) yer kaplıyor ve 40 öğede de 4 öğede de aynı
   * şekilde çalışıyor.
   */
  const kardesler = (yer?.kategori.items ?? [])
    .map((item) => ({ label: item.label, yol: itemPath(item, yer!.kapsam ?? 'turkey') }))
    .filter((x): x is { label: string; yol: string } => !!x.yol);

  const aktifYol = kardesler.find((k) => k.yol.split('?')[0] === pathname)?.yol;

  return (
    <div className="ios-app">
      <NavBar
        title={baslik}
        subtitle={altBaslik}
        /*
         * Geri, tarayıcı geçmişinde bir adım. Kullanıcı buraya Keşfet'ten,
         * ana sayfadan ya da başka bir veri sayfasından gelmiş olabilir;
         * sabit bir hedefe atmak geldiği yeri kaybettirirdi.
         */
        onBack={() => navigate(-1)}
      />
      {/* Tek sayfalık kategoride seçici anlamsız; gizleniyor. */}
      {kardesler.length > 1 && (
        <div className="ios-sayfa-secici">
          <select
            value={aktifYol ?? ''}
            onChange={(e) => navigate(e.target.value)}
            aria-label={`${yer?.kategori.title} bölümündeki sayfalar`}
          >
            {!aktifYol && <option value="">Sayfa seç…</option>}
            {kardesler.map((k) => (
              <option key={k.yol} value={k.yol}>{k.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ios-scroll ios-data">
        {/*
          * `key` yola bağlı — bkz. TarpoShell'deki aynı satır. Sayfaların
          * çoğu aynı bileşenin farklı prop'larla kullanılmış hâli; yeniden
          * kurulmazlarsa başlangıç değeri prop'tan gelen durumlar eski
          * sayfanınkinde kalıyor.
          */}
        <Outlet key={pathname} />
      </div>
      <TabBar />
    </div>
  );
}
