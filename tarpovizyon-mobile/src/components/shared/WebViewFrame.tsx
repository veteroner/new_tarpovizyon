import { useState, useRef } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * WebViewFrame - Reusable iframe wrapper
 * 
 * Harici web uygulamalarını iframe ile yükler.
 * Loading spinner, error durumu ve header desteği.
 */

interface WebViewFrameProps {
  url: string;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  accentColor?: string;
  loadingText?: string;
}

export default function WebViewFrame({
  url,
  title,
  subtitle,
  showHeader = true,
  showBackButton = true,
  accentColor = 'primary',
  loadingText = 'Yükleniyor...',
}: WebViewFrameProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleReload = () => {
    setLoading(true);
    setError(false);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  const spinnerColor = accentColor === 'green'
    ? 'border-green-500/30 border-t-green-500'
    : 'border-primary-500/30 border-t-primary-500';

  const btnColor = accentColor === 'green'
    ? 'bg-green-500/20 text-green-400'
    : 'bg-primary-500/20 text-primary-400';

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* ── Header ────────────────────────── */}
      {showHeader && (
        <header className="flex items-center gap-3 px-4 pt-safe pb-2 bg-dark-900/95 backdrop-blur-xl border-b border-white/5 z-10">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl tap-active"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-[10px] text-gray-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={handleReload}
            className="p-2 rounded-xl tap-active"
            title="Yenile"
          >
            <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-2 rounded-xl tap-active"
            title="Tarayıcıda Aç"
          >
            <ExternalLink size={18} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* ── Content ───────────────────────── */}
      <div className="flex-1 relative">
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-10 h-10 border-2 ${spinnerColor} rounded-full animate-spin`} />
              <span className="text-xs text-gray-500">{loadingText}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900 z-10">
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <span className="text-4xl">📡</span>
              <p className="text-sm text-gray-300">Sayfa yüklenemedi</p>
              <p className="text-xs text-gray-500">İnternet bağlantınızı kontrol edin</p>
              <button
                onClick={handleReload}
                className={`px-4 py-2 rounded-xl ${btnColor} text-sm font-medium tap-active`}
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          onLoad={() => { setLoading(false); setError(false); }}
          onError={() => { setLoading(false); setError(true); }}
          allow="geolocation; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
          title={title}
        />
      </div>
    </div>
  );
}
