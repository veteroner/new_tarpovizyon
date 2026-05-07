import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartInsightButton } from '../components/ChartInsightButton';

const ICECEK_URUNLER = [
  'Çay Yaprakları',
  'Biber, Kuru, İşlenmemiş',
  'Kekik, İşlenmemiş',
  'Kimyon, İşlenmemiş',
  'Anason, İşlenmemiş',
  'Kişniş, İşlenmemiş',
  'Rezene, İşlenmemiş',
  'Çörek Otu Tohumu',
  'Kapari, İşlenmemiş',
  'Süpürge Otu, İşlenmemiş'
];

// Rize çayı hasat yoğunluğu (endeks: 0–100)
const CAY_HASAT = [
  { ay: 'Mar', endeks: 5   },
  { ay: 'Nis', endeks: 30  },
  { ay: 'May', endeks: 100 }, // 1. füliz
  { ay: 'Haz', endeks: 80  },
  { ay: 'Tem', endeks: 95  }, // 2. füliz
  { ay: 'Ağu', endeks: 85  },
  { ay: 'Eyl', endeks: 75  }, // 3. füliz
  { ay: 'Eki', endeks: 40  },
  { ay: 'Kas', endeks: 10  },
];

const bevExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 className="chart-title" style={{ marginBottom: 0 }}>🍵 Rize Çayı Hasat Sezonu Takvimi</h3>
      <ChartInsightButton title="🍵 Rize Çayı Hasat" description="Rize çayı hasat sezonu takvimi" data={CAY_HASAT} context={{ section: 'Mevsimsellik' }} compact />
    </div>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Yılda 3 füliz dönemi: Mayıs (1. füliz), Temmuz (2. füliz), Eylül (3. füliz) · En kaliteli çay 1. fülizden elde edilir.
    </p>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={CAY_HASAT} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="cayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="ay" stroke="var(--text-secondary)" />
        <YAxis stroke="var(--text-secondary)" domain={[0, 110]}
          tickFormatter={(v: number) => v + '%'} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          formatter={(v: number) => [v + '%', 'Hasat Yoğunluğu']}
        />
        <Area type="monotone" dataKey="endeks" stroke="#10b981" strokeWidth={2.5}
          fill="url(#cayGrad)" name="Hasat Endeksi" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default function BeverageCropPage() {
  return (
    <TuikPlantCategoryPage
      title="İçecek & Baharat Bitkileri"
      subtitle="Türkiye il/ilçe/bölge bazlı içecek ve baharat bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🍵"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={ICECEK_URUNLER}
      defaultProducts={['Çay Yaprakları']}
      showTreeMetrics
      extraSection={bevExtra}
    />
  );
}
