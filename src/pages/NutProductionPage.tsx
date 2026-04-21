import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SERT_KABUKLU_URUNLER = [
  'Fındık', 'Ceviz', 'Badem', 'Şam Fıstığı (Antep Fıstığı)', 'Kestane'
];

const FINDIK_DUNYA = [
  { ulke: 'Türkiye',     ton: 750 },
  { ulke: 'İtalya',      ton: 136 },
  { ulke: 'Azerbaycan',  ton: 135 },
  { ulke: 'ABD',         ton: 66  },
  { ulke: 'Gürcistan',  ton: 62  },
  { ulke: 'Çin',        ton: 60  },
  { ulke: 'İran',       ton: 37  },
].sort((a, b) => b.ton - a.ton);

const nutExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <h3 className="chart-title">🌰 Dünya Fındık Üretiminde Türkiye (2022, bin ton)</h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Türkiye, dünya fındık üretiminin yaklaşık <strong>%70'ini</strong> tek başına karşılıyor.
      Kaynak: FAO 2022 · Kırmızı çubuk = Türkiye
    </p>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={FINDIK_DUNYA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="ulke" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
        <YAxis stroke="var(--text-secondary)"
          tickFormatter={(v: number) => v + 'K ton'} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          formatter={(v: number) => [(v * 1000).toLocaleString('tr-TR') + ' ton', 'Fındık Üretimi']}
        />
        <Bar dataKey="ton" radius={[4, 4, 0, 0]}>
          {FINDIK_DUNYA.map((row, i) => (
            <Cell key={i} fill={row.ulke === 'Türkiye' ? '#ef4444' : '#8b5cf6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default function NutProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sert Kabuklu Meyve Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı sert kabuklu meyve üretim analizi — TÜİK 2004–2024"
      icon="🥜"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={SERT_KABUKLU_URUNLER}
      defaultProducts={['Fındık', 'Ceviz', 'Şam Fıstığı (Antep Fıstığı)']}
      showTreeMetrics
      extraSection={nutExtra}
    />
  );
}
