// Instruments index — honest empty state (DEFI-03).
// Physically under (defi) → inherits the full wallet provider context (WagmiProvider/RainbowKit).
// Public URL: /apps/abrigo/instruments (route groups are URL-transparent, FOUND-11).
//
// ABRIGO_INSTRUMENTS is [] at launch — render the honest empty state only.
// NO ghost cards, NO fabricated instruments, NO example payoff (anti-fishing CROSS-09).
//
// When instruments are added to the registry (post-deploy), the map branch activates
// automatically — card links use numeric chainId (NOT chainName) per the locked [chain]
// segment contract (see 05-RESEARCH Pattern 4 + M5 build assertion).

import { ABRIGO_INSTRUMENTS } from '@/lib/apps/abrigo/instruments'
import { PackageSearch } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('instruments')
  return {
    title: `${t('index.h1')} — Abrigo / DS2P Labs`,
  }
}

export default async function InstrumentsIndexPage() {
  const t = await getTranslations('instruments')
  const locale = await getLocale()

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12 space-y-8">
      <header>
        <h1 className="text-[28px] font-semibold text-text-primary">{t('index.h1')}</h1>
      </header>

      {ABRIGO_INSTRUMENTS.length === 0 ? (
        // Honest empty state — no ghost cards, no fabricated data (CROSS-09 / DEFI-03)
        <section
          aria-label={t('index.empty_heading')}
          className="flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <PackageSearch
            aria-hidden="true"
            className="h-12 w-12 text-text-muted"
            strokeWidth={1.5}
          />
          <div className="space-y-2 max-w-md">
            <p className="text-base font-semibold text-text-primary">{t('index.empty_heading')}</p>
            <p className="text-sm font-normal text-text-secondary leading-relaxed">
              {t('index.empty_body')}
            </p>
          </div>
          <Link
            href="https://github.com/wvs-finance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-normal text-accent-text underline underline-offset-4 hover:text-accent-default transition-colors"
          >
            {t('index.github_link')}
          </Link>
        </section>
      ) : (
        // Post-deploy branch: one card per instrument.
        // Card link uses numeric chainId (NOT chainName) — locked [chain] segment contract.
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ABRIGO_INSTRUMENTS.map((instrument) => {
            const displayName = locale.startsWith('es') ? instrument.name : instrument.nameEn
            // Guard deployedAt on kind — simulated shows SIMULADO + em-dash (CROSS-09 anti-fishing)
            const deployedAtDisplay =
              instrument.kind === 'live' ? instrument.deployedAt : 'SIMULADO — —'
            return (
              <li key={`${instrument.id}-${instrument.chainId}`}>
                <article className="bg-elevated border border-border-default rounded-[var(--radius)] px-4 py-4 space-y-3">
                  <header className="space-y-1">
                    <p className="text-base font-semibold text-text-primary">{displayName}</p>
                    <p className="font-mono text-xs font-normal text-text-muted">
                      chain: {instrument.chainId}
                    </p>
                  </header>
                  <p className="text-sm font-normal text-text-secondary">{deployedAtDisplay}</p>
                  <Link
                    href={`/apps/abrigo/instruments/${instrument.id}/${instrument.chainId}`}
                    className="text-sm font-normal text-accent-text underline underline-offset-4 hover:text-accent-default transition-colors"
                  >
                    {locale.startsWith('es') ? 'Ver instrumento' : 'View instrument'}
                  </Link>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
