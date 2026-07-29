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

// Gemini modelleri — en zekiden başla, limit/hata olursa sıradakine geç
const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', tokens: 8192 },
  { id: 'gemini-2.5-flash-lite', tokens: 8192 },
]

// Groq modelleri — Gemini tamamen başarısız/limitli olursa fallback
const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', tokens: 8192 },
  { id: 'llama-3.1-8b-instant', tokens: 4096 },
]

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

// Gemini çağrısı — ?key= ile (Bearer değil)
async function callGemini(modelId, maxTokens, message, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
    }),
  })
  const data = await res.json().catch(() => null)
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return { ok: res.ok && Boolean(text), text: text || null, status: res.status }
}

// Groq çağrısı — OpenAI uyumlu, Bearer token
async function callGroq(modelId, maxTokens, message, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json().catch(() => null)
  const text = data?.choices?.[0]?.message?.content
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

  const geminiKey = process.env.TARPOL_AI_KEY
  const groqKey = process.env.TARPOL_GROQ_KEY

  let answer = null

  // AŞAMA 1: Gemini modelleri (öncelik)
  if (geminiKey) {
    for (const m of GEMINI_MODELS) {
      try {
        const r = await callGemini(m.id, m.tokens, message, geminiKey)
        if (r.ok) {
          answer = r.text
          break
        }
        // 429/403/5xx veya boş yanıt → sıradaki modeli/dener, sonunda Groq'a düşer
      } catch {
        // ağ hatası → sıradaki
      }
    }
  }

  // AŞAMA 2: Groq fallback (Gemini limit/başarısız)
  if (!answer && groqKey) {
    for (const m of GROQ_MODELS) {
      try {
        const r = await callGroq(m.id, m.tokens, message, groqKey)
        if (r.ok) {
          answer = r.text
          break
        }
      } catch {
        // ağ hatası → sıradaki
      }
    }
  }

  if (!answer) {
    return json({ error: 'Tarpol AI geçici olarak yanıt veremiyor. Lütfen tekrar deneyin.' }, 502)
  }

  return json({ success: true, reply: answer, model: 'Tarpol AI' })
}

export const config = { path: '/api/ai-chat' }
