interface CircleIconProps {
  color: string
  iconKey: string
  size?: number
  className?: string
}

/* Paths synced with iOS CircleIcon (app/src/components/ui/CircleIcon.tsx).
   Web uses single <path d="..."> per icon; iOS uses multi-element SVG.
   The visual output is equivalent at small sizes. */
const ICON_PATHS: Record<string, string> = {
  'bar-chart': 'M4 12h4v9H4zM10 7h4v14h-4zM17 3h4v18h-4z',
  'code': 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  'brain': 'M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM6 10v1a6 6 0 0012 0v-1M12 17v5M8 22h8',
  'compass': 'M12 2a10 10 0 100 20 10 10 0 000-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
  'rocket': 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3',
  'palette': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.48-9-10-9z',
}

export function CircleIcon({ color, iconKey, size = 32, className }: CircleIconProps) {
  const iconSize = Math.round(size * 0.5)
  const path = ICON_PATHS[iconKey] ?? ICON_PATHS['compass']!

  return (
    <div
      className={`flex items-center justify-center rounded-xl ${className ?? ''}`}
      style={{ width: size, height: size, backgroundColor: `${color}22`, borderRadius: size * 0.22 }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  )
}
