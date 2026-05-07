import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartInsightButton } from '../components/ChartInsightButton';

const LIF_URUNLER = [
  'Pamuk, Çırçırlanmamış (Kütlü)',
  'Pamuk, Çırçırlanmış (Lifli)',
  'Pamuk Çekirdeği (Çiğit)',
  'Keten, Lif',
  'Kenevir, Lif',
  'Tütün, İşlenmemiş'
];

// Pamuk lif kalitesi göstergeleri (0–100 endeks)
const PAMUK_KALITE = [
  { parametre: 'Lif Uzunluğu',  TR: 82, Referans: 75 },
  { parametre: 'Dayaniklilik',  TR: 78, Referans: 70 },
  { parametre: 'Micronaire',    TR: 70, Referans: 68 },
  { parametre: 'Uniformite',    TR: 83, Referans: 78 },
  { parametre: 'Parlaklik',     TR: 72, Referans: 74 },
  { parametre: 'Uzama',         TR: 65, Referans: 62 },
];

const fiberExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 className="chart-title" style={{ marginBottom: 0 }}>🧵 Pamuk Lif Kalite Göstergeleri — Türkiye vs Dünya Referansı</h3>
      <ChartInsightButton title="🧵 Pamuk Lif Kalitesi" description="Pamuk lif kalite göstergeleri" data={PAMUK_KALITE} context={{ section: 'Lif Ürünler' }} compact />
    </div>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      ICAC (Uluslararası Pamuk Danışma Komitesi) kriterlerine göre kalite endeksleri (0–100). Türkiye pamuğu lif uzunluğu ve uniformitede referansın üzerindedir.
    </p>
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={PAMUK_KALITE} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="parametre" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <PolarRadiusAxis angle={90} domain={[50, 100]} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        />
        <Radar name="Türkiye" dataKey="TR" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} />
        <Radar name="Dünya Referansı" dataKey="Referans" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeDasharray="4 2" />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

export default function FiberCropPage() {
  return (
    <TuikPlantCategoryPage
      title="Lif Bitkileri Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı lif bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🧵"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={LIF_URUNLER}
      defaultProducts={['Pamuk, Çırçırlanmamış (Kütlü)', 'Tütün, İşlenmemiş']}
      extraSection={fiberExtra}
    />
  );
}
