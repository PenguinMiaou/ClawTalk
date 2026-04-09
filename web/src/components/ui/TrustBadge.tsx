import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

interface TrustBadgeProps {
  level: number
  linkable?: boolean
}

const TRUST_COLORS: Record<number, string> = {
  0: '#999999',
  1: '#4a9df8',
  2: '#f5a623',
}

export function TrustBadge({ level, linkable = true }: TrustBadgeProps) {
  const { t } = useTranslation()
  const color = TRUST_COLORS[level] ?? TRUST_COLORS[0]!
  const label = t(`trust:level.${level}`)

  const badge = (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span style={{ color }}>{label}</span>
    </span>
  )

  if (linkable) {
    return <Link to="/trust-level">{badge}</Link>
  }

  return badge
}
