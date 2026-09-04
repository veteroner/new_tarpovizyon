/**
 * Önbellek damgası yazma — veri yükleyen bütün scriptler için ortak.
 *
 * Worker'ın okuma yanıtları kenar önbelleğinde tutuluyor ve önbellek anahtarı
 * tablonun damgasını taşıyor (`workers/tarpovizyon-api/src/damga.js`). Bir
 * tabloya yazıp damgasını ATLAMAK, o tablonun sayfalarını bir saate kadar eski
 * veride bırakır — güncelleme D1'e girer ama kimse görmez. Yani D1'e yazan her
 * script, yazdığı tabloları burada damgalamak zorunda.
 *
 * ─── NEDEN İKİ AYRI BİÇİM ───────────────────────────────────────────────────
 * Scriptlerin iki farklı D1 sürücüsü var ve ikisi de değiştirilmeyecek kadar
 * yerleşik:
 *
 *   `damgala(d1, tablolar)`   → parametreli sürücüler (tuik-sync, Cloudflare
 *                               HTTP API üzerinden `d1(sql, params)`).
 *   `damgaSql(tablolar)`      → metin SQL üretip wrangler'a dosya/komut olarak
 *                               veren scriptler (fao-sync, tufe-guncelle,
 *                               bitkisel-bulten, tuik-disticaret…).
 *
 * Damganın hangi VERİTABANINA yazıldığı çağıranın sürücüsüne bağlı: `veri_damga`
 * hem `tarpovizyon-basic` hem `tarpovizyon-dunya` üzerinde var ve Worker ikisini
 * birleştirerek okuyor. Yani her script kendi veritabanına yazar, ek bir
 * veritabanı kimliği taşımak zorunda kalmaz.
 */

const YAZ_SQL = `INSERT INTO veri_damga (tablo, damga) VALUES (?, ?)
                 ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga`;

const tekil = (tablolar) => [...new Set(tablolar)].filter(Boolean);

/** SQL metin değeri — tek tırnak kaçışlı. */
const s = (v) => `'${String(v).replace(/'/g, "''")}'`;

/**
 * Parametreli sürücüler için. `d1` imzası: (sql, params) => Promise.
 *
 * Damga, verinin kendisi değil onun tazelik göstergesi; yazılamazsa senkronun
 * geri kalanını çöpe atmak orantısız olurdu. Bu yüzden hata YUTULMUYOR ama
 * çağıran tarafta try/catch ile sarmalanması bekleniyor — en kötü sonuç eski
 * davranış, yani bir saatlik gecikme.
 */
export async function damgala(d1, tablolar) {
  const zaman = Date.now();
  for (const tablo of tekil(tablolar)) {
    await d1(YAZ_SQL, [tablo, zaman]);
  }
}

/**
 * Metin SQL üreten sürücüler için. Sonuç, scriptin kendi SQL yığınının SONUNA
 * eklenmeli: damga, veri gerçekten yazıldıktan sonra ilerlemeli.
 *
 * Tablo adları scriptlerin kendi yapılandırmasından geliyor (kullanıcı girdisi
 * değil); yine de kaçışlı yazılıyor.
 */
export function damgaSql(tablolar) {
  const zaman = Date.now();
  return tekil(tablolar)
    .map((tablo) => `INSERT INTO veri_damga (tablo, damga) VALUES (${s(tablo)}, ${zaman})\n`
      + '  ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga;')
    .join('\n');
}
