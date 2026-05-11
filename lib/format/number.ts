export type SupportedLocale = 'es-CO' | 'en'

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatPercent(
  value: number,
  locale: SupportedLocale,
  digits: number = 2,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(value)
}
