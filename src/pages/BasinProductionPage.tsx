import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchRows, fetchAgg, num } from '../services/d1';

const R_URETIM = 'tuik/bitkisel-uretim';
// İlçe düzeyinde üretim (Ton) — havza sorgularının ortak süzgeci.
const ILCE_URETIM = { duzey: 'ilçe', unsur: 'Üretim', birim: 'Ton' };
const SON_YIL = 'y2024';
const buyuk = (v: unknown) => String(v ?? '').toLocaleUpperCase('tr');
import {
  BASIN_COLORS, formatNumber
} from './basin/basinUtils';
import type {
  BasinData, BasinSummary, ProvinceBasinData, TopProduct, ProvinceDiversity,
  BasinProductionStats, MetricsData,
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
      const havzaSatirlari = (await fetchRows('tr/havza', { limit: 10000 }))
        .sort((a, b) => String(a.havad).localeCompare(String(b.havad), 'tr')
          || String(a.ilad).localeCompare(String(b.ilad), 'tr')
          || String(a.ilcead).localeCompare(String(b.ilcead), 'tr'));
      const data: BasinData[] = havzaSatirlari.map((row) => ({
        id: String(row.id),
        basinId: String(row.havid),
        basinName: String(row.havad || '').trim(),
        provinceId: String(row.ilid),
        provinceName: String(row.ilad || ''),
        districtId: String(row.ilceid),
        districtName: String(row.ilcead || '')
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
      const response = { data: (await fetchAgg(R_URETIM, {
        groupBy: ['urun'], sum: [SON_YIL], where: ILCE_URETIM,
        orderBy: `sum_${SON_YIL}`, dir: 'desc', limit: 30,
      })).filter((r) => num(r[`sum_${SON_YIL}`]) > 0).slice(0, 12)
        .map((r) => ({ urun: r.urun, toplam_ton: num(r[`sum_${SON_YIL}`]) })) };
      setTopProducts((response.data || []).map((r) => ({
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
      // COUNT(DISTINCT urun) yalnızca (y2024+0)>0 satırlar için; üretimi sıfır
      // olan ürünler çeşitliliğe sayılmamalı, bu yüzden ürün kırılımı çekilip
      // istemcide sayılıyor.
      const ilUrun = await fetchAgg(R_URETIM, {
        groupBy: ['ili', 'urun'], sum: [SON_YIL], where: { duzey: 'ilçe', unsur: 'Üretim' },
      });
      const cesitHaritasi = new Map<string, number>();
      for (const r of ilUrun) {
        if (num(r[`sum_${SON_YIL}`]) <= 0) continue;
        const il = String(r.ili ?? '');
        cesitHaritasi.set(il, (cesitHaritasi.get(il) ?? 0) + 1);
      }
      const response = { data: [...cesitHaritasi.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([ili, cesit_sayisi]) => ({ ili, cesit_sayisi })) };
      setProvinceDiversity((response.data || []).map((r) => ({
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

      // Eskiden her havza için AYRI bir sorgu atılıyordu (30 istek). İlçe×ürün
      // kırılımı bir kez çekilip havzalara istemcide dağıtılıyor. Tek istek
      // toplama ucunun 20.000 satır sınırını aşıyor (~45.500 grup), bu yüzden
      // 3 ürün grubuna bölünüyor — her biri sınırın altında kalıyor.
      const urunGruplari = (await fetchAgg(R_URETIM, {
        groupBy: ['urun_grup'], where: ILCE_URETIM, positive: [SON_YIL],
      })).map((r) => String(r.urun_grup ?? ''));
      const ilceUretim = (await Promise.all(urunGruplari.map((g) => fetchAgg(R_URETIM, {
        groupBy: ['ili', 'yer', 'urun'], sum: [SON_YIL],
        where: { ...ILCE_URETIM, urun_grup: g }, positive: [SON_YIL],
      })))).flat();
      const ilceHaritasi = new Map<string, { toplam: number; urunler: Set<string> }>();
      for (const r of ilceUretim) {
        const v = num(r[`sum_${SON_YIL}`]);
        if (v <= 0) continue;
        const k = `${buyuk(r.ili)}|${buyuk(r.yer)}`;
        const kayit = ilceHaritasi.get(k) ?? { toplam: 0, urunler: new Set<string>() };
        kayit.toplam += v;
        kayit.urunler.add(String(r.urun ?? ''));
        ilceHaritasi.set(k, kayit);
      }

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
        if (byProvince.size === 0) continue;

        let toplam = 0;
        const urunler = new Set<string>();
        byProvince.forEach((ilceler, il) => {
          ilceler.forEach((ilce) => {
            const kayit = ilceHaritasi.get(`${buyuk(il)}|${buyuk(ilce)}`);
            if (!kayit) return;
            toplam += kayit.toplam;
            kayit.urunler.forEach((u) => urunler.add(u));
          });
        });
        const response = { data: [{ toplam_uretim: toplam, urun_cesit: urunler.size }] };
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
          Türkiye Hidrografik Havza Haritası
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
          { id: 'overview', label: 'Genel Bakış' },
          { id: 'basins', label: 'Havza Analizi' },
          { id: 'provinces', label: 'İl Dağılımı' },
          { id: 'districts', label: 'İlçe Haritası' }
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
