/**
 * Hugging Face AI Service
 * Cloud-based AI için açıklama üretimi, doğal dil işleme
 */
import type { Ration, AnimalProfile, Alternative, Feed } from '@/types'
import { feeds as feedDb } from '@/data/feedsV2'

interface AIExplanation {
  summary: string
  feedReasons: Array<{
    feedName: string
    reason: string
  }>
  criticalPoints: string[]
  recommendations: string[]
}

async function callNetlifyFunction<T>(
  name: 'ai-explain' | 'ai-parse',
  payload: unknown
): Promise<T> {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    let details: string
    if (contentType.includes('application/json')) {
      const json = (await res.json().catch(() => null)) as null | { error?: unknown }
      details = json && typeof json.error === 'string' ? json.error : JSON.stringify(json)
    } else {
      details = await res.text().catch(() => '')
    }
    throw new Error(`Netlify function ${name} failed: ${res.status} ${details}`)
  }

  return (await res.json()) as T
}

/**
 * Rasyon açıklaması üret (AI ile)
 */
export async function explainRation(
  ration: Ration,
  profile: AnimalProfile
): Promise<AIExplanation> {
  try {
    const data = await callNetlifyFunction<{ ok: boolean; explanation?: AIExplanation }>('ai-explain', {
      ration,
      profile,
    })

    if (!data?.ok || !data.explanation) {
      throw new Error('AI explanation not available')
    }

    if (!data.explanation.summary || !String(data.explanation.summary).trim()) {
      throw new Error('AI explanation invalid/empty')
    }

    return data.explanation
  } catch (error) {
    console.warn('AI explanation failed, using rule-based:', error)
    return generateRuleBasedExplanation(ration, profile)
  }
}

/**
 * Doğal dil giriş parse et
 */
export async function parseNaturalInput(text: string): Promise<Partial<AnimalProfile> | null> {
  try {
    const data = await callNetlifyFunction<{ ok: boolean; profilePatch?: Partial<AnimalProfile> | null }>('ai-parse', {
      text,
    })

    if (!data?.ok) return null
    return data.profilePatch ?? null
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn('Natural input parsing failed:', error)
    if (msg.includes('HF_API_KEY') && msg.includes('not configured')) {
      throw new Error('AI_CONFIG_MISSING', { cause: error })
    }
    return null
  }
}

/**
 * Alternatif yem önerileri (AI)
 */
export async function suggestAlternatives(
  ration: Ration,
  availableFeeds: string[],
  userPrices?: Record<string, number>
): Promise<Alternative[]> {
  // Deterministic & cheap: rule-based alternatives (no token on client)
  return generateRuleBasedAlternatives(ration, availableFeeds, userPrices)
}

// ===== FALLBACK: RULE-BASED =====

function generateRuleBasedExplanation(ration: Ration, profile: AnimalProfile): AIExplanation {
  const summary = `${profile.weightKg}kg ${profile.breed} için ${ration.ingredients.length} yemden oluşan dengeli rasyon. Toplam maliyet: ${ration.cost.dailyFeedCostTL.toFixed(2)} TL/gün.`

  const criticalPoints: string[] = []
  const recommendations: string[] = []

  // NDF Kontrolü
  if (ration.totals.ndfPercent < ration.requirements.ndfPercentMin) {
    criticalPoints.push('NDF düşük - rumen sağlığı riski')
    recommendations.push('Rasyona daha fazla kaba yem (örn: yonca, saman) ekleyin')
  }

  // Nişasta Kontrolü
  if (ration.totals.starchPercent > ration.requirements.starchPercentMax) {
    criticalPoints.push('Nişasta yüksek - asidoz riski')
    recommendations.push('Mısır ve tahıl oranını azaltın, lif kaynağı artırın')
  }

  // DMI Kontrolü
  const dmiPercent = (ration.totals.dmiKg / ration.requirements.dmiKg) * 100
  if (dmiPercent < 95) {
    criticalPoints.push('Kuru madde tüketimi hedefin altında')
    recommendations.push('Rasyon lezzetliliğini artırın, yem çeşitliliğini gözden geçirin')
  }

  // Mevcut yemleri listele - bunları tekrar önerme
  const existingFeedNames = ration.ingredients.map(ing => ing.feedName.toLowerCase())

  // Sadece eksik besin varsa yem önerisi yap
  if (!existingFeedNames.some(name => name.includes('silaj') || name.includes('yonca'))) {
    recommendations.push('Kaba yem kaynağı olarak kaliteli mısır silajı veya yonca ekleyin')
  }

  // Genel öneriler
  if (recommendations.length === 0) {
    recommendations.push('Rasyonu günde 2-3 kez verin')
    recommendations.push('Su tüketimini kontrol edin')
    recommendations.push('Hayvanların genel sağlık durumunu takip edin')
  }

  return {
    summary,
    feedReasons: ration.ingredients.map((ing) => ({
      feedName: ing.feedId,
      reason: 'Besin gereksinimlerini karşılamak için seçildi',
    })),
    criticalPoints,
    recommendations,
  }
}

function generateRuleBasedAlternatives(
  ration: Ration,
  availableFeeds: string[],
  userPrices?: Record<string, number>
): Alternative[] {
  const fmt2 = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(2)
  const fmt1 = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(1)

  const feedById = new Map<string, Feed>(feedDb.map((f) => [f.id, f]))
  const available = availableFeeds
    .map((id) => feedById.get(id))
    .filter((f): f is Feed => Boolean(f))

  // If caller didn't pass available feeds, fall back to full DB (still deterministic)
  const pool = available.length > 0 ? available : feedDb

  // Zaten rasyonda olan yem ID'lerini topla
  const usedFeedIds = new Set(ration.ingredients.map(ing => ing.feedId))

  // Kullanıcının fiyat girdiği yemler (güvenilir fiyat bilgisi var)
  const userPricedFeeds = new Set(Object.keys(userPrices || {}))

  const suggestions: Alternative[] = []

  for (const ing of ration.ingredients) {
    if (suggestions.length >= 6) break

    const original = feedById.get(ing.feedId)
    if (!original) continue

    // Sadece kullanıcının fiyat girdiği yemler için alternatif öner
    // (Güvenilir fiyat bilgisi olmayan yemler için karşılaştırma yanıltıcı olur)
    if (!userPricedFeeds.has(ing.feedId)) continue

    // Kullanıcının girdiği gerçek fiyatı al
    const originalUserPrice = userPrices![ing.feedId]

    const candidates = pool
      .filter((f) => f.id !== original.id)
      .filter((f) => !usedFeedIds.has(f.id)) // Rasyonda olmayan yemler
      .filter((f) => userPricedFeeds.has(f.id)) // Sadece fiyat girilen yemler
      .filter((f) => f.category === original.category)
      .map((f) => {
        // Similarity score: lower is better
        const meDiff = Math.abs((f.meMcalPerKg ?? 0) - (original.meMcalPerKg ?? 0))
        const cpDiff = Math.abs((f.cpPercent ?? 0) - (original.cpPercent ?? 0))
        const ndfDiff = Math.abs((f.ndfPercent ?? 0) - (original.ndfPercent ?? 0))
        const similarity = meDiff * 1.5 + cpDiff * 0.15 + ndfDiff * 0.08
        
        // Kullanıcı fiyatlarıyla hesapla
        const alternativeUserPrice = userPrices![f.id]
        const savingPerKg = originalUserPrice - alternativeUserPrice
        const estimatedSaving = savingPerKg * (ing.kgAsFedPerDay ?? 0)
        return { f, similarity, savingPerKg, estimatedSaving, alternativeUserPrice }
      })
      // Prefer cheaper or similar feeds; avoid clearly worse cost
      .filter((c) => c.alternativeUserPrice <= originalUserPrice * 1.05)
      .sort((a, b) => {
        // Prefer good similarity, then better savings
        if (a.similarity !== b.similarity) return a.similarity - b.similarity
        return b.estimatedSaving - a.estimatedSaving
      })

    const best = candidates.find((c) => c.savingPerKg > 0) ?? candidates[0]
    if (!best) continue

    const originalMe = Number(original.meMcalPerKg ?? 0)
    const bestMe = Number(best.f.meMcalPerKg ?? 0)
    const originalCp = Number(original.cpPercent ?? 0)
    const bestCp = Number(best.f.cpPercent ?? 0)

    const reasonParts: string[] = []
    if (best.savingPerKg > 0) {
      reasonParts.push(`günlük ${Math.abs(best.estimatedSaving).toFixed(2)} TL tasarruf`)
    }
    reasonParts.push('benzer besin profili')

    suggestions.push({
      feedId: best.f.id,
      feedName: best.f.name,
      reason: `${original.name} yerine ${best.f.name}: ${reasonParts.join(', ')}.`,
      potentialCostSaving:
        best.estimatedSaving > 0 ? Number(best.estimatedSaving.toFixed(2)) : undefined,
      impactOnNutrients: `ME ${fmt2(bestMe)} vs ${fmt2(originalMe)} | CP %${fmt1(bestCp)} vs %${fmt1(
        originalCp
      )}`,
    })
  }

  return suggestions
}
