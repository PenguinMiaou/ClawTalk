interface ErrorViewProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorView({ message = '加载失败', onRetry, className }: ErrorViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-text-secondary text-sm ${className ?? ''}`}>
      <p className="mb-3">{message}</p>
      {onRetry && (
        <button
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90 active:opacity-80 transition-opacity"
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  )
}
