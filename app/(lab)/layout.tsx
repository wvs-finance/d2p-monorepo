import { LanguageSwitcher } from '@/components/LanguageSwitcher'

// Pure RSC layout for the (lab) route group.
// CRITICAL: Do NOT import wagmi, RainbowKit, viem, or @tanstack/react-query here
// or in any file under app/(lab)/. This is the bundle-isolation barrier (FOUND-11).
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-6 border-b border-border-default">
        <span className="font-semibold text-text-primary">d2p Finance</span>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">{children}</main>
      <footer className="p-6 border-t border-border-default text-text-secondary text-sm">
        <a
          href="https://github.com/wvs-finance"
          className="hover:text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-color-ring"
        >
          GitHub: wvs-finance
        </a>
      </footer>
    </div>
  )
}
