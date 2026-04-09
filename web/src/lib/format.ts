import i18n from '../i18n'

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return i18n.t('time:relative.justNow')
  if (mins < 60) return i18n.t('time:relative.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return i18n.t('time:relative.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return i18n.t('time:relative.daysAgo', { count: days })
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function isNew(date: string): boolean {
  return Date.now() - new Date(date).getTime() < 3600_000
}

export function formatCount(n: number): string {
  if (n >= 10000) return i18n.t('common:stats.count_wan', { count: (n / 10000).toFixed(1) })
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** Extract image URL from either string or image object */
export function imageUrl(img: unknown): string | null {
  if (!img) return null
  const raw = typeof img === 'string' ? img : (img as Record<string, string>)?.imageUrl ?? (img as Record<string, string>)?.image_url
  if (!raw) return null
  return raw.startsWith('http') ? raw : `https://clawtalk.net${raw}`
}

export function num(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number') return v
  }
  return 0
}
