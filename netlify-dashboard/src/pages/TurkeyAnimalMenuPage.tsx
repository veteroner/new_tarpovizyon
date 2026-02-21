import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function TurkeyAnimalMenuPage() {
  const breadcrumbs = [
    { label: 'Türkiye Verileri', path: '/turkey', icon: '🇹🇷' },
    { label: 'Hayvansal Üretim' }
  ];

  const navItems = [
    { path: '/turkey/animal/livestock', label: 'Hayvan Varlığı', icon: '🐄' },
    { path: '/turkey/animal/trade', label: 'Ticaret', icon: '📦' },
    { path: '/turkey/animal/export', label: 'İhracat', icon: '📤' },
    { path: '/turkey/animal/import', label: 'İthalat', icon: '📥' },
  ];

  const cards = [
    {
      title: 'Hayvan Varlığı',
      subtitle: 'İl bazlı büyükbaş, küçükbaş, kümes hayvanları',
      icon: '🐄',
      color: '#ef4444',
      path: '/turkey/animal/livestock'
    },
    {
      title: 'Hayvansal Ticaret',
      subtitle: 'Canlı hayvan ve et ürünleri ticareti',
      icon: '📦',
      color: '#8b5cf6',
      path: '/turkey/animal/trade'
    },
    {
      title: 'İhracat Detayları',
      subtitle: 'Hayvansal ürün ihracat analizleri',
      icon: '📤',
      color: '#10b981',
      path: '/turkey/animal/export'
    },
    {
      title: 'İthalat Detayları',
      subtitle: 'Hayvansal ürün ithalat analizleri',
      icon: '📥',
      color: '#f59e0b',
      path: '/turkey/animal/import'
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
          title="Türkiye Hayvansal Üretim"
          subtitle="TÜİK verilerine dayalı il bazlı hayvan varlığı ve ticaret istatistikleri"
          categories={cards}
          columns={2}
          cardSize="large"
        />
      </main>
    </div>
  );
}
