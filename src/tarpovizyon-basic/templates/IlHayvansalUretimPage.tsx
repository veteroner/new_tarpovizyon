import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { RankingBlock } from '../charts/RankingBlock';

export type IlHayvansalUretimPageConfig = { title: string };

const KPI_FIELDS: { key: string; label: string; suffix: string }[] = [
  { key: 'sigir_varligi_bas', label: 'Sığır Varlığı', suffix: 'Baş' },
  { key: 'manda_varligi_bas', label: 'Manda Varlığı', suffix: 'Baş' },
  { key: 'koyun_varligi_bas', label: 'Koyun Varlığı', suffix: 'Baş' },
  { key: 'keci_varligi_bas', label: 'Keçi Varlığı', suffix: 'Baş' },
  { key: 'et_tavugu_sayisi', label: 'Et Tavuğu Sayısı', suffix: 'Adet' },
  { key: 'yumurta_tavugu_sayisi', label: 'Yumurta Tavuğu Sayısı', suffix: 'Adet' },
  { key: 'kovan_varligi', label: 'Kovan Varlığı', suffix: 'Adet' },
  { key: 'yeni_kovan_sayisi', label: 'Yeni Kovan Sayısı', suffix: 'Adet' },
  { key: 'eski_kovan_sayisi', label: 'Eski Kovan Sayısı', suffix: 'Adet' },
  { key: 'bal_uretimi_ton', label: 'Bal Üretimi', suffix: 'Ton' },
  { key: 'bal_verimi_kg', label: 'Bal Verimi', suffix: 'Kg' },
  { key: 'balmumu_uretimi_ton', label: 'Balmumu Üretimi', suffix: 'Ton' },
];

export function IlHayvansalUretimPage({ config }: { config: IlHayvansalUretimPageConfig }) {
  const { data } = useQuery({ queryKey: ['tvb-il-hayvan'], queryFn: () => fetchRows('il/hayvan-sayilari', { limit: '300' }) });

  const latestYear = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data.reduce((max, r) => {
      const t = String(r.tarih ?? '');
      return t > max ? t : max;
    }, '');
  }, [data]);

  const rows = useMemo(() => (data ?? []).filter((r) => r.tarih === latestYear), [data, latestYear]);

  const mapValues = Object.fromEntries(
    rows.map((r) => [String(r.il), Number(r.toplam_hayvan_varligi)]).filter(([, v]) => Number.isFinite(v))
  );
  const items = rows.map((r) => ({ name: String(r.il), value: Number(r.toplam_hayvan_varligi) })).filter((i) => Number.isFinite(i.value));

  const totals: Record<string, number> = {};
  KPI_FIELDS.forEach((f) => {
    totals[f.key] = rows.reduce((s, r) => s + (Number.isFinite(Number(r[f.key])) ? Number(r[f.key]) : 0), 0);
  });
  const balVerimiAvg = rows.length > 0 && Number.isFinite(totals.bal_verimi_kg)
    ? rows.reduce((s, r) => s + (Number.isFinite(Number(r.bal_verimi_kg)) ? Number(r.bal_verimi_kg) : 0), 0) / rows.filter((r) => Number.isFinite(Number(r.bal_verimi_kg))).length
    : null;

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      {items.length > 0 && (
        <>
          <div className="tvb-page__controls">
            <KpiCard label="Toplam Hayvan Varlığı" value={formatNumber(items.reduce((s, i) => s + i.value, 0))} suffix="Baş" />
          </div>
          <div className="tvb-section">
            <h3>İllere Göre Toplam Hayvan Varlığı</h3>
            <TurkeyProvinceMap values={mapValues} />
          </div>
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
        </>
      )}

      <div className="tvb-page__controls">
        {KPI_FIELDS.map((f) => (
          <KpiCard
            key={f.key}
            label={f.label}
            value={formatNumber(f.key === 'bal_verimi_kg' ? balVerimiAvg : totals[f.key])}
            suffix={f.suffix}
          />
        ))}
      </div>
    </div>
  );
}
