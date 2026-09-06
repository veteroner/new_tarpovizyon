import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ArrowDown } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useZincir } from './useZincir';
import { UCTAN_UCA, ayYaz, yansimaSeviye, type ZincirDugum } from './zincir';
import './zincir.css';

/**
 * Aktarım zinciri — "yem bitkisi fiyatı nereye gidiyor" ekranı.
 *
 * ─── RÖNTGENDEN FARKI ───────────────────────────────────────────────────────
 * Röntgen "şu an neyde sorun var" diyor: bugünkü ölçüler, bugünkü eşikler.
 * Burası tek soruyu yanıtlıyor: bugünkü bir hareket NEREYE, NE KADAR ve KAÇ AY
 * SONRA varıyor. İkisi birbirinin yerine geçmiyor.
 *
 * ─── NEDEN BU KADAR ÇOK SAYI GÖSTERİYOR ─────────────────────────────────────
 * Her geçişte β, r ve n yazılı. Nedensellik iddiası, dayanağı gösterilmeden
 * yapıldığında kontrol edilemez hâle geliyor; okuyucu "r=0,57, n=112" ile
 * "r=0,95, n=67" arasındaki farkı görebilmeli. Zayıf halka gizlenmiyor,
 * yazılıyor.
 *
 * Sınamayı geçemeyen halkalar da altta duruyor. Elenen halkayı sessizce
 * çıkarmak, hiç sınamamakla aynı yere varır: okuyucu geriye kalanın seçilmiş
 * olduğunu bilemez.
 */

const puan = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} puan`;

function Dugum({ d }: { d: ZincirDugum }) {
  const govde = (
    <>
      <span className="zn-dugum-ad">{d.baslik}</span>
      <span className="zn-dugum-not">{d.aciklama}</span>
    </>
  );
  return (
    <div className="zn-dugum">
      {/* Sarmalayıcı da bağlantı da sütun düzeninde olmalı: <Link> satır içi
          kaldığında başlıkla açıklama yan yana yapışıyordu. */}
      {d.yol
        ? <Link to={d.yol} className="zn-dugum-govde">{govde}</Link>
        : <span className="zn-dugum-govde">{govde}</span>}
      <span className="zn-dugum-olcu">
        {d.deger == null ? '—' : puan(d.deger)}
        {d.ay && <small>{ayYaz(d.ay)}</small>}
      </span>
    </div>
  );
}

export function ZincirSection() {
  const { data, isLoading, isError } = useZincir();
  const [sekme, setSekme] = useState<'kanatli' | 'sut'>('kanatli');

  if (isLoading) {
    return (
      <Card className="zn" aralik="normal">
        <div className="loading"><div className="loading-spinner" /></div>
      </Card>
    );
  }
  if (isError || !data?.yansima) return null;

  const { yansima } = data;
  const seviye = yansimaSeviye(yansima.etki);
  const halkalar = sekme === 'kanatli' ? data.kanatli : data.sut;
  const yon = yansima.etki >= 0 ? 'yukarı' : 'aşağı';

  return (
    <Card className="zn" aralik="normal">
      <div className="zn-bas">
        <h2 className="ui-card-title">
          <GitBranch size={18} aria-hidden="true" /> Aktarım zinciri
        </h2>
        <div className="zn-sekmeler">
          <button type="button" className="zn-sekme" aria-pressed={sekme === 'kanatli'}
            onClick={() => setSekme('kanatli')}>Kanatlı</button>
          <button type="button" className="zn-sekme" aria-pressed={sekme === 'sut'}
            onClick={() => setSekme('sut')}>Çiğ süt</button>
        </div>
      </div>

      <div className={`zn-yansima zn-${seviye}`}>
        <span className="zn-etki">{puan(yansima.etki)}</span>
        <span className="zn-yansima-metin">
          Yem bitkisi fiyatları {ayYaz(yansima.ay)} itibarıyla genel enflasyonun{' '}
          <strong>{puan(yansima.bugun)}</strong> {yansima.bugun >= 0 ? 'üzerinde' : 'altında'}.
          Geçmişte bu hareket gıda enflasyonuna <strong>{UCTAN_UCA.gecikmeAy} ay sonra</strong>{' '}
          varıyordu — yani <strong>{ayYaz(yansima.hedefAy)}</strong> civarında{' '}
          {puan(yansima.etki)} {yon} yönlü etki.
        </span>
      </div>

      <div className="zn-akis">
        {halkalar.map((h, i) => (
          <div key={h.id}>
            {h.gecis && (
              <div className="zn-gecis">
                <ArrowDown size={14} className="zn-gecis-ok" aria-hidden="true" />
                <span>
                  aktarım {h.gecis.beta.toFixed(2)} ·{' '}
                  {h.gecis.gecikmeAy === 0 ? 'aynı ay' : `${h.gecis.gecikmeAy} ay sonra`} ·{' '}
                  r={h.gecis.r.toFixed(2)} · {h.gecis.n} ay ölçüm
                </span>
              </div>
            )}
            <Dugum d={h} />
            {i === halkalar.length - 1 && null}
          </div>
        ))}
      </div>

      <p className="zn-not">
        Bütün değerler <strong>genel TÜFE üzeri puan</strong>: serinin yıllık
        değişiminden genel enflasyonun yıllık değişimi çıkarılmış. Yüksek
        enflasyonda her seri her seriyle korelasyon verir; ortak enflasyon
        çıkarılmadan ölçülen ilişki sahte olur. “Aktarım”, öndeki ölçü 1 puan
        oynadığında sonrakinde ölçülen ortalama oynama.
      </p>
      <p className="zn-not">
        Baştaki büyüklük halkaların çarpımından değil, yem bitkisi baskısı ile
        gıda enflasyonu arasında <strong>doğrudan</strong> ölçülen ilişkiden
        geliyor (r={UCTAN_UCA.r.toFixed(2)}, tepe {UCTAN_UCA.gecikmeAy}. ayda,{' '}
        {UCTAN_UCA.n} aylık ölçüm). Halkaları tek tek çarpmak büyüklüğü üçte
        birine indiriyor: her halkada ölçüm gürültüsü katsayıyı aşağı çekiyor ve
        yem bitkileri gıda sepetine yalnızca et/süt üzerinden değil ekmek, yağ,
        şeker üzerinden de giriyor. Halkalar “nereden geçiyor” sorusunun cevabı,
        çarpım tablosu değil.
      </p>

      <div className="zn-elenen">
        <b>Sınamayı geçemediği için burada olmayan iki halka.</b>{' '}
        <b>Kârlılık → arz:</b> süt kârlılığı ile aylık toplanan süt arasında
        0–18 ay taramasında en yüksek ilişki yalnızca 0,34 ve ters işaretli —
        “kârlılık düştü, arz daralır” cümlesi veriyle desteklenmedi.{' '}
        <b>Buğday → makarna:</b> yurt içi buğday fiyatı ile makarnalık buğday
        ithalatı 0,07, ihracatı −0,28; ayrıca işlenmiş ürün dış ticareti
        veritabanında hiç yok. Ölçülemeyen zincir kurulmadı.
      </div>
    </Card>
  );
}
