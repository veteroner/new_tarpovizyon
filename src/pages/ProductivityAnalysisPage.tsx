import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface ProductData {
  urun: string;
  yil: number;
  ekilen_alan: number;
  uretim: number;
  verim: number;
  ic_tuketim: number;
}

interface YieldComparisonData {
  urun: string;
  verim2020: number;
  verim2021: number;
  verim2022: number;
  verim2023: number;
  ortalama: number;
}

interface EfficiencyData {
  urun: string;
  alan: number;
  uretim: number;
  verim: number;
}

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function ProductivityAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [yieldData, setYieldData] = useState<YieldComparisonData[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData[]>([]);
  const [trendData, setTrendData] = useState<{yil: number; ortalamaVerim: number}[]>([]);
  const [topProducts, setTopProducts] = useState<{urun: string; verim: number; degisim: number}[]>([]);
  const [selectedYear, setSelectedYear] = useState(2023);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const yieldQuery = `
          SELECT urun, yil, verim, ekilen_alan, uretim 
          FROM excel_urunler 
          WHERE yil >= 2020 AND yil <= 2023 AND verim > 0
          ORDER BY urun, yil
        `;
        
        const efficiencyQuery = `
          SELECT urun, ekilen_alan, uretim, verim 
          FROM excel_urunler 
          WHERE yil = ${selectedYear} AND verim > 0 AND ekilen_alan > 0
          ORDER BY verim DESC
          LIMIT 15
        `;
        
        const trendQuery = `
          SELECT yil, AVG(verim) as ortalamaVerim 
          FROM excel_urunler 
          WHERE verim > 0 
          GROUP BY yil 
          ORDER BY yil
        `;

        const [yieldRes, efficiencyRes, trendRes] = await Promise.all([
          fetchQuery(yieldQuery),
          fetchQuery(efficiencyQuery),
          fetchQuery(trendQuery)
        ]);

        if (yieldRes.data) {
          const productMap = new Map<string, YieldComparisonData>();
          
          yieldRes.data.forEach((item: ProductData) => {
            const urun = String(item.urun);
            if (!productMap.has(urun)) {
              productMap.set(urun, {
                urun,
                verim2020: 0,
                verim2021: 0,
                verim2022: 0,
                verim2023: 0,
                ortalama: 0
              });
            }
            const data = productMap.get(urun)!;
            const verim = Number(item.verim) || 0;
            if (item.yil === 2020) data.verim2020 = verim;
            if (item.yil === 2021) data.verim2021 = verim;
            if (item.yil === 2022) data.verim2022 = verim;
            if (item.yil === 2023) data.verim2023 = verim;
          });

          const processed = Array.from(productMap.values())
            .map(item => ({
              ...item,
              ortalama: (item.verim2020 + item.verim2021 + item.verim2022 + item.verim2023) / 4
            }))
            .filter(item => item.ortalama > 0)
            .sort((a, b) => b.ortalama - a.ortalama)
            .slice(0, 10);
          
          setYieldData(processed);

          const topProds = processed.slice(0, 5).map(item => ({
            urun: item.urun,
            verim: item.verim2023,
            degisim: item.verim2022 > 0 ? ((item.verim2023 - item.verim2022) / item.verim2022) * 100 : 0
          }));
          setTopProducts(topProds);
        }

        if (efficiencyRes.data) {
          const mapped = efficiencyRes.data.map((item: EfficiencyData) => ({
            urun: String(item.urun),
            alan: Number(item.ekilen_alan) || 0,
            uretim: Number(item.uretim) || 0,
            verim: Number(item.verim) || 0
          }));
          setEfficiencyData(mapped);
        }

        if (trendRes.data) {
          const mapped = trendRes.data.map((item: {yil: number; ortalamaVerim: number}) => ({
            yil: Number(item.yil),
            ortalamaVerim: Number(item.ortalamaVerim) || 0
          }));
          setTrendData(mapped);
        }

      } catch (error) {
        console.error('Verimlilik verileri yuklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYear]);

  const avgYield = yieldData.length > 0 
    ? yieldData.reduce((sum, item) => sum + item.ortalama, 0) / yieldData.length 
    : 0;
  
  const highestYield = yieldData.length > 0 ? yieldData[0] : null;
  
  const yieldGrowth = trendData.length >= 2
    ? ((trendData[trendData.length - 1].ortalamaVerim - trendData[trendData.length - 2].ortalamaVerim) / trendData[trendData.length - 2].ortalamaVerim) * 100
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Verimlilik Analizi</h1>
        <p className="page-subtitle">Tarimsal Urun Verimlilik Karsilastirmasi ve Trend Analizi</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Yil Secimi</label>
          <select 
            className="filter-select" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2023, 2022, 2021, 2020, 2019, 2018].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yukleniyor...</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">EN VERIMLI URUN</span>
                <div className="kpi-icon green">🏆</div>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.3rem' }}>
                {highestYield?.urun || '-'}
              </div>
              <div className="kpi-subtitle">
                {highestYield ? `${formatNumber(highestYield.ortalama)} kg/da ortalama` : '-'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ORTALAMA VERIM</span>
                <div className="kpi-icon blue">📈</div>
              </div>
              <div className="kpi-value">{formatNumber(avgYield)}</div>
              <div className="kpi-subtitle">kg/dekar</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">VERIM DEGISIMI</span>
                <div className={`kpi-icon ${yieldGrowth >= 0 ? 'green' : 'red'}`}>
                  {yieldGrowth >= 0 ? '📈' : '📉'}
                </div>
              </div>
              <div className="kpi-value" style={{ color: yieldGrowth >= 0 ? '#22c55e' : '#ef4444' }}>
                %{yieldGrowth.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Yillik degisim</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ANALIZ EDILEN</span>
                <div className="kpi-icon purple">🌾</div>
              </div>
              <div className="kpi-value">{yieldData.length}</div>
              <div className="kpi-subtitle">urun kategorisi</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yillik Ortalama Verim Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis 
                    tickFormatter={(v) => formatShort(v)} 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)} kg/da`, 'Ortalama Verim']}
                    labelFormatter={(label) => `Yil: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ortalamaVerim" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🌾 Urun Bazinda Verim (2020-2023)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={yieldData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => formatShort(v)} 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="urun" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                    width={100} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)} kg/da`, '']}
                  />
                  <Legend />
                  <Bar dataKey="verim2020" name="2020" fill={COLORS[0]} />
                  <Bar dataKey="verim2021" name="2021" fill={COLORS[1]} />
                  <Bar dataKey="verim2022" name="2022" fill={COLORS[2]} />
                  <Bar dataKey="verim2023" name="2023" fill={COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📍 Alan-Verim Iliskisi ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    dataKey="alan" 
                    name="Ekilen Alan" 
                    tickFormatter={(v) => formatShort(v)}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="verim" 
                    name="Verim"
                    tickFormatter={(v) => formatShort(v)}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="uretim" range={[100, 1000]} name="Uretim" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Ekilen Alan') return [`${formatNumber(value)} da`, name];
                      if (name === 'Verim') return [`${formatNumber(value)} kg/da`, name];
                      return [`${formatNumber(value)} ton`, 'Uretim'];
                    }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return `Urun: ${payload[0].payload.urun}`;
                      }
                      return '';
                    }}
                  />
                  <Scatter 
                    data={efficiencyData} 
                    fill="#3b82f6"
                    shape="circle"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-table">
            <h3 className="data-table-title">🏅 En Verimli Urunler - {selectedYear}</h3>
            {topProducts.map((product, index) => (
              <div className="table-row" key={product.urun}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{product.urun}</div>
                  <div className="table-subtext">
                    Yillik Degisim: 
                    <span style={{ color: product.degisim >= 0 ? '#22c55e' : '#ef4444', marginLeft: '4px' }}>
                      {product.degisim >= 0 ? '+' : ''}{product.degisim.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="table-value green">{formatNumber(product.verim)} kg/da</div>
              </div>
            ))}
          </div>

          <div className="chart-card" style={{ marginTop: '1.5rem' }}>
            <h3 className="chart-title">📊 Verimlilik Ozet Tablosu</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Urun</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>2020</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>2021</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>2022</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>2023</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Ortalama</th>
                  </tr>
                </thead>
                <tbody>
                  {yieldData.map((item, idx) => (
                    <tr key={item.urun} style={{ 
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--card-bg)' : 'transparent'
                    }}>
                      <td style={{ padding: '10px', fontWeight: 500 }}>{item.urun}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatNumber(item.verim2020)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatNumber(item.verim2021)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatNumber(item.verim2022)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{formatNumber(item.verim2023)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                        {formatNumber(item.ortalama)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
