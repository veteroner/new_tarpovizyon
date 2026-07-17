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

/** Greedy word-wrap into at most `maxLines` lines of ~`charsPerLine` chars;
 *  the last line gets an ellipsis if words remain unplaced. Used for
 *  category-axis tick labels that are too long to fit a mobile-width
 *  column on a single line (full text stays available via a native
 *  SVG <title> on the tick for on-hover/long-press discovery). */
export function wrapLabel(text: string, charsPerLine: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  const remainingWords = words.join(' ').length > lines.join(' ').length;
  if (lines.length === maxLines && remainingWords) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > charsPerLine - 1 ? `${last.slice(0, charsPerLine - 1)}…` : `${last}…`;
  }
  return lines;
}
