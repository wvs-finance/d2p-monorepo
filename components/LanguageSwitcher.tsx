import { setLocale } from '@/app/actions/set-locale'
import { getLocale, getTranslations } from 'next-intl/server'

export interface LanguageSwitcherProps {
  /** Optional className additive */
  className?: string
}

export async function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const current = await getLocale()
  const t = await getTranslations('language_switcher')

  const setEs = setLocale.bind(null, 'es-CO')
  const setEn = setLocale.bind(null, 'en')

  return (
    <nav aria-label={t('label')} className={className}>
      <form action={setEs} className="inline">
        <button
          type="submit"
          aria-current={current === 'es-CO' ? 'true' : 'false'}
          disabled={current === 'es-CO'}
          className="px-3 py-1 rounded text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring disabled:opacity-60 disabled:cursor-default hover:bg-bg-elevated transition-colors"
        >
          {t('es-CO')}
        </button>
      </form>
      <form action={setEn} className="inline ml-1">
        <button
          type="submit"
          aria-current={current === 'en' ? 'true' : 'false'}
          disabled={current === 'en'}
          className="px-3 py-1 rounded text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring disabled:opacity-60 disabled:cursor-default hover:bg-bg-elevated transition-colors"
        >
          {t('en')}
        </button>
      </form>
    </nav>
  )
}
