import { Info, TrendingUp, Lock } from 'lucide-react'
import type { OptimizerDiagnostics } from '@/types'

interface Props {
  diagnostics: OptimizerDiagnostics
}

export default function OptimizerDiagnosticsPanel({ diagnostics }: Props) {
  const { shadowPrices = [], objectiveValue, solverStatus, solveDurationMs } = diagnostics

  // Binding constraints (shadow price != 0 veya slack = 0)
  const bindingConstraints = shadowPrices.filter((sp) => sp.isBinding)
  
  // Non-binding constraints
  const nonBindingConstraints = shadowPrices.filter((sp) => !sp.isBinding)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Optimizasyon Detayları</h3>
      </div>

      {/* Solver bilgisi */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Çözüm Durumu</p>
          <p className="text-sm font-semibold text-gray-900">{solverStatus}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Hedef Değer (Maliyet)</p>
          <p className="text-sm font-semibold text-gray-900">
            {objectiveValue ? `${objectiveValue.toFixed(2)} TL/gün` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Çözüm Süresi</p>
          <p className="text-sm font-semibold text-gray-900">
            {solveDurationMs ? `${solveDurationMs.toFixed(0)} ms` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Binding constraints (kritik) */}
      {bindingConstraints.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Aktif Kısıtlar ({bindingConstraints.length})
            </h4>
            <div className="ml-auto" title="Bu kısıtlar çözümü sınırlandırıyor">
              <Info className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Bu kısıtlar çözümü sınırlandırıyor. Shadow price, kısıtın 1 birim gevşetilmesi durumunda
            maliyetin ne kadar değişeceğini gösterir.
          </p>
          <div className="space-y-2">
            {bindingConstraints.map((sp, idx) => (
              <div
                key={idx}
                className="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{sp.constraintLabel}</p>
                    <p className="text-xs text-gray-600 mt-1">{sp.explanation}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-xs text-gray-500">Shadow Price</p>
                    <p className="text-sm font-semibold text-red-700">
                      {sp.shadowPrice.toFixed(4)} TL
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-binding constraints (gevşek) */}
      {nonBindingConstraints.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Gevşek Kısıtlar ({nonBindingConstraints.length})
            </h4>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Bu kısıtlar çözümü etkilemiyor. Slack değeri, kısıttan ne kadar uzak olduğumuzu gösterir.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nonBindingConstraints.map((sp, idx) => (
              <div
                key={idx}
                className="p-3 bg-green-50 border border-green-100 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{sp.constraintLabel}</p>
                    {sp.explanation && (
                      <p className="text-xs text-gray-600 mt-1">{sp.explanation}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-xs text-gray-500">Slack</p>
                    <p className="text-sm font-semibold text-green-700">
                      {Math.abs(sp.slack).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boş durum */}
      {shadowPrices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Optimizasyon diagnostiği mevcut değil</p>
        </div>
      )}
    </div>
  )
}
