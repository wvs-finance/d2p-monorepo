import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['es-CO', 'en'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

type MessageMap = Record<string, unknown>

function isPlainObject(value: unknown): value is MessageMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Deep merge for translation maps. Plain-object keys recurse; leaf strings replace.
// Required because multiple namespace files (common.json, nav.json) can share a top-level
// key (e.g. "nav"); a shallow spread would clobber one side's children.
function mergeMessages(...sources: readonly MessageMap[]): MessageMap {
  const out: MessageMap = {}
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      const existing = out[key]
      out[key] =
        isPlainObject(existing) && isPlainObject(value) ? mergeMessages(existing, value) : value
    }
  }
  return out
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('NEXT_LOCALE')?.value
  const locale: SupportedLocale = isSupportedLocale(cookieValue) ? cookieValue : 'es-CO'

  const commonMessages = (await import(`../messages/${locale}/common.json`)).default as MessageMap
  const labMessages = (await import(`../messages/${locale}/lab.json`)).default as MessageMap
  const navMessages = (await import(`../messages/${locale}/nav.json`)).default as MessageMap
  const researchMessages = (await import(`../messages/${locale}/research.json`))
    .default as MessageMap
  const teamMessages = (await import(`../messages/${locale}/team.json`)).default as MessageMap
  const aboutMessages = (await import(`../messages/${locale}/about.json`)).default as MessageMap
  const dashboardMessages = (await import(`../messages/${locale}/dashboard.json`))
    .default as MessageMap
  const instrumentsMessages = (await import(`../messages/${locale}/instruments.json`))
    .default as MessageMap
  const somniaMessages = (await import(`../messages/${locale}/somnia.json`)).default as MessageMap

  const messages = mergeMessages(
    commonMessages,
    labMessages,
    navMessages,
    researchMessages,
    teamMessages,
    aboutMessages,
    dashboardMessages,
    instrumentsMessages,
    somniaMessages,
  )

  return { locale, messages }
})
