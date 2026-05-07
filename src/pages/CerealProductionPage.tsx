import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { ChartInsightButton } from '../components/ChartInsightButton';

const TAHIL_URUNLER = [
  'Buğday, Durum Buğdayı Hariç', 'Durum Buğdayı', 'Arpa (Diğer)', 'Arpa (Biralık)',
  'Mısır', 'Çeltik', 'Yulaf', 'Çavdar', 'Sorgum', 'Darı', 'Triticale',
  'Kara Buğday', 'Mahlut', 'Kaplıca'
];

const KURESEL_BUGDAY = [
  { ulke: 'Çin',       uretim: 137720 },
  { ulke: 'Hindistan', uretim: 107590 },
  { ulke: 'Rusya',     uretim: 104193 },
  { ulke: 'Avustralya',uretim: 36199  },
  { ulke: 'Fransa',    uretim: 35480  },
  { ulke: 'Pakistan',  uretim: 26208  },
  { ulke: 'Almanya',   uretim: 22464  },
  { ulke: 'Türkiye',   uretim: 19500  },
].sort((a, b) => b.uretim - a.uretim);

// FAO/TÜİK karması — Türkiye buğday ortalama verim (kg/ha) ve dünya ort. (kg/ha)
const VERIM_TREND = [
  { yil: 2014, tr: 2570, dunya: 3360 },
  { yil: 2015, tr: 2830, dunya: 3380 },
  { yil: 2016, tr: 2860, dunya: 3500 },
  { yil: 2017, tr: 2710, dunya: 3530 },
  { yil: 2018, tr: 2600, dunya: 3450 },
  { yil: 2019, tr: 2860, dunya: 3550 },
  { yil: 2020, tr: 2820, dunya: 3470 },
  { yil: 2021, tr: 2390, dunya: 3540 },
  { yil: 2022, tr: 2960, dunya: 3650 },
  { yil: 2023, tr: 3050, dunya: 3700 },
];

const cerealExtra = (
  <>
    <div className="chart-card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Türkiye Buğday Verim Trendi vs Dünya Ortalaması (kg/ha)</h3>
      <ChartInsightButton title="Buğday Verim Trendi" description="Türkiye buğday verimi vs dünya ortalaması" data={VERIM_TREND} context={{ section: 'Tahillar' }} compact />
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
        Kaynak: FAO + TÜİK (2014-2023) · Türkiye verim açığı son 10 yılda yaklaşık <strong>650-800 kg/ha</strong> · 2023'te en yüksek değer <strong>3.050 kg/ha</strong> · Hedef: dünya ortalaması <strong>3.700 kg/ha</strong>
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={VERIM_TREND} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="yil" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" tickFormatter={(v: number) => `${v}`} domain={[2000, 4000]} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            formatter={(v: number, name: string) => [`${v.toLocaleString('tr-TR')} kg/ha`, name]}
          />
          <Legend />
          <Line type="monotone" dataKey="tr" name="🇹🇷 Türkiye" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="dunya" name="🌍 Dünya Ort." stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="chart-card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 className="chart-title" style={{ marginBottom: 0 }}>🌍 Küresel Buğday Üretiminde Türkiye (2022, bin ton)</h3>
      <ChartInsightButton title="Küresel Buğday Üretimi" description="Küresel buğday üretiminde Türkiye payı" data={KURESEL_BUGDAY} context={{ section: 'Tahillar' }} compact />
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
        Kaynak: FAO 2022 tahminleri · Türkiye küresel buğday üretiminin yaklaşık %2'sini karşılıyor · Kırmızı çubuk = Türkiye
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={KURESEL_BUGDAY} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="ulke" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-secondary)"
            tickFormatter={(v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'M' : v + 'K'} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            formatter={(v: number) => [(v * 1000).toLocaleString('tr-TR') + ' ton', 'Üretim']}
          />
          <Bar dataKey="uretim" radius={[4, 4, 0, 0]}>
            {KURESEL_BUGDAY.map((row, i) => (
              <Cell key={i} fill={row.ulke === 'Türkiye' ? '#ef4444' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </>
);

export default function CerealProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Tahıl Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı tahıl üretim analizi — TÜİK 2004–2024"
      icon="🌾"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={TAHIL_URUNLER}
      defaultProducts={['Buğday, Durum Buğdayı Hariç', 'Arpa (Diğer)', 'Mısır']}
      extraSection={cerealExtra}
    />
  );
}
