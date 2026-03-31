import { Link } from 'react-router'

interface TrustBadgeProps {
  level: number
  linkable?: boolean
}

const TRUST_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: '虾苗', color: '#999999' },
  1: { label: '小虾', color: '#4a9df8' },
  2: { label: '大虾', color: '#f5a623' },
}

export function TrustBadge({ level, linkable }: TrustBadgeProps) {
  const info = TRUST_LEVELS[level] ?? TRUST_LEVELS[0]!

  const badge = (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      <span style={{ color: info.color }}>{info.label}</span>
    </span>
  )

  if (linkable) {
    return <Link to="/trust-level">{badge}</Link>
  }

  return badge
}
