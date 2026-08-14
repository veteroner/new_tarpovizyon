/**
 * Senkron sonrası push bildirimi (OneSignal REST).
 *
 * ─── NE ZAMAN BİLDİRİM ATILIR ───────────────────────────────────────────────
 * Bir veri setinin DÖNEMİ İLERLEDİĞİNDE — yani gerçekten yeni bir ay/yıl
 * geldiğinde. TÜİK aynı dönemi revize edip yeniden yazdığında değil, ilk kez
 * çalıştığında da değil (o zaman "önceki dönem" yok, referans oluşuyor).
 * Ölçüt: `tuik_sync_log`'daki ÖNCEKİ `son_donem` < bu çalışmanın dönemi.
 *
 * Böylece kullanıcı günde bir "süt fiyatı Şubat 2026'ya güncellendi" alır,
 * her sabah 7 tabloluk gürültü değil.
 *
 * ─── SAYFASI OLMAYAN VERİ SETİ BİLDİRİM ATMAZ ───────────────────────────────
 * Kullanıcı isteği: bildirime dokununca verinin sayfası açılsın. Basic'te
 * karşılığı olmayan veri setleri (T-ÜFE madde endeksleri, madde fiyatları)
 * için gidilecek yer yok; onlara bildirim atmak, boşa dokunma demek olurdu.
 * O yüzden ROTA_ESLEME dışındakiler atlanıyor.
 *
 * ─── SIR YÖNETİMİ ───────────────────────────────────────────────────────────
 * ONESIGNAL_REST_KEY tanımlı değilse modül HİÇBİR ŞEY yapmaz (senkron
 * bildirim yüzünden asla düşmez). Anahtar GitHub secret olarak verilmeli;
 * App ID sır değil, sabit.
 */

const APP_ID = process.env.ONESIGNAL_APP_ID ?? 'f5ef3915-e366-425f-a467-029f350cb296';
const REST_KEY = process.env.ONESIGNAL_REST_KEY ?? '';

/*
 * Hedef segment adı hesaba göre DEĞİŞİYOR: eski panellerde "Subscribed Users",
 * Kasım 2024 sonrası hesaplarda "Total Subscriptions". Yanlış ad 400 döndürür
 * ve bildirim sessizce düşer — hangisinin doğru olduğunu dışarıdan göremediğimiz
 * için ikisi de sırayla deneniyor. `ONESIGNAL_SEGMENT` verilirse yalnızca o
 * kullanılır (tahmin yürütmeden, tek istek).
 */
const SEGMENT_ADAYLARI = process.env.ONESIGNAL_SEGMENT
  ? [process.env.ONESIGNAL_SEGMENT]
  : ['Subscribed Users', 'Total Subscriptions'];

/*
 * Veri seti adı (datasets.mjs'teki `name`) → bildirim metni + gidilecek sayfa.
 *
 * ELLE tutuluyor, otomatik türetilmiyor: bir uç Basic'te birden çok sayfada
 * okunuyor (ör. ekonomik göstergeler 4 yerde), naif türetme yanlış sayfayı
 * açıyordu. Yeni bir izlenen veri seti gelince buraya bir satır eklenir.
 */
const ROTA_ESLEME = {
  'Süt ve süt ürünleri (aylık)': {
    baslik: 'Süt üretim verileri güncellendi',
    yol: '/tarpovizyon-basic/cig-sut/sut-urunleri-uretimi',
  },
  'Kümes hayvancılığı ürünleri (yumurta / beyaz et)': {
    baslik: 'Kanatlı üretim verileri güncellendi',
    yol: '/tarpovizyon-basic/kanatli/pilic-eti-uretim',
  },
  'Tarım ürünleri ÜFE (yıllık değişim)': {
    baslik: 'Tarım ÜFE güncellendi',
    yol: '/tarpovizyon-basic/makro/tarim-ufe',
  },
  'Tarımsal girdi fiyat endeksi (alt gruplar, yıllık değişim)': {
    baslik: 'Tarımsal girdi fiyat endeksi güncellendi',
    yol: '/tarpovizyon-basic/makro/tarimsal-gfe',
  },
  // T-ÜFE madde endeksleri, T-GFE seviyeleri, madde fiyatları: Basic'te
  // sayfası yok — bilinçli olarak eşlenmedi, bildirim atılmıyor.
};

/** Dönem karşılaştırması: "2026-02" > "2026-01", "2025" < "2026". String sıralaması yeterli (ISO benzeri). */
function ilerledi(yeni, onceki) {
  if (!yeni) return false;
  if (!onceki) return false; // ilk kez: referans, bildirim yok
  return String(yeni) > String(onceki);
}

/** OneSignal'a tek bir bildirim gönderir; segment adaylarını sırayla dener. */
async function gonder({ baslik, govde, yol }) {
  let sonHata = null;
  for (const segment of SEGMENT_ADAYLARI) {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Key ${REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: APP_ID,
        target_channel: 'push',
        included_segments: [segment],
        headings: { en: baslik, tr: baslik },
        contents: { en: govde, tr: govde },
        // Bildirime dokununca istemci bu `route`'u okuyup sayfaya gidiyor
        // (bkz. src/mobile/capacitor/push.ts).
        data: { route: yol },
      }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      if (segment !== SEGMENT_ADAYLARI[0]) {
        console.log(`Not: segment "${segment}" çalıştı. ONESIGNAL_SEGMENT olarak sabitlenebilir.`);
      }
      return body;
    }
    sonHata = `HTTP ${res.status}: ${JSON.stringify(body)}`;
  }
  throw new Error(`OneSignal (${SEGMENT_ADAYLARI.join(' / ')}) — ${sonHata}`);
}

/**
 * Senkron sonuçlarına bakıp gereken bildirimleri atar.
 *
 * @param d1        sync.mjs'teki D1 sorgu yardımcısı
 * @param results   [{ dataset, status, latestPeriod, ... }]
 * @param startedAt bu çalışmanın ISO zamanı (önceki dönemi bunun ÖNCESİNDEN okumak için)
 */
export async function bildirGerekiyorsa(d1, results, startedAt) {
  if (!REST_KEY) {
    console.log('Bildirim atlandı: ONESIGNAL_REST_KEY tanımlı değil.');
    return;
  }

  for (const r of results) {
    if (r.status !== 'ok') continue;
    const esleme = ROTA_ESLEME[r.dataset];
    if (!esleme) continue; // sayfası olmayan veri seti

    // Bu çalışmadan ÖNCEKİ en güncel dönem. `calisma_zamani < startedAt` ile
    // az önce yazılan kendi kaydımızı dışarıda tutuyoruz.
    let onceki = null;
    try {
      const satir = await d1(
        `SELECT son_donem FROM tuik_sync_log
         WHERE veri_seti = ? AND durum = 'ok' AND son_donem IS NOT NULL AND calisma_zamani < ?
         ORDER BY calisma_zamani DESC LIMIT 1`,
        [r.dataset, startedAt],
      );
      onceki = satir?.[0]?.son_donem ?? null;
    } catch (e) {
      console.error(`Bildirim: önceki dönem okunamadı (${r.dataset}) — ${e.message}`);
      continue;
    }

    if (!ilerledi(r.latestPeriod, onceki)) continue;

    const govde = `Yeni dönem: ${r.latestPeriod}. Ayrıntılar için dokunun.`;
    try {
      await gonder({ baslik: esleme.baslik, govde, yol: esleme.yol });
      console.log(`🔔 Bildirim gönderildi: ${r.dataset} (${onceki} → ${r.latestPeriod})`);
    } catch (e) {
      // Bildirim hatası senkronu düşürmemeli; yalnızca uyarı.
      console.error(`Bildirim gönderilemedi (${r.dataset}) — ${e.message}`);
    }
  }
}
