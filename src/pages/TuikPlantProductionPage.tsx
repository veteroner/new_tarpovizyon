import { kisa, eksen, yuzde, sayi } from '../utils/sayi';
import { SON_YIL, ILK_YIL } from './plant/plantTypes';
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
import { BAR_COLOR, seriesColor, topNvediger } from '../utils/chartColors';
import { VALUE_HEADROOM, compactValue } from '../utils/chartTicks';
import { ChartCard } from '../components/ui/Card';
import { BarChart3, Trophy, TrendingUp, TrendingDown } from 'lucide-react';


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
  return kisa(value);
}

function formatShort(value: number): string {
  return eksen(value);
}

export default function TuikPlantProductionPage() {
  const [selectedYear, setSelectedYear] = useState(`y${SON_YIL}`);
  /* Sayfanın asıl ölçütü üretim; ülke satırında 2025 dolu olduğu için
     açılışta artık ona düşmeye gerek yok. */
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');

  /*
   * Gösterge ve yıl listelerinin İKİSİ DE tam; hiçbir seçenek kapalı değil.
   *
   * Bir ara 2025'te "Üretim"i kapatmıştım — çünkü sayfa Türkiye'yi illeri
   * toplayarak buluyordu ve il kırılımında 2025 üretimi yok. Asıl sorun
   * oymuş: Türkiye rakamı artık ülke satırından (duzeykod=1) okunuyor ve
   * orada 2025 her gösterge için dolu. Kapatılacak bir şey kalmadı; eksik
   * olan yalnızca İL DAĞILIMI, onu da sayfa aşağıda yazıyla söylüyor.
   */

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
      /*
       * İKİ AYRI SEVİYE.
       *
       * Türkiye toplamı ve trend TÜRKİYE SATIRINDAN (duzeykod=1) okunuyor;
       * daha önce iller toplanıyordu. Ölçüldü: 2024'te iki yol birebir aynı
       * sonucu veriyor (+0.00%), ama 2025 ÜRETİMİ yalnızca Türkiye satırında
       * var — TÜİK il kırılımını hasat sonrası yayımlıyor. İlleri toplayan
       * sayfa bu yüzden 2025'te "0 ton" görüyordu; doldurulacak bir veri
       * yoktu, yanlış seviyeye bakılıyordu.
       *
       * İl grafikleri elbette il satırlarından (duzeykod=3) geliyor ve o
       * kırılım 2025 üretiminde boş — sayfa bunu gizlemek yerine söylüyor.
       */
      const URUN = { where: { unsur: selectedUnsur }, whereIn: { urun: selectedProducts } };
      const ORTAK = { ...URUN, where: { unsur: selectedUnsur, duzeykod: 3 } };
      const TR = { ...URUN, where: { unsur: selectedUnsur, duzeykod: 1 } };
      /* Trend sorgusunun sütunları da sabitten. Elle "21" yazılıydı: yıl
         eklenince trend son yılı 0 okuyor, KPI da bunu %-100'lük gerçek bir
         çöküş gibi gösteriyordu. */
      const YIL_SUTUNLARI = YILLAR.map((y) => `y${y}`);

      const [cityRes, yearlyRes, trRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['yer'], sum: [yearCol], ...ORTAK,
          orderBy: `sum_${yearCol}`, dir: 'desc', limit: 20 })
          .then((rows) => ({ data: rows.map((r) => ({ yer: r.yer, toplam: num(r[`sum_${yearCol}`]) })) })),
        // Eskiden 21 ayrı SUM(yNNNN) sütunuydu.
        fetchAgg(R, { sum: YIL_SUTUNLARI, ...TR })
          .then((rows) => ({ data: [Object.fromEntries(YIL_SUTUNLARI.map((yc) =>
            [`v${yc.slice(1)}`, num(rows[0]?.[`sum_${yc}`])]))] })),
        fetchAgg(R, { sum: [yearCol], ...TR }).then((rows) => num(rows[0]?.[`sum_${yearCol}`])),
      ]);

      setTotalValue(trRes);

      if (cityRes.data) {
        const total = cityRes.data.reduce((sum: number, item) => sum + (Number(item['toplam']) || 0), 0);
        const mapped = cityRes.data.map((item, index: number) => ({
          name: String(item['yer'] || ''),
          value: Number(item['toplam']) || 0,
          share: sayi(((Number(item['toplam']) || 0) / total * 100), 1),
          fill: seriesColor(index)
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
  /* İl ortalaması İL verisinden — ülke toplamını il sayısına bölmek, il
     kırılımı boşken (2025 üretimi) anlamsız bir sayı üretirdi. */
  const ilToplam = cityData.reduce((t, c) => t + c.value, 0);
  const avgValue = cityData.length > 0 ? ilToplam / cityData.length : 0;
  /*
   * SATIR SAYISINA DEĞİL DEĞERE bakılıyor. İl sorgusu 2025 üretiminde de
   * satır döndürüyor — yalnızca hepsi sıfır. `length > 0` demek "Lider il:
   * Şırnak, 0 ton" gibi rastgele bir il göstermek demekti.
   */
  const ilKirilimiVar = cityData.some((c) => c.value > 0);

  /*
   * Pasta ilk 7 il + "Diğer". Eskiden 10 dilimdi: palet 8 renkli olduğu için
   * son iki dilim nötr griye düşüyordu — ölçüldü, 10 dilimde 9 renk, 1'i gri.
   * Dokuzuncu bir renk ÜRETMEK çözüm değil; hue ekledikçe renk körlüğünde
   * ayrım daralıyor. Doğru cevap seriyi azaltmak.
   */
  const pastaVerisi = topNvediger(cityData, (c) => c.value, 7);

  // Yıllık değişim
  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const currentVal = currentYearIdx >= 0 ? Number(yearlyData[currentYearIdx]?.value) : 0;
  const prevVal = prevYearIdx >= 0 ? Number(yearlyData[prevYearIdx]?.value) : 0;
  const yearChange = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">TÜİK Bitkisel Üretim</h1>
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
            {UNSUR_OPTIONS.map(opt => (
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
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? <TrendingUp size={18} aria-hidden="true" /> : <TrendingDown size={18} aria-hidden="true" />}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>{yuzde(yearChange, 1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green"><Trophy size={18} aria-hidden="true" /></div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{ilKirilimiVar ? topCity : '—'}</div>
              <div className="kpi-subtitle">
                {ilKirilimiVar ? `${formatTon(topCityValue)} ${unit}` : 'İl kırılımı yayımlanmadı'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon blue"><BarChart3 size={18} aria-hidden="true" /></div></div>
              <div className="kpi-value">{ilKirilimiVar ? formatTon(avgValue) : '—'}</div>
              <div className="kpi-subtitle">
                {ilKirilimiVar ? `${unit}/il` : 'İl kırılımı yayımlanmadı'}
              </div>
            </div>
          </div>

          {/*
            * İl kırılımı yokken BOŞ GRAFİK çizmek yerine sebebi yazılıyor.
            * Boş eksenler "veri bozuk" gibi okunuyor; oysa Türkiye rakamı
            * yukarıda duruyor, eksik olan yalnızca il dağılımı.
            */}
          {!loading && !ilKirilimiVar && (
            <p className="tv-uyari-satir">
              <b>{yearLabel} {selectedUnsur.toLocaleLowerCase('tr')}</b> için il kırılımı
              henüz yayımlanmadı — TÜİK il rakamlarını hasat sonrası açıklıyor.
              Yukarıdaki Türkiye toplamı güncel; il grafikleri için daha eski
              bir yıl seçebilirsiniz.
            </p>
          )}

          <div className="chart-grid">
            <ChartCard title={`Yıllık Üretim Trendi (${ILK_YIL}-${SON_YIL})`} span={2} action={<ChartInsightButton title="Yıllık Üretim Trendi" description={`Yıllık üretim trendi (${ILK_YIL}-${SON_YIL})`} data={yearlyData} context={{ section: 'Bitkisel Üretim' }} compact />}>
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

          {ilKirilimiVar && (
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

            <ChartCard title="İl Payları Dağılımı" action={<ChartInsightButton title="İl Payları Dağılımı" description="İl payları dağılımı" data={pastaVerisi} context={{ section: 'Bitkisel Üretim' }} compact />}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie 
                    data={pastaVerisi} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={130} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name?.substring(0, 8)} ${yuzde(((percent ?? 0) * 100), 0)}`}
                    labelLine={false}
                  >
                    {pastaVerisi.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={seriesColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${formatTon(value)} ${unit}`, selectedUnsur]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          )}

          {ilKirilimiVar && (
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
          )}
        </>
      )}
    </div>
  );
}
