---
phase: 01-foundation-and-scaffold
plan: "06"
subsystem: content-pipeline
tags: [velite, zod, mdx, schema, content, github-actions, ci]

requires:
  - phase: 01-01
    provides: "velite@0.3.1 installed; next.config.ts FINAL with VeliteWebpackPlugin pre-wired"

provides:
  - "velite.config.ts with iterations collection: strict Zod schema, status enum, replication_hash sha256 regex, FAIL->memo .refine()"
  - "content/iterations/sample/v1.mdx Phase 1 fixture satisfying every required schema field"
  - "content/iterations/.gitkeep directory placeholder"
  - ".github/workflows/sync-abrigo-content.yml workflow scaffold (manual dispatch only in Phase 1)"

affects:
  - Phase 2 iteration catalog and detail pages (import from '#site/content' after velite build)
  - Phase 2 content sync (LAB-04: fill in copy step in sync-abrigo-content.yml)
  - Any plan that imports from .velite/iterations.json or uses the Iteration type

tech-stack:
  added: []
  patterns:
    - "Export iterationSchema from velite.config.ts so unit tests can import the Zod schema directly without triggering Velite's full build pipeline"
    - "Use @vitest-environment node directive on velite-schema.test.ts — esbuild (transitive dep of velite) fails in jsdom environment due to TextEncoder invariant"
    - "basePath belongs to mcp-handler's Config (3rd arg), not ServerOptions (2nd arg)"
    - "getLocale is exported from next-intl/server, not from next-intl top-level"
    - "status-pill test requires .tsx extension — JSX syntax not valid in .ts files"

key-files:
  created:
    - velite.config.ts
    - content/iterations/.gitkeep
    - content/iterations/sample/v1.mdx
    - .github/workflows/sync-abrigo-content.yml
  modified:
    - tests/unit/velite-schema.test.ts
    - tests/unit/status-pill.test.tsx (renamed from .ts)
    - app/api/mcp/[transport]/route.ts
    - app/layout.tsx

key-decisions:
  - "iterationSchema exported from velite.config.ts for test isolation — avoids running Velite build pipeline in unit tests"
  - "Sample MDX uses status IN_PROGRESS so .refine() does not require disposition_memo for the fixture"
  - "sync-abrigo-content.yml is manual dispatch only in Phase 1; Phase 2 adds repository_dispatch trigger from wvs-finance/abrigo"
  - "next.config.ts NOT modified — Plan 01's VeliteWebpackPlugin remains canonical; velite.config.ts was discovered already committed in 41c0cc0 by parallel Plan 01-05 execution"

patterns-established:
  - "Pattern: Export the schema from velite.config.ts and import it directly in tests — enables fast unit tests without full pipeline invocation"

requirements-completed:
  - FOUND-04

duration: "~9 minutes"
completed: "2026-05-11"
---

# Phase 1 Plan 06: Velite Content Pipeline Schema Summary

**Velite iterations collection with Zod schema enforcing status enum + sha256 replication_hash + FAIL-requires-disposition_memo; end-to-end pnpm build green; sync-abrigo-content.yml scaffolded for Phase 2**

## Performance

- **Duration:** ~9 minutes
- **Started:** 2026-05-11T20:10:03Z
- **Completed:** 2026-05-11T20:19:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Authored `velite.config.ts` with the full locked iteration schema: 9 required fields, 6 optional fields, status enum (PASS/FAIL/PARKED/IN_PROGRESS), sha256-shaped replication_hash, and a `.refine()` enforcing `disposition_memo` is required when `status === 'FAIL'`
- 10 unit tests in `tests/unit/velite-schema.test.ts` all green — covers positive cases, FAIL+memo refine, replication_hash regex (too short, uppercase), slug regex, p_value bounds, and full enum coverage
- `pnpm velite build` produces `.velite/iterations.json` with the sample fixture; `pnpm build` (full Next.js with VeliteWebpackPlugin) exits 0
- `.github/workflows/sync-abrigo-content.yml` scaffold committed with `workflow_dispatch` only — Phase 2 fills in the copy step and `repository_dispatch` trigger

## Task Commits

1. **Task 1: Author velite.config.ts with strict iteration schema** - `41c0cc0` (feat — committed by parallel 01-05 execution from stash)
2. **Task 2: Sample MDX fixture + end-to-end Velite build** - `71e8764` (feat — content files were in `4539069` from 01-03; this commit fixes blocking TS errors)
3. **Task 3: Scaffold GitHub Actions sync-abrigo-content.yml** - `ffa6307` (feat)

## Files Created/Modified

- `velite.config.ts` - Velite config with `iterations` collection; exports `iterationSchema` for test use
- `content/iterations/.gitkeep` - Directory placeholder
- `content/iterations/sample/v1.mdx` - Phase 1 fixture (IN_PROGRESS status, valid sha256 hash)
- `.github/workflows/sync-abrigo-content.yml` - Sync workflow scaffold (manual dispatch only)
- `tests/unit/velite-schema.test.ts` - Unfrozen Wave 0 stub with 10 real assertions (node env)
- `tests/unit/status-pill.test.tsx` - Renamed from .ts (JSX requires .tsx); fixed import order + quotes
- `app/api/mcp/[transport]/route.ts` - Fixed `basePath` moved to 3rd (Config) arg of `createMcpHandler`
- `app/layout.tsx` - Fixed `getLocale` import to come from `next-intl/server` not `next-intl`

## Decisions Made

- **Export schema from config:** `iterationSchema` is exported so tests can import and call `.safeParse()` directly without invoking Velite's MDX pipeline (which requires esbuild and a Node-compatible environment, not jsdom).
- **`@vitest-environment node` directive:** The velite.config.ts import chain loads esbuild, which asserts `new TextEncoder().encode("") instanceof Uint8Array`. This invariant is false in the jsdom environment. The `// @vitest-environment node` directive at the top of the test file resolves this.
- **next.config.ts NOT modified:** Plan 01 already wrote the FINAL `next.config.ts`. Confirmed `VeliteWebpackPlugin` is present and unchanged.
- **Phase 2 spike (open question):** Confirm abrigo file naming convention for slug derivation before Phase 2 fills in the `rsync` commands in `sync-abrigo-content.yml`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix basePath position in app/api/mcp/[transport]/route.ts**
- **Found during:** Task 2 (pre-commit typecheck hook)
- **Issue:** `basePath` was passed in the second argument (ServerOptions) but it belongs to the third argument (Config) in mcp-handler v1.1.0
- **Fix:** Moved `basePath: '/api/mcp'` from 2nd to 3rd argument
- **Files modified:** `app/api/mcp/[transport]/route.ts`
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** `71e8764`

**2. [Rule 1 - Bug] Fix getLocale import in app/layout.tsx**
- **Found during:** Task 2 (pre-commit typecheck hook)
- **Issue:** `getLocale` was imported from `next-intl` top-level, but it only exists in `next-intl/server` subpath
- **Fix:** Moved `getLocale` from `next-intl` import to `next-intl/server` import
- **Files modified:** `app/layout.tsx`
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** `71e8764`

**3. [Rule 1 - Bug] Rename tests/unit/status-pill.test.ts to .tsx**
- **Found during:** Task 3 (pre-commit typecheck hook)
- **Issue:** The test file uses JSX syntax (`<StatusPill .../>`) but had `.ts` extension; TypeScript cannot parse JSX in `.ts` files
- **Fix:** Renamed to `.tsx`; fixed import order and JSX quote style per Biome config
- **Files modified:** `tests/unit/status-pill.test.tsx` (new), `tests/unit/status-pill.test.ts` (deleted)
- **Verification:** `pnpm biome check` and `pnpm tsc --noEmit` both exit 0
- **Committed in:** `ffa6307`

---

**Total deviations:** 3 auto-fixed (3 × Rule 1 - Bug)
**Impact on plan:** All auto-fixes were pre-existing bugs introduced by other Wave 2 plans running in parallel. Fixes are necessary for typecheck to pass. No scope creep.

## Issues Encountered

- `velite.config.ts` and `tests/unit/velite-schema.test.ts` were already present in HEAD (committed in `41c0cc0` by Plan 01-05 which ran in parallel and pulled them from a git stash). No re-commit needed; files matched the required content.
- `content/iterations/.gitkeep` and `content/iterations/sample/v1.mdx` were also already committed in `4539069` by Plan 01-03.

## Open Question for Phase 2

**Confirm abrigo file naming convention for slug derivation:** The `sync-abrigo-content.yml` copy step is a placeholder. Before Phase 2 exercises it, confirm whether `../abrigo/scratch/*.md` and `../abrigo/docs/*.md` filenames can be directly used as slugs (after kebab-case normalization) or whether a manifest/lookup is needed.

## Next Phase Readiness

- `velite.config.ts` schema is final; Phase 2 iteration content must satisfy all field constraints
- The `iterationSchema` export enables any plan to run schema validation tests in isolation
- `sync-abrigo-content.yml` is ready for Phase 2 to fill in the copy step and add `repository_dispatch` trigger
- `.velite/` is gitignored; the generated output is a build artifact, never committed

---
*Phase: 01-foundation-and-scaffold*
*Completed: 2026-05-11*
