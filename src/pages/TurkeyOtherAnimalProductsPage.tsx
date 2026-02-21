import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchQuery } from '../services/api';

const TABLE_NAME = 'tuik_hayvancilik_hayvansaluretim';
const YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i); // 2004-2025
const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#0ea5e9', '#d946ef'];

interface ProductOption {
  id: string;
  label: string;
  hayvan: string;
  urun: string;
  icon: string;
  birim: string;
}

const PRODUCTS: ProductOption[] = [
  { id: 'merinos_yapagi', label: 'Merinos Yapağı', hayvan: 'Koyun', urun: 'Yapağı', icon: '🐑', birim: 'Ton' },
  { id: 'yerli_yapagi', label: 'Yerli Yapağı', hayvan: 'Koyun', urun: 'Yapağı', icon: '🐑', birim: 'Ton' },
  { id: 'tiftik', label: 'Tiftik', hayvan: 'Keçi', urun: 'Tiftik', icon: '🐐', birim: 'Ton' },
  { id: 'keci_kili', label: 'Keçi Kılı', hayvan: 'Keçi', urun: 'Keçi Kılı', icon: '🐐', birim: 'Ton' },
  { id: 'balmumu', label: 'Balmumu', hayvan: 'Arı', urun: 'Balmumu', icon: '🐝', birim: 'Ton' },
  { id: 'ipek_bocegi', label: 'İpek Böceği Kozası', hayvan: 'İpek Böceği', urun: 'İpek Böceği Kozası', icon: '🦋', birim: 'Ton' },
  { id: 'kovan_eski', label: 'Kovan (Eski Tip)', hayvan: 'Arı', urun: 'Kovan', icon: '🍯', birim: 'Adet' },
  { id: 'kovan_yeni', label: 'Kovan (Yeni Tip)', hayvan: 'Arı', urun: 'Kovan', icon: '🍯', birim: 'Adet' },
];

interface YearPoint {
  year: number;
  value: number;
}

interface CityDataItem {
  name: string;
  value: number;
  share: string;
  fill: string;
}

interface ProductSummary {
  label: string;
  icon: string;
  value: number;
  birim: string;
  change: number;
}

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function TurkeyOtherAnimalProductsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('merinos_yapagi');
  const [trendData, setTrendData] = useState<YearPoint[]>([]);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  const currentProduct = PRODUCTS.find(p => p.id === selectedProduct) || PRODUCTS[0];

  // Ürün filtresi için tur belirleme
  const getTurFilter = (productId: string): string => {
    switch (productId) {
      case 'merinos_yapagi': return "AND tur='Merinos'";
      case 'yerli_yapagi': return "AND tur='Yerli'";
      case 'kovan_eski': return "AND tur='Eski Tip'";
      case 'kovan_yeni': return "AND tur='Yeni Tip'";
      default: return '';
    }
  };

  // Tüm ürünlerin özet değerlerini yükle
  useEffect(() => {
    const loadSummaries = async () => {
      try {
        const queries = PRODUCTS.map(p => {
          const turFilter = getTurFilter(p.id);
          return fetchQuery(`
            SELECT 
              SUM(CAST(COALESCE(\`2024\`,0) AS DECIMAL(20,2))) as val2024,
              SUM(CAST(COALESCE(\`2023\`,0) AS DECIMAL(20,2))) as val2023
            FROM ${TABLE_NAME}
            WHERE hayvan='${p.hayvan}' AND urun='${p.urun}' ${turFilter}
              AND duzeykod='1'
          `);
        });

        const results = await Promise.all(queries);
        const summaries: ProductSummary[] = results.map((res, i) => {
          const row = res.data?.[0];
          const val2024 = Number(row?.val2024) || 0;
          const val2023 = Number(row?.val2023) || 0;
          const latestVal = val2024 > 0 ? val2024 : val2023;
          const prevVal = val2024 > 0 ? val2023 : 0;
          const change = prevVal > 0 ? ((latestVal - prevVal) / prevVal * 100) : 0;
          return {
            label: PRODUCTS[i].label,
            icon: PRODUCTS[i].icon,
            value: latestVal,
            birim: PRODUCTS[i].birim,
            change
          };
        });
        setProductSummaries(summaries);
      } catch (e) {
        console.error('Özet veriler yüklenirken hata:', e);
      }
    };
    loadSummaries();
  }, []);

  // Seçili ürün için detay verilerini yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const turFilter = getTurFilter(selectedProduct);

      // Yıllık trend (ülke düzeyi)
      const yearSums = YEARS.map(y => `SUM(CAST(COALESCE(\`${y}\`,0) AS DECIMAL(20,2))) as v${y}`).join(', ');
      const trendQuery = `SELECT ${yearSums}
        FROM ${TABLE_NAME}
        WHERE hayvan='${currentProduct.hayvan}' AND urun='${currentProduct.urun}' ${turFilter}
          AND duzeykod='1'`;

      // İl bazında dağılım (en son veri olan yıl)
      const cityQuery = `SELECT il, 
          CAST(COALESCE(\`2024\`,0) AS DECIMAL(20,2)) as val2024,
          CAST(COALESCE(\`2023\`,0) AS DECIMAL(20,2)) as val2023
        FROM ${TABLE_NAME}
        WHERE hayvan='${currentProduct.hayvan}' AND urun='${currentProduct.urun}' ${turFilter}
          AND duzeykod='3'
          AND il IS NOT NULL AND il != '' 
          AND il NOT IN ('TOPLAM','Toplam','TÜRKİYE','Türkiye')
        ORDER BY CAST(COALESCE(\`2024\`, \`2023\`, 0) AS DECIMAL(20,2)) DESC
        LIMIT 20`;

      const [trendRes, cityRes] = await Promise.all([
        fetchQuery(trendQuery),
        fetchQuery(cityQuery)
      ]);

      // Trend verisi
      if (trendRes.data && trendRes.data[0]) {
        const row = trendRes.data[0];
        const points: YearPoint[] = [];
        for (const y of YEARS) {
          const val = Number(row[`v${y}`]) || 0;
          if (val > 0) {
            points.push({ year: y, value: val });
          }
        }
        setTrendData(points);
        const lastVal = points.length > 0 ? points[points.length - 1].value : 0;
        setTotalValue(lastVal);
      } else {
        setTrendData([]);
        setTotalValue(0);
      }

      // İl verileri
      if (cityRes.data) {
        const cities: CityDataItem[] = [];
        let total = 0;
        cityRes.data.forEach((row: Record<string, string | number>) => {
          const val = Number(row['val2024']) || Number(row['val2023']) || 0;
          if (val > 0) {
            total += val;
            cities.push({
              name: String(row['il'] || ''),
              value: val,
              share: '0',
              fill: ''
            });
          }
        });
        // Pay ve renk ata
        const sorted = cities.sort((a, b) => b.value - a.value).slice(0, 20);
        sorted.forEach((city, i) => {
          city.share = total > 0 ? ((city.value / total) * 100).toFixed(1) : '0';
          city.fill = COLORS[i % COLORS.length];
        });
        setCityData(sorted);
      }
    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
      setTrendData([]);
      setCityData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, currentProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Büyüme verileri
  const growthData = useMemo(() => {
    if (trendData.length < 2) return [];
    return trendData.slice(-6).map((item, index, arr) => {
      if (index === 0) return null;
      const prev = arr[index - 1].value;
      const growth = prev > 0 ? ((item.value - prev) / prev * 100) : 0;
      return { year: String(item.year), growth: parseFloat(growth.toFixed(1)) };
    }).filter(Boolean) as { year: string; growth: number }[];
  }, [trendData]);

  // YoY değişim
  const lastTwo = trendData.slice(-2);
  const yearChange = lastTwo.length === 2 && lastTwo[0].value > 0
    ? ((lastTwo[1].value - lastTwo[0].value) / lastTwo[0].value * 100)
    : 0;
  const latestYear = trendData.length > 0 ? trendData[trendData.length - 1].year : '-';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧶 Türkiye Diğer Hayvansal Ürünler (TÜİK)</h1>
        <p className="page-subtitle">Yapağı, Tiftik, Keçi Kılı, Balmumu, İpek Böceği Kozası, Kovan — İl Bazlı Analiz</p>
      </div>

      {/* Ürün Seçici */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Ürün Seçimi</label>
          <select className="filter-select" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            {PRODUCTS.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tüm Ürünler Özet Kartları */}
      {productSummaries.length > 0 && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {productSummaries.filter(s => s.value > 0).slice(0, 8).map((summary, idx) => (
            <div className="kpi-card" key={idx} style={{ cursor: 'pointer', border: PRODUCTS[idx]?.id === selectedProduct ? '2px solid #f59e0b' : undefined }}
              onClick={() => PRODUCTS[idx] && setSelectedProduct(PRODUCTS[idx].id)}>
              <div className="kpi-header">
                <span className="kpi-title">{summary.icon} {summary.label}</span>
                {summary.change !== 0 && (
                  <div className={`kpi-icon ${summary.change >= 0 ? 'green' : 'red'}`}>
                    {summary.change >= 0 ? '📈' : '📉'}
                  </div>
                )}
              </div>
              <div className="kpi-value" style={{ fontSize: '1rem' }}>{formatNumber(summary.value)}</div>
              <div className="kpi-subtitle">
                {summary.birim}
                {summary.change !== 0 && <span style={{ color: summary.change >= 0 ? '#22c55e' : '#ef4444', marginLeft: 8 }}>%{summary.change.toFixed(1)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* KPI Detay */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">{currentProduct.icon} {currentProduct.label.toUpperCase()}</span></div>
              <div className="kpi-value">{formatNumber(totalValue)}</div>
              <div className="kpi-subtitle">{currentProduct.birim} ({latestYear})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">VERİ ARALIĞI</span><div className="kpi-icon blue">📅</div></div>
              <div className="kpi-value" style={{ fontSize: '1rem' }}>{trendData[0]?.year || '-'} – {latestYear}</div>
              <div className="kpi-subtitle">{trendData.length} yıllık veri</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{cityData[0]?.name || '-'}</div>
              <div className="kpi-subtitle">{cityData[0] ? formatNumber(cityData[0].value) + ' ' + currentProduct.birim : '-'}</div>
            </div>
          </div>

          {/* Trend + Büyüme */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: growthData.length > 0 ? 'span 1' : 'span 2' }}>
              <h3 className="chart-title">📈 {currentProduct.label} Üretim Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} ${currentProduct.birim}`, currentProduct.label]} />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {growthData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">📊 Yıllık Büyüme Oranı (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `%${v}`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`%${value.toFixed(1)}`, 'Büyüme']} />
                    <Bar dataKey="growth" name="Büyüme" radius={[4, 4, 0, 0]}>
                      {growthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* İl Bazlı Dağılım */}
          {cityData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card">
                <h3 className="chart-title">🏙️ İl Bazında {currentProduct.label} Üretimi</h3>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} ${currentProduct.birim}`, currentProduct.label]} />
                    <Bar dataKey="value" name={currentProduct.label} radius={[0, 4, 4, 0]}>
                      {cityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">🥧 İl Payları Dağılımı (Top 10)</h3>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={cityData.slice(0, 10)}
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      innerRadius={40}
                      dataKey="value"
                      label={({ name, percent }) => `${name?.substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {cityData.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} ${currentProduct.birim}`, currentProduct.label]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* İl Sıralama Tablosu */}
          {cityData.length > 0 && (
            <div className="data-table">
              <h3 className="data-table-title">📋 İl Sıralaması — {currentProduct.label}</h3>
              {cityData.map((city, index) => (
                <div className="table-row" key={city.name}>
                  <div className={`table-rank ${index < 3 ? 'orange' : ''}`}>{index + 1}</div>
                  <div className="table-info">
                    <div className="table-name">{city.name}</div>
                    <div className="table-subtext">Pay: %{city.share}</div>
                  </div>
                  <div className="table-value orange">{formatNumber(city.value)} {currentProduct.birim}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
