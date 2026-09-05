import { useMemo } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, LabelList, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from './Card';
import { AXIS, GRID, STATUS } from '../../utils/chartColors';
import { yuzde } from '../../utils/sayi';

/**
 * Yıldan yıla değişim grafiği.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Sayfaların tamamı SEVİYE gösteriyordu: üretim şu kadar ton, kovan şu kadar
 * adet. Kullanıcının sorduğu soru ise fark: "geçen yıla göre ne oldu?" Bu bilgi
 * yalnızca KPI kartındaki tek bir yüzdede vardı, grafikte hiç yoktu.
 *
 * Seviye grafiğinden farkı gözle çıkarmak zordur; 21–23 milyon ton arasında
 * gezinen bir seride 2024→2025'teki %4,9 düşüş, seviye eğrisinde birkaç piksel
 * eder. Değişimi ayrı çizince aynı düşüş grafiğin yarısı kadar yer kaplar.
 *
 * ─── TASARIM KARARLARI ──────────────────────────────────────────────────────
 * - ÇUBUK, çizgi değil: her yıl bağımsız bir olay; aradaki çizgi "süreklilik"
 *   ima eder ve yanıltır.
 * - Eksen SIFIRI İÇERİR ve sıfır çizgisi çizilir. Seviye grafiklerinde tabanı
 *   kırpmak doğru, burada değil: sıfır bu ölçünün anlamlı eşiği.
 * - Renk yönü taşır ama TEK BAŞINA taşımaz — değer her çubuğun ucunda yazılı.
 */

export type DegisimNoktasi = { etiket: string | number; deger: number };

type Props = {
  /** Seviye serisi: sırayla, eskiden yeniye. */
  seri: { etiket: string | number; deger: number }[];
  baslik?: string;
  not?: string;
  /** Kaç dönem gösterilsin (sondan). */
  adet?: number;
  span?: number;
  yukseklik?: number;
  action?: React.ReactNode;
};

/** Ardışık noktalar arası yüzde değişim. Sıfır/eksi tabanlar atlanıyor. */
export function degisimSerisi(
  seri: { etiket: string | number; deger: number }[],
): DegisimNoktasi[] {
  const cikti: DegisimNoktasi[] = [];
  for (let i = 1; i < seri.length; i++) {
    const onceki = seri[i - 1].deger;
    if (!(onceki > 0)) continue;
    cikti.push({ etiket: seri[i].etiket, deger: ((seri[i].deger - onceki) / onceki) * 100 });
  }
  return cikti;
}

export function YillikDegisim({
  seri, baslik = 'Yıllık değişim', not, adet = 12, span, yukseklik = 260, action,
}: Props) {
  const veri = useMemo(() => degisimSerisi(seri).slice(-adet), [seri, adet]);
  if (veri.length < 2) return null;

  return (
    <ChartCard
      title={baslik}
      note={not ?? 'Bir önceki döneme göre yüzde değişim. Sıfır çizgisi büyüme ile küçülmeyi ayırır.'}
      span={span}
      action={action}
    >
      <ResponsiveContainer width="100%" height={yukseklik}>
        <ComposedChart data={veri} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="etiket" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} stroke={AXIS} />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickFormatter={(v: number) => yuzde(v, 0)}
            /* Sıfır her zaman içeride; uçlarda %15 pay bırakılıyor ki
               etiketler kartın kenarına yapışmasın. */
            domain={([min, max]: [number, number]) => [
              Math.min(0, min * 1.15), Math.max(0, max * 1.15),
            ]}
            width={54}
            stroke={AXIS}
          />
          <Tooltip
            formatter={(v: number) => [yuzde(v, 1, true), 'Değişim']}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <ReferenceLine y={0} stroke={AXIS} />
          <Bar dataKey="deger" name="Değişim" radius={[4, 4, 0, 0]}>
            {veri.map((d, i) => (
              <Cell key={i} fill={d.deger >= 0 ? STATUS.iyi : STATUS.kritik} />
            ))}
            {/* Renk tek başına anlam taşımasın: değer çubuğun ucunda yazılı. */}
            <LabelList
              dataKey="deger"
              position="top"
              formatter={(v: number) => yuzde(v, 0, true)}
              style={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
