import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

interface ProductData {
  id: string;
  urun: string;
  yil: string;
  uretici_sayisi: number;
  ekilen_alan: number;
  uretim: number;
  verim: number;
  ic_tuketim: number;
  ithalat_miktar: number;
  ithalat_deger: number;
  ihracat_miktar: number;
  ihracat_deger: number;
}

interface YearlyTrend {
  yil: string;
  toplamUretim: number;
  toplamAlan: number;
  ortalamaVerim: number;
  toplamIthalat: number;
  toplamIhracat: number;
}

interface ProductSummary {
  urun: string;
  toplamUretim: number;
  toplamAlan: number;
  ortalamaVerim: number;
  toplamIthalat: number;
  toplamIhracat: number;
}

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

export default function ProductivityAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Buğday', 'Arpa', 'Dane Mısır']);
  const [selectedYear, setSelectedYear] = useState('2023');
  const [allData, setAllData] = useState<ProductData[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<YearlyTrend[]>([]);
  const [productSummary, setProductSummary] = useState<ProductSummary[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'uretim' | 'ticaret' | 'verim'>('uretim');

  // Ürün ve yıl listesini yükle
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [productRes, yearRes] = await Promise.all([
          fetchQuery('SELECT DISTINCT urun FROM excel_urunler ORDER BY urun'),
          fetchQuery('SELECT DISTINCT yil FROM excel_urunler ORDER BY yil DESC')
        ]);

        if (productRes.data) {
          const products = productRes.data.map((item: Record<string, string | number>) => String(item.urun));
          setProductList(products);
        }
        if (yearRes.data) {
          const years = yearRes.data.map((item: Record<string, string | number>) => String(item.yil));
          setYearOptions(years);
        }
      } catch (error) {
        console.error('Meta veri yüklenirken hata:', error);
      }
    };
    loadMeta();
  }, []);

  // Ana veriyi yükle
  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setAllData([]);
      return;
    }

    setLoading(true);
    try {
      const productFilter = selectedProducts.map(p => `'${p}'`).join(',');
      
      // Seçili ürünlerin tüm verileri
      const dataQuery = `
        SELECT * FROM excel_urunler 
        WHERE urun IN (${productFilter})
        ORDER BY urun, yil
      `;
      
      // Yıllık toplam trend (tüm ürünler)
      const trendQuery = `
        SELECT yil, 
          SUM(uretim) as toplamUretim,
          SUM(ekilen_alan) as toplamAlan,
          AVG(verim) as ortalamaVerim,
          SUM(ithalat_miktar) as toplamIthalat,
          SUM(ihracat_miktar) as toplamIhracat
        FROM excel_urunler
        WHERE urun IN (${productFilter})
        GROUP BY yil
        ORDER BY yil
      `;

      // Ürün bazında özet (seçili yıl)
      const summaryQuery = `
        SELECT urun,
          SUM(uretim) as toplamUretim,
          SUM(ekilen_alan) as toplamAlan,
          AVG(verim) as ortalamaVerim,
          SUM(ithalat_miktar) as toplamIthalat,
          SUM(ihracat_miktar) as toplamIhracat
        FROM excel_urunler
        WHERE yil = '${selectedYear}' AND urun IN (${productFilter})
        GROUP BY urun
        ORDER BY toplamUretim DESC
      `;

      const [dataRes, trendRes, summaryRes] = await Promise.all([
        fetchQuery(dataQuery),
        fetchQuery(trendQuery),
        fetchQuery(summaryQuery)
      ]);

      if (dataRes.data) {
        const mapped = dataRes.data.map((item: Record<string, string | number>) => ({
          id: String(item.id),
          urun: String(item.urun),
          yil: String(item.yil),
          uretici_sayisi: Number(item.uretici_sayisi) || 0,
          ekilen_alan: Number(item.ekilen_alan) || 0,
          uretim: Number(item.uretim) || 0,
          verim: Number(item.verim) || 0,
          ic_tuketim: Number(item.ic_tuketim) || 0,
          ithalat_miktar: Number(item.ithalat_miktar) || 0,
          ithalat_deger: Number(item.ithalat_deger) || 0,
          ihracat_miktar: Number(item.ihracat_miktar) || 0,
          ihracat_deger: Number(item.ihracat_deger) || 0
        }));
        setAllData(mapped);
      }

      if (trendRes.data) {
        const mapped = trendRes.data.map((item: Record<string, string | number>) => ({
          yil: String(item.yil),
          toplamUretim: Number(item.toplamUretim) || 0,
          toplamAlan: Number(item.toplamAlan) || 0,
          ortalamaVerim: Number(item.ortalamaVerim) || 0,
          toplamIthalat: Number(item.toplamIthalat) || 0,
          toplamIhracat: Number(item.toplamIhracat) || 0
        }));
        setYearlyTrend(mapped);
      }

      if (summaryRes.data) {
        const mapped = summaryRes.data.map((item: Record<string, string | number>) => ({
          urun: String(item.urun),
          toplamUretim: Number(item.toplamUretim) || 0,
          toplamAlan: Number(item.toplamAlan) || 0,
          ortalamaVerim: Number(item.ortalamaVerim) || 0,
          toplamIthalat: Number(item.toplamIthalat) || 0,
          toplamIhracat: Number(item.toplamIhracat) || 0
        }));
        setProductSummary(mapped);
      }

    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hesaplamalar
  const currentYearData = allData.filter(d => d.yil === selectedYear);
  const previousYearData = allData.filter(d => d.yil === String(Number(selectedYear) - 1));
  
  const totalProduction = currentYearData.reduce((sum, d) => sum + d.uretim, 0);
  const prevProduction = previousYearData.reduce((sum, d) => sum + d.uretim, 0);
  const productionChange = prevProduction > 0 ? ((totalProduction - prevProduction) / prevProduction) * 100 : 0;

  const totalArea = currentYearData.reduce((sum, d) => sum + d.ekilen_alan, 0);
  const avgYield = currentYearData.length > 0 
    ? currentYearData.reduce((sum, d) => sum + d.verim, 0) / currentYearData.length 
    : 0;

  const totalExport = currentYearData.reduce((sum, d) => sum + d.ihracat_miktar, 0);
  const totalExportValue = currentYearData.reduce((sum, d) => sum + d.ihracat_deger, 0);
  const totalImport = currentYearData.reduce((sum, d) => sum + d.ithalat_miktar, 0);
  const totalImportValue = currentYearData.reduce((sum, d) => sum + d.ithalat_deger, 0);
  const tradeBal = totalExportValue - totalImportValue;

  // Ürün seçim handler
  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(product)) {
        return prev.filter(p => p !== product);
      } else {
        return [...prev, product];
      }
    });
  };

  // Yıllık trend verisi - ürün bazında ayrılmış
  const getProductTrendData = () => {
    const years = [...new Set(allData.map(d => d.yil))].sort();
    return years.map(yil => {
      const yearData: Record<string, string | number> = { yil };
      selectedProducts.forEach(urun => {
        const productData = allData.find(d => d.yil === yil && d.urun === urun);
        if (viewMode === 'uretim') {
          yearData[urun] = productData?.uretim || 0;
        } else if (viewMode === 'verim') {
          yearData[urun] = productData?.verim || 0;
        } else {
          yearData[`${urun}_ihracat`] = productData?.ihracat_miktar || 0;
          yearData[`${urun}_ithalat`] = productData?.ithalat_miktar || 0;
        }
      });
      return yearData;
    });
  };

  // Pasta grafik için üretim dağılımı
  const pieData = productSummary.map((item, index) => ({
    name: item.urun,
    value: item.toplamUretim,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌾 Tarımsal Ürün Detaylı Analizi</h1>
        <p className="page-subtitle">
          Excel Verisi • 40 Ürün • 2002-2025 • Üretim, Verim, İthalat/İhracat Analizi
        </p>
      </div>

      {/* Filtreler */}
      <div className="date-filter" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="filter-group">
          <label className="filter-label">Yıl Seçimi</label>
          <select 
            className="filter-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Görünüm Modu</label>
          <select 
            className="filter-select" 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as 'uretim' | 'ticaret' | 'verim')}
          >
            <option value="uretim">Üretim Analizi</option>
            <option value="verim">Verim Analizi</option>
            <option value="ticaret">Dış Ticaret</option>
          </select>
        </div>
      </div>

      {/* Ürün Seçici */}
      <div className="chart-card" style={{ marginBottom: '20px' }}>
        <h3 className="chart-title">🎯 Ürün Seçimi ({selectedProducts.length} ürün seçili)</h3>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          maxHeight: '150px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {productList.map(product => (
            <button
              key={product}
              onClick={() => handleProductToggle(product)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: selectedProducts.includes(product) ? '2px solid #22c55e' : '1px solid var(--border)',
                background: selectedProducts.includes(product) ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                color: selectedProducts.includes(product) ? '#22c55e' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: selectedProducts.includes(product) ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {product}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setSelectedProducts(productList.slice(0, 5))}
            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            İlk 5
          </button>
          <button 
            onClick={() => setSelectedProducts(productList)}
            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            Tümünü Seç
          </button>
          <button 
            onClick={() => setSelectedProducts([])}
            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            Temizle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">TOPLAM ÜRETİM</span>
                <div className="kpi-icon green">🌾</div>
              </div>
              <div className="kpi-value">{formatNumber(totalProduction)}</div>
              <div className="kpi-subtitle">
                ton ({selectedYear})
                <span style={{ 
                  marginLeft: '8px', 
                  color: productionChange >= 0 ? '#22c55e' : '#ef4444' 
                }}>
                  {productionChange >= 0 ? '↑' : '↓'} {Math.abs(productionChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">EKİLEN ALAN</span>
                <div className="kpi-icon blue">📐</div>
              </div>
              <div className="kpi-value">{formatNumber(totalArea)}</div>
              <div className="kpi-subtitle">dekar</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ORT. VERİM</span>
                <div className="kpi-icon yellow">📈</div>
              </div>
              <div className="kpi-value">{avgYield.toFixed(0)}</div>
              <div className="kpi-subtitle">kg/dekar</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">İHRACAT</span>
                <div className="kpi-icon green">🚢</div>
              </div>
              <div className="kpi-value">{formatNumber(totalExport)}</div>
              <div className="kpi-subtitle">ton • {formatMoney(totalExportValue * 1000)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">İTHALAT</span>
                <div className="kpi-icon red">📦</div>
              </div>
              <div className="kpi-value">{formatNumber(totalImport)}</div>
              <div className="kpi-subtitle">ton • {formatMoney(totalImportValue * 1000)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">TİCARET DENGESİ</span>
                <div className={`kpi-icon ${tradeBal >= 0 ? 'green' : 'red'}`}>
                  {tradeBal >= 0 ? '📈' : '📉'}
                </div>
              </div>
              <div className="kpi-value" style={{ color: tradeBal >= 0 ? '#22c55e' : '#ef4444' }}>
                {tradeBal >= 0 ? '+' : ''}{formatMoney(tradeBal * 1000)}
              </div>
              <div className="kpi-subtitle">{tradeBal >= 0 ? 'Fazla' : 'Açık'}</div>
            </div>
          </div>

          {/* Grafikler */}
          <div className="chart-grid">
            {/* Yıllık Trend */}
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">
                📅 Yıllık {viewMode === 'uretim' ? 'Üretim' : viewMode === 'verim' ? 'Verim' : 'Dış Ticaret'} Trendi (2002-2025)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                {viewMode === 'ticaret' ? (
                  <ComposedChart data={yearlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatNumber(value) + ' ton', name]}
                      labelFormatter={(label) => `Yıl: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="toplamIhracat" name="İhracat" fill="#22c55e" />
                    <Bar dataKey="toplamIthalat" name="İthalat" fill="#ef4444" />
                    <Line type="monotone" dataKey="toplamUretim" name="Üretim" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                ) : (
                  <AreaChart data={getProductTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis 
                      tickFormatter={(v) => formatShort(v)} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      label={{ 
                        value: viewMode === 'verim' ? 'kg/da' : 'ton', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: 'var(--text-secondary)', fontSize: 10 }
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        viewMode === 'verim' ? `${formatNumber(value)} kg/da` : `${formatNumber(value)} ton`, 
                        name
                      ]}
                      labelFormatter={(label) => `Yıl: ${label}`}
                    />
                    <Legend />
                    {selectedProducts.map((product, index) => (
                      <Area 
                        key={product}
                        type="monotone" 
                        dataKey={product} 
                        name={product}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]} 
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Üretim Dağılımı Pasta */}
            <div className="chart-card">
              <h3 className="chart-title">🥧 Üretim Dağılımı ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value) + ' ton'} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Ürün Karşılaştırma Bar */}
            <div className="chart-card">
              <h3 className="chart-title">📊 Ürün Karşılaştırması ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productSummary} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="urun" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={80} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                  <Bar dataKey="toplamUretim" name="Üretim (ton)" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verim Karşılaştırma */}
          <div className="chart-card">
            <h3 className="chart-title">⚡ Verim Sıralaması ({selectedYear})</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={[...productSummary].sort((a, b) => b.ortalamaVerim - a.ortalamaVerim)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="urun" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'kg/dekar', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(0)} kg/da`} />
                <Bar dataKey="ortalamaVerim" name="Verim" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detaylı Tablo */}
          <div className="chart-card">
            <h3 className="chart-title">📋 Detaylı Veri Tablosu ({selectedYear})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-secondary)' }}>Ürün</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Ekilen Alan (da)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Üretim (ton)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Verim (kg/da)</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>İç Tüketim</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>İhracat</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>İthalat</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Denge</th>
                  </tr>
                </thead>
                <tbody>
                  {currentYearData.map((row, index) => {
                    const balance = row.ihracat_deger - row.ithalat_deger;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '500' }}>{row.urun}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px' }}>{formatNumber(row.ekilen_alan)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#22c55e', fontWeight: '600' }}>{formatNumber(row.uretim)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px' }}>{row.verim.toFixed(0)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px' }}>{formatNumber(row.ic_tuketim)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#22c55e' }}>{formatNumber(row.ihracat_miktar)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#ef4444' }}>{formatNumber(row.ithalat_miktar)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 8px', color: balance >= 0 ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                          {balance >= 0 ? '+' : ''}{formatMoney(balance * 1000)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '700', background: 'var(--surface)' }}>
                    <td style={{ padding: '12px 8px' }}>TOPLAM</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>{formatNumber(totalArea)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', color: '#22c55e' }}>{formatNumber(totalProduction)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>{avgYield.toFixed(0)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>{formatNumber(currentYearData.reduce((s, d) => s + d.ic_tuketim, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', color: '#22c55e' }}>{formatNumber(totalExport)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', color: '#ef4444' }}>{formatNumber(totalImport)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', color: tradeBal >= 0 ? '#22c55e' : '#ef4444' }}>
                      {tradeBal >= 0 ? '+' : ''}{formatMoney(tradeBal * 1000)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* İstatistik Özeti */}
          <div className="data-table">
            <h3 className="data-table-title">🏆 En Yüksek Üretimli Ürünler ({selectedYear})</h3>
            {productSummary.slice(0, 8).map((product, index) => (
              <div className="table-row" key={product.urun}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{product.urun}</div>
                  <div className="table-subtext">
                    Alan: {formatNumber(product.toplamAlan)} da • Verim: {product.ortalamaVerim.toFixed(0)} kg/da
                  </div>
                </div>
                <div className="table-value green">{formatNumber(product.toplamUretim)} ton</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
