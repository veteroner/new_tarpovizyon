/**
 * Görünüm modu — Basic mi Pro mu gösterilsin.
 *
 * ─── NEDEN YENİ BİR KAVRAM GEREKTİ ──────────────────────────────────────────
 * Basic/Pro ayrımı bugüne kadar bir ALAN ADI kararıydı (`utils/surum.ts`):
 * `pro.tarpovizyon.com` → Pro, başka her yer → Basic. O kural yayındaki www'yi
 * korumak için kondu ve yerinde duruyor.
 *
 * Ama mağaza derlemesinde alan adı YOK — Capacitor `capacitor://localhost`
 * üzerinden çalışıyor, yani `proSurumu()` ve `basicAlanAdi()` ikisi de false.
 * Ayrım orada hiçbir şeye dayanmıyordu; sonuç olarak Pro rotaları pakette
 * duruyor ama hiçbir yerden bağlı değildi.
 *
 * Mobilde bu ayrımı taşıyabilecek tek şey HESABIN YETKİSİ. Bu dosya o kararı
 * tek yerde topluyor.
 *
 * ─── SAKLANAN TERCİHE GÜVENİLMİYOR ──────────────────────────────────────────
 * `etkinMod` yetki yoksa HER ZAMAN 'basic' döndürüyor. Tercih `localStorage`'da
 * duruyor ve orası kullanıcının yazabildiği bir yer; saklanan 'pro' değerini
 * doğru kabul etmek, panel kapısında bu akşam yaşadığımız hatanın aynısı
 * olurdu (uydurma bir dize yazan biri kabuğu açabiliyordu).
 *
 * Bu bir GÜVENLİK sınırı değil — asıl sınır sunucudaki korumalı uçlarda ve
 * `ProKapisi`'nde. Buradaki kural arayüzün dürüst davranması: yetkisi olmayana
 * açılmayacak bir dünyanın kapısını göstermemek.
 *
 * ─── NEDEN REACT YOK ────────────────────────────────────────────────────────
 * Saf kural: hem mobil kanca hem de ileride web köprüsü (Faz 4) aynı kararı
 * okuyacak. Bileşene bağlamak, kuralın iki yerde ayrı ayrı yazılmasına
 * yol açardı.
 */

export type Mod = 'basic' | 'pro';

const DEPO = 'tarpovizyon_mod';

/**
 * Kullanıcının SEÇTİĞİ mod — henüz yetki süzgecinden geçmemiş hali.
 *
 * try/catch şart: gizli sekmede ve site verisi engellenmiş tarayıcıda
 * `localStorage` erişimi doğrudan istisna fırlatıyor (`auth/oturum.ts` ile
 * aynı gerekçe). Tercih okunamazsa varsayılana düşmek, uygulamanın hiç
 * açılmamasından iyi.
 */
export function tercihOku(): Mod | null {
  try {
    const v = localStorage.getItem(DEPO);
    return v === 'pro' || v === 'basic' ? v : null;
  } catch {
    return null;
  }
}

export function tercihYaz(m: Mod | null): void {
  try {
    if (m) localStorage.setItem(DEPO, m);
    else localStorage.removeItem(DEPO);
  } catch { /* saklanamıyorsa tercih yalnız bu oturum boyunca yaşar */ }
}

/**
 * Ekranda gerçekten geçerli olan mod.
 *
 * Yetki yoksa 'basic'. Yetki varsa ve kullanıcı bir tercih belirtmişse o;
 * belirtmemişse 'pro' — abonelik parasını Pro için ödeyen birine varsayılan
 * olarak Basic göstermek, aldığı şeyi saklamak olurdu.
 */
export function etkinMod(tercih: Mod | null, proErisimi: boolean): Mod {
  if (!proErisimi) return 'basic';
  return tercih ?? 'pro';
}

/** Mod anahtarı kullanıcıya gösterilsin mi — yetkisi yoksa seçenek de yok. */
export const modAnahtariGorunur = (proErisimi: boolean): boolean => proErisimi;
