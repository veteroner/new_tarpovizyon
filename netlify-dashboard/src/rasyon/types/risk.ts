/**
 * Risk Warning Type System
 * Separates risk detection (engine) from risk presentation (UI)
 */

export type RiskSeverity = 'low' | 'moderate' | 'high' | 'critical'

export type RiskWarningCode =
  | 'ACIDOSIS_HIGH'
  | 'KETOSIS_HIGH'
  | 'BLOAT_HIGH'
  | 'MINERAL_IMBALANCE'
  | 'MILK_FAT_DEPRESSION'
  | 'CA_P_RATIO_LOW'
  | 'CA_P_RATIO_HIGH'
  | 'DCAD_HIGH'
  | 'DCAD_LOW'

export interface RiskWarning {
  code: RiskWarningCode
  severity: RiskSeverity
  value?: number
  context?: Record<string, string | number>
}

export interface RiskScore {
  overall: number
  acidosis: number
  ketosis: number
  bloat: number
  mineralImbalance: number
  milkFatDepression: number
  warnings: RiskWarning[]
  severity: RiskSeverity
}
