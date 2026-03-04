/**
 * TarpoVizyon AI Chat Service
 */

const AI_API_URL = 'https://dersbende.com/api.php?action=ai_chat&api_key=REDACTED_DASHBOARD_KEY';

interface AIResponse {
  answer: string;
  source: 'api' | 'local';
}

// Local fallback knowledge base
const LOCAL_RESPONSES: Record<string, string> = {
  buğday: `🌾 **Buğday Bilgileri**

Türkiye'de buğday en önemli tahıl ürünüdür. Yıllık üretim yaklaşık 19-21 milyon ton civarındadır.

**Ekim Zamanı:** Ekim-Kasım ayları (kışlık), Mart-Nisan (yazlık)
**Hasat:** Haziran-Temmuz
**Başlıca İller:** Konya, Ankara, Diyarbakır, Şanlıurfa
**Sulama:** Kuru tarımda yetişir, sulama verimde %30-50 artış sağlar`,

  üretim: `📊 **Türkiye Tarımsal Üretim**

Türkiye, tarımsal üretimde dünyada ilk 10 ülke arasında yer alır.

**Bitkisel Üretim:** ~120 milyon ton/yıl
**Hayvansal Üretim:** ~25 milyon ton süt, ~1.2 milyon ton kırmızı et
**Tarım Arazisi:** ~23.2 milyon hektar
**İhracat:** ~25 milyar USD`,

  organik: `🌿 **Organik Tarım**

Organik tarım, kimyasal gübre ve pestisit kullanmadan üretim yapma yöntemidir.

**Türkiye'de Durum:**
- 80.000+ organik üretici
- 500.000+ hektar organik arazi
- En çok: Fındık, kayısı, pamuk, üzüm
- AB'ye organik ihracat önemli`,

  sulama: `💧 **Sulama Yöntemleri**

1. **Damla Sulama:** En verimli (%90-95), su tasarrufu yüksek
2. **Yağmurlama:** Orta verimlilik (%70-80)
3. **Salma Sulama:** Geleneksel, su kaybı yüksek (%40-50)
4. **Yeraltı Damla:** Yeni teknoloji, %50 su tasarrufu

**Tavsiye:** Sebze ve meyve için damla sulama tercih edin.`,

  gübre: `🧪 **Gübre Kullanımı**

**Temel Besinler:** Azot (N), Fosfor (P), Potasyum (K)

**Uygulama Zamanları:**
- Taban gübresi: Ekim öncesi
- Üst gübresi: Bitki büyüme döneminde
- Yaprak gübresi: Çiçeklenme döneminde

**Dikkat:** Toprak analizi yaptırmadan gübre kullanmayın!`,

  hasat: `🌾 **Hasat Zamanları**

**Tahıllar:** Haziran-Temmuz (buğday, arpa)
**Sebzeler:** Mevsime göre değişir
**Meyveler:** 
- Kiraz: Mayıs-Haziran
- Kayısı: Haziran-Temmuz  
- Üzüm: Ağustos-Ekim
- Elma: Eylül-Ekim
- Fındık: Ağustos
- Zeytin: Kasım-Aralık`,

  iklim: `🌤️ **İklim ve Tarım**

Türkiye'de 3 ana iklim kuşağı tarımı etkiler:

**Akdeniz:** Narenciye, muz, sebze (kışlık)
**Karasal:** Tahıl, baklagiller, şeker pancarı
**Karadeniz:** Çay, fındık, kivi

**İklim Değişikliği Etkileri:**
- Sulanabilir arazilere talep artıyor
- Yeni ürünler denenebilir (tropikal meyveler)
- Kuraklık riski artıyor`,
};

function findLocalResponse(question: string): string | null {
  const q = question.toLowerCase();

  for (const [keyword, response] of Object.entries(LOCAL_RESPONSES)) {
    if (q.includes(keyword)) {
      return response;
    }
  }

  return null;
}

export async function askAI(question: string): Promise<AIResponse> {
  // Try API first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.answer) {
        return { answer: data.answer, source: 'api' };
      }
    }
  } catch {
    // API failed, fallback to local
  }

  // Local fallback
  const local = findLocalResponse(question);
  if (local) {
    return { answer: local, source: 'local' };
  }

  // Generic response
  return {
    answer: `Tarımsal konularda size yardımcı olmaya çalışıyorum. "${question}" sorunuz hakkında şu an detaylı bilgiye sahip değilim, ancak aşağıdaki konularda sorular sorabilirsiniz:

• Buğday, mısır, arpa gibi tahıl üretimi
• Organik tarım yöntemleri
• Sulama teknikleri
• Gübre kullanımı
• Hasat zamanları
• İklim ve tarım ilişkisi
• Türkiye tarımsal üretim istatistikleri`,
    source: 'local',
  };
}
