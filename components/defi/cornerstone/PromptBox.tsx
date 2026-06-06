'use client'

// PromptBox — textarea + 2 preset chips for the cornerstone workflow.
// Receives a startRun callback from RunTranscript (via onStart prop).
// es-CO-first via threaded strings.
//
// First paint = idle state (h2 heading + body copy rendered here).

import { resolveNearestPreset } from '@/lib/apps/abrigo/cornerstone/presets'
import { useState } from 'react'

export interface PromptBoxStrings {
  idleHeading: string
  idleBody: string
  chip1Label: string
  chip1Caption: string
  chip2Label: string
  chip2Caption: string
  freeTextCaption: string
  placeholder: string
}

interface PromptBoxProps {
  strings: PromptBoxStrings
  onStart: (presetId: string) => void
  disabled?: boolean
}

const PRESET_IDS = ['infl-surprise-add', 'infl-cooling-reduce'] as const

export function PromptBox({ strings, onStart, disabled = false }: PromptBoxProps) {
  const [text, setText] = useState('')
  const [activeChip, setActiveChip] = useState<string | null>(null)

  function handleChip(presetId: string) {
    setActiveChip(presetId)
    onStart(presetId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const resolved = resolveNearestPreset(text)
    setActiveChip(resolved)
    onStart(resolved)
  }

  const chipLabels: Record<string, string> = {
    'infl-surprise-add': strings.chip1Label,
    'infl-cooling-reduce': strings.chip2Label,
  }
  const chipCaptions: Record<string, string> = {
    'infl-surprise-add': strings.chip1Caption,
    'infl-cooling-reduce': strings.chip2Caption,
  }

  return (
    <section aria-label={strings.idleHeading} className="mb-8">
      {/* Idle heading / body — first paint (always visible) */}
      <h2 className="text-xl font-semibold text-text-primary mb-2">{strings.idleHeading}</h2>
      <p className="text-text-muted text-sm mb-6">{strings.idleBody}</p>

      {/* Preset chips — exactly 2, equal dimensions, min-h-[40px] */}
      <div className="flex flex-col gap-3 mb-4">
        {PRESET_IDS.map((id) => {
          const isActive = activeChip === id
          return (
            <div key={id} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleChip(id)}
                className={[
                  'w-full min-h-[40px] rounded-md border px-4 py-2 text-sm font-semibold text-left transition-all',
                  'text-text-primary bg-bg-surface',
                  isActive
                    ? 'ring-2 ring-accent-default border-accent-default'
                    : 'border-border-default hover:border-accent-default',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {chipLabels[id]}
              </button>
              <p className="text-text-muted text-xs px-1">{chipCaptions[id]}</p>
            </div>
          )
        })}
      </div>

      {/* Free-text form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={strings.placeholder}
          rows={3}
          className="w-full rounded-md border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-default disabled:opacity-50"
        />
        <p className="text-text-muted text-xs">{strings.freeTextCaption}</p>
      </form>
    </section>
  )
}
