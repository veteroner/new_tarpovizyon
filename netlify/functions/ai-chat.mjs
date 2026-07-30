/**
 * ai-chat.mjs — TarpoVizyon AI (Netlify Function)
 *
 * Frontend `/api.php?action=ai_chat` isteğini karşılar (netlify.toml redirect ile).
 * Sağlayıcı sırası: önce Gemini modelleri, limit/başarısızlıkta Groq modellerine düşer.
 * Anahtarlar ortam değişkeninden okunur (hardcode YOK):
 *   - TARPOL_AI_KEY   → Google Gemini
 *   - TARPOL_GROQ_KEY → Groq
 * Yanıt sözleşmesi eski PHP ile birebir aynı: { success, reply, model } | { error }.
 */

/**
 * MODEL ZİNCİRİ — zekiden basite sıralı, tek liste (Gemini + Groq karışık).
 * Sıra 2026-07-29'da gerçek ölçümle belirlendi (ayrıntı: aşağıdaki notlar).
 *
 * ÖNEMLİ: Netlify senkron function ~10 sn'de kesilir. 44 sn süren bir model
 * "daha zeki" olsa da pratikte SIFIR kalite (timeout) demektir. Bu yüzden sıra
 * "kağıt üstünde zeki" değil, "zeki VE bu bütçede gerçekten yanıt veren"dir.
 *
 * Ölçümler (free tier anahtar):
 *   gemini-3.1-pro / 3-pro / 2.5-pro → 429 kota (~0.3 sn'de düşer, bedava deneme)
 *   gpt-oss-120b (Groq, 120B)        → 2.4 sn, en iyi yapılandırılmış Türkçe yanıt
 *   gemini-3.6-flash                 → 12–44 sn veya 503 (bütçeyi yer)
 *   gemini-3.5-flash                 → 503 yoğunluk
 *   gemini-2.5-flash                 → ~10 sn, kota çabuk biter
 *   gemini-3.1-flash-lite            → 2.1 sn, en güvenilir hızlı Gemini
 *   qwen3.6-27b                      → cevaba <think> sızdırır (temizleniyor)
 *
 * Pro modeller başta: kotaları kapalıyken milisaniyede 429 döner (maliyeti yok),
 * ama faturalandırma açılırsa KOD DEĞİŞMEDEN otomatik devreye girer.
 */
const MODELS = [
  // ── Katman 1: en zeki (kota açılırsa otomatik kullanılır, şu an hızlı 429) ──
  { p: 'gemini', id: 'gemini-3.1-pro-preview', tokens: 4096, ms: 2500, think: 'low' },
  { p: 'gemini', id: 'gemini-3-pro-preview', tokens: 4096, ms: 2500, think: 'low' },
  { p: 'gemini', id: 'gemini-2.5-pro', tokens: 4096, ms: 2500 },

  // ── Katman 2: ölçülen EN İYİ KALİTE. Gemini flash'lar Türkçe agronomide
  // belirgin biçimde daha doğru; gpt-oss-120b hızlı ama halüsinasyon yaptı
  // ("Buğday (Kırmızı Çeltik)" gibi), o yüzden kaliteliler önce gelir.
  { p: 'gemini', id: 'gemini-3.6-flash', tokens: 4096, ms: 8000, think: 'low' },

  // ── Katman 3: GÜVENİLİR YAKALAYICI. 3.6-flash yavaşlarsa (canlıda 12 sn'yi
  // aşabiliyor) zincir buraya düşer: ~2 sn'de, kaliteli Türkçe yanıt. Bu model
  // yukarıda olmasaydı bütçe tükenip son çare 8B modele kalıyordu (20.8 sn +
  // zayıf cevap). Ölçümle doğrulandı.
  { p: 'gemini', id: 'gemini-3.1-flash-lite', tokens: 4096, ms: 4000 },
  { p: 'groq', id: 'openai/gpt-oss-120b', tokens: 4096, ms: 4000 },

  // ── Katman 4: yoğunluk/kota durumuna göre devreye girenler ──
  { p: 'gemini', id: 'gemini-3.5-flash', tokens: 4096, ms: 3000, think: 'low' },
  { p: 'gemini', id: 'gemini-2.5-flash', tokens: 4096, ms: 4000 },
  { p: 'groq', id: 'qwen/qwen3.6-27b', tokens: 4096, ms: 3500 },
  { p: 'groq', id: 'llama-3.3-70b-versatile', tokens: 4096, ms: 3000 },

  // ── Katman 4: en basit ──
  { p: 'gemini', id: 'gemini-2.5-flash-lite', tokens: 4096, ms: 3000 },
  { p: 'groq', id: 'openai/gpt-oss-20b', tokens: 4096, ms: 3000 },
]

// Son çare: zincirdeki her şey başarısız olursa kalan süreyle bu denenir.
// Ölçümde en hızlısı (~0.7 sn), böylece kullanıcı asla cevapsız kalmaz.
const LAST_RESORT = { p: 'groq', id: 'llama-3.1-8b-instant', tokens: 4096, ms: 4000 }

// Toplam süre bütçesi. Canlı ölçüm: Netlify bu function'da 16.2 sn'lik yanıtı
// sorunsuz kabul etti, yani eski 10 sn varsayımı yanlıştı ve gereksiz 502'lere
// yol açıyordu. 22 sn, gerçek limitin altında kalırken uzun/kaliteli yanıtlara
// yer bırakıyor.
const TOTAL_BUDGET_MS = 16000
// Zincir sonundaki hızlı denemeler için saklanan süre; tek bir yavaş model
// bütçeyi tüketip kullanıcıyı cevapsız bırakamasın.
const TAIL_RESERVE_MS = 3000
// Bir modele bundan az süre kalıyorsa denemeye değmez — atla, sırayı koru.
const MIN_VIABLE_MS = 1500

const SYSTEM_PROMPT = `Sen TarpoVizyon AI adında, tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanısın.

ÖNEMLİ KİMLİK BİLGİLERİ:
- Veteriner Hekim Öner Özbey tarafından geliştirildim
- Kurum: TARPOL (Tarım Politikaları Vakfı)
- Sadece tarım ve hayvancılık konularında yardımcı olabilirsin
- Bu alanlar dışındaki sorulara: "Ben yalnızca tarım ve hayvancılıkla ilgili konularda yardımcı olmak üzere tasarlandım. Lütfen bu alanda bir soru sorun." şeklinde yanıt ver

KİMLİK SORULARI İÇİN ÖZEL YANITLAR:
- Kim olduğun sorulduğunda: "Benim adım TarpoVizyon AI. Tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanıyım."
- Kim yarattığın sorulduğunda: "Veteriner Hekim Öner Özbey tarafından geliştirildim. Kendisi, tarım ve hayvancılık sektöründe birçok yenilikçi projeye imza atmış ve sektörü modernize eden yaklaşımlarıyla tanınmaktadır."

TARIM UZMANLIKLARIN:
- Bitki yetiştiriciliği (tahıllar, sebzeler, meyveler, endüstri bitkileri)
- Hasat teknikleri ve zamanlaması
- Sulama sistemleri ve su yönetimi
- Gübreleme (organik, kimyasal, biyolojik)
- Tarım makineleri ve modern teknolojiler
- Sera yönetimi ve kontrollü ortam tarımı
- Organik tarım ve permakültür uygulamaları
- Bitki hastalıkları ve zararlıları (teşhis ve tedavi)
- Toprak analizi ve toprak sağlığı
- İklim koşulları ve meteorolojik faktörler
- Tohum seçimi ve ıslah çalışmaları
- Tarım ekonomisi ve pazarlama

HAYVANCILIK UZMANLIKLARIN:
- Büyükbaş hayvancılık (sığır, manda yetiştiriciliği)
- Küçükbaş hayvancılık (koyun, keçi yetiştiriciliği)
- Kanatlı hayvan yetiştiriciliği (tavuk, hindi, ördek, kaz)
- Arıcılık ve bal üretimi
- Su ürünleri yetiştiriciliği (balık çiftlikleri)
- Hayvan beslenmesi ve yem formülasyonu
- Hayvan sağlığı ve veteriner hekimlik uygulamaları
- Hayvan ıslahı ve genetik gelişim
- Süt üretimi ve süt teknolojisi
- Et üretimi ve kasaplık teknolojisi
- Hayvan refahı ve barınma koşulları
- Hayvan hastalıkları ve aşılama programları
- Hayvancılık ekonomisi ve karlılık analizi

YANITLAMA KURALLARI:
- Türkçe, bilimsel ama anlaşılır yanıtlar ver
- Çiftçilere ve hayvancılara pratik çözümler sun
- Türkiye'nin iklim ve coğrafi özelliklerini dikkate al
- Detaylı ama özlü yanıtlar ver, 2000 karakteri geçme
- Markdown formatını kullanabilirsin (kalın, başlık, madde listesi, tablo)
- Fiyat/istatistik sorularında "En güncel veriler için TarpoVizyon platformunu ziyaret edin" ekle`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// Bazı akıl yürüten modeller (ör. qwen3.6) cevaba <think>...</think> bloğu
// sızdırıyor — kullanıcıya ham düşünce metni gitmesin diye temizliyoruz.
function clean(text) {
  if (!text) return ''
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
}

// Verilen süre dolunca isteği iptal eden fetch (yavaş model tüm bütçeyi yemesin)
async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// Gemini çağrısı — ?key= ile (Bearer DEĞİL; Bearer 401 verir)
async function callGemini(m, message, apiKey, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m.id}:generateContent?key=${apiKey}`
  const generationConfig = { temperature: 0.7, maxOutputTokens: m.tokens }
  // Sadece Gemini 3.x thinkingLevel kabul eder; 2.5'e gönderirsek 400 döner.
  if (m.think) generationConfig.thinkingConfig = { thinkingLevel: m.think }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig,
    }),
  }, timeoutMs)

  const data = await res.json().catch(() => null)
  // Gemini yanıtı birden fazla part'a bölebilir — hepsini birleştir.
  const text = clean(
    (data?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('')
  )
  return { ok: res.ok && Boolean(text), text: text || null, status: res.status }
}

// Groq çağrısı — OpenAI uyumlu, Bearer token
async function callGroq(m, message, apiKey, timeoutMs) {
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m.id,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: m.tokens,
    }),
  }, timeoutMs)

  const data = await res.json().catch(() => null)
  const text = clean(data?.choices?.[0]?.message?.content)
  return { ok: res.ok && Boolean(text), text: text || null, status: res.status }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const message = String(body?.message ?? '').trim()
  if (!message) return json({ error: 'message required' }, 400)

  const keys = {
    gemini: process.env.TARPOL_AI_KEY,
    groq: process.env.TARPOL_GROQ_KEY,
  }

  const started = Date.now()
  let answer = null
  let usedModel = null

  // Tek zincir: en zekiden en basite. Kota/yoğunluk/timeout olursa sıradakine
  // düşer. Süre bütçesi bitmeden mutlaka bir yanıt üretmeye çalışır.
  const attempt = async (m, timeoutMs) => {
    const apiKey = keys[m.p]
    if (!apiKey || timeoutMs < MIN_VIABLE_MS) return false
    try {
      const r = m.p === 'gemini'
        ? await callGemini(m, message, apiKey, timeoutMs)
        : await callGroq(m, message, apiKey, timeoutMs)
      if (r.ok) {
        answer = r.text
        usedModel = m.id
        return true
      }
      // 429 kota / 503 yoğunluk / boş yanıt → sıradaki model
    } catch {
      // timeout (abort) veya ağ hatası → sıradaki model
    }
    return false
  }

  for (const m of MODELS) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started)
    // Son çare denemesi için süre sakla.
    const usable = Math.min(m.ms, remaining - TAIL_RESERVE_MS)
    // Süre yetmiyorsa bu modeli ATLA (kısa timeout'la boşa harcama) — sıradaki
    // daha hızlı model deneme şansını korusun.
    if (usable < MIN_VIABLE_MS) continue
    if (await attempt(m, usable)) break
  }

  // Hiçbiri tutmadıysa: kalan tüm süreyle en hızlı modeli dene.
  if (!answer) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started)
    await attempt(LAST_RESORT, Math.min(LAST_RESORT.ms, remaining))
  }

  if (!answer) {
    return json({ error: 'Tarpol AI geçici olarak yanıt veremiyor. Lütfen tekrar deneyin.' }, 502)
  }

  // `model` alanı eski sözleşmeyle uyumlu kalsın diye "Tarpol AI"; hangi modelin
  // yanıtladığı teşhis için ayrı alanda (frontend'i bozmaz).
  return json({ success: true, reply: answer, model: 'Tarpol AI', engine: usedModel })
}
