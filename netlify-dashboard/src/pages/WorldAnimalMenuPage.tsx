import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function WorldAnimalMenuPage() {
  const breadcrumbs = [
    { label: 'Dünya Verileri', path: '/world', icon: '🌍' },
    { label: 'Hayvansal Üretim' }
  ];

  const navItems = [
    { path: '/world/animal/red-meat', label: 'Kırmızı Et', icon: '🥩' },
    { path: '/world/animal/white-meat', label: 'Beyaz Et', icon: '🍗' },
    { path: '/world/animal/milk', label: 'Süt', icon: '🥛' },
    { path: '/world/animal/eggs', label: 'Yumurta', icon: '🥚' },
    { path: '/world/animal/stocks', label: 'Canlı Hayvan', icon: '🐄' },
    { path: '/world/animal/other', label: 'Diğer Ürünler', icon: '🧈' },
  ];

  const cards = [
    {
      title: 'Kırmızı Et Üretimi',
      subtitle: 'Sığır, koyun, keçi eti',
      icon: '🥩',
      color: '#dc2626',
      path: '/world/animal/red-meat'
    },
    {
      title: 'Beyaz Et Üretimi',
      subtitle: 'Tavuk, hindi, ördek',
      icon: '🍗',
      color: '#f97316',
      path: '/world/animal/white-meat'
    },
    {
      title: 'Süt Üretimi',
      subtitle: 'İnek, koyun, keçi sütü',
      icon: '🥛',
      color: '#0ea5e9',
      path: '/world/animal/milk'
    },
    {
      title: 'Yumurta Üretimi',
      subtitle: 'Tavuk yumurtası üretimi',
      icon: '🥚',
      color: '#fbbf24',
      path: '/world/animal/eggs'
    },
    {
      title: 'Canlı Hayvan Stokları',
      subtitle: 'Büyükbaş, küçükbaş varlığı',
      icon: '🐄',
      color: '#84cc16',
      path: '/world/animal/stocks'
    },
    {
      title: 'Diğer Hayvansal Ürünler',
      subtitle: 'Bal, yün, deri',
      icon: '🧈',
      color: '#a855f7',
      path: '/world/animal/other'
    },
    {
      title: 'Canlı Hayvan Rekabeti',
      subtitle: 'Ülkeler arası karşılaştırma',
      icon: '📊',
      color: '#14b8a6',
      path: '/world/animal/competition'
    }
  ];

  return (
    <div className="menu-page">
      <PageHeader 
        title="Hayvansal Üretim" 
        icon="🐄"
        color="#ef4444"
        breadcrumbs={breadcrumbs}
        navItems={navItems}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="Hayvansal Üretim Verileri"
          subtitle="Dünya geneli hayvancılık istatistikleri (FAO)"
          categories={cards}
          columns={3}
          cardSize="medium"
        />
      </main>
    </div>
  );
}
