import { okunabilirMetin } from './okunabilirMetin';

/**
 * Sesli okuma — cihazın kendi sentezleyicisiyle (Web Speech).
 *
 * ─── NEDEN CİHAZIN SESİ, NEDEN SUNUCU DEĞİL ─────────────────────────────────
 * Novalingo'da TTS önceden üretilmiş MP3'lerden geliyor: metni sabit müfredat
 * olduğu için her cümle önceden üretilebiliyor, kalite yüksek ve maliyet
 * sıfır. Bizde bu mümkün değil — asistanın cevabı her seferinde farklı.
 *
 * Cihazın sentezleyicisi bedava, anahtarsız, çevrimdışı çalışıyor ve hem
 * iOS'ta hem Android'de var. Karşılığında kalite bizim elimizde değil.
 *
 * ─── SES KİLİDİ ─────────────────────────────────────────────────────────────
 * Mobil tarayıcılar kullanıcı dokunmadan ses çalmıyor. İlk dokunuşta sessiz
 * bir ses çalınıp kilit açılıyor; bu yapılmazsa ilk "oku" isteği sessizce
 * hiçbir şey yapmıyor ve kullanıcı düğmenin bozuk olduğunu sanıyor.
 */

type Dinleyici = (konusuyor: boolean) => void;

const desteklenir = typeof window !== 'undefined' && 'speechSynthesis' in window;

let kilitAcik = false;
let konusuyor = false;
const dinleyiciler = new Set<Dinleyici>();

/**
 * Her `konus()` çağrısı kendi neslini alıyor ve yalnızca EN SON nesil
 * "bitti" diyebiliyor.
 *
 * Bu olmadan şöyle kırılıyor: kullanıcı okuma sürerken başka bir cevabı
 * okutuyor, `cancel()` eskisinin `onend`'ini tetikliyor, o da "konuşma
 * bitti" diyor ve YENİ başlamış okuma daha ilk saniyesindeyken düğme
 * "durdu" görünüyor.
 */
let nesil = 0;

function bildir(durum: boolean) {
  konusuyor = durum;
  for (const d of dinleyiciler) d(durum);
}

export const sesDestekleniyorMu = () => desteklenir;
export const konusuyorMu = () => konusuyor;

/** Konuşma durumu değişince haber verir; abonelikten çıkma işlevi döner. */
export function konusmaDinle(d: Dinleyici): () => void {
  dinleyiciler.add(d);
  return () => { dinleyiciler.delete(d); };
}

/**
 * Sessiz bir ses çalarak kilidi açar. Kullanıcı dokunuşu içinde çağrılmalı.
 *
 * ─── METİN BOŞ DEĞİL, BOŞLUK ────────────────────────────────────────────────
 * Önce boş dize kullanılıyordu. iOS cihazda ölçüldü: boş metin SSML sanılıp
 * ayrıştırılmaya çalışılıyor ve düşüyor —
 *   Could not parse SSML: No single root node found. Found 0 nodes at top-level
 * Tek boşluk aynı işi görüyor, ayrıştırıcı da mutlu.
 */
export function sesKilidiniAc(): void {
  if (!desteklenir || kilitAcik) return;
  try {
    const bos = new SpeechSynthesisUtterance(' ');
    bos.volume = 0;
    window.speechSynthesis.speak(bos);
    kilitAcik = true;
  } catch { /* kilit açılamadı; konus() yine de denenecek */ }
}

/**
 * Bilinen ERKEK Türkçe ses adları.
 *
 * ─── NEDEN AD LİSTESİ ───────────────────────────────────────────────────────
 * Web Speech API sesin cinsiyetini SÖYLEMİYOR — elimizde yalnızca ad ve dil
 * var. Cinsiyeti anlamanın tek yolu bilinen adları tanımak.
 *
 * Liste platformlara göre: Tolga/Ahmet Microsoft (Edge, Windows), Cem ve
 * Yusuf Apple tarafında görülebiliyor, Erkan/Volkan bazı Android
 * kurulumlarında. Hiçbiri garanti değil; cihazda yoksa liste sessizce
 * atlanıyor.
 */
const ERKEK_SESLER = ['tolga', 'ahmet', 'cem', 'yusuf', 'erkan', 'volkan', 'burak', 'emre'];

/** Kullanıcı elle seçtiyse o sesin adı; boşsa otomatik. */
const SES_ANAHTARI = 'tarpo.ses.adi';

/** Cihazdaki Türkçe sesler — ayarlarda listelemek için. */
export function turkceSesler(): SpeechSynthesisVoice[] {
  if (!desteklenir) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^tr(-|_|$)/i.test(v.lang));
}

export function seciliSesAdi(): string {
  try { return localStorage.getItem(SES_ANAHTARI) ?? ''; } catch { return ''; }
}

export function sesiSec(ad: string): void {
  try {
    if (ad) localStorage.setItem(SES_ANAHTARI, ad);
    else localStorage.removeItem(SES_ANAHTARI);
  } catch { /* özel mod */ }
}

/** Bu ses erkek adlarından biri mi? */
export const erkekSesMi = (v: SpeechSynthesisVoice): boolean =>
  ERKEK_SESLER.some((ad) => v.name.toLocaleLowerCase('tr').includes(ad));

/**
 * Türkçe ses seçer.
 *
 * Sesler ilk çağrıda boş gelebiliyor (eşzamansız yükleniyorlar), bu yüzden
 * seçim her seferinde yeniden yapılıyor — bir kez önbelleğe alsaydık ilk
 * okuma sesi bulamayıp varsayılan İngilizce sesle okurdu.
 *
 * Sıra:
 *   1. Kullanıcının ayarlardan seçtiği ses (varsa ve hâlâ yüklüyse)
 *   2. Cihazda YERLEŞİK erkek ses
 *   3. Herhangi bir erkek ses
 *   4. Cihazda yerleşik herhangi bir Türkçe ses
 *
 * Yerleşik olan öne alınıyor: ağdan gelen sesler çevrimdışında çalışmıyor
 * ve sahadaki kullanıcının çektiği garanti değil.
 */
function turkceSes(): SpeechSynthesisVoice | null {
  const tr = turkceSesler();
  if (!tr.length) return null;

  const secilen = seciliSesAdi();
  if (secilen) {
    const v = tr.find((x) => x.name === secilen);
    if (v) return v;
    /* Seçilen ses artık yoksa (kaldırılmış olabilir) otomatiğe düşülüyor. */
  }

  const erkekler = tr.filter(erkekSesMi);
  return erkekler.find((v) => v.localService)
    ?? erkekler[0]
    ?? tr.find((v) => v.localService)
    ?? tr[0];
}

/**
 * Konuşmanın GERÇEKTEN olup olmadığını anlamak için en kısa süre.
 *
 * iOS cihazda ölçüldü: tanıyıcı ses oturumunu bırakmadan sentezleyici
 * çağrılınca `speak()` hata vermiyor ama ses de çıkmıyor — `onend` neredeyse
 * anında geliyor. Sesli sohbet bunu "cevap okundu" sanıp yeniden dinlemeye
 * dönüyor ve kullanıcı hiçbir şey duymadan döngüye giriyordu.
 *
 * Bir cümlenin okunması en kötü ihtimalle bunun üstünde sürer.
 */
const EN_KISA_KONUSMA_MS = 400;

export type KonusSecenek = {
  /** 0.1–10 arası. Varsayılan biraz yavaş: rakam dolu cümleler hızlı okununca anlaşılmıyor. */
  hiz?: number;
};

/** Son okumanın gerçekten sesli olup olmadığı; sessiz başarısızlıkta false. */
let sonOkumaSesliydi = true;
export const sonOkumaSesliMiydi = () => sonOkumaSesliydi;

/**
 * Metni okur. Zaten konuşuyorsa öncekini keser.
 * @returns Okuma başlatılabildiyse true.
 */
export function konus(ham: string, secenek: KonusSecenek = {}): boolean {
  if (!desteklenir) return false;
  const metin = okunabilirMetin(ham);
  if (!metin) return false;

  window.speechSynthesis.cancel();
  const benimNeslim = ++nesil;

  const soz = new SpeechSynthesisUtterance(metin);
  soz.lang = 'tr-TR';
  soz.rate = secenek.hiz ?? 0.95;
  /*
   * Ses ataması KORUMALI. Sürücü bozuk ya da beklenmedik bir nesne
   * döndürürse atama istisna fırlatıyor; korumasız bırakılırsa `konus()`
   * fırlatıyor ve sesli sohbet döngüsü ortasında kırılıyordu. Ses
   * atanamazsa `lang` yeterli — işletim sistemi Türkçe bir ses seçiyor.
   */
  try {
    const ses = turkceSes();
    if (ses) soz.voice = ses;
  } catch { /* varsayılan sesle devam */ }

  const basladi = Date.now();
  const bitir = () => {
    if (benimNeslim !== nesil) return;
    /*
     * Uzun bir metin göz açıp kapayıncaya kadar "bitmişse" aslında hiç
     * okunmamıştır. Bunu ayırt etmek şart: sesli sohbet aksi hâlde sessiz
     * bir döngüye giriyor.
     */
    sonOkumaSesliydi = !(metin.length > 20 && Date.now() - basladi < EN_KISA_KONUSMA_MS);
    bildir(false);
  };
  soz.onend = bitir;
  soz.onerror = bitir;

  try {
    sonOkumaSesliydi = true;
    window.speechSynthesis.speak(soz);
    bildir(true);
    return true;
  } catch {
    sonOkumaSesliydi = false;
    bildir(false);
    return false;
  }
}

/** Okumayı durdurur. */
export function durdur(): void {
  if (!desteklenir) return;
  nesil += 1;            // bekleyen onend'ler artık "en son nesil" değil
  window.speechSynthesis.cancel();
  bildir(false);
}
