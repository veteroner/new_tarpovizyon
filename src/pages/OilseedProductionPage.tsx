import { Flower2 } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { ChartCard } from '../components/ui/Card';

const YAGLI_TOHUM_URUNLER = [
  'Ayçiçeği Tohumu (Yağlık)', 'Ayçiçeği Tohumu (Çerezlik)',
  'Soya Fasulyesi', 'Kanola Veya Kolza Tohumu', 'Aspir Tohumu',
  'Susam Tohumu', 'Keten Tohumu', 'Kenevir Tohumu',
  'Haşhaş Tohumu', 'Yerfıstığı, Kabuklu'
];

const YAG_ICERIK = [
  { isim: 'Susam',       yuzde: 52 },
  { isim: 'Yerfıstığı',  yuzde: 49 },
  { isim: 'Kanola',      yuzde: 45 },
  { isim: 'Ayçiçeği',   yuzde: 43 },
  { isim: 'Haşhaş',     yuzde: 44 },
  { isim: 'Keten',       yuzde: 42 },
  { isim: 'Aspir',       yuzde: 40 },
  { isim: 'Soya',        yuzde: 18 },
].sort((a, b) => b.yuzde - a.yuzde);

const YAG_RENKLER = ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#fb923c', '#fcd34d', '#fde68a', '#84cc16'];

const oilseedExtra = (
  <ChartCard title="Yağlı Tohumlarda Yağ İçeriği Karşılaşması (%)" action={<ChartInsightButton title="Yağ İçeriği" description="Yağlı tohumlarda yağ içeriği karşılaşması" data={YAG_ICERIK} context={{ section: 'Yağlı Tohumlar' }} compact />}>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Tohum başına ortalama yağ içeriği oranı. Susam ve yerfıstığı en zengin yağ kaynakları arasında yer alır.
    </p>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={YAG_ICERIK} margin={{ top: 5, right: 8, left: 4, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="isim" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
        <YAxis stroke="var(--text-secondary)" domain={[0, 60]}
          tickFormatter={(v: number) => v + '%'} width={46} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          formatter={(v: number) => [v + '%', 'Yağ İçeriği']}
        />
        <Bar dataKey="yuzde" radius={[4, 4, 0, 0]}>
          {YAG_ICERIK.map((_, i) => (
            <Cell key={i} fill={YAG_RENKLER[i % YAG_RENKLER.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

export default function OilseedProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Yağlı Tohum Üretimi"
      subtitle={`Türkiye il/ilçe/bölge bazlı yağlı tohum üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Flower2 size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={YAGLI_TOHUM_URUNLER}
      defaultProducts={['Ayçiçeği Tohumu (Yağlık)', 'Soya Fasulyesi']}
      extraSection={oilseedExtra}
    />
  );
}
