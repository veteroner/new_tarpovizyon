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

/** Sessiz bir ses çalarak kilidi açar. Kullanıcı dokunuşu içinde çağrılmalı. */
export function sesKilidiniAc(): void {
  if (!desteklenir || kilitAcik) return;
  try {
    const bos = new SpeechSynthesisUtterance('');
    bos.volume = 0;
    window.speechSynthesis.speak(bos);
    kilitAcik = true;
  } catch { /* kilit açılamadı; konus() yine de denenecek */ }
}

/**
 * Türkçe ses seçer.
 *
 * Sesler ilk çağrıda boş gelebiliyor (eşzamansız yükleniyorlar), bu yüzden
 * seçim her seferinde yeniden yapılıyor — bir kez önbelleğe alsaydık ilk
 * okuma sesi bulamayıp varsayılan İngilizce sesle okurdu.
 *
 * Cihazda yerleşik ses tercih ediliyor: ağdan gelen sesler çevrimdışında
 * çalışmıyor ve sahadaki kullanıcının çektiği garanti değil.
 */
function turkceSes(): SpeechSynthesisVoice | null {
  const hepsi = window.speechSynthesis.getVoices();
  const tr = hepsi.filter((v) => /^tr(-|_|$)/i.test(v.lang));
  if (!tr.length) return null;
  return tr.find((v) => v.localService) ?? tr[0];
}

export type KonusSecenek = {
  /** 0.1–10 arası. Varsayılan biraz yavaş: rakam dolu cümleler hızlı okununca anlaşılmıyor. */
  hiz?: number;
};

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
  const ses = turkceSes();
  if (ses) soz.voice = ses;

  soz.onend = () => { if (benimNeslim === nesil) bildir(false); };
  soz.onerror = () => { if (benimNeslim === nesil) bildir(false); };

  try {
    window.speechSynthesis.speak(soz);
    bildir(true);
    return true;
  } catch {
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
