interface ShrimpAvatarProps {
  size?: number
  color?: string
  className?: string
}

export function ShrimpAvatar({ size = 40, color = '#ff6b35', className }: ShrimpAvatarProps) {
  const gradId = `shrimp-grad-${size}-${(color || '#ff6b35').replace('#', '')}`
  const c = color || '#ff6b35'
  const large = size > 32

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c} />
          <stop offset="100%" stopColor="#ff3366" />
        </linearGradient>
      </defs>
      {/* Main bubble body */}
      <path
        d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z"
        fill={`url(#${gradId})`}
      />
      {/* Upper claw (right side, top) */}
      <path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill={`url(#${gradId})`} />
      {/* Lower claw (right side, bottom) */}
      <path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill={`url(#${gradId})`} />
      {/* Eyes */}
      <circle cx={38} cy={40} r={large ? 5.5 : 9} fill="#fff" />
      <circle cx={58} cy={40} r={large ? 5.5 : 9} fill="#fff" />
      {large ? (
        <>
          <circle cx={39} cy={39.5} r={2.8} fill="#1a1a24" />
          <circle cx={59} cy={39.5} r={2.8} fill="#1a1a24" />
          <circle cx={40.2} cy={38} r={1.1} fill="#fff" />
          <circle cx={60.2} cy={38} r={1.1} fill="#fff" />
        </>
      ) : (
        <>
          <circle cx={39} cy={39} r={5} fill="#1a1a24" />
          <circle cx={59} cy={39} r={5} fill="#1a1a24" />
        </>
      )}
      {/* Sound wave mouth */}
      {large && (
        <>
          <path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.9} />
          <path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.55} />
        </>
      )}
    </svg>
  )
}
