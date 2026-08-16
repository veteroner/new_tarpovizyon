import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useContainerWidth } from './chartResponsive';

/*
 * ─── GELİŞTİRME SUNUCUSUNDA GRAFİKLER BOŞ GÖRÜNÜR — HATA DEĞİL ──────────────
 * `npm run dev` altında React StrictMode efektleri iki kez çalıştırıyor ve
 * Recharts 3.x'in giriş animasyonu başlangıç karesinde donuyor: çizgilerde
 * `stroke-dasharray: "0px <uzunluk>"` (görünür kısım sıfır), çubuklarda
 * `.recharts-bar-rectangle` grupları boş kalıyor. Grafik bomboş görünüyor.
 *
 * ÜRETİM DERLEMESİNDE SORUN YOK — ölçüldü: aynı grafik `vite preview`de
 * `stroke-dasharray: "1502px 0px"`, yani animasyon tamamlanıyor.
 *
 * Bu yüzden animasyonu kapatmayın: dev'deki boşluğa bakıp "animasyon bozuk"
 * diye teşhis koymak yanlış olur (bir kez yapıldı ve geri alındı). Grafik
 * doğrulaması ÜRETİM derlemesinde yapılmalı.
 */
const COLORS = ['#f59e0b', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];
const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
// Axis ticks abbreviate only millions+ (1,4 Mn / 2,1 Mr) so a wide value like
// "1.400.000" doesn't bloat the Y-axis column; thousands stay plain to avoid
// mixing "1,4 B" with "700" on the same axis. The tooltip keeps full precision.
const compactFmt = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
const plainFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const axisTick = (v: number) => (Math.abs(v) >= 1_000_000 ? compactFmt.format(v) : plainFmt.format(v));

export type SeriesConfig = {
  key: string;
  label: string;
  type?: 'bar' | 'line';
  /** 'right' plots this series against a secondary Y-axis — for pairing series
   *  whose scales differ by orders of magnitude (e.g. toplam vs. tarım GSYH, or
   *  ihracat adedi vs. birim fiyat) so neither gets flattened. */
  axis?: 'left' | 'right';
  /** Bars sharing a stack id stack on top of each other (e.g. büyükbaş +
   *  küçükbaş süt → total production composition) instead of standing apart. */
  stack?: string;
};

export function YearlyChart({
  data,
  xKey,
  series,
  yDomain = 'zero',
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: SeriesConfig[];
  /**
   * 'zero' (default) anchors the Y-axis at 0 — correct for bars, whose length
   * must encode magnitude. 'auto' scales to the data range with a little
   * padding — for index/level or %-change line charts (e.g. FAO ~90-160,
   * TÜFE-change ±%) a 0-baseline flattens the line into a meaningless band.
   */
  yDomain?: 'zero' | 'auto';
}) {
  /*
   * ─── GÖSTERGE NEDEN RECHARTS'IN DEĞİL, KENDİ HTML'İMİZ ──────────────────
   * Recharts'ın `<Legend>`'i ResponsiveContainer'ın İÇİNDE ve mutlak konumlu.
   * Kaç satır saracağı önceden bilinemediği için kod sabit bir bant ayırıyordu
   * (48 px). Ölçüldü: 4 serilik grafikte gösterge GERÇEKTE 96 px kaplıyor,
   * yani ayrılan bandın iki katı; konteyner sabit yükseklikte olduğu için
   * fark doğrudan çizim alanından çıkıyordu — 300 px'lik kutuda çizim yalnızca
   * 159 px (%53) kalıyordu. Grafiğin "küçük" görünmesinin sebebi buydu.
   *
   * Gösterge artık grafiğin ALTINDA, normal akışta bir HTML bloğu: kaç satır
   * sararsa sarsın kutuyu uzatıyor, çizim alanından yer çalmıyor. Tek serilik
   * grafiklerde hiç çizilmiyor — başlık zaten seriyi adlandırıyor.
   */
  const showLegend = series.length > 1;

  const [containerRef, containerWidth] = useContainerWidth(600);

  const isNarrow = containerWidth < 480;
  const fontSize = isNarrow ? 10 : 12;
  // Cap the number of visible X-axis ticks so date labels don't overlap —
  // `interval` is "skip this many ticks between shown ones" in Recharts.
  const maxTicks = Math.max(3, Math.floor(containerWidth / (isNarrow ? 60 : 80)));
  const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1);

  const hasRightAxis = series.some((s) => s.axis === 'right');

  /*
   * 'auto' için eksen sınırlarını veriye oturt — ama YUVARLAK sayılara.
   *
   * Ham min/max kullanılınca eksende "1.517 / 2.067 / 3.582" gibi rastgele
   * değerler çıkıyordu; okuyucu bunları kıyaslamak için zihinsel yuvarlama
   * yapmak zorunda kalıyor. Sınırlar 1/2/5×10ⁿ adımına oturtulunca eksen
   * "1.500 / 2.000 / 2.500 / 3.000 / 3.500" gibi okunur değerlere düşüyor.
   *
   * Çift eksenli grafikte her taraf ayrı hesaplanıyor.
   */
  const domainFor = (which: 'left' | 'right'): [number, number] | undefined => {
    if (yDomain !== 'auto') return undefined;
    const keys = series.filter((s) => (s.axis ?? 'left') === which).map((s) => s.key);
    const vals = data.flatMap((d) => keys.map((k) => Number(d[k]))).filter((n) => Number.isFinite(n));
    if (!vals.length) return undefined;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const aralik = max - min || Math.abs(max) || 1;

    // Yaklaşık 4 aralık hedefleyip adımı 1/2/5×10ⁿ ailesine yuvarlıyoruz.
    const kaba = aralik / 4;
    const us = 10 ** Math.floor(Math.log10(kaba));
    const oran = kaba / us;
    const adim = (oran >= 5 ? 5 : oran >= 2 ? 2 : 1) * us;

    return [Math.floor(min / adim) * adim, Math.ceil(max / adim) * adim];
  };

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={isNarrow ? 280 : 340}>
        <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey={xKey} interval={tickInterval} tick={{ fontSize }} tickMargin={6} />
          <YAxis
            yAxisId="left"
            tickFormatter={axisTick}
            tick={{ fontSize }}
            width={isNarrow ? 44 : 56}
            domain={domainFor('left')}
            allowDataOverflow={false}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={axisTick}
              tick={{ fontSize }}
              width={isNarrow ? 44 : 56}
              domain={domainFor('right')}
              allowDataOverflow={false}
            />
          )}
          <Tooltip
            formatter={(v: number) => numberFmt.format(v)}
            contentStyle={{ maxWidth: 240, fontSize, whiteSpace: 'normal', wordBreak: 'break-word' }}
            wrapperStyle={{ zIndex: 20 }}
            allowEscapeViewBox={{ x: false, y: true }}
          />
          {series.map((s, i) =>
            s.type === 'line' ? (
              <Line
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : (
              <Bar key={s.key} yAxisId={s.axis ?? 'left'} stackId={s.stack} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {showLegend && (
        <ul className="tvb-gosterge" style={{ fontSize }}>
          {series.map((s, i) => (
            <li key={s.key}>
              <span
                className="tvb-gosterge__renk"
                style={{ background: COLORS[i % COLORS.length] }}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
