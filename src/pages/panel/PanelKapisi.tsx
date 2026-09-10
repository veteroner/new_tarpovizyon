import { useState } from 'react';
import { Lock, Loader2, KeyRound } from 'lucide-react';
import { panelGiris, panelHatasi } from './yonetimApi';
import '../../auth/giris.css';

/**
 * Panel kapısı — kimlik doğrulanmadan hiçbir şey çizilmiyor.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * Panel yolu açıktı: başlık, dört sekme adı ve form yapısı kimlik sorulmadan
 * görünüyordu. Veri gelmiyordu (uçlar yetki istiyor) ama panelin VARLIĞI,
 * hangi tabloların yönetildiği ve hangi işlemlerin bulunduğu dışarıya
 * sızıyordu. Bunların hiçbirinin görünmesi gerekmiyor.
 *
 * ─── TOTP TERCİH, ANAHTAR GEÇİŞ ─────────────────────────────────────────────
 * Sunucuda `ADMIN_TOTP_SECRET` henüz tanımlı değil. Kapıyı yalnız koda
 * bağlamak, TOTP kurulana kadar paneli tümüyle kilitlerdi; o yüzden sabit
 * anahtar da kabul ediliyor ve hangisinin geçerli olduğunu SUNUCU söylüyor
 * (`totpKurulu`). TOTP kurulup `ADMIN_KEY` silindiğinde anahtar alanı
 * kendiliğinden işe yaramaz oluyor — istemcide değişiklik gerekmiyor.
 */
export function PanelKapisi({ acildi }: { acildi: () => void }) {
  const [kod, setKod] = useState('');
  const [anahtar, setAnahtar] = useState('');
  const [anahtarModu, setAnahtarModu] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null); setBekliyor(true);
    try {
      await panelGiris(anahtarModu ? { anahtar } : { kod });
      acildi();
    } catch (x) {
      setHata(panelHatasi(x));
      /* Sunucu TOTP'nin kurulu OLMADIĞINI söylüyorsa anahtar alanına
         geçiliyor — kullanıcı olmayan bir kodu aramasın. */
      if ((x as { ek?: { totpKurulu?: boolean } })?.ek?.totpKurulu === false) setAnahtarModu(true);
      setKod('');
    } finally { setBekliyor(false); }
  };

  return (
    <div className="giris-sar">
      <div className="giris-kart">
        <div className="giris-rozet"><Lock size={22} aria-hidden="true" /></div>
        <h1 className="giris-baslik">Yönetim</h1>
        <p className="giris-alt">
          {anahtarModu
            ? 'Yönetici anahtarını girin.'
            : 'Doğrulama uygulamanızdaki altı haneli kodu girin.'}
        </p>

        <form onSubmit={gonder} className="giris-form">
          {anahtarModu ? (
            <>
              <label className="giris-etiket" htmlFor="panel-anahtar">Yönetici anahtarı</label>
              <input
                id="panel-anahtar"
                className="giris-alan"
                type="password"
                autoComplete="off"
                required
                value={anahtar}
                onChange={(e) => setAnahtar(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="giris-etiket" htmlFor="panel-kod">Doğrulama kodu</label>
              <input
                id="panel-kod"
                className="giris-alan giris-kod"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </>
          )}

          {hata && <p className="giris-hata" role="alert">{hata}</p>}

          <button
            className="giris-dugme"
            type="submit"
            disabled={bekliyor || (anahtarModu ? !anahtar : kod.length !== 6)}
          >
            {bekliyor && <Loader2 size={16} className="giris-donen" aria-hidden="true" />}
            {bekliyor ? 'Doğrulanıyor…' : 'Gir'}
          </button>

          <button
            className="giris-geri"
            type="button"
            onClick={() => { setAnahtarModu((v) => !v); setHata(null); }}
          >
            <KeyRound size={14} aria-hidden="true" />
            {anahtarModu ? 'Kod ile gir' : 'Anahtar ile gir'}
          </button>
        </form>
      </div>
    </div>
  );
}
