import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function TurkeyMenuPage() {
  const breadcrumbs = [
    { label: 'Türkiye Verileri', icon: '🇹🇷' }
  ];

  const categories = [
    {
      title: 'Bitkisel Üretim',
      subtitle: 'İl Bazlı Üretim Miktarları, Ekim Alanları',
      icon: '🌾',
      color: '#10b981',
      path: '/turkey/plant'
    },
    {
      title: 'Hayvansal Üretim',
      subtitle: 'Büyükbaş, Küçükbaş, Kümes Hayvanları',
      icon: '🐄',
      color: '#ef4444',
      path: '/turkey/animal'
    },
    {
      title: 'Dış Ticaret',
      subtitle: 'Bitkisel ve Hayvansal Ticaret Verileri',
      icon: '📦',
      color: '#8b5cf6',
      path: '/turkey/trade'
    },
    {
      title: 'İl Bazlı Haritalar',
      subtitle: 'Türkiye Isı Haritaları ve Karşılaştırmalar',
      icon: '🗺️',
      color: '#06b6d4',
      path: '/turkey/maps'
    }
  ];

  return (
    <div className="menu-page turkey-menu">
      <PageHeader 
        title="Türkiye Verileri" 
        icon="🇹🇷"
        color="#e11d48"
        breadcrumbs={breadcrumbs}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="TÜİK Veritabanı"
          subtitle="Türkiye İstatistik Kurumu (TÜİK) verilerine dayalı il bazlı istatistikler"
          categories={categories}
          columns={2}
          cardSize="large"
        />
      </main>
    </div>
  );
}
