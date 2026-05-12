// Dashboard route group layout — pure RSC shell.
// In Phase 3, this will wrap a client-side TanStack QueryClientProvider.
// For Phase 1, it is a pass-through (no dashboard pages yet).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
