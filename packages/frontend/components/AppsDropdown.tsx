'use client'

import { StatusPill } from '@/components/StatusPill'
import { type AppStatus, apps } from '@/lib/apps/registry'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

// Map registry AppStatus to StatusPill IterationStatus for styling reuse.
// 'active' maps to a green pill; we use PASS color as the semantic equivalent.
// 'coming-soon' maps to IN_PROGRESS (blue); 'archived' maps to PARKED (amber).
const STATUS_MAP: Record<
  AppStatus,
  { pillStatus: 'PASS' | 'IN_PROGRESS' | 'PARKED'; labelKey: string }
> = {
  active: { pillStatus: 'PASS', labelKey: 'status_active' },
  'coming-soon': { pillStatus: 'IN_PROGRESS', labelKey: 'status_coming_soon' },
  archived: { pillStatus: 'PARKED', labelKey: 'status_archived' },
}

export function AppsDropdown() {
  const tNav = useTranslations('nav')
  const tApps = useTranslations('apps')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const pathname = usePathname()

  // Close on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname change is the intentional trigger
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on outside click (mousedown so it fires before click handlers)
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // Focus first menuitem when opening
  useEffect(() => {
    if (open && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')
      firstItem?.focus()
    }
  }, [open])

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'ArrowDown' && !open) {
        e.preventDefault()
        setOpen(true)
      }
    },
    [open],
  )

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
    const focused = document.activeElement
    const idx = items.indexOf(focused as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % items.length
      items[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + items.length) % items.length
      items[prev]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      // Tab closes menu (no focus trap)
      setOpen(false)
    }
  }, [])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="apps-menu"
        onKeyDown={handleTriggerKeyDown}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-surface rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring transition-colors"
      >
        {tNav('apps')}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={menuRef}
          id="apps-menu"
          role="menu"
          aria-label={tApps('menu_label')}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 top-full mt-1 min-w-64 bg-bg-elevated border border-border-default rounded-lg shadow-sm py-1 z-50 opacity-100 translate-y-0 transition-[opacity,transform] duration-150 ease-out"
        >
          {apps.map((app) => {
            const { pillStatus, labelKey } = STATUS_MAP[app.status]
            const description = tApps(`${app.slug}.description` as Parameters<typeof tApps>[0])
            const statusLabel = tApps(labelKey as Parameters<typeof tApps>[0])

            return (
              // biome-ignore lint/a11y/useValidAriaRole: role="none" is valid per WAI-ARIA 1.2 — it removes the implicit listitem role so <ul role="menu"> satisfies aria-required-children
              <li key={app.slug} role="none" className="flex items-stretch">
                {/* Primary link — name + description + status pill */}
                <Link
                  href={app.internal_path}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="flex-1 flex flex-col gap-0.5 px-3 py-2.5 hover:bg-bg-surface focus:bg-bg-surface focus:outline-none rounded-l-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{app.name}</span>
                    <StatusPill status={pillStatus} label={statusLabel} />
                  </div>
                  <span className="text-xs text-text-secondary leading-snug">{description}</span>
                </Link>

                {/* Secondary external link — icon only, opens new tab. role="menuitem" required by aria-required-children on <ul role="menu"> */}
                {app.external_url && (
                  <a
                    href={app.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    aria-label={tApps('external_link_label')}
                    tabIndex={-1}
                    className="flex items-center px-2 hover:bg-bg-surface focus:bg-bg-surface focus:outline-none rounded-r-lg border-l border-border-default"
                  >
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-text-muted" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
