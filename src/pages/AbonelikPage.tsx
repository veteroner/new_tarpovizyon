import { useEffect, useRef, useState } from 'react';
import { Sparkles, Check, Loader2, ShieldCheck } from 'lucide-react';
import { useOturum } from '../auth/useOturum';
import { OturumGirisi } from '../auth/OturumGirisi';
import { ayarOku, type Ayarlar } from './panel/yonetimApi';
import { odemeBaslat, odemeDogrula, odemeHatasi } from './abonelik/odemeApi';
import './abonelik/abonelik.css';

/**
 * Abonelik sayfası — plan seçimi ve ödeme.
 *
 * ─── KART ALANI ÇİZİLMİYOR ──────────────────────────────────────────────────
 * Ödeme formunu iyzico gönderiyor (`checkoutFormContent`) ve o form iyzico'nun
 * kendi alanına gidiyor. Kart numarası hiçbir zaman bizim sunucumuza
 * uğramıyor; bu, PCI kapsamının dışında kalmanın da tek pratik yolu. Kendi
 * kart alanımızı çizmek, kart verisini taşımak ve saklamak sorumluluğunu
 * üstlenmek olurdu.
 *
 * ─── SONUÇ CALLBACK'TEN OKUNMUYOR ───────────────────────────────────────────
 * Ödeme bitince iyzico kullanıcıyı geri gönderiyor ama o dönüşteki hiçbir
 * parametreye güvenilmiyor: adres kullanıcının tarayıcısında açılıyor, yani
 * elle çağrılabilir. Sonuç `odeme/dogrula` ile SUNUCUDAN iyzico'ya soruluyor.
 */

const AYLAR = { aylik: 'ay', yillik: 'yıl' } as const;

export default function AbonelikPage() {
  const { durum, kullanici, abonelik, tazele } = useOturum();
  const [ayarlar, setAyarlar] = useState<Ayarlar>({});
  const [plan, setPlan] = useState<'aylik' | 'yillik'>('yillik');
  const [form, setForm] = useState({ ad: '', soyad: '', gsm: '', tckn: '', sehir: '', adres: '' });
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ basarili: boolean; durum: string } | null>(null);
  const formKutusu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        const a = await ayarOku();
        if (!iptal) setAyarlar(a);
      } catch { /* fiyat okunamazsa aşağıda "—" görünür */ }
    })();
    return () => { iptal = true; };
  }, []);

  /*
   * iyzico dönüşte `?token=` ekliyor. Token varsa sonuç SORULUYOR — dönüşün
   * kendisi başarı sayılmıyor.
   */
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token || durum !== 'girisli') return;
    let iptal = false;
    void (async () => {
      try {
        const s = await odemeDogrula(token);
        if (iptal) return;
        setSonuc(s);
        if (s.basarili) await tazele();
      } catch (x) {
        if (!iptal) setHata(odemeHatasi(x));
      }
    })();
    return () => { iptal = true; };
  }, [durum, tazele]);

  if (durum === 'yukleniyor') return null;
  if (durum === 'girissiz') return <OturumGirisi baslik="Abonelik için giriş yapın" />;

  const aylik = Number(ayarlar.fiyat_aylik);
  const yillik = Number(ayarlar.fiyat_yillik);
  const tutar = plan === 'yillik' ? yillik : aylik;
  const indirim = aylik > 0 && yillik > 0 ? Math.round((1 - yillik / (aylik * 12)) * 100) : null;
  const fiyatVar = Number.isFinite(tutar) && tutar > 0;
  /*
   * TANITIM MODU: iyzico plan kodları henüz tanımlı değil. Sayfa tam
   * görünüyor (planlar, fiyatlar, indirim) ama ödeme akışı açılmıyor.
   *
   * Bunu bir HATA olarak göstermek yanlış olurdu — ortada bozulan bir şey
   * yok, kurulum henüz tamamlanmadı. Ama "ödemeye geç" düğmesini çalışır
   * göstermek de yanlış: tıklayan kullanıcı sunucudan hata alırdı.
   *
   * Sunucu bu durumda ZATEN `plan_tanimsiz` dönüyor; yani buradaki bayrak
   * bir güvenlik önlemi değil, arayüzün dürüst davranması. Bayrağı elle
   * '1' yapan biri bile abonelik açamaz.
   */
  const odemeHazir = ayarlar.odeme_hazir === '1';

  const odeme = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null); setBekliyor(true);
    try {
      const s = await odemeBaslat({ plan, ...form, callbackUrl: window.location.href });
      if (!s.checkoutFormContent) throw new Error('form_yok');
      /*
       * iyzico'nun HTML+script parçası `innerHTML` ile eklendiğinde script
       * ÇALIŞMAZ — tarayıcı böyle eklenen script etiketlerini yürütmüyor.
       * O yüzden script'ler tek tek yeniden oluşturuluyor.
       */
      const kutu = formKutusu.current;
      if (!kutu) return;
      kutu.innerHTML = s.checkoutFormContent;
      for (const eski of Array.from(kutu.querySelectorAll('script'))) {
        const yeni = document.createElement('script');
        for (const a of Array.from(eski.attributes)) yeni.setAttribute(a.name, a.value);
        yeni.text = eski.text;
        eski.parentNode?.replaceChild(yeni, eski);
      }
    } catch (x) {
      setHata(odemeHatasi(x));
    } finally { setBekliyor(false); }
  };

  if (sonuc) {
    return (
      <div className="ab-sar">
        <div className="ab-kart ab-orta">
          <div className={`ab-rozet ${sonuc.basarili ? 'ab-rozet-ok' : 'ab-rozet-hata'}`}>
            {sonuc.basarili ? <Check size={22} aria-hidden="true" /> : <ShieldCheck size={22} aria-hidden="true" />}
          </div>
          <h1 className="ab-baslik">{sonuc.basarili ? 'Aboneliğiniz başladı' : 'Ödeme tamamlanamadı'}</h1>
          <p className="ab-alt">
            {sonuc.basarili
              ? 'Pro bölümlerinin tamamı açıldı. İyi çalışmalar.'
              : `Ödeme onaylanmadı (${sonuc.durum || 'bilinmiyor'}). Kartınızdan çekim yapılmadıysa tekrar deneyebilirsiniz.`}
          </p>
          <a className="ab-dugme" href="/tarpovizyon/turkey/overview">Panele dön</a>
        </div>
      </div>
    );
  }

  return (
    <div className="ab-sar">
      <div className="ab-kart">
        <div className="ab-rozet"><Sparkles size={20} aria-hidden="true" /></div>
        <h1 className="ab-baslik">TarpoVizyon Pro</h1>
        <p className="ab-alt">
          Röntgen sinyalleri, aktarım zinciri, makro ölçek, dünya
          karşılaştırmaları ve maliyet–fiyat serileri.
        </p>

        {abonelik?.aktif && (
          <p className="ab-durum">
            Mevcut durumunuz: <b>{abonelik.durum === 'deneme' ? 'ücretsiz deneme' : 'aktif abonelik'}</b>
            {abonelik.kalanGun != null && <> · {abonelik.kalanGun} gün kaldı</>}
          </p>
        )}

        <div className="ab-planlar" role="radiogroup" aria-label="Abonelik planı">
          {(['yillik', 'aylik'] as const).map((p) => {
            const t = p === 'yillik' ? yillik : aylik;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={plan === p}
                className={`ab-plan${plan === p ? ' ab-plan-secili' : ''}`}
                onClick={() => setPlan(p)}
              >
                <span className="ab-plan-ad">{p === 'yillik' ? 'Yıllık' : 'Aylık'}</span>
                <span className="ab-plan-tutar">
                  {Number.isFinite(t) && t > 0 ? `${t.toLocaleString('tr-TR')} ₺` : '—'}
                  <span className="ab-plan-birim">/{AYLAR[p]}</span>
                </span>
                {p === 'yillik' && indirim != null && indirim > 0 && (
                  <span className="ab-plan-indirim">%{indirim} indirim</span>
                )}
              </button>
            );
          })}
        </div>

        {!fiyatVar && (
          <p className="ab-hata" role="alert">
            Fiyatlar henüz tanımlanmamış. Lütfen daha sonra tekrar deneyin.
          </p>
        )}

        {fiyatVar && !odemeHazir && (
          <p className="ab-bilgi">
            Çevrimiçi ödeme kurulumu sürüyor. Abonelik açmak için bizimle
            iletişime geçebilirsiniz.
          </p>
        )}

        {odemeHazir && (
        <form className="ab-form" onSubmit={odeme}>
          <div className="ab-satir">
            <label className="ab-alan">
              <span className="ab-etiket">Ad</span>
              <input className="ab-girdi" required value={form.ad}
                onChange={(e) => setForm({ ...form, ad: e.target.value })} autoComplete="given-name" />
            </label>
            <label className="ab-alan">
              <span className="ab-etiket">Soyad</span>
              <input className="ab-girdi" required value={form.soyad}
                onChange={(e) => setForm({ ...form, soyad: e.target.value })} autoComplete="family-name" />
            </label>
          </div>
          <div className="ab-satir">
            <label className="ab-alan">
              <span className="ab-etiket">Telefon</span>
              <input className="ab-girdi" required inputMode="tel" placeholder="+905551112233"
                value={form.gsm} onChange={(e) => setForm({ ...form, gsm: e.target.value })} autoComplete="tel" />
            </label>
            <label className="ab-alan">
              <span className="ab-etiket">Şehir</span>
              <input className="ab-girdi" required value={form.sehir}
                onChange={(e) => setForm({ ...form, sehir: e.target.value })} autoComplete="address-level2" />
            </label>
          </div>
          <label className="ab-alan">
            <span className="ab-etiket">Fatura adresi</span>
            <input className="ab-girdi" required value={form.adres}
              onChange={(e) => setForm({ ...form, adres: e.target.value })} autoComplete="street-address" />
          </label>
          <label className="ab-alan">
            <span className="ab-etiket">TC Kimlik No <span className="ab-istege-bagli">(isteğe bağlı)</span></span>
            <input className="ab-girdi" inputMode="numeric" maxLength={11} value={form.tckn}
              onChange={(e) => setForm({ ...form, tckn: e.target.value.replace(/\D/g, '') })} />
          </label>

          {hata && <p className="ab-hata" role="alert">{hata}</p>}

          <button className="ab-dugme" type="submit" disabled={bekliyor || !fiyatVar}>
            {bekliyor && <Loader2 size={15} aria-hidden="true" className="ab-donen" />}
            {bekliyor ? 'Hazırlanıyor…' : 'Ödemeye geç'}
          </button>

          <p className="ab-not">
            <ShieldCheck size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Kart bilgileriniz iyzico'nun güvenli formuna giriliyor; bizim
            sunucumuza hiç uğramıyor.
          </p>
          <p className="ab-not" style={{ opacity: .75 }}>{kullanici?.eposta}</p>
        </form>
        )}

        {/* iyzico formu buraya yerleşiyor. */}
        <div ref={formKutusu} className="ab-iyzico" />
      </div>
    </div>
  );
}
