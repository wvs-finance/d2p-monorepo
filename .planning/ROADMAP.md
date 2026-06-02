### Phase 05.1: abrigo-somnia convex instrument frontend surface (cCOP/USD long-gamma, read-first simulated) (INSERTED)

**Goal:** A visitor or agent can open the cCOP/USD long-gamma instrument page and read an honestly-labeled, read-first, simulated surface — schematic convex payoff, backend-correct cash-flow waterfall, and Panoptic fork-fixture params — under a three-tier provenance model (fork-fixture / spec / schematic) with a SIMULADO badge, a read-only wallet, and no transact path or fabricated numbers.
**Requirements**: Extends DEFI-02, DEFI-03, DEFI-04, DEFI-05, CROSS-01, CROSS-09, CROSS-10, AGENT-10. New: DEFI-08 (simulated/read-only instrument variant — three-tier provenance, SIMULADO badge, CashFlowWaterfall, SnapshotPoolPanel, read-only wallet, never passed to multicall), DEFI-09 (GitBook module page from docs/book/, excluded from Velite globbing).
**Depends on:** Phase 5
**Canonical spec:** `docs/superpowers/specs/2026-06-02-ccop-usd-long-gamma-instrument-frontend-design.md` (passed two-step review)
**Plans:** 5 plans (Waves 0-4; data freezes before consumers per spec §11)

Plans:
- [ ] 05.1-00-PLAN.md — Wave 0: fix the 05-04 PayoffDiagram BLOCKER (0-height/contrast/#418) + 4 failing test stubs + resolve chunk-strike; Evidence Collector re-verify existing fixture route (DEFI-04, CROSS-01, CROSS-09, DEFI-08) [wave 0]
- [ ] 05.1-01-PLAN.md — Wave 1: data layer freeze — fixture.ts + payoff.ts schematic + cashflow.ts + instruments.ts discriminated union + 3 consumer narrowings; remove temp fixture (DEFI-08, DEFI-04, AGENT-10, CROSS-09) [wave 1]
- [ ] 05.1-02-PLAN.md — Wave 2: components — ProvenanceBadge/SimuladoBadge + SnapshotPoolPanel + CashFlowWaterfall + PayoffDiagram props extension + read-only wallet path (DEFI-08, DEFI-02, DEFI-04, CROSS-09, CROSS-01) [wave 2]
- [ ] 05.1-03-PLAN.md — Wave 3: detail-page simulated branch (before aggregator) + es-CO/en i18n keys + GitBook page + copy-review sign-off (DEFI-08, DEFI-03, DEFI-05, DEFI-09, CROSS-10, CROSS-09, AGENT-10) [wave 3]
- [ ] 05.1-04-PLAN.md — Wave 4: real e2e/a11y on the simulated route + full suite green + Evidence Collector live-DOM gate (DEFI-08, DEFI-03, DEFI-05, DEFI-02, CROSS-01, CROSS-09) [wave 4]

---
*Roadmap created: 2026-05-11*
*Last updated: 2026-06-02 — Phase 05.1 planned (5 plans, Waves 0-4)*
