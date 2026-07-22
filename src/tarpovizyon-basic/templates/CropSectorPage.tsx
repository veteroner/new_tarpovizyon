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
  /** Overrides the "Üretim" label. Needed for processed-product pages (İncir Kuru,
   *  Zeytinyağı) whose production series is actually the RAW crop's tonnage — TÜİK
   *  has no separate dried/oil production figure — so the generic "Üretim" label
   *  would misrepresent fresh-fig/olive tonnage as dried-fig/oil output. */
  productionLabel?: string;
};

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API ?? 'https://tarpovizyon-api.veteroner.workers.dev';

type YearRow = { yil: number; deger: number };

async function fetchDetayYillik(urunler: string[], unsur: string): Promise<YearRow[]> {
  const url = new URL(`${API_BASE}/api/bitkisel/uretim-detay-yillik`);
  // '|' delimiter, not ',' — several variety names contain commas
  // (e.g. "Buğday, Durum Buğdayı Hariç"); a comma-joined list would be
  // re-split mid-name by the API and silently match nothing.
  url.searchParams.set('urunler', urunler.join('|'));
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
  const { title, productionUrunler, tradeUrunler, productionLabel = 'Üretim' } = config;

  const { data: uretim, isLoading: l1 } = useQuery({
    queryKey: ['tvb-crop-uretim', productionUrunler],
    queryFn: () => fetchDetayYillik(productionUrunler, 'Üretim'),
  });
  const { data: alan, isLoading: l2 } = useQuery({
    queryKey: ['tvb-crop-alan', productionUrunler],
    queryFn: () => fetchDetayYillik(productionUrunler, 'Ekilen Alan'),
  });
  const { data: verim, isLoading: l3 } = useQuery({
    queryKey: ['tvb-crop-verim', productionUrunler],
    queryFn: () => fetchDetayYillik(productionUrunler, 'Verim'),
  });

  const isLoading = l1 || l2 || l3;
  const uretimRows = uretim ?? [];
  const alanByYear = new Map((alan ?? []).map((r) => [r.yil, r.deger]));
  const verimByYear = new Map((verim ?? []).map((r) => [r.yil, r.deger]));
  const merged = uretimRows.map((r) => ({
    yil: r.yil,
    uretim_ton: r.deger,
    ekilen_alan_da: alanByYear.get(r.yil) ?? null,
    verim_kg_da: verimByYear.get(r.yil) ?? null,
  }));

  const kpi1 = latestNonZero(uretimRows);
  const kpi2 = latestNonZero(alan ?? []);
  const kpi3 = latestNonZero(verim ?? []);
  const hasAlan = (alan ?? []).length > 0;
  const hasVerim = (verim ?? []).length > 0;

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && (
        <>
          <div className="tvb-page__controls">
            <KpiCard label={`${productionLabel} Miktarı`} value={formatNumber(kpi1.value)} suffix="Ton" changePct={kpi1.pct} />
            {hasAlan && <KpiCard label="Ekilen Alan" value={formatNumber(kpi2.value)} suffix="Dekar" changePct={kpi2.pct} />}
            {hasVerim && <KpiCard label="Verim" value={formatNumber(kpi3.value)} suffix="Kg/Dekar" changePct={kpi3.pct} />}
          </div>

          {merged.length > 0 && (
            <div className="tvb-section">
              {/* Üretim + ekilen alan share the left axis (both large quantities,
                  zero-based bars); verim (kg/dekar, ~hundreds) rides the right
                  axis so it isn't flattened against the millions on the left. */}
              <YearlyChart
                data={merged as unknown as Record<string, number | string>[]}
                xKey="yil"
                series={[
                  { key: 'uretim_ton', label: `${productionLabel} (Ton)`, type: 'bar' },
                  ...(hasAlan ? [{ key: 'ekilen_alan_da', label: 'Ekilen Alan (Dekar)', type: 'bar' as const }] : []),
                  ...(hasVerim ? [{ key: 'verim_kg_da', label: 'Verim (Kg/Dekar)', type: 'line' as const, axis: 'right' as const }] : []),
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
