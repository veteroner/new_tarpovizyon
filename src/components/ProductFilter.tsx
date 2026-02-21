import { useState, useEffect, useMemo } from 'react';
import { Package, Search, X } from 'lucide-react';

interface ProductFilterProps {
  products: string[];
  selectedProducts: string[];
  onSelectionChange: (selected: string[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
  label?: string;
}

export function ProductFilter({
  products,
  selectedProducts,
  onSelectionChange,
  multiSelect = false,
  placeholder = 'Ürün seçin...',
  label = 'Ürün Filtresi'
}: ProductFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((product) =>
      product.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleToggle = (product: string) => {
    if (multiSelect) {
      if (selectedProducts.includes(product)) {
        onSelectionChange(selectedProducts.filter((p) => p !== product));
      } else {
        onSelectionChange([...selectedProducts, product]);
      }
    } else {
      onSelectionChange([product]);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onSelectionChange([]);
    setSearchTerm('');
  };

  const displayText = useMemo(() => {
    if (selectedProducts.length === 0) return placeholder;
    if (selectedProducts.length === 1) return selectedProducts[0];
    return `${selectedProducts.length} ürün seçildi`;
  }, [selectedProducts, placeholder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-filter-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="filter-group product-filter-container" style={{ position: 'relative', minWidth: '250px' }}>
      <label className="filter-label">
        <Package size={14} />
        {label}
      </label>

      {/* Selected display with dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px 40px 12px 16px',
          background: 'var(--bg-card)',
          border: '2px solid var(--border)',
          borderRadius: '10px',
          color: selectedProducts.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s',
          userSelect: 'none'
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {displayText}
        </span>
        
        {selectedProducts.length > 0 && (
          <X
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search input */}
          <div style={{ 
            padding: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '8px 8px 8px 34px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Product list */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '320px'
          }}>
            {filteredProducts.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                Ürün bulunamadı
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product);
                
                return (
                  <div
                    key={product}
                    onClick={() => handleToggle(product)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {product}
                    </span>
                    {isSelected && (
                      <span style={{ 
                        color: 'var(--primary)',
                        fontSize: '16px',
                        fontWeight: 700
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with clear all button (multi-select only) */}
          {multiSelect && selectedProducts.length > 0 && (
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 500
              }}>
                {selectedProducts.length} seçildi
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
