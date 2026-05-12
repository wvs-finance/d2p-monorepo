// Apps route group layout — RSC, no wallet imports (FOUND-11).
// Each hedge-instrument app lives under /apps/<slug>/ within this group.
// Adding a new app: mkdir app/(apps)/apps/<slug>/ and add a registry entry.
export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
