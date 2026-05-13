---
plan: 02-08
plan_name: content-sync-and-phase-finalize
phase: 02
status: complete
completed: 2026-05-12
tasks_total: 2
tasks_completed: 2
requirements: [LAB-04]
---

# Plan 02-08 — Summary

## Outcome

Closed LAB-04 (cross-repo content sync from `wvs-finance/abrigo-analytics` → `wvs-finance/d2p-frontend`) and seeded the manual-review scaffolding (`docs/iteration-content-review.md`, `docs/copy-review.md` extension) required by `02-VALIDATION.md` for content authored under Phase 2.

## Commits

- `c67935e` — `feat(02-08): expand sync-abrigo-content.yml with repository_dispatch + rsync + PR creation (LAB-04)`
- `docs(02-08)` — this SUMMARY + dispatch spec + manual-review docs + final phase state (this commit)

## What shipped

### `.github/workflows/sync-abrigo-content.yml` (LAB-04)

Expanded the Phase 1 stub workflow with the full Phase 2 pipeline per `02-RESEARCH.md §Pattern 7`:

- `repository_dispatch` trigger on event type `abrigo-content-updated` (paired with the dispatcher workflow documented in `docs/abrigo-dispatch-spec.md`)
- `workflow_dispatch` fallback with optional `abrigo_ref` input for manual sync
- Path filters `scratch/**` + `docs/**` (Markdown and MDX)
- `actions/checkout` of `wvs-finance/abrigo-analytics` using `ABRIGO_READ_PAT`
- `rsync` of `scratch/**/*.{md,mdx}` and `docs/**/*.{md,mdx}` into `content/research/`
- `pnpm velite build` gate — sync aborts if the Velite schema rejects synced content
- `detect-changes` step to skip PR creation when rsync produced no diff
- `peter-evans/create-pull-request@v6` opening a PR against `main` on branch `auto/sync-abrigo-content` with `delete-branch: true`
- Job-level permissions `contents: write` + `pull-requests: write`

### `docs/abrigo-dispatch-spec.md` (new)

Operator-facing spec for the **counterpart workflow** that must be added manually to `wvs-finance/abrigo-analytics` (Plan 02-08 cannot push to that repo):

- File path: `.github/workflows/dispatch-frontend-sync.yml`
- Trigger: push to `main` on `scratch/`, `docs/`, `notebooks/` paths
- Action: `peter-evans/repository-dispatch@v3` firing `abrigo-content-updated`
- Secret table documenting the two PATs required (`FRONTEND_DISPATCH_PAT` in abrigo, `ABRIGO_READ_PAT` in frontend)

### `docs/iteration-content-review.md` (new)

Scientific-accuracy review checklist per `02-VALIDATION.md §Manual-Only Verifications`. Pair D PASS and FX-vol FAIL each get a verbatim-source-match checklist for numeric values (β, CI, p, N, hash) and a narrative-sourcing checklist (Spec / Data / Estimation / Tests / Disposition sections) against the primary abrigo files. Designed to be ticked off by the author or a domain reviewer.

### `docs/copy-review.md` (extended)

Added Phase 2 entries:
- es-CO native-speaker review checklist for all Phase 2 namespace files (`iterations.json`, `research.json`, `team.json`, `about.json`, `lab.json`) plus the iteration MDX `title_es` fields
- Anti-fishing tone review checklist for `/about` page copy and FAIL iteration disposition memo (banned register: "empower your X with our Y", marketing superlatives, generic SaaS phrasing)

### Final phase wrap-up

- `.planning/REQUIREMENTS.md` — LAB-01, LAB-04, LAB-05 marked `[x]`; Phase 2 traceability table set to `Complete` for all 15 Phase 2 REQ-IDs
- `.planning/STATE.md` — `stopped_at: Completed 02-08-PLAN.md`, plan progress 16/16, Phase 2 marked closed

## Notable decisions

- **Dispatch over cron polling.** `repository_dispatch` triggers within seconds of an abrigo `main` push, vs. minutes for a cron poll. `02-RESEARCH.md §Pattern 7` confirmed this is the production-standard pattern. The fallback `workflow_dispatch` covers re-syncs during the period before PATs are provisioned.
- **PR-based merge, not direct push.** Auto-PRs let the author review machine-synced content before it lands on `main`. Branch-per-sync with `delete-branch: true` keeps the repo clean. The manual `iteration-content-review.md` ticks happen on the PR, not on the synced content directly.
- **Two-PAT design (not OIDC).** Classic PATs are simpler than configuring OIDC trust between two repos in the same org, and `repository_dispatch` doesn't support the GITHUB_TOKEN bridging GitHub allows for same-repo workflows. Documented PAT rotation in the dispatch spec.

## Test results

Workflow YAML lint: passes `actionlint` (run via the `gh actionlint` GitHub Action equivalent in CI). End-to-end dispatch test deferred until the abrigo dispatcher workflow is provisioned (manual user action).
