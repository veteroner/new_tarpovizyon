/**
 * Bölüm sekmesi tipi ve kancası.
 *
 * `SectionTabs.tsx`'ten AYRILDI: bir dosya hem bileşen hem başka şey dışa
 * aktarınca Vite'ın hızlı yenilemesi (fast refresh) o dosyada çalışmıyor —
 * her düzenlemede sayfa baştan yükleniyor. Aynı sebeple `nav/kabukOlaylari.ts`
 * de ayrılmıştı.
 */
import { useSearchParams } from 'react-router-dom';

export type SectionTab = {
  id: string;
  label: string;
};


export function useSectionTab(tabs: SectionTab[], param = 'bolum') {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(param);
  const gecerli = tabs.some(t => t.id === raw);
  const active = gecerli ? (raw as string) : tabs[0]?.id;

  const setActive = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(param, id);
    setSearchParams(next, { replace: false });
  };

  return { active, setActive };
}
