import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Browser } from '@capacitor/browser';
import { isPlatform } from '../../utils/platform';

/**
 * Looker Studio Rapor Sayfası (WebView)
 * 
 * Eski uygulamada TÜÜM uygulama bu sayfalardan ibaretti (iframe).
 * Yeni uygulamada sadece detaylı rapora ihtiyaç olduğunda kullanılır.
 */

const reports: Record<string, { title: string; url: string }> = {
  'turkey-production': {
    title: 'Türkiye Bitkisel Üretim',
    url: 'https://lookerstudio.google.com/embed/reporting/8c528a00-4fa8-4470-8621-b2b23f3c02f3/page/p_3rw3onv7pd',
  },
  'world-production': {
    title: 'Dünya Tarımsal Üretim',
    url: 'https://lookerstudio.google.com/embed/reporting/8c528a00-4fa8-4470-8621-b2b23f3c02f3/page/p_world',
  },
  'commodity-prices': {
    title: 'Emtia Fiyat Analizi',
    url: 'https://lookerstudio.google.com/embed/reporting/8c528a00-4fa8-4470-8621-b2b23f3c02f3/page/p_prices',
  },
  'trade-analysis': {
    title: 'Dış Ticaret Raporu',
    url: 'https://lookerstudio.google.com/embed/reporting/8c528a00-4fa8-4470-8621-b2b23f3c02f3/page/p_trade',
  },
};

export default function LookerReportPage() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);

  const report = reports[reportId || ''];

  if (!report) {
    return (
      <div className="page-container flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-400">Rapor bulunamadı</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-xs tap-active"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const openExternal = async () => {
    if (isPlatform('capacitor')) {
      await Browser.open({ url: report.url.replace('/embed/', '/') });
    } else {
      window.open(report.url.replace('/embed/', '/'), '_blank');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* Header */}
      <header className="px-4 pt-safe pb-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-active">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{report.title}</h1>
            <p className="text-[9px] text-gray-500">Looker Studio Raporu</p>
          </div>
        </div>
        <button onClick={openExternal} className="p-2 tap-active">
          <ExternalLink size={18} className="text-gray-400" />
        </button>
      </header>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900 z-10 mt-[60px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="text-primary-500 animate-spin" />
            <p className="text-xs text-gray-500">Rapor yükleniyor...</p>
          </div>
        </div>
      )}

      {/* iframe */}
      <div className="flex-1 relative">
        <iframe
          src={report.url}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}
