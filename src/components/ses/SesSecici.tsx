import { useEffect, useState } from 'react';
import { erkekSesMi, konus, sesiSec, seciliSesAdi, turkceSesler } from './konusma';

/**
 * Ayarlardaki Türkçe ses seçici.
 *
 * ─── NEDEN ELLE SEÇİM GEREKLİ ───────────────────────────────────────────────
 * Web Speech API sesin CİNSİYETİNİ söylemiyor; elimizde yalnızca ad var.
 * Erkek sesler bilinen adlarla tahmin ediliyor ama liste hiçbir cihazda
 * garanti değil ve hangi seslerin yüklü olduğu telefondan telefona değişiyor.
 *
 * Bu yüzden tahmin son söz değil: kullanıcı cihazında gerçekten ne varsa
 * onu görüp seçebiliyor.
 *
 * ─── NEDEN DENEME DÜĞMESİ ───────────────────────────────────────────────────
 * Ad tek başına sesin nasıl olduğunu söylemiyor. Seçmeden önce dinlemek,
 * "hangisi erkek" sorusunun tek kesin cevabı.
 */

/* Rakam içeriyor: okuma düzeltmesinin de çalıştığı aynı anda duyuluyor. */
const DENEME = 'Büyükbaş hayvan sayısı 17.708.985 baş.';

export function SesSecici() {
  const [sesler, setSesler] = useState<SpeechSynthesisVoice[]>([]);
  const [secili, setSecili] = useState(seciliSesAdi());

  useEffect(() => {
    /*
     * Sesler eşzamansız yükleniyor ve ilk çağrıda çoğu cihazda BOŞ dönüyor.
     * `voiceschanged` beklenmezse liste boş görünüp "cihazda Türkçe ses yok"
     * gibi yanlış bir sonuç veriyordu.
     */
    const oku = () => setSesler(turkceSesler());
    oku();
    window.speechSynthesis?.addEventListener?.('voiceschanged', oku);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', oku);
  }, []);

  if (!sesler.length) {
    return (
      <p className="ios-ses-bos">
        Cihazda Türkçe ses bulunamadı. iPhone'da Ayarlar → Erişilebilirlik →
        Sözlü İçerik → Sesler bölümünden Türkçe ses indirebilirsiniz.
      </p>
    );
  }

  const sec = (ad: string) => {
    sesiSec(ad);
    setSecili(ad);
    /* Seçimin sesini hemen duyurmak, listeyi anlamlı kılan şey. */
    konus(DENEME);
  };

  return (
    <div className="ios-ses-liste">
      <button
        type="button"
        className={`ios-ses-oge${secili === '' ? ' ios-ses-oge--secili' : ''}`}
        onClick={() => sec('')}
      >
        <span className="ios-ses-ad">Otomatik</span>
        <span className="ios-ses-not">Varsa erkek ses tercih edilir</span>
      </button>

      {sesler.map((v) => (
        <button
          key={v.name}
          type="button"
          className={`ios-ses-oge${secili === v.name ? ' ios-ses-oge--secili' : ''}`}
          onClick={() => sec(v.name)}
        >
          <span className="ios-ses-ad">{v.name}</span>
          <span className="ios-ses-not">
            {erkekSesMi(v) ? 'erkek olabilir · ' : ''}
            {v.localService ? 'cihazda' : 'internet gerekir'}
          </span>
        </button>
      ))}
    </div>
  );
}
