import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function WorldPlantMenuPage() {
  const breadcrumbs = [
    { label: 'Dünya Verileri', path: '/world', icon: '🌍' },
    { label: 'Bitkisel Üretim' }
  ];

  const navItems = [
    { path: '/world/plant/cereals', label: 'Tahıllar', icon: '🌾' },
    { path: '/world/plant/vegetables', label: 'Sebzeler', icon: '🥕' },
    { path: '/world/plant/fruits', label: 'Meyveler', icon: '🍎' },
    { path: '/world/plant/legumes', label: 'Baklagiller', icon: '🫘' },
    { path: '/world/plant/oilseeds', label: 'Yağlı Tohumlar', icon: '🌻' },
    { path: '/world/plant/sugar-crops', label: 'Şeker Bitkileri', icon: '🍬' },
    { path: '/world/plant/nuts', label: 'Sert Kabuklular', icon: '🥜' },
    { path: '/world/plant/beverages', label: 'İçecek Bitkileri', icon: '☕' },
    { path: '/world/plant/fiber-crops', label: 'Lif Bitkileri', icon: '🧵' },
  ];

  const cards = [
    {
      title: 'Tahıllar',
      subtitle: 'Buğday, arpa, mısır, pirinç',
      icon: '🌾',
      color: '#f59e0b',
      path: '/world/plant/cereals'
    },
    {
      title: 'Sebzeler',
      subtitle: 'Domates, biber, patlıcan, soğan',
      icon: '🥕',
      color: '#22c55e',
      path: '/world/plant/vegetables'
    },
    {
      title: 'Meyveler',
      subtitle: 'Elma, narenciye, üzüm, kayısı',
      icon: '🍎',
      color: '#ef4444',
      path: '/world/plant/fruits'
    },
    {
      title: 'Baklagiller',
      subtitle: 'Mercimek, nohut, fasulye',
      icon: '🫘',
      color: '#8b5cf6',
      path: '/world/plant/legumes'
    },
    {
      title: 'Yağlı Tohumlar',
      subtitle: 'Ayçiçeği, soya, kanola',
      icon: '🌻',
      color: '#eab308',
      path: '/world/plant/oilseeds'
    },
    {
      title: 'Şeker Bitkileri',
      subtitle: 'Şeker pancarı, şeker kamışı',
      icon: '🍬',
      color: '#ec4899',
      path: '/world/plant/sugar-crops'
    },
    {
      title: 'Sert Kabuklular',
      subtitle: 'Fındık, ceviz, badem',
      icon: '🥜',
      color: '#a16207',
      path: '/world/plant/nuts'
    },
    {
      title: 'İçecek Bitkileri',
      subtitle: 'Çay, kahve, kakao',
      icon: '☕',
      color: '#78350f',
      path: '/world/plant/beverages'
    },
    {
      title: 'Lif Bitkileri',
      subtitle: 'Pamuk, keten, kenevir',
      icon: '🧵',
      color: '#0891b2',
      path: '/world/plant/fiber-crops'
    }
  ];

  return (
    <div className="menu-page">
      <PageHeader 
        title="Bitkisel Üretim" 
        icon="🌱"
        color="#10b981"
        breadcrumbs={breadcrumbs}
        navItems={navItems}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="Bitkisel Üretim Verileri"
          subtitle="Dünya geneli tarımsal üretim istatistikleri (FAO)"
          categories={cards}
          columns={3}
          cardSize="medium"
        />
      </main>
    </div>
  );
}
