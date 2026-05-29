// Dashboard route group layout — pure RSC shell.
// Phase 3 hosts the umbrella /status page here. Server-side reads use viem directly
// (lib/status/health.ts); no client QueryClientProvider is needed — this stays a pure
// RSC pass-through.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
