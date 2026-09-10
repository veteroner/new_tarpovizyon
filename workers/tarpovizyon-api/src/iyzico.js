/**
 * iyzico istemcisi — imzalama ve abonelik çağrıları.
 *
 * ─── NEDEN RESMİ SDK KULLANILMIYOR ──────────────────────────────────────────
 * `iyzipay` paketi Node'un `crypto` modülüne ve `https` istemcisine dayanıyor;
 * Workers'ta ikisi de yok. İmzalama zaten HMAC-SHA256'dan ibaret ve Web Crypto
 * onu doğrudan veriyor — SDK'yı zorlamak, çalışmayan bir bağımlılığı
 * sürüklemek olurdu.
 *
 * ─── İMZA (IYZWSv2) ─────────────────────────────────────────────────────────
 *   payload   = randomKey + uriPath + requestBody
 *   signature = HMAC-SHA256(payload, secretKey) → onaltılık
 *   authStr   = "apiKey:<K>&randomKey:<R>&signature:<S>"
 *   header    = "IYZWSv2 " + base64(authStr)
 * Ayrıca `x-iyzi-rnd: randomKey` başlığı gönderiliyor.
 *
 * `uriPath` GÖVDEYE DEĞİL YOLA ait: sorgu dizesi varsa o da dahil. Yanlış yol
 * imzası "imza geçersiz" hatası verir ve hata mesajı nedenini söylemez —
 * bu yüzden yol tek bir yerden üretiliyor.
 *
 * ─── SANDBOX VARSAYILAN ─────────────────────────────────────────────────────
 * `IYZICO_TABAN` tanımlı değilse sandbox kullanılıyor. Gerçek para akan bir
 * entegrasyonda varsayılanın canlı olması, yanlış yapılandırılmış bir ortamda
 * gerçek kart çekmek demektir; güvenli taraf sandbox.
 */

const SANDBOX = 'https://sandbox-api.iyzipay.com';

export const tabanAdres = (env) => env.IYZICO_TABAN || SANDBOX;

export const canliMi = (env) => tabanAdres(env).includes('//api.iyzipay.com');

/** Yapılandırma eksikse çağrı hiç denenmiyor — 500 yerine anlaşılır hata. */
export function yapilandirmaEksigi(env) {
  const eksik = [];
  if (!env.IYZICO_API_KEY) eksik.push('IYZICO_API_KEY');
  if (!env.IYZICO_SECRET_KEY) eksik.push('IYZICO_SECRET_KEY');
  return eksik.length ? eksik : null;
}

const onaltilik = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacSha256Hex(anahtar, mesaj) {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(anahtar),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return onaltilik(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(mesaj)));
}

/** Rastgele anahtar — tahmin edilebilir olmamalı, `Math.random` kullanılmıyor. */
function rastgeleAnahtar() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Date.now().toString() + onaltilik(b.buffer).slice(0, 16);
}

/**
 * iyzico'ya imzalı istek.
 *
 * `govde` verilmezse GET; verilirse POST. Gövde `JSON.stringify` ile TEK
 * SEFER üretiliyor ve hem imzaya hem isteğe aynı dize gidiyor — iki kez
 * üretmek alan sırası değişirse imzayı bozardı.
 */
export async function iyzicoCagir(env, yol, govde) {
  const eksik = yapilandirmaEksigi(env);
  if (eksik) return { ok: false, hata: 'yapilandirma_eksik', eksik };

  const govdeDizesi = govde === undefined ? '' : JSON.stringify(govde);
  const rnd = rastgeleAnahtar();
  const imza = await hmacSha256Hex(env.IYZICO_SECRET_KEY, rnd + yol + govdeDizesi);
  const authStr = `apiKey:${env.IYZICO_API_KEY}&randomKey:${rnd}&signature:${imza}`;

  const y = await fetch(tabanAdres(env) + yol, {
    method: govde === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `IYZWSv2 ${btoa(authStr)}`,
      'x-iyzi-rnd': rnd,
      'Content-Type': 'application/json',
    },
    ...(govde === undefined ? {} : { body: govdeDizesi }),
  });

  const metin = await y.text();
  let veri;
  try { veri = JSON.parse(metin); } catch { veri = { ham: metin.slice(0, 400) }; }

  /*
   * iyzico HTTP 200 dönüp gövdede `status: "failure"` diyebiliyor. Yalnız
   * HTTP koduna bakmak, başarısız bir ödemeyi başarılı saymak demek olurdu.
   */
  if (!y.ok || veri?.status === 'failure') {
    return {
      ok: false,
      hata: 'iyzico_hatasi',
      kod: veri?.errorCode ?? String(y.status),
      mesaj: veri?.errorMessage ?? 'bilinmeyen hata',
    };
  }
  return { ok: true, veri };
}

/* ── Abonelik uçları ─────────────────────────────────────────────────────── */

/**
 * Checkout form ile abonelik başlatır.
 *
 * `callbackUrl` iyzico'nun ödeme sonrası kullanıcıyı göndereceği adres.
 * Sonucun kendisi BURADAN gelmiyor — callback yalnız kullanıcıyı geri
 * getiriyor; abonelik durumu ayrıca `sonucSorgula` ile ve webhook ile
 * doğrulanıyor. Callback parametresine güvenmek, adresi elle çağıran birine
 * bedava abonelik vermek olurdu.
 */
export const abonelikBaslat = (env, govde) =>
  iyzicoCagir(env, '/v2/subscription/checkoutform/initialize', govde);

/** Form tamamlandıktan sonra gerçek sonuç — tek güvenilir kaynak budur. */
export const sonucSorgula = (env, token) =>
  iyzicoCagir(env, `/v2/subscription/checkoutform/${encodeURIComponent(token)}`);

/* ── Webhook imzası ──────────────────────────────────────────────────────── */

/**
 * Abonelik webhook imzasını doğrular.
 *
 * Birleştirme sırası iyzico'nun belirlediği sıra:
 *   merchantId + secretKey + eventType + subscriptionReferenceCode
 *   + orderReferenceCode + customerReferenceCode
 *
 * Bu doğrulama OLMADAN webhook ucu açık bırakılamaz: adresi bilen herkes
 * "ödeme başarılı" gövdesi gönderip kendine bedava abonelik açardı. İmza,
 * gövdenin iyzico'dan geldiğinin tek kanıtı.
 */
export async function webhookImzasiGecerli(env, govde, imzaBasligi) {
  if (!env.IYZICO_SECRET_KEY || !env.IYZICO_MERCHANT_ID) return false;
  if (!imzaBasligi) return false;

  const mesaj = String(env.IYZICO_MERCHANT_ID)
    + env.IYZICO_SECRET_KEY
    + (govde.iyziEventType ?? '')
    + (govde.subscriptionReferenceCode ?? '')
    + (govde.orderReferenceCode ?? '')
    + (govde.customerReferenceCode ?? '');

  const beklenen = await hmacSha256Hex(env.IYZICO_SECRET_KEY, mesaj);

  /*
   * Sabit süreli karşılaştırma. `===` ilk farklı baytta dönerdi ve ölçülen
   * süreden imza baytları tahmin edilebilirdi. Uzunluk farkı da baştan
   * eleniyor.
   */
  const a = new TextEncoder().encode(beklenen);
  const b = new TextEncoder().encode(String(imzaBasligi).trim());
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i += 1) fark |= a[i] ^ b[i];
  return fark === 0;
}
