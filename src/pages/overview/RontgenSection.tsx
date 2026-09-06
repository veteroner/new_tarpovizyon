import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useRontgen } from './useRontgen';
import { SEVIYE_ETIKET, type Seviye } from './rontgen';
import './rontgen.css';

/**
 * Tarım röntgeni — "neyde sorun var" ekranı.
 *
 * ─── NEDEN BURADA ───────────────────────────────────────────────────────────
 * Genel Bakış'a giren kullanıcı bugüne kadar SEVİYE görüyordu: şu kadar ton,
 * şu kadar dolar. "Neye bakmalıyım" sorusunun cevabı hiçbir yerde yoktu; onu
 * bulmak için 61 sayfayı tek tek gezmek gerekiyordu.
 *
 * Bu bölüm o soruyu yanıtlıyor: her satır bir kural, ölçülen bir sayı ve
 * kanıt sayfasına bir bağlantı. Yorum yok — "zararda" diyorsa kârlılık
 * ölçüsü eksidir, tıklayıp bakılabilir.
 *
 * ─── RENK TEK BAŞINA ANLAM TAŞIMAZ ──────────────────────────────────────────
 * Her satırda seviye ETİKETİ yazılı (Kritik / Uyarı / İzle / İyi). Renk
 * yalnızca tarama hızını artırıyor; renk körü bir okuyucu da aynı bilgiyi
 * alıyor.
 */

const SEVIYELER: Seviye[] = ['kritik', 'uyari', 'izle', 'iyi'];

export function RontgenSection() {
  const { data: sinyaller = [], isLoading, isError } = useRontgen();
  /* "İyi" sinyaller varsayılan olarak kapalı: ekran sorunları öne çıkarmalı,
     ama iyi giden şeyi de gizlememeli — sayısı başlıkta duruyor. */
  const [iyiAcik, setIyiAcik] = useState(false);

  if (isLoading) {
    return (
      <Card className="rg" aralik="normal">
        <div className="loading"><div className="loading-spinner" /></div>
      </Card>
    );
  }
  if (isError || !sinyaller.length) return null;

  const sayim = (s: Seviye) => sinyaller.filter((x) => x.seviye === s).length;
  const gosterilen = iyiAcik ? sinyaller : sinyaller.filter((s) => s.seviye !== 'iyi');
  const iyiSayi = sayim('iyi');

  return (
    <Card className="rg" aralik="normal">
      <div className="rg-bas">
        <h2 className="ui-card-title">
          <Activity size={18} aria-hidden="true" /> Tarım röntgeni
        </h2>
        <div className="rg-ozet">
          {SEVIYELER.filter((s) => sayim(s) > 0).map((s) => (
            <span key={s} className={`rg-rozet rg-${s}`}>
              {sayim(s)} {SEVIYE_ETIKET[s].toLocaleLowerCase('tr-TR')}
            </span>
          ))}
        </div>
      </div>

      <p className="rg-not">
        Her satır veriden hesaplanıyor: bir kural, ölçülen bir sayı ve kanıt
        sayfası. Eşikler ölçünün kendi anlamından geliyor — kârlılıkta sıfır,
        yeterlilikte bire denk gelen nokta.
      </p>

      <ul className="rg-liste">
        {gosterilen.map((s) => (
          <li key={s.id} className={`rg-satir rg-${s.seviye}`}>
            <span className="rg-etiket">{SEVIYE_ETIKET[s.seviye]}</span>
            <span className="rg-govde">
              <span className="rg-baslik">{s.baslik}</span>
              <span className="rg-aciklama">{s.aciklama}</span>
            </span>
            <span className="rg-olcu">
              {s.olcu}
              {s.donem && <small>{s.donem}</small>}
            </span>
            <Link to={s.yol} className="rg-bag" aria-label={`${s.baslik} — veriye git`}>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {iyiSayi > 0 && (
        <button type="button" className="rg-daha" onClick={() => setIyiAcik((v) => !v)}>
          {iyiAcik ? 'İyi durumdakileri gizle' : `İyi durumdaki ${iyiSayi} ölçüyü de göster`}
        </button>
      )}
    </Card>
  );
}
