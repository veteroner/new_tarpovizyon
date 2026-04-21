// ── Pure calculation utilities for GubreHesapPage ────────────────────────────

import { WizardState, CalcResult, SoilAnalysis, CROP_NUTRIENT_DB, FERTILIZER_PRODUCTS } from './gubreTypes';

export function calculateFertilizerMix(
  needed: { n: number; p2o5: number; k2o: number },
  tip: 'kimyasal' | 'organik'
): Array<{ urun: string; miktar: number; fiyat: number }> {
  const products = FERTILIZER_PRODUCTS.filter((p) => p.tip === tip);
  const mix: Array<{ urun: string; miktar: number; fiyat: number }> = [];

  let remainingN = needed.n;
  let remainingP = needed.p2o5;
  let remainingK = needed.k2o;

  // Strategy: Use compound fertilizers first, then single-nutrient ones

  // 1. Find best compound fertilizer
  const compounds = products.filter((p) => p.n > 0 && p.p > 0 && p.k > 0);
  if (compounds.length > 0 && remainingN > 0 && remainingP > 0 && remainingK > 0) {
    const best = compounds.reduce((a, b) => (a.fiyat_kg < b.fiyat_kg ? a : b));
    const maxByN = remainingN / (best.n / 100);
    const maxByP = remainingP / (best.p / 100);
    const maxByK = remainingK / (best.k / 100);
    const amount = Math.min(maxByN, maxByP, maxByK);

    if (amount > 0) {
      mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      remainingN -= amount * (best.n / 100);
      remainingP -= amount * (best.p / 100);
      remainingK -= amount * (best.k / 100);
    }
  }

  const isOrganik = tip === 'organik';
  const pThreshold = isOrganik ? 0.5 : 30;
  const nThreshold = isOrganik ? 0.3 : 20;
  const kThreshold = isOrganik ? 0.5 : 40;

  // 2. Add phosphorus if needed
  if (remainingP > (isOrganik ? 0.5 : 5)) {
    const pProducts = products.filter((p) => p.p > pThreshold).sort((a, b) => b.p - a.p);
    if (pProducts.length > 0) {
      const best = pProducts[0];
      const amount = remainingP / (best.p / 100);
      mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      remainingN -= amount * (best.n / 100);
      remainingK -= amount * (best.k / 100);
    }
  }

  // 3. Add nitrogen if needed
  if (remainingN > (isOrganik ? 0.5 : 5)) {
    const nProducts = products
      .filter((p) => p.n > nThreshold && p.p <= pThreshold && p.k <= kThreshold)
      .sort((a, b) => b.n - a.n);
    if (nProducts.length > 0) {
      const best = nProducts[0];
      const amount = remainingN / (best.n / 100);
      mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
      remainingK -= amount * (best.k / 100);
    }
  }

  // 4. Add potassium if needed
  if (remainingK > (isOrganik ? 0.5 : 5)) {
    const kProducts = products.filter((p) => p.k > kThreshold).sort((a, b) => b.k - a.k);
    if (kProducts.length > 0) {
      const best = kProducts[0];
      const amount = remainingK / (best.k / 100);
      mix.push({ urun: best.ad, miktar: Math.round(amount), fiyat: Math.round(amount * best.fiyat_kg) });
    }
  }

  return mix;
}

export function calculate(state: WizardState): CalcResult {
  const crop = CROP_NUTRIENT_DB[state.urun];
  if (!crop || !state.toprak) throw new Error('Eksik veri');

  const senaryoCarpan =
    state.senaryo === 'tutucu' ? 0.80 : state.senaryo === 'agresif' ? 1.20 : 1.0;

  const ihtiyac = {
    n:    crop.n    * (state.hedef_verim * 10) * senaryoCarpan,
    p2o5: crop.p2o5 * (state.hedef_verim * 10) * senaryoCarpan,
    k2o:  crop.k2o  * (state.hedef_verim * 10) * senaryoCarpan,
  };

  // FAO referans: 1% organik madde ≈ 2 kg N/dekar/yıl
  const omPct = state.toprak.organik_madde ?? 0;
  const omMineralize_N_perDekar = omPct * 2.0;
  const etkinToprakN = state.toprak.n + omMineralize_N_perDekar;

  const eksik = {
    n:    Math.max(0, ihtiyac.n    - etkinToprakN),
    p2o5: Math.max(0, ihtiyac.p2o5 - state.toprak.p2o5),
    k2o:  Math.max(0, ihtiyac.k2o  - state.toprak.k2o),
  };

  const verimFaktor = state.hedef_verim * 10;
  const mikroIhtiyac = {
    fe: +(crop.fe * verimFaktor).toFixed(2),
    zn: +(crop.zn * verimFaktor).toFixed(3),
    mn: +(crop.mn * verimFaktor).toFixed(3),
    b:  +(crop.b  * verimFaktor).toFixed(3),
  };

  const oneriler = {
    kimyasal: calculateFertilizerMix(eksik, 'kimyasal'),
    organik:  calculateFertilizerMix(eksik, 'organik'),
  };

  const chartData = [
    { name: 'Azot (N)',       ihtiyac: +ihtiyac.n.toFixed(1),    toprak: state.toprak.n,    eksik: +eksik.n.toFixed(1)    },
    { name: 'Fosfor (P₂O₅)', ihtiyac: +ihtiyac.p2o5.toFixed(1), toprak: state.toprak.p2o5, eksik: +eksik.p2o5.toFixed(1) },
    { name: 'Potasyum (K₂O)',ihtiyac: +ihtiyac.k2o.toFixed(1),  toprak: state.toprak.k2o,  eksik: +eksik.k2o.toFixed(1)  },
  ];

  const uygulama_takvimi = [
    {
      donem: 'İlk Gelişim',
      hafta: '0-4',
      n: Math.round(eksik.n    * crop.stage_early / 100),
      p: Math.round(eksik.p2o5 * 0.7),
      k: Math.round(eksik.k2o  * crop.stage_early / 100),
      notlar: 'Ekimle birlikte taban gübresi',
    },
    {
      donem: 'Gelişme/Çiçeklenme',
      hafta: '4-10',
      n: Math.round(eksik.n    * crop.stage_mid / 100),
      p: Math.round(eksik.p2o5 * 0.3),
      k: Math.round(eksik.k2o  * crop.stage_mid / 100),
      notlar: 'Üst gübreleme (2-3 parselde)',
    },
    {
      donem: 'Meyve/Olgunlaşma',
      hafta: '10-16',
      n: Math.round(eksik.n   * crop.stage_late / 100),
      p: 0,
      k: Math.round(eksik.k2o * crop.stage_late / 100),
      notlar: 'Kalite için potasyum ağırlıklı',
    },
  ];

  let ph_uyari: string | undefined;
  if (state.toprak.ph < crop.ph_min) {
    ph_uyari = `⚠️ Toprak pH değeri düşük (${state.toprak.ph}). Kireçleme önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
  } else if (state.toprak.ph > crop.ph_max) {
    ph_uyari = `⚠️ Toprak pH değeri yüksek (${state.toprak.ph}). Kükürt uygulaması önerilir (hedef: ${crop.ph_min}-${crop.ph_max})`;
  }

  return {
    ihtiyac,
    eksik,
    mikroIhtiyac,
    alan: state.alan,
    oneriler,
    uygulama_takvimi,
    toplam_maliyet_kimyasal: oneriler.kimyasal.reduce((sum, x) => sum + x.fiyat, 0) * state.alan,
    toplam_maliyet_organik:  oneriler.organik.reduce((sum, x) => sum + x.fiyat, 0) * state.alan,
    ph_uyari,
    chartData,
  };
}

export function calcConfidenceScore(toprak: SoilAnalysis | null): number {
  if (!toprak) return 15;
  const { n, p2o5, k2o, ph, organik_madde } = toprak;
  let score = 40;
  if (n > 0)             score += 12;
  if (p2o5 > 0)          score += 12;
  if (k2o > 0)           score += 12;
  if (ph > 0)            score += 12;
  if (organik_madde > 0) score += 12;
  return Math.min(100, score);
}
