import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BASIC_MENU } from '../../components/nav/menu';
import { eslesiyorMu, sorguKelimeleri } from '../../components/nav/arama';
import { NavBar, ListGroup, ListRow } from '../components/ui/IosList';

/**
 * Keşfet — veri sayfalarının listesi ve arama.
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
 * ─── NEDEN YALNIZCA BASIC ───────────────────────────────────────────────────
 * Liste eskiden Basic'in yanına Pro sayfalarını da (`visibleMenu`) ekliyordu.
 * Pro ayrı bir sürümde, kupon kodlu abonelikle gelecek; bu yayında uygulamanın
 * hiçbir yerinde görünmemesi gerekiyor. Mobil ana sayfa zaten yalnızca
 * `BASIC_MENU` okuyor, yani Pro'nun mobile sızdığı TEK yer burasıydı.
 *
 * Kapsam (Türkiye/Dünya) seçicisi de bu yüzden kalktı: yalnızca Pro
 * sayfalarını süzüyordu, Basic kapsamsız. Pro gidince süzecek bir şey kalmadı
 * ve kontrol hiçbir işe yaramayan bir düğmeye dönüşüyordu.
 */

export default function MobileExplorePage() {
  const navigate = useNavigate();
  const [ara, setAra] = useState('');

  /* Karşılığı olmayan kelimeleri elemek listenin TAMAMINI görmeyi gerektiriyor. */
  const tumOgeler = useMemo(() => BASIC_MENU.flatMap((k) => k.items), []);

  const kategoriler = useMemo(() => {
    /*
     * Sorgu bir kez çözümleniyor, her öğe için değil.
     * Eşleştirme kurallarının gerekçesi `nav/arama.ts` başında.
     */
    const sorgu = sorguKelimeleri(tumOgeler, ara);
    if (sorgu === null) return BASIC_MENU;
    /*
     * Boş dizi "hiçbir kelime tutmadı" demek. Bunu ayrıca yakalamak şart:
     * `[].every(...)` true döner, yani süzgeç her şeyi geçirirdi — kullanıcı
     * anlamsız bir şey yazınca 84 sayfanın tamamını görürdü.
     */
    if (!sorgu.length) return [];

    const suz = (hepsi: boolean) => BASIC_MENU
      .map((k) => ({ ...k, items: k.items.filter((i) => eslesiyorMu(i, sorgu, hepsi)) }))
      .filter((k) => k.items.length > 0);

    /* Önce katı eşleşme; hiç sonuç yoksa tek kelime yetsin. Gerekçe: arama.ts. */
    const kati = suz(true);
    return kati.length ? kati : suz(false);
  }, [ara, tumOgeler]);

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

        {/*
          * Satırlarda ikon YOK. Kategorinin ikonunu her satırda tekrarlamak
          * on tane özdeş yeşil kare demekti — hiçbir satırı diğerinden
          * ayırmıyor, grup başlığı zaten kategoriyi söylüyordu. iOS Ayarlar da
          * eşdeğer satırlardan oluşan grupları ikonsuz bırakır.
          */}
        {kategoriler.map((kat) => (
          <ListGroup key={kat.title} header={kat.title}>
            {kat.items.map((item) => {
              // BASIC_MENU her öğeye `any` yazıyor — Basic sayfaları kapsamsız.
              const yol = item.any!;
              return (
                /*
                 * Alt satırda BÖLÜM adı. "Basic · Hayvancılık" grubunda
                 * "Ekonomik Göstergeler ve Maliyet Unsurları" İKİ KEZ geçiyordu
                 * (Çiğ Süt ve Kırmızı Et) ve iki satır birebir aynı görünüyordu;
                 * hangisine bastığın ancak sayfa açılınca anlaşılıyordu.
                 * Aramada da aynı sorun vardı: eşleşen satırlar ayırt edilemiyordu.
                 */
                <ListRow key={yol} title={item.label} subtitle={item.bolum} onClick={() => navigate(yol)} />
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
