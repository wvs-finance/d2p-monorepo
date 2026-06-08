# Phase 05.1 — Deferred Items

## Pre-existing failures (out of scope for Wave 4)

### instruments-index.spec.ts — 4 empty-state assertions stale since Wave 1

**Discovered during:** Wave 4 Task 1 (running full playwright suite)

**Root cause:** `tests/e2e/instruments-index.spec.ts` was written (05-03) when `ABRIGO_INSTRUMENTS` was empty. Wave 1 (`feat(05.1-01)`) added the simulated `ccop-usd-long-gamma` entry to the registry. The index page now renders the instrument card, so the empty-state assertions fail.

**Failing tests:**
- `honest empty-state heading renders in es-CO` — asserts `Pendiente de despliegue en cadena` (empty state copy not rendered when there's a card)
- `zero instrument cards — no ghost or fabricated data (CROSS-09)` — asserts zero cards, but one card now renders
- `GitHub link to pending contracts is present` — empty-state CTA link not rendered when card renders
- `honest empty-state heading renders in en` — same, en locale

**Confirmed pre-existing:** Running the full suite with git stash (before Wave 4 changes) also shows 4 failures in this file.

**Status:** NOT fixed in Wave 4 (out-of-scope pre-existing regression, introduced by Wave 1 which is already committed)

**Fix needed:** Update `instruments-index.spec.ts` to assert the card renders for the simulated instrument instead of the empty state. This should be a small follow-up task.
