import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartInsightButton } from '../components/ChartInsightButton';

const MEYVE_URUNLER = [
  'Elma (Golden)', 'Elma (Starking)', 'Elma (Granny Smith)', 'Elma (Amasya)', 'Diğer Elmalar',
  'Armut', 'Kayısı', 'Kiraz', 'Vişne', 'Erik', 'Şeftali', 'Nektarin',
  'İncir (Yaş)', 'Nar', 'Ayva', 'Muşmula', 'Dut', 'Hünnap', 'İğde',
  'Trabzon Hurması (Cennet Elması)', 'Yenidünya (Malta Eriği)', 'Zerdali',
  'Kızılcık', 'Çilek', 'Ahududu', 'Böğürtlen', 'Maviyemiş',
  'Portakal (Washington)', 'Portakal (Yafa)', 'Diğer Portakallar',
  'Mandalina (Satsuma)', 'Mandalina (Klemantin)', 'Mandalina (King)', 'Mandalina (Diğer)',
  'Limon Ve Misket Limonu', 'Greyfurt (Altıntop)', 'Turunç',
  'Muz, Plantain Ve Benzerleri', 'Avokado', 'Kivi',
  'Sofralık Üzüm, Çekirdekli', 'Sofralık Üzüm, Çekirdeksiz',
  'Kurutmalık Üzüm, Çekirdekli', 'Kurutmalık Üzüm, Çekirdeksiz',
  'Şaraplık Üzümler',
  'Sofralık Zeytinler', 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)'
];

const TR_MEYVE_PAYLARI = [
  { meyve: 'Kızılcık',  pay: 28 },
  { meyve: 'Vişne',     pay: 22 },
  { meyve: 'Kiraz',     pay: 21 },
  { meyve: 'Kayısı',    pay: 17 },
  { meyve: 'İncir',     pay: 16 },
  { meyve: 'Nar',       pay: 5  },
  { meyve: 'Üzüm',     pay: 3  },
].sort((a, b) => b.pay - a.pay);

const MEYVE_RENKLER = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#6366f1'];

const fruitExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 className="chart-title" style={{ marginBottom: 0 }}>🏆 Türkiye'nin Dünya Meyve Üretimindeki Payı (%)</h3>
      <ChartInsightButton title="🏆 Meyve Üretimi Dünya Payı" description="Türkiye dünya meyve üretimindeki payı" data={TR_MEYVE_PAYLARI} context={{ section: 'Meyve Üretimi' }} compact />
    </div>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Türkiye; kiraz, kayısı, vişne ve kızılcık üretiminde dünya birincisidir · Kaynak: FAO 2022
    </p>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={TR_MEYVE_PAYLARI} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="meyve" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
        <YAxis stroke="var(--text-secondary)" domain={[0, 35]}
          tickFormatter={(v: number) => v + '%'} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          formatter={(v: number) => [v + '%', 'Dünya Üretim Payı']}
        />
        <Bar dataKey="pay" radius={[4, 4, 0, 0]}>
          {TR_MEYVE_PAYLARI.map((_, i) => (
            <Cell key={i} fill={MEYVE_RENKLER[i % MEYVE_RENKLER.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default function FruitProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Meyve Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı meyve üretim analizi — TÜİK 2004–2024"
      icon="🍎"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={MEYVE_URUNLER}
      defaultProducts={['Elma (Golden)', 'Kayısı', 'Kiraz']}
      showTreeMetrics
      extraSection={fruitExtra}
    />
  );
}
