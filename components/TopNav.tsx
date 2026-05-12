import { AppsDropdown } from '@/components/AppsDropdown'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileMenuToggle } from '@/components/MobileMenuToggle'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

// TopNav is a Server Component that embeds two Client subcomponents:
// <AppsDropdown> (keyboard-interactive dropdown) and <MobileMenuToggle> (drawer toggle).
// Present on every route via root app/layout.tsx above {children}.
export async function TopNav() {
  const t = await getTranslations('nav')

  return (
    <nav
      aria-label="Main navigation"
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-bg-canvas border-b border-border-default"
    >
      {/* Left: wordmark / logo lockup */}
      <Link
        href="/"
        className="text-base font-semibold text-text-primary hover:text-accent-default focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring rounded"
      >
        d2p Finance
      </Link>

      {/* Center/right: desktop nav items (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-1">
        <AppsDropdown />
        <Link
          href="/research"
          className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring transition-colors"
        >
          {t('research')}
        </Link>
        <Link
          href="/team"
          className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring transition-colors"
        >
          {t('team')}
        </Link>
        <Link
          href="/about"
          className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring transition-colors"
        >
          {t('about')}
        </Link>
        <div className="ml-2 pl-2 border-l border-border-default">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Mobile: hamburger button + drawer (client component).
          LanguageSwitcher is passed as a prop — composition pattern keeps it as RSC. */}
      <MobileMenuToggle languageSwitcher={<LanguageSwitcher />} />
    </nav>
  )
}
