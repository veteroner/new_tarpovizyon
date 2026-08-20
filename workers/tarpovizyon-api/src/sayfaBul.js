/**
 * Sayfa bulucu — Worker ucu (`POST /api/sayfa-bul`).
 *
 * ─── NEDEN WORKER, NEDEN NETLIFY DEĞİL ──────────────────────────────────────
 * Önce Netlify function olarak yazıldı ve native uygulama için üretim adresi
 * koda gömüldü. Yanlıştı: `ai.js` aynı sorunu daha önce çözmüş ve gerekçesini
 * de yazmış — native kabuğun Netlify kökeni yok, `capacitor://` üzerinden
 * `/api.php` yönlendirmesi hiç çalışmıyor. Uygulama zaten bütün verisini bu
 * Worker'dan çekiyor; tek köken, gömülü adres yok.
 *
 * Anahtarlar `ai.js` ile aynı secret'lar (istemcide sıfır sır):
 *   TARPOL_AI_KEY → Gemini,  TARPOL_GROQ_KEY → Groq
 *
 * ─── NEDEN AYRI BİR FUNCTION ────────────────────────────────────────────────
 * `ai-chat` ile aynı işi yapmıyor, hatta zıddını yapıyor:
 *
 *   ai-chat   serbest metin üretir; modelin kendi bilgisinden konuşur.
 *   sayfa-bul KAPALI BİR LİSTEDEN SEÇER; hiçbir şey üretmez.
 *
 * Bu ayrım güvenliğin tamamı. Model burada cümle kuramaz, rakam söyleyemez,
 * olmayan bir sayfa uyduramaz — çıktısı istemcinin gönderdiği listedeki bir
 * yolla sınırlı ve dönen değer o listede yoksa atılıyor. Uydurma riski taşıyan
 * yüzey sıfır.
 *
 * ─── NEDEN AYRI MODEL ZİNCİRİ ───────────────────────────────────────────────
 * ai-chat zinciri "en zeki önce" sıralı ve 16 sn bütçesi var; orada kullanıcı
 * bir sohbet yanıtı bekliyor. Burada kullanıcı ARAMA KUTUSUNA yazmış durumda
 * ve bekliyor. 8 saniye süren doğru cevap, 2 saniyede gelen doğru cevabın
 * yanında işe yaramaz. Bu yüzden zincir "en hızlı önce" ve bütçe kısa.
 *
 * İş de zor değil: 84 başlıklı bir listeden birini seçmek, akıl yürütme
 * gerektiren bir görev değil. Küçük modeller bunu yapıyor.
 */

/**
 * Zincir: HIZ önce. Süreler ai-chat'teki ölçümlerden (2026-07-29).
 * `tokens` bilerek çok küçük — beklenen çıktı tek satırlık bir yol.
 */
const MODELS = [
  { p: 'gemini', id: 'gemini-3.1-flash-lite', ms: 1800 },
  { p: 'groq', id: 'openai/gpt-oss-120b', ms: 1800 },
  { p: 'groq', id: 'llama-3.1-8b-instant', ms: 1500 },
  { p: 'gemini', id: 'gemini-2.5-flash-lite', ms: 1500 },
]

/**
 * Arama kutusunda ve sesli sohbette bekleyen kullanıcı için üst sınır.
 *
 * ─── MODEL BAŞINA SÜRE NEDEN KISA ───────────────────────────────────────────
 * Model başına 3 sn verilmişti ve canlıda ölçüldüğünde uç 0,8–4,3 sn arasında
 * salınıyordu: ilk model yavaşladığında ona 3 sn harcanıyor, sonra sıradakine
 * geçiliyordu. İstemci 3,5 sn'de vazgeçtiği için besleme SESSİZCE atlanıyor
 * ve asistan ezberinden cevap veriyordu.
 *
 * 84 başlıktan birini seçmek çalışan bir model için saniyenin altında bir iş.
 * Süre kısaltılınca yavaş model erken bırakılıyor ve zincir hızlı olana daha
 * çabuk iniyor — toplam süre düşüyor, doğruluk düşmüyor.
 */
const TOTAL_BUDGET_MS = 6000
const MIN_VIABLE_MS = 1000
/** Tek satır yol için fazlasıyla yeterli; uzun cevap zaten hatalı cevaptır. */
const MAX_TOKENS = 48

/** İstemci listesi bundan uzunsa kesiliyor — istek gövdesi şişmesin. */
const EN_FAZLA_SAYFA = 200
/** Tek istekte döndürülebilecek en çok sayfa. Daha fazlası bağlamı şişiriyor. */
const EN_FAZLA_SONUC = 3

/*
 * CORS: `ai.js` ile aynı gerekçe — native kabuğun kökeni sabit değil
 * (iOS'ta özel şema, Android'de https://localhost), bu yüzden `*`.
 * Genel okuma CORS'u yalnızca GET'e izin verdiği için POST ucu kendi
 * başlıklarını taşımak zorunda; yoksa tarayıcı ön kontrolü düşüyor.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json', ...CORS },
})

function istem(soru, sayfalar, adet) {
  const liste = sayfalar.map((s, i) => `${i + 1}. ${s.ad}${s.bolum ? ` (${s.bolum})` : ''}`).join('\n')
  /*
   * Tek sayfa ve çok sayfa için AYRI istem.
   *
   * Tek sayfalık hâlde "en fazla 1 numara yaz" demek modeli tereddüde
   * düşürüyor; arama kutusu her zaman tek sonuç istiyor ve kesin bir emir
   * daha iyi çalışıyor. Çok sayfa yalnızca AI cevabını beslerken gerekiyor:
   * "süt ve et üretimini karşılaştır" gibi sorular iki ayrı sayfadan
   * besleniyor.
   */
  const emir = adet <= 1
    ? `Kullanıcının aradığı veriyi en iyi gösteren sayfanın NUMARASINI yaz.
Sadece numarayı yaz, başka hiçbir şey yazma.
Listede gerçekten uygun bir sayfa yoksa sadece 0 yaz.`
    : `Soruyu cevaplamak için gereken sayfaların NUMARALARINI yaz, en fazla ${adet} tane.
En alakalı olan başta olsun, virgülle ayır (örnek: 12,4).
Yalnızca GERÇEKTEN gereken sayfaları yaz — soru tek konuya bakıyorsa tek numara yeter.
Sadece numaraları yaz, başka hiçbir şey yazma.
Listede gerçekten uygun bir sayfa yoksa sadece 0 yaz.`

  return `Aşağıda bir tarım veri uygulamasındaki sayfaların listesi var.

Kullanıcı şunu sordu: "${soru}"

${emir}

SAYFALAR:
${liste}`
}

async function zamanliFetch(url, options, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function gemini(m, metin, apiKey, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m.id}:generateContent?key=${apiKey}`
  const res = await zamanliFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: metin }] }],
      // Sıcaklık 0: aynı sorgu her seferinde aynı sayfayı vermeli, yoksa
      // kullanıcı iki kez arayıp iki farklı yere gidiyor.
      generationConfig: { temperature: 0, maxOutputTokens: MAX_TOKENS },
    }),
  }, timeoutMs)
  const data = await res.json().catch(() => null)
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('')
  return { ok: res.ok && Boolean(text.trim()), text }
}

async function groq(m, metin, apiKey, timeoutMs) {
  const res = await zamanliFetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: m.id,
      messages: [{ role: 'user', content: metin }],
      temperature: 0,
      max_tokens: MAX_TOKENS,
    }),
  }, timeoutMs)
  const data = await res.json().catch(() => null)
  const text = data?.choices?.[0]?.message?.content ?? ''
  return { ok: res.ok && Boolean(text.trim()), text }
}

/**
 * Modelin cevabından sayfa numaralarını çıkarır.
 *
 * Model bazen "3" yerine "Cevap: 3" ya da "<think>…</think> 3,7" yazıyor;
 * metindeki bütün sayılar sırayla alınıyor. ARALIK DIŞI olanlar atılıyor —
 * modelin listede olmayan bir sayfaya yönlendirmesinin önündeki ilk engel bu.
 * Tekrar edenler de eleniyor: aynı sayfayı iki kez beslemek bağlamı boşuna
 * şişirirdi.
 */
function numaralariCoz(text, sayfaAdedi, enFazla) {
  const temiz = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '')
  const bulunan = []
  for (const ham of temiz.match(/\d+/g) ?? []) {
    const n = Number(ham)
    if (!Number.isInteger(n) || n < 1 || n > sayfaAdedi) continue
    if (bulunan.includes(n)) continue
    bulunan.push(n)
    if (bulunan.length >= enFazla) break
  }
  return bulunan
}

/**
 * Hız sınırı — `ai.js` ile AYNI binding.
 *
 * Bu uç kimlik doğrulaması istemiyor ve her istek ücretli bir model çağrısı
 * demek; sınırsız bırakmak, adresi gören birinin faturayı yazması demekti.
 *
 * Binding tanımlı değilse istek engellenmiyor: eksik bir koruma yüzünden
 * çalışan bir özelliği kapatmak daha kötü olurdu (ai.js'teki aynı tercih).
 */
async function hizSiniriAsildi(req, env) {
  if (!env.AI_LIMIT) return false
  const ip = req.headers.get('CF-Connecting-IP') ?? 'bilinmeyen'
  const { success } = await env.AI_LIMIT.limit({ key: `sayfabul:${ip}` })
  return !success
}

export async function handleSayfaBul(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  if (await hizSiniriAsildi(req, env)) {
    return json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, 429)
  }

  let body = null
  try { body = await req.json() } catch { body = null }

  const soru = String(body?.soru ?? '').trim()
  const gelen = Array.isArray(body?.sayfalar) ? body.sayfalar : []
  if (!soru) return json({ error: 'soru required' }, 400)
  if (!gelen.length) return json({ error: 'sayfalar required' }, 400)

  const sayfalar = gelen.slice(0, EN_FAZLA_SAYFA).map((s) => ({
    yol: String(s?.yol ?? ''),
    ad: String(s?.ad ?? '').slice(0, 90),
    bolum: String(s?.bolum ?? '').slice(0, 90),
  })).filter((s) => s.yol && s.ad)
  if (!sayfalar.length) return json({ error: 'sayfalar required' }, 400)

  /*
   * Kaç sayfa isteniyor. Arama kutusu 1 istiyor (tek sonuç gösteriyor), AI
   * cevabını beslerken birden çok gerekiyor. Varsayılan 1 — parametreyi
   * göndermeyen eski istemci aynı davranışı görüyor.
   */
  const adet = Math.min(Math.max(Number(body?.adet) || 1, 1), EN_FAZLA_SONUC)

  const anahtarlar = { gemini: env.TARPOL_AI_KEY, groq: env.TARPOL_GROQ_KEY }
  const metin = istem(soru, sayfalar, adet)
  const basladi = Date.now()

  let secilen = []
  let kullanilan = null

  for (const m of MODELS) {
    const kalan = TOTAL_BUDGET_MS - (Date.now() - basladi)
    const sure = Math.min(m.ms, kalan)
    const apiKey = anahtarlar[m.p]
    if (!apiKey || sure < MIN_VIABLE_MS) continue
    try {
      const r = m.p === 'gemini'
        ? await gemini(m, metin, apiKey, sure)
        : await groq(m, metin, apiKey, sure)
      if (!r.ok) continue
      const nler = numaralariCoz(r.text, sayfalar.length, adet)
      kullanilan = m.id
      /*
       * Boş liste "listede yok" demek ve bu GEÇERLİ bir cevap — sıradaki
       * modele geçilmiyor. Aksi hâlde zincir, doğru şekilde "yok" diyen
       * modeli atlayıp uydurmaya daha yatkın olana kadar iniyordu.
       */
      secilen = nler.map((n) => sayfalar[n - 1])
      break
    } catch {
      // timeout ya da ağ hatası → sıradaki model
    }
  }

  if (!kullanilan) return json({ error: 'model yanıt vermedi' }, 502)
  /*
   * `yol`/`ad` ilk sonucu taşıyor: arama kutusu bu alanları okuyor ve
   * `adet` göndermiyor. Çoklu isteyen `sayfalar` dizisini okuyor.
   */
  return json({
    success: true,
    yol: secilen[0]?.yol ?? null,
    ad: secilen[0]?.ad ?? null,
    sayfalar: secilen.map((s) => ({ yol: s.yol, ad: s.ad })),
    engine: kullanilan,
  })
}
