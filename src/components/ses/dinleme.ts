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

export type DinlemeSecenek = {
  /**
   * Bu kadar süre yeni bir kelime gelmezse dinleme kendiliğinden bitiyor.
   *
   * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────
   * iOS'ta SFSpeechRecognizer sessizlikte KENDİLİĞİNDEN DURMUYOR; `stop()`
   * çağrılana kadar mikrofon açık kalıyor. Cihazda görüldü: kullanıcı sorusunu
   * bitiriyor, yazı ekranda duruyor ama sohbet "Dinliyorum…" aşamasında
   * kilitleniyor ve cevaba hiç geçmiyor.
   *
   * Android'in yerleşik sessizlik algılaması var; orada bu sayaç zaten
   * tetiklenmeden önce tanıyıcı bitiyor. Yani iki platformda da doğru
   * çalışıyor, iOS'ta ise TEK çalışan mekanizma bu.
   */
  sessizlikMs?: number;
  /** Hiç konuşulmazsa bu süre sonunda vazgeçiliyor. */
  ilkSesBeklemeMs?: number;
  /** Mutlak üst sınır — mikrofon hiçbir koşulda bundan uzun açık kalmasın. */
  enFazlaMs?: number;
};

const VARSAYILAN_SECENEK: Required<DinlemeSecenek> = {
  sessizlikMs: 1800,
  ilkSesBeklemeMs: 7000,
  enFazlaMs: 25000,
};

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

/**
 * Oturumun "bitti" bildirimi — bir kez ve MUTLAKA çağrılıyor.
 *
 * ─── NEDEN MODÜL SEVİYESİNDE ────────────────────────────────────────────────
 * Önce bitiş yalnızca native olayından geliyordu ve `dinlemeyiDurdur()`
 * arayüze hiç haber vermiyordu. Üstüne `if (!etkin) return` erken çıkışı
 * vardı: tanıyıcı kendiliğinden bittiyse durdurma hiçbir şey yapmıyor, arayüz
 * de "dinliyor" durumunda kilitli kalıyordu. Cihazda görüldü — kırmızı durdur
 * düğmesine basmak mikrofonu kapatmıyordu.
 *
 * Artık bitiş tek yerden ve tek kez veriliyor; olay gelse de gelmese de.
 */
let bittiGeriCagri: (() => void) | null = null;

/** Sessizlik ve üst sınır sayaçları. */
let sessizlikSayaci: ReturnType<typeof setTimeout> | null = null;
let enFazlaSayaci: ReturnType<typeof setTimeout> | null = null;

function sayaclariTemizle() {
  if (sessizlikSayaci) { clearTimeout(sessizlikSayaci); sessizlikSayaci = null; }
  if (enFazlaSayaci) { clearTimeout(enFazlaSayaci); enFazlaSayaci = null; }
}

function bitirBildir() {
  sayaclariTemizle();
  const f = bittiGeriCagri;
  bittiGeriCagri = null;   // ikinci kez çağrılmasın
  etkin = false;
  f?.();
}

export const dinliyorMu = () => etkin;

/**
 * Dinlemeye başlar.
 *
 * `onSonuc` ara sonuçlarla da çağrılıyor (`kesin=false`): kullanıcı
 * konuşurken yazının belirmesi, sistemin kendisini duyduğunun tek işareti.
 * Yalnızca kesin sonucu göstermek, birkaç saniye boyunca hiçbir şey olmuyor
 * gibi hissettiriyor.
 */
export async function dinlemeyeBasla(
  onSonuc: Sonuc,
  onBitti: Bitti,
  secenek: DinlemeSecenek = {},
): Promise<boolean> {
  if (etkin) return false;
  bittiGeriCagri = onBitti;

  const ayar = { ...VARSAYILAN_SECENEK, ...secenek };

  /*
   * Her yeni kelimede sessizlik sayacı sıfırlanıyor; kullanıcı susunca
   * sayaç dolup dinlemeyi bitiriyor. Gerekçesi `DinlemeSecenek` başında.
   */
  const sessizligiErtele = () => {
    if (sessizlikSayaci) clearTimeout(sessizlikSayaci);
    sessizlikSayaci = setTimeout(() => { void dinlemeyiDurdur(); }, ayar.sessizlikMs);
  };

  const sonucSar: Sonuc = (metin, kesin) => {
    sessizligiErtele();
    onSonuc(metin, kesin);
  };

  sayaclariTemizle();
  /* Hiç konuşulmazsa da bitmeli; ilk ses gelene kadar daha uzun bekleniyor. */
  sessizlikSayaci = setTimeout(() => { void dinlemeyiDurdur(); }, ayar.ilkSesBeklemeMs);
  enFazlaSayaci = setTimeout(() => { void dinlemeyiDurdur(); }, ayar.enFazlaMs);

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
        if (m) sonucSar(m, false);
      });
      await NativeTanima.addListener('listeningState', (veri: { status?: string }) => {
        if (veri?.status === 'stopped') bitirBildir();
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
        if (m) sonucSar(m, true);
      }).catch(() => { /* iptal ya da sessizlik — onBitti listener'dan gelir */ });

      return true;
    } catch {
      sayaclariTemizle();
      bittiGeriCagri = null;
      etkin = false;
      return false;
    }
  }

  if (!WebTanimaCtor) { sayaclariTemizle(); bittiGeriCagri = null; return false; }
  const tanima = new WebTanimaCtor();
  webTanima = tanima;
  tanima.lang = 'tr-TR';
  tanima.continuous = false;
  tanima.interimResults = true;
  tanima.maxAlternatives = 1;

  tanima.onresult = (olay: WebSonucOlayi) => {
    for (let i = olay.resultIndex; i < olay.results.length; i++) {
      const s = olay.results[i];
      sonucSar(s[0].transcript, s.isFinal);
    }
  };
  tanima.onerror = () => { webTanima = null; bitirBildir(); };
  tanima.onend = () => { webTanima = null; bitirBildir(); };

  try {
    tanima.start();
    etkin = true;
    return true;
  } catch {
    sayaclariTemizle();
    webTanima = null;
    bittiGeriCagri = null;
    etkin = false;
    return false;
  }
}

/**
 * Dinlemeyi durdurur.
 *
 * ERKEN ÇIKIŞ YOK: `etkin` false olsa bile durdurma denenip bitiş
 * bildiriliyor. Aksi hâlde tanıyıcı kendiliğinden bittiğinde arayüz
 * "dinliyor"da kilitli kalıyordu.
 */
export async function dinlemeyiDurdur(): Promise<void> {
  if (nativeVar) {
    try { await NativeTanima.stop(); } catch { /* zaten durmuş */ }
    try { await NativeTanima.removeAllListeners(); } catch { /* yok */ }
    bitirBildir();
    return;
  }
  try { webTanima?.stop(); } catch { /* zaten durmuş */ }
  /*
   * Web'de `onend` genelde geliyor ama garanti değil (izin reddi, sekme
   * arkaya alınması). Bir tur bekleyip hâlâ bildirilmediyse elle bitiriyoruz.
   */
  setTimeout(() => { if (bittiGeriCagri) bitirBildir(); }, 300);
}
