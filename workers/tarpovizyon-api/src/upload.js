/**
 * Veri düzenleme uçları (katalog + satır yazma).
 *
 * TÜİK'in bir kısım serisi API'de yayımlanmıyor; ayrıca kullanıcı zaman zaman
 * elle düzeltme yapmak istiyor. Bu uçlar paneldeki ızgara editörünü besliyor.
 *
 * ─── GÜVENLİK ───────────────────────────────────────────────────────────────
 * Yazan tek uç burası. Katmanlar:
 *
 *  1. Ayrı anahtar. Okuma anahtarı işe yaramaz; `x-admin-key` başlığı
 *     `env.ADMIN_KEY` secret'ıyla eşleşmeli. Secret tanımlı değilse uç
 *     TAMAMEN KAPALI (fail-closed).
 *  2. Tablo beyaz listesi. Yazılabilir tablolar ROUTES'tan geliyor; istemcinin
 *     gönderdiği isim doğrudan SQL'e girmiyor, listede aranıyor.
 *  3. Sütun doğrulaması VERİTABANINDAN. Sütun adları PRAGMA ile tablonun
 *     kendisinden okunuyor; istemcinin uydurduğu bir sütun adı SQL'e giremez.
 *  4. Bağlı parametre. Bütün DEĞERLER `?` ile bağlanıyor.
 *
 * DELETE yok, DROP yok, serbest SQL yok, istek başına satır sınırı var.
 *
 * ─── NEDEN `id` ─────────────────────────────────────────────────────────────
 * Upsert'i "iş anahtarı" ile yapmak tehlikeli: aynı sütun tabloda
 * '2023-01-01 00:00:00', dosyada '2023' olabiliyor ve eşleşmeyince satır
 * güncellenmek yerine ikizleniyor. Bu yüzden düzenleme KİMLİĞİ `id`:
 * ızgaradan gelen `id`'li satır GÜNCELLENİR, `id`'siz satır EKLENİR.
 * Kullanıcı hangi satırı düzenlediğini ekranda görüyor, tahmin yok.
 */

export const MAX_ROWS = 500;

/** Yazmaya kapalı sütunlar — kimlik ve otomatik alanlar. */
const YAZILAMAZ = new Set(['id', 'created_at', 'updated_at']);

const q = (isim) => `"${String(isim).replace(/"/g, '""')}"`;

/** Tablonun gerçek sütunlarını veritabanından okur. */
async function sutunlar(env, tablo) {
  const { results } = await env.DB.prepare(
    'SELECT name, type FROM pragma_table_info(?)',
  ).bind(tablo).all();
  return results ?? [];
}

/**
 * Katalog: hangi tablolar düzenlenebilir, hangi sayfalarda kullanılıyor.
 * `ROUTES` okuma rotalarının tablo eşlemesi; yazma da aynı listeyle sınırlı.
 */
export async function handleCatalog(env, ROUTES, SAYFA_HARITASI) {
  const gorulen = new Set();
  const out = [];
  for (const [rota, cfg] of Object.entries(ROUTES)) {
    if (!cfg?.table || gorulen.has(cfg.table)) continue;
    gorulen.add(cfg.table);
    out.push({
      tablo: cfg.table,
      rota,
      sayfalar: SAYFA_HARITASI[cfg.table] ?? [],
    });
  }
  out.sort((a, b) => a.tablo.localeCompare(b.tablo, 'tr'));
  return { tablolar: out };
}

/** Tek tablonun şeması — ızgara sütunlarını kurmak için. */
export async function handleSchema(env, ROUTES, tablo) {
  const gecerli = Object.values(ROUTES).some((c) => c?.table === tablo);
  if (!gecerli) return { status: 400, body: { error: 'Bilinmeyen tablo' } };
  const cols = await sutunlar(env, tablo);
  if (!cols.length) return { status: 404, body: { error: 'Tablo bulunamadı' } };
  return {
    status: 200,
    body: {
      tablo,
      idVar: cols.some((c) => c.name === 'id'),
      sutunlar: cols.map((c) => ({
        ad: c.name,
        tur: c.type,
        yazilabilir: !YAZILAMAZ.has(c.name),
      })),
    },
  };
}

/** Değeri sütun türüne göre normalize eder. */
function deger(tur, ham) {
  if (ham === undefined || ham === null || ham === '') return null;
  const sayisal = /INT|REAL|NUM|DOUB|FLOA/i.test(tur || '');
  if (!sayisal) return String(ham);
  const n = Number(String(ham).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Satır yazma. Gövde: { tablo, guncellenecek: [{id, ...}], eklenecek: [{...}] }
 */
export async function handleRows(request, env, ROUTES) {
  if (request.method !== 'POST') return { status: 405, body: { error: 'Yalnızca POST' } };

  const beklenen = env.ADMIN_KEY ?? '';
  if (!beklenen || (request.headers.get('x-admin-key') ?? '') !== beklenen) {
    return { status: 401, body: { error: 'Yetkisiz' } };
  }

  let govde;
  try { govde = await request.json(); } catch { return { status: 400, body: { error: 'Geçersiz JSON' } }; }

  const tablo = govde?.tablo;
  if (!Object.values(ROUTES).some((c) => c?.table === tablo)) {
    return { status: 400, body: { error: 'Bilinmeyen tablo' } };
  }

  const guncellenecek = Array.isArray(govde.guncellenecek) ? govde.guncellenecek : [];
  const eklenecek = Array.isArray(govde.eklenecek) ? govde.eklenecek : [];
  if (guncellenecek.length + eklenecek.length === 0) {
    return { status: 400, body: { error: 'Yazılacak satır yok' } };
  }
  if (guncellenecek.length + eklenecek.length > MAX_ROWS) {
    return { status: 400, body: { error: `İstek başına en fazla ${MAX_ROWS} satır` } };
  }

  // Sütun adları veritabanından; istemcinin uydurduğu ad buraya giremez.
  const cols = await sutunlar(env, tablo);
  const tur = new Map(cols.map((c) => [c.name, c.type]));
  const yazilabilir = cols.filter((c) => !YAZILAMAZ.has(c.name)).map((c) => c.name);
  const idVar = cols.some((c) => c.name === 'id');

  const gelen = [...new Set([...guncellenecek, ...eklenecek].flatMap(Object.keys))]
    .filter((k) => k !== 'id');
  const izinsiz = gelen.filter((k) => !yazilabilir.includes(k));
  if (izinsiz.length) {
    return { status: 400, body: { error: 'İzin verilmeyen sütun', sutunlar: izinsiz } };
  }
  if (guncellenecek.length && !idVar) {
    return { status: 400, body: { error: 'Bu tabloda id yok; güncelleme yapılamaz' } };
  }

  const ifadeler = [];

  for (const r of guncellenecek) {
    const id = Number(r.id);
    if (!Number.isInteger(id)) return { status: 400, body: { error: 'Geçersiz id' } };
    const sutun = Object.keys(r).filter((k) => k !== 'id' && yazilabilir.includes(k));
    if (!sutun.length) continue;
    ifadeler.push(env.DB
      .prepare(`UPDATE ${q(tablo)} SET ${sutun.map((c) => `${q(c)} = ?`).join(', ')} WHERE ${q('id')} = ?`)
      .bind(...sutun.map((c) => deger(tur.get(c), r[c])), id));
  }

  for (const r of eklenecek) {
    const sutun = Object.keys(r).filter((k) => yazilabilir.includes(k));
    if (!sutun.length) continue;
    ifadeler.push(env.DB
      .prepare(`INSERT INTO ${q(tablo)} (${sutun.map(q).join(',')}) VALUES (${sutun.map(() => '?').join(',')})`)
      .bind(...sutun.map((c) => deger(tur.get(c), r[c]))));
  }

  if (!ifadeler.length) return { status: 200, body: { guncellenen: 0, eklenen: 0 } };
  await env.DB.batch(ifadeler);
  return {
    status: 200,
    body: { tablo, guncellenen: guncellenecek.length, eklenen: eklenecek.length },
  };
}
