/**
 * Risk Warning Formatter
 * Converts risk warning codes to user-friendly Turkish messages
 */

import type { RiskWarning, RiskWarningCode } from '@/types/risk'

const WARNING_MESSAGES: Record<RiskWarningCode, (w: RiskWarning) => string> = {
  ACIDOSIS_HIGH: () => '⚠️ Yüksek asidoz riski',
  KETOSIS_HIGH: () => '⚠️ Yüksek ketozis riski',
  BLOAT_HIGH: () => '⚠️ Timpani riski',
  MINERAL_IMBALANCE: () => '⚠️ Mineral dengesizlik',
  MILK_FAT_DEPRESSION: () => '⚠️ Süt yağı düşük olabilir',

  CA_P_RATIO_LOW: (w) => {
    const ratio = w.value?.toFixed(2) ?? '?'
    const min = typeof w.context?.targetMin === 'number' ? w.context.targetMin : undefined
    const max = typeof w.context?.targetMax === 'number' ? w.context.targetMax : undefined
    const targetText =
      typeof min === 'number' && typeof max === 'number' ? ` (hedef: ${min.toFixed(2)}–${max.toFixed(2)})` : ''
    return `⚠️ Ca:P düşük (${ratio}) – Ca artırma/P azaltma gerekebilir${targetText}`
  },

  CA_P_RATIO_HIGH: (w) => {
    const ratio = w.value?.toFixed(2) ?? '?'
    const min = typeof w.context?.targetMin === 'number' ? w.context.targetMin : undefined
    const max = typeof w.context?.targetMax === 'number' ? w.context.targetMax : undefined
    const targetText =
      typeof min === 'number' && typeof max === 'number' ? ` (hedef: ${min.toFixed(2)}–${max.toFixed(2)})` : ''
    return `⚠️ Ca:P yüksek (${ratio}) – P artırma/Ca azaltma gerekebilir${targetText}`
  },

  DCAD_HIGH: (w) => {
    const dcad = w.value?.toFixed(0) ?? '?'
    const targetMin = typeof w.context?.targetMin === 'number' ? w.context.targetMin : undefined
    const targetMax = typeof w.context?.targetMax === 'number' ? w.context.targetMax : undefined
    const target = typeof w.context?.target === 'number' ? w.context.target : undefined

    const prefersLowerDcad = typeof target === 'number' && target <= 80
    const hint = prefersLowerDcad
      ? ' – anyonik mineral/anyon tuz programı gerekebilir'
      : ' – Na/K dengesi ve mineral programı kontrol edilmeli'

    const targetText =
      typeof targetMin === 'number' && typeof targetMax === 'number'
        ? ` (hedef: ${targetMin.toFixed(0)}–${targetMax.toFixed(0)})`
        : ''

    return `⚠️ DCAD yüksek (${dcad})${hint}${targetText}`
  },

  DCAD_LOW: (w) => {
    const dcad = w.value?.toFixed(0) ?? '?'
    const targetMin = typeof w.context?.targetMin === 'number' ? w.context.targetMin : undefined
    const targetMax = typeof w.context?.targetMax === 'number' ? w.context.targetMax : undefined
    const target = typeof w.context?.target === 'number' ? w.context.target : undefined

    const prefersHigherDcad = typeof target === 'number' && target >= 150
    const hint = prefersHigherDcad
      ? ' – tampon/Na-K desteği gerekebilir'
      : ' – aşırı asidifikasyon riski olabilir'

    const targetText =
      typeof targetMin === 'number' && typeof targetMax === 'number'
        ? ` (hedef: ${targetMin.toFixed(0)}–${targetMax.toFixed(0)})`
        : ''

    return `⚠️ DCAD düşük (${dcad})${hint}${targetText}`
  },
}

export function formatRiskWarning(warning: RiskWarning): string {
  const formatter = WARNING_MESSAGES[warning.code]
  if (!formatter) {
    console.warn(`Unknown risk warning code: ${warning.code}`)
    return `⚠️ Bilinmeyen risk: ${warning.code}`
  }
  return formatter(warning)
}

export function formatRiskWarnings(warnings: RiskWarning[]): string[] {
  return warnings.map(formatRiskWarning)
}
