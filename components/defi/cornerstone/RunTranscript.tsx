'use client'

// RunTranscript — client island owning the workflow store + transcript display.
// Drives useSyncExternalStore(store); mounts PromptBox; streams A1→A2→mint.
//
// KEY CONSTRAINTS:
// - createWorkflowStore() via useMemo (per-mount, NOT module-level singleton)
// - useSyncExternalStore → first paint = idle (getServerSnapshot returns IDLE)
// - Transcript entries APPEND-ONLY keyed by step id; prior entries' textContent NEVER mutated
// - aria-live="polite" aria-atomic="false"
// - motion imported from `motion/react`; entrance MOUNTED-GATED (no SSR animation)
// - prefers-reduced-motion → CSS instant fallback
// - On status==='a2_decision': focus moves to Confirm button (confirmRef)
// - INLINE "replaying · mock" neutral pill (NOT the shipped Liveness component — do NOT import it)
// - data-step testids: "a1" / "a2" / "mint" for stable DOM ordering assertions

import { HedgeDecisionCardV2 } from '@/components/defi/cornerstone/HedgeDecisionCardV2'
import type { CardV2Strings } from '@/components/defi/cornerstone/HedgeDecisionCardV2'
import { MintCard } from '@/components/defi/cornerstone/MintCard'
import type { MintCardStrings } from '@/components/defi/cornerstone/MintCard'
import { PromptBox } from '@/components/defi/cornerstone/PromptBox'
import type { PromptBoxStrings } from '@/components/defi/cornerstone/PromptBox'
import { runWorkflow } from '@/lib/apps/abrigo/cornerstone/workflow-engine'
import { createWorkflowStore } from '@/lib/apps/abrigo/cornerstone/workflow-store'
import { CircleDashed } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

export interface TranscriptStrings {
  agent1Label: string
  agent2Label: string
  mintLabel: string
  replayingMock: string
  replayingMockAria: string
  errorState: string
}

interface RunTranscriptProps {
  traceNodes: Record<string, ReactNode>
  cardStrings: CardV2Strings
  mintStrings: MintCardStrings
  strings: TranscriptStrings
  promptStrings?: PromptBoxStrings
}

// Default prompt strings — these are passed from the page but we provide a fallback
const DEFAULT_PROMPT_STRINGS: PromptBoxStrings = {
  idleHeading: 'Elige un ejemplo o describe tu vista macro',
  idleBody:
    'Cada ejemplo reproduce una decisión registrada y verificada por consenso en Somnia. Tu texto se asocia al ejemplo más cercano; no se infiere en vivo.',
  chip1Label: 'La inflación en Colombia sorprendió al alza — ¿cómo me cubro?',
  chip1Caption:
    'Ejemplos curados · cada uno reproduce una decisión registrada y verificada por consenso',
  chip2Label: 'La inflación se está moderando — ¿reduzco la cobertura?',
  chip2Caption:
    'Ejemplos curados · cada uno reproduce una decisión registrada y verificada por consenso',
  freeTextCaption: 'Tu texto se asocia al ejemplo más cercano; no se infiere en vivo.',
  placeholder: 'Elige un ejemplo o describe tu vista macro',
}

// ---------------------------------------------------------------------------
// Step entrance animation variants (mounted-gated)
// ---------------------------------------------------------------------------

const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// ---------------------------------------------------------------------------
// RunTranscript component
// ---------------------------------------------------------------------------

export function RunTranscript({
  traceNodes,
  cardStrings,
  mintStrings,
  strings,
  promptStrings = DEFAULT_PROMPT_STRINGS,
}: RunTranscriptProps) {
  // MOUNTED GATE — SSR renders idle; no entrance animation until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Per-mount store (factory — no module singleton, server-leak guard)
  const store = useMemo(() => createWorkflowStore(), [])

  // useSyncExternalStore → first paint = idle (getServerSnapshot returns IDLE)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

  // Active preset id — which trace node to show in the A1 entry
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // Streaming flag — true while workflow is running
  const [streaming, setStreaming] = useState(false)

  // Confirm gate — ref to the Confirm button (focus-on-enter, FD-M2)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Confirm promise resolver — set when the engine awaits user confirm
  const confirmResolveRef = useRef<(() => void) | null>(null)

  // Move focus to Confirm button when status becomes a2_decision (FD-M2, Q3)
  useEffect(() => {
    if (state.status === 'a2_decision' && confirmRef.current) {
      confirmRef.current.focus()
    }
  }, [state.status])

  // startRun — called by PromptBox chip click or free-text submit
  function startRun(presetId: string) {
    // Prevent double-start
    if (streaming) return

    setActivePresetId(presetId)
    setStreaming(true)

    // Fresh confirm gate
    const confirmPromise = new Promise<void>((resolve) => {
      confirmResolveRef.current = resolve
    })

    // runWorkflow emits view-ready events (fromMockEvent already applied in engine)
    // The engine emits enriched objects; the store.emit receives them directly
    runWorkflow(presetId, (event) => store.emit(event as Parameters<(typeof store)['emit']>[0]), {
      confirm: confirmPromise,
    })
      .catch(console.error)
      .finally(() => setStreaming(false))
  }

  // onConfirm — called by Confirm button in HedgeDecisionCardV2
  function onConfirm() {
    store.emit({ kind: 'confirm' })
    if (confirmResolveRef.current) {
      confirmResolveRef.current()
      confirmResolveRef.current = null
    }
  }

  const isRunning = state.status !== 'idle' && state.status !== 'done'
  const isStreaming = isRunning || streaming

  return (
    <div>
      {/* PromptBox — rendered inside RunTranscript so startRun is shared */}
      <PromptBox strings={promptStrings} onStart={startRun} disabled={isStreaming} />

      {/* Replaying·mock INLINE pill — shown while streaming (INLINE, not the shipped pill) */}
      {isStreaming && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface"
            aria-label={strings.replayingMockAria}
          >
            <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{strings.replayingMock}</span>
          </span>
        </div>
      )}

      {/* Transcript — aria-live region, append-only entries */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="flex flex-col gap-6"
        data-testid="transcript"
      >
        {/* A1 entry — rendered when status is a1 or beyond */}
        {(state.status === 'a1' ||
          state.status === 'a2_decision' ||
          state.status === 'minting' ||
          state.status === 'done') && (
          <StepEntry
            stepId="a1"
            label={strings.agent1Label}
            mounted={mounted}
            isActive={state.status === 'a1'}
          >
            {/* Real recorded DecisionPipelineTrace — all-at-once reveal */}
            {activePresetId !== null && traceNodes[activePresetId] !== undefined ? (
              traceNodes[activePresetId]
            ) : (
              <p className="text-text-muted text-sm py-4">{strings.errorState}</p>
            )}
          </StepEntry>
        )}

        {/* A2 entry — rendered when status is a2_decision or beyond */}
        {(state.status === 'a2_decision' ||
          state.status === 'minting' ||
          state.status === 'done') &&
          'a2' in state && (
            <StepEntry
              stepId="a2"
              label={strings.agent2Label}
              mounted={mounted}
              isActive={state.status === 'a2_decision'}
            >
              <HedgeDecisionCardV2
                view={state.a2}
                strings={cardStrings}
                onConfirm={onConfirm}
                confirmRef={confirmRef}
              />
            </StepEntry>
          )}

        {/* Mint entry — rendered when status is done */}
        {state.status === 'done' && 'mint' in state && (
          <StepEntry stepId="mint" label={strings.mintLabel} mounted={mounted} isActive={false}>
            <MintCard mint={{ kind: 'PositionMinted', ...state.mint }} strings={mintStrings} />
          </StepEntry>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StepEntry — individual transcript entry (mounted-gated motion entrance)
// ---------------------------------------------------------------------------

interface StepEntryProps {
  stepId: string
  label: string
  mounted: boolean
  isActive: boolean
  children: ReactNode
}

function StepEntry({ stepId, label, mounted, isActive, children }: StepEntryProps) {
  return (
    <AnimatePresence>
      <motion.section
        key={stepId}
        data-step={stepId}
        aria-label={label}
        // MOUNTED GATE: no SSR animation; enter only after client mount
        initial={mounted ? 'hidden' : false}
        animate="visible"
        variants={stepVariants}
        // prefers-reduced-motion → CSS @media handles instant; motion still runs but CSS overrides
        style={{ willChange: 'opacity, transform' }}
        className="motion-reduce:transition-none"
      >
        {/* Step marker + heading — h2 per agent entry (FD-M4 heading outline) */}
        <div className="flex items-center gap-2 mb-3">
          {/* Step marker dot — accent for active step only */}
          <span
            className={[
              'h-2 w-2 rounded-full flex-shrink-0',
              isActive ? 'bg-accent-default' : 'bg-text-muted',
            ].join(' ')}
            aria-hidden="true"
          />
          <h2
            className={[
              'text-base font-semibold',
              isActive ? 'text-text-primary' : 'text-text-muted',
            ].join(' ')}
          >
            {label}
          </h2>
        </div>

        {/* Entry content */}
        <div className="pl-4">{children}</div>
      </motion.section>
    </AnimatePresence>
  )
}
