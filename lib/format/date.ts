export type SupportedLocale = 'es-CO' | 'en'

export function formatDate(
  date: Date | string,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function formatDateTime(date: Date | string, locale: SupportedLocale): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(date: Date | string, locale: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = d.getTime() - Date.now()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diffDays, 'day')
}
