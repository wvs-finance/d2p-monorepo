---
phase: 02-research-lab-presence-and-iteration-catalog
plan: 02
subsystem: ui
tags: [components, vitest, tdd, tailwind, lucide-react, accessibility, iteration-detail, catalog]

requires:
  - phase: 02-research-lab-presence-and-iteration-catalog
    plan: 01
    provides: "muted-ochre tokens, IBM Plex fonts, iterations/research i18n namespaces, StatusPill component"

provides:
  - "BetaCIChart — inline SVG β+CI visualization, sr-only data table, role=img, viewBox 0 0 300 60"
  - "ReplicationHash — client-only, truncated display, copy-to-clipboard with <output> tooltip"
  - "EvidenceChain — dl/dt/dd semantic, omit-on-undefined, composes BetaCIChart + ReplicationHash"
  - "DispositionMemo — no collapse, text-text-primary, StatusPill reuse, FAIL notice section"
  - "IterationDetailHeader — flex-col sm:flex-row stacking, text-3xl sm:text-4xl H1, StatusPill + version"
  - "IterationCatalogCard — min-h-[120px] epistemic equality, full-card anchor, StatusPill"
  - "PublicationCard — optional order prefix, Badge type label, line-clamp-2, ArrowUpRight CTA"
  - "ContributorCard — divide-y row (no card), avatar img, GitHub ArrowUpRight link"
  - "NumberedStep — flex-col md:flex-row panoptic pattern, font-mono accent number, max-w-2xl"
  - "CheckmarkList — ul + CheckCircle2 text-status-pass, items-start gap-2"
  - "42 unit tests (20 Task 1 + 22 Task 2) all passing"

affects:
  - "02-03 (iteration catalog page) — imports IterationCatalogCard"
  - "02-04 (iteration detail page) — imports IterationDetailHeader, EvidenceChain, DispositionMemo"
  - "02-06 (team page) — imports ContributorCard"
  - "02-07 (publications + about pages) — imports PublicationCard, NumberedStep, CheckmarkList"

tech-stack:
  added:
    - "@testing-library/user-event@14.6.1 (devDep, clipboard interaction testing)"
  patterns:
    - "Server Components default; ReplicationHash is sole client component (needs useState + navigator.clipboard)"
    - "BetaCIChart uses <figure>+<svg>+<table class=sr-only>+<figcaption class=sr-only> for full accessibility"
    - "EvidenceChain omit-on-undefined: no field = no row; no placeholder dashes or N/A"
    - "ContributorCard: no rounded-lg on li — border-b divider treatment only (no card-in-card)"
    - "clipboard mock in tests: Object.defineProperty(navigator, 'clipboard', { value }) + fireEvent.click"
    - "Biome useSemanticElements: role=status on span → use <output> element instead"
    - "Test fixtures must avoid em-dash in titles if testing .not.toContain('—')"

key-files:
  created:
    - "components/BetaCIChart.tsx"
    - "components/ReplicationHash.tsx"
    - "components/EvidenceChain.tsx"
    - "components/DispositionMemo.tsx"
    - "components/IterationDetailHeader.tsx"
    - "components/IterationCatalogCard.tsx"
    - "components/PublicationCard.tsx"
    - "components/ContributorCard.tsx"
    - "components/NumberedStep.tsx"
    - "components/CheckmarkList.tsx"
    - "tests/unit/beta-ci-chart.test.tsx"
    - "tests/unit/replication-hash.test.tsx"
    - "tests/unit/evidence-chain.test.tsx"
    - "tests/unit/disposition-memo.test.tsx"
    - "tests/unit/iteration-detail-header.test.tsx"
    - "tests/unit/iteration-catalog-card.test.tsx"
    - "tests/unit/publication-card.test.tsx"
    - "tests/unit/contributor-card.test.tsx"
    - "tests/unit/numbered-step.test.tsx"
    - "tests/unit/checkmark-list.test.tsx"
  modified:
    - "package.json — @testing-library/user-event@14.6.1 added"
    - "pnpm-lock.yaml"

key-decisions:
  - "ReplicationHash uses <output> element (not <span role=status>) per Biome useSemanticElements lint rule"
  - "Clipboard test uses Object.defineProperty(navigator, 'clipboard') + fireEvent.click — vi.stubGlobal('navigator') strips existing props and breaks JSDOM"
  - "Test fixtures must not contain em-dash in titles when testing .not.toContain('—') — title em-dashes are content, not placeholders"
  - "@testing-library/user-event installed as devDep — not previously in project, required for interactive component tests"

requirements-completed: []

duration: 9min
completed: 2026-05-12
---

# Phase 2 Plan 02: Phase 2 Component Library Summary

**10 reusable UI primitives (5 iteration-detail + 5 catalog/lab-page) with 42 unit tests, strict StatusPill reuse, impeccable anti-pattern compliance, and ReplicationHash as the only client component**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-12T22:27:50Z
- **Completed:** 2026-05-12T22:37:00Z
- **Tasks:** 2
- **Files created:** 20 components + tests + 2 modified

## Component Props Interfaces (Verbatim)

### BetaCIChart (RSC)

```typescript
export interface BetaCIChartProps {
  beta: number
  ciLower: number
  ciUpper: number
  label?: string  // override default aria-label
}
```

### ReplicationHash (Client)

```typescript
export interface ReplicationHashProps {
  hash: string
  copyLabel: string      // translated "Copy replication hash"
  copiedLabel: string    // translated "Copied!"
}
```

### EvidenceChain (RSC)

```typescript
export interface EvidenceChainIteration {
  slug: string; version: number; status: 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'
  title_es: string; title_en: string
  beta?: number; ci_lower?: number; ci_upper?: number
  p_value?: number; sample_size?: number; replication_hash?: string
  notebook_url?: string; dataset_ref?: string; analysis_date: Date
  disposition_memo?: string; code: string
}
export interface EvidenceChainProps {
  iteration: EvidenceChainIteration
  t: (key: string) => string
}
```

### DispositionMemo (RSC)

```typescript
export interface DispositionMemoIteration {
  slug: string; version: number; status: IterationStatus
  title_es: string; title_en: string; analysis_date: Date
  disposition_memo?: string; code: string
}
export interface DispositionMemoProps {
  iteration: DispositionMemoIteration
  locale: 'es-CO' | 'en'
  t: (key: string) => string
}
```

### IterationDetailHeader (RSC)

```typescript
export interface IterationDetailHeaderIteration {
  slug: string; version: number; status: IterationStatus
  title_es: string; title_en: string; analysis_date: Date; code: string
}
export interface IterationDetailHeaderProps {
  iteration: IterationDetailHeaderIteration
  locale: 'es-CO' | 'en'
  t: (key: string) => string
}
```

### IterationCatalogCard (RSC)

```typescript
export interface IterationCatalogCardIteration {
  slug: string; version: number; status: IterationStatus
  title_es: string; title_en: string; beta?: number
  analysis_date: Date; code: string
}
export interface IterationCatalogCardProps {
  iteration: IterationCatalogCardIteration
  locale: 'es-CO' | 'en'
  labels: { statusLabels: Record<IterationStatus, string> }
}
```

### PublicationCard (RSC)

```typescript
export interface PublicationCardResearch {
  slug: string; title_es: string; title_en: string; authors: string[]
  date: Date; type: 'paper' | 'decision-memo' | 'write-up' | 'talk'
  external_url?: string; summary_es: string; summary_en: string
  tags: string[]; order?: number
}
export interface PublicationCardProps {
  research: PublicationCardResearch
  locale: 'es-CO' | 'en'
  t: (key: string) => string
}
```

### ContributorCard (RSC)

```typescript
export interface Contributor {
  slug: string; name: string; role_es: string; role_en: string
  github_handle: string; avatar_url?: string; focus_iteration_slug?: string
}
export interface ContributorCardProps {
  contributor: Contributor
  t: (key: string) => string
  locale?: 'es-CO' | 'en'
}
```

### NumberedStep (RSC)

```typescript
export interface NumberedStepProps {
  number: string
  title: string
  body: string
}
```

### CheckmarkList (RSC)

```typescript
export interface CheckmarkListProps {
  items: string[]
}
```

## RSC vs Client Classification

| Component | Type | Reason |
|-----------|------|--------|
| BetaCIChart | RSC | Pure SVG computation, no interactivity |
| ReplicationHash | **Client** | useState (copied flag) + navigator.clipboard API |
| EvidenceChain | RSC | Composes BetaCIChart + ReplicationHash; RSC can import client components |
| DispositionMemo | RSC | Static render, no interactivity |
| IterationDetailHeader | RSC | Static render with locale/date formatting |
| IterationCatalogCard | RSC | Static anchor with formatted data |
| PublicationCard | RSC | Static card with optional Badge |
| ContributorCard | RSC | Static row with image + links |
| NumberedStep | RSC | Static layout |
| CheckmarkList | RSC | Static list with icons |

ReplicationHash is the only client component because it requires `useState` to track the copied/not-copied UI state and `navigator.clipboard.writeText()` which is a browser-only API.

## StatusPill Reuse Map (ITER-07)

| Component | StatusPill Usage |
|-----------|----------------|
| IterationCatalogCard | Status pill in card top row |
| IterationDetailHeader | Status pill + version in header top row |
| DispositionMemo | Status pill in fail-notice section for screen-reader context |
| EvidenceChain | No direct StatusPill (composes EvidenceChain which has no status) |

All three required ITER-07 consumers confirmed via grep: `grep -l 'StatusPill' components/IterationCatalogCard.tsx components/IterationDetailHeader.tsx components/DispositionMemo.tsx`.

## Test Coverage

| Component | Tests | Coverage Areas |
|-----------|-------|----------------|
| BetaCIChart | 5 | role=img + aria-label, sr-only table, circle+line elements, stroke-dasharray, viewBox |
| ReplicationHash | 4 | truncation, title+aria-label, copy button aria, clipboard.writeText call |
| EvidenceChain | 4 | dl/dt/dd structure, omit-on-undefined, BetaCIChart composition, aria-labelledby |
| DispositionMemo | 4 | section+H2, text-text-primary, no details/summary, StatusPill presence |
| IterationDetailHeader | 3 | StatusPill+version+H1+date, text-3xl/4xl, flex-col sm:flex-row |
| IterationCatalogCard | 6 | min-h-[120px], href, StatusPill, H3, beta omit-on-null, equal height |
| PublicationCard | 5 | H3, Badge, order prefix, external link target+rel, line-clamp-2 |
| ContributorCard | 4 | li+flex, img alt, GitHub href+ArrowUpRight, no rounded-lg |
| NumberedStep | 4 | font-mono accent, flex-col md:flex-row, H3, max-w-2xl |
| CheckmarkList | 3 | ul (not ol/div), CheckCircle2 text-status-pass, items-start gap-2 |
| **Total** | **42** | |

## Accomplishments

- Built 10 fully tested Phase 2 component primitives, all passing biome + tsc; impeccable anti-pattern free (no Inter/Geist, no purple/blue gradients, no card-in-card, no side-accent borders)
- Strict TDD: RED→GREEN for both tasks; all tests failed before components were written
- ITER-07 StatusPill reuse confirmed: IterationCatalogCard, IterationDetailHeader, DispositionMemo all import and render StatusPill
- EvidenceChain implements the omit-on-undefined pattern: no field present → no row rendered; no placeholder dashes or "N/A" ever shown
- DispositionMemo uses text-text-primary for prose (not text-text-muted), no collapse/accordion — epistemic equality enforced
- ReplicationHash uses `<output>` (semantic) not `<span role="status">` — biome useSemanticElements lint enforced

## Task Commits

1. **Task 1: Iteration-detail visualization primitives** — `b29891c` (feat)
2. **Task 2: Catalog + lab-page components** — `cf31847` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @testing-library/user-event not installed**
- **Found during:** Task 1 (ReplicationHash test setup)
- **Issue:** `replication-hash.test.tsx` imports `@testing-library/user-event` but it wasn't in package.json devDependencies
- **Fix:** `pnpm add -D @testing-library/user-event` → installed v14.6.1
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** `b29891c`

**2. [Rule 1 - Bug] vi.stubGlobal('navigator') strips existing JSDOM navigator properties**
- **Found during:** Task 1 (clipboard test)
- **Issue:** `vi.stubGlobal('navigator', { clipboard: { writeText } })` replaces the entire navigator object, causing JSDOM to lose properties it relies on, making clipboard mock non-functional
- **Fix:** Used `Object.defineProperty(navigator, 'clipboard', { value: { writeText }, writable: true, configurable: true })` + `fireEvent.click` instead of userEvent
- **Files modified:** `tests/unit/replication-hash.test.tsx`
- **Commit:** `b29891c`

**3. [Rule 1 - Bug] Biome useSemanticElements: `<span role="status">` should be `<output>`**
- **Found during:** Task 1 (biome check pass)
- **Issue:** The copied tooltip used `<span role="status">` which biome correctly flagged — WAI-ARIA spec maps role="status" to the `<output>` HTML element
- **Fix:** Changed to `<output>` element
- **Files modified:** `components/ReplicationHash.tsx`
- **Commit:** `b29891c`

**4. [Rule 1 - Bug] Test fixture title contained em-dash, breaking .not.toContain('—') assertion**
- **Found during:** Task 2 (IterationCatalogCard test)
- **Issue:** Test fixture title `'Pair D — OLS estimate'` contains an em-dash; `expect(allText).not.toContain('—')` was testing for placeholder dashes but the em-dash in the title triggered it
- **Fix:** Changed test fixture title to `'Pair D OLS estimate'` (no em-dash)
- **Files modified:** `tests/unit/iteration-catalog-card.test.tsx`
- **Commit:** `cf31847`

---

**Total deviations:** 4 auto-fixed (2 Bug, 1 Blocking, 1 Bug)
**Impact on plan:** All deviations were minor correctness fixes. No scope changes.

## Validation Results

- `pnpm vitest run tests/unit/` — 120 passed | 5 todo (Wave 0 stubs) | 1 skipped (impeccable CI)
- `pnpm tsc --noEmit` — exits 0
- `pnpm biome check components/ tests/unit/` — exits 0, no errors
- Impeccable anti-patterns: manually verified (no Inter/Geist/Mona/Plus Jakarta fonts, no purple/violet gradients, no side-accent borders)

## Next Phase Readiness

- **02-03** (Iteration catalog page): imports `IterationCatalogCard`, `StatusPill` — both ready
- **02-04** (Iteration detail page): imports `IterationDetailHeader`, `EvidenceChain`, `DispositionMemo`, `BetaCIChart`, `ReplicationHash` — all ready
- **02-06** (Team page): imports `ContributorCard`, `Contributor` type — ready
- **02-07** (Publications + About pages): imports `PublicationCard`, `NumberedStep`, `CheckmarkList` — ready

---
*Phase: 02-research-lab-presence-and-iteration-catalog*
*Completed: 2026-05-12*
