import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { InfeasibilityDiagnostic } from '@/types'

interface Props {
  diagnostics: InfeasibilityDiagnostic[]
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-800',
  },
  major: {
    icon: AlertCircle,
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    iconColor: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800',
  },
  minor: {
    icon: Info,
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    iconColor: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-800',
  },
}

const severityLabel = {
  critical: 'Kritik',
  major: 'Önemli',
  minor: 'Hafif',
}

export default function InfeasibilityPanel({ diagnostics }: Props) {
  // Sort by severity: critical > major > minor
  const sorted = [...diagnostics].sort((a, b) => {
    const order = { critical: 3, major: 2, minor: 1 }
    return order[b.severity] - order[a.severity]
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Çözülememe Nedenleri ve Öneriler</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Rasyon tam olarak optimize edilemedi. Aşağıdaki sorunlar tespit edildi ve düzeltme önerileri sunuldu:
      </p>

      <div className="space-y-3">
        {sorted.map((diag, idx) => {
          const config = severityConfig[diag.severity]
          const Icon = config.icon

          return (
            <div
              key={idx}
              className={`p-4 ${config.bg} border ${config.border} rounded-lg`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">{diag.constraintLabel}</h4>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                      {severityLabel[diag.severity]}
                    </span>
                  </div>

                  {diag.current > 0 && diag.target > 0 && (
                    <div className="text-xs text-gray-700 mb-2">
                      <span className="font-medium">Mevcut:</span> {diag.current.toFixed(1)} |{' '}
                      <span className="font-medium">Hedef:</span> {diag.target.toFixed(1)}
                      {diag.deficit !== 0 && (
                        <>
                          {' | '}
                          <span className="font-medium">
                            {diag.deficit > 0 ? 'Eksik' : 'Fazla'}:
                          </span>{' '}
                          {Math.abs(diag.deficit).toFixed(1)}
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-gray-700">
                    <span className="font-medium">💡 Öneri:</span> {diag.suggestion}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>İpucu:</strong> Yem setinizi genişletin, farklı kategorilerden yemler ekleyin veya hayvan profilini
          gözden geçirin. Bazı durumlarda maliyet hedefini artırmak gerekebilir.
        </p>
      </div>
    </div>
  )
}
