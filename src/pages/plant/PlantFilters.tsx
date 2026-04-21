import ProductSelector from '../../components/ProductSelector';
import { TURKEY_REGIONS, YEARS, UNSUR_OPTIONS } from './plantTypes';

interface PlantFiltersProps {
  productList: { id: string; name: string; nameTR: string }[];
  selectedProducts: string[];
  setSelectedProducts: (p: string[]) => void;
  filteredUnsurOptions: typeof UNSUR_OPTIONS;
  selectedUnsur: string;
  setSelectedUnsur: (u: string) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  provinceList: string[];
}

export default function PlantFilters({
  productList, selectedProducts, setSelectedProducts,
  filteredUnsurOptions, selectedUnsur, setSelectedUnsur,
  selectedYear, setSelectedYear,
  selectedRegion, setSelectedRegion,
  selectedProvince, setSelectedProvince,
  provinceList,
}: PlantFiltersProps) {
  return (
    <div className="date-filter" style={{ flexWrap: 'wrap' }}>
      <div className="filter-group">
        <label className="filter-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Ürün Seçimi
        </label>
        <ProductSelector
          products={productList}
          selectedProducts={selectedProducts}
          onSelectionChange={setSelectedProducts}
          placeholder="Ürün seçin..."
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Gösterge</label>
        <select className="filter-select" value={selectedUnsur}
          onChange={e => setSelectedUnsur(e.target.value)}>
          {filteredUnsurOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Yıl</label>
        <select className="filter-select" value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Bölge</label>
        <select className="filter-select" value={selectedRegion}
          onChange={e => { setSelectedRegion(e.target.value); setSelectedProvince(''); }}>
          <option value="">Tüm Türkiye</option>
          {Object.keys(TURKEY_REGIONS).sort().map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">İl</label>
        <select className="filter-select" value={selectedProvince}
          onChange={e => setSelectedProvince(e.target.value)}>
          <option value="">Tüm İller</option>
          {provinceList.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
}
