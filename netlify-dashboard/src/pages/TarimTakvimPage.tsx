import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ILLER, BOLGE_META, applyBolgeOffset, getBolge } from '../utils/climate-data';
import type { IklimBolge } from '../utils/climate-data';
import { isWeatherConfigured, fetchForecast } from '../services/weather';
import type { ForecastSummary } from '../services/weather';
import ProductTrustPanel from '../components/ProductTrustPanel';
import WeatherWidget from '../components/WeatherWidget';
import './TarimTakvimPage.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   Tarımsal Takvim v2 — Bölge-Bazlı Tarımsal Aktivite Planlayıcı
   - 7 iklim bölgesi × dinamik hafta offset
   - 14 ürün profili (kışlık/yazlık ayrımı)
   - Zenginleştirilmiş notlar (sıcaklık eşikleri, don riski, bölge uyarıları)
   - "Bu Hafta" kartı
   - 3 görünüm + istatistikler
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  urun: string;
  urun_emoji: string;
  tip: 'ekim' | 'sulama' | 'gubre' | 'ilac' | 'hasat';
  baslik: string;
  ay: number;
  hafta: number;
  notlar: string;
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
  /** Canlı hava tahminine dayalı don/yağmur uyarısı */
  weatherWarning?: string;
}

interface CropProfile {
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

// ─── Ürün don eşikleri (°C) — bu sıcaklığın altında don riski var ────────────
const CROP_FROST_ESIGI: Record<string, number> = {
  'Buğday': -8, 'Arpa': -6, 'Mısır': 2, 'Domates': 3, 'Biber': 3,
  'Patates': -1, 'Soğan': -4, 'Pamuk': 5, 'Ayçiçeği': 0, 'Şeker Pancarı': -2,
  'Salatalık': 3, 'Kavun': 5, 'Karpuz': 5, 'Üzüm (Sofralık)': -3,
  'Elma': -3, 'Zeytin': -5, 'Çilek': -2, 'Nohut': -1, 'Mercimek': -2,
};

// ─── Hava tahmininden ekim/ilaçlama uyarıları ekle ────────────────────────────
function applyForecastWarnings(
  activities: Activity[],
  forecast: ForecastSummary | null,
  nowAy: number,
  nowHafta: number,
): Activity[] {
  if (!forecast?.daily?.length) return activities;

  const minTempNext5 = Math.min(...forecast.daily.map(d => d.tempMin));
  const maxRainNext5 = Math.max(...forecast.daily.map(d => d.rainMm));

  return activities.map(act => {
    // Sadece önümüzdeki 2 haftadaki aktivitelere uyarı ekle
    const weekDiff = (act.ay - nowAy) * 4 + (act.hafta - nowHafta);
    if (weekDiff < 0 || weekDiff > 2) return act;

    if (act.tip === 'ekim') {
      const esik = CROP_FROST_ESIGI[act.urun] ?? 0;
      if (minTempNext5 < esik) {
        return {
          ...act,
          weatherWarning: `🌡️ Don riski! Min ${minTempNext5.toFixed(0)}°C (eşik ${esik}°C) — ekim ertelenebilir`,
        };
      }
    }

    if (act.tip === 'ilac') {
      if (maxRainNext5 >= 3) {
        return {
          ...act,
          weatherWarning: `🌧️ Yağış bekleniyor (${maxRainNext5.toFixed(0)} mm) — ilaçlama sonrası yağış etkinliği düşürür`,
        };
      }
    }

    return act;
  });
}

// ─── Crop Profiles Database (Enriched) ────────────────────────────────────────

const CROP_PROFILES: Record<string, CropProfile> = {
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

function getTrustTone(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function buildCalendarTrust(selectedIl: string, selectedCrops: string[], activities: Activity[]) {
  let score = 34;
  if (selectedIl) score += 14;
  if (selectedCrops.length >= 1) score += 8;
  if (selectedCrops.length >= 3) score += 4;
  if (activities.length >= 12) score += 4;

  score = Math.max(16, Math.min(68, score));

  return {
    title: 'Takvim guven siniri',
    score,
    tone: getTrustTone(score),
    summary: selectedIl
      ? 'Takvim secilen ilin iklim bolgesine gore kaydiriliyor. Yine de bu modul bir operasyon rehberidir; o yilki meteoroloji ve yerel cesit farklarini tek basina yakalayamaz.'
      : 'Takvim il secilmeden genel referans bolge mantigi ile uretiliyor. Bu haliyle sadece kaba sezon akisi icin kullanilmali, kesin tarih olarak alinmamalidir.',
    badges: [
      selectedIl ? `${selectedIl} secili` : 'Genel referans bolge',
      `${selectedCrops.length} urun`,
      `${activities.length} aktivite`,
      'Bolgesel hafta offseti',
    ],
    bullets: [
      'Ekim, gubreleme, ilaclama ve hasat tarihleri statik urun profillerinden uretilir.',
      'Modul, o yila ait birikimli sicaklik, yagis veya fenolojik gozelim verisi kullanmaz.',
      'Ilac ve gubre tarihleri rehber niteligindedir; ruhsatli urun ve uzman kontrolu gerekir.',
    ],
    sources: ['Statik urun profili', 'Bolgesel takvim offseti', 'Kural tabanli aktivite uretimi'],
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const TIP_META: Record<Activity['tip'], { renk: string; etiket: string; emoji: string }> = {
  ekim:   { renk: '#22c55e', etiket: 'Ekim',      emoji: '🌱' },
  sulama: { renk: '#3b82f6', etiket: 'Sulama',     emoji: '💧' },
  gubre:  { renk: '#f59e0b', etiket: 'Gübreleme',  emoji: '🧪' },
  ilac:   { renk: '#ef4444', etiket: 'İlaçlama',   emoji: '🧴' },
  hasat:  { renk: '#8b5cf6', etiket: 'Hasat',       emoji: '🌾' },
};

const BOLGE_UYARILAR: Record<IklimBolge, string> = {
  akdeniz:      'Bu bölgede kışlık ekimler erken yapılabilir. Yaz kavurucu sıcaktır.',
  ege:          'Ilık iklim. Kıyıda don riski düşük, iç kesimlerde dikkat.',
  marmara:      'Geçiş iklimi. Mart ortasına kadar don riski devam eder.',
  ic_anadolu:   'Karasal iklim. Geç don riski Mayıs başına kadar sürebilir! Düşük yağış.',
  karadeniz:    'Bol yağış. Fungisit uygulamaları daha sık tekrarlanmalı.',
  dogu_anadolu: 'Sert kışlar. Yazlık ekimler Haziran başına kaydırılmalı. Don riski yüksek.',
  guneydogu:    'Çok sıcak yazlar. Sulama kritik. Erken ekime uygun.',
};

const STORAGE_KEY = 'tt_prefs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentWeekOfYear(): { ay: number; hafta: number } {
  const now = new Date();
  const ay = now.getMonth() + 1;
  const gun = now.getDate();
  const hafta = Math.min(4, Math.ceil(gun / 7));
  return { ay, hafta };
}

function generateActivities(
  selectedCrops: string[],
  bolge: IklimBolge,
  ekimOverrides: Record<string, { ay: number; hafta: number }> = {},
): Activity[] {
  const regionOffset = BOLGE_META[bolge].takvimOffset;
  const acts: Activity[] = [];
  let id = 0;

  for (const cropKey of selectedCrops) {
    const crop = CROP_PROFILES[cropKey];
    if (!crop) continue;

    // Compute per-crop additional offset from user-specified planting date
    let extraOffset = 0;
    const ekimOverride = ekimOverrides[cropKey];
    if (ekimOverride && crop.ekim[0]) {
      const baseEkim = applyBolgeOffset(crop.ekim[0].baseAy, crop.ekim[0].baseHafta, regionOffset);
      const baseTW = (baseEkim.ay - 1) * 4 + baseEkim.hafta;
      const overrideTW = (ekimOverride.ay - 1) * 4 + ekimOverride.hafta;
      extraOffset = overrideTW - baseTW;
    }
    const offset = regionOffset + extraOffset;

    // Ekim/Dikim
    for (const e of crop.ekim) {
      const { ay, hafta } = applyBolgeOffset(e.baseAy, e.baseHafta, offset);
      acts.push({
        id: `${id++}`,
        urun: crop.ad,
        urun_emoji: crop.emoji,
        tip: 'ekim',
        baslik: crop.kategori === 'cok_yillik' ? `${crop.ad} Bakım Başlangıcı` : `${crop.ad} Ekimi`,
        ay, hafta,
        notlar: `${crop.sicaklik_esik} ${crop.don_riski}`,
        oncelik: 'kritik',
      });
    }

    // Gübreleme
    for (const g of crop.gubre) {
      const { ay, hafta } = applyBolgeOffset(g.baseAy, g.baseHafta, offset);
      acts.push({
        id: `${id++}`,
        urun: crop.ad,
        urun_emoji: crop.emoji,
        tip: 'gubre',
        baslik: `${crop.ad} Gübreleme`,
        ay, hafta,
        notlar: `${g.tip}. Toprak analizi sonuçlarına göre doz ayarlayın.`,
        oncelik: 'yuksek',
      });
    }

    // Sulama (aylık, başlangıç-bitiş aralığında)
    if (crop.sulama_baslangic > 0) {
      const sulamaStart = crop.sulama_baslangic;
      const sulamaEnd = crop.sulama_bitis || sulamaStart + 4;
      for (let baseAy = sulamaStart; baseAy <= sulamaEnd; baseAy++) {
        // Her ay için 2 haftalık sulama kaydı
        const h1 = applyBolgeOffset(baseAy, 1, offset);
        const h2 = applyBolgeOffset(baseAy, 3, offset);
        acts.push({
          id: `${id++}`,
          urun: crop.ad,
          urun_emoji: crop.emoji,
          tip: 'sulama',
          baslik: `${crop.ad} Sulaması`,
          ay: h1.ay, hafta: h1.hafta,
          notlar: `Her ${crop.sulama_sikligi_gun} günde bir sulama. Damla sulama önerilir.`,
          oncelik: 'orta',
        });
        // İkinci sulama sadece kısa sıklıklı ürünler için
        if (crop.sulama_sikligi_gun <= 10) {
          acts.push({
            id: `${id++}`,
            urun: crop.ad,
            urun_emoji: crop.emoji,
            tip: 'sulama',
            baslik: `${crop.ad} Sulaması`,
            ay: h2.ay, hafta: h2.hafta,
            notlar: `Her ${crop.sulama_sikligi_gun} günde bir sulama. Toprak nemini kontrol edin.`,
            oncelik: 'dusuk',
          });
        }
      }
    }

    // İlaçlama
    for (const i of crop.ilac) {
      const { ay, hafta } = applyBolgeOffset(i.baseAy, i.baseHafta, offset);
      acts.push({
        id: `${id++}`,
        urun: crop.ad,
        urun_emoji: crop.emoji,
        tip: 'ilac',
        baslik: `${crop.ad} İlaçlama`,
        ay, hafta,
        notlar: `${i.hedef}. Rüzgarsız, serin saatlerde uygulayın.`,
        oncelik: 'orta',
      });
    }

    // Hasat
    for (const h of crop.hasat) {
      const { ay, hafta } = applyBolgeOffset(h.baseAy, h.baseHafta, offset);
      acts.push({
        id: `${id++}`,
        urun: crop.ad,
        urun_emoji: crop.emoji,
        tip: 'hasat',
        baslik: `${crop.ad} Hasadı`,
        ay, hafta,
        notlar: `Olgunluk kontrol edilmeli. Hava kuruken hasat yapın.`,
        oncelik: 'kritik',
      });
    }
  }

  return acts.sort((a, b) => a.ay !== b.ay ? a.ay - b.ay : a.hafta - b.hafta);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TarimTakvimPage() {
  const navigate = useNavigate();

  // Load persisted prefs
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as { il?: string; crops?: string[]; ekimTarihleri?: Record<string, { ay: number; hafta: number }> } : null;
    } catch { return null; }
  }, []);

  const [selectedIl, setSelectedIl] = useState(saved?.il ?? '');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(saved?.crops ?? []);
  const [ekimTarihleri, setEkimTarihleri] = useState<Record<string, { ay: number; hafta: number }>>(saved?.ekimTarihleri ?? {});
  const [viewMode, setViewMode] = useState<'takvim' | 'liste' | 'timeline'>('takvim');
  const [filterTip, setFilterTip] = useState<Activity['tip'] | 'hepsi'>('hepsi');
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);

  const bolge = selectedIl ? getBolge(selectedIl) : 'ic_anadolu';
  const bolgeMeta = BOLGE_META[bolge];
  const now = getCurrentWeekOfYear();

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ il: selectedIl, crops: selectedCrops, ekimTarihleri }));
    } catch { /* ignore */ }
  }, [selectedIl, selectedCrops, ekimTarihleri]);

  // Hava tahminini çek (il seçiliyse)
  useEffect(() => {
    if (!selectedIl || !isWeatherConfigured()) {
      setForecast(null);
      return;
    }
    fetchForecast(selectedIl)
      .then(setForecast)
      .catch(() => setForecast(null));
  }, [selectedIl]);

  // Generate activities (+ hava uyarıları)
  const activities = useMemo(
    () => applyForecastWarnings(
      generateActivities(selectedCrops, bolge, ekimTarihleri),
      forecast,
      now.ay,
      now.hafta,
    ),
    [selectedCrops, bolge, ekimTarihleri, forecast, now.ay, now.hafta],
  );

  const filteredActivities = useMemo(
    () => activities.filter((a) => filterTip === 'hepsi' || a.tip === filterTip),
    [activities, filterTip],
  );

  // This-week tasks
  const buHaftaGorevler = useMemo(
    () => activities.filter((a) => a.ay === now.ay && a.hafta === now.hafta),
    [activities, now.ay, now.hafta],
  );

  // Overdue
  const gecikmisGorevler = useMemo(
    () => activities.filter((a) => {
      if (a.ay < now.ay) return true;
      if (a.ay === now.ay && a.hafta < now.hafta) return true;
      return false;
    }).filter(a => a.tip === 'ekim' || a.tip === 'hasat'),
    [activities, now.ay, now.hafta],
  );
  const calendarTrust = useMemo(
    () => buildCalendarTrust(selectedIl, selectedCrops, activities),
    [selectedIl, selectedCrops, activities],
  );

  const getActivitiesForMonth = (ay: number) => filteredActivities.filter((a) => a.ay === ay);

  const toggleCrop = (key: string) => {
    setSelectedCrops((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      // Clean up ekim overrides for deselected crops
      if (prev.includes(key)) {
        setEkimTarihleri((em) => { const n = { ...em }; delete n[key]; return n; });
      }
      return next;
    });
  };

  const setEkimAy = (cropKey: string, ay: number) => {
    if (!ay) {
      setEkimTarihleri((prev) => { const n = { ...prev }; delete n[cropKey]; return n; });
    } else {
      setEkimTarihleri((prev) => ({
        ...prev,
        [cropKey]: { ay, hafta: prev[cropKey]?.hafta ?? 1 },
      }));
    }
  };

  const setEkimHafta = (cropKey: string, hafta: number) => {
    setEkimTarihleri((prev) => prev[cropKey]
      ? { ...prev, [cropKey]: { ...prev[cropKey], hafta } }
      : prev,
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="tt-page">
      {/* Topbar */}
      <div className="tt-topbar">
        <button className="tt-topbar__back" onClick={() => navigate('/')}>← Ana Sayfa</button>
        <div className="tt-topbar__title">
          <span>📅</span>
          <span>Tarımsal Takvim Rehberi</span>
        </div>
        <div style={{ width: '100px' }} />
      </div>

      <div className="tt-content">
        {/* ── Region Selection ────────────────────────────────────────────── */}
        <div className="tt-card">
          <h2 className="tt-card__title">📍 Bölge Seçimi</h2>
          <p className="tt-card__desc">
            İl seçerek takvimi bölgenize özelleştirin. Ekim/hasat tarihleri iklim bölgesine göre otomatik kaydırılır.
          </p>
          <div className="tt-region-row">
            <select
              className="tt-il-select"
              value={selectedIl}
              onChange={(e) => setSelectedIl(e.target.value)}
            >
              <option value="">— İl seçin (opsiyonel) —</option>
              {ILLER.map((il) => (
                <option key={il} value={il}>{il}</option>
              ))}
            </select>
            {selectedIl && (
              <div className="tt-bolge-badge">
                <span>{bolgeMeta.emoji}</span>
                <span>{bolgeMeta.ad}</span>
                <span className="tt-bolge-offset">
                  {bolgeMeta.takvimOffset > 0 && `+${bolgeMeta.takvimOffset} hafta`}
                  {bolgeMeta.takvimOffset < 0 && `${bolgeMeta.takvimOffset} hafta`}
                  {bolgeMeta.takvimOffset === 0 && 'Referans bölge'}
                </span>
              </div>
            )}
          </div>
          {selectedIl && <WeatherWidget il={selectedIl} compact />}

          {selectedIl ? (
            <div className="tt-bolge-uyari">
              <strong>⚠️ Bölge Notu:</strong> {BOLGE_UYARILAR[bolge]}
            </div>
          ) : (
            <div className="tt-bolge-uyari tt-bolge-uyari--fallback">
              <strong>ℹ️ İl Seçilmedi:</strong> Takvim şu an <strong>İç Anadolu</strong> bölgesi baz alınarak gösteriliyor.
              Gerçek bölgenize özel tarihler için yukarıdan ilinizi seçin.
            </div>
          )}
        </div>

        {/* ── Crop Selection ─────────────────────────────────────────────── */}
        <div className="tt-card">
          <h2 className="tt-card__title">🌾 Ürün Seçimi</h2>
          <p className="tt-card__desc">Takvimde görmek istediğiniz ürünleri seçin (birden fazla seçilebilir).</p>

          {/* Kışlık ürünler */}
          <div className="tt-crop-category">
            <span className="tt-crop-category__label">❄️ Kışlık</span>
            <div className="tt-crop-grid">
              {Object.entries(CROP_PROFILES).filter(([, c]) => c.kategori === 'kislik').map(([key, crop]) => (
                <div
                  key={key}
                  className={`tt-crop-chip ${selectedCrops.includes(key) ? 'tt-crop-chip--selected' : ''}`}
                  onClick={() => toggleCrop(key)}
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__name">{crop.ad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Yazlık ürünler */}
          <div className="tt-crop-category">
            <span className="tt-crop-category__label">☀️ Yazlık</span>
            <div className="tt-crop-grid">
              {Object.entries(CROP_PROFILES).filter(([, c]) => c.kategori === 'yazlik').map(([key, crop]) => (
                <div
                  key={key}
                  className={`tt-crop-chip ${selectedCrops.includes(key) ? 'tt-crop-chip--selected' : ''}`}
                  onClick={() => toggleCrop(key)}
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__name">{crop.ad}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Çok yıllık */}
          <div className="tt-crop-category">
            <span className="tt-crop-category__label">🌳 Çok Yıllık</span>
            <div className="tt-crop-grid">
              {Object.entries(CROP_PROFILES).filter(([, c]) => c.kategori === 'cok_yillik').map(([key, crop]) => (
                <div
                  key={key}
                  className={`tt-crop-chip ${selectedCrops.includes(key) ? 'tt-crop-chip--selected' : ''}`}
                  onClick={() => toggleCrop(key)}
                >
                  <span className="tt-crop-chip__emoji">{crop.emoji}</span>
                  <span className="tt-crop-chip__name">{crop.ad}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ekim Tarihi Ayarı ──────────────────────────────────────────── */}
        {selectedCrops.some((k) => CROP_PROFILES[k]?.kategori !== 'cok_yillik') && (
          <div className="tt-card">
            <h2 className="tt-card__title">📅 Gerçek Ekim Tarihi <span className="tt-ekim-optional">(İsteğe Bağlı)</span></h2>
            <p className="tt-card__desc">
              Ekim standart tarihten farklı yapıldıysa tarihi girin — tüm takvim faaliyetleri (gübreleme, ilaçlama, hasat) otomatik kaydırılır.
            </p>
            <div className="tt-ekim-grid">
              {selectedCrops
                .filter((k) => CROP_PROFILES[k]?.kategori !== 'cok_yillik')
                .map((cropKey) => {
                  const crop = CROP_PROFILES[cropKey];
                  const base = applyBolgeOffset(crop.ekim[0].baseAy, crop.ekim[0].baseHafta, BOLGE_META[bolge].takvimOffset);
                  const override = ekimTarihleri[cropKey];
                  return (
                    <div key={cropKey} className={`tt-ekim-row ${override ? 'tt-ekim-row--active' : ''}`}>
                      <div className="tt-ekim-crop-label">
                        <span className="tt-ekim-emoji">{crop.emoji}</span>
                        <span className="tt-ekim-name">{crop.ad}</span>
                        <span className="tt-ekim-base">Standart: {AYLAR[base.ay - 1]} H{base.hafta}</span>
                      </div>
                      <div className="tt-ekim-controls">
                        <select
                          className="tt-ekim-select"
                          value={override?.ay ?? ''}
                          onChange={(e) => setEkimAy(cropKey, parseInt(e.target.value) || 0)}
                        >
                          <option value="">Ay seçin</option>
                          {AYLAR.map((ad, i) => (
                            <option key={i + 1} value={i + 1}>{ad}</option>
                          ))}
                        </select>
                        {override?.ay && (
                          <select
                            className="tt-ekim-select"
                            value={override.hafta}
                            onChange={(e) => setEkimHafta(cropKey, parseInt(e.target.value))}
                          >
                            <option value={1}>1. Hafta</option>
                            <option value={2}>2. Hafta</option>
                            <option value={3}>3. Hafta</option>
                            <option value={4}>4. Hafta</option>
                          </select>
                        )}
                        {override && (
                          <button
                            className="tt-ekim-reset"
                            onClick={() => setEkimTarihleri((prev) => { const n = { ...prev }; delete n[cropKey]; return n; })}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {override?.ay && (
                        <div className="tt-ekim-delta">
                          {(() => {
                            const baseTW = (base.ay - 1) * 4 + base.hafta;
                            const overrideTW = (override.ay - 1) * 4 + override.hafta;
                            const delta = overrideTW - baseTW;
                            if (delta === 0) return <span className="tt-ekim-delta--zero">Standart tarihe eşit</span>;
                            return (
                              <span className={delta > 0 ? 'tt-ekim-delta--late' : 'tt-ekim-delta--early'}>
                                {delta > 0 ? `+${delta}` : delta} hafta {delta > 0 ? 'geç' : 'erken'} — tüm faaliyetler kaydırıldı
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {selectedCrops.length === 0 && (
          <div className="tt-empty">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌾</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hiç ürün seçilmedi</div>
            <div style={{ color: '#78716c', marginTop: '0.5rem' }}>
              Yukarıdan takvimde görmek istediğiniz ürünleri seçin
            </div>
          </div>
        )}

        {selectedCrops.length > 0 && (
          <>
            <ProductTrustPanel
              title={calendarTrust.title}
              summary={calendarTrust.summary}
              score={calendarTrust.score}
              tone={calendarTrust.tone}
              badges={calendarTrust.badges}
              bullets={calendarTrust.bullets}
              sources={calendarTrust.sources}
            />

            {/* ── This Week Card ───────────────────────────────────────────── */}
            <div className="tt-thisweek">
              <div className="tt-thisweek__header">
                <span>📌</span>
                <span>Bu Hafta — {AYLAR[now.ay - 1]}, Hafta {now.hafta}</span>
                {selectedIl && <span className="tt-thisweek__il">{selectedIl}</span>}
              </div>
              {buHaftaGorevler.length === 0 && gecikmisGorevler.length === 0 && (
                <div className="tt-thisweek__empty">Bu hafta planlanmış görev yok ✓</div>
              )}
              {gecikmisGorevler.length > 0 && (
                <div className="tt-thisweek__overdue">
                  <strong>⏰ Gecikmeli ({gecikmisGorevler.length}):</strong>
                  {gecikmisGorevler.slice(0, 5).map((a) => (
                    <span key={a.id} className="tt-thisweek__tag tt-thisweek__tag--overdue">
                      {a.urun_emoji} {a.baslik} ({AYLAR[a.ay - 1]} H{a.hafta})
                    </span>
                  ))}
                  {gecikmisGorevler.length > 5 && (
                    <span className="tt-thisweek__more">+{gecikmisGorevler.length - 5} daha</span>
                  )}
                </div>
              )}
              {buHaftaGorevler.length > 0 && (
                <div className="tt-thisweek__tasks">
                  {buHaftaGorevler.map((a) => (
                    <div key={a.id} className="tt-thisweek__task" style={{ borderLeftColor: TIP_META[a.tip].renk }}>
                      <div className="tt-thisweek__task-head">
                        <span>{a.urun_emoji}</span>
                        <strong>{a.baslik}</strong>
                        <span className={`tt-activity__badge tt-activity__badge--${a.oncelik}`}>
                          {a.oncelik === 'kritik' ? '🔴' : a.oncelik === 'yuksek' ? '🟠' : a.oncelik === 'orta' ? '🟡' : '⚪'}
                        </span>
                      </div>
                      <div className="tt-thisweek__task-note">{a.notlar}</div>
                      {a.weatherWarning && (
                        <div className="tt-activity__weather-warning">{a.weatherWarning}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Controls ─────────────────────────────────────────────────── */}
            <div className="tt-controls">
              <div className="tt-controls__left">
                <label style={{ fontWeight: 700, marginRight: '0.5rem' }}>Görünüm:</label>
                <div className="tt-view-btns">
                  {(['takvim', 'liste', 'timeline'] as const).map((m) => (
                    <button
                      key={m}
                      className={`tt-view-btn ${viewMode === m ? 'tt-view-btn--active' : ''}`}
                      onClick={() => setViewMode(m)}
                    >
                      {m === 'takvim' ? '📅 Takvim' : m === 'liste' ? '📋 Liste' : '📊 Zaman Çizelgesi'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tt-controls__right">
                <label style={{ fontWeight: 700, marginRight: '0.5rem' }}>Filtre:</label>
                <select
                  className="tt-filter-select"
                  value={filterTip}
                  onChange={(e) => setFilterTip(e.target.value as Activity['tip'] | 'hepsi')}
                >
                  <option value="hepsi">Tüm Aktiviteler</option>
                  {Object.entries(TIP_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.etiket}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Calendar View ────────────────────────────────────────────── */}
            {viewMode === 'takvim' && (
              <div className="tt-calendar">
                {AYLAR.map((ayAd, idx) => {
                  const ayIndex = idx + 1;
                  const acts = getActivitiesForMonth(ayIndex);
                  const isCurrentMonth = ayIndex === now.ay;
                  return (
                    <div key={ayIndex} className={`tt-month ${isCurrentMonth ? 'tt-month--current' : ''}`}>
                      <div className="tt-month__header">
                        <span className="tt-month__name">{ayAd}</span>
                        <span className="tt-month__count">{acts.length} aktivite</span>
                      </div>
                      <div className="tt-month__activities">
                        {acts.length === 0 && <div className="tt-month__empty">Aktivite yok</div>}
                        {acts.map((act) => (
                          <div key={act.id} className="tt-activity" style={{ borderLeftColor: TIP_META[act.tip].renk }}>
                            <div className="tt-activity__header">
                              <span className="tt-activity__emoji">{act.urun_emoji}</span>
                              <span className="tt-activity__title">{act.baslik}</span>
                            </div>
                            <div className="tt-activity__meta">
                              <span className={`tt-activity__badge tt-activity__badge--${act.oncelik}`}>
                                {act.oncelik === 'kritik' ? '🔴' : act.oncelik === 'yuksek' ? '🟠' : act.oncelik === 'orta' ? '🟡' : '⚪'}
                              </span>
                              <span className="tt-activity__week">Hafta {act.hafta}</span>
                            </div>
                            <div className="tt-activity__notes">{act.notlar}</div>
                            {act.weatherWarning && (
                              <div className="tt-activity__weather-warning">{act.weatherWarning}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── List View ────────────────────────────────────────────────── */}
            {viewMode === 'liste' && (
              <div className="tt-card">
                <h2 className="tt-card__title">Aktivite Listesi ({filteredActivities.length})</h2>
                <div className="tt-list">
                  {filteredActivities.map((act) => (
                    <div key={act.id} className="tt-list-item" style={{ borderLeftColor: TIP_META[act.tip].renk }}>
                      <div className="tt-list-item__left">
                        <div className="tt-list-item__date">
                          {AYLAR[act.ay - 1]} <span>Hafta {act.hafta}</span>
                        </div>
                        <div className="tt-list-item__title">
                          <span style={{ marginRight: '0.5rem' }}>{act.urun_emoji}</span>
                          {act.baslik}
                        </div>
                        <div className="tt-list-item__notes">{act.notlar}</div>
                        {act.weatherWarning && (
                          <div className="tt-activity__weather-warning">{act.weatherWarning}</div>
                        )}
                      </div>
                      <div className="tt-list-item__right">
                        <span className={`tt-list-item__badge tt-list-item__badge--${act.oncelik}`}>
                          {act.oncelik.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Timeline View ────────────────────────────────────────────── */}
            {viewMode === 'timeline' && (
              <div className="tt-card">
                <h2 className="tt-card__title">Yıllık Zaman Çizelgesi</h2>
                <div className="tt-timeline">
                  {selectedCrops.map((cropKey) => {
                    const crop = CROP_PROFILES[cropKey];
                    if (!crop) return null;
                    const cropActivities = filteredActivities.filter((a) => a.urun === crop.ad);
                    return (
                      <div key={cropKey} className="tt-timeline-row">
                        <div className="tt-timeline-label">
                          <span>{crop.emoji}</span>
                          <span>{crop.ad}</span>
                        </div>
                        <div className="tt-timeline-bar">
                          {AYLAR.map((_, ayIdx) => {
                            const ayActs = cropActivities.filter((a) => a.ay === ayIdx + 1);
                            return (
                              <div key={ayIdx} className="tt-timeline-cell">
                                {ayActs.map((act) => (
                                  <div
                                    key={act.id}
                                    className="tt-timeline-dot"
                                    style={{ backgroundColor: TIP_META[act.tip].renk }}
                                    title={`${act.baslik} — ${AYLAR[ayIdx]} Hafta ${act.hafta}`}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="tt-timeline-months">
                  {AYLAR.map((ay, idx) => (
                    <div key={idx} className="tt-timeline-month">{ay.slice(0, 3)}</div>
                  ))}
                </div>
                <div className="tt-timeline-legend">
                  {Object.entries(TIP_META).map(([key, meta]) => (
                    <div key={key}><div style={{ backgroundColor: meta.renk }} /> {meta.etiket}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Stats ────────────────────────────────────────────────────── */}
            <div className="tt-stats">
              <div className="tt-stat-card">
                <div className="tt-stat-card__value">{selectedCrops.length}</div>
                <div className="tt-stat-card__label">Seçili Ürün</div>
              </div>
              <div className="tt-stat-card">
                <div className="tt-stat-card__value">{activities.length}</div>
                <div className="tt-stat-card__label">Toplam Aktivite</div>
              </div>
              <div className="tt-stat-card">
                <div className="tt-stat-card__value">
                  {activities.filter((a) => a.oncelik === 'kritik').length}
                </div>
                <div className="tt-stat-card__label">Kritik Görev</div>
              </div>
              <div className="tt-stat-card">
                <div className="tt-stat-card__value">{buHaftaGorevler.length}</div>
                <div className="tt-stat-card__label">Bu Hafta</div>
              </div>
              <div className="tt-stat-card">
                <div className="tt-stat-card__value">{gecikmisGorevler.length}</div>
                <div className="tt-stat-card__label">Gecikmeli</div>
              </div>
            </div>

            {/* Print button */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="tt-print-btn" onClick={() => window.print()}>🖨️ Takvimi Yazdır</button>
              <button
                className="tt-print-btn"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  // Generate ICS calendar file
                  const year = new Date().getFullYear();
                  const events = activities.map(a => {
                    const month = String(a.ay).padStart(2, '0');
                    const day = String(Math.min(28, a.hafta * 7)).padStart(2, '0');
                    const dtStart = `${year}${month}${day}`;
                    const dtEnd = dtStart;
                    return [
                      'BEGIN:VEVENT',
                      `DTSTART;VALUE=DATE:${dtStart}`,
                      `DTEND;VALUE=DATE:${dtEnd}`,
                      `SUMMARY:${a.urun_emoji} ${a.baslik}`,
                      `DESCRIPTION:${a.notlar.replace(/\n/g, '\\n')} | Öncelik: ${a.oncelik}`,
                      `CATEGORIES:${a.tip}`,
                      `UID:tarim-${a.id}@tarpo`,
                      'END:VEVENT',
                    ].join('\r\n');
                  });
                  const icsContent = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'PRODID:-//TARPO//Tarimsal Takvim//TR',
                    'CALSCALE:GREGORIAN',
                    ...events,
                    'END:VCALENDAR',
                  ].join('\r\n');
                  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tarimsal-takvim-${selectedIl || 'genel'}-${year}.ics`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📅 ICS İndir
              </button>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #f59e0b', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6 }}>
              ⚠️ <strong>Uyarı:</strong> Takvim tarihleri bölgesel iklim ortalamaları baz alınarak oluşturulmuştur.
              O yılın hava koşulları, don riski, yağış durumu ve yerel çeşit özelliklerine göre 1-3 hafta değişkenlik gösterebilir.
              Kesin ekim/hasat tarihlerini il/ilçe tarım müdürlüğü veya yerel ziraat mühendisi ile teyit ediniz.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
