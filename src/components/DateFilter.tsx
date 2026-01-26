import { Calendar } from 'lucide-react';

interface DateFilterProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
  availableYears: string[];
}

export function DateFilter({ selectedYear, onYearChange, availableYears }: DateFilterProps) {
  return (
    <div className="date-filter">
      <div className="filter-group">
        <label className="filter-label">
          <Calendar size={16} />
          <span>Yıl Seçin</span>
        </label>
        <select 
          className="filter-select"
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
        >
          <option value="all">Tüm Yıllar</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
