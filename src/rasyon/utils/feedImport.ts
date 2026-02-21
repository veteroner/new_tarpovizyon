import type { FeedCategory } from '@/types'
import type { NewFeedInput } from '@/store/feedStore'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null) return undefined
  const cleaned = value
    .trim()
    .replace(/,/g, '.')
    .replace(/[^0-9.+-]/g, '')
  if (cleaned.length === 0) return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  for (const v of values) {
    if (v !== undefined) return v
  }
  return undefined
}

function parseSeparatorLine(line: string): string[] {
  // Support common separators: ; , \t
  // If semicolons are present, prefer them (common in TR locales).
  const sep = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ','
  return line
    .split(sep)
    .map((s) => s.trim())
    .map((s) => s.replace(/^"|"$/g, ''))
}

export function parseCsvFeeds(text: string): {
  rows: Array<Record<string, string>>
  errors: string[]
} {
  const errors: string[] = []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return { rows: [], errors: ['CSV boş görünüyor'] }

  const header = parseSeparatorLine(lines[0]).map(normalizeKey)
  if (header.length < 2) return { rows: [], errors: ['CSV başlığı okunamadı (ayraç ; veya , olmalı)'] }

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseSeparatorLine(lines[i])
    const row: Record<string, string> = {}
    for (let c = 0; c < header.length; c += 1) {
      const key = header[c]
      if (!key) continue
      row[key] = cols[c] ?? ''
    }
    rows.push(row)
  }

  // Minimal schema check
  const hasName = header.some((h) => ['name', 'yem', 'yem adi', 'yem adı', 'feed'].includes(h))
  if (!hasName) errors.push('CSV başlığında yem adı kolonu yok (name/yem/yem adı)')

  return { rows, errors }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? toNumber(value) : undefined
  return n == null || !Number.isFinite(n) ? undefined : n
}

function toNewFeedInputLoose(
  obj: Record<string, unknown>,
  defaults: { category: FeedCategory; priceTLPerKg: number }
): { value?: NewFeedInput; error?: string } {
  const name = asString(obj.name) ?? asString(obj['yem']) ?? asString(obj['yem adı']) ?? asString(obj['yem adi'])
  if (!name || name.trim().length === 0) return { error: 'Yem adı boş' }

  const category = parseCategory(asString(obj.category) ?? asString(obj['kategori']), defaults.category)

  const dmPercent = asNumber(obj.dmPercent) ?? asNumber(obj.dm) ?? asNumber(obj['km']) ?? asNumber(obj['kuru madde'])
  const meMcalPerKg = asNumber(obj.meMcalPerKg) ?? asNumber(obj.me) ?? (asNumber(obj.meKcalPerKg) != null ? (asNumber(obj.meKcalPerKg)! / 1000) : undefined)
  const cpPercent = asNumber(obj.cpPercent) ?? asNumber(obj.cp) ?? asNumber(obj['hp'])
  const ndfPercent = asNumber(obj.ndfPercent) ?? asNumber(obj.ndf)
  const caPercent = asNumber(obj.caPercent) ?? asNumber(obj.ca)
  const pPercent = asNumber(obj.pPercent) ?? asNumber(obj.p)
  const priceTLPerKg = asNumber(obj.priceTLPerKg) ?? asNumber(obj.price) ?? asNumber(obj['fiyat']) ?? defaults.priceTLPerKg

  const dm = dmPercent ?? 88
  const me = meMcalPerKg

  if (me == null) return { error: 'ME eksik (meMcalPerKg veya meKcalPerKg)' }
  if (cpPercent == null) return { error: 'HP/CP % eksik' }
  if (ndfPercent == null) return { error: 'NDF % eksik' }
  if (caPercent == null) return { error: 'Ca % eksik' }
  if (pPercent == null) return { error: 'P % eksik' }

  return {
    value: {
      name: name.trim(),
      category,
      dmPercent: dm,
      meMcalPerKg: me,
      cpPercent,
      ndfPercent,
      caPercent,
      pPercent,
      priceTLPerKg,

      starchPercent: asNumber(obj.starchPercent) ?? asNumber(obj.starch) ?? asNumber(obj['nişasta']) ?? asNumber(obj['nisasta']),
      sugarPercent: asNumber(obj.sugarPercent) ?? asNumber(obj.sugar) ?? asNumber(obj['şeker']) ?? asNumber(obj['seker']),
      fatPercent: asNumber(obj.fatPercent) ?? asNumber(obj.fat) ?? asNumber(obj['yağ']) ?? asNumber(obj['yag']),

      mgPercent: asNumber(obj.mgPercent) ?? asNumber(obj.mg),
      naPercent: asNumber(obj.naPercent) ?? asNumber(obj.na),
      kPercent: asNumber(obj.kPercent) ?? asNumber(obj.k),
      sPercent: asNumber(obj.sPercent) ?? asNumber(obj.s),
      clPercent: asNumber(obj.clPercent) ?? asNumber(obj.cl),

      // Trace Minerals (ppm or mg/kg DM)
      fePpm: asNumber(obj.fePpm) ?? asNumber(obj.fe) ?? asNumber(obj['demir']),
      znPpm: asNumber(obj.znPpm) ?? asNumber(obj.zn) ?? asNumber(obj['çinko']) ?? asNumber(obj['cinko']),
      cuPpm: asNumber(obj.cuPpm) ?? asNumber(obj.cu) ?? asNumber(obj['bakır']) ?? asNumber(obj['bakir']),
      mnPpm: asNumber(obj.mnPpm) ?? asNumber(obj.mn) ?? asNumber(obj['mangan']),
      coPpm: asNumber(obj.coPpm) ?? asNumber(obj.co) ?? asNumber(obj['kobalt']),
      iPpm: asNumber(obj.iPpm) ?? asNumber(obj.i) ?? asNumber(obj['iyot']) ?? asNumber(obj['iodine']),
      sePpm: asNumber(obj.sePpm) ?? asNumber(obj.se) ?? asNumber(obj['selenyum']) ?? asNumber(obj['selenium']),

      // Vitamins (IU/kg or mg/kg DM)
      vitaminAIUPerKg: asNumber(obj.vitaminAIUPerKg) ?? asNumber(obj.vitA) ?? asNumber(obj['vitamin a']),
      vitaminDIUPerKg: asNumber(obj.vitaminDIUPerKg) ?? asNumber(obj.vitD) ?? asNumber(obj['vitamin d']),
      vitaminEIUPerKg: asNumber(obj.vitaminEIUPerKg) ?? asNumber(obj.vitE) ?? asNumber(obj['vitamin e']),
      vitaminKMgPerKg: asNumber(obj.vitaminKMgPerKg) ?? asNumber(obj.vitK) ?? asNumber(obj['vitamin k']),

      // Nutritional Constraints
      minInclusionPctOfDM: asNumber(obj.minInclusionPctOfDM) ?? asNumber(obj['min %dm']) ?? asNumber(obj['min inclusion']),
      maxInclusionPctOfDM: asNumber(obj.maxInclusionPctOfDM) ?? asNumber(obj['max %dm']) ?? asNumber(obj['max inclusion']),
      constraintReason: asString(obj.constraintReason) ?? asString(obj['limit nedeni']) ?? asString(obj['constraint reason']),

      description: asString(obj.description) ?? asString(obj['aciklama']) ?? asString(obj['açıklama']),
    },
  }
}

export function parseJsonFeedInputs(
  text: string,
  defaults: { category: FeedCategory; priceTLPerKg: number }
): { inputs: NewFeedInput[]; errors: string[] } {
  const errors: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { inputs: [], errors: ['JSON parse edilemedi'] }
  }

  const feedsProp = isRecord(parsed) ? parsed['feeds'] : undefined
  const items = Array.isArray(parsed) ? parsed : Array.isArray(feedsProp) ? feedsProp : null
  if (!items) return { inputs: [], errors: ['JSON formatı beklenmiyor (array veya {feeds:[...]})'] }

  const inputs: NewFeedInput[] = []
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i]
    if (!isRecord(raw)) {
      errors.push(`Satır ${i + 1}: obje değil`)
      continue
    }
    const mapped = toNewFeedInputLoose(raw, defaults)
    if (mapped.value) inputs.push(mapped.value)
    else errors.push(`Satır ${i + 1}: ${mapped.error ?? 'Geçersiz'}`)
  }

  return { inputs, errors }
}

function parseCategory(raw: string | undefined, fallback: FeedCategory): FeedCategory {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'forage' || v === 'kaba' || v === 'kabayem' || v === 'kaba yem') return 'forage'
  if (v === 'concentrate' || v === 'konsantre' || v === 'konsantre yem' || v === 'kesif' || v === 'kesif yem') return 'concentrate'
  if (v === 'mineral' || v === 'premix' || v === 'premiks') return 'mineral'
  return fallback
}

export function mapRowToNewFeedInput(
  row: Record<string, string>,
  defaults: { category: FeedCategory; priceTLPerKg: number }
): { value?: NewFeedInput; error?: string } {
  const name = firstDefined(
    row['name'],
    row['yem'],
    row['yem adi'],
    row['yem adı'],
    row['feed']
  )

  if (!name || name.trim().length === 0) return { error: 'Yem adı boş' }

  const category = parseCategory(firstDefined(row['category'], row['kategori']), defaults.category)

  const dmPercent = firstDefined(
    toNumber(row['dm']),
    toNumber(row['dm%']),
    toNumber(row['km']),
    toNumber(row['km%']),
    toNumber(row['dry matter']),
    toNumber(row['kuru madde'])
  )

  const meMcalPerKg = firstDefined(
    toNumber(row['me']),
    toNumber(row['me mcal/kg']),
    toNumber(row['me mcal']),
    toNumber(row['me(mcal/kg)'])
  )

  const meKcalPerKg = firstDefined(
    toNumber(row['me kcal/kg']),
    toNumber(row['me(kcal/kg)']),
    toNumber(row['metabolik enerji kcal/kg']),
    toNumber(row['metabolik enerji'])
  )

  const cpPercent = firstDefined(
    toNumber(row['cp']),
    toNumber(row['cp%']),
    toNumber(row['hp']),
    toNumber(row['hp%']),
    toNumber(row['ham protein']),
    toNumber(row['protein'])
  )

  const ndfPercent = firstDefined(
    toNumber(row['ndf']),
    toNumber(row['ndf%'])
  )

  const caPercent = firstDefined(
    toNumber(row['ca']),
    toNumber(row['ca%'])
  )

  const pPercent = firstDefined(
    toNumber(row['p']),
    toNumber(row['p%']),
    toNumber(row['fosfor'])
  )

  const price = firstDefined(
    toNumber(row['price']),
    toNumber(row['fiyat']),
    toNumber(row['tl/kg']),
    toNumber(row['price tl/kg']),
    toNumber(row['price tl per kg'])
  )

  // Required fields (keep strict to avoid "toy" garbage)
  const dm = dmPercent ?? 88
  const me = meMcalPerKg ?? (meKcalPerKg != null ? meKcalPerKg / 1000 : undefined)

  if (me == null) return { error: 'ME eksik (ME Mcal/kg veya ME kcal/kg girilmeli)' }
  if (cpPercent == null) return { error: 'HP/CP % eksik' }
  if (ndfPercent == null) return { error: 'NDF % eksik' }
  if (caPercent == null) return { error: 'Ca % eksik' }
  if (pPercent == null) return { error: 'P % eksik' }

  return {
    value: {
      name: name.trim(),
      category,
      dmPercent: dm,
      meMcalPerKg: me,
      cpPercent,
      ndfPercent,
      caPercent,
      pPercent,
      priceTLPerKg: price ?? defaults.priceTLPerKg,

      starchPercent: toNumber(row['starch']) ?? toNumber(row['nisasta']) ?? toNumber(row['nişasta']),
      sugarPercent: toNumber(row['sugar']) ?? toNumber(row['seker']) ?? toNumber(row['şeker']),
      fatPercent: toNumber(row['fat']) ?? toNumber(row['yag']) ?? toNumber(row['yağ']),

      mgPercent: toNumber(row['mg']) ?? toNumber(row['magnezyum']),
      naPercent: toNumber(row['na']) ?? toNumber(row['sodyum']),
      kPercent: toNumber(row['k']) ?? toNumber(row['potasyum']),
      sPercent: toNumber(row['s']) ?? toNumber(row['kükürt']) ?? toNumber(row['kukurts']),
      clPercent: toNumber(row['cl']) ?? toNumber(row['klor']),

      description: row['description'] ?? row['aciklama'] ?? row['açıklama'],
    },
  }
}

export type ParsedLabel = {
  dmPercent?: number
  meMcalPerKg?: number
  cpPercent?: number
  ndfPercent?: number
  starchPercent?: number
  sugarPercent?: number
  fatPercent?: number
  caPercent?: number
  pPercent?: number
  mgPercent?: number
  naPercent?: number
  kPercent?: number
  sPercent?: number
  clPercent?: number
}

function matchFirstNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const re of patterns) {
    const m = re.exec(text)
    if (m?.[1]) return toNumber(m[1])
  }
  return undefined
}

export function parseLabelText(raw: string): ParsedLabel {
  const text = raw
    .toLowerCase()
    .replace(/\s+/g, ' ')

  const dmPercent = matchFirstNumber(text, [
    /kuru\s*madde\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /km\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /dry\s*matter\s*(?:%|percent)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const meKcal = matchFirstNumber(text, [
    /metabolik\s*enerji\s*(?:kcal\/kg)?\s*[:=-]?\s*([0-9.,]+)/,
    /me\s*(?:kcal\/kg)?\s*[:=-]?\s*([0-9.,]+)/,
  ])
  const meMcal = matchFirstNumber(text, [
    /me\s*(?:mcal\/kg)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const cpPercent = matchFirstNumber(text, [
    /ham\s*protein\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /protein\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /hp\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const ndfPercent = matchFirstNumber(text, [
    /ndf\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const starchPercent = matchFirstNumber(text, [
    /nişasta\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /nisasta\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /starch\s*(?:%|percent)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const sugarPercent = matchFirstNumber(text, [
    /şeker\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /seker\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /sugar\s*(?:%|percent)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const fatPercent = matchFirstNumber(text, [
    /ham\s*yağ\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /yağ\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /yag\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /fat\s*(?:%|percent)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const caPercent = matchFirstNumber(text, [
    /kalsiyum\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /ca\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const pPercent = matchFirstNumber(text, [
    /fosfor\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /p\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const mgPercent = matchFirstNumber(text, [
    /magnezyum\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /mg\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const naPercent = matchFirstNumber(text, [
    /sodyum\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /na\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const kPercent = matchFirstNumber(text, [
    /potasyum\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /k\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const sPercent = matchFirstNumber(text, [
    /k[üu]k[üu]rt\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /s\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  const clPercent = matchFirstNumber(text, [
    /klor\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
    /cl\s*(?:%|yuzde)?\s*[:=-]?\s*([0-9.,]+)/,
  ])

  return {
    dmPercent,
    meMcalPerKg: firstDefined(meMcal, meKcal != null ? meKcal / 1000 : undefined),
    cpPercent,
    ndfPercent,
    starchPercent,
    sugarPercent,
    fatPercent,
    caPercent,
    pPercent,
    mgPercent,
    naPercent,
    kPercent,
    sPercent,
    clPercent,
  }
}
