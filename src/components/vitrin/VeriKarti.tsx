import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { bicimle, type Kart } from './vitrinVerisi';

/**
 * Vitrindeki canlı veri kartı.
 *
 * Kart bir DÜĞME: tıklanınca verinin geldiği asıl sayfaya götürüyor. Daha
 * önce kartlar yalnızca bakılan şeylerdi; artık platforma giriş noktası.
 *
 * Sparkline yalnızca elde seri VARSA çiziliyor. Bitkisel bülteni tek yıl
 * verdiği için o kartlarda grafik yok — uydurma bir çizgi koymaktansa boş
 * bırakmak doğru; kartların yüksekliği zaten `items-stretch` ile eşitleniyor.
 */

/** Seriden sparkline yolu üretir. */
function yol(seri: number[], g = 240, y = 52, pad = 4) {
  if (seri.length < 2) return null;
  const lo = Math.min(...seri);
  const hi = Math.max(...seri);
  const aralik = hi - lo || 1;
  const nk = seri.map((v, i) => {
    const x = pad + (i * (g - 2 * pad)) / (seri.length - 1);
    const yy = y - pad - ((v - lo) / aralik) * (y - 2 * pad);
    return [x, yy] as const;
  });
  const cizgi = 'M' + nk.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L');
  const alan = `${cizgi} L${nk[nk.length - 1][0].toFixed(1)},${y} L${nk[0][0].toFixed(1)},${y} Z`;
  return { cizgi, alan, son: nk[nk.length - 1] };
}

export function VeriKarti({ kart, renk }: { kart: Kart; renk: string }) {
  const navigate = useNavigate();
  const { sayi, birim } = bicimle(kart);
  const c = yol(kart.seri);

  return (
    <button
      type="button"
      onClick={() => navigate(kart.yol)}
      /*
       * `w-full h-full` şart: kart bir <button>, ızgara hücresi ise onu saran
       * motion.div. Düğme varsayılan olarak İÇERİĞİ KADAR genişliyor, hücreyi
       * doldurmuyordu — "Sebzeler" 180px, "Tahıllar ve diğer bitkisel
       * ürünler" 311px çıkıyor, aynı satırdaki üç kart farklı enlerde
       * duruyordu (ölçüldü).
       */
      className="group flex h-full min-h-[178px] w-full flex-col rounded-[18px] border border-[var(--tv-cizgi-ince)]
                 bg-[var(--tv-kart)] p-5 text-left shadow-[var(--tv-golge)] transition-all
                 hover:-translate-y-0.5 hover:shadow-[var(--tv-golge-kart)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-vurgu)]
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tv-zemin-2)]"
    >
      <span className="flex items-start gap-2">
        <span
          className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
          style={{ background: renk }}
          aria-hidden="true"
        />
        <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.09em] text-[var(--tv-ikincil)]">
          {kart.etiket}
        </span>
        <ArrowUpRight
          size={15}
          className="ml-auto shrink-0 text-[var(--tv-ikincil)] opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </span>

      <span className="mt-3 flex items-baseline gap-1.5 tabular-nums">
        <span className="text-[2.15rem] font-semibold leading-none tracking-[-0.03em] text-[var(--tv-murekkep)]">
          {sayi}
        </span>
        {birim && <span className="text-[13px] text-[var(--tv-ikincil)]">{birim}</span>}
      </span>

      <span className="mt-1 text-[12px] text-[var(--tv-ikincil)]">{kart.alt}</span>

      <span className="mt-auto block pt-4">
        {c ? (
          <svg
            width="100%"
            height="52"
            viewBox="0 0 240 52"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${kart.etiket} eğilimi`}
          >
            <path d={c.alan} fill={renk} opacity="0.1" />
            <path
              d={c.cizgi}
              fill="none"
              stroke={renk}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={c.son[0]} cy={c.son[1]} r="3" fill={renk} />
          </svg>
        ) : (
          <span className="block h-[52px]" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
