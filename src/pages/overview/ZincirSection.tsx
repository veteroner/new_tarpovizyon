import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { useZincir } from './useZincir';
import { UCTAN_UCA, ayYaz, type ZincirDugum } from './zincir';
import './zincir.css';

/**
 * Aktarım zinciri — "yem ucuzlarsa markete ne olur" ekranı.
 *
 * ─── EKRANIN DİLİ ───────────────────────────────────────────────────────────
 * Bu bölümün ilk hâli ölçüm notlarıyla doluydu: "genel TÜFE üzeri puan",
 * "β=0,16", "aktarım 0,62 · r=0,90 · 90 ay ölçüm", ve altında yöntemi
 * anlatan iki paragraf. Hepsi doğruydu ve hepsi YANLIŞ YERDEYDİ — okuyucuya
 * değil, yöntemi savunmak için yazılmıştı. Konuya hakim olmayan biri ekranı
 * açtığında ne olduğunu anlamıyordu.
 *
 * Yöntem anlatımı artık burada, kodda; ölçümler `zincir.ts` başında. Ekranda
 * kalan: tek cümlelik sonuç, bir grafik, ve yukarı/aşağı oklarla zincirin
 * kendisi. Sayılar duruyor ama ikinci planda — "%−11 puan" başlığı değil,
 * "yem bitkileri ucuzluyor" başlığı karşılıyor.
 *
 * İstatistikler silinmedi, KATLANDI: "Ölçüm ayrıntısı" düğmesi altında.
 * Meraklı okuyucu ve iddiayı sınamak isteyen kişi hâlâ bulabiliyor; sıradan
 * okuyucunun önünü kesmiyor.
 */

/** Ölçünün yönünü sade Türkçeye çevirir. */
const yonSozu = (v: number | null, artan: string, azalan: string, notr: string) => {
  if (v == null) return notr;
  if (v > 1) return artan;
  if (v < -1) return azalan;
  return notr;
};

function Dugum({ d }: { d: ZincirDugum }) {
  const yukari = (d.deger ?? 0) > 1;
  const asagi = (d.deger ?? 0) < -1;
  const govde = (
    <>
      <span className="zn-dugum-ad">{d.baslik}</span>
      <span className="zn-dugum-not">
        {yonSozu(d.deger, 'enflasyondan hızlı artıyor', 'enflasyonun gerisinde kalıyor',
          'enflasyonla birlikte gidiyor')}
      </span>
    </>
  );
  return (
    <div className="zn-dugum">
      {d.yol
        ? <Link to={d.yol} className="zn-dugum-govde">{govde}</Link>
        : <span className="zn-dugum-govde">{govde}</span>}
      <span className={`zn-yon ${yukari ? 'zn-yon-yukari' : asagi ? 'zn-yon-asagi' : 'zn-yon-duz'}`}>
        {yukari ? <ArrowUp size={18} aria-hidden="true" /> : asagi ? <ArrowDown size={18} aria-hidden="true" /> : '—'}
        <span className="zn-yon-etiket">
          {yukari ? 'artıyor' : asagi ? 'düşüyor' : 'yatay'}
        </span>
      </span>
    </div>
  );
}

export function ZincirSection() {
  const { data, isLoading, isError } = useZincir();
  const [detay, setDetay] = useState(false);

  if (isLoading) {
    return (
      <Card className="zn" aralik="normal">
        <div className="loading"><div className="loading-spinner" /></div>
      </Card>
    );
  }
  if (isError || !data?.yansima) return null;

  const { yansima } = data;
  const ucuzluyor = yansima.bugun < 0;
  const iyi = yansima.etki <= 0;

  /* AI'ya verilen bağlam: ölçüler ve ne anlama geldikleri. Model sayıyı
     görmeden cümle kurmasın diye ham seri de gidiyor. */
  const aiBaglam = {
    soru: 'Yem bitkisi fiyatlarındaki hareket gıda enflasyonuna ne yapar?',
    yemBitkisiDurumu: `${ucuzluyor ? 'ucuzluyor' : 'pahalanıyor'} (genel enflasyona göre ${yansima.bugun.toFixed(1)} puan)`,
    ölçülenGecikme: `${UCTAN_UCA.gecikmeAy} ay`,
    ölçülenKatsayı: UCTAN_UCA.beta,
    ilişkiGücü: `r=${UCTAN_UCA.r}`,
    beklenenEtki: `gıda enflasyonuna ${yansima.etki.toFixed(1)} puan, ${ayYaz(yansima.hedefAy)} civarı`,
    zincir: data.sut.map((h) => ({ adim: h.baslik, durum: h.deger })),
    not: 'Değerler genel TÜFE üzeri puan; pozitif = enflasyondan hızlı artıyor.',
  };

  return (
    <Card className="zn" aralik="normal">
      <div className="zn-bas">
        <h2 className="ui-card-title">
          <GitBranch size={18} aria-hidden="true" /> Yemden markete
        </h2>
        <ChartInsightButton
          title="Yem bitkisi fiyatlarından gıda enflasyonuna aktarım"
          description="Hayvan yemi yapılan ürünlerin fiyatı ile gıda enflasyonu arasındaki gecikmeli ilişki"
          data={data.oncululuk}
          context={aiBaglam}
        />
      </div>

      {/* Tek cümlelik sonuç. Sayı değil, olay. */}
      <div className={`zn-yansima ${iyi ? 'zn-iyi' : 'zn-uyari'}`}>
        <span className="zn-yansima-metin">
          <strong>
            Hayvan yemi yapılan ürünler {ucuzluyor ? 'ucuzluyor' : 'pahalanıyor'}.
          </strong>
          {' '}Geçmişte böyle olduğunda market fiyatları yaklaşık bir yıl sonra{' '}
          {iyi ? 'yavaşlıyordu' : 'hızlanıyordu'} — bu kez{' '}
          <strong>{ayYaz(yansima.hedefAy)}</strong> dolaylarına denk geliyor.
        </span>
      </div>

      {/* Zincir: beş adım, yukarı/aşağı ok. Sayı yok. */}
      <div className="zn-akis">
        {data.sut.map((h) => (
          <div key={h.id}>
            {h.gecis && <div className="zn-gecis" aria-hidden="true"><ArrowDown size={14} /></div>}
            <Dugum d={h} />
          </div>
        ))}
      </div>

      {/*
        * Grafik, iddiayı sınanabilir kılıyor: kesikli çizgi yem bitkisi
        * fiyatlarının bir yıl önceki hâlinden BEKLENEN etki, düz çizgi o ay
        * GERÇEKLEŞEN gıda enflasyonu. Üst üste biniyorlarsa ilişki oradadır.
        */}
      {data.oncululuk.length > 12 && (
        <div className="zn-grafik">
          <div className="zn-grafik-bas">
            Beklenen etki, gerçekleşenle birlikte
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={data.oncululuk} margin={{ top: 6, right: 10, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                interval="preserveStartEnd" minTickGap={40} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={40}
                tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}`} />
              <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="2 2" />
              <Tooltip
                formatter={(v: number, ad: string) => [
                  `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`,
                  ad === 'beklenenEtki' ? 'Yemden beklenen' : 'Markette gerçekleşen',
                ]}
                labelFormatter={(l: string) => ayYaz(String(l))}
              />
              <Legend formatter={(v: string) => (v === 'beklenenEtki'
                ? 'Yemden beklenen' : 'Markette gerçekleşen')} />
              <Line type="monotone" dataKey="beklenenEtki" stroke="var(--viz-warning, #a8620a)"
                strokeWidth={2} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="gidaEnflasyonu" stroke="var(--viz-critical, #b3261e)"
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="zn-grafik-not">
            İki çizgi ne kadar üst üste biniyorsa ilişki o kadar güçlü.
          </p>
        </div>
      )}

      {/*
        * Ölçüm ayrıntısı katlı.
        *
        * Silmedim: iddianın dayanağı gösterilmezse kontrol edilemez hâle
        * gelir. Ama açık bırakmak da sıradan okuyucunun önünü kesiyordu.
        */}
      <button type="button" className="zn-detay-dugme" onClick={() => setDetay((v) => !v)}
        aria-expanded={detay}>
        <ChevronDown size={14} aria-hidden="true"
          style={{ transform: detay ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
        Ölçüm ayrıntısı
      </button>

      {detay && (
        <div className="zn-detay">
          <p>
            Bütün değerler genel enflasyonun üzerindeki fark (puan). Yem bitkisi
            bileşiği bugün <strong>{yansima.bugun.toFixed(1)}</strong>; ölçülen
            ilişkiye göre gıda enflasyonuna{' '}
            <strong>{yansima.etki.toFixed(1)} puan</strong> etki, {UCTAN_UCA.gecikmeAy}{' '}
            ay sonra (β={UCTAN_UCA.beta}, r={UCTAN_UCA.r}, {UCTAN_UCA.n} aylık ölçüm).
          </p>
          <table className="zn-detay-tablo">
            <thead>
              <tr><th>Adım</th><th>Ölçü</th><th>Aktarım</th><th>Gecikme</th><th>r</th></tr>
            </thead>
            <tbody>
              {data.sut.map((h) => (
                <tr key={h.id}>
                  <td>{h.baslik}</td>
                  <td>{h.deger == null ? '—' : `${h.deger >= 0 ? '+' : '−'}${Math.abs(h.deger).toFixed(1)}`}</td>
                  <td>{h.gecis ? h.gecis.beta.toFixed(2) : '—'}</td>
                  <td>{h.gecis ? (h.gecis.gecikmeAy === 0 ? 'aynı ay' : `${h.gecis.gecikmeAy} ay`) : '—'}</td>
                  <td>{h.gecis ? h.gecis.r.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Sınamayı geçemediği için zincire alınmayanlar: kârlılık → arz
            (en yüksek ilişki 0,34 ve ters işaretli) ve buğday → makarna
            (0,07; işlenmiş ürün dış ticareti veritabanında yok).
          </p>
        </div>
      )}
    </Card>
  );
}
