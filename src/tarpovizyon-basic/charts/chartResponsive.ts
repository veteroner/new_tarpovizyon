import { useEffect, useRef, useState } from 'react';

/** Tracks a container's rendered width via ResizeObserver so charts can
 *  reflow (axis width, font size, legend position) instead of just
 *  shrinking everything proportionally when squeezed onto mobile. */
export function useContainerWidth(initial = 400) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
