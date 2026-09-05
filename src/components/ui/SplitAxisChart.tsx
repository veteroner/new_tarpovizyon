import { ResponsiveContainer, ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import type { ReactNode } from 'react';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';
import './splitAxis.css';

/**
 * Ana grafik + altında türetilmiş seri şeridi.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Panoda 29 ÇİFT EKSENLİ grafik vardı (bir grafikte iki farklı y ölçeği).
 * Bu, veri görselleştirmedeki en yaygın hata: iki ölçeğin hizası KEYFİDİR,
 * dolayısıyla grafik veride olmayan bir ilişki uydurur. İki çizginin
 * kesiştiği nokta hiçbir şey ifade etmez ama okuyucu "işte burada eşitlendi"
 * diye okur.
 *
 * Çoğu vakada sağ eksendeki seri zaten SOLDAKİLERDEN TÜRETİLMİŞ:
 *   exp/imp + denge(=fark) · kentsel/kırsal + kentleşme oranı(%)
 *   üretim + değişim(%) · erkek/kadın + kadın oranı
 * Türetilmiş seriyi ikinci eksene koymak yerine, aynı x eksenini paylaşan
 * ince bir şerit olarak altına koyuyoruz: ilişki korunuyor, sahte kesişme
 * ortadan kalkıyor.
 *
 * Ölçüler gerçekten bağımsızsa (dolar kuru vs yem fiyatı) bu bileşen DEĞİL,
 * iki ayrı kart doğru çözümdür.
 */

export type SplitAxisChartProps = {
  data: Record<string, unknown>[];
  /** Ortak x ekseni alanı. */
  xKey: string;
  /** Ana grafiğin içeriği (Bar/Line/Area) — yAxisId KULLANMA. */
  children: ReactNode;
  /** Şeritteki türetilmiş serinin alanı. */
  stripKey: string;
  stripLabel: string;
  stripColor?: string;
  /** Şerit değerini biçimlendir (ör. yüzde). */
  stripFormat?: (v: number) => string;
  height?: number;
  stripHeight?: number;
  /** Ana eksen biçimlendirici. */
  yFormat?: (v: number) => string;
  xProps?: Record<string, unknown>;
};

export function SplitAxisChart({
  data, xKey, children, stripKey, stripLabel,
  stripColor = 'var(--series-4)', stripFormat = (v) => String(v),
  height = 260, stripHeight = 84, yFormat, xProps = {},
}: SplitAxisChartProps) {
  const eksenStili = { fill: 'var(--text-secondary)', fontSize: 11 };

  return (
    <div className="ui-split-chart">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--viz-grid)" />
          {/* Ana grafikte x etiketi yok — şeritle paylaşıyor, iki kez yazmak
              dikey yeri boşa harcıyor ve iki ayrı grafik izlenimi veriyor. */}
          <XAxis dataKey={xKey} tick={false} axisLine={false} height={0} {...xProps} />
          <YAxis tick={eksenStili} width={46} tickFormatter={yFormat} domain={LINE_Y_DOMAIN} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          {children}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="ui-split-strip-label">{stripLabel}</div>

      <ResponsiveContainer width="100%" height={stripHeight}>
        <ComposedChart data={data} margin={{ top: 0, right: 8, left: 4, bottom: 4 }} syncId="split">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--viz-grid)" vertical={false} />
          <XAxis dataKey={xKey} tick={eksenStili} {...xProps} />
          {/* Türetilmiş seride okunan şey eğim; taban 0'a çakılırsa düzleşir. */}
          <YAxis domain={LINE_Y_DOMAIN} tick={eksenStili} width={46} tickFormatter={stripFormat} />
          <Tooltip
            formatter={(v: number) => [stripFormat(v), stripLabel]}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <Line type="monotone" dataKey={stripKey} stroke={stripColor}
            strokeWidth={2} dot={false} name={stripLabel} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
