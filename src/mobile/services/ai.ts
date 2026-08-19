/**
 * TarpoVizyon AI istemcisi.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Eski hâlinde üç ayrı kopukluk vardı ve üçü birbirini gizliyordu:
 *
 *   1. Adres `dersbende.com/api.php?...&api_key=dashboard_secret_key_2024`
 *      idi — ÜÇÜNCÜ TARAF BİR SUNUCU ve ANAHTAR İSTEMCİ KODUNDA. Uygulama
 *      paketini açan herkes anahtarı okuyabiliyordu.
 *   2. İstek başarılı olsa bile yanıt ATILIYORDU: kod `data.answer` okuyordu,
 *      uç ise `{ success, reply }` döndürüyor. Yani AI çalışsa da kullanıcı
 *      onu hiç görmüyordu.
 *   3. Her başarısızlıkta yedek olarak yedi anahtar kelimelik bir sözlük
 *      devreye giriyordu. "Kedi nedir" ile "Süt nedir"in aynı yanıtı
 *      vermesinin sebebi buydu; sözlük arızayı görünmez kılıyordu.
 *
 * Artık istek, uygulamanın zaten tüm verisini çektiği Worker'a gidiyor
 * (`POST /api/ai`); sağlayıcı anahtarları orada, `wrangler secret` içinde.
 * İstemcide hiçbir sır yok.
 *
 * ─── NEDEN YEREL SÖZLÜK YOK ─────────────────────────────────────────────────
 * Sorulan soruyla ilgisi olmayan hazır bir metin, yanıt değil GÜRÜLTÜdür ve
 * en kötüsü hatayı saklar. Arıza durumunda dürüst bir hata mesajı veriliyor.
 */

const API_BASE = import.meta.env.VITE_TARPOVIZYON_BASIC_API
  ?? 'https://tarpovizyon-api.veteroner.workers.dev';

const AI_URL = `${API_BASE}/api/ai`;

/*
 * Sunucu tarafındaki bütçe 16 sn. İstemci ondan biraz uzun bekliyor: eşit
 * olsaydı sunucunun son çare modeli tam yanıtı üretirken istemci isteği
 * kesebilirdi.
 */
const ZAMAN_ASIMI_MS = 20_000;

/** Kullanıcıya gösterilebilir hata — sayfa bunun `message`'ını basıyor. */
export class AIHatasi extends Error {}

/**
 * Soruyu AI ucuna gönderir.
 *
 * @param veri İsteğe bağlı uygulama verisi. Verilirse model rakamları
 *   ORADAN alıyor; verilmezse eskisi gibi kendi bilgisinden cevaplıyor.
 * @returns Modelin yanıtı (markdown).
 * @throws {AIHatasi} Kullanıcıya gösterilmeye uygun bir mesajla.
 */
export async function askAI(question: string, veri?: string | null): Promise<string> {
  const soru = question.trim();
  if (!soru) throw new AIHatasi('Lütfen bir soru yazın.');

  const controller = new AbortController();
  const zamanlayici = setTimeout(() => controller.abort(), ZAMAN_ASIMI_MS);

  let res: Response;
  try {
    res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veri ? { message: soru, veri } : { message: soru }),
      signal: controller.signal,
    });
  } catch (e) {
    // Ağ yok, DNS düşük, ya da zaman aşımı (abort) — ikisi ayrı mesaj hak ediyor.
    throw new AIHatasi(
      (e as Error)?.name === 'AbortError'
        ? 'Yanıt çok uzun sürdü. Lütfen tekrar deneyin.'
        : 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.',
    );
  } finally {
    clearTimeout(zamanlayici);
  }

  const data = await res.json().catch(() => null) as
    { reply?: string; error?: string } | null;

  if (!res.ok || !data?.reply) {
    /*
     * AI ucunun KENDİ ürettiği durumlarda sunucunun mesajı gösteriliyor:
     * "yapılandırılmamış" (503), "çok fazla istek" (429), "yanıt veremiyor"
     * (502) ayrı sorunlar; hepsini tek genel metne indirmek teşhisi
     * imkânsızlaştırır.
     *
     * Diğer durumlarda (ör. yol yanlış → Worker'ın "Not found" yanıtı, ya da
     * araya giren bir vekil sunucunun HTML hata sayfası) ham metin sohbete
     * yazılmıyor: kullanıcıya hiçbir şey ifade etmiyor.
     */
    const ucunKendiHatasi = [400, 429, 502, 503].includes(res.status);
    throw new AIHatasi(
      (ucunKendiHatasi && data?.error)
        ? data.error
        : 'TarpoVizyon AI şu an yanıt veremiyor. Lütfen tekrar deneyin.',
    );
  }

  return data.reply;
}
