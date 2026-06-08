// Server Component — no 'use client'

export interface NumberedStepProps {
  number: string
  title: string
  body: string
}

export function NumberedStep({ number, title, body }: NumberedStepProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      <span className="font-mono text-2xl text-accent-default min-w-[3rem]">{number}</span>
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-base text-text-secondary leading-relaxed max-w-2xl">{body}</p>
      </div>
    </div>
  )
}
