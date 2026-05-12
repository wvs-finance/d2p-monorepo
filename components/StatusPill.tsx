import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, PauseCircle, XCircle } from 'lucide-react'

export type IterationStatus = 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'

export interface StatusPillProps {
  status: IterationStatus
  /** Caller passes the already-translated label string */
  label: string
  className?: string
}

const variants: Record<IterationStatus, { icon: typeof CheckCircle2; classes: string }> = {
  PASS: {
    icon: CheckCircle2,
    classes: 'text-status-pass bg-status-pass/10 ring-status-pass/20',
  },
  FAIL: {
    icon: XCircle,
    classes: 'text-status-fail bg-status-fail/10 ring-status-fail/20',
  },
  PARKED: {
    icon: PauseCircle,
    classes: 'text-status-parked bg-status-parked/10 ring-status-parked/20',
  },
  IN_PROGRESS: {
    icon: Loader2,
    classes: 'text-status-in-progress bg-status-in-progress/10 ring-status-in-progress/20',
  },
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const { icon: Icon, classes } = variants[status]
  return (
    <output
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset',
        classes,
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{label}</span>
    </output>
  )
}
