import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { TurkeyProvinceMap } from '../charts/TurkeyProvinceMap';
import { RankingBlock } from '../charts/RankingBlock';
import { RankedTable } from '../charts/RankedTable';

export type IlBitkiselUretimPageConfig = { title: string };

export function IlBitkiselUretimPage({ config }: { config: IlBitkiselUretimPageConfig }) {
  const [grup, setGrup] = useState('');
  const [urun, setUrun] = useState('');

  const { data: allRows } = useQuery({
    queryKey: ['tvb-il-bitkisel-all'],
    queryFn: () => fetchRows('il-duzeyinde/bitkisel-uretim', { limit: '10000' }),
  });

  const gruplar = useMemo(() => Array.from(new Set((allRows ?? []).map((r) => String(r.urun_grup ?? '')))).filter(Boolean).sort(), [allRows]);
  const activeGrup = grup || gruplar[0] || '';

  const urunler = useMemo(
    () => Array.from(new Set((allRows ?? []).filter((r) => r.urun_grup === activeGrup).map((r) => String(r.urun ?? '')))).sort(),
    [allRows, activeGrup]
  );
  const activeUrun = urun || urunler[0] || '';

  const rowsForUrun = useMemo(
    () => (allRows ?? []).filter((r) => r.urun_grup === activeGrup && r.urun === activeUrun),
    [allRows, activeGrup, activeUrun]
  );

  const mapValues = Object.fromEntries(
    rowsForUrun.map((r) => [String(r.il), Number(r.uretim_ton)]).filter(([, v]) => Number.isFinite(v))
  );
  const items = rowsForUrun
    .map((r) => ({ name: String(r.il), value: Number(r.uretim_ton) }))
    .filter((i) => Number.isFinite(i.value));

  const rowsForGrup = useMemo(() => (allRows ?? []).filter((r) => r.urun_grup === activeGrup), [allRows, activeGrup]);

  const productionByUrun = useMemo(() => {
    const map = new Map<string, number>();
    rowsForGrup.forEach((r) => {
      const v = Number(r.uretim_ton);
      if (Number.isFinite(v)) map.set(String(r.urun), (map.get(String(r.urun)) ?? 0) + v);
    });
    return Array.from(map.entries()).map(([urun, uretim]) => ({ urun, uretim })).sort((a, b) => b.uretim - a.uretim);
  }, [rowsForGrup]);

  const yieldByUrun = useMemo(() => {
    const grouped = new Map<string, number[]>();
    rowsForGrup.forEach((r) => {
      const v = Number(r.verim_kg_da);
      if (Number.isFinite(v) && v > 0) {
        const arr = grouped.get(String(r.urun)) ?? [];
        arr.push(v);
        grouped.set(String(r.urun), arr);
      }
    });
    return Array.from(grouped.entries())
      .map(([urun, vals]) => ({ urun, verim: vals.reduce((s, v) => s + v, 0) / vals.length }))
      .sort((a, b) => b.verim - a.verim);
  }, [rowsForGrup]);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-page__controls">
        <div className="tvb-select">
          <label>Ürün Grubu</label>
          <select value={activeGrup} onChange={(e) => { setGrup(e.target.value); setUrun(''); }}>
            {gruplar.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="tvb-select">
          <label>Ürün</label>
          <select value={activeUrun} onChange={(e) => setUrun(e.target.value)}>
            {urunler.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="tvb-section">
            <h3>{activeUrun} — İllere Göre Üretim (Ton)</h3>
            <TurkeyProvinceMap values={mapValues} />
          </div>
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
        </>
      )}

      {items.length === 0 && <p className="tvb-status">Kayıt bulunamadı.</p>}

      <div className="tvb-page__controls">
        <KpiCard label="Toplam Üretim" value={formatNumber(productionByUrun.reduce((s, r) => s + r.uretim, 0))} suffix="Ton" />
      </div>

      <div className="tvb-section">
        <h3>{activeGrup} — Ürüne Göre Üretim (Ton)</h3>
        <RankedTable items={productionByUrun.map((r) => ({ name: r.urun, value: r.uretim }))} nameLabel="Ürün" valueLabel="Üretim (Ton)" />
      </div>

      <div className="tvb-section">
        <h3>{activeGrup} — Ürüne Göre Ortalama Verim (Kg/Da)</h3>
        <RankedTable items={yieldByUrun.map((r) => ({ name: r.urun, value: r.verim }))} nameLabel="Ürün" valueLabel="Verim (Kg/Da)" />
      </div>
    </div>
  );
}
