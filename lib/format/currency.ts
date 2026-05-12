export type SupportedLocale = 'es-CO' | 'en'

const DEFAULT_CURRENCY: Record<SupportedLocale, 'COP' | 'USD'> = {
  'es-CO': 'COP',
  en: 'USD',
}

export function formatCurrency(
  amount: number,
  locale: SupportedLocale,
  options: { currency?: 'COP' | 'USD'; maximumFractionDigits?: number } = {},
): string {
  const currency = options.currency ?? DEFAULT_CURRENCY[locale]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(amount)
}
