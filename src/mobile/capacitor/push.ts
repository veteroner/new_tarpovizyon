import OneSignal, { type NotificationClickEvent } from 'onesignal-cordova-plugin';
import { isPlatform } from '../utils/platform';

/**
 * OneSignal push bildirimleri — ANA uygulama.
 *
 * ─── NEDEN ONESIGNAL, NEDEN BURADA ──────────────────────────────────────────
 * Push daha önce ESKİ `tarpovizyon-mobile/` kopyasında OneSignal ile kurulmuştu
 * ama kök uygulamaya hiç bağlanmamıştı: eklenti kurulu değildi, `initOneSignal`
 * hiçbir yerden çağrılmıyordu, entitlements yoktu. Bu modül o kurulumu kök
 * uygulamaya taşıyor.
 *
 * NOT: Rasyon'un ayrı bir sahte push servisi var (`@capacitor/push-notifications`
 * → stub); ona dokunulmuyor. Bu modül tamamen ayrı ve GERÇEK olan.
 *
 * ─── SIR DEĞİL ──────────────────────────────────────────────────────────────
 * App ID herkese açık bir kimliktir (istemci koduna gömülmesi normaldir). SIR
 * olan REST API anahtarıdır ve o yalnızca SUNUCUDA (Worker/senkron) durur —
 * istemci tarafına hiç inmez.
 */

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID
  ?? 'f5ef3915-e366-425f-a467-029f350cb296';

/*
 * ─── DEEP LINK: BİLDİRİME DOKUNUNCA SAYFA AÇMA ──────────────────────────────
 * Tıklama işleyicisi React AĞACININ DIŞINDA çalışıyor (OneSignal native'den
 * çağırıyor), yani `useNavigate` doğrudan kullanılamıyor. Çözüm: bir üst
 * bileşen `useNavigate`'i buraya KAYDEDİYOR (`setPushNavigator`), işleyici de
 * kayıtlı fonksiyonu çağırıyor.
 *
 * Eski kod `window.location.hash = route` yapıyordu; ama kök uygulama
 * BrowserRouter (hash değil, path). Hash yolu burada çalışmaz.
 *
 * SOĞUK BAŞLATMA: kullanıcı uygulama KAPALIYKEN bildirime dokunursa, tıklama
 * React daha kurulmadan gelebilir. O yüzden hedef yol `bekleyenYol`da saklanıp
 * navigator kaydolunca boşaltılıyor — bildirim yem olmuyor.
 */
type Navigator = (yol: string) => void;
let navigator: Navigator | null = null;
let bekleyenYol: string | null = null;

export function setPushNavigator(fn: Navigator): void {
  navigator = fn;
  if (bekleyenYol) {
    fn(bekleyenYol);
    bekleyenYol = null;
  }
}

function yonlendir(yol: string): void {
  if (navigator) navigator(yol);
  else bekleyenYol = yol; // React henüz hazır değil (soğuk başlatma)
}

export async function initPush(): Promise<void> {
  // Web'de OneSignal cordova eklentisi yok; sessizce atlanıyor.
  if (!isPlatform('capacitor')) return;

  try {
    OneSignal.initialize(APP_ID);

    /*
     * Tıklama: `additionalData.route` varsa oraya git. Sunucu gönderiminde bu
     * alan, güncellenen verinin sayfasının yolunu taşıyor
     * (ör. "/tarpovizyon-basic/cig-sut/ekonomik-gostergeler").
     */
    OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as { route?: string } | undefined;
      if (data?.route) yonlendir(data.route);
    });

    /*
     * İzin istemi. iOS'ta bu sistem iznini gerektiriyor; Android 13+ da öyle.
     * `fallbackToSettings` verilmiyor — kullanıcı reddederse onu doğrudan
     * Ayarlar'a atmak agresif; reddi reddediş olarak bırakıyoruz.
     */
    await OneSignal.Notifications.requestPermission(false);
  } catch (e) {
    // Push kurulumu, uygulamanın geri kalanını ASLA düşürmemeli.
    console.error('[OneSignal] init hatası:', e);
  }
}

/** Bildirim izni verilmiş mi? (Ayarlar ekranı için) */
export function pushIzniVar(): boolean {
  if (!isPlatform('capacitor')) return false;
  try {
    return OneSignal.Notifications.hasPermission();
  } catch {
    return false;
  }
}
