import { useState, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Treemap,
  LabelList,
} from 'recharts';
import { fetchAgg, num } from '../../services/d1';
const R_URETIM = 'tuik/bitkisel-uretim';
// İlçe düzeyinde üretim (Ton) — tüm havza sorgularının ortak süzgeci.
const ILCE_URETIM = { duzey: 'ilçe', unsur: 'Üretim', birim: 'Ton' };
const YIL_SUTUNLARI = ['y2004', 'y2005', 'y2006', 'y2007', 'y2008', 'y2009', 'y2010', 'y2011', 'y2012', 'y2013', 'y2014', 'y2015', 'y2016', 'y2017', 'y2018', 'y2019', 'y2020', 'y2021', 'y2022', 'y2023', 'y2024'];
const SON_YIL = 'y2024';

import { formatNumber } from './basinUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type {
  BasinSummary, TopProduct, ProductLeader, TrendDataPoint,
  MetricsData,
} from './basinUtils';
import { LINE_Y_DOMAIN, VALUE_HEADROOM, compactValue, truncTick } from '../../utils/chartTicks';

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
      // UPPER(urun)=UPPER(…) karşılığı: sunucudaki eşitlik zaten COLLATE NOCASE.
      // (y2024+0) > 0 süzgeci istemcide.
      const provinceRows = (await fetchAgg(R_URETIM, {
        groupBy: ['ili'], sum: [SON_YIL], where: { ...ILCE_URETIM, urun: productName },
        orderBy: `sum_${SON_YIL}`, dir: 'desc', limit: 30,
      })).filter((r) => num(r[`sum_${SON_YIL}`]) > 0).slice(0, 10);
      setProvinceLeaders(provinceRows.map((r) => ({
        ili: String(r.ili || ''),
        toplam_ton: String(num(r[`sum_${SON_YIL}`]))
      })));

      const districtRows = (await fetchAgg(R_URETIM, {
        groupBy: ['ili', 'yer'], sum: [SON_YIL], where: { ...ILCE_URETIM, urun: productName },
        orderBy: `sum_${SON_YIL}`, dir: 'desc', limit: 30,
      })).filter((r) => num(r[`sum_${SON_YIL}`]) > 0).slice(0, 10);
      setDistrictLeaders(districtRows.map((r) => ({
        ili: String(r.ili || ''),
        yer: String(r.yer || ''),
        toplam_ton: String(num(r[`sum_${SON_YIL}`]))
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
      // Eskiden 21 ayrı SUM(yNNNN+0) sütunu tek sorguda toplanıyordu;
      // toplama ucu aynı işi sum listesiyle yapıyor.
      const rawData = await fetchAgg(R_URETIM, {
        groupBy: ['urun'], sum: YIL_SUTUNLARI,
        where: ILCE_URETIM, whereIn: { urun: productNames },
      });
      
      const years = Array.from({ length: 21 }, (_, i) => 2004 + i);
      const transformed: TrendDataPoint[] = years.map(year => {
        const dataPoint: TrendDataPoint = { year: String(year) };
        rawData.forEach((row) => {
          const productName = String(row.urun || '');
          dataPoint[productName] = num(row[`sum_y${year}`]);
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
          { label: 'Toplam Havza', value: metrics.totalBasins, icon: '', color: '#3b82f6' },
          { label: 'İl Sayısı', value: metrics.totalProvinces, icon: '', color: '#10b981' },
          { label: 'İlçe Sayısı', value: metrics.totalDistricts, icon: '', color: '#f59e0b' },
          { label: 'En Büyük Havza', value: metrics.largestBasin, icon: '', color: '#8b5cf6', isText: true },
          { label: 'En Büyük Havza İlçe', value: metrics.largestBasinDistricts, icon: '', color: '#ec4899' }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: 0 }}>
            En Büyük 10 Havza (İlçe Sayısına Göre)
          </h3>
          <ChartInsightButton title="En Büyük 10 Havza" description="Havza bazında büyüklük sıralaması" data={basinSummary.slice(0, 10)} context={{ section: 'Havza Genel Bakış' }} compact />
        </div>
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
          Kare boyutları ilçe sayısına göre orantılıdır
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: 0 }}>
            Türkiye Geneli En Çok Üretilen Ürünler (Ton - 2024)
          </h3>
          <ChartInsightButton title="En Çok Üretilen Ürünler" description="2024 en çok üretilen ürünler" data={topProducts.slice(0, 20)} context={{ section: 'Havza Genel Bakış' }} compact />
        </div>
        {loadingTopProducts ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Veriler yükleniyor...</div>
        ) : topProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Veri bulunamadı.</div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} domain={VALUE_HEADROOM} />
              <YAxis 
                type="category" 
                dataKey="urun" 
                width={110}
                tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} tickFormatter={truncTick} interval={0} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
              />
              <Bar dataKey="toplam_ton" name="Toplam Üretim (ton)" fill="#10b981" radius={[0, 8, 8, 0]}>
                <LabelList dataKey="toplam_ton" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: 0 }}>
            Ürün Bazlı Üretim Liderleri
          </h3>
          <ChartInsightButton title="Ürün Liderleri" description="Ürün bazlı üretim liderleri" data={provinceLeaders} context={{ section: 'Havza Genel Bakış' }} compact />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Ürün Seçin:
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
                  En Çok Üreten İller (2024)
                </h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={provinceLeaders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                    <YAxis 
                      type="category" 
                      dataKey="ili" 
                      width={110}
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} tickFormatter={truncTick} interval={0} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: number) => [Number(value).toLocaleString('tr-TR') + ' ton', 'Üretim']}
                    />
                    <Bar dataKey="toplam_ton" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                <LabelList dataKey="toplam_ton" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Districts */}
            {districtLeaders.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                  En Çok Üreten İlçeler (2024)
                </h4>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={districtLeaders} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                    <YAxis 
                      type="category" 
                      dataKey="yer" 
                      width={110}
                      tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} tickFormatter={truncTick} interval={0} />
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
                    <Bar dataKey="toplam_ton" fill="#10b981" radius={[0, 8, 8, 0]}>
                <LabelList dataKey="toplam_ton" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: 0 }}>
            Yıllık Üretim Trend Analizi (2004-2024)
          </h3>
          <ChartInsightButton title="Yıllık Trend" description="Uzun dönem üretim trend analizi" data={trendData} context={{ section: 'Havza Trend' }} compact />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Ürün Seçin (Çoklu seçim için Ctrl/Cmd tuşu ile tıklayın):
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
              Seçili: {selectedProductsForTrend.join(', ')}
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
                <YAxis tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} domain={LINE_Y_DOMAIN} width={46} />
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
              Türkiye geneli 2004-2024 yılları arası bitkisel üretim trendleri
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
