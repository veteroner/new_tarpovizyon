import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, Database, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MENU, BASIC_MENU, locate, KAPSAM_ADI, type Kapsam, type MenuCategory,
} from './menu';
import { asistanaSor } from '../../mobile/services/asistan';
import { ASISTAN_OLAY } from './kabukOlaylari';
import '../../styles/AsistanPanosu.css';

/**
 * Asistan panosu — kırılımın her basamağında açılabilen, NEREDE OLDUĞUNU
 * bilen soru penceresi.
 *
 * ─── NEDEN AYRI SAYFA DEĞİL ─────────────────────────────────────────────────
 * `/tarpovizyon/ai-assistant` diye bir sayfa zaten var. Ama oraya gitmek
 * bulunduğun sayfadan ÇIKMAK demek: grafiğe bakarken aklına gelen soruyu
 * sormak için önce veriyi terk ediyorsun, dönünce de bağlam gitmiş oluyor.
 * Pano üstte açılıyor, sayfa arkada duruyor.
 *
 * ─── BAĞLAM SORUYA GİRİYOR ──────────────────────────────────────────────────
 * Öneriler bulunduğun yere göre yazılıyor ve KENDİ İÇİNDE TAM: "Bu düşüşün
 * sebebi ne?" değil, "Kırmızı et üretimindeki düşüşün sebebi ne olabilir?".
 * Model soruyu tek başına görüyor; eksik bağlamlı soru yanlış sayfaları
 * bulur ve yanlış veriyle beslenir.
 *
 * ─── KORPUS ─────────────────────────────────────────────────────────────────
 * `asistanaSor`'a yalnızca `BASIC_MENU` veriliyor — `AsistanPage` de öyle
 * yapıyor. Sebebi ölçüldü: Pro menüsündeki öğelerde `uc` (veri ucu) alanı
 * YOK, yalnızca Basic sayfalarında var. Pro öğelerini de geçsek asistan
 * veri çekemediği sayfaları kaynak gösterirdi — beslenmediği hâlde
 * beslenmiş gibi görünürdü.
 */

type Konum = {
  yer: string;
  oneriler: string[];
};

/** Bulunduğun yere göre başlık ve öneriler. */
function konumuCoz(
  pathname: string, search: string, kapsam: Kapsam,
): Konum {
  const k = locate(pathname, search);
  if (k) {
    const ad = k.item.label;
    return {
      yer: `${KAPSAM_ADI[kapsam]} › ${k.kategori.title} › ${ad}`,
      oneriler: [
        `${ad} verilerinde son yıllarda ne değişti?`,
        `${ad} için Türkiye ve dünya karşılaştırması nasıl?`,
        `${ad} rakamlarını kısaca özetle`,
      ],
    };
  }

  const m = pathname.match(/^\/tarpovizyon\/(?:turkey|world)\/bolum\/([^/]+)$/);
  if (m) {
    const kat: MenuCategory | undefined =
      [...MENU, ...BASIC_MENU].find((c) => c.id === m[1]);
    if (kat) {
      return {
        yer: `${KAPSAM_ADI[kapsam]} › ${kat.title}`,
        oneriler: [
          `${kat.title} bölümünde en dikkat çeken gelişme ne?`,
          `${kat.title} konularını kısaca karşılaştır`,
        ],
      };
    }
  }

  return {
    yer: KAPSAM_ADI[kapsam],
    oneriler: [
      'Bu yıl tarımda en çok ne değişti?',
      'Kırmızı et ve süt üretimi nasıl gidiyor?',
      'Hangi üründe üretim düşüşü var?',
    ],
  };
}

export function AsistanPanosu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [acik, setAcik] = useState(false);
  const [soru, setSoru] = useState('');
  const [cevap, setCevap] = useState<string | null>(null);
  const [kaynaklar, setKaynaklar] = useState<{ yol: string; ad: string }[]>([]);
  const [beslendi, setBeslendi] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const kapatRef = useRef<HTMLButtonElement | null>(null);
  const oncekiOdakRef = useRef<HTMLElement | null>(null);
  /* İstek uçarken pano kapanırsa gelen cevap yazılmasın. */
  const istekRef = useRef(0);

  const kapsam: Kapsam =
    location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';

  const konum = useMemo(
    () => konumuCoz(location.pathname, location.search, kapsam),
    [location.pathname, location.search, kapsam],
  );

  const korpus = useMemo(() => BASIC_MENU.flatMap((k) => k.items), []);

  const kapat = useCallback(() => {
    istekRef.current += 1;
    setAcik(false);
    oncekiOdakRef.current?.focus?.();
  }, []);

  const ac = useCallback(() => {
    oncekiOdakRef.current = document.activeElement as HTMLElement | null;
    setAcik(true);
  }, []);

  useEffect(() => {
    function tus(e: KeyboardEvent) { if (e.key === 'Escape' && acik) kapat(); }
    window.addEventListener('keydown', tus);
    window.addEventListener(ASISTAN_OLAY, ac);
    return () => {
      window.removeEventListener('keydown', tus);
      window.removeEventListener(ASISTAN_OLAY, ac);
    };
  }, [acik, ac, kapat]);

  useEffect(() => { if (acik) kapatRef.current?.focus(); }, [acik]);

  const sor = useCallback(async (metin: string) => {
    const q = metin.trim();
    if (!q || calisiyor) return;
    const bu = ++istekRef.current;
    setCalisiyor(true);
    setHata(null);
    setCevap(null);
    setKaynaklar([]);
    try {
      const sonuc = await asistanaSor(q, korpus);
      if (istekRef.current !== bu) return;      // pano kapandı veya yeni soru
      setCevap(sonuc.cevap);
      setKaynaklar(sonuc.sayfalar);
      setBeslendi(sonuc.beslendi);
    } catch {
      if (istekRef.current !== bu) return;
      setHata('Cevap alınamadı. Bağlantıyı kontrol edip tekrar deneyin.');
    } finally {
      if (istekRef.current === bu) setCalisiyor(false);
    }
  }, [calisiyor, korpus]);

  return (
    <>
      <button
        type="button"
        className="asp-dugme"
        onClick={ac}
        aria-label="Asistanı aç"
        aria-expanded={acik}
      >
        <Sparkles size={16} aria-hidden="true" />
        <span>Asistan</span>
      </button>

      {acik && (
        <>
          <div className="asp-fon" onClick={kapat} aria-hidden="true" />
          <aside className="asp" role="dialog" aria-modal="true" aria-label="Asistan">
            <header className="asp-bas">
              <Sparkles size={17} aria-hidden="true" />
              <h2>Asistan</h2>
              <button
                ref={kapatRef}
                type="button"
                className="asp-kapat"
                onClick={kapat}
                aria-label="Panoyu kapat"
              >
                <X size={17} />
              </button>
            </header>

            <div className="asp-ic">
              {/* Kullanıcı sorduğu şeyin hangi bağlamda yorumlanacağını görsün. */}
              <p className="asp-baglam">
                Şu an buradasınız: <b>{konum.yer}</b>
              </p>

              {!cevap && !calisiyor && !hata && konum.oneriler.map((o) => (
                <button key={o} type="button" className="asp-oneri" onClick={() => sor(o)}>
                  {o}
                </button>
              ))}

              {calisiyor && <p className="asp-durum">Veri okunuyor ve cevap hazırlanıyor…</p>}
              {hata && <p className="asp-hata">{hata}</p>}

              {cevap && (
                <div className="asp-cevap">
                  {/*
                    * ReactMarkdown ŞART: model başlık ve kalın için markdown
                    * yazıyor. Düz metin olarak basınca ekranda "### " ve "**"
                    * görünüyordu.
                    */}
                  <div className="tv-md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cevap}</ReactMarkdown>
                  </div>

                  <p className={`asp-besleme ${beslendi ? 'var' : 'yok'}`}>
                    <Database size={13} aria-hidden="true" />
                    {beslendi
                      ? 'Cevap, aşağıdaki sayfaların gerçek verisiyle beslendi.'
                      : 'Bu soru için sayfa verisi çekilemedi; cevap genel bilgiye dayanıyor.'}
                  </p>

                  {kaynaklar.length > 0 && (
                    <div className="asp-kaynaklar">
                      {kaynaklar.map((s) => (
                        <button
                          key={s.yol}
                          type="button"
                          className="asp-kaynak"
                          onClick={() => { kapat(); navigate(s.yol); }}
                        >
                          <span>{s.ad}</span>
                          <ChevronRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="asp-yeni"
                    onClick={() => { setCevap(null); setKaynaklar([]); setHata(null); }}
                  >
                    Yeni soru
                  </button>
                </div>
              )}
            </div>

            <form
              className="asp-alt"
              onSubmit={(e) => { e.preventDefault(); sor(soru); setSoru(''); }}
            >
              <input
                type="text"
                value={soru}
                onChange={(e) => setSoru(e.target.value)}
                placeholder="Bir şey sorun…"
                aria-label="Sorunuz"
                disabled={calisiyor}
              />
              <button type="submit" disabled={calisiyor || !soru.trim()}>Sor</button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
