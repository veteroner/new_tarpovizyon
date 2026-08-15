import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { OranCubugu } from '../charts/OranCubugu';
import { YearlyChart, type SeriesConfig } from '../charts/YearlyChart';
import { TradeTrendSection } from '../charts/TradeTrendSection';
import { HorizontalRankBar } from '../charts/HorizontalRankBar';
import { useYearRangeFilter } from '../charts/DateRangeFilter';

export type YearlyPageConfig = {
  title: string;
  endpoint: string;
  xField: string; // yıl or tarih
  series: SeriesConfig[];
  kpiField?: string; // main KPI, latest non-zero value + YoY change
  kpiLabel?: string;
  kpiUnit?: string;
  secondKpiField?: string;
  secondKpiLabel?: string;
  /**
   * Kendine yeterlilik oranı — kendi ucundan geliyor (`tr/yeterlilikler`
   * oranı tutuyor: 1,17 = %117).
   *
   * `donem` ZORUNLU DEĞİL ama olmalı: tablo tarihsiz tek satır, yani sayının
   * hangi yıla ait olduğu veriden okunamıyor. Yazılmazsa okuyucu bunu güncel
   * sanar.
   */
  gauge?: { endpoint: string; field: string; label: string; asRatio?: boolean; donem?: string };
  /** Additional charts rendered below the main one from the same rows — e.g. a
   *  comparison page that also wants each series broken out on its own. */
  extraCharts?: { title: string; series: SeriesConfig[] }[];
  /** Aggregate monthly/date rows into yearly sums for a cleaner trend chart. */
  aggregateYearly?: boolean;
  /** Reformats a datetime xField into a compact axis label. */
  xFormat?: 'year' | 'yearMonth';
  /** Renders a "Dış Ticaret" sub-section (KPIs + yearly trend + product table) below the main chart. */
  tradeSection?: { title: string; urunler: string[] };
  /** Renders a "İlk 10 İl" section below the main chart — one ranking bar per
   *  metric, computed from the endpoint's latest year (e.g. province-level
   *  Sığır/Manda/Koyun/Keçi varlığı, matching the source Looker report's
   *  per-species province ranking that the main yearly chart alone doesn't cover). */
  provincialRanking?: {
    title: string;
    endpoint: string;
    nameField: string;
    yearField: string;
    metrics: { field: string; label: string }[];
    topN?: number;
  };
};

type Row = Record<string, unknown>;

function extractYear(value: unknown): number | null {
  const m = String(value ?? '').match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function sortRows(rows: Row[], xField: string): Row[] {
  const numeric = rows.every((r) => Number.isFinite(Number(r[xField])));
  return [...rows].sort((a, b) =>
    numeric ? Number(a[xField]) - Number(b[xField]) : String(a[xField]).localeCompare(String(b[xField]))
  );
}

/**
 * İçinde bulunulan yılın EKSİK olduğunu işaretleyen alan.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Aylık satırlar yıla toplanırken devam eden yıl da tam yılmış gibi
 * toplanıyordu. Kanatlı verisinde 2026'nın yalnızca 6 ayı var; kart bunu
 * 12 aylık 2025 ile karşılaştırıp "▼%51,04" yazıyordu. Üretimde böyle bir
 * çöküş yok — sadece yılın yarısı henüz gerçekleşmemiş. Aynı yanılgı
 * `aggregateYearly` kullanan HER sayfada vardı.
 */
const EKSIK = '__eksikYil';

function aggregateByYear(rows: Row[], xField: string, fields: string[]): Row[] {
  const byYear = new Map<number, Row>();
  const adet = new Map<number, number>();
  for (const r of rows) {
    const year = extractYear(r[xField]);
    if (year === null) continue;
    const acc = byYear.get(year) ?? { [xField]: year };
    for (const f of fields) {
      const v = Number(r[f]);
      if (Number.isFinite(v)) acc[f] = (Number(acc[f]) || 0) + v;
    }
    byYear.set(year, acc);
    adet.set(year, (adet.get(year) ?? 0) + 1);
  }

  /*
   * "Tam yıl" kaç satır? Veri kümesine göre değişir (aylıksa 12, çeyreklikse
   * 4), o yüzden sabit yazılmıyor: en sık görülen satır sayısı esas alınıyor.
   * Bundan az satırı olan yıl eksik sayılıyor.
   */
  const sayilar = [...adet.values()];
  const tamYil = sayilar.length ? Math.max(...sayilar) : 0;

  return Array.from(byYear.values())
    .map((r) => {
      const y = Number(r[xField]);
      return (adet.get(y) ?? 0) < tamYil ? { ...r, [EKSIK]: adet.get(y) ?? 0 } : r;
    })
    .sort((a, b) => Number(a[xField]) - Number(b[xField]));
}

/**
 * Sondan geriye yürüyerek sıfırdan farklı son değeri bulur; önceki
 * karşılaştırılabilir satırı da döndürür.
 *
 * `donem` de dönüyor: kart hangi yıla ait olduğunu YAZMALI. Yazmadığı sürece
 * yıl aralığı filtresi kartı değiştirdiğinde bu görünmüyordu — başlangıç yılını
 * oynatmak zaten kartı hiç etkilemiyor (değer sondan alınıyor), bitiş yılını
 * oynatmak ise sessizce başka bir yılın sayısını gösteriyordu.
 */
function latestNonZero(rows: Row[], field: string, xField: string): { value: number | null; pct: number | null; donem: string | null } {
  for (let i = rows.length - 1; i >= 1; i--) {
    // Eksik yıl ATLANIYOR: yarım yılın toplamını tam yılla kıyaslamak sahte
    // bir düşüş üretiyor. Kart son TAMAMLANMIŞ yılı gösteriyor.
    if (rows[i][EKSIK] !== undefined) continue;
    const v = Number(rows[i][field]);
    if (Number.isFinite(v) && v !== 0) {
      const p = Number(rows[i - 1][field]);
      const pct = Number.isFinite(p) && p !== 0 ? ((v - p) / p) * 100 : null;
      return { value: v, pct, donem: String(rows[i][xField] ?? '') || null };
    }
  }
  return { value: null, pct: null, donem: null };
}

function useProvincialRanking(config?: YearlyPageConfig['provincialRanking']) {
  const { data } = useQuery({
    queryKey: ['tvb-provincial-ranking', config?.endpoint],
    queryFn: () => fetchRows(config!.endpoint, { limit: '3000' }),
    enabled: Boolean(config),
  });
  if (!config || !data) return null;
  const yearOf = (r: (typeof data)[number]) => extractYear(r[config.yearField]);
  const latestYear = Math.max(...data.map(yearOf).filter((y): y is number => y !== null));
  const latestRows = data.filter((r) => yearOf(r) === latestYear);
  return config.metrics.map((m) => ({
    label: m.label,
    items: latestRows
      .map((r) => ({ name: String(r[config.nameField] ?? ''), value: Number(r[m.field]) }))
      .filter((i) => i.name && Number.isFinite(i.value) && i.value > 0),
  }));
}

function useGauge(gauge?: YearlyPageConfig['gauge']) {
  const { data } = useQuery({
    queryKey: ['tvb-gauge', gauge?.endpoint],
    queryFn: () => fetchRows(gauge!.endpoint, { limit: '10' }),
    enabled: Boolean(gauge),
  });
  if (!gauge || !data || data.length === 0) return null;
  const raw = Number(data[0][gauge.field]);
  if (!Number.isFinite(raw)) return null;
  return gauge.asRatio === false ? raw : raw * 100;
}

export function YearlyPage({ config }: { config: YearlyPageConfig }) {
  const { title, endpoint, xField, series, kpiField, kpiLabel, kpiUnit, secondKpiField, secondKpiLabel, gauge, aggregateYearly, xFormat, tradeSection, provincialRanking, extraCharts } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-yearly', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '3000' }),
  });

  let rows = sortRows((data ?? []) as Row[], xField);
  if (aggregateYearly) {
    rows = aggregateByYear(rows, xField, series.map((s) => s.key));
  } else if (xFormat === 'year') {
    rows = rows.map((r) => ({ ...r, [xField]: extractYear(r[xField]) ?? r[xField] }));
  } else if (xFormat === 'yearMonth') {
    rows = rows.map((r) => ({ ...r, [xField]: String(r[xField]).slice(0, 7) }));
  }

  // Date-range filter — mirrors the "1 Oca 2024 - 30 Nis 2026" style picker
  // the source Looker report shows above its trend charts, which our pages
  // previously lacked entirely (always rendered full history, no narrowing).
  const { filtered: filteredRows, control: dateControl } = useYearRangeFilter(rows, (r) => extractYear(r[xField]));

  const kpi1 = kpiField ? latestNonZero(filteredRows, kpiField, xField) : null;
  const kpi2 = secondKpiField ? latestNonZero(filteredRows, secondKpiField, xField) : null;
  /* Süzülmüş aralıktaki son satır eksik bir yıl mı? (grafiğin altındaki not) */
  const sonSatir = filteredRows[filteredRows.length - 1];
  const eksikYil = sonSatir?.[EKSIK] !== undefined
    ? { yil: String(sonSatir[xField]), adet: Number(sonSatir[EKSIK]) }
    : null;

  const gaugeValue = useGauge(gauge);
  const rankings = useProvincialRanking(provincialRanking);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && (
        <>
          {/*
            * Yeterlilik oranı FİLTRENİN DIŞINDA duruyor. Kendi ucundan
            * (`tr/yeterlilikler`) geliyor, tek satır ve tarihsiz — yıl aralığı
            * seçicisinden hiç etkilenmiyor. Eskiden KPI kartlarıyla aynı
            * kutudaydı ve filtrenin hemen altındaydı; filtreyi oynatan kişi
            * bu sayının da değişmesini bekliyordu, hiç değişmiyordu.
            */}
          {gaugeValue !== null && (
            <div className="tvb-oran-liste">
              <OranCubugu
                label={gauge?.label ?? 'Yeterlilik Oranı'}
                deger={gaugeValue}
                /* Ölçek %150'ye kadar: veri kümesindeki en yüksek oran %148
                   (beyaz et). %100'de kesilseydi dördü de dolu görünürdü. */
                max={150}
                esik={100}
                olcekEtiketleri={['%0', '%150']}
                donem={gauge?.donem}
              />
            </div>
          )}

          {/*
            * Filtre, etkilediği içeriğin HEMEN ÜSTÜNDE. Altındaki kartlar ve
            * grafik ondan besleniyor; dış ticaret ve il sıralaması bölümleri
            * ise kendi verilerini çekiyor ve aşağıda, ayrı bölümlerde duruyor.
            */}
          {dateControl}

          {(kpi1 || kpi2) && (
            <div className="tvb-page__controls">
              {kpi1 && <KpiCard label={kpiLabel ?? kpiField ?? ''} value={formatNumber(kpi1.value)} suffix={kpiUnit} period={kpi1.donem ?? undefined} changePct={kpi1.pct} />}
              {kpi2 && <KpiCard label={secondKpiLabel ?? secondKpiField ?? ''} value={formatNumber(kpi2.value)} suffix={kpiUnit} period={kpi2.donem ?? undefined} changePct={kpi2.pct} />}
            </div>
          )}

          <div className="tvb-section">
            {/* Tek serilik grafiğin göstergesi çizilmiyor (başlığı tekrar
                ederdi); o yüzden seriyi başlık adlandırıyor. Çok serilide
                başlık yok, gösterge zaten hepsini sayıyor. */}
            {series.length === 1 && <h3>{series[0].label}</h3>}
            <YearlyChart data={filteredRows as Record<string, number | string>[]} xKey={xField} series={series} />
            {/*
              * Grafikteki son sütun eksik yılın toplamı — kırpılmıyor, veri
              * gerçek. Ama açıklanmazsa "üretim yarıya düştü" gibi okunuyor;
              * kartın neden bir önceki yılı gösterdiğini de bu not söylüyor.
              */}
            {eksikYil && (
              <p className="tvb-status">
                {eksikYil.yil} yılı henüz tamamlanmadı ({eksikYil.adet} dönem verisi);
                sütunu bu yüzden kısa görünüyor. Üstteki kart son tamamlanmış yılı gösteriyor.
              </p>
            )}
          </div>

          {extraCharts?.map((c) => (
            <div className="tvb-section" key={c.title}>
              <h3>{c.title}</h3>
              <YearlyChart data={filteredRows as Record<string, number | string>[]} xKey={xField} series={c.series} />
            </div>
          ))}

          {tradeSection && <TradeTrendSection title={tradeSection.title} urunler={tradeSection.urunler} />}

          {rankings && (
            <div className="tvb-section">
              {/* "En güncel yıl" açıkça yazılıyor: bu bölüm yukarıdaki yıl
                  aralığından etkilenmiyor, kendi ucunun son yılını kullanıyor. */}
              <h3>{provincialRanking?.title} <span className="tvb-not">(en güncel yıl)</span></h3>
              <div className="tvb-provincial-grid">
                {rankings.map((r) => (
                  <div key={r.label}>
                    <h4>{r.label}</h4>
                    <HorizontalRankBar items={r.items} topN={provincialRanking?.topN ?? 10} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
