'use client'

// ModeBanner — Surface 1.
// Always-visible mode banner above PromptBox.
// Supports live | replay | mock modes.
// live: Radio + "en vivo · on-chain" + 2px accent left border + verbatim §0.2 disclosure (both langs)
//        + both explorer tx links when artifact provides real URLs.
// replay: "modo repetición · recibos reales".
// mock: FlaskConical + "modo demostración (sin cadena)".
//
// ARIA: role="status" aria-live="polite" on mode-label span
//        → live→replay degradation is announced (never silent).
// §0.2 disclosure: ALWAYS visible, never collapsed, two lines (es-CO then en).
// Spacing exception: 16px H / 12px V (compact persistent element — documented in UI-SPEC).

import type { CornerstoneMode } from '@/lib/apps/abrigo/cornerstone/mode'
import { CircleDashed, FlaskConical, GitFork, Radio } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// ModeBannerStrings — copy threaded from page RSC (no literals in JSX)
// ---------------------------------------------------------------------------

export interface ModeBannerStrings {
  liveModeLabel: string
  replayModeLabel: string
  mockModeLabel: string
  disclosureEs: string
  disclosureEn: string
  forkVerifiedLabel: string
  // Explorer tx labels (optional — only rendered when real URL present)
  explorerAgent1Label?: string
  explorerAgent2Label?: string
  degradationAnnounce?: string
}

export interface ExplorerLinks {
  somniaAgent1Url?: string
  buildbearAgent2Url?: string
}

interface ModeBannerProps {
  mode: CornerstoneMode
  strings: ModeBannerStrings
  explorerLinks?: ExplorerLinks
}

// ---------------------------------------------------------------------------
// Provenance pill (neutral — never green)
// ---------------------------------------------------------------------------

function ForkVerifiedPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-border-default bg-bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary"
      aria-label={label}
    >
      <GitFork className="h-3 w-3 text-text-secondary" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// ModeBanner
// ---------------------------------------------------------------------------

export function ModeBanner({ mode, strings, explorerLinks }: ModeBannerProps) {
  const isLive = mode === 'live'
  const isReplay = mode === 'replay'
  const isMock = mode === 'mock'

  // Left border color: accent on live, default on replay/mock
  const leftBorderClass = isLive
    ? 'border-l-2 border-l-accent-default'
    : 'border-l-2 border-l-border-default'

  return (
    <aside
      className={[
        'rounded border border-border-default bg-bg-surface',
        leftBorderClass,
        'mb-8',
      ].join(' ')}
      // 16px H / 12px V — documented spacing exception (UI-SPEC)
      style={{ padding: '12px 16px' }}
      aria-label="Modo de operación del agente cornerstone"
    >
      {/* Mode label row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {isLive && <Radio className="h-4 w-4 text-text-primary shrink-0" aria-hidden="true" />}
          {isReplay && (
            <CircleDashed className="h-4 w-4 text-text-secondary shrink-0" aria-hidden="true" />
          )}
          {isMock && (
            <FlaskConical className="h-4 w-4 text-text-muted shrink-0" aria-hidden="true" />
          )}
          {/* aria-live on this output element so a mode-flip is announced.
              <output> carries implicit role=status per HTML-AAM; Biome blocks the
              redundant explicit role="status" attribute (see project decision STATE.md). */}
          <output aria-live="polite" className="text-base font-semibold text-text-primary">
            {isLive && strings.liveModeLabel}
            {isReplay && strings.replayModeLabel}
            {isMock && strings.mockModeLabel}
          </output>
        </div>
        {/* fork-verified pill only on live mode */}
        {isLive && <ForkVerifiedPill label={strings.forkVerifiedLabel} />}
      </div>

      {/* §0.2 verbatim disclosure — ALWAYS visible on live, never collapsed */}
      {isLive && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-text-muted">{strings.disclosureEs}</p>
          <p className="text-sm text-text-muted">{strings.disclosureEn}</p>
        </div>
      )}

      {/* Explorer tx links (live mode, only when real URL provided — never fake) */}
      {isLive && explorerLinks && (
        <div className="mt-3 flex flex-wrap gap-4">
          {explorerLinks.somniaAgent1Url && strings.explorerAgent1Label && (
            <a
              href={explorerLinks.somniaAgent1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
            >
              <span>{strings.explorerAgent1Label}</span>
            </a>
          )}
          {explorerLinks.buildbearAgent2Url && strings.explorerAgent2Label && (
            <a
              href={explorerLinks.buildbearAgent2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
            >
              <span>{strings.explorerAgent2Label}</span>
            </a>
          )}
        </div>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// ModeBannerWithTranslations — convenience wrapper for pages using next-intl
// ---------------------------------------------------------------------------

export function ModeBannerConnected({
  mode,
  explorerLinks,
}: {
  mode: CornerstoneMode
  explorerLinks?: ExplorerLinks
}) {
  const t = useTranslations('somnia.cornerstone.live')
  const strings: ModeBannerStrings = {
    liveModeLabel: t('modeLiveLabel'),
    replayModeLabel: t('modeReplayLabel'),
    mockModeLabel: t('modeMockLabel'),
    disclosureEs: t('disclosureEs'),
    disclosureEn: t('disclosureEn'),
    forkVerifiedLabel: t('forkVerifiedLabel'),
    explorerAgent1Label: t('explorerAgent1Label'),
    explorerAgent2Label: t('explorerAgent2Label'),
  }
  return (
    <ModeBanner
      mode={mode}
      strings={strings}
      {...(explorerLinks !== undefined ? { explorerLinks } : {})}
    />
  )
}
