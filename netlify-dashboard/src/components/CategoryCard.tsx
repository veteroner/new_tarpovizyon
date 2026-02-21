import { useNavigate } from 'react-router-dom';

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  to: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
}

export function CategoryCard({ title, subtitle, icon, to, color, size = 'medium' }: CategoryCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={`category-card category-card--${size}`}
      style={{ '--card-color': color } as React.CSSProperties}
      onClick={() => navigate(to)}
    >
      <div className="category-card-icon">
        <span>{icon}</span>
      </div>
      <div className="category-card-content">
        <div className="category-card-title">{title}</div>
        {subtitle && <div className="category-card-subtitle">{subtitle}</div>}
      </div>
    </button>
  );
}
