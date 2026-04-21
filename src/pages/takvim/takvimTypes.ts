import { applyBolgeOffset, BOLGE_META } from '../../utils/climate-data';
import type { IklimBolge } from '../../utils/climate-data';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  urun: string;
  urun_emoji: string;
  tip: 'ekim' | 'sulama' | 'gubre' | 'ilac' | 'hasat';
  baslik: string;
  ay: number;
  hafta: number;
  notlar: string;
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
}

export interface CropProfile {
  ad: string;
  emoji: string;
  kategori: 'kislik' | 'yazlik' | 'cok_yillik';
  ekim: Array<{ baseAy: number; baseHafta: number }>;
  sulama_baslangic: number;
  sulama_bitis: number;
  sulama_sikligi_gun: number;
  gubre: Array<{ baseAy: number; baseHafta: number; tip: string }>;
  ilac: Array<{ baseAy: number; baseHafta: number; hedef: string }>;
  hasat: Array<{ baseAy: number; baseHafta: number }>;
  notlar_base: string;
  sicaklik_esik: string;
  don_riski: string;
}

// ─── Crop Profiles Database ────────────────────────────────────────────────────

export const CROP_PROFILES: Record<string, CropProfile> = {
  bugday: {
    ad: 'Buğday', emoji: '🌾', kategori: 'kislik',
    ekim: [{ baseAy: 10, baseHafta: 2 }, { baseAy: 11, baseHafta: 1 }],
    sulama_baslangic: 3, sulama_bitis: 6, sulama_sikligi_gun: 12,
    gubre: [
      { baseAy: 10, baseHafta: 3, tip: 'Taban gübre (DAP 18-46-0)' },
      { baseAy: 3, baseHafta: 2, tip: 'Üst gübre (Üre %46 N)' },
      { baseAy: 5, baseHafta: 1, tip: 'Başak gübresi (Amonyum Nitrat)' },
    ],
    ilac: [
      { baseAy: 3, baseHafta: 3, hedef: 'Yabancı ot ilacı (herbisit)' },
      { baseAy: 5, baseHafta: 2, hedef: 'Pas ve külleme (fungisit)' },
      { baseAy: 5, baseHafta: 4, hedef: 'Süne mücadelesi (insektisit)' },
    ],
    hasat: [{ baseAy: 6, baseHafta: 3 }, { baseAy: 7, baseHafta: 1 }],
    notlar_base: 'Kışlık buğday: Ekim-Kasım ekimi, Haziran hasadı.',
    sicaklik_esik: 'Toprak sıcaklığı >5°C olmalı (ekim için).',
    don_riski: 'Kardeşlenme dönemi dona hassas.',
  },
  arpa: {
    ad: 'Arpa', emoji: '🌾', kategori: 'kislik',
    ekim: [{ baseAy: 10, baseHafta: 1 }, { baseAy: 10, baseHafta: 3 }],
    sulama_baslangic: 3, sulama_bitis: 5, sulama_sikligi_gun: 14,
    gubre: [
      { baseAy: 10, baseHafta: 2, tip: 'Taban gübre (DAP)' },
      { baseAy: 3, baseHafta: 1, tip: 'Üst gübre (Üre)' },
    ],
    ilac: [
      { baseAy: 3, baseHafta: 2, hedef: 'Yabancı ot (herbisit)' },
      { baseAy: 4, baseHafta: 3, hedef: 'Yaprak hastalıkları (fungisit)' },
    ],
    hasat: [{ baseAy: 6, baseHafta: 1 }],
    notlar_base: 'Buğdaydan 2 hafta önce hasat.',
    sicaklik_esik: 'Toprak sıcaklığı >4°C.',
    don_riski: 'Sapa kalkma döneminde geç donlar zararlı.',
  },
  misir: {
    ad: 'Mısır', emoji: '🌽', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 3 }, { baseAy: 5, baseHafta: 1 }],
    sulama_baslangic: 5, sulama_bitis: 9, sulama_sikligi_gun: 7,
    gubre: [
      { baseAy: 4, baseHafta: 3, tip: 'Taban gübre (NPK 15-15-15)' },
      { baseAy: 6, baseHafta: 2, tip: 'Üst gübre 1 (Üre)' },
      { baseAy: 7, baseHafta: 2, tip: 'Üst gübre 2 (Üre)' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 2, hedef: 'Yabancı ot (herbisit)' },
      { baseAy: 6, baseHafta: 3, hedef: 'Koçan kurdu (insektisit)' },
      { baseAy: 7, baseHafta: 3, hedef: 'Yaprak yanıklığı (fungisit)' },
    ],
    hasat: [{ baseAy: 9, baseHafta: 3 }, { baseAy: 10, baseHafta: 1 }],
    notlar_base: 'Yazlık ürün. Su ihtiyacı çok yüksek.',
    sicaklik_esik: 'Toprak sıcaklığı >12°C, hava >15°C.',
    don_riski: 'Dona hiç dayanamaz. Erken ekim riskli.',
  },
  domates: {
    ad: 'Domates', emoji: '🍅', kategori: 'yazlik',
    ekim: [{ baseAy: 3, baseHafta: 3 }, { baseAy: 4, baseHafta: 2 }],
    sulama_baslangic: 4, sulama_bitis: 9, sulama_sikligi_gun: 5,
    gubre: [
      { baseAy: 4, baseHafta: 2, tip: 'Dikim gübresi (NPK)' },
      { baseAy: 5, baseHafta: 2, tip: 'Azotlu gübre' },
      { baseAy: 6, baseHafta: 2, tip: 'Kalsiyum + Potasyum' },
      { baseAy: 7, baseHafta: 2, tip: 'Potasyum ağırlıklı' },
    ],
    ilac: [
      { baseAy: 4, baseHafta: 4, hedef: 'Mildiyö önleme (fungisit)' },
      { baseAy: 6, baseHafta: 1, hedef: 'Domates güvesi (insektisit)' },
      { baseAy: 7, baseHafta: 1, hedef: 'Yaprak küfü (fungisit)' },
    ],
    hasat: [{ baseAy: 6, baseHafta: 4 }, { baseAy: 7, baseHafta: 3 }, { baseAy: 8, baseHafta: 2 }, { baseAy: 9, baseHafta: 1 }],
    notlar_base: 'Fide dikimi. Düzenli sulama, çatlama riskine dikkat.',
    sicaklik_esik: 'Gece >10°C, gündüz 20-30°C ideal.',
    don_riski: 'Don kesinlikle öldürücü. Fide döneminde dikkat.',
  },
  biber: {
    ad: 'Biber', emoji: '🫑', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 1 }, { baseAy: 4, baseHafta: 3 }],
    sulama_baslangic: 4, sulama_bitis: 9, sulama_sikligi_gun: 6,
    gubre: [
      { baseAy: 4, baseHafta: 2, tip: 'Dikim gübresi' },
      { baseAy: 5, baseHafta: 3, tip: 'Azotlu gübre' },
      { baseAy: 6, baseHafta: 3, tip: 'NPK dengeli' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 1, hedef: 'Yaprak biti (insektisit)' },
      { baseAy: 6, baseHafta: 4, hedef: 'Külleme (fungisit)' },
    ],
    hasat: [{ baseAy: 7, baseHafta: 2 }, { baseAy: 8, baseHafta: 2 }, { baseAy: 9, baseHafta: 1 }],
    notlar_base: 'Sıcak seven ürün. Kök çürüklüğüne dikkat.',
    sicaklik_esik: 'Gece >12°C, gündüz >20°C.',
    don_riski: 'Dona dayanamaz.',
  },
  patates: {
    ad: 'Patates', emoji: '🥔', kategori: 'yazlik',
    ekim: [{ baseAy: 3, baseHafta: 2 }, { baseAy: 4, baseHafta: 1 }],
    sulama_baslangic: 4, sulama_bitis: 7, sulama_sikligi_gun: 6,
    gubre: [
      { baseAy: 3, baseHafta: 2, tip: 'Taban gübre (NPK potasyum ağırlıklı)' },
      { baseAy: 5, baseHafta: 2, tip: 'Üst gübre (Amonyum Sülfat)' },
    ],
    ilac: [
      { baseAy: 4, baseHafta: 3, hedef: 'Patates böceği (insektisit)' },
      { baseAy: 5, baseHafta: 4, hedef: 'Mildiyö (fungisit)' },
      { baseAy: 6, baseHafta: 2, hedef: 'Yaprak yanıklığı (fungisit)' },
    ],
    hasat: [{ baseAy: 7, baseHafta: 2 }, { baseAy: 8, baseHafta: 1 }],
    notlar_base: 'Yumru oluşumu için düzenli nem kritik.',
    sicaklik_esik: 'Toprak >8°C. İdeal yumru oluşumu 15-20°C.',
    don_riski: 'Sürgünler dona hassas, malçlama önerilir.',
  },
  sogan: {
    ad: 'Soğan', emoji: '🧅', kategori: 'yazlik',
    ekim: [{ baseAy: 2, baseHafta: 3 }, { baseAy: 3, baseHafta: 2 }],
    sulama_baslangic: 3, sulama_bitis: 6, sulama_sikligi_gun: 8,
    gubre: [
      { baseAy: 3, baseHafta: 2, tip: 'Taban gübre (DAP)' },
      { baseAy: 4, baseHafta: 3, tip: 'Azotlu üst gübre' },
    ],
    ilac: [
      { baseAy: 4, baseHafta: 1, hedef: 'Soğan sineği (insektisit)' },
      { baseAy: 5, baseHafta: 2, hedef: 'Mildiyö (fungisit)' },
    ],
    hasat: [{ baseAy: 6, baseHafta: 3 }, { baseAy: 7, baseHafta: 1 }],
    notlar_base: 'Baş bağlama döneminde azotu kes.',
    sicaklik_esik: 'Toprak >5°C. Baş oluşumu gün uzunluğuna bağlı.',
    don_riski: 'Hafif dona dayanır ama fide döneminde hassas.',
  },
  pamuk: {
    ad: 'Pamuk', emoji: '🌱', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 3 }, { baseAy: 5, baseHafta: 1 }],
    sulama_baslangic: 5, sulama_bitis: 9, sulama_sikligi_gun: 10,
    gubre: [
      { baseAy: 4, baseHafta: 3, tip: 'Taban gübre (NPK)' },
      { baseAy: 6, baseHafta: 2, tip: 'Azot (Üre)' },
      { baseAy: 7, baseHafta: 2, tip: 'Potasyum ağırlıklı' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 3, hedef: 'Yabancı ot (herbisit)' },
      { baseAy: 6, baseHafta: 4, hedef: 'Yaprak biti + beyaz sinek' },
      { baseAy: 7, baseHafta: 4, hedef: 'Pembe kurt (insektisit)' },
    ],
    hasat: [{ baseAy: 9, baseHafta: 3 }, { baseAy: 10, baseHafta: 2 }],
    notlar_base: 'Çiçeklenme kritik dönem. Yaprak dökücü uygulaması.',
    sicaklik_esik: 'Toprak >15°C. Gece >18°C ideal.',
    don_riski: 'Don kesinlikle öldürücü.',
  },
  aycicegi: {
    ad: 'Ayçiçeği', emoji: '🌻', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 2 }, { baseAy: 5, baseHafta: 1 }],
    sulama_baslangic: 5, sulama_bitis: 8, sulama_sikligi_gun: 12,
    gubre: [
      { baseAy: 4, baseHafta: 2, tip: 'Taban gübre (DAP)' },
      { baseAy: 6, baseHafta: 1, tip: 'Üst gübre (Amonyum Nitrat)' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 3, hedef: 'Yabancı ot (herbisit)' },
      { baseAy: 7, baseHafta: 1, hedef: 'Pas hastalığı (fungisit)' },
    ],
    hasat: [{ baseAy: 8, baseHafta: 3 }, { baseAy: 9, baseHafta: 1 }],
    notlar_base: 'Tabla oluşumu ve döllenme döneminde sulama kritik.',
    sicaklik_esik: 'Toprak >8°C. Kuraklığa kısmen dayanıklı.',
    don_riski: 'Erken fide dönemi dona hassas.',
  },
  karpuz: {
    ad: 'Karpuz', emoji: '🍉', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 3 }, { baseAy: 5, baseHafta: 2 }],
    sulama_baslangic: 5, sulama_bitis: 8, sulama_sikligi_gun: 7,
    gubre: [
      { baseAy: 5, baseHafta: 1, tip: 'Taban gübre (NPK)' },
      { baseAy: 6, baseHafta: 2, tip: 'Azot' },
      { baseAy: 7, baseHafta: 1, tip: 'Potasyum (tatlılık için)' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 4, hedef: 'Külleme (fungisit)' },
      { baseAy: 6, baseHafta: 4, hedef: 'Kırmızı örümcek (akarisit)' },
    ],
    hasat: [{ baseAy: 7, baseHafta: 3 }, { baseAy: 8, baseHafta: 2 }],
    notlar_base: 'Meyve büyümesinde bol su, hasat öncesi suyu kes.',
    sicaklik_esik: 'Toprak >15°C, hava >20°C.',
    don_riski: 'Don kesinlikle öldürücü.',
  },
  kavun: {
    ad: 'Kavun', emoji: '🍈', kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 3 }, { baseAy: 5, baseHafta: 2 }],
    sulama_baslangic: 5, sulama_bitis: 8, sulama_sikligi_gun: 7,
    gubre: [
      { baseAy: 5, baseHafta: 1, tip: 'Taban gübre' },
      { baseAy: 6, baseHafta: 2, tip: 'Potasyum ağırlıklı' },
    ],
    ilac: [
      { baseAy: 5, baseHafta: 4, hedef: 'Külleme (fungisit)' },
      { baseAy: 6, baseHafta: 3, hedef: 'Yaprak biti (insektisit)' },
    ],
    hasat: [{ baseAy: 7, baseHafta: 3 }, { baseAy: 8, baseHafta: 1 }],
    notlar_base: 'Olgunlaşmada suyu azalt → şeker artar.',
    sicaklik_esik: 'Toprak >15°C, hava >20°C.',
    don_riski: 'Don kesinlikle öldürücü.',
  },
  uzum: {
    ad: 'Üzüm', emoji: '🍇', kategori: 'cok_yillik',
    ekim: [],
    sulama_baslangic: 4, sulama_bitis: 9, sulama_sikligi_gun: 14,
    gubre: [
      { baseAy: 3, baseHafta: 1, tip: 'İlkbahar gübresi (NPK)' },
      { baseAy: 5, baseHafta: 2, tip: 'Çiçeklenme gübresi (Bor+Çinko)' },
      { baseAy: 7, baseHafta: 1, tip: 'Tane dolum (Potasyum Sülfat)' },
    ],
    ilac: [
      { baseAy: 3, baseHafta: 4, hedef: 'Kış ilacı (bordo bulamacı)' },
      { baseAy: 5, baseHafta: 1, hedef: 'Külleme/Mildiyö (fungisit)' },
      { baseAy: 6, baseHafta: 3, hedef: 'Salkım güvesi (insektisit)' },
    ],
    hasat: [{ baseAy: 8, baseHafta: 3 }, { baseAy: 9, baseHafta: 2 }],
    notlar_base: 'Budama: Ocak-Şubat. Sürgün bağlama: Nisan.',
    sicaklik_esik: 'Tomurcuk patlaması >10°C.',
    don_riski: 'Sürgün dönemi geç donlara hassas.',
  },
  elma: {
    ad: 'Elma', emoji: '🍎', kategori: 'cok_yillik',
    ekim: [],
    sulama_baslangic: 4, sulama_bitis: 9, sulama_sikligi_gun: 10,
    gubre: [
      { baseAy: 3, baseHafta: 1, tip: 'İlkbahar gübresi (NPK)' },
      { baseAy: 6, baseHafta: 2, tip: 'Meyve büyüme (Kalsiyum Nitrat)' },
    ],
    ilac: [
      { baseAy: 3, baseHafta: 2, hedef: 'Kış ilacı (mineral yağ)' },
      { baseAy: 4, baseHafta: 3, hedef: 'Karaleke/Külleme (fungisit)' },
      { baseAy: 6, baseHafta: 1, hedef: 'Elma içkurdu (insektisit)' },
    ],
    hasat: [{ baseAy: 9, baseHafta: 2 }, { baseAy: 10, baseHafta: 1 }],
    notlar_base: 'Budama: Şubat-Mart. Çiçeklenme: Nisan.',
    sicaklik_esik: 'Çiçeklenme dönemi 15-22°C ideal.',
    don_riski: 'Çiçek dönemi geç donlara çok hassas (-2°C bile yıkıcı).',
  },
  zeytin: {
    ad: 'Zeytin', emoji: '🫒', kategori: 'cok_yillik',
    ekim: [],
    sulama_baslangic: 5, sulama_bitis: 10, sulama_sikligi_gun: 21,
    gubre: [
      { baseAy: 3, baseHafta: 2, tip: 'İlkbahar gübresi (NPK)' },
      { baseAy: 6, baseHafta: 3, tip: 'Yaz gübrelemesi (Potasyum)' },
    ],
    ilac: [
      { baseAy: 3, baseHafta: 3, hedef: 'Zeytin pamuklu biti (insektisit)' },
      { baseAy: 6, baseHafta: 1, hedef: 'Zeytin sineği tuzakları' },
      { baseAy: 9, baseHafta: 1, hedef: 'Zeytin sineği 2. uygulama' },
    ],
    hasat: [{ baseAy: 10, baseHafta: 3 }, { baseAy: 11, baseHafta: 2 }],
    notlar_base: 'Budama: Mart. Çiçeklenme: Mayıs. Kuraklığa dayanıklı.',
    sicaklik_esik: 'Çiçeklenme >18°C. Kış dinlenmesi gerekli.',
    don_riski: '-7°C altında dallar zarar görür.',
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────────

export const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export const TIP_META: Record<Activity['tip'], { renk: string; etiket: string; emoji: string }> = {
  ekim:   { renk: '#22c55e', etiket: 'Ekim',      emoji: '🌱' },
  sulama: { renk: '#3b82f6', etiket: 'Sulama',     emoji: '💧' },
  gubre:  { renk: '#f59e0b', etiket: 'Gübreleme',  emoji: '🧪' },
  ilac:   { renk: '#ef4444', etiket: 'İlaçlama',   emoji: '🧴' },
  hasat:  { renk: '#8b5cf6', etiket: 'Hasat',       emoji: '🌾' },
};

export const BOLGE_UYARILAR: Record<IklimBolge, string> = {
  akdeniz:      'Bu bölgede kışlık ekimler erken yapılabilir. Yaz kavurucu sıcaktır.',
  ege:          'Ilık iklim. Kıyıda don riski düşük, iç kesimlerde dikkat.',
  marmara:      'Geçiş iklimi. Mart ortasına kadar don riski devam eder.',
  ic_anadolu:   'Karasal iklim. Geç don riski Mayıs başına kadar sürebilir! Düşük yağış.',
  karadeniz:    'Bol yağış. Fungisit uygulamaları daha sık tekrarlanmalı.',
  dogu_anadolu: 'Sert kışlar. Yazlık ekimler Haziran başına kaydırılmalı. Don riski yüksek.',
  guneydogu:    'Çok sıcak yazlar. Sulama kritik. Erken ekime uygun.',
};

export const STORAGE_KEY = 'tt_prefs';

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getCurrentWeekOfYear(): { ay: number; hafta: number } {
  const now = new Date();
  const ay = now.getMonth() + 1;
  const gun = now.getDate();
  const hafta = Math.min(4, Math.ceil(gun / 7));
  return { ay, hafta };
}

export function generateActivities(
  selectedCrops: string[],
  bolge: IklimBolge,
): Activity[] {
  const offset = BOLGE_META[bolge].takvimOffset;
  const acts: Activity[] = [];
  let id = 0;

  for (const cropKey of selectedCrops) {
    const crop = CROP_PROFILES[cropKey];
    if (!crop) continue;

    for (const e of crop.ekim) {
      const { ay, hafta } = applyBolgeOffset(e.baseAy, e.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'ekim',
        baslik: crop.kategori === 'cok_yillik' ? `${crop.ad} Bakım Başlangıcı` : `${crop.ad} Ekimi`,
        ay, hafta, notlar: `${crop.sicaklik_esik} ${crop.don_riski}`, oncelik: 'kritik' });
    }

    for (const g of crop.gubre) {
      const { ay, hafta } = applyBolgeOffset(g.baseAy, g.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'gubre',
        baslik: `${crop.ad} Gübreleme`, ay, hafta,
        notlar: `${g.tip}. Toprak analizi sonuçlarına göre doz ayarlayın.`, oncelik: 'yuksek' });
    }

    if (crop.sulama_baslangic > 0) {
      const sulamaEnd = crop.sulama_bitis || crop.sulama_baslangic + 4;
      for (let baseAy = crop.sulama_baslangic; baseAy <= sulamaEnd; baseAy++) {
        const h1 = applyBolgeOffset(baseAy, 1, offset);
        const h2 = applyBolgeOffset(baseAy, 3, offset);
        acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'sulama',
          baslik: `${crop.ad} Sulaması`, ay: h1.ay, hafta: h1.hafta,
          notlar: `Her ${crop.sulama_sikligi_gun} günde bir sulama. Damla sulama önerilir.`, oncelik: 'orta' });
        if (crop.sulama_sikligi_gun <= 10) {
          acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'sulama',
            baslik: `${crop.ad} Sulaması`, ay: h2.ay, hafta: h2.hafta,
            notlar: `Her ${crop.sulama_sikligi_gun} günde bir sulama. Toprak nemini kontrol edin.`, oncelik: 'dusuk' });
        }
      }
    }

    for (const i of crop.ilac) {
      const { ay, hafta } = applyBolgeOffset(i.baseAy, i.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'ilac',
        baslik: `${crop.ad} İlaçlama`, ay, hafta,
        notlar: `${i.hedef}. Rüzgarsız, serin saatlerde uygulayın.`, oncelik: 'orta' });
    }

    for (const h of crop.hasat) {
      const { ay, hafta } = applyBolgeOffset(h.baseAy, h.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, urun_emoji: crop.emoji, tip: 'hasat',
        baslik: `${crop.ad} Hasadı`, ay, hafta,
        notlar: 'Olgunluk kontrol edilmeli. Hava kuruken hasat yapın.', oncelik: 'kritik' });
    }
  }

  return acts.sort((a, b) => a.ay !== b.ay ? a.ay - b.ay : a.hafta - b.hafta);
}
