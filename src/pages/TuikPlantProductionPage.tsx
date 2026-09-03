import { SON_YIL, ILK_YIL, YIL_DISI_UNSURLAR } from './plant/plantTypes';
import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell,
  LabelList,
} from 'recharts';
import { fetchAgg, num } from '../services/d1';

const R = 'tuik/bitkisel-uretim';
import ProductSelector from '../components/ProductSelector';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { BAR_COLOR } from '../utils/chartColors';
import { VALUE_HEADROOM, compactValue } from '../utils/chartTicks';
import { ChartCard } from '../components/ui/Card';
import { BarChart3, Trophy } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

interface YearlyDataItem {
  year: string;
  [key: string]: string | number;
}

interface CityDataItem {
  [key: string]: string | number;
  name: string;
  value: number;
  share: string;
  fill: string;
}

interface ProductItem {
  id: string;
  name: string;
  nameTR: string;
}

const UNSUR_OPTIONS = [
  { id: 'Üretim', name: 'Üretim (Ton)' },
  { id: 'Ekilen Alan', name: 'Ekilen Alan (Dekar)' },
  { id: 'Hasat Edilen Alan', name: 'Hasat Edilen Alan (Dekar)' },
];

/*
 * Yıllar `plantTypes`'tan geliyor. Burada 2024 DÖRT YERE elle yazılmıştı
 * (başlangıç durumu, yıl döngüsü, seçenek listesi, grafik başlığı) — biri
 * güncellenip öbürü unutulduğunda sayfa sessizce tutarsız oluyordu.
 */
const YILLAR = Array.from({ length: SON_YIL - ILK_YIL + 1 }, (_, i) => SON_YIL - i);

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + ' Mly';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + ' Mln';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + ' Bin';
  return value.toFixed(0);
}

export default function TuikPlantProductionPage() {
  const [selectedYear, setSelectedYear] = useState(`y${SON_YIL}`);
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');

  /*
   * O yıl yayımlanmamış gösterge listeden düşüyor. TÜİK bitkiselde ekim
   * alanını ilkbaharda, ÜRETİMİ hasat sonrası yayımlıyor; 2025'te üretim
   * satırlarının tamamı sıfır. Seçilebilir bırakmak "0 ton, %-100"
   * gösterip veri yokluğunu gerçek düşüş gibi sunuyordu.
   */
  const yilSayi = Number(selectedYear.replace('y', ''));
  const gostergeler = (YIL_DISI_UNSURLAR[yilSayi] ?? []).length
    ? UNSUR_OPTIONS.filter((o) => !YIL_DISI_UNSURLAR[yilSayi].includes(o.id))
    : UNSUR_OPTIONS;
  /* Geçerlilik doğrudan sorgulanıyor: "yıl değiştiyse" koşulu açılışta
     çalışmıyor, çünkü varsayılan yıl zaten 2025. */
  if (gostergeler.length && !gostergeler.some((o) => o.id === selectedUnsur)) {
    setSelectedUnsur(gostergeler[0].id);
  }
  /*
   * Başlangıçta seçim YOK; doğru varsayılan ürün listesi geldikten sonra
   * seçiliyor (aşağıya bakınız).
   *
   * Eskiden sabit `['Buğday']` yazıyordu — ama TÜİK'in ürün adları arasında
   * düz "Buğday" YOK: "Buğday, Durum Buğdayı Hariç", "Durum Buğdayı",
   * "Kara Buğday", "Buğday (Hasıl/Yeşilot)" var. Seçim hiçbir zaman
   * eşleşmediği için sayfa "Ürün seçin…" yazısı ve tamamen sıfır değerlerle
   * açılıyordu; kullanıcı elle bir ürün seçene kadar boş duruyordu.
   */
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  // Ürün listesini yükle
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = { data: await fetchAgg(R, {
          // 230 ürün var; 100'lük sınır listenin yarısını kesiyordu.
          groupBy: ['urun'], where: { unsur: 'Üretim' }, orderBy: 'urun', dir: 'asc', limit: 500,
        }) };
        if (res.data) {
          const products = res.data.map((item) => ({
            id: String(item['urun']),
            name: String(item['urun']),
            nameTR: String(item['urun'])
          }));
          setProductList(products);

          /*
           * Varsayılan ürün listeden SEÇİLİYOR, elle yazılmıyor.
           *
           * Buğday Türkiye'nin en çok ekilen ürünü, açılışta onu göstermek
           * doğru; ama adı veri kaynağında değişebiliyor. Bu yüzden ada göre
           * aranıyor, bulunamazsa listenin ilki kullanılıyor — hangi durumda
           * olursa olsun sayfa DOLU açılıyor.
           */
          setSelectedProducts((onceki) => {
            const gecerli = onceki.filter((id) => products.some((p) => p.id === id));
            if (gecerli.length) return gecerli;
            const bugday = products.find((p) => /^buğday,/i.test(p.id))
              ?? products.find((p) => /buğday/i.test(p.id));
            return [(bugday ?? products[0])?.id].filter(Boolean) as string[];
          });
        }
      } catch (error) {
        console.error('Ürün listesi yüklenirken hata:', error);
      }
    };
    loadProducts();
  }, []);

  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setCityData([]);
      setYearlyData([]);
      return;
    }

    setLoading(true);
    try {
      const yearCol = selectedYear;
      const ORTAK = { where: { unsur: selectedUnsur, duzeykod: 3 }, whereIn: { urun: selectedProducts } };
      /* Trend sorgusunun sütunları da sabitten. Elle "21" yazılıydı: yıl
         eklenince trend son yılı 0 okuyor, KPI da bunu %-100'lük gerçek bir
         çöküş gibi gösteriyordu. */
      const YIL_SUTUNLARI = YILLAR.map((y) => `y${y}`);

      const [cityRes, yearlyRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['yer'], sum: [yearCol], ...ORTAK,
          orderBy: `sum_${yearCol}`, dir: 'desc', limit: 20 })
          .then((rows) => ({ data: rows.map((r) => ({ yer: r.yer, toplam: num(r[`sum_${yearCol}`]) })) })),
        // Eskiden 21 ayrı SUM(yNNNN) sütunuydu.
        fetchAgg(R, { sum: YIL_SUTUNLARI, ...ORTAK })
          .then((rows) => ({ data: [Object.fromEntries(YIL_SUTUNLARI.map((yc) =>
            [`v${yc.slice(1)}`, num(rows[0]?.[`sum_${yc}`])]))] })),
      ]);

      if (cityRes.data) {
        const total = cityRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        setTotalValue(total);
        const mapped = cityRes.data.map((item, index: number) => ({
          name: String(item['yer'] || ''),
          value: Number(item['toplam']) || 0,
          share: ((Number(item['toplam']) || 0) / total * 100).toFixed(1),
          fill: COLORS[index % COLORS.length]
        }));
        setCityData(mapped);
      }

      if (yearlyRes.data && yearlyRes.data[0]) {
        const row = yearlyRes.data[0];
        const mapped = [];
        for (let y = ILK_YIL; y <= SON_YIL; y++) {
          mapped.push({
            year: String(y),
            value: Number(row[`v${y}`]) || 0
          });
        }
        setYearlyData(mapped);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear, selectedUnsur]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const yearLabel = selectedYear.replace('y', '');
  const unit = selectedUnsur === 'Üretim' ? 'ton' : 'dekar';
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const avgValue = cityData.length > 0 ? totalValue / cityData.length : 0;

  // Yıllık değişim
  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const currentVal = currentYearIdx >= 0 ? Number(yearlyData[currentYearIdx]?.value) : 0;
  const prevVal = prevYearIdx >= 0 ? Number(yearlyData[prevYearIdx]?.value) : 0;
  const yearChange = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🇹🇷 TÜİK Bitkisel Üretim</h1>
        <p className="page-subtitle">Türkiye İl Bazında Bitkisel Üretim Verileri - {yearLabel}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Ürün Seçimi</label>
          <ProductSelector
            products={productList}
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
            placeholder="Ürün seçin..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Gösterge</label>
          <select className="filter-select" value={selectedUnsur} onChange={(e) => setSelectedUnsur(e.target.value)}>
            {gostergeler.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {YILLAR.map(year => (
              <option key={year} value={`y${year}`}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">TÜRKİYE TOPLAMI</span></div>
              <div className="kpi-value">{formatTon(totalValue)}</div>
              <div className="kpi-subtitle">{unit} ({yearLabel})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green"><Trophy size={18} aria-hidden="true" /></div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
              <div className="kpi-subtitle">{formatTon(topCityValue)} {unit}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon blue"><BarChart3 size={18} aria-hidden="true" /></div></div>
              <div className="kpi-value">{formatTon(avgValue)}</div>
              <div className="kpi-subtitle">{unit}/il</div>
            </div>
          </div>

          <div className="chart-grid">
            <ChartCard title={`📅 Yıllık Üretim Trendi (${ILK_YIL}-${SON_YIL})`} span={2} action={<ChartInsightButton title="Yıllık Üretim Trendi" description={`Yıllık üretim trendi (${ILK_YIL}-${SON_YIL})`} data={yearlyData} context={{ section: 'Bitkisel Üretim' }} compact />}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="chart-grid">
            <ChartCard title={<>İl Bazında {selectedUnsur} ({yearLabel})</>} action={<ChartInsightButton title={`İl Bazında ${selectedUnsur}`} description="İl bazında üretim" data={cityData} context={{ section: 'Bitkisel Üretim' }} compact />}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} interval={0} />
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                  <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                    {cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                    ))}
                  
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="🥧 İl Payları Dağılımı" action={<ChartInsightButton title="İl Payları Dağılımı" description="İl payları dağılımı" data={cityData.slice(0,10)} context={{ section: 'Bitkisel Üretim' }} compact />}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie 
                    data={cityData.slice(0, 10)} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={130} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name?.substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {cityData.slice(0, 10).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="data-table">
            <h3 className="data-table-title">İl Sıralaması - {selectedUnsur}</h3>
            {cityData.map((city, index) => (
              <div className="table-row" key={city.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{city.name}</div>
                  <div className="table-subtext">Pay: %{city.share}</div>
                </div>
                <div className="table-value green">{formatTon(city.value)} {unit}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
