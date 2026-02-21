import { useNavigate } from 'react-router-dom';
import { BarChart3, Calculator, Wheat, Droplets, FlaskConical, Calendar } from 'lucide-react';
import './ProgramSelectionPage.css';

export function ProgramSelectionPage() {
  const navigate = useNavigate();

  const programs = [
    {
      id: 'tarpovizyon',
      title: 'Tarpovizyon',
      description: 'Tarım İstihbarat ve Analiz Platformu',
      subtitle: 'Dünya ve Türkiye tarım verileri, üretim, ticaret analizleri',
      icon: BarChart3,
      color: '#667eea',
      path: '/tarpovizyon',
    },
    {
      id: 'rasyon',
      title: 'TarpoRasyon',
      description: 'Hayvan Besleme ve Rasyon Optimizasyonu',
      subtitle: 'NRC 2021 standartlarına uygun akıllı rasyon hesaplama',
      icon: Calculator,
      color: '#16a34a',
      path: '/rasyon',
    },
    {
      id: 'hasat',
      title: 'Hasat Tahmini',
      description: 'Verim Tahmin ve Hasat Planlama Sistemi',
      subtitle: 'AI destekli hasat zamanı ve verim tahminleri',
      icon: Wheat,
      color: '#f59e0b',
      path: '/hasat-tahmini',
    },
    {
      id: 'sulama',
      title: 'Sulama Planlayıcı',
      description: 'Su İhtiyacı ve Sulama Programı Hesaplama',
      subtitle: 'ETo/ETc hesaplamaları ile optimize sulama planlaması',
      icon: Droplets,
      color: '#3b82f6',
      path: '/sulama-plan',
    },
    {
      id: 'gubre',
      title: 'Gübre Hesaplayıcı',
      description: 'NPK ve Besin Dengesi Yönetimi',
      subtitle: 'Toprak analizi bazlı gübre reçetesi ve maliyet optimizasyonu',
      icon: FlaskConical,
      color: '#a855f7',
      path: '/gubre-hesap',
    },
    {
      id: 'takvim',
      title: 'Tarımsal Takvim',
      description: 'Entegre Tarımsal Aktivite Planlayıcı',
      subtitle: 'Ekim, sulama, gübreleme ve hasat takvimi yönetimi',
      icon: Calendar,
      color: '#ec4899',
      path: '/tarim-takvim',
    },
  ];

  return (
    <div className="program-selection">
      <div className="program-selection__container">
        <header className="program-selection__header">
          <h1 className="program-selection__title">TARPOL</h1>
          <p className="program-selection__subtitle">Tarım Politika ve Yönetim Araçları</p>
        </header>

        <div className="program-selection__grid">
          {programs.map((program) => {
            const Icon = program.icon;
            return (
              <button
                key={program.id}
                className="program-card"
                onClick={() => navigate(program.path)}
                style={{ '--accent-color': program.color } as React.CSSProperties}
              >
                <div className="program-card__icon">
                  <Icon size={48} />
                </div>
                <h2 className="program-card__title">{program.title}</h2>
                <p className="program-card__description">{program.description}</p>
                <p className="program-card__subtitle">{program.subtitle}</p>
                <div className="program-card__action">
                  <span>Başla</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="program-selection__footer">
          <p>© 2026 TARPOL - Teknova Tarım Teknolojileri</p>
        </footer>
      </div>
    </div>
  );
}
