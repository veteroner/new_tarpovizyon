import type { AnalysisSource, FeedLot } from '@/types/inventory'

export type ParsedAnalysis = {
  lots: Array<Pick<FeedLot,
    | 'feedId'
    | 'feedName'
    | 'lotNumber'
    | 'analysisSource'
    | 'analysisDate'
    | 'dmPercent'
    | 'meMcalPerKg'
    | 'cpPercent'
    | 'ndfPercent'
    | 'caPercent'
    | 'pPercent'
    | 'initialQuantityKg'
    | 'remainingQuantityKg'
    | 'expirationDate'
    | 'labName'
  >>
  errors: string[]
  warnings: string[]
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
}

function detectDelimiter(line: string): string {
  const candidates = [';', ',', '\t']
  const counts = candidates.map((d) => ({ d, c: (line.match(new RegExp(d === '\t' ? '\\t' : `\\${d}`, 'g')) || []).length }))
  counts.sort((a, b) => b.c - a.c)
  return counts[0]?.c ? counts[0].d : ';'
}

function splitDelimited(line: string, delimiter: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && ch === delimiter) {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out.map((s) => s.trim())
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (!normalized) return undefined
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

function parseDateISO(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  if (!s) return undefined
  // allow YYYY-MM-DD; store as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function parseAnalysisSource(raw: string | undefined, fallback: AnalysisSource): AnalysisSource {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'lab' || v === 'laboratuvar') return 'lab'
  if (v === 'nir') return 'nir'
  if (v === 'user' || v === 'user-input' || v === 'kullanici' || v === 'kullanıcı') return 'user-input'
  if (v === 'table' || v === 'tablo') return 'table'
  return fallback
}

export function parseAnalysisCsv(text: string, options?: { defaultSource?: AnalysisSource }): ParsedAnalysis {
  const errors: string[] = []
  const warnings: string[] = []
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return { lots: [], errors: ['CSV boş görünüyor'], warnings }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return { lots: [], errors: ['CSV en az 1 satır veri içermeli'], warnings }

  const delimiter = detectDelimiter(lines[0])
  const header = splitDelimited(lines[0], delimiter).map(normalizeHeaderKey)
  const col = new Map<string, number>()
  header.forEach((h, idx) => col.set(h, idx))

  const get = (row: string[], ...keys: string[]): string | undefined => {
    for (const key of keys) {
      const i = col.get(normalizeHeaderKey(key))
      if (i != null && i >= 0 && i < row.length) return row[i]
    }
    return undefined
  }

  const hasFeedId = col.has('feedid') || col.has('id')
  const hasFeedName = col.has('feedname') || col.has('yemadi') || col.has('name') || col.has('yem')
  if (!hasFeedId && !hasFeedName) {
    errors.push('CSV başlığında feedId veya feedName (yem adı) kolonu yok')
    return { lots: [], errors, warnings }
  }

  const required = [
    ['dmpercent', 'dm%'],
    ['memcalperkg', 'me'],
    ['cppercent', 'cp%'],
    ['ndfpercent', 'ndf%'],
    ['capercent', 'ca%'],
    ['ppercent', 'p%'],
  ]

  for (const [a, b] of required) {
    if (!col.has(a) && !col.has(normalizeHeaderKey(b))) {
      warnings.push(`Kolon eksik olabilir: ${a}`)
    }
  }

  const lots: ParsedAnalysis['lots'] = []
  const defaultSource = options?.defaultSource ?? 'lab'

  lines.slice(1).forEach((line, idx) => {
    const row = splitDelimited(line, delimiter)

    const feedId = (get(row, 'feedId', 'id') ?? '').trim()
    const feedName = (get(row, 'feedName', 'name', 'yem', 'yemAdi', 'yemadı') ?? '').trim()

    const lotNumber = (get(row, 'lotNumber', 'lot', 'batch', 'parti', 'partino') ?? '').trim() || `LOT-${idx + 1}`
    const source = parseAnalysisSource(get(row, 'analysisSource', 'source', 'kaynak'), defaultSource)
    const analysisDate = parseDateISO(get(row, 'analysisDate', 'date', 'tarih')) ?? new Date().toISOString().slice(0, 10)
    const expirationDate = parseDateISO(get(row, 'expirationDate', 'skt', 'expiry', 'exp'))
    const labName = (get(row, 'labName', 'lab', 'laboratuvar') ?? '').trim() || undefined

    const dmPercent = parseNumber(get(row, 'dmPercent', 'dm'))
    const meMcalPerKg = parseNumber(get(row, 'meMcalPerKg', 'me'))
    const cpPercent = parseNumber(get(row, 'cpPercent', 'cp', 'hp'))
    const ndfPercent = parseNumber(get(row, 'ndfPercent', 'ndf'))
    const caPercent = parseNumber(get(row, 'caPercent', 'ca'))
    const pPercent = parseNumber(get(row, 'pPercent', 'p'))

    const qty = parseNumber(get(row, 'quantityKg', 'qtykg', 'miktarkg', 'miktar'))

    const rowLabel = feedId || feedName || `satır ${idx + 2}`

    if (!feedId && !feedName) {
      errors.push(`${rowLabel}: feedId veya feedName boş`) 
      return
    }

    if ([dmPercent, meMcalPerKg, cpPercent, ndfPercent, caPercent, pPercent].some((v) => v == null)) {
      errors.push(`${rowLabel}: zorunlu analiz alanları eksik veya sayı değil (dm, me, cp, ndf, ca, p)`) 
      return
    }

    const quantityKg = qty ?? 0
    if (!qty) warnings.push(`${rowLabel}: quantityKg yok; 0 kabul edildi`)

    lots.push({
      feedId,
      feedName,
      lotNumber,
      analysisSource: source,
      analysisDate: new Date(`${analysisDate}T00:00:00.000Z`).toISOString(),
      labName,
      dmPercent: dmPercent!,
      meMcalPerKg: meMcalPerKg!,
      cpPercent: cpPercent!,
      ndfPercent: ndfPercent!,
      caPercent: caPercent!,
      pPercent: pPercent!,
      initialQuantityKg: quantityKg,
      remainingQuantityKg: quantityKg,
      expirationDate,
    })
  })

  return { lots, errors, warnings }
}
