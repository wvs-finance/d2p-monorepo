'use client'

import { StatusPill } from '@/components/StatusPill'
import { type AppStatus, apps } from '@/lib/apps/registry'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const STATUS_MAP: Record<
  AppStatus,
  { pillStatus: 'PASS' | 'IN_PROGRESS' | 'PARKED'; labelKey: string }
> = {
  active: { pillStatus: 'PASS', labelKey: 'status_active' },
  'coming-soon': { pillStatus: 'IN_PROGRESS', labelKey: 'status_coming_soon' },
  archived: { pillStatus: 'PARKED', labelKey: 'status_archived' },
}

interface MobileMenuToggleProps {
  /** The LanguageSwitcher server component passed as a prop (composition pattern).
   * This keeps LanguageSwitcher as an RSC while MobileMenuToggle is a Client Component. */
  languageSwitcher: React.ReactNode
}

export function MobileMenuToggle({ languageSwitcher }: MobileMenuToggleProps) {
  const tNav = useTranslations('nav')
  const tApps = useTranslations('apps')
  const [open, setOpen] = useState(false)
  const [appsExpanded, setAppsExpanded] = useState(false)
  const pathname = usePathname()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close drawer on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname change is the intentional trigger
  useEffect(() => {
    setOpen(false)
    setAppsExpanded(false)
  }, [pathname])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }, [])

  return (
    <>
      {/* Hamburger button — visible on mobile (<768px) only */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? tNav('menu_close') : tNav('menu_open')}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center p-2 text-text-primary hover:bg-bg-surface rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring md:hidden"
      >
        {open ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Menu aria-hidden="true" className="h-5 w-5" />
        )}
      </button>

      {/* Full-width drawer — native <dialog> element */}
      {open && (
        <dialog
          open
          aria-label="Navigation menu"
          onKeyDown={handleKeyDown}
          className="fixed inset-0 top-14 w-full max-w-none m-0 bg-bg-canvas border-t border-border-default z-40 overflow-y-auto p-0"
        >
          <nav className="flex flex-col p-6 gap-4">
            {/* Apps section — expandable */}
            <div>
              <button
                type="button"
                aria-expanded={appsExpanded}
                onClick={() => setAppsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-text-primary"
              >
                <span>{tNav('apps')}</span>
                <span className="text-text-muted text-xs">{appsExpanded ? '▲' : '▼'}</span>
              </button>
              {appsExpanded && (
                <ul className="mt-1 space-y-1 pl-2">
                  {apps.map((app) => {
                    const { pillStatus, labelKey } = STATUS_MAP[app.status]
                    const description = tApps(
                      `${app.slug}.description` as Parameters<typeof tApps>[0],
                    )
                    const statusLabel = tApps(labelKey as Parameters<typeof tApps>[0])

                    return (
                      <li
                        key={app.slug}
                        className="flex items-stretch border-b border-border-default last:border-0 pb-2"
                      >
                        <Link
                          href={app.internal_path}
                          onClick={() => setOpen(false)}
                          className="flex-1 flex flex-col gap-0.5 py-1 focus:outline-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {app.name}
                            </span>
                            <StatusPill status={pillStatus} label={statusLabel} />
                          </div>
                          <span className="text-xs text-text-secondary">{description}</span>
                        </Link>
                        {app.external_url && (
                          <a
                            href={app.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={tApps('external_link_label')}
                            className="flex items-center px-2 text-text-muted"
                          >
                            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Umbrella links */}
            <Link
              href="/research"
              onClick={() => setOpen(false)}
              className="py-2 text-sm font-medium text-text-primary hover:text-accent-default border-b border-border-default focus:outline-none"
            >
              {tNav('research')}
            </Link>
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="py-2 text-sm font-medium text-text-primary hover:text-accent-default border-b border-border-default focus:outline-none"
            >
              {tNav('team')}
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="py-2 text-sm font-medium text-text-primary hover:text-accent-default border-b border-border-default focus:outline-none"
            >
              {tNav('about')}
            </Link>

            {/* Language switcher — passed as RSC prop (composition pattern) */}
            <div className="pt-2">{languageSwitcher}</div>
          </nav>
        </dialog>
      )}
    </>
  )
}
