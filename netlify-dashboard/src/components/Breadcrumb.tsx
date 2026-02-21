import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav className="breadcrumb">
      <button 
        className="breadcrumb-item breadcrumb-home"
        onClick={() => navigate('/')}
      >
        <Home size={16} />
      </button>
      
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-segment">
          <ChevronRight size={14} className="breadcrumb-separator" />
          {item.path ? (
            <button 
              className="breadcrumb-item breadcrumb-link"
              onClick={() => navigate(item.path!)}
            >
              {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ) : (
            <span className="breadcrumb-item breadcrumb-current">
              {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
