import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight, Globe, MapPin, Search,
} from 'lucide-react';
import {
  MENU, BASIC_MENU, locate, scopeSwitchTarget, hasScope,
  KAPSAM_ADI, type Kapsam,
} from './nav/menu';
import { KomutPaleti } from './nav/KomutPaleti';
import { paletiAc } from './nav/kabukOlaylari';
import { HizliErisim } from './nav/HizliErisim';
import { KardesGecisi } from './nav/KardesGecisi';
import { AsistanPanosu } from './nav/AsistanPanosu';
import '../styles/TarpoShell.css';
import './TarpoShell.breadcrumb.css';

/**
 * TarpoVizyon kabuğu — cam üst çubuk, kapsam anahtarı, konum izi.
 *
 * ─── KENAR MENÜSÜ KALDIRILDI ────────────────────────────────────────────────
 * 134 sayfayı bir listeye dizmek gezinmeyi çözmüyordu, listeyi düzenli
 * gösteriyordu. Yerine kırılım geçti:
 *
 *   kapsam giriş sayfası → bölüm sayfası → veri sayfası
 *
 * ve yanına dönüş araçları: komut paleti (⌘K), hızlı erişim şeridi
 * (sabitlenenler + son bakılanlar), kardeş geçişi, tıklanabilir kırıntı.
 * Menü SÖKÜLMEDEN ÖNCE bunların hepsi yazıldı ve ölçüldü; sıra tersi olsaydı
 * sayfaların çoğu bir süre erişilemez kalırdı.
 *
 * Alt gezinme çubuğu ve mobil sayfa da gitti: bu kabuk yalnızca masaüstünde
 * çiziliyor (DataShell dar ekranda MobileDataShell'i seçiyor), o bloklar
 * yalnızca dar masaüstü penceresinde görünüyordu.
 *
 * ─── KAPSAM ANAHTARI KONUYU KORUYOR ─────────────────────────────────────────
 * Eskiden Dünya ve Türkiye AYRI menü ağaçlarıydı (27 ve 38 sayfa, ortak 2);
 * kapsam değişince menünün %97'si siliniyor ve kullanıcı kök sayfaya
 * atılıyordu. Artık menü tek (bkz. nav/menu.ts): "Tahıllar"dayken Dünya'ya
 * basınca dünya tahıllarına gidiyorsun. 18 konuda bu eşleşme var.
 */
export default function TarpoShell() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Kısayol rozeti platforma göre: Mac'te ⌘K, diğerlerinde Ctrl+K.
     Yanlış tuşu göstermek kısayolu hiç göstermemekten kötü. */
  const macMi = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const kapsamFromPath: Kapsam =
    location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';
  const [kapsam, setKapsam] = useState<Kapsam>(kapsamFromPath);
  useEffect(() => { setKapsam(kapsamFromPath); }, [kapsamFromPath]);

  const konum = useMemo(
    () => locate(location.pathname, location.search),
    [location.pathname, location.search],
  );

  /*
   * Bölüm sayfasındaysak hangi kategori? `locate()` bunu bulamaz — bölüm
   * sayfaları menü ÖĞESİ değil, kategorinin kendisi. Kırıntı bu sayfada da
   * görünmeli, yoksa kullanıcı kırılımın ortasında konumsuz kalıyor.
   */
  const bolumKategori = useMemo(() => {
    const m = location.pathname.match(/^\/tarpovizyon\/(?:turkey|world)\/bolum\/([^/]+)$/);
    return m ? [...MENU, ...BASIC_MENU].find((k) => k.id === m[1]) : undefined;
  }, [location.pathname]);

  /*
   * Kırıntı üst çubuğun altına yapışıyor. Offset'i CSS'e SABİT yazmak
   * kırılgan: üst çubuk dar ekranda sarıp 56px'ten büyüyor ve iki çubuk
   * üst üste biniyor. Ölçüp değişkene yazıyoruz.
   */
  useEffect(() => {
    const bas = document.querySelector<HTMLElement>('.tarpo-topbar');
    if (!bas) return;
    const olc = () => document.documentElement.style.setProperty(
      '--tarpo-ust-h', `${Math.round(bas.getBoundingClientRect().height)}px`,
    );
    olc();
    const go = new ResizeObserver(olc);
    go.observe(bas);
    return () => go.disconnect();
  }, []);

  /** Kapsam değiştir — mümkünse aynı konuda kal. */
  const kapsamDegistir = (yeni: Kapsam) => {
    const { path } = scopeSwitchTarget(location.pathname, location.search, yeni);
    setKapsam(yeni);
    navigate(path);
  };

  /** Aktif öğenin diğer kapsamda karşılığı var mı? Yoksa düğmeyi işaretle. */
  const digerKapsam: Kapsam = kapsam === 'world' ? 'turkey' : 'world';
  const konuDigerdeVar = konum ? hasScope(konum.item, digerKapsam) : true;

  return (
    <div className="tarpo-shell">
      <header className="tarpo-topbar">
       <div className="tarpo-topbar-ic">
        {/*
          * Marka: logo + ad + Pro rozeti tek düğme. Eskiden burada "Programlar"
          * ve "TARPOL" diye İKİ ayrı düğme vardı; ikisi de yukarı çıkıyordu ve
          * hangisinin nereye gittiği belirsizdi. Tek düğme, tek hedef.
          */}
        <button
          className="tarpo-marka"
          onClick={() => navigate(`/tarpovizyon/${kapsam}`)}
          title="Kapsam giriş sayfası"
        >
          <span className="tarpo-marka-im" aria-hidden="true">T</span>
          <span className="tarpo-marka-ad">TarpoVizyon</span>
          <span className="tarpo-marka-rozet">Pro</span>
        </button>

        <div className="tarpo-mode-toggle" role="group" aria-label="Kapsam">
          {(['world', 'turkey'] as Kapsam[]).map((k) => {
            const Icon = k === 'world' ? Globe : MapPin;
            const bosalacak = k === digerKapsam && !konuDigerdeVar;
            return (
              <button
                key={k}
                className={`tarpo-mode-btn ${kapsam === k ? 'active' : ''}`}
                onClick={() => kapsamDegistir(k)}
                /* Bu konunun o kapsamda karşılığı yoksa kullanıcı tıklamadan
                   bilsin: sessizce genel bakışa atılmak şaşırtıcı. */
                title={bosalacak
                  ? `${konum?.item.label ?? 'Bu sayfa'} ${KAPSAM_ADI[k]} kapsamında yok — genel bakışa gidilir`
                  : KAPSAM_ADI[k]}
              >
                <Icon size={14} /> {KAPSAM_ADI[k]}
                {bosalacak && <span className="tarpo-mode-warn" aria-hidden="true">•</span>}
              </button>
            );
          })}
        </div>

        {/*
          * Paletin GÖRÜNÜR izi. Yalnızca ⌘K ile açılabilseydi klavye
          * kısayolunu bilmeyen kullanıcı için hiç var olmayacaktı;
          * bu alan da zaten boş duruyordu.
          */}
        <div className="tarpo-topbar-right">
          <button className="tarpo-ara-btn" onClick={paletiAc} title="Sayfa ara (⌘K / Ctrl+K)">
            <Search size={14} />
            <span>Ara</span>
            <kbd>{macMi ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          {/* Araçlar kapsamdan bağımsız: hesaplayan/tahmin eden ekranlar
              kırılım yolunda değil, bu yüzden başlıkta kendi düğmesi var. */}
          <button
            className="tarpo-ust-dg"
            onClick={() => navigate(`/tarpovizyon/${kapsam}/bolum/araclar`)}
          >
            Araçlar
          </button>
        </div>
       </div>
      </header>

      {/*
        * Konum izi. 61 sayfalık, 3 seviyeli bir hiyerarşide hiç yoktu;
        * kullanıcı nerede olduğunu yalnızca menüye bakarak anlıyordu.
        */}
      {(konum || bolumKategori) && (
        <nav className="tarpo-breadcrumb" aria-label="Konum">
          <button onClick={() => navigate(
            kapsam === 'world' ? '/tarpovizyon/world' : '/tarpovizyon/turkey')}>
            {KAPSAM_ADI[kapsam]}
          </button>
          <ChevronRight size={13} aria-hidden="true" />
          {/*
            * Kategori segmenti artık DÜZ METİN DEĞİL. Bölüm sayfası (kırılımın
            * 1. basamağı) yapılana kadar gidecek bir yeri yoktu; şimdi var.
            */}
          {konum ? (
            <>
              <button onClick={() => navigate(
                `/tarpovizyon/${kapsam}/bolum/${konum.kategori.id}`)}>
                {konum.kategori.title}
              </button>
              <ChevronRight size={13} aria-hidden="true" />
              <strong aria-current="page">{konum.item.label}</strong>
            </>
          ) : (
            /* Bölüm sayfasındayız: kategori son segment. */
            <strong aria-current="page">{bolumKategori!.title}</strong>
          )}
        </nav>
      )}

      {/*
        * Hızlı erişim: kullanıcının sabitledikleri + son bakılanlar.
        * Kenar çubuğunun ikinci kopyası DEĞİL — orada tüm menü var, burada
        * yalnızca kişinin kendi 8-10 sayfası. Boşken hiç render edilmiyor.
        */}
      <HizliErisim />

      <main className="tarpo-content">
        {/*
          * Kardeş geçişi: aynı bölümün diğer konuları. Kabukta DEĞİL,
          * içerikte — üst çubuk + kırıntı + hızlı erişim zaten üç şerit;
          * dördüncü YAPIŞKAN şerit ekranın dörtte birini gezinmeye
          * verirdi. Burada sayfayla birlikte kayıyor.
          */}
        <KardesGecisi />
        {/*
          * `key` yola bağlı: rota değişince sayfa YENİDEN KURULUYOR.
          *
          * Birçok sayfa aynı bileşenin farklı prop'larla kullanılmış hâli
          * (ör. dünya bitkisel sayfalarının hepsi ProductionPage). React
          * bunlarda bileşeni sökmeyip yalnızca yeniden çiziyor; başlangıç
          * değeri prop'tan okunan durumlar ise ilk kurulumdaki değerinde
          * kalıyordu. Sonuç: Tahıllar'dan Sebzeler'e geçince adres ve
          * başlık değişiyor, İÇERİK eskisi kalıyordu.
          */}
        <Outlet key={location.pathname} />
      </main>

      {/*
        * Komut paleti (⌘K). Kabuğun EN SONUNDA duruyor ki her Pro sayfasında
        * açılabilsin; kendi görünürlüğünü kendi yönetiyor, kapalıyken hiçbir
        * şey render etmiyor.
        *
        * Kapsamı ayarlamıyor: kapsam yoldan türetiliyor (`kapsamFromPath`),
        * yani palet `/tarpovizyon/world/...` adresine gidince kabuk zaten
        * Dünya'ya geçiyor.
        */}
      <KomutPaleti />

      {/*
        * Asistan panosu. `/tarpovizyon/ai-assistant` sayfası duruyor ama
        * oraya gitmek bulunduğun sayfadan ÇIKMAK demek: grafiğe bakarken
        * aklına gelen soruyu sormak için veriyi terk ediyorsun. Pano üstte
        * açılıyor, sayfa arkada kalıyor ve pano nerede olduğunu biliyor.
        */}
      <AsistanPanosu />
    </div>
  );
}

/** Menü verisini dışarıya da açalım — testler ve denetim betikleri kullanıyor. */
export { MENU };
