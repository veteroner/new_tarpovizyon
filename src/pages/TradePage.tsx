import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeftRight, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery, formatMoney, formatNumber } from '../services/api';
import { translateCountry } from '../utils/countryTranslations';

type TradeYear = string;

interface TradeKpis {
  exportValue: number;
  importValue: number;
  balance: number;
  ratio: number;
  rowCount: number;
}

interface TrendRow {
  key: string;
  exportValue: number;
  importValue: number;
}

interface CountryRow {
  country: string;
  exportValue: number;
  importValue: number;
}

interface ProductRow {
  product: string;
  exportValue: number;
  importValue: number;
}

const MONTHS_TR: Record<string, string> = {
  '1': 'Ocak',
  '2': 'Şubat',
  '3': 'Mart',
  '4': 'Nisan',
  '5': 'Mayıs',
  '6': 'Haziran',
  '7': 'Temmuz',
  '8': 'Ağustos',
  '9': 'Eylül',
  '10': 'Ekim',
  '11': 'Kasım',
  '12': 'Aralık',
};

function unionTradeSql(select: string, where: string): string {
  return `(
    ${select} FROM tuik_ticaret ${where}
    UNION ALL
    ${select} FROM tuik_ticarethayvansal ${where}
  )`;
}

export function TradePage() {
  const [loading, setLoading] = useState(true);
  const [yearOptions, setYearOptions] = useState<TradeYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<TradeYear>('2024');

  const [kpis, setKpis] = useState<TradeKpis>({
    exportValue: 0,
    importValue: 0,
    balance: 0,
    ratio: 0,
    rowCount: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<TrendRow[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<TrendRow[]>([]);
  const [topCountries, setTopCountries] = useState<CountryRow[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRow[]>([]);

  const loadMeta = useCallback(async () => {
    const yearsSql = `SELECT yil FROM (
      SELECT DISTINCT yil FROM tuik_ticaret
      UNION
      SELECT DISTINCT yil FROM tuik_ticarethayvansal
    ) y ORDER BY yil DESC`;

    const yearsRes = await fetchQuery(yearsSql);
    const years = (yearsRes.data || [])
      .map((row) => String(row.yil))
      .filter(Boolean);

    setYearOptions(years);
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [selectedYear]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const where = selectedYear ? `WHERE yil='${selectedYear}'` : '';

      const kpiSql = `SELECT
        SUM(ihracat_deger) as exportValue,
        SUM(ithalat_deger) as importValue,
        COUNT(*) as rowCount
      FROM ${unionTradeSql('SELECT ihracat_deger, ithalat_deger', where)} t`;

      const monthlySql = `SELECT ay as k,
        SUM(ihracat_deger) as exportValue,
        SUM(ithalat_deger) as importValue
      FROM ${unionTradeSql('SELECT ay, ihracat_deger, ithalat_deger', where)} t
      GROUP BY ay
      ORDER BY CAST(ay AS UNSIGNED)`;

      const yearlySql = `SELECT yil as k,
        SUM(ihracat_deger) as exportValue,
        SUM(ithalat_deger) as importValue
      FROM ${unionTradeSql('SELECT yil, ihracat_deger, ithalat_deger', '')} t
      GROUP BY yil
      ORDER BY CAST(yil AS UNSIGNED)`;

      const countriesSql = `SELECT ulke,
        SUM(ihracat_deger) as exportValue,
        SUM(ithalat_deger) as importValue
      FROM ${unionTradeSql('SELECT ulke, ihracat_deger, ithalat_deger', where)} t
      GROUP BY ulke
      ORDER BY (SUM(ihracat_deger) + SUM(ithalat_deger)) DESC
      LIMIT 15`;

      const productsSql = `SELECT ana_urun as product,
        SUM(ihracat_deger) as exportValue,
        SUM(ithalat_deger) as importValue
      FROM ${unionTradeSql('SELECT ana_urun, ihracat_deger, ithalat_deger', where)} t
      GROUP BY ana_urun
      ORDER BY (SUM(ihracat_deger) + SUM(ithalat_deger)) DESC
      LIMIT 20`;

      const [kpiRes, monthlyRes, yearlyRes, countriesRes, productsRes] = await Promise.all([
        fetchQuery(kpiSql),
        fetchQuery(monthlySql),
        fetchQuery(yearlySql),
        fetchQuery(countriesSql),
        fetchQuery(productsSql),
      ]);

      const exportValue = Number(kpiRes.data?.[0]?.exportValue) || 0;
      const importValue = Number(kpiRes.data?.[0]?.importValue) || 0;
      const balance = exportValue - importValue;
      const ratio = importValue > 0 ? exportValue / importValue : 0;
      const rowCount = Number(kpiRes.data?.[0]?.rowCount) || 0;

      setKpis({ exportValue, importValue, balance, ratio, rowCount });

      setMonthlyTrend(
        (monthlyRes.data || []).map((row) => ({
          key: MONTHS_TR[String(row.k)] || String(row.k),
          exportValue: Number(row.exportValue) || 0,
          importValue: Number(row.importValue) || 0,
        }))
      );

      setYearlyTrend(
        (yearlyRes.data || []).map((row) => ({
          key: String(row.k),
          exportValue: Number(row.exportValue) || 0,
          importValue: Number(row.importValue) || 0,
        }))
      );

      setTopCountries(
        (countriesRes.data || []).map((row) => ({
          country: translateCountry(String(row.ulke || '')),
          exportValue: Number(row.exportValue) || 0,
          importValue: Number(row.importValue) || 0,
        }))
      );

      setTopProducts(
        (productsRes.data || []).map((row) => ({
          product: String(row.product || ''),
          exportValue: Number(row.exportValue) || 0,
          importValue: Number(row.importValue) || 0,
        }))
      );

    } catch (e) {
      console.error('TradePage load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const balanceColor = kpis.balance >= 0 ? 'green' : 'orange';

  const topCountriesChart = useMemo(() => {
    return topCountries
      .slice(0, 10)
      .map((c) => ({
        name: c.country.substring(0, 16),
        exportValue: c.exportValue / 1e6,
        importValue: c.importValue / 1e6,
      }));
  }, [topCountries]);

  const topProductsChart = useMemo(() => {
    return topProducts
      .slice(0, 12)
      .map((p) => ({
        name: p.product.substring(0, 20),
        value: (p.exportValue + p.importValue) / 1e6,
      }));
  }, [topProducts]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dış Ticaret (TÜİK)</h1>
        <p className="page-subtitle">Bitkisel + Hayvansal toplam dış ticaret görünümü</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard
          title="Toplam İhracat"
          value={formatMoney(kpis.exportValue)}
          subtitle={`${formatNumber(kpis.rowCount)} satır (ay/ürün/ülke)`}
          icon={TrendingUp}
          color="green"
          large
        />
        <KPICard
          title="Toplam İthalat"
          value={formatMoney(kpis.importValue)}
          subtitle={`${selectedYear} toplamı`}
          icon={TrendingDown}
          color="orange"
          large
        />
        <KPICard
          title="Dış Ticaret Dengesi"
          value={formatMoney(kpis.balance)}
          subtitle={kpis.balance >= 0 ? 'Fazla' : 'Açık'}
          icon={Scale}
          color={balanceColor as 'green' | 'orange'}
        />
        <KPICard
          title="İhracat/İthalat"
          value={kpis.ratio ? kpis.ratio.toFixed(2) : '—'}
          subtitle="Oran"
          icon={ArrowLeftRight}
          color="blue"
        />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Aylık Akış ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="key" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip
                formatter={(value: unknown, name?: unknown) => [formatMoney(Number(value) || 0), String(name) === 'exportValue' ? 'İhracat' : 'İthalat']}
              />
              <Legend />
              <Area type="monotone" dataKey="exportValue" name="İhracat" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              <Area type="monotone" dataKey="importValue" name="İthalat" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Yıllık Trend</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={yearlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="key" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip
                formatter={(value: unknown, name?: unknown) => [formatMoney(Number(value) || 0), String(name) === 'exportValue' ? 'İhracat' : 'İthalat']}
              />
              <Legend />
              <Area type="monotone" dataKey="exportValue" name="İhracat" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              <Area type="monotone" dataKey="importValue" name="İthalat" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Ülkelere Göre Hacim (Top 10) (M$)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topCountriesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-35} textAnchor="end" height={80} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip formatter={(value: unknown, name?: unknown) => [`$${(Number(value) || 0).toFixed(2)}M`, String(name) === 'exportValue' ? 'İhracat' : 'İthalat']} />
              <Legend />
              <Bar dataKey="exportValue" name="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="importValue" name="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ürünlere Göre Toplam Hacim (Top 12) (M$)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topProductsChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip formatter={(value: unknown) => [`$${(Number(value) || 0).toFixed(2)}M`, 'Hacim']} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
