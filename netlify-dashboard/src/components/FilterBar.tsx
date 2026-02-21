import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface FilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
}

interface MultiSelectFilterProps {
  label: string;
  values: string[];
  options: FilterOption[];
  onChange: (values: string[]) => void;
  icon?: ReactNode;
  placeholder?: string;
  searchable?: boolean;
}

interface FilterBarProps {
  children: ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECT FILTER (tek seçim)
// ─────────────────────────────────────────────────────────────────────────────
export function SelectFilter({ label, value, options, onChange, icon }: SelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="filter-item" ref={ref}>
      <span className="filter-item-label">{icon}{label}</span>
      <button
        type="button"
        className="filter-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected?.label || 'Seçin'}</span>
        <ChevronDown size={16} className={open ? 'rotate' : ''} />
      </button>

      {open && (
        <div className="filter-dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`filter-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI SELECT FILTER (çoklu seçim)
// ─────────────────────────────────────────────────────────────────────────────
export function MultiSelectFilter({
  label,
  values,
  options,
  onChange,
  icon,
  placeholder = 'Seçin...',
  searchable = true,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (values.includes(val)) {
      if (values.length > 1) onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const selectAll = () => onChange(options.map(o => o.value));
  const clearAll = () => onChange(options.length ? [options[0].value] : []);

  const displayLabel = () => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) return options.find(o => o.value === values[0])?.label || values[0];
    if (values.length === options.length) return 'Tümü';
    return `${values.length} seçili`;
  };

  return (
    <div className="filter-item filter-item--multi" ref={ref}>
      <span className="filter-item-label">{icon}{label}</span>
      <button
        type="button"
        className="filter-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span className="filter-trigger-text">{displayLabel()}</span>
        {values.length > 0 && (
          <X
            size={14}
            className="filter-clear"
            onClick={e => { e.stopPropagation(); clearAll(); }}
          />
        )}
        <ChevronDown size={16} className={open ? 'rotate' : ''} />
      </button>

      {open && (
        <div className="filter-dropdown filter-dropdown--multi">
          {searchable && (
            <div className="filter-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="filter-actions">
            <button type="button" onClick={selectAll}>Tümünü Seç</button>
            <button type="button" onClick={clearAll}>Temizle</button>
          </div>
          <div className="filter-options">
            {filtered.map(opt => {
              const checked = values.includes(opt.value);
              return (
                <label key={opt.value} className={`filter-checkbox ${checked ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                  />
                  <span className="checkbox-box" />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
