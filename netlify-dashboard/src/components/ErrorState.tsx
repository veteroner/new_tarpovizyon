import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Consistent error state component for data loading failures.
 * Shows a user-friendly error message with optional retry button.
 */
export function ErrorState({
  title = 'Veri yüklenemedi',
  message = 'API bağlantı hatası oluştu. Lütfen tekrar deneyin.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-red-50 rounded-full p-4 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 text-center max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
}

/**
 * Consistent empty state component when no data is available.
 */
export function EmptyState({
  title = 'Veri bulunamadı',
  message = 'Seçilen filtreler için veri mevcut değil.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        <AlertTriangle className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 text-center max-w-sm">{message}</p>
    </div>
  );
}
