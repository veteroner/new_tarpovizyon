import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import '../styles/BackToHome.css';

type BackToHomeProps = {
  showBackButton?: boolean;
  backPath?: string;
  backLabel?: string;
};

export function BackToHome({ showBackButton = false, backPath, backLabel }: BackToHomeProps) {
  const navigate = useNavigate();

  return (
    <div className="back-to-home-container">
      {showBackButton && backPath && (
        <button
          className="back-button"
          onClick={() => navigate(backPath)}
          aria-label={backLabel || 'Geri dön'}
        >
          <ArrowLeft size={18} />
          <span>{backLabel || 'Geri'}</span>
        </button>
      )}
      
      <button
        className="home-button"
        onClick={() => navigate('/')}
        aria-label="Ana sayfaya dön"
      >
        <Home size={18} />
        <span>Ana Sayfa</span>
      </button>
    </div>
  );
}
