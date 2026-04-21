import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const SEKER_URUNLER = [
  'Şeker Pancarı', 'Şeker Kamışı', 'Şeker Pancarı Tohumları'
];

interface KampanyaRow { asama: string; aylar: number[]; renk: string }

const KAMPANYA: KampanyaRow[] = [
  { asama: 'Toprak Hazırlığı', aylar: [1, 2, 3],             renk: '#a78bfa' },
  { asama: 'Ekim',           aylar: [3, 4],               renk: '#f59e0b' },
  { asama: 'Büyüme Dönemi',  aylar: [4, 5, 6, 7, 8],       renk: '#10b981' },
  { asama: 'Hasat',          aylar: [9, 10],              renk: '#ef4444' },
  { asama: 'Fabrika İşleme', aylar: [9, 10, 11, 12],       renk: '#3b82f6' },
  { asama: 'Depolama',       aylar: [11, 12, 1, 2],       renk: '#6366f1' },
];

const AYLAR_K = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const sugarExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <h3 className="chart-title">🗓️ Şeker Pancarı Kampanya Takvimi (Yıllık Döngü)</h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingBottom: 12 }}>
      Türkiye'de şeker pancarı kampanyası ekimden fabrika depolamasına kadar yaklaşık 9 ay sürer.
    </p>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: '0.83rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: 140 }}>Üretim Aşaması</th>
            {AYLAR_K.map(ay => (
              <th key={ay} style={{ textAlign: 'center', padding: '4px 5px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: 32 }}>{ay}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KAMPANYA.map(row => (
            <tr key={row.asama}>
              <td style={{ padding: '4px 8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.renk, display: 'inline-block', flexShrink: 0 }} />
                {row.asama}
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(ay => (
                <td key={ay} style={{
                  background: row.aylar.includes(ay) ? row.renk : 'transparent',
                  borderRadius: 4,
                  height: 24,
                  border: '1px solid var(--border)',
                  opacity: row.aylar.includes(ay) ? 0.85 : 1,
                }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function SugarCropProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Şeker Bitkileri Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı şeker bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🍬"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={SEKER_URUNLER}
      defaultProducts={['Şeker Pancarı']}
      extraSection={sugarExtra}
    />
  );
}
