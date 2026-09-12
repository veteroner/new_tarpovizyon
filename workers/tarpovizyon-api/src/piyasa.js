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
 * ─── KAYNAK ANAHTARI ARTIK SECRET ───────────────────────────────────────────
 * `api_key` bir dönem istemci paketinde açıkta duruyordu, sonra buraya taşındı
 * ama KODA GÖMÜLÜ kaldı — yani depoya bakan herkes görüyordu. Ölçüldü: o
 * anahtar `api.php`'de `action=execute` ile serbest SQL açıyor
 * (`$pdo->exec($sql)`), yani UPDATE/DELETE/DROP dahil.
 *
 * Artık `env.DERSBENDE_KEY` secret'ından okunuyor. Kod tabanında değer yok.
 *
 * ─── İZOLASYON KURALI ───────────────────────────────────────────────────────
 * `api.php` duruyor (ileride gerekebilir) ama artık ona YALNIZCA bu Worker
 * erişiyor. Hiçbir tarayıcı ve hiçbir mağaza paketi anahtar taşımıyor; web ve
 * mobil istemciler bu uçları çağırıyor, kaynağı bilmiyorlar.
 *
 * Anahtar yoksa uç 503 dönüyor — anahtarsız istek `api.php`'den 401 alır ve
 * bu, "kaynak bozuk" gibi görünen anlamsız bir hataya dönüşürdü.
 */

const KAYNAK = 'https://dersbende.com/api.php';

/** Anlık fiyatlar: kaynak 15 dk gecikmeli, 10 dk saklamak tazeliği bozmuyor. */
const FIYAT_TTL_SN = 600;

/** Geçmiş seri: günlük kapanışlar; gün içinde yalnız son nokta oynuyor. */
const GECMIS_TTL_SN = 1800;

/*
 * Aralık → Yahoo adım (interval) eşlemesi.
 *
 * Liste bir dönem yalnız beş aralık kabul ediyordu; web sayfası ise yedi tane
 * sunuyor (1G, 5G, 1A, 3A, 6A, 1Y, 5Y). Web istemcisi bu Worker'a
 * yönlendirilince `1d`, `5d` ve `5y` düğmeleri 400 alacaktı — ölçülmeden
 * fark edilmeyecek bir kırılma.
 *
 * Adım aralıkla BİRLİKTE belirleniyor: günlük adımla `1d` aralığı tek nokta,
 * `5y` aralığı ise 1250 nokta döndürür. İkisi de kullanılamaz. Adımı
 * istemciden almak yerine burada sabitlemek, kaynağa gidecek değerin
 * denetlenmiş kalmasını da sağlıyor.
 */
const ARALIK_ADIM = {
  '1d': '5m',
  '5d': '30m',
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1wk',
  '5y': '1wk',
  max: '1mo',
};

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

/** Anahtar yoksa uç kapalı — sebebi açıkça söylüyor, 401'i taklit etmiyor. */
const anahtarYok = () => jsonYanit(
  JSON.stringify({ error: 'Kaynak anahtarı tanımlı değil (DERSBENDE_KEY)' }), 503,
);

/**
 * `/api/piyasa` — tüm emtia fiyatları, D1'den.
 *
 * ─── ARTIK İSTEK ANINDA ÇEKİLMİYOR ──────────────────────────────────────────
 * Bu uç kaynağa gidip 45 sembolü tek tek Yahoo'dan çektiriyordu; soğuk
 * önbellekte sayfa 18,8 saniye bekliyordu (ölçüldü). Fiyatları zamanlanmış iş
 * yazıyor (`emtiaCek.js`), burası yalnız okuyor — her ziyaretçi için
 * milisaniye.
 *
 * Yanıt biçimi BİREBİR aynı bırakıldı (`success`/`commodities`/`updated`/
 * `source` ve sembol alanları). Web ve mobil istemciler bu biçimi
 * ayrıştırıyor; değiştirmek ikisini birden kırardı ve mağaza sürümü
 * beklemek gerekirdi.
 *
 * `updated` artık VERİNİN yaşı: en son hangi turun yazdığı. Eskiden kaynağın
 * kendi damgasıydı ve bir şey ters gittiğinde sabit kalıyordu.
 */
export async function handlePiyasa(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const r = await env.DB.prepare(`
    SELECT t.sembol, t.ad, t.kategori, t.birim,
           f.fiyat, f.para_birimi, f.degisim, f.degisim_yuzde, f.borsa,
           f.kaynak_zaman, f.guncelleme
      FROM emtia_tanim t
      LEFT JOIN emtia_fiyat f ON f.sembol = t.sembol
     ORDER BY t.sira`).all();

  const satirlar = r.results ?? [];
  /* Fiyatı henüz yazılmamış sembol listeye GİRMİYOR: adı olan ama değeri
     olmayan bir satır, ekranda boş bir kart olarak çizilirdi. */
  const dolu = satirlar.filter((s) => s.fiyat != null);

  const enYeni = dolu.reduce((m, s) => Math.max(m, Number(s.guncelleme ?? 0)), 0);
  const govde = {
    success: true,
    commodities: dolu.map((s) => ({
      symbol: s.sembol,
      name: s.ad,
      category: s.kategori,
      unit: s.birim,
      price: s.fiyat,
      currency: s.para_birimi,
      change: s.degisim,
      changePct: s.degisim_yuzde,
      exchange: s.borsa,
      time: s.kaynak_zaman,
    })),
    source: 'Yahoo Finance v8 chart (D1)',
    updated: enYeni ? new Date(enYeni * 1000).toISOString().replace('T', ' ').slice(0, 19) : null,
  };

  /*
   * Kenar önbelleği KISA: D1 okuması zaten hızlı, uzun TTL yalnız tazeliği
   * geciktirirdi. Yine de sıfır değil — aynı anda gelen isteklerin hepsi D1'e
   * gitmesin.
   */
  void ctx;
  return jsonYanit(JSON.stringify(govde), 200, { 'Cache-Control': 'public, max-age=60' });
}

/** `/api/piyasa/gecmis?sembol=ZW=F&aralik=6mo` — tarih serisi. */
export function handlePiyasaGecmis(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const anahtar = env?.DERSBENDE_KEY;
  if (!anahtar) return anahtarYok();
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
  const adim = ARALIK_ADIM[aralik];
  if (!adim) {
    return jsonYanit(JSON.stringify({ error: 'Geçersiz aralık' }), 400);
  }

  const onbellekAnahtari = `${url.origin}/__onbellek/piyasa-gecmis/${encodeURIComponent(sembol)}/${aralik}`;
  const kaynak = `${KAYNAK}?action=commodity_chart&api_key=${encodeURIComponent(anahtar)}`
    + `&symbol=${encodeURIComponent(sembol)}&range=${aralik}&interval=${adim}`;

  /*
   * Gün içi aralıklar (1d/5d) daha KISA saklanıyor: 30 dakikalık bir önbellek,
   * 5 dakikalık adımla çizilen grafiği anlamsız kılardı.
   */
  const ttl = (aralik === '1d' || aralik === '5d') ? 300 : GECMIS_TTL_SN;
  return kenardanVer(onbellekAnahtari, kaynak, ttl, ctx);
}
