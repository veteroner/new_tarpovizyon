/**
 * Emtia fiyatlarını Yahoo'dan çekip D1'e yazar — zamanlanmış iş.
 *
 * ─── NEDEN ZAMANLANMIŞ, NEDEN İSTEK ANINDA DEĞİL ────────────────────────────
 * Fiyatlar istek anında çekiliyordu: 45 sembol tek tek Yahoo'dan alınıyor ve
 * soğuk önbellekte sayfa 18,8 saniye bekliyordu (ölçüldü; sıcakken 0,25 sn).
 * Kenar önbelleği 10 dakikalıktı, yani her süre dolumunda BİR kullanıcı o
 * bedeli ödüyordu.
 *
 * "Uygulama açılınca ön belleğe çekelim" bunu çözmüyor: beklemeyi kaldırmıyor,
 * başka ana taşıyor — ilk ziyaretçi yine bekliyor ve her açılış Yahoo'ya yeni
 * bir istek demek. Yahoo şu an `429 Too Many Requests` veriyor, yani sık
 * istemek durumu kötüleştiriyor.
 *
 * Burada önbellek kullanıcı açılışına değil TAKVİME bağlı: kimse istemeden
 * önce yazılmış oluyor. Kaybettiğimiz tazelik yok — Yahoo verisi zaten 15
 * dakika gecikmeli yayımlanıyor.
 *
 * ─── NEDEN v8/chart, v7/quote DEĞİL ─────────────────────────────────────────
 * Ölçüldü: `v7/finance/quote` Cloudflare'den 401 dönüyor (çerez/crumb
 * istiyor). `v8/finance/chart` 200 dönüyor ve son kapanışı taşıyor. Kaynak
 * sistem de aynı yola düşmüş durumda (`source: "Yahoo Finance v8 chart"`).
 */

const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart/';

/**
 * Aynı anda kaç istek.
 *
 * Yahoo hız sınırlıyor (429 ölçüldü), o yüzden 45 isteği aynı anda açmak
 * bilerek YAPILMIYOR. Beşerli gruplar hem sınırı zorlamıyor hem de tüm turu
 * makul sürede bitiriyor. Worker'ın istek başına alt-istek sınırı da 50;
 * 45 sembol onun altında kalıyor.
 */
const GRUP = 5;

/** Tek sembolün son kapanışını ve değişimini çıkarır. */
async function sembolCek(sembol) {
  const url = `${YAHOO}${encodeURIComponent(sembol)}?interval=1d&range=5d`;
  const y = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
  if (!y.ok) throw new Error(`HTTP ${y.status}`);
  const j = await y.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error('sonuç yok');

  const meta = r.meta ?? {};
  const kapanislar = (r.indicators?.quote?.[0]?.close ?? []).filter((v) => v != null);

  /*
   * ─── FİYAT: GÜNLÜK KAPANIŞ DEĞİL, GÜNCEL PİYASA ───────────────────────────
   * Günlük seri DÜNÜN kapanışıyla bitiyor; `meta.regularMarketPrice` ise
   * BUGÜNÜN (15 dk gecikmeli) fiyatı. Ölçüldü — ZW=F:
   *
   *     son günlük kapanış (11 Eylül) : 707,00
   *     meta.regularMarketPrice       : 726,25
   *
   * İlk sürüm seriden okuyordu, yani bir gün bayat bir sayıyı "fiyat" diye
   * yazıyordu. Fiyat sayfasında bu sessiz bir yanlış: sayı makul görünüyor ve
   * kimse fark etmiyor. Kaynak sistem de güncel fiyatı kullanıyordu.
   *
   * Seri BOŞ olabildiği için yedek gerekiyor: `LB=F` (kereste) 5 günlük
   * pencerede hiç kapanış döndürmüyor ama meta'da fiyat var. Az işlem gören
   * sözleşmelerde bu hal kalıcı — ilk sürüm o sembolü her turda düşürüyordu.
   */
  const sonKapanis = kapanislar.at(-1) ?? null;
  const son = meta.regularMarketPrice ?? sonKapanis;
  if (son == null) throw new Error('fiyat yok');

  /*
   * ─── ÖNCEKİ: "ÖNCEKİ KAPANIŞ" OLMALI ─────────────────────────────────────
   * Değişim, güncel fiyatın ÖNCEKİ KAPANIŞA göre hareketi. İlk sürüm
   * `chartPreviousClose` kullanıyordu ve o, serinin BAŞINDAN önceki kapanış —
   * yani beş gün öncesi. Sonuç: ZW=F'de %-3,18 yazıyordu, doğrusu 707 → 726,25
   * yani %+2,72.
   *
   * Canlı fiyat varsa önceki kapanış serinin SON değeri; canlı fiyat yoksa
   * fiyatın kendisi son kapanış olduğu için önceki, sondan bir öncekidir.
   */
  const onceki = (meta.regularMarketPrice != null && sonKapanis != null)
    ? sonKapanis
    : (kapanislar.at(-2) ?? meta.chartPreviousClose ?? null);
  const degisim = onceki != null ? son - onceki : null;
  const yuzde = (onceki != null && onceki !== 0) ? ((son - onceki) / onceki) * 100 : null;

  return {
    sembol,
    fiyat: son,
    paraBirimi: meta.currency ?? null,
    degisim,
    degisimYuzde: yuzde,
    borsa: meta.fullExchangeName ?? meta.exchangeName ?? null,
    kaynakZaman: meta.regularMarketTime ?? null,
  };
}

/**
 * Tüm sembolleri çekip D1'e yazar.
 *
 * BAŞARISIZ SEMBOL TURU DÜŞÜRMÜYOR: Yahoo tek bir sembolde 429 ya da 404
 * verebiliyor. Hepsini iptal etmek, çalışan 44 fiyatı da çöpe atardı. O
 * sembolün D1'deki ÖNCEKİ değeri yerinde kalıyor ve bir sonraki turda
 * yeniden deneniyor.
 */
export async function emtiaTurunuCalistir(env) {
  const tanimlar = await env.DB.prepare('SELECT sembol FROM emtia_tanim ORDER BY sira').all();
  const semboller = (tanimlar.results ?? []).map((s) => s.sembol);
  if (!semboller.length) return { yazilan: 0, hata: 0, not: 'emtia_tanim boş' };

  const basarili = [];
  const hatalar = [];

  for (let i = 0; i < semboller.length; i += GRUP) {
    const dilim = semboller.slice(i, i + GRUP);
    const sonuclar = await Promise.allSettled(dilim.map((s) => sembolCek(s)));
    sonuclar.forEach((s, j) => {
      if (s.status === 'fulfilled') basarili.push(s.value);
      else hatalar.push({ sembol: dilim[j], sebep: String(s.reason?.message ?? s.reason).slice(0, 60) });
    });
  }

  if (basarili.length) {
    const t = Math.floor(Date.now() / 1000);
    await env.DB.batch(basarili.map((x) => env.DB.prepare(
      `INSERT INTO emtia_fiyat (sembol, fiyat, para_birimi, degisim, degisim_yuzde, borsa, kaynak_zaman, guncelleme)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sembol) DO UPDATE SET
         fiyat = excluded.fiyat, para_birimi = excluded.para_birimi,
         degisim = excluded.degisim, degisim_yuzde = excluded.degisim_yuzde,
         borsa = excluded.borsa, kaynak_zaman = excluded.kaynak_zaman,
         guncelleme = excluded.guncelleme`,
    ).bind(x.sembol, x.fiyat, x.paraBirimi, x.degisim, x.degisimYuzde, x.borsa, x.kaynakZaman, t)));
  }

  if (hatalar.length) {
    console.warn(`[emtia] ${hatalar.length}/${semboller.length} sembol alınamadı:`,
      hatalar.slice(0, 5).map((h) => `${h.sembol}=${h.sebep}`).join(', '));
  }
  return { yazilan: basarili.length, hata: hatalar.length };
}
