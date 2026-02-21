/**
 * Livestock Insight Generation
 * Auto-generate intelligence insights from livestock data
 */

import type { Insight } from '../components/InsightCard';

export interface InsightGeneratorInput {
  cagrData?: Array<{ country: string; cagr: number; product?: string }>;
  hhiData?: { hhi: number; top1Share: number; top1Country?: string };
  volatilityData?: Array<{ country: string; volatility: number }>;
  anomalies?: Array<{ year: string; country: string; zScore: number; type: string }>;
  rankChanges?: Array<{ country: string; rank2020: number; rank2024: number }>;
  efficiencyLeaders?: Array<{ country: string; efficiency: number; product: string }>;
}

export function generateLivestockInsights(input: InsightGeneratorInput): Insight[] {
  const insights: Insight[] = [];
  let idCounter = 0;

  // CAGR Insights
  if (input.cagrData && input.cagrData.length > 0) {
    const topGrowers = input.cagrData.filter(d => d.cagr > 5).slice(0, 3);
    const declining = input.cagrData.filter(d => d.cagr < -3).slice(0, 2);

    topGrowers.forEach(g => {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'growth',
        message: `${g.country}${g.product ? ` ${g.product}` : ''} üretimi son 5 yılda %${g.cagr.toFixed(1)} CAGR ile büyüdü - Dünya ortalamasının ${(g.cagr / 2).toFixed(1)} katı`,
        severity: g.cagr > 10 ? 'high' : 'medium',
        category: 'BÜYÜME'
      });
    });

    declining.forEach(d => {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'decline',
        message: `${d.country}${d.product ? ` ${d.product}` : ''} üretimi %${Math.abs(d.cagr).toFixed(1)} düşüş trendinde - ${Math.abs(d.cagr) > 5 ? 'Kritik seviye' : 'Dikkat edilmeli'}`,
        severity: Math.abs(d.cagr) > 5 ? 'high' : 'medium',
        category: 'DÜŞÜŞ'
      });
    });
  }

  // HHI Concentration Insights
  if (input.hhiData) {
    const { hhi, top1Share, top1Country } = input.hhiData;
    
    if (hhi > 2500) {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'warning',
        message: `Pazar konsantrasyonu çok yüksek (HHI: ${hhi.toFixed(0)}) - ${top1Country ? `${top1Country} dominant oyuncu` : 'Tekel riski var'} (Pay: %${top1Share.toFixed(1)})`,
        severity: 'high',
        category: 'RİSK'
      });
    } else if (hhi > 1500) {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'info',
        message: `Orta seviye pazar konsantrasyonu (HHI: ${hhi.toFixed(0)}) - ${top1Country ? `${top1Country} lider` : 'Rekabet dengeli'} (%${top1Share.toFixed(1)} pay)`,
        severity: 'medium',
        category: 'PAZAR'
      });
    }
  }

  // Volatility Insights
  if (input.volatilityData && input.volatilityData.length > 0) {
    const volatile = input.volatilityData.filter(v => v.volatility > 25).slice(0, 2);
    
    volatile.forEach(v => {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'warning',
        message: `${v.country} üretimi yüksek volatilite gösteriyor (CV: %${v.volatility.toFixed(1)}) - Tedarik riski mevcut`,
        severity: v.volatility > 35 ? 'high' : 'medium',
        category: 'VOLATİLİTE'
      });
    });
  }

  // Anomaly Insights
  if (input.anomalies && input.anomalies.length > 0) {
    const recentAnomalies = input.anomalies.filter(a => 
      parseInt(a.year) >= new Date().getFullYear() - 3
    ).slice(0, 2);

    recentAnomalies.forEach(a => {
      insights.push({
        id: `insight-${idCounter++}`,
        type: a.type === 'SPIKE' ? 'info' : 'warning',
        message: `${a.country} ${a.year} yılında ${a.type === 'SPIKE' ? 'olağandışı artış' : 'keskin düşüş'} yaşadı (Z-score: ${a.zScore.toFixed(1)}) - ${a.type === 'SPIKE' ? 'İyi haber' : 'Araştırılmalı'}`,
        severity: Math.abs(a.zScore) > 3 ? 'high' : 'medium',
        category: 'ANOMALİ'
      });
    });
  }

  // Rank Change Insights
  if (input.rankChanges && input.rankChanges.length > 0) {
    const climbers = input.rankChanges
      .filter(r => r.rank2020 - r.rank2024 >= 3)
      .slice(0, 2);

    const fallers = input.rankChanges
      .filter(r => r.rank2024 - r.rank2020 >= 3)
      .slice(0, 2);

    climbers.forEach(c => {
      const jump = c.rank2020 - c.rank2024;
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'achievement',
        message: `${c.country} dünya sıralamasında ${jump} basamak yükseldi (#${c.rank2020} → #${c.rank2024}) - Güçlü performans`,
        severity: 'medium',
        category: 'SIRALAMA'
      });
    });

    fallers.forEach(f => {
      const drop = f.rank2024 - f.rank2020;
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'decline',
        message: `${f.country} sıralamada ${drop} basamak geriledi (#${f.rank2020} → #${f.rank2024}) - Rekabet kaybı`,
        severity: drop > 5 ? 'high' : 'medium',
        category: 'SIRALAMA'
      });
    });
  }

  // Efficiency Insights
  if (input.efficiencyLeaders && input.efficiencyLeaders.length > 0) {
    const topEfficient = input.efficiencyLeaders.slice(0, 2);
    
    topEfficient.forEach(e => {
      insights.push({
        id: `insight-${idCounter++}`,
        type: 'achievement',
        message: `${e.country} ${e.product} verimliliğinde dünya lideri - ${e.efficiency.toFixed(0)} ${e.product === 'milk' ? 'kg/hayvan' : e.product === 'eggs' ? 'adet/tavuk' : 'kg/hayvan'} ile en verimli üretici`,
        severity: 'medium',
        category: 'VERİMLİLİK'
      });
    });
  }

  // Sort by severity
  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}
