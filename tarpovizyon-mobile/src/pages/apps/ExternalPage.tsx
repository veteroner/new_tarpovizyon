import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useRef } from 'react';

/**
 * External WebView Page - Generic
 * 
 * Harici web uygulamalarını iframe ile yükler.
 * URL params üzerinden hedef URL ve başlık alır.
 */

const APPS: Record<string, { url: string; title: string; subtitle: string }> = {
  tarpol: {
    url: 'https://www.tarpol.org.tr/',
    title: 'TARPOL',
    subtitle: 'Tarım Politikaları Derneği',
  },
  rasyon: {
    url: 'https://tarpol-rasyon.netlify.app',
    title: 'Rasyon Hesaplayıcı',
    subtitle: 'NRC 2021 Bazlı',
  },
  ai: {
    url: 'https://tarpovizyonai.netlify.app/tarpovizyon.html',
    title: 'TarpoVizyon AI',
    subtitle: 'Yapay Zeka Asistan',
  },
};

export default function ExternalPage() {
  const navigate = useNavigate();
  const { appId } = useParams<{ appId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const app = appId ? APPS[appId] : null;
  
  if (!app) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">❌</span>
          <p className="text-sm text-gray-300 mt-3">Uygulama bulunamadı</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm tap-active"
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const handleReload = () => {
    setLoading(true);
    setError(false);
    if (iframeRef.current) {
      iframeRef.current.src = app.url;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* ── Header ────────────────────────── */}
      <header className="flex items-center gap-3 px-4 pt-safe pb-2 bg-dark-900/95 backdrop-blur-xl border-b border-white/5 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl tap-active"
        >
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{app.title}</h1>
          <p className="text-[10px] text-gray-500">{app.subtitle}</p>
        </div>
        <button
          onClick={handleReload}
          className="p-2 rounded-xl tap-active"
        >
          <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => window.open(app.url, '_blank')}
          className="p-2 rounded-xl tap-active"
        >
          <ExternalLink size={18} className="text-gray-400" />
        </button>
      </header>

      {/* ── WebView Content ───────────────── */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">{app.title} yükleniyor...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900 z-10">
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm text-gray-300">{app.title} yüklenemedi</p>
              <p className="text-xs text-gray-500">İnternet bağlantınızı kontrol edin</p>
              <button
                onClick={handleReload}
                className="px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-sm font-medium tap-active"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={app.url}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={app.title}
        />
      </div>
    </div>
  );
}
