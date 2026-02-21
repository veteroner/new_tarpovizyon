/**
 * Protein fractions and metabolizable protein (MP) utilities for dairy and beef
 *
 * Implements RDP (Rumen Degradable Protein), RUP (Rumen Undegradable Protein),
 * and MP (Metabolizable Protein) accounting for NRC 2021 / CNCPS-style systems.
 *
 * Key concepts:
 * - CP = RDP + RUP (crude protein partitioning)
 * - RDP → microbial crude protein (MCP) in the rumen
 * - RUP → intestinally available protein
 * - MP = MCP + digestible RUP + endogenous protein
 *
 * References:
 * - NRC 2021 Dairy Cattle (Chapter 3, Protein)
 * - CNCPS v6.5 protein fractions
 */

export interface ProteinFractions {
  cpPercent: number
  rdpPercent: number // % of CP that degrades in rumen
  rupPercent: number // % of CP that escapes rumen (1 - RDP%)
  rupDigestibilityPercent: number // Intestinal digestibility of RUP
}

/**
 * Default RDP/RUP breakdown for common feed categories when not specified.
 * Based on NRC 2021 and feed composition tables.
 */
export const DEFAULT_PROTEIN_FRACTIONS: Record<string, { rdpPct: number; rupDigPct: number }> = {
  // Forages (most CP degrades in rumen, lower RUP digestibility)
  'alfalfa-hay': { rdpPct: 75, rupDigPct: 65 },
  'grass-hay': { rdpPct: 70, rupDigPct: 60 },
  silage: { rdpPct: 72, rupDigPct: 62 },
  straw: { rdpPct: 60, rupDigPct: 50 },

  // Grains (moderate RDP, good RUP digestibility)
  corn: { rdpPct: 55, rupDigPct: 85 },
  barley: { rdpPct: 70, rupDigPct: 80 },
  wheat: { rdpPct: 75, rupDigPct: 82 },
  oats: { rdpPct: 80, rupDigPct: 78 },

  // Protein meals (lower RDP = more bypass protein, high RUP digestibility)
  'soybean-meal': { rdpPct: 65, rupDigPct: 90 },
  'canola-meal': { rdpPct: 70, rupDigPct: 85 },
  'cottonseed-meal': { rdpPct: 60, rupDigPct: 75 },
  'sunflower-meal': { rdpPct: 70, rupDigPct: 80 },
  'distillers-grains': { rdpPct: 50, rupDigPct: 80 },

  // By-products
  'wheat-bran': { rdpPct: 75, rupDigPct: 75 },
  'beet-pulp': { rdpPct: 60, rupDigPct: 70 },
  'brewers-grains': { rdpPct: 65, rupDigPct: 75 },

  // Generic fallback (moderate estimates)
  forage: { rdpPct: 70, rupDigPct: 60 },
  concentrate: { rdpPct: 65, rupDigPct: 80 },
  mineral: { rdpPct: 0, rupDigPct: 0 },
}

/**
 * Estimate RDP and RUP percentages of CP for a feed.
 * Uses feed-specific lookup or category fallback.
 */
export function estimateProteinFractions(feed: {
  id: string
  name: string
  category: string
  cpPercent: number
  rdpPercent?: number
  rupPercent?: number
  rupDigestibilityPercent?: number
}): ProteinFractions {
  const cpPct = feed.cpPercent

  // Use explicit values if provided
  if (
    typeof feed.rdpPercent === 'number' &&
    typeof feed.rupPercent === 'number' &&
    typeof feed.rupDigestibilityPercent === 'number'
  ) {
    return {
      cpPercent: cpPct,
      rdpPercent: feed.rdpPercent,
      rupPercent: feed.rupPercent,
      rupDigestibilityPercent: feed.rupDigestibilityPercent,
    }
  }

  // Lookup by feed name or ID (simplified matching)
  const key = feed.name.toLowerCase().replace(/\s+/g, '-')
  const match = DEFAULT_PROTEIN_FRACTIONS[key] || DEFAULT_PROTEIN_FRACTIONS[feed.id.toLowerCase()]

  if (match) {
    return {
      cpPercent: cpPct,
      rdpPercent: match.rdpPct,
      rupPercent: 100 - match.rdpPct,
      rupDigestibilityPercent: match.rupDigPct,
    }
  }

  // Category fallback
  const categoryFallback = DEFAULT_PROTEIN_FRACTIONS[feed.category.toLowerCase()]
  if (categoryFallback) {
    return {
      cpPercent: cpPct,
      rdpPercent: categoryFallback.rdpPct,
      rupPercent: 100 - categoryFallback.rdpPct,
      rupDigestibilityPercent: categoryFallback.rupDigPct,
    }
  }

  // Ultimate fallback: moderate values
  return {
    cpPercent: cpPct,
    rdpPercent: 65,
    rupPercent: 35,
    rupDigestibilityPercent: 75,
  }
}

/**
 * Calculate microbial crude protein (MCP) from RDP supply.
 *
 * Microbial protein synthesis depends on:
 * - RDP availability (g/day)
 * - Energy availability (ME or TDN, Mcal/day)
 * - Efficiency (g MCP per Mcal or g MCP per g RDP, whichever is limiting)
 *
 * NRC 2021 approach (simplified):
 * - MCP from energy = ME × 130 g/Mcal (energy-driven)
 * - MCP from RDP = RDP × 0.85 (assuming 85% conversion efficiency)
 * - Take the minimum (limiting factor)
 *
 * @param rdpGrams - RDP supplied in diet (g/day)
 * @param meMcal - Metabolizable energy supplied (Mcal/day)
 * @returns Microbial crude protein produced (g/day)
 */
export function calculateMicrobialCrudeProtein(rdpGrams: number, meMcal: number): number {
  const mcpFromEnergy = meMcal * 130 // g MCP per Mcal ME
  const mcpFromRdp = rdpGrams * 0.85 // 85% conversion efficiency

  // Limiting factor
  return Math.min(mcpFromEnergy, mcpFromRdp)
}

/**
 * Calculate MP (Metabolizable Protein) from diet totals.
 *
 * MP = digestible MCP + digestible RUP + endogenous protein
 *
 * Assumptions (NRC 2021 simplified):
 * - MCP digestibility: 80%
 * - RUP digestibility: feed-specific (passed as parameter)
 * - Endogenous protein: ~1.9 × DMI (g/day) (scurf + urinary + fecal)
 *
 * @param mcpGrams - Microbial crude protein (g/day)
 * @param rupGrams - RUP supplied (g/day)
 * @param rupDigestibility - Weighted average RUP intestinal digestibility (%)
 * @param dmiKg - Dry matter intake (kg/day)
 * @returns Metabolizable protein (g/day)
 */
export function calculateMetabolizableProtein(
  mcpGrams: number,
  rupGrams: number,
  rupDigestibility: number,
  dmiKg: number
): number {
  const mcpDigestible = mcpGrams * 0.8 // 80% digestibility of MCP
  const rupDigestible = rupGrams * (rupDigestibility / 100)
  const endogenous = dmiKg * 1.9 // Endogenous protein contribution

  return mcpDigestible + rupDigestible + endogenous
}

/**
 * Calculate total RDP, RUP, and resulting MP from a diet.
 *
 * @param feeds - Array of feeds with amounts (kgDM/day) and protein fractions
 * @param totalMeMcal - Total ME supplied by the diet (Mcal/day)
 * @param totalDmiKg - Total DMI (kg/day)
 * @returns Object with RDP, RUP, MCP, and MP totals (g/day)
 */
export function calculateDietProteinFractions(
  feeds: Array<{
    feed: {
      id: string
      name: string
      category: string
      cpPercent: number
      rdpPercent?: number
      rupPercent?: number
      rupDigestibilityPercent?: number
    }
    kgDmPerDay: number
  }>,
  totalMeMcal: number,
  totalDmiKg: number
): {
  rdpGrams: number
  rupGrams: number
  mcpGrams: number
  mpGrams: number
  rupDigestibilityPercent: number
} {
  let totalRdp = 0
  let totalRup = 0
  let totalRupWeightedDig = 0

  for (const { feed, kgDmPerDay } of feeds) {
    const fractions = estimateProteinFractions(feed)
    const cpGramsFromFeed = (fractions.cpPercent / 100) * kgDmPerDay * 1000

    const rdpGramsFromFeed = cpGramsFromFeed * (fractions.rdpPercent / 100)
    const rupGramsFromFeed = cpGramsFromFeed * (fractions.rupPercent / 100)

    totalRdp += rdpGramsFromFeed
    totalRup += rupGramsFromFeed
    totalRupWeightedDig += rupGramsFromFeed * fractions.rupDigestibilityPercent
  }

  const avgRupDig = totalRup > 0 ? totalRupWeightedDig / totalRup : 75

  const mcpGrams = calculateMicrobialCrudeProtein(totalRdp, totalMeMcal)
  const mpGrams = calculateMetabolizableProtein(mcpGrams, totalRup, avgRupDig, totalDmiKg)

  return {
    rdpGrams: totalRdp,
    rupGrams: totalRup,
    mcpGrams,
    mpGrams,
    rupDigestibilityPercent: avgRupDig,
  }
}
