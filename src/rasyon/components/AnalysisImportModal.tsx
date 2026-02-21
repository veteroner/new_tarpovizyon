import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import type { AnalysisSource } from '@/types/inventory'
import { parseAnalysisCsv } from '@/utils/analysisImport'

export type AnalysisImportPayload = ReturnType<typeof parseAnalysisCsv>

export default function AnalysisImportModal(props: {
  onClose: () => void
  onApply: (payload: AnalysisImportPayload, opts: { applyFeedOverrides: boolean }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [text, setText] = useState('')
  const [defaultSource, setDefaultSource] = useState<AnalysisSource>('lab')
  const [applyFeedOverrides, setApplyFeedOverrides] = useState(true)
  const [status, setStatus] = useState<string | null>(null)

  const parsed = parseAnalysisCsv(text, { defaultSource })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">NIR/Lab CSV İçe Aktar</h3>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600" aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {status && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">{status}</div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setStatus(null)
              try {
                const t = await file.text()
                setText(t)
                setStatus(`Dosya yüklendi: ${file.name} (${Math.round(file.size / 1024)} KB)`)
              } catch {
                setStatus('Dosya okunamadı')
              } finally {
                e.target.value = ''
              }
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Varsayılan kaynak</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={defaultSource}
                onChange={(e) => setDefaultSource(e.target.value as AnalysisSource)}
              >
                <option value="lab">Laboratuvar</option>
                <option value="nir">NIR</option>
                <option value="user-input">Kullanıcı</option>
                <option value="table">Tablo</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Dosya Seç
              </button>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={applyFeedOverrides}
                  onChange={(e) => setApplyFeedOverrides(e.target.checked)}
                />
                Yem değerlerini güncelle
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">CSV İçeriği</label>
            <textarea
              className="mt-1 w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                'Örnek başlıklar:\nfeedId;lotNumber;analysisDate;analysisSource;dmPercent;meMcalPerKg;cpPercent;ndfPercent;caPercent;pPercent;quantityKg;expirationDate\n...'
              }
            />
          </div>

          {(parsed.errors.length > 0 || parsed.warnings.length > 0) && (
            <div className="space-y-2">
              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="font-semibold mb-1">Hatalar</div>
                  <ul className="list-disc list-inside space-y-1">
                    {parsed.errors.slice(0, 8).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                  <div className="font-semibold mb-1">Uyarılar</div>
                  <ul className="list-disc list-inside space-y-1">
                    {parsed.warnings.slice(0, 8).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <div>
              <span className="font-semibold">Önizleme:</span> {parsed.lots.length} lot
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => props.onApply(parsed, { applyFeedOverrides })}
                disabled={parsed.lots.length === 0 || parsed.errors.length > 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Uygula
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Not: `feedId` veya `feedName` zorunlu. `quantityKg` yoksa 0 kabul edilir.
          </div>
        </div>
      </div>
    </div>
  )
}
