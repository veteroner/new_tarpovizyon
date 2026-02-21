import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BreedType, LactationStage, Sex } from '@/types'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { getBreedOptions } from '@/utils/animalMetadata'
import { parseNaturalInput } from '@/services/ai/huggingface'
import { useUIStore } from '@/store/uiStore'
import { Sparkles } from 'lucide-react'

export default function StepAnimal() {
  const navigate = useNavigate()
  const profile = useRationWizardStore((s) => s.draft.profile)
  const setProfile = useRationWizardStore((s) => s.setProfile)
  const showToast = useUIStore((s) => s.showToast)

  const [naturalText, setNaturalText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [lastAiPatchSummary, setLastAiPatchSummary] = useState<string | null>(null)

  const breeds = useMemo(() => getBreedOptions(profile.species), [profile.species])

  const handleNaturalParse = async () => {
    if (!naturalText.trim()) {
      showToast({ type: 'warning', message: 'Lütfen bir metin girin.' })
      return
    }

    setAiLoading(true)
    try {
      const patch = await parseNaturalInput(naturalText)
      if (patch) {
        setProfile(patch)
        const parts: string[] = []
        if (typeof patch.species === 'string') parts.push(`Tür: ${patch.species}`)
        if (typeof patch.breed === 'string') parts.push(`Irk: ${patch.breed}`)
        if (typeof patch.weightKg === 'number') parts.push(`Ağırlık: ${Math.round(patch.weightKg)}kg`)
        if (typeof patch.purpose === 'string') parts.push(`Amaç: ${patch.purpose}`)
        if (typeof patch.milkYieldKgPerDay === 'number') parts.push(`Süt: ${patch.milkYieldKgPerDay}kg/gün`)
        setLastAiPatchSummary(parts.length ? parts.join(' • ') : 'AI bazı alanları doldurdu')
        showToast({
          type: 'success',
          message: '✨ AI ile hayvan bilgileri dolduruldu! Devam edin → hedefi belirleyin.',
        })
        setNaturalText('')
      } else {
        showToast({
          type: 'info',
          message: 'Metinden bilgi çıkarılamadı. Daha açık bir ifade deneyin.',
        })
      }
    } catch (err) {
      console.error('AI parse failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'AI_CONFIG_MISSING') {
        showToast({
          type: 'error',
          message: 'AI özelliği bu ortamda aktif değil (HF_API_KEY tanımlı değil).',
        })
        return
      }
      showToast({
        type: 'error',
        message: 'AI servisi şu an kullanılamıyor. Lütfen manuel giriş yapın.',
      })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Hayvan Bilgileri</h2>
        <p className="text-sm text-gray-600">Önce hayvanı tanımla.</p>
      </div>

      {/* AI Hızlı Giriş */}
      <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              🤖 Hızlı Giriş (AI ile)
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Doğal dil ile hayvan bilgilerini girin, AI otomatik dolduracak.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNaturalParse()}
                placeholder='Örn: "650kg Holstein inek, 30kg süt veriyor"'
                className="input-field flex-1"
                disabled={aiLoading}
              />
              <button
                type="button"
                onClick={handleNaturalParse}
                disabled={!naturalText.trim() || aiLoading}
                className="btn-secondary whitespace-nowrap"
              >
                {aiLoading ? 'İşleniyor...' : 'Oku'}
              </button>
            </div>

            {lastAiPatchSummary && (
              <p className="mt-2 text-xs text-gray-600">
                Son AI doldurma: {lastAiPatchSummary}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">Hayvan Türü</label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'cattle' as const, label: '🐄 Sığır' },
                { value: 'sheep' as const, label: '🐑 Koyun' },
                { value: 'goat' as const, label: '🐐 Keçi' },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const nextSpecies = opt.value
                  const nextBreeds = getBreedOptions(nextSpecies)
                  setProfile({
                    species: nextSpecies,
                    breed: nextBreeds[0].value,
                  })
                }}
                className={
                  profile.species === opt.value
                    ? 'rounded-lg border-2 border-primary-500 bg-primary-50 px-3 py-3 font-semibold text-primary-700'
                    : 'rounded-lg border-2 border-gray-200 bg-white px-3 py-3 font-semibold text-gray-700 hover:bg-gray-50'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Irk</label>
            <select
              className="input-field"
              value={profile.breed}
              onChange={(e) => setProfile({ breed: e.target.value as BreedType })}
            >
              {breeds.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Cinsiyet</label>
            <select
              className="input-field"
              value={profile.sex}
              onChange={(e) => setProfile({ sex: e.target.value as Sex })}
            >
              <option value="female">Dişi</option>
              <option value="male">Erkek</option>
              <option value="castrated">Kastre</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Canlı Ağırlık (kg)</label>
            <input
              className="input-field"
              type="number"
              min={10}
              max={1500}
              value={profile.weightKg}
              onChange={(e) => setProfile({ weightKg: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="label">Dönem</label>
            <select
              className="input-field"
              value={profile.stage}
              onChange={(e) => setProfile({ stage: e.target.value as LactationStage })}
            >
              <option value="early">Erken</option>
              <option value="mid">Orta</option>
              <option value="late">Geç</option>
              <option value="dry">Kuru</option>
            </select>
          </div>

          <div>
            <label className="label">Gebelik Ayı (ops.)</label>
            <input
              className="input-field"
              type="number"
              min={0}
              max={10}
              value={profile.pregnancyMonth ?? ''}
              onChange={(e) =>
                setProfile({
                  pregnancyMonth: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="örn: 7"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button className="btn-primary" type="button" onClick={() => navigate('/rasyon/wizard/goal')}>
          Devam
        </button>
      </div>
    </div>
  )
}
