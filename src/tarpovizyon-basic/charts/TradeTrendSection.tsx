import { useQuery } from '@tanstack/react-query';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { YearlyChart } from './YearlyChart';
import { RankedTable } from './RankedTable';

type TradeRow = { yil: number; ihracat_deger: number; ithalat_deger: number; ihracat_miktar?: number; ithalat_miktar?: number };
type ProductRow = { ana_urun: string; ihracat_deger: number; ithalat_deger: number; ihracat_miktar?: number; ithalat_miktar?: number; miktar_birim?: string };

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';
const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

async function fetchTrend(modul: 'hayvansal' | 'bitkisel', urunler: string[]): Promise<{ rows: TradeRow[]; unit: string | null }> {
  const url = new URL(`${API_BASE}/api/${modul}/dis-ticaret/yillik-trend`);
  url.searchParams.set('urunler', urunler.join('|'));
  const res = await fetch(url.toString());
  const json = await res.json();
  return { rows: json.data ?? [], unit: json.unit ?? null };
}

async function fetchProductBreakdown(modul: 'hayvansal' | 'bitkisel', urunler: string[], yil: number): Promise<ProductRow[]> {
  const url = new URL(`${API_BASE}/api/${modul}/dis-ticaret/urun-ozet`);
  url.searchParams.set('urunler', urunler.join('|'));
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

  const rows = trend?.rows ?? [];
  // Only defined when every product in this sector's group shares one unit
  // (e.g. "Kırmızı Et ve Canlı Hayvan Dış Ticareti" mixes ADET live-animal
  // rows with KG meat rows — summing quantity across those would be
  // meaningless, so the API omits `unit` and we just don't show it).
  const unit = trend?.unit ?? null;
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
            {unit && Number.isFinite(last.ihracat_miktar) && (
              <KpiCard label={`${latestYear} İhracat Miktarı`} value={numberFmt.format(last.ihracat_miktar as number)} suffix={unit} changePct={pctChange(last.ihracat_miktar, prev?.ihracat_miktar)} />
            )}
            {unit && Number.isFinite(last.ithalat_miktar) && (
              <KpiCard label={`${latestYear} İthalat Miktarı`} value={numberFmt.format(last.ithalat_miktar as number)} suffix={unit} changePct={pctChange(last.ithalat_miktar, prev?.ithalat_miktar)} />
            )}
          </div>

          <YearlyChart
            data={rows as unknown as Record<string, number | string>[]}
            xKey="yil"
            series={[
              { key: 'ihracat_deger', label: 'İhracat ($)', type: 'bar' },
              { key: 'ithalat_deger', label: 'İthalat ($)', type: 'bar' },
            ]}
          />

          <div style={{ marginTop: 16 }}>
            <RankedTable
              items={[...rows].reverse().map((r) => ({ name: String(r.yil), value: r.ihracat_deger, secondary: r.ithalat_deger }))}
              nameLabel="Yıl"
              valueLabel="İhracat ($)"
              secondaryLabel="İthalat ($)"
              sort={false}
              rankColumn={false}
            />
          </div>
        </>
      )}

      {!loadingProducts && products && products.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <RankedTable
            items={products.map((p) => ({
              name: p.ana_urun,
              value: p.ihracat_deger,
              secondary: p.ihracat_miktar,
            }))}
            nameLabel="Madde"
            valueLabel="İhracat ($)"
            // Different ürünler in one sector group can carry different units
            // (ADET vs KG) — only label a shared "Miktar" column when every
            // matched product actually uses the same one, so the header never
            // silently mislabels a mixed-unit column.
            secondaryLabel={
              products.every((p) => p.miktar_birim && p.miktar_birim === products[0].miktar_birim)
                ? `Miktar (${products[0].miktar_birim})`
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
