import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { feeds as builtInFeeds } from '@/data/feedsV2'
import { optimizeRation } from '@/engine/optimizerV2'
import type { AnimalProfile } from '@/types'
import logger from '@/utils/logger'

type SelfTestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'pass'; message: string; details?: string }
  | { status: 'fail'; message: string; details?: string }

function pickFeeds() {
  const uniqueById = new Map<string, (typeof builtInFeeds)[number]>()
  for (const f of builtInFeeds) {
    if (!uniqueById.has(f.id)) uniqueById.set(f.id, f)
  }

  const ids = [
    // forage
    'corn-silage-high',
    'alfalfa-hay-high',
    // concentrate
    'soybean-meal',
    'barley-grain',
    // mineral (include premix so trace/vitamin constraints are satisfiable)
    'mineral-premix',
    'salt',
  ]

  const picked = ids
    .map((id) => uniqueById.get(id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))

  return picked.length >= 4 ? picked : Array.from(uniqueById.values()).slice(0, 6)
}

export default function DiagnosticsOptimizer() {
  const feeds = useMemo(() => pickFeeds(), [])
  const [state, setState] = useState<SelfTestState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setState({ status: 'running' })
      try {
        const profile: AnimalProfile = {
          species: 'cattle',
          breed: 'holstein',
          sex: 'female',
          purpose: 'dairy',
          weightKg: 650,
          stage: 'mid',
          milkYieldKgPerDay: 30,
        }

        const result = await optimizeRation(profile, feeds, {
          solver: 'lp',
        })

        if (cancelled) return

        if (result.status !== 'success' || !result.ration) {
          setState({
            status: 'fail',
            message: 'Optimizer self-test failed',
            details: result.message,
          })
          return
        }

        const solver = result.ration.solver ?? result.solver
        if (solver !== 'lp') {
          setState({
            status: 'fail',
            message: 'LP solver not used',
            details: `solver=${String(solver)}`,
          })
          return
        }

        setState({
          status: 'pass',
          message: 'Optimizer self-test passed',
          details: `solver=${solver}; cost=${result.ration.cost.dailyFeedCostTL.toFixed(2)} TL/gün`,
        })
      } catch (err) {
        logger.error('Optimizer self-test error:', err)
        if (cancelled) return
        setState({
          status: 'fail',
          message: 'Optimizer self-test threw an error',
          details: err instanceof Error ? err.message : String(err),
        })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [feeds])

  const content = (() => {
    if (state.status === 'running' || state.status === 'idle') {
      return (
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <div className="font-semibold">Self-test çalışıyor…</div>
            <div className="text-xs text-gray-500">Bu işlem ilk çalıştırmada WASM yüklediği için 1-3 sn sürebilir.</div>
          </div>
        </div>
      )
    }

    if (state.status === 'pass') {
      return (
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <div className="font-semibold text-green-800">{state.message}</div>
            {state.details && <div className="mt-1 text-xs text-gray-600">{state.details}</div>}
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-3">
        <XCircle className="h-6 w-6 text-red-600" />
        <div>
          <div className="font-semibold text-red-800">{state.message}</div>
          {state.details && <div className="mt-1 text-xs text-gray-600">{state.details}</div>}
        </div>
      </div>
    )
  })()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Diagnostics: Optimizer Self-Test</h1>
      <p className="mt-2 text-sm text-gray-600">
        Bu sayfa GLPK (WASM) yolunu tarayıcıda çalıştırıp doğrular.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        {content}

        <div className="mt-4 text-xs text-gray-500">
          Kullanılan yemler: {feeds.map((f) => f.name).join(', ')}
        </div>
      </div>
    </div>
  )
}
