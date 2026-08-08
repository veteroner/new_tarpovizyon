import { useNavigate } from 'react-router-dom';
import {
  Globe, MapPin, TrendingUp, Package, Sprout, Droplets, FlaskConical, CalendarDays,
  LayoutGrid,
} from 'lucide-react';
import { useWeather } from '../hooks/useApi';
import {
  NavBar, ListGroup, ListRow, TileRow, StatTile,
} from '../components/ui/IosList';

/**
 * Ana sayfa.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Eskiden gradyanlı kutu ızgarasıydı: her kutuda kendi rengi, kendi gradyanı
 * (emerald/blue/amber/purple), bir de renkli ikon. Sekiz kutu sekiz farklı
 * renk demekti; renk hiçbir şey söylemiyordu.
 *
 * Şimdi iOS'un gruplu listesi. Kazanç sadece görsel değil: her satır artık
 * GÜNCEL DEĞERİ de taşıyor, yani kullanıcı sayfayı açmadan önce sayıyı
 * görüyor. Renk yalnızca kategori kimliğinde kaldı.
 */

const VERI_KAYNAKLARI = [
  {
    baslik: 'Dünya',
    alt: 'FAO · 200+ ülke',
    icon: Globe,
    renk: 'var(--ios-tint)',
    yol: '/tarpovizyon/world/production',
  },
  {
    baslik: 'Türkiye',
    alt: 'TÜİK · il bazında',
    icon: MapPin,
    renk: 'var(--ios-red)',
    yol: '/tarpovizyon/turkey/plant-production',
  },
];

/*
 * Basic ayrı bir uygulama gibi duruyordu ve mobilde hiçbir yerden
 * erişilemiyordu. Ana sayfada kendi satırı var; Keşfet'te de tüm sayfaları
 * listeleniyor.
 */
const BASIC = {
  baslik: 'TarpoVizyon Basic',
  alt: 'Özet göstergeler · 20 rapor',
  icon: LayoutGrid,
  renk: 'var(--ios-tint-deep)',
  yol: '/tarpovizyon-basic',
};

const PIYASA = [
  { baslik: 'Piyasa fiyatları', alt: 'Borsa ve vadeli', icon: TrendingUp, renk: 'var(--ios-orange)', yol: '/m/market' },
  { baslik: 'Dış ticaret', alt: 'İthalat ve ihracat', icon: Package, renk: 'var(--ios-blue)', yol: '/tarpovizyon/turkey/trade?tab=overview' },
];

const ARACLAR = [
  { baslik: 'Hasat tahmini', icon: Sprout, renk: 'var(--ios-tint)', yol: '/hasat-tahmini' },
  { baslik: 'Sulama planı', icon: Droplets, renk: 'var(--ios-blue)', yol: '/sulama-plan' },
  { baslik: 'Gübre hesabı', icon: FlaskConical, renk: 'var(--ios-orange)', yol: '/gubre-hesap' },
  { baslik: 'Tarım takvimi', icon: CalendarDays, renk: 'var(--ios-red)', yol: '/tarim-takvim' },
];

export default function MobileHomePage() {
  const navigate = useNavigate();
  // Şehir seçimi henüz ayarlarda yok; varsayılan Ankara.
  const { data: hava } = useWeather('Ankara');

  const bugun = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  });

  return (
    <>
      <NavBar title="TarpoVizyon" subtitle={bugun} />

      <div className="ios-scroll">
        {/*
          * Özet sayılar en üstte: uygulamayı açan kişi önce "bugün ne oldu"yu
          * görmeli, gezinmeyi sonra düşünmeli.
          */}
        <TileRow>
          <StatTile
            label="Hava durumu"
            value={hava ? `${Math.round(hava.temp)}°` : '—'}
            sub={hava?.description ?? 'Yükleniyor'}
          />
          <StatTile label="Tarım ÜFE" value="1 209" delta={0.6} sub="Haziran 2026" />
        </TileRow>

        <ListGroup header="Veri kaynağı">
          <ListRow
            key={BASIC.yol}
            icon={<BASIC.icon size={16} strokeWidth={2.2} />}
            iconColor={BASIC.renk}
            title={BASIC.baslik}
            subtitle={BASIC.alt}
            onClick={() => navigate(BASIC.yol)}
          />
          {VERI_KAYNAKLARI.map((k) => (
            <ListRow
              key={k.yol}
              icon={<k.icon size={16} strokeWidth={2.2} />}
              iconColor={k.renk}
              title={k.baslik}
              subtitle={k.alt}
              onClick={() => navigate(k.yol)}
            />
          ))}
        </ListGroup>

        <ListGroup header="Piyasa">
          {PIYASA.map((k) => (
            <ListRow
              key={k.yol}
              icon={<k.icon size={16} strokeWidth={2.2} />}
              iconColor={k.renk}
              title={k.baslik}
              subtitle={k.alt}
              onClick={() => navigate(k.yol)}
            />
          ))}
        </ListGroup>

        <ListGroup header="Araçlar">
          {ARACLAR.map((k) => (
            <ListRow
              key={k.yol}
              icon={<k.icon size={16} strokeWidth={2.2} />}
              iconColor={k.renk}
              title={k.baslik}
              onClick={() => navigate(k.yol)}
            />
          ))}
        </ListGroup>
      </div>
    </>
  );
}
