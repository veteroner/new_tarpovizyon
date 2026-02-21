import { PageHeader } from '../components/PageHeader';
import { SubCategoryMenu } from '../components/SubCategoryMenu';

export function WorldMacroMenuPage() {
  const breadcrumbs = [
    { label: 'Dünya Verileri', path: '/world', icon: '🌍' },
    { label: 'Makro Ekonomik' }
  ];

  const navItems = [
    { path: '/world/macro/economic', label: 'Ekonomik Göstergeler', icon: '📊' },
    { path: '/world/macro/population', label: 'Nüfus', icon: '👥' },
    { path: '/world/macro/employment', label: 'Tarım İstihdamı', icon: '👷' },
    { path: '/world/macro/price-index', label: 'Fiyat Endeksleri', icon: '💹' },
  ];

  const cards = [
    {
      title: 'Ekonomik Göstergeler',
      subtitle: 'GSYH, tarım geliri ve ekonomik veriler',
      icon: '📊',
      color: '#3b82f6',
      path: '/world/macro/economic'
    },
    {
      title: 'Nüfus İstatistikleri',
      subtitle: 'Dünya ve ülke bazlı nüfus verileri',
      icon: '👥',
      color: '#8b5cf6',
      path: '/world/macro/population'
    },
    {
      title: 'Tarımsal İstihdam',
      subtitle: 'Tarım sektöründe çalışan sayıları',
      icon: '👷',
      color: '#10b981',
      path: '/world/macro/employment'
    },
    {
      title: 'Fiyat Endeksleri',
      subtitle: 'TÜFE, ÜFE, FAO gıda endeksi',
      icon: '💹',
      color: '#f59e0b',
      path: '/world/macro/price-index'
    }
  ];

  return (
    <div className="menu-page">
      <PageHeader 
        title="Makro Ekonomik Veriler" 
        icon="📊"
        color="#3b82f6"
        breadcrumbs={breadcrumbs}
        navItems={navItems}
      />

      <main className="menu-page-content">
        <SubCategoryMenu
          title="Makro Ekonomik Göstergeler"
          subtitle="Dünya geneli ekonomik ve demografik istatistikler"
          categories={cards}
          columns={2}
          cardSize="medium"
        />
      </main>
    </div>
  );
}
