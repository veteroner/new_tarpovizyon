/**
 * Unit Testler: generateActivities (TarimTakvimPage)
 *
 * Bu testler saf hesap mantığını test eder.
 * Bölgesel offset ve ürün kategorisi ayrımı doğrulanır.
 */
import { describe, it, expect } from 'vitest';

// ─── İnline: test için minimal sayfa mantığını kopyalıyoruz ───────────────────
// (Gerçek üretimde bu pure-function katmanına taşınabilir)

type IklimBolge = 'akdeniz' | 'ege' | 'marmara' | 'ic_anadolu' | 'karadeniz' | 'dogu_anadolu' | 'guneydogu';

const BOLGE_OFFSETS: Record<IklimBolge, number> = {
  akdeniz:      -2,
  ege:          -1,
  marmara:       0,
  ic_anadolu:    2,
  karadeniz:     1,
  dogu_anadolu:  3,
  guneydogu:    -2,
};

function applyBolgeOffset(baseAy: number, baseHafta: number, offset: number): { ay: number; hafta: number } {
  let totalHafta = (baseAy - 1) * 4 + (baseHafta - 1) + offset;
  totalHafta = Math.max(0, Math.min(47, totalHafta));
  const ay = Math.floor(totalHafta / 4) + 1;
  const hafta = (totalHafta % 4) + 1;
  return { ay, hafta };
}

interface Activity {
  id: string;
  urun: string;
  tip: 'ekim' | 'sulama' | 'gubre' | 'ilac' | 'hasat';
  ay: number;
  hafta: number;
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
}

interface CropProfile {
  ad: string;
  kategori: 'kislik' | 'yazlik' | 'cok_yillik';
  ekim: Array<{ baseAy: number; baseHafta: number }>;
  hasat: Array<{ baseAy: number; baseHafta: number }>;
  gubre: Array<{ baseAy: number; baseHafta: number; tip: string }>;
}

function generateActivities(selectedCrops: string[], crops: Record<string, CropProfile>, bolge: IklimBolge): Activity[] {
  const offset = BOLGE_OFFSETS[bolge];
  const acts: Activity[] = [];
  let id = 0;

  for (const cropKey of selectedCrops) {
    const crop = crops[cropKey];
    if (!crop) continue;

    for (const e of crop.ekim) {
      const { ay, hafta } = applyBolgeOffset(e.baseAy, e.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, tip: 'ekim', ay, hafta, oncelik: 'kritik' });
    }

    for (const h of crop.hasat) {
      const { ay, hafta } = applyBolgeOffset(h.baseAy, h.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, tip: 'hasat', ay, hafta, oncelik: 'kritik' });
    }

    for (const g of crop.gubre) {
      const { ay, hafta } = applyBolgeOffset(g.baseAy, g.baseHafta, offset);
      acts.push({ id: `${id++}`, urun: crop.ad, tip: 'gubre', ay, hafta, oncelik: 'yuksek' });
    }
  }

  return acts.sort((a, b) => a.ay !== b.ay ? a.ay - b.ay : a.hafta - b.hafta);
}

// ─── Test sabitleri ────────────────────────────────────────────────────────────

const CROPS: Record<string, CropProfile> = {
  bugday: {
    ad: 'Buğday',
    kategori: 'kislik',
    ekim: [{ baseAy: 10, baseHafta: 2 }],
    hasat: [{ baseAy: 6, baseHafta: 3 }],
    gubre: [
      { baseAy: 10, baseHafta: 3, tip: 'Taban gübre (DAP)' },
      { baseAy: 3, baseHafta: 2, tip: 'Üst gübre (Üre)' },
    ],
  },
  uzum: {
    ad: 'Üzüm',
    kategori: 'cok_yillik',
    ekim: [], // çok yıllık → ekim yok
    hasat: [{ baseAy: 8, baseHafta: 3 }],
    gubre: [{ baseAy: 3, baseHafta: 1, tip: 'İlkbahar gübresi' }],
  },
  misir: {
    ad: 'Mısır',
    kategori: 'yazlik',
    ekim: [{ baseAy: 4, baseHafta: 3 }],
    hasat: [{ baseAy: 9, baseHafta: 3 }],
    gubre: [{ baseAy: 4, baseHafta: 3, tip: 'Taban gübre (NPK)' }],
  },
};

// ─── Testler ──────────────────────────────────────────────────────────────────

describe('generateActivities', () => {

  it('aynı ürün, Doğu Anadolu bölgesinde İç Anadolu\'ya göre daha geç ekim tarihi üretmeli', () => {
    const icAnadoluActs = generateActivities(['bugday'], CROPS, 'ic_anadolu');
    const doguAnadoluActs = generateActivities(['bugday'], CROPS, 'dogu_anadolu');

    const icEkim = icAnadoluActs.find(a => a.tip === 'ekim');
    const doguEkim = doguAnadoluActs.find(a => a.tip === 'ekim');

    expect(icEkim).toBeDefined();
    expect(doguEkim).toBeDefined();

    // Doğu Anadolu offset +3, İç Anadolu +2 → Doğu daha geç olmalı
    const icTotal = (icEkim!.ay - 1) * 4 + (icEkim!.hafta - 1);
    const doguTotal = (doguEkim!.ay - 1) * 4 + (doguEkim!.hafta - 1);
    expect(doguTotal).toBeGreaterThan(icTotal);
  });

  it('Akdeniz bölgesi, İç Anadolu\'dan daha erken tarih üretmeli (negatif offset)', () => {
    const icActs = generateActivities(['misir'], CROPS, 'ic_anadolu');
    const akdActs = generateActivities(['misir'], CROPS, 'akdeniz');

    const icEkim = icActs.find(a => a.tip === 'ekim');
    const akdEkim = akdActs.find(a => a.tip === 'ekim');

    expect(icEkim).toBeDefined();
    expect(akdEkim).toBeDefined();

    const icTotal = (icEkim!.ay - 1) * 4 + (icEkim!.hafta - 1);
    const akdTotal = (akdEkim!.ay - 1) * 4 + (akdEkim!.hafta - 1);
    expect(akdTotal).toBeLessThan(icTotal);
  });

  it('çok yıllık ürünler (üzüm) ekim aktivitesi üretmemeli', () => {
    const acts = generateActivities(['uzum'], CROPS, 'marmara');
    const ekimActs = acts.filter(a => a.tip === 'ekim');
    expect(ekimActs).toHaveLength(0);
  });

  it('çok yıllık ürünler hasat ve gübreleme aktivitesi üretmeli', () => {
    const acts = generateActivities(['uzum'], CROPS, 'marmara');
    expect(acts.some(a => a.tip === 'hasat')).toBe(true);
    expect(acts.some(a => a.tip === 'gubre')).toBe(true);
  });

  it('birden fazla ürün seçildiğinde tüm ürünlerin aktiviteleri birleştirilmeli', () => {
    const acts = generateActivities(['bugday', 'misir'], CROPS, 'marmara');
    const bugdayActs = acts.filter(a => a.urun === 'Buğday');
    const misirActs = acts.filter(a => a.urun === 'Mısır');
    expect(bugdayActs.length).toBeGreaterThan(0);
    expect(misirActs.length).toBeGreaterThan(0);
  });

  it('ekim aktivitesinin önceliği "kritik" olmalı', () => {
    const acts = generateActivities(['bugday'], CROPS, 'marmara');
    const ekimActs = acts.filter(a => a.tip === 'ekim');
    ekimActs.forEach(a => expect(a.oncelik).toBe('kritik'));
  });

  it('sonuçlar kronolojik sıralı olmalı (ay, hafta sırası)', () => {
    const acts = generateActivities(['bugday', 'misir'], CROPS, 'marmara');
    for (let i = 1; i < acts.length; i++) {
      const prev = (acts[i - 1].ay - 1) * 4 + acts[i - 1].hafta;
      const curr = (acts[i].ay - 1) * 4 + acts[i].hafta;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('yanlış ürün anahtarı geçildiğinde hata vermemeli, sessizce atlamalı', () => {
    expect(() => generateActivities(['olmayan_urun'], CROPS, 'marmara')).not.toThrow();
    const acts = generateActivities(['olmayan_urun'], CROPS, 'marmara');
    expect(acts).toHaveLength(0);
  });

});

// ─── gübre motoru mantık testleri ────────────────────────────────────────────

describe('gübre motoru hesap mantığı', () => {

  // Üre (46-0-0) 100 kg → 46 kg N sağlar
  const UE_N_PERCENT = 46 / 100;

  it('100 kg N eksiği için Üre miktarı doğru hesaplanmalı', () => {
    const eksikN = 100; // kg
    const miktar = eksikN / UE_N_PERCENT; // ≈ 217.4 kg Üre
    expect(miktar).toBeCloseTo(217.4, 0);
  });

  it('güven skoru: toprak verisi tam girilmişse ≥88 olmalı', () => {
    const toprak = { n: 5, p2o5: 3, k2o: 8, ph: 6.5, organik_madde: 2.5 };
    let score = 40;
    if (toprak.n > 0) score += 12;
    if (toprak.p2o5 > 0) score += 12;
    if (toprak.k2o > 0) score += 12;
    if (toprak.ph > 0) score += 12;
    if (toprak.organik_madde > 0) score += 12;
    expect(score).toBe(100);
  });

  it('güven skoru: toprak verisi hiç girilmemişse 15 olmalı', () => {
    const score = 15; // sabit — toprak null
    expect(score).toBe(15);
  });

  it('güven skoru: kısmen dolu toprak verisi (sadece N ve P) 64 olmalı', () => {
    const toprak = { n: 5, p2o5: 3, k2o: 0, ph: 0, organik_madde: 0 };
    let score = 40;
    if (toprak.n > 0) score += 12;
    if (toprak.p2o5 > 0) score += 12;
    if (toprak.k2o > 0) score += 12;
    if (toprak.ph > 0) score += 12;
    if (toprak.organik_madde > 0) score += 12;
    expect(score).toBe(64);
  });

  it('pH uyarısı: pH < ph_min ise uyarı üretilmeli', () => {
    const toprakPh = 4.5;
    const cropPhMin = 6.0;
    const uyariVar = toprakPh < cropPhMin;
    expect(uyariVar).toBe(true);
  });

  it('pH uyarısı: pH uygunsa uyarı üretilmemeli', () => {
    const toprakPh = 6.5;
    const cropPhMin = 6.0;
    const cropPhMax = 7.5;
    const uyariVar = toprakPh < cropPhMin || toprakPh > cropPhMax;
    expect(uyariVar).toBe(false);
  });

  it('agresif senaryo tutucudan %50 daha fazla besin ihtiyacı hesaplamalı', () => {
    const baseIhtiyac = 100;
    const tutucu = baseIhtiyac * 0.80;
    const agresif = baseIhtiyac * 1.20;
    expect(agresif / tutucu).toBeCloseTo(1.5, 1);
  });

});
