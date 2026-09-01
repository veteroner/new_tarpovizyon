/**
 * Piyasa uçları — emtia fiyatları ve geçmiş serisi.
 *
 * ─── NEDEN WORKER'A TAŞINDI ─────────────────────────────────────────────────
 * İstemci doğrudan `dersbende.com/api.php`'yi çağırıyordu. Ölçüldü: üretimde
 * piyasa sayfası ~10 saniye iskelet ekranda kalıyordu, çünkü o uç yavaş ve
 * HER ZİYARETÇİ için baştan çalışıyordu. Artık istek Worker'dan geçiyor ve
 * yanıt Cloudflare kenarında saklanıyor: ilk ziyaretçi bekliyor, sonrakiler
 * kenardan anında alıyor.
 *
 * ─── NEDEN AYRI (KISA) TTL ──────────────────────────────────────────────────
 * index.js'teki okuma önbelleği 1 SAAT. Bu doğru bir değer — D1'deki
 * istatistikler günde en fazla bir kez tazeleniyor. Ama FİYAT öyle değil:
 * kaynak 15 dakika gecikmeli veri veriyor, bir saat saklamak fiyatı 75
 * dakikaya kadar bayatlatırdı. Bu yüzden piyasa kendi TTL'ini taşıyor.
 *
 * Geçmiş serisi daha uzun saklanabilir: günlük kapanışlardan oluşuyor, gün
 * içinde yalnız son nokta oynuyor.
 *
 * ─── KAYNAK ANAHTARI SUNUCUDA ───────────────────────────────────────────────
 * `api_key` istemci paketinde açıkta duruyordu (JS'e gömülü). Buraya taşınca
 * tarayıcıya hiç inmiyor. Anahtar hâlâ kaynak sistemin anahtarı — gizli bir
 * değer olarak env'e alınabilir; şimdilik mevcut davranış korundu ki uç
 * çalışmaya devam etsin.
 */

const KAYNAK = 'https://dersbende.com/api.php';
const ANAHTAR = 'dashboard_secret_key_2024';

/** Anlık fiyatlar: kaynak 15 dk gecikmeli, 10 dk saklamak tazeliği bozmuyor. */
const FIYAT_TTL_SN = 600;

/** Geçmiş seri: günlük kapanışlar; gün içinde yalnız son nokta oynuyor. */
const GECMIS_TTL_SN = 1800;

const GECERLI_ARALIK = new Set(['1mo', '3mo', '6mo', '1y', 'max']);

/*
 * CORS burada AYRICA tanımlı: bu iki uç index.js'teki genel okuma akışından
 * ÖNCE dönüyor, yani oradaki CORS_HEADERS'a hiç uğramıyor. Başlıksız yanıt
 * tarayıcıda sessizce bloklanır — sayfa boş kalır, konsolda tek satır hata.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const jsonYanit = (govde, durum, ekBaslik = {}) =>
  new Response(govde, {
    status: durum,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...ekBaslik },
  });

/**
 * Kaynağa gidip yanıtı kenarda saklar.
 *
 * Önbellek anahtarı olarak İSTEĞİN KENDİSİ değil, sabit bir URL kullanılıyor:
 * istemci istekleri farklı başlıklar taşıyabiliyor ve her varyant ayrı bir
 * önbellek girdisi açardı — aynı veri için onlarca kopya.
 */
async function kenardanVer(onbellekAnahtari, kaynakUrl, ttl, ctx) {
  const onbellek = caches.default;
  const anahtarIstek = new Request(onbellekAnahtari, { method: 'GET' });

  const hazir = await onbellek.match(anahtarIstek);
  if (hazir) {
    const kopya = new Response(hazir.body, hazir);
    kopya.headers.set('X-Onbellek', 'HIT');
    Object.entries(CORS).forEach(([k, v]) => kopya.headers.set(k, v));
    return kopya;
  }

  const kaynakYanit = await fetch(kaynakUrl, {
    headers: { Accept: 'application/json' },
    // Cloudflare'ın kendi fetch önbelleği: kaynağa gidişi de azaltıyor.
    cf: { cacheTtl: ttl, cacheEverything: true },
  });

  const govde = await kaynakYanit.text();

  /*
   * Yalnızca BAŞARILI yanıt saklanıyor. Hatayı saklamak, kaynaktaki geçici
   * bir arızayı TTL boyunca kalıcı hâle getirirdi.
   */
  if (!kaynakYanit.ok) {
    return jsonYanit(govde, kaynakYanit.status);
  }

  const yanit = jsonYanit(govde, 200, {
    'Cache-Control': `public, max-age=${ttl}`,
    'X-Onbellek': 'MISS',
  });
  ctx?.waitUntil?.(onbellek.put(anahtarIstek, yanit.clone()));
  return yanit;
}

/** `/api/piyasa` — tüm emtia fiyatları. */
export function handlePiyasa(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const url = new URL(request.url);
  return kenardanVer(
    `${url.origin}/__onbellek/piyasa`,
    `${KAYNAK}?action=commodity_prices&api_key=${ANAHTAR}`,
    FIYAT_TTL_SN,
    ctx,
  );
}

/** `/api/piyasa/gecmis?sembol=ZW=F&aralik=6mo` — tarih serisi. */
export function handlePiyasaGecmis(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const url = new URL(request.url);
  const sembol = url.searchParams.get('sembol') ?? '';
  const aralik = url.searchParams.get('aralik') ?? '6mo';

  /*
   * Girdi doğrulaması: bu değerler kaynağa giden URL'e giriyor. Serbest
   * bırakmak, Worker'ı istenen her adrese istek atan açık bir vekile
   * çevirirdi.
   */
  if (!sembol || sembol.length > 24 || !/^[A-Za-z0-9=^.\-]+$/.test(sembol)) {
    return jsonYanit(JSON.stringify({ error: 'Geçersiz sembol' }), 400);
  }
  if (!GECERLI_ARALIK.has(aralik)) {
    return jsonYanit(JSON.stringify({ error: 'Geçersiz aralık' }), 400);
  }

  const anahtar = `${url.origin}/__onbellek/piyasa-gecmis/${encodeURIComponent(sembol)}/${aralik}`;
  const kaynak = `${KAYNAK}?action=commodity_chart&api_key=${ANAHTAR}`
    + `&symbol=${encodeURIComponent(sembol)}&range=${aralik}`;

  return kenardanVer(anahtar, kaynak, GECMIS_TTL_SN, ctx);
}
