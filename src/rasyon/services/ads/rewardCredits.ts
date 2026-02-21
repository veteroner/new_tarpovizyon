const STORAGE_KEYS = {
  exportCredits: 'rewarded_export_credits',
  aiCredits: 'rewarded_ai_credits',
  creditsDate: 'rewarded_credits_date',
} as const

const DEFAULTS = {
  exportCredits: 3,
  aiCredits: 2,
} as const

function todayKey(): string {
  // Local date in YYYY-MM-DD, stable for "daily" semantics.
  return new Date().toISOString().slice(0, 10)
}

function ensureDailyReset() {
  const today = todayKey()
  const stored = localStorage.getItem(STORAGE_KEYS.creditsDate)
  if (stored === today) return

  localStorage.setItem(STORAGE_KEYS.creditsDate, today)
  localStorage.setItem(STORAGE_KEYS.exportCredits, String(DEFAULTS.exportCredits))
  localStorage.setItem(STORAGE_KEYS.aiCredits, String(DEFAULTS.aiCredits))
}

function readInt(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function writeInt(key: string, value: number) {
  localStorage.setItem(key, String(Math.max(0, Math.trunc(value))))
}

function getOrInit(key: string, initial: number): number {
  ensureDailyReset()
  if (localStorage.getItem(key) == null) {
    writeInt(key, initial)
    return initial
  }
  return readInt(key, initial)
}

export function getExportCredits(): number {
  return getOrInit(STORAGE_KEYS.exportCredits, DEFAULTS.exportCredits)
}

export function hasExportCredits(): boolean {
  return getExportCredits() > 0
}

export function grantExportCredits(amount: number): number {
  const current = getExportCredits()
  const next = current + Math.max(0, Math.trunc(amount))
  writeInt(STORAGE_KEYS.exportCredits, next)
  return next
}

export function consumeExportCredit(): number {
  const current = getExportCredits()
  const next = Math.max(0, current - 1)
  writeInt(STORAGE_KEYS.exportCredits, next)
  return next
}

export function getAiCredits(): number {
  return getOrInit(STORAGE_KEYS.aiCredits, DEFAULTS.aiCredits)
}

export function hasAiCredits(): boolean {
  return getAiCredits() > 0
}

export function grantAiCredits(amount: number): number {
  const current = getAiCredits()
  const next = current + Math.max(0, Math.trunc(amount))
  writeInt(STORAGE_KEYS.aiCredits, next)
  return next
}

export function consumeAiCredit(): number {
  const current = getAiCredits()
  const next = Math.max(0, current - 1)
  writeInt(STORAGE_KEYS.aiCredits, next)
  return next
}
