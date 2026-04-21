import type { GIMetrics } from './giTypes';
import { formatNumber } from './giTypes';

interface Props {
  metrics: GIMetrics;
}

const kpiConfig = [
  {
    key: 'total' as const,
    label: 'Toplam Ürün',
    sub: 'Tescilli + Başvuru',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    key: 'registered' as const,
    label: 'Tescilli',
    sub: (m: GIMetrics) => `%${((m.registered / m.total) * 100).toFixed(1)} Tescil Oranı`,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  {
    key: 'pending' as const,
    label: 'Başvuruda',
    sub: 'İnceleme Aşamasında',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  {
    key: 'provinceCount' as const,
    label: 'İl Sayısı',
    sub: 'Farklı İl',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  },
  {
    key: 'productGroupCount' as const,
    label: 'Ürün Grubu',
    sub: 'Farklı Kategori',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
  },
  {
    key: 'typeCount' as const,
    label: 'İşaret Türü',
    sub: 'Farklı Tür',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
  }
];

export function GIKpiCards({ metrics }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    }}>
      {kpiConfig.map((item) => (
        <div key={item.key} style={{ background: item.gradient, borderRadius: '12px', padding: '24px', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>{item.label}</div>
          <div style={{ fontSize: '36px', fontWeight: 800 }}>{formatNumber(metrics[item.key])}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            {typeof item.sub === 'function' ? item.sub(metrics) : item.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
