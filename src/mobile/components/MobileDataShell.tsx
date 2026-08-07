import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TabBar from './TabBar';
import { NavBar } from './ui/IosList';
import { locate, KAPSAM_ADI } from '../../components/nav/menu';
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
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const yer = locate(pathname, search);
  const baslik = yer?.item.label ?? 'Veri';
  const altBaslik = yer
    ? [yer.kategori.title, yer.kapsam ? KAPSAM_ADI[yer.kapsam] : null].filter(Boolean).join(' · ')
    : undefined;

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
      <div className="ios-scroll ios-data">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
