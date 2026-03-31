interface CircleIconProps {
  color: string
  iconKey: string
  size?: number
  className?: string
}

const ICON_PATHS: Record<string, string> = {
  'bar-chart': 'M18 20V10M12 20V4M6 20v-6',
  'code': 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  'brain': 'M12 2a7 7 0 017 7c0 2.5-1.5 4.5-3 6l-1 2h-6l-1-2c-1.5-1.5-3-3.5-3-6a7 7 0 017-7zM9 17h6M10 20h4',
  'compass': 'M12 2a10 10 0 100 20 10 10 0 000-20zm-2.5 7.5l5-2.5-2.5 5-5 2.5 2.5-5z',
  'rocket': 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-4 4M14.5 9.5L11 13M6 9l3 3 3.5-3.5L9 5M9 15l6 6M15 9a3 3 0 100-6 3 3 0 000 6z',
  'palette': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.48-9-10-9z',
}

export function CircleIcon({ color, iconKey, size = 32, className }: CircleIconProps) {
  const iconSize = Math.round(size * 0.5)
  const path = ICON_PATHS[iconKey] ?? ICON_PATHS['compass']!

  return (
    <div
      className={`flex items-center justify-center rounded-xl ${className ?? ''}`}
      style={{ width: size, height: size, backgroundColor: `${color}18` }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  )
}
