// Pure RSC layout for the (lab) route group.
// CRITICAL: Do NOT import wagmi, RainbowKit, viem, or @tanstack/react-query here
// or in any file under app/(lab)/. This is the bundle-isolation barrier (FOUND-11).
//
// No local <header> here: the global <TopNav> (root app/layout.tsx) already renders
// the brand wordmark, nav, and LanguageSwitcher on every route. A second header here
// produced a duplicate site header (double-chrome) on all (lab) routes.
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Plain wrapper, not <main>: every (lab) page renders its own <main> with its
          own max-width (research/team use max-w-[1200px]). A <main> here would nest a
          second main landmark and cap each page's width at max-w-4xl. */}
      <div className="flex-1 w-full">{children}</div>
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
