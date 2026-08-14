/**
 * TarpoVizyon AI — Worker ucu (`POST /api/ai`).
 *
 * ─── NEDEN BURADA ───────────────────────────────────────────────────────────
 * Önceden mobil uygulama doğrudan `dersbende.com/api.php?...&api_key=...`
 * adresine gidiyordu ve ANAHTAR İSTEMCİ KODUNDAYDI — uygulama paketini açan
 * herkes okuyabiliyordu. Netlify'daki karşılığı (netlify/functions/ai-chat.mjs)
 * anahtarı gizliyordu ama native uygulamanın Netlify kökeni yok:
 * `capacitor://` üzerinden `/api.php` yönlendirmesi hiç çalışmıyor.
 *
 * Uygulama zaten tüm verisini bu Worker'dan çekiyor. AI de buraya taşındı:
 * tek köken, anahtarlar `wrangler secret` içinde, istemcide sıfır sır.
 *
 * Sağlayıcı anahtarları (secret olarak tanımlanmalı):
 *   TARPOL_AI_KEY   → Google Gemini
 *   TARPOL_GROQ_KEY → Groq
 *
 * Yanıt sözleşmesi: { success, reply, model, engine } | { error }
 */

/**
 * MODEL ZİNCİRİ — zekiden basite sıralı, tek liste (Gemini + Groq karışık).
 * Sıra 2026-07-29'da gerçek ölçümle belirlendi:
 *
 *   gemini-3.1-pro / 3-pro / 2.5-pro → 429 kota (~0.3 sn'de düşer, bedava deneme)
 *   gpt-oss-120b (Groq, 120B)        → 2.4 sn, hızlı ama halüsinasyona açık
 *   gemini-3.6-flash                 → 12–44 sn veya 503 (bütçeyi yer)
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

  // ── Katman 3: GÜVENİLİR YAKALAYICI. 3.6-flash yavaşlarsa zincir buraya
  // düşer: ~2 sn'de kaliteli Türkçe yanıt. Bu model yukarıda olmasaydı bütçe
  // tükenip son çare 8B modele kalıyordu (20.8 sn + zayıf cevap).
  { p: 'gemini', id: 'gemini-3.1-flash-lite', tokens: 4096, ms: 4000 },
  { p: 'groq', id: 'openai/gpt-oss-120b', tokens: 4096, ms: 4000 },

  // ── Katman 4: yoğunluk/kota durumuna göre devreye girenler ──
  { p: 'gemini', id: 'gemini-3.5-flash', tokens: 4096, ms: 3000, think: 'low' },
  { p: 'gemini', id: 'gemini-2.5-flash', tokens: 4096, ms: 4000 },
  { p: 'groq', id: 'qwen/qwen3.6-27b', tokens: 4096, ms: 3500 },
  { p: 'groq', id: 'llama-3.3-70b-versatile', tokens: 4096, ms: 3000 },

  // ── Katman 5: en basit ──
  { p: 'gemini', id: 'gemini-2.5-flash-lite', tokens: 4096, ms: 3000 },
  { p: 'groq', id: 'openai/gpt-oss-20b', tokens: 4096, ms: 3000 },
];

// Son çare: zincirdeki her şey başarısız olursa kalan süreyle bu denenir.
// Ölçümde en hızlısı (~0.7 sn), böylece kullanıcı asla cevapsız kalmaz.
const LAST_RESORT = { p: 'groq', id: 'llama-3.1-8b-instant', tokens: 4096, ms: 4000 };

/*
 * Süre bütçesi. Netlify'da bu değer function'ın kesilme sınırına göre
 * seçilmişti; Worker'da böyle bir duvar yok (fetch beklemesi CPU süresi
 * saymıyor). Sınır artık teknik değil İNSANİ: mobilde 16 saniyeden fazla
 * boş ekrana bakan kullanıcı uygulamayı kapatıyor.
 */
const TOTAL_BUDGET_MS = 16000;
// Zincir sonundaki hızlı denemeler için saklanan süre; tek bir yavaş model
// bütçeyi tüketip kullanıcıyı cevapsız bırakamasın.
const TAIL_RESERVE_MS = 3000;
// Bir modele bundan az süre kalıyorsa denemeye değmez — atla, sırayı koru.
const MIN_VIABLE_MS = 1500;

/*
 * Soru uzunluğu tavanı. Sağlayıcıya giden token'ı ve dolayısıyla maliyeti
 * sınırlar; 2.000 karakter, en uzun gerçek tarım sorusunun kat kat üstünde.
 */
const MAX_SORU = 2000;

/*
 * ─── KİMLİK BÖLÜMÜ NEDEN BÖYLE YAZILDI ──────────────────────────────────────
 * Önce en üstte "ÖNEMLİ KİMLİK BİLGİLERİ" başlığıyla, kapsam kuralıyla iç içe
 * duruyordu. Sonuç: model bu bilgiyi HER yanıta karıştırıyordu — buzağı
 * ishaliyle ilgili teknik bir soru "Veteriner Hekim Öner Özbey'in prensipleri
 * doğrultusunda…" diye başlıyordu (canlıda gözlendi).
 *
 * İki değişiklik yapıldı:
 *   1. KAPSAM kuralı (her yanıtta geçerli) kimlikten AYRILDI. Eskiden aynı
 *      listedeydiler; kimliği kısıtlamak kapsamı da zayıflatabilirdi.
 *   2. Kimlik bilgisi koşullu hâle getirildi ve açık bir YASAK eklendi.
 *      Bilgi prompt'ta kalıyor (kimlik sorusu her zaman doğru yanıtlansın
 *      diye) ama kullanımı yalnızca o soruya bağlandı.
 */
const SYSTEM_PROMPT = `Sen TarpoVizyon AI adında, tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanısın.

KAPSAM (her yanıtta geçerli):
- Sadece tarım ve hayvancılık konularında yardımcı olabilirsin
- Bu alanlar dışındaki sorulara: "Ben yalnızca tarım ve hayvancılıkla ilgili konularda yardımcı olmak üzere tasarlandım. Lütfen bu alanda bir soru sorun." şeklinde yanıt ver

KİMLİK — YALNIZCA KİMLİK SORULDUĞUNDA KULLANILIR:
Aşağıdaki bilgileri SADECE kullanıcı senin kim olduğunu, adını, seni kimin
geliştirdiğini ya da hangi kuruma ait olduğunu sorarsa kullan.
- Kim olduğun sorulduğunda: "Benim adım TarpoVizyon AI. Tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanıyım."
- Kim yarattığın sorulduğunda: "Veteriner Hekim Öner Özbey tarafından geliştirildim. Kendisi, tarım ve hayvancılık sektöründe birçok yenilikçi projeye imza atmış ve sektörü modernize eden yaklaşımlarıyla tanınmaktadır."
- Kurum sorulduğunda: TARPOL (Tarım Politikaları Vakfı)

YASAK: Kimlik sorulmadığı hiçbir yanıtta geliştiricinin ya da kurumun adını
ANMA. Teknik bir soruyu "Veteriner Hekim Öner Özbey'in prensipleri
doğrultusunda", "TARPOL yaklaşımına göre" gibi ifadelerle AÇMA ve bu
ifadeleri yanıtın içine SERPİŞTİRME. Kendini tanıtarak başlama; doğrudan
sorunun cevabına gir.

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
- Fiyat/istatistik sorularında "En güncel veriler için TarpoVizyon platformunu ziyaret edin" ekle`;

/*
 * CORS: okuma uçlarıyla aynı, `*`.
 *
 * Native uygulamanın kökeni sabit değil (iOS'ta özel şema, Android'de
 * `https://localhost`), allow-list tutmak uygulamayı sessizce kırma riski
 * taşıyor. Zaten CORS bir kötüye kullanım engeli DEĞİL — tarayıcı dışından
 * (curl, betik) hiç bakılmıyor. Gerçek koruma alttaki hız sınırı ve
 * `MAX_SORU`; kalıcı çözüm için KV/Durable Object tabanlı sayaç gerekir.
 */
const AI_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...AI_CORS },
  });
}

/**
 * Hız sınırı — dakikada 12 istek (wrangler.toml'daki `AI_LIMIT` bindingi).
 *
 * ─── NEDEN BURADA SAYAÇ YOK ─────────────────────────────────────────────────
 * Önce sayaç bu dosyada, module-scope bir Map'te tutuluyordu. Yerelde 13.
 * istekte 429 veriyordu ama CANLIDA hiç tetiklenmedi: 16 ardışık istek
 * ölçüldü, tamamı geçti. Cloudflare istekleri farklı isolate'lara dağıtıyor ve
 * her isolate'ın kendi boş Map'i var — koruma sadece kâğıt üstündeydi.
 * Çalışma zamanının kendi sayacı bu sorunu çözüyor.
 *
 * Anahtar olarak IP kullanılıyor. Cloudflare belgeleri IP yerine kullanıcı
 * kimliği öneriyor (çok kullanıcı tek IP paylaşabilir) ama bu uç kimlik
 * doğrulamasız ve halka açık; elimizdeki tek ayırt edici bilgi IP.
 */
async function hizSiniriAsildi(request, env) {
  // Binding tanımlı değilse (eski dağıtım, yerel deneme) istek engellenmiyor:
  // eksik bir koruma yüzünden çalışan bir özelliği kapatmak daha kötü olurdu.
  if (!env.AI_LIMIT) return false;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'bilinmeyen';
  const { success } = await env.AI_LIMIT.limit({ key: `ai:${ip}` });
  return !success;
}

// Bazı akıl yürüten modeller (ör. qwen3.6) cevaba <think>...</think> bloğu
// sızdırıyor — kullanıcıya ham düşünce metni gitmesin diye temizliyoruz.
function clean(text) {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim();
}

// Verilen süre dolunca isteği iptal eden fetch (yavaş model tüm bütçeyi yemesin)
async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Gemini çağrısı — ?key= ile (Bearer DEĞİL; Bearer 401 verir)
async function callGemini(m, message, apiKey, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m.id}:generateContent?key=${apiKey}`;
  const generationConfig = { temperature: 0.7, maxOutputTokens: m.tokens };
  // Sadece Gemini 3.x thinkingLevel kabul eder; 2.5'e gönderirsek 400 döner.
  if (m.think) generationConfig.thinkingConfig = { thinkingLevel: m.think };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig,
    }),
  }, timeoutMs);

  const data = await res.json().catch(() => null);
  // Gemini yanıtı birden fazla part'a bölebilir — hepsini birleştir.
  const text = clean(
    (data?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('')
  );
  return { ok: res.ok && Boolean(text), text: text || null, status: res.status };
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
  }, timeoutMs);

  const data = await res.json().catch(() => null);
  const text = clean(data?.choices?.[0]?.message?.content);
  return { ok: res.ok && Boolean(text), text: text || null, status: res.status };
}

export async function handleAi(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: AI_CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  if (await hizSiniriAsildi(request, env)) {
    return json({ error: 'Çok fazla istek gönderildi. Bir dakika sonra tekrar deneyin.' }, 429);
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const message = String(body?.message ?? '').trim().slice(0, MAX_SORU);
  if (!message) return json({ error: 'message required' }, 400);

  const keys = {
    gemini: env.TARPOL_AI_KEY,
    groq: env.TARPOL_GROQ_KEY,
  };
  /*
   * Anahtar hiç tanımlı değilse bu bir YAPILANDIRMA hatası, geçici bir
   * aksaklık değil. Ayrı mesaj veriliyor: yoksa `wrangler secret put`
   * unutulduğunda "tekrar deneyin" diyip sonsuza kadar başarısız olurduk.
   */
  if (!keys.gemini && !keys.groq) {
    return json({ error: 'AI yapılandırılmamış: sağlayıcı anahtarı tanımlı değil.' }, 503);
  }

  const started = Date.now();
  let answer = null;
  let usedModel = null;

  // Tek zincir: en zekiden en basite. Kota/yoğunluk/timeout olursa sıradakine
  // düşer. Süre bütçesi bitmeden mutlaka bir yanıt üretmeye çalışır.
  const attempt = async (m, timeoutMs) => {
    const apiKey = keys[m.p];
    if (!apiKey || timeoutMs < MIN_VIABLE_MS) return false;
    try {
      const r = m.p === 'gemini'
        ? await callGemini(m, message, apiKey, timeoutMs)
        : await callGroq(m, message, apiKey, timeoutMs);
      if (r.ok) {
        answer = r.text;
        usedModel = m.id;
        return true;
      }
      // 429 kota / 503 yoğunluk / boş yanıt → sıradaki model
    } catch {
      // timeout (abort) veya ağ hatası → sıradaki model
    }
    return false;
  };

  for (const m of MODELS) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    // Son çare denemesi için süre sakla.
    const usable = Math.min(m.ms, remaining - TAIL_RESERVE_MS);
    // Süre yetmiyorsa bu modeli ATLA (kısa timeout'la boşa harcama) — sıradaki
    // daha hızlı model deneme şansını korusun.
    if (usable < MIN_VIABLE_MS) continue;
    if (await attempt(m, usable)) break;
  }

  // Hiçbiri tutmadıysa: kalan tüm süreyle en hızlı modeli dene.
  if (!answer) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    await attempt(LAST_RESORT, Math.min(LAST_RESORT.ms, remaining));
  }

  if (!answer) {
    return json({ error: 'TarpoVizyon AI şu an yanıt veremiyor. Lütfen tekrar deneyin.' }, 502);
  }

  // `model` alanı eski sözleşmeyle uyumlu; hangi modelin yanıtladığı teşhis
  // için ayrı alanda.
  return json({ success: true, reply: answer, model: 'TarpoVizyon AI', engine: usedModel });
}
