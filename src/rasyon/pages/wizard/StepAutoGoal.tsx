import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Milk, Weight, Sprout, Baby } from 'lucide-react'
import { useRationWizardStore } from '@/store/rationWizardStore'
import type { AnimalProfile } from '@/types'

export default function StepAutoGoal() {
  const navigate = useNavigate()
  const setProfile = useRationWizardStore((s) => s.setProfile)

  const goals = [
    {
      id: 'dairy' as const,
      icon: Milk,
      title: 'Süt Üretimi',
      description: 'Laktasyon dönemindeki süt sığırları',
      color: 'from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-400',
      iconColor: 'text-blue-600',
    },
    {
      id: 'beef' as const,
      icon: Weight,
      title: 'Besi',
      description: 'Et için canlı ağırlık artışı',
      color: 'from-red-50 to-orange-50 border-red-200 hover:border-red-400',
      iconColor: 'text-red-600',
    },
    {
      id: 'grower' as const,
      icon: Sprout,
      title: 'Düve Yetiştirme',
      description: 'Genç dişi hayvanların gelişimi',
      color: 'from-green-50 to-emerald-50 border-green-200 hover:border-green-400',
      iconColor: 'text-green-600',
    },
    {
      id: 'calf' as const,
      icon: Baby,
      title: 'Buzağı Büyütme',
      description: 'Sütten kesim sonrası büyüme',
      color: 'from-purple-50 to-pink-50 border-purple-200 hover:border-purple-400',
      iconColor: 'text-purple-600',
    },
  ]

  const handleSelectGoal = (goalId: typeof goals[number]['id']) => {
    const updates: Partial<AnimalProfile> = {}

    switch (goalId) {
      case 'dairy':
        updates.purpose = 'dairy'
        updates.stage = 'mid'
        updates.productionPhase = 'mid'
        updates.milkYieldKgPerDay = 25
        break
      case 'beef':
        updates.purpose = 'beef'
        updates.stage = undefined
        updates.productionPhase = undefined
        updates.milkYieldKgPerDay = undefined
        updates.targetAdgKgPerDay = 1.2
        break
      case 'grower':
        updates.purpose = 'grower'
        updates.stage = undefined
        updates.productionPhase = undefined
        updates.milkYieldKgPerDay = undefined
        updates.targetAdgKgPerDay = 0.8
        break
      case 'calf':
        updates.purpose = 'grower'
        updates.stage = undefined
        updates.productionPhase = undefined
        updates.milkYieldKgPerDay = undefined
        updates.targetAdgKgPerDay = 0.6
        updates.weightKg = 80
        break
    }

    setProfile(updates)
    navigate('/rasyon/wizard/auto-animal')
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Rasyon Amacı</h2>
        <p className="text-sm text-gray-600">
          Hayvanınızı hangi amaçla yetiştiriyorsunuz?
        </p>
      </div>

      {/* Amaç Seçenekleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const Icon = goal.icon
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => handleSelectGoal(goal.id)}
              className={`relative p-6 rounded-xl border-2 bg-gradient-to-br transition-all duration-200 text-left ${goal.color}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <Icon className={`w-8 h-8 ${goal.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {goal.title}
                  </h3>
                  <p className="text-sm text-gray-600">{goal.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bilgilendirme */}
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          💡 <strong>İpucu:</strong> Amacınızı seçtikten sonra hayvan bilgilerini gireceksiniz.
          Program bu bilgilere göre otomatik olarak en uygun rasyonu hesaplayacak.
        </p>
      </div>

      {/* Geri Butonu */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/rasyon/wizard/mode')}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Geri
        </button>
      </div>
    </div>
  )
}
