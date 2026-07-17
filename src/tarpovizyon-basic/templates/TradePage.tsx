import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows, type Row } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { WorldChoroplethMap } from '../charts/WorldChoroplethMap';
import { RankedTable } from '../charts/RankedTable';

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

function aggregateByCountry(rows: Row[], valueField: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const ulke = String(r.ulke ?? '');
    const v = Number(r[valueField]);
    if (!ulke || !Number.isFinite(v) || v === 0) continue;
    map.set(ulke, (map.get(ulke) ?? 0) + v);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function TradePage({ title, endpoint, modul = 'hayvansal' }: { title: string; endpoint: string; modul?: 'hayvansal' | 'bitkisel' }) {
  const [yil, setYil] = useState('');
  const [urun, setUrun] = useState('');

  // Distinct years/products via a dedicated meta endpoint — sampling the first N rows
  // (ordered by yıl DESC) would only ever surface the single most recent year.
  const { data: meta } = useQuery({
    queryKey: ['tvb-trade-meta', modul],
    queryFn: () => fetch(`${API_BASE}/api/${modul}/dis-ticaret/meta`).then((r) => r.json()) as Promise<{ years: number[]; products: string[] }>,
  });

  const years = (meta?.years ?? []).map(String);
  const products = meta?.products ?? [];

  const activeYil = yil || years[0] || '';

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-trade', endpoint, activeYil, urun],
    queryFn: () => fetchRows(endpoint, { yil: activeYil, ana_urun: urun, limit: '2000' }),
    enabled: Boolean(activeYil),
  });

  const rows = data ?? [];
  const exportItems = aggregateByCountry(rows, 'ihracat_deger');
  const importItems = aggregateByCountry(rows, 'ithalat_deger');
  const exportTotal = exportItems.reduce((s, i) => s + i.value, 0);
  const importTotal = importItems.reduce((s, i) => s + i.value, 0);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      <div className="tvb-page__controls">
        <div className="tvb-select">
          <label>Yıl</label>
          <select value={activeYil} onChange={(e) => setYil(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="tvb-select">
          <label>Ürün</label>
          <select value={urun} onChange={(e) => setUrun(e.target.value)}>
            <option value="">Tümü</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && (
        <>
          <div className="tvb-section">
            <h3>İhracat (Dolar)</h3>
            <div className="tvb-page__controls">
              <KpiCard label="Toplam İhracat" value={formatNumber(exportTotal)} suffix="$" />
              <KpiCard label="Ülke Sayısı" value={String(exportItems.length)} />
            </div>
            {exportItems.length > 0 && <WorldChoroplethMap values={Object.fromEntries(exportItems.map((i) => [i.name, i.value]))} height={300} />}
            <RankedTable items={exportItems} valueLabel="İhracat ($)" />
          </div>

          <div className="tvb-section">
            <h3>İthalat (Dolar)</h3>
            <div className="tvb-page__controls">
              <KpiCard label="Toplam İthalat" value={formatNumber(importTotal)} suffix="$" />
              <KpiCard label="Ülke Sayısı" value={String(importItems.length)} />
            </div>
            {importItems.length > 0 && <WorldChoroplethMap values={Object.fromEntries(importItems.map((i) => [i.name, i.value]))} height={300} />}
            <RankedTable items={importItems} valueLabel="İthalat ($)" />
          </div>
        </>
      )}
    </div>
  );
}
