import { Download, Upload, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useRationStore } from '@/store/rationStore'
import { useFeedStore } from '@/store/feedStore'
import { useUIStore } from '@/store/uiStore'

export default function DataBackup() {
  const [importing, setImporting] = useState(false)
  const rations = useRationStore((s) => s.rations)
  const userFeeds = useFeedStore((s) => s.userFeeds)
  const importRations = useRationStore((s) => s.importRations)
  const importFeeds = useFeedStore((s) => s.importUserFeeds)
  const showToast = useUIStore((s) => s.showToast)

  const handleExport = () => {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      rations,
      userFeeds,
    }

    try {
      localStorage.setItem('teknova-rasyon-last-backup', data.exportDate)
    } catch {
      // Ignore storage failures (private mode / quota). Export still works.
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teknova-rasyon-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast({
      type: 'success',
      message: `${rations.length} rasyon + ${userFeeds.length} kullanıcı yemi yedeklendi!`,
    })
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate structure
        if (!data.rations || !Array.isArray(data.rations)) {
          throw new Error('Geçersiz yedekleme dosyası')
        }

        importRations(data.rations)
        if (data.userFeeds && Array.isArray(data.userFeeds)) {
          importFeeds(data.userFeeds)
        }

        showToast({
          type: 'success',
          message: `${data.rations.length} rasyon + ${data.userFeeds?.length || 0} yem geri yüklendi!`,
        })
      } catch {
        showToast({
          type: 'error',
          message: 'Yedekleme dosyası okunamadı. Lütfen geçerli bir JSON dosyası seçin.',
        })
      } finally {
        setImporting(false)
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Veri Yedekleme</h1>
        <p className="text-gray-600">
          Rasyonlarınızı ve özel yemlerinizi yedekleyin veya geri yükleyin.
        </p>
      </div>

      {/* Warning */}
      <div className="card bg-amber-50 border-amber-200 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-1">Önemli Uyarı</h3>
            <p className="text-sm text-amber-800">
              Verileriniz yalnızca tarayıcınızda saklanır. Tarayıcı önbelleğini temizlerseniz 
              veya farklı bir cihaz kullanırsanız verileriniz kaybolabilir. Düzenli yedekleme önerilir.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card bg-blue-50 border-blue-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{rations.length}</p>
            <p className="text-sm text-blue-800">Toplam Rasyon</p>
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{userFeeds.length}</p>
            <p className="text-sm text-green-800">Kullanıcı Yemi</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {/* Export */}
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Download size={18} className="text-blue-600" />
                Yedek Al (Export)
              </h3>
              <p className="text-sm text-gray-600">
                Tüm rasyonlarınızı ve özel yemlerinizi JSON dosyası olarak indirin.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="btn-primary inline-flex items-center gap-2"
              disabled={rations.length === 0 && userFeeds.length === 0}
            >
              <Download size={16} />
              Yedek Al
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Upload size={18} className="text-green-600" />
                Geri Yükle (Import)
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Daha önce aldığınız yedeği geri yükleyin.
              </p>
              <p className="text-xs text-amber-600">
                ⚠️ Mevcut veriler korunur, yeni veriler eklenir.
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
                disabled={importing}
              />
              <label
                htmlFor="import-file"
                className={`btn-secondary inline-flex items-center gap-2 cursor-pointer ${
                  importing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload size={16} />
                {importing ? 'Yükleniyor...' : 'Geri Yükle'}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card mt-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Kullanım İpuçları</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Haftada bir yedek almanızı öneririz</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Yedek dosyalarını güvenli bir yerde (Google Drive, Dropbox) saklayın</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Farklı cihazlar arasında veri taşımak için export/import kullanın</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Tarayıcı değiştirmeden önce mutlaka yedek alın</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
