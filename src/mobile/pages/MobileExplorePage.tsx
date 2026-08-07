import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  visibleMenu, itemPath, KAPSAM_ADI, type Kapsam,
} from '../../components/nav/menu';
import { NavBar, ListGroup, ListRow, Segmented } from '../components/ui/IosList';

/**
 * Keşfet — tüm veri sayfalarının listesi.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Bu sayfa kendi menü ağacını taşıyordu: 40+ modül, her biri kendi ikon rengi
 * ve arka plan tonuyla elle yazılmış. Panoda menüyü tek kaynağa indirdikten
 * sonra (components/nav/menu.ts) burası ÜÇÜNCÜ bir tanım hâline gelmişti —
 * bir sayfa panoda görünüp burada görünmeyebiliyordu.
 *
 * Artık aynı kaynağı okuyor. Yeni bir sayfa menüye eklendiğinde mobilde de
 * kendiliğinden çıkıyor.
 *
 * Kapsam (Dünya/Türkiye) segment kontrolüyle — masaüstündeki gibi menüyü
 * baştan aşağı değiştirmiyor, aynı listenin kapsamını değiştiriyor.
 */

const KAPSAMLAR = [
  { id: 'turkey' as Kapsam, label: KAPSAM_ADI.turkey },
  { id: 'world' as Kapsam, label: KAPSAM_ADI.world },
];

export default function MobileExplorePage() {
  const navigate = useNavigate();
  const [kapsam, setKapsam] = useState<Kapsam>('turkey');
  const [ara, setAra] = useState('');

  const kategoriler = useMemo(() => {
    const tum = visibleMenu(kapsam);
    const q = ara.trim().toLocaleLowerCase('tr');
    if (!q) return tum;
    return tum
      .map((k) => ({ ...k, items: k.items.filter((i) => i.label.toLocaleLowerCase('tr').includes(q)) }))
      .filter((k) => k.items.length > 0);
  }, [kapsam, ara]);

  const toplam = kategoriler.reduce((n, k) => n + k.items.length, 0);

  return (
    <>
      <NavBar title="Keşfet" subtitle={`${toplam} veri sayfası`} />

      <div className="ios-scroll">
        {/* Arama — HIG: arama üst tarafta, kolay ulaşılır. */}
        <div className="ios-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Sayfa ara"
            aria-label="Sayfa ara"
          />
        </div>

        <div style={{ marginTop: 10 }}>
          {/* setState'i doğrudan geçmek T'yi SetStateAction'a kaydırıyor. */}
          <Segmented options={KAPSAMLAR} value={kapsam} onChange={(k) => setKapsam(k)} label="Kapsam" />
        </div>

        {/*
          * Satırlarda ikon YOK. Kategorinin ikonunu her satırda tekrarlamak
          * on tane özdeş yeşil kare demekti — hiçbir satırı diğerinden
          * ayırmıyor, grup başlığı zaten kategoriyi söylüyordu. iOS Ayarlar da
          * eşdeğer satırlardan oluşan grupları ikonsuz bırakır.
          */}
        {kategoriler.map((kat) => (
          <ListGroup key={kat.title} header={kat.title}>
            {kat.items.map((item) => {
              const yol = itemPath(item, kapsam)!;
              return (
                <ListRow key={yol} title={item.label} onClick={() => navigate(yol)} />
              );
            })}
          </ListGroup>
        ))}

        {!kategoriler.length && (
          <p style={{ color: 'var(--ios-label-3)', padding: '28px 4px', textAlign: 'center' }}>
            “{ara}” için sonuç yok.
          </p>
        )}
      </div>
    </>
  );
}
