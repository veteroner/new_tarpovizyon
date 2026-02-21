import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileText, Download, AlertCircle } from 'lucide-react'
import { mapRowToNewFeedInput, parseCsvFeeds, parseJsonFeedInputs } from '@/utils/feedImport'
import { useFeedStore } from '@/store/feedStore'
import { useUIStore } from '@/store/uiStore'
import type { FeedCategory } from '@/types'

interface FeedImportModalProps {
  onClose: () => void
}

export default function FeedImportModal({ onClose }: FeedImportModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const addUserFeeds = useFeedStore((state) => state.addUserFeeds)
  const showToast = useUIStore((state) => state.showToast)

  const defaults: { category: FeedCategory; priceTLPerKg: number } = {
    category: 'concentrate',
    priceTLPerKg: 10,
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    setImporting(true)
    let totalImported = 0
    let totalSkipped = 0
    const allErrors: string[] = []

    try {
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        const content = await file.text()

        if (extension === 'csv') {
          const parsed = parseCsvFeeds(content)
          allErrors.push(...parsed.errors.map((e) => `${file.name}: ${e}`))

          const inputs = parsed.rows
            .map((row, idx) => ({ idx, mapped: mapRowToNewFeedInput(row, defaults) }))
            .filter((x) => {
              if (x.mapped.value) return true
              allErrors.push(`${file.name}: Satır ${x.idx + 2}: ${x.mapped.error ?? 'Geçersiz'}`)
              return false
            })
            .map((x) => x.mapped.value!)

          const { added, skipped } = addUserFeeds(inputs)
          totalImported += added
          totalSkipped += skipped
        } else if (extension === 'json') {
          const parsed = parseJsonFeedInputs(content, defaults)
          allErrors.push(...parsed.errors.map((e) => `${file.name}: ${e}`))

          const { added, skipped } = addUserFeeds(parsed.inputs)
          totalImported += added
          totalSkipped += skipped
        } else {
          showToast({
            type: 'error',
            message: `❌ Desteklenmeyen dosya formatı: ${file.name}`,
          })
          continue
        }
      }

      if (totalImported > 0) {
        showToast({
          type: 'success',
          message: `✅ ${totalImported} yem eklendi${totalSkipped > 0 ? `, ${totalSkipped} atlandı` : ''}.`,
        })

        if (allErrors.length > 0) {
          showToast({
            type: 'warning',
            message: `⚠️ Bazı satırlar içe aktarılamadı (${Math.min(allErrors.length, 20)} hata).`,
          })
        }

        onClose()
      } else {
        showToast({
          type: 'warning',
          message: '⚠️ İçe aktarılacak yem bulunamadı.',
        })
      }
    } catch (err) {
      console.error('Import failed:', err)
      showToast({
        type: 'error',
        message: `❌ İçe aktarma başarısız: ${(err as Error).message}`,
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const templateCSV =
      'name;category;dmPercent;meMcalPerKg;cpPercent;ndfPercent;starchPercent;sugarPercent;fatPercent;caPercent;pPercent;priceTLPerKg;description\n' +
      'Arpa;concentrate;88;3.10;11.5;20;55;;2.0;0.05;0.35;10;Örnek yem\n' +
      'Mısır;concentrate;88;3.25;8.5;10;72;;4.0;0.02;0.28;9;Örnek yem\n' +
      'Yonca;forage;90;2.10;18;38;2;6;2.5;1.40;0.25;6;Örnek kaba yem'
    
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'yem_sablonu.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast({
      type: 'info',
      message: '📥 Şablon dosyası indirildi!',
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">📥 Yem İçe Aktar</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  CSV veya JSON formatında yem ekleyebilirsiniz
                </p>
                <p className="text-blue-700">
                  Şablon dosyasını indirip doldurun veya kendi formatınızı kullanın.
                </p>
              </div>
            </div>

            {/* Download Template */}
            <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      CSV Şablon Dosyası
                    </h3>
                    <p className="text-xs text-gray-600">
                      Örnek yem verilerini içeren şablonu indirin ve doldurun.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="btn-secondary whitespace-nowrap"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  İndir
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-all
                ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }
                ${importing ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              
              {importing ? (
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    İçe aktarılıyor...
                  </p>
                  <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-primary-500 animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Dosyaları buraya sürükleyin
                  </p>
                  <p className="text-sm text-gray-600 mb-4">veya</p>
                  <label className="btn-primary inline-flex items-center cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Dosya Seç
                    <input
                      type="file"
                      accept=".csv,.json"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Desteklenen formatlar: CSV, JSON
                  </p>
                </>
              )}
            </div>

            {/* Format Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                📄 Dosya Format Örnekleri
              </h3>
              
              <div className="space-y-2">
                <details className="group">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    CSV Formatı
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`name,dm,cp,ndf,adf,starch,fat,ash,ca,p
Arpa,88.0,11.5,20.0,6.0,55.0,2.0,2.5,0.05,0.35
Mısır,88.0,8.5,10.0,3.0,72.0,4.0,1.5,0.02,0.28`}
                  </pre>
                </details>

                <details className="group">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    JSON Formatı
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`[
  {
    "name": "Arpa",
    "dm": 88.0,
    "cp": 11.5,
    "ndf": 20.0,
    "starch": 55.0
  }
]`}
                  </pre>
                </details>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">
              Kapat
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
