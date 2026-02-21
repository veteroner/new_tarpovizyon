import type { NutrientRequirement, InfeasibilityDiagnostic } from '@/types'

/**
 * Analyze infeasibility and generate diagnostic suggestions
 * @param requirements - Target nutrition requirements
 * @param final - Final solution totals
 * @param notes - Solver notes
 * @returns Array of infeasibility diagnostics with suggestions
 */
export function analyzeInfeasibility(
  requirements: NutrientRequirement,
  final: {
    meMcal: number
    cpGrams: number
    dmiKg: number
  },
  notes: string[],
  opts?: {
    dmiLowerKg?: number
    dmiUpperKg?: number
  }
): InfeasibilityDiagnostic[] {
  const diagnostics: InfeasibilityDiagnostic[] = []

  // Energy deficit
  if (final.meMcal < requirements.meMcal) {
    const deficit = requirements.meMcal - final.meMcal
    const deficitPercent = (deficit / requirements.meMcal) * 100

    diagnostics.push({
      constraintType: 'energy',
      constraintLabel: 'Enerji (ME)',
      current: final.meMcal,
      target: requirements.meMcal,
      deficit,
      severity: deficitPercent > 20 ? 'critical' : deficitPercent > 10 ? 'major' : 'minor',
      suggestion:
        deficitPercent > 20
          ? 'Kritik enerji eksikliği! Konsantre yem oranını artırın veya enerji yoğunluğu yüksek yemler ekleyin (mısır, buğday).'
          : 'Enerji yoğunluğu yüksek yemler ekleyin veya miktarlarını artırın.',
    })
  }

  // Protein deficit
  if (final.cpGrams < requirements.cpGrams) {
    const deficit = requirements.cpGrams - final.cpGrams
    const deficitPercent = (deficit / requirements.cpGrams) * 100

    diagnostics.push({
      constraintType: 'protein',
      constraintLabel: 'Ham Protein (CP)',
      current: final.cpGrams,
      target: requirements.cpGrams,
      deficit,
      severity: deficitPercent > 20 ? 'critical' : deficitPercent > 10 ? 'major' : 'minor',
      suggestion:
        deficitPercent > 20
          ? 'Kritik protein eksikliği! Protein kaynağı yemler ekleyin (soya küspesi, pamuk tohumu küspesi, kanola küspesi).'
          : 'Protein içeriği yüksek yemler ekleyin veya miktarlarını artırın.',
    })
  }

  // DMI over limit (use tolerance-aware bounds when provided)
  const dmiUpper = typeof opts?.dmiUpperKg === 'number' ? opts.dmiUpperKg : requirements.dmiKg
  if (final.dmiKg > dmiUpper) {
    const excess = final.dmiKg - dmiUpper
    const denom = Math.max(0.1, dmiUpper)
    const excessPercent = (excess / denom) * 100

    diagnostics.push({
      constraintType: 'dmi',
      constraintLabel: 'Kuru Madde Tüketimi (DMI)',
      current: final.dmiKg,
      target: dmiUpper,
      deficit: -excess, // negative = excess
      severity: excessPercent > 15 ? 'critical' : excessPercent > 10 ? 'major' : 'minor',
      suggestion:
        'DMI üst sınırı aşıldı. Hayvan bu kadar yem tüketemez. Enerji yoğunluğu yüksek ancak hacmi düşük yemler tercih edin (konsantre oranı artırın).',
    })
  }

  // Check for constraint conflicts mentioned in notes
  const ndfIssue = notes.some((n) => n.toLowerCase().includes('ndf'))
  const starchIssue = notes.some((n) => n.toLowerCase().includes('nişasta'))
  const fatIssue = notes.some((n) => n.toLowerCase().includes('yağ'))
  const caPIssue = notes.some((n) => n.toLowerCase().includes('ca:p'))
  const dcadIssue = notes.some((n) => n.toLowerCase().includes('dcad'))

  if (ndfIssue) {
    diagnostics.push({
      constraintType: 'ndf',
      constraintLabel: 'NDF (Lif)',
      current: 0,
      target: 0,
      deficit: 0,
      severity: 'major',
      suggestion:
        'NDF hedefleri karşılanamadı. Kaba yem oranını kontrol edin. Yeterli lif için kuru ot, silaj gibi kaba yemler ekleyin.',
    })
  }

  if (starchIssue) {
    diagnostics.push({
      constraintType: 'starch',
      constraintLabel: 'Nişasta',
      current: 0,
      target: 0,
      deficit: 0,
      severity: 'major',
      suggestion:
        'Nişasta limiti aşıldı. Tahıl bazlı yemlerden (mısır, arpa) miktarını azaltın veya başka enerji kaynakları (bit küspesi, pulp) kullanın.',
    })
  }

  if (fatIssue) {
    diagnostics.push({
      constraintType: 'fat',
      constraintLabel: 'Yağ',
      current: 0,
      target: 0,
      deficit: 0,
      severity: 'major',
      suggestion:
        'Yağ limiti aşıldı. Yağlı tohumlar (pamuk tohumu, soya) ve yağ katkılarını azaltın.',
    })
  }

  if (caPIssue) {
    diagnostics.push({
      constraintType: 'cap',
      constraintLabel: 'Ca:P Oranı',
      current: 0,
      target: 0,
      deficit: 0,
      severity: 'critical',
      suggestion:
        'Ca:P oranı kritik seviyede! Kalsiyum ve fosfor kaynaklarını dengeleyecek mineral karışım kullanın.',
    })
  }

  if (dcadIssue) {
    diagnostics.push({
      constraintType: 'dcad',
      constraintLabel: 'DCAD (Katyon-Anyon Dengesi)',
      current: 0,
      target: 0,
      deficit: 0,
      severity: 'critical',
      suggestion:
        'DCAD hedefi sağlanamadı. Kuru dönem yemlerinde anyon tuzlar (MgSO4, CaCl2) kullanarak DCAD\'ı düşürün.',
    })
  }

  return diagnostics
}
