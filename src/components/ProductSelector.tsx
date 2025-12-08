import { useState, useRef, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  nameTR: string;
}

interface ProductSelectorProps {
  products: Product[];
  selectedProducts: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function ProductSelector({ 
  products, 
  selectedProducts, 
  onSelectionChange,
  placeholder = "Ürün Seçin..."
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nameTR.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      // En az 1 ürün seçili kalmalı
      if (selectedProducts.length > 1) {
        onSelectionChange(selectedProducts.filter(id => id !== productId));
      }
    } else {
      onSelectionChange([...selectedProducts, productId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(products.map(p => p.id));
  };

  const clearAll = () => {
    // En az ilk ürünü seçili bırak
    if (products.length > 0) {
      onSelectionChange([products[0].id]);
    }
  };

  const getSelectedNames = () => {
    if (selectedProducts.length === 0) return placeholder;
    if (selectedProducts.length === 1) {
      const product = products.find(p => p.id === selectedProducts[0]);
      return product?.nameTR || product?.name || placeholder;
    }
    if (selectedProducts.length === products.length) return "Tümü Seçili";
    return `${selectedProducts.length} ürün seçili`;
  };

  return (
    <div className="product-selector" ref={dropdownRef}>
      <div 
        className="selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selector-value">{getSelectedNames()}</span>
        <svg 
          className={`selector-arrow ${isOpen ? 'open' : ''}`} 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div className="selector-dropdown">
          <div className="selector-search">
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="selector-actions">
            <button onClick={selectAll} className="action-btn">Tümünü Seç</button>
            <button onClick={clearAll} className="action-btn">Temizle</button>
          </div>

          <div className="selector-options">
            {filteredProducts.map(product => (
              <label key={product.id} className="selector-option">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                <span className="option-checkbox"></span>
                <span className="option-label">
                  <span className="option-name-tr">{product.nameTR}</span>
                  <span className="option-name-en">{product.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .product-selector {
          position: relative;
          min-width: 280px;
        }

        .selector-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .selector-trigger:hover {
          border-color: var(--primary);
        }

        .selector-value {
          font-weight: 600;
          color: var(--text-primary);
        }

        .selector-arrow {
          color: var(--text-secondary);
          transition: transform 0.2s ease;
        }

        .selector-arrow.open {
          transform: rotate(180deg);
        }

        .selector-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          max-height: 400px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .selector-search {
          padding: 12px;
          border-bottom: 1px solid var(--border);
        }

        .selector-search input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .selector-search input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .selector-actions {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
        }

        .action-btn {
          flex: 1;
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .selector-options {
          overflow-y: auto;
          max-height: 280px;
          padding: 8px;
        }

        .selector-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .selector-option:hover {
          background: var(--bg-primary);
        }

        .selector-option input {
          display: none;
        }

        .option-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .selector-option input:checked + .option-checkbox {
          background: var(--primary);
          border-color: var(--primary);
        }

        .selector-option input:checked + .option-checkbox::after {
          content: '✓';
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .option-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .option-name-tr {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }

        .option-name-en {
          font-size: 12px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
