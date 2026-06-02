// SystemPromptDisclosure — collapsible SYSTEM_PROMPT viewer.
// RSC — server component, native details/summary, no client JS.
//
// This is the ONLY component in the pipeline trace that may contain a <details> element.
// (MAJOR-10: DecisionPipelineTrace.tsx and PipelineStage.tsx must contain NO <details>.)
//
// Anti-fishing exception (UI-SPEC §1):
//   This collapse is permitted because SYSTEM_PROMPT is a verbatim long constant — it is NOT
//   a FAIL/PASS disposition or decision narrative. The anti-fishing no-collapse rule from
//   CROSS-09/LAB-05 applies to disposition memos and FAIL/PASS verdicts, which this is not.
//
// Props:
//   triggerLabel — localized trigger text (e.g. "Ver prompt del sistema" / "View system prompt")
//
// Behavior:
//   - Default COLLAPSED (SYSTEM_PROMPT is long; the built prompt in stage 2 stays expanded).
//   - Trigger: accent-text label + caret (accent-text over accent-default per UI-SPEC §Color).
//   - Expanded: <pre> mono block on bg-bg-canvas with border.
//   - data-testid="SYSTEM_PROMPT" on the wrapper for acceptance grep.

import { SYSTEM_PROMPT } from '@/lib/apps/abrigo/somnia/prompt-trace'

interface SystemPromptDisclosureProps {
  triggerLabel: string
}

export function SystemPromptDisclosure({ triggerLabel }: SystemPromptDisclosureProps) {
  return (
    <details data-testid="SYSTEM_PROMPT" className="text-sm">
      <summary
        className="cursor-pointer list-none text-accent-text hover:text-accent-hover inline-flex items-center gap-1.5 select-none"
        aria-label={triggerLabel}
      >
        {/* Caret — accent-text, rotates open/closed via CSS peer pattern is not RSC-friendly;
            use a simple inline indicator instead (no JS) */}
        <span aria-hidden="true">▸</span>
        <span>{triggerLabel}</span>
      </summary>
      {/* SYSTEM_PROMPT verbatim — rendered in font-mono on bg-bg-canvas (recessed from surface) */}
      <pre className="font-mono text-sm bg-bg-canvas border border-border-default rounded-md p-4 whitespace-pre-wrap break-words mt-2">
        {SYSTEM_PROMPT}
      </pre>
    </details>
  )
}
