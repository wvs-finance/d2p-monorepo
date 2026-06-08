---
phase: 04-agent-surface-mcp
plan: "06"
subsystem: dashboard-jsonld-mirror
requirements: [AGENT-10]
status: complete
---

# 04-06 — Dashboard JSON-LD mirroring (Wave 3, AGENT-10)

## What shipped
- `components/AgentStateJsonLd.tsx` — emits a `<script type="application/ld+json">` `SoftwareApplication` (name `Abrigo`) whose `additionalProperty` set mirrors the MCP tool output schema: `status` (honest `not_deployed`), `chainsConfigured`, and per-chain `empty` status. XSS-escaped via the established `escapeJsonLd` + pre-built-html pattern (Plan 02-05). NO fabricated numeric pool balances.
- `app/(apps)/apps/abrigo/dashboard/page.tsx` — renders `<AgentStateJsonLd app="abrigo" chains={data} />` reusing the **existing single** `const data = await aggregateAllChains()` (no second RPC call).
- `tests/unit/agent-jsonld.test.tsx` (6 green) + an e2e assertion in `tests/e2e/agent-stubs.spec.ts`.

## Commits
- `11d5c19` feat(04-06): AgentStateJsonLd component + wire into dashboard (AGENT-10, TDD)
- `4acbe69` feat(04-06): e2e assertion for dashboard JSON-LD (AGENT-10)

## Verification
- `pnpm test:quick`: **180 passed / 0 skipped** (32 files).
- **Live Evidence-Collector gate: APPROVED** — `/apps/abrigo/dashboard` 200; JSON-LD `@type:SoftwareApplication`/`name:Abrigo`; `status=not_deployed`, 5 chains each `empty`; no fabricated numbers; 0 console errors. See `04-LIVE-VERIFICATION.md` → Task 04-06. Screenshot `/tmp/d2p-verify/04-06-dashboard.png`.

## Notes
- schema-dts `SoftwareApplication` type rejected the inline `additionalProperty`; typed via a local `SoftwareApplicationLd`/`PropertyValueLd` interface (field names still schema.org-conformant). No behavior change.
- AGENT-10 scope this phase = dashboard only (recorded waiver — no instrument/iteration pages exist pre-launch).
- **AGENT-10 complete → all of AGENT-01..10 delivered. Phase 4 functionally complete.**
