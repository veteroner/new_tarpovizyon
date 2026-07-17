import { useQuery } from '@tanstack/react-query';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { YearlyChart } from './YearlyChart';
import { RankedTable } from './RankedTable';

type TradeRow = { yil: number; ihracat_deger: number; ithalat_deger: number };
type ProductRow = { ana_urun: string; ihracat_deger: number; ithalat_deger: number };

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

async function fetchTrend(modul: 'hayvansal' | 'bitkisel', urunler: string[]): Promise<TradeRow[]> {
  const url = new URL(`${API_BASE}/api/${modul}/dis-ticaret/yillik-trend`);
  url.searchParams.set('urunler', urunler.join(','));
  const res = await fetch(url.toString());
  const json = await res.json();
  return json.data ?? [];
}

async function fetchProductBreakdown(modul: 'hayvansal' | 'bitkisel', urunler: string[], yil: number): Promise<ProductRow[]> {
  const url = new URL(`${API_BASE}/api/${modul}/dis-ticaret/urun-ozet`);
  url.searchParams.set('urunler', urunler.join(','));
  url.searchParams.set('yil', String(yil));
  const res = await fetch(url.toString());
  const json = await res.json();
  return json.data ?? [];
}

export function TradeTrendSection({ title, urunler, modul = 'hayvansal' }: { title: string; urunler: string[]; modul?: 'hayvansal' | 'bitkisel' }) {
  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ['tvb-trade-trend', modul, urunler],
    queryFn: () => fetchTrend(modul, urunler),
  });

  const rows = trend ?? [];
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const latestYear = last?.yil;

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['tvb-trade-products', modul, urunler, latestYear],
    queryFn: () => fetchProductBreakdown(modul, urunler, latestYear as number),
    enabled: Boolean(latestYear),
  });

  const pctChange = (curr?: number, prior?: number) =>
    curr !== undefined && prior !== undefined && prior !== 0 ? ((curr - prior) / prior) * 100 : null;

  return (
    <div className="tvb-section">
      <h3>{title}</h3>
      {(loadingTrend || loadingProducts) && <p className="tvb-status">Yükleniyor…</p>}

      {!loadingTrend && last && (
        <>
          <div className="tvb-page__controls">
            <KpiCard label={`${latestYear} İhracat`} value={formatNumber(last.ihracat_deger)} suffix="$" changePct={pctChange(last.ihracat_deger, prev?.ihracat_deger)} />
            <KpiCard label={`${latestYear} İthalat`} value={formatNumber(last.ithalat_deger)} suffix="$" changePct={pctChange(last.ithalat_deger, prev?.ithalat_deger)} />
          </div>

          <YearlyChart
            data={rows as unknown as Record<string, number | string>[]}
            xKey="yil"
            series={[
              { key: 'ihracat_deger', label: 'İhracat ($)', type: 'bar' },
              { key: 'ithalat_deger', label: 'İthalat ($)', type: 'bar' },
            ]}
          />
        </>
      )}

      {!loadingProducts && products && products.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <RankedTable
            items={products.map((p) => ({ name: p.ana_urun, value: p.ihracat_deger }))}
            nameLabel="Madde"
            valueLabel="İhracat ($)"
          />
        </div>
      )}
    </div>
  );
}
