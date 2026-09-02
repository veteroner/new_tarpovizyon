import { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, Home, Globe, MapPin, MoreHorizontal, X, Search,
} from 'lucide-react';
import {
  MENU, BASIC_MENU, visibleMenu, locate, scopeSwitchTarget, itemPath, hasScope,
  KAPSAM_ADI, type Kapsam, type MenuItem,
} from './nav/menu';
import { KomutPaleti } from './nav/KomutPaleti';
import { paletiAc } from './nav/paletOlay';
import { HizliErisim } from './nav/HizliErisim';
import { KardesGecisi } from './nav/KardesGecisi';
import '../styles/TarpoShell.css';
import './TarpoShell.breadcrumb.css';

/**
 * TarpoVizyon kabuğu — üst çubuk, kenar menüsü, konum izi, mobil gezinme.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Eskiden Dünya ve Türkiye AYRI menü ağaçlarıydı (27 ve 38 sayfa, ortak 2).
 * Kapsam değiştirince menünün %97'si siliniyor ve kullanıcı kök sayfaya
 * atılıyordu — panonun "kopuk" hissetmesinin baş sebebi buydu.
 *
 * Artık menü TEK ve sabit (bkz. nav/menu.ts). Kapsam anahtarı KONUYU KORUYOR:
 * "Tahıllar"dayken Dünya'ya basınca dünya tahıllarına gidiyorsun, menü
 * yerinden oynamıyor. 18 konuda bu eşleşme var.
 *
 * Ayrıca gezinme katmanı sayısı 5'ten 3'e indi: üst çubuk + (kenar | alt) +
 * bölüm sekmeleri. Mobilde iki kademeli sayfa ("kategori" sonra "daha")
 * tek sayfaya birleşti; ikinci kademe kullanıcıyı kaybettiriyordu.
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

  const categories = useMemo(() => visibleMenu(kapsam), [kapsam]);
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('tarpo-sidebar-collapsed') === 'true');
  const toggleSidebar = () => setSidebarCollapsed((p) => {
    const next = !p;
    localStorage.setItem('tarpo-sidebar-collapsed', String(next));
    return next;
  });

  const isActive = useCallback((yol: string) => {
    const [p, q] = yol.split('?');
    if (q) return location.pathname === p && location.search === `?${q}`;
    return location.pathname === p;
  }, [location]);

  const activeCatIdx = useMemo(() => {
    const i = categories.findIndex((c) =>
      c.items.some((it) => { const y = itemPath(it, kapsam); return y && isActive(y); }));
    return i >= 0 ? i : 0;
  }, [categories, kapsam, isActive]);

  const [expandedCats, setExpandedCats] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => { setExpandedCats((p) => new Set([...p, activeCatIdx])); }, [activeCatIdx]);
  const toggleCat = (i: number) => setExpandedCats((p) => {
    const n = new Set(p);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });

  /** Tek mobil sayfa. `null` = kapalı, sayı = o kategori, 'all' = tüm kategoriler. */
  const [sheet, setSheet] = useState<number | 'all' | null>(null);

  const git = (yol: string) => { navigate(yol); setSheet(null); };

  /** Kapsam değiştir — mümkünse aynı konuda kal. */
  const kapsamDegistir = (yeni: Kapsam) => {
    const { path } = scopeSwitchTarget(location.pathname, location.search, yeni);
    setKapsam(yeni);
    navigate(path);
  };

  /** Aktif öğenin diğer kapsamda karşılığı var mı? Yoksa düğmeyi işaretle. */
  const digerKapsam: Kapsam = kapsam === 'world' ? 'turkey' : 'world';
  const konuDigerdeVar = konum ? hasScope(konum.item, digerKapsam) : true;

  const bottomTabs = categories.slice(0, 4);

  return (
    <div className="tarpo-shell">
      <header className="tarpo-topbar">
        <div className="tarpo-topbar-left">
          <button className="tarpo-back-btn" onClick={() => navigate('/')} title="Programlar">
            <ChevronLeft size={14} />
            <span>Programlar</span>
          </button>
          <button className="tarpo-logo-btn" onClick={() => navigate('/tarpovizyon')}>
            <Home size={18} />
            <span>TARPOL</span>
          </button>
        </div>

        <div className="tarpo-mode-toggle">
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

      <div className="tarpo-body">
        <nav className={`tarpo-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button className="tarpo-sidebar-toggle" onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Genişlet' : 'Daralt'}>
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          <div className="tarpo-sidebar-nav">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              const acik = expandedCats.has(idx);
              const aktifKategori = cat.items.some((it) => {
                const y = itemPath(it, kapsam); return y && isActive(y);
              });
              return (
                <div key={cat.title} className="tarpo-cat-group">
                  <button
                    className={`tarpo-cat-header ${aktifKategori ? 'has-active' : ''}`}
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        localStorage.setItem('tarpo-sidebar-collapsed', 'false');
                        setExpandedCats(new Set([idx]));
                      } else toggleCat(idx);
                    }}
                    title={sidebarCollapsed ? cat.title : undefined}
                    aria-expanded={acik}
                  >
                    <Icon size={17} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="tarpo-cat-label">{cat.title}</span>
                        <ChevronDown size={13} className={`tarpo-cat-chevron ${acik ? 'open' : ''}`} />
                      </>
                    )}
                  </button>

                  {!sidebarCollapsed && acik && (
                    <div className="tarpo-cat-items">
                      {cat.items.map((item: MenuItem) => {
                        const y = itemPath(item, kapsam)!;
                        return (
                          <button key={y}
                            className={`tarpo-nav-item ${isActive(y) ? 'active' : ''}`}
                            onClick={() => git(y)}
                            aria-current={isActive(y) ? 'page' : undefined}>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

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
      </div>

      <nav className="tarpo-bottom-nav">
        {bottomTabs.map((cat, idx) => {
          const Icon = cat.icon;
          const aktif = cat.items.some((it) => {
            const y = itemPath(it, kapsam); return y && isActive(y);
          });
          return (
            <button key={cat.title}
              className={`tarpo-bottom-tab ${aktif ? 'active' : ''}`}
              onClick={() => setSheet(idx)}>
              <Icon size={21} />
              <span>{cat.title.split(' ')[0]}</span>
            </button>
          );
        })}
        <button className={`tarpo-bottom-tab ${sheet === 'all' ? 'active' : ''}`}
          onClick={() => setSheet('all')}>
          <MoreHorizontal size={21} />
          <span>Tümü</span>
        </button>
      </nav>

      {/*
        * TEK mobil sayfa. Eskiden iki kademeliydi: "Daha" bir sayfa açıp
        * kategori seçtiriyor, o da İKİNCİ bir sayfa açıyordu. İki kademe
        * kullanıcının nerede olduğunu kaybettiriyordu.
        */}
      {sheet !== null && (
        <div className="tarpo-mobile-sheet" role="dialog" aria-modal="true">
          <div className="tarpo-sheet-handle" />
          <div className="tarpo-sheet-header">
            <span>{sheet === 'all' ? 'Tüm Bölümler' : categories[sheet]?.title}</span>
            <button onClick={() => setSheet(null)} aria-label="Kapat"><X size={20} /></button>
          </div>

          <div className="tarpo-sheet-items">
            {(sheet === 'all' ? categories : [categories[sheet]]).filter(Boolean).map((cat) => (
              <div key={cat.title}>
                {sheet === 'all' && (
                  <div className="tarpo-sheet-group-title">
                    <cat.icon size={15} aria-hidden="true" />
                    {cat.title}
                  </div>
                )}
                {cat.items.map((item) => {
                  const y = itemPath(item, kapsam)!;
                  return (
                    <button key={y}
                      className={`tarpo-sheet-item ${isActive(y) ? 'active' : ''}`}
                      onClick={() => git(y)}>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {sheet !== null && (
        <div className="tarpo-sheet-overlay" onClick={() => setSheet(null)} />
      )}

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
    </div>
  );
}

/** Menü verisini dışarıya da açalım — testler ve denetim betikleri kullanıyor. */
export { MENU };
