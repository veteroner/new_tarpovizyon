import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BASIC_MENU, visibleMenu, type MenuCategory, type MenuItem } from '../../components/nav/menu';
import { basicAlanAdi } from '../../utils/surum';
import { isPlatform } from '../utils/platform';
import { useMod } from '../hooks/useMod';
import { ara as aramaYap } from '../../components/nav/arama';
import { useModelArama } from '../../components/nav/modelArama';
import { MikrofonDugmesi } from '../../components/ses/MikrofonDugmesi';
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
 * ─── PRO WEBDE VAR, MAĞAZA DERLEMESİNDE YOK ─────────────────────────────────
 * Liste bir süre YALNIZCA Basic gösteriyordu. Gerekçe mağaza sürümüydü: Pro
 * kupon kodlu abonelikle gelecek ve uygulamada görünmemeli.
 *
 * Ama bu kod aynı zamanda pro.tarpovizyon.com'u da besliyor. Orada dar ekranda
 * bu ekran açılıyor ve kullanıcı Pro alan adında Pro'ya HİÇ ulaşamıyordu:
 * ölçüldü, /m/explore'da `/tarpovizyon/...` bağlantısı sıfırdı, listedeki 84
 * satırın 84'ü de Basic sayfasıydı.
 *
 * Ayrım artık platformdan: Capacitor (mağaza derlemesi) yalnızca Basic görür,
 * web hem Pro hem Basic. Böylece abonelik kararı da bozulmuyor.
 */

export default function MobileExplorePage() {
  const navigate = useNavigate();
  const [ara, setAra] = useState('');

  /*
   * Gösterilecek menü.
   *
   * Pro menüsü YAYINDAKİ ANA ALAN ADINDA GİZLİ. Eskiden ölçüt "mağaza
   * derlemesi mi" idi ve web olan her yerde Pro menüsü açılıyordu — ama aynı
   * derleme www.tarpovizyon.com'u da sunuyor, yani ana alan adındaki
   * ziyaretçiye de Pro menüsü çıkıyordu. Sunucu tarafındaki
   * `/tarpovizyon/*` yönlendirmesi yalnızca doğrudan girişleri yakalıyor;
   * menüden tıklamak istemci tarafı yönlendirme olduğu için sunucuya hiç
   * uğramıyordu.
   *
   * Pro menüsü kapsamlı (Türkiye/Dünya); mobilde kapsam seçici olmadığı için
   * Türkiye alınıyor — mobil ana sayfa da Türkiye verisiyle açılıyor.
   */
  /*
   * ─── ÖLÇÜT: ALAN ADI + MOD, "YETKİ" DEĞİL ─────────────────────────────────
   * Eski hali `isPlatform('capacitor') || basicAlanAdi()` idi: mağaza
   * derlemesinde Pro tümüyle gizliydi, çünkü Pro'nun kupon koduyla geleceği
   * varsayılıyordu. Abonelik kurulduktan sonra o gerekçe geçersiz.
   *
   * Ölçütü doğrudan "aboneliği var mı" yapmak CAZİP ama YANLIŞ olurdu: para
   * duvarı şu an KAPALI (`PARA_DUVARI_AKTIF = false`), yani
   * pro.tarpovizyon.com'a giren anonim ziyaretçi Pro'yu bugün görebiliyor ve
   * kullanabiliyor. Menüyü yetkiye bağlamak, duvarı arayüz tarafından fiilen
   * açmak olurdu — hem karar verilmemiş bir şeyi yapmak, hem de vitrin sayfası
   * henüz yazılmadığı için tanıtım yolunu tümüyle kapatmak.
   *
   * Üç kural yan yana duruyor:
   *   · `basicAlanAdi()` → www/apex'te Pro saklı. DEĞİŞMİYOR; yayındaki
   *     Basic'in yerini Pro'nun almasına yol açan hata buydu.
   *   · uygulamada → modu kullanıcı seçiyor. Yetkisi yoksa `etkinMod` zaten
   *     'basic' döndürüyor, yani abonesi olmayan bugünküyle AYNI şeyi görüyor.
   *   · webde yetkili kullanıcı → seçtiği mod uygulanıyor; yetkisiz ziyaretçi
   *     bugünkü davranışı koruyor.
   */
  const { mod, proErisimi } = useMod();
  const uygulama = isPlatform('capacitor');
  const proGizli = basicAlanAdi() || (mod !== 'pro' && (uygulama || proErisimi));
  const menu: MenuCategory[] = useMemo(
    () => (proGizli ? BASIC_MENU : [...visibleMenu('turkey', true), ...BASIC_MENU]),
    [proGizli],
  );

  /* Sıralama listenin TAMAMINI görmeyi gerektiriyor, kategori kategori değil. */
  const tumOgeler = useMemo(() => menu.flatMap((k) => k.items), [menu]);

  const cikti = useMemo(() => aramaYap(tumOgeler, ara), [ara, tumOgeler]);

  /*
   * Model YALNIZCA yerel arama boş kaldığında soruluyor. Bir sonuç varsa
   * anında, bedava ve kesin olan o; modele sormanın hiçbir faydası yok.
   */
  const yerelBos = !cikti.bos && cikti.sonuclar.length === 0;
  const model = useModelArama(tumOgeler, ara, yerelBos);

  const toplam = cikti.bos
    ? tumOgeler.length
    : cikti.sonuclar.length;

  /*
   * Satırlarda ikon YOK. Kategorinin ikonunu her satırda tekrarlamak on tane
   * özdeş yeşil kare demekti — hiçbir satırı diğerinden ayırmıyor, grup
   * başlığı zaten kategoriyi söylüyordu. iOS Ayarlar da eşdeğer satırlardan
   * oluşan grupları ikonsuz bırakır.
   *
   * Alt satırda BÖLÜM adı: "Ekonomik Göstergeler ve Maliyet Unsurları" hem Çiğ
   * Süt hem Kırmızı Et bölümünde var ve iki satır birebir aynı görünüyordu.
   */
  const satir = (item: MenuItem) => {
    /*
     * Basic öğelerinde yol `any`de; Pro öğelerinde kapsama göre `turkey`/
     * `world` alanında olabiliyor. Yolu olmayan öğe atlanıyor — eskiden
     * `item.any!` ile zorlanıyordu ve Pro öğesi gelince `undefined` yola
     * gidiliyordu.
     */
    const yol = item.any ?? item.turkey ?? item.world;
    if (!yol) return null;
    return <ListRow key={yol} title={item.label} subtitle={item.bolum} onClick={() => navigate(yol)} />;
  };

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
          {/* Konuşulan metin doğrudan aramaya yazılıyor; süzme zaten anlık. */}
          <MikrofonDugmesi onMetin={setAra} onAraMetin={setAra} />
        </div>

        {/*
          * GEZİNİRKEN öbekli, ARARKEN düz liste.
          *
          * Sonuçlar artık puana göre sıralı ve öbekleme bu sıralamayı bozuyordu:
          * en iyi eşleşme, menüde daha aşağıdaki bir kategoride kalıyorsa
          * ekranda da aşağıda kalıyor. Arama sonucunda kategori zaten bilgi
          * taşımıyor — hangi bölümden geldiği alt satırda yazıyor.
          */}
        {cikti.bos
          ? menu.map((kat) => (
            <ListGroup key={kat.title} header={kat.title}>
              {kat.items.map(satir)}
            </ListGroup>
          ))
          : cikti.sonuclar.length > 0 && (
            <ListGroup header={`“${ara.trim()}” için ${cikti.sonuclar.length} sonuç`}>
              {cikti.sonuclar.map(satir)}
            </ListGroup>
          )}

        {/*
          * Boş ekran yerine en yakın başlıklar. Sonuç yokken kullanıcı verinin
          * uygulamada olmadığını sanıp vazgeçiyordu; çoğu zaman tek harf
          * eksikti.
          */}
        {yerelBos && (
          <>
            <p style={{ color: 'var(--ios-label-3)', padding: '24px 4px 4px', textAlign: 'center' }}>
              “{ara.trim()}” için sonuç yok.
            </p>
            {cikti.oneriler.length > 0 && (
              <ListGroup header="Bunu mu demek istediniz?">
                {cikti.oneriler.map(satir)}
              </ListGroup>
            )}
            {/*
              * Model katmanı en altta ve AYRI başlıkla: yerel arama kesin,
              * bu bir tahmin. İkisini aynı listede göstermek, kullanıcının
              * hangisine ne kadar güveneceğini bilememesi demekti.
              */}
            {model.araniyor && (
              <p style={{ color: 'var(--ios-label-3)', padding: '12px 4px', textAlign: 'center', fontSize: 13 }}>
                Yapay zekâya soruluyor…
              </p>
            )}
            {model.sonuc && (
              <ListGroup header="Yapay zekânın önerisi">
                <ListRow
                  title={model.sonuc.ad}
                  subtitle="Aradığınız bu olabilir"
                  onClick={() => navigate(model.sonuc!.yol)}
                />
              </ListGroup>
            )}
          </>
        )}
      </div>
    </>
  );
}
