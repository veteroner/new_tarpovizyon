import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AnimalProfile } from '@/types'
import { useRationWizardStore } from '@/store/rationWizardStore'

function mapPhaseToStage(phase?: AnimalProfile['productionPhase']): AnimalProfile['stage'] | undefined {
  if (!phase) return undefined
  if (phase === 'dry-faroff' || phase === 'dry-closeup') return 'dry'
  if (phase === 'fresh' || phase === 'peak') return 'early'
  if (phase === 'mid') return 'mid'
  if (phase === 'late') return 'late'
  return undefined
}

export default function StepGoal() {
  const navigate = useNavigate()
  const profile = useRationWizardStore((s) => s.draft.profile)
  const setProfile = useRationWizardStore((s) => s.setProfile)

  const showMilk = profile.purpose === 'dairy' && profile.stage !== 'dry'
  const showAdg = profile.purpose === 'beef' || profile.purpose === 'grower'

  const showParity = profile.purpose === 'dairy' && profile.species === 'cattle'
  const showDairyPhase = profile.purpose === 'dairy'
  const showBeefPhase = profile.purpose === 'beef' || profile.purpose === 'grower'
  const showDryPhase = profile.purpose === 'dry' || profile.stage === 'dry'

  const goalHint = (() => {
    switch (profile.purpose) {
      case 'dairy':
        return profile.stage === 'dry'
          ? 'Dönem kuru seçili. Süt verimi 0 kabul edilir.'
          : 'Süt verimini gir; sistem enerji+protein hedefini buna göre ayarlar.'
      case 'beef':
        return 'Besi hedefi için günlük canlı ağırlık artışı (ADG) gir.'
      case 'dry':
        return 'Kuru dönem için süt verimi gerekmez.'
      case 'grower':
        return 'Düve/Genç hayvan için hedef ADG gir.'
      default:
        return ''
    }
  })()

  const onParityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const n = Number(e.target.value)
    const parity = n === 1 || n === 2 || n === 3 ? n : 2
    setProfile({ parity })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Hedef</h2>
        <p className="text-sm text-gray-600">Hayvanın üretim hedefini seç.</p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">Üretim Amacı</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { value: 'dairy' as const, label: '🥛 Süt' },
                { value: 'beef' as const, label: '🥩 Besi' },
                { value: 'dry' as const, label: '🌾 Kuru' },
                { value: 'grower' as const, label: '🐮 Düve' },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next: Partial<AnimalProfile> = {
                    purpose: opt.value,
                  }

                  if (opt.value !== 'dairy') next.milkYieldKgPerDay = undefined
                  if (opt.value !== 'beef' && opt.value !== 'grower') next.targetAdgKgPerDay = undefined

                  setProfile(next)
                }}
                className={
                  profile.purpose === opt.value
                    ? 'rounded-lg border-2 border-primary-500 bg-primary-50 px-3 py-3 font-semibold text-primary-700'
                    : 'rounded-lg border-2 border-gray-200 bg-white px-3 py-3 font-semibold text-gray-700 hover:bg-gray-50'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">{goalHint}</p>
        </div>

        {showParity && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Laktasyon (Parite)</label>
              <select
                className="input-field"
                value={profile.parity ?? 2}
                onChange={onParityChange}
              >
                <option value={1}>1. Laktasyon</option>
                <option value={2}>2. Laktasyon</option>
                <option value={3}>3+ Laktasyon</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                1. laktasyonda DMI genellikle daha düşük olabilir.
              </p>
            </div>
          </div>
        )}

        {showDairyPhase && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Üretim Fazı</label>
              <select
                className="input-field"
                value={profile.productionPhase ?? (showDryPhase ? 'dry-faroff' : 'mid')}
                onChange={(e) => {
                  const nextPhase = e.target.value as AnimalProfile['productionPhase']
                  const nextStage = mapPhaseToStage(nextPhase)
                  setProfile({ productionPhase: nextPhase, ...(nextStage ? { stage: nextStage } : {}) })
                }}
              >
                {showDryPhase ? (
                  <>
                    <option value="dry-faroff">Kuru-1 (Far-off)</option>
                    <option value="dry-closeup">Kuru-2 (Close-up)</option>
                  </>
                ) : (
                  <>
                    <option value="fresh">Fresh (Doğum sonrası)</option>
                    <option value="peak">Pik (Peak)</option>
                    <option value="mid">Orta Laktasyon</option>
                    <option value="late">Geç Laktasyon</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Faz seçimi DMI hedefini ve bazı pratik limitleri etkiler.
              </p>
            </div>
          </div>
        )}

        {showBeefPhase && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Besi Fazı</label>
              <select
                className="input-field"
                value={profile.productionPhase ?? 'grower'}
                onChange={(e) => setProfile({ productionPhase: e.target.value as AnimalProfile['productionPhase'] })}
              >
                <option value="starter">Başlangıç (Starter)</option>
                <option value="grower">Geliştirme (Grower)</option>
                <option value="finisher">Bitiş (Finisher)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Faz seçimi nişasta/NDF limitlerini daha gerçekçi ayarlar.
              </p>
            </div>
          </div>
        )}

        {showMilk && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Süt Verimi (kg/gün)</label>
              <input
                className="input-field"
                type="number"
                min={0}
                max={100}
                value={profile.milkYieldKgPerDay ?? 0}
                onChange={(e) => setProfile({ milkYieldKgPerDay: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {showAdg && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Hedef ADG (kg/gün)</label>
              <input
                className="input-field"
                type="number"
                min={0}
                max={3}
                step={0.05}
                value={profile.targetAdgKgPerDay ?? 0.8}
                onChange={(e) => setProfile({ targetAdgKgPerDay: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="btn-secondary" type="button" onClick={() => navigate('/rasyon/wizard/animal')}>
          Geri
        </button>
        <button className="btn-primary" type="button" onClick={() => navigate('/rasyon/wizard/feeds')}>
          Devam
        </button>
      </div>
    </div>
  )
}
