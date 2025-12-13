import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { fetchQuery } from '../services/api';

interface PeriodSummary {
  urun: string;
  ihracat: number;
  ithalat: number;
  ihracatDeger: number;
  ithalatDeger: number;
  denge: number;
}

interface CategoryData {
  name: string;
  products: string[];
}

const CATEGORIES: CategoryData[] = [
  { name: 'Kırmızı Et', products: ['Büyükbaş (sığır) Eti', 'Küçükbas Eti'] },
  { name: 'Kasaplık Hayvan', products: ['Büyükbaş Kasaplık', 'Küçükbaş Kasaplık'] },
  { name: 'Besilik Hayvan', products: ['Besilik Büyükbaş'] },
  { name: 'Damızlık Hayvan', products: ['Damızlık Büyükbaş', 'Damızlık Küçükbaş'] },
  { name: 'Diğer', products: ['Hindi Eti', 'Piliç Eti', 'Konsantre Süt'] }
];

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toLocaleString('tr-TR');
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

export default function TuikAnimalTradePage() {
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  
  // Dönem seçimi
  const [period1Start, setPeriod1Start] = useState('2010');
  const [period1End, setPeriod1End] = useState('2015');
  const [period2Start, setPeriod2Start] = useState('2016');
  const [period2End, setPeriod2End] = useState('2024');
  
  // Kategori seçimi
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  
  // Veri durumu
  const [period1Data, setPeriod1Data] = useState<PeriodSummary[]>([]);
  const [period2Data, setPeriod2Data] = useState<PeriodSummary[]>([]);

  // Meta veri yükleme
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [productRes, yearRes] = await Promise.all([
          fetchQuery('SELECT DISTINCT ana_urun FROM tuik_ticarethayvansal ORDER BY ana_urun'),
          fetchQuery('SELECT DISTINCT yil FROM tuik_ticarethayvansal ORDER BY yil')
        ]);

        if (productRes.data) {
          const products = productRes.data.map((item: Record<string, string | number>) => String(item.ana_urun));
          setProductList(products);
        }
        if (yearRes.data) {
          const years = yearRes.data.map((item: Record<string, string | number>) => String(item.yil));
          setYearOptions(years.sort());
        }
      } catch (error) {
        console.error('Meta veri yüklenirken hata:', error);
      }
    };
    loadMeta();
  }, []);

  // Ana veri yükleme
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Kategori filtresi
      let productFilter = productList;
      if (selectedCategory !== 'Tümü') {
        const category = CATEGORIES.find(c => c.name === selectedCategory);
        productFilter = category ? category.products : productList;
      }

      if (productFilter.length === 0) {
        setPeriod1Data([]);
        setPeriod2Data([]);
        setLoading(false);
        return;
      }

      const productFilterStr = productFilter.map(p => `'${p}'`).join(',');

      // Dönem 1 verisi
      const period1Query = `
        SELECT ana_urun as urun,
          SUM(ihracat_mik) as ihracat,
          SUM(ithalat_mik) as ithalat,
          SUM(ihracat_deger) as ihracatDeger,
          SUM(ithalat_deger) as ithalatDeger
        FROM tuik_ticarethayvansal
        WHERE ana_urun IN (${productFilterStr}) 
          AND CAST(yil AS UNSIGNED) >= ${period1Start} 
          AND CAST(yil AS UNSIGNED) <= ${period1End}
        GROUP BY ana_urun
        ORDER BY ihracatDeger DESC
      `;

      // Dönem 2 verisi
      const period2Query = `
        SELECT ana_urun as urun,
          SUM(ihracat_mik) as ihracat,
          SUM(ithalat_mik) as ithalat,
          SUM(ihracat_deger) as ihracatDeger,
          SUM(ithalat_deger) as ithalatDeger
        FROM tuik_ticarethayvansal
        WHERE ana_urun IN (${productFilterStr}) 
          AND CAST(yil AS UNSIGNED) >= ${period2Start} 
          AND CAST(yil AS UNSIGNED) <= ${period2End}
        GROUP BY ana_urun
        ORDER BY ihracatDeger DESC
      `;

      const [p1Res, p2Res] = await Promise.all([
        fetchQuery(period1Query),
        fetchQuery(period2Query)
      ]);

      if (p1Res.data) {
        const mapped = p1Res.data.map((item: Record<string, string | number>) => ({
          urun: String(item.urun),
          ihracat: Number(item.ihracat) || 0,
          ithalat: Number(item.ithalat) || 0,
          ihracatDeger: Number(item.ihracatDeger) || 0,
          ithalatDeger: Number(item.ithalatDeger) || 0,
          denge: (Number(item.ihracatDeger) || 0) - (Number(item.ithalatDeger) || 0)
        }));
        setPeriod1Data(mapped);
      }

      if (p2Res.data) {
        const mapped = p2Res.data.map((item: Record<string, string | number>) => ({
          urun: String(item.urun),
          ihracat: Number(item.ihracat) || 0,
          ithalat: Number(item.ithalat) || 0,
          ihracatDeger: Number(item.ihracatDeger) || 0,
          ithalatDeger: Number(item.ithalatDeger) || 0,
          denge: (Number(item.ihracatDeger) || 0) - (Number(item.ithalatDeger) || 0)
        }));
        setPeriod2Data(mapped);
      }

    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [productList, selectedCategory, period1Start, period1End, period2Start, period2End]);

  useEffect(() => {
    if (productList.length > 0) {
      loadData();
    }
  }, [loadData, productList]);

  // Hesaplamalar - Dönem 1
  const p1TotalExport = period1Data.reduce((sum, p) => sum + p.ihracat, 0);
  const p1TotalImport = period1Data.reduce((sum, p) => sum + p.ithalat, 0);
  const p1TotalExportValue = period1Data.reduce((sum, p) => sum + p.ihracatDeger, 0);
  const p1TotalImportValue = period1Data.reduce((sum, p) => sum + p.ithalatDeger, 0);
  const p1Balance = p1TotalExportValue - p1TotalImportValue;

  // Hesaplamalar - Dönem 2
  const p2TotalExport = period2Data.reduce((sum, p) => sum + p.ihracat, 0);
  const p2TotalImport = period2Data.reduce((sum, p) => sum + p.ithalat, 0);
  const p2TotalExportValue = period2Data.reduce((sum, p) => sum + p.ihracatDeger, 0);
  const p2TotalImportValue = period2Data.reduce((sum, p) => sum + p.ithalatDeger, 0);
  const p2Balance = p2TotalExportValue - p2TotalImportValue;

  // Değişim oranları
  const exportChange = p1TotalExportValue !== 0 ? ((p2TotalExportValue - p1TotalExportValue) / p1TotalExportValue * 100) : 0;
  const importChange = p1TotalImportValue !== 0 ? ((p2TotalImportValue - p1TotalImportValue) / p1TotalImportValue * 100) : 0;
  const balanceChange = p1Balance !== 0 ? ((p2Balance - p1Balance) / Math.abs(p1Balance) * 100) : 0;

  // Karşılaştırma verisi
  const comparisonData = period1Data.map(p1 => {
    const p2 = period2Data.find(p => p.urun === p1.urun);
    return {
      urun: p1.urun,
      donem1Ihracat: p1.ihracatDeger,
      donem2Ihracat: p2?.ihracatDeger || 0,
      donem1Ithalat: p1.ithalatDeger,
      donem2Ithalat: p2?.ithalatDeger || 0
    };
  });

  // Radar chart verisi
  const radarData = period1Data.slice(0, 6).map(p1 => {
    const p2 = period2Data.find(p => p.urun === p1.urun);
    return {
      product: p1.urun.substring(0, 15),
      'Dönem 1': p1.ihracatDeger,
      'Dönem 2': p2?.ihracatDeger || 0
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥩 TÜİK Hayvansal Dış Ticaret - Dönemsel Karşılaştırma</h1>
        <p className="page-subtitle">
          Dinamik Dönem Analizi • Et & Süt Ürünleri • Canlı Hayvan • TÜİK Resmi Verileri
        </p>
      </div>

      {/* Dönem Seçim Paneli */}
      <div className="chart-card" style={{ marginBottom: '20px' }}>
        <h3 className="chart-title">📅 Dönem Seçimi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Dönem 1 */}
          <div style={{ padding: '15px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#22c55e', fontSize: '16px' }}>🟢 Dönem 1</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Başlangıç</label>
                <select 
                  className="filter-select" 
                  value={period1Start} 
                  onChange={(e) => setPeriod1Start(e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Bitiş</label>
                <select 
                  className="filter-select" 
                  value={period1End} 
                  onChange={(e) => setPeriod1End(e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Süre: {parseInt(period1End) - parseInt(period1Start) + 1} yıl
            </div>
          </div>

          {/* Dönem 2 */}
          <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6', fontSize: '16px' }}>🔵 Dönem 2</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Başlangıç</label>
                <select 
                  className="filter-select" 
                  value={period2Start} 
                  onChange={(e) => setPeriod2Start(e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Bitiş</label>
                <select 
                  className="filter-select" 
                  value={period2End} 
                  onChange={(e) => setPeriod2End(e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Süre: {parseInt(period2End) - parseInt(period2Start) + 1} yıl
            </div>
          </div>
        </div>
      </div>

      {/* Kategori Filtresi */}
      <div className="date-filter" style={{ marginBottom: '20px' }}>
        <div className="filter-group">
          <label className="filter-label">Kategori Filtresi</label>
          <select 
            className="filter-select" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Tümü">Tümü</option>
            {CATEGORIES.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
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
          {/* Karşılaştırma KPI'ları */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">İHRACAT DEĞİŞİMİ</span>
                <div className={`kpi-icon ${exportChange >= 0 ? 'green' : 'red'}`}>
                  {exportChange >= 0 ? '📈' : '📉'}
                </div>
              </div>
              <div className="kpi-value" style={{ color: exportChange >= 0 ? '#22c55e' : '#ef4444' }}>
                {exportChange >= 0 ? '+' : ''}{exportChange.toFixed(1)}%
              </div>
              <div className="kpi-subtitle">
                {formatMoney(p1TotalExportValue)} → {formatMoney(p2TotalExportValue)}
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">İTHALAT DEĞİŞİMİ</span>
                <div className={`kpi-icon ${importChange >= 0 ? 'red' : 'green'}`}>
                  {importChange >= 0 ? '📉' : '📈'}
                </div>
              </div>
              <div className="kpi-value" style={{ color: importChange >= 0 ? '#ef4444' : '#22c55e' }}>
                {importChange >= 0 ? '+' : ''}{importChange.toFixed(1)}%
              </div>
              <div className="kpi-subtitle">
                {formatMoney(p1TotalImportValue)} → {formatMoney(p2TotalImportValue)}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">DENGE DEĞİŞİMİ</span>
                <div className={`kpi-icon ${balanceChange >= 0 ? 'green' : 'red'}`}>
                  {balanceChange >= 0 ? '✅' : '⚠️'}
                </div>
              </div>
              <div className="kpi-value" style={{ color: balanceChange >= 0 ? '#22c55e' : '#ef4444' }}>
                {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(1)}%
              </div>
              <div className="kpi-subtitle">
                {formatMoney(p1Balance)} → {formatMoney(p2Balance)}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ÜRÜN SAYISI</span>
                <div className="kpi-icon blue">🏷️</div>
              </div>
              <div className="kpi-value">{period1Data.length}</div>
              <div className="kpi-subtitle">Analiz edilen</div>
            </div>
          </div>

          {/* Yan Yana Dönem KPI'ları */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Dönem 1 KPI */}
            <div className="chart-card" style={{ background: 'rgba(34, 197, 94, 0.03)' }}>
              <h3 className="chart-title">🟢 Dönem 1 ({period1Start}-{period1End})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>İhracat</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#22c55e' }}>{formatMoney(p1TotalExportValue)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatNumber(p1TotalExport)} KG</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>İthalat</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>{formatMoney(p1TotalImportValue)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatNumber(p1TotalImport)} KG</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ticaret Dengesi</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: p1Balance >= 0 ? '#22c55e' : '#ef4444' }}>
                  {p1Balance >= 0 ? '+' : ''}{formatMoney(p1Balance)}
                </div>
              </div>
            </div>

            {/* Dönem 2 KPI */}
            <div className="chart-card" style={{ background: 'rgba(59, 130, 246, 0.03)' }}>
              <h3 className="chart-title">🔵 Dönem 2 ({period2Start}-{period2End})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>İhracat</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#22c55e' }}>{formatMoney(p2TotalExportValue)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatNumber(p2TotalExport)} KG</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>İthalat</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>{formatMoney(p2TotalImportValue)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatNumber(p2TotalImport)} KG</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ticaret Dengesi</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: p2Balance >= 0 ? '#22c55e' : '#ef4444' }}>
                  {p2Balance >= 0 ? '+' : ''}{formatMoney(p2Balance)}
                </div>
              </div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="chart-grid">
            {/* Ürün Karşılaştırma */}
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📊 Dönemler Arası Ürün Karşılaştırması (İhracat)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="urun" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={120} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Legend />
                  <Bar dataKey="donem1Ihracat" name={`Dönem 1 (${period1Start}-${period1End})`} fill="#22c55e" />
                  <Bar dataKey="donem2Ihracat" name={`Dönem 2 (${period2Start}-${period2End})`} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="chart-card">
              <h3 className="chart-title">🎯 Ürün Performans Radyosu</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="product" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                  <Radar name={`Dönem 1`} dataKey="Dönem 1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Radar name={`Dönem 2`} dataKey="Dönem 2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* İthalat Karşılaştırma */}
            <div className="chart-card">
              <h3 className="chart-title">📥 İthalat Karşılaştırması</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="urun" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Legend />
                  <Bar dataKey="donem1Ithalat" name={`Dönem 1`} fill="#ef4444" opacity={0.7} />
                  <Bar dataKey="donem2Ithalat" name={`Dönem 2`} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detaylı Karşılaştırma Tablosu */}
          <div className="chart-card">
            <h3 className="chart-title">📋 Detaylı Dönemsel Karşılaştırma Tablosu</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Ürün</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>D1 İhracat ($)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>D2 İhracat ($)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Değişim</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>D1 İthalat ($)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>D2 İthalat ($)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px' }}>Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => {
                    const exportChange = row.donem1Ihracat !== 0 ? ((row.donem2Ihracat - row.donem1Ihracat) / row.donem1Ihracat * 100) : 0;
                    const importChange = row.donem1Ithalat !== 0 ? ((row.donem2Ithalat - row.donem1Ithalat) / row.donem1Ithalat * 100) : 0;
                    
                    return (
                      <tr key={row.urun} style={{ borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '500' }}>{row.urun}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#22c55e' }}>{formatMoney(row.donem1Ihracat)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#3b82f6' }}>{formatMoney(row.donem2Ihracat)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: exportChange >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                          {exportChange >= 0 ? '+' : ''}{exportChange.toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#ef4444', opacity: 0.7 }}>{formatMoney(row.donem1Ithalat)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#f97316' }}>{formatMoney(row.donem2Ithalat)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: importChange >= 0 ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                          {importChange >= 0 ? '+' : ''}{importChange.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Özetler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="data-table">
              <h3 className="data-table-title">🏆 Dönem 1 - En Çok İhracat</h3>
              {period1Data.slice(0, 5).map((product, index) => (
                <div className="table-row" key={product.urun}>
                  <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                  <div className="table-info">
                    <div className="table-name">{product.urun}</div>
                    <div className="table-subtext">Denge: {formatMoney(product.denge)}</div>
                  </div>
                  <div className="table-value green">{formatMoney(product.ihracatDeger)}</div>
                </div>
              ))}
            </div>

            <div className="data-table">
              <h3 className="data-table-title">🏆 Dönem 2 - En Çok İhracat</h3>
              {period2Data.slice(0, 5).map((product, index) => (
                <div className="table-row" key={product.urun}>
                  <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                  <div className="table-info">
                    <div className="table-name">{product.urun}</div>
                    <div className="table-subtext">Denge: {formatMoney(product.denge)}</div>
                  </div>
                  <div className="table-value green">{formatMoney(product.ihracatDeger)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
