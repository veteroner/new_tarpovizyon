import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function WorldMenuPage() {
  const breadcrumbs = [
    { label: 'Dünya Verileri', icon: '🌍' }
  ];

  const categories = [
    {
      title: 'Makro Ekonomik Veriler',
      subtitle: 'Nüfus, Ekonomi, Fiyat Endeksleri',
      icon: '📊',
      color: '#3b82f6',
      path: '/world/macro'
    },
    {
      title: 'Arazi ve Çevre',
      subtitle: 'Arazi Kullanımı, Örtüsü, Gübre, Pestisit',
      icon: '🌾',
      color: '#10b981',
      path: '/world/land'
    },
    {
      title: 'Bitkisel Üretim',
      subtitle: 'Tahıl, Meyve, Sebze, Baklagil ve Daha Fazlası',
      icon: '🌱',
      color: '#f59e0b',
      path: '/world/plant'
    },
    {
      title: 'Hayvansal Üretim',
      subtitle: 'Et, Süt, Yumurta, Canlı Hayvan Stokları',
      icon: '🐄',
      color: '#ef4444',
      path: '/world/animal'
    },
    {
      title: 'Ticaret',
      subtitle: 'Dünya İhracat ve İthalat Verileri',
      icon: '📦',
      color: '#8b5cf6',
      path: '/world/trade'
    },
    {
      title: 'Gıda Dengesi',
      subtitle: 'Üretim, Tüketim, Arz Dengesi',
      icon: '⚖️',
      color: '#06b6d4',
      path: '/world/food-balance'
    }
  ];

  return (
    <div className="menu-page world-menu">
      <PageHeader 
        title="Dünya Verileri" 
        icon="🌍"
        color="#3b82f6"
        breadcrumbs={breadcrumbs}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="FAO Veritabanı"
          subtitle="Birleşmiş Milletler Gıda ve Tarım Örgütü (FAO) verilerine dayalı dünya geneli istatistikler"
          categories={categories}
          columns={3}
          cardSize="large"
        />
      </main>
    </div>
  );
}
