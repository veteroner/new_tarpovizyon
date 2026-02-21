import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function TurkeyPlantMenuPage() {
  const breadcrumbs = [
    { label: 'Türkiye Verileri', path: '/turkey', icon: '🇹🇷' },
    { label: 'Bitkisel Üretim' }
  ];

  const navItems = [
    { path: '/turkey/plant/production', label: 'Üretim', icon: '🌾' },
    { path: '/turkey/plant/trade', label: 'Ticaret', icon: '📦' },
    { path: '/turkey/plant/export', label: 'İhracat', icon: '📤' },
    { path: '/turkey/plant/import', label: 'İthalat', icon: '📥' },
  ];

  const cards = [
    {
      title: 'Bitkisel Üretim',
      subtitle: 'İl bazlı üretim miktarları ve ekim alanları',
      icon: '🌾',
      color: '#22c55e',
      path: '/turkey/plant/production'
    },
    {
      title: 'Bitkisel Ticaret',
      subtitle: 'İhracat ve ithalat özet verileri',
      icon: '📦',
      color: '#8b5cf6',
      path: '/turkey/plant/trade'
    },
    {
      title: 'İhracat Detayları',
      subtitle: 'Ürün bazlı ihracat analizleri',
      icon: '📤',
      color: '#10b981',
      path: '/turkey/plant/export'
    },
    {
      title: 'İthalat Detayları',
      subtitle: 'Ürün bazlı ithalat analizleri',
      icon: '📥',
      color: '#f59e0b',
      path: '/turkey/plant/import'
    }
  ];

  return (
    <div className="menu-page">
      <PageHeader 
        title="Bitkisel Üretim" 
        icon="🌾"
        color="#10b981"
        breadcrumbs={breadcrumbs}
        navItems={navItems}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="Türkiye Bitkisel Üretim"
          subtitle="TÜİK verilerine dayalı il bazlı üretim ve ticaret istatistikleri"
          categories={cards}
          columns={2}
          cardSize="large"
        />
      </main>
    </div>
  );
}
