import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  message?: string
  className?: string
}

export function EmptyState({ message, className }: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div
      className={`flex flex-col items-center justify-center py-20 text-text-secondary text-sm ${className ?? ''}`}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-text-tertiary">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
      <p>{message ?? t('common:empty.noContent')}</p>
    </div>
  )
}
