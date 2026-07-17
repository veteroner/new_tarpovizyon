import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows, type Row } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { WorldChoroplethMap } from '../charts/WorldChoroplethMap';
import { RankedTable } from '../charts/RankedTable';

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';
const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function aggregateByCountry(rows: Row[], valueField: string, quantityField: string) {
  const map = new Map<string, { value: number; quantity: number }>();
  for (const r of rows) {
    const ulke = String(r.ulke ?? '');
    const v = Number(r[valueField]);
    const q = Number(r[quantityField]);
    if (!ulke || !Number.isFinite(v) || v === 0) continue;
    const cur = map.get(ulke) ?? { value: 0, quantity: 0 };
    cur.value += v;
    if (Number.isFinite(q)) cur.quantity += q;
    map.set(ulke, cur);
  }
  return Array.from(map.entries()).map(([name, { value, quantity }]) => ({ name, value, secondary: quantity }));
}

export function TradePage({ title, endpoint, modul = 'hayvansal' }: { title: string; endpoint: string; modul?: 'hayvansal' | 'bitkisel' }) {
  const [yil, setYil] = useState('');
  // null = user hasn't touched the dropdown yet (defaults to the first product,
  // same as the source Looker report); '' = user explicitly chose "Tümü".
  const [urun, setUrun] = useState<string | null>(null);

  // Distinct years/products via a dedicated meta endpoint — sampling the first N rows
  // (ordered by yıl DESC) would only ever surface the single most recent year.
  const { data: meta } = useQuery({
    queryKey: ['tvb-trade-meta', modul],
    queryFn: () => fetch(`${API_BASE}/api/${modul}/dis-ticaret/meta`).then((r) => r.json()) as Promise<{ years: number[]; products: string[] }>,
  });

  const years = (meta?.years ?? []).map(String);
  const products = meta?.products ?? [];

  const activeYil = yil || years[0] || '';
  // Quantity units (ADET/TON/KG/BAŞ) vary per product, so a "Tümü" selection can't
  // sum them meaningfully — default to a single product like the source Looker
  // report does, so the quantity/unit-price figures are always well-defined.
  // "Tümü" stays selectable; the quantity column/KPI just hides while it's active.
  const activeUrun = urun === null ? (products[0] ?? '') : urun;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-trade', endpoint, activeYil, activeUrun],
    queryFn: () => fetchRows(endpoint, { yil: activeYil, ana_urun: activeUrun, limit: '2000' }),
    enabled: Boolean(activeYil) && Boolean(activeUrun),
  });

  const rows = data ?? [];
  const exportItems = aggregateByCountry(rows, 'ihracat_deger', 'ihracat_miktar');
  const importItems = aggregateByCountry(rows, 'ithalat_deger', 'ithalat_miktar');
  const exportTotal = exportItems.reduce((s, i) => s + i.value, 0);
  const importTotal = importItems.reduce((s, i) => s + i.value, 0);
  const exportQty = exportItems.reduce((s, i) => s + (i.secondary ?? 0), 0);
  const importQty = importItems.reduce((s, i) => s + (i.secondary ?? 0), 0);
  const unit = String(rows.find((r) => r.miktar_birim)?.miktar_birim ?? '');
  const showQuantity = Boolean(activeUrun); // ambiguous/mixed units when "Tümü" is selected

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
          <select value={activeUrun} onChange={(e) => setUrun(e.target.value)}>
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
              {showQuantity && <KpiCard label={`Toplam Miktar${unit ? ` (${unit})` : ''}`} value={numberFmt.format(exportQty)} />}
              {showQuantity && exportQty > 0 && <KpiCard label="Birim Fiyat" value={numberFmt.format(exportTotal / exportQty)} suffix={`$/${unit || 'birim'}`} />}
              <KpiCard label="Ülke Sayısı" value={String(exportItems.length)} />
            </div>
            {exportItems.length > 0 && <WorldChoroplethMap values={Object.fromEntries(exportItems.map((i) => [i.name, i.value]))} height={300} />}
            <RankedTable items={exportItems} valueLabel="İhracat ($)" secondaryLabel={showQuantity ? `Miktar${unit ? ` (${unit})` : ''}` : undefined} />
          </div>

          <div className="tvb-section">
            <h3>İthalat (Dolar)</h3>
            <div className="tvb-page__controls">
              <KpiCard label="Toplam İthalat" value={formatNumber(importTotal)} suffix="$" />
              {showQuantity && <KpiCard label={`Toplam Miktar${unit ? ` (${unit})` : ''}`} value={numberFmt.format(importQty)} />}
              {showQuantity && importQty > 0 && <KpiCard label="Birim Fiyat" value={numberFmt.format(importTotal / importQty)} suffix={`$/${unit || 'birim'}`} />}
              <KpiCard label="Ülke Sayısı" value={String(importItems.length)} />
            </div>
            {importItems.length > 0 && <WorldChoroplethMap values={Object.fromEntries(importItems.map((i) => [i.name, i.value]))} height={300} />}
            <RankedTable items={importItems} valueLabel="İthalat ($)" secondaryLabel={showQuantity ? `Miktar${unit ? ` (${unit})` : ''}` : undefined} />
          </div>
        </>
      )}
    </div>
  );
}
