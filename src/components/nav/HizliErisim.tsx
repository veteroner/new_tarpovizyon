import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pin, PinOff } from 'lucide-react';
import { locate, KAPSAM_ADI, type Kapsam } from './menu';
import '../../styles/HizliErisim.css';

/**
 * Hızlı erişim şeridi — sabitlenenler + son bakılanlar.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Komut paleti (⌘K) 134 sayfaya erişimi çözdü ama her seferinde YAZMAK
 * gerekiyor. Kullanıcının gerçekte döndüğü sayfa sayısı 8-10; onlar için
 * yazmak da tıklamak kadar yorucu.
 *
 * Bu şerit TAM MENÜ DEĞİL. Kenar çubuğunu ikinci kez çizmenin anlamı yok —
 * o zaten solda duruyor. Buradaki liste kullanıcının kendi listesi: elle
 * sabitlediği birkaç sayfa + en son gezdikleri.
 *
 * ─── NEDEN localStorage ─────────────────────────────────────────────────────
 * Sunucuda kullanıcı başına tercih saklama yok. `tarpo-sidebar-collapsed`
 * zaten aynı yolu kullanıyor; ayrı bir mekanizma kurmak tutarsızlık olurdu.
 *
 * ─── BOŞKEN GÖRÜNMÜYOR ──────────────────────────────────────────────────────
 * İlk ziyarette hem sabit hem son boş. Boş bir şerit, kabuğun yüksekliğini
 * hiçbir şey için yiyor — o yüzden hiç render edilmiyor.
 */

const SABIT_ANAHTAR = 'tarpo-hizli-sabit';
const SON_ANAHTAR = 'tarpo-hizli-son';
/** Son bakılanlarda bu kadar tutuluyor; fazlası şeridi kaydırma alanına çeviriyor. */
const EN_FAZLA_SON = 6;
/** Sabitlenen üst sınırı: şerit tek satırda kalsın. */
const EN_FAZLA_SABIT = 6;

/** localStorage okuma — kotanın dolu olduğu veya erişimin kapalı olduğu
    tarayıcılarda patlamasın diye her erişim korumalı. */
function oku(anahtar: string): string[] {
  try {
    const ham = localStorage.getItem(anahtar);
    const c = ham ? JSON.parse(ham) : [];
    return Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
function yaz(anahtar: string, deger: string[]) {
  try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* yok say */ }
}

/** `locate` yolu ve sorguyu ayrı istiyor; biz tek dize saklıyoruz. */
const ayir = (tam: string): [string, string] => {
  const i = tam.indexOf('?');
  return i < 0 ? [tam, ''] : [tam.slice(0, i), tam.slice(i)];
};

type Cozulmus = { tam: string; label: string; kategori: string; kapsam: Kapsam | null };

/** Yolu görünür bilgiye çevirir. Menüde karşılığı yoksa null — silinmiş veya
    yeniden adlandırılmış bir sayfa şeritte "undefined" olarak durmasın. */
function coz(tam: string): Cozulmus | null {
  const [p, q] = ayir(tam);
  const k = locate(p, q);
  if (!k) return null;
  return { tam, label: k.item.label, kategori: k.kategori.title, kapsam: k.kapsam };
}

export function HizliErisim() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sabit, setSabit] = useState<string[]>(() => oku(SABIT_ANAHTAR));
  const [son, setSon] = useState<string[]>(() => oku(SON_ANAHTAR));

  const suAnki = location.pathname + (location.search || '');

  /*
   * Ziyaret kaydı — EFEKTTE DEĞİL, render sırasında.
   *
   * Efektle yazmak `react-hooks/set-state-in-effect` uyarısı veriyor ve art
   * arda render tetikliyor. React'in "önceki değeri karşılaştırıp durumu
   * render sırasında düzelt" deseni burada doğru olanı: liste tamamen
   * yoldan türüyor, dış bir sistemle eşitleme yok.
   *
   * Menüde karşılığı olmayan yollar (programlar sayfası, 404, araç ekranları)
   * kaydedilmiyor — şeritte gösterilemezler zaten.
   */
  const [islenen, setIslenen] = useState<string | null>(null);
  if (islenen !== suAnki) {
    setIslenen(suAnki);
    if (coz(suAnki) && son[0] !== suAnki) {
      const yeni = [suAnki, ...son.filter((x) => x !== suAnki)].slice(0, EN_FAZLA_SON);
      yaz(SON_ANAHTAR, yeni);
      setSon(yeni);
    }
  }

  const sabitle = useCallback((tam: string) => {
    setSabit((eski) => {
      const yeni = eski.includes(tam)
        ? eski.filter((x) => x !== tam)
        : [tam, ...eski].slice(0, EN_FAZLA_SABIT);
      yaz(SABIT_ANAHTAR, yeni);
      return yeni;
    });
  }, []);

  /* Sabitlenen bir sayfa "son"da da görünmesin: aynı çip iki kez durur. */
  const sabitCozulmus = useMemo(
    () => sabit.map(coz).filter((x): x is Cozulmus => x !== null), [sabit]);
  const sonCozulmus = useMemo(
    () => son.map(coz).filter((x): x is Cozulmus => x !== null && !sabit.includes(x.tam)),
    [son, sabit]);

  if (!sabitCozulmus.length && !sonCozulmus.length) return null;

  const cip = (o: Cozulmus, sabitMi: boolean) => (
    <span
      key={o.tam}
      className={`he-cip${o.tam === suAnki ? ' aktif' : ''}`}
    >
      <button
        type="button"
        className="he-git"
        onClick={() => navigate(o.tam)}
        aria-current={o.tam === suAnki ? 'page' : undefined}
        title={`${o.kapsam ? `${KAPSAM_ADI[o.kapsam]} · ` : ''}${o.kategori}`}
      >
        {sabitMi && <Pin size={11} className="he-igne-isaret" aria-hidden="true" />}
        <span className="he-ad">{o.label}</span>
        {/* Bulunduğu kapsam farklıysa çip bunu söylüyor: tıklayınca kapsamın
            da değişeceğini kullanıcı önceden bilsin. */}
        {o.kapsam && <span className="he-kapsam">{KAPSAM_ADI[o.kapsam]}</span>}
      </button>
      <button
        type="button"
        className="he-igne"
        onClick={() => sabitle(o.tam)}
        aria-label={sabitMi ? `${o.label} sabitlemesini kaldır` : `${o.label} sayfasını sabitle`}
        title={sabitMi ? 'Sabitlemeyi kaldır' : 'Sabitle'}
      >
        {sabitMi ? <PinOff size={12} /> : <Pin size={12} />}
      </button>
    </span>
  );

  return (
    <nav className="tarpo-hizli" aria-label="Hızlı erişim">
      {sabitCozulmus.length > 0 && (
        <>
          <span className="he-etiket">Sabit</span>
          {sabitCozulmus.map((o) => cip(o, true))}
        </>
      )}
      {sonCozulmus.length > 0 && (
        <>
          {sabitCozulmus.length > 0 && <span className="he-bosluk" aria-hidden="true" />}
          <span className="he-etiket">Son</span>
          {sonCozulmus.map((o) => cip(o, false))}
        </>
      )}
    </nav>
  );
}
