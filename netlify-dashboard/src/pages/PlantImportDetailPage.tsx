import { useEffect, useState, useCallback, useMemo } from 'react';
import { TrendingUp, Package, Globe, DollarSign, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { ProductFilter } from '../components/ProductFilter';
import { CountryFilter } from '../components/CountryFilter';
import { DetailedTable } from '../components/DetailedTable';
import { TrendCard } from '../components/TrendComparison';
import { translateCountry } from '../utils/countryTranslations';
import { 
  fetchQuery, 
  formatMoney, 
  formatNumber, 
  formatUnitPrice,
  TRADE_YEARS,
  queries,
  addYearFilter
} from '../services/api';

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#14b8a6', '#2dd4bf', '#5eead4'];

interface ExportDetail {
  ana_urun: string;
  ulke: string;
  yil: string;
  miktar: number;
  deger: number;
  birim: string;
  islem_sayisi: number;
  birim_fiyat: number;
}

export function PlantImportDetailPage() {
  const [data, setData] = useState<ExportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let detailQuery = queries.plantImportDetail;

      // Apply year filter
      if (selectedYear !== 'all') {
        detailQuery = addYearFilter(detailQuery, selectedYear);
      }

      const detailRes = await fetchQuery(detailQuery);

      const details = (detailRes.data || []) as any[];
      setData(details.map(d => ({
        ana_urun: String(d.ana_urun || ''),
        ulke: translateCountry(String(d.ulke || '')),
        yil: String(d.yil || ''),
        miktar: parseFloat(String(d.miktar || 0)),
        deger: parseFloat(String(d.deger || 0)),
        birim: String(d.birim || ''),
        islem_sayisi: parseInt(String(d.islem_sayisi || 0)),
        birim_fiyat: parseFloat(String(d.birim_fiyat || 0)),
      })));
    } catch (error) {
      console.error('Error loading plant export detail data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get available products and countries for filters
  const availableProducts = useMemo(() => {
    const products = new Set(data.map(d => d.ana_urun));
    return Array.from(products).sort();
  }, [data]);

  const availableCountries = useMemo(() => {
    const countries = new Set(data.map(d => d.ulke));
    return Array.from(countries).sort();
  }, [data]);

  // Filtered data based on product and country selection
  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (selectedProducts.length > 0 && !selectedProducts.includes(d.ana_urun)) {
        return false;
      }
      if (selectedCountries.length > 0 && !selectedCountries.includes(d.ulke)) {
        return false;
      }
      return true;
    });
  }, [data, selectedProducts, selectedCountries]);

  // Calculations based on filtered data
  const filteredSummary = useMemo(() => {
    const totalValue = filteredData.reduce((sum, d) => sum + d.deger, 0);
    const totalQuantity = filteredData.reduce((sum, d) => sum + d.miktar, 0);
    const avgUnitPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      totalValue,
      totalQuantity,
      avgUnitPrice,
      productCount: new Set(filteredData.map(d => d.ana_urun)).size,
      countryCount: new Set(filteredData.map(d => d.ulke)).size,
    };
  }, [filteredData]);

  // Top products by value
  const topProducts = useMemo(() => {
    const productMap = new Map<string, number>();
    filteredData.forEach(d => {
      productMap.set(d.ana_urun, (productMap.get(d.ana_urun) || 0) + d.deger);
    });
    return Array.from(productMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Top countries by value
  const topCountries = useMemo(() => {
    const countryMap = new Map<string, number>();
    filteredData.forEach(d => {
      countryMap.set(d.ulke, (countryMap.get(d.ulke) || 0) + d.deger);
    });
    return Array.from(countryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Yearly trend
  const yearlyTrend = useMemo(() => {
    const yearMap = new Map<string, { deger: number; miktar: number }>();
    filteredData.forEach(d => {
      const current = yearMap.get(d.yil) || { deger: 0, miktar: 0 };
      yearMap.set(d.yil, {
        deger: current.deger + d.deger,
        miktar: current.miktar + d.miktar,
      });
    });
    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        deger: data.deger / 1e9, // Convert to billions
        miktar: data.miktar / 1e6, // Convert to millions
        birim_fiyat: data.miktar > 0 ? data.deger / data.miktar : 0,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filteredData]);

  type YearSummary = {
    year: string;
    totalValue: number;
    totalQuantity: number;
    avgUnitPrice: number;
  };

  const yearlySummary = useMemo<YearSummary[]>(() => {
    const yearMap = new Map<string, { totalValue: number; totalQuantity: number }>();

    filteredData.forEach(d => {
      const current = yearMap.get(d.yil) || { totalValue: 0, totalQuantity: 0 };
      yearMap.set(d.yil, {
        totalValue: current.totalValue + d.deger,
        totalQuantity: current.totalQuantity + d.miktar,
      });
    });

    return Array.from(yearMap.entries())
      .map(([year, totals]) => ({
        year,
        totalValue: totals.totalValue,
        totalQuantity: totals.totalQuantity,
        avgUnitPrice: totals.totalQuantity > 0 ? totals.totalValue / totals.totalQuantity : 0,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filteredData]);

  const latestYear = yearlySummary.at(-1);
  const previousYear = yearlySummary.at(-2);

  // Product-Country matrix (top combinations) - aggregated
  const topCombinations = useMemo(() => {
    const comboMap = new Map<string, { product: string; country: string; totalValue: number; totalQuantity: number }>();

    filteredData.forEach(d => {
      const key = `${d.ana_urun}||${d.ulke}`;
      const current = comboMap.get(key) || { product: d.ana_urun, country: d.ulke, totalValue: 0, totalQuantity: 0 };
      comboMap.set(key, {
        ...current,
        totalValue: current.totalValue + d.deger,
        totalQuantity: current.totalQuantity + d.miktar,
      });
    });

    return Array.from(comboMap.values())
      .map(c => ({
        combination: `${c.product} → ${c.country}`,
        product: c.product,
        country: c.country,
        toplam_deger: c.totalValue,
        toplam_miktar: c.totalQuantity,
        birim_fiyat: c.totalQuantity > 0 ? c.totalValue / c.totalQuantity : 0,
      }))
      .sort((a, b) => b.toplam_deger - a.toplam_deger)
      .slice(0, 20);
  }, [filteredData]);

  const combinationColumns = [
    { key: 'combination', label: 'Ürün → Ülke', align: 'left' as const },
    {
      key: 'toplam_deger',
      label: 'Toplam Değer',
      align: 'right' as const,
      formatter: (val: number) => formatMoney(val),
    },
    {
      key: 'toplam_miktar',
      label: 'Toplam Miktar',
      align: 'right' as const,
      formatter: (val: number) => formatNumber(val),
    },
    {
      key: 'birim_fiyat',
      label: 'Ortalama Birim Fiyat',
      align: 'right' as const,
      formatter: (val: number) => formatUnitPrice(val),
    },
  ];

  // Table columns
  const tableColumns = [
    { key: 'ana_urun', label: 'Ürün', align: 'left' as const },
    { key: 'ulke', label: 'Ülke', align: 'left' as const },
    { key: 'yil', label: 'Yıl', align: 'center' as const },
    { 
      key: 'deger', 
      label: 'Değer', 
      align: 'right' as const,
      formatter: (val: number) => formatMoney(val)
    },
    { 
      key: 'miktar', 
      label: 'Miktar', 
      align: 'right' as const,
      formatter: (val: number, row: ExportDetail) => `${formatNumber(val)} ${row.birim || ''}`
    },
    { 
      key: 'birim_fiyat', 
      label: 'Birim Fiyat', 
      align: 'right' as const,
      formatter: (val: number) => formatUnitPrice(val)
    },
    { 
      key: 'islem_sayisi', 
      label: 'İşlem', 
      align: 'right' as const,
      formatter: (val: number) => formatNumber(val)
    },
  ];

  if (loading) return <Loading />;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">🌾 Bitkisel Ürünler İthalat Detay Analizi</h1>
        <p className="page-subtitle">
          Ürün bazlı detaylı ithalat verileri, kaynak ülkeler ve yıllık trendler
        </p>
      </div>

      {/* Filters */}
      <div className="date-filter">
        <DateFilter
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={TRADE_YEARS}
        />
        <ProductFilter
          products={availableProducts}
          selectedProducts={selectedProducts}
          onSelectionChange={setSelectedProducts}
          multiSelect
          label="Ürün Filtresi"
        />
        <CountryFilter
          countries={availableCountries}
          selectedCountries={selectedCountries}
          onSelectionChange={setSelectedCountries}
          multiSelect
          label="Ülke Filtresi"
        />
        {(selectedProducts.length > 0 || selectedCountries.length > 0) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--primary)',
            fontWeight: 600,
          }}>
            <AlertCircle size={14} />
            Filtre aktif
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam İthalat Değeri"
          value={formatMoney(filteredSummary.totalValue)}
          subtitle={`${formatNumber(filteredSummary.totalQuantity)} toplam miktar`}
          icon={DollarSign}
          color="orange"
          large
        />
        <KPICard
          title="Ürün Sayısı"
          value={String(filteredSummary.productCount)}
          subtitle="Farklı ürün"
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Ülke Sayısı"
          value={String(filteredSummary.countryCount)}
          subtitle="İhracat yapılan"
          icon={Globe}
          color="purple"
        />
        <KPICard
          title="Ortalama Birim Fiyat"
          value={formatUnitPrice(filteredSummary.avgUnitPrice)}
          subtitle="İhracat başına"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Year-over-year comparison */}
      {latestYear && previousYear && (
        <div style={{ marginTop: '24px' }}>
          <h3 className="section-title">📈 Yıllık Karşılaştırma</h3>
          <div className="kpi-grid">
            <TrendCard
              title="Toplam Değer"
              currentValue={latestYear.totalValue}
              previousValue={previousYear.totalValue}
              currentLabel={latestYear.year}
              previousLabel={previousYear.year}
              formatter={formatMoney}
              icon={DollarSign}
              color="orange"
            />
            <TrendCard
              title="Ortalama Birim Fiyat"
              currentValue={latestYear.avgUnitPrice}
              previousValue={previousYear.avgUnitPrice}
              currentLabel={latestYear.year}
              previousLabel={previousYear.year}
              formatter={(v) => formatUnitPrice(v)}
              icon={TrendingUp}
              color="blue"
            />
          </div>
        </div>
      )}

      {/* Top combinations */}
      <div style={{ marginTop: '24px' }}>
        <h3 className="section-title">🌍 Ürün → Ülke En Yüksek Kombinasyonlar</h3>
        <p className="section-subtitle">
          Seçili filtrelere göre ürün-ülke bazında toplam değer, miktar ve birim fiyat
        </p>
        <DetailedTable
          data={topCombinations}
          columns={combinationColumns}
          itemsPerPage={10}
          defaultSortKey="toplam_deger"
          defaultSortOrder="desc"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        {/* Top Products Pie Chart */}
        <div className="chart-card">
          <h3 className="chart-title">En Çok İthal Edilen Ürünler (Top 10)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Tooltip
                formatter={(value: unknown) => [formatMoney(Number(value)), 'Değer']}
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}
              />
              <Pie
                data={topProducts}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={(entry) => entry.name}
                labelLine={{ stroke: 'var(--text-secondary)' }}
              >
                {topProducts.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Countries Bar Chart */}
        <div className="chart-card">
          <h3 className="chart-title">En Çok İthalat Yapılan Ülkeler (Top 10)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topCountries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'var(--text-primary)', fontSize: 10, fontWeight: 500 }}
                angle={-30}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v) => formatMoney(v)}
              />
              <Tooltip
                formatter={(value: unknown) => [formatMoney(Number(value)), 'Değer']}
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
              <Bar dataKey="value" name="İhracat Değeri" radius={[4, 4, 0, 0]}>
                {topCountries.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Yearly Trend - Full Width */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">Yıllık İthalat Trendi</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={yearlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="year" 
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v) => `$${v.toFixed(1)}B`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v) => `${v.toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend 
                wrapperStyle={{ 
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}
              />
              <Bar 
                yAxisId="left"
                dataKey="deger" 
                name="İhracat Değeri (B$)" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="miktar"
                name="Miktar (M)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <DetailedTable
        data={filteredData}
        columns={tableColumns}
        defaultSortKey="deger"
        itemsPerPage={25}
      />
    </div>
  );
}
