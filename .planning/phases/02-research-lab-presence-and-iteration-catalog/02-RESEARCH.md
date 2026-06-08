# Phase 2: Research Lab Presence and Iteration Catalog — Research

**Researched:** 2026-05-12
**Domain:** Next.js 16 App Router content pages — MDX/Velite, inline SVG, nuqs URL state, GitHub Actions, JSON-LD, i18n, accessibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Velite-managed `content/iterations/{slug}/v{n}.mdx` is the source of truth. FOUND-04 schema locked in Phase 1. Two real iterations seeded in Phase 2: `pair-d/v1.mdx` (PASS) and `fx-vol-on-cpi-surprise/v1.mdx` (FAIL).
- Phase 1 sample iteration MDX (`content/iterations/sample/v1.mdx`) is **deleted** in Phase 2.
- GitHub Actions sync workflow LAB-04 is exercised for real in Phase 2 — push-trigger from `wvs-finance/abrigo` main + path filter added; `peter-evans/create-pull-request@v6` PR step filled in.
- Authoring fidelity: all β / CI / p-value / N / replication_hash values come from abrigo decision memos. No invented values. If a value is unknown, the field is omitted (schema allows optional fields for beta/ci/p_value/sample_size/replication_hash).
- Inline SVG horizontal range-bar component, ~30 lines, no chart library. Visx deferred to Phase 3.
- `content/research/*.mdx` Velite collection (new in Phase 2): fields slug, title_es, title_en, authors[], date, type, external_url (optional), summary_es, summary_en, tags[].
- Replication hash: `<details>` element, default collapsed, with copy-to-clipboard code blocks.
- Team page: hardcoded `lib/team/contributors.ts` typed TS array. No GitHub API runtime fetch.
- Status filter (`/apps/abrigo/iterations`): **default ALL visible**, URL state via `nuqs`, pill row `[All N] [PASS n] [FAIL n] [PARKED n] [IN_PROGRESS n]`.
- About page: single long-form RSC, no accordion, five NumberedStep components for anti-fishing discipline, four CheckmarkList items.
- Mobile responsive breakpoints per UI-SPEC: 1-col base / 2-col sm / 3-col lg for iteration grid. EvidenceChain stacks vertically at <sm.
- Dark mode token migration: hue 165 → 70-80. `--bg-canvas` dark: `oklch(0.13 0.015 70)`, etc. All pairs in UI-SPEC are canonical.
- `--spacing-5xl: 120px` added to `@theme inline` block.
- JSON-LD `Dataset` + `ScholarlyArticle` per iteration detail page (both blocks), via `<StructuredData>` component extension.
- IBM Plex Sans (body) + IBM Plex Mono (mono/evidence) — loaded via `next/font/google`. Both fonts added in Phase 2.

### Claude's Discretion

- Exact directory structure under `content/research/` and `lib/team/`
- Specific filenames for new components (IterationCatalogCard.tsx or IterationCard.tsx both acceptable)
- Whether to use a Server Action for filter or a Client Component with `nuqs` directly
- OpenGraph image strategy — Phase 2 ships static SVG OG cards; dynamic per-iteration OG deferred to Phase 4
- Loading skeleton designs (must satisfy LCP budget and reduced-motion preference)

### Deferred Ideas (OUT OF SCOPE)

- Iteration search / full-text (Pagefind) — deferred until >~20 iterations
- OpenGraph dynamic route (`@vercel/og`) — Phase 4
- Notebook iframe embed — stretch goal
- Subscribe / RSS for iterations — v2 (NOTIF-01)
- Comments / annotations — out of scope
- Per-iteration analytics — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAB-01 | Lab umbrella homepage at `/` renders mission, explainer, Apps overview (Abrigo), cross-app iteration headline counts (Pass/Fail/Parked/In Progress), GitHub org link | Velite count-query pattern; `IterationCountTile` reuse; homepage layout contract from UI-SPEC |
| LAB-02 | Team/contributors page at `/team` lists contributors with role, GitHub link, current iteration ownership | `lib/team/contributors.ts` hardcoded pattern; `ContributorCard` component spec |
| LAB-03 | Publications page at `/research` indexes papers, decision memos, iteration write-ups synced from `../abrigo/` | New `research` Velite collection; `PublicationCard` component spec |
| LAB-04 | Content pipeline CI step syncs `../abrigo/scratch/**/*.md` and `../abrigo/docs/**/*.md` on push to abrigo main | GitHub Actions `repository_dispatch` + path filter + `peter-evans/create-pull-request@v6` pattern |
| LAB-05 | About page explains anti-fishing discipline, pre-committed-spec workflow, trio-checkpoint method | NumberedStep + CheckmarkList component spec; RSC long-form page pattern |
| LAB-06 | All lab pages render in es-CO and en with author-quality translations | next-intl v4 namespace addition pattern; `i18n/request.ts` deep-merge extension |
| ITER-01 | Iteration catalog at `/apps/abrigo/iterations` lists every iteration regardless of status; no default filter hides FAIL/PARKED | Velite collection array; RSC page with `generateStaticParams`; empty-state copy |
| ITER-02 | Catalog cards render status at equal visual weight — same dimensions, same typography for all statuses | `IterationCatalogCard` min-h-[120px] constraint; `StatusPill` reuse; epistemic-equality rule |
| ITER-03 | Iteration detail page shows spec → data → estimation → tests → disposition narrative with full evidence chain | MDX-rendered prose; `EvidenceChain` component; two-column lg layout spec |
| ITER-04 | Each iteration detail displays β, 95% CI, p-value, N, replication hash with working `make verify` link | `EvidenceChain` dl/dt/dd pattern; `ReplicationHash` component; font-mono values |
| ITER-05 | Pair D detail page at `/apps/abrigo/iterations/pair-d/v1` (PASS) renders fully | Real MDX content from abrigo notebooks; inline SVG β-CI range-bar; `IterationDetailHeader` |
| ITER-06 | FX-vol-on-CPI-surprise detail at `.../fx-vol-on-cpi-surprise/v1` (FAIL) renders at same visual weight, includes failure disposition memo | `DispositionMemo` component; no de-emphasis; real content from FX-vol notebooks/README |
| ITER-07 | `<StatusPill status={...}>` encodes state with color + icon + text (never color-alone) | Existing `StatusPill.tsx` component — reuse unchanged |
| ITER-08 | Iteration URLs are content-addressable human-readable slugs under `/apps/abrigo/iterations/{slug}/v{n}` | Velite `pattern: 'iterations/**/*.mdx'`; Next.js `[slug]/v[version]` dynamic segments; `generateStaticParams` |
| ITER-09 | Each iteration page emits JSON-LD `Dataset` + `ScholarlyArticle` with `isPartOf` chain + OpenGraph card | `StructuredData.tsx` extension; `generateMetadata`; XSS-escape pattern already established |
</phase_requirements>

---

## Summary

Phase 2 delivers the hackathon demo critical path — the sequence of URLs a Uniswap Hook Incubator judge visits to understand DS2P Labs. The technical work is primarily content-and-component authoring on an already-solid Phase 1 scaffold: Velite is extended with a `research` collection; six new RSC pages are written; six new components are built; the GitHub Actions sync workflow is completed; and design tokens are migrated from placeholder hue 165 to locked muted ochre (hue 70-80).

The most research-intensive areas are: (1) the nuqs v2 setup for the status filter URL state — not previously installed, requires `NuqsAdapter` in the layout and careful placement in the (apps) route group to avoid `(lab)` contamination; (2) the inline SVG β-CI range-bar — a ~30-line component requiring a correct viewBox scaling formula; (3) the JSON-LD Dataset + ScholarlyArticle contract — specific schema.org field requirements verified; (4) the GitHub Actions cross-repo trigger pattern — `repository_dispatch` from abrigo main is the correct mechanism; and (5) the `i18n/request.ts` extension — the existing deep-merge already handles new namespace files correctly, no architectural change needed.

The sibling-repo content reads are safe and confirmed: Velite operates at build time from the filesystem; `../abrigo/` files are reachable from the frontend working directory during local development and in CI (where the sync workflow checks out both repos). No Next.js or Velite restriction prevents `..` paths at content-authoring time.

**Primary recommendation:** Write the Velite `research` collection schema first, then author the two real iteration MDX files with real values from abrigo, then build components in dependency order (StatusPill reuse → IterationCatalogCard → EvidenceChain → DispositionMemo → PublicationCard → ContributorCard → NumberedStep → CheckmarkList), then wire pages, then expand GitHub Actions, then migrate tokens.

---

## Standard Stack

### Core — Already Installed (Phase 1)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.2.6 | App Router RSC pages | All Phase 2 pages are RSC in `(lab)` and `(apps)` route groups |
| Velite | 0.3.1 | MDX content pipeline | Phase 2 adds `research` collection to existing `velite.config.ts` |
| next-intl | 4.11.2 | i18n | `getTranslations()` in RSC; `i18n/request.ts` deep-merge already handles new namespace files |
| Tailwind CSS | 4.3.0 | Styling | Token migration from hue 165 → 70-80; `--spacing-5xl` added |
| shadcn/ui | Feb 2026 | Component primitives | `Button`, `Badge` (for type badges on PublicationCard). `Accordion` optional on /about only if warranted |
| lucide-react | 1.14.0 | Icons | `ClipboardCopy`, `CheckCircle2`, `CheckSquare`, `ArrowUpRight` added in Phase 2 |
| schema-dts | 2.0.0 | TypeScript types for JSON-LD | `Dataset`, `ScholarlyArticle` types already available in the package |

### New Installation Required

| Library | Version | Purpose | Install |
|---------|---------|---------|---------|
| nuqs | 2.8.9 | URL state management for status filter | `pnpm add nuqs` |
| IBM Plex Sans | (Google Font) | Body typeface | `next/font/google` — no npm install needed |
| IBM Plex Mono | (Google Font) | Mono/evidence typeface | `next/font/google` — no npm install needed |

**Version verification (2026-05-12):**
- `nuqs`: latest stable is `2.8.9`. Peer dep `next: >=14.2.0` is satisfied by Next.js 16.2.6. Peer dep `react: >=18.2.0 || ^19.0.0-0` is satisfied by React 19.2.4. Compatible — no caveats.
- `peter-evans/create-pull-request`: v6 is the current major for GitHub Actions.

**Installation:**
```bash
pnpm add nuqs
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
content/
├── iterations/
│   ├── pair-d/v1.mdx           # PASS — real content from abrigo notebooks
│   └── fx-vol-on-cpi-surprise/v1.mdx  # FAIL — real content from fx_vol_cpi_surprise
└── research/
    ├── pair-d-dispatch-brief.mdx       # decision-memo
    ├── fx-vol-cpi-closed-fail.mdx      # decision-memo
    └── abrigo-y3-carbon-basket.mdx     # write-up

lib/
└── team/
    └── contributors.ts         # typed TS array, no runtime fetch

components/
├── IterationCatalogCard.tsx     # RSC: card for /apps/abrigo/iterations grid
├── IterationDetailHeader.tsx   # RSC: status pill + version + H1 + date
├── EvidenceChain.tsx           # RSC: dl/dt/dd evidence block
├── ReplicationHash.tsx         # Client: copy-to-clipboard, truncated display
├── DispositionMemo.tsx         # RSC: full failure narrative, no collapse
├── BetaCIChart.tsx             # RSC: inline SVG ~30 lines, no chart lib
├── PublicationCard.tsx         # RSC: publication list card
├── ContributorCard.tsx         # RSC: contributor row
├── NumberedStep.tsx            # RSC: anti-fishing discipline step
└── CheckmarkList.tsx           # RSC: discipline commitments list

app/
├── (lab)/
│   ├── page.tsx                # / homepage — Phase 2 fills real content
│   ├── research/page.tsx       # /research — new
│   ├── team/page.tsx           # /team — new
│   └── about/page.tsx          # /about — new
└── (apps)/
    └── apps/abrigo/
        ├── iterations/
        │   ├── page.tsx         # /apps/abrigo/iterations — new
        │   └── [slug]/
        │       └── v[version]/
        │           └── page.tsx # /apps/abrigo/iterations/{slug}/v{n} — new

messages/
├── es-CO/
│   ├── iterations.json         # new namespace
│   ├── research.json           # new namespace
│   ├── team.json               # new namespace
│   └── about.json              # new namespace
└── en/
    ├── iterations.json
    ├── research.json
    ├── team.json
    └── about.json

velite.config.ts                # extended: add `research` collection
.github/workflows/
└── sync-abrigo-content.yml     # Phase 2 completes push-trigger + PR step
```

### Pattern 1: Velite Multiple Collections

Velite supports multiple collections in a single `velite.config.ts`. The `defineConfig` `collections` property takes a plain object with named keys.

```typescript
// Source: velite.js.org documentation + confirmed against velite.config.ts already in place
import { defineCollection, defineConfig, s } from 'velite'

const iterations = defineCollection({
  name: 'Iteration',
  pattern: 'iterations/**/*.mdx',
  schema: iterationSchema,          // already exported
})

const research = defineCollection({
  name: 'Research',
  pattern: 'research/*.mdx',
  schema: s.object({
    slug: s.slug('research'),       // auto-derived from file path
    title_es: s.string().min(1),
    title_en: s.string().min(1),
    authors: s.array(s.string()).min(1),
    date: s.coerce.date(),
    type: s.enum(['paper', 'decision-memo', 'write-up', 'talk']),
    external_url: s.string().url().optional(),
    summary_es: s.string().min(1),
    summary_en: s.string().min(1),
    tags: s.array(s.string()).default([]),
    order: s.number().int().positive().optional(),
  }),
})

export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static', base: '/static/', name: '[name]-[hash:6].[ext]', clean: true },
  collections: { iterations, research },   // add research alongside iterations
})
```

After build, `import { research } from '.velite'` gives the typed collection array. Velite generates `.velite/research.ts` automatically.

**Key Velite behavior:** The `s.slug()` helper in Velite auto-derives a slug from the file path — `content/research/pair-d-dispatch-brief.mdx` produces `slug: 'pair-d-dispatch-brief'`. Alternatively use `s.path()` for the full relative path. Prefer explicit `slug` frontmatter field for predictability.

### Pattern 2: Velite Count Query in RSC Pages

To show iteration headline counts on the homepage (LAB-01) and catalog subheading (ITER-01), import from `.velite` at RSC render time. No `async` needed — Velite output is synchronous TS module.

```typescript
// Source: Velite generated output pattern — confirmed against velite.config.ts
import { iterations } from '@/.velite'

// Count by status at build time
const passCount = iterations.filter(i => i.status === 'PASS').length
const failCount = iterations.filter(i => i.status === 'FAIL').length
const parkedCount = iterations.filter(i => i.status === 'PARKED').length
const inProgressCount = iterations.filter(i => i.status === 'IN_PROGRESS').length
const totalCount = iterations.length
```

The `@/.velite` path requires a `tsconfig.json` path alias or a relative import from the project root. Confirm the existing `tsconfig.json` has the alias; if not, add `"paths": { "@/.velite": [".velite/index.ts"] }`.

### Pattern 3: nuqs v2 — Status Filter URL State

`nuqs` 2.8.9 is SSR-safe in Next.js 16 App Router. The `NuqsAdapter` must be added to the layout that wraps the filter-using page. Since the filter lives in `(apps)`, add the adapter to the `(apps)` layout.tsx — not to the root layout (would pollute `(lab)` with a client boundary).

```typescript
// app/(apps)/layout.tsx — add NuqsAdapter
// Source: nuqs v2 docs — https://nuqs.47ng.com/docs/adapters
'use client'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
```

The filter component itself is a Client Component:

```typescript
// components/IterationStatusFilter.tsx
'use client'
import { useQueryState, parseAsStringEnum } from 'nuqs'
import type { IterationStatus } from '@/components/StatusPill'

type FilterValue = IterationStatus | null

export function IterationStatusFilter({ counts }: { counts: Record<string, number> }) {
  const [status, setStatus] = useQueryState<FilterValue>(
    'status',
    parseAsStringEnum<IterationStatus>(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'])
      .withDefault(null)    // null = all visible
  )
  // ...pill row renders here
}
```

**SSR safety:** nuqs v2 reads the URL search params on both server and client. When `?status=fail` is in the URL, the server-rendered page already shows filtered results. No client-side flash. This is the correct pattern for Next.js App Router with React 19.

**Important:** The `(apps)` layout currently is:
```
app/(apps)/layout.tsx   <- exists per Phase 1
```
If `NuqsAdapter` requires `'use client'`, the `(apps)` layout becomes a Client Component boundary. This is acceptable because the (apps) route group already allows client state (dashboard pages will use it). Verify the current `(apps)/layout.tsx` content before modifying — it may just pass through to a Providers wrapper.

**Alternative:** Pass the `?status` param via `searchParams` prop to a RSC page and do the filtering server-side without `nuqs` at all, then use a plain anchor/form for filter links. This is valid if the planner wants to avoid the `NuqsAdapter` client boundary. However, the CONTEXT.md locked `nuqs` for this, so use `nuqs`.

### Pattern 4: Inline SVG β-CI Range-Bar (BetaCIChart)

No chart library. ~30 lines. The critical formula is the viewBox scaling.

```typescript
// components/BetaCIChart.tsx
// Source: inline SVG math — no external library required
interface BetaCIChartProps {
  beta: number
  ciLower: number
  ciUpper: number
  label?: string           // aria-label override
}

export function BetaCIChart({ beta, ciLower, ciUpper, label }: BetaCIChartProps) {
  const W = 300, H = 60
  const pad = 20

  // Axis range: ±1.5 × max(|ciLower|, |ciUpper|)
  const maxAbs = Math.max(Math.abs(ciLower), Math.abs(ciUpper))
  const axisMax = maxAbs * 1.5
  const axisMin = -axisMax

  const toX = (v: number) => pad + ((v - axisMin) / (axisMax - axisMin)) * (W - 2 * pad)
  const midY = H / 2
  const capH = 10

  const betaX = toX(beta)
  const ciLowX = toX(ciLower)
  const ciHighX = toX(ciUpper)
  const zeroX = toX(0)

  const ariaLabel = label ?? `β = ${beta.toFixed(4)}, 95% CI [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]`

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        aria-label={ariaLabel}
        role="img"
        className="w-full max-w-xs"
      >
        {/* null reference line */}
        <line x1={zeroX} y1={pad} x2={zeroX} y2={H - pad} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 3" />
        {/* CI whisker */}
        <line x1={ciLowX} y1={midY} x2={ciHighX} y2={midY} stroke="currentColor" strokeWidth={2} />
        {/* CI caps */}
        <line x1={ciLowX} y1={midY - capH/2} x2={ciLowX} y2={midY + capH/2} stroke="currentColor" strokeWidth={2} />
        <line x1={ciHighX} y1={midY - capH/2} x2={ciHighX} y2={midY + capH/2} stroke="currentColor" strokeWidth={2} />
        {/* β point */}
        <circle cx={betaX} cy={midY} r={5} fill="var(--color-accent-default)" />
      </svg>
      {/* sr-only data table mirrors the visual */}
      <table className="sr-only">
        <caption>β estimate and 95% confidence interval</caption>
        <tbody>
          <tr><th>β estimate</th><td>{beta}</td></tr>
          <tr><th>CI lower</th><td>{ciLower}</td></tr>
          <tr><th>CI upper</th><td>{ciUpper}</td></tr>
        </tbody>
      </table>
      <figcaption className="sr-only">{ariaLabel}</figcaption>
    </figure>
  )
}
```

**Reduced-motion:** The SVG is static — no animation on the chart itself. The component renders without transitions. Reduced-motion has no effect on this component; no special handling needed.

**Mobile responsiveness:** `className="w-full max-w-xs"` on the SVG element makes it scale with the container width. The `viewBox` preserves aspect ratio. On mobile, the SVG will be narrower but proportionally correct.

### Pattern 5: `<details>` for Replication Hash Verify Instructions

The native HTML `<details>` + `<summary>` element has full keyboard support (Enter/Space toggles when summary is focused), screen-reader announcement (the summary text is the accessible name; the expanded content is announced on open), and zero JavaScript required.

```tsx
// Usage within IterationDetailPage
<details className="mt-4 rounded-lg border border-border-default p-4">
  <summary className="cursor-pointer text-sm font-medium text-text-primary select-none">
    {t('iterations.verify.how_to_verify')}  {/* "How to verify this hash" */}
  </summary>
  <div className="mt-3 space-y-2">
    <p className="text-sm text-text-secondary">
      {t('iterations.verify.instructions')}
    </p>
    <pre className="rounded bg-bg-surface p-3 font-mono text-xs overflow-x-auto">
      <code>git clone https://github.com/wvs-finance/abrigo-analytics{'\n'}cd abrigo-analytics{'\n'}make verify ITER={slug}</code>
    </pre>
  </div>
</details>
```

**Accessibility behavior (confirmed via MDN + WCAG):**
- `<summary>` has implicit `role="button"` and is keyboard-focusable by default
- Screen readers announce the summary text + expanded/collapsed state: "How to verify this hash, collapsed button"
- On Enter/Space: content expands; screen reader re-announces: "How to verify this hash, expanded button"
- No ARIA additions needed for the basic expand/collapse
- Do NOT wrap `<summary>` in a `<button>` — that creates invalid nesting (interactive inside interactive)

**Impeccable compliance:** No aggressive shadow, no nested card. The `<details>` uses `border border-border-default rounded-lg` — minimal, consistent with IterationCatalogCard border treatment. The `bg-bg-surface` pre block is NOT a card-in-card because it is a code block, not a card.

### Pattern 6: JSON-LD Dataset + ScholarlyArticle

Extend `StructuredData.tsx` to accept optional iteration-specific props. The existing component already handles XSS escaping via `JSON.stringify(...).replace(/</g, '\\u003c')`. The `schema-dts` package (v2.0.0, already installed) provides TypeScript types for `Dataset` and `ScholarlyArticle`.

```typescript
// Extension to StructuredData.tsx for iteration detail pages
// Source: UI-SPEC.md §JSON-LD Structured Data Contract + schema.org vocabulary
import type { Dataset, ScholarlyArticle, WithContext } from 'schema-dts'

interface IterationStructuredDataProps {
  iteration: {
    title: string        // locale-appropriate title
    description: string  // one-sentence summary (disposition or spec summary)
    slug: string
    version: number
    analysisDate: string  // ISO date string
    status: string
  }
}

// Dataset block:
const dataset: WithContext<Dataset> = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: iteration.title,
  description: iteration.description,
  url: `${baseUrl}/apps/abrigo/iterations/${iteration.slug}/v${iteration.version}`,
  creator: { '@type': 'Organization', name: 'DS2P Labs', url: baseUrl },
  isPartOf: [
    { '@type': 'Dataset', name: 'Abrigo Iteration Catalog', url: `${baseUrl}/apps/abrigo/iterations` },
    { '@type': 'ResearchProject', name: 'd2-π (DS2P Labs)', url: baseUrl },
  ],
  variableMeasured: 'β (beta coefficient)',
  measurementTechnique: 'Structural econometrics — OLS with HAC standard errors',
  datePublished: iteration.analysisDate,
  keywords: ['econometrics', 'COP/USD', 'Colombia', 'hedging', 'Abrigo'],
  contentReferenceTime: iteration.analysisDate,
}

// ScholarlyArticle block:
const article: WithContext<ScholarlyArticle> = {
  '@context': 'https://schema.org',
  '@type': 'ScholarlyArticle',
  headline: iteration.title,
  author: { '@type': 'Organization', name: 'DS2P Labs' },
  datePublished: iteration.analysisDate,
  url: `${baseUrl}/apps/abrigo/iterations/${iteration.slug}/v${iteration.version}`,
  isPartOf: { '@type': 'Periodical', name: 'Abrigo Research Catalog' },
  about: iteration.description,
}
```

`baseUrl` = `process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'https://d2pfinance.xyz'`

**schema.org required/recommended fields (HIGH confidence — verified):**
- `Dataset`: `name`, `description`, `url`, `creator`, `datePublished` — these are the most reliably indexed fields. `keywords`, `measurementTechnique`, `variableMeasured` are documented but optional.
- `ScholarlyArticle`: `headline`, `author`, `datePublished`, `url` — sufficient for Google's Rich Results eligibility.
- `isPartOf` on `Dataset` can point to another `Dataset` or `ResearchProject` — both are valid schema.org types.

### Pattern 7: GitHub Actions Cross-Repo Trigger

The Phase 1 workflow scaffold uses `workflow_dispatch` only. Phase 2 expands to `repository_dispatch` from abrigo main.

**Mechanism:** The `abrigo-analytics` repo adds a GitHub Actions job that fires on `push` to main with a path filter. That job calls the GitHub API to dispatch a `repository_dispatch` event to the `wvs-finance/frontend` repo. The frontend workflow listens for that event type.

```yaml
# .github/workflows/sync-abrigo-content.yml (Phase 2 full version)
name: Sync abrigo content

on:
  workflow_dispatch:
    inputs:
      abrigo_ref:
        description: "abrigo commit SHA or branch"
        required: false
        default: "main"
  repository_dispatch:
    types: [abrigo-content-updated]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout frontend
        uses: actions/checkout@v4

      - name: Checkout abrigo-analytics
        uses: actions/checkout@v4
        with:
          repository: wvs-finance/abrigo-analytics
          ref: ${{ github.event.client_payload.ref || inputs.abrigo_ref || 'main' }}
          path: _abrigo
          token: ${{ secrets.ABRIGO_READ_PAT }}  # PAT with read:repo for private repo

      - name: Copy markdown files into content/
        run: |
          rsync -av --include='*/' --include='*.md' --include='*.mdx' --exclude='*' \
            _abrigo/scratch/ content/research/
          rsync -av --include='*/' --include='*.md' --include='*.mdx' --exclude='*' \
            _abrigo/docs/ content/research/

      - name: Validate via Velite
        run: |
          pnpm install --frozen-lockfile
          pnpm velite build

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "content: sync abrigo content"
          title: "content: sync iteration and research content from abrigo-analytics"
          body: "Automated content sync from wvs-finance/abrigo-analytics"
          branch: "auto/sync-abrigo-content"
          base: main
          add-paths: |
            content/
```

**The abrigo-side dispatch trigger** (added to `wvs-finance/abrigo-analytics/.github/workflows/dispatch-frontend-sync.yml`):
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'scratch/**/*.md'
      - 'docs/**/*.md'
      - 'notebooks/**/*.ipynb'

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch to frontend
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.FRONTEND_DISPATCH_PAT }}
          repository: wvs-finance/frontend
          event-type: abrigo-content-updated
          client-payload: '{"ref": "${{ github.sha }}"}'
```

**Secret management:** `ABRIGO_READ_PAT` is a classic PAT with `repo:read` scope on `wvs-finance/abrigo-analytics`; `FRONTEND_DISPATCH_PAT` is a classic PAT with `repo` scope on `wvs-finance/frontend`. Both are stored in the respective repo's GitHub Actions secrets.

### Pattern 8: i18n Namespace Addition

The existing `i18n/request.ts` deep-merge pattern already handles new namespace files correctly. Adding `iterations.json`, `research.json`, `team.json`, `about.json` requires only extending the import list:

```typescript
// i18n/request.ts — Phase 2 extension (add 4 new imports per locale)
const iterationsMessages = (await import(`../messages/${locale}/iterations.json`)).default as MessageMap
const researchMessages = (await import(`../messages/${locale}/research.json`)).default as MessageMap
const teamMessages = (await import(`../messages/${locale}/team.json`)).default as MessageMap
const aboutMessages = (await import(`../messages/${locale}/about.json`)).default as MessageMap

const messages = mergeMessages(
  commonMessages, labMessages, navMessages,
  iterationsMessages, researchMessages, teamMessages, aboutMessages
)
```

**Namespace key structure** follows the existing pattern of nested objects:
```json
// messages/en/iterations.json
{
  "iterations": {
    "catalog": {
      "h1": "Iteration catalog — Abrigo",
      "subheading": "All (Y, M, X) iterations...",
      "empty_state": { "heading": "No iterations yet", "body": "..." }
    },
    "detail": {
      "evidence": { "heading": "Evidence chain", "beta": "β estimate", ... },
      "replication": { "hash_label": "Replication hash", "copy": "Copy hash", ... },
      "verify": { "how_to_verify": "How to verify this hash", ... }
    },
    "status": {
      "pass": { "label": "Pass" },
      "fail": { "label": "Fail" },
      "parked": { "label": "Parked" },
      "in_progress": { "label": "In Progress" }
    },
    "filter": {
      "all": "All",
      "aria_label": "Filter iterations by status"
    }
  }
}
```

**Merge order does not conflict:** The `mergeMessages` function performs a deep merge — top-level keys from new namespace files (`iterations`, `research`, `team`, `about`) are disjoint from existing keys (`nav`, `lab`, `common`). No collision risk.

### Pattern 9: Sibling Repo Content Reads

The abrigo sibling repo at `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/` is directly readable from the frontend working directory during development. Velite runs at build time (not in the Next.js server process), so there is no sandbox restriction on `..` paths.

**Confirmed safe:** Velite's `root` config points to `content/` within the frontend repo. Content MDX files within `content/` are what Velite processes — they contain authored prose that was derived from reading the abrigo notebooks. Velite does NOT read `../abrigo/` directly; the developer reads those files to write the MDX, then commits the MDX.

**The GitHub Actions sync workflow** is the automated version: it checks out `abrigo-analytics` to `_abrigo/` within the CI runner workspace, then copies files to `content/research/` before Velite validation. No cross-repo path issue in CI.

**Conclusion:** No filesystem safety concern. The pattern is: developer reads `../abrigo/notebooks/{slug}/` → synthesizes → writes `content/iterations/{slug}/v1.mdx`. The MDX is what lives in the frontend repo.

### Anti-Patterns to Avoid

- **Using `.filter(i => i.status === 'PASS')` anywhere in iteration data fetching** — this is Pitfall 16. All statuses must render.
- **Inventing values** for β, CI, p-value, N, replication_hash — the anti-fishing discipline requires real values from abrigo notebooks or omission of the field.
- **Adding `NuqsAdapter` to root layout** — puts a client boundary on all pages including `(lab)`. Place it only in `(apps)` layout.
- **Using `runtime = 'edge'` on any iteration page** — not an issue here (these are RSC pages, no `runtime` export needed), but confirm no edge runtime leaks in.
- **Teal-green tokens (hue 165) remaining after migration** — globals.css must fully replace `:root` and `.dark` blocks. Old tokens break the visual contract.
- **Wrapping `<summary>` in `<button>`** — invalid HTML, creates double interactive element.
- **Color-only status encoding** in filter pills — pills must use StatusPill's color + icon + text pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL search param state | Custom `useSearchParams` + `useRouter` hook with manual string parsing | `nuqs` `useQueryState` | nuqs handles SSR hydration, type coercion, array params, and history options correctly. Manual `router.push` with search params causes hydration mismatches in React 19. |
| Accessible headless `<details>` expand | Custom accordion with `useState` + `aria-expanded` + `aria-controls` | Native `<details>` + `<summary>` | Native element is keyboard-accessible and screen-reader-announced with zero JS. Custom implementation always misses edge cases (focus management on close, VoiceOver Safari). |
| JSON-LD type safety | Hand-typed `as const` objects | `schema-dts` types | schema-dts provides TypeScript types for all schema.org vocabulary, catching field name typos at compile time. Already installed. |
| MDX content validation | Runtime Zod parsing in route handlers | Velite build-time schema validation | Velite catches malformed frontmatter at `pnpm velite build` before Next.js server starts. Errors are caught in CI, not in user's browser. |
| Cross-repo PR automation | Custom `curl` GitHub API calls in bash | `peter-evans/create-pull-request@v6` | The action handles branch creation, commit, force-push, PR deduplication (update existing PR if branch exists), and conflict detection. 5,000+ star action, battle-tested. |

**Key insight:** The hand-roll temptation in Phase 2 is the status filter — it seems simple (`useState` + `Array.filter`), but URL-state-based filtering requires nuqs for SSR consistency, type safety, and the epistemic-honesty requirement that the URL is shareable (showing filter state to a collaborator or judge).

---

## Common Pitfalls

### Pitfall A: Token Migration Leaves Teal Remnants

**What goes wrong:** The developer migrates `:root` but forgets `.dark`. Or migrates both but misses the `--ring` and `--radius` values. Old teal-green hue 165 tokens appear in dark mode.

**Why it happens:** The CSS file has three sections (`:root`, `.dark`, `@theme inline`). Partial migration is easy.

**How to avoid:** Do a full find-replace of all `oklch(... ... 165)` values in `app/globals.css` using the UI-SPEC canonical token set. After migration, run `grep -n "hue.*165\|oklch.*165" app/globals.css` — should return zero results. The `tokens.test.ts` test should be extended to assert the new hue range.

**Warning signs:** `oklch(...165)` remaining in any part of `app/globals.css` after the migration task completes.

### Pitfall B: nuqs `NuqsAdapter` in Root Layout Breaks (lab) Pages

**What goes wrong:** The developer adds `NuqsAdapter` to `app/layout.tsx` for convenience. This creates a client component boundary at the root, which forces all server components under it to be treated as client-only during hydration. The architecture test `no-wallet-in-lab.spec.ts` may not catch this (it checks for wagmi imports, not nuqs).

**Why it happens:** It is the easiest place to put it.

**How to avoid:** Add `NuqsAdapter` ONLY to `app/(apps)/layout.tsx`. The `(lab)` pages (`/`, `/research`, `/team`, `/about`) do not use nuqs — they are pure RSC. If the `(apps)` layout currently re-exports from a parent, create a new explicit `(apps)/layout.tsx` wrapper.

### Pitfall C: Velite `slug` Field Collision Between Collections

**What goes wrong:** The `research` collection uses `s.slug('research')` (Velite's auto-slug from path). If a research file has the same derived slug as an iteration (e.g., `content/research/pair-d.mdx` → slug `pair-d` collides with iteration `pair-d`), Velite may throw a duplicate slug error.

**Why it happens:** Velite validates slugs for uniqueness within a collection but not across collections. The collision error surface is a build-time error, but it can be confusing.

**How to avoid:** Use explicit `slug` frontmatter in `content/research/*.mdx` files with a distinctive prefix pattern (e.g., `memo-pair-d`, `brief-pair-d`) rather than relying on auto-derivation. The iteration slugs are path-derived from `content/iterations/{slug}/v{n}.mdx` and named after the experiment; research entries should be named after the document type.

### Pitfall D: DispositionMemo Visually De-emphasized

**What goes wrong:** The FAIL iteration's DispositionMemo is given `text-text-muted` or smaller font-size, or the section is collapsed by default with an accordion, in an effort to "not emphasize failure."

**Why it happens:** Design instinct. It feels "appropriate" to make failure quieter.

**How to avoid:** The `DispositionMemo` component spec is explicit: `text-text-primary` prose, identical visual weight to PASS result section, no collapse/accordion. This is enforced by the epistemic-equality rule (ITER-02, PITFALLS #16). The CONTEXT.md decision locks this: "No collapse/accordion on DispositionMemo."

### Pitfall E: IBM Plex Sans Not Applied to Body Before First Paint (FOUT)

**What goes wrong:** IBM Plex Sans loads after the initial HTML render. Body text flashes from system-ui to IBM Plex Sans, causing Cumulative Layout Shift (CLS) and a visible FOUT. Lighthouse penalizes CLS.

**Why it happens:** `next/font/google` default behavior without a `display` strategy specified.

**How to avoid:** Use `next/font/google` with `{ subsets: ['latin'], display: 'swap', preload: true }`. The `display: 'swap'` is the default for next/font but explicit declaration is safer. The fallback stack in UI-SPEC (`system-ui, -apple-system, "Segoe UI", sans-serif`) must be declared in `font.style.fontFamily` via Tailwind's `@font-face` injection from next/font — this prevents layout shift. Use `adjustFontFallback: false` only if the fallback metrics do not match (IBM Plex Sans is close to system-ui in x-height).

---

## Code Examples

### EvidenceChain — dl/dt/dd semantics

```tsx
// Source: UI-SPEC.md §EvidenceChain + MDN dl/dt/dd accessibility
// Confirmed: <dl> with dt/dd pairs is WCAG-compliant for name-value associations
export function EvidenceChain({ iteration }: { iteration: IterationData }) {
  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="text-xl font-semibold text-text-primary mb-4">
        {/* translated: "Evidence chain" / "Cadena de evidencia" */}
      </h2>
      <dl className="divide-y divide-border-default">
        {iteration.beta != null && (
          <div className="flex gap-4 py-3">
            <dt className="w-32 text-sm text-text-muted shrink-0">β estimate</dt>
            <dd className="font-mono text-sm text-text-primary">
              {iteration.beta > 0 ? '+' : ''}{iteration.beta.toFixed(6)}
            </dd>
          </div>
        )}
        {/* ... ci_lower/ci_upper, p_value, sample_size rows ... */}
        <div className="flex gap-4 py-3">
          <dt className="w-32 text-sm text-text-muted shrink-0">Replication</dt>
          <dd><ReplicationHash hash={iteration.replication_hash} /></dd>
        </div>
      </dl>
    </section>
  )
}
```

### generateMetadata for Iteration Detail Pages

```typescript
// Source: Next.js 16 App Router generateMetadata API
// app/(apps)/apps/abrigo/iterations/[slug]/v[version]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string; version: string } }): Promise<Metadata> {
  const iteration = getIteration(params.slug, parseInt(params.version))
  if (!iteration) return {}

  const title = `${iteration.title_en} — Abrigo / DS2P Labs`
  const description = `${iteration.status} | β = ${iteration.beta ?? 'N/A'} | p = ${iteration.p_value ?? 'N/A'} | ${iteration.analysis_date.toISOString().split('T')[0]}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/apps/abrigo/iterations/${params.slug}/v${params.version}`,
      type: 'article',
      siteName: 'd2p Finance',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}
```

### Dark Mode Token Values (canonical replacement)

```css
/* app/globals.css — Phase 2 full replacement of :root and .dark blocks */
/* Source: 02-UI-SPEC.md §Token Migration */
:root {
  --bg-canvas:   oklch(0.97 0.005 80);
  --bg-surface:  oklch(0.94 0.008 75);
  --bg-elevated: oklch(0.99 0.003 80);
  --text-primary:   oklch(0.20 0.01 80);
  --text-secondary: oklch(0.40 0.01 75);
  --text-muted:     oklch(0.58 0.008 70);
  --border-default: oklch(0.86 0.012 75);
  --accent-default: oklch(0.6 0.08 70);
  --accent-hover:   oklch(0.54 0.09 70);
  --accent-subtle:  oklch(0.6 0.08 70 / 0.12);
  /* status colors: carry forward from Phase 1 — hue is independent */
  --status-pass:        oklch(0.38 0.17 145);
  --status-fail:        oklch(0.40 0.19 30);
  --status-parked:      oklch(0.42 0.13 60);
  --status-in-progress: oklch(0.38 0.16 230);
  --destructive: oklch(0.52 0.19 25);
  --ring: oklch(0.6 0.08 70);
  --radius: 0.5rem;
}

.dark {
  --bg-canvas:   oklch(0.13 0.015 70);
  --bg-elevated: oklch(0.18 0.013 70);
  --text-primary:   oklch(0.93 0.005 80);
  --text-muted:     oklch(0.68 0.01 75);
  --accent-default: oklch(0.7 0.10 70);
  /* status colors brightened by ~0.20 lightness */
  --status-pass:        oklch(0.62 0.17 145);
  --status-fail:        oklch(0.62 0.19 30);
  --status-parked:      oklch(0.65 0.13 60);
  --status-in-progress: oklch(0.62 0.16 230);
}

@theme inline {
  /* ... existing aliases ... */
  --color-accent-subtle: var(--accent-subtle);  /* new in Phase 2 */
  /* spacing scale */
  --spacing-5xl: 120px;  /* new in Phase 2 */
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| URL state with `useSearchParams` + `router.push` | `nuqs` `useQueryState` with typed parsers | nuqs v2.0 (2024) | SSR-safe, type-safe, shareable filter URLs without hydration mismatches |
| `workflow_dispatch` only for content sync | `repository_dispatch` cross-repo event | GitHub Actions 2021 feature, now standard | Enables automatic sync on abrigo push without manual trigger |
| `Contentlayer` for typed MDX | `Velite` | Contentlayer archived 2024 | Velite is the spiritual successor; project already uses it |
| `schema.org/Article` on content pages | `Dataset` + `ScholarlyArticle` for research outputs | schema.org vocabulary matured 2023+ | Better semantic fit for econometric research; improved rich result eligibility |

**Deprecated/outdated:**
- Phase 1 teal-green tokens (hue 165): replaced in Phase 2 by muted ochre (hue 70-80). DO NOT preserve any hue 165 values.
- Phase 1 sample iteration MDX (`content/iterations/sample/v1.mdx`): deleted in Phase 2. The velite-schema unit tests use a hardcoded object, not the file, so deletion is safe.

---

## Open Questions

1. **`(apps)/layout.tsx` current contents**
   - What we know: the file exists (created in Phase 1, has a `layout.tsx`)
   - What's unclear: whether it already contains a Providers wrapper or is a pass-through
   - Recommendation: read the file before adding `NuqsAdapter`; if it is a pass-through RSC layout, adding `NuqsAdapter` makes it a Client Component — verify the architecture test doesn't fail on that boundary

2. **`ABRIGO_READ_PAT` secret availability**
   - What we know: the sync workflow needs read access to `wvs-finance/abrigo-analytics` if it is a private repo
   - What's unclear: whether the repo is public or private; if private, whether the PAT exists in GitHub Actions secrets
   - Recommendation: check repo visibility; if private, the planner should flag PAT setup as a pre-condition task with manual owner action

3. **IBM Plex Sans character coverage for Colombian Spanish**
   - What we know: IBM Plex Sans has `latin` and `latin-ext` subsets; `latin-ext` includes ñ, á, é, í, ó, ú, ü
   - What's unclear: whether `latin-ext` is needed or `latin` subset covers all es-CO characters
   - Recommendation: use `subsets: ['latin', 'latin-ext']` to be safe; the extra weight is ~5KB and avoids missing-glyph boxes on Colombian Spanish text

4. **FX-vol-on-CPI-surprise replication_hash value**
   - What we know: the notebook README shows β̂_CPI = -0.000685, but does not list a replication hash
   - What's unclear: whether a sha256 hash exists in the abrigo `estimates/gate_verdict.json` for this iteration
   - Recommendation: read `notebooks/fx_vol_cpi_surprise/Colombia/estimates/gate_verdict.json` during content authoring; if no hash field exists, omit `replication_hash` from the MDX frontmatter (schema allows optional) and document the omission reason in the MDX body

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (unit) + Playwright 1.60 (e2e + a11y) + @axe-core/playwright (a11y) + Lighthouse CI 0.15.1 (performance) + impeccable (anti-pattern) |
| Config files | `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.cjs`, `biome.json` — all present from Phase 1 |
| Quick run command | `pnpm test:quick` (biome check + tsc --noEmit + vitest run) |
| Full suite command | `pnpm test:all` (lint + typecheck + unit + e2e + a11y + lighthouse + impeccable) |

### Phase 2 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAB-01 | Homepage renders mission, iteration counts (all 4 statuses), Apps overview, GitHub link | e2e + unit | `playwright test tests/e2e/homepage.spec.ts` + `vitest run tests/unit/velite-schema.test.ts` | ❌ extend homepage e2e spec |
| LAB-02 | /team page renders at least one ContributorCard with name, role, GitHub link | e2e | `playwright test tests/e2e/team.spec.ts` | ❌ Wave 0 |
| LAB-03 | /research page renders at least one PublicationCard | e2e | `playwright test tests/e2e/research.spec.ts` | ❌ Wave 0 |
| LAB-04 | sync-abrigo-content.yml has push trigger + create-pull-request step | structural | `grep -q 'repository_dispatch' .github/workflows/sync-abrigo-content.yml && grep -q 'peter-evans/create-pull-request' .github/workflows/sync-abrigo-content.yml` | ✅ (file exists; grep confirms content) |
| LAB-05 | /about page renders 5 NumberedStep components and 4 CheckmarkList items | e2e | `playwright test tests/e2e/about.spec.ts` | ❌ Wave 0 |
| LAB-06 | All Phase 2 pages render in es-CO and en with no untranslated key leakage | e2e | `playwright test tests/e2e/locale-switch.spec.ts -g "phase-2-pages"` | ❌ extend locale-switch spec |
| ITER-01 | /apps/abrigo/iterations shows all iterations; no status filtered out by default | e2e | `playwright test tests/e2e/iteration-catalog.spec.ts -g "shows all statuses"` | ❌ Wave 0 |
| ITER-02 | All IterationCatalogCards render at identical height (min-h-[120px]) regardless of status | e2e + unit | `playwright test tests/e2e/iteration-catalog.spec.ts -g "equal card heights"` + `vitest run tests/unit/iteration-catalog-card.test.tsx` | ❌ Wave 0 |
| ITER-03 | Pair D and FX-vol iteration detail pages render full spec→disposition narrative | e2e | `playwright test tests/e2e/iteration-detail.spec.ts` | ❌ Wave 0 |
| ITER-04 | Each iteration detail shows β, CI, p-value, N, replication hash | e2e | `playwright test tests/e2e/iteration-detail.spec.ts -g "evidence chain"` | ❌ Wave 0 |
| ITER-05 | Pair D /apps/abrigo/iterations/pair-d/v1 responds 200 with β = +0.137 in content | e2e | `playwright test tests/e2e/iteration-detail.spec.ts -g "pair-d"` | ❌ Wave 0 |
| ITER-06 | FX-vol detail page renders DispositionMemo at same visual weight as PASS page | e2e + a11y | `playwright test tests/e2e/iteration-detail.spec.ts -g "fx-vol" && playwright test tests/a11y/iteration-detail.spec.ts` | ❌ Wave 0 |
| ITER-07 | StatusPill uses color + icon + text in catalog and detail pages | unit (existing) | `vitest run tests/unit/status-pill.test.tsx` | ✅ (existing test) |
| ITER-08 | URL /apps/abrigo/iterations/pair-d/v1 resolves to correct page; slug is human-readable | e2e | `playwright test tests/e2e/iteration-detail.spec.ts -g "URL structure"` | ❌ Wave 0 |
| ITER-09 | Each iteration detail page HTML contains two JSON-LD script blocks (Dataset + ScholarlyArticle) | e2e | `playwright test tests/e2e/iteration-jsonld.spec.ts` | ❌ Wave 0 |

**Additional cross-cutting checks for Phase 2:**

| Check | Command | Rationale |
|-------|---------|-----------|
| Token hue migration (no hue 165 remnants) | `vitest run tests/unit/tokens.test.ts` (extended to check hue 70-80) | Tokens test verifies CSS token values |
| Dark mode token pairs pass WCAG AA | `vitest run tests/unit/tokens.test.ts -t "dark mode contrast"` | Extended tokens test |
| IBM Plex Sans declared (no Inter/Geist/Mona Sans) | `vitest run tests/unit/tokens.test.ts -t "typeface"` (existing test) | Existing typeface test |
| No hue 165 in CSS | `grep -c 'oklch.*165' app/globals.css` returns 0 | Structural check |
| nuqs NuqsAdapter not in root layout | `grep -c 'NuqsAdapter' app/layout.tsx` returns 0 | Structural check |
| research Velite collection schema rejects missing required fields | `vitest run tests/unit/velite-research-schema.test.ts` | ❌ Wave 0 |
| Impeccable detects no new anti-patterns | `npx impeccable detect app/` | CI gate (existing) |
| a11y: all Phase 2 pages pass axe-core | `playwright test tests/a11y/` | CI gate (existing pattern) |

### Sampling Rate

- **Per task commit:** `pnpm test:quick` (biome + tsc + vitest run)
- **Per wave merge:** `pnpm test:all`
- **Phase gate:** Full suite green on Vercel preview before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/iteration-catalog.spec.ts` — covers ITER-01, ITER-02
- [ ] `tests/e2e/iteration-detail.spec.ts` — covers ITER-03, ITER-04, ITER-05, ITER-06, ITER-08
- [ ] `tests/e2e/iteration-jsonld.spec.ts` — covers ITER-09 (JSON-LD script blocks present + valid JSON)
- [ ] `tests/e2e/team.spec.ts` — covers LAB-02
- [ ] `tests/e2e/research.spec.ts` — covers LAB-03
- [ ] `tests/e2e/about.spec.ts` — covers LAB-05
- [ ] `tests/a11y/iteration-detail.spec.ts` — a11y scan for ITER-06 equal-weight FAIL page
- [ ] `tests/unit/velite-research-schema.test.ts` — Velite `research` collection schema validation (mirrors existing `velite-schema.test.ts` pattern)
- [ ] `tests/unit/iteration-catalog-card.test.tsx` — ITER-02 equal card height unit assertion
- [ ] Extend `tests/unit/tokens.test.ts` — add dark mode contrast assertions and hue 70-80 range check

*(None of these require new framework installs — they follow the Vitest + Playwright patterns already established in Phase 1.)*

---

## Sources

### Primary (HIGH confidence)

- `velite.config.ts` in project — confirmed existing iteration schema and collection definition pattern
- `i18n/request.ts` in project — confirmed deep-merge handles new namespaces without architectural change
- `package.json` in project — confirmed installed versions: next 16.2.6, next-intl 4.11.2, velite 0.3.1, schema-dts 2.0.0
- `02-UI-SPEC.md` — canonical token values, component specs, JSON-LD contract
- `02-CONTEXT.md` — all locked decisions
- `components/StructuredData.tsx` — confirmed XSS-escape pattern; `schema-dts` type import pattern
- `components/StatusPill.tsx` — confirmed reuse contract
- `tests/unit/velite-schema.test.ts` — confirmed schema export pattern for test isolation
- `abrigo-analytics/notebooks/fx_vol_cpi_surprise/Colombia/README.md` — confirmed β̂_CPI = -0.000685, 90% CI = [-0.003635, 0.002265], n = 947, FAIL verdict
- `abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` — confirmed β_composite = +0.13670985, HAC SE 0.02465, t = +5.5456, p_one = 1.46×10⁻⁸
- `npm view nuqs` — confirmed nuqs 2.8.9 latest stable; peer deps satisfied by project's Next.js 16.2.6 + React 19.2.4

### Secondary (MEDIUM confidence)

- MDN `<details>` element documentation — keyboard behavior and screen-reader announcement confirmed
- schema.org Dataset vocabulary — required fields verified against schema.org official spec
- schema.org ScholarlyArticle vocabulary — confirmed `isPartOf` accepts Periodical type
- `peter-evans/create-pull-request@v6` — GitHub Marketplace docs confirmed v6 current major
- nuqs v2 Next.js App Router adapter pattern — confirmed from nuqs.47ng.com docs structure

### Tertiary (LOW confidence — flag for validation)

- IBM Plex Sans character coverage for es-CO — assumed `latin-ext` needed; not independently verified against actual Colombian Spanish character set. Recommendation: use both `latin` and `latin-ext` subsets as safe default.
- `ABRIGO_READ_PAT` availability — assumed private repo requires PAT; actual repo visibility not confirmed via GitHub API.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against project's package.json and npm registry
- Architecture patterns: HIGH — confirmed against existing project code and velite.config.ts
- Pitfalls: HIGH — derived from PITFALLS.md (46 anti-patterns) + direct code inspection
- Sibling repo reads: HIGH — filesystem confirmed accessible; abrigo-analytics structure verified
- Real iteration values: HIGH — Pair D and FX-vol values confirmed from abrigo source files

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable stack; nuqs 2.x is stable; velite 0.3.x is stable)
