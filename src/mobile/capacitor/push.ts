import OneSignal, {
  type NotificationClickEvent,
  type PushSubscriptionChangedState,
  type UserChangedState,
} from 'onesignal-cordova-plugin';
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

    push_gozlemcileri();
    await push_rontgen();
  } catch (e) {
    // Push kurulumu, uygulamanın geri kalanını ASLA düşürmemeli.
    console.error('[OneSignal] init hatası:', e);
  }
}

/*
 * ─── RÖNTGEN ────────────────────────────────────────────────────────────────
 * Xcode konsolu Cordova köprüsünün YALNIZCA gidiş yönünü basıyor
 * ("To Native Cordova -> OneSignalPush getPushSubscriptionToken"); dönen değer
 * görünmüyor. Yani init'in çalıştığını görmek, TOKEN ÜRETİLDİĞİNİ göstermiyor —
 * ikisi ayrı sorular ve panelde `DeviceTokenNotForTopic` görürken ayırt etmek
 * şart. Bu blok cevabı konsola yazıyor.
 *
 * Yalnızca gözlem yapıyor, hiçbir şeyi değiştirmiyor; hata verse bile push
 * kurulumunu etkilemesin diye kendi try/catch'inde.
 */
/*
 * İlk röntgen, OneSignal'in SUNUCUYA kayıt turu bitmeden okuyor: token yerelde
 * hazır olsa bile abonelik kimliği o anda hâlâ boş olabiliyor (SDK'nın
 * "null OneSignal ID" uyarısı da bu ana ait). Kimliğin GELİP GELMEDİĞİ,
 * kaydın başarılı olup olmadığının asıl ölçüsü — o yüzden tek seferlik
 * okuma yetmez, değişimi dinlemek gerekiyor.
 */
function push_gozlemcileri(): void {
  try {
    OneSignal.User.pushSubscription.addEventListener('change', (e: PushSubscriptionChangedState) => {
      const y = e.current;
      console.log('[OneSignal] ABONELİK DEĞİŞTİ', JSON.stringify({
        abonelikId: y.id ?? '(YOK)',
        token: y.token ? `${y.token.slice(0, 8)}… (${y.token.length} hane)` : '(YOK)',
        optedIn: y.optedIn,
      }));
    });

    OneSignal.User.addEventListener('change', (e: UserChangedState) => {
      console.log('[OneSignal] KULLANICI DEĞİŞTİ', JSON.stringify({
        onesignalId: e.current.onesignalId ?? '(YOK)',
      }));
    });
  } catch (e) {
    console.warn('[OneSignal] Gözlemciler bağlanamadı:', e);
  }
}

async function push_rontgen(): Promise<void> {
  try {
    const [izin, id, token, optedIn] = await Promise.all([
      OneSignal.Notifications.getPermissionAsync(),
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
    ]);

    console.log('[OneSignal] RÖNTGEN', JSON.stringify({
      izin,
      optedIn,
      abonelikId: id ?? '(YOK)',
      // Token'ın tamamı gerekmiyor; VAR/YOK ile uzunluğu teşhis için yeterli.
      token: token ? `${token.slice(0, 8)}… (${token.length} hane)` : '(YOK)',
    }));

    if (!token) {
      console.warn(
        '[OneSignal] APNs token YOK. Sebep: izin verilmemiş, aygıt kaydı ' +
        'tamamlanmamış ya da yapı push yetkisi (aps-environment) olmadan imzalanmış.',
      );
    }
  } catch (e) {
    console.warn('[OneSignal] Röntgen okunamadı:', e);
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
