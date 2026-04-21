import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

const cerealExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <h3 className="chart-title">🌍 Küresel Buğday Üretiminde Türkiye (2022, bin ton)</h3>
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
