---
phase: 1
slug: data-sourcing-gate-pre-flight-addendum-schema-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Populated by the planner from `01-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (uv-managed, matching abrigo-analytics convention) — to confirm from RESEARCH.md §Validation Architecture |
| **Config file** | none yet — Wave 0 installs (greenfield repo) |
| **Quick run command** | `uv run pytest -q` |
| **Full suite command** | `uv run pytest` |
| **Estimated runtime** | TBD (planner fills from RESEARCH.md) |

---

## Sampling Rate

- **After every task commit:** Run the quick command
- **After every plan wave:** Run the full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** TBD

---

## Per-Task Verification Map

*Populated by the planner — one row per task, mapping DATA-SOURCE-01 / EVENT-01 / SHARED-SCHEMA-01 to automated checks (e.g. JSON-schema validators for the schema artifacts, a `data_sourcing_matrix.yaml` schema-conformance test, probe-result assertions).*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| (planner fills) | | | | | | | ⬜ pending |

---

## Wave 0 Requirements

*Planner fills from RESEARCH.md §Validation Architecture. Likely: pytest install + a schema-validation harness (jsonschema) + `tests/conftest.py` fixtures for the committed schema artifacts and the capability-matrix YAML.*

---

## Manual-Only Verifications

*Some Phase-1 deliverables are research verdicts (free-vs-paid recommendation, coherence-check prose) — these are reviewed, not unit-tested. Planner enumerates which are manual and why.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency target set
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
