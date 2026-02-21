/**
 * Geliştirilmiş Optimizer (LP hazırlığı)
 * 
 * Faz 1: İyileştirilmiş greedy algorithm
 * Faz 2: GLPK.js / HiGHS.js entegrasyonu
 * 
 * Linear Programming Formulation:
 * 
 * Minimize: Σ(cost_i × x_i)
 * 
 * Subject to:
 * - Energy: Σ(ME_i × x_i) >= ME_req
 * - Protein: Σ(CP_i × x_i) >= CP_req
 * - NDF: NDF_min <= Σ(NDF_i × x_i) / Σ(x_i) <= NDF_max
 * - Starch: Σ(Starch_i × x_i) / Σ(x_i) <= Starch_max
 * - Ca, P, Mg constraints
 * - x_i >= 0 (non-negativity)
 * - x_i <= max_inclusion_i (practical limits)
 */

import type { Feed, Ration, AnimalProfile, NutrientRequirement, OptimizationPreferences, InfeasibilityDiagnostic } from '@/types'
import { calculateRequirements_NRC2021 } from './nrc2021'
import { calculateRiskScore } from './riskScoring'
import { analyzeInfeasibility } from './infeasibilityAnalyzer'
import { estimateFeedNEmNegFromME } from './beefEnergy'
import { calculateDietProteinFractions } from './proteinFractions'
import { getCaPRatioTarget, getDcadTarget } from './nutritionTargets'
import type { SolutionVector } from './optimizer/types'
import { filterValidFeeds } from './optimizer/filterValidFeeds'
import { getEffectiveMaxAsFedKgPerDay, getFeedPriceTLPerKg, getMinAsFedKgPerDay } from './optimizer/feedConstraints'
import { asFedToDmKg, dmFraction, dmToAsFedKg } from './optimizer/conversions'
import { calculateDCADFromTotals, calculateSolutionMinerals, sumDmByCategory } from './optimizer/aggregation'

interface OptimizationResult {
  ration: Ration | null
  status: 'success' | 'infeasible' | 'error'
  message: string
  solver?: 'lp' | 'greedy'
  iterations?: number
  diagnostics?: {
    final: {
      meMcal: number
      nemMcal?: number
      negMcal?: number
      cpGrams: number
      dmiKg: number
      dailyCostTL: number
    }
    requirements: {
      meMcal: number
      nemMcal?: number
      negMcal?: number
      cpGrams: number
      dmiKg: number
    }
    deficits: {
      meMcal: number
      nemMcal?: number
      negMcal?: number
      cpGrams: number
    }
    notes: string[]
    infeasibilityDiagnostics?: InfeasibilityDiagnostic[]
  }
}

/**
 * Optimize animal ration using Linear Programming or Greedy algorithm
 * 
 * This is the main entry point for ration formulation. It calculates nutrient
 * requirements, validates feed constraints, and solves the optimization problem
 * to minimize cost while meeting all nutritional targets.
 * 
 * **Algorithm Selection:**
 * - `auto`: Tries LP first, falls back to greedy if LP fails
 * - `lp`: Linear programming using GLPK.js (requires WebWorker)
 * - `greedy`: Heuristic greedy algorithm (always available)
 * 
 * **Optimization Objective:**
 * ```
 * Minimize: Σ(cost_i × amount_i)
 * ```
 * 
 * **Constraints:**
 * - Energy (ME): Must meet or exceed requirement
 * - Protein (CP): Must meet or exceed requirement
 * - DMI: Within tolerance range (typically ±4%)
 * - NDF: Between min/max percentages
 * - Starch, Sugar, Fat: Below maximum limits
 * - Minerals (Ca, P, DCAD): Within target ranges
 * - Feed-specific min/max inclusion rates
 * 
 * **Special Handling:**
 * - Dry close-up cows: Strict Ca:P and DCAD validation
 * - Forage minimum: Typically 40-50% of DM
 * - Concentrate maximum: Typically 50-60% of DM
 * 
 * @param profile - Animal profile with species, weight, production data
 * @param availableFeeds - List of feeds available for formulation
 * @param preferences - Optional optimization preferences (solver, constraints)
 * @returns Optimization result with ration or error details
 * 
 * @example
 * ```typescript
 * const result = await optimizeRation(
 *   {
 *     species: 'cattle',
 *     breed: 'holstein',
 *     purpose: 'dairy',
 *     weightKg: 650,
 *     milkYieldKgPerDay: 30,
 *     productionPhase: 'mid'
 *   },
 *   feeds,
 *   {
 *     solver: 'auto',
 *     minForagePercent: 50,
 *     maxConcentratePercent: 60
 *   }
 * )
 * 
 * if (result.status === 'success') {
 *   console.log(`Daily cost: ${result.ration.cost.dailyFeedCostTL} TL`)
 * }
 * ```
 * 
 * @throws Never throws - returns error status in result object
 * @see {@link calculateRequirements_NRC2021}
 * @see {@link solveLP_GLPK}
 */
export async function optimizeRation(
  profile: AnimalProfile,
  availableFeeds: Feed[],
  preferences?: OptimizationPreferences
): Promise<OptimizationResult> {
  // 1. Gereksinimleri hesapla (NRC 2021)
  const requirements = calculateRequirements_NRC2021(profile)

  // 2. Yem kısıtlarını filtrele
  const validFeeds = filterValidFeeds(availableFeeds, profile, preferences)

  if (validFeeds.length === 0) {
    return {
      ration: null,
      status: 'error',
      message: 'Uygun yem bulunamadı',
    }
  }

  // 3. Solver seçimi (LP -> Greedy fallback)
  const solverPref = preferences?.solver ?? 'auto'
  const tryLP = solverPref === 'auto' || solverPref === 'lp'

  const lpAttempt = tryLP ? await solveLP_GLPK(requirements, validFeeds, profile, preferences) : null

  const shouldTryGreedy =
    solverPref === 'greedy' || (solverPref === 'auto' && (!lpAttempt || !lpAttempt.feasible))
  const greedyAttempt = shouldTryGreedy
    ? await solveLP_Greedy(requirements, validFeeds, profile, preferences)
    : null

  const solved = (() => {
    if (solverPref === 'greedy') return greedyAttempt!
    if (solverPref === 'lp') return lpAttempt!
    // auto
    if (lpAttempt && lpAttempt.feasible) return lpAttempt
    if (greedyAttempt) {
      if (lpAttempt && lpAttempt.notes?.length) greedyAttempt.notes.unshift(...lpAttempt.notes)
      return greedyAttempt
    }
    return lpAttempt
  })()

  if (!solved) {
    return {
      ration: null,
      status: 'error',
      message: 'Çözüm üretilemedi',
    }
  }

  // CRITICAL: Kuru-closeup için Ca:P ve DCAD sert kontrolü
  if (solved.feasible && (profile.productionPhase === 'dry-closeup' || (profile.stage === 'dry' && (profile.pregnancyMonth || 0) >= 8))) {
    const testRation = buildRation(solved.solution, requirements, profile, preferences)
    const caPRatio = testRation.totals.pGrams > 0 ? testRation.totals.caGrams / testRation.totals.pGrams : 0
    const dcad = calculateDCADFromTotals(testRation.totals)
    const caPTarget = getCaPRatioTarget(profile)
    const dcadTarget = getDcadTarget(profile)

    const caPOutside = caPRatio > 0 && (caPRatio < caPTarget.min * 0.9 || caPRatio > caPTarget.max * 1.1)
    const dcadOutside = Number.isFinite(dcad) && (dcad < dcadTarget.min - 50 || dcad > dcadTarget.max + 50)

    if (caPOutside || dcadOutside) {
      solved.feasible = false
      if (caPOutside) solved.notes.push(`Kuru-closeup Ca:P oranı kritik band dışında: ${caPRatio.toFixed(2)} (hedef: ${caPTarget.label})`)
      if (dcadOutside) solved.notes.push(`Kuru-closeup DCAD kritik band dışında: ${dcad.toFixed(0)} (hedef: ${dcadTarget.label})`)
    }
  }

  if (!solved.feasible) {
    const mePct = solved.final.meMcal / (requirements.meMcal || 1)
    const cpPct = solved.final.cpGrams / (requirements.cpGrams || 1)

    const beefNE =
      typeof requirements.nemMcal === 'number' || typeof requirements.negMcal === 'number'
        ? (() => {
            let nem = 0
            let neg = 0
            for (const [feed, kgAsFed] of solved.solution.feedAmounts) {
              const kgDM = kgAsFed * (feed.dmPercent / 100)
              const { nemMcalPerKgDm, negMcalPerKgDm } = estimateFeedNEmNegFromME(feed.meMcalPerKg)
              nem += nemMcalPerKgDm * kgDM
              neg += negMcalPerKgDm * kgDM
            }
            return { nemMcal: nem, negMcal: neg }
          })()
        : null

    const nemPct = beefNE && requirements.nemMcal ? beefNE.nemMcal / (requirements.nemMcal || 1) : undefined
    const negPct = beefNE && requirements.negMcal ? beefNE.negMcal / (requirements.negMcal || 1) : undefined

    const notes = solved.notes
    const messageParts: string[] = ['Kısıtlar tam sağlanamadı']

    const usedSolver = solved.solver

    const dmiTolPct =
      typeof preferences?.lpDmiTolerancePercent === 'number'
        ? Math.min(10, Math.max(0.5, preferences.lpDmiTolerancePercent))
        : 4
    const dmiTol = dmiTolPct / 100
    const dmiLower = requirements.dmiKg * (1 - dmiTol)
    const dmiUpper = requirements.dmiKg * (1 + dmiTol)

    // Only report nutrient deficits when they are below target; otherwise it reads like an error despite being over 100%.
    if (Number.isFinite(mePct) && mePct < 1) messageParts.push(`Enerji: ${(mePct * 100).toFixed(0)}%`)
    if (typeof nemPct === 'number' && Number.isFinite(nemPct) && nemPct < 1) messageParts.push(`NEm: ${(nemPct * 100).toFixed(0)}%`)
    if (typeof negPct === 'number' && Number.isFinite(negPct) && negPct < 1) messageParts.push(`NEg: ${(negPct * 100).toFixed(0)}%`)
    if (Number.isFinite(cpPct) && cpPct < 1) messageParts.push(`Protein: ${(cpPct * 100).toFixed(0)}%`)

    const dmiKg = solved.final.dmiKg
    if (Number.isFinite(dmiKg) && Number.isFinite(dmiLower) && Number.isFinite(dmiUpper)) {
      if (dmiKg < dmiLower - 0.1) messageParts.push(`DMI düşük: ${dmiKg.toFixed(1)} / ${requirements.dmiKg.toFixed(1)} kg`)
      if (dmiKg > dmiUpper + 0.1) messageParts.push(`DMI yüksek: ${dmiKg.toFixed(1)} / ${requirements.dmiKg.toFixed(1)} kg`)
    }

    if (notes.some((n) => n.includes('mineral/premiks yok'))) {
      messageParts.push('Mineral/premiks eksik')
    }

    // Fallback: if nothing specific was added, still show ME/CP for context.
    if (messageParts.length === 1) {
      if (Number.isFinite(mePct)) messageParts.push(`Enerji: ${(mePct * 100).toFixed(0)}%`)
      if (Number.isFinite(cpPct)) messageParts.push(`Protein: ${(cpPct * 100).toFixed(0)}%`)
    }

    const infeasibilityDiagnostics = analyzeInfeasibility(requirements, solved.final, notes, {
      dmiLowerKg: dmiLower,
      dmiUpperKg: dmiUpper,
    })

    const bestEffortRation = buildRation(solved.solution, requirements, profile, preferences)
    const bestEffortRisk = calculateRiskScore(bestEffortRation, profile)
    const lpDiagnostics = 'diagnostics' in solved ? solved.diagnostics : undefined

    return {
      ration: { ...bestEffortRation, riskScore: bestEffortRisk, solver: usedSolver, optimizerNotes: solved.notes, optimizerDiagnostics: lpDiagnostics },
      status: 'infeasible',
      message: messageParts.join(' • '),
      solver: usedSolver,
      iterations: solved.solution.iterations,
      diagnostics: {
        final: {
          meMcal: solved.final.meMcal,
          ...(beefNE ? { nemMcal: beefNE.nemMcal, negMcal: beefNE.negMcal } : {}),
          cpGrams: solved.final.cpGrams,
          dmiKg: solved.final.dmiKg,
          dailyCostTL: solved.solution.totalCost,
        },
        requirements: {
          meMcal: requirements.meMcal,
          ...(typeof requirements.nemMcal === 'number' ? { nemMcal: requirements.nemMcal } : {}),
          ...(typeof requirements.negMcal === 'number' ? { negMcal: requirements.negMcal } : {}),
          cpGrams: requirements.cpGrams,
          dmiKg: requirements.dmiKg,
        },
        deficits: {
          meMcal: Math.max(0, requirements.meMcal - solved.final.meMcal),
          ...(typeof requirements.nemMcal === 'number' && beefNE
            ? { nemMcal: Math.max(0, requirements.nemMcal - beefNE.nemMcal) }
            : {}),
          ...(typeof requirements.negMcal === 'number' && beefNE
            ? { negMcal: Math.max(0, requirements.negMcal - beefNE.negMcal) }
            : {}),
          cpGrams: Math.max(0, requirements.cpGrams - solved.final.cpGrams),
        },
        notes,
        infeasibilityDiagnostics,
      },
    }
  }

  // 4. Rasyon objesi oluştur
  const ration = buildRation(solved.solution, requirements, profile, preferences)

  // If user supplied a small candidate set, explain when some candidates end up unused.
  // (Common: optimizer chooses the best subset; users may expect all selected feeds to appear.)
  if (availableFeeds.length > 0 && availableFeeds.length <= 30) {
    const usedIds = new Set(ration.ingredients.map((i) => i.feedId))
    const unused = availableFeeds.filter((f) => !usedIds.has(f.id))

    if (unused.length > 0) {
      solved.notes.push(`Seçili ${availableFeeds.length} yemden ${unused.length} tanesi rasyonda kullanılmadı (optimizasyon sonucu).`)
      const preview = unused
        .slice(0, 6)
        .map((f) => f.name)
        .join(', ')
      solved.notes.push(`Kullanılmayanlar: ${preview}${unused.length > 6 ? '…' : ''}`)
    }
  }

  // 5. Risk skoru hesapla
  const riskScore = calculateRiskScore(ration, profile)

  const usedSolver = solved.solver

  // LP solver diagnostics'i ration'a ekle
  const diagnostics = 'diagnostics' in solved ? solved.diagnostics : undefined

  return {
    ration: { ...ration, riskScore, solver: usedSolver, optimizerNotes: solved.notes, optimizerDiagnostics: diagnostics },
    status: 'success',
    message: 'Rasyon başarıyla oluşturuldu',
    solver: usedSolver,
    iterations: solved.solution.iterations,
  }
}

async function solveLP_GLPK(
  req: NutrientRequirement,
  feeds: Feed[],
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Promise<{
  solver: 'lp'
  solution: SolutionVector
  feasible: boolean
  final: { meMcal: number; cpGrams: number; dmiKg: number }
  notes: string[]
  diagnostics?: import('@/types').OptimizerDiagnostics
}> {
  const solution: SolutionVector = {
    feedAmounts: new Map(),
    totalCost: 0,
    iterations: 0,
  }

  const notes: string[] = []

  // Note: glpk.js has different TS types for browser vs node builds.
  // Runtime JSON interface is compatible for our usage; keep this flexible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let glpk: any
  try {
    const webFactory = (await import('glpk.js')).default
    if (typeof webFactory !== 'function') {
      notes.push('LP solver yüklenemedi (glpk.js factory bulunamadı)')
      const final = calculateSolutionNutrients(solution)
      return { solver: 'lp', solution, feasible: false, final, notes }
    }

    try {
      // Browser/WASM build (Vite) path.
      glpk = await webFactory()
    } catch (_e) {
      // Node/Vitest ortamında glpk.js web build'i Worker gerektirebiliyor.
      const nodeFactory = (await import('glpk.js/node')).default
      if (typeof nodeFactory !== 'function') {
        throw _e
      }
      glpk = await nodeFactory()
      notes.push('LP: glpk.js/node kullanıldı')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    notes.push(`LP solver yüklenemedi; greedy kullanılacak (${msg})`)
    const final = calculateSolutionNutrients(solution)
    return { solver: 'lp', solution, feasible: false, final, notes }
  }

  const dmiTolPct =
    typeof preferences?.lpDmiTolerancePercent === 'number'
      ? Math.min(10, Math.max(0.5, preferences.lpDmiTolerancePercent))
      : 4
  const dmiTol = dmiTolPct / 100

  const forageRatio =
    typeof preferences?.minForagePercent === 'number'
      ? Math.min(0.9, Math.max(0, preferences.minForagePercent / 100))
      : 0.4

  const maxConcRatio =
    typeof preferences?.maxConcentratePercent === 'number'
      ? Math.min(0.95, Math.max(0, preferences.maxConcentratePercent / 100))
      : undefined

  const sanitize = (s: string) => `x_${s.replace(/[^a-zA-Z0-9_]/g, '_')}`
  const sanitizeBin = (s: string) => `y_${s.replace(/[^a-zA-Z0-9_]/g, '_')}`
  const sanitizeCons = (s: string) => `c_${s.replace(/[^a-zA-Z0-9_]/g, '_')}`
  const varNameByFeedId = new Map<string, string>()
  for (const f of feeds) varNameByFeedId.set(f.id, sanitize(f.id))

  const minActiveFeeds = Math.max(0, Math.floor(preferences?.minActiveFeeds ?? 0))
  const minForageFeeds = Math.max(0, Math.floor(preferences?.minForageFeeds ?? 0))
  const minConcentrateFeeds = Math.max(0, Math.floor(preferences?.minConcentrateFeeds ?? 0))
  const minMineralFeeds = Math.max(0, Math.floor(preferences?.minMineralFeeds ?? 0))

  const hasDiversityConstraints =
    minActiveFeeds > 0 || minForageFeeds > 0 || minConcentrateFeeds > 0 || minMineralFeeds > 0

  const dmiUpperBound = req.dmiKg * (1 + dmiTol)
  const binNameByFeedId = new Map<string, string>()
  const binaries: string[] = []

  const objectiveVars: Array<{ name: string; coef: number }> = []
  const bounds: Array<{ name: string; type: number; lb?: number; ub?: number }> = []
  
  // Pre-calculate active thresholds for determining forced-active feeds
  const activeThresholdKgDM = Math.max(0.05, req.dmiKg * 0.005) // %0.5 DMI
  const mineralThresholdKgDM = Math.max(0.01, req.dmiKg * 0.001) // %0.1 DMI

  for (const feed of feeds) {
    const name = varNameByFeedId.get(feed.id)!
    const dmFrac = dmFraction(feed)
    const costCoef = getFeedPriceTLPerKg(feed, preferences) / Math.max(0.05, dmFrac)
    objectiveVars.push({ name, coef: costCoef })

    const minAsFed = getMinAsFedKgPerDay(feed, req, preferences)
    const maxAsFed = getEffectiveMaxAsFedKgPerDay(feed, req, profile, preferences)
    const lb = typeof minAsFed === 'number' ? Math.max(0, minAsFed) * dmFrac : 0
    const ub = typeof maxAsFed === 'number' ? Math.max(0, maxAsFed) * dmFrac : undefined

    if (typeof ub === 'number') {
      bounds.push({ name, type: glpk.GLP_DB ?? 4, lb, ub })
    } else {
      bounds.push({ name, type: glpk.GLP_LO ?? 2, lb })
    }

    if (hasDiversityConstraints) {
      const yName = sanitizeBin(feed.id)
      binNameByFeedId.set(feed.id, yName)
      binaries.push(yName)
      
      // If feed has a minimum bound that exceeds the active threshold, force y = 1
      const eps = feed.category === 'mineral' ? mineralThresholdKgDM : activeThresholdKgDM
      const yLb = lb >= eps ? 1 : 0
      bounds.push({ name: yName, type: glpk.GLP_DB ?? 4, lb: yLb, ub: 1 })
    }
  }

  type LpBound = { type: number; lb: number; ub: number }
  type LpConstraint = { name: string; vars: Array<{ name: string; coef: number }>; bnds: LpBound }

  const subjectTo: LpConstraint[] = []

  const sumVars = (predicate: (f: Feed) => boolean, coefForFeed: (f: Feed) => number) => {
    const vars: Array<{ name: string; coef: number }> = []
    for (const f of feeds) {
      if (!predicate(f)) continue
      const name = varNameByFeedId.get(f.id)!
      vars.push({ name, coef: coefForFeed(f) })
    }
    return vars
  }

  const bndsLO = (lb: number) => ({ type: glpk.GLP_LO ?? 2, lb, ub: 0 })
  const bndsUP = (ub: number) => ({ type: glpk.GLP_UP ?? 3, lb: 0, ub })
  const bndsDB = (lb: number, ub: number) => ({ type: glpk.GLP_DB ?? 4, lb, ub })

  // Total DM intake bounds
  subjectTo.push({
    name: 'dmi',
    vars: sumVars(() => true, () => 1),
    bnds: bndsDB(req.dmiKg * (1 - dmiTol), req.dmiKg * (1 + dmiTol)),
  })

  // Diversity / role constraints (MIP)
  if (hasDiversityConstraints) {
    const activeThresholdKgDM = Math.max(0.05, req.dmiKg * 0.005) // %0.5 DMI (DM bazında)
    const mineralThresholdKgDM = Math.max(0.01, req.dmiKg * 0.001) // %0.1 DMI (DM bazında)

    notes.push('LP/MIP: çeşitlilik/rol kısıtları aktif (binary değişkenler ile)')
    notes.push(
      `Aktif yem eşiği (DM): kaba/konsantre ≥ ${activeThresholdKgDM.toFixed(3)} kg, mineral ≥ ${mineralThresholdKgDM.toFixed(
        3
      )} kg`
    )

    const addCountConstraint = (name: string, predicate: (f: Feed) => boolean, minCount: number) => {
      if (minCount <= 0) return
      const vars: Array<{ name: string; coef: number }> = []
      for (const f of feeds) {
        if (!predicate(f)) continue
        const yName = binNameByFeedId.get(f.id)!
        vars.push({ name: yName, coef: 1 })
      }

      if (vars.length < minCount) {
        notes.push(`${name}: istenen ${minCount}, mevcut ${vars.length} (infeasible olabilir)`) 
      }

      subjectTo.push({
        name: sanitizeCons(name),
        vars,
        bnds: bndsLO(minCount),
      })
    }

    addCountConstraint('min_active_feeds', () => true, minActiveFeeds)
    addCountConstraint('min_forage_feeds', (f) => f.category === 'forage', minForageFeeds)
    addCountConstraint('min_concentrate_feeds', (f) => f.category === 'concentrate', minConcentrateFeeds)
    addCountConstraint('min_mineral_feeds', (f) => f.category === 'mineral', minMineralFeeds)

    for (const feed of feeds) {
      const xName = varNameByFeedId.get(feed.id)!
      const yName = binNameByFeedId.get(feed.id)!
      const dmFrac = dmFraction(feed)
      const maxAsFed = getEffectiveMaxAsFedKgPerDay(feed, req, profile, preferences)
      const maxDmFromFeed = typeof maxAsFed === 'number' ? Math.max(0, maxAsFed) * dmFrac : undefined

      const M = Math.max(0, Math.min(dmiUpperBound, typeof maxDmFromFeed === 'number' ? maxDmFromFeed : dmiUpperBound))
      const epsBase = feed.category === 'mineral' ? mineralThresholdKgDM : activeThresholdKgDM
      const eps = Math.max(0, Math.min(M, epsBase))

      // x_i <= M_i * y_i
      subjectTo.push({
        name: sanitizeCons(`link_max_${feed.id}`),
        vars: [
          { name: xName, coef: 1 },
          { name: yName, coef: -M },
        ],
        bnds: bndsUP(0),
      })

      // x_i >= eps_i * y_i  (aktif sayılabilmesi için anlamlı bir alt eşik)
      if (eps > 0) {
        subjectTo.push({
          name: sanitizeCons(`link_min_${feed.id}`),
          vars: [
            { name: xName, coef: 1 },
            { name: yName, coef: -eps },
          ],
          bnds: bndsLO(0),
        })
      }
    }
  }

  // Forage minimum (DM)
  // Use ratio-linearization: Σ(forage) - r*Σ(total) >= 0
  if (forageRatio > 0) {
    subjectTo.push({
      name: 'forage_ratio_min',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = (f.category === 'forage' ? 1 : 0) - forageRatio
        return { name, coef }
      }),
      bnds: bndsLO(0),
    })
  }

  // Concentrate maximum (DM)
  if (typeof maxConcRatio === 'number') {
    // Ratio-linearization: Σ(conc) - r*Σ(total) <= 0
    subjectTo.push({
      name: 'conc_ratio_max',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = (f.category === 'concentrate' ? 1 : 0) - maxConcRatio
        return { name, coef }
      }),
      bnds: bndsUP(0),
    })
  }

  // Energy, protein
  const useBeefNE = typeof req.nemMcal === 'number' || typeof req.negMcal === 'number'
  if (useBeefNE) {
    if (typeof req.nemMcal === 'number' && req.nemMcal > 0) {
      subjectTo.push({
        name: 'nem_min',
        vars: sumVars(() => true, (f) => estimateFeedNEmNegFromME(f.meMcalPerKg).nemMcalPerKgDm),
        bnds: bndsLO(req.nemMcal),
      })
    }
    if (typeof req.negMcal === 'number' && req.negMcal > 0) {
      subjectTo.push({
        name: 'neg_min',
        vars: sumVars(() => true, (f) => estimateFeedNEmNegFromME(f.meMcalPerKg).negMcalPerKgDm),
        bnds: bndsLO(req.negMcal),
      })
    }
  } else {
    subjectTo.push({
      name: 'me_min',
      vars: sumVars(() => true, (f) => f.meMcalPerKg),
      bnds: bndsLO(req.meMcal),
    })
  }
  subjectTo.push({
    name: 'cp_min',
    vars: sumVars(() => true, (f) => (f.cpPercent / 100) * 1000),
    bnds: bndsLO(req.cpGrams),
  })

  // Fiber and rapid fermentables (proper ratio-linearization)
  // Example (NDF min): Σ(NDF*x) / Σ(x) >= ndfMin  =>  Σ((NDF-ndfMin)*x) >= 0
  if (req.ndfPercentMin > 0) {
    const target = req.ndfPercentMin / 100
    subjectTo.push({
      name: 'ndf_ratio_min',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = (f.ndfPercent / 100) - target
        return { name, coef }
      }),
      bnds: bndsLO(0),
    })
  }

  if (typeof req.ndfPercentMax === 'number' && req.ndfPercentMax > 0) {
    const target = req.ndfPercentMax / 100
    subjectTo.push({
      name: 'ndf_ratio_max',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = (f.ndfPercent / 100) - target
        return { name, coef }
      }),
      bnds: bndsUP(0),
    })
  }

  if (req.starchPercentMax > 0) {
    const target = req.starchPercentMax / 100
    subjectTo.push({
      name: 'starch_ratio_max',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = ((f.starchPercent || 0) / 100) - target
        return { name, coef }
      }),
      bnds: bndsUP(0),
    })
  }

  if (req.sugarPercentMax > 0) {
    const target = req.sugarPercentMax / 100
    subjectTo.push({
      name: 'sugar_ratio_max',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = ((f.sugarPercent || 0) / 100) - target
        return { name, coef }
      }),
      bnds: bndsUP(0),
    })
  }

  if (req.fatPercentMax > 0) {
    const target = req.fatPercentMax / 100
    subjectTo.push({
      name: 'fat_ratio_max',
      vars: feeds.map((f) => {
        const name = varNameByFeedId.get(f.id)!
        const coef = ((f.fatPercent || 0) / 100) - target
        return { name, coef }
      }),
      bnds: bndsUP(0),
    })
  }

  // Macro Minerals (g/day) - tightened constraints with 95% of requirement as minimum
  const mineralMin = (name: string, coef: (f: Feed) => number, rhs: number) => {
    if (!rhs || rhs <= 0) return
    subjectTo.push({ name, vars: sumVars(() => true, coef), bnds: bndsLO(rhs * 0.95) })
  }
  mineralMin('ca_min', (f) => (f.caPercent / 100) * 1000, req.caGrams)
  mineralMin('p_min', (f) => (f.pPercent / 100) * 1000, req.pGrams)
  mineralMin('mg_min', (f) => ((f.mgPercent || 0) / 100) * 1000, req.mgGrams)
  mineralMin('na_min', (f) => ((f.naPercent || 0) / 100) * 1000, req.naGrams)
  mineralMin('k_min', (f) => ((f.kPercent || 0) / 100) * 1000, req.kGrams)
  mineralMin('s_min', (f) => ((f.sPercent || 0) / 100) * 1000, req.sGrams)
  mineralMin('cl_min', (f) => ((f.clPercent || 0) / 100) * 1000, req.clGrams)

  // Trace Minerals (mg/day) - 90% minimum for micronutrients
  // Only add constraint if at least one feed has data for that mineral
  const traceMineralMin = (name: string, coef: (f: Feed) => number, rhs?: number) => {
    if (!rhs || rhs <= 0) return
    // Skip constraint if no feeds have data for this mineral (would be infeasible)
    const hasData = feeds.some((f) => coef(f) > 0)
    if (!hasData) return
    subjectTo.push({ name, vars: sumVars(() => true, coef), bnds: bndsLO(rhs * 0.90) })
  }
  traceMineralMin('fe_min', (f) => (f.fePpm || 0), req.feMg)
  traceMineralMin('zn_min', (f) => (f.znPpm || 0), req.znMg)
  traceMineralMin('cu_min', (f) => (f.cuPpm || 0), req.cuMg)
  traceMineralMin('mn_min', (f) => (f.mnPpm || 0), req.mnMg)
  traceMineralMin('co_min', (f) => (f.coPpm || 0), req.coMg)
  traceMineralMin('i_min', (f) => (f.iPpm || 0), req.iMg)
  traceMineralMin('se_min', (f) => (f.sePpm || 0), req.seMg)

  // Vitamins (IU or mg/day) - 85% minimum (more variation in feed content)
  // Only add constraint if at least one feed has data for that vitamin
  // Coefficient: IU/kg DM × kg DM = IU (daily total)
  const vitaminMin = (name: string, coef: (f: Feed) => number, rhs?: number) => {
    if (!rhs || rhs <= 0) return
    const hasData = feeds.some((f) => coef(f) > 0)
    if (!hasData) return
    subjectTo.push({ name, vars: sumVars(() => true, coef), bnds: bndsLO(rhs * 0.85) })
  }
  vitaminMin('vitA_min', (f) => (f.vitaminAIUPerKg || 0), req.vitaminAIU)
  vitaminMin('vitD_min', (f) => (f.vitaminDIUPerKg || 0), req.vitaminDIU)
  vitaminMin('vitE_min', (f) => (f.vitaminEIUPerKg || 0), req.vitaminEIU)
  // Vitamin K is generally synthesized by rumen microbes and feed database values are often sparse.
  // Enforcing it as a hard LP constraint can make otherwise practical diets infeasible.

  // Optional max daily cost
  if (typeof preferences?.maxCostPerDay === 'number' && preferences.maxCostPerDay > 0) {
    subjectTo.push({
      name: 'cost_max',
      vars: objectiveVars,
      bnds: bndsUP(preferences.maxCostPerDay),
    })
  }

  const lp = {
    name: 'ration_lp',
    objective: {
      direction: glpk.GLP_MIN ?? 1,
      name: 'cost',
      vars: objectiveVars,
    },
    subjectTo,
    bounds,
    ...(hasDiversityConstraints ? { binaries } : {}),
  }

  // Debug: Log LP structure
  type GlpkSolveResponse = {
    result?: {
      status?: number
      vars?: Record<string, number>
      z?: number
      dual?: Record<string, number>
      rows?: Record<string, number>
    }
    time?: number
  }

  const solveStartTime = Date.now()
  let res: GlpkSolveResponse
  try {
    // GLP_MSG_OFF = 0 (no output messages)
    res = (await glpk.solve(lp, {
      msglev: 0,
      presol: true,
      rows: true, // Request constraint/row values for diagnostics
      ...(hasDiversityConstraints ? { mipgap: 0.01 } : {}),
    })) as unknown as GlpkSolveResponse
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    notes.push(`⚠️ LP solver hatası: ${errorMsg}`)
    notes.push('→ Muhtemelen mineral eksikliği veya uyumsuz kısıtlar')
    notes.push('→ Greedy algoritması ile devam ediliyor...')
    const final = calculateSolutionNutrients(solution)
    return { solver: 'lp', solution, feasible: false, final, notes }
  }
  const solveDurationMs = Date.now() - solveStartTime

  const status = res?.result?.status
  const varsObj = res?.result?.vars

  const okStatuses = new Set<number>([
    typeof glpk.GLP_OPT === 'number' ? glpk.GLP_OPT : -9999,
    typeof glpk.GLP_FEAS === 'number' ? glpk.GLP_FEAS : -9999,
  ])

  if (!varsObj || (typeof status === 'number' && okStatuses.size > 0 && !okStatuses.has(status))) {
    notes.push('LP: uygun çözüm bulunamadı')
    const final = calculateSolutionNutrients(solution)
    return { solver: 'lp', solution, feasible: false, final, notes }
  }

  // Build SolutionVector from DM variables
  for (const feed of feeds) {
    const name = varNameByFeedId.get(feed.id)!
    const dmKg = Number(varsObj?.[name] ?? 0)
    if (!Number.isFinite(dmKg) || dmKg <= 1e-6) continue

    const asFedKg = dmToAsFedKg(feed, dmKg)
    if (asFedKg <= 0.005) continue
    solution.feedAmounts.set(feed, asFedKg)
    solution.totalCost += getFeedPriceTLPerKg(feed, preferences) * asFedKg
  }

  solution.iterations = 1
  notes.push('LP: glpk.js ile çözüldü')

  // Optional: add a small mineral selection pass to improve DCAD/Ca:P steering when LP doesn't include special mineral feeds.
  // (LP already enforces mineral mins; this just keeps previous UX behavior consistent.)
  const mineralFeeds = feeds.filter((f) => f.category === 'mineral')
  const minerals = selectMinerals(mineralFeeds, solution, req, profile, preferences)
  for (const [feed, amount] of minerals) {
    const current = solution.feedAmounts.get(feed) || 0
    const maxAllowed = getEffectiveMaxAsFedKgPerDay(feed, req, profile, preferences)
    const nextAmount =
      typeof maxAllowed === 'number' ? Math.min(current + amount, maxAllowed) : current + amount
    if (nextAmount > current) {
      const delta = nextAmount - current
      solution.feedAmounts.set(feed, nextAmount)
      solution.totalCost += getFeedPriceTLPerKg(feed, preferences) * delta
    }
  }

  const final = calculateSolutionNutrients(solution)
  const feasible = final.meMcal >= req.meMcal * 0.90 && final.cpGrams >= req.cpGrams * 0.90

  // Shadow prices ve diagnostics
  const diagnostics: import('@/types').OptimizerDiagnostics = {
    objectiveValue: res?.result?.z,
    solverStatus: getStatusLabel(status, glpk),
    solveDurationMs,
    shadowPrices: [],
  }

  // Constraint slack/dual değerlerini parse et
  const rowsObj = res?.result?.rows
  const dualObj = res?.result?.dual
  if (rowsObj && subjectTo.length > 0) {
    for (const cons of subjectTo) {
      const consName = cons.name
      const rowValue = rowsObj[consName]
      const dualValue = dualObj?.[consName] ?? 0

      const slack = typeof rowValue === 'number' ? rowValue : 0
      const isBinding = Math.abs(slack) < 1e-4

      diagnostics.shadowPrices!.push({
        constraintName: consName,
        constraintLabel: getConstraintLabel(consName),
        shadowPrice: dualValue,
        slack,
        isBinding,
        explanation: generateConstraintExplanation(consName, isBinding, dualValue, slack),
      })
    }
  }

  return { solver: 'lp', solution, feasible, final, notes, diagnostics }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStatusLabel(status: number | undefined, glpk: any): string {
  if (typeof status !== 'number') return 'unknown'
  if (status === glpk.GLP_OPT) return 'optimal'
  if (status === glpk.GLP_FEAS) return 'feasible'
  if (status === glpk.GLP_INFEAS) return 'infeasible'
  if (status === glpk.GLP_NOFEAS) return 'no_feasible'
  if (status === glpk.GLP_UNBND) return 'unbounded'
  if (status === glpk.GLP_UNDEF) return 'undefined'
  return `status_${status}`
}

function getConstraintLabel(name: string): string {
  const labels: Record<string, string> = {
    dmi: 'Kuru Madde Alımı (DMI)',
    forage_ratio_min: 'Minimum Kaba Yem Oranı',
    conc_ratio_max: 'Maksimum Konsantre Oranı',
    me_min: 'Minimum Metabolik Enerji',
    nem_min: 'Minimum Net Enerji (Bakım, NEm)',
    neg_min: 'Minimum Net Enerji (Canlı Ağırlık Artışı, NEg)',
    cp_min: 'Minimum Ham Protein',
    ndf_ratio_min: 'Minimum NDF Oranı',
    ndf_ratio_max: 'Maksimum NDF Oranı',
    starch_ratio_max: 'Maksimum Nişasta Oranı',
    sugar_ratio_max: 'Maksimum Şeker Oranı',
    fat_ratio_max: 'Maksimum Yağ Oranı',
    ca_min: 'Minimum Kalsiyum',
    p_min: 'Minimum Fosfor',
    cost_max: 'Maksimum Maliyet',
  }
  return labels[name] || name
}

function generateConstraintExplanation(
  name: string,
  isBinding: boolean,
  dual: number,
  slack: number
): string {
  if (!isBinding) {
    return `Kısıt aktif değil (slack: ${slack.toFixed(2)})`
  }

  if (name === 'dmi') {
    return dual > 0
      ? `DMI üst sınırda; 1 kg daha fazla DMI ${Math.abs(dual).toFixed(2)} TL tasarruf sağlar`
      : `DMI alt sınırda; 1 kg daha az DMI ${Math.abs(dual).toFixed(2)} TL arttırır`
  }

  if (name === 'me_min') {
    return `ME kısıtı aktif; 1 Mcal daha fazla ME gereksinimi maliyeti ${Math.abs(dual).toFixed(2)} TL arttırır`
  }

  if (name === 'nem_min') {
    return `NEm kısıtı aktif; 1 Mcal daha fazla NEm gereksinimi maliyeti ${Math.abs(dual).toFixed(2)} TL arttırır`
  }

  if (name === 'neg_min') {
    return `NEg kısıtı aktif; 1 Mcal daha fazla NEg gereksinimi maliyeti ${Math.abs(dual).toFixed(2)} TL arttırır`
  }

  if (name === 'cp_min') {
    return `CP kısıtı aktif; 1 g daha fazla CP gereksinimi maliyeti ${Math.abs(dual).toFixed(2)} TL arttırır`
  }

  if (name === 'cost_max') {
    return `Maliyet üst sınırında; bütçe ${Math.abs(dual).toFixed(2)} TL arttırılırsa enerji/protein dengesi iyileşebilir`
  }

  if (name.includes('ratio')) {
    return isBinding ? `Bu oran kısıtı aktif (shadow: ${dual.toFixed(4)})` : ''
  }

  return isBinding ? `Kısıt aktif; dual value: ${dual.toFixed(4)}` : ''
}

// Helper utilities moved to src/engine/optimizer/*

/**
 * LP Solver (Greedy - Faz 1)
 * 
 * İyileştirilmiş greedy:
 * 1. Kaba yem önceliği (%40-60 forage)
 * 2. Enerji-protein dengesi
 * 3. Mineral dengeleme
 * 4. Iterative refinement
 */
async function solveLP_Greedy(
  req: NutrientRequirement,
  feeds: Feed[],
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Promise<{
  solver: 'greedy'
  solution: SolutionVector
  feasible: boolean
  final: { meMcal: number; cpGrams: number; dmiKg: number }
  notes: string[]
}> {
  const solution: SolutionVector = {
    feedAmounts: new Map(),
    totalCost: 0,
    iterations: 0,
  }

  const notes: string[] = []

  const dmiTolPct =
    typeof preferences?.lpDmiTolerancePercent === 'number'
      ? Math.min(10, Math.max(0.5, preferences.lpDmiTolerancePercent))
      : 4
  const dmiTol = dmiTolPct / 100
  const dmiMin = req.dmiKg * (1 - dmiTol)
  const dmiMax = req.dmiKg * (1 + dmiTol)

  const maxIterations = 200
  let iteration = 0
  let cappedSkips = 0

  // Yem kategorileri
  const forageFeeds = feeds.filter((f) => f.category === 'forage')
  const concentrateFeeds = feeds.filter((f) => f.category === 'concentrate')
  const mineralFeeds = feeds.filter((f) => f.category === 'mineral')

  if (forageFeeds.length === 0) notes.push('⚠️ Seçili set içinde kaba yem yok - rasyon oluşturulamaz')
  if (concentrateFeeds.length === 0) notes.push('⚠️ Seçili set içinde konsantre yem yok - enerji/protein eksik olabilir')
  if (mineralFeeds.length === 0) {
    notes.push('⚠️ KRİTİK: Seçili set içinde mineral/premiks yok!')
    notes.push('→ Ca, P, Na, Mg dengeleri karşılanamaz')
    notes.push('→ Lütfen mineral premiks, kireçtaşı, tuz ekleyin veya Wizard kullanın')
  }

  // 0. Minimum dahil etme kısıtları (varsa)
  for (const feed of feeds) {
    const minAsFed = getMinAsFedKgPerDay(feed, req, preferences)
    if (!minAsFed || minAsFed <= 0) continue
    const maxAsFed = getEffectiveMaxAsFedKgPerDay(feed, req, profile, preferences)
    const clamped = typeof maxAsFed === 'number' ? Math.min(minAsFed, maxAsFed) : minAsFed
    if (clamped <= 0) continue
    solution.feedAmounts.set(feed, clamped)
    solution.totalCost += getFeedPriceTLPerKg(feed, preferences) * clamped
    if (typeof maxAsFed === 'number' && minAsFed > maxAsFed) {
      notes.push(`${feed.name} min (${minAsFed}) max (${maxAsFed}) ile sınırlandı`)
    }
  }

  // 1. Kaba yem seçimi (target: DM bazlı default %50 forage)
  const forageRatio =
    typeof preferences?.minForagePercent === 'number'
      ? Math.min(0.9, Math.max(0, preferences.minForagePercent / 100))
      : 0.5

  const maxConcRatio =
    typeof preferences?.maxConcentratePercent === 'number'
      ? Math.min(0.95, Math.max(0, preferences.maxConcentratePercent / 100))
      : undefined
  const targetForageDMKg = req.dmiKg * forageRatio
  const alreadyForageDM = sumDmByCategory(solution).forage
  const remainingForageDM = Math.max(0, targetForageDMKg - alreadyForageDM)
  const selectedForages = selectForages(forageFeeds, remainingForageDM, req, profile, preferences)

  if (!selectedForages) {
    notes.push('Kaba yem seçimi yapılamadı (limitler çok düşük olabilir)')
    const final = calculateSolutionNutrients(solution)
    return { solver: 'greedy', solution, feasible: false, final, notes }
  }

  for (const [feed, amount] of selectedForages) {
    solution.feedAmounts.set(feed, amount)
    solution.totalCost += getFeedPriceTLPerKg(feed, preferences) * amount
  }

  // 2. Konsantre ile eksiklikleri kapatma
  const currentNutrients = calculateSolutionNutrients(solution)
  const deficits = {
    energy: Math.max(0, req.meMcal - currentNutrients.meMcal),
    protein: Math.max(0, req.cpGrams - currentNutrients.cpGrams),
  }

  // Energy-dense ve protein-dense yemleri dengeli ekle
  while (
    (deficits.energy > 0.05 || deficits.protein > 5) &&
    iteration < maxIterations
  ) {
    const nextFeed = selectNextConcentrate(
      concentrateFeeds,
      deficits,
      solution,
      req,
      profile,
      preferences
    )

    if (!nextFeed) break

    // DM-based increment for consistent ME/CP accounting (reduced for finer control)
    const dmIncrementKg = 0.15
    const amountKg = dmToAsFedKg(nextFeed.feed, dmIncrementKg)
    const current = solution.feedAmounts.get(nextFeed.feed) || 0
    const maxAllowed = getEffectiveMaxAsFedKgPerDay(nextFeed.feed, req, profile, preferences)
    if (typeof maxAllowed === 'number' && current >= maxAllowed) {
      cappedSkips++
      iteration++
      continue
    }

    const nextAmount =
      typeof maxAllowed === 'number' ? Math.min(current + amountKg, maxAllowed) : current + amountKg

    if (nextAmount <= current) {
      cappedSkips++
      iteration++
      continue
    }

    const delta = nextAmount - current
    solution.feedAmounts.set(nextFeed.feed, nextAmount)
    solution.totalCost += getFeedPriceTLPerKg(nextFeed.feed, preferences) * delta

    // Recalculate
    const updated = calculateSolutionNutrients(solution)
    deficits.energy = Math.max(0, req.meMcal - updated.meMcal)
    deficits.protein = Math.max(0, req.cpGrams - updated.cpGrams)

    iteration++
  }

  // 3. Mineral takviyesi
  const minerals = selectMinerals(mineralFeeds, solution, req, profile, preferences)
  for (const [feed, amount] of minerals) {
    const current = solution.feedAmounts.get(feed) || 0
    const maxAllowed = getEffectiveMaxAsFedKgPerDay(feed, req, profile, preferences)
    const nextAmount =
      typeof maxAllowed === 'number' ? Math.min(current + amount, maxAllowed) : current + amount
    if (nextAmount > current) {
      const delta = nextAmount - current
      solution.feedAmounts.set(feed, nextAmount)
      solution.totalCost += getFeedPriceTLPerKg(feed, preferences) * delta
    }
  }

  // 4. DMI bandını yakalamak için son doldurma (özellikle LP devreye giremediğinde)
  // Greedy enerji/proteinle hedefi yakalayıp DMI'yi düşük bırakabiliyor.
  // Burada tercihen kaba yem ile toplam DMI'yi dmiMin seviyesine yaklaştırıyoruz.
  const totalsBeforeFill = calculateSolutionNutrients(solution)
  if (Number.isFinite(dmiMin) && totalsBeforeFill.dmiKg < dmiMin) {
    let safety = 0
    while (safety < 400) {
      const totals = calculateSolutionNutrients(solution)
      if (totals.dmiKg >= dmiMin) break

      const byCat = sumDmByCategory(solution)
      const totalDm = Math.max(0.0001, byCat.total)
      const concRatio = byCat.concentrate / totalDm
      const needForage = forageRatio > 0 && byCat.forage / totalDm < forageRatio
      const canAddConc = typeof maxConcRatio !== 'number' || concRatio < maxConcRatio - 0.01

      const candidatePool = needForage
        ? forageFeeds
        : canAddConc
          ? [...forageFeeds, ...concentrateFeeds]
          : forageFeeds

      // Cheapest per kg DM
      const candidate = candidatePool
        .map((f) => ({ f, dmFrac: dmFraction(f), dmCost: getFeedPriceTLPerKg(f, preferences) / Math.max(0.05, dmFraction(f)) }))
        .filter((x) => x.dmFrac > 0.05)
        .sort((a, b) => a.dmCost - b.dmCost)[0]

      if (!candidate) {
        notes.push('DMI hedefi için eklenecek uygun yem bulunamadı')
        break
      }

      const dmIncrementKg = 0.2
      const amountKgAsFed = dmToAsFedKg(candidate.f, dmIncrementKg)
      const current = solution.feedAmounts.get(candidate.f) || 0
      const maxAllowed = getEffectiveMaxAsFedKgPerDay(candidate.f, req, profile, preferences)
      if (typeof maxAllowed === 'number' && current >= maxAllowed) {
        // Bu yem doluysa havuzdan bir sonraki ucuz yemle tekrar deneyebilmek için
        // geçici olarak listeden çıkarma yerine safety ile sınırlıyoruz.
        safety++
        continue
      }

      const nextAmount =
        typeof maxAllowed === 'number' ? Math.min(current + amountKgAsFed, maxAllowed) : current + amountKgAsFed

      if (nextAmount <= current) {
        safety++
        continue
      }

      const delta = nextAmount - current
      solution.feedAmounts.set(candidate.f, nextAmount)
      solution.totalCost += getFeedPriceTLPerKg(candidate.f, preferences) * delta

      safety++
    }

    const totalsAfterFill = calculateSolutionNutrients(solution)
    if (totalsAfterFill.dmiKg < dmiMin) {
      notes.push(`DMI hedefi altında kaldı: ${totalsAfterFill.dmiKg.toFixed(1)} / ${req.dmiKg.toFixed(1)} kg (min ${dmiMin.toFixed(1)})`)
    }
    if (totalsAfterFill.dmiKg > dmiMax) {
      notes.push(`DMI hedefinin üstüne çıktı: ${totalsAfterFill.dmiKg.toFixed(1)} / ${req.dmiKg.toFixed(1)} kg (max ${dmiMax.toFixed(1)})`)
    }
  }

  solution.iterations = iteration

  // Validate
  const final = calculateSolutionNutrients(solution)
  // Small absolute epsilon to avoid flipping feasibility due to rounding/increment granularity.
  const dmiEpsKg = 0.1
  const feasible =
    final.meMcal >= req.meMcal * 0.90 &&
    final.cpGrams >= req.cpGrams * 0.90 &&
    (!Number.isFinite(dmiMin) || (final.dmiKg >= dmiMin - dmiEpsKg && final.dmiKg <= dmiMax + dmiEpsKg))
  if (!feasible) {
    if (preferences?.maxCostPerDay && solution.totalCost >= preferences.maxCostPerDay) {
      notes.push('Maliyet tavanı nedeniyle çözüm kısıtlandı')
    }
    if (cappedSkips > 0) {
      notes.push('Bazı yemler max kullanım limitine takıldı; limitleri artırmayı deneyin')
    }
    if (Number.isFinite(dmiMin) && (final.dmiKg < dmiMin - dmiEpsKg || final.dmiKg > dmiMax + dmiEpsKg)) {
      notes.push(`DMI hedef bandı dışında: ${final.dmiKg.toFixed(1)} / ${req.dmiKg.toFixed(1)} kg (±${dmiTolPct.toFixed(1)}%)`)
    }
  }

  return { solver: 'greedy', solution, feasible, final, notes }
}

// SolutionVector moved to src/engine/optimizer/types.ts

/**
 * Kaba yem seçimi (cost-efficient + quality)
 */
function selectForages(
  forages: Feed[],
  targetDMI: number,
  _req: NutrientRequirement,
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Map<Feed, number> | null {
  if (forages.length === 0) return null

  if (targetDMI <= 0) return new Map()

  // Score forages (quality/price ratio)
  const scored = forages
    .map((f) => ({
      feed: f,
      score: scoreForage(f, _req, preferences),
    }))
    .sort((a, b) => b.score - a.score)

  const selected = new Map<Feed, number>()

  let remaining = targetDMI
  for (let i = 0; i < scored.length && remaining > 1e-6; i++) {
    const feed = scored[i].feed
    const desiredDM = i === 0 ? targetDMI * 0.6 : i === 1 ? targetDMI * 0.4 : remaining
    const desiredDMClamped = Math.min(desiredDM, remaining)

    const desiredAsFed = dmToAsFedKg(feed, desiredDMClamped)
    const maxAllowedAsFed = getEffectiveMaxAsFedKgPerDay(feed, _req, profile, preferences)
    const amountAsFed =
      typeof maxAllowedAsFed === 'number' ? Math.min(desiredAsFed, maxAllowedAsFed) : desiredAsFed

    const amountDM = asFedToDmKg(feed, amountAsFed)

    if (amountAsFed > 0) {
      selected.set(feed, amountAsFed)
      remaining -= amountDM
    }
  }

  // Not enough forage capacity selected
  if (remaining > Math.max(0.25, targetDMI * 0.05)) {
    return null
  }

  return selected
}

function scoreForage(
  feed: Feed,
  _req: NutrientRequirement,
  preferences?: OptimizationPreferences
): number {
  let score = 0

  // Quality (energy + protein)
  const energyDensity = feed.meMcalPerKg
  const proteinDensity = feed.cpPercent

  score += energyDensity * 10 // ME is valuable
  score += proteinDensity * 2

  // Price efficiency
  const priceEfficiency = energyDensity / getFeedPriceTLPerKg(feed, preferences)
  score += priceEfficiency * 5

  // Organic bonus
  if (preferences?.prioritizeOrganic && feed.isOrganic) {
    score += 20
  }

  return score
}

/**
 * Sonraki konsantre seçimi (energy vs protein need)
 */
function selectNextConcentrate(
  concentrates: Feed[],
  deficits: { energy: number; protein: number },
  solution: SolutionVector,
  req: NutrientRequirement,
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): { feed: Feed; score: number } | null {
  if (concentrates.length === 0) return null

  // DMI limit check
  const dmTotals = sumDmByCategory(solution)
  if (dmTotals.total >= req.dmiKg * 1.05) return null // 5% tolerance

  // Concentrate ratio cap (DM basis)
  if (typeof preferences?.maxConcentratePercent === 'number') {
    const cap = Math.min(0.95, Math.max(0, preferences.maxConcentratePercent / 100))
    const maxConcDM = req.dmiKg * cap
    if (dmTotals.concentrate >= maxConcDM) return null
  }

  // Cost limit check
  if (preferences?.maxCostPerDay && solution.totalCost >= preferences.maxCostPerDay) {
    return null
  }

  const scored = concentrates
    .map((f) => {
      const current = solution.feedAmounts.get(f) || 0
      const maxAllowed = getEffectiveMaxAsFedKgPerDay(f, req, profile, preferences)
      if (typeof maxAllowed === 'number' && current >= maxAllowed) {
        return { feed: f, score: -Infinity }
      }

      // Score per kg as-fed added (approx)
      const dmFrac = dmFraction(f)
      const energyContribution = f.meMcalPerKg * dmFrac // Mcal per kg as-fed
      const proteinContribution = (f.cpPercent / 100) * dmFrac * 1000 // grams per kg as-fed

      // Weight by deficit
      const energyWeight = deficits.energy / (req.meMcal || 1)
      const proteinWeight = deficits.protein / (req.cpGrams || 1)

      const score =
        energyContribution * energyWeight +
        proteinContribution * proteinWeight -
        getFeedPriceTLPerKg(f, preferences) * 0.5

      return { feed: f, score }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || !Number.isFinite(best.score)) return null
  return best
}

/**
 * Mineral seçimi (Ca, P, Mg, trace)
 */
function selectMinerals(
  minerals: Feed[],
  solution: SolutionVector,
  req: NutrientRequirement,
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Map<Feed, number> {
  const selected = new Map<Feed, number>()

  if (minerals.length === 0) return selected

  const current = calculateSolutionMinerals(solution)
  const caDef = Math.max(0, req.caGrams - current.caGrams)
  const pDef = Math.max(0, req.pGrams - current.pGrams)
  const mgDef = Math.max(0, req.mgGrams - current.mgGrams)

  const caPRatio = current.pGrams > 0 ? current.caGrams / current.pGrams : 0

  const caPTarget = getCaPRatioTarget(profile)
  const dcadTarget = getDcadTarget(profile)

  // DCAD targeting (mEq/kg DM)
  const dcadCurrent = calculateDCADFromTotals(current)
  const dcadError = dcadTarget.target - dcadCurrent
  const wantsAnion = dcadCurrent > dcadTarget.max
  const wantsCation = dcadCurrent < dcadTarget.min

  // If minerals are already satisfied, keep a small practical baseline only if user included mineral feeds.
  // (Many farms still use premix; baseline keeps UX expectations without over-supplying.)
  const needsSupplement = caDef > 1 || pDef > 1 || mgDef > 1

  // Prefer "mineral/premiks" named feeds, otherwise pick the best by deficit coverage per cost.
  const scored = minerals
    .map((f) => {
      const dmFrac = dmFraction(f)
      const caPerKg = (f.caPercent / 100) * dmFrac * 1000
      const pPerKg = (f.pPercent / 100) * dmFrac * 1000
      const mgPerKg = ((f.mgPercent || 0) / 100) * dmFrac * 1000

      const naPerKg = ((f.naPercent || 0) / 100) * dmFrac * 1000
      const kPerKg = ((f.kPercent || 0) / 100) * dmFrac * 1000
      const sPerKg = ((f.sPercent || 0) / 100) * dmFrac * 1000
      const clPerKg = ((f.clPercent || 0) / 100) * dmFrac * 1000

      const na_meq = (naPerKg / 23) * 1000
      const k_meq = (kPerKg / 39) * 1000
      const cl_meq = (clPerKg / 35.5) * 1000
      const s_meq = (sPerKg / 32) * 2 * 1000
      const dcadMeqNumeratorPerKgAsFed = na_meq + k_meq - cl_meq - s_meq

      const caCover = caDef > 0 && caPerKg > 0 ? Math.min(1, caDef / caPerKg) : 0
      const pCover = pDef > 0 && pPerKg > 0 ? Math.min(1, pDef / pPerKg) : 0
      const mgCover = mgDef > 0 && mgPerKg > 0 ? Math.min(1, mgDef / mgPerKg) : 0

      const nameBoost = /mineral|premiks/i.test(f.name) ? 0.15 : 0
      const anionBoost = /anyonik|anionic/i.test(f.name) ? 0.25 : 0
      const price = getFeedPriceTLPerKg(f, preferences)

      // Ca:P steering (if ratio is off)
      const wantMoreCa = caPRatio > 0 && caPRatio < caPTarget.min
      const wantMoreP = caPRatio > caPTarget.max
      const capSteer = wantMoreCa ? Math.min(1, caPerKg / 150) * 0.12 : 0
      const pSteer = wantMoreP ? Math.min(1, pPerKg / 120) * 0.12 : 0

      // DCAD steering: use profile-specific target band.
      const dcadSteer =
        wantsAnion
          ? Math.max(0, -dcadMeqNumeratorPerKgAsFed / 50000) * (0.20 + anionBoost)
          : wantsCation
            ? Math.max(0, dcadMeqNumeratorPerKgAsFed / 50000) * 0.15
            : 0

      // Score: coverage (Ca/P heavier) + steering terms per price.
      const coverage = caCover * 0.45 + pCover * 0.40 + mgCover * 0.15
      const score = (coverage + nameBoost + capSteer + pSteer + dcadSteer) / Math.max(0.1, price)

      return { feed: f, caPerKg, pPerKg, mgPerKg, dcadMeqNumeratorPerKgAsFed, score }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || !Number.isFinite(best.score)) return selected

  // Her if-else dalı her zaman değer atar, başlangıç 0 gereksiz
  let amountKgAsFed: number

  if (needsSupplement) {
    const needCa = caDef > 0 && best.caPerKg > 0 ? caDef / best.caPerKg : 0
    const needP = pDef > 0 && best.pPerKg > 0 ? pDef / best.pPerKg : 0
    const needMg = mgDef > 0 && best.mgPerKg > 0 ? mgDef / best.mgPerKg : 0

    // Take the max needed among limiting minerals.
    amountKgAsFed = Math.max(needCa, needP, needMg)
  } else {
    amountKgAsFed = 0.08
  }

  // Safety clamps: avoid unrealistic premix amounts.
  amountKgAsFed = Math.min(0.25, Math.max(0.03, amountKgAsFed))

  // If user set an explicit max, honor it (actual clamp also happens at apply step).
  const maxAllowed = getEffectiveMaxAsFedKgPerDay(best.feed, req, profile, preferences)
  if (typeof maxAllowed === 'number') {
    amountKgAsFed = Math.min(amountKgAsFed, Math.max(0, maxAllowed))
  }

  if (amountKgAsFed > 0) {
    selected.set(best.feed, amountKgAsFed)
  }

  // Optional second mineral: DCAD adjuster (small add-on) if we are far from target.
  // Keeps dosing conservative: this is not a full anionic-salt program.
  const dcadOutside = dcadCurrent < dcadTarget.min - 30 || dcadCurrent > dcadTarget.max + 30
  if (dcadOutside && Math.abs(dcadError) > 120) {
    const wantsAnion = dcadCurrent > dcadTarget.max
    const wantsCation = dcadCurrent < dcadTarget.min

    const dcadCandidates = scored
      .filter((c) => c.feed.id !== best.feed.id)
      .filter((c) => {
        if (wantsAnion) return c.dcadMeqNumeratorPerKgAsFed < 0
        if (wantsCation) return c.dcadMeqNumeratorPerKgAsFed > 0
        return false
      })
      .sort((a, b) => {
        // prefer stronger effect per price
        const ap = getFeedPriceTLPerKg(a.feed, preferences)
        const bp = getFeedPriceTLPerKg(b.feed, preferences)
        const ae = Math.abs(a.dcadMeqNumeratorPerKgAsFed) / Math.max(0.1, ap)
        const be = Math.abs(b.dcadMeqNumeratorPerKgAsFed) / Math.max(0.1, bp)
        return be - ae
      })

    const dcadBest = dcadCandidates[0]
    if (dcadBest) {
      let addon = wantsAnion ? 0.06 : 0.05
      addon = Math.min(0.12, Math.max(0.02, addon))

      const maxAllowed = getEffectiveMaxAsFedKgPerDay(dcadBest.feed, req, profile, preferences)
      if (typeof maxAllowed === 'number') {
        addon = Math.min(addon, Math.max(0, maxAllowed))
      }

      if (addon > 0) {
        selected.set(dcadBest.feed, (selected.get(dcadBest.feed) || 0) + addon)
      }
    }
  }

  return selected
}

/**
 * Mevcut besin değerlerini hesapla
 */
function calculateSolutionNutrients(solution: SolutionVector): {
  meMcal: number
  cpGrams: number
  dmiKg: number
} {
  let totalDmiKg = 0
  let totalMeMcal = 0
  let totalCpGrams = 0

  for (const [feed, kgAsFed] of solution.feedAmounts) {
    const kgDM = kgAsFed * (feed.dmPercent / 100)
    totalDmiKg += kgDM
    totalMeMcal += feed.meMcalPerKg * kgDM
    totalCpGrams += (feed.cpPercent / 100) * kgDM * 1000
  }

  return { meMcal: totalMeMcal, cpGrams: totalCpGrams, dmiKg: totalDmiKg }
}

/**
 * Solution'dan Ration objesi oluştur
 */
function buildRation(
  solution: SolutionVector,
  req: NutrientRequirement,
  profile: AnimalProfile,
  preferences?: OptimizationPreferences
): Ration {
  const ingredients = Array.from(solution.feedAmounts.entries()).map(([feed, kgAsFed]) => {
    const kgDM = kgAsFed * (feed.dmPercent / 100)
    const priceTLPerKg = getFeedPriceTLPerKg(feed, preferences)
    return {
      feedId: feed.id,
      feedName: feed.name,
      feedCategory: feed.category,
      ndfPercent: feed.ndfPercent,
      kgAsFedPerDay: kgAsFed,
      kgDMPerDay: kgDM,
      costTL: kgAsFed * priceTLPerKg,
    }
  })

  // Calculate totals
  let totalDMI = 0
  let totalME = 0
  const trackBeefNE = typeof req.nemMcal === 'number' || typeof req.negMcal === 'number'
  let totalNEm = trackBeefNE ? 0 : undefined
  let totalNEg = trackBeefNE ? 0 : undefined
  let totalCP = 0
  let totalNDF = 0
  let totalStarch = 0
  let totalSugar = 0
  let totalFat = 0
  let totalCa = 0
  let totalP = 0
  let totalMg = 0
  let totalNa = 0
  let totalK = 0
  let totalS = 0
  let totalCl = 0
  
  // Trace minerals (mg/day)
  let totalFe = 0
  let totalZn = 0
  let totalCu = 0
  let totalMn = 0
  let totalCo = 0
  let totalI = 0
  let totalSe = 0
  
  // Vitamins (IU or mg/day)
  let totalVitA = 0
  let totalVitD = 0
  let totalVitE = 0
  let totalVitK = 0

  for (const [feed, kgAsFed] of solution.feedAmounts) {
    const kgDM = kgAsFed * (feed.dmPercent / 100)
    totalDMI += kgDM
    totalME += feed.meMcalPerKg * kgDM
    if (trackBeefNE) {
      const { nemMcalPerKgDm, negMcalPerKgDm } = estimateFeedNEmNegFromME(feed.meMcalPerKg)
      totalNEm = (totalNEm ?? 0) + nemMcalPerKgDm * kgDM
      totalNEg = (totalNEg ?? 0) + negMcalPerKgDm * kgDM
    }
    totalCP += (feed.cpPercent / 100) * kgDM * 1000
    totalNDF += (feed.ndfPercent / 100) * kgDM * 1000
    totalStarch += ((feed.starchPercent || 0) / 100) * kgDM * 1000
    totalSugar += ((feed.sugarPercent || 0) / 100) * kgDM * 1000
    totalFat += ((feed.fatPercent || 0) / 100) * kgDM * 1000
    totalCa += (feed.caPercent / 100) * kgDM * 1000
    totalP += (feed.pPercent / 100) * kgDM * 1000
    totalMg += ((feed.mgPercent || 0) / 100) * kgDM * 1000
    totalNa += ((feed.naPercent || 0) / 100) * kgDM * 1000
    totalK += ((feed.kPercent || 0) / 100) * kgDM * 1000
    totalS += ((feed.sPercent || 0) / 100) * kgDM * 1000
    totalCl += ((feed.clPercent || 0) / 100) * kgDM * 1000
    
    // Trace minerals (ppm → mg/day)
    totalFe += (feed.fePpm || 0) * kgDM
    totalZn += (feed.znPpm || 0) * kgDM
    totalCu += (feed.cuPpm || 0) * kgDM
    totalMn += (feed.mnPpm || 0) * kgDM
    totalCo += (feed.coPpm || 0) * kgDM
    totalI += (feed.iPpm || 0) * kgDM
    totalSe += (feed.sePpm || 0) * kgDM
    
    // Vitamins (IU/kg or mg/kg → total/day)
    totalVitA += (feed.vitaminAIUPerKg || 0) * kgDM
    totalVitD += (feed.vitaminDIUPerKg || 0) * kgDM
    totalVitE += (feed.vitaminEIUPerKg || 0) * kgDM
    totalVitK += (feed.vitaminKMgPerKg || 0) * kgDM
  }

  const totals = {
    dmiKg: totalDMI,
    mePerDay: totalME,
    ...(trackBeefNE
      ? {
          nemPerDay: totalNEm ?? 0,
    
    // Trace minerals
    feMg: totalFe > 0 ? totalFe : undefined,
    znMg: totalZn > 0 ? totalZn : undefined,
    cuMg: totalCu > 0 ? totalCu : undefined,
    mnMg: totalMn > 0 ? totalMn : undefined,
    coMg: totalCo > 0 ? totalCo : undefined,
    iMg: totalI > 0 ? totalI : undefined,
    seMg: totalSe > 0 ? totalSe : undefined,
    
    // Vitamins
    vitaminAIU: totalVitA > 0 ? totalVitA : undefined,
    vitaminDIU: totalVitD > 0 ? totalVitD : undefined,
    vitaminEIU: totalVitE > 0 ? totalVitE : undefined,
    vitaminKMg: totalVitK > 0 ? totalVitK : undefined,
          negPerDay: totalNEg ?? 0,
        }
      : {}),
    cpGrams: totalCP,
    ndfPercent: (totalNDF / (totalDMI * 1000)) * 100,
    starchPercent: (totalStarch / (totalDMI * 1000)) * 100,
    sugarPercent: (totalSugar / (totalDMI * 1000)) * 100,
    fatPercent: (totalFat / (totalDMI * 1000)) * 100,
    caGrams: totalCa,
    pGrams: totalP,
    mgGrams: totalMg,
    naGrams: totalNa,
    kGrams: totalK,
    sGrams: totalS,
    clGrams: totalCl,
  }

  // Calculate protein fractions (RDP/RUP/MCP/MP) if requirements specify them
  const trackProteinFractions = typeof req.rdpGrams === 'number' || typeof req.rupGrams === 'number' || typeof req.mpGrams === 'number'
  if (trackProteinFractions) {
    const feedsWithAmounts = Array.from(solution.feedAmounts.entries()).map(([feed, kgAsFed]) => ({
      feed,
      kgDmPerDay: kgAsFed * (feed.dmPercent / 100),
    }))

    const proteinFractions = calculateDietProteinFractions(feedsWithAmounts, totals.mePerDay, totals.dmiKg)
    Object.assign(totals, {
      rdpGrams: proteinFractions.rdpGrams,
      rupGrams: proteinFractions.rupGrams,
      mcpGrams: proteinFractions.mcpGrams,
      mpGrams: proteinFractions.mpGrams,
    })
  }

  // Kullanıcının girdiği fiyatları çıkart (alternatif öneriler için)
  const userEnteredPrices: Record<string, number> = {}
  if (preferences?.feedConstraints) {
    for (const [feedId, constraint] of Object.entries(preferences.feedConstraints)) {
      if (constraint.priceOverrideTLPerKg && constraint.priceOverrideTLPerKg > 0) {
        userEnteredPrices[feedId] = constraint.priceOverrideTLPerKg
      }
    }
  }

  return {
    id: `ration_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile,
    requirements: req,
    totals,
    ingredients,
    cost: {
      dailyFeedCostTL: solution.totalCost,
      costPerKgMilk: profile.milkYieldKgPerDay
        ? solution.totalCost / profile.milkYieldKgPerDay
        : 0,
      monthlyCostTL: solution.totalCost * 30,
    },
    userEnteredPrices: Object.keys(userEnteredPrices).length > 0 ? userEnteredPrices : undefined,
  }
}
