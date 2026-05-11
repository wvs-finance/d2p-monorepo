---
phase: "01"
plan: "08"
subsystem: ci-quality-matrix
tags: [ci, github-actions, impeccable, lighthouse, axe-core, playwright, wave-4, phase-final]
dependency_graph:
  requires:
    - 01-01 (lighthouserc.cjs + test stubs scaffolded)
    - 01-04 (homepage + apps pages exist for impeccable + a11y checks)
    - 01-07 (env schema complete so typecheck job passes)
  provides:
    - .github/workflows/ci.yml with 7 parallel jobs
    - lighthouserc.cjs with Moto G Power 3G profile + LCP/TBT error budgets
    - tests/unit/anti-patterns.test.ts (Vitest) proving impeccable fires
    - tests/unit/fixtures/anti-patterns.html with 8 planted violations
    - tests/a11y/homepage.spec.ts with 4 WCAG 2.2 AA scans
    - docs/impeccable-flag.md live-verified CLI flag situation
    - docs/a11y-audit.md manual screen-reader audit checklist
    - docs/copy-review.md AI-slop copy review checklist
  affects:
    - Phase 2+ (all PRs gated by CI quality matrix)
    - All downstream phases (CI is now a hard merge gate from PR #1)
tech_stack:
  added: []
  patterns:
    - impeccable exit-code-only enforcement (no --fail-on-error flag exists in v2.1.8)
    - deployment_status event gating for Vercel preview-dependent jobs
    - Vitest execSync to shell out to impeccable CLI for planted-fixture proof
    - LHCI_COLLECT__URL env var pattern for Lighthouse CI in both local and CI contexts
key_files:
  created:
    - .github/workflows/ci.yml
    - tests/unit/fixtures/anti-patterns.html
    - docs/impeccable-flag.md
    - docs/a11y-audit.md
    - docs/copy-review.md
  modified:
    - lighthouserc.cjs
    - tests/unit/anti-patterns.test.ts
    - tests/a11y/homepage.spec.ts
    - package.json
decisions:
  - "impeccable v2.1.8 has no --fail-on-error flag; CI relies on binary exit code (non-zero on violations)"
  - "Vitest anti-pattern tests assert per-category violation names to prove the detector fires, not just that no violations exist in app/"
  - "deployment_status event gates test-e2e, a11y, lighthouse; lint/typecheck/test-unit/impeccable run on push/pull_request"
  - "Cookie injection for en-locale test uses context.addCookies to simulate locale persistence"
  - "pnpm dlx @lhci/cli@^0.15 in CI avoids hoisting issues with lhci binary resolution"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 4
  commits: 3
---

# Phase 1 Plan 08: CI Quality Matrix Summary

GitHub Actions CI workflow with 7 parallel jobs (lint, typecheck, test-unit, impeccable,
test-e2e, a11y, lighthouse) using exit-code-only impeccable enforcement verified via live
CLI inspection; planted-fixture Vitest tests prove the detector fires on real violations.

---

## What Was Built

### Task 1: impeccable CLI verification + planted-pattern fixtures + anti-pattern test

**Live CLI inspection result (impeccable v2.1.8):**

```
Options:
  --fast    Regex-only mode (skip jsdom, faster but misses linked stylesheets)
  --json    Output results as JSON
  --help    Show this help message
```

No `--fail-on-error`, `--fail-on-issues`, or `--ci` flag exists. Exit code is the only
enforcement mechanism. The binary exits with code 2 when violations are detected.

Key finding: `--json` mode exits 0 even with violations. The CI job correctly uses
`npx --yes impeccable detect app/` (non-JSON mode) to get the non-zero exit on violations.

**`tests/unit/fixtures/anti-patterns.html` detections confirmed:**

| Pattern | Trigger in fixture |
|---------|-------------------|
| `overused-font` | `font-family: 'Inter', sans-serif` |
| `ai-color-palette` | `linear-gradient(135deg, #7c3aed, #2563eb)` |
| `pure-black-white` | `background: #000000` |
| `gradient-text` | `background: linear-gradient + -webkit-background-clip: text` |
| `dark-glow` | `box-shadow: 0 0 80px rgba(124, 58, 237, 0.4)` |
| `low-contrast` | `color: #6b7280` on `background: #e0e7ff` (3.9:1, need 4.5:1) |
| `side-tab` | `border-left: 4px solid #7c3aed + border-radius: 8px` |
| `pure-black-white` (2nd) | Pure `#000` background |

8 anti-patterns fired, exit code 2.

**`app/` clean run:** exit code 0 (homepage passes impeccable clean).

**Test result:** `pnpm vitest run tests/unit/anti-patterns.test.ts` — 9/9 tests pass.

### Task 2: lighthouserc.cjs + axe-core scans

**Lighthouse Moto G Power 3G profile (exact values):**

| Parameter | Value |
|-----------|-------|
| formFactor | mobile |
| width × height | 412 × 823 |
| deviceScaleFactor | 2.625 |
| rttMs | 150 |
| throughputKbps | 1638.4 (≈ 1.6 Mbps) |
| cpuSlowdownMultiplier | 4× |
| throttlingMethod | simulate |

**Budget thresholds:**

| Metric | Threshold | Level |
|--------|-----------|-------|
| LCP (largest-contentful-paint) | ≤ 2500ms | error |
| TBT (total-blocking-time) | ≤ 200ms | error |
| CLS (cumulative-layout-shift) | ≤ 0.1 | warn |
| FCP (first-contentful-paint) | ≤ 2000ms | warn |
| Accessibility score | ≥ 0.9 | warn |
| Performance score | ≥ 0.75 | warn |

URL collection via `LHCI_COLLECT__URL` env var (defaults to `http://localhost:3000`).

**axe-core scans added:** `/` (default), `/` (en locale via cookie), `/apps`, `/apps/abrigo`.
All scan with full WCAG 2.2 AA tag set: `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']`.

### Task 3: `.github/workflows/ci.yml` — 7 parallel jobs

| Job | Event trigger | Command |
|-----|---------------|---------|
| `lint` | push / pull_request | `pnpm biome check .` |
| `typecheck` | push / pull_request | `pnpm velite build && pnpm tsc --noEmit` |
| `test-unit` | push / pull_request | `pnpm velite build && pnpm vitest run` |
| `impeccable` | push / pull_request | `npx --yes impeccable detect app/` |
| `test-e2e` | deployment_status: success | `pnpm playwright test --project=chromium` |
| `a11y` | deployment_status: success | `pnpm playwright test tests/a11y/` |
| `lighthouse` | deployment_status: success | `pnpm dlx @lhci/cli@^0.15 autorun` |

The impeccable job comment documents: "Non-zero exit code from impeccable fails this step. No
--fail-on-error flag needed; the binary exits non-zero (code 2) on any detected anti-pattern.
Verified with impeccable v2.1.8. See docs/impeccable-flag.md."

The committed YAML contains NO `<VERIFIED_FLAG>` placeholder text.

**Manual audit checklists delivered:**
- `docs/a11y-audit.md`: Top-5-template screen-reader checklist; Phase 1 rows (homepage + /apps)
  filled; Phases 2–5 rows templated for future reviewers.
- `docs/copy-review.md`: Banned phrases (10 entries), tone criteria, Phase 1 sign-off slots for
  all 4 message files. Phase 2 slots templated.

---

## YAML Structural Verification

Since `js-yaml` is not installed in this environment, structural verification was performed via:

```bash
python3 -c "..." # ModuleNotFoundError: No module named 'yaml'
yamllint         # not found
```

Fallback structural checks all passed:
- 7 `runs-on: ubuntu-latest` entries (one per job)
- All required commands present: `biome check`, `tsc --noEmit`, `playwright test`, `lhci autorun`,
  `impeccable detect`, `deployment_status`
- No `<VERIFIED_FLAG>` placeholder: confirmed

---

## User Setup Required (Non-blocking)

**Branch protection rules** — Must be configured manually in GitHub repository settings after
the first PR is merged. Required status checks to enable:
- `lint`
- `typecheck`
- `test-unit`
- `impeccable`
- `test-e2e`
- `a11y`
- `lighthouse`

Set "Require status checks to pass before merging" on the `main` branch with all 7 jobs
listed. This makes the quality matrix a hard merge gate from PR #1.

---

## Manual Audit Sign-off Status

| Checklist | Status |
|-----------|--------|
| CROSS-01: Screen-reader audit `/` | Checklist created; review pending native screen-reader session |
| CROSS-01: Screen-reader audit `/apps` | Checklist created; review pending |
| CROSS-10: es-CO copy review (Phase 1) | Checklist created; review pending native es-CO speaker |
| CROSS-10: en copy review (Phase 1) | Checklist created; review pending copy author |

---

## Deviations from Plan

### Pre-existing test failure (out-of-scope, deferred)

**`tests/unit/i18n.test.ts`** has a pre-existing failure introduced before Plan 01-08.
The test expects `result.messages.nav.skip_to_content` but the key lives under
`messages/es-CO/common.json` (the `common` namespace, not `nav`). This was failing
before any Plan 01-08 changes and is not caused by this plan's scope.

Documented in `.planning/phases/01-foundation-and-scaffold/deferred-items.md`.
Fix belongs in a follow-up to Plan 01-03 i18n infrastructure.

All Plan 01-08 tests pass: anti-pattern tests (9/9), impeccable fixture detection, biome, tsc.

---

## Self-Check: PASSED
