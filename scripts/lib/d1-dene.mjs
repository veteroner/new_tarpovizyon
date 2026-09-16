/**
 * D1 çağrılarını ağ arızasına karşı yeniden deneyen ortak sarmalayıcı.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * 11 Eylül 2026'da günlük TÜİK senkronu tek bir satır yüzünden kırmızıya döndü:
 *
 *     ✗ Tarımın GSYH içindeki payı (yıllık): fetch failed
 *
 * Veri güncel, TÜİK sağlamdı; düşen şey `api.cloudflare.com`'a açılan ilk
 * bağlantıydı. `fetch failed`, undici'nin DNS/TCP/TLS seviyesi hatasıdır —
 * HTTP hatası bile değil. TÜİK tarafındaki `fetchDataset` üç kez deniyordu, D1
 * tarafındaki `d1()` hiç denemiyordu; tek bir kayıp paket bütün işi düşürdü.
 * Ölçüldü: o çalışma, başarılı bir günle aynı süreyi aldı (5dk17s / 5dk15s) —
 * yani hiçbir yeniden deneme yapılmamıştı.
 *
 * ─── YAZMAYI KÖRÜ KÖRÜNE TEKRARLAMAK TEHLİKELİ ──────────────────────────────
 * Buradaki INSERT'lerin çoğunda ON CONFLICT yok. Bir yazma isteği sunucuya
 * ULAŞIP yanıtı yolda kaybolduysa tekrar denemek ikiz satır üretir — bu depoda
 * daha önce yaşanmış bir tuzak. Bu yüzden kural ikiye ayrıldı:
 *
 *   • Okuma (SELECT/PRAGMA/WITH) → tekrar etmesi zararsız, her geçici arızada
 *     yeniden denenir.
 *   • Yazma → YALNIZCA isteğin sunucuya hiç ulaşmadığı kesinken: DNS çözülmedi,
 *     bağlantı reddedildi, bağlanma zaman aşımına uğradı. Soket ortada koptuysa
 *     (ECONNRESET) ya da HTTP 5xx döndüyse istek İŞLENMİŞ olabilir; o hâlde
 *     yeniden denenmez, hata olduğu gibi yukarı çıkar. Kırmızı bir iş, sessizce
 *     ikizlenmiş bir satırdan iyidir.
 *
 * Zaman aşımı da buradan: sarkan bir bağlantı, yeniden deneme olmadan işi
 * 30 dakikalık iş sınırına kadar askıda tutabiliyordu.
 */

/** Tek bir D1 isteğine verilen süre. */
export const D1_ZAMAN_ASIMI = 120_000;

/** Yeniden denenmesi zararsız olan ifadeler. */
const OKUMA = /^\s*(SELECT|PRAGMA|WITH)\b/i;

/** İstek sunucuya hiç ulaşmadı — yazma da olsa yeniden denemek güvenli. */
const ULASAMADI = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT']);

/** Cloudflare'in geçici döndürdüğü durumlar. */
const GECICI_HTTP = new Set([429, 500, 502, 503, 504]);

/** Ağ/aktarım seviyesi arıza mı? (SQL hatası ya da 4xx değil.) */
const agArizasi = (e) =>
  e?.name === 'TimeoutError' || e?.name === 'AbortError' ||
  (e instanceof TypeError && e.message === 'fetch failed');

function tekrarlanabilir(e, okuma) {
  // Çağıran HTTP durumunu iliştirdiyse yanıt ALINMIŞ demektir: yalnızca okuma
  // tekrarlanabilir, yazmanın uygulanıp uygulanmadığı bilinemez.
  if (e?.durum !== undefined) return okuma && GECICI_HTTP.has(e.durum);
  if (!agArizasi(e)) return false;
  if (okuma) return true;
  return ULASAMADI.has(e?.cause?.code ?? e?.cause?.name);
}

/**
 * `cagir`'ı en fazla `deneme` kez çalıştırır. `sql` yalnızca okuma/yazma
 * ayrımı için okunur; isteği çağıran kurar.
 *
 * Yeniden deneme sessiz değil: geçici bir arıza tekrarlanmaya başlarsa bunu
 * logda görmek, hiç görmemekten iyidir.
 */
export async function d1Dene(sql, cagir, { deneme = 3, bekle = 2000 } = {}) {
  const okuma = OKUMA.test(sql);
  for (let i = 1; ; i++) {
    try {
      return await cagir();
    } catch (e) {
      if (i >= deneme || !tekrarlanabilir(e, okuma)) throw e;
      console.error(`   D1 yeniden deneniyor (${i}/${deneme - 1}): ${e.message}`);
      await new Promise((r) => setTimeout(r, i * bekle));
    }
  }
}
