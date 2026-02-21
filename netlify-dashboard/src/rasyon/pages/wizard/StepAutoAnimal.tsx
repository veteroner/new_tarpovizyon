import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { getBreedOptions } from '@/utils/animalMetadata'
import type { BreedType } from '@/types'

export default function StepAutoAnimal() {
  const navigate = useNavigate()
  const profile = useRationWizardStore((s) => s.draft.profile)
  const setProfile = useRationWizardStore((s) => s.setProfile)

  const [weightInput, setWeightInput] = useState(profile.weightKg?.toString() ?? '')
  const [milkInput, setMilkInput] = useState(profile.milkYieldKgPerDay?.toString() ?? '')
  const [adgInput, setAdgInput] = useState(profile.targetAdgKgPerDay?.toString() ?? '')

  const breeds = useMemo(() => getBreedOptions(profile.species), [profile.species])

  const isDairy = profile.purpose === 'dairy'
  const isGrowth = profile.purpose === 'beef' || profile.purpose === 'grower'

  const purposeLabel = (() => {
    switch (profile.purpose) {
      case 'dairy': return 'Süt Üretimi'
      case 'beef': return 'Besi'
      case 'grower': return 'Düve/Buzağı Büyütme'
      default: return 'Üretim'
    }
  })()

  const handleNext = () => {
    const weight = parseFloat(weightInput)
    const milk = parseFloat(milkInput)
    const adg = parseFloat(adgInput)

    if (!weight || weight <= 0) {
      alert('Lütfen geçerli bir canlı ağırlık girin.')
      return
    }

    const updates: Parameters<typeof setProfile>[0] = {
      weightKg: weight,
    }

    if (isDairy) {
      if (!milk || milk <= 0) {
        alert('Lütfen geçerli bir süt verimi girin.')
        return
      }
      updates.milkYieldKgPerDay = milk
    }

    if (isGrowth) {
      if (!adg || adg <= 0) {
        alert('Lütfen geçerli bir canlı ağırlık artışı girin.')
        return
      }
      updates.targetAdgKgPerDay = adg
    }

    setProfile(updates)
    navigate('/rasyon/wizard/auto-feeds')
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Hayvan Bilgileri</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-primary-600">{purposeLabel}</span> için hayvan bilgilerini girin.
        </p>
      </div>

      {/* Form */}
      <div className="card space-y-5">
        {/* Irk Seçimi */}
        <div>
          <label className="label">Irk</label>
          <select
            value={profile.breed}
            onChange={(e) => setProfile({ breed: e.target.value as BreedType })}
            className="input-field"
          >
            {breeds.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Canlı Ağırlık */}
        <div>
          <label className="label">Canlı Ağırlık (kg)</label>
          <input
            type="number"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Örn: 600"
            className="input-field"
            min="50"
            max="1200"
            step="10"
          />
          <p className="text-xs text-gray-500 mt-1">
            Hayvanın mevcut canlı ağırlığı (örnek: Holstein inek 550-700 kg)
          </p>
        </div>

        {/* Süt Verimi (sadece dairy) */}
        {isDairy && (
          <div>
            <label className="label">Günlük Süt Verimi (kg/gün)</label>
            <input
              type="number"
              value={milkInput}
              onChange={(e) => setMilkInput(e.target.value)}
              placeholder="Örn: 25"
              className="input-field"
              min="5"
              max="80"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ortalama günlük süt üretimi (örnek: 20-35 kg/gün)
            </p>
          </div>
        )}

        {/* Günlük Canlı Ağırlık Artışı (beef/grower) */}
        {isGrowth && (
          <div>
            <label className="label">Hedef Günlük Canlı Ağırlık Artışı (kg/gün)</label>
            <input
              type="number"
              value={adgInput}
              onChange={(e) => setAdgInput(e.target.value)}
              placeholder={profile.purpose === 'beef' ? 'Örn: 1.2' : 'Örn: 0.8'}
              className="input-field"
              min="0.3"
              max="2.5"
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {profile.purpose === 'beef' 
                ? 'Besi için tipik: 1.0-1.5 kg/gün' 
                : 'Düve/Buzağı için tipik: 0.6-0.9 kg/gün'}
            </p>
          </div>
        )}

        {/* Laktasyon (dairy + cattle) */}
        {isDairy && profile.species === 'cattle' && (
          <div>
            <label className="label">Laktasyon (Parite)</label>
            <select
              value={profile.parity ?? 2}
              onChange={(e) => setProfile({ parity: Number(e.target.value) as 1 | 2 | 3 })}
              className="input-field"
            >
              <option value="1">1 (İlk Buzağı)</option>
              <option value="2">2 (İkinci Buzağı)</option>
              <option value="3">3+ (Üç ve Üzeri)</option>
            </select>
          </div>
        )}
      </div>

      {/* Özet Bilgi */}
      <div className="card bg-green-50 border-green-200">
        <p className="text-sm text-green-900">
          <strong>Özet:</strong> {profile.breed} ırkı, {weightInput || '?'} kg canlı ağırlık
          {isDairy && `, ${milkInput || '?'} kg/gün süt verimi`}
          {isGrowth && `, ${adgInput || '?'} kg/gün hedef büyüme`}
        </p>
      </div>

      {/* Butonlar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/rasyon/wizard/auto-goal')}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Geri
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="btn-primary inline-flex items-center gap-2"
        >
          İleri
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
