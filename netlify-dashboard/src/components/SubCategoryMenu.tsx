import { CategoryCard } from './CategoryCard';

interface SubCategory {
  title: string;
  subtitle?: string;
  icon: string;
  path: string;
  color: string;
}

interface SubCategoryMenuProps {
  title?: string;
  subtitle?: string;
  categories: SubCategory[];
  columns?: 2 | 3 | 4;
  cardSize?: 'small' | 'medium' | 'large';
}

export function SubCategoryMenu({ 
  title, 
  subtitle, 
  categories, 
  columns = 2,
  cardSize = 'medium' 
}: SubCategoryMenuProps) {
  return (
    <div className="subcategory-menu">
      {(title || subtitle) && (
        <div className="subcategory-header">
          {title && <h2 className="subcategory-title">{title}</h2>}
          {subtitle && <p className="subcategory-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className={`subcategory-grid columns-${columns}`}>
        {categories.map((category, index) => (
          <CategoryCard
            key={index}
            title={category.title}
            subtitle={category.subtitle}
            icon={category.icon}
            color={category.color}
            size={cardSize}
            to={category.path}
          />
        ))}
      </div>
    </div>
  );
}
