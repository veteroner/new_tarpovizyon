/**
 * Oturum — jeton saklama ve kimlik uçlarına çağrı.
 *
 * ─── JETON NEREDE DURUYOR ───────────────────────────────────────────────────
 * `localStorage`. Alternatif olan HttpOnly çerez daha güvenli olurdu (JS
 * okuyamaz), ama bu uygulama Capacitor'la mobilde `capacitor://localhost`
 * kaynağından çalışıyor ve API başka bir alan adında; iOS üçüncü taraf
 * çerezleri varsayılan olarak engelliyor. Aynı kodun hem webde hem uygulamada
 * çalışması için jeton tek seçenek.
 *
 * Bunun bedeli açık: siteye XSS sokan biri jetonu okuyabilir. Karşılığında
 * jeton sunucuda ham DEĞİL özetiyle saklanıyor ve 30 günde kendiliğinden
 * ölüyor, yani çalınan jeton sınırsız değil.
 *
 * ─── NEDEN AYRI MODÜL ───────────────────────────────────────────────────────
 * `services/d1.ts` ve `tarpovizyon-basic/api.ts` veri okuyor; kimlik onların
 * işi değil. Ayrı tutmak, ileride veri uçlarına jeton eklemek gerektiğinde
 * tek bir yerden okumayı sağlıyor.
 */

const API_TABAN = (import.meta.env.VITE_TARPOVIZYON_BASIC_API as string | undefined)
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

const JETON_ANAHTAR = 'tarpovizyon_oturum';

export type Kullanici = { id: string; eposta: string };

export type Abonelik = {
  durum: 'deneme' | 'aktif' | 'iptal' | 'suresi_doldu' | 'yok';
  bitis: number | null;
  aktif: boolean;
  kalanGun: number | null;
};

export type Durum = { kullanici: Kullanici; abonelik: Abonelik };

/**
 * Jeton okuma/yazma.
 *
 * try/catch şart: gizli sekmede, site verisi engellenmiş tarayıcıda ve bazı
 * gömülü görünümlerde `localStorage` erişimi doğrudan istisna fırlatıyor.
 * Kimlik yüzünden uygulamanın açılmaması, girişsiz açılmasından kötü.
 */
export function jetonOku(): string | null {
  try { return localStorage.getItem(JETON_ANAHTAR); } catch { return null; }
}

export function jetonYaz(jeton: string | null): void {
  try {
    if (jeton) localStorage.setItem(JETON_ANAHTAR, jeton);
    else localStorage.removeItem(JETON_ANAHTAR);
  } catch { /* saklanamıyorsa oturum yalnız bu sekme boyunca yaşar */ }
}

async function cagir<T>(yol: string, secenek: RequestInit = {}): Promise<T> {
  const jeton = jetonOku();
  const y = await fetch(`${API_TABAN}/api/${yol}`, {
    ...secenek,
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...(secenek.headers ?? {}),
    },
  });
  const govde = await y.json().catch(() => ({}));
  if (!y.ok) throw Object.assign(new Error(govde?.hata ?? 'hata'), { kod: govde?.hata, http: y.status });
  return govde as T;
}

/** Giriş kodu ister. Hata kodları çağıran tarafta metne çevriliyor. */
export const kodIste = (eposta: string) =>
  cagir<{ gonderildi: boolean }>('auth/kod-iste', {
    method: 'POST', body: JSON.stringify({ eposta }),
  });

/** Kodu doğrular, jetonu saklar ve durumu döner. */
export async function kodDogrula(eposta: string, kod: string): Promise<Durum & { yeniKullanici: boolean }> {
  const s = await cagir<Durum & { jeton: string; yeniKullanici: boolean }>('auth/kod-dogrula', {
    method: 'POST', body: JSON.stringify({ eposta, kod }),
  });
  jetonYaz(s.jeton);
  return s;
}

/** Saklı jetonla kim olduğumuzu sorar; jeton geçersizse null. */
export async function benKimim(): Promise<Durum | null> {
  if (!jetonOku()) return null;
  try {
    return await cagir<Durum>('auth/ben');
  } catch (x) {
    /*
     * JETON YALNIZCA 401'DE SİLİNİR.
     *
     * Burada koşulsuz bir `catch` vardı ve her hatada jetonu siliyordu.
     * Yorumu "401 → jeton ölmüş" diyordu ama kod ayrım yapmıyordu: ağ
     * kesintisi, 5xx, CORS reddi — hepsi kullanıcıyı sessizce çıkarıyordu.
     *
     * Webde bu nadiren görünüyordu; mobilde ciddi. `benKimim()` HER AÇILIŞTA
     * çalışıyor ve telefon sürekli bağlantı kaybediyor — kapsama alanı dışında
     * uygulamayı açan kullanıcı hesabından atılır ve geri dönmek için yeni bir
     * e-posta kodu istemek zorunda kalırdı. Kimlik bilgisini ağ koşullarına
     * bağlamak yanlış.
     *
     * 401 dışında jeton KORUNUYOR. Bu açılışta `null` dönüyor, yani bağlam
     * `girissiz` oluyor ve Pro erişimi verilmiyor — sağlayıcının belgelenmiş
     * duruşu bu: karar verilemiyorsa güvenli taraf erişimi vermemek. Ama
     * kimlik bilgisi YOK EDİLMİYOR; bağlantı gelince kendiliğinden düzeliyor.
     *
     * 403 de dışarıda: o "jeton ölmüş" değil "bu adresten kabul edilmiyor"
     * demek (CORS/origin). Onda jetonu silmek, yapılandırma hatasını
     * kullanıcının oturumuyla cezalandırmak olurdu.
     */
    if ((x as { http?: number }).http === 401) jetonYaz(null);
    return null;
  }
}

export async function cikisYap(): Promise<void> {
  try { await cagir('auth/cikis', { method: 'POST' }); } catch { /* sunucu ulaşılmasa da yerelden sil */ }
  jetonYaz(null);
}

/** Hata kodlarının okunabilir karşılığı — kullanıcıya bu metinler gösteriliyor. */
export const HATA_METNI: Record<string, string> = {
  gecersiz_eposta: 'E-posta adresi geçerli görünmüyor.',
  eposta_yapilandirilmamis: 'Giriş şu an kullanılamıyor. Lütfen sonra deneyin.',
  eposta_gonderilemedi: 'Kod gönderilemedi. Lütfen tekrar deneyin.',
  cok_sik: 'Az önce bir kod gönderildi. Biraz bekleyip tekrar isteyin.',
  kod_yok: 'Önce kod isteyin.',
  kod_suresi_doldu: 'Kodun süresi doldu. Yeni kod isteyin.',
  kod_yanlis: 'Kod hatalı.',
  cok_fazla_deneme: 'Çok fazla deneme yapıldı. Yeni kod isteyin.',
  gecersiz_istek: 'Bilgiler eksik ya da hatalı.',
  sunucu_hatasi: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
};

export const hataMetni = (kod: unknown): string =>
  HATA_METNI[String(kod)] ?? 'Bir sorun oluştu. Lütfen tekrar deneyin.';
