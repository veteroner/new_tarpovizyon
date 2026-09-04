import { useEffect, useRef } from 'react';
import { useSectionTab, type SectionTab } from './bolumSekmeleri';


type Props = {
  tabs: SectionTab[];
  /** URL'de kullanılacak sorgu anahtarı. Aynı sayfada birden fazla sekme
   *  şeridi olursa çakışmasın diye dışarıdan verilebiliyor. */
  param?: string;
};

/**
 * Uzun sayfaları bölümlere ayıran sekme şeridi.
 *
 * Süt sayfası mobilde 16.864 px — 21 ekran boyu. Bütün bölümler alt alta
 * dizildiği için kullanıcı aradığı grafiğe ancak kaydırarak ulaşıyor.
 * Bölümleri sekmeye almak hem sayfayı kısaltıyor hem de ekran dışı
 * bölümlerin Recharts SVG'leri hiç çizilmediği için ilk açılışı hızlandırıyor.
 *
 * Aktif sekme URL'de tutuluyor (`?bolum=uretim`): paylaşılan bağlantı doğru
 * bölümü açıyor, tarayıcı geri tuşu sekmeler arasında çalışıyor.
 */
export default function SectionTabs({ tabs, param = 'bolum' }: Props) {
  const { active, setActive } = useSectionTab(tabs, param);
  const seritRef = useRef<HTMLDivElement>(null);

  // Aktif sekme dar ekranda şeridin dışında kalabiliyor; görünür alana çek.
  useEffect(() => {
    const el = seritRef.current?.querySelector<HTMLElement>('[data-aktif="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div
      ref={seritRef}
      role="tablist"
      aria-label="Sayfa bölümleri"
      className="section-tabs"
    >
      {tabs.map(t => {
        const aktif = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={aktif}
            data-aktif={aktif}
            className={`section-tab${aktif ? ' is-active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
