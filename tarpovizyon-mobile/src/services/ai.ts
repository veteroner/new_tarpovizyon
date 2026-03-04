/**
 * ai.ts — TarpoVizyon AI Servis Katmanı
 *
 * dersbende.com/api.php üzerinden Gemini/Groq tabanlı AI chatbot API'sine bağlanır.
 * Fallback olarak lokal cevaplar sağlar.
 */

const AI_API_URL = 'https://dersbende.com/api.php?action=ai_chat&api_key=REDACTED_DASHBOARD_KEY';
const TIMEOUT = 30000;

export interface AIResponse {
  answer: string;
  source: 'ai' | 'local';
  error?: string;
}

/**
 * AI'ya soru gönderir. Önce dersbende.com API'yi dener,
 * başarısız olursa lokal cevap döner.
 */
export async function askAI(question: string): Promise<AIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.answer) {
        return { answer: data.answer, source: 'ai' };
      }
    }

    return { answer: getLocalResponse(question), source: 'local' };
  } catch {
    // API başarısız — lokal bilgi bankasından cevap ver
    return { answer: getLocalResponse(question), source: 'local' };
  }
}

/**
 * Lokal bilgi bankası - temel tarımsal sorulara cevap verir.
 */
function getLocalResponse(question: string): string {
  const q = question.toLowerCase().trim();

  // Buğday
  if (q.includes('buğday') && (q.includes('ekim') || q.includes('dikim'))) {
    return 'Buğday ekimi genellikle Ekim-Kasım aylarında yapılır.\n\n• Kışlık buğday: Ekim-Kasım\n• Yazlık buğday: Mart-Nisan\n• İdeal toprak sıcaklığı: 8-12°C\n• Ekim derinliği: 3-5 cm\n\nKaynak: TÜİK & TAGEM';
  }

  if (q.includes('buğday') && q.includes('fiyat')) {
    return 'Buğday fiyatları sürekli değişmektedir. Güncel fiyatı Piyasa Fiyatları sayfasından takip edebilirsiniz.\n\n📊 Ana menü → Piyasa → Emtia Fiyatları';
  }

  // Üretim
  if (q.includes('en çok üretilen') || q.includes('en fazla üretilen')) {
    return 'Türkiye\'de en çok üretilen bitkisel ürünler:\n\n1. 🌾 Buğday — ~21.5 milyon ton\n2. 🥬 Şeker pancarı — ~18 milyon ton\n3. 🍅 Domates — ~13 milyon ton\n4. 🌾 Arpa — ~8 milyon ton\n5. 🌽 Mısır — ~7 milyon ton\n\nKaynak: TÜİK 2024 verileri';
  }

  // Organik tarım
  if (q.includes('organik')) {
    return 'Organik tarım, kimyasal gübre ve sentetik pestisit kullanmadan yapılan tarım yöntemidir.\n\n✅ Avantajları:\n• Çevre dostu\n• Sağlıklı ürün\n• Toprak verimliliğini korur\n• Daha yüksek satış fiyatı\n\n⚠️ Dikkat:\n• Verim başlangıçta düşük olabilir\n• Sertifika süreci gerekir\n• İlk 2-3 yıl geçiş dönemidir';
  }

  // Sulama
  if (q.includes('sulama')) {
    return 'Başlıca sulama yöntemleri:\n\n💧 Damla sulama — Su tasarrufu %90-95\n🌧 Yağmurlama — Su tasarrufu %70-85\n🌊 Karık sulama — Su tasarrufu %40-60\n💦 Salma sulama — Su tasarrufu %30-50\n\n✅ Önerilen: Damla sulama sistemi\n• İlk yatırım yüksek ama uzun vadede ekonomik\n• Gübre ile sulama (fertigation) imkanı\n• En az su israfı';
  }

  // Gübre
  if (q.includes('gübre') || q.includes('gubre')) {
    return 'Temel gübre bilgisi:\n\n🟢 Azot (N): Yaprak gelişimi, yeşil renk\n🟡 Fosfor (P): Kök gelişimi, çiçeklenme\n🔴 Potasyum (K): Meyve kalitesi, dayanıklılık\n\n📋 Toprak analizi yaptırarak ihtiyacı belirleyin\n🧮 Gübre hesaplayıcı: Araçlar → Gübre Hesaplama';
  }

  // Hasat
  if (q.includes('hasat') && (q.includes('zaman') || q.includes('ne zaman'))) {
    return 'Başlıca ürünlerin hasat zamanları:\n\n🌾 Buğday: Haziran-Temmuz\n🌾 Arpa: Haziran\n🌽 Mısır: Eylül-Ekim\n🌻 Ayçiçeği: Ağustos-Eylül\n🥜 Fıstık: Eylül\n🫒 Zeytin: Ekim-Aralık\n🍇 Üzüm: Ağustos-Ekim\n\n📅 Detay: Araçlar → Tarım Takvimi';
  }

  // İklim değişikliği
  if (q.includes('iklim') || q.includes('küresel ısınma')) {
    return 'İklim değişikliğinin tarıma etkisi:\n\n⚠️ Olumsuz etkiler:\n• Kuraklık artışı\n• Verim düşüşü\n• Zararlı artışı\n• Su kaynaklarının azalması\n\n✅ Adaptasyon yöntemleri:\n• Kuraklığa dayanıklı çeşitler\n• Su tasarruflu sulama\n• Dijital tarım teknolojileri\n• Erken uyarı sistemleri';
  }

  // Default
  return `Sorunuzu anladım: "${question}"\n\nBu konuda detaylı bilgi vermek için AI motorumuz geliştirilmektedir. Şimdilik şu kaynakları kullanabilirsiniz:\n\n📊 Üretim verileri → Üretim sekmesi\n💰 Fiyat bilgileri → Piyasa sekmesi\n🧮 Hesaplama araçları → Ana Sayfa → Araçlar\n\nYakında tam kapsamlı AI yanıtları sunulacaktır!`;
}
