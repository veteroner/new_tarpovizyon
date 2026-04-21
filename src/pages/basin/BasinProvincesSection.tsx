import { useState, useCallback } from 'react';
import { fetchQuery } from '../../services/api';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import { 
  ProvinceBasinData, ProvinceDiversity, ProvinceProductDistribution, formatNumber 
} from './basinUtils';

interface BasinProvincesSectionProps {
  provinceBasinData: ProvinceBasinData[];
  provinceDiversity: ProvinceDiversity[];
  loadingDiversity: boolean;
}

export default function BasinProvincesSection({ provinceBasinData, provinceDiversity, loadingDiversity }: BasinProvincesSectionProps) {
  const [selectedProductForMap, setSelectedProductForMap] = useState('');
  const [productDistribution, setProductDistribution] = useState<ProvinceProductDistribution[]>([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [clickedProvince, setClickedProvince] = useState<string | null>(null);

  const loadProductDistribution = useCallback(async (productName: string) => {
    if (!productName) return;
    setLoadingDistribution(true);
    try {
      const query = `
        SELECT ili, SUM(y2024+0) as toplam_ton
        FROM tuik_bitkisel_uretim
        WHERE duzey='ilçe' 
          AND unsur='Üretim' 
          AND birim='Ton'
          AND UPPER(urun) = UPPER('${productName.replace(/'/g, "''")}')
          AND (y2024+0) > 0
        GROUP BY ili
        ORDER BY toplam_ton DESC
      `;
      const response = await fetchQuery(query);
      setProductDistribution((response.data || []).map((r: Record<string, string | number>) => ({
        ili: String(r.ili || ''),
        toplam_ton: String(r.toplam_ton || '0')
      })));
    } catch (e) {
      console.error('Product distribution load error:', e);
    } finally {
      setLoadingDistribution(false);
    }
  }, []);

  return (
    <div style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid var(--border)'
    }}>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
        🗺️ İl Bazında Havza Dağılımı
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>#</th>
              <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>İl</th>
              <th style={{ textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>Dominant Havza</th>
              <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>Havza Sayısı</th>
              <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>İlçe Sayısı</th>
              <th style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '13px', padding: '12px' }}>🌾 Ürün Çeşitliliği</th>
            </tr>
          </thead>
          <tbody>
            {provinceBasinData.map((province, idx) => {
              const diversityData = provinceDiversity.find(d => d.ili.toUpperCase() === province.province.toUpperCase());
              const cesitSayisi = diversityData ? parseInt(diversityData.cesit_sayisi) : 0;
              const maxCesit = provinceDiversity.length > 0 ? parseInt(provinceDiversity[0].cesit_sayisi) : 1;
              const diversityPct = maxCesit > 0 ? (cesitSayisi / maxCesit) * 100 : 0;
              return (
                <tr 
                  key={idx}
                  style={{ 
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {province.province}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: province.color,
                        boxShadow: `0 0 6px ${province.color}80`
                      }} />
                      {province.dominantBasin}
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'center' }}>
                    {formatNumber(province.basinCount)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'center' }}>
                    {formatNumber(province.districtCount)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {loadingDiversity ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>...</span>
                    ) : cesitSayisi > 0 ? (
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                          {cesitSayisi} çeşit
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, diversityPct)}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #10b981, #059669)', 
                            borderRadius: '4px',
                            transition: 'width 0.6s ease'
                          }} />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Geographic Distribution - Product-based Province Heatmap */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        marginTop: '24px'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          🗺️ Ürün Bazlı Coğrafi Üretim Dağılımı
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Ürün adı girin (örn: Buğday, Mısır, Domates)..."
            value={selectedProductForMap}
            onChange={(e) => setSelectedProductForMap(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && selectedProductForMap.trim()) {
                loadProductDistribution(selectedProductForMap.trim());
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
          <button
            onClick={() => selectedProductForMap.trim() && loadProductDistribution(selectedProductForMap.trim())}
            style={{
              marginTop: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#f59e0b',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            🌍 Harita Göster
          </button>
        </div>

        {loadingDistribution ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            ⏳ Coğrafi dağılım hesaplanıyor...
          </div>
        ) : productDistribution.length > 0 ? (
          <>
            <TurkeyHeatMap
              regionTotals={productDistribution.map(p => ({
                name: p.ili,
                value: Number(p.toplam_ton),
                unit: 'ton'
              }))}
              unitLabel="ton"
              height={500}
              fillMode="heat"
              selectedProvince={clickedProvince}
              onProvinceClick={(province) => setClickedProvince(prev => prev === province ? null : province)}
            />
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                📊 İl Bazlı Üretim Sıralaması - {selectedProductForMap} (2024)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {productDistribution.slice(0, 20).map((item, idx) => (
                  <div 
                    key={item.ili}
                    style={{
                      background: clickedProvince === item.ili ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: clickedProvince === item.ili ? '1px solid #f59e0b' : '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setClickedProvince(prev => prev === item.ili ? null : item.ili)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: idx < 3 ? '#f59e0b' : 'var(--text-secondary)',
                        minWidth: '24px'
                      }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.ili}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                      {Number(item.toplam_ton).toLocaleString('tr-TR')} ton
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              💡 2024 yılı {selectedProductForMap} üretiminin il bazlı dağılımı
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
