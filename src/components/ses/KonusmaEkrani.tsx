import { Suspense, lazy, useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { durdur, konusmaDinle } from './konusma';
import { sohbetDinle, sohbetiKapat, type SohbetDurumu } from './sesliSohbet';

/**
 * Asistan konuşurken / dinlerken açılan tam ekran görünüm.
 *
 * İki durumda açılıyor:
 *   • "Dinle" düğmesiyle tek bir cevap okunurken,
 *   • sesli sohbet sürerken (dinle → düşün → konuş döngüsü).
 *
 * ─── NEDEN TEMBEL YÜKLENİYOR ────────────────────────────────────────────────
 * Küre `three` + `@react-three/fiber` istiyor; ikisi ayrı parçada 228 KB
 * (gzip). Ana pakete koymak, sesi hiç kullanmayan kullanıcıya da indirtmek
 * demekti — uygulamanın işi veri göstermek, dekoratif bir küre açılışı
 * yavaşlatmamalı.
 *
 * ─── NEDEN AYRI EKRAN ───────────────────────────────────────────────────────
 * Diğer sesli asistanlarda olduğu gibi ekran öne geçiyor. Küçük bir köşe
 * animasyonu, telefonu eline alıp konuşan kullanıcıya durdurmak için hedef
 * bırakmıyordu.
 */

const GradientOrb = lazy(() =>
  import('./GradientOrb').then((m) => ({ default: m.GradientOrb })));

/**
 * Aşamaya göre kürenin rengi.
 *
 * Renk BİLGİ taşıyor: kullanıcı ekrana bakmadan da hangi sırada olduğunu
 * anlamalı — konuşma sırası kendisinde mi, yoksa beklemesi mi gerekiyor.
 * Aynı görüntüyü üç aşamada da göstermek, sessizlik anında "bozuldu mu"
 * sorusunu doğuruyordu.
 */
const TON: Record<string, number> = {
  dinliyor: 150,   // yeşile kayan: sıra sende
  dusunuyor: 40,   // sıcak: çalışıyor
  konusuyor: 0,    // özgün mor/mavi
  hata: 200,       // soğuk: durdu
};

const YAZI: Record<string, string> = {
  dinliyor: 'Dinliyorum…',
  dusunuyor: 'Düşünüyorum…',
  konusuyor: 'Konuşuyorum…',
  hata: 'Sohbet durdu',
};

export function KonusmaEkrani() {
  /* Tek cevabın okunması (sohbet dışı). */
  const [okuyor, setOkuyor] = useState(false);
  const [sohbet, setSohbet] = useState<SohbetDurumu>(
    { asama: 'kapali', soru: '', cevap: '', hata: '' },
  );

  useEffect(() => konusmaDinle(setOkuyor), []);
  useEffect(() => sohbetDinle(setSohbet), []);

  const sohbetAcik = sohbet.asama !== 'kapali';
  const acik = sohbetAcik || okuyor;

  /*
   * Geri tuşu her şeyi susturuyor. Bu olmadan kullanıcı sayfadan çıkıyor
   * ama ses arkada okumaya devam ediyordu.
   */
  useEffect(() => {
    if (!acik) return;
    const kapat = () => { sohbetiKapat(); durdur(); };
    window.addEventListener('popstate', kapat);
    return () => window.removeEventListener('popstate', kapat);
  }, [acik]);

  if (!acik) return null;

  const asama = sohbetAcik ? sohbet.asama : 'konusuyor';
  const kapat = () => { if (sohbetAcik) sohbetiKapat(); else durdur(); };

  return (
    <div
      className="ses-ekran"
      role="dialog"
      aria-modal="true"
      aria-label={sohbetAcik ? 'Sesli sohbet' : 'Asistan konuşuyor'}
      onClick={kapat}
    >
      <div className={`ses-ekran__orb ses-ekran__orb--${asama}`}>
        <Suspense fallback={<div className="ses-ekran__yedek" />}>
          <GradientOrb ayar={{ ton: TON[asama] ?? 0 }} />
        </Suspense>
      </div>

      <p className="ses-ekran__yazi" aria-live="polite">
        {sohbetAcik ? YAZI[asama] : 'Okunuyor…'}
      </p>

      {/*
        * Duyulan söz ekranda: tanıma hata yaptığında kullanıcı NEDEN alakasız
        * bir cevap geldiğini ancak böyle anlayabiliyor.
        */}
      {sohbetAcik && sohbet.asama !== 'hata' && sohbet.soru && (
        <p className="ses-ekran__soru">“{sohbet.soru}”</p>
      )}

      {/*
        * Hata METİN olarak gösteriliyor, sessizce kapanmıyor. Sohbet
        * duruyorsa kullanıcı sebebini görmeli; yoksa "bozuk" diye
        * vazgeçiyor.
        */}
      {sohbet.hata && <p className="ses-ekran__hata">{sohbet.hata}</p>}

      <button
        type="button"
        className="ses-ekran__durdur"
        onClick={(e) => { e.stopPropagation(); kapat(); }}
      >
        <Square size={15} fill="currentColor" aria-hidden="true" />
        <span>
          {sohbet.asama === 'hata' ? 'Kapat' : (sohbetAcik ? 'Sohbeti bitir' : 'Durdur')}
        </span>
      </button>
    </div>
  );
}
