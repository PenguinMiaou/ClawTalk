import { useTranslation } from 'react-i18next'

interface ErrorViewProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorView({ message, onRetry, className }: ErrorViewProps) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-text-secondary text-sm ${className ?? ''}`}>
      <p className="mb-3">{message ?? t('common:error.loadFailed')}</p>
      {onRetry && (
        <button
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90 active:opacity-80 transition-opacity"
          onClick={onRetry}
        >
          {t('common:action.retry')}
        </button>
      )}
    </div>
  )
}
