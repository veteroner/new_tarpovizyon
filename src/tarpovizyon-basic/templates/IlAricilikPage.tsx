import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { RankingBlock } from '../charts/RankingBlock';
import { RankedTable } from '../charts/RankedTable';

export type IlAricilikPageConfig = { title: string };

export function IlAricilikPage({ config }: { config: IlAricilikPageConfig }) {
  const { data } = useQuery({ queryKey: ['tvb-il-bal'], queryFn: () => fetchRows('il/bal-cesitleri', { limit: '150' }) });
  const rows = data ?? [];

  const mapValues = Object.fromEntries(
    rows.map((r) => [String(r.il), Number(r.bal_uretimi_ton)]).filter(([, v]) => Number.isFinite(v))
  );
  const items = rows.map((r) => ({ name: String(r.il), value: Number(r.bal_uretimi_ton) })).filter((i) => Number.isFinite(i.value));

  const kovanItems = useMemo(
    () => rows.map((r) => ({ name: String(r.il), value: Number(r.toplam_kovan) })).filter((i) => Number.isFinite(i.value)),
    [rows]
  );
  const ariciItems = useMemo(
    () => rows.map((r) => ({ name: String(r.il), value: Number(r.aricilik_yapan_isletme_sayisi) })).filter((i) => Number.isFinite(i.value)),
    [rows]
  );

  const totalBal = items.reduce((s, i) => s + i.value, 0);
  const totalKovan = kovanItems.reduce((s, i) => s + i.value, 0);
  const totalArici = ariciItems.reduce((s, i) => s + i.value, 0);
  const totalBalmumu = rows.reduce((s, r) => s + (Number.isFinite(Number(r.balmumu_uretimi_ton)) ? Number(r.balmumu_uretimi_ton) : 0), 0);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-page__controls">
        <KpiCard label="Bal Üretimi" value={formatNumber(totalBal)} suffix="Ton" />
        <KpiCard label="Kovan Varlığı" value={formatNumber(totalKovan)} suffix="Adet" />
        <KpiCard label="Arıcı Sayısı" value={formatNumber(totalArici)} suffix="Adet" />
        <KpiCard label="Balmumu Üretimi" value={formatNumber(totalBalmumu)} suffix="Ton" />
      </div>

      {items.length > 0 && (
        <>
          <div className="tvb-section">
            <h3>İllere Göre Bal Üretimi (Ton)</h3>
            <TurkeyProvinceMap values={mapValues} />
          </div>
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
        </>
      )}

      <div className="tvb-section">
        <h3>İllere Göre Kovan Varlığı</h3>
        <RankedTable items={kovanItems} nameLabel="İl" valueLabel="Kovan (Adet)" />
      </div>

      <div className="tvb-section">
        <h3>İllere Göre Arıcı Sayısı</h3>
        <RankedTable items={ariciItems} nameLabel="İl" valueLabel="Arıcı Sayısı" />
      </div>
    </div>
  );
}
