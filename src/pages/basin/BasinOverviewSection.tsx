import { useState, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Treemap
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { 
  BasinSummary, TopProduct, ProductLeader, TrendDataPoint, 
  MetricsData, formatNumber 
} from './basinUtils';

interface BasinOverviewSectionProps {
  metrics: MetricsData;
  basinSummary: BasinSummary[];
  topProducts: TopProduct[];
  loadingTopProducts: boolean;
}

export default function BasinOverviewSection({ metrics, basinSummary, topProducts, loadingTopProducts }: BasinOverviewSectionProps) {
  // Product Leaders analytics
  const [selectedProductForLeaders, setSelectedProductForLeaders] = useState<string>('');
  const [provinceLeaders, setProvinceLeaders] = useState<ProductLeader[]>([]);
  const [districtLeaders, setDistrictLeaders] = useState<ProductLeader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  // Trend Analysis analytics
  const [selectedProductsForTrend, setSelectedProductsForTrend] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const loadProductLeaders = useCallback(async (productName: string) => {
    if (!productName) return;
    setLoadingLeaders(true);
    try {
      const provinceQuery = `
        SELECT ili, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili
        ORDER BY toplam_ton DESC
        LIMIT 10
      `;
      const provinceResp = await fetchQuery(provinceQuery);
      setProvinceLeaders((provinceResp.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));

      const districtQuery = `
        SELECT ili, yer, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili, yer
        ORDER BY toplam_ton DESC
        LIMIT 10
      `;
      const districtResp = await fetchQuery(districtQuery);
      setDistrictLeaders((districtResp.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        yer: String(r.yer || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (e) {
      console.error('Product leaders load error:', e);
    } finally {
      setLoadingLeaders(false);
    }
  }, []);

  const loadTrendData = useCallback(async (productNames: string[]) => {
    if (productNames.length === 0) return;
    setLoadingTrend(true);
    try {
      const productConditions = productNames
        .map(p => `UPPER(urun) = UPPER('${p.replace(/'/g, "''")}')`)
        .join(' OR ');

      const query = `
        SELECT 
          urun,
          SUM(y2004+0) as y2004, SUM(y2005+0) as y2005, SUM(y2006+0) as y2006, SUM(y2007+0) as y2007,
          SUM(y2008+0) as y2008, SUM(y2009+0) as y2009, SUM(y2010+0) as y2010, SUM(y2011+0) as y2011,
          SUM(y2012+0) as y2012, SUM(y2013+0) as y2013, SUM(y2014+0) as y2014, SUM(y2015+0) as y2015,
          SUM(y2016+0) as y2016, SUM(y2017+0) as y2017, SUM(y2018+0) as y2018, SUM(y2019+0) as y2019,
          SUM(y2020+0) as y2020, SUM(y2021+0) as y2021, SUM(y2022+0) as y2022, SUM(y2023+0) as y2023,
          SUM(y2024+0) as y2024
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND (${productConditions})
        GROUP BY urun
      `;
      
      const response = await fetchQuery(query);
      const rawData = response.data || [];
      
      const years = Array.from({ length: 21 }, (_, i) => 2004 + i);
      const transformed: TrendDataPoint[] = years.map(year => {
        const dataPoint: TrendDataPoint = { year: String(year) };
        rawData.forEach((row: Record<string, string | number>) => {
          const productName = String(row.urun || '');
          dataPoint[productName] = Number(row[`y${year}`] || 0);
        });
        return dataPoint;
      });
      
      setTrendData(transformed);
    } catch (e) {
      console.error('Trend data load error:', e);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Toplam Havza', value: metrics.totalBasins, icon: '🌊', color: '#3b82f6' },
          { label: 'İl Sayısı', value: metrics.totalProvinces, icon: '🏙️', color: '#10b981' },
          { label: 'İlçe Sayısı', value: metrics.totalDistricts, icon: '📍', color: '#f59e0b' },
          { label: 'En Büyük Havza', value: metrics.largestBasin, icon: '🏆', color: '#8b5cf6', isText: true },
          { label: 'En Büyük Havza İlçe', value: metrics.largestBasinDistricts, icon: '📊', color: '#ec4899' }
        ].map((kpi, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${kpi.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: kpi.isText ? '18px' : '28px', fontWeight: 700, color: kpi.color }}>
              {kpi.isText ? kpi.value : formatNumber(kpi.value as number)}
            </div>
          </div>
        ))}
      </div>

      {/* Top 10 Basins */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🏆 En Büyük 10 Havza (İlçe Sayısına Göre)
        </h3>
        <ResponsiveContainer width="100%" height={500}>
          <Treemap
            data={basinSummary.slice(0, 10).map(basin => ({
              name: basin.basinName,
              size: basin.districtCount,
              fill: basin.color
            }))}
            dataKey="size"
            stroke="rgba(255,255,255,0.2)"
            fill="#8884d8"
            content={((props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; fill?: string }) => {
              const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '' } = props;
              if (width < 40 || height < 40) return (<g />);
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: fill,
                      stroke: 'rgba(255,255,255,0.3)',
                      strokeWidth: 2,
                      cursor: 'pointer'
                    }}
                  />
                  <text
                    x={x + width / 2}
                    y={y + height / 2 - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize={width > 100 ? 16 : 12}
                    fontWeight="bold"
                  >
                    {name}
                  </text>
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 10}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={width > 100 ? 14 : 11}
                  >
                    {size} ilçe
                  </text>
                </g>
              );
            }) as unknown as import('recharts').TreemapProps['content']}
          />
        </ResponsiveContainer>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          💡 Kare boyutları ilçe sayısına göre orantılıdır
        </div>
      </div>

      {/* Top Products (Turkey-wide) */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        marginTop: '24px'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🌾 Türkiye Geneli En Çok Üretilen Ürünler (Ton - 2024)
        </h3>
        {loadingTopProducts ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Veriler yükleniyor...</div>
        ) : topProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Veri bulunamadı.</div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
              <YAxis 
                type="category" 
                dataKey="urun" 
                width={200}
                tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
              />
              <Bar dataKey="toplam_ton" name="Toplam Üretim (ton)" fill="#10b981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          💡 2024 yılı ilçe bazlı bitkisel üretim verileri (TUIK)
        </div>
      </div>

      {/* Product Leaders - Top Producers by Province and District */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        marginTop: '24px'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🏅 Ürün Bazlı Üretim Liderleri
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            🌾 Ürün Seçin:
          </label>
          <select
            value={selectedProductForLeaders}
            onChange={(e) => {
              const product = e.target.value;
              setSelectedProductForLeaders(product);
              if (product) {
                loadProductLeaders(product);
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Ürün seçin --</option>
            {topProducts.slice(0, 50).map((product) => (
              <option key={product.urun} value={product.urun}>
                {product.urun} ({(Number(product.toplam_ton) / 1000000).toFixed(1)}M ton)
              </option>
            ))}
          </select>
        </div>

        {loadingLeaders ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            ⏳ Üretim liderleri yükleniyor...
          </div>
        ) : (provinceLeaders.length > 0 || districtLeaders.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Top Provinces */}
            {provinceLeaders.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                  🏙️ En Çok Üreten İller (2024)
                </h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={provinceLeaders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="ili" 
                      width={120}
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                    />
                    <Bar dataKey="toplam_ton" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Districts */}
            {districtLeaders.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                  📍 En Çok Üreten İlçeler (2024)
                </h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={districtLeaders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="yer" 
                      width={120}
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload as ProductLeader;
                          return `${data.yer} (${data.ili})`;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="toplam_ton" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Trend Analysis - Multi-year Production Trends */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        marginTop: '24px'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          📈 Yıllık Üretim Trend Analizi (2004-2024)
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            🌾 Ürün Seçin (Çoklu seçim için Ctrl/Cmd tuşu ile tıklayın):
          </label>
          <select
            multiple
            value={selectedProductsForTrend}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(option => option.value);
              setSelectedProductsForTrend(selected);
            }}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {topProducts.slice(0, 30).map((product) => (
              <option key={product.urun} value={product.urun} style={{ padding: '8px' }}>
                {product.urun} ({(Number(product.toplam_ton) / 1000000).toFixed(1)}M ton)
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedProductsForTrend.length > 0 && loadTrendData(selectedProductsForTrend)}
            disabled={selectedProductsForTrend.length === 0}
            style={{
              marginTop: '12px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: selectedProductsForTrend.length > 0 ? '#8b5cf6' : '#4b5563',
              color: 'white',
              cursor: selectedProductsForTrend.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600,
              width: '100%'
            }}
          >
            📊 {selectedProductsForTrend.length > 0 ? `${selectedProductsForTrend.length} Ürün için Trend Göster` : 'Ürün Seçin'}
          </button>
          {selectedProductsForTrend.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              ✓ Seçili: {selectedProductsForTrend.join(', ')}
            </div>
          )}
        </div>

        {loadingTrend ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            ⏳ Trend verileri yükleniyor...
          </div>
        ) : trendData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', '']}
                />
                <Legend />
                {selectedProductsForTrend.map((product, idx) => (
                  <Line 
                    key={product}
                    type="monotone" 
                    dataKey={product} 
                    stroke={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'][idx % 6]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              💡 Türkiye geneli 2004-2024 yılları arası bitkisel üretim trendleri
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
