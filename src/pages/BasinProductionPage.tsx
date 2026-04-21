import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchQuery } from '../services/api';
import {
  BasinData, BasinSummary, ProvinceBasinData, TopProduct, ProvinceDiversity,
  BasinProductionStats, MetricsData, BASIN_COLORS, formatNumber
} from './basin/basinUtils';
import BasinOverviewSection from './basin/BasinOverviewSection';
import BasinAnalysisSection from './basin/BasinAnalysisSection';
import BasinProvincesSection from './basin/BasinProvincesSection';
import BasinDistrictsSection from './basin/BasinDistrictsSection';

export default function BasinProductionPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'basins' | 'provinces' | 'districts'>('overview');
  const [loading, setLoading] = useState(true);
  const [allBasinData, setAllBasinData] = useState<BasinData[]>([]);
  const [basinSummary, setBasinSummary] = useState<BasinSummary[]>([]);
  const [provinceBasinData, setProvinceBasinData] = useState<ProvinceBasinData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingTopProducts, setLoadingTopProducts] = useState(false);
  const [provinceDiversity, setProvinceDiversity] = useState<ProvinceDiversity[]>([]);
  const [loadingDiversity, setLoadingDiversity] = useState(false);
  const [basinProductionStats, setBasinProductionStats] = useState<BasinProductionStats[]>([]);
  const [loadingBasinStats, setLoadingBasinStats] = useState(false);

  // Load all basin data
  const loadBasinData = useCallback(async () => {
    try {
      setLoading(true);
      const query = `
        SELECT 
          id,
          havid as basinId,
          havad as basinName,
          ilid as provinceId,
          ilad as provinceName,
          ilceid as districtId,
          ilcead as districtName
        FROM havza
        ORDER BY havad, ilad, ilcead
      `;
      
      const response = await fetchQuery(query);
      const data: BasinData[] = (response.data || []).map((row: Record<string, string | number>) => ({
        id: String(row.id),
        basinId: String(row.basinId),
        basinName: String(row.basinName || '').trim(),
        provinceId: String(row.provinceId),
        provinceName: String(row.provinceName || ''),
        districtId: String(row.districtId),
        districtName: String(row.districtName || '')
      }));
      
      setAllBasinData(data);
    } catch (error) {
      console.error('Error loading basin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTopProducts = useCallback(async () => {
    setLoadingTopProducts(true);
    try {
      const query = `SELECT urun, SUM(y2024+0) as toplam_ton FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND birim='Ton' AND (y2024+0) > 0 GROUP BY urun ORDER BY toplam_ton DESC LIMIT 12`;
      const response = await fetchQuery(query);
      setTopProducts((response.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (error) {
      console.error('Error loading top products:', error);
    } finally {
      setLoadingTopProducts(false);
    }
  }, []);

  const loadProvinceDiversity = useCallback(async () => {
    setLoadingDiversity(true);
    try {
      const query = `SELECT ili, COUNT(DISTINCT urun) as cesit_sayisi FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND (y2024+0) > 0 GROUP BY ili ORDER BY cesit_sayisi DESC`;
      const response = await fetchQuery(query);
      setProvinceDiversity((response.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        cesit_sayisi: String(r.cesit_sayisi || '0')
      })));
    } catch (error) {
      console.error('Error loading province diversity:', error);
    } finally {
      setLoadingDiversity(false);
    }
  }, []);

  const loadBasinProductionStats = useCallback(async () => {
    setLoadingBasinStats(true);
    try {
      const stats: BasinProductionStats[] = [];
      
      for (const basin of basinSummary) {
        const basinDistricts = allBasinData.filter(d => d.basinName === basin.basinName);
        const byProvince = new Map<string, Set<string>>();
        basinDistricts.forEach(d => {
          const cleanDistrict = d.districtName.replace(/\s*\/\s*[^/]+$/, '').trim();
          if (!byProvince.has(d.provinceName)) {
            byProvince.set(d.provinceName, new Set());
          }
          byProvince.get(d.provinceName)!.add(cleanDistrict);
        });

        const conditions: string[] = [];
        byProvince.forEach((districts, province) => {
          const districtList = Array.from(districts)
            .map(d => `UPPER('${d.replace(/'/g, "''")}')`)
            .join(', ');
          conditions.push(`(UPPER(ili)=UPPER('${province.replace(/'/g, "''")}') AND UPPER(yer) IN (${districtList}))`);
        });

        if (conditions.length === 0) continue;

        const whereClause = conditions.join(' OR ');
        const query = `
          SELECT 
            SUM(y2024+0) as toplam_uretim,
            COUNT(DISTINCT urun) as urun_cesit
          FROM tuik_bitkisel_uretim
          WHERE duzey='ilçe' 
            AND unsur='Üretim' 
            AND birim='Ton'
            AND (y2024+0) > 0
            AND (${whereClause})
        `;
        
        const response = await fetchQuery(query);
        const row = (response.data || [])[0];
        
        if (row) {
          stats.push({
            basinName: basin.basinName,
            toplam_uretim: Number(row.toplam_uretim || 0),
            urun_cesit: Number(row.urun_cesit || 0),
            color: basin.color
          });
        }
      }
      
      stats.sort((a, b) => b.toplam_uretim - a.toplam_uretim);
      setBasinProductionStats(stats);
    } catch (e) {
      console.error('Basin production stats load error:', e);
    } finally {
      setLoadingBasinStats(false);
    }
  }, [allBasinData, basinSummary]);

  // Initial load
  useEffect(() => {
    loadBasinData();
    loadTopProducts();
    loadProvinceDiversity();
  }, [loadBasinData, loadTopProducts, loadProvinceDiversity]);

  // Load basin production stats when basin data is ready
  useEffect(() => {
    if (basinSummary.length > 0 && allBasinData.length > 0) {
      loadBasinProductionStats();
    }
  }, [basinSummary, allBasinData, loadBasinProductionStats]);

  // Calculate basin summary statistics
  useEffect(() => {
    if (allBasinData.length === 0) return;

    const basinMap = new Map<string, { provinces: Set<string>; districts: Set<string> }>();
    
    allBasinData.forEach(item => {
      if (!item.basinName) return;
      
      if (!basinMap.has(item.basinName)) {
        basinMap.set(item.basinName, {
          provinces: new Set(),
          districts: new Set()
        });
      }
      
      const basin = basinMap.get(item.basinName)!;
      basin.provinces.add(item.provinceName);
      basin.districts.add(`${item.provinceName}-${item.districtName}`);
    });

    const summary: BasinSummary[] = Array.from(basinMap.entries())
      .map(([basinName, data]) => ({
        basinName,
        provinceCount: data.provinces.size,
        districtCount: data.districts.size,
        color: BASIN_COLORS[basinName] || '#95a5a6'
      }))
      .sort((a, b) => b.districtCount - a.districtCount);

    setBasinSummary(summary);
  }, [allBasinData]);

  // Calculate province-basin mapping
  useEffect(() => {
    if (allBasinData.length === 0) return;

    const provinceMap = new Map<string, Map<string, number>>();
    
    allBasinData.forEach(item => {
      if (!provinceMap.has(item.provinceName)) {
        provinceMap.set(item.provinceName, new Map());
      }
      
      const basinCounts = provinceMap.get(item.provinceName)!;
      basinCounts.set(item.basinName, (basinCounts.get(item.basinName) || 0) + 1);
    });

    const provinceData: ProvinceBasinData[] = Array.from(provinceMap.entries()).map(([province, basins]) => {
      let maxCount = 0;
      let dominantBasin = '';
      
      basins.forEach((count, basin) => {
        if (count > maxCount) {
          maxCount = count;
          dominantBasin = basin;
        }
      });

      const totalDistricts = Array.from(basins.values()).reduce((sum, count) => sum + count, 0);

      return {
        province,
        dominantBasin,
        basinCount: basins.size,
        districtCount: totalDistricts,
        color: BASIN_COLORS[dominantBasin] || '#95a5a6'
      };
    }).sort((a, b) => a.province.localeCompare(b.province, 'tr'));

    setProvinceBasinData(provinceData);
  }, [allBasinData]);

  // KPI Metrics
  const metrics: MetricsData = useMemo(() => {
    const uniqueBasins = new Set(allBasinData.map(d => d.basinName)).size;
    const uniqueProvinces = new Set(allBasinData.map(d => d.provinceName)).size;
    const uniqueDistricts = new Set(allBasinData.map(d => `${d.provinceName}-${d.districtName}`)).size;
    
    const largestBasin = basinSummary.length > 0 ? basinSummary[0] : null;

    return {
      totalBasins: uniqueBasins,
      totalProvinces: uniqueProvinces,
      totalDistricts: uniqueDistricts,
      largestBasin: largestBasin?.basinName || '-',
      largestBasinDistricts: largestBasin?.districtCount || 0
    };
  }, [allBasinData, basinSummary]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</div>
          <div style={{ fontSize: '18px', opacity: 0.9, color: 'var(--text-secondary)' }}>Havza Verileri Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'white' }}>
          🌊 Türkiye Hidrografik Havza Haritası
        </h1>
        <p style={{ fontSize: '16px', margin: '8px 0 0 0', color: 'rgba(255,255,255,0.95)' }}>
          30 Havza • 81 İl • {formatNumber(metrics.totalDistricts)} İlçe - Ürün Deseni Analiz Platformu
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: '📊 Genel Bakış' },
          { id: 'basins', label: '🌊 Havza Analizi' },
          { id: 'provinces', label: '🗺️ İl Dağılımı' },
          { id: 'districts', label: '📍 İlçe Haritası' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'basins' | 'provinces' | 'districts')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: activeTab === tab.id ? '2px solid var(--success)' : '1px solid var(--border)',
              background: activeTab === tab.id 
                ? 'var(--success)'
                : 'var(--bg-card)',
              color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'var(--shadow-sm)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <BasinOverviewSection
          metrics={metrics}
          basinSummary={basinSummary}
          topProducts={topProducts}
          loadingTopProducts={loadingTopProducts}
        />
      )}

      {activeTab === 'basins' && (
        <BasinAnalysisSection
          basinSummary={basinSummary}
          basinProductionStats={basinProductionStats}
          loadingBasinStats={loadingBasinStats}
          allBasinData={allBasinData}
        />
      )}

      {activeTab === 'provinces' && (
        <BasinProvincesSection
          provinceBasinData={provinceBasinData}
          provinceDiversity={provinceDiversity}
          loadingDiversity={loadingDiversity}
        />
      )}

      {activeTab === 'districts' && (
        <BasinDistrictsSection
          allBasinData={allBasinData}
          basinSummary={basinSummary}
        />
      )}
    </div>
  );
}
