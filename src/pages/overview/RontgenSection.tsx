import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useRontgen } from './useRontgen';
import {
  KATEGORI_ETIKET, KATEGORI_NOT, KATEGORI_SIRA, SEVIYE_ETIKET,
  type Kategori, type Seviye, type Sinyal,
} from './rontgen';
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
 * ─── NEDEN GRUPLU ───────────────────────────────────────────────────────────
 * Röntgen artık girdiden çıktıya bütün zinciri tarıyor ve otuza yakın sinyal
 * üretiyor. Bunları tek düz liste hâlinde aciliyete göre dizmek, çözdüğü
 * sorunu yeniden üretirdi: kullanıcı yine "neye bakmalıyım" diye tarardı.
 * Gruplar zincirin sırasını izliyor — girdi → ekonomi → üretim → arz →
 * ticaret → fiyat — böylece liste aynı zamanda bir okuma yönü veriyor.
 *
 * ─── RENK TEK BAŞINA ANLAM TAŞIMAZ ──────────────────────────────────────────
 * Her satırda seviye ETİKETİ yazılı (Kritik / Uyarı / İzle / İyi). Renk
 * yalnızca tarama hızını artırıyor; renk körü bir okuyucu da aynı bilgiyi
 * alıyor.
 */

const SEVIYELER: Seviye[] = ['kritik', 'uyari', 'izle', 'iyi'];

function Satir({ s }: { s: Sinyal }) {
  return (
    <li className={`rg-satir rg-${s.seviye}`}>
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
  );
}

export function RontgenSection() {
  const { data: sinyaller = [], isLoading, isError } = useRontgen();
  /* "İyi" sinyaller varsayılan olarak kapalı: ekran sorunları öne çıkarmalı,
     ama iyi giden şeyi de gizlememeli — sayısı düğmede duruyor. */
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

  const gruplar = KATEGORI_SIRA
    .map((k: Kategori) => ({ k, liste: gosterilen.filter((s) => s.kategori === k) }))
    .filter((g) => g.liste.length);

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
        Girdiden çıktıya bütün zincir taranıyor: gübre ve yem fiyatından
        üretici kârlılığına, hayvan varlığından yeterlilik derecesine ve gıda
        enflasyonuna. Her satır veriden hesaplanıyor — bir kural, ölçülen bir
        sayı ve kanıt sayfası. Eşikler ölçünün kendi anlamından geliyor:
        kârlılıkta sıfır, yeterlilikte bire denk gelen nokta, makasta girdinin
        çıktıyı geçtiği yer.
      </p>

      {gruplar.map(({ k, liste }) => (
        <section key={k} className="rg-grup">
          <h3 className="rg-grup-bas">
            {KATEGORI_ETIKET[k]}
            <span className="rg-grup-not">{KATEGORI_NOT[k]}</span>
          </h3>
          <ul className="rg-liste">
            {liste.map((s) => <Satir key={s.id} s={s} />)}
          </ul>
        </section>
      ))}

      {iyiSayi > 0 && (
        <button type="button" className="rg-daha" onClick={() => setIyiAcik((v) => !v)}>
          {iyiAcik ? 'İyi durumdakileri gizle' : `İyi durumdaki ${iyiSayi} ölçüyü de göster`}
        </button>
      )}
    </Card>
  );
}
