import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

// Hayvansal ürün listesi - bunları filtreleyip bitkisel sayfada göstermiyoruz
const ANIMAL_PRODUCTS = [
  'Büyükbaş (sığır) Eti',
  'Küçükbaş Eti',
  'Piliç Eti',
  'Hindi Eti',
  'Konsantre Süt',
  'Büyükbaş Kasaplık',
  'Küçükbaş Kasaplık',
  'Besilik Büyükbaş',
  'Damızlık Büyükbaş',
  'Damızlık Küçükbaş'
];

interface TradeData {
  id: string;
  ana_urun: string;
  yil: string;
  ay: string;
  alt_urun: string;
  ulke: string;
  ihracat_mik: number;
  ithalat_mik: number;
  ihracat_deger: number;
  ithalat_deger: number;
}

interface ProductSummary {
  urun: string;
  toplamIhracat: number;
  toplamIthalat: number;
  ihracatDeger: number;
  ithalatDeger: number;
  denge: number;
}

interface CountrySummary {
  ulke: string;
  ihracat: number;
  ithalat: number;
  denge: number;
}

interface YearlyTrend {
  yil: string;
  ihracat: number;
  ithalat: number;
}

function formatNumber(value: number, unit?: string): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toLocaleString('tr-TR') + (unit ? ' ' + unit : '');
}

function formatNumberWithUnit(value: number): string {
  const unit = 'Ton';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ' + unit;
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ' + unit;
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ' + unit;
  return value.toLocaleString('tr-TR') + ' ' + unit;
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

function formatMoney(value: number): string {
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
  return '$' + value.toLocaleString('tr-TR');
}

export default function TuikPlantTradePage() {
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(['2024']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [allData, setAllData] = useState<TradeData[]>([]);
  const [productSummary, setProductSummary] = useState<ProductSummary[]>([]);
  const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<YearlyTrend[]>([]);
  const [viewMode, setViewMode] = useState<'export' | 'import' | 'both'>('both');

  // Meta veri yükleme - hayvansal ürünleri filtrele
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const animalFilter = ANIMAL_PRODUCTS.map(p => `'${p}'`).join(',');
        
        const [productRes, yearRes] = await Promise.all([
          fetchQuery(`SELECT DISTINCT ana_urun FROM tuik_ticaret WHERE ana_urun NOT IN (${animalFilter}) ORDER BY ana_urun`),
          fetchQuery('SELECT DISTINCT yil FROM tuik_ticaret ORDER BY yil DESC')
        ]);

        if (productRes.data) {
          const products = productRes.data.map((item: Record<string, string | number>) => String(item.ana_urun));
          setProductList(products);
          // İlk 2 ürünü varsayılan olarak seç
          if (products.length > 0) {
            setSelectedProducts(products.slice(0, 2));
          }
        }
        if (yearRes.data) {
          const years = yearRes.data.map((item: Record<string, string | number>) => String(item.yil));
          setYearOptions(years);
        }
      } catch (error) {
        console.error('Meta veri yüklenirken hata:', error);
      }
    };
    loadMeta();
  }, []);

  // Veri yükleme
  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setAllData([]);
      return;
    }

    setLoading(true);
    try {
      const productFilter = selectedProducts.map(p => `'${p}'`).join(',');
      const yearFilter = selectedYears.map(y => `'${y}'`).join(',');
      const monthFilter = selectedMonths.length > 0 ? selectedMonths.map(m => `'${m}'`).join(',') : null;
      
      const dataQuery = `
        SELECT * FROM tuik_ticaret 
        WHERE ana_urun IN (${productFilter}) AND yil IN (${yearFilter})
        ${monthFilter ? `AND ay IN (${monthFilter})` : ''}
        ORDER BY ana_urun, ulke
      `;

      const productSummaryQuery = `
        SELECT ana_urun as urun,
          SUM(ihracat_mik) as toplamIhracat,
          SUM(ithalat_mik) as toplamIthalat,
          SUM(ihracat_deger) as ihracatDeger,
          SUM(ithalat_deger) as ithalatDeger
        FROM tuik_ticaret
        WHERE ana_urun IN (${productFilter}) AND yil IN (${yearFilter})
        ${monthFilter ? `AND ay IN (${monthFilter})` : ''}
        GROUP BY ana_urun
      `;

      const countrySummaryQuery = `
        SELECT ulke,
          SUM(ihracat_mik) as ihracat,
          SUM(ithalat_mik) as ithalat
        FROM tuik_ticaret
        WHERE ana_urun IN (${productFilter}) AND yil IN (${yearFilter})
        ${monthFilter ? `AND ay IN (${monthFilter})` : ''}
        GROUP BY ulke
        ORDER BY (SUM(ihracat_mik) + SUM(ithalat_mik)) DESC
        LIMIT 20
      `;

      const yearlyTrendQuery = `
        SELECT yil,
          SUM(ihracat_mik) as ihracat,
          SUM(ithalat_mik) as ithalat
        FROM tuik_ticaret
        WHERE ana_urun IN (${productFilter})
        GROUP BY yil
        ORDER BY yil
      `;

      const [dataRes, productRes, countryRes, trendRes] = await Promise.all([
        fetchQuery(dataQuery),
        fetchQuery(productSummaryQuery),
        fetchQuery(countrySummaryQuery),
        fetchQuery(yearlyTrendQuery)
      ]);

      if (dataRes.data) {
        const mapped = dataRes.data.map((item: Record<string, string | number>) => ({
          id: String(item.id),
          ana_urun: String(item.ana_urun),
          yil: String(item.yil),
          ay: String(item.ay),
          alt_urun: String(item.alt_urun),
          ulke: String(item.ulke),
          ihracat_mik: Number(item.ihracat_mik) || 0,
          ithalat_mik: Number(item.ithalat_mik) || 0,
          ihracat_deger: Number(item.ihracat_deger) || 0,
          ithalat_deger: Number(item.ithalat_deger) || 0
        }));
        setAllData(mapped);
      }

      if (productRes.data) {
        const mapped = productRes.data.map((item: Record<string, string | number>) => ({
          urun: String(item.urun),
          toplamIhracat: Number(item.toplamIhracat) || 0,
          toplamIthalat: Number(item.toplamIthalat) || 0,
          ihracatDeger: Number(item.ihracatDeger) || 0,
          ithalatDeger: Number(item.ithalatDeger) || 0,
          denge: (Number(item.ihracatDeger) || 0) - (Number(item.ithalatDeger) || 0)
        }));
        setProductSummary(mapped);
      }

      if (countryRes.data) {
        const mapped = countryRes.data.map((item: Record<string, string | number>) => ({
          ulke: String(item.ulke),
          ihracat: Number(item.ihracat) || 0,
          ithalat: Number(item.ithalat) || 0,
          denge: (Number(item.ihracat) || 0) - (Number(item.ithalat) || 0)
        }));
        setCountrySummary(mapped);
      }

      if (trendRes.data) {
        const mapped = trendRes.data.map((item: Record<string, string | number>) => ({
          yil: String(item.yil),
          ihracat: Number(item.ihracat) || 0,
          ithalat: Number(item.ithalat) || 0
        }));
        setYearlyTrend(mapped);
      }

      setLoading(false);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      setLoading(false);
    }
  }, [selectedProducts, selectedYears, selectedMonths]);

  useEffect(() => {
    if (selectedProducts.length > 0 && selectedYears.length > 0) {
      loadData();
    }
  }, [loadData]);

  // Hesaplamalar
  const totalExport = productSummary.reduce((sum, p) => sum + p.toplamIhracat, 0);
  const totalImport = productSummary.reduce((sum, p) => sum + p.toplamIthalat, 0);
  const totalExportValue = productSummary.reduce((sum, p) => sum + p.ihracatDeger, 0);
  const totalImportValue = productSummary.reduce((sum, p) => sum + p.ithalatDeger, 0);
  const tradeBal = totalExportValue - totalImportValue;
  const countryCount = new Set(allData.map(d => d.ulke)).size;

  // İhracat için PieChart verisi
  const exportPieData = productSummary
    .filter(p => p.toplamIhracat > 0)
    .map(p => ({ name: p.urun, value: p.toplamIhracat }))
    .slice(0, 10);

  // İthalat için PieChart verisi
  const importPieData = productSummary
    .filter(p => p.toplamIthalat > 0)
    .map(p => ({ name: p.urun, value: p.toplamIthalat }))
    .slice(0, 10);

  // Ülke bazlı veriler
  const exportCountries = countrySummary.filter(c => c.ihracat > c.ithalat).slice(0, 10);
  const importCountries = countrySummary.filter(c => c.ithalat > c.ihracat).slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌾 TÜİK Bitkisel Dış Ticaret Analizi</h1>
        <p className="page-subtitle">
          TÜİK Resmi Verileri • Ülke Bazlı • Aylık Detay • İhracat & İthalat
        </p>
      </div>

      {/* Filtreler */}
      <div className="date-filter" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="filter-group" style={{ position: 'relative' }}>
          <label className="filter-label">Ürün Seçimi ({selectedProducts.length} seçili)</label>
          <div 
            onClick={() => setShowProductDropdown(!showProductDropdown)}
            style={{ 
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              cursor: 'pointer',
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '13px', color: selectedProducts.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {selectedProducts.length > 0 ? `${selectedProducts.length} ürün seçildi` : 'Ürün seçin...'}
            </span>
          </div>
          {showProductDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              padding: '8px'
            }}>
              <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedProducts(productList); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Tümü</button>
                <button onClick={(e) => { e.stopPropagation(); setSelectedProducts([]); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Temizle</button>
              </div>
              {productList.map(product => (
                <label 
                  key={product}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input 
                    type="checkbox"
                    checked={selectedProducts.includes(product)}
                    onChange={() => {
                      setSelectedProducts(prev => 
                        prev.includes(product) 
                          ? prev.filter(p => p !== product)
                          : [...prev, product]
                      );
                    }}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{product}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="filter-group" style={{ position: 'relative' }}>
          <label className="filter-label">Yıl Seçimi ({selectedYears.length} seçili)</label>
          <div 
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            style={{ 
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              cursor: 'pointer',
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '13px', color: selectedYears.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {selectedYears.length > 0 ? selectedYears.join(', ') : 'Yıl seçin...'}
            </span>
          </div>
          {showYearDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              padding: '8px'
            }}>
              <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedYears(yearOptions); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Tümü</button>
                <button onClick={(e) => { e.stopPropagation(); setSelectedYears([]); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Temizle</button>
              </div>
              {yearOptions.map(year => (
                <label 
                  key={year}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input 
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={() => {
                      setSelectedYears(prev => 
                        prev.includes(year) 
                          ? prev.filter(y => y !== year)
                          : [...prev, year]
                      );
                    }}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{year}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="filter-group" style={{ position: 'relative' }}>
          <label className="filter-label">Ay Seçimi ({selectedMonths.length > 0 ? selectedMonths.length : 'Tüm'} ay)</label>
          <div 
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            style={{ 
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              cursor: 'pointer',
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '13px', color: selectedMonths.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {selectedMonths.length > 0 ? `${selectedMonths.length} ay seçildi` : 'Tüm aylar'}
            </span>
          </div>
          {showMonthDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              padding: '8px'
            }}>
              <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedMonths(['01','02','03','04','05','06','07','08','09','10','11','12']); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Tümü</button>
                <button onClick={(e) => { e.stopPropagation(); setSelectedMonths([]); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', background: 'var(--border)', border: 'none', cursor: 'pointer' }}>Temizle</button>
              </div>
              {[{v:'01',n:'Ocak'},{v:'02',n:'Şubat'},{v:'03',n:'Mart'},{v:'04',n:'Nisan'},{v:'05',n:'Mayıs'},{v:'06',n:'Haziran'},{v:'07',n:'Temmuz'},{v:'08',n:'Ağustos'},{v:'09',n:'Eylül'},{v:'10',n:'Ekim'},{v:'11',n:'Kasım'},{v:'12',n:'Aralık'}].map(month => (
                <label 
                  key={month.v}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input 
                    type="checkbox"
                    checked={selectedMonths.includes(month.v)}
                    onChange={() => {
                      setSelectedMonths(prev => 
                        prev.includes(month.v) 
                          ? prev.filter(m => m !== month.v)
                          : [...prev, month.v]
                      );
                    }}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{month.n}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="filter-group">
          <label className="filter-label">Görünüm Modu</label>
          <select 
            className="filter-select" 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
          >
            <option value="both">İhracat & İthalat</option>
            <option value="export">Sadece İhracat</option>
            <option value="import">Sadece İthalat</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {(viewMode === 'both' || viewMode === 'export') && (
              <div className="kpi-card large">
                <div className="kpi-header">
                  <span className="kpi-title">TOPLAM İHRACAT</span>
                  <div className="kpi-icon green">🚢</div>
                </div>
                <div className="kpi-value">{formatNumber(totalExport)}</div>
                <div className="kpi-subtitle">{formatMoney(totalExportValue)}</div>
              </div>
            )}
            {(viewMode === 'both' || viewMode === 'import') && (
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">TOPLAM İTHALAT</span>
                  <div className="kpi-icon red">📦</div>
                </div>
                <div className="kpi-value">{formatNumber(totalImport)}</div>
                <div className="kpi-subtitle">{formatMoney(totalImportValue)}</div>
              </div>
            )}
            {viewMode === 'both' && (
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">TİCARET DENGESİ</span>
                  <div className={`kpi-icon ${tradeBal >= 0 ? 'green' : 'red'}`}>{tradeBal >= 0 ? '📈' : '📉'}</div>
                </div>
                <div className="kpi-value" style={{ color: tradeBal >= 0 ? '#22c55e' : '#ef4444' }}>
                  {tradeBal >= 0 ? '+' : ''}{formatMoney(tradeBal)}
                </div>
                <div className="kpi-subtitle">{tradeBal >= 0 ? 'Fazla' : 'Açık'}</div>
              </div>
            )}
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ÜLKE SAYISI</span>
                <div className="kpi-icon blue">🌍</div>
              </div>
              <div className="kpi-value">{countryCount}</div>
              <div className="kpi-subtitle">Ticaret yapılan</div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="chart-grid">
            {/* Yıllık Trend */}
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık Dış Ticaret Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={yearlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                  <Legend />
                  {(viewMode === 'both' || viewMode === 'export') && (
                    <Line type="monotone" dataKey="ihracat" stroke="#22c55e" name="İhracat" strokeWidth={2} />
                  )}
                  {(viewMode === 'both' || viewMode === 'import') && (
                    <Line type="monotone" dataKey="ithalat" stroke="#ef4444" name="İthalat" strokeWidth={2} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* İhracat Dağılımı */}
            {(viewMode === 'both' || viewMode === 'export') && (
              <div className="chart-card">
                <h3 className="chart-title">📤 İhracat Dağılımı ({selectedYears.join(', ')})</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={exportPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {exportPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* İthalat Dağılımı */}
            {(viewMode === 'both' || viewMode === 'import') && (
              <div className="chart-card">
                <h3 className="chart-title">📥 İthalat Dağılımı ({selectedYears.join(', ')})</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={importPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {importPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* İhracat Ülkeleri */}
            {(viewMode === 'both' || viewMode === 'export') && exportCountries.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">📤 Top 10 İhracat Ülkeleri</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={exportCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="ulke" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                    <Bar dataKey="ihracat" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* İthalat Ülkeleri */}
            {(viewMode === 'both' || viewMode === 'import') && importCountries.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">📥 Top 10 İthalat Ülkeleri</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={importCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="ulke" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                    <Bar dataKey="ithalat" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Ürün Karşılaştırma */}
          <div className="chart-card">
            <h3 className="chart-title">📊 Ürün Bazlı Dış Ticaret ({selectedYears.join(', ')})</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={productSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="urun" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatNumberWithUnit(value)} />
                <Legend />
                {(viewMode === 'both' || viewMode === 'export') && (
                  <Bar dataKey="toplamIhracat" fill="#22c55e" name="İhracat" />
                )}
                {(viewMode === 'both' || viewMode === 'import') && (
                  <Bar dataKey="toplamIthalat" fill="#ef4444" name="İthalat" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
