/**
 * Elle veri girişinde push bildirimi (OneSignal REST) — Worker tarafı.
 *
 * ─── NEDEN AYRI ─────────────────────────────────────────────────────────────
 * Senkron tetikleyicisi (scripts/tuik-sync/bildirim.mjs) TÜİK'ten OTOMATİK
 * gelen veri setlerini kapsıyor. Ama çiğ süt / kırmızı et ekonomik
 * göstergeleri senkrondan gelmiyor; kullanıcı /veri-yukle ekranından ELLE
 * giriyor. Bu modül o yolu kapatıyor: admin yazımı başarılı olunca burası
 * çalışıyor.
 *
 * ─── SPAM YOK: SENKRONLA AYNI "DÖNEM İLERLEME" KORUMASI ─────────────────────
 * Her kaydedişte değil, YALNIZCA yeni bir ay eklendiğinde bildirim atılıyor:
 *   - Şubat verisi eklenir (max tarih Ocak→Şubat ilerler) → bir kez bildirim.
 *   - Şubat'taki bir yazım düzeltilir (max tarih aynı) → bildirim YOK.
 *   - İlk kayıt (önceki dönem yok) → referans, bildirim YOK.
 * "Son bildirilen dönem" `tuik_sync_log`'ta tutuluyor (senkronla aynı tablo,
 * ama ayrı `veri_seti` adıyla — çakışmıyor).
 *
 * ─── SIR ────────────────────────────────────────────────────────────────────
 * ONESIGNAL_REST_KEY tanımlı değilse modül HİÇBİR ŞEY yapmaz (yazma işlemi
 * bildirim yüzünden asla düşmez). `wrangler secret put ONESIGNAL_REST_KEY`
 * ile verilmeli; App ID sır değil.
 */

const APP_ID_VARSAYILAN = 'f5ef3915-e366-425f-a467-029f350cb296';

/*
 * İzlenen tablo → bildirim metni, gidilecek sayfa, log'daki veri seti adı.
 *
 * ELLE tutuluyor (bkz. bildirim.mjs'teki aynı gerekçe: bir uç birden çok
 * sayfada okunuyor, otomatik türetme yanlış sayfa açıyor). Hedef, sektörün
 * KENDİ ekonomik göstergeler sayfası.
 */
const IZLENEN = {
  cig_sut_ekonomik_gostergeler: {
    baslik: 'Çiğ süt fiyatları güncellendi',
    yol: '/tarpovizyon-basic/cig-sut/ekonomik-gostergeler',
    veriSeti: 'Çiğ süt ekonomik göstergeleri (elle)',
  },
  kirmizi_et_ekonomik_gostergeler: {
    baslik: 'Kırmızı et fiyatları güncellendi',
    yol: '/tarpovizyon-basic/kirmizi-et/ekonomik-gostergeler',
    veriSeti: 'Kırmızı et ekonomik göstergeleri (elle)',
  },
};

/** "2026-02-01 00:00:00" > "2026-01-01 00:00:00": string sıralaması yeterli. */
function ilerledi(yeni, onceki) {
  if (!yeni) return false;
  if (!onceki) return false; // ilk kez: referans
  return String(yeni) > String(onceki);
}

/*
 * Segment adı hesaba göre değişiyor: eski panellerde "Subscribed Users",
 * Kasım 2024 sonrası hesaplarda "Total Subscriptions". Yanlış ad 400 döndürüp
 * bildirimi sessizce düşürür; hangisi olduğunu dışarıdan göremediğimiz için
 * ikisi sırayla deneniyor. `ONESIGNAL_SEGMENT` secret'ı verilirse tek istek.
 */
async function gonder(env, { baslik, govde, yol }) {
  const appId = env.ONESIGNAL_APP_ID ?? APP_ID_VARSAYILAN;
  const adaylar = env.ONESIGNAL_SEGMENT
    ? [env.ONESIGNAL_SEGMENT]
    : ['Subscribed Users', 'Total Subscriptions'];

  let sonHata = null;
  for (const segment of adaylar) {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.ONESIGNAL_REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        included_segments: [segment],
        headings: { en: baslik, tr: baslik },
        contents: { en: govde, tr: govde },
        data: { route: yol },
      }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) return body;
    sonHata = `HTTP ${res.status}: ${JSON.stringify(body)}`;
  }
  throw new Error(`OneSignal (${adaylar.join(' / ')}) — ${sonHata}`);
}

/**
 * Elle yazılan tablo izleniyorsa ve dönem ilerlediyse bildirim atar.
 *
 * `q` — upload.js'teki tanımlayıcı alıntılama fonksiyonu (tablo adı zaten
 * ROUTES allowlist'inden geçmiş; yine de aynı güvenli alıntılamayı kullanıyoruz).
 *
 * Hata durumunda yalnızca uyarı basar — yazma işlemi ZATEN bitmiş, bildirim
 * onu geri alamaz/düşüremez.
 */
export async function bildirEllaYazim(env, tablo, q) {
  if (!env.ONESIGNAL_REST_KEY) return; // yapılandırılmamış → sessiz
  const hedef = IZLENEN[tablo];
  if (!hedef) return; // izlenmeyen tablo

  try {
    // Tablodaki en güncel dönem.
    const enGuncel = await env.DB.prepare(`SELECT MAX(tarih) AS m FROM ${q(tablo)}`).first();
    const yeniDonem = enGuncel?.m ?? null;
    if (!yeniDonem) return;

    // Daha önce bu tablo için bildirilen son dönem.
    const oncekiKayit = await env.DB
      .prepare(
        `SELECT son_donem FROM tuik_sync_log
         WHERE veri_seti = ? AND durum = 'ok' AND son_donem IS NOT NULL
         ORDER BY calisma_zamani DESC LIMIT 1`,
      )
      .bind(hedef.veriSeti)
      .first();
    const onceki = oncekiKayit?.son_donem ?? null;

    if (!ilerledi(yeniDonem, onceki)) return;

    // Kısa dönem etiketi ("2026-02-01 00:00:00" → "2026-02").
    const donemKisa = String(yeniDonem).slice(0, 7);
    await gonder(env, {
      baslik: hedef.baslik,
      govde: `Yeni dönem: ${donemKisa}. Ayrıntılar için dokunun.`,
      yol: hedef.yol,
    });

    // Bildirildi olarak işaretle: bir sonraki yazımda tekrar atılmasın.
    await env.DB
      .prepare(
        `INSERT INTO tuik_sync_log (calisma_zamani,veri_seti,durum,eklenen,guncellenen,son_donem,mesaj)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .bind(new Date().toISOString(), hedef.veriSeti, 'ok', 0, 0, yeniDonem, 'elle giriş bildirimi')
      .run();
  } catch (e) {
    console.error(`Bildirim (elle, ${tablo}) hata: ${e.message}`);
  }
}
