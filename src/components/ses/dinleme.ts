import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeTanima } from '@capacitor-community/speech-recognition';

/**
 * Konuşmayı yazıya çevirme (STT) — iki yol, tek arayüz.
 *
 * ─── NEDEN İKİ YOL ──────────────────────────────────────────────────────────
 * Web Speech (`SpeechRecognition`) Android ve masaüstünde çalışıyor ama
 * iOS'ta HİÇ YOK: Safari'de de, iPhone'daki Chrome'da da, çünkü hepsi
 * WebKit üstünde. Novalingo yalnızca bu yolu kullanıyor ve orada konuşma
 * tanıma iPhone'da sessizce kapalı.
 *
 * iPhone'u kapsamak için native eklenti gerekiyor: iOS'ta SFSpeechRecognizer,
 * Android'de sistem tanıyıcısı. Web sürümünde eklenti yok, orada Web Speech'e
 * düşülüyor.
 *
 * ─── SUNUCUDA WHISPER NEDEN DEĞİL ───────────────────────────────────────────
 * Her yerde çalışırdı ama üç bedeli var: dakika başına ücret, kaydın bitmesi
 * beklendiği için gecikme, ve kullanıcının sesinin cihazdan çıkması. Yukarıdaki
 * iki yol gerçek kullanıcıların tamamını zaten kapsıyor.
 */

type Sonuc = (metin: string, kesin: boolean) => void;
type Bitti = () => void;

/*
 * Web Speech tipleri elle tanımlı: TS'in DOM kütüphanesinde bu API her
 * sürümde bulunmuyor ve `lib` ayarına bağlı. İhtiyacımız olan kadarı.
 */
interface WebSonucOlayi {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface WebTanima {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((olay: WebSonucOlayi) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

const nativeVar = Capacitor.isNativePlatform();

const WebTanimaCtor: (new () => WebTanima) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
      (new () => WebTanima) | undefined
    : undefined;

/**
 * Bu cihazda dinleme mümkün mü?
 *
 * Native tarafta eklentinin gerçekten kullanılabilir olduğunu ancak
 * `available()` söylüyor (eski Android sürümlerinde tanıyıcı olmayabiliyor),
 * bu yüzden eşzamansız.
 */
export async function dinlemeDestekleniyorMu(): Promise<boolean> {
  if (nativeVar) {
    try {
      const { available } = await NativeTanima.available();
      return available;
    } catch { return false; }
  }
  return Boolean(WebTanimaCtor);
}

/** Web tarafında etkin tanıma; durdurabilmek için tutuluyor. */
let webTanima: WebTanima | null = null;
let etkin = false;

export const dinliyorMu = () => etkin;

/**
 * Dinlemeye başlar.
 *
 * `onSonuc` ara sonuçlarla da çağrılıyor (`kesin=false`): kullanıcı
 * konuşurken yazının belirmesi, sistemin kendisini duyduğunun tek işareti.
 * Yalnızca kesin sonucu göstermek, birkaç saniye boyunca hiçbir şey olmuyor
 * gibi hissettiriyor.
 */
export async function dinlemeyeBasla(onSonuc: Sonuc, onBitti: Bitti): Promise<boolean> {
  if (etkin) return false;

  if (nativeVar) {
    try {
      /*
       * İzin ÖNCE isteniyor. `start()` izinsiz çağrılınca bazı sürümlerde
       * sessizce hiçbir şey yapmıyor ve kullanıcı mikrofonun bozuk olduğunu
       * sanıyor.
       */
      const izin = await NativeTanima.checkPermissions();
      if (izin.speechRecognition !== 'granted') {
        const istek = await NativeTanima.requestPermissions();
        if (istek.speechRecognition !== 'granted') return false;
      }

      await NativeTanima.removeAllListeners();
      await NativeTanima.addListener('partialResults', (veri: { matches?: string[] }) => {
        const m = veri?.matches?.[0];
        if (m) onSonuc(m, false);
      });
      await NativeTanima.addListener('listeningState', (veri: { status?: string }) => {
        if (veri?.status === 'stopped') { etkin = false; onBitti(); }
      });

      etkin = true;
      /*
       * `start()` native tarafta SON sonucu da döndürüyor. `partialResults`
       * açıkken bu çözünme dinleme bitince geliyor; kesin sonuç olarak
       * işaretleniyor.
       */
      NativeTanima.start({
        language: 'tr-TR',
        partialResults: true,
        popup: false,
      }).then((sonuc: { matches?: string[] }) => {
        const m = sonuc?.matches?.[0];
        if (m) onSonuc(m, true);
      }).catch(() => { /* iptal ya da sessizlik — onBitti listener'dan gelir */ });

      return true;
    } catch {
      etkin = false;
      return false;
    }
  }

  if (!WebTanimaCtor) return false;
  const tanima = new WebTanimaCtor();
  webTanima = tanima;
  tanima.lang = 'tr-TR';
  tanima.continuous = false;
  tanima.interimResults = true;
  tanima.maxAlternatives = 1;

  tanima.onresult = (olay: WebSonucOlayi) => {
    for (let i = olay.resultIndex; i < olay.results.length; i++) {
      const s = olay.results[i];
      onSonuc(s[0].transcript, s.isFinal);
    }
  };
  tanima.onerror = () => { etkin = false; webTanima = null; onBitti(); };
  tanima.onend = () => { etkin = false; webTanima = null; onBitti(); };

  try {
    tanima.start();
    etkin = true;
    return true;
  } catch {
    etkin = false;
    webTanima = null;
    return false;
  }
}

/** Dinlemeyi durdurur. */
export async function dinlemeyiDurdur(): Promise<void> {
  if (!etkin) return;
  if (nativeVar) {
    try { await NativeTanima.stop(); } catch { /* zaten durmuş */ }
    etkin = false;
    return;
  }
  try { webTanima?.stop(); } catch { /* zaten durmuş */ }
}
