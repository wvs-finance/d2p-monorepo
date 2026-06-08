// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock next-intl/server: make getRequestConfig an identity wrapper
// so the callback is directly callable in tests (bypasses RSC-only check).
vi.mock('next-intl/server', () => ({
  getRequestConfig: (callback: (...args: unknown[]) => unknown) => callback,
}))

// Mock next/headers cookies() API
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

type Messages = Record<string, Record<string, unknown> | string>

type RequestResult = {
  locale: string
  messages: Messages
}

async function invokeRequestConfig(cookieValue?: string): Promise<RequestResult> {
  const { cookies } = await import('next/headers')
  const mockCookieStore = {
    get: (name: string) =>
      name === 'NEXT_LOCALE' && cookieValue !== undefined ? { value: cookieValue } : undefined,
  }
  ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore)

  // Dynamic import picks up the mocked next-intl/server so getRequestConfig is the identity wrapper
  const mod = await import('../../i18n/request')
  const handler = mod.default as (params: {
    requestLocale: Promise<string | undefined>
  }) => Promise<RequestResult>
  return handler({ requestLocale: Promise.resolve(undefined) })
}

describe('i18n/request.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reads NEXT_LOCALE=es-CO cookie and returns es-CO messages', async () => {
    const result = await invokeRequestConfig('es-CO')

    expect(result.locale).toBe('es-CO')
    expect(result.messages).toBeDefined()
    // lab.json nested structure: messages.hero.wordmark
    const hero = result.messages.hero as Record<string, string>
    expect(hero).toBeDefined()
    expect(hero.wordmark).toBe('d2p Finance')
  })

  it('reads NEXT_LOCALE=en cookie and returns en messages', async () => {
    const result = await invokeRequestConfig('en')

    expect(result.locale).toBe('en')
    expect(result.messages).toBeDefined()
    const hero = result.messages.hero as Record<string, string>
    expect(hero.wordmark).toBe('d2p Finance')
    expect(hero.tagline).toBe(
      'Verified convex hedges for wage-earner macro risk in frontier markets.',
    )
  })

  it('falls back to es-CO when cookie is unset', async () => {
    const result = await invokeRequestConfig(undefined)

    expect(result.locale).toBe('es-CO')
    const hero = result.messages.hero as Record<string, string>
    expect(hero.tagline).toBe(
      'Coberturas convexas verificadas para los riesgos macro del trabajador asalariado en mercados de frontera.',
    )
  })

  it('falls back to es-CO for unsupported locale (fr) without crashing', async () => {
    const result = await invokeRequestConfig('fr')

    expect(result.locale).toBe('es-CO')
    expect(result.messages).toBeDefined()
  })

  it('loads messages from messages/{locale}/common.json (language_switcher keys present)', async () => {
    const result = await invokeRequestConfig('es-CO')

    // common.json nested structure: messages.language_switcher.label
    const switcher = result.messages.language_switcher as Record<string, string>
    expect(switcher).toBeDefined()
    expect(switcher.label).toBe('Idioma')

    const nav = result.messages.nav as Record<string, string>
    expect(nav.skip_to_content).toBe('Saltar al contenido')
  })
})
