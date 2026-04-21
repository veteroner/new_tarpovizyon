import TuikPlantCategoryPage from './TuikPlantCategoryPage';

interface SebzeRow { ad: string; ekim: number[]; hasat: number[] }

const MEVSIM_SEBZELER: SebzeRow[] = [
  { ad: 'Domates',      ekim: [3, 4],          hasat: [7, 8, 9]        },
  { ad: 'Biber',        ekim: [3, 4],          hasat: [7, 8, 9]        },
  { ad: 'Hıyar',        ekim: [4, 5],          hasat: [6, 7, 8]        },
  { ad: 'Patlıcan',     ekim: [3, 4],          hasat: [6, 7, 8, 9]     },
  { ad: 'Kabak',        ekim: [4, 5],          hasat: [6, 7, 8]        },
  { ad: 'Ispanak',      ekim: [9, 10],         hasat: [3, 4, 11, 12]   },
  { ad: 'Lahana',       ekim: [7, 8],          hasat: [10, 11, 12]     },
  { ad: 'Kuru Soğan',   ekim: [3, 4],          hasat: [7, 8]           },
  { ad: 'Marul',        ekim: [3, 4, 9, 10],   hasat: [5, 6, 11, 12]   },
  { ad: 'Taze Fasulye', ekim: [4, 5],          hasat: [6, 7, 8]        },
];

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function getCellBg(row: SebzeRow, ay: number): string {
  if (row.hasat.includes(ay)) return '#10b981';
  if (row.ekim.includes(ay)) return '#f59e0b';
  return 'transparent';
}

const vegExtra = (
  <div className="chart-card" style={{ marginTop: 20 }}>
    <h3 className="chart-title">📅 Sebze Mevsimsellik Takvimi (Türkiye)</h3>
    <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
        <span style={{ width: 14, height: 14, background: '#10b981', borderRadius: 3, display: 'inline-block' }} />
        Hasat Dönemi
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
        <span style={{ width: 14, height: 14, background: '#f59e0b', borderRadius: 3, display: 'inline-block' }} />
        Ekim / Dikim
      </span>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>Sebze</th>
            {AYLAR.map(ay => (
              <th key={ay} style={{ textAlign: 'center', padding: '4px 5px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: 30 }}>{ay}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEVSIM_SEBZELER.map(row => (
            <tr key={row.ad}>
              <td style={{ padding: '4px 8px', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.ad}</td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(ay => (
                <td key={ay} style={{
                  background: getCellBg(row, ay),
                  borderRadius: 4,
                  width: 30,
                  height: 22,
                  border: '1px solid var(--border)',
                }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function VegetableProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sebze Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı sebze üretim analizi — TÜİK 2004–2024"
      icon="🥬"
      urunGrup="Sebzeler"
      defaultProducts={['Domates (Sofralık)', 'Biber (Sivri)', 'Hıyar (Sofralık)']}
      extraSection={vegExtra}
    />
  );
}
