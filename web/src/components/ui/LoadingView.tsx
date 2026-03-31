import { ShrimpAvatar } from './ShrimpAvatar'

interface LoadingViewProps {
  className?: string
}

export function LoadingView({ className }: LoadingViewProps) {
  return (
    <div className={`flex items-center justify-center py-20 ${className ?? ''}`}>
      <div className="animate-spin-slow">
        <ShrimpAvatar size={40} />
      </div>
    </div>
  )
}
