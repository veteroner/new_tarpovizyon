import { applyBolgeOffset, BOLGE_META } from '../../utils/climate-data';
import type { IklimBolge } from '../../utils/climate-data';
import {
  RAW_CROP_PROFILES,
  TAKVIM_DATA_SOURCE_NOTE,
  TAKVIM_DATA_VERSION,
} from './takvimData';
import type { CropKategori, CropProfileSeed } from './takvimData';

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
  kategori: CropKategori;
  kaynakNotu: string;
  guvenDuzeyi: 'dusuk' | 'orta' | 'yuksek';
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

function withTakvimMeta(profile: CropProfileSeed): CropProfile {
  return {
    ...profile,
    kaynakNotu: TAKVIM_DATA_SOURCE_NOTE,
    guvenDuzeyi: profile.kategori === 'cok_yillik' ? 'orta' : 'yuksek',
  };
}

export const CROP_PROFILES: Record<string, CropProfile> = Object.fromEntries(
  Object.entries(RAW_CROP_PROFILES).map(([key, profile]) => [key, withTakvimMeta(profile)]),
) as Record<string, CropProfile>;

export { TAKVIM_DATA_SOURCE_NOTE, TAKVIM_DATA_VERSION };

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
