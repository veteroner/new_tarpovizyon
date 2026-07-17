import { useQuery } from '@tanstack/react-query';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { YearlyChart } from '../charts/YearlyChart';
import { TradeTrendSection } from '../charts/TradeTrendSection';

export type CropSectorPageConfig = {
  title: string;
  /** Botanical variety names in bitkisel_tr_uretim_detay to sum for this sector's production series. */
  productionUrunler: string[];
  /** ana_urun name(s) in bitkisel_tr_dis_ticaret for the trade sub-section. */
  tradeUrunler: string[];
};

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

type YearRow = { yil: number; deger: number };

async function fetchDetayYillik(urunler: string[], unsur: string): Promise<YearRow[]> {
  const url = new URL(`${API_BASE}/api/bitkisel/uretim-detay-yillik`);
  url.searchParams.set('urunler', urunler.join(','));
  url.searchParams.set('unsur', unsur);
  const res = await fetch(url.toString());
  const json = await res.json();
  return json.data ?? [];
}

function latestNonZero(rows: YearRow[]): { value: number | null; pct: number | null } {
  for (let i = rows.length - 1; i >= 1; i--) {
    const v = rows[i].deger;
    if (Number.isFinite(v) && v !== 0) {
      const p = rows[i - 1].deger;
      const pct = Number.isFinite(p) && p !== 0 ? ((v - p) / p) * 100 : null;
      return { value: v, pct };
    }
  }
  return { value: null, pct: null };
}

export function CropSectorPage({ config }: { config: CropSectorPageConfig }) {
  const { title, productionUrunler, tradeUrunler } = config;

  const { data: uretim, isLoading: l1 } = useQuery({
    queryKey: ['tvb-crop-uretim', productionUrunler],
    queryFn: () => fetchDetayYillik(productionUrunler, 'Üretim'),
  });
  const { data: alan, isLoading: l2 } = useQuery({
    queryKey: ['tvb-crop-alan', productionUrunler],
    queryFn: () => fetchDetayYillik(productionUrunler, 'Ekilen Alan'),
  });

  const isLoading = l1 || l2;
  const uretimRows = uretim ?? [];
  const alanByYear = new Map((alan ?? []).map((r) => [r.yil, r.deger]));
  const merged = uretimRows.map((r) => ({ yil: r.yil, uretim_ton: r.deger, ekilen_alan_ha: alanByYear.get(r.yil) ?? null }));

  const kpi1 = latestNonZero(uretimRows);
  const kpi2 = latestNonZero(alan ?? []);
  const hasAlan = (alan ?? []).length > 0;

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && (
        <>
          <div className="tvb-page__controls">
            <KpiCard label="Üretim Miktarı" value={formatNumber(kpi1.value)} suffix="Ton" changePct={kpi1.pct} />
            {hasAlan && <KpiCard label="Ekilen Alan" value={formatNumber(kpi2.value)} suffix="Ha" changePct={kpi2.pct} />}
          </div>

          {merged.length > 0 && (
            <div className="tvb-section">
              <YearlyChart
                data={merged as unknown as Record<string, number | string>[]}
                xKey="yil"
                series={[
                  { key: 'uretim_ton', label: 'Üretim (Ton)', type: 'bar' },
                  ...(hasAlan ? [{ key: 'ekilen_alan_ha', label: 'Ekilen Alan (Ha)', type: 'line' as const }] : []),
                ]}
              />
            </div>
          )}

          {tradeUrunler.length > 0 && <TradeTrendSection title="Dış Ticaret" urunler={tradeUrunler} modul="bitkisel" />}
        </>
      )}
    </div>
  );
}
