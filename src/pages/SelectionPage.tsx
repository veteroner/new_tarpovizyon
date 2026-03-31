import { useNavigate } from 'react-router-dom';
import { Globe, MapPin, BarChart3, Bot } from 'lucide-react';
import '../styles/SelectionPage.css';

export function SelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="selection-container">
      <div className="selection-content">
        {/* Header */}
        <div className="selection-header">
          <h1 className="selection-title">TARPOL TarpoVizyon</h1>
          <p className="selection-subtitle">
            Tarımsal Strateji ve Politika Geliştirme Merkezi
          </p>
        </div>

        {/* Selection Cards */}
        <div className="selection-grid">
          <button
            className="selection-card world-card"
            onClick={() => navigate('/tarpovizyon/world')}
            aria-label="Dünya verilerine git"
          >
            <div className="selection-icon-wrapper">
              <Globe size={72} strokeWidth={1.5} />
            </div>
            <h2 className="selection-card-title">DÜNYA VERİLERİ</h2>
            <p className="selection-card-description">
              FAO dünya tarım verileri, ülke karşılaştırmaları ve global trendler
            </p>
            <div className="selection-arrow">→</div>
          </button>

          <button
            className="selection-card turkey-card"
            onClick={() => navigate('/tarpovizyon/turkey')}
            aria-label="Türkiye verilerine git"
          >
            <div className="selection-icon-wrapper">
              <MapPin size={72} strokeWidth={1.5} />
            </div>
            <h2 className="selection-card-title">TÜRKİYE VERİLERİ</h2>
            <p className="selection-card-description">
              TÜİK Türkiye tarım verileri, il bazında üretim ve ticaret istatistikleri
            </p>
            <div className="selection-arrow">→</div>
          </button>

          <button
            className="selection-card market-card"
            onClick={() => navigate('/tarpovizyon/commodity-prices')}
            aria-label="Canlı piyasa verilerine git"
          >
            <div className="selection-icon-wrapper">
              <BarChart3 size={72} strokeWidth={1.5} />
            </div>
            <h2 className="selection-card-title">CANLI VERİLER</h2>
            <p className="selection-card-description">
              Yahoo Finance canlı emtia fiyatları: tahıllar, yağlı tohumlar, hayvancılık
            </p>
            <div className="selection-arrow">→</div>
          </button>

          <button
            className="selection-card ai-card"
            onClick={() => navigate('/tarpovizyon/ai-assistant')}
            aria-label="AI asistana git"
          >
            <div className="selection-icon-wrapper">
              <Bot size={72} strokeWidth={1.5} />
            </div>
            <h2 className="selection-card-title">AI ASISTAN</h2>
            <p className="selection-card-description">
              Tarım, hayvancılık ve gıda sektörü hakkında yapay zeka destekli analizler
            </p>
            <div className="selection-arrow">→</div>
          </button>
        </div>

        {/* Footer */}
        <div className="selection-footer">
          <p>© 2024 TARPOL - Tarımsal Veri Analiz Platformu</p>
        </div>
      </div>
    </div>
  );
}
