import { StatCard } from '../../components/ui/Card';
import { yuzde } from '../../utils/sayi';
import type { GIMetrics } from './giTypes';
import { formatNumber } from './giTypes';

interface Props {
  metrics: GIMetrics;
}

/**
 * Coğrafi işaret KPI kartları.
 *
 * Altı kartın her biri kendi degradesini taşıyordu — yeşil, zümrüt, kehribar,
 * mavi, pembe, mor. Altı ölçünün altısı da aynı türden (sayım) olduğu için bu
 * renkler hiçbir ayrım kodlamıyordu; yalnızca gökkuşağı üretiyordu. Ortak kart
 * katmanına alındı, zemin nötr.
 */
const KPI_LISTESI = [
  { key: 'total' as const, label: 'Toplam ürün', sub: () => 'Tescilli + başvuru' },
  {
    key: 'registered' as const,
    label: 'Tescilli',
    sub: (m: GIMetrics) => (m.total > 0 ? `${yuzde((m.registered / m.total) * 100, 1)} tescil oranı` : '—'),
  },
  { key: 'pending' as const, label: 'Başvuruda', sub: () => 'İnceleme aşamasında' },
  { key: 'provinceCount' as const, label: 'İl sayısı', sub: () => 'Farklı il' },
  { key: 'productGroupCount' as const, label: 'Ürün grubu', sub: () => 'Farklı kategori' },
  { key: 'typeCount' as const, label: 'İşaret türü', sub: () => 'Farklı tür' },
];

export function GIKpiCards({ metrics }: Props) {
  return (
    <div className="kpi-grid">
      {KPI_LISTESI.map((item) => (
        <StatCard
          key={item.key}
          label={item.label}
          value={formatNumber(metrics[item.key])}
          sub={item.sub(metrics)}
        />
      ))}
    </div>
  );
}
