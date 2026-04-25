import { useState, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap
} from 'recharts';
import { fetchQuery } from '../../services/api';
import { 
  BASIN_COLORS, formatNumber 
} from './basinUtils';
import type { BasinSummary, BasinProductionStats, BasinData, BasinProduct } from './basinUtils';

interface BasinAnalysisSectionProps {
  basinSummary: BasinSummary[];
  basinProductionStats: BasinProductionStats[];
  loadingBasinStats: boolean;
  allBasinData: BasinData[];
}

export default function BasinAnalysisSection({ basinSummary, basinProductionStats, loadingBasinStats, allBasinData }: BasinAnalysisSectionProps) {
  const [selectedBasinForAnalysis, setSelectedBasinForAnalysis] = useState<string | null>(null);
  const [basinProducts, setBasinProducts] = useState<BasinProduct[]>([]);
  const [loadingBasinProducts, setLoadingBasinProducts] = useState(false);

  const loadBasinProducts = useCallback(async (basinName: string) => {
    setLoadingBasinProducts(true);
    setBasinProducts([]);
    try {
      const basinDistricts = allBasinData.filter(d => d.basinName === basinName);
      const byProvince = new Map<string, Set<string>>();
      basinDistricts.forEach(d => {
        if (!byProvince.has(d.provinceName)) {
          byProvince.set(d.provinceName, new Set());
        }
        byProvince.get(d.provinceName)!.add(d.districtName);
      });

      const conditions: string[] = [];
      byProvince.forEach((districts, province) => {
        conditions.push(`(UPPER(ili)=UPPER('${province.replace(/'/g, "''")}') AND UPPER(yer) IN (${Array.from(districts).map(d => `UPPER('${d.replace(/'/g, "''")}')`).join(',')}))`);
      });

      if (conditions.length === 0) {
        setLoadingBasinProducts(false);
        return;
      }

      const whereClause = conditions.join(' OR ');
      const query = `SELECT urun, SUM(y2024+0) as toplam_ton FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND unsur='Üretim' AND birim='Ton' AND (y2024+0) > 0 AND (${whereClause}) GROUP BY urun ORDER BY toplam_ton DESC LIMIT 15`;
      
      const response = await fetchQuery(query);
      setBasinProducts((response.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (error) {
      console.error('Error loading basin products:', error);
    } finally {
      setLoadingBasinProducts(false);
    }
  }, [allBasinData]);

  return (
    <div>
      {/* Basin Statistics KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {loadingBasinStats ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            ⏳ İstatistikler yükleniyor...
          </div>
        ) : [
          { 
            label: 'Toplam Havza Sayısı', 
            value: basinSummary.length, 
            icon: '🌊', 
            color: '#3b82f6',
            desc: 'Türkiye geneli'
          },
          { 
            label: 'En Çok Üreten Havza', 
            value: basinProductionStats[0]?.basinName.split(' ').slice(0, 2).join(' ') || '-', 
            icon: '🏆', 
            color: '#10b981',
            desc: `${(basinProductionStats[0]?.toplam_uretim || 0).toLocaleString('tr-TR')} ton`,
            isText: true
          },
          { 
            label: 'Toplam Üretim', 
            value: Math.round(basinProductionStats.reduce((sum, b) => sum + b.toplam_uretim, 0)), 
            icon: '🌾', 
            color: '#f59e0b',
            desc: 'Ton (2024)',
            suffix: ' M'
          },
          { 
            label: 'Ortalama Ürün Çeşitliliği', 
            value: Math.round(basinProductionStats.reduce((sum, b) => sum + b.urun_cesit, 0) / (basinProductionStats.length || 1)), 
            icon: '🎯', 
            color: '#8b5cf6',
            desc: 'Çeşit/Havza'
          }
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: stat.isText ? '16px' : '28px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>
              {stat.isText ? stat.value : stat.suffix ? (Number(stat.value) / 1000000).toFixed(1) + stat.suffix : formatNumber(Number(stat.value))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {stat.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Basin Comparison Treemap */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🌾 Havza Üretim Karşılaştırması (2024 - Ton)
        </h3>
        {loadingBasinStats ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            ⏳ Havza üretim verileri yükleniyor...
          </div>
        ) : basinProductionStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            📭 Veri bulunamadı.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={500}>
              <Treemap
                data={basinProductionStats.slice(0, 15).map(basin => ({
                  name: basin.basinName,
                  size: basin.toplam_uretim,
                  fill: basin.color
                }))}
                dataKey="size"
                stroke="rgba(255,255,255,0.2)"
                fill="#8884d8"
                content={((props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; fill?: string }) => {
                  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = '' } = props;
                  if (width < 40 || height < 40) return (<g />);
                  const tonValue = (size / 1000000).toFixed(1);
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
                        {tonValue}M ton
                      </text>
                    </g>
                  );
                }) as unknown as import('recharts').TreemapProps['content']}
              />
            </ResponsiveContainer>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              💡 En çok üretim yapan 15 havzanın 2024 yılı toplam bitkisel üretimi (Kare boyutları üretim miktarına göre orantılıdır)
            </div>
          </>
        )}
      </div>

      {/* Top 10 Producing Basins List */}
      <div style={{
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            🎯 En Çok Üreten 10 Havza
          </h3>
          {loadingBasinStats ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              ⏳ Yükleniyor...
            </div>
          ) : basinProductionStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              📭 Veri bulunamadı.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {basinProductionStats.slice(0, 10).map((basin, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: `2px solid ${idx < 3 ? basin.color : 'var(--border)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: idx < 3 ? `0 4px 12px ${basin.color}40` : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${basin.color}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = idx < 3 ? `0 4px 12px ${basin.color}40` : 'none';
                  }}
                  onClick={() => {
                    setSelectedBasinForAnalysis(basin.basinName);
                    loadBasinProducts(basin.basinName);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: basin.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'white',
                      boxShadow: `0 2px 8px ${basin.color}60`
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {basin.basinName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {basin.toplam_uretim.toLocaleString('tr-TR')} ton | {basin.urun_cesit} çeşit ürün
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '20px' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Basin Cards Grid */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🗂️ Tüm Havzalar - Üretim Verileri
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {basinProductionStats.map((basin, idx) => (
            <div
              key={idx}
              style={{
                background: `linear-gradient(135deg, ${basin.color}15 0%, var(--bg-secondary) 100%)`,
                borderRadius: '12px',
                padding: '20px',
                border: `2px solid ${basin.color}40`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = basin.color;
                e.currentTarget.style.boxShadow = `0 8px 24px ${basin.color}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${basin.color}40`;
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => {
                setSelectedBasinForAnalysis(basin.basinName);
                loadBasinProducts(basin.basinName);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `${basin.color}20`,
                filter: 'blur(20px)'
              }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: basin.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    🌊
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {basin.basinName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      #{idx + 1} Üretim Sıralaması
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      ⚖️ Toplam Üretim
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: basin.color }}>
                      {(basin.toplam_uretim / 1000000).toFixed(2)}M
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      ton
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      🌾 Ürün Çeşidi
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: basin.color }}>
                      {basin.urun_cesit}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      farklı ürün
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: `${basin.color}20`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: basin.color,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  🌾 Üretim Verilerini Gör
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Basin Products Analysis */}
      {selectedBasinForAnalysis && (
        <div style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px',
          border: `2px solid ${BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'}`,
          boxShadow: `0 8px 32px ${BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'}40`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>
              <span style={{ 
                display: 'inline-block', 
                width: '24px', 
                height: '24px', 
                borderRadius: '6px', 
                background: BASIN_COLORS[selectedBasinForAnalysis] || '#10b981',
                marginRight: '12px',
                verticalAlign: 'middle'
              }} />
              {selectedBasinForAnalysis} — En Çok Üretilen Ürünler (2024)
            </h3>
            <button
              onClick={() => setSelectedBasinForAnalysis(null)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)', 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ✕ Kapat
            </button>
          </div>

          {loadingBasinProducts ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              ⏳ Havza üretim verileri yükleniyor...
            </div>
          ) : basinProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              📭 Bu havza için üretim verisi bulunamadı.
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={basinProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="urun" 
                    width={180}
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
                  <Bar 
                    dataKey="toplam_ton" 
                    name="Toplam Üretim" 
                    fill={BASIN_COLORS[selectedBasinForAnalysis] || '#10b981'} 
                    radius={[0, 8, 8, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                💡 {selectedBasinForAnalysis} havzasındaki tüm ilçelerin 2024 yılı bitkisel üretim toplamları
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
