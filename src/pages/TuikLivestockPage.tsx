import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTuikLivestockData } from './tuikLivestock/useTuikLivestockData';
import { ANIMAL_GROUPS, YEARS, REGION_COLORS } from './tuikLivestock/tuikLivestockTypes';
import OverviewTab from './tuikLivestock/OverviewTab';
import RegionalTab from './tuikLivestock/RegionalTab';
import TrendsTab from './tuikLivestock/TrendsTab';
import CorrelationsTab from './tuikLivestock/CorrelationsTab';

export default function TuikLivestockPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const data = useTuikLivestockData();
  const {
    selectedYear, setSelectedYear,
    selectedAnimal, setSelectedAnimal,
    selectedCategory, setSelectedCategory,
    selectedRegion, setSelectedRegion,
    activeTab, setActiveTab,
    loading,
    yearLabel, categories,
    cityData, yearlyData,
    totalValue, provinceCount, topCity, topCityValue, avgValue, yearChange,
    groupChartData, growthData, categoryData,
    regionalAnalysis, cityDataForSelectedRegion, totalSelectedRegion, heatmapData,
    cagrAnalysis, regressionAnalysis, anomalies, scatterData, sankeyData,
    correlationLinks,
  } = data;

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`livestock_${selectedAnimal}_${selectedYear}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDF oluşturma hatası');
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const cityWS = XLSX.utils.json_to_sheet(cityData.map(c => ({
        'İl': c.name,
        'Değer': c.value,
        'Pay (%)': c.share
      })));
      XLSX.utils.book_append_sheet(wb, cityWS, 'İller');
      const yearWS = XLSX.utils.json_to_sheet(yearlyData);
      XLSX.utils.book_append_sheet(wb, yearWS, 'Yıllık');
      XLSX.writeFile(wb, `livestock_${selectedAnimal}_${selectedYear}.xlsx`);
    } catch (e) {
      console.error('Excel export error:', e);
      alert('Excel oluşturma hatası');
    }
  };

  return (
    <div ref={pageRef}>
      <div className="page-header" style={{ position: 'relative' }}>
        <h1 className="page-title">📊 TÜİK Canlı Hayvan Envanteri ve Trend Analizi</h1>
        <p className="page-subtitle">Türkiye İl ve Bölge Bazında Kapsamlı Hayvancılık İstatistikleri — {yearLabel} (Kaynak: TÜİK)</p>

        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.5 : 1
            }}
          >
            📥 Export
          </button>
          {exportMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '150px'
            }}>
              <button
                onClick={() => { exportToPDF(); setExportMenuOpen(false); }}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: 'var(--text-primary)', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📄 PDF
              </button>
              <button
                onClick={() => { exportToExcel(); setExportMenuOpen(false); }}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: 'var(--text-primary)', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px', borderTop: '1px solid var(--border)' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📊 Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {([
          { key: 'overview', label: '📋 Genel Bakış' },
          { key: 'regional', label: '🗺️ Bölgesel Analiz' },
          { key: 'trends', label: '📈 Trend & Tahmin' },
          { key: 'correlations', label: '🔗 Korelasyonlar' }
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.key ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #f59e0b' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '700' : '600',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              borderRadius: '8px 8px 0 0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Hayvan Grubu</label>
          <select className="filter-select" value={selectedAnimal} onChange={(e) => setSelectedAnimal(e.target.value)}>
            {ANIMAL_GROUPS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.icon} {opt.name}</option>
            ))}
          </select>
        </div>
        {activeTab === 'regional' && (
          <div className="filter-group">
            <label className="filter-label">Bölge</label>
            <select className="filter-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        )}
        {categories.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Alt Kategori</label>
            <select className="filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="Tümü">Tümü</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {[...YEARS].reverse().map(year => (
              <option key={year} value={`y${year}`}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              selectedAnimal={selectedAnimal}
              selectedCategory={selectedCategory}
              yearLabel={yearLabel}
              totalValue={totalValue}
              provinceCount={provinceCount}
              topCity={topCity}
              topCityValue={topCityValue}
              avgValue={avgValue}
              yearChange={yearChange}
              groupChartData={groupChartData}
              yearlyData={yearlyData}
              growthData={growthData}
              categoryData={categoryData}
              cityData={cityData}
              cagrAnalysis={cagrAnalysis}
            />
          )}
          {activeTab === 'regional' && (
            <RegionalTab
              selectedAnimal={selectedAnimal}
              selectedRegion={selectedRegion}
              regionalAnalysis={regionalAnalysis}
              cityDataForSelectedRegion={cityDataForSelectedRegion}
              totalSelectedRegion={totalSelectedRegion}
              heatmapData={heatmapData}
            />
          )}
          {activeTab === 'trends' && (
            <TrendsTab
              selectedAnimal={selectedAnimal}
              yearLabel={yearLabel}
              cagrAnalysis={cagrAnalysis}
              regressionAnalysis={regressionAnalysis}
              yearlyData={yearlyData}
              anomalies={anomalies}
              scatterData={scatterData}
              sankeyData={sankeyData}
            />
          )}
          {activeTab === 'correlations' && (
            <CorrelationsTab
              correlationLinks={correlationLinks}
            />
          )}
        </>
      )}
    </div>
  );
}
