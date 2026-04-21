import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';
import { fetchQuery } from '../services/api';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';
import { getRegionByProvince } from '../utils/productionCategories';
import * as XLSX from 'xlsx';

// Constants
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#22d3ee', '#a3e635'
];

const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

// Types
interface GIProduct {
  id: string;
  name: string;
  fileNumber: string;
  applicationDate: string;
  registrationNumber: string;
  registrationDate: string;
  type: string;
  productGroup: string;
  province: string;
  applicant: string;
  status: string;
}

interface ProvinceData {
  province: string;
  totalProducts: number;
  registered: number;
  pending: number;
  region: string;
}

interface ProductGroupData {
  group: string;
  count: number;
  registered: number;
  pending: number;
}

interface YearlyTrend {
  year: string;
  registered: number;
  applications: number;
}

export default function GeographicalIndicationsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'provinces' | 'products' | 'trends' | 'table'>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('Tümü');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tümü');
  const [selectedType, setSelectedType] = useState<string>('Tümü');
  const [selectedGroup, setSelectedGroup] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [allProducts, setAllProducts] = useState<GIProduct[]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  const [productGroupData, setProductGroupData] = useState<ProductGroupData[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<YearlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all products
      const query = `
        SELECT 
          id,
          \`Coğrafi Işaretin Adı\` as name,
          \`Dosya Numarası\` as fileNumber,
          \`Başvuru Tarihi\` as applicationDate,
          \`Tescil Numarası\` as registrationNumber,
          \`Tescil Tarihi\` as registrationDate,
          \`Türü\` as type,
          \`Ürün grubu\` as productGroup,
          \`İl\` as province,
          \`Başvuru Yapan/Tescil Ettiren\` as applicant,
          Durumu as status
        FROM TPE_cografiisaret
        WHERE \`Ürün grubu\` NOT IN (
          'Halılar, kilimler ve dokumalar dışında kalan el sanatı ürünleri',
          'Dokumalar',
          'Halılar ve kilimler',
          'Tütün'
        )
        AND \`Ürün grubu\` IS NOT NULL
        AND \`Ürün grubu\` != ''
        AND \`İl\` != 'Yurtdışı'
        ORDER BY \`Coğrafi Işaretin Adı\`
      `;
      
      const response = await fetchQuery(query);
      const products: GIProduct[] = (response.data || []).map((row: Record<string, string | number>) => {
        // Normalize province name
        let province = String(row.province || '');
        if (province === 'Zinguldak') {
          province = 'Zonguldak';
        }
        
        return {
          id: String(row.id),
          name: String(row.name || ''),
          fileNumber: String(row.fileNumber || ''),
          applicationDate: String(row.applicationDate || ''),
          registrationNumber: String(row.registrationNumber || ''),
          registrationDate: String(row.registrationDate || ''),
          type: String(row.type || ''),
          productGroup: String(row.productGroup || ''),
          province: province,
          applicant: String(row.applicant || ''),
          status: String(row.status || '')
        };
      });
      
      setAllProducts(products);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Calculate province statistics
  useEffect(() => {
    if (allProducts.length === 0) return;

    const provinceMap = new Map<string, { total: number; registered: number; pending: number }>();
    
    allProducts.forEach(product => {
      if (product.province && product.province !== 'Yurtdışı') {
        const current = provinceMap.get(product.province) || { total: 0, registered: 0, pending: 0 };
        current.total++;
        if (product.status === 'Tescilli') {
          current.registered++;
        } else {
          current.pending++;
        }
        provinceMap.set(product.province, current);
      }
    });

    const data: ProvinceData[] = Array.from(provinceMap.entries()).map(([province, stats]) => ({
      province,
      totalProducts: stats.total,
      registered: stats.registered,
      pending: stats.pending,
      region: getRegionByProvince(province)
    })).sort((a, b) => b.totalProducts - a.totalProducts);

    setProvinceData(data);
  }, [allProducts]);

  // Calculate product group statistics
  useEffect(() => {
    if (allProducts.length === 0) return;

    const groupMap = new Map<string, { total: number; registered: number; pending: number }>();
    
    allProducts.forEach(product => {
      if (product.productGroup) {
        const current = groupMap.get(product.productGroup) || { total: 0, registered: 0, pending: 0 };
        current.total++;
        if (product.status === 'Tescilli') {
          current.registered++;
        } else {
          current.pending++;
        }
        groupMap.set(product.productGroup, current);
      }
    });

    const data: ProductGroupData[] = Array.from(groupMap.entries()).map(([group, stats]) => ({
      group,
      count: stats.total,
      registered: stats.registered,
      pending: stats.pending
    })).sort((a, b) => b.count - a.count);

    setProductGroupData(data);
  }, [allProducts]);

  // Calculate yearly trends
  useEffect(() => {
    if (allProducts.length === 0) return;

    const yearMap = new Map<string, { registered: number; applications: number }>();
    
    allProducts.forEach(product => {
      // Parse registration date
      if (product.registrationDate && product.registrationDate !== '-') {
        const year = product.registrationDate.split('.')[2] || product.registrationDate.split('/')[2];
        if (year && year.length === 4) {
          const current = yearMap.get(year) || { registered: 0, applications: 0 };
          current.registered++;
          yearMap.set(year, current);
        }
      }
      
      // Parse application date
      if (product.applicationDate) {
        const year = product.applicationDate.split('.')[2] || product.applicationDate.split('/')[2];
        if (year && year.length === 4) {
          const current = yearMap.get(year) || { registered: 0, applications: 0 };
          current.applications++;
          yearMap.set(year, current);
        }
      }
    });

    const data: YearlyTrend[] = Array.from(yearMap.entries())
      .map(([year, stats]) => ({
        year,
        registered: stats.registered,
        applications: stats.applications
      }))
      .filter(d => parseInt(d.year) >= 2000) // Only recent years
      .sort((a, b) => a.year.localeCompare(b.year));

    setYearlyTrend(data);
  }, [allProducts]);

  // Utility functions
  const formatNumber = (num: number): string => {
    return num.toLocaleString('tr-TR');
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (selectedProvince !== 'Tümü' && product.province !== selectedProvince) return false;
      if (selectedStatus !== 'Tümü' && product.status !== selectedStatus) return false;
      if (selectedType !== 'Tümü' && product.type !== selectedType) return false;
      if (selectedGroup !== 'Tümü' && product.productGroup !== selectedGroup) return false;
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [allProducts, selectedProvince, selectedStatus, selectedType, selectedGroup, searchTerm]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = allProducts.length;
    const registered = allProducts.filter(p => p.status === 'Tescilli').length;
    const pending = allProducts.filter(p => p.status === 'Başvuru').length;
    const provinceCount = new Set(allProducts.filter(p => p.province !== 'Yurtdışı').map(p => p.province)).size;
    const productGroupCount = new Set(allProducts.map(p => p.productGroup)).size;
    const typeCount = new Set(allProducts.map(p => p.type)).size;

    return {
      total,
      registered,
      pending,
      provinceCount,
      productGroupCount,
      typeCount
    };
  }, [allProducts]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
      'Adı': p.name,
      'Dosya No': p.fileNumber,
      'Başvuru Tarihi': p.applicationDate,
      'Tescil No': p.registrationNumber,
      'Tescil Tarihi': p.registrationDate,
      'Tür': p.type,
      'Ürün Grubu': p.productGroup,
      'İl': p.province,
      'Başvuran': p.applicant,
      'Durum': p.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coğrafi İşaretli Gıda');
    XLSX.writeFile(wb, `cografi-isaretli-gida-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        color: 'var(--text-secondary)'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>🏛️</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Coğrafi İşaretli Gıda Ürünleri Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
      background: 'var(--bg)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '48px' }}>🏛️</div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              Türkiye Coğrafi İşaretli Gıda Ürünleri
            </h1>
            <p style={{ fontSize: '16px', margin: '8px 0 0 0', opacity: 0.95 }}>
              Türk Patent ve Marka Kurumu Tescilli Gıda Ürünleri Analiz Platformu
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Toplam Ürün</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.total)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Tescilli + Başvuru</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Tescilli</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.registered)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            %{((metrics.registered / metrics.total) * 100).toFixed(1)} Tescil Oranı
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Başvuruda</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.pending)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>İnceleme Aşamasında</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>İl Sayısı</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.provinceCount)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Farklı İl</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Ürün Grubu</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.productGroupCount)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Farklı Kategori</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>İşaret Türü</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics.typeCount)}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Farklı Tür</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '0',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'overview', label: '🗺️ Genel Bakış', desc: 'Overview' },
          { id: 'provinces', label: '📍 İl Analizi', desc: 'Provincial Analysis' },
          { id: 'products', label: '🏷️ Ürün Grupları', desc: 'Product Groups' },
          { id: 'trends', label: '📈 Trend Analizi', desc: 'Trends' },
          { id: 'table', label: '📊 Detaylı Tablo', desc: 'Detailed Table' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'provinces' | 'products' | 'trends' | 'table')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Turkey Heatmap */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🗺️ Türkiye İl Dağılım Haritası (Coğrafi İşaretli Gıda Ürünleri)
            </h3>
            <TurkeyHeatMap
              regionTotals={provinceData.map(p => ({
                name: p.province,
                value: p.totalProducts,
                unit: 'ürün'
              }))}
              unitLabel="ürün"
              height={450}
              fillMode="region"
              regionColors={REGION_COLORS}
            />
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              * Her ilin toplam coğrafi işaretli ürün sayısı (tescilli + başvuru)
            </p>
          </div>

          {/* Charts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Status Distribution */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                📊 Durum Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Tescilli', value: metrics.registered, color: '#10b981' },
                      { name: 'Başvuru', value: metrics.pending, color: '#f59e0b' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ percent }: { percent?: number }) => percent ? `%${(percent * 100).toFixed(1)}` : ''}
                  >
                    {[
                      { name: 'Tescilli', value: metrics.registered, color: '#10b981' },
                      { name: 'Başvuru', value: metrics.pending, color: '#f59e0b' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Type Distribution */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🏷️ İşaret Türü Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Array.from(
                      allProducts.reduce((acc, p) => {
                        if (p.type) {
                          acc.set(p.type, (acc.get(p.type) || 0) + 1);
                        }
                        return acc;
                      }, new Map<string, number>())
                    ).map(([name, value], idx) => ({
                      name,
                      value,
                      color: COLORS[idx % COLORS.length]
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={(entry: unknown) => {
                      const data = entry as { name?: string; percent?: number };
                      return data.name && data.percent ? `${data.name}: %${(data.percent * 100).toFixed(1)}` : '';
                    }}
                  >
                    {Array.from(
                      allProducts.reduce((acc, p) => {
                        if (p.type) {
                          acc.set(p.type, (acc.get(p.type) || 0) + 1);
                        }
                        return acc;
                      }, new Map<string, number>())
                    ).map(([, ], idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 Provinces Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🏆 Top 10 İl - Coğrafi İşaretli Ürün Sayısı
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOPLAM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL ORANI</th>
                  </tr>
                </thead>
                <tbody>
                  {provinceData.slice(0, 10).map((province, idx) => (
                    <tr
                      key={province.province}
                      onClick={() => {
                        setSelectedProvince(province.province);
                        setActiveTab('provinces');
                      }}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: idx < 3 ? `linear-gradient(135deg, ${['#fbbf24', '#94a3b8', '#cd7f32'][idx]} 0%, ${['#f59e0b', '#64748b', '#a0522d'][idx]} 100%)` : 'rgba(100, 116, 139, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: idx < 3 ? 'white' : 'var(--text-secondary)'
                        }}>
                          {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {province.province}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: `${REGION_COLORS[province.region] || '#64748b'}15`,
                          color: REGION_COLORS[province.region] || '#64748b',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {province.region}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNumber(province.totalProducts)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        {formatNumber(province.registered)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                        {formatNumber(province.pending)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          %{((province.registered / province.totalProducts) * 100).toFixed(1)}
                        </div>
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(100, 116, 139, 0.1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(province.registered / province.totalProducts) * 100}%`,
                            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Provinces Tab */}
      {activeTab === 'provinces' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            📍 İl Bazında Coğrafi İşaretli Gıda Ürünleri
          </h2>

          {/* Province Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              İl Seçimi (Gıda Ürünleri)
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="Tümü">Tüm İller</option>
              {provinceData.map(p => (
                <option key={p.province} value={p.province}>
                  {p.province} ({p.totalProducts} ürün)
                </option>
              ))}
            </select>
          </div>

          {selectedProvince !== 'Tümü' && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              color: 'white'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                {selectedProvince}
              </div>
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Toplam Ürün</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {formatNumber(provinceData.find(p => p.province === selectedProvince)?.totalProducts || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Tescilli</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {formatNumber(provinceData.find(p => p.province === selectedProvince)?.registered || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Başvuru</div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>
                    {formatNumber(provinceData.find(p => p.province === selectedProvince)?.pending || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              {selectedProvince === 'Tümü' ? 'Tüm Gıda Ürünleri' : `${selectedProvince} Coğrafi İşaretli Gıda Ürünleri`}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>#</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN ADI</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TÜR</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>DURUM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL TARİHİ</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts
                    .filter(p => selectedProvince === 'Tümü' || p.province === selectedProvince)
                    .slice(0, 50)
                    .map((product, idx) => (
                      <tr
                        key={product.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {product.name}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {product.productGroup}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            color: '#8b5cf6',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {product.type}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: product.status === 'Tescilli' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: product.status === 'Tescilli' ? '#10b981' : '#f59e0b',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {product.status}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {product.registrationDate === '-' ? '-' : product.registrationDate}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Groups Tab */}
      {activeTab === 'products' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            🏷️ Ürün Grupları Analizi
          </h2>

          {/* Product Groups Chart */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 Ürün Gruplarına Göre Dağılım (Top 15)
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={productGroupData.slice(0, 15)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis 
                  type="category" 
                  dataKey="group" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  width={190}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Legend />
                <Bar dataKey="registered" name="Tescilli" stackId="a" fill="#10b981" />
                <Bar dataKey="pending" name="Başvuru" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Product Groups Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Detaylı Ürün Grubu Tablosu
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOPLAM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL ORANI</th>
                  </tr>
                </thead>
                <tbody>
                  {productGroupData.map((group, idx) => (
                    <tr
                      key={group.group}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {group.group}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNumber(group.count)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        {formatNumber(group.registered)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                        {formatNumber(group.pending)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          %{((group.registered / group.count) * 100).toFixed(1)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            📈 Yıllara Göre Trend Analizi
          </h2>

          {/* Yearly Trend Chart */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 Yıllık Tescil ve Başvuru Sayıları
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={yearlyTrend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="registered" 
                  name="Tescilli"
                  stroke="#10b981" 
                  fill="#10b98120" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="applications" 
                  name="Başvuru"
                  stroke="#f59e0b" 
                  fill="#f59e0b20" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly Statistics Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Yıl Bazında İstatistikler
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>YIL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyTrend.slice().reverse().map((year) => (
                    <tr
                      key={year.year}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {year.year}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        {formatNumber(year.registered)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                        {formatNumber(year.applications)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Table Tab */}
      {activeTab === 'table' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              📊 Tüm Coğrafi İşaretli Gıda Ürünleri
            </h2>
            <button
              onClick={exportToExcel}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Excel İndir
            </button>
          </div>

          {/* Filters */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  İl Filtresi
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Tümü">Tüm İller</option>
                  {Array.from(new Set(allProducts.map(p => p.province))).sort().map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Durum Filtresi
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Tümü">Tüm Durumlar</option>
                  <option value="Tescilli">Tescilli</option>
                  <option value="Başvuru">Başvuru</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Tür Filtresi
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Tümü">Tüm Türler</option>
                  {Array.from(new Set(allProducts.map(p => p.type))).sort().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Ürün Grubu Filtresi
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Tümü">Tüm Gruplar</option>
                  {Array.from(new Set(allProducts.map(p => p.productGroup))).sort().map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Arama
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ürün adı ara..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Toplam {formatNumber(filteredProducts.length)} ürün gösteriliyor
          </div>

          {/* Products Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>#</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN ADI</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TÜR</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>DURUM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU TARİHİ</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL TARİHİ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 100).map((product, idx) => (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {product.name}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {product.province}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {product.productGroup}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: '#8b5cf6',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {product.type}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: product.status === 'Tescilli' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: product.status === 'Tescilli' ? '#10b981' : '#f59e0b',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {product.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {product.applicationDate}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {product.registrationDate === '-' ? '-' : product.registrationDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProducts.length > 100 && (
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                İlk 100 ürün gösteriliyor. Tüm verileri görmek için Excel'i indirin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
