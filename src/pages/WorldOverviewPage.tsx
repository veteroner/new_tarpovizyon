import { ArrowDown, ArrowUp, Globe2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { useDunyaOverview } from './worldOverview/useDunyaOverview';
import './worldOverview/dunya.css';

/**
 * Dünya panosu — "ülkeler ne yapıyor".
 *
 * Türkiye panosu "bizde neyde sorun var" diye soruyor; burası başkalarına
 * bakıyor: hangi ülke hangi üründe üretimini ciddi biçimde artırmış ya da
 * azaltmış. Türkiye açısından anlamı doğrudan: tedarikçi ülkedeki büyük bir
 * hasat değişimi, ithalat fiyatını buraya taşıyor.
 *
 * Her satır ülkenin KENDİ geçmişine göre ölçülüyor — ayrıntısı
 * `dunyaSinyal.ts`te. Sayı değil, olay öne çıkıyor: "Kazakistan buğday
 * üretimini artırdı" başlık, yüzde ikinci planda.
 */
export function WorldOverviewPage() {
  const { data: sinyaller = [], isLoading, isError } = useDunyaOverview();

  if (isLoading) {
    return (
      <div className="page-container">
        <Card aralik="normal"><div className="loading"><div className="loading-spinner" /></div></Card>
      </div>
    );
  }

  const yil = sinyaller[0]?.yil;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Dünyada Ne Oluyor</h1>
          <p className="page-subtitle">
            Ülkelerin üretiminde olağandışı değişimler — FAO
            {yil ? ` · ${yil}` : ''}
          </p>
        </div>
      </div>

      <Card className="dn" aralik="normal">
        <div className="dn-bas">
          <h2 className="ui-card-title">
            <Globe2 size={18} aria-hidden="true" /> Öne çıkan değişimler
          </h2>
          {sinyaller.length > 0 && (
            <ChartInsightButton
              title="Ülkelerin üretiminde olağandışı değişimler"
              description="Her ülke kendi geçmiş oynaklığına göre değerlendirildi"
              data={sinyaller}
              context={{
                ölçü: 'yıllık % değişim',
                eşik: 'ülkenin kendi olağan oynamasının 1,5 katı ve en az %5',
                yil,
              }}
            />
          )}
        </div>

        {isError || !sinyaller.length ? (
          <p className="dn-bos">
            Bu dönemde olağandışı bir değişim ölçülmedi.
          </p>
        ) : (
          <>
            <p className="dn-not">
              Her ülke <strong>kendi geçmişine göre</strong> ölçülüyor: Çin'in
              buğdayı yıllık %1 oynuyor, Kazakistan'ınki %17 — aynı yüzde
              ikisinde aynı şeyi anlatmıyor.
            </p>
            <ul className="dn-liste">
              {sinyaller.map((s) => (
                <li key={s.id} className={`dn-satir dn-${s.yon}`}>
                  <span className="dn-ok" aria-hidden="true">
                    {s.yon === 'artis' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  </span>
                  <span className="dn-govde">
                    <span className="dn-baslik">
                      {s.ulke} · {s.urun} üretimi {s.yon === 'artis' ? 'arttı' : 'düştü'}
                    </span>
                    <span className="dn-aciklama">
                      Bu ülke için olağan yıllık oynama %{s.tipik.toFixed(1)};
                      bu değişim onun {s.kat.toFixed(1)} katı.
                    </span>
                  </span>
                  <span className="dn-olcu">
                    {s.degisim >= 0 ? '+' : '−'}%{Math.abs(s.degisim).toFixed(1)}
                    <small>{s.yil}</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
