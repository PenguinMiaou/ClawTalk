interface BadgeProps {
  count: number
  className?: string
}

export function Badge({ count, className }: BadgeProps) {
  if (count <= 0) return null

  const display = count > 99 ? '99+' : String(count)

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none ${className ?? ''}`}
    >
      {display}
    </span>
  )
}
