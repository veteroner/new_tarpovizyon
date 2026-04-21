import { useState, useMemo, useCallback } from 'react';
import { fetchQuery } from '../../services/api';
import { 
  BasinData, BasinSummary, DistrictProduct, DistrictProductionItem, BASIN_COLORS 
} from './basinUtils';
import DistrictMap from './DistrictMap';

interface BasinDistrictsSectionProps {
  allBasinData: BasinData[];
  basinSummary: BasinSummary[];
}

export default function BasinDistrictsSection({ allBasinData, basinSummary }: BasinDistrictsSectionProps) {
  const [mapFilterBasin, setMapFilterBasin] = useState('Tümü');
  const [mapFilterProvince, setMapFilterProvince] = useState('Tümü');
  const [mapFilterDistrict, setMapFilterDistrict] = useState('Tümü');
  const [selectedMapDistrict, setSelectedMapDistrict] = useState<{ key: string; name: string; province: string; basin: string } | null>(null);
  const [districtProducts, setDistrictProducts] = useState<DistrictProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [districtProduction, setDistrictProduction] = useState<DistrictProductionItem[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(false);

  const mapProvinces = useMemo(() => {
    const prov = new Set<string>();
    allBasinData.forEach(d => prov.add(d.provinceName));
    return Array.from(prov).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allBasinData]);

  const mapDistricts = useMemo(() => {
    return allBasinData
      .filter(d => mapFilterProvince === 'Tümü' || d.provinceName === mapFilterProvince)
      .map(d => d.districtName.replace(/\s*\/\s*[^/]+$/, '').trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allBasinData, mapFilterProvince]);

  const loadDistrictProducts = useCallback(async (districtName: string, provinceName: string) => {
    setLoadingProducts(true);
    setDistrictProducts([]);
    try {
      const query = `SELECT desen FROM havzalist WHERE UPPER(ilad) = UPPER('${provinceName}') AND UPPER(ilcead) = UPPER('${districtName}') LIMIT 1`;
      const response = await fetchQuery(query);
      const row = (response.data || [])[0];
      if (row?.desen) {
        const urunler = String(row.desen)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .map((urun: string) => ({ urun }));
        setDistrictProducts(urunler);
      }
    } catch (e) {
      console.error('District desen load error:', e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadDistrictProduction = useCallback(async (districtName: string, provinceName: string) => {
    setLoadingProduction(true);
    setDistrictProduction([]);
    try {
      const q = `SELECT urun, urun_grup, y2024 FROM tuik_bitkisel_uretim WHERE duzey='ilçe' AND UPPER(ili)=UPPER('${provinceName}') AND UPPER(yer)=UPPER('${districtName}') AND unsur='Üretim' AND (y2024+0) > 0 ORDER BY (y2024+0) DESC LIMIT 20`;
      const resp = await fetchQuery(q);
      setDistrictProduction((resp.data || []).map((r: Record<string, string | number>) => ({
        urun: String(r.urun || ''),
        urun_grup: String(r.urun_grup || ''),
        y2024: String(r.y2024 || '0')
      })));
    } catch (e) {
      console.error('District production load error:', e);
    } finally {
      setLoadingProduction(false);
    }
  }, []);

  const handleDistrictClick = useCallback((districtName: string, provinceName: string, basinName: string) => {
    const key = `${provinceName}||${districtName}`;
    setSelectedMapDistrict({ key, name: districtName, province: provinceName, basin: basinName });
    setMapFilterProvince(provinceName);
    setMapFilterDistrict(districtName);
    loadDistrictProducts(districtName, provinceName);
    loadDistrictProduction(districtName, provinceName);
  }, [loadDistrictProducts, loadDistrictProduction]);

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
          {/* Basin filter */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🌊 HAVZA</label>
            <select
              value={mapFilterBasin}
              onChange={(e) => { setMapFilterBasin(e.target.value); setSelectedMapDistrict(null); setDistrictProducts([]); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              <option value="Tümü">Tüm Havzalar</option>
              {basinSummary.map(b => <option key={b.basinName} value={b.basinName}>{b.basinName}</option>)}
            </select>
          </div>
          {/* Province filter */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🏙️ İL</label>
            <select
              value={mapFilterProvince}
              onChange={(e) => { setMapFilterProvince(e.target.value); setMapFilterDistrict('Tümü'); setSelectedMapDistrict(null); setDistrictProducts([]); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              <option value="Tümü">Tüm İller</option>
              {mapProvinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* District filter */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>📍 İLÇE</label>
            <select
              value={mapFilterDistrict}
              onChange={(e) => {
                const d = e.target.value;
                setMapFilterDistrict(d);
                if (d !== 'Tümü' && mapFilterProvince !== 'Tümü') {
                  const basinItem = allBasinData.find(x => x.provinceName === mapFilterProvince && x.districtName.startsWith(d));
                  handleDistrictClick(d, mapFilterProvince, basinItem?.basinName || '');
                } else {
                  setSelectedMapDistrict(null);
                  setDistrictProducts([]);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              <option value="Tümü">Tüm İlçeler</option>
              {mapDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Reset */}
          {(mapFilterBasin !== 'Tümü' || mapFilterProvince !== 'Tümü' || mapFilterDistrict !== 'Tümü') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => { setMapFilterBasin('Tümü'); setMapFilterProvince('Tümü'); setMapFilterDistrict('Tümü'); setSelectedMapDistrict(null); setDistrictProducts([]); setDistrictProduction([]); }}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
              >
                ✕ Sıfırla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          📍 İlçe Bazında Havza Haritası
          {selectedMapDistrict && (
            <span style={{ marginLeft: '12px', fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>
              — Seçili: <strong style={{ color: 'var(--text-primary)' }}>{selectedMapDistrict.name}</strong> / {selectedMapDistrict.province}
            </span>
          )}
        </h3>
        <DistrictMap
          basinData={allBasinData}
          basinColors={BASIN_COLORS}
          filterBasin={mapFilterBasin}
          filterProvince={mapFilterProvince}
          filterDistrict={mapFilterDistrict}
          selectedDistrict={selectedMapDistrict?.key}
          onDistrictClick={handleDistrictClick}
        />
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          💡 İlçeye tıklayarak bitkisel üretim ürünlerini görüntüleyin
        </div>
      </div>

      {/* Product cards for selected district */}
      {selectedMapDistrict && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
            🌾 {selectedMapDistrict.name} / {selectedMapDistrict.province} — Ürün Deseni
          </h3>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Havza: <span style={{ color: BASIN_COLORS[selectedMapDistrict.basin] || 'var(--text-primary)', fontWeight: 600 }}>{selectedMapDistrict.basin}</span>
          </div>
          {loadingProducts ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Ürünler yükleniyor...</div>
          ) : districtProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Bu ilçe için ürün deseni verisi bulunamadı.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {districtProducts.map((p, i) => {
                const basinColor = BASIN_COLORS[selectedMapDistrict.basin] || '#10b981';
                return (
                  <div key={i} style={{
                    background: `${basinColor}18`,
                    border: `1px solid ${basinColor}55`,
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    cursor: 'default'
                  }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 10px ${basinColor}40`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                    }}
                  >
                    🌾 {p.urun}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Production data for selected district */}
      {selectedMapDistrict && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
            📊 {selectedMapDistrict.name} / {selectedMapDistrict.province} — Üretim Miktarı (2024)
          </h3>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Kayıtlı bitkisel üretim verileri (ton)
          </div>
          {loadingProduction ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>⏳ Üretim verileri yükleniyor...</div>
          ) : districtProduction.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>📭 Bu ilçe için 2024 üretim miktarı verisi bulunamadı.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {districtProduction.map((p, i) => {
                const val = parseFloat(p.y2024.replace(/[^0-9.]/g, '')) || 0;
                const maxVal = parseFloat(districtProduction[0].y2024.replace(/[^0-9.]/g, '')) || 1;
                const pct = Math.max(6, (val / maxVal) * 100);
                const basinColor = BASIN_COLORS[selectedMapDistrict.basin] || '#10b981';
                return (
                  <div key={i} style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.2s'
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: '1.3' }}>{p.urun}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{p.urun_grup}</div>
                    <div style={{ background: 'var(--border)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: basinColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: basinColor }}>
                      {Number(val).toLocaleString('tr-TR')} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>ton</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* District Statistics */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          📊 Havza Bazında İlçe Dağılımı
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {basinSummary.slice(0, 12).map((basin, idx) => (
            <div
              key={idx}
              style={{
                background: `${basin.color}10`,
                borderRadius: '12px',
                padding: '16px',
                border: `2px solid ${basin.color}40`,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${basin.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: basin.color,
                  boxShadow: `0 0 12px ${basin.color}80`
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {basin.basinName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {basin.provinceCount} il • {basin.districtCount} ilçe
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
