import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const BAKLAGIL_URUNLER = [
  'Nohut, Kuru', 'Mercimek, Kuru (Kırmızı)', 'Mercimek, Kuru (Yeşil)',
  'Fasulye, Kuru', 'Bezelye, Kuru', 'Börülce, Kuru',
  'Bakla, Kuru (İnsan Tüketimi İçin)', 'Bakla, Kuru (Yemlik)',
  'Acı Bakla (İnsan Tüketimi İçin)', 'Bezelye (Yemlik)',
  'Mürdümük', 'Burçak (Dane)'
];

const PROTEIN_KARSI = [
  { isim: 'Kırmızı Mercimek', gram: 26, tip: 'B' },
  { isim: 'Kuru Fasulye',     gram: 22, tip: 'B' },
  { isim: 'Yeşil Mercimek',   gram: 25, tip: 'B' },
  { isim: 'Nohut',            gram: 20, tip: 'B' },
  { isim: 'Bakla',            gram: 26, tip: 'B' },
  { isim: 'Bezelye (Kuru)',   gram: 25, tip: 'B' },
  { isim: '─ Dana Eti',       gram: 26, tip: 'H' },
  { isim: '─ Tavuk',          gram: 27, tip: 'H' },
  { isim: '─ Yumurta',        gram: 13, tip: 'H' },
];

const legumeExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <h3 className="chart-title">💪 Baklagiller vs Hayvansal Protein (g protein / 100 g)</h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Baklagiller, hayvansal kaynaklara yakın protein içeriğiyle sürdürülebilir beslenmenin temel taşlarıdır.
      Yeşil = baklagil · Turuncu = hayvansal referans
    </p>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={PROTEIN_KARSI} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="isim" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
        <YAxis stroke="var(--text-secondary)" domain={[0, 35]}
          label={{ value: 'g/100g', angle: -90, position: 'insideLeft', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          formatter={(v: number) => [v + ' g', 'Protein']}
        />
        <ReferenceLine y={20} stroke="#6366f1" strokeDasharray="4 2"
          label={{ value: 'Et eşdeğeri (20g)', fontSize: 10, fill: '#6366f1', position: 'right' }} />
        <Bar dataKey="gram" radius={[4, 4, 0, 0]}>
          {PROTEIN_KARSI.map((row, i) => (
            <Cell key={i} fill={row.tip === 'B' ? '#10b981' : '#f97316'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default function LegumeProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Baklagil Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı baklagil üretim analizi — TÜİK 2004–2024"
      icon="🫘"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={BAKLAGIL_URUNLER}
      defaultProducts={['Nohut, Kuru', 'Mercimek, Kuru (Kırmızı)', 'Fasulye, Kuru']}
      extraSection={legumeExtra}
    />
  );
}
