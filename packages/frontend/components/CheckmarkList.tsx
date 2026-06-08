// Server Component — no 'use client'
import { CheckCircle2 } from 'lucide-react'

export interface CheckmarkListProps {
  items: string[]
}

export function CheckmarkList({ items }: CheckmarkListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-status-pass mt-1 shrink-0" aria-hidden="true" />
          <span className="text-base text-text-primary">{item}</span>
        </li>
      ))}
    </ul>
  )
}
