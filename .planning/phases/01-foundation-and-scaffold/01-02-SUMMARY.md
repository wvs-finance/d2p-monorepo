---
phase: 01-foundation-and-scaffold
plan: "02"
subsystem: ui
tags: [design-tokens, tailwind-v4, oklch, shadcn-ui, status-pill, cross-cutting, vitest, tdd]

dependency_graph:
  requires:
    - phase: 01-01
      provides: vitest config + Wave 0 stub tests (tokens.test.ts, status-pill.test.ts)
  provides:
    - app/globals.css with full semantic OKLCH token system (light + dark + @theme inline bridge)
    - components/StatusPill.tsx with color + icon + text for all 4 iteration statuses
    - components/ui/button.tsx and badge.tsx (shadcn new-york inlined)
    - components.json shadcn config
    - lib/utils.ts cn() helper
  affects:
    - All Phase 2 components (consume bg-bg-canvas, text-text-primary, status-* utilities)
    - Phase 2 iteration catalog cards (import StatusPill directly)
    - Plan 01-04 stub homepage (uses design tokens + StatusPill)
    - All future shadcn primitives (one pnpm dlx shadcn add away)

tech-stack:
  added:
    - clsx@2.1.1
    - tailwind-merge@3.6.0
    - lucide-react@1.14.0
    - class-variance-authority@0.7.1
    - radix-ui@1.4.3
  patterns:
    - "Tailwind v4 two-layer pattern: :root/:dark CSS custom properties + @theme inline bridge"
    - "Semantic token naming: --color-bg-canvas not --color-stone-50"
    - "All OKLCH neutrals have nonzero chroma (tinted toward 165 teal-green) — never pure achromatic"
    - "shadcn/ui token aliases mapped in @theme inline (--color-primary, --color-background, etc.)"
    - "StatusPill uses <output> element for semantic status role (Biome a11y useSemanticElements)"
    - "TDD: write failing test first, then implement component, then verify green"

key-files:
  created:
    - app/globals.css
    - lib/utils.ts
    - components.json
    - components/ui/button.tsx
    - components/ui/badge.tsx
    - components/StatusPill.tsx
    - tests/unit/status-pill.test.tsx
  modified:
    - tests/unit/tokens.test.ts (unfrozen from skipIf to real assertions)

key-decisions:
  - "Used <output> element instead of <span role=status> for StatusPill — Biome a11y useSemanticElements enforces this; <output> is the HTML5 semantic equivalent of the status ARIA role"
  - "shadcn/ui token aliases (--color-primary, etc.) added to @theme inline proactively — shadcn button/badge reference them immediately; avoids a follow-up fix"
  - "status-pill test uses .tsx extension — Vitest + OXC requires .tsx for JSX transform; .ts extension fails with parse error"
  - "Biome format removes trailing zeros from OKLCH values (0.550 -> 0.55, 0.200 -> 0.2) — values are semantically identical; no chroma becomes 0"

patterns-established:
  - "Pattern: Two-layer token architecture — :root/:dark define raw OKLCH values, @theme inline bridges to Tailwind utilities via var() references (not resolved values)"
  - "Pattern: All tinted neutrals use hue 165 (teal-green) with nonzero chroma — CROSS-05 compliance is baked into the token layer"
  - "Pattern: Status components use <output> semantic element, icon gets aria-hidden=true, text label is a real DOM node (never sr-only)"
  - "Pattern: shadcn CLI output requires biome check --fix --unsafe to clean up double-quote / import-order violations before committing"

requirements-completed:
  - FOUND-02
  - CROSS-05
  - CROSS-09

duration: 9min
completed: "2026-05-11"
---

# Phase 1 Plan 02: Design Tokens + shadcn/ui + StatusPill Summary

**OKLCH semantic token system in globals.css with @theme inline bridge, shadcn new-york primitives, and fully-tested StatusPill (color + icon + text) satisfying CROSS-05 and CROSS-09**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-11T20:09:24Z
- **Completed:** 2026-05-11T20:19:00Z
- **Tasks:** 3 of 3
- **Files modified:** 8

## Accomplishments

- Replaced the default Next.js globals.css with a complete d2p Finance semantic token system: 13 OKLCH variables in `:root` (light) + `.dark` (dark mode), bridged to Tailwind utilities via `@theme inline`. Every neutral has nonzero chroma tinted toward hue 165 (teal-green). No pure black, white, or stone/gray/zinc tokens.
- Initialized shadcn/ui new-york style with `components.json`, inlined `button.tsx` and `badge.tsx`. shadcn alias tokens (`--color-primary`, `--color-background`, etc.) pre-wired in the `@theme inline` block to avoid follow-up fixes.
- Built `StatusPill` component that renders color + icon + text for all 4 iteration statuses. Uses `<output>` for semantic HTML5 status role, `aria-hidden` on icons, real DOM text label — satisfying CROSS-09 even if CSS is stripped.

## Token OKLCH Values — Design Review Reference

### Light Mode (`:root`)

| Token | OKLCH | Notes |
|-------|-------|-------|
| `--bg-canvas` | `oklch(0.985 0.005 165)` | Cream canvas, tinted teal-green |
| `--bg-surface` | `oklch(0.965 0.008 165)` | One layer above canvas |
| `--bg-elevated` | `oklch(0.99 0.004 165)` | Cards, popovers |
| `--text-primary` | `oklch(0.18 0.02 165)` | Deep ink, not pure black |
| `--text-secondary` | `oklch(0.38 0.018 165)` | |
| `--text-muted` | `oklch(0.55 0.014 165)` | |
| `--border-default` | `oklch(0.88 0.01 165)` | |
| `--accent-default` | `oklch(0.55 0.18 165)` | Placeholder; Phase 2 UI-SPEC confirms |
| `--accent-hover` | `oklch(0.48 0.2 165)` | |
| `--status-pass` | `oklch(0.55 0.17 145)` | Green-leaning |
| `--status-fail` | `oklch(0.55 0.19 30)` | Warm red |
| `--status-parked` | `oklch(0.6 0.13 60)` | Amber |
| `--status-in-progress` | `oklch(0.55 0.16 230)` | Blue, distinct from accent |

### Dark Mode (`.dark`)

| Token | OKLCH | Notes |
|-------|-------|-------|
| `--bg-canvas` | `oklch(0.13 0.015 165)` | Deep ink canvas |
| `--bg-surface` | `oklch(0.17 0.013 165)` | |
| `--bg-elevated` | `oklch(0.21 0.012 165)` | |
| `--text-primary` | `oklch(0.94 0.012 165)` | Cream text |
| `--text-secondary` | `oklch(0.78 0.014 165)` | |
| `--text-muted` | `oklch(0.62 0.012 165)` | |
| `--border-default` | `oklch(0.3 0.01 165)` | |
| `--status-pass` | `oklch(0.65 0.17 145)` | Lightened +0.10 for dark bg |
| `--status-fail` | `oklch(0.65 0.19 30)` | Lightened +0.10 for dark bg |
| `--status-parked` | `oklch(0.7 0.13 60)` | Lightened +0.10 for dark bg |
| `--status-in-progress` | `oklch(0.65 0.16 230)` | Lightened +0.10 for dark bg |

### Lab Accent Hue Rationale

Hue 165 (teal-green) was chosen for the tinted-neutral base because:
1. Colombian forest palette — aligns with the lab's academic-nature register
2. Distinct from the purple-blue gradients on the impeccable blocklist
3. Sufficient chroma (C ≥ 0.005 even for canvas) to satisfy CROSS-05 without being visually saturated
4. The placeholder accent at hue 165 is easily swappable in Phase 2 UI-SPEC; all neutrals stay correct regardless of what accent is chosen

### Status Token Contrast Estimates (vs `--bg-canvas`)

`--bg-canvas` light: `oklch(0.985 0.005 165)` ≈ L=98.5% — near-white cream.

Status tokens at L=0.55: approximate relative luminance ~27%.
Canvas at L=0.985: approximate relative luminance ~96%.

Approximate contrast ratio ≈ (0.96 + 0.05) / (0.27 + 0.05) ≈ **3.2:1** for text colors.

For background use (icon + label at 100% opacity over 10% tinted background): the rendered foreground is the full-saturation color against the light canvas. The `/10` opacity background is cosmetic. The text itself at full `text-status-*` color achieves approximately 3.2:1 against the canvas.

**Note:** Phase 2 UI-SPEC must formally verify WCAG AA (4.5:1 for normal text, 3:1 for large/bold) with a real contrast calculator. The current status lightness (L=0.55) may need to be darkened slightly (L=0.45–0.50) for small-text AA compliance. This is flagged for Phase 2 designer review.

### shadcn/ui Alias Additions

These aliases were added to the `@theme inline` block to support shadcn's expected token names:

```css
--color-background:           var(--bg-canvas);
--color-foreground:           var(--text-primary);
--color-card:                 var(--bg-elevated);
--color-card-foreground:      var(--text-primary);
--color-popover:              var(--bg-elevated);
--color-popover-foreground:   var(--text-primary);
--color-primary:              var(--accent-default);
--color-primary-foreground:   var(--bg-canvas);
--color-secondary:            var(--bg-surface);
--color-secondary-foreground: var(--text-primary);
--color-muted:                var(--bg-surface);
--color-muted-foreground:     var(--text-muted);
--color-accent:               var(--bg-surface);
--color-accent-foreground:    var(--text-primary);
--color-border:               var(--border-default);
--color-input:                var(--border-default);
```

## Task Commits

1. **Task 1: Design tokens + lib/utils.ts + tokens.test.ts** - `b7eba61` (feat, bundled with parallel plan 01-05)
2. **Task 2: shadcn/ui init + button + badge** - `cb1b503` (feat)
3. **Task 3: StatusPill component + status-pill tests** - `f36599f` (feat)

## Files Created/Modified

- `app/globals.css` — Complete semantic OKLCH token system; three-section structure (:root, .dark, @theme inline)
- `lib/utils.ts` — cn() helper using clsx + tailwind-merge
- `components.json` — shadcn/ui new-york style config with @/lib/utils alias
- `components/ui/button.tsx` — Inlined shadcn button primitive (new-york, cva-based)
- `components/ui/badge.tsx` — Inlined shadcn badge primitive (new-york)
- `components/StatusPill.tsx` — StatusPill with IterationStatus type; 4 variants; <output> semantic element
- `tests/unit/tokens.test.ts` — Unfrozen: 7 real assertions (all pass, no skipIf)
- `tests/unit/status-pill.test.tsx` — Unfrozen: 6 RTL assertions (all pass, no todos)

## Decisions Made

- Used `<output>` HTML5 element instead of `<span role="status">` for StatusPill — Biome's `a11y/useSemanticElements` rule enforces the native element; `<output>` is the correct semantic equivalent
- shadcn/ui alias tokens added proactively to `@theme inline` — button and badge reference `bg-primary`, `bg-secondary`, `text-primary-foreground` etc. immediately
- `status-pill.test.tsx` uses `.tsx` extension — Vitest 4.x + OXC requires `.tsx` for JSX transform
- Biome format normalizes trailing zeros in OKLCH values (e.g. `0.550` becomes `0.55`) — semantically identical; chroma never becomes 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tokens.test.ts regex matched "inline" as a typeface name**
- **Found during:** Task 1 (tokens test RED→GREEN)
- **Issue:** Test used `/Inter/` regex which matched the word "inline" in the CSS comment "NOT violet, NOT purple-blue gradient (impeccable anti-pattern)"
- **Fix:** Changed regex to `/\bInter\b/` word boundary, and removed explicit font name mentions from CSS comments to avoid false positives
- **Files modified:** tests/unit/tokens.test.ts, app/globals.css
- **Verification:** tokens.test.ts exits 0 with 7 assertions passing
- **Committed in:** b7eba61

**2. [Rule 1 - Bug] TypeScript error: match[2] is string | undefined in strict mode**
- **Found during:** Task 1 typecheck (pre-commit hook)
- **Issue:** `exactOptionalPropertyTypes: true` means `RegExpExecArray[2]` is `string | undefined`, not `string`. `Number.parseFloat(match[2])` fails typecheck.
- **Fix:** Changed while-loop to `[...css.matchAll(oklchRegex)]` array spread + for-of to eliminate the assignment-in-expression Biome lint violation simultaneously
- **Files modified:** tests/unit/tokens.test.ts
- **Verification:** pnpm typecheck exits 0
- **Committed in:** b7eba61

**3. [Rule 1 - Bug] shadcn CLI generates double-quote files; Biome requires single-quotes**
- **Found during:** Task 2 (post-install biome check)
- **Issue:** shadcn CLI emits double-quoted strings in generated TSX; Biome's formatter requires single quotes in .ts/.tsx files
- **Fix:** `pnpm biome check --fix --unsafe components/ui/button.tsx components/ui/badge.tsx`
- **Files modified:** components/ui/button.tsx, components/ui/badge.tsx
- **Verification:** biome check exits 0 on both files
- **Committed in:** cb1b503

**4. [Rule 1 - Bug] Biome a11y/useSemanticElements rejects span role="status"**
- **Found during:** Task 3 (biome check on StatusPill.tsx)
- **Issue:** Biome's a11y enforcement requires native HTML5 elements over ARIA-role spans. `<span role="status">` should be `<output>` per WAI-ARIA HTML5 mapping.
- **Fix:** Changed to `<output>` — `<output>` is the HTML5 native element for the "status" role
- **Files modified:** components/StatusPill.tsx
- **Verification:** biome check exits 0; all 6 status-pill tests still pass
- **Committed in:** f36599f

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 Biome lint compliance)
**Impact on plan:** All auto-fixes improve correctness or maintain toolchain compliance. No scope creep.

## Issues Encountered

- Wave 2 parallel plan (01-05) committed `app/globals.css` and `tests/unit/tokens.test.ts` in its own commit (`b7eba61`) before this plan could create a clean Task 1 commit. Content is correct; attribution is in parallel plan's commit. No data loss.
- Biome's CSS formatter strips trailing zeros from OKLCH values on `biome format --write` (e.g. `oklch(0.550 0.180 165)` becomes `oklch(0.55 0.18 165)`). Semantically identical. The chroma-nonzero test passes because `0.18 > 0`.

## Next Phase Readiness

- Design token system is the single source of truth for all Phase 2 visual components
- StatusPill is ready for Phase 2's iteration catalog cards (`<StatusPill status={iter.status} label={t(...)} />`)
- shadcn primitives (Button, Badge) are inlined; adding more is `pnpm dlx shadcn@latest add {name}`
- Phase 2 UI-SPEC must formally verify WCAG AA contrast for status tokens (see contrast estimate note above)
- dark mode toggle not yet wired (deferred to Plan 04 via next-themes per CONTEXT.md)

---
*Phase: 01-foundation-and-scaffold*
*Completed: 2026-05-11*
