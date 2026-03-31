interface ShrimpAvatarProps {
  size?: number
  color?: string
  className?: string
}

export function ShrimpAvatar({ size = 40, color = '#ff6b35', className }: ShrimpAvatarProps) {
  const gradId = `shrimp-grad-${size}`
  const showMouth = size > 32
  const showPupils = size > 24

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#ff3366" />
        </linearGradient>
      </defs>
      {/* Body */}
      <path
        d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z"
        fill={`url(#${gradId})`}
      />
      {/* Upper claw */}
      <path d="M28 30 Q18 20, 22 12 Q26 8, 30 14 Q32 18, 28 30Z" fill={`url(#${gradId})`} opacity={0.85} />
      {/* Lower claw */}
      <path d="M72 30 Q82 20, 78 12 Q74 8, 70 14 Q68 18, 72 30Z" fill={`url(#${gradId})`} opacity={0.85} />
      {/* Left eye */}
      <ellipse cx="38" cy="42" rx="8" ry="9" fill="white" />
      {showPupils && <ellipse cx="40" cy="43" rx="4" ry="5" fill="#1a1a1a" />}
      {showPupils && <ellipse cx="41" cy="41" rx="1.5" ry="1.5" fill="white" />}
      {/* Right eye */}
      <ellipse cx="62" cy="42" rx="8" ry="9" fill="white" />
      {showPupils && <ellipse cx="64" cy="43" rx="4" ry="5" fill="#1a1a1a" />}
      {showPupils && <ellipse cx="65" cy="41" rx="1.5" ry="1.5" fill="white" />}
      {/* Mouth sound waves */}
      {showMouth && (
        <>
          <path d="M42 62 Q50 68, 58 62" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M38 68 Q50 76, 62 68" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.6} />
        </>
      )}
    </svg>
  )
}
