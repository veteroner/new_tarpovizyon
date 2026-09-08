import { useRef, useState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { kodIste, hataMetni } from './oturum';
import { useOturum } from './useOturum';
import './giris.css';

/**
 * Oturum girişi — e-posta, ardından altı haneli kod.
 *
 * ADI BİLEREK `OturumGirisi`: projede zaten bir `GirisEkrani` var ve o
 * TAMAMEN BAŞKA bir şey — masaüstü/mobil yönlendirmesi yapan bir kapak
 * bileşeni, kimlikle ilgisi yok. Aynı adı kullanmak, ikisini karıştıran bir
 * import'u sessiz bir hataya çevirirdi.
 *
 * ─── NEDEN ŞİFRE YOK ────────────────────────────────────────────────────────
 * Kullanıcı bu panele ayda birkaç kez giriyor; hatırlanmayan bir şifre bu
 * sıklıkta kural, istisna değil. Tek kullanımlık kodda "şifremi unuttum"
 * akışı diye ayrı bir şey yok — her giriş zaten o akış.
 *
 * ─── İKİ ADIM TEK EKRANDA ───────────────────────────────────────────────────
 * Ayrı sayfaya gitmek yerine aynı kart içinde adım değiştiriliyor: e-posta
 * girildikten sonra sayfa değişirse kullanıcı hangi adrese kod istediğini
 * göremez ve yazım hatasını fark edemez. Adres ekranda kalıyor, yanında da
 * onu değiştirecek bir düğme var.
 */

type Adim = { ad: 'eposta' } | { ad: 'kod'; eposta: string };

export function OturumGirisi({ baslik = 'TarpoVizyon Pro' }: { baslik?: string }) {
  const { girisYap } = useOturum();
  const [adim, setAdim] = useState<Adim>({ ad: 'eposta' });
  const [eposta, setEposta] = useState('');
  const [kod, setKod] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const kodAlani = useRef<HTMLInputElement>(null);

  const epostaGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null); setBekliyor(true);
    try {
      await kodIste(eposta);
      setAdim({ ad: 'kod', eposta: eposta.trim().toLowerCase() });
      // Kod alanına odak: mobilde klavye açık kalsın, kullanıcı alan aramasın.
      setTimeout(() => kodAlani.current?.focus(), 50);
    } catch (x) {
      setHata(hataMetni((x as { kod?: string }).kod));
    } finally { setBekliyor(false); }
  };

  const kodGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adim.ad !== 'kod') return;
    setHata(null); setBekliyor(true);
    try {
      await girisYap(adim.eposta, kod);
      /* Başarıda bir şey yapılmıyor: bağlam `girisli` olunca bu ekranı
         gösteren kapı zaten içeriği açıyor. Yönlendirme yazmak, bu bileşeni
         nereden çağrıldığını bilmek zorunda bırakırdı. */
    } catch (x) {
      setHata(hataMetni((x as { kod?: string }).kod));
      setKod('');
      kodAlani.current?.focus();
    } finally { setBekliyor(false); }
  };

  return (
    <div className="giris-sar">
      <div className="giris-kart">
        <div className="giris-rozet"><Mail size={22} aria-hidden="true" /></div>
        <h1 className="giris-baslik">{baslik}</h1>

        {adim.ad === 'eposta' ? (
          <>
            <p className="giris-alt">
              E-posta adresinizi girin, size tek kullanımlık bir giriş kodu gönderelim.
            </p>
            <form onSubmit={epostaGonder} className="giris-form">
              <label className="giris-etiket" htmlFor="giris-eposta">E-posta</label>
              <input
                id="giris-eposta"
                className="giris-alan"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="ornek@tarim.com"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
              />
              {hata && <p className="giris-hata" role="alert">{hata}</p>}
              <button className="giris-dugme" type="submit" disabled={bekliyor}>
                {bekliyor ? <Loader2 size={16} className="giris-donen" aria-hidden="true" /> : null}
                {bekliyor ? 'Gönderiliyor…' : 'Giriş kodu gönder'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="giris-alt">
              <b>{adim.eposta}</b> adresine altı haneli bir kod gönderdik.
              Kod 10 dakika geçerli.
            </p>
            <form onSubmit={kodGonder} className="giris-form">
              <label className="giris-etiket" htmlFor="giris-kod">Giriş kodu</label>
              <input
                id="giris-kod"
                ref={kodAlani}
                className="giris-alan giris-kod"
                type="text"
                inputMode="numeric"
                /* Tek kullanımlık kod otomatik doldurma ipucu: iOS ve Android
                   kodu SMS/e-posta bildiriminden okuyup önerebiliyor. */
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="000000"
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              {hata && <p className="giris-hata" role="alert">{hata}</p>}
              <button className="giris-dugme" type="submit" disabled={bekliyor || kod.length !== 6}>
                {bekliyor ? <Loader2 size={16} className="giris-donen" aria-hidden="true" /> : null}
                {bekliyor ? 'Doğrulanıyor…' : 'Giriş yap'}
              </button>
              <button
                className="giris-geri"
                type="button"
                onClick={() => { setAdim({ ad: 'eposta' }); setKod(''); setHata(null); }}
              >
                <ArrowLeft size={14} aria-hidden="true" /> Adresi değiştir
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
