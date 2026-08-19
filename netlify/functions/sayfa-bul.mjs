/**
 * sayfa-bul.mjs — "Kullanıcı ne aradı, hangi sayfaya gitmeli?" (Netlify Function)
 *
 * Frontend `/api.php?action=sayfa_bul` isteğini karşılar (netlify.toml redirect).
 * Anahtarlar ortam değişkeninden, ai-chat ile aynı (hardcode YOK):
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
  { p: 'gemini', id: 'gemini-3.1-flash-lite', ms: 3000 },
  { p: 'groq', id: 'openai/gpt-oss-120b', ms: 3000 },
  { p: 'groq', id: 'llama-3.1-8b-instant', ms: 2500 },
  { p: 'gemini', id: 'gemini-2.5-flash-lite', ms: 2500 },
]

/** Arama kutusunda bekleyen kullanıcı için üst sınır. */
const TOTAL_BUDGET_MS = 7000
const MIN_VIABLE_MS = 1200
/** Tek satır yol için fazlasıyla yeterli; uzun cevap zaten hatalı cevaptır. */
const MAX_TOKENS = 48

/** İstemci listesi bundan uzunsa kesiliyor — istek gövdesi şişmesin. */
const EN_FAZLA_SAYFA = 200

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json', ...CORS },
})

function istem(soru, sayfalar) {
  const liste = sayfalar.map((s, i) => `${i + 1}. ${s.ad}${s.bolum ? ` (${s.bolum})` : ''}`).join('\n');
  return `Aşağıda bir tarım veri uygulamasındaki sayfaların listesi var.

Kullanıcı arama kutusuna şunu yazdı: "${soru}"

Kullanıcının aradığı veriyi en iyi gösteren sayfanın NUMARASINI yaz.
Sadece numarayı yaz, başka hiçbir şey yazma.
Listede gerçekten uygun bir sayfa yoksa sadece 0 yaz.

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
 * Modelin cevabından sayfa numarasını çıkarır.
 * Model bazen "3" yerine "Cevap: 3" ya da "<think>…</think> 3" yazıyor;
 * ilk sayı alınıyor. Aralık dışı her şey "bulamadım" sayılıyor.
 */
function numaraCoz(text, adet) {
  const temiz = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '')
  const eslesme = temiz.match(/\d+/)
  if (!eslesme) return 0
  const n = Number(eslesme[0])
  return Number.isInteger(n) && n >= 1 && n <= adet ? n : 0
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

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

  const anahtarlar = { gemini: process.env.TARPOL_AI_KEY, groq: process.env.TARPOL_GROQ_KEY }
  const metin = istem(soru, sayfalar)
  const basladi = Date.now()

  let secilen = null
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
      const n = numaraCoz(r.text, sayfalar.length)
      kullanilan = m.id
      /*
       * n === 0 "listede yok" demek ve bu GEÇERLİ bir cevap — sıradaki modele
       * geçilmiyor. Aksi hâlde zincir, doğru şekilde "yok" diyen modeli atlayıp
       * uydurmaya daha yatkın olana kadar iniyordu.
       */
      secilen = n === 0 ? null : sayfalar[n - 1]
      break
    } catch {
      // timeout ya da ağ hatası → sıradaki model
    }
  }

  if (!kullanilan) return json({ error: 'model yanıt vermedi' }, 502)
  return json({ success: true, yol: secilen?.yol ?? null, ad: secilen?.ad ?? null, engine: kullanilan })
}
