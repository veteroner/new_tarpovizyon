import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Download } from 'lucide-react';

type AnyRecord = Record<string, unknown>;

interface Column<T extends object> {
  key: string;
  label: string;
  sortable?: boolean;
  formatter?: (value: unknown, row: T) => string | React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string; // e.g., '200px', '15%', 'minmax(150px, 1fr)'
  minWidth?: string;
  sticky?: boolean;
}

interface DetailedTableProps<T extends object> {
  data: T[];
  columns: Array<Column<T>>;
  itemsPerPage?: number;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  searchable?: boolean;
  exportable?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DetailedTable<T extends object>({
  data,
  columns,
  itemsPerPage = 20,
  defaultSortKey,
  defaultSortOrder = 'desc',
  searchable = true,
  exportable = true,
  emptyMessage,
  className = '',
}: DetailedTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey || columns[0]?.key || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as AnyRecord)[sortKey];
      const bVal = (b as AnyRecord)[sortKey];

      if (aVal === bVal) return 0;
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr < bStr ? -1 : 1;
      } else {
        return aStr > bStr ? -1 : 1;
      }
    });
  }, [filteredData, sortKey, sortOrder]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    const csvContent = [
      columns.map((col) => col.label).join(','),
      ...sortedData.map((row) =>
        columns.map((col) => {
          const value = (row as AnyRecord)[col.key];
          const formatted = col.formatter ? col.formatter(value, row) : value;
          // Remove JSX elements for CSV
          const strValue =
            typeof formatted === 'string' || typeof formatted === 'number' || typeof formatted === 'boolean'
              ? String(formatted)
              : String(value ?? '');
          return `"${strValue.replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className={`data-table ${className}`}>
      {/* Header with search and export */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {searchable && (
          <div style={{ 
            position: 'relative',
            flex: '1',
            minWidth: '280px',
            maxWidth: '450px'
          }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#667eea',
                opacity: 0.6
              }} 
            />
            <input
              type="text"
              placeholder="Ülke, miktar veya risk ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                border: '2px solid rgba(102, 126, 234, 0.15)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        )}
        
        {exportable && (
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            <Download size={17} strokeWidth={2.5} />
            <span>CSV İndir</span>
          </button>
        )}
      </div>

      {/* Results count */}
      <div style={{ 
        marginBottom: '16px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ 
          background: 'rgba(102, 126, 234, 0.1)',
          color: '#667eea',
          padding: '4px 10px',
          borderRadius: '6px',
          fontWeight: 700,
          fontSize: '12px'
        }}>
          {sortedData.length}
        </span>
        <span>sonuç bulundu</span>
        {searchTerm && (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            ({data.length} toplam kayıt)
          </span>
        )}
      </div>

      {/* Table container with modern styling */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: columns.map(col => 
            col.width || (col.align === 'right' ? 'minmax(110px, auto)' : 'minmax(150px, 1fr)')
          ).join(' '),
          gap: '16px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          borderBottom: '2px solid rgba(102, 126, 234, 0.15)',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          {columns.map((col) => (
            <div
              key={col.key}
              style={{
                textAlign: col.align || 'left',
                cursor: col.sortable !== false ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                gap: '6px',
                userSelect: 'none',
                transition: 'all 0.2s',
                opacity: col.sortable !== false ? 1 : 0.7
              }}
              onClick={() => col.sortable !== false && handleSort(col.key)}
              onMouseEnter={(e) => {
                if (col.sortable !== false) {
                  e.currentTarget.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              {col.label}
              {col.sortable !== false && sortKey === col.key && (
                <span style={{ color: '#667eea', display: 'flex', alignItems: 'center' }}>
                  {sortOrder === 'asc' ? <ChevronUp size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Table rows */}
        {paginatedData.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            background: 'var(--bg-primary)'
          }}>
            {searchTerm
              ? '🔍 Arama kriterine uygun sonuç bulunamadı.'
              : (emptyMessage || '📊 Veri bulunamadı.')}
          </div>
        ) : (
          paginatedData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="table-row"
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map(col => 
                  col.width || (col.align === 'right' ? 'minmax(110px, auto)' : 'minmax(150px, 1fr)')
                ).join(' '),
                gap: '16px',
                padding: '16px 20px',
                borderBottom: rowIndex === paginatedData.length - 1 ? 'none' : '1px solid var(--border-light)',
                background: rowIndex % 2 === 0 ? 'var(--bg-card)' : 'rgba(102, 126, 234, 0.02)',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                alignItems: 'center',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = rowIndex % 2 === 0 ? 'var(--bg-card)' : 'rgba(102, 126, 234, 0.02)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{
                    textAlign: col.align || 'left',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    whiteSpace: col.align === 'right' ? 'nowrap' : 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.5'
                  }}
                >
                  {(() => {
                    const rawValue = (row as AnyRecord)[col.key];
                    const rendered = col.formatter ? col.formatter(rawValue, row) : rawValue;
                    return (rendered ?? '') as React.ReactNode;
                  })()}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
          padding: '20px 0'
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '10px 18px',
              border: currentPage === 1 ? '2px solid var(--border)' : '2px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              background: currentPage === 1 ? 'var(--bg-primary)' : 'var(--bg-card)',
              color: currentPage === 1 ? 'var(--text-muted)' : '#667eea',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.2s',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (currentPage > 1) {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }}
          >
            ← Önceki
          </button>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <span style={{ 
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}>
              Sayfa
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#667eea'
            }}>
              {currentPage}
            </span>
            <span style={{ 
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}>
              /
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)'
            }}>
              {totalPages}
            </span>
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '10px 18px',
              border: currentPage === totalPages ? '2px solid var(--border)' : '2px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              background: currentPage === totalPages ? 'var(--bg-primary)' : 'var(--bg-card)',
              color: currentPage === totalPages ? 'var(--text-muted)' : '#667eea',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.2s',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (currentPage < totalPages) {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }}
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
