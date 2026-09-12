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
 * ─── DERSBENDE BAĞIMLILIĞI KALKTI ───────────────────────────────────────────
 * Bu dosya bir dönem `dersbende.com/api.php`'yi vekil olarak kullanıyordu ve
 * onun anahtarını taşıyordu. İki uç da artık Cloudflare'de: fiyat listesi
 * D1'den (cron yazıyor), tarih serisi doğrudan Yahoo'dan.
 *
 * Kazanç yalnız bağımsızlık değil. api.php'nin anahtarı, sürümü ya da ayakta
 * olup olmadığı artık uygulamayı hiç etkilemiyor — `gecmis` ucu bugün tam
 * olarak o yüzden 500 vermişti.
 */


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
const ARALIK_GUN = {
  '1mo': 31,
  '3mo': 93,
  '6mo': 186,
  '1y': 366,
  '5y': 1830,
  max: 3660,
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

/**
 * `/api/piyasa/gecmis?sembol=ZW=F&aralik=6mo` — tarih serisi, D1'den.
 *
 * ─── NEDEN İSTEK ANINDA YAHOO'YA GİDİLMİYOR ─────────────────────────────────
 * Bu uç önce dersbende.com/api.php'yi vekil kullanıyordu, sonra doğrudan
 * Yahoo'ya çevrildi. İkisi de tutmadı:
 *
 *   · api.php → bugün 500 verdi (bağlantı switch'ten önce kuruluyor, MySQL
 *     kimliği eksikti) ve zaten bağımlılıktan kurtulmak istiyorduk.
 *   · doğrudan Yahoo → Cloudflare çıkışına **429 Too Many Requests**. Ölçüldü:
 *     20, 40 ve 60 saniye aralıklarla tek istek bile 429; aynı anda yerel
 *     makineden 200. Sınır IP itibarına bağlı, beklemekle geçmiyor.
 *
 * Ama ZAMANLANMIŞ çekim çalışıyor — fiyat turu 45/45 yazmaya devam ediyor.
 * Fark sıklıkta. O yüzden seri de D1'e alındı ve bu uç yalnız okuyor.
 *
 * ─── GÜN İÇİ ARALIKLAR YOK ──────────────────────────────────────────────────
 * 1G ve 5G kaldırıldı: günlük kapanıştan 5 dakikalık grafik çıkmaz ve isteğe
 * bağlı çağrı 429 alıyor. Çalışmayan bir düğme göstermek, hiç göstermemekten
 * kötü.
 */
export async function handlePiyasaGecmis(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const url = new URL(request.url);
  const sembol = url.searchParams.get('sembol') ?? '';
  const aralik = url.searchParams.get('aralik') ?? '6mo';

  /* Girdi doğrulaması sorguya giriyor; serbest bırakmak sembol alanını
     kullanıcı denetimli bir filtreye çevirirdi. */
  if (!sembol || sembol.length > 24 || !/^[A-Za-z0-9=^.\-]+$/.test(sembol)) {
    return jsonYanit(JSON.stringify({ error: 'Geçersiz sembol' }), 400);
  }
  const gun = ARALIK_GUN[aralik];
  if (!gun) {
    return jsonYanit(JSON.stringify({ error: 'Geçersiz aralık' }), 400);
  }

  const esik = Math.floor(Date.now() / 1000) - gun * 86400;
  const r = await env.DB.prepare(
    'SELECT t, c FROM emtia_gecmis WHERE sembol = ? AND t >= ? ORDER BY t',
  ).bind(sembol, esik).all();

  void ctx;
  return jsonYanit(
    JSON.stringify({ success: true, symbol: sembol, range: aralik, data: r.results ?? [] }),
    200,
    { 'Cache-Control': `public, max-age=${GECMIS_TTL_SN}` },
  );
}
